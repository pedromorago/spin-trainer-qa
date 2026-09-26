package com.pedromorago.spintrainer.qa.data;

import java.util.List;
import java.util.Map;

/**
 * Known data of the QA environment: the situation catalog and the reference ranges from the API seed
 * ({@link ReferenceRanges}), minus the QA adjustment in {@code env/flyway/R__qa_fixtures.sql}: btn_open@8 is left
 * without a reference range so that black-box tests can prove that without a range there is no grading.
 */
public final class QaReferenceData {

    public static final String BTN_OPEN = "btn_open";
    public static final String BB_VS_SB_LIMP = "bb_vs_sb_limp";
    public static final String BB_VS_BTN_MR_SB_3BET = "bb_vs_btn_mr_sb_3bet";

    /** btn_open@25 from the seed. */
    public static final Map<String, String> BTN_OPEN_25 = ReferenceRanges.of(BTN_OPEN, 25);

    public static final List<String> BTN_OPEN_ACTIONS =
            List.of("MR_4B_C", "MR_C_C", "MR_C_F", "MR_F_F", "L_C_C", "L_C_F", "ALLIN", "FOLD");
    public static final List<String> BB_VS_SB_LIMP_ACTIONS = List.of("ALLIN", "ISO_C", "CHECK");

    /** Catalog combinations without a reference range in QA (the Quiz can't grade them without a user range). */
    public static final List<String> SPOTS_WITHOUT_REFERENCE = List.of("btn_open@8");

    private QaReferenceData() {}

    /** Expected action in btn_open@25: the range's one or FOLD (implicit). */
    public static String btnOpen25Action(String hand) {
        return BTN_OPEN_25.getOrDefault(hand, "FOLD");
    }

    /** What the API serves in QA: every seed combination except those the QA adjustment leaves without a range. */
    public static List<String> servedReferenceSpots() {
        return ReferenceRanges.spots().stream()
                .filter(spot -> !SPOTS_WITHOUT_REFERENCE.contains(spot))
                .toList();
    }
}
