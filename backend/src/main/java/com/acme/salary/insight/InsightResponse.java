package com.acme.salary.insight;

import java.util.List;

public record InsightResponse(String department, String currencyCode, long employeeCount,
                              String average, String minimum, String maximum, String total) {
    public record Summary(long activeEmployeeCount, List<InsightResponse> byCurrency) {}

    public record TopEarner(long id, String employeeCode, String firstName, String lastName,
                            String department, String currencyCode, String annualGrossBaseSalary) {}
}
