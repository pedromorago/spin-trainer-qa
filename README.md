# spin-trainer-qa

Pruebas de caja negra de Spin Trainer (entrenador de rangos preflop para Spin & Go): API funcional y de contrato,
flujos de negocio en Gherkin, regresión con Newman y E2E con Playwright. Portfolio QA: la suite es independiente del
código que prueba ([spin-trainer-api](https://github.com/pedromorago/spin-trainer-api),
[spin-trainer-web](https://github.com/pedromorago/spin-trainer-web)); decisiones y arquitectura en `spin-trainer-web/docs/`.

Estrategia de pruebas (bases, técnicas, trazabilidad): [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md).

## Requisitos

- Docker (Docker Desktop con WSL 2 en Windows) y JDK 21 (Gradle lo descarga si falta).
- Node LTS (22.13+) para Newman y Playwright: `npm install` una vez.
- Los tres repos como hermanos en la misma carpeta (`spin-trainer-api`, `spin-trainer-qa`, `spin-trainer-web`):
  el entorno construye la API desde su repo.

## Ejecutar

| Windows | Linux/macOS | Qué hace |
|---|---|---|
| `.\gradlew.bat :api-tests:test` | `./gradlew :api-tests:test` | Levanta el entorno (Testcontainers + docker compose), ejecuta los tests de API (JUnit y Cucumber) y lo para |
| `.\gradlew.bat :api-tests:test -Ptags=smoke` | `./gradlew :api-tests:test -Ptags=smoke` | Solo los casos de humo |
| `npm run env:up` / `env:down` | igual | Levanta / borra el entorno a mano |
| `npm run newman` | igual | Colección de Newman contra el entorno en marcha (`QA_API_URL` para otro) |
| `.\gradlew.bat :api-tests:allureServe` | `./gradlew :api-tests:allureServe` | Abre el informe de Allure |
| `.\gradlew.bat specCheck` / `specSync` | `./gradlew specCheck` / `specSync` | Comprueba / trae el contrato de `../spin-trainer-api/openapi.yaml` |

Entorno a mano (para depurar o para Newman/Playwright): `npm run env:up`. Si ya está en marcha, los tests de Gradle lo
reutilizan y no lo paran.

Los nombres de los escenarios de Cucumber llevan tildes: con un locale POSIX (Linux sin `LANG`), el informe HTML de
Gradle falla al escribirlos; basta con `LANG=C.UTF-8`. En Windows y en GitHub Actions no hace falta nada.

## Entorno de QA (`env/`)

| Servicio | Puerto | Qué es |
|---|---|---|
| `api` | 8081 | La API construida desde `../spin-trainer-api` (perfil `prod`, logs JSON) |
| `postgres` | 55432 | Postgres 17 preparado con el `bootstrap.sql` de la API (roles `spin_migrator` y `spin_app`) |
| `jwks` | 8089 | WireMock en el papel de Supabase Auth: sirve el JWKS de la clave de QA (`env/jwt`) |

Datos de referencia de QA: `env/flyway/R__qa_reference_ranges.sql` (el mismo rango de ejemplo que el mock de la web,
`btn_open@25`), cargado por Flyway al arrancar. Cada test usa usuarios nuevos: no hay que limpiar datos.

## Configuración

| Variable / `-Pqa.*` | Por defecto | Para qué |
|---|---|---|
| `QA_API_URL` / `qa.apiUrl` | `http://localhost:8081/api/v1` (entorno gestionado) | API ya desplegada: la suite no levanta nada |
| `QA_BUILD_API` / `qa.buildApi` | `true` | `false` reutiliza la última imagen de la API en vez de reconstruirla |
| `QA_AUTH` / `qa.auth` | `local` | Proveedor de tokens (`TokenProviders`); `local` firma con la clave de QA |
| `QA_JWT_ISSUER` / `qa.jwtIssuer` | `http://jwks:8080/auth/v1` | Emisor que espera la API |

## Estructura

```
contract/openapi.yaml     copia fijada del contrato (specCheck / specSync)
env/                      sistema bajo prueba: docker-compose, bootstrap de Postgres, WireMock, clave de QA, datos
api-tests/src/main        framework: config, entorno, tokens, cliente (ServiceBase + un servicio por tag),
                          validación contra el contrato, ErrorType + ProblemAssert, datos de prueba
api-tests/src/test        suites por módulo (situaciones, rangos, quiz, stats, seguridad, HTTP) y steps de Cucumber (bdd)
api-tests/src/test/resources/features   reglas de negocio en Gherkin, en español
newman/                   colección de Postman (flujo completo de un jugador) y entorno de QA
scripts/                  ejecución de Newman, token de QA (lib/qa-jwt.mjs) y generación de la clave
docs/TEST_STRATEGY.md     estrategia, técnicas y trazabilidad
```
