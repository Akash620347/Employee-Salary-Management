package com.acme.salary.dto;

import java.util.Map;

public record ApiError(String message, Map<String, String> fieldErrors) {
}
