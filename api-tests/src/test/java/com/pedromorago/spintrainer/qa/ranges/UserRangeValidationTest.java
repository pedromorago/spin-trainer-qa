package com.pedromorago.spintrainer.qa.ranges;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;
import static com.pedromorago.spintrainer.qa.data.QaReferenceData.BTN_OPEN;
import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import com.pedromorago.spintrainer.qa.data.Hands;
import com.pedromorago.spintrainer.qa.data.RangeFactory;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import io.restassured.response.Response;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;

/** Equivalence partitions and boundary values of the PUT body: nothing invalid is stored. */
@Feature("Rangos personalizados")
class UserRangeValidationTest extends ApiTest {

    Response put(String body) {
        return api.ranges().putUser(BTN_OPEN, "25", body);
    }

    static Stream<String> notCanonicalHands() {
        return Hands.NOT_CANONICAL.stream();
    }

    @ParameterizedTest(name = "mano {0}")
    @MethodSource("notCanonicalHands")
    void rejects_hands_that_are_not_canonical(String hand) {
        assertThatProblem(put("{\"hands\":{\"" + hand + "\":\"ALLIN\"},\"version\":0}"))
                .is(ErrorType.VALIDATION)
                .hasFieldErrors("hands." + hand);
        assertThat(api.ranges().getUser(BTN_OPEN, "25").statusCode())
                .as("no se guardó nada")
                .isEqualTo(404);
    }

    @Test
    void reports_every_invalid_entry_at_once() {
        assertThatProblem(put("{\"hands\":{\"AAs\":\"ALLIN\",\"QQ\":\"CHECK\",\"JJ\":\"MR_C_C\"},\"version\":0}"))
                .is(ErrorType.VALIDATION)
                .hasFieldErrors("hands.AAs", "hands.QQ") // JJ is valid: it must not be reported
                .hasFieldError("hands.AAs", "invalid hand")
                .hasFieldError("hands.QQ", "action CHECK not allowed in btn_open");
    }

    @Test
    void accepts_all_169_hands() {
        Map<String, String> everything = new HashMap<>();
        Hands.all().forEach(hand -> everything.put(hand, "ALLIN"));

        Response response = api.ranges().putUser(BTN_OPEN, "25", RangeFactory.write(everything, 0));

        assertThat(response.statusCode()).isEqualTo(201);
        assertThat(response.jsonPath().getMap("hands")).hasSize(169);
    }

    static Stream<Arguments> malformedBodies() {
        return Stream.of(
                Arguments.of("sin version", "{\"hands\":{}}", "version"),
                Arguments.of("version -1 (límite inferior - 1)", "{\"hands\":{},\"version\":-1}", "version"),
                Arguments.of("version decimal", "{\"hands\":{},\"version\":0.9}", "version"),
                Arguments.of("version como texto", "{\"hands\":{},\"version\":\"0\"}", "version"),
                Arguments.of(
                        "version 2147483648 (límite superior + 1)", "{\"hands\":{},\"version\":2147483648}", "version"),
                Arguments.of("acción que no existe", "{\"hands\":{\"AA\":\"RAISE\"},\"version\":0}", "hands.AA"),
                Arguments.of("acción null", "{\"hands\":{\"AA\":null},\"version\":0}", "hands.AA"),
                Arguments.of("acción por índice", "{\"hands\":{\"AA\":0},\"version\":0}", "hands.AA"),
                Arguments.of("campo de servidor", "{\"hands\":{},\"version\":0,\"source\":\"default\"}", "source"),
                Arguments.of("hands no es un objeto", "{\"hands\":[],\"version\":0}", "hands"),
                Arguments.of("JSON mal formado", "{\"hands\":", "body"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("malformedBodies")
    void rejects_bodies_outside_the_contract(String description, String body, String field) {
        assertThatProblem(put(body)).is(ErrorType.VALIDATION).hasFieldErrors(field);
    }

    @Test
    void version_zero_is_the_lower_boundary() {
        assertThat(put("{\"hands\":{},\"version\":0}").statusCode()).isEqualTo(201);
    }

    /** Boundary values of the document size: 64 KiB (65,536 bytes) is accepted, one byte more is not. */
    @ParameterizedTest(name = "{0} bytes → {1}")
    @CsvSource({"65536, 201", "65537, 400"})
    void the_document_size_limit_is_64_kib(int bytes, int status) {
        String head = "{\"hands\":{},";
        String tail = "\"version\":0}";
        String body = head + " ".repeat(bytes - head.length() - tail.length()) + tail;
        assertThat(body.getBytes(StandardCharsets.UTF_8)).hasSize(bytes);

        Response response = put(body);

        if (status == 400) {
            assertThatProblem(response).is(ErrorType.VALIDATION);
        } else {
            assertThat(response.statusCode()).as(response.asString()).isEqualTo(status);
        }
    }

    @ParameterizedTest(name = "{0}@{1} → {2}")
    @CsvSource({"btn_open, 12.5, 404", "mtt_open, 25, 404", "btn_open, 12.3, 400"})
    void every_operation_checks_the_combination(String situation, String stack, int status) {
        ErrorType expected = status == 404 ? ErrorType.NOT_FOUND : ErrorType.VALIDATION;

        assertThatProblem(api.ranges().getUser(situation, stack)).is(expected);
        assertThatProblem(api.ranges().putUser(situation, stack, "{\"hands\":{},\"version\":0}"))
                .is(expected);
        assertThatProblem(api.ranges().deleteUser(situation, stack)).is(expected);
    }
}
