package com.acme.salary.repository;

import com.acme.salary.common.ApiException;
import com.acme.salary.common.SalaryRules;
import com.acme.salary.dto.EmployeeFilter;
import com.acme.salary.entity.Employee;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class EmployeeSpecifications {
    private EmployeeSpecifications() {}

    public static Specification<Employee> matching(EmployeeFilter filter, Map<String, List<String>> selections) {
        String search = trim(filter.name());
        String departmentName = trim(filter.department()).toLowerCase(Locale.ROOT);
        String countryCode = trim(filter.country()).isEmpty() ? "" : SalaryRules.country(filter.country(), "country");
        String currencyCode = trim(filter.currency()).isEmpty() ? "" : SalaryRules.currency(filter.currency(), "currency");
        BigDecimal minimum = bound(filter.minSalary(), "minSalary");
        BigDecimal maximum = bound(filter.maxSalary(), "maxSalary");
        if ((minimum != null || maximum != null) && currencyCode.isEmpty()) {
            throw new ApiException.Invalid("currency", "Choose a currency for the salary range.");
        }
        if (minimum != null && maximum != null && minimum.compareTo(maximum) > 0) {
            throw new ApiException.Invalid("maxSalary", "Maximum salary must be at least the minimum.");
        }

        return (employee, query, builder) -> {
            List<Predicate> conditions = new ArrayList<>();
            if (!search.isEmpty()) {
                conditions.add(contains(builder, columnValue(employee, builder, "fullName"), search));
            }
            if (!trim(filter.employeeCode()).isEmpty()) {
                conditions.add(contains(builder, employee.get("employeeCode"), trim(filter.employeeCode())));
            }
            if (!trim(filter.email()).isEmpty()) conditions.add(contains(builder, employee.get("email"), trim(filter.email())));
            if (!trim(filter.jobTitle()).isEmpty()) conditions.add(contains(builder, employee.get("jobTitle"), trim(filter.jobTitle())));
            if (!departmentName.isEmpty()) {
                conditions.add(builder.equal(builder.lower(employee.get("department")), departmentName));
            }
            if (!countryCode.isEmpty()) conditions.add(builder.equal(employee.get("countryCode"), countryCode));
            if (filter.status() != null) conditions.add(builder.equal(employee.get("status"), filter.status()));
            if (!currencyCode.isEmpty()) conditions.add(builder.equal(employee.get("currencyCode"), currencyCode));
            if (minimum != null) conditions.add(builder.ge(employee.get("annualGrossBaseSalary"), minimum));
            if (maximum != null) conditions.add(builder.le(employee.get("annualGrossBaseSalary"), maximum));
            selections.forEach((column, values) -> conditions.add(columnValue(employee, builder, column).in(values)));
            return builder.and(conditions.toArray(Predicate[]::new));
        };
    }

    public static Expression<String> columnValue(Root<Employee> employee, CriteriaBuilder builder, String column) {
        return switch (column) {
            case "fullName" -> builder.concat(builder.concat(employee.get("firstName"), builder.literal(" ")),
                    employee.get("lastName"));
            case "employeeCode", "email", "department", "jobTitle" -> employee.get(column);
            default -> throw new ApiException.Invalid("fieldName", "Choose a column with employee filter options.");
        };
    }

    private static Predicate contains(CriteriaBuilder builder, Expression<String> field, String search) {
        String literal = search.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_");
        return builder.like(builder.lower(field), "%" + literal + "%", '!');
    }

    private static String trim(String value) {
        return value == null ? "" : value.strip();
    }

    private static BigDecimal bound(String value, String field) {
        return trim(value).isEmpty() ? null : SalaryRules.amount(value, field);
    }
}
