// Session token like Supabase's, signed with the QA key (env/jwt). Used by Newman and the E2E tests against the API.
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const jwk = JSON.parse(readFileSync(new URL('../../env/jwt/qa-signing-key.jwk.json', import.meta.url), 'utf8'));
const key = createPrivateKey({ key: jwk, format: 'jwk' });

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Issuer the QA API expects: SUPABASE_URL + /auth/v1 (in the docker-compose, WireMock). */
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
  // JWS requires the ECDSA signature as r || s (IEEE P1363), not DER.
  const signature = sign('sha256', Buffer.from(signingInput), { key, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${signature.toString('base64url')}`;
}
