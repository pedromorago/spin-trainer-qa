package com.pedromorago.spintrainer.qa.assertion;

/**
 * Error types of the contract (RFC 9457, {@code urn:spin-trainer:<type>}) with their status, title and the
 * {@code detail} template when the API fixes it. Tests compare against these templates, not against loose strings.
 */
public enum ErrorType {
    VALIDATION("validation", 400, "Validation failed", null),
    UNAUTHORIZED("unauthorized", 401, "Unauthorized", null),
    NOT_FOUND("not-found", 404, "Not found", "Unknown situation/stack: %s@%s"),
    CONFLICT("conflict", 409, "Conflict", "The range is at version %d; reload"),
    CONFLICT_DELETED("conflict", 409, "Conflict", "The custom range no longer exists; reload"),
    NO_RANGE("no-range", 422, "No range", "No range for %s@%s: the answer cannot be graded"),
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

    /** The expected {@code detail} with the case's values. */
    public String detail(Object... values) {
        if (detailTemplate == null) {
            throw new IllegalStateException(name() + " no tiene un detail fijo");
        }
        return detailTemplate.formatted(values);
    }
}
