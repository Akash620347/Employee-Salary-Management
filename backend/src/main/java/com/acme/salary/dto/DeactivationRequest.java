package com.acme.salary.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record DeactivationRequest(@NotNull @PositiveOrZero Long version) {}
