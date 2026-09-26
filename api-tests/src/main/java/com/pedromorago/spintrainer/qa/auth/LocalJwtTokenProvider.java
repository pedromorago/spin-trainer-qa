package com.pedromorago.spintrainer.qa.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cadena de tokens: cada usuario obtiene su token una vez y lo reutiliza hasta un minuto antes de que caduque (como
 * hace la web con su sesión). Seguro para tests en paralelo.
 */
final class LocalJwtTokenProvider implements TokenProvider {

    private static final Duration TTL = Duration.ofMinutes(30);
    private static final Duration RENEW_BEFORE = Duration.ofMinutes(1);

    private record Issued(String token, Instant expiresAt) {}

    private final JwtForge forge;
    private final Map<TestUser, Issued> cache = new ConcurrentHashMap<>();

    LocalJwtTokenProvider(JwtForge forge) {
        this.forge = forge;
    }

    @Override
    public String accessToken(TestUser user) {
        return cache.compute(
                        user,
                        (u, current) -> current != null
                                        && Instant.now().plus(RENEW_BEFORE).isBefore(current.expiresAt())
                                ? current
                                : new Issued(
                                        forge.session(u.id(), TTL),
                                        Instant.now().plus(TTL)))
                .token();
    }
}
