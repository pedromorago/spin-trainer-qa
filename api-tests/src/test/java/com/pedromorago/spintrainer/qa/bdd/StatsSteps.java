package com.pedromorago.spintrainer.qa.bdd;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.pedromorago.spintrainer.qa.model.AttemptPage;
import com.pedromorago.spintrainer.qa.model.HandStat;
import com.pedromorago.spintrainer.qa.model.ProgressDay;
import io.cucumber.datatable.DataTable;
import io.cucumber.java.es.Entonces;
import io.restassured.response.Response;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.assertj.core.groups.Tuple;

/** Stats aggregated by the API over the attempts. */
public class StatsSteps {

    private final ScenarioContext context;

    public StatsSteps(ScenarioContext context) {
        this.context = context;
    }

    /** Table with the columns {@code mano}, {@code respuestas} and {@code aciertos}. */
    @Entonces("mis estadísticas por mano son:")
    public void handStats(DataTable stats) {
        Tuple[] expected = stats.asMaps().stream()
                .map(row -> tuple(
                        row.get("mano"),
                        Integer.parseInt(row.get("respuestas")),
                        Integer.parseInt(row.get("aciertos"))))
                .toArray(Tuple[]::new);

        assertThat(hands())
                .extracting(HandStat::getHand, HandStat::getAttempts, HandStat::getCorrect)
                .containsExactlyInAnyOrder(expected);
    }

    /** A new player: every answer is from today, on the UTC day it was recorded (midnight may fall in between). */
    @Entonces("hoy llevo {int} respuestas y {int} aciertos")
    public void todaysProgress(int attempts, int correct) {
        List<ProgressDay> days = progress(Map.of("days", 2, "tz", "UTC"));

        assertThat(days.stream().mapToInt(ProgressDay::getAttempts).sum())
                .as("respuestas")
                .isEqualTo(attempts);
        assertThat(days.stream().mapToInt(ProgressDay::getCorrect).sum())
                .as("aciertos")
                .isEqualTo(correct);
        assertThat(days).extracting(ProgressDay::getDate).as("días").isSubsetOf(answerDays());
    }

    private Set<LocalDate> answerDays() {
        Response response = context.api().quiz().list(Map.of("limit", 200));
        assertThat(response.statusCode()).as(response.asString()).isEqualTo(200);
        return response.as(AttemptPage.class).getItems().stream()
                .map(a -> a.getAnsweredAt().atZoneSameInstant(ZoneOffset.UTC).toLocalDate())
                .collect(Collectors.toSet());
    }

    @Entonces("no tiene estadísticas")
    public void noStats() {
        assertThat(hands()).isEmpty();
        assertThat(progress(Map.of())).isEmpty();
    }

    private List<HandStat> hands() {
        Response response = context.api().stats().hands(Map.of());
        assertThat(response.statusCode()).as(response.asString()).isEqualTo(200);
        return response.jsonPath().getList(".", HandStat.class);
    }

    private List<ProgressDay> progress(Map<String, ?> query) {
        Response response = context.api().stats().progress(query);
        assertThat(response.statusCode()).as(response.asString()).isEqualTo(200);
        return response.jsonPath().getList(".", ProgressDay.class);
    }
}
