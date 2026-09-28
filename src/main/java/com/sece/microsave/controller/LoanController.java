package com.sece.microsave.controller;

import com.sece.microsave.entity.Loan;
import com.sece.microsave.dto.LoanRequest;
import com.sece.microsave.dto.LoanResponse;
import com.sece.microsave.service.GroupService;
import com.sece.microsave.service.LoanService;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class LoanController {

	private final LoanService loanService;
	private final GroupService groupService;

	public LoanController(LoanService loanService, GroupService groupService) {
		this.loanService = loanService;
		this.groupService = groupService;
	}

	@PostMapping("/members/{memberId}/loans")
	public ResponseEntity<LoanResponse> createLoan(@PathVariable Long memberId,
			@Valid @RequestBody LoanRequest request) {
		Loan loan = loanService.createLoan(memberId, request.amount(), request.loanDate());
		return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(loan));
	}

	@GetMapping("/groups/{groupId}/loans")
	public List<LoanResponse> getGroupLoans(@PathVariable Long groupId) {
		return groupService.getLoansByGroup(groupId).stream().map(this::toResponse).toList();
	}

	@GetMapping("/members/{memberId}/loans")
	public List<LoanResponse> getMemberLoans(@PathVariable Long memberId) {
		return loanService.getLoansByMember(memberId).stream().map(this::toResponse).toList();
	}

	@GetMapping("/loans/{loanId}")
	public LoanResponse getLoanById(@PathVariable Long loanId) {
		return toResponse(loanService.getLoanById(loanId));
	}

	private LoanResponse toResponse(Loan loan) {
		return new LoanResponse(loan.getId(), loan.getAmount(), loan.getLoanDate(), loan.getLoanStatus(),
				loan.getMember().getId(), loan.getGroup().getId());
	}

}