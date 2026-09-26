# QA signing key

`qa-signing-key.jwk.json` is an ES256 key **for the QA environment only**: it signs the JWTs used by the tests
(Java, Newman and Playwright), and WireMock serves its public part as a JWKS (`env/wiremock/__files/jwks.json`) at
the same path as Supabase (`/auth/v1/.well-known/jwks.json`).

It grants access to nothing real: the API only trusts the JWKS of its `SUPABASE_URL`, which in QA points to WireMock.
To rotate it: generate a new one with `node scripts/generate-qa-key.mjs` and restart the environment.
