package com.pedromorago.spintrainer.qa.client;

import static io.restassured.RestAssured.given;

import com.pedromorago.spintrainer.qa.config.QaConfig;
import com.pedromorago.spintrainer.qa.contract.ContractValidationFilter;
import com.pedromorago.spintrainer.qa.contract.OpenApiContract;
import io.qameta.allure.restassured.AllureRestAssured;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;

/**
 * Base of the services (one per contract tag): URL, JSON, correlation id, Allure report with every request and
 * response, validation against the contract and the chosen authentication. Services only name the operation they call.
 */
public abstract class ServiceBase {

    private static final RequestSpecification BASE = new RequestSpecBuilder()
            .setBaseUri(QaConfig.get().apiUrl().toString())
            .setContentType(ContentType.JSON)
            .addFilter(new CorrelationIdFilter())
            .addFilter(new AllureRestAssured())
            .build();

    private final Auth auth;
    private final boolean validateContract;

    protected ServiceBase(Auth auth, boolean validateContract) {
        this.auth = auth;
        this.validateContract = validateContract;
    }

    protected RequestSpecification request() {
        RequestSpecification request = given().spec(BASE);
        if (validateContract) {
            request.filter(new ContractValidationFilter(OpenApiContract.get()));
        }
        auth.apply(request);
        return request;
    }
}
