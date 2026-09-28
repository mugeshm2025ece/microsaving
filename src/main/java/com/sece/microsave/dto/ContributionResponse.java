package com.sece.microsave.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContributionResponse(Long id, BigDecimal amount, LocalDate contributionDate, Long memberId) {
}