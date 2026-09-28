package com.sece.microsave.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LoanResponse(Long id, BigDecimal amount, LocalDate loanDate, String loanStatus,
		Long memberId, Long groupId) {
}