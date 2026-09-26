package com.pedromorago.spintrainer.qa.config;

import java.net.URI;
import java.nio.file.Path;
import java.util.Optional;

/**
 * Suite configuration. Each value comes from a system property ({@code -Dqa.x} or {@code -Pqa.x} in Gradle), from an
 * environment variable ({@code QA_X}) or from the default: the local environment of {@code env/docker-compose.yml}.
 *
 * @param apiUrl base URL of the API ({@code .../api/v1})
 * @param managedEnvironment whether the suite starts the environment (docker compose) or uses one already running
 *     ({@code QA_API_URL})
 * @param buildApi whether starting it rebuilds the API image from the sibling repo ({@code QA_BUILD_API=false}
 *     reuses the last built image)
 * @param auth token provider registered in {@code TokenProviders} ({@code local} signs with the QA key)
 * @param jwtIssuer issuer the API expects ({@code SUPABASE_URL + /auth/v1})
 * @param signingKey QA ES256 key (JWK)
 * @param jwksAdmin WireMock admin API, which plays Supabase in QA
 * @param rootDir root of the spin-trainer-qa repo
 */
public record QaConfig(
        URI apiUrl,
        boolean managedEnvironment,
        boolean buildApi,
        String auth,
        String jwtIssuer,
        Path signingKey,
        URI jwksAdmin,
        Path rootDir) {

    private static final QaConfig INSTANCE = load();

    public static QaConfig get() {
        return INSTANCE;
    }

    private static QaConfig load() {
        Path root = Path.of(value("rootDir").orElse("..")).toAbsolutePath().normalize();
        Optional<String> apiUrl = value("apiUrl");
        return new QaConfig(
                URI.create(apiUrl.orElse("http://localhost:8081/api/v1")),
                apiUrl.isEmpty(),
                value("buildApi").map(Boolean::parseBoolean).orElse(true),
                value("auth").orElse("local"),
                value("jwtIssuer").orElse("http://jwks:8080/auth/v1"),
                value("signingKey").map(Path::of).orElse(root.resolve("env/jwt/qa-signing-key.jwk.json")),
                URI.create(value("jwksAdmin").orElse("http://localhost:8089/__admin")),
                root);
    }

    /** {@code qa.apiUrl} → system property; otherwise, {@code QA_API_URL}. */
    private static Optional<String> value(String name) {
        String property = System.getProperty("qa." + name);
        if (property != null && !property.isBlank()) {
            return Optional.of(property);
        }
        String env =
                System.getenv("QA_" + name.replaceAll("([a-z])([A-Z])", "$1_$2").toUpperCase());
        return env == null || env.isBlank() ? Optional.empty() : Optional.of(env);
    }

    /** Origin of the API ({@code http://localhost:8081}), for checks outside {@code /api/v1}. */
    public URI apiOrigin() {
        return URI.create(apiUrl.getScheme() + "://" + apiUrl.getAuthority());
    }
}
