package com.pedromorago.spintrainer.qa.client;

import com.pedromorago.spintrainer.qa.auth.TestUser;

/**
 * Entry point for the tests: {@code Api.as(pedro).ranges().putUser(...)}. Every call is validated against the
 * contract unless the test asks otherwise ({@link #withoutContract()}) for routes the spec does not declare.
 */
public final class Api {

    private final Auth auth;
    private final boolean validateContract;

    private Api(Auth auth, boolean validateContract) {
        this.auth = auth;
        this.validateContract = validateContract;
    }

    public static Api as(TestUser user) {
        return new Api(Auth.as(user), true);
    }

    public static Api withToken(String rawToken) {
        return new Api(Auth.token(rawToken), true);
    }

    public static Api anonymous() {
        return new Api(Auth.none(), true);
    }

    public Api withoutContract() {
        return new Api(auth, false);
    }

    public SituationService situations() {
        return new SituationService(auth, validateContract);
    }

    public RangeService ranges() {
        return new RangeService(auth, validateContract);
    }

    public QuizService quiz() {
        return new QuizService(auth, validateContract);
    }

    public StatsService stats() {
        return new StatsService(auth, validateContract);
    }
}
