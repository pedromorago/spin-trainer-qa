package com.pedromorago.spintrainer.qa.data;

import com.pedromorago.spintrainer.qa.model.Action;
import com.pedromorago.spintrainer.qa.model.RangeWrite;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;
import net.datafaker.Faker;

/**
 * Test ranges. Random ones use a seed that is recorded in the case name so the case can be reproduced.
 */
public final class RangeFactory {

    private RangeFactory() {}

    /** Body of a PUT: the given hands with the starting version. */
    public static RangeWrite write(Map<String, String> hands, int version) {
        Map<String, Action> typed = new HashMap<>();
        hands.forEach((hand, action) -> typed.put(hand, Action.fromValue(action)));
        return new RangeWrite().hands(typed).version(version);
    }

    /** Random range (between 1 and 40 hands) with situation actions other than the implicit one. */
    public static Map<String, String> random(long seed, List<String> actions, String implicitAction) {
        Faker faker = new Faker(new Random(seed));
        List<String> explicit = actions.stream()
                .filter(action -> !action.equals(implicitAction))
                .toList();
        Map<String, String> hands = new HashMap<>();
        int size = faker.number().numberBetween(1, 41);
        List<String> shuffled = new ArrayList<>(Hands.all());
        Collections.shuffle(shuffled, new Random(seed));
        for (String hand : shuffled.subList(0, size)) {
            hands.put(hand, explicit.get(faker.number().numberBetween(0, explicit.size())));
        }
        return hands;
    }

    public static long newSeed() {
        return ThreadLocalRandom.current().nextLong();
    }
}
