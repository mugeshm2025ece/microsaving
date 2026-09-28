package com.sece.microsave.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "members")
public class Member {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String memberName;

	@ManyToOne
	@JoinColumn(name = "group_id")
	private Group group;

	@OneToMany(mappedBy = "member")
	private List<Contribution> contributions = new ArrayList<>();

	@OneToMany(mappedBy = "member")
	private List<Loan> loans = new ArrayList<>();

	public Member() {
	}

	public Member(String memberName, Group group) {
		this.memberName = memberName;
		this.group = group;
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getMemberName() {
		return memberName;
	}

	public void setMemberName(String memberName) {
		this.memberName = memberName;
	}

	public Group getGroup() {
		return group;
	}

	public void setGroup(Group group) {
		this.group = group;
	}

	public List<Contribution> getContributions() {
		return contributions;
	}

	public void setContributions(List<Contribution> contributions) {
		this.contributions = contributions;
	}

	public List<Loan> getLoans() {
		return loans;
	}

	public void setLoans(List<Loan> loans) {
		this.loans = loans;
	}
}