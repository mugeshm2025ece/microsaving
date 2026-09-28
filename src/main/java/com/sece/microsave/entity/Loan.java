package com.sece.microsave.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "loans")
public class Loan {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private BigDecimal amount;

	private LocalDate loanDate;

	private String loanStatus;

	@ManyToOne
	@JoinColumn(name = "member_id")
	private Member member;

	@ManyToOne
	@JoinColumn(name = "group_id")
	private Group group;

	@OneToMany(mappedBy = "loan")
	private List<Repayment> repayments = new ArrayList<>();

	public Loan() {
	}

	public Loan(BigDecimal amount, LocalDate loanDate, String loanStatus, Member member, Group group) {
		this.amount = amount;
		this.loanDate = loanDate;
		this.loanStatus = loanStatus;
		this.member = member;
		this.group = group;
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

	public LocalDate getLoanDate() {
		return loanDate;
	}

	public void setLoanDate(LocalDate loanDate) {
		this.loanDate = loanDate;
	}

	public String getLoanStatus() {
		return loanStatus;
	}

	public void setLoanStatus(String loanStatus) {
		this.loanStatus = loanStatus;
	}

	public Member getMember() {
		return member;
	}

	public void setMember(Member member) {
		this.member = member;
	}

	public Group getGroup() {
		return group;
	}

	public void setGroup(Group group) {
		this.group = group;
	}

	public List<Repayment> getRepayments() {
		return repayments;
	}

	public void setRepayments(List<Repayment> repayments) {
		this.repayments = repayments;
	}
}