package com.acme.salary.dto;

import com.acme.salary.entity.Employee;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

public record EmployeeFilter(String name, String department, String country, Employee.Status status,
                             String currency, String minSalary, String maxSalary,
                             String employeeCode, String email, String jobTitle) {
    public record Search(@NotNull EmployeeFilter filters,
                         @NotNull Map<String, @NotEmpty List<@NotBlank String>> selections) {}
}
