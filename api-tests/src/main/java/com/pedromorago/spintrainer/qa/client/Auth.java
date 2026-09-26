package com.pedromorago.spintrainer.qa.client;

import com.pedromorago.spintrainer.qa.auth.TestUser;
import com.pedromorago.spintrainer.qa.auth.TokenProviders;
import io.restassured.specification.RequestSpecification;

/** How a request authenticates: as a user (token from its provider), with a given token or with no token. */
public sealed interface Auth {

    void apply(RequestSpecification request);

    static Auth as(TestUser user) {
        return new AsUser(user);
    }

    static Auth token(String rawToken) {
        return new Raw(rawToken);
    }

    static Auth none() {
        return new None();
    }

    record AsUser(TestUser user) implements Auth {
        @Override
        public void apply(RequestSpecification request) {
            request.auth().oauth2(TokenProviders.current().accessToken(user));
        }
    }

    record Raw(String token) implements Auth {
        @Override
        public void apply(RequestSpecification request) {
            request.header("Authorization", "Bearer " + token);
        }
    }

    record None() implements Auth {
        @Override
        public void apply(RequestSpecification request) {}
    }
}
