package com.pedromorago.spintrainer.qa.client;

import io.restassured.response.Response;
import java.util.Map;

/** Tag {@code quiz} del contrato. */
public final class QuizService extends ServiceBase {

    QuizService(Auth auth, boolean validateContract) {
        super(auth, validateContract);
    }

    public Response record(Object attempt) {
        return request().body(attempt).post("/quiz/attempts");
    }

    public Response list(Map<String, ?> query) {
        return request().queryParams(query).get("/quiz/attempts");
    }
}
