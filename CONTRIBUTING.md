# spin-trainer-qa

Black-box test suite for Spin Trainer. Rules shared by the three repos, summarized here so that this repo is
self-contained. Project source of truth: `spin-trainer-web/docs/` (context, architecture, ADRs).

## Global rules (summary)
- Portfolio quality > speed. ADRs are closed; they are only reopened for a concrete, justified flaw (new ADR).
- Validation against the spec instead of Pact (ADR-0008). The contract is `spin-trainer-api/openapi.yaml`; this repo
  holds a pinned copy (`contract/openapi.yaml`, `gradlew specCheck` / `specSync`) that is never edited by hand. The same
  goes for the seed's reference ranges (`contract/reference-ranges.json`, `rangesCheck` / `rangesSync`), which are the
  oracle.
- Gradle (Kotlin DSL), never Maven. TypeScript only in Playwright. Discarded: OWASP ZAP, load testing, Pact, pgTAP.
- Everything in English (ADR-0021): code, comments, documentation (README, ADRs, CONTRIBUTING.md, docs/, OpenAPI descriptions), developer-facing messages, the app's UI and data, the API's error messages, and the test report (test titles, Allure names, assertion descriptions, Gherkin features).
- Commits **always in Pedro's name** (author and committer: `Pedro Morago López-Vázquez <pedromoragolv@gmail.com>`; check `git config user.name/user.email` before committing). Conventional Commits, no co-author or attribution trailer.
- Pedro's environment: Windows 10/11 (commands with `gradlew.bat`; nothing that depends on bash).

## Stack and commands
JUnit 5 · REST Assured · AssertJ · Cucumber 7 · Allure · Testcontainers (docker compose) · WireMock (JWKS) ·
Datafaker · Nimbus JOSE · networknt JSON Schema · openapi-generator (models) · Newman (Node).

```
./gradlew :api-tests:test      # starts env/docker-compose.yml, runs the tests and stops it (requires Docker)
./gradlew specCheck            # contract/openapi.yaml == ../spin-trainer-api/openapi.yaml
./gradlew rangesCheck          # contract/reference-ranges.json == ../spin-trainer-api/reference-ranges.json
./gradlew spotlessApply
npm run env:up && npm run newman   # Newman collection against the running environment
npm run e2e                        # Playwright: mock + fullstack (the latter with the environment running)
npm run report                     # combined Allure report (API, Newman, E2E)
```
Before committing: `specCheck`, `rangesCheck`, `:api-tests:test`, `npm run e2e:typecheck` and `npm run e2e` green.

## Conventions
- Black-box: tests only talk HTTP to the API. The environment has the real data (the API seed); QA adjustments that the
  API does not allow go in `env/flyway/R__qa_fixtures.sql` (currently: btn_open@8 without a range), never SQL from the
  tests. Range oracles: `ReferenceRanges` (Java) and `e2e/data/reference.ts`, both built on the pinned copy.
- Client: `Api.as(usuario).ranges().putUser(...)`; `ServiceBase` adds the correlation id, Allure and validation against
  the contract to every request. `withoutContract()` only for what the spec does not declare (non-existent routes, 503).
- One new user per test (`ApiTest`): tests run in parallel without cleaning up data. `@Isolated` only if a test touches
  something shared (e.g. the WireMock JWKS).
- Errors with `ProblemAssert` + `ErrorType` (type, status, title and detail template), not with loose strings.
- Explicit design technique in the test's Javadoc (partitions, boundary values, decision table, transitions) and a
  link to the ADR with `@Link`; traceability lives in `docs/TEST_STRATEGY.md`.
- Models generated from the pinned contract (`com.pedromorago.spintrainer.qa.model`); invalid requests as raw JSON.
- Cucumber: features in Spanish (`# language: es`) with business vocabulary (jugador, mano, rango, respuesta), not
  HTTP. Steps in `qa.bdd`, scenario state in `ScenarioContext` (picocontainer), `@ADR-00xx` tags (links in Allure)
  and `@smoke`. Rules that can only be expressed with technical detail go in JUnit.
- Newman: the collection is edited in Postman and exported to `newman/` (v2.1). One new player per run
  (`scripts/newman.mjs`); it checks behavior, while validation against the spec is done by the Java suite.
- Tokens outside the JVM (Newman, Playwright): `scripts/lib/qa-jwt.mjs`, same claims as `JwtForge`.
- E2E: the same specs for `mock` and `fullstack`; anything that only makes sense with the mock is tagged `@solo-mock`.
  The build is served by `scripts/serve-web.mjs` with the rewrites and headers of the web's `vercel.json` (production
  CSP; `fullstack` adds the QA origins to `connect-src`), so every test runs under the production headers.
  Page Objects in `e2e/pages` with `#region` (locators, actions, queries); tests do not use ad-hoc selectors.
  Locators by role and accessible name first; `data-testid` and `data-hand/data-action/data-verdict` after that.
- Fixtures (`e2e/fixtures/test.ts`): a new player per test, session injected with the `api` backend and a guard for
  console/HTTP errors (errors a test provokes on purpose are removed with `allowErrors`, which returns how many).
  Oracles in `e2e/data/reference.ts` (mirror of `env/flyway` and `QaReferenceData`).
- Accessibility: `expectAccessible` (`e2e/fixtures/a11y.ts`; axe, WCAG 2.2 AA) on every new page.
