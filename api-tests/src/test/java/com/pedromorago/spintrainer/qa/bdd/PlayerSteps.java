package com.pedromorago.spintrainer.qa.bdd;

import io.cucumber.java.es.Cuando;
import io.cucumber.java.es.Dado;

public class PlayerSteps {

    private final ScenarioContext context;

    public PlayerSteps(ScenarioContext context) {
        this.context = context;
    }

    @Dado("que soy un jugador nuevo")
    public void newPlayer() {
        context.newPlayer("jugador");
    }

    @Cuando("entra otro jugador nuevo")
    public void anotherPlayer() {
        context.newPlayer("otro jugador");
    }

    @Dado("que no tengo sesión")
    public void noSession() {
        context.anonymous();
    }

    @Cuando("consulto el catálogo de situaciones")
    public void listSituations() {
        context.remember(context.api().situations().list());
    }
}
