package com.pedromorago.spintrainer.qa.data;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pedromorago.spintrainer.qa.config.QaConfig;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reference ranges from the API seed (V5, Tablasmentov3.pdf), read from the pinned copy
 * {@code contract/reference-ranges.json} ({@code gradlew rangesCheck} detects that the API changed it). The tests'
 * oracle: what the API must serve and grade with.
 */
public final class ReferenceRanges {

    private static final Map<String, Map<String, String>> BY_SPOT = load();

    private ReferenceRanges() {}

    /** Hands with an explicit action of {@code situation@stack}, in grid order. */
    public static Map<String, String> of(String situation, Object stack) {
        Map<String, String> hands = BY_SPOT.get(spot(situation, stack));
        if (hands == null) {
            throw new IllegalArgumentException("No reference range in the seed: " + spot(situation, stack));
        }
        return hands;
    }

    /** All combinations with a reference range, in catalog order. */
    public static List<String> spots() {
        return List.copyOf(BY_SPOT.keySet());
    }

    /** {@code btn_open@25}, {@code bb_vs_btn_mr_sb_3bet@12.5}: the canonical form of the stack. */
    public static String spot(String situation, Object stack) {
        return situation + "@"
                + new BigDecimal(stack.toString()).stripTrailingZeros().toPlainString();
    }

    private static Map<String, Map<String, String>> load() {
        Path file = QaConfig.get().rootDir().resolve("contract/reference-ranges.json");
        try {
            JsonNode root = new ObjectMapper().readTree(file.toFile());
            Map<String, Map<String, String>> bySpot = new LinkedHashMap<>();
            for (JsonNode range : root.get("ranges")) {
                Map<String, String> hands = new LinkedHashMap<>();
                range.get("hands")
                        .fields()
                        .forEachRemaining(
                                h -> hands.put(h.getKey(), h.getValue().asText()));
                bySpot.put(
                        spot(range.get("situation").asText(), range.get("stack").decimalValue()),
                        Collections.unmodifiableMap(hands));
            }
            return Collections.unmodifiableMap(bySpot);
        } catch (IOException e) {
            throw new IllegalStateException("Could not read " + file, e);
        }
    }
}
