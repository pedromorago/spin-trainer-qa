# language: es
@seguridad @ADR-0003
Característica: Cada jugador solo ve sus datos
  La API identifica al jugador por el token de sesión de Supabase. Sin sesión no hay datos, y con sesión cada jugador
  solo ve sus rangos, su historial y sus estadísticas.

  Escenario: otro jugador no ve mis rangos ni mis respuestas
    Dado que soy un jugador nuevo
    Y que mi rango de "btn_open" a 25 BB es:
      | mano | acción |
      | AA   | ALLIN  |
    Y que respondí en "btn_open" a 25 BB:
      | mano | respuesta |
      | AA   | ALLIN     |
    Cuando entra otro jugador nuevo
    Entonces no tiene rangos personalizados
    Y su historial está vacío
    Y no tiene estadísticas

  Escenario: sin sesión no se accede a nada
    Dado que no tengo sesión
    Cuando consulto el catálogo de situaciones
    Entonces la API lo rechaza como "no autenticado" con el detalle "Missing access token (Authorization: Bearer)"
