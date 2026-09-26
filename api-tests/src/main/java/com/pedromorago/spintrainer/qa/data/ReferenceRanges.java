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
 * Rangos de referencia del seed de la API (V5, Tablasmentov3.pdf), leídos de la copia fijada
 * {@code contract/reference-ranges.json} ({@code gradlew rangesCheck} detecta que la API la cambió). Oráculo de los
 * tests: lo que la API debe servir y con lo que debe corregir.
 */
public final class ReferenceRanges {

    private static final Map<String, Map<String, String>> BY_SPOT = load();

    private ReferenceRanges() {}

    /** Manos con acción explícita de {@code situación@stack}, en el orden del grid. */
    public static Map<String, String> of(String situation, Object stack) {
        Map<String, String> hands = BY_SPOT.get(spot(situation, stack));
        if (hands == null) {
            throw new IllegalArgumentException("Sin rango de referencia en el seed: " + spot(situation, stack));
        }
        return hands;
    }

    /** Todas las combinaciones con rango de referencia, en el orden del catálogo. */
    public static List<String> spots() {
        return List.copyOf(BY_SPOT.keySet());
    }

    /** {@code btn_open@25}, {@code bb_vs_btn_mr_sb_3bet@12.5}: la forma canónica del stack. */
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
            throw new IllegalStateException("No se pudo leer " + file, e);
        }
    }
}
