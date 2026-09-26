package com.pedromorago.spintrainer.qa.bdd;

import static org.assertj.core.api.Assertions.assertThat;

import com.pedromorago.spintrainer.qa.model.Range;
import io.cucumber.datatable.DataTable;
import io.cucumber.java.es.Cuando;
import io.cucumber.java.es.Dado;
import io.cucumber.java.es.Entonces;
import io.restassured.response.Response;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Custom ranges. Hand tables have the columns {@code mano} and {@code acción}. */
public class RangeSteps {

    private final ScenarioContext context;

    public RangeSteps(ScenarioContext context) {
        this.context = context;
    }

    @Dado("que mi rango de {string} a {stack} BB es:")
    public void existingRange(String situation, BigDecimal stack, DataTable hands) {
        Response response = put(situation, stack, 0, hands);
        assertThat(response.statusCode()).as(response.asString()).isEqualTo(201);
    }

    @Cuando("guardo mi rango de {string} a {stack} BB partiendo de la versión {int}:")
    public void save(String situation, BigDecimal stack, int version, DataTable hands) {
        context.remember(put(situation, stack, version, hands));
    }

    @Cuando("borro mi rango de {string} a {stack} BB")
    public void delete(String situation, BigDecimal stack) {
        Response response = context.remember(context.api().ranges().deleteUser(situation, stack.toPlainString()));
        assertThat(response.statusCode()).as(response.asString()).isEqualTo(204);
    }

    @Entonces("mi rango de {string} a {stack} BB está en la versión {int} con:")
    public void storedRange(String situation, BigDecimal stack, int version, DataTable hands) {
        Response response = context.api().ranges().getUser(situation, stack.toPlainString());
        assertThat(response.statusCode()).as(response.asString()).isEqualTo(200);
        Range range = response.as(Range.class);

        assertThat(range.getSource()).isEqualTo(Range.SourceEnum.USER);
        assertThat(range.getVersion()).as("versión").isEqualTo(version);
        Map<String, String> stored = new LinkedHashMap<>();
        range.getHands().forEach((hand, action) -> stored.put(hand, action.getValue()));
        assertThat(stored).as("manos guardadas").containsExactlyInAnyOrderEntriesOf(hands(hands));
    }

    @Entonces("no tengo rango de {string} a {stack} BB")
    public void noRange(String situation, BigDecimal stack) {
        assertThat(userRanges())
                .as("rangos personalizados")
                .noneMatch(range -> range.getSituation().equals(situation)
                        && range.getStack().compareTo(stack) == 0);
    }

    @Entonces("no tiene rangos personalizados")
    public void noRanges() {
        assertThat(userRanges()).isEmpty();
    }

    private Response put(String situation, BigDecimal stack, int version, DataTable hands) {
        // A map, not the generated model: the features also send hands and actions the contract doesn't allow.
        Map<String, Object> body = Map.of("hands", hands(hands), "version", version);
        return context.api().ranges().putUser(situation, stack.toPlainString(), body);
    }

    private List<Range> userRanges() {
        Response response = context.api().ranges().listUser();
        assertThat(response.statusCode()).as(response.asString()).isEqualTo(200);
        return response.jsonPath().getList(".", Range.class);
    }

    private static Map<String, String> hands(DataTable table) {
        Map<String, String> hands = new LinkedHashMap<>();
        table.asMaps().forEach(row -> hands.put(row.get("mano"), row.get("acción")));
        return hands;
    }
}
