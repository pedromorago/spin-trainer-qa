package com.pedromorago.spintrainer.qa.bdd;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.pedromorago.spintrainer.qa.model.HandStat;
import com.pedromorago.spintrainer.qa.model.ProgressDay;
import io.cucumber.datatable.DataTable;
import io.cucumber.java.es.Entonces;
import io.restassured.response.Response;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.assertj.core.groups.Tuple;

/** Estadísticas agregadas por la API sobre los intentos. */
public class StatsSteps {

    private final ScenarioContext context;

    public StatsSteps(ScenarioContext context) {
        this.context = context;
    }

    /** Tabla con las columnas {@code mano}, {@code respuestas} y {@code aciertos}. */
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

    @Entonces("hoy llevo {int} respuestas y {int} aciertos")
    public void todaysProgress(int attempts, int correct) {
        assertThat(progress(Map.of("days", 1, "tz", "UTC"))).singleElement().satisfies(day -> {
            assertThat(day.getDate()).isEqualTo(LocalDate.now(ZoneOffset.UTC));
            assertThat(day.getAttempts()).as("respuestas").isEqualTo(attempts);
            assertThat(day.getCorrect()).as("aciertos").isEqualTo(correct);
        });
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
