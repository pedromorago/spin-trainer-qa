package com.pedromorago.spintrainer.qa.stats;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;
import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import com.pedromorago.spintrainer.qa.model.HandStat;
import com.pedromorago.spintrainer.qa.model.ProgressDay;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Aggregates over the attempts. Day boundaries per time zone (DST changes included) are tested with a fixed clock in
 * the API (StatsIT); here, black-box, we check what can be checked without controlling the clock.
 */
@Feature("Estadísticas")
class StatsTest extends ApiTest {

    void answer(String hand, String given) {
        String body =
                "{\"situation\":\"btn_open\",\"stack\":25,\"hand\":\"%s\",\"given\":\"%s\"}".formatted(hand, given);
        assertThat(api.quiz().record(body).statusCode()).isEqualTo(201);
    }

    @Test
    void aggregates_attempts_per_hand() {
        answer("AA", "MR_4B_C");
        answer("AA", "FOLD");
        answer("72o", "FOLD");

        List<HandStat> rows = api.stats().hands(Map.of()).jsonPath().getList(".", HandStat.class);

        assertThat(rows)
                .extracting(HandStat::getHand, HandStat::getAttempts, HandStat::getCorrect)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("AA", 2, 1),
                        org.assertj.core.groups.Tuple.tuple("72o", 1, 1));
    }

    @Test
    void todays_progress_counts_todays_attempts() {
        answer("AA", "MR_4B_C");
        answer("KK", "FOLD");

        List<ProgressDay> days =
                api.stats().progress(Map.of("days", 1, "tz", "UTC")).jsonPath().getList(".", ProgressDay.class);

        assertThat(days).singleElement().satisfies(day -> {
            assertThat(day.getDate()).isEqualTo(LocalDate.now(ZoneOffset.UTC));
            assertThat(day.getAttempts()).isEqualTo(2);
            assertThat(day.getCorrect()).isEqualTo(1);
        });
    }

    @Test
    void a_new_user_has_no_stats() {
        assertThat(api.stats().hands(Map.of()).asString()).isEqualTo("[]");
        assertThat(api.stats().progress(Map.of()).asString()).isEqualTo("[]");
    }

    /** Boundary values of days (1..365) and partitions of tz (IANA region yes; offsets and made-up names no). */
    @ParameterizedTest(name = "{0}={1} → {2}")
    @CsvSource({
        "days, 1, 200", "days, 365, 200", "days, 0, 400", "days, 366, 400",
        "tz, Europe/Madrid, 200", "tz, UTC, 200", "tz, Nope/Zone, 400", "tz, +01:00, 400"
    })
    void validates_the_progress_window(String name, String value, int status) {
        var response = api.stats().progress(Map.of(name, value));

        if (status == 400) {
            assertThatProblem(response).is(ErrorType.VALIDATION).hasFieldErrors(name);
        } else {
            assertThat(response.statusCode()).isEqualTo(200);
        }
    }
}
