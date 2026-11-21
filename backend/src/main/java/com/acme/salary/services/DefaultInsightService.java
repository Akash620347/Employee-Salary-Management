package com.acme.salary.services;

import com.acme.salary.common.ApiException;
import com.acme.salary.common.SalaryRules;
import com.acme.salary.dto.InsightResponse;
import com.acme.salary.dto.InsightResponse.Summary;
import com.acme.salary.dto.InsightResponse.TopEarner;
import com.acme.salary.interfaces.InsightService;
import com.acme.salary.repository.InsightRepository;
import com.acme.salary.repository.InsightRepository.SalaryGroup;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
class DefaultInsightService implements InsightService {
    private final InsightRepository insights;

    DefaultInsightService(InsightRepository insights) {
        this.insights = insights;
    }

    @Override
    public Summary summary() {
        List<InsightResponse> groups = insights.aggregateByCurrency().stream().map(this::response).toList();
        long employeeCount = groups.stream().mapToLong(InsightResponse::employeeCount).sum();
        return new Summary(employeeCount, groups);
    }

    @Override
    public List<InsightResponse> departments() {
        return insights.aggregateByDepartment().stream().map(this::response).toList();
    }

    @Override
    public List<TopEarner> topEarners(String currency, int limit) {
        String currencyCode = SalaryRules.currency(currency, "currency");
        if (limit < 1 || limit > 100) {
            throw new ApiException.Invalid("limit", "Limit must be between 1 and 100.");
        }
        return insights.topEarners(currencyCode, PageRequest.of(0, limit)).stream()
                .map(employee -> new TopEarner(employee.getId(), employee.getEmployeeCode(), employee.getFirstName(),
                        employee.getLastName(), employee.getDepartment(), employee.getCurrencyCode(),
                        employee.getAnnualGrossBaseSalary().toPlainString()))
                .toList();
    }

    private InsightResponse response(SalaryGroup group) {
        return new InsightResponse(group.getDepartment(), group.getCurrencyCode(), group.getEmployeeCount(),
                group.getAverage().toPlainString(), group.getMinimum().toPlainString(),
                group.getMaximum().toPlainString(), group.getTotal().toPlainString());
    }
}
