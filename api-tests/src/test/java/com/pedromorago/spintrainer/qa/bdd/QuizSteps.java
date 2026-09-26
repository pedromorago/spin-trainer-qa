package com.pedromorago.spintrainer.qa.bdd;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.pedromorago.spintrainer.qa.model.Attempt;
import com.pedromorago.spintrainer.qa.model.AttemptPage;
import io.cucumber.datatable.DataTable;
import io.cucumber.java.es.Cuando;
import io.cucumber.java.es.Dado;
import io.cucumber.java.es.Entonces;
import io.restassured.response.Response;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.assertj.core.groups.Tuple;

/** Quiz answers, their grading and the history. */
public class QuizSteps {

    private final ScenarioContext context;

    public QuizSteps(ScenarioContext context) {
        this.context = context;
    }

    @Cuando("respondo {string} con {mano} en {string} a {stack} BB")
    public void answer(String given, String hand, String situation, BigDecimal stack) {
        Response response = context.remember(record(situation, stack, hand, given));
        // A rejected answer is not the last one: the next steps must not read the previous attempt.
        context.rememberAttempt(response.statusCode() == 201 ? response.as(Attempt.class) : null);
    }

    /** Table with the columns {@code mano} and {@code respuesta}, in the order they are answered. */
    @Dado("que respondí en {string} a {stack} BB:")
    public void answered(String situation, BigDecimal stack, DataTable answers) {
        for (Map<String, String> row : answers.asMaps()) {
            Response response = record(situation, stack, row.get("mano"), row.get("respuesta"));
            assertThat(response.statusCode()).as(response.asString()).isEqualTo(201);
            context.rememberAttempt(response.as(Attempt.class));
        }
    }

    @Entonces("la acción esperada es {string}")
    public void expectedAction(String action) {
        assertThat(context.lastAttempt().getExpected().getValue()).isEqualTo(action);
    }

    @Entonces("la respuesta es {resultado}")
    public void graded(boolean correct) {
        assertThat(context.lastAttempt().getCorrect()).as("correcta").isEqualTo(correct);
    }

    @Entonces("se corrigió con el rango de referencia")
    public void gradedWithReference() {
        assertThat(context.lastAttempt().getRangeSource()).isEqualTo(Attempt.RangeSourceEnum.DEFAULT);
    }

    @Entonces("se corrigió con mi rango en la versión {int}")
    public void gradedWithMyRange(int version) {
        Attempt attempt = context.lastAttempt();
        assertThat(attempt.getRangeSource()).isEqualTo(Attempt.RangeSourceEnum.USER);
        assertThat(attempt.getRangeVersion()).as("versión del rango").isEqualTo(version);
    }

    @Entonces("mi última respuesta sigue siendo {resultado} y corregida con el rango de referencia")
    public void lastAnswerUnchanged(boolean correct) {
        Attempt last = history().getFirst();
        assertThat(last.getId()).isEqualTo(context.lastAttempt().getId());
        assertThat(last.getCorrect()).as("correcta").isEqualTo(correct);
        assertThat(last.getExpected()).isEqualTo(context.lastAttempt().getExpected());
        assertThat(last.getRangeSource()).isEqualTo(Attempt.RangeSourceEnum.DEFAULT);
    }

    /** Positive control of the steps above: a new answer does see the new range. */
    @Entonces(
            "si vuelvo a responder {string} con {mano} en {string} a {stack} BB, se corrige con mi rango y la acción {string}")
    public void answerAgainWithMyRange(String given, String hand, String situation, BigDecimal stack, String expected) {
        Response response = record(situation, stack, hand, given);
        assertThat(response.statusCode()).as(response.asString()).isEqualTo(201);
        Attempt attempt = response.as(Attempt.class);
        assertThat(attempt.getRangeSource()).isEqualTo(Attempt.RangeSourceEnum.USER);
        assertThat(attempt.getExpected().getValue()).as("acción esperada").isEqualTo(expected);
    }

    @Entonces("mi/su historial está vacío")
    public void emptyHistory() {
        assertThat(history()).isEmpty();
    }

    /** Table with the columns {@code mano}, {@code respuesta}, {@code esperada} and {@code resultado}. */
    @Entonces("mi historial contiene:")
    public void historyContains(DataTable attempts) {
        Tuple[] expected = attempts.asMaps().stream()
                .map(row ->
                        tuple(row.get("mano"), row.get("respuesta"), row.get("esperada"), result(row.get("resultado"))))
                .toArray(Tuple[]::new);

        assertThat(history())
                .extracting(
                        Attempt::getHand,
                        a -> a.getGiven().getValue(),
                        a -> a.getExpected().getValue(),
                        Attempt::getCorrect)
                .containsExactlyInAnyOrder(expected);
    }

    @Entonces("está ordenado de la respuesta más reciente a la más antigua")
    public void newestFirst() {
        // Two answers in the same millisecond have no defined order: the timestamp is checked, not the position.
        assertThat(history()).extracting(Attempt::getAnsweredAt).isSortedAccordingTo((a, b) -> b.compareTo(a));
    }

    /** Only the two values of the vocabulary: a typo must not read as "incorrecta". */
    private static boolean result(String value) {
        assertThat(value).as("resultado").isIn("correcta", "incorrecta");
        return value.equals("correcta");
    }

    private Response record(String situation, BigDecimal stack, String hand, String given) {
        Map<String, Object> attempt = Map.of("situation", situation, "stack", stack, "hand", hand, "given", given);
        return context.api().quiz().record(attempt);
    }

    private List<Attempt> history() {
        Response response = context.api().quiz().list(Map.of());
        assertThat(response.statusCode()).as(response.asString()).isEqualTo(200);
        return response.as(AttemptPage.class).getItems();
    }
}
