package com.pedromorago.spintrainer.qa.support;

import com.pedromorago.spintrainer.qa.config.QaConfig;
import io.qameta.allure.Allure;
import java.util.Optional;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;

/** Al fallar un test, adjunta a Allure contra qué entorno corría (el resto ya lo adjunta cada petición). */
public class QaTestWatcher implements TestWatcher {

    @Override
    public void testFailed(ExtensionContext context, Throwable cause) {
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
