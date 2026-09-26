package com.pedromorago.spintrainer.qa.stats;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;
import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import com.pedromorago.spintrainer.qa.model.Attempt;
import com.pedromorago.spintrainer.qa.model.HandStat;
import com.pedromorago.spintrainer.qa.model.ProgressDay;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import io.restassured.response.Response;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Aggregates over the attempts. Day boundaries per time zone (DST changes included) are tested with a fixed clock in
 * the API (StatsIT); here, black-box, we check what can be checked without controlling the clock.
 */
@Feature("Estadísticas")
class StatsTest extends ApiTest {

    Attempt answer(String hand, String given) {
        String body =
                "{\"situation\":\"btn_open\",\"stack\":25,\"hand\":\"%s\",\"given\":\"%s\"}".formatted(hand, given);
        Response response = api.quiz().record(body);
        assertThat(response.statusCode()).isEqualTo(201);
        return response.as(Attempt.class);
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

    /**
     * Each attempt counts on the UTC day it was answered. The oracle is the attempts' own answeredAt, not the test's
     * clock: midnight may fall between answering and asking (the window of two days covers it).
     */
    @Test
    void progress_counts_each_attempt_on_the_day_it_was_answered() {
        List<Attempt> attempts = List.of(answer("AA", "MR_4B_C"), answer("KK", "FOLD"));

        List<ProgressDay> days =
                api.stats().progress(Map.of("days", 2, "tz", "UTC")).jsonPath().getList(".", ProgressDay.class);

        Map<LocalDate, List<Attempt>> byDay = attempts.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getAnsweredAt().atZoneSameInstant(ZoneOffset.UTC).toLocalDate()));
        assertThat(days)
                .extracting(ProgressDay::getDate, ProgressDay::getAttempts, ProgressDay::getCorrect)
                .containsExactlyInAnyOrderElementsOf(byDay.entrySet().stream()
                        .map(day -> org.assertj.core.groups.Tuple.tuple(
                                day.getKey(), day.getValue().size(), (int) day.getValue().stream()
                                        .filter(Attempt::getCorrect)
                                        .count()))
                        .toList());
        assertThat(days.stream().mapToInt(ProgressDay::getAttempts).sum()).isEqualTo(2);
        assertThat(days.stream().mapToInt(ProgressDay::getCorrect).sum()).isEqualTo(1);
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
