package com.pedromorago.spintrainer.qa.quiz;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;
import static com.pedromorago.spintrainer.qa.data.QaReferenceData.BB_VS_SB_LIMP;
import static com.pedromorago.spintrainer.qa.data.QaReferenceData.BTN_OPEN;
import static com.pedromorago.spintrainer.qa.data.QaReferenceData.BTN_OPEN_ACTIONS;
import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import com.pedromorago.spintrainer.qa.data.Hands;
import com.pedromorago.spintrainer.qa.data.QaReferenceData;
import com.pedromorago.spintrainer.qa.data.RangeFactory;
import com.pedromorago.spintrainer.qa.model.Action;
import com.pedromorago.spintrainer.qa.model.Attempt;
import com.pedromorago.spintrainer.qa.model.AttemptWrite;
import com.pedromorago.spintrainer.qa.support.Adr;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import io.qameta.allure.Link;
import io.restassured.response.Response;
import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * The server grades the Quiz (ADR-0013). Decision table: is there a user range? × is the hand in the range? →
 * expected action and source range.
 */
@Feature("Quiz: corrección en el servidor")
@Link(name = "ADR-0013", url = Adr.CONTRACT_V02)
@Link(name = "ADR-0012", url = Adr.EFFECTIVE_RANGE)
class QuizGradingTest extends ApiTest {

    static AttemptWrite attempt(String situation, double stack, String hand, String given) {
        return new AttemptWrite()
                .situation(situation)
                .stack(BigDecimal.valueOf(stack))
                .hand(hand)
                .given(Action.fromValue(given));
    }

    Attempt record(String situation, double stack, String hand, String given) {
        Response response = api.quiz().record(attempt(situation, stack, hand, given));
        assertThat(response.statusCode()).as(response.asString()).isEqualTo(201);
        return response.as(Attempt.class);
    }

    @ParameterizedTest(name = "rango del usuario={0}, mano {1} → {2} ({3})")
    @CsvSource({
        // user range, hand, expected, source
        "false, AA,  MR_4B_C, default", // no own range, hand in the reference one
        "false, 72o, FOLD,    default", // no own range, hand outside it: implicit action
        "true,  A5s, ALLIN,   user", // own range, hand in it
        "true,  AA,  FOLD,    user", // own range, hand outside it (even if it is in the reference one)
    })
    @Tag("smoke")
    void grades_against_the_effective_range(boolean userRange, String hand, String expected, String source) {
        if (userRange) {
            api.ranges().putUser(BTN_OPEN, "25", RangeFactory.write(Map.of("A5s", "ALLIN"), 0));
        }

        Attempt attempt = record(BTN_OPEN, 25, hand, "FOLD");

        assertThat(attempt.getExpected().getValue()).isEqualTo(expected);
        assertThat(attempt.getCorrect()).isEqualTo(expected.equals("FOLD"));
        assertThat(attempt.getRangeSource().getValue()).isEqualTo(source);
        assertThat(attempt.getRangeVersion()).isEqualTo(1);
    }

    @Test
    void where_folding_is_not_possible_the_implicit_action_is_check() {
        api.ranges().putUser(BB_VS_SB_LIMP, "10", RangeFactory.write(Map.of("AA", "ALLIN"), 0));

        Attempt attempt = record(BB_VS_SB_LIMP, 10, "72o", "CHECK");

        assertThat(attempt.getExpected()).isEqualTo(Action.CHECK);
        assertThat(attempt.getCorrect()).isTrue();
    }

    /** Oracle: the QA reference range. Random hand and answer; the grading must match. */
    @RepeatedTest(10)
    void agrees_with_the_reference_range_for_any_hand_and_answer() {
        String hand = Hands.random();
        String given = BTN_OPEN_ACTIONS.get(ThreadLocalRandom.current().nextInt(BTN_OPEN_ACTIONS.size()));

        Attempt attempt = record(BTN_OPEN, 25, hand, given);

        String expected = QaReferenceData.btnOpen25Action(hand);
        assertThat(attempt.getExpected().getValue()).as(hand).isEqualTo(expected);
        assertThat(attempt.getCorrect()).as(hand + " " + given).isEqualTo(given.equals(expected));
    }

    @Test
    void past_attempts_keep_their_grade_when_the_range_changes() {
        Attempt before = record(BTN_OPEN, 25, "72o", "FOLD");
        Response saved = api.ranges().putUser(BTN_OPEN, "25", RangeFactory.write(Map.of("72o", "ALLIN"), 0));
        assertThat(saved.statusCode())
                .as("el rango se guardó: " + saved.asString())
                .isEqualTo(201);

        // Positive control: the range did change, a new answer is graded against it.
        Attempt after = record(BTN_OPEN, 25, "72o", "FOLD");
        assertThat(after.getExpected()).as("esperada con el rango nuevo").isEqualTo(Action.ALLIN);
        assertThat(after.getRangeSource()).isEqualTo(Attempt.RangeSourceEnum.USER);

        Attempt past = api.quiz().list(Map.of()).jsonPath().getList("items", Attempt.class).stream()
                .filter(a -> a.getId().equals(before.getId()))
                .findFirst()
                .orElseThrow();
        assertThat(past.getExpected()).isEqualTo(Action.FOLD);
        assertThat(past.getCorrect()).isTrue();
        assertThat(past.getRangeSource()).isEqualTo(Attempt.RangeSourceEnum.DEFAULT);
    }

    @Test
    void a_spot_without_any_range_cannot_be_graded() {
        assertThatProblem(api.quiz().record(attempt(BTN_OPEN, 8, "AA", "FOLD")))
                .is(ErrorType.NO_RANGE)
                .hasDetail(ErrorType.NO_RANGE.detail(BTN_OPEN, 8));
    }

    @Test
    void the_client_cannot_grade_itself() {
        String cheating =
                "{\"situation\":\"btn_open\",\"stack\":25,\"hand\":\"72o\",\"given\":\"ALLIN\",\"correct\":true}";

        assertThatProblem(api.quiz().record(cheating)).is(ErrorType.VALIDATION).hasFieldErrors("correct");
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource(delimiter = '|', textBlock = """
            combinación desconocida | {"situation":"btn_open","stack":12.5,"hand":"AA","given":"FOLD"}  | 404 | -
            mano no canónica        | {"situation":"btn_open","stack":25,"hand":"KAs","given":"FOLD"}   | 400 | hand
            acción de otra situación| {"situation":"btn_open","stack":25,"hand":"AA","given":"CHECK"}   | 400 | given
            stack como texto        | {"situation":"btn_open","stack":"25","hand":"AA","given":"FOLD"}  | 400 | stack
            acción por índice       | {"situation":"btn_open","stack":25,"hand":"AA","given":17}        | 400 | given
            situación como número   | {"situation":5,"stack":25,"hand":"AA","given":"FOLD"}             | 400 | situation
            situación como booleano | {"situation":true,"stack":25,"hand":"AA","given":"FOLD"}          | 400 | situation
            """)
    void rejects_invalid_attempts(String description, String body, int status, String field) {
        Response response = api.quiz().record(body);

        if (status == 404) {
            assertThatProblem(response).is(ErrorType.NOT_FOUND);
        } else {
            assertThatProblem(response).is(ErrorType.VALIDATION).hasFieldErrors(field);
        }
    }
}
