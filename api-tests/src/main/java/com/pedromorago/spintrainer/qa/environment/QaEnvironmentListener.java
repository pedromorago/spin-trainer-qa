package com.pedromorago.spintrainer.qa.environment;

import org.junit.platform.launcher.LauncherSession;
import org.junit.platform.launcher.LauncherSessionListener;
import org.junit.platform.launcher.TestExecutionListener;
import org.junit.platform.launcher.TestPlan;

/**
 * Starts the environment once per run (JUnit and Cucumber share the session) and stops it at the end. Registered in
 * {@code META-INF/services}; it only starts if tests are actually going to run.
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
