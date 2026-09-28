package com.sece.microsave.service;

import com.sece.microsave.entity.Loan;
import com.sece.microsave.entity.Repayment;
import com.sece.microsave.repository.LoanRepository;
import com.sece.microsave.repository.RepaymentRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RepaymentService {

	private final RepaymentRepository repaymentRepository;
	private final LoanRepository loanRepository;

	public RepaymentService(RepaymentRepository repaymentRepository, LoanRepository loanRepository) {
		this.repaymentRepository = repaymentRepository;
		this.loanRepository = loanRepository;
	}

	@Transactional
	public Repayment recordRepayment(Long loanId, BigDecimal amount, LocalDate repaymentDate) {
		if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new IllegalArgumentException("Repayment amount must be greater than zero.");
		}
		if (repaymentDate == null) {
			throw new IllegalArgumentException("Repayment date is required.");
		}

		Loan loan = loanRepository.findById(loanId)
				.orElseThrow(() -> new IllegalArgumentException("Loan not found."));
		BigDecimal outstandingAmount = calculateOutstandingAmount(loan);
		if (amount.compareTo(outstandingAmount) > 0) {
			throw new IllegalStateException("Repayment cannot be greater than the outstanding loan amount.");
		}

		Repayment repayment = repaymentRepository.save(new Repayment(amount, repaymentDate, loan));
		if (amount.compareTo(outstandingAmount) == 0) {
			loan.setLoanStatus("PAID");
			loanRepository.save(loan);
		}
		return repayment;
	}

	@Transactional(readOnly = true)
	public BigDecimal getOutstandingAmount(Long loanId) {
		Loan loan = loanRepository.findById(loanId)
				.orElseThrow(() -> new IllegalArgumentException("Loan not found."));
		return calculateOutstandingAmount(loan);
	}

	@Transactional(readOnly = true)
	public List<Repayment> getRepaymentsByLoan(Long loanId) {
		Loan loan = loanRepository.findById(loanId)
				.orElseThrow(() -> new IllegalArgumentException("Loan not found."));
		return repaymentRepository.findByLoan(loan);
	}

	private BigDecimal calculateOutstandingAmount(Loan loan) {
		BigDecimal repaidAmount = BigDecimal.ZERO;
		for (Repayment repayment : repaymentRepository.findByLoan(loan)) {
			repaidAmount = repaidAmount.add(repayment.getAmount());
		}
		BigDecimal outstandingAmount = loan.getAmount().subtract(repaidAmount);
		return outstandingAmount.max(BigDecimal.ZERO);
	}
}