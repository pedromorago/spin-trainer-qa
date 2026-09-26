# language: es
@quiz @estadisticas @ADR-0007 @ADR-0013
Característica: Historial y estadísticas del Quiz
  Cada respuesta es un evento inmutable: queda corregida con el rango de ese momento aunque el rango cambie después.
  Las estadísticas son consultas sobre esos eventos.

  Antecedentes:
    Dado que soy un jugador nuevo

  Escenario: cambiar el rango no vuelve a corregir las respuestas pasadas
    Dado que respondí en "btn_open" a 25 BB:
      | mano | respuesta |
      | 72o  | FOLD      |
    Cuando guardo mi rango de "btn_open" a 25 BB partiendo de la versión 0:
      | mano | acción |
      | 72o  | ALLIN  |
    Entonces mi rango de "btn_open" a 25 BB está en la versión 1 con:
      | mano | acción |
      | 72o  | ALLIN  |
    Y mi última respuesta sigue siendo correcta y corregida con el rango de referencia
    Y si vuelvo a responder "FOLD" con 72o en "btn_open" a 25 BB, se corrige con mi rango y la acción "ALLIN"

  Escenario: el historial guarda cada respuesta con su corrección, de la más reciente a la más antigua
    Dado que respondí en "btn_open" a 25 BB:
      | mano | respuesta |
      | AA   | MR_4B_C   |
      | KK   | MR_4B_C   |
      | QQ   | FOLD      |
    Entonces mi historial contiene:
      | mano | respuesta | esperada | resultado  |
      | AA   | MR_4B_C   | MR_4B_C  | correcta   |
      | KK   | MR_4B_C   | MR_4B_C  | correcta   |
      | QQ   | FOLD      | MR_4B_C  | incorrecta |
    Y está ordenado de la respuesta más reciente a la más antigua

  Escenario: las estadísticas agregan las respuestas por mano y por día
    Dado que respondí en "btn_open" a 25 BB:
      | mano | respuesta |
      | AA   | MR_4B_C   |
      | AA   | FOLD      |
      | 72o  | FOLD      |
    Entonces mis estadísticas por mano son:
      | mano | respuestas | aciertos |
      | AA   | 2          | 1        |
      | 72o  | 1          | 1        |
    Y hoy llevo 3 respuestas y 2 aciertos
