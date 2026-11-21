package com.acme.salary.entity;

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

    public void deactivate() {
        status = Status.INACTIVE;
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getEmployeeCode() {
        return employeeCode;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public String getDepartment() {
        return department;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public BigDecimal getAnnualGrossBaseSalary() {
        return annualGrossBaseSalary;
    }

    public Status getStatus() {
        return status;
    }

    public long getVersion() {
        return version;
    }
}
