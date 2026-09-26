package com.pedromorago.spintrainer.qa.bdd;

import com.pedromorago.spintrainer.qa.support.Adr;
import com.pedromorago.spintrainer.qa.support.QaTestWatcher;
import io.cucumber.java.After;
import io.cucumber.java.Before;
import io.cucumber.java.Scenario;
import io.qameta.allure.Allure;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Trazabilidad en Allure: las etiquetas {@code @ADR-0012} se convierten en enlaces al ADR, como {@code @Link} en JUnit. */
public class Hooks {

    private static final Pattern ADR_TAG = Pattern.compile("@ADR-(\\d{4})");

    @Before
    public void linkDecisions(Scenario scenario) {
        Allure.epic("Reglas de negocio");
        for (String tag : scenario.getSourceTagNames()) {
            Matcher adr = ADR_TAG.matcher(tag);
            if (adr.matches()) {
                Allure.link("ADR-" + adr.group(1), Adr.url(adr.group(1)));
            }
        }
    }

    @After
    public void attachEnvironmentOnFailure(Scenario scenario) {
        if (scenario.isFailed()) {
            QaTestWatcher.attachEnvironment();
        }
    }
}
