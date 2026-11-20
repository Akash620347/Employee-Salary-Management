package com.acme.salary.employee;

import com.acme.salary.common.ApiException;
import com.acme.salary.common.SalaryRules;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public record EmployeeFilter(String name, String department, String country, Employee.Status status,
                             String currency, String minSalary, String maxSalary) {

    Specification<Employee> specification() {
        String search = trim(name).toLowerCase(Locale.ROOT);
        String departmentName = trim(department).toLowerCase(Locale.ROOT);
        String countryCode = trim(country).isEmpty() ? "" : SalaryRules.country(country, "country");
        String currencyCode = trim(currency).isEmpty() ? "" : SalaryRules.currency(currency, "currency");
        BigDecimal minimum = bound(minSalary, "minSalary");
        BigDecimal maximum = bound(maxSalary, "maxSalary");
        if ((minimum != null || maximum != null) && currencyCode.isEmpty()) {
            throw new ApiException.Invalid("currency", "Choose a currency for the salary range.");
        }
        if (minimum != null && maximum != null && minimum.compareTo(maximum) > 0) {
            throw new ApiException.Invalid("maxSalary", "Maximum salary must be at least the minimum.");
        }

        return (employee, query, builder) -> {
            List<Predicate> conditions = new ArrayList<>();
            if (!search.isEmpty()) {
                String literal = search.replace("!", "!!").replace("%", "!%").replace("_", "!_");
                var fullName = builder.concat(builder.concat(employee.get("firstName"), " "), employee.get("lastName"));
                conditions.add(builder.like(builder.lower(fullName), "%" + literal + "%", '!'));
            }
            if (!departmentName.isEmpty()) {
                conditions.add(builder.equal(builder.lower(employee.get("department")), departmentName));
            }
            if (!countryCode.isEmpty()) conditions.add(builder.equal(employee.get("countryCode"), countryCode));
            if (status != null) conditions.add(builder.equal(employee.get("status"), status));
            if (!currencyCode.isEmpty()) conditions.add(builder.equal(employee.get("currencyCode"), currencyCode));
            if (minimum != null) conditions.add(builder.ge(employee.get("annualGrossBaseSalary"), minimum));
            if (maximum != null) conditions.add(builder.le(employee.get("annualGrossBaseSalary"), maximum));
            return builder.and(conditions.toArray(Predicate[]::new));
        };
    }

    private static String trim(String value) {
        return value == null ? "" : value.strip();
    }

    private static BigDecimal bound(String value, String field) {
        return trim(value).isEmpty() ? null : SalaryRules.amount(value, field);
    }
}
