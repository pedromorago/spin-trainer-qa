package com.pedromorago.spintrainer.qa.quiz;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;
import static com.pedromorago.spintrainer.qa.data.QaReferenceData.BTN_OPEN;
import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import com.pedromorago.spintrainer.qa.auth.TestUser;
import com.pedromorago.spintrainer.qa.client.Api;
import com.pedromorago.spintrainer.qa.data.RangeFactory;
import com.pedromorago.spintrainer.qa.model.Attempt;
import com.pedromorago.spintrainer.qa.model.AttemptPage;
import com.pedromorago.spintrainer.qa.support.Adr;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import io.qameta.allure.Link;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@Feature("Quiz: historial de intentos")
@Link(name = "ADR-0007", url = Adr.IMMUTABLE_ATTEMPTS)
class AttemptHistoryTest extends ApiTest {

    void answer(int times, String situation, String stack) {
        for (int i = 0; i < times; i++) {
            String body = "{\"situation\":\"%s\",\"stack\":%s,\"hand\":\"AA\",\"given\":\"%s\"}"
                    .formatted(situation, stack, situation.equals(BTN_OPEN) ? "MR_4B_C" : "ALLIN");
            assertThat(api.quiz().record(body).statusCode()).isEqualTo(201);
        }
    }

    @Test
    void pages_from_newest_to_oldest_without_gaps_or_duplicates() {
        answer(5, BTN_OPEN, "25");
        List<Attempt> seen = new ArrayList<>();
        String cursor = null;
        int pages = 0;
        do {
            Map<String, Object> query = new HashMap<>(Map.of("limit", 2));
            if (cursor != null) {
                query.put("cursor", cursor);
            }
            AttemptPage page = api.quiz().list(query).as(AttemptPage.class);
            assertThat(page.getItems()).hasSizeLessThanOrEqualTo(2);
            seen.addAll(page.getItems());
            cursor = page.getNextCursor();
            pages++;
        } while (cursor != null);

        assertThat(pages).isEqualTo(3);
        assertThat(seen).hasSize(5);
        assertThat(new HashSet<>(seen.stream().map(Attempt::getId).toList())).hasSize(5);
        assertThat(seen).extracting(Attempt::getAnsweredAt).isSortedAccordingTo((a, b) -> b.compareTo(a));
    }

    @Test
    void the_last_page_has_a_null_cursor() {
        assertThat(api.quiz().list(Map.of()).asString()).isEqualTo("{\"items\":[],\"nextCursor\":null}");
    }

    @Test
    void filters_by_situation_and_stack() {
        api.ranges().putUser("bb_vs_sb_limp", "10", RangeFactory.write(Map.of("AA", "ALLIN"), 0));
        answer(2, BTN_OPEN, "25");
        answer(1, "bb_vs_sb_limp", "10");

        assertThat(api.quiz()
                        .list(Map.of("situation", "bb_vs_sb_limp"))
                        .jsonPath()
                        .getList("items.situation"))
                .containsExactly("bb_vs_sb_limp");
        assertThat(api.quiz()
                        .list(Map.of("situation", BTN_OPEN, "stack", "25.0"))
                        .jsonPath()
                        .getList("items"))
                .hasSize(2);
        assertThat(api.quiz().list(Map.of("stack", "12.5")).jsonPath().getList("items"))
                .isEmpty();
    }

    /** Valores límite de limit (1..200) y un cursor que la API no emitió. */
    @ParameterizedTest(name = "{0}={1} → {2}")
    @CsvSource({
        "limit, 1, 200",
        "limit, 200, 200",
        "limit, 0, 400",
        "limit, 201, 400",
        "limit, x, 400",
        "cursor, bm9wZQ, 400"
    })
    void validates_paging_parameters(String name, String value, int status) {
        var response = api.quiz().list(Map.of(name, value));

        if (status == 400) {
            assertThatProblem(response).is(ErrorType.VALIDATION).hasFieldErrors(name);
        } else {
            assertThat(response.statusCode()).isEqualTo(200);
        }
    }

    @Test
    void each_user_only_sees_their_own_attempts() {
        answer(1, BTN_OPEN, "25");

        assertThat(Api.as(TestUser.fresh("otro usuario"))
                        .quiz()
                        .list(Map.of())
                        .jsonPath()
                        .getList("items"))
                .isEmpty();
    }
}
