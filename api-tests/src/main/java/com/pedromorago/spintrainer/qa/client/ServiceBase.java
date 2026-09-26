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
 * Base de los servicios (uno por tag del contrato): URL, JSON, correlation id, informe de Allure con cada petición y
 * respuesta, validación contra el contrato y la autenticación elegida. Los servicios solo dicen qué operación llaman.
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
