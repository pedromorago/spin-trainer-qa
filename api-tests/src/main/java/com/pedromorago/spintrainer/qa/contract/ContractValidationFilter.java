package com.pedromorago.spintrainer.qa.contract;

import io.qameta.allure.Allure;
import io.restassured.filter.FilterContext;
import io.restassured.filter.OrderedFilter;
import io.restassured.response.Response;
import io.restassured.specification.FilterableRequestSpecification;
import io.restassured.specification.FilterableResponseSpecification;
import java.util.List;

/**
 * Validates every response against {@code openapi.yaml}, in every test and without the test asking for it: an API
 * change that breaks the contract fails any test that touches it. The path is the template the service called with
 * ({@code /ranges/user/{situation}/{stack}}), which matches the spec's one.
 */
public final class ContractValidationFilter implements OrderedFilter {

    private final OpenApiContract contract;

    public ContractValidationFilter(OpenApiContract contract) {
        this.contract = contract;
    }

    @Override
    public Response filter(
            FilterableRequestSpecification request, FilterableResponseSpecification response, FilterContext context) {
        Response result = context.next(request, response);
        String path = request.getUserDefinedPath();
        List<String> violations = contract.violations(
                request.getMethod(), path, result.statusCode(), result.contentType(), result.asString());
        if (!violations.isEmpty()) {
            String report = request.getMethod() + " " + path + " → " + result.statusCode()
                    + " no cumple openapi.yaml:\n" + String.join("\n", violations) + "\n" + result.asString();
            Allure.addAttachment("Incumplimientos del contrato", "text/plain", report);
            throw new AssertionError(report);
        }
        return result;
    }

    @Override
    public int getOrder() {
        return LOWEST_PRECEDENCE;
    }
}
