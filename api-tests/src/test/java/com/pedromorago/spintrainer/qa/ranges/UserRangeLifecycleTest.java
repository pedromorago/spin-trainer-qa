package com.pedromorago.spintrainer.qa.ranges;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;
import static com.pedromorago.spintrainer.qa.data.QaReferenceData.BB_VS_SB_LIMP;
import static com.pedromorago.spintrainer.qa.data.QaReferenceData.BB_VS_SB_LIMP_ACTIONS;
import static com.pedromorago.spintrainer.qa.data.QaReferenceData.BTN_OPEN;
import static com.pedromorago.spintrainer.qa.data.QaReferenceData.BTN_OPEN_ACTIONS;
import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import com.pedromorago.spintrainer.qa.auth.TestUser;
import com.pedromorago.spintrainer.qa.client.Api;
import com.pedromorago.spintrainer.qa.data.RangeFactory;
import com.pedromorago.spintrainer.qa.model.Range;
import com.pedromorago.spintrainer.qa.support.Adr;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import io.qameta.allure.Link;
import io.restassured.response.Response;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.LongStream;
import java.util.stream.Stream;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * State transitions of a custom range (ADR-0013): no range → v1 → v2 … → deleted. Each write states which version it
 * starts from; if it isn't the current one, 409 and nothing is overwritten.
 */
@Feature("Rangos personalizados")
@Link(name = "ADR-0013", url = Adr.CONTRACT_V02)
@Link(name = "ADR-0012", url = Adr.EFFECTIVE_RANGE)
class UserRangeLifecycleTest extends ApiTest {

    static final String STACK = "25";

    Response put(Map<String, String> hands, int version) {
        return api.ranges().putUser(BTN_OPEN, STACK, RangeFactory.write(hands, version));
    }

    @Test
    @Tag("smoke")
    void walks_every_transition_of_the_state_machine() {
        // No range
        assertThatProblem(api.ranges().getUser(BTN_OPEN, STACK)).is(ErrorType.NOT_FOUND);

        // No range --PUT v0--> v1 (201)
        Response created = put(Map.of("AA", "ALLIN"), 0);
        assertThat(created.statusCode()).isEqualTo(201);
        assertThat(created.as(Range.class).getVersion()).isEqualTo(1);

        // v1 --PUT v0--> 409 (already exists)
        assertThatProblem(put(Map.of(), 0)).is(ErrorType.CONFLICT).hasDetail(ErrorType.CONFLICT.detail(1));

        // v1 --PUT v1--> v2 (200)
        Response replaced = put(Map.of("KK", "ALLIN"), 1);
        assertThat(replaced.statusCode()).isEqualTo(200);
        assertThat(replaced.as(Range.class).getVersion()).isEqualTo(2);

        // v2 --PUT v1--> 409 (stale version)
        assertThatProblem(put(Map.of(), 1)).is(ErrorType.CONFLICT).hasDetail(ErrorType.CONFLICT.detail(2));

        // v2 --DELETE--> no range (204), and DELETE is idempotent
        assertThat(api.ranges().deleteUser(BTN_OPEN, STACK).statusCode()).isEqualTo(204);
        assertThat(api.ranges().deleteUser(BTN_OPEN, STACK).statusCode()).isEqualTo(204);

        // no range --PUT v2--> 409 (no longer exists)
        assertThatProblem(put(Map.of(), 2))
                .is(ErrorType.CONFLICT_DELETED)
                .hasDetail(ErrorType.CONFLICT_DELETED.detail());
        assertThatProblem(api.ranges().getUser(BTN_OPEN, STACK)).is(ErrorType.NOT_FOUND);

        // no range --PUT v0--> v3 (201): the count goes on after the delete, it does not start over at 1
        Response again = put(Map.of("QQ", "ALLIN"), 0);
        assertThat(again.statusCode()).isEqualTo(201);
        assertThat(again.as(Range.class).getVersion())
                .as("versión tras borrar y crear")
                .isEqualTo(3);
    }

    /**
     * ABA: a tab still holding version 1 of a range that another tab deleted and created again. Versions restarted at
     * 1, so its write matched the new range and overwrote it without a conflict.
     */
    @Test
    void a_stale_tab_cannot_overwrite_a_range_deleted_and_created_again() {
        put(Map.of("AA", "ALLIN"), 0);
        api.ranges().deleteUser(BTN_OPEN, STACK);
        Response recreated = put(Map.of("KK", "ALLIN"), 0);

        Response staleTab = put(Map.of("AA", "MR_F_F"), 1);

        assertThat(recreated.as(Range.class).getVersion()).isEqualTo(2);
        assertThatProblem(staleTab).is(ErrorType.CONFLICT).hasDetail(ErrorType.CONFLICT.detail(2));
        assertThat(api.ranges().getUser(BTN_OPEN, STACK).jsonPath().getMap("hands"))
                .isEqualTo(Map.of("KK", "ALLIN"));
    }

