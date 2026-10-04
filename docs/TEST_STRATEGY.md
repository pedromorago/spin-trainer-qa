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
| E2E | qa · Playwright | The web app against the mock and against the real API, with the same specs, and the public demo; accessibility with axe | Real user flows, in a browser |

The overlap with the API's `*IT` tests is intentional: there, the code is tested with knowledge of its internals; here,
the container as it will be deployed (production configuration, image, network, external issuer). Packaging and
configuration defects only show up here.

## Test basis

1. Contract: `contract/openapi.yaml` (pinned copy of `spin-trainer-api/openapi.yaml`, v0.2; `specCheck` fails if it
   diverges).
2. Reference ranges: `contract/reference-ranges.json` (pinned copy of the API seed: the 73 coloured tables of
   Tablasmentov3.pdf and the 7 ranges derived from its "3H OS call" thresholds; `rangesCheck` fails if it diverges).
3. ADRs: 0003 (Supabase only issues the JWT), 0007 (immutable attempts), 0012 (effective range), 0013 (contract v0.2:
   server-side grading, versions, aggregated stats).
4. Domain rules from `SPIN_TRAINER_PROJECT_CONTEXT.md`: implicit action (FOLD, or CHECK if FOLD is not possible), 169
   canonical hands, stacks in multiples of 0.5 BB.

## Oracles

- **The spec**, on every response: `ContractValidationFilter` validates the declared status, `Content-Type` and body
  (schema and formats) of every response received through `Api`. A test that does not inspect the body still checks
  the contract.
- **The seed's reference ranges** (pinned copy, `ReferenceRanges` in Java and `e2e/data/reference.ts`): the API must
  serve them hand by hand, and Quiz grading is compared against the expected action they yield, for random hands and
  answers.
- **`ErrorType`**: type, status, title and `detail` template of each Problem (RFC 9457).
- **Round trip**: what a write returns is what the subsequent read returns.

## Test design techniques

| Technique | Where |
|---|---|
| Equivalence partitioning | `UserRangeValidationTest` (non-canonical hands, bodies outside the contract), `QuizGradingTest#rejects_invalid_attempts`, `AuthenticationTest` (one partition per JWT rejection reason), `SecurityHeadersTest` (one partition per class of response) |
| Boundary value analysis | `limit` 0/1/200/201 (`AttemptHistoryTest`), `days` 0/1/365/366 (`StatsTest`), `version` 0 and 2,147,483,648, document size 65,536/65,537 bytes (`UserRangeValidationTest`), stacks 12.3/12.5 |
| Decision table | `QuizGradingTest#grades_against_the_effective_range`: user range? × hand in the range? → expected action and range source |
| State transition testing | `UserRangeLifecycleTest`: no range → v1 → v2 → deleted → v3, with the 409 for each invalid transition (a range created again keeps counting versions) |
| Randomized testing against an oracle | `QuizGradingTest#agrees_with_the_reference_range_for_any_hand_and_answer` (10 repetitions) |
| Seeded generated data | `UserRangeLifecycleTest#any_valid_range_round_trips`: random ranges with Datafaker; the seed goes in the test case name so it can be reproduced |
| Concurrency (lost update) | `UserRangeLifecycleTest#concurrent_writes_on_the_same_version_have_exactly_one_winner` (eight simultaneous writers, one wins); `#two_tabs_editing_the_same_version_cannot_lose_an_update` and `#a_stale_tab_cannot_overwrite_a_range_deleted_and_created_again` (sequential) |
| Isolation between users | `each_user_only_sees_their_own_*` (ranges and attempts) |
| Fault injection | `resilience.spec.ts`: Playwright aborts the download of the Quiz chunk (as after a deploy); `server-wake.spec.ts`: a slow answer and 503s while the free API instance wakes up |

## Traceability

