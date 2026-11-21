package com.acme.salary.services;

import com.acme.salary.common.ApiException;
import com.acme.salary.dto.EmployeeFilter;
import com.acme.salary.dto.EmployeeRequest;
import com.acme.salary.dto.EmployeeResponse;
import com.acme.salary.entity.Employee;
import com.acme.salary.interfaces.EmployeeService;
import com.acme.salary.repository.EmployeeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class EmployeeServiceTest {
    private final EmployeeRepository repository = mock(EmployeeRepository.class);
    private final EmployeeService service = new DefaultEmployeeService(repository);

    @Test
    void normalizesNewEmployeeAndPreservesSalaryCents() {
        when(repository.saveAndFlush(any(Employee.class))).thenAnswer(call -> {
            Employee employee = call.getArgument(0);
            ReflectionTestUtils.setField(employee, "id", 1L);
            return employee;
        });

        EmployeeResponse result = service.create(request("9999999999999999.99", "EUR", null));

        assertThat(result.employeeCode()).isEqualTo("T-01");
        assertThat(result.email()).isEqualTo("test@example.invalid");
        assertThat(result.annualGrossBaseSalary()).isEqualTo("9999999999999999.99");
        assertThat(result.status()).isEqualTo(Employee.Status.ACTIVE);
    }

    @Test
    void rejectsInvalidSalaryAndCurrencyBeforeSaving() {
        for (String amount : new String[]{"0", "-1", "10.001", "10000000000000000.00"}) {
            assertThatThrownBy(() -> service.create(request(amount, "EUR", null)))
                    .isInstanceOf(ApiException.Invalid.class);
        }
        assertThatThrownBy(() -> service.create(request("10.00", "USD", null)))
                .isInstanceOf(ApiException.Invalid.class);
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsStaleEditAndDeactivation() {
        Employee employee = new Employee();
        ReflectionTestUtils.setField(employee, "version", 2L);
        when(repository.findById(1L)).thenReturn(Optional.of(employee));

        assertThatThrownBy(() -> service.update(1, request("25.00", "EUR", 1L)))
                .isInstanceOf(ApiException.Conflict.class);
        assertThatThrownBy(() -> service.deactivate(1, 1L)).isInstanceOf(ApiException.Conflict.class);
        assertThat(employee.getStatus()).isEqualTo(Employee.Status.ACTIVE);
    }

    @Test
    void validatesSalaryRangeBeforeQuerying() {
        var noCurrency = new EmployeeFilter(null, null, null, null, null, "10", null);
        var reversed = new EmployeeFilter(null, null, null, null, "EUR", "25", "10");

        assertThatThrownBy(() -> service.list(noCurrency, 0, 20)).isInstanceOf(ApiException.Invalid.class);
        assertThatThrownBy(() -> service.list(reversed, 0, 20)).isInstanceOf(ApiException.Invalid.class);
        verifyNoInteractions(repository);
    }

    private EmployeeRequest request(String salary, String currency, Long version) {
        return new EmployeeRequest(" t-01 ", " Alex ", " Test ", " TEST@EXAMPLE.INVALID ",
                "Engineering", "Analyst", "FR", currency, salary, version);
    }
}
