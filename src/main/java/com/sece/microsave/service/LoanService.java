package com.sece.microsave.service;

import com.sece.microsave.entity.Loan;
import com.sece.microsave.entity.Member;
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
			throw new IllegalArgumentException("Loan amount must be greater than zero.");
		}
		if (loanDate == null) {
			throw new IllegalArgumentException("Loan date is required.");
		}

		Member member = memberRepository.findById(memberId)
				.orElseThrow(() -> new IllegalArgumentException("Member not found."));
		for (Loan existingLoan : loanRepository.findByMember(member)) {
			if (repaymentService.getOutstandingAmount(existingLoan.getId()).compareTo(BigDecimal.ZERO) > 0) {
				throw new IllegalStateException("Member already has an outstanding loan.");
			}
		}

		BigDecimal availablePool = groupService.getAvailablePool(member.getGroup().getId());
		if (amount.compareTo(availablePool) > 0) {
			throw new IllegalStateException("Group does not have enough available money.");
		}

		Loan loan = new Loan(amount, loanDate, "OUTSTANDING", member, member.getGroup());
		return loanRepository.save(loan);
	}

	@Transactional(readOnly = true)
	public Loan getLoanById(Long loanId) {
		return loanRepository.findById(loanId)
				.orElseThrow(() -> new IllegalArgumentException("Loan not found."));
	}

	@Transactional(readOnly = true)
	public List<Loan> getLoansByMember(Long memberId) {
		Member member = memberRepository.findById(memberId)
				.orElseThrow(() -> new IllegalArgumentException("Member not found."));
		return loanRepository.findByMember(member);
	}

	@Transactional(readOnly = true)
	public BigDecimal getOutstandingAmount(Long loanId) {
		return repaymentService.getOutstandingAmount(loanId);
	}
}