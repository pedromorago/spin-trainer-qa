# Test strategy

What `spin-trainer-qa` tests, with which techniques and against which oracles, and how it fits in with the tests that
live in the other two repos. Project decisions: `spin-trainer-web/docs/adr/`.

## Objective and scope

The suite tests **the deployable artifact** (the API's Docker image, a GraalVM native executable since ADR-0018, with
the `prod` profile, the database prepared with the real `bootstrap.sql`, and JWTs validated against a JWKS over the
network) as a black box: it only speaks HTTP. It can be pointed at any deployment with `QA_API_URL`.

Out of scope, by decision (ADR-0010): dynamic security testing (OWASP ZAP), load and performance testing (k6, JMeter),
Pact and database testing (pgTAP).

## Test levels and where each one lives

| Level | Repo | What it covers | Why there |
|---|---|---|---|
| Unit (web domain) | web · Vitest + Stryker | Pure `domain/`: `actionFor`, verdicts, selection, stats series | Pure rules; the 90% coverage threshold is enforced there, and mutation testing checks the tests catch changed rules (ADR-0017) |
| Mock conformance | web · Vitest | The mock validates and responds as the spec says (`contract.test.js`) | The web app and the mock-mode E2E tests depend on it |
| Unit (API) | api · JUnit + PIT | Domain, use cases, ArchUnit; mutation score ≥ 95 % in `check` (ADR-0017) | No Spring or Docker; controlled clock |
| Integration (API) | api · `*IT` | Full app with Postgres (Testcontainers), real JWTs, DB roles, responses validated against the spec | White-box: pins the clock (day boundaries and DST changes) and queries DB privileges |
| **API acceptance** | **qa · REST Assured** | The deployed artifact: contract, business rules, security, HTTP | Independent of the code; what a client sees |
| Executable specification | qa · Cucumber | Business rules in Gherkin, in Spanish | Readable by whoever validates the ranges |
| Collection regression | qa · Newman | A player's full flow as a Postman collection | Runs outside the JVM and can be opened in Postman |
| E2E | qa · Playwright | The web app against the mock and against the real API, with the same specs; accessibility with axe | Real user flows, in a browser |

The overlap with the API's `*IT` tests is intentional: there, the code is tested with knowledge of its internals; here,
the container as it will be deployed (production configuration, image, network, external issuer). Packaging and
configuration defects only show up here.

## Test basis

1. Contract: `contract/openapi.yaml` (pinned copy of `spin-trainer-api/openapi.yaml`, v0.2; `specCheck` fails if it
   diverges).
2. Reference ranges: `contract/reference-ranges.json` (pinned copy of the API seed, the 73 tables from
   Tablasmentov3.pdf; `rangesCheck` fails if it diverges).
3. ADRs: 0003 (Supabase only issues the JWT), 0007 (immutable attempts), 0012 (effective range), 0013 (contract v0.2:
   server-side grading, versions, aggregated stats).
4. Domain rules from `SPIN_TRAINER_PROJECT_CONTEXT.md`: implicit action (FOLD, or CHECK if FOLD is not possible), 169
   canonical hands, stacks in multiples of 0.5 BB.

## Oracles

- **The spec**, on every response: `ContractValidationFilter` validates the declared status, `Content-Type` and body
  (schema and formats) of every request. A test that does not inspect the body still checks the contract.
- **The seed's reference ranges** (pinned copy, `ReferenceRanges` in Java and `e2e/data/reference.ts`): the API must
  serve them hand by hand, and Quiz grading is compared against the expected action they yield, for random hands and
  answers.
- **`ErrorType`**: type, status, title and `detail` template of each Problem (RFC 9457).
- **Round trip**: what a write returns is what the subsequent read returns.

## Test design techniques

| Technique | Where |
|---|---|
| Equivalence partitioning | `UserRangeValidationTest` (non-canonical hands, bodies outside the contract), `QuizGradingTest#rejects_invalid_attempts`, `AuthenticationTest` (one partition per JWT rejection reason), `SecurityHeadersTest` (one partition per class of response) |
| Boundary value analysis | `limit` 0/1/200/201 (`AttemptHistoryTest`), `days` 0/1/365/366 (`StatsTest`), `version` 0 and maximum document size (`UserRangeValidationTest`), stacks 12.3/12.5 |
| Decision table | `QuizGradingTest#grades_against_the_effective_range`: user range? × hand in the range? → expected action and range source |
| State transition testing | `UserRangeLifecycleTest`: no range → v1 → v2 → deleted, with the 409 for each invalid transition |
| Randomized testing against an oracle | `QuizGradingTest#agrees_with_the_reference_range_for_any_hand_and_answer` (10 repetitions) |
| Seeded generated data | `UserRangeLifecycleTest#any_valid_range_round_trips`: random ranges with Datafaker; the seed goes in the test case name so it can be reproduced |
| Concurrency (lost update) | `UserRangeLifecycleTest#two_tabs_editing_the_same_version_cannot_lose_an_update` |
| Isolation between users | `each_user_only_sees_their_own_*` (ranges and attempts) |
| Fault injection | `resilience.spec.ts`: Playwright aborts the download of the Quiz chunk (as after a deploy); `server-wake.spec.ts`: a slow answer and 503s while the free API instance wakes up |

