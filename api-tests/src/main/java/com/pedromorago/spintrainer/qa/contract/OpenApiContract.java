package com.pedromorago.spintrainer.qa.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.networknt.schema.InputFormat;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SchemaLocation;
import com.networknt.schema.SchemaValidatorsConfig;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import com.pedromorago.spintrainer.qa.config.QaConfig;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Validation against the contract (ADR-0008, instead of Pact): the status must be declared for the operation, so must
 * the {@code Content-Type}, and the body must conform to its schema (JSON Schema 2020-12 with {@code format} as an
 * assertion). Uses the pinned copy {@code contract/openapi.yaml}.
 */
public final class OpenApiContract {

    private static final String SPEC_IRI = "https://spin-trainer.local/openapi.yaml";
    private static final OpenApiContract INSTANCE =
            load(QaConfig.get().rootDir().resolve("contract/openapi.yaml"));

    private final JsonNode spec;
    private final JsonSchemaFactory factory;
    private final SchemaValidatorsConfig config;

    private OpenApiContract(String specText) {
        try {
            spec = new ObjectMapper(new YAMLFactory()).readTree(specText);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        factory = JsonSchemaFactory.getInstance(
                SpecVersion.VersionFlag.V202012,
                builder -> builder.schemaLoaders(loaders -> loaders.schemas(Map.of(SPEC_IRI, specText))));
        config = SchemaValidatorsConfig.builder()
                .formatAssertionsEnabled(true)
                .locale(Locale.ENGLISH)
                .build();
    }

    public static OpenApiContract get() {
        return INSTANCE;
    }

    static OpenApiContract load(Path spec) {
        try {
            return new OpenApiContract(Files.readString(spec, StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * Contract violations of a response; empty if it conforms.
     *
     * @param path spec template, e.g. {@code /ranges/user/{situation}/{stack}}
     */
    public List<String> violations(String method, String path, int status, String contentType, String body) {
        String pointer = "/paths/" + escape(path) + "/" + method.toLowerCase(Locale.ROOT) + "/responses/" + status;
        JsonNode response = spec.at(pointer);
        if (response.isMissingNode()) {
            return List.of("openapi.yaml no declara " + status + " para " + method + " " + path);
        }
        if (response.has("$ref")) {
            pointer = response.get("$ref").asText().substring(1);
            response = spec.at(pointer);
        }
        if (!response.has("content")) {
            return body == null || body.isEmpty()
                    ? List.of()
                    : List.of("la respuesta " + status + " no debe tener cuerpo");
        }
        String mediaType = contentType == null ? "" : contentType.split(";")[0].trim();
        if (!response.get("content").has(mediaType)) {
            return List.of(
                    "Content-Type '" + mediaType + "' no declarado para " + status + " en " + method + " " + path);
        }
        JsonSchema schema = factory.getSchema(
                SchemaLocation.of(SPEC_IRI + "#" + pointer + "/content/" + escape(mediaType) + "/schema"), config);
        return schema.validate(body, InputFormat.JSON).stream()
                .map(ValidationMessage::toString)
                .toList();
    }

    private static String escape(String token) {
        return token.replace("~", "~0").replace("/", "~1");
    }
}
