// Generates the QA ES256 key (env/jwt) and its public JWKS (env/wiremock/__files/jwks.json). QA environment only.
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const key = { ...privateKey.export({ format: 'jwk' }), kid: `qa-${randomUUID().slice(0, 8)}`, use: 'sig', alg: 'ES256' };
const { d, ...publicKey } = key;

writeFileSync(`${root}env/jwt/qa-signing-key.jwk.json`, `${JSON.stringify(key, null, 2)}\n`);
writeFileSync(`${root}env/wiremock/__files/jwks.json`, `${JSON.stringify({ keys: [publicKey] }, null, 2)}\n`);
console.log(`Clave de QA generada: ${key.kid}`);
