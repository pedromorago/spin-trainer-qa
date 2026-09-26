# Clave de firma de QA

`qa-signing-key.jwk.json` es una clave ES256 **solo para el entorno de QA**: firma los JWT que usan los tests
(Java, Newman y Playwright) y su parte pública la sirve WireMock como JWKS (`env/wiremock/__files/jwks.json`), en el
mismo sitio que Supabase (`/auth/v1/.well-known/jwks.json`).

No da acceso a nada real: la API solo confía en el JWKS de su `SUPABASE_URL`, que en QA apunta a WireMock.
Para rotarla: generar otra con `node scripts/generate-qa-key.mjs` y volver a levantar el entorno.
