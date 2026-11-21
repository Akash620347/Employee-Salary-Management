package com.acme.salary.interfaces;

import com.acme.salary.dto.EmployeeFilter;
import com.acme.salary.dto.EmployeeRequest;
import com.acme.salary.dto.EmployeeResponse;
import com.acme.salary.dto.EmployeeResponse.EmployeePage;

public interface EmployeeService {
    EmployeePage list(EmployeeFilter filter, int page, int size);
    EmployeeResponse find(long id);
    EmployeeResponse create(EmployeeRequest request);
    EmployeeResponse update(long id, EmployeeRequest request);
    EmployeeResponse deactivate(long id, Long version);
}
