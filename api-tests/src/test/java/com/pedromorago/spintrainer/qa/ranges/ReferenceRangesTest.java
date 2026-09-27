package com.pedromorago.spintrainer.qa.ranges;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;
import static com.pedromorago.spintrainer.qa.data.QaReferenceData.BTN_OPEN;
import static com.pedromorago.spintrainer.qa.data.QaReferenceData.BTN_OPEN_25;
import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import com.pedromorago.spintrainer.qa.data.QaReferenceData;
import com.pedromorago.spintrainer.qa.data.ReferenceRanges;
import com.pedromorago.spintrainer.qa.model.Range;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import io.restassured.response.Response;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

@Feature("Rangos de referencia")
class ReferenceRangesTest extends ApiTest {

    @Test
    @Tag("smoke")
    void serves_the_reference_range_loaded_by_the_seed() {
        Response response = api.ranges().getDefault(BTN_OPEN, "25");

        assertThat(response.statusCode()).isEqualTo(200);
        Range range = response.as(Range.class);
        assertThat(range.getSource()).isEqualTo(Range.SourceEnum.DEFAULT);
        assertThat(range.getVersion()).isEqualTo(1);
        assertThat(range.getHands()).hasSize(BTN_OPEN_25.size());
        range.getHands()
                .forEach(
                        (hand, action) -> assertThat(action.getValue()).as(hand).isEqualTo(BTN_OPEN_25.get(hand)));
    }

    @Test
    void the_list_contains_every_seeded_combination_in_catalog_order() {
        List<Range> ranges = api.ranges().listDefault().jsonPath().getList(".", Range.class);

        assertThat(ranges)
                .extracting(r -> ReferenceRanges.spot(r.getSituation(), r.getStack()))
                .containsExactlyElementsOf(QaReferenceData.servedReferenceSpots());
    }

    /** Data integrity: every served range is, hand by hand, the seed's one (pinned copy of the API's). */
    @Test
    void every_range_served_is_the_seeded_one() {
        List<Range> ranges = api.ranges().listDefault().jsonPath().getList(".", Range.class);

        assertThat(ranges).isNotEmpty().allSatisfy(range -> {
            Map<String, String> served = new HashMap<>();
            range.getHands().forEach((hand, action) -> served.put(hand, action.getValue()));
            assertThat(served)
                    .as(ReferenceRanges.spot(range.getSituation(), range.getStack()))
                    .isEqualTo(ReferenceRanges.of(range.getSituation(), range.getStack()));
            assertThat(range.getVersion()).isEqualTo(1);
        });
    }

    /** Partition: notations of the same stack. All are the same combination and return the canonical form. */
    @ParameterizedTest(name = "stack {0}")
    @ValueSource(strings = {"25", "25.0", "25.00"})
    void accepts_any_notation_of_the_same_stack(String stack) {
        Response response = api.ranges().getDefault(BTN_OPEN, stack);

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.jsonPath().getString("stack")).isEqualTo("25");
    }

    @Test
    void a_known_spot_without_seed_is_not_found() {
        assertThatProblem(api.ranges().getDefault(BTN_OPEN, "8"))
                .is(ErrorType.NOT_FOUND)
                .hasDetail("No reference range for btn_open@8");
    }

    /** Boundary values and partitions of the combination (situation, stack). */
    @ParameterizedTest(name = "{0}@{1} → {2}")
    @CsvSource({
        "btn_open,    12.5,  404", // multiple of 0.5 the situation doesn't have
        "btn_open,    1,     404", // contract's valid lower bound, outside the catalog
        "btn_open,    100,   404", // contract's valid upper bound
        "btn_open,    0.5,   400", // below the minimum
        "btn_open,    100.5, 400", // above the maximum
        "btn_open,    12.3,  400", // not a multiple of 0.5
        "mtt_open,    25,    404", // nonexistent situation (Spin & Go only, ADR-0011)
        "BTN_OPEN,    25,    400", // doesn't match the key pattern
    })
    void validates_the_combination(String situation, String stack, int status) {
        Response response = api.ranges().getDefault(situation, stack);

        assertThatProblem(response).is(status == 400 ? ErrorType.VALIDATION : ErrorType.NOT_FOUND);
    }

    @Test
    void is_revalidated_with_an_etag() {
        String etag = api.ranges().getDefault(BTN_OPEN, "25").header("ETag");

        assertThat(api.ranges().getDefault(BTN_OPEN, "25", etag).statusCode()).isEqualTo(304);
    }
}