## Traceability

| Requirement | Basis | Tests |
|---|---|---|
| Catalog of 16 situations with implicit action and valid stacks | Context, contract | `SituationCatalogTest` |
| Reference ranges served from the seed, revalidatable with ETag | ADR-0006, contract | `ReferenceRangesTest` |
| The ranges served are, hand by hand, the ones in the PDF | ADR-0006 | `ReferenceRangesTest#every_range_served_is_the_seeded_one` |
| Versioned custom range; a PUT with a stale version gets a 409 and overwrites nothing | ADR-0013 | `UserRangeLifecycleTest`, `rango_personalizado.feature`, Newman |
| Nothing invalid is saved; per-field errors | Contract | `UserRangeValidationTest`, `rango_personalizado.feature` |
| Effective range = custom range if it exists; otherwise, the reference range | ADR-0012 | `QuizGradingTest` (decision table), `correccion_del_quiz.feature`, Newman |
| The server grades; the client cannot send `correct` | ADR-0013 | `QuizGradingTest`, Newman |
| Attempts do not change even if the range changes | ADR-0007 | `QuizGradingTest#past_attempts_keep_their_grade_when_the_range_changes`, `historial_y_estadisticas.feature` |
| Paginated history with no gaps or duplicates, filterable | Contract | `AttemptHistoryTest`, Newman |
| Stats aggregated by the API | ADR-0013 | `StatsTest`, `historial_y_estadisticas.feature`, Newman |
| Each player only sees their own data | ADR-0003 | `each_user_only_sees_their_own_*`, `privacidad.feature` |
| The Explorer shows the effective range and is the only one that writes ranges; the Builder does not persist | ADR-0012 | `explorer.spec.ts`, `builder.spec.ts` |
| Two tabs do not overwrite each other: the second one gets the 409 and can reload | ADR-0013 | `explorer.spec.ts` (mock and fullstack) |
| The Quiz grades against the effective range; historical stats are aggregated by the server | ADR-0012, ADR-0013 | `quiz.spec.ts`, `stats.spec.ts` |
| The selection lives in the URL and is normalized | Web architecture | `navigation.spec.ts` |
| Controls accessible by keyboard and screen reader (WCAG 2.2 AA) | Context (quality) | `accessibility.spec.ts`, shortcuts in `quiz.spec.ts` |
| A page that cannot be downloaded or rendered shows a recoverable error and keeps the header | Web architecture | `resilience.spec.ts` |
| Only session JWTs from the configured issuer (ES256, issuer, audience, role, `exp`, `sub`) | ADR-0003 | `AuthenticationTest` |
| Issuer down → 503, not 401 | ADR-0003 | `IssuerOutageTest` |
| No response can be sniffed or framed; no cache stores a player's data | Context (security) | `SecurityHeadersTest` |
| The web app works under its production CSP and security headers | ADR-0016 | `content-security-policy.spec.ts` (and the whole E2E suite) |
| While the free API wakes up, the app says so and retries by itself; the deployed native image behaves like the JVM one | ADR-0018 | `server-wake.spec.ts`; every suite runs against the native image |
| Errors as Problem Details, also outside the contract's routes | Contract | `ProblemAssert` in every suite, `HttpBehaviourTest` |
| CORS only for the web app's origin; correlation id | Contract | `HttpBehaviourTest` |

In Allure: each class carries `@Feature` and the ADRs it tests as `@Link` (in Gherkin, the `@ADR-0012` tag becomes the
same link); the test's user is added as a parameter so that its requests can be found in the API logs (JSON with
`correlationId`).

What is tested in the API and not here, because it requires controlling the application from the inside: day boundaries
per time zone and DST changes (`StatsIT`, fixed clock), DB role privileges and attempt immutability at the permission
level (`DatabaseRolesIT`).

## Cucumber and Newman: what each one adds

- **Cucumber** expresses the business rules in the player's vocabulary (hand, range, answer, version), in Spanish: it
  is the part of the suite that someone who knows poker but not the code can review. Technical details (headers,
  formats, JWT) stay in JUnit. It runs in the same Gradle task, against the same environment and with the same
  validation against the spec on every request.
