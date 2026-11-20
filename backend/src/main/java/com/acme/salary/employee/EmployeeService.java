package com.acme.salary.employee;

import com.acme.salary.employee.EmployeeResponse.EmployeePage;

public interface EmployeeService {
    EmployeePage list(EmployeeFilter filter, int page, int size);
    EmployeeResponse find(long id);
    EmployeeResponse create(EmployeeRequest request);
    EmployeeResponse update(long id, EmployeeRequest request);
    EmployeeResponse deactivate(long id, Long version);
}
