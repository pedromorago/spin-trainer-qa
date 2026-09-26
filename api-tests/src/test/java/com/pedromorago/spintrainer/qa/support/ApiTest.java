package com.pedromorago.spintrainer.qa.support;

import com.pedromorago.spintrainer.qa.auth.TestUser;
import com.pedromorago.spintrainer.qa.client.Api;
import io.qameta.allure.Allure;
import io.qameta.allure.Epic;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.extension.ExtendWith;

/**
 * Base of the API tests: a new user per test ({@code pedro}) and their client ({@code api}). The user is recorded as
 * an Allure parameter so that their requests can be found in the API logs.
 */
@Epic("API")
@ExtendWith(QaTestWatcher.class)
public abstract class ApiTest {

    protected TestUser pedro;
    protected Api api;

    @BeforeEach
    void newUser(TestInfo test) {
        pedro = TestUser.fresh(test.getDisplayName());
        api = Api.as(pedro);
        Allure.parameter("usuario", pedro.id().toString());
    }
}
