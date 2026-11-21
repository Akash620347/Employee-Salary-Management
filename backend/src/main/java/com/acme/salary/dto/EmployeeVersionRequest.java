package com.acme.salary.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record EmployeeVersionRequest(@NotNull @PositiveOrZero Long version) {}
