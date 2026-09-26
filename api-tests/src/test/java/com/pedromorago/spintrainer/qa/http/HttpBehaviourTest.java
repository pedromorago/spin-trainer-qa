package com.pedromorago.spintrainer.qa.http;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import com.pedromorago.spintrainer.qa.auth.TokenProviders;
import com.pedromorago.spintrainer.qa.config.QaConfig;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.Test;

/** Comportamiento HTTP transversal: CORS del frontend, correlation id y errores fuera del contrato. */
@Feature("HTTP")
class HttpBehaviourTest extends ApiTest {

    static final String WEB_ORIGIN = "http://localhost:4173";

    RequestSpecification raw() {
        return given().baseUri(QaConfig.get().apiUrl().toString());
    }

    @Test
    void the_web_origin_passes_the_cors_preflight() {
        Response preflight = raw().header("Origin", WEB_ORIGIN)
                .header("Access-Control-Request-Method", "PUT")
                .header("Access-Control-Request-Headers", "authorization,content-type,x-correlation-id")
                .options("/ranges/user/btn_open/25");

        assertThat(preflight.statusCode()).isEqualTo(200);
        assertThat(preflight.header("Access-Control-Allow-Origin")).isEqualTo(WEB_ORIGIN);
    }

    @Test
    void other_origins_are_rejected() {
        Response preflight = raw().header("Origin", "https://evil.example")
                .header("Access-Control-Request-Method", "GET")
                .options("/situations");

        assertThat(preflight.statusCode()).isEqualTo(403);
        assertThat(preflight.header("Access-Control-Allow-Origin")).isNull();
    }

    @Test
    void echoes_a_valid_correlation_id_and_replaces_an_unsafe_one() {
        Response valid = raw().header("X-Correlation-Id", "qa-trace-1").get("/situations");
        Response unsafe = raw().header("X-Correlation-Id", "x\tSet-Cookie: a=b").get("/situations");

        assertThat(valid.header("X-Correlation-Id")).isEqualTo("qa-trace-1");
        assertThat(valid.jsonPath().getString("correlationId")).isEqualTo("qa-trace-1");
        assertThat(unsafe.header("X-Correlation-Id")).matches("[0-9a-f-]{36}");
    }

    @Test
    void unknown_routes_and_methods_are_problems_too() {
        String token = TokenProviders.current().accessToken(pedro);

        Response unknownRoute = raw().auth().oauth2(token).get("/does-not-exist");
        Response wrongMethod = raw().auth().oauth2(token).delete("/situations");

        assertThatProblem(unknownRoute).is(ErrorType.NOT_FOUND);
        assertThat(wrongMethod.statusCode()).isEqualTo(405);
        assertThat(wrongMethod.jsonPath().getString("type")).isEqualTo("urn:spin-trainer:unsupported");
    }
}