| Requirement | Basis | Tests |
|---|---|---|
| Catalog of 17 situations with implicit action and valid stacks | Context, contract | `SituationCatalogTest` |
| Facing the SB's open-shove, the BB calls when the stack is at most the hand's threshold ("3H OS call") | PDF, API V7 | `correccion_del_quiz.feature` (boundary values: threshold equal to the stack and just below), `ReferenceRangesTest` |
| Reference ranges served from the seed, revalidatable with ETag | ADR-0006, contract | `ReferenceRangesTest` |
| The ranges served are, hand by hand, the seeded ones (the pinned copy of the API's `reference-ranges.json`, extracted from the PDF) | ADR-0006 | `ReferenceRangesTest#every_range_served_is_the_seeded_one` |
| Versioned custom range; a PUT with a stale version gets a 409 and overwrites nothing, also after a delete | ADR-0013 | `UserRangeLifecycleTest`, `rango_personalizado.feature`, Newman |
| Nothing invalid is saved; per-field errors | Contract | `UserRangeValidationTest`, `rango_personalizado.feature` |
| Effective range = custom range if it exists; otherwise, the reference range | ADR-0012 | `QuizGradingTest` (decision table), `correccion_del_quiz.feature`, Newman |
| The server grades; the client cannot send `correct` | ADR-0013 | `QuizGradingTest`, Newman |
| Attempts do not change even if the range changes | ADR-0007 | `QuizGradingTest#past_attempts_keep_their_grade_when_the_range_changes`, `historial_y_estadisticas.feature` |
| Paginated history with no gaps or duplicates, filterable | Contract | `AttemptHistoryTest`, Newman |
| Stats aggregated by the API | ADR-0013 | `StatsTest`, `historial_y_estadisticas.feature`, Newman |
| Each player only sees their own data | ADR-0003 | `each_user_only_sees_their_own_*`, `privacidad.feature` |
| The Explorer shows the effective range and is the only one that writes ranges; the Builder does not persist | ADR-0012 | `explorer.spec.ts`, `builder.spec.ts` |
| The Explorer opens read-only (Edit, Copy, a legend; the grid cannot be painted); Edit brings Save (with nothing changed it just goes back to reading, saving nothing), Cancel (asks first with changes) and Reset (only with a custom range); saving or resetting confirms it and goes back to reading | Web architecture | `explorer-modes.spec.ts` |
| Two tabs do not overwrite each other: the second one gets the 409 and can reload | ADR-0013 | `explorer.spec.ts` (mock and fullstack) |
| The Quiz grades against the effective range; historical stats are aggregated by the server | ADR-0012, ADR-0013 | `quiz.spec.ts`, `stats.spec.ts` |
| The selection lives in the URL and is normalized | Web architecture | `navigation.spec.ts` |
| Controls accessible by keyboard and screen reader (WCAG 2.2 AA) | Context (quality) | `accessibility.spec.ts`, shortcuts, focus and announcement in `quiz.spec.ts` |
| Signing out asks about unsaved changes; another player on the same tab starts from their own caches | ADR-0003 | `auth.spec.ts` |
| Google is the only way in (no password form); the privacy notice is public, also at its first address | ADR-0019, ADR-0020 | `auth.spec.ts`, `accessibility.spec.ts` |
| Sign-in with Google straight from the site: Google is asked for an ID token for this site with a new state and the hash of a new nonce; Supabase gets the token and the nonce; the player lands where they were going; an answer this tab did not start never reaches Supabase; every error is explained and no token stays in the URL | ADR-0023 | `google-sign-in.spec.ts` (Google and Supabase's token endpoint played by the test; the real round trip through Google is a manual check), `googleSignIn.test.js` in the web |
| A page that cannot be downloaded or rendered shows a recoverable error and keeps the header | Web architecture | `resilience.spec.ts` |
| On a phone, changing the chart never shows the grid at a size that does not fit, not even for one frame (sampled frame by frame) | Web architecture | `responsive.spec.ts` |
| The landing page shows the product without an account and without calling the API: a live reference chart (every cell checked against the seed) and one question graded against the chart | ADR-0022 | `landing.spec.ts` |
| The first-visit tour: once per device, skippable on every step and with Escape, replayable, focus kept inside it, a bottom sheet on phones, accessible | ADR-0022 | `onboarding.spec.ts` |
| Every action and figure explains itself: tooltips on hover and keyboard focus (not on a click), dismissable, as the accessible description; "?" buttons on touch screens | ADR-0022 | `tooltips.spec.ts` |
| The public demo: no sign-in or sign-out, progress kept in this browser only | ADR-0022 | `demo.spec.ts` (`demo` project) |
| Signed out, the landing's ways into the app sign in right there, in a dialog (focus on Google's button; Escape, the close button and a click outside close it and give the focus back; a bottom sheet on phones; axe), then go where they pointed, also when clicked before a slow network has delivered the session; a click meant for a new tab is left to the browser; the sign-in page shows the live chart, fits a phone and leads home | Web architecture | `sign-in.spec.ts` |
| Only session JWTs from the configured issuer (ES256, issuer, audience, role, `exp`, `sub`) | ADR-0003 | `AuthenticationTest` |
| Issuer down → 503, not 401 | ADR-0003 | `IssuerOutageTest` |
| No response can be sniffed or framed; no cache stores a player's data | Context (security) | `SecurityHeadersTest` |
| The web app works under its production CSP and security headers | ADR-0016 | `content-security-policy.spec.ts` (and the whole E2E suite) |
| While the free API wakes up, the app says so and retries by itself, and the Explorer shows the selector and the PDF chart at once (read-only, Edit off) until the API answers, then the player's own range; the catalog bundled with the web is the one the API serves; the deployed native image behaves like the JVM one | ADR-0018 | `server-wake.spec.ts`; every suite runs against the native image |
| Errors as Problem Details, also outside the contract's routes and for URLs the server rejects before any controller | Contract | `ProblemAssert` in every suite, `HttpBehaviourTest` |
| API error messages in English, the constraints' too, whatever the client's or the JVM's language | ADR-0021 | `AttemptHistoryTest#constraint_messages_are_english`, `ErrorType` templates |
| Only health and the deployed revision are public in Actuator | ADR-0018 | `HttpBehaviourTest#only_health_and_the_revision_are_public` |
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
  validation against the spec on every response.
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

A third project, `demo`, builds the public demo (ADR-0022: the mock's data with no sign-in) and runs only
`demo.spec.ts`. The first-visit tour would cover the Explorer in every spec, so tests start as a returning visitor (the
`onboarded` fixture); `onboarding.spec.ts` opts out to test the first visit.

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

What the tests found:

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
  only the page, offers *Reload* and *Go to start*, and passes axe. The test fails against the previous version.
- **400s became 500s in the native image** (40 JUnit and Cucumber tests and 2 Newman assertions, only against the
  native image of ADR-0018): Jackson writes the Problem's `errors` by reflection, and Spring AOT cannot see those records
  inside the properties map, so every validation error ended as a 500 or as Spring's default body. The unit and
  integration tests run on the JVM and could not see it; running the black-box suite against the deployable image did.
  Fixed with a runtime hint (`ProblemDetailsHints`) that has its own unit test.
- **The landing page started over under a signed-in visitor** (`landing.spec.ts`, `fullstack` project only): "Try a
  hand" dealt a new hand between reading it and answering. The web app re-created every per-user cache, and with them
  the whole page, when the user changed, and reading the stored Supabase session at start-up counted as a change (no
  user, then the stored one). The mock is signed in from the first render, so it could not show it. Reading the stored
  session no longer counts as a change of user (`userScope.js`, unit-tested); signing out or into another account still
  starts new caches (`auth.spec.ts`).
- **Signing in in the landing's dialog lost where it was going** (`sign-in.spec.ts`, `mock` project): the per-user
  caches, and the whole page with them, started again when the user changed, also from nobody to somebody; the dialog
  and its destination went with them, and the player stayed on the landing. Signing in from signed out now keeps the
  page (nothing of anyone's is cached while nobody is signed in), unit-tested in `userScope.test.js`; signing out or
  switching accounts still starts new caches (`auth.spec.ts`).
- **On a phone, a new chart flashed oversized** (seen by the owner on his phone, now `responsive.spec.ts`, which samples
  the grid's width on every frame): the grid sizes its cells from its measured width, and a grid that mounted again
  (after "Loading…" when the chart changes) drew one frame with 42 px cells, 588 px wide on a 390 px screen, before the
  measurement arrived. The width is now read as the element is attached, before the first paint.
- **On a slow network, Start training skipped the dialog** (found by hand on the live site, now
  `sign-in.spec.ts#a click before the session has been read still asks here`): the landing only asked to sign in once it
  knew the visitor was signed out, and that waits for Supabase's client, a chunk of its own. A click in the meantime fell
  through to the plain link and the sign-in page. Locally the chunk arrives at once, so every other test passed; the
  test now holds the chunk back, as a slow network does. The dialog opens at once and, if the stored session turns out to
  be signed in, goes straight on.
- **Help that got in the way** (axe): a tooltip opened by the focus a click gives covered the Builder's grid after
  "Check" (`target-size`, `accessibility.spec.ts`), and with the page scrolled the sticky header's small labels sat
  over the grid's bright cells (`color-contrast`, the tour's scan in `onboarding.spec.ts`). Tooltips now open on
  keyboard focus only and close when their trigger is pressed; the header is nearly opaque.

What a review of the three repos found (a bug sweep after the suites were green), and the test that covers each one
now. Each of these tests fails against the previous version:

- **A range deleted and created again started over at version 1**: a tab still holding version 1 of the old range
  overwrote the new one without a 409 (an ABA), and the same `(user, 1)` was stamped on attempts graded against
  different contents. Versions now keep counting (API migration V6).
  `UserRangeLifecycleTest#a_stale_tab_cannot_overwrite_a_range_deleted_and_created_again`.
- **The suite could be green without running**: `:api-tests:test` was cacheable and its real inputs (the sibling API
  and web, `QA_API_URL`, the pinned contract read at runtime) were invisible to Gradle, so a changed API gave
  `UP-TO-DATE` or `FROM-CACHE`. The task now always runs.
- **Tests that asserted less than they claimed**: the ADR-0007 tests did not check that the range changed (a failed PUT
  passed them), the lost-update test was sequential, the "document size" boundary was 70,000 bytes against a
  65,536 limit, the correlation id was compared with the response instead of the request, the issuer-recovery check
  used a key the API had already cached, and the catalog order checked only its ends. Each one now checks what its
  name says.
- **Stricter API edges**: `{"situation": 5}` was looked up as `"5"` (404 instead of 400), a cursor in the year 300000
  was a 500, validation messages came out in English in the container, and a URL with `;` or `%2F` got Spring Boot's
  or Tomcat's own error page. `QuizGradingTest`, `AttemptHistoryTest`, `HttpBehaviourTest`.
- **Web**: HU SB Open's tenth action (FOLD) had no working shortcut, Enter on a tab dealt the next hand, the next
  player on the same tab inherited the previous one's scoreboard and cache, "Salir" skipped the unsaved-changes
  guard, the redirect from `/` lost the selection, and choosing the active stack tripped the guard. `quiz.spec.ts`,
  `auth.spec.ts`, `navigation.spec.ts`, `explorer.spec.ts`.
- **The E2E guard had blind spots**: it only watched the first tab and could finish before the last request answered.
  It now watches the whole context, failed requests included, and waits for requests in flight; each fault
  injection allows exactly the errors it provokes.
