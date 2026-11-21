package com.acme.salary.interfaces;

import com.acme.salary.dto.EmployeeBulkDeleteRequest.Target;
import com.acme.salary.dto.EmployeeFilter;
import com.acme.salary.dto.EmployeeRequest;
import com.acme.salary.dto.EmployeeResponse;
import com.acme.salary.dto.EmployeeResponse.EmployeePage;

import java.util.List;
import java.util.Map;

public interface EmployeeService {
    EmployeePage list(EmployeeFilter filter, Map<String, List<String>> selections, int page, int size);
    List<String> filterOptions(String fieldName);
    EmployeeResponse find(long id);
    EmployeeResponse create(EmployeeRequest request);
    EmployeeResponse update(long id, EmployeeRequest request);
    EmployeeResponse deactivate(long id, Long version);
    EmployeeResponse reactivate(long id, Long version);
    void delete(long id, Long version);
    void deleteSelected(List<Target> targets);
}
