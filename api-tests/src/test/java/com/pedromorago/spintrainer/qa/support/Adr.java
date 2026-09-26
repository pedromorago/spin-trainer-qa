package com.pedromorago.spintrainer.qa.support;

import java.util.Map;

/** Enlaces a las decisiones que prueba cada test (trazabilidad en el informe de Allure). */
public final class Adr {

    public static final String BASE = "https://github.com/pedromorago/spin-trainer-web/blob/main/docs/adr/";
    public static final String CONTRACT_V02 = BASE + "0013-contrato-v0-2.md";
    public static final String EFFECTIVE_RANGE = BASE + "0012-rango-efectivo.md";
    public static final String IMMUTABLE_ATTEMPTS = BASE + "0007-quiz-attempts.md";
    public static final String SUPABASE_AUTH = BASE + "0003-supabase-solo-auth.md";
    public static final String SPEC_VALIDATION = BASE + "0008-contrato-vs-pact.md";

    private static final Map<String, String> BY_NUMBER = Map.of(
            "0003", SUPABASE_AUTH,
            "0007", IMMUTABLE_ATTEMPTS,
            "0008", SPEC_VALIDATION,
            "0012", EFFECTIVE_RANGE,
            "0013", CONTRACT_V02);

    private Adr() {}

    /** Enlace de un ADR por su número ({@code "0012"}), para las etiquetas {@code @ADR-0012} de las features. */
    public static String url(String number) {
        String url = BY_NUMBER.get(number);
        if (url == null) {
            throw new IllegalArgumentException("ADR sin enlace en Adr: " + number);
        }
        return url;
    }
}
