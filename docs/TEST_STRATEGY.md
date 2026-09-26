# Estrategia de pruebas

Qué se prueba en `spin-trainer-qa`, con qué técnicas y contra qué oráculos, y cómo encaja con las pruebas que viven en
los otros dos repos. Decisiones de proyecto: `spin-trainer-web/docs/adr/`.

## Objetivo y alcance

La suite prueba **el artefacto desplegable** (la imagen Docker de la API con el perfil `prod`, la base de datos preparada
con el `bootstrap.sql` real y los JWT validados contra un JWKS por red) como caja negra: solo habla HTTP. Puede
apuntarse a cualquier despliegue con `QA_API_URL`.

Fuera de alcance, por decisión (ADR-0010): seguridad dinámica (OWASP ZAP), carga y rendimiento (k6, JMeter), Pact y
pruebas de base de datos (pgTAP).

## Niveles y dónde vive cada uno

| Nivel | Repo | Qué cubre | Por qué ahí |
|---|---|---|---|
| Unitario (dominio web) | web · Vitest | `domain/` puro: `actionFor`, veredictos, selección, series de stats | Reglas puras; el 90 % de cobertura se exige ahí |
| Conformidad del mock | web · Vitest | El mock valida y responde como la spec (`contract.test.js`) | La web y los E2E en modo mock dependen de él |
| Unitario (API) | api · JUnit | Dominio, casos de uso, ArchUnit | Sin Spring ni Docker; reloj controlado |
| Integración (API) | api · `*IT` | App completa con Postgres (Testcontainers), JWT reales, roles de BD, respuestas validadas contra la spec | Caja blanca: fija el reloj (cortes de día y cambios de hora) y consulta privilegios de BD |
| **Aceptación de API** | **qa · REST Assured** | El artefacto desplegado: contrato, reglas de negocio, seguridad, HTTP | Independiente del código; lo que ve un cliente |
| Especificación ejecutable | qa · Cucumber | Reglas de negocio en Gherkin, en español | Legible por quien valida los rangos |
| Regresión de colección | qa · Newman | El flujo completo de un jugador como colección de Postman | Ejecutable fuera de la JVM y abrible en Postman |
| E2E | qa · Playwright | La web contra el mock y contra la API real, las mismas specs; accesibilidad con axe | Flujos de usuario reales, en un navegador |

Solapamiento con los `*IT` de la API, intencionado: allí se prueba el código con conocimiento interno; aquí, el
contenedor tal como se desplegará (configuración de producción, imagen, red, emisor externo). Los defectos de empaquetado
y configuración solo aparecen aquí.

## Bases de prueba

1. Contrato: `contract/openapi.yaml` (copia fijada de `spin-trainer-api/openapi.yaml`, v0.2; `specCheck` falla si
   diverge).
2. Rangos de referencia: `contract/reference-ranges.json` (copia fijada del seed de la API, las 73 tablas de
   Tablasmentov3.pdf; `rangesCheck` falla si diverge).
3. ADRs: 0003 (Supabase solo emite el JWT), 0007 (intentos inmutables), 0012 (rango efectivo), 0013 (contrato v0.2:
   corrección en servidor, versiones, stats agregadas).
4. Reglas de dominio de `SPIN_TRAINER_PROJECT_CONTEXT.md`: acción implícita (FOLD, o CHECK si FOLD no es posible), 169
   manos canónicas, stacks en múltiplos de 0,5 BB.

## Oráculos

- **La spec**, en cada respuesta: `ContractValidationFilter` valida estado declarado, `Content-Type` y cuerpo (esquema y
  formatos) de todas las peticiones. Un test que no mira el cuerpo sigue comprobando el contrato.
- **Los rangos de referencia del seed** (copia fijada, `ReferenceRanges` en Java y `e2e/data/reference.ts`): la API
  tiene que servirlos mano a mano, y la corrección del Quiz se compara con la acción esperada que dan, para manos y
  respuestas al azar.
- **`ErrorType`**: tipo, estado, título y plantilla del `detail` de cada Problem (RFC 9457).
- **Ida y vuelta**: lo que devuelve una escritura es lo que devuelve la lectura posterior.

## Técnicas de diseño

