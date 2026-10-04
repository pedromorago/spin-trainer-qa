package com.pedromorago.spintrainer.qa.situations;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;
import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import com.pedromorago.spintrainer.qa.client.Api;
import com.pedromorago.spintrainer.qa.model.Situation;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import io.restassured.response.Response;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Feature("Catálogo de situaciones")
class SituationCatalogTest extends ApiTest {

    /** The catalog's order: 13 3-max situations (bb_vs_sb_os with the other BB vs SB spots), then the 4 HU ones. */
    static final List<String> PRESENTATION_ORDER = List.of(
            "btn_open",
            "sb_open",
            "sb_vs_btn_mr",
            "sb_vs_btn_limp",
            "bb_vs_sb_mr",
            "bb_vs_sb_limp",
            "bb_vs_sb_os",
            "bb_vs_btn_mr_sb_fold",
            "bb_vs_btn_limp_sb_fold",
            "bb_vs_btn_mr_sb_3bet",
            "bb_vs_btn_limp_sb_3bet",
            "bb_vs_btn_mr_sb_call",
            "bb_vs_btn_limp_sb_call",
            "hu_sb_open",
            "hu_bb_vs_mr",
            "hu_bb_vs_limp",
            "hu_bb_vs_os");

    @Test
    @Tag("smoke")
    void lists_the_16_spin_and_go_situations_in_presentation_order() {
        Response response = api.situations().list();

        assertThat(response.statusCode()).isEqualTo(200);
        List<Situation> situations = response.jsonPath().getList(".", Situation.class);
        assertThat(situations).extracting(Situation::getKey).containsExactlyElementsOf(PRESENTATION_ORDER);
        assertThat(situations)
                .filteredOn(s -> s.getFormat() == Situation.FormatEnum.HU)
                .extracting(Situation::getKey)
                .containsExactlyElementsOf(PRESENTATION_ORDER.subList(13, 17));
    }

    @Test
    void every_situation_has_an_implicit_action_for_unlisted_hands() {
        List<Situation> situations = api.situations().list().jsonPath().getList(".", Situation.class);

        assertThat(situations)
                .allSatisfy(situation -> assertThat(situation.getActions())
                        .as(situation.getKey())
                        .extracting(Object::toString)
                        .containsAnyOf("FOLD", "CHECK"));
    }

    @Test
    void stacks_are_distinct_multiples_of_half_a_big_blind_from_highest_to_lowest() {
        List<Situation> situations = api.situations().list().jsonPath().getList(".", Situation.class);

        assertThat(situations).allSatisfy(situation -> {
            List<BigDecimal> stacks = List.copyOf(situation.getStacks());
            assertThat(stacks).as(situation.getKey()).isSortedAccordingTo((a, b) -> b.compareTo(a));
            assertThat(stacks)
                    .allSatisfy(stack -> assertThat(stack.multiply(BigDecimal.TWO)
                                    .stripTrailingZeros()
                                    .scale())
                            .isLessThanOrEqualTo(0));
        });
    }

    @Test
    void the_catalog_is_revalidated_with_an_etag() {
        Response first = api.situations().list();
        String etag = first.header("ETag");

        assertThat(etag).isNotBlank();
        assertThat(first.header("Cache-Control")).isEqualTo("no-cache, private");
        assertThat(api.situations().list(etag).statusCode()).isEqualTo(304);
    }

    @Test
    void requires_a_session_token() {
        assertThatProblem(Api.anonymous().situations().list()).is(ErrorType.UNAUTHORIZED);
    }
}
