package com.acme.salary.employee;

import java.util.List;

public record EmployeeResponse(long id, String employeeCode, String firstName, String lastName, String email,
                               String department, String jobTitle, String countryCode, String currencyCode,
                               String annualGrossBaseSalary, Employee.Status status, long version) {
    public record EmployeePage(List<EmployeeResponse> content, int page, int size,
                               long totalElements, int totalPages) {}
}
