package com.pedromorago.spintrainer.qa.client;

import io.restassured.response.Response;

/** The contract's {@code situation} tag. */
public final class SituationService extends ServiceBase {

    SituationService(Auth auth, boolean validateContract) {
        super(auth, validateContract);
    }

    public Response list() {
        return request().get("/situations");
    }

    public Response list(String ifNoneMatch) {
        return request().header("If-None-Match", ifNoneMatch).get("/situations");
    }
}
