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
@Table(name = "contributions")
public class Contribution {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private BigDecimal amount;

	private LocalDate contributionDate;

	@ManyToOne
	@JoinColumn(name = "member_id")
	private Member member;

	public Contribution() {
	}

	public Contribution(BigDecimal amount, LocalDate contributionDate, Member member) {
		this.amount = amount;
		this.contributionDate = contributionDate;
		this.member = member;
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

	public LocalDate getContributionDate() {
		return contributionDate;
	}

	public void setContributionDate(LocalDate contributionDate) {
		this.contributionDate = contributionDate;
	}

	public Member getMember() {
		return member;
	}

	public void setMember(Member member) {
		this.member = member;
	}
}