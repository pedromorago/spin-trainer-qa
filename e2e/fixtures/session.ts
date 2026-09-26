import { qaSessionToken } from '../../scripts/lib/qa-jwt.mjs';

/**
 * Supabase session as supabase-js stores it in localStorage. The web only reads it to send the token to the API
 * (ADR-0003), so injecting it is enough: the real login against Supabase is out of the E2E scope (tested by hand).
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
  // supabase-js: sb-<first host label>-auth-token (http://localhost:8089 → sb-localhost-auth-token).
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  return { storageKey, value: JSON.stringify(session), accessToken };
}
