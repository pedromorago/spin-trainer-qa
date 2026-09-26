package com.pedromorago.spintrainer.qa.auth;

import java.util.UUID;

/**
 * A test's user. Each test uses new users: their ranges, attempts and stats don't see anyone else's, so the tests
 * can run in parallel without cleaning up data.
 */
public record TestUser(UUID id, String alias) {

    public static TestUser fresh(String alias) {
        return new TestUser(UUID.randomUUID(), alias);
    }

    @Override
    public String toString() {
        return alias + " (" + id + ")";
    }
}
