package com.acme.salary.dto;

import com.acme.salary.entity.Employee;

import java.util.List;

public record EmployeeResponse(long id, String employeeCode, String firstName, String lastName, String email,
                               String department, String jobTitle, String countryCode, String currencyCode,
                               String annualGrossBaseSalary, Employee.Status status, long version) {
    public static EmployeeResponse from(Employee employee) {
        return new EmployeeResponse(employee.getId(), employee.getEmployeeCode(), employee.getFirstName(),
                employee.getLastName(), employee.getEmail(), employee.getDepartment(), employee.getJobTitle(),
                employee.getCountryCode(), employee.getCurrencyCode(), employee.getAnnualGrossBaseSalary().toPlainString(),
                employee.getStatus(), employee.getVersion());
    }

    public record EmployeePage(List<EmployeeResponse> content, int page, int size,
                               long totalElements, int totalPages) {}
}
