package com.pedromorago.spintrainer.qa.support;

import com.pedromorago.spintrainer.qa.config.QaConfig;
import io.qameta.allure.Allure;
import java.util.Optional;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;

/** When a test fails, attaches to Allure which environment it ran against (each request already attaches the rest). */
public class QaTestWatcher implements TestWatcher {

    @Override
    public void testFailed(ExtensionContext context, Throwable cause) {
        attachEnvironment();
    }

    /** Also used by Cucumber scenarios when they fail. */
    public static void attachEnvironment() {
        QaConfig config = QaConfig.get();
        Allure.addAttachment(
                "Entorno",
                "text/plain",
                "API: " + config.apiUrl() + "\nEntorno gestionado por la suite: " + config.managedEnvironment()
                        + "\nProveedor de tokens: " + config.auth());
    }

    @Override
    public void testDisabled(ExtensionContext context, Optional<String> reason) {
        Allure.addAttachment("Desactivado", reason.orElse("sin motivo"));
    }
}
