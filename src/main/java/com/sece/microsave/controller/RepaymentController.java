package com.sece.microsave.controller;

import com.sece.microsave.entity.Repayment;
import com.sece.microsave.service.RepaymentService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/loans/{loanId}/repayments")
public class RepaymentController {

	private final RepaymentService repaymentService;

	public RepaymentController(RepaymentService repaymentService) {
		this.repaymentService = repaymentService;
	}

	@PostMapping
	public ResponseEntity<RepaymentResponse> recordRepayment(@PathVariable Long loanId,
			@RequestBody RepaymentRequest request) {
		Repayment repayment = repaymentService.recordRepayment(loanId, request.amount(), request.repaymentDate());
		return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(repayment));
	}

	@GetMapping
	public List<RepaymentResponse> getRepayments(@PathVariable Long loanId) {
		return repaymentService.getRepaymentsByLoan(loanId).stream().map(this::toResponse).toList();
	}

	private RepaymentResponse toResponse(Repayment repayment) {
		return new RepaymentResponse(repayment.getId(), repayment.getAmount(), repayment.getRepaymentDate(),
				repayment.getLoan().getId());
	}

	public record RepaymentRequest(BigDecimal amount, LocalDate repaymentDate) {
	}

	public record RepaymentResponse(Long id, BigDecimal amount, LocalDate repaymentDate, Long loanId) {
	}
}