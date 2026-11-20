package com.acme.salary.employee;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.Locale;

public record EmployeeRequest(
        @NotBlank @Size(max = 20) String employeeCode,
        @NotBlank @Size(max = 80) String firstName,
        @NotBlank @Size(max = 80) String lastName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 100) String department,
        @NotBlank @Size(max = 100) String jobTitle,
        @NotBlank String countryCode,
        @NotBlank String currencyCode,
        @NotBlank String annualGrossBaseSalary,
        @PositiveOrZero Long version) {

    public EmployeeRequest {
        employeeCode = trim(employeeCode).toUpperCase(Locale.ROOT);
        firstName = trim(firstName);
        lastName = trim(lastName);
        email = trim(email).toLowerCase(Locale.ROOT);
        department = trim(department);
        jobTitle = trim(jobTitle);
        countryCode = trim(countryCode);
        currencyCode = trim(currencyCode);
        annualGrossBaseSalary = trim(annualGrossBaseSalary);
    }

    private static String trim(String value) {
        return value == null ? "" : value.strip();
    }
}
