# language: es
@quiz @ADR-0012 @ADR-0013
Característica: Corrección del Quiz con el rango efectivo
  El servidor corrige cada respuesta del Quiz con el rango efectivo del jugador: su rango personalizado si lo tiene y,
  si no, el de referencia. Las manos que el rango no lista llevan la acción implícita de la situación.

  Antecedentes:
    Dado que soy un jugador nuevo

  Regla: sin rango personalizado se corrige con el de referencia

    @smoke
    Esquema del escenario: <mano> respondiendo <respuesta> en btn_open a 25 BB
      Cuando respondo "<respuesta>" con <mano> en "btn_open" a 25 BB
      Entonces la acción esperada es "<esperada>"
      Y la respuesta es <resultado>
      Y se corrigió con el rango de referencia

      Ejemplos:
        | mano | respuesta | esperada | resultado  |
        | AA   | MR_4B_C   | MR_4B_C  | correcta   |
        | AA   | FOLD      | MR_4B_C  | incorrecta |
        | A5s  | MR_C_F    | MR_C_F   | correcta   |
        | 72o  | FOLD      | FOLD     | correcta   |
        | 72o  | ALLIN     | FOLD     | incorrecta |

  Regla: con rango personalizado se corrige con el del jugador, aunque la mano esté en el de referencia

    Escenario: una mano que el jugador no incluye en su rango se foldea
      Dado que mi rango de "btn_open" a 25 BB es:
        | mano | acción |
        | A5s  | ALLIN  |
      Cuando respondo "MR_4B_C" con AA en "btn_open" a 25 BB
      Entonces la acción esperada es "FOLD"
      Y la respuesta es incorrecta
      Y se corrigió con mi rango en la versión 1

    Escenario: una mano del rango del jugador se corrige con su acción
      Dado que mi rango de "btn_open" a 25 BB es:
        | mano | acción |
        | A5s  | ALLIN  |
      Cuando respondo "ALLIN" con A5s en "btn_open" a 25 BB
      Entonces la respuesta es correcta
      Y se corrigió con mi rango en la versión 1

  Regla: donde no se puede foldear, la acción implícita es pasar

    Escenario: la ciega grande ante el limp de la ciega pequeña pasa con una mano fuera del rango
      Dado que mi rango de "bb_vs_sb_limp" a 10 BB es:
        | mano | acción |
        | AA   | ALLIN  |
      Cuando respondo "CHECK" con 72o en "bb_vs_sb_limp" a 10 BB
      Entonces la acción esperada es "CHECK"
      Y la respuesta es correcta

  Regla: sin ningún rango no hay corrección

    Escenario: una combinación sin rango de referencia ni personalizado
      Cuando respondo "FOLD" con AA en "btn_open" a 8 BB
      Entonces la API lo rechaza como "sin rango" con el detalle "Sin rango para btn_open@8: no se puede corregir"
      Y mi historial está vacío
