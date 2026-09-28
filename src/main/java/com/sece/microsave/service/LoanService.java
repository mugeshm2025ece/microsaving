package com.sece.microsave.service;

import com.sece.microsave.entity.Loan;
import com.sece.microsave.entity.Member;
import com.sece.microsave.exception.InsufficientGroupBalanceException;
import com.sece.microsave.exception.InvalidRequestException;
import com.sece.microsave.exception.LoanNotFoundException;
import com.sece.microsave.exception.MemberNotFoundException;
import com.sece.microsave.exception.OutstandingLoanException;
import com.sece.microsave.repository.LoanRepository;
import com.sece.microsave.repository.MemberRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoanService {

	private final LoanRepository loanRepository;
	private final MemberRepository memberRepository;
	private final GroupService groupService;
	private final RepaymentService repaymentService;

	public LoanService(LoanRepository loanRepository, MemberRepository memberRepository,
			GroupService groupService, RepaymentService repaymentService) {
		this.loanRepository = loanRepository;
		this.memberRepository = memberRepository;
		this.groupService = groupService;
		this.repaymentService = repaymentService;
	}

	@Transactional
	public Loan createLoan(Long memberId, BigDecimal amount, LocalDate loanDate) {
		if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new InvalidRequestException("Loan amount must be greater than zero.");
		}
		if (loanDate == null) {
			throw new InvalidRequestException("Loan date is required.");
		}

		Member member = memberRepository.findById(memberId)
				.orElseThrow(() -> new MemberNotFoundException("Member not found."));
		for (Loan existingLoan : loanRepository.findByMember(member)) {
			if (repaymentService.getOutstandingAmount(existingLoan.getId()).compareTo(BigDecimal.ZERO) > 0) {
				throw new OutstandingLoanException("Member already has an outstanding loan.");
			}
		}

		BigDecimal availablePool = groupService.getAvailablePool(member.getGroup().getId());
		if (amount.compareTo(availablePool) > 0) {
			throw new InsufficientGroupBalanceException("Group does not have enough available money.");
		}

		Loan loan = new Loan(amount, loanDate, "OUTSTANDING", member, member.getGroup());
		return loanRepository.save(loan);
	}

	@Transactional(readOnly = true)
	public Loan getLoanById(Long loanId) {
		return loanRepository.findById(loanId)
				.orElseThrow(() -> new LoanNotFoundException("Loan not found."));
	}

	@Transactional(readOnly = true)
	public List<Loan> getLoansByMember(Long memberId) {
		Member member = memberRepository.findById(memberId)
				.orElseThrow(() -> new MemberNotFoundException("Member not found."));
		return loanRepository.findByMember(member);
	}

	@Transactional(readOnly = true)
	public BigDecimal getOutstandingAmount(Long loanId) {
		return repaymentService.getOutstandingAmount(loanId);
	}
}