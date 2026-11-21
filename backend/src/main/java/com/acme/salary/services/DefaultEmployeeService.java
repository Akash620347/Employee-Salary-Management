package com.acme.salary.services;

import com.acme.salary.common.ApiException;
import com.acme.salary.common.SalaryRules;
import com.acme.salary.dto.EmployeeFilter;
import com.acme.salary.dto.EmployeeRequest;
import com.acme.salary.dto.EmployeeResponse;
import com.acme.salary.dto.EmployeeResponse.EmployeePage;
import com.acme.salary.entity.Employee;
import com.acme.salary.interfaces.EmployeeService;
import com.acme.salary.repository.EmployeeRepository;
import com.acme.salary.repository.EmployeeSpecifications;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@Transactional(readOnly = true)
class DefaultEmployeeService implements EmployeeService {
    private final EmployeeRepository employees;

    DefaultEmployeeService(EmployeeRepository employees) {
        this.employees = employees;
    }

    @Override
    public EmployeePage list(EmployeeFilter filter, int page, int size) {
        if (page < 0 || (long) page * size > Integer.MAX_VALUE) {
            throw new ApiException.Invalid("page", "Enter a valid page number.");
        }
        if (size < 1 || size > 100) {
            throw new ApiException.Invalid("size", "Page size must be between 1 and 100.");
        }
        var result = employees.findAll(EmployeeSpecifications.matching(filter),
                PageRequest.of(page, size, Sort.by("employeeCode", "id")));
        return new EmployeePage(result.map(EmployeeResponse::from).getContent(), page, size,
                result.getTotalElements(), result.getTotalPages());
    }

    @Override
    public EmployeeResponse find(long id) {
        return EmployeeResponse.from(getEmployee(id));
    }

    @Override
    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        return save(new Employee(), request);
    }

    @Override
    @Transactional
    public EmployeeResponse update(long id, EmployeeRequest request) {
        Employee employee = getEmployee(id);
        checkVersion(employee, request.version());
        if (employee.getStatus() == Employee.Status.INACTIVE) {
            throw new ApiException.Conflict("Inactive employees can only be viewed.");
        }
        return save(employee, request);
    }

    @Override
    @Transactional
    public EmployeeResponse deactivate(long id, Long version) {
        Employee employee = getEmployee(id);
        checkVersion(employee, version);
        if (employee.getStatus() == Employee.Status.ACTIVE) {
            employee.deactivate();
            employees.flush();
        }
        return EmployeeResponse.from(employee);
    }

    private EmployeeResponse save(Employee employee, EmployeeRequest request) {
        String country = SalaryRules.country(request.countryCode(), "countryCode");
        String currency = SalaryRules.currency(request.currencyCode(), "currencyCode");
        if (!SalaryRules.localCurrency(country).equals(currency)) {
            throw new ApiException.Invalid("currencyCode", "Salary currency must match the country.");
        }
        BigDecimal salary = SalaryRules.amount(request.annualGrossBaseSalary(), "annualGrossBaseSalary");
        if (salary.signum() <= 0) {
            throw new ApiException.Invalid("annualGrossBaseSalary", "Annual salary must be greater than zero.");
        }
        employee.updateDetails(request.employeeCode(), request.firstName(), request.lastName(), request.email(),
                request.department(), request.jobTitle(), country, currency, salary);
        return EmployeeResponse.from(employees.saveAndFlush(employee));
    }

    private Employee getEmployee(long id) {
        return employees.findById(id).orElseThrow(() -> new ApiException.Missing(id));
    }

    private void checkVersion(Employee employee, Long version) {
        if (version == null || version < 0) {
            throw new ApiException.Invalid("version", "Reload the employee to get its current version.");
        }
        if (employee.getVersion() != version) {
            throw new ApiException.Conflict("This record changed. Reload it and review the latest values.");
        }
    }
}
