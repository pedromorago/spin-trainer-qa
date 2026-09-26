# spin-trainer-qa

Pruebas de caja negra de Spin Trainer (entrenador de rangos preflop para Spin & Go): API funcional y de contrato,
flujos de negocio en Gherkin, regresión con Newman y E2E con Playwright. Portfolio QA: la suite es independiente del
código que prueba ([spin-trainer-api](https://github.com/pedromorago/spin-trainer-api),
[spin-trainer-web](https://github.com/pedromorago/spin-trainer-web)); decisiones y arquitectura en `spin-trainer-web/docs/`.

Estrategia de pruebas (bases, técnicas, trazabilidad): [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md).

## Requisitos

- Docker (Docker Desktop con WSL 2 en Windows) y JDK 21 (Gradle lo descarga si falta).
- Node LTS (22.13+) para Newman y Playwright: `npm install` una vez, aquí y en `spin-trainer-web`, y
  `npx playwright install chromium`.
- Los tres repos como hermanos en la misma carpeta (`spin-trainer-api`, `spin-trainer-qa`, `spin-trainer-web`):
  el entorno construye la API desde su repo y los E2E compilan la web desde el suyo.

## Ejecutar

| Windows | Linux/macOS | Qué hace |
|---|---|---|
| `.\gradlew.bat :api-tests:test` | `./gradlew :api-tests:test` | Levanta el entorno (Testcontainers + docker compose), ejecuta los tests de API (JUnit y Cucumber) y lo para |
| `.\gradlew.bat :api-tests:test -Ptags=smoke` | `./gradlew :api-tests:test -Ptags=smoke` | Solo los casos de humo |
| `npm run env:up` / `env:down` | igual | Levanta / borra el entorno a mano |
| `npm run newman` | igual | Colección de Newman contra el entorno en marcha (`QA_API_URL` para otro) |
| `npm run e2e` | igual | Playwright: proyecto `mock` (sin backend) y `fullstack` (necesita `npm run env:up`) |
| `npm run e2e:mock` / `e2e:fullstack` | igual | Uno de los dos proyectos |
| `npm run report` / `report:open` | igual | Informe de Allure combinado (API, Newman y E2E) en `build/allure-report` / abrirlo |
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
| `jwks` | 8089 | WireMock en el papel de Supabase Auth: sirve el JWKS de la clave de QA (`env/jwt`) y acepta el logout |

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
e2e/                      Playwright (TypeScript): fixtures, Page Objects, datos de referencia y specs
.github/workflows/qa.yml  CI: entorno, API, Newman, E2E e informe de Allure combinado
scripts/                  ejecución de Newman, token de QA (lib/qa-jwt.mjs) y generación de la clave
docs/TEST_STRATEGY.md     estrategia, técnicas y trazabilidad
```

## E2E (`e2e/`)

Las mismas specs corren contra dos backends:

| Proyecto | Web | Backend | Sesión |
|---|---|---|---|
| `mock` | `build:mock` servida en 4173 | el adaptador en memoria de la web | la del mock (siempre iniciada) |
| `fullstack` | build en modo http servida en 4174 | la API del entorno de QA | JWT de QA inyectado como sesión de Supabase |

Los datos de referencia son los mismos en los dos (btn_open a 25 BB), así que los oráculos también. Cada test usa un
jugador nuevo y falla si hay errores de consola, excepciones o respuestas HTTP ≥ 400 no previstas. La accesibilidad se
comprueba con axe (WCAG 2.2 AA) en cada página. Informe HTML de Playwright en `build/e2e/report`.

## CI (`.github/workflows/qa.yml`)

En cada push a `main`, en cada PR, a mano y los lunes: clona API y web junto a este repo (la misma rama si existe, si
no `main`), levanta el entorno, ejecuta API, Newman y E2E aunque falle alguna, y publica el informe de Allure
combinado, el de Playwright, los de Newman y los logs del entorno como artefacto `qa-reports`.

Los repos son privados: el workflow necesita el secreto `SPIN_TRAINER_REPOS_TOKEN`, un token *fine-grained* de solo
lectura (Contents: read) sobre `spin-trainer-api` y `spin-trainer-web`. Si los repos pasan a ser públicos, sobra.
