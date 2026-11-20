package com.acme.salary.common;

public final class ApiException {
    private ApiException() {}

    public static final class Invalid extends RuntimeException {
        public final String field;

        public Invalid(String field, String message) {
            super(message);
            this.field = field;
        }
    }

    public static final class Missing extends RuntimeException {
        public Missing(long id) {
            super("Employee " + id + " was not found.");
        }
    }

    public static final class Conflict extends RuntimeException {
        public Conflict(String message) {
            super(message);
        }
    }
}
