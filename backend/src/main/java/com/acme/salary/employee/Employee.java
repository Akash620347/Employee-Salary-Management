package com.acme.salary.employee;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "employees")
public class Employee {
    public enum Status { ACTIVE, INACTIVE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String employeeCode;
    private String firstName;
    private String lastName;
    private String email;
    private String department;
    private String jobTitle;
    private String countryCode;
    private String currencyCode;
    private BigDecimal annualGrossBaseSalary;
    @Enumerated(EnumType.STRING)
    private Status status = Status.ACTIVE;
    @Version
    private long version;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = createdAt;

    protected Employee() {}

    void apply(EmployeeRequest request, String country, String currency, BigDecimal salary) {
        employeeCode = request.employeeCode();
        firstName = request.firstName();
        lastName = request.lastName();
        email = request.email();
        department = request.department();
        jobTitle = request.jobTitle();
        countryCode = country;
        currencyCode = currency;
        annualGrossBaseSalary = salary;
        updatedAt = Instant.now();
    }

    void deactivate() {
        status = Status.INACTIVE;
        updatedAt = Instant.now();
    }

    Status status() {
        return status;
    }

    long version() {
        return version;
    }

    public EmployeeResponse toResponse() {
        return new EmployeeResponse(id, employeeCode, firstName, lastName, email, department, jobTitle,
                countryCode, currencyCode, annualGrossBaseSalary.toPlainString(), status, version);
    }
}
