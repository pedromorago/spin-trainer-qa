package com.pedromorago.spintrainer.qa.security;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;
import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import com.pedromorago.spintrainer.qa.auth.JwtForge;
import com.pedromorago.spintrainer.qa.client.Api;
import com.pedromorago.spintrainer.qa.config.QaConfig;
import com.pedromorago.spintrainer.qa.support.Adr;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import io.qameta.allure.Link;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Isolated;

/**
 * If the issuer (Supabase) doesn't respond, the client gets a 503, not a 401 the web would take as a closed session.
 * WireMock stops serving the JWKS and the token carries a new key, which the API has to go and fetch. Isolated: it
 * changes the JWKS the whole suite uses.
 */
@Isolated
@Feature("Seguridad")
@Link(name = "ADR-0003", url = Adr.SUPABASE_AUTH)
class IssuerOutageTest extends ApiTest {

    @Test
    void an_unreachable_issuer_is_a_503_not_a_401() {
        String tokenWithNewKey = JwtForge.fromConfig(QaConfig.get()).signedByUnknownKey(UUID.randomUUID());

        JwksOutage outage = JwksOutage.start();
        try {
            // 503 isn't declared per operation (the spec documents it globally): the Problem's shape is validated here.
            assertThatProblem(Api.withToken(tokenWithNewKey)
                            .withoutContract()
                            .situations()
                            .list())
                    .is(ErrorType.UNAVAILABLE);
        } finally {
            outage.end();
        }
        // The API goes back to the issuer for the unknown key and gets an answer: 401 (the key is not there), no
        // longer 503. A request with the usual token would pass anyway: its key was already cached.
        assertThat(Api.withToken(tokenWithNewKey)
                        .withoutContract()
                        .situations()
                        .list()
                        .statusCode())
                .as("el emisor vuelve a responder")
                .isEqualTo(401);
        assertThat(api.situations().list().statusCode())
                .as("vuelve a funcionar")
                .isEqualTo(200);
    }
}
