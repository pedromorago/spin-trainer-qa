package com.pedromorago.spintrainer.qa.client;

import io.restassured.response.Response;
import java.util.Map;

/** Tag {@code stats} del contrato. */
public final class StatsService extends ServiceBase {

    StatsService(Auth auth, boolean validateContract) {
        super(auth, validateContract);
    }

    public Response hands(Map<String, ?> query) {
        return request().queryParams(query).get("/stats/hands");
    }

    public Response progress(Map<String, ?> query) {
        return request().queryParams(query).get("/stats/progress");
    }
}
