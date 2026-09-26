package com.pedromorago.spintrainer.qa.bdd;

import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.auth.TestUser;
import com.pedromorago.spintrainer.qa.client.Api;
import com.pedromorago.spintrainer.qa.model.Attempt;
import io.qameta.allure.Allure;
import io.qameta.allure.model.Parameter;
import io.restassured.response.Response;
import java.util.ArrayList;
import java.util.List;

/**
 * Estado de un escenario, compartido por todas sus clases de steps (picocontainer crea uno por escenario): el jugador
 * con el que se habla a la API, la última respuesta de una acción ({@code Cuando}) y la última respuesta del Quiz.
 */
public final class ScenarioContext {

    private Api api;
    private Response lastResponse;
    private Attempt lastAttempt;

    /** Un jugador nuevo pasa a ser el actual; el anterior sigue existiendo, con sus datos. */
    void newPlayer(String alias) {
        TestUser player = TestUser.fresh(alias);
        api = Api.as(player);
        // Allure.parameter no sirve aquí: allure-cucumber7 crea los escenarios sin ejemplos con una lista inmutable.
        Allure.getLifecycle().updateTestCase(result -> {
            List<Parameter> parameters = new ArrayList<>(result.getParameters());
            parameters.add(new Parameter().setName(alias).setValue(player.id().toString()));
            result.setParameters(parameters);
        });
    }

    void anonymous() {
        api = Api.anonymous();
    }

    Api api() {
        assertThat(api).as("el escenario no ha dicho quién es el jugador").isNotNull();
        return api;
    }

    Response remember(Response response) {
        lastResponse = response;
        return response;
    }

    Response lastResponse() {
        assertThat(lastResponse).as("ningún paso anterior llamó a la API").isNotNull();
        return lastResponse;
    }

    void rememberAttempt(Attempt attempt) {
        lastAttempt = attempt;
    }

    Attempt lastAttempt() {
        assertThat(lastAttempt).as("ningún paso anterior respondió en el Quiz").isNotNull();
        return lastAttempt;
    }
}