| Técnica | Dónde |
|---|---|
| Particiones de equivalencia | `UserRangeValidationTest` (manos no canónicas, cuerpos fuera del contrato), `QuizGradingTest#rejects_invalid_attempts`, `AuthenticationTest` (una partición por motivo de rechazo del JWT) |
| Valores límite | `limit` 0/1/200/201 (`AttemptHistoryTest`), `days` 0/1/365/366 (`StatsTest`), `version` 0 y tamaño máximo del documento (`UserRangeValidationTest`), stacks 12.3/12.5 |
| Tabla de decisión | `QuizGradingTest#grades_against_the_effective_range`: ¿rango del usuario? × ¿mano en el rango? → acción esperada y origen |
| Transición de estados | `UserRangeLifecycleTest`: sin rango → v1 → v2 → borrado, con los 409 de cada transición no válida |
| Pruebas con oráculo aleatorias | `QuizGradingTest#agrees_with_the_reference_range_for_any_hand_and_answer` (10 repeticiones) |
| Datos generados con semilla | `UserRangeLifecycleTest#any_valid_range_round_trips`: rangos aleatorios con Datafaker; la semilla va en el nombre del caso para reproducirlo |
| Concurrencia (actualización perdida) | `UserRangeLifecycleTest#two_tabs_editing_the_same_version_cannot_lose_an_update` |
| Aislamiento entre usuarios | `each_user_only_sees_their_own_*` (rangos e intentos) |

## Trazabilidad

| Requisito | Base | Tests |
|---|---|---|
| Catálogo de 16 situaciones con acción implícita y stacks válidos | Contexto, contrato | `SituationCatalogTest` |
| Rangos de referencia servidos desde el seed, revalidables con ETag | ADR-0006, contrato | `ReferenceRangesTest` |
| Los rangos servidos son, mano a mano, los del PDF | ADR-0006 | `ReferenceRangesTest#every_range_served_is_the_seeded_one` |
| Rango personalizado versionado; un PUT con versión antigua es 409 y no pisa nada | ADR-0013 | `UserRangeLifecycleTest`, `rango_personalizado.feature`, Newman |
| Nada inválido se guarda; errores por campo | Contrato | `UserRangeValidationTest`, `rango_personalizado.feature` |
| Rango efectivo = personalizado si existe; si no, el de referencia | ADR-0012 | `QuizGradingTest` (tabla de decisión), `correccion_del_quiz.feature`, Newman |
| El servidor corrige; el cliente no puede mandar `correct` | ADR-0013 | `QuizGradingTest`, Newman |
| Los intentos no cambian aunque cambie el rango | ADR-0007 | `QuizGradingTest#past_attempts_keep_their_grade_when_the_range_changes`, `historial_y_estadisticas.feature` |
| Historial paginado sin huecos ni duplicados, filtrable | Contrato | `AttemptHistoryTest`, Newman |
| Stats agregadas por la API | ADR-0013 | `StatsTest`, `historial_y_estadisticas.feature`, Newman |
| Cada jugador solo ve sus datos | ADR-0003 | `each_user_only_sees_their_own_*`, `privacidad.feature` |
| El Explorer muestra el rango efectivo y solo él escribe rangos; el Builder no persiste | ADR-0012 | `explorer.spec.ts`, `builder.spec.ts` |
| Dos pestañas no se pisan: la segunda recibe el 409 y puede recargar | ADR-0013 | `explorer.spec.ts` (mock y fullstack) |
| El Quiz corrige con el rango efectivo; el histórico lo agrega el servidor | ADR-0012, ADR-0013 | `quiz.spec.ts`, `stats.spec.ts` |
| La selección vive en la URL y se normaliza | Arquitectura web | `navigation.spec.ts` |
| Controles accesibles por teclado y lector (WCAG 2.2 AA) | Contexto (calidad) | `accessibility.spec.ts`, atajos en `quiz.spec.ts` |
| Solo JWT de sesión del emisor configurado (ES256, emisor, audiencia, rol, `exp`, `sub`) | ADR-0003 | `AuthenticationTest` |
| Emisor caído → 503, no 401 | ADR-0003 | `IssuerOutageTest` |
| Errores como Problem Details, también fuera de las rutas del contrato | Contrato | `ProblemAssert` en todas las suites, `HttpBehaviourTest` |
| CORS solo para el origen de la web; correlation id | Contrato | `HttpBehaviourTest` |

En Allure: cada clase lleva `@Feature` y los ADRs que prueba como `@Link` (en Gherkin, la etiqueta `@ADR-0012` se
convierte en el mismo enlace); el usuario del test va como parámetro para
buscar sus peticiones en los logs de la API (JSON con `correlationId`).

Lo que se prueba en la API y no aquí, porque exige controlar la aplicación por dentro: cortes de día por zona horaria y
cambios de hora (`StatsIT`, reloj fijo), privilegios de los roles de BD e inmutabilidad de los intentos a nivel de
permisos (`DatabaseRolesIT`).

## Cucumber y Newman: qué aporta cada uno

- **Cucumber** expresa las reglas de negocio con el vocabulario del jugador (mano, rango, respuesta, versión), en
  español: es la parte de la suite que puede revisar alguien que conoce el poker y no el código. Los detalles técnicos
  (cabeceras, formatos, JWT) se quedan en JUnit. Corre en la misma tarea de Gradle, contra el mismo entorno y con la
  misma validación contra la spec en cada petición.
