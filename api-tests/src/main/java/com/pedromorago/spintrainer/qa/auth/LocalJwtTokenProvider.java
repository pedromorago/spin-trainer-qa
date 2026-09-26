package com.pedromorago.spintrainer.qa.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Token chain: each user gets their token once and reuses it until one minute before it expires (as the web does
 * with its session). Safe for parallel tests.
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
