package com.pedromorago.spintrainer.qa.data;

import java.util.List;
import java.util.Map;

/**
 * Datos conocidos del entorno de QA: el catálogo de situaciones y los rangos de referencia del seed de la API
 * ({@link ReferenceRanges}), menos el ajuste de QA de {@code env/flyway/R__qa_fixtures.sql}: btn_open@8 se queda sin
 * rango de referencia para poder probar en caja negra que sin rango no hay corrección.
 */
public final class QaReferenceData {

    public static final String BTN_OPEN = "btn_open";
    public static final String BB_VS_SB_LIMP = "bb_vs_sb_limp";
    public static final String BB_VS_BTN_MR_SB_3BET = "bb_vs_btn_mr_sb_3bet";

    /** btn_open@25 del seed. */
    public static final Map<String, String> BTN_OPEN_25 = ReferenceRanges.of(BTN_OPEN, 25);

    public static final List<String> BTN_OPEN_ACTIONS =
            List.of("MR_4B_C", "MR_C_C", "MR_C_F", "MR_F_F", "L_C_C", "L_C_F", "ALLIN", "FOLD");
    public static final List<String> BB_VS_SB_LIMP_ACTIONS = List.of("ALLIN", "ISO_C", "CHECK");

    /** Combinaciones del catálogo sin rango de referencia en QA (el Quiz no puede corregirlas sin rango del usuario). */
    public static final List<String> SPOTS_WITHOUT_REFERENCE = List.of("btn_open@8");

    private QaReferenceData() {}

    /** Acción esperada en btn_open@25: la del rango o FOLD (implícita). */
    public static String btnOpen25Action(String hand) {
        return BTN_OPEN_25.getOrDefault(hand, "FOLD");
    }

    /** Lo que sirve la API en QA: todas las combinaciones del seed salvo las que el ajuste de QA deja sin rango. */
    public static List<String> servedReferenceSpots() {
        return ReferenceRanges.spots().stream()
                .filter(spot -> !SPOTS_WITHOUT_REFERENCE.contains(spot))
                .toList();
    }
}
