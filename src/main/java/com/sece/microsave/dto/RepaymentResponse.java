package com.sece.microsave.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RepaymentResponse(Long id, BigDecimal amount, LocalDate repaymentDate, Long loanId) {
}