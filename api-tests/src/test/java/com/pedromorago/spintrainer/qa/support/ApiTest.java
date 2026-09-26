package com.pedromorago.spintrainer.qa.support;

import com.pedromorago.spintrainer.qa.auth.TestUser;
import com.pedromorago.spintrainer.qa.client.Api;
import io.qameta.allure.Allure;
import io.qameta.allure.Epic;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.extension.ExtendWith;

/**
 * Base de los tests de API: un usuario nuevo por test ({@code pedro}) y su cliente ({@code api}). El usuario queda como
 * parámetro en Allure para poder buscar sus peticiones en los logs de la API.
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
