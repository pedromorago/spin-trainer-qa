package com.pedromorago.spintrainer.qa.bdd;

import io.cucumber.java.ParameterType;
import java.math.BigDecimal;

/** Vocabulario de las features: manos, stacks en BB (con coma o punto decimal) y el resultado de una respuesta. */
public class ParameterTypes {

    @ParameterType("[2-9TJQKA]{2}[so]?")
    public String mano(String hand) {
        return hand;
    }

    @ParameterType("\\d+(?:[.,]\\d+)?")
    public BigDecimal stack(String stack) {
        return new BigDecimal(stack.replace(',', '.'));
    }

    @ParameterType("correcta|incorrecta")
    public Boolean resultado(String result) {
        return result.equals("correcta");
    }
}
