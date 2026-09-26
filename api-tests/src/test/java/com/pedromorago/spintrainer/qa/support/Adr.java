package com.pedromorago.spintrainer.qa.support;

/** Enlaces a las decisiones que prueba cada test (trazabilidad en el informe de Allure). */
public final class Adr {

    public static final String BASE = "https://github.com/pedromorago/spin-trainer-web/blob/main/docs/adr/";
    public static final String CONTRACT_V02 = BASE + "0013-contrato-v0-2.md";
    public static final String EFFECTIVE_RANGE = BASE + "0012-rango-efectivo.md";
    public static final String IMMUTABLE_ATTEMPTS = BASE + "0007-quiz-attempts.md";
    public static final String SUPABASE_AUTH = BASE + "0003-supabase-solo-auth.md";
    public static final String SPEC_VALIDATION = BASE + "0008-contrato-vs-pact.md";

    private Adr() {}
}
