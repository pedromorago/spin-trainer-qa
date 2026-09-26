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
 * State of a scenario, shared by all its step classes (picocontainer creates one per scenario): the player used to
 * talk to the API, the last response to an action ({@code Cuando}) and the last Quiz answer.
 */
public final class ScenarioContext {

    private Api api;
    private Response lastResponse;
    private Attempt lastAttempt;

    /** A new player becomes the current one; the previous one still exists, with its data. */
    void newPlayer(String alias) {
        TestUser player = TestUser.fresh(alias);
        api = Api.as(player);
        // Allure.parameter doesn't work here: allure-cucumber7 creates example-less scenarios with an immutable list.
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
