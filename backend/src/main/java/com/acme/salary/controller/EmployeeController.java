package com.acme.salary.controller;

import com.acme.salary.dto.DeactivationRequest;
import com.acme.salary.dto.EmployeeFilter;
import com.acme.salary.dto.EmployeeRequest;
import com.acme.salary.dto.EmployeeResponse;
import com.acme.salary.dto.EmployeeResponse.EmployeePage;
import com.acme.salary.interfaces.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/employees")
class EmployeeController {
    private final EmployeeService employees;

    EmployeeController(EmployeeService employees) {
        this.employees = employees;
    }

    @GetMapping
    EmployeePage list(@ModelAttribute EmployeeFilter filter, @RequestParam(defaultValue = "0") int page,
                      @RequestParam(defaultValue = "20") int size) {
        return employees.list(filter, page, size);
    }

    @GetMapping("/{id}")
    EmployeeResponse find(@PathVariable long id) {
        return employees.find(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    EmployeeResponse create(@Valid @RequestBody EmployeeRequest request) {
        return employees.create(request);
    }

    @PutMapping("/{id}")
    EmployeeResponse update(@PathVariable long id, @Valid @RequestBody EmployeeRequest request) {
        return employees.update(id, request);
    }

    @PatchMapping("/{id}/deactivate")
    EmployeeResponse deactivate(@PathVariable long id, @Valid @RequestBody DeactivationRequest request) {
        return employees.deactivate(id, request.version());
    }
}