- **Newman** walks through a new player's full flow, request by request and chaining state (ETag, versions, cursor), as
  a client would. It serves as a deployment smoke test from Node, without the JVM, and can be opened in Postman to
  explore the API by hand. It is a development-only dependency: `npm audit` flags Newman dependencies that are never
  used with external input (it only runs the repo's own collection).

## E2E: two backends, the same specs

The `mock` project tests the web app on its own (fast, no Docker); `fullstack` tests the web app built in http mode
against the QA environment's API, with the Supabase session injected (the QA JWT). Since the reference data matches,
the specs and oracles are the same: if something passes in `mock` and fails in `fullstack`, the defect is in the
integration (see Findings). Each test also fails on console errors or unexpected HTTP responses ≥ 400, and every page
is scanned with axe (WCAG 2.2 AA).

The build is not served by `vite preview` but by `scripts/serve-web.mjs`, which applies the rewrites and headers of the
web's `vercel.json` the way Vercel does (ADR-0016). Every test therefore runs under the production
Content-Security-Policy, and a violation fails it through the console guard; `content-security-policy.spec.ts` makes
it explicit (the policy is served and the browser reports no violation). Only `connect-src` changes in `fullstack`,
which adds the QA environment's API and issuer.

## Data and isolation

- A new user (UUID) per test, per Cucumber scenario and per Newman run: everything runs in parallel (4 threads in JUnit
  and 4 in Cucumber) without cleaning anything up.
- Reference data: the real data, from the API seed. Whatever the suite needs and the API does not allow writing goes
  in `env/flyway/R__qa_fixtures.sql`, which Flyway applies after the migrations: currently, btn_open@8 without a
  reference range, to test the 422 black-box (in production every combination has a range). Never SQL from the tests.
- `@Isolated` only for whatever changes something shared: `IssuerOutageTest` takes the JWKS away from the whole suite.
- E2E: a new player per test (with the mock, a new browser context with its own storage).

## Environment

`env/docker-compose.yml`: Postgres with the API's `bootstrap.sql`, WireMock serving the JWKS of a QA ES256 key
(standing in for Supabase) and the API built from its repo. `QaEnvironmentListener` starts it with Testcontainers when
the JUnit session begins and tears it down when it ends; if one is already running, it reuses it and leaves it alone.

## Professional framework patterns

| Pattern | Here | Improvement |
|---|---|---|
| ServiceBase | `ServiceBase` + one service per spec tag, `Api` facade | No god object: each service only knows its own routes |
| TestBase + TestWatcherBase | `ApiTest` + `QaTestWatcher` | New user and client per test; the watcher attaches the environment on failure |
| DTOs with builder | Models generated from the spec (fluent setters) | No Lombok: if the spec changes, the code does not compile |
| ErrorType with templates | `ErrorType` + `ProblemAssert` | Fluent assertion on the whole Problem |
| JSON Schema validation | Validation against the spec on every response | No hand-copied schemas (ADR-0008) |
| Token chain | `LocalJwtTokenProvider` (per-user cache) | Provider registry (`TokenProviders`) instead of a hard-coded login |
| Data factories with Faker | `RangeFactory`, `Hands` | Reproducible seed; `ThreadLocalRandom` in parallel |
| Configuration | `QaConfig` (`-Pqa.*` property → `QA_*` variable → default) | A single immutable record |
| Qase via annotations | Allure `@Feature`/`@Link` | Qase deferred: no test case management tool for now |
| Page Objects with regions | `e2e/pages` (`#region` locators, actions, queries) | Shared components (`HandGrid`) as their own objects |

## Findings

- **503 not declared in the spec** (`IssuerOutageTest`): with the issuer down, the API returned a correct 503 that the
  contract did not cover. The spec description now documents that any operation may return 500 and 503 (without
  declaring them per operation, so that the validator keeps rejecting any other unexpected status).
- **406 on a range DELETE from the web app** (`explorer.spec.ts`, `fullstack` project): the Explorer's Reset failed
  against the real API and passed against the mock. The web app sent `Accept: application/json`, and the DELETE (204
  with no body; its errors in `application/problem+json`) had no acceptable representation, so Spring responded 406
  without executing it. Neither the API's ITs nor Newman caught it: they send `Accept: */*`. Fixed on both sides: the
  API treats `application/json` as accepting Problem Details, and the web app accepts both types. It is now covered by
  `RangesIT.JsonOnlyClients`, `HttpBehaviourTest#a_client_that_only_accepts_json_can_use_every_operation` and the E2E
  test itself.
- **No route error screen in the web app** (`resilience.spec.ts`): when a tab's chunk could not be downloaded (a deploy
  replaces the files, or the connection drops), React Router's default screen took over the whole page: in English,
  with the stack trace, no header and no way out. The web app now has `RouteErrorPage` as `errorElement`: it replaces
  only the page, offers *Recargar* and *Ir al inicio*, and passes axe. The test fails against the previous version.
- **400s became 500s in the native image** (40 JUnit and Cucumber tests and 2 Newman assertions, only against the
  native image of ADR-0018): Jackson writes the Problem's `errors` by reflection, and Spring AOT cannot see those records
  inside the properties map, so every validation error ended as a 500 or as Spring's default body. The unit and
  integration tests run on the JVM and could not see it; running the black-box suite against the deployable image did.
  Fixed with a runtime hint (`ProblemDetailsHints`) that has its own unit test.
