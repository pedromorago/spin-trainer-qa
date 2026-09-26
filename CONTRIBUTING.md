# spin-trainer-qa

Suite de pruebas de caja negra de Spin Trainer. Reglas comunes a los tres repos, resumidas aquí para que
este repo sea autosuficiente. Fuente de verdad del proyecto: `spin-trainer-web/docs/` (contexto, arquitectura, ADRs).

## Reglas globales (resumen)
- Calidad de portfolio > velocidad. ADRs cerrados; solo se reabren con fallo concreto y justificado (ADR nuevo).
- Validación contra la spec en lugar de Pact (ADR-0008). El contrato es `spin-trainer-api/openapi.yaml`; aquí hay una
  copia fijada (`contract/openapi.yaml`, `gradlew specCheck` / `specSync`) que no se edita a mano.
- Gradle (Kotlin DSL), nunca Maven. TypeScript solo en Playwright. Descartados: OWASP ZAP, carga, Pact, pgTAP.
- Commits **siempre a nombre de Pedro** (autor y committer: `Pedro Morago López-Vázquez <pedromoragolv@gmail.com>`;
  verificar `git config user.name/user.email` antes de commitear). Conventional Commits, sin trailer de coautoría ni de atribución.
- Entorno de Pedro: Windows 10/11 (comandos con `gradlew.bat`; nada que dependa de bash).

## Stack y comandos
JUnit 5 · REST Assured · AssertJ · Cucumber 7 · Allure · Testcontainers (docker compose) · WireMock (JWKS) ·
Datafaker · Nimbus JOSE · networknt JSON Schema · openapi-generator (modelos) · Newman (Node).

```
./gradlew :api-tests:test      # levanta env/docker-compose.yml, ejecuta y lo para (Docker necesario)
./gradlew specCheck            # contract/openapi.yaml == ../spin-trainer-api/openapi.yaml
./gradlew spotlessApply
npm run env:up && npm run newman   # colección de Newman contra el entorno en marcha
```
Antes de commitear: `specCheck` y `:api-tests:test` en verde.

## Convenciones
- Caja negra: los tests solo hablan HTTP con la API. La preparación que la API no permite (datos de referencia) es
  seed de QA en `env/flyway`, nunca SQL desde los tests.
- Cliente: `Api.as(usuario).ranges().putUser(...)`; `ServiceBase` añade correlation id, Allure y la validación contra el
  contrato en todas las peticiones. `withoutContract()` solo para lo que la spec no declara (rutas inexistentes, 503).
- Un usuario nuevo por test (`ApiTest`): los tests van en paralelo sin limpiar datos. `@Isolated` solo si un test toca
  algo compartido (p. ej. el JWKS de WireMock).
- Errores con `ProblemAssert` + `ErrorType` (tipo, estado, título y plantilla del detail), no con textos sueltos.
- Técnica de diseño explícita en el Javadoc del test (particiones, valores límite, tabla de decisión, transiciones) y
  enlace al ADR con `@Link`; la trazabilidad está en `docs/TEST_STRATEGY.md`.
- Modelos generados desde el contrato fijado (`com.pedromorago.spintrainer.qa.model`); las peticiones inválidas en JSON crudo.
- Cucumber: features en español (`# language: es`) con vocabulario de negocio (jugador, mano, rango, respuesta), no de
  HTTP. Steps en `qa.bdd`, estado del escenario en `ScenarioContext` (picocontainer), etiquetas `@ADR-00xx` (enlaces en
  Allure) y `@smoke`. Las reglas que solo se pueden expresar con detalle técnico van en JUnit.
- Newman: la colección se edita en Postman y se exporta a `newman/` (v2.1). Un jugador nuevo por ejecución
  (`scripts/newman.mjs`); comprueba comportamiento, la validación contra la spec la hace la suite de Java.
- Tokens fuera de la JVM (Newman, Playwright): `scripts/lib/qa-jwt.mjs`, mismos claims que `JwtForge`.
