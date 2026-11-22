package com.acme.salary.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "employees")
@Data
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

    public Employee() {}

    public void updateDetails(String employeeCode, String firstName, String lastName, String email,
                              String department, String jobTitle, String countryCode, String currencyCode,
                              BigDecimal annualGrossBaseSalary) {
        this.employeeCode = employeeCode;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.department = department;
        this.jobTitle = jobTitle;
        this.countryCode = countryCode;
        this.currencyCode = currencyCode;
        this.annualGrossBaseSalary = annualGrossBaseSalary;
        updatedAt = Instant.now();
    }

    public void changeStatus(Status status) {
        this.status = status;
        updatedAt = Instant.now();
    }
}
