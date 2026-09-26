package com.pedromorago.spintrainer.qa.security;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Named.named;

import com.pedromorago.spintrainer.qa.auth.TokenProviders;
import com.pedromorago.spintrainer.qa.client.Api;
import com.pedromorago.spintrainer.qa.config.QaConfig;
import com.pedromorago.spintrainer.qa.data.RangeFactory;
import com.pedromorago.spintrainer.qa.support.ApiTest;
import io.qameta.allure.Feature;
import io.restassured.response.Response;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Stream;
import org.junit.jupiter.api.Named;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * Hardening headers, checked on each class of response (equivalence partitioning): catalog that clients revalidate,
 * personal data, writes and errors, inside and outside the contract. Browsers must not sniff content types or frame the
 * API, and no cache may store a player's data. With no security scanner (ZAP was discarded, ADR-0010), these are the
 * explicit checks for the headers; the catalog's revalidation ({@code no-cache, private} + ETag) is in
 * {@code SituationCatalogTest}.
 */
@Feature("Seguridad")
class SecurityHeadersTest extends ApiTest {

    static Stream<Named<Function<Api, Response>>> everyKindOfResponse() {
        return Stream.concat(
                personalData(),
                Stream.of(
                        named("catálogo de situaciones", api -> api.situations().list()),
                        named("rango de referencia", api -> api.ranges().getDefault("btn_open", 25)),
                        named(
                                "401 sin token",
                                api -> Api.anonymous().situations().list()),
                        named(
                                "404 de una situación desconocida",
                                api -> api.ranges().getDefault("mtt_open", 25))));
    }

    static Stream<Named<Function<Api, Response>>> personalData() {
        return Stream.of(
                named("rangos personalizados", api -> api.ranges().listUser()),
                named(
                        "guardado de un rango",
                        api -> api.ranges().putUser("btn_open", 25, RangeFactory.write(Map.of("AA", "ALLIN"), 0))),
                named("historial del Quiz", api -> api.quiz().list(Map.of())),
                named("estadísticas por mano", api -> api.stats().hands(Map.of())),
                named("progreso diario", api -> api.stats().progress(Map.of())));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("everyKindOfResponse")
    void no_response_can_be_sniffed_or_framed(Function<Api, Response> request) {
        assertHardened(request.apply(api));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("personalData")
    void personal_data_is_never_stored_by_a_cache(Function<Api, Response> request) {
        Response response = request.apply(api);

        assertThat(response.statusCode()).isLessThan(300);
        assertThat(response.header("Cache-Control")).as("Cache-Control").contains("no-store");
    }

    @Test
    void errors_outside_the_contract_are_hardened_too() {
        Response unknownRoute = given().baseUri(QaConfig.get().apiUrl().toString())
                .auth()
                .oauth2(TokenProviders.current().accessToken(pedro))
                .get("/does-not-exist");

        assertThat(unknownRoute.statusCode()).isEqualTo(404);
        assertHardened(unknownRoute);
    }

    private static void assertHardened(Response response) {
        assertThat(response.header("X-Content-Type-Options"))
                .as("X-Content-Type-Options")
                .isEqualTo("nosniff");
        assertThat(response.header("X-Frame-Options")).as("X-Frame-Options").isEqualTo("DENY");
    }
}
