package com.pedromorago.spintrainer.qa.data;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/** Las 169 manos canónicas del grid (misma construcción que la web y la API) y valores de prueba. */
public final class Hands {

    private static final String RANKS = "AKQJT98765432";
    private static final List<String> ALL = grid();

    /** Clases de equivalencia de manos no válidas y el motivo. */
    public static final List<String> NOT_CANONICAL = List.of("AAs", "AK", "KAs", "AKx", "1Ks", "aks", "A");

    private Hands() {}

    public static List<String> all() {
        return ALL;
    }

    public static String random() {
        return ALL.get(ThreadLocalRandom.current().nextInt(ALL.size()));
    }

    private static List<String> grid() {
        List<String> hands = new ArrayList<>(169);
        for (int row = 0; row < 13; row++) {
            for (int col = 0; col < 13; col++) {
                char high = RANKS.charAt(Math.min(row, col));
                char low = RANKS.charAt(Math.max(row, col));
                hands.add(row == col ? "" + high + low : "" + high + low + (col > row ? 's' : 'o'));
            }
        }
        return List.copyOf(hands);
    }
}
