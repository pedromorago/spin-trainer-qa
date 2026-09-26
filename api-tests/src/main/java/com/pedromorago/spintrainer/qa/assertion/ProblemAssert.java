package com.pedromorago.spintrainer.qa.assertion;

import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.client.CorrelationIdFilter;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import java.util.List;
import java.util.Map;
import org.assertj.core.api.AbstractAssert;

/**
 * Assertions on an error response (Problem Details):
 * {@code assertThatProblem(response).is(ErrorType.CONFLICT).hasDetail(ErrorType.CONFLICT.detail(2))}.
 */
public final class ProblemAssert extends AbstractAssert<ProblemAssert, Response> {

    private ProblemAssert(Response response) {
        super(response, ProblemAssert.class);
    }

    public static ProblemAssert assertThatProblem(Response response) {
        return new ProblemAssert(response);
    }

    /** Status, type, title and the request's correlation id. */
    public ProblemAssert is(ErrorType type) {
        isNotNull();
        JsonPath body = actual.jsonPath();
        assertThat(actual.statusCode()).as("estado").isEqualTo(type.status());
        assertThat(actual.contentType()).as("Content-Type").startsWith("application/problem+json");
        assertThat(body.getString("type")).as("type").isEqualTo(type.type());
        assertThat(body.getString("title")).as("title").isEqualTo(type.title());
        assertThat(body.getInt("status")).as("status del cuerpo").isEqualTo(type.status());
        assertThat(body.getString("correlationId"))
                .as("correlationId del cuerpo = cabecera de la respuesta")
                .isNotBlank()
                .isEqualTo(actual.header(CorrelationIdFilter.HEADER));
        return this;
    }

    public ProblemAssert hasDetail(String detail) {
        assertThat(actual.jsonPath().getString("detail")).as("detail").isEqualTo(detail);
        return this;
    }

    /** The fields reported in {@code errors}, in order. */
    public ProblemAssert hasFieldErrors(String... fields) {
        List<Map<String, String>> errors = actual.jsonPath().getList("errors");
        assertThat(errors).as("errors").isNotNull();
        assertThat(errors)
                .extracting(error -> error.get("field"))
                .as("errors[].field")
                .containsExactly(fields);
        return this;
    }

    public ProblemAssert hasFieldError(String field, String message) {
        List<Map<String, String>> errors = actual.jsonPath().getList("errors");
        assertThat(errors).as("errors").contains(Map.of("field", field, "message", message));
        return this;
    }
}
