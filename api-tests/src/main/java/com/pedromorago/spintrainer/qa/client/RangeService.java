package com.pedromorago.spintrainer.qa.client;

import io.restassured.response.Response;

/**
 * The contract's {@code range} tag. The stack is sent as is ({@code "12.5"}, {@code "25.0"}) so that non-canonical
 * forms can be tested; the body is a generated model, or raw JSON for invalid requests.
 */
public final class RangeService extends ServiceBase {

    RangeService(Auth auth, boolean validateContract) {
        super(auth, validateContract);
    }

    public Response listDefault() {
        return request().get("/ranges/default");
    }

    public Response getDefault(String situation, Object stack) {
        return request().get("/ranges/default/{situation}/{stack}", situation, stack);
    }

    public Response getDefault(String situation, Object stack, String ifNoneMatch) {
        return request()
                .header("If-None-Match", ifNoneMatch)
                .get("/ranges/default/{situation}/{stack}", situation, stack);
    }

    public Response listUser() {
        return request().get("/ranges/user");
    }

    public Response getUser(String situation, Object stack) {
        return request().get("/ranges/user/{situation}/{stack}", situation, stack);
    }

    public Response putUser(String situation, Object stack, Object body) {
        return request().body(body).put("/ranges/user/{situation}/{stack}", situation, stack);
    }

    public Response deleteUser(String situation, Object stack) {
        return request().delete("/ranges/user/{situation}/{stack}", situation, stack);
    }
}
