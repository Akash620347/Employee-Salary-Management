package com.acme.salary.services;

import com.acme.salary.common.ApiException;
import com.acme.salary.common.SalaryRules;
import com.acme.salary.dto.EmployeeBulkDeleteRequest.Target;
import com.acme.salary.dto.EmployeeFilter;
import com.acme.salary.dto.EmployeeRequest;
import com.acme.salary.dto.EmployeeResponse;
import com.acme.salary.dto.EmployeeResponse.EmployeePage;
import com.acme.salary.entity.Employee;
import com.acme.salary.interfaces.EmployeeService;
import com.acme.salary.repository.EmployeeRepository;
import com.acme.salary.repository.EmployeeSpecifications;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
class DefaultEmployeeService implements EmployeeService {
    private final EmployeeRepository employees;
    private final EntityManager entityManager;

    DefaultEmployeeService(EmployeeRepository employees, EntityManager entityManager) {
        this.employees = employees;
        this.entityManager = entityManager;
    }

    @Override
    public EmployeePage list(EmployeeFilter filter, Map<String, List<String>> selections, int page, int size) {
        if (page < 0 || (long) page * size > Integer.MAX_VALUE) {
            throw new ApiException.Invalid("page", "Enter a valid page number.");
        }
        if (size < 1 || size > 100) {
            throw new ApiException.Invalid("size", "Page size must be between 1 and 100.");
        }
        var result = employees.findAll(EmployeeSpecifications.matching(filter, selections),
                PageRequest.of(page, size, Sort.by("employeeCode", "id")));
        return new EmployeePage(result.map(EmployeeResponse::from).getContent(), page, size,
                result.getTotalElements(), result.getTotalPages());
    }

    @Override
    public List<String> filterOptions(String fieldName) {
        var builder = entityManager.getCriteriaBuilder();
        var query = builder.createQuery(String.class);
        var value = EmployeeSpecifications.columnValue(query.from(Employee.class), builder, fieldName);
        return entityManager.createQuery(query.select(value).distinct(true).orderBy(builder.asc(value))).getResultList();
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
            throw new ApiException.Conflict("Reactivate this employee before editing their details.");
        }
        return save(employee, request);
    }

    @Override
    @Transactional
    public EmployeeResponse deactivate(long id, Long version) {
        return changeStatus(id, version, Employee.Status.INACTIVE);
    }

    @Override
    @Transactional
    public EmployeeResponse reactivate(long id, Long version) {
        return changeStatus(id, version, Employee.Status.ACTIVE);
    }

    @Override
    @Transactional
    public void delete(long id, Long version) {
        Employee employee = getEmployee(id);
        checkVersion(employee, version);
        employees.delete(employee);
        employees.flush();
    }

    @Override
    @Transactional
    public void deleteSelected(List<Target> targets) {
        Map<Long, Long> versions = new TreeMap<>();
        for (Target target : targets) {
            if (versions.putIfAbsent(target.id(), target.version()) != null) {
                throw new ApiException.Invalid("employees", "Select each employee only once.");
            }
        }
        Map<Long, Employee> records = employees.findAllById(versions.keySet()).stream()
                .collect(Collectors.toMap(Employee::getId, Function.identity()));
        List<Employee> selected = versions.entrySet().stream().map(entry -> {
            Employee employee = records.get(entry.getKey());
            if (employee == null) throw new ApiException.Missing(entry.getKey());
            checkVersion(employee, entry.getValue());
            return employee;
        }).toList();
        employees.deleteAll(selected);
        employees.flush();
    }

    private EmployeeResponse changeStatus(long id, Long version, Employee.Status status) {
        Employee employee = getEmployee(id);
        checkVersion(employee, version);
        if (employee.getStatus() != status) {
            employee.changeStatus(status);
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
