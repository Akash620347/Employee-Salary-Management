package com.acme.salary.repository;

import com.acme.salary.entity.Employee;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.math.BigDecimal;
import java.util.List;

public interface InsightRepository extends Repository<Employee, Long> {
    interface SalaryGroup {
        String getDepartment();
        String getCurrencyCode();
        long getEmployeeCount();
        BigDecimal getAverage();
        BigDecimal getMinimum();
        BigDecimal getMaximum();
        BigDecimal getTotal();
    }

    String SALARY_GROUP = """
            currency_code AS "currencyCode", count(*) AS "employeeCount",
            round(avg(annual_gross_base_salary), 2) AS average,
            min(annual_gross_base_salary) AS minimum, max(annual_gross_base_salary) AS maximum,
            sum(annual_gross_base_salary) AS total
            FROM employees WHERE status = 'ACTIVE'
            """;

    @Query(value = "SELECT NULL AS department, " + SALARY_GROUP + " GROUP BY currency_code ORDER BY currency_code",
            nativeQuery = true)
    List<SalaryGroup> aggregateByCurrency();

    @Query(value = "SELECT min(department) AS department, " + SALARY_GROUP
            + " GROUP BY lower(department), currency_code ORDER BY lower(department), currency_code", nativeQuery = true)
    List<SalaryGroup> aggregateByDepartment();

    @Query("""
            SELECT employee FROM Employee employee
            WHERE employee.status = com.acme.salary.entity.Employee.Status.ACTIVE
              AND employee.currencyCode = :currency
            ORDER BY employee.annualGrossBaseSalary DESC, employee.employeeCode ASC, employee.id ASC
            """)
    List<Employee> topEarners(String currency, Pageable limit);
}
