# spin-trainer-qa

Black-box tests for Spin Trainer (a preflop range trainer for Spin & Go): functional and contract API testing,
business flows in Gherkin, regression with Newman and E2E with Playwright. A QA portfolio project: the suite is
independent of the code it tests ([spin-trainer-api](https://github.com/pedromorago/spin-trainer-api),
[spin-trainer-web](https://github.com/pedromorago/spin-trainer-web)); decisions and architecture live in
`spin-trainer-web/docs/`.

Test strategy (test basis, techniques, traceability): [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md).

## Requirements

- Docker (Docker Desktop with WSL 2 on Windows) and JDK 21 (Gradle downloads it if missing).
- Node LTS (22.13+) for Newman and Playwright: `npm install` once, here and in `spin-trainer-web`, and
  `npx playwright install chromium`.
- The three repos as siblings in the same folder (`spin-trainer-api`, `spin-trainer-qa`, `spin-trainer-web`):
  the environment builds the API from its repo and the E2E tests build the web app from its own.

## Running

| Windows | Linux/macOS | What it does |
|---|---|---|
| `.\gradlew.bat :api-tests:test` | `./gradlew :api-tests:test` | Starts the environment (Testcontainers + docker compose), runs the API tests (JUnit and Cucumber) and stops it |
| `.\gradlew.bat :api-tests:test -Ptags=smoke` | `./gradlew :api-tests:test -Ptags=smoke` | Smoke tests only |
| `npm run env:up` / `env:down` | same | Starts / tears down the environment manually |
| `npm run newman` | same | Newman collection against the running environment (`QA_API_URL` for a different one) |
| `npm run e2e` | same | Playwright: `mock` project (no backend) and `fullstack` (requires `npm run env:up`) |
| `npm run e2e:mock` / `e2e:fullstack` | same | One of the two projects |
| `npm run report` / `report:open` | same | Combined Allure report (API, Newman and E2E) in `build/allure-report` / open it |
| `.\gradlew.bat specCheck` / `specSync` | `./gradlew specCheck` / `specSync` | Checks / pulls the contract from `../spin-trainer-api/openapi.yaml` |
| `.\gradlew.bat rangesCheck` / `rangesSync` | `./gradlew rangesCheck` / `rangesSync` | Checks / pulls the reference ranges from `../spin-trainer-api/reference-ranges.json` |

Manual environment (for debugging or for Newman/Playwright): `npm run env:up`. If it is already running, the Gradle
tests reuse it and leave it running.

Cucumber scenario names contain accented characters: with a POSIX locale (Linux without `LANG`), Gradle's HTML report
fails to write them; setting `LANG=C.UTF-8` is enough. Nothing is needed on Windows or GitHub Actions.

## QA environment (`env/`)

| Service | Port | What it is |
|---|---|---|
| `api` | 8081 | The API built from `../spin-trainer-api` (`prod` profile, JSON logs) |
| `postgres` | 55432 | Postgres 17 prepared with the API's `bootstrap.sql` (roles `spin_migrator` and `spin_app`) |
| `jwks` | 8089 | WireMock standing in for Supabase Auth: serves the JWKS of the QA key (`env/jwt`) and accepts logout |

Reference data: the real data, from the API seed (V5, the 73 tables from the PDF), with a single QA adjustment in
`env/flyway/R__qa_fixtures.sql`: btn_open@8 is left without a range so that the suite can verify, black-box, that
without a range there is no grading (422). The oracles read the pinned copy `contract/reference-ranges.json`. Each test
uses new users: no data cleanup is needed.

## Configuration

| Variable / `-Pqa.*` | Default | Purpose |
|---|---|---|
| `QA_API_URL` / `qa.apiUrl` | `http://localhost:8081/api/v1` (managed environment) | An already deployed API: the suite starts nothing |
| `QA_BUILD_API` / `qa.buildApi` | `true` | `false` reuses the latest API image instead of rebuilding it |
| `QA_AUTH` / `qa.auth` | `local` | Token provider (`TokenProviders`); `local` signs with the QA key |
| `QA_JWT_ISSUER` / `qa.jwtIssuer` | `http://jwks:8080/auth/v1` | Issuer the API expects |

## Structure

```
contract/                 pinned copies of the contract and the reference ranges (specCheck/specSync, rangesCheck/rangesSync)
env/                      system under test: docker-compose, Postgres bootstrap, WireMock, QA key, data
api-tests/src/main        framework: config, environment, tokens, client (ServiceBase + one service per tag),
                          validation against the contract, ErrorType + ProblemAssert, test data
api-tests/src/test        suites per module (situations, ranges, quiz, stats, security, HTTP) and Cucumber steps (bdd)
api-tests/src/test/resources/features   business rules in Gherkin, in Spanish
newman/                   Postman collection (a player's full flow) and QA environment
e2e/                      Playwright (TypeScript): fixtures, Page Objects, reference data and specs
.github/workflows/qa.yml  CI: environment, API, Newman, E2E and combined Allure report
scripts/                  Newman runner, QA token (lib/qa-jwt.mjs) and key generation
docs/TEST_STRATEGY.md     strategy, techniques and traceability
```

## E2E (`e2e/`)

The same specs run against two backends:

| Project | Web | Backend | Session |
|---|---|---|---|
| `mock` | `build:mock` served on 4173 | the web app's in-memory adapter | the mock's own (always signed in) |
| `fullstack` | http-mode build served on 4174 | the QA environment's API | QA JWT injected as the Supabase session |

The reference data is the same in both (the API seed; the web mock keeps the same copy), and so are the oracles. Each
test uses a new player and fails on console errors, exceptions or unexpected HTTP responses ≥ 400. Accessibility is
checked with axe (WCAG 2.2 AA) on every page. Playwright HTML report in `build/e2e/report`.

## CI (`.github/workflows/qa.yml`)

On every push to `main`, on every PR, on demand and every Monday: clones the API and web repos next to this one (the
same branch if it exists, otherwise `main`), starts the environment, runs the API, Newman and E2E suites even if one of
them fails, and publishes the combined Allure report, the Playwright report, the Newman reports and the environment logs
as the `qa-reports` artifact.

The repos are private: the workflow needs the `SPIN_TRAINER_REPOS_TOKEN` secret, a read-only *fine-grained* token
(Contents: read) on `spin-trainer-api` and `spin-trainer-web`. If the repos become public, it is no longer needed.
