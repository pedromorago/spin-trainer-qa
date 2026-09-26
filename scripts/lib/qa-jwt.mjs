// Token de sesión como los de Supabase, firmado con la clave de QA (env/jwt). Lo usan Newman y los E2E contra la API.
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const jwk = JSON.parse(readFileSync(new URL('../../env/jwt/qa-signing-key.jwk.json', import.meta.url), 'utf8'));
const key = createPrivateKey({ key: jwk, format: 'jwk' });

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Emisor que espera la API de QA: SUPABASE_URL + /auth/v1 (en el docker-compose, WireMock). */
export const qaIssuer = process.env.QA_JWT_ISSUER ?? 'http://jwks:8080/auth/v1';

export function qaSessionToken(userId, { issuer = qaIssuer, ttlSeconds = 3600 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', typ: 'JWT', kid: jwk.kid };
  const claims = {
    iss: issuer,
    sub: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: `qa+${userId}@example.com`,
    iat: now,
    exp: now + ttlSeconds,
  };
  const signingInput = `${base64url(header)}.${base64url(claims)}`;
  // JWS pide la firma ECDSA como r || s (IEEE P1363), no en DER.
  const signature = sign('sha256', Buffer.from(signingInput), { key, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${signature.toString('base64url')}`;
}
