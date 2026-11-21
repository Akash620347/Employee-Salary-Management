package com.acme.salary.dto;

import com.acme.salary.entity.Employee;

public record EmployeeFilter(String name, String department, String country, Employee.Status status,
                             String currency, String minSalary, String maxSalary) {}