- **Newman** recorre el flujo completo de un jugador nuevo, petición a petición y encadenando estado (ETag, versiones,
  cursor), como lo haría un cliente. Sirve de humo de despliegue desde Node, sin la JVM, y se abre en Postman para
  explorar la API a mano. Es una dependencia solo de desarrollo: `npm audit` avisa de dependencias de Newman que no se
  usan con entradas externas (solo ejecuta la colección del repo).

## E2E: dos backends, las mismas specs

El proyecto `mock` prueba la web sola (rápido, sin Docker); `fullstack`, la web compilada en modo http contra la API
del entorno de QA, con la sesión de Supabase inyectada (el JWT de QA). Como los datos de referencia coinciden, las specs
y los oráculos son los mismos: si algo pasa en `mock` y falla en `fullstack`, el fallo está en la integración (ver
Hallazgos). Cada test falla también ante errores de consola o respuestas HTTP ≥ 400 no previstas, y cada página se
analiza con axe (WCAG 2.2 AA).

## Datos y aislamiento

- Un usuario (UUID) nuevo por test, por escenario de Cucumber y por ejecución de Newman: todo corre en paralelo
  (4 hilos en JUnit y 4 en Cucumber) sin limpiar nada.
- Datos de referencia: los reales, del seed de la API. Lo que la suite necesita y la API no permite escribir va en
  `env/flyway/R__qa_fixtures.sql`, que Flyway aplica después de las migraciones: hoy, btn_open@8 sin rango de
  referencia, para probar el 422 en caja negra (en producción todas las combinaciones tienen rango). Nunca SQL desde
  los tests.
- `@Isolated` solo para lo que cambia algo compartido: `IssuerOutageTest` deja sin JWKS a toda la suite.
- E2E: un jugador nuevo por test (con el mock, un contexto de navegador nuevo, con su propio almacenamiento).

## Entorno

`env/docker-compose.yml`: Postgres con el `bootstrap.sql` de la API, WireMock sirviendo el JWKS de una clave ES256 de QA
(el papel de Supabase) y la API construida desde su repo. `QaEnvironmentListener` lo levanta con Testcontainers al
empezar la sesión de JUnit y lo borra al terminar; si ya hay uno en marcha, lo reutiliza y no lo toca.

## Patrones del framework profesional

| Patrón | Aquí | Mejora |
|---|---|---|
| ServiceBase | `ServiceBase` + un servicio por tag de la spec, fachada `Api` | Sin god-object: cada servicio conoce solo sus rutas |
| TestBase + TestWatcherBase | `ApiTest` + `QaTestWatcher` | Usuario y cliente nuevos por test; el watcher adjunta el entorno al fallar |
| DTOs con builder | Modelos generados desde la spec (setters fluidos) | Sin Lombok: si la spec cambia, no compila |
| ErrorType con plantillas | `ErrorType` + `ProblemAssert` | Aserción fluida sobre el Problem completo |
| Validación JSON Schema | Validación contra la spec en cada respuesta | Sin esquemas copiados a mano (ADR-0008) |
| Token chain | `LocalJwtTokenProvider` (caché por usuario) | Registro de proveedores (`TokenProviders`) en lugar de un login fijo |
| Data factories con Faker | `RangeFactory`, `Hands` | Semilla reproducible; `ThreadLocalRandom` en paralelo |
| Configuración | `QaConfig` (propiedad `-Pqa.*` → variable `QA_*` → defecto) | Un único registro inmutable |
| Qase por anotaciones | `@Feature`/`@Link` de Allure | Qase aplazado: sin gestor de casos por ahora |
| Page Objects con regiones | `e2e/pages` (`#region` localizadores, acciones, consultas) | Componentes compartidos (`HandGrid`) como objetos propios |

## Hallazgos

- **503 no declarado en la spec** (`IssuerOutageTest`): con el emisor caído la API respondía un 503 correcto que el
  contrato no recogía. Se documentó en la descripción de la spec que cualquier operación puede devolver 500 y 503 (sin
  declararlo por operación, para que el validador siga rechazando otros estados no previstos).
- **406 en el DELETE de un rango desde la web** (`explorer.spec.ts`, proyecto `fullstack`): el Reset del Explorer
  fallaba contra la API real y pasaba contra el mock. La web mandaba `Accept: application/json` y el DELETE (204 sin
  cuerpo; sus errores en `application/problem+json`) no tenía ninguna representación aceptable, así que Spring
  respondía 406 sin ejecutarlo. Ni los IT de la API ni Newman lo veían: mandan `Accept: */*`. Arreglado en los dos
  lados: la API trata `application/json` como aceptación de Problem Details y la web acepta los dos tipos. Queda
  cubierto por `RangesIT.JsonOnlyClients`, `HttpBehaviourTest#a_client_that_only_accepts_json_can_use_every_operation`
  y el propio E2E.