    @Test
    void two_tabs_editing_the_same_version_cannot_lose_an_update() {
        put(Map.of(), 0);
        int readByBothTabs = api.ranges().getUser(BTN_OPEN, STACK).jsonPath().getInt("version");

        Response firstTab = put(Map.of("AA", "ALLIN"), readByBothTabs);
        Response secondTab = put(Map.of("AA", "MR_F_F"), readByBothTabs);

        assertThat(firstTab.statusCode()).isEqualTo(200);
        assertThatProblem(secondTab).is(ErrorType.CONFLICT);
        assertThat(api.ranges().getUser(BTN_OPEN, STACK).jsonPath().getString("hands.AA"))
                .isEqualTo("ALLIN");
    }

    /**
     * Concurrency: the same version written at the same time from several clients. Exactly one wins; a
     * read-check-write without {@code WHERE version = ?} would let several of them through.
     */
    @Test
    void concurrent_writes_on_the_same_version_have_exactly_one_winner() throws Exception {
        put(Map.of(), 0);
        int writers = 8;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(writers);
        try {
            List<Future<Integer>> statuses = new ArrayList<>();
            for (int i = 0; i < writers; i++) {
                String action = i % 2 == 0 ? "ALLIN" : "MR_F_F";
                statuses.add(pool.submit(() -> {
                    start.await();
                    return put(Map.of("AA", action), 1).statusCode();
                }));
            }
            start.countDown();
            List<Integer> results = new ArrayList<>();
            for (Future<Integer> status : statuses) {
                results.add(status.get(30, TimeUnit.SECONDS));
            }

            assertThat(results).as("estados").containsOnly(200, 409).containsOnlyOnce(200);
            assertThat(api.ranges().getUser(BTN_OPEN, STACK).jsonPath().getInt("version"))
                    .isEqualTo(2);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void what_a_write_returns_is_what_a_read_returns() {
        String written = put(Map.of("AA", "ALLIN", "72o", "L_C_F"), 0).asString();

        assertThat(api.ranges().getUser(BTN_OPEN, STACK).asString()).isEqualTo(written);
    }

    /** The implicit action is not stored: FOLD in btn_open, CHECK in bb_vs_sb_limp (the BB can't fold to a limp). */
    @Test
    void hands_with_the_implicit_action_are_not_stored() {
        Range btnOpen = put(Map.of("AA", "ALLIN", "72o", "FOLD"), 0).as(Range.class);
        Range bbVsLimp = api.ranges()
                .putUser(BB_VS_SB_LIMP, "10", RangeFactory.write(Map.of("AA", "ALLIN", "72o", "CHECK"), 0))
                .as(Range.class);

        assertThat(btnOpen.getHands()).containsOnlyKeys("AA");
        assertThat(bbVsLimp.getHands()).containsOnlyKeys("AA");
    }

    @Test
    void each_user_only_sees_their_own_ranges() {
        put(Map.of("AA", "ALLIN"), 0);
        Api someoneElse = Api.as(TestUser.fresh("otro usuario"));

        assertThat(api.ranges().listUser().jsonPath().getList("situation")).containsExactly(BTN_OPEN);
        assertThat(someoneElse.ranges().listUser().jsonPath().getList("$")).isEmpty();
        assertThatProblem(someoneElse.ranges().getUser(BTN_OPEN, STACK)).is(ErrorType.NOT_FOUND);
    }

    static Stream<Long> seeds() {
        return LongStream.generate(RangeFactory::newSeed).limit(5).boxed();
    }

    /** Random ranges (seed in the name to reproduce them): what's stored is what was sent minus the implicit action. */
    @ParameterizedTest(name = "semilla {0}")
    @MethodSource("seeds")
    void any_valid_range_round_trips(long seed) {
        Map<String, String> btnOpen = RangeFactory.random(seed, BTN_OPEN_ACTIONS, "FOLD");
        Map<String, String> bbVsLimp = RangeFactory.random(seed, BB_VS_SB_LIMP_ACTIONS, "CHECK");

        assertThat(storedHands(api.ranges().putUser(BTN_OPEN, STACK, RangeFactory.write(btnOpen, 0))))
                .isEqualTo(btnOpen);
        assertThat(storedHands(api.ranges().putUser(BB_VS_SB_LIMP, "10", RangeFactory.write(bbVsLimp, 0))))
                .isEqualTo(bbVsLimp);
    }

    private static Map<String, String> storedHands(Response response) {
        assertThat(response.statusCode()).isEqualTo(201);
        Map<String, String> hands = new HashMap<>();
        response.as(Range.class).getHands().forEach((hand, action) -> hands.put(hand, action.getValue()));
        return hands;
    }
}
