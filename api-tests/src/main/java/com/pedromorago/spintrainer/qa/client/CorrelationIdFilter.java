package com.pedromorago.spintrainer.qa.client;

import io.restassured.builder.ResponseBuilder;
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

    /** Added to the response by this filter: the id the request carried, for assertions on the response alone. */
    public static final String SENT = "X-QA-Sent-Correlation-Id";

    @Override
    public Response filter(
            FilterableRequestSpecification request, FilterableResponseSpecification response, FilterContext context) {
        if (!request.getHeaders().hasHeaderWithName(HEADER)) {
            request.header(HEADER, "qa-" + UUID.randomUUID());
        }
        String sent = request.getHeaders().getValue(HEADER);
        Response received = context.next(request, response);
        return new ResponseBuilder().clone(received).setHeader(SENT, sent).build();
    }

    @Override
    public int getOrder() {
        return HIGHEST_PRECEDENCE;
    }
}
