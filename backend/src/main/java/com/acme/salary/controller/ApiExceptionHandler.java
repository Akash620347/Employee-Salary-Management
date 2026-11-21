package com.acme.salary.controller;

import com.acme.salary.common.ApiException;
import com.acme.salary.dto.ApiError;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApiException.Invalid.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ApiError invalid(ApiException.Invalid error) {
        return new ApiError("Check the highlighted value.", Map.of(error.field, error.getMessage()));
    }

    @ExceptionHandler(BindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ApiError validation(BindException error) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        error.getFieldErrors().forEach(field -> fieldErrors.putIfAbsent(field.getField(),
                field.isBindingFailure() ? "Enter a valid value." : field.getDefaultMessage()));
        return new ApiError("Check the highlighted values.", fieldErrors);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ApiError invalidParameter(MethodArgumentTypeMismatchException error) {
        return new ApiError("Check the request parameters.", Map.of(error.getName(), "Enter a valid value."));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ApiError invalidBody() {
        return new ApiError("Send a valid JSON request.", Map.of());
    }

    @ExceptionHandler(ApiException.Missing.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ApiError missing(ApiException.Missing error) {
        return new ApiError(error.getMessage(), Map.of());
    }

    @ExceptionHandler(ApiException.Conflict.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    ApiError conflict(ApiException.Conflict error) {
        return new ApiError(error.getMessage(), Map.of());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    ApiError stale() {
        return new ApiError("This record changed. Reload it and review the latest values.", Map.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    ApiError duplicate(DataIntegrityViolationException error) {
        if (error.getCause() instanceof ConstraintViolationException violation) {
            if ("employee_code_unique".equals(violation.getConstraintName())) {
                return new ApiError("That employee code is already in use.", Map.of("employeeCode", "Enter a unique code."));
            }
            if ("employee_email_unique".equals(violation.getConstraintName())) {
                return new ApiError("That email is already in use.", Map.of("email", "Enter a unique email address."));
            }
        }
        throw error;
    }
}
