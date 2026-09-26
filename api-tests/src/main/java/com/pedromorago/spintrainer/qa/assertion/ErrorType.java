package com.pedromorago.spintrainer.qa.assertion;

/**
 * Tipos de error del contrato (RFC 9457, {@code urn:spin-trainer:<tipo>}) con su estado, título y la plantilla del
 * {@code detail} cuando la API lo fija. Los tests comparan contra estas plantillas, no contra textos sueltos.
 */
public enum ErrorType {
    VALIDATION("validation", 400, "Validation failed", null),
    UNAUTHORIZED("unauthorized", 401, "Unauthorized", null),
    NOT_FOUND("not-found", 404, "Not found", "Situación/stack desconocido: %s@%s"),
    CONFLICT("conflict", 409, "Conflict", "El rango está en la versión %d; recarga"),
    CONFLICT_DELETED("conflict", 409, "Conflict", "El rango personalizado ya no existe; recarga"),
    NO_RANGE("no-range", 422, "No range", "Sin rango para %s@%s: no se puede corregir"),
    UNAVAILABLE("unavailable", 503, "Service unavailable", null);

    private final String type;
    private final int status;
    private final String title;
    private final String detailTemplate;

    ErrorType(String slug, int status, String title, String detailTemplate) {
        this.type = "urn:spin-trainer:" + slug;
        this.status = status;
        this.title = title;
        this.detailTemplate = detailTemplate;
    }

    public String type() {
        return type;
    }

    public int status() {
        return status;
    }

    public String title() {
        return title;
    }

    /** El {@code detail} esperado con los valores del caso. */
    public String detail(Object... values) {
        if (detailTemplate == null) {
            throw new IllegalStateException(name() + " no tiene un detail fijo");
        }
        return detailTemplate.formatted(values);
    }
}
