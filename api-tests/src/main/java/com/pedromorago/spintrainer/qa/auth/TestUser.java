package com.pedromorago.spintrainer.qa.auth;

import java.util.UUID;

/**
 * Usuario de un test. Cada test usa usuarios nuevos: sus rangos, intentos y estadísticas no ven los de nadie más, así
 * que los tests pueden ir en paralelo sin limpiar datos.
 */
public record TestUser(UUID id, String alias) {

    public static TestUser fresh(String alias) {
        return new TestUser(UUID.randomUUID(), alias);
    }

    @Override
    public String toString() {
        return alias + " (" + id + ")";
    }
}
