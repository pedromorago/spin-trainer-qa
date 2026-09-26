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
 * Si el emisor (Supabase) no responde, el cliente recibe un 503, no un 401 que la web tomaría por sesión cerrada.
 * WireMock deja de servir el JWKS y el token trae una clave nueva, que la API tiene que ir a buscar. Aislado: cambia el
 * JWKS que usa toda la suite.
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
            // 503 no se declara por operación (la spec lo documenta en general): se valida la forma del Problem aquí.
            assertThatProblem(Api.withToken(tokenWithNewKey)
                            .withoutContract()
                            .situations()
                            .list())
                    .is(ErrorType.UNAVAILABLE);
        } finally {
            outage.end();
        }
        assertThat(api.situations().list().statusCode())
                .as("vuelve a funcionar")
                .isEqualTo(200);
    }
}
