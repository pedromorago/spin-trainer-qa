package com.pedromorago.spintrainer.qa.client;

import io.restassured.filter.FilterContext;
import io.restassured.filter.OrderedFilter;
import io.restassured.response.Response;
import io.restassured.specification.FilterableRequestSpecification;
import io.restassured.specification.FilterableResponseSpecification;
import java.util.UUID;

/**
 * Each request carries its own {@code X-Correlation-Id} ({@code qa-...}): in the Allure report and in the API's JSON
 * logs a request can be matched with its trace.
 */
public final class CorrelationIdFilter implements OrderedFilter {

    public static final String HEADER = "X-Correlation-Id";

    @Override
    public Response filter(
            FilterableRequestSpecification request, FilterableResponseSpecification response, FilterContext context) {
        if (!request.getHeaders().hasHeaderWithName(HEADER)) {
            request.header(HEADER, "qa-" + UUID.randomUUID());
        }
        return context.next(request, response);
    }

    @Override
    public int getOrder() {
        return HIGHEST_PRECEDENCE;
    }
}
