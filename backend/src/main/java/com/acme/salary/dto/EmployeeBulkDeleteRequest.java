package com.acme.salary.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;

public record EmployeeBulkDeleteRequest(@NotEmpty List<@NotNull @Valid Target> employees) {
    public record Target(@NotNull @Positive Long id, @NotNull @PositiveOrZero Long version) {}
}
