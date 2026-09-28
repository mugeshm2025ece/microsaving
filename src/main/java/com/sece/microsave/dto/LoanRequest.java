package com.sece.microsave.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

public record LoanRequest(
		@NotNull @Positive BigDecimal amount,
		@NotNull LocalDate loanDate) {
}