package com.pedromorago.spintrainer.qa.auth;

/** Obtiene el JWT de sesión de un usuario (la API solo acepta tokens de su emisor configurado). */
public interface TokenProvider {

    String accessToken(TestUser user);
}
