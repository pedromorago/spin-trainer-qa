package com.pedromorago.spintrainer.qa.security;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

import com.nimbusds.jwt.JWTClaimsSet;
import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import com.pedromorago.spintrainer.qa.auth.JwtForge;
import com.pedromorago.spintrainer.qa.client.Api;
import com.pedromorago.spintrainer.qa.config.QaConfig;
import com.pedromorago.spintrainer.qa.support.Adr;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import io.qameta.allure.Link;
import io.restassured.response.Response;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The API only accepts session JWTs from its issuer (ADR-0003): ES256 signature against the JWKS, issuer, audience,
 * role, expiry and a user sub. Each invalid variant is a 401 with {@code error="invalid_token"}.
 */
@Feature("Seguridad")
@Link(name = "ADR-0003", url = Adr.SUPABASE_AUTH)
class AuthenticationTest extends ApiTest {

    static final JwtForge FORGE = JwtForge.fromConfig(QaConfig.get());
    static final UUID USER = UUID.randomUUID();

    static Arguments variant(String name, Consumer<JWTClaimsSet.Builder> claims) {
        return Arguments.of(name, FORGE.session(USER, claims));
    }

    static Stream<Arguments> invalidTokens() {
        Instant past = Instant.now().minusSeconds(3600);
        return Stream.of(
                variant(
                        "caducado",
                        c -> c.issueTime(Date.from(past.minusSeconds(60))).expirationTime(Date.from(past))),
                variant("sin caducidad", c -> c.expirationTime(null)),
                variant("otro emisor", c -> c.issuer("https://evil.example/auth/v1")),
                variant("otra audiencia", c -> c.audience("service")),
                variant("rol anon", c -> c.claim("role", "anon")),
                variant("rol service_role", c -> c.claim("role", "service_role")),
                variant("sub que no es un usuario", c -> c.subject("admin")),
                Arguments.of("clave fuera del JWKS", FORGE.signedByUnknownKey(USER)),
                Arguments.of("HS256 (secreto heredado)", FORGE.hs256(USER)),
                Arguments.of("sin firma (alg none)", FORGE.unsigned(USER)),
                Arguments.of("no es un JWT", "no-es-un-jwt"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidTokens")
    void rejects_tokens_the_api_did_not_issue_for_a_session(String description, String token) {
        Response response = Api.withToken(token).situations().list();

        assertThatProblem(response).is(ErrorType.UNAUTHORIZED);
        assertThat(response.header("WWW-Authenticate")).isEqualTo("Bearer error=\"invalid_token\"");
    }

    @Test
    void without_a_token_asks_for_one() {
        Response response = Api.anonymous().situations().list();

        assertThatProblem(response)
                .is(ErrorType.UNAUTHORIZED)
                .hasDetail("Missing access token (Authorization: Bearer)");
        assertThat(response.header("WWW-Authenticate")).isEqualTo("Bearer");
    }

    @Test
    void health_is_public_and_hides_details() {
        Response health = given().baseUri(QaConfig.get().apiOrigin().toString()).get("/actuator/health");

        assertThat(health.statusCode()).isEqualTo(200);
        assertThat(health.jsonPath().getString("status")).isEqualTo("UP");
        assertThat(health.jsonPath().getMap("$")).doesNotContainKey("components");
    }
}
