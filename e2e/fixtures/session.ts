import { qaSessionToken } from '../../scripts/lib/qa-jwt.mjs';

/**
 * Sesión de Supabase tal como la guarda supabase-js en localStorage. La web solo la lee para mandar el token a la API
 * (ADR-0003), así que basta con inyectarla: el login real contra Supabase queda fuera de los E2E (se prueba a mano).
 */
export interface InjectedSession {
  storageKey: string;
  value: string;
  accessToken: string;
}

export function supabaseSession(playerId: string, supabaseUrl: string): InjectedSession {
  const accessToken = qaSessionToken(playerId);
  const claims = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString()) as { exp: number; email: string };
  const session = {
    access_token: accessToken,
    refresh_token: 'qa-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: claims.exp,
    user: {
      id: playerId,
      aud: 'authenticated',
      role: 'authenticated',
      email: claims.email,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
  // supabase-js: sb-<primera etiqueta del host>-auth-token (http://localhost:8089 → sb-localhost-auth-token).
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  return { storageKey, value: JSON.stringify(session), accessToken };
}
