package com.pedromorago.spintrainer.qa.environment;

import com.pedromorago.spintrainer.qa.config.QaConfig;
import java.io.File;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.testcontainers.containers.ComposeContainer;
import org.testcontainers.containers.wait.strategy.Wait;

/**
 * The system under test. If {@code QA_API_URL} is not set, the suite starts {@code env/docker-compose.yml} with
 * Testcontainers (Postgres, WireMock as Supabase and the API built from the sibling repo) and stops it at the end. If
 * an environment is already responding at the default URL (e.g. {@code docker compose up} by hand), it reuses it.
 */
public final class QaEnvironment {

    private static ComposeContainer compose;

    private QaEnvironment() {}

    public static synchronized void start() {
        QaConfig config = QaConfig.get();
        if (!config.managedEnvironment() || compose != null || isUp(config)) {
            return;
        }
        File composeFile = config.rootDir().resolve("env/docker-compose.yml").toFile();
        compose = new ComposeContainer(composeFile)
                .withBuild(config.buildApi())
                .withRemoveVolumes(true)
                .withStartupTimeout(Duration.ofMinutes(10))
                .waitingFor("api", Wait.forHealthcheck().withStartupTimeout(Duration.ofMinutes(10)));
        compose.start();
    }

    public static synchronized void stop() {
        if (compose != null) {
            compose.stop();
            compose = null;
        }
    }

    private static boolean isUp(QaConfig config) {
        try (HttpClient http = HttpClient.newHttpClient()) {
            URI health = config.apiOrigin().resolve("/actuator/health/readiness");
            HttpResponse<String> response = http.send(
                    HttpRequest.newBuilder(health)
                            .timeout(Duration.ofSeconds(2))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200 && response.body().contains("UP");
        } catch (Exception e) {
            return false;
        }
    }
}
