-- Ajustes de QA sobre los datos reales (propios de la suite, no de la API). Flyway los aplica después de las migraciones
-- versionadas, así que el entorno tiene el catálogo y los rangos de referencia del seed de producción (V5) con una
-- excepción documentada: btn_open@8 se queda sin rango de referencia, para probar en caja negra que sin rango no hay
-- corrección (422). Idempotente.

DELETE FROM app.default_range WHERE situation = 'btn_open' AND stack = 8;
