package com.pedromorago.spintrainer.qa.auth;

import com.pedromorago.spintrainer.qa.config.QaConfig;
import java.util.Map;
import java.util.function.Function;

/**
 * Registro de proveedores de tokens por entorno ({@code qa.auth}). En QA, {@code local} firma con la clave de QA el
 * mismo token que emitiría Supabase. Otro entorno (staging con Supabase real) se añade registrando su proveedor aquí,
 * sin tocar los tests.
 */
public final class TokenProviders {

    private static final Map<String, Function<QaConfig, TokenProvider>> REGISTRY =
            Map.of("local", config -> new LocalJwtTokenProvider(JwtForge.fromConfig(config)));

    private static final TokenProvider DEFAULT = forConfig(QaConfig.get());

    private TokenProviders() {}

    public static TokenProvider forConfig(QaConfig config) {
        Function<QaConfig, TokenProvider> factory = REGISTRY.get(config.auth());
        if (factory == null) {
            throw new IllegalStateException(
                    "Proveedor de tokens desconocido: " + config.auth() + " (registrados: " + REGISTRY.keySet() + ")");
        }
        return factory.apply(config);
    }

    public static TokenProvider current() {
        return DEFAULT;
    }
}
