package com.pedromorago.spintrainer.qa.security;

import static io.restassured.RestAssured.given;

import com.pedromorago.spintrainer.qa.config.QaConfig;

/** Simulates a Supabase outage: WireMock responds 500 on the JWKS until {@link #end()} (reloads the mappings). */
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
