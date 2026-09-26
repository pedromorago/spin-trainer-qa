package com.pedromorago.spintrainer.qa.bdd;

import static com.pedromorago.spintrainer.qa.assertion.ProblemAssert.assertThatProblem;

import com.pedromorago.spintrainer.qa.assertion.ErrorType;
import io.cucumber.java.es.Entonces;
import java.util.Map;

public class ErrorSteps {

    private static final Map<String, ErrorType> BY_NAME = Map.of(
            "validación", ErrorType.VALIDATION,
            "no autenticado", ErrorType.UNAUTHORIZED,
            "no encontrado", ErrorType.NOT_FOUND,
            "conflicto", ErrorType.CONFLICT,
            "sin rango", ErrorType.NO_RANGE);

    private final ScenarioContext context;

    public ErrorSteps(ScenarioContext context) {
        this.context = context;
    }

    @Entonces("la API lo rechaza como {string}")
    public void rejected(String error) {
        assertThatProblem(context.lastResponse()).is(type(error));
    }

    @Entonces("la API lo rechaza como {string} con el detalle {string}")
    public void rejectedWithDetail(String error, String detail) {
        assertThatProblem(context.lastResponse()).is(type(error)).hasDetail(detail);
    }

    private static ErrorType type(String name) {
        ErrorType type = BY_NAME.get(name);
        if (type == null) {
            throw new IllegalArgumentException(
                    "Error desconocido en la feature: " + name + "; válidos: " + BY_NAME.keySet());
        }
        return type;
    }
}
