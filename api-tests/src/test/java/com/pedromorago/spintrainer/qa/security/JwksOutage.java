package com.pedromorago.spintrainer.qa.security;

import static io.restassured.RestAssured.given;

import com.pedromorago.spintrainer.qa.config.QaConfig;

/** Simula la caída de Supabase: WireMock responde 500 en el JWKS hasta {@link #end()} (recarga los mappings). */
final class JwksOutage {

    private static final String STUB = """
            {"priority":1,"request":{"method":"GET","url":"/auth/v1/.well-known/jwks.json"},
             "response":{"status":500}}""";

    private JwksOutage() {}

    static JwksOutage start() {
        given().baseUri(QaConfig.get().jwksAdmin().toString())
                .contentType("application/json")
                .body(STUB)
                .post("/mappings")
                .then()
                .statusCode(201);
        return new JwksOutage();
    }

    void end() {
        given().baseUri(QaConfig.get().jwksAdmin().toString())
                .post("/mappings/reset")
                .then()
                .statusCode(200);
    }
}
