package com.pedromorago.spintrainer.qa.environment;

import org.junit.platform.launcher.LauncherSession;
import org.junit.platform.launcher.LauncherSessionListener;
import org.junit.platform.launcher.TestExecutionListener;
import org.junit.platform.launcher.TestPlan;

/**
 * Levanta el entorno una vez por ejecución (JUnit y Cucumber comparten sesión) y lo para al final. Registrado en
 * {@code META-INF/services}; solo arranca si de verdad se van a ejecutar tests.
 */
public class QaEnvironmentListener implements LauncherSessionListener {

    @Override
    public void launcherSessionOpened(LauncherSession session) {
        session.getLauncher().registerTestExecutionListeners(new TestExecutionListener() {
            @Override
            public void testPlanExecutionStarted(TestPlan testPlan) {
                if (testPlan.containsTests()) {
                    QaEnvironment.start();
                }
            }
        });
    }

    @Override
    public void launcherSessionClosed(LauncherSession session) {
        QaEnvironment.stop();
    }
}
