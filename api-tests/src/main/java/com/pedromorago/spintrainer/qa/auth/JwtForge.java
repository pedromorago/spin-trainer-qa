package com.pedromorago.spintrainer.qa.auth;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import com.nimbusds.jwt.SignedJWT;
import com.pedromorago.spintrainer.qa.config.QaConfig;
import java.io.IOException;
import java.nio.file.Files;
import java.security.SecureRandom;
import java.text.ParseException;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import java.util.function.Consumer;

/**
 * Fabrica JWT como los de Supabase Auth con la clave de QA (cuya parte pública sirve WireMock como JWKS): tokens
 * válidos y, para las pruebas de seguridad, variantes que la API debe rechazar.
 */
public final class JwtForge {

    private final ECKey key;
    private final String issuer;

    public JwtForge(ECKey key, String issuer) {
        this.key = key;
        this.issuer = issuer;
    }

    public static JwtForge fromConfig(QaConfig config) {
        try {
            return new JwtForge(ECKey.parse(Files.readString(config.signingKey())), config.jwtIssuer());
        } catch (IOException | ParseException e) {
            throw new IllegalStateException("No se pudo leer la clave de QA: " + config.signingKey(), e);
        }
    }

    /** Token de sesión válido durante {@code ttl}. */
    public String session(UUID subject, Duration ttl) {
        return signed(claims(subject, ttl, c -> {}), key);
    }

    /** Token válido con las claims modificadas (caducado, otra audiencia, rol anon...). */
    public String session(UUID subject, Consumer<JWTClaimsSet.Builder> customizer) {
        return signed(claims(subject, Duration.ofHours(1), customizer), key);
    }

    /** Mismas claims firmadas con una clave que no está en el JWKS. */
    public String signedByUnknownKey(UUID subject) {
        try {
            ECKey other = new ECKeyGenerator(Curve.P_256)
                    .keyID("unknown-" + UUID.randomUUID())
                    .algorithm(JWSAlgorithm.ES256)
                    .generate();
            return signed(claims(subject, Duration.ofHours(1), c -> {}), other);
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Mismas claims con HS256 (el secreto compartido heredado de Supabase, que la API no acepta). */
    public String hs256(UUID subject) {
        try {
            byte[] secret = new byte[32];
            new SecureRandom().nextBytes(secret);
            SignedJWT jwt =
                    new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims(subject, Duration.ofHours(1), c -> {}));
            jwt.sign(new MACSigner(secret));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Mismas claims sin firma ({@code alg: none}). */
    public String unsigned(UUID subject) {
        return new PlainJWT(claims(subject, Duration.ofHours(1), c -> {})).serialize();
    }

    private JWTClaimsSet claims(UUID subject, Duration ttl, Consumer<JWTClaimsSet.Builder> customizer) {
        Instant now = Instant.now();
        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .subject(subject.toString())
                .audience("authenticated")
                .claim("role", "authenticated")
                .claim("email", "qa+" + subject + "@example.com")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plus(ttl)));
        customizer.accept(claims);
        return claims.build();
    }

    private static String signed(JWTClaimsSet claims, ECKey signingKey) {
        try {
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.ES256)
                            .keyID(signingKey.getKeyID())
                            .type(JOSEObjectType.JWT)
                            .build(),
                    claims);
            jwt.sign(new ECDSASigner(signingKey));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }
}
