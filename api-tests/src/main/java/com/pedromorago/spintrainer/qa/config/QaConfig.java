package com.pedromorago.spintrainer.qa.config;

import java.net.URI;
import java.nio.file.Path;
import java.util.Optional;

/**
 * Configuración de la suite. Cada valor sale de una propiedad de sistema ({@code -Dqa.x} o {@code -Pqa.x} en Gradle), de
 * una variable de entorno ({@code QA_X}) o del valor por defecto: el entorno local de {@code env/docker-compose.yml}.
 *
 * @param apiUrl URL base de la API ({@code .../api/v1})
 * @param managedEnvironment si la suite levanta el entorno (docker compose) o usa uno ya en marcha ({@code QA_API_URL})
 * @param buildApi si al levantarlo reconstruye la imagen de la API desde el repo hermano ({@code QA_BUILD_API=false}
 *     reutiliza la última imagen construida)
 * @param auth proveedor de tokens registrado en {@code TokenProviders} ({@code local} firma con la clave de QA)
 * @param jwtIssuer emisor que espera la API ({@code SUPABASE_URL + /auth/v1})
 * @param signingKey clave ES256 de QA (JWK)
 * @param jwksAdmin API de administración de WireMock, que hace de Supabase en QA
 * @param rootDir raíz del repo spin-trainer-qa
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

    /** {@code qa.apiUrl} → propiedad de sistema; si no, {@code QA_API_URL}. */
    private static Optional<String> value(String name) {
        String property = System.getProperty("qa." + name);
        if (property != null && !property.isBlank()) {
            return Optional.of(property);
        }
        String env =
                System.getenv("QA_" + name.replaceAll("([a-z])([A-Z])", "$1_$2").toUpperCase());
        return env == null || env.isBlank() ? Optional.empty() : Optional.of(env);
    }

    /** Origen de la API ({@code http://localhost:8081}), para comprobaciones fuera de {@code /api/v1}. */
    public URI apiOrigin() {
        return URI.create(apiUrl.getScheme() + "://" + apiUrl.getAuthority());
    }
}
