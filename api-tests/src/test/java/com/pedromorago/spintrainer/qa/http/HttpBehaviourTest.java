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
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Cross-cutting HTTP behaviour: frontend CORS, correlation id and errors outside the contract. */
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

    /**
     * The web sends {@code Accept: application/json}: it must be able to use every operation of the contract and
     * receive the errors as Problem Details. The DELETE (whose only representation is a Problem) responded 406 (found
     * by the E2E tests). Raw requests: the contract of each response is validated by the per-module suites.
     */
    @Test
    void a_client_that_only_accepts_json_can_use_every_operation() {
        String token = TokenProviders.current().accessToken(pedro);
        Supplier<RequestSpecification> json = () -> raw().auth().oauth2(token).accept("application/json");
        String range = "{\"hands\":{\"AA\":\"ALLIN\"},\"version\":0}";
        String attempt = "{\"situation\":\"btn_open\",\"stack\":25,\"hand\":\"AA\",\"given\":\"ALLIN\"}";

        Map<String, Response> operations = new LinkedHashMap<>();
        operations.put("GET /situations", json.get().get("/situations"));
        operations.put("GET /ranges/default", json.get().get("/ranges/default"));
        operations.put("GET /ranges/default/{s}/{st}", json.get().get("/ranges/default/btn_open/25"));
        operations.put(
                "PUT /ranges/user/{s}/{st}",
                json.get().contentType("application/json").body(range).put("/ranges/user/btn_open/25"));
        operations.put("GET /ranges/user", json.get().get("/ranges/user"));
        operations.put("GET /ranges/user/{s}/{st}", json.get().get("/ranges/user/btn_open/25"));
        operations.put(
                "POST /quiz/attempts",
                json.get().contentType("application/json").body(attempt).post("/quiz/attempts"));
        operations.put("GET /quiz/attempts", json.get().get("/quiz/attempts"));
        operations.put("GET /stats/hands", json.get().get("/stats/hands"));
        operations.put("GET /stats/progress", json.get().get("/stats/progress"));
        operations.put("DELETE /ranges/user/{s}/{st}", json.get().delete("/ranges/user/btn_open/25"));

        assertThat(operations).allSatisfy((operation, response) -> {
            assertThat(response.statusCode())
                    .as(operation + " " + response.asString())
                    .isBetween(200, 204);
            if (response.statusCode() != 204) {
                assertThat(response.contentType()).as(operation).startsWith("application/json");
            }
        });
        assertThat(operations).hasSize(11);
        assertThatProblem(json.get().delete("/ranges/user/btn_open/12.5")).is(ErrorType.NOT_FOUND);
    }

    /**
     * URLs Spring Security's firewall rejects never reach a controller: a path parameter got Spring Boot's own error
     * body (no type, no correlation id), and an encoded slash Tomcat's HTML error page. The API's integration tests
     * cannot see the second one (MockMvc has no Tomcat). A double slash is not an error: Tomcat merges it.
     */
    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"/situations;jsessionid=1", "/ranges/default/btn_open%2F25"})
    void urls_the_firewall_rejects_are_problems_too(String path) {
        String token = TokenProviders.current().accessToken(pedro);

        Response response = raw().urlEncodingEnabled(false).auth().oauth2(token).get(path);

        assertThatProblem(response).is(ErrorType.VALIDATION).hasDetail("Ruta no válida");
    }

    /** The deployed commit is public (the deploy waits for it); nothing else of Actuator is. */
    @Test
    void only_health_and_the_revision_are_public() {
        Response info = given().baseUri(QaConfig.get().apiOrigin().toString()).get("/actuator/info");
        Response env = given().baseUri(QaConfig.get().apiOrigin().toString()).get("/actuator/env");

        assertThat(info.statusCode()).isEqualTo(200);
        assertThat(info.jsonPath().getMap("$")).containsOnlyKeys("app");
        assertThat(info.jsonPath().getMap("app")).containsOnlyKeys("revision");
        assertThat(env.statusCode()).isEqualTo(401);
    }
}
