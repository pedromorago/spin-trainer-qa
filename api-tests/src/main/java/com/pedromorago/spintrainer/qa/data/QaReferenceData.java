package com.pedromorago.spintrainer.qa.data;

import java.util.List;
import java.util.Map;

/**
 * Datos conocidos del entorno de QA: el catálogo de situaciones (seed de la API) y el rango de referencia que carga
 * {@code env/flyway/R__qa_reference_ranges.sql} (el mismo que el mock de la web). Oráculo de los tests.
 */
public final class QaReferenceData {

    public static final String BTN_OPEN = "btn_open";
    public static final String BB_VS_SB_LIMP = "bb_vs_sb_limp";
    public static final String BB_VS_BTN_MR_SB_3BET = "bb_vs_btn_mr_sb_3bet";

    /** btn_open@25: la única combinación con rango de referencia en QA. */
    public static final Map<String, String> BTN_OPEN_25 = Map.ofEntries(
            Map.entry("AA", "MR_4B_C"),
            Map.entry("KK", "MR_4B_C"),
            Map.entry("QQ", "MR_4B_C"),
            Map.entry("AKs", "MR_4B_C"),
            Map.entry("AKo", "MR_4B_C"),
            Map.entry("JJ", "MR_C_C"),
            Map.entry("TT", "MR_C_C"),
            Map.entry("AQs", "MR_C_C"),
            Map.entry("AQo", "MR_C_C"),
            Map.entry("99", "MR_C_F"),
            Map.entry("88", "MR_C_F"),
            Map.entry("AJs", "MR_C_F"),
            Map.entry("KQs", "MR_C_F"),
            Map.entry("77", "MR_F_F"),
            Map.entry("66", "MR_F_F"),
            Map.entry("ATs", "MR_F_F"),
            Map.entry("KJs", "MR_F_F"),
            Map.entry("QJs", "MR_F_F"),
            Map.entry("AJo", "MR_F_F"),
            Map.entry("KQo", "MR_F_F"),
            Map.entry("55", "L_C_C"),
            Map.entry("44", "L_C_C"),
            Map.entry("33", "L_C_C"),
            Map.entry("22", "L_C_C"),
            Map.entry("T9s", "L_C_F"),
            Map.entry("98s", "L_C_F"),
            Map.entry("87s", "L_C_F"),
            Map.entry("76s", "L_C_F"));

    public static final List<String> BTN_OPEN_ACTIONS =
            List.of("MR_4B_C", "MR_C_C", "MR_C_F", "MR_F_F", "L_C_C", "L_C_F", "ALLIN", "FOLD");
    public static final List<String> BB_VS_SB_LIMP_ACTIONS = List.of("ALLIN", "ISO_C", "CHECK");

    /** Combinaciones sin rango de referencia en QA (el Quiz no puede corregirlas sin rango del usuario). */
    public static final List<String> SPOTS_WITHOUT_REFERENCE = List.of("btn_open@8", "bb_vs_sb_limp@10");

    private QaReferenceData() {}

    /** Acción esperada en btn_open@25: la del rango o FOLD (implícita). */
    public static String btnOpen25Action(String hand) {
        return BTN_OPEN_25.getOrDefault(hand, "FOLD");
    }
}
