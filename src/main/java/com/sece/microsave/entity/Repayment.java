package com.sece.microsave.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "repayments")
public class Repayment {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private BigDecimal amount;

	private LocalDate repaymentDate;

	@ManyToOne
	@JoinColumn(name = "loan_id")
	private Loan loan;

	public Repayment() {
	}

	public Repayment(BigDecimal amount, LocalDate repaymentDate, Loan loan) {
		this.amount = amount;
		this.repaymentDate = repaymentDate;
		this.loan = loan;
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public BigDecimal getAmount() {
		return amount;
	}

	public void setAmount(BigDecimal amount) {
		this.amount = amount;
	}

	public LocalDate getRepaymentDate() {
		return repaymentDate;
	}

	public void setRepaymentDate(LocalDate repaymentDate) {
		this.repaymentDate = repaymentDate;
	}

	public Loan getLoan() {
		return loan;
	}

	public void setLoan(Loan loan) {
		this.loan = loan;
	}
}