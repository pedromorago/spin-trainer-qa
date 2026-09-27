# language: es
@rangos @ADR-0012 @ADR-0013
Característica: Rango personalizado
  El jugador guarda su propio rango para una situación y un stack. Cada guardado dice de qué versión parte: si el rango
  ha cambiado desde entonces (otra pestaña, otro dispositivo), el guardado se rechaza y no se pierde nada.

  Antecedentes:
    Dado que soy un jugador nuevo

  @smoke
  Escenario: el primer guardado crea la versión 1
    Cuando guardo mi rango de "btn_open" a 25 BB partiendo de la versión 0:
      | mano | acción  |
      | AA   | ALLIN   |
      | KK   | MR_4B_C |
    Entonces mi rango de "btn_open" a 25 BB está en la versión 1 con:
      | mano | acción  |
      | AA   | ALLIN   |
      | KK   | MR_4B_C |

  Escenario: cada guardado sube la versión
    Dado que mi rango de "btn_open" a 25 BB es:
      | mano | acción |
      | AA   | ALLIN  |
    Cuando guardo mi rango de "btn_open" a 25 BB partiendo de la versión 1:
      | mano | acción  |
      | AA   | MR_4B_C |
    Entonces mi rango de "btn_open" a 25 BB está en la versión 2 con:
      | mano | acción  |
      | AA   | MR_4B_C |

  Escenario: dos pestañas guardan desde la misma versión y la segunda no pisa a la primera
    Dado que mi rango de "btn_open" a 25 BB es:
      | mano | acción |
      | AA   | ALLIN  |
    Cuando guardo mi rango de "btn_open" a 25 BB partiendo de la versión 1:
      | mano | acción |
      | KK   | ALLIN  |
    Y guardo mi rango de "btn_open" a 25 BB partiendo de la versión 1:
      | mano | acción |
      | QQ   | ALLIN  |
    Entonces la API lo rechaza como "conflicto" con el detalle "The range is at version 2; reload"
    Y mi rango de "btn_open" a 25 BB está en la versión 2 con:
      | mano | acción |
      | KK   | ALLIN  |

  Escenario: las manos con la acción implícita no se guardan
    Cuando guardo mi rango de "btn_open" a 25 BB partiendo de la versión 0:
      | mano | acción |
      | AA   | ALLIN  |
      | 72o  | FOLD   |
    Entonces mi rango de "btn_open" a 25 BB está en la versión 1 con:
      | mano | acción |
      | AA   | ALLIN  |

  Escenario: borrar el rango personalizado vuelve al de referencia
    Dado que mi rango de "btn_open" a 25 BB es:
      | mano | acción |
      | AA   | ALLIN  |
    Cuando borro mi rango de "btn_open" a 25 BB
    Y respondo "MR_4B_C" con AA en "btn_open" a 25 BB
    Entonces no tengo rango de "btn_open" a 25 BB
    Y la respuesta es correcta
    Y se corrigió con el rango de referencia

  Esquema del escenario: no se guarda nada que no sea válido (<motivo>)
    Cuando guardo mi rango de "<situación>" a <stack> BB partiendo de la versión 0:
      | mano   | acción   |
      | <mano> | <acción> |
    Entonces la API lo rechaza como "<error>"
    Y no tengo rango de "<situación>" a <stack> BB

    Ejemplos:
      | motivo                          | situación     | stack | mano | acción | error         |
      | mano no canónica                | btn_open      | 25    | KAs  | ALLIN  | validación    |
      | acción de otra situación        | btn_open      | 25    | AA   | CHECK  | validación    |
      | la situación no tiene FOLD      | bb_vs_sb_limp | 10    | AA   | FOLD   | validación    |
      | stack que no es de la situación | btn_open      | 12,5  | AA   | ALLIN  | no encontrado |
