package com.pedromorago.spintrainer.qa.auth;

/** Gets a user's session JWT (the API only accepts tokens from its configured issuer). */
public interface TokenProvider {

    String accessToken(TestUser user);
}
