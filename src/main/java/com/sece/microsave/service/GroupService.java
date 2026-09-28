package com.sece.microsave.service;

import com.sece.microsave.entity.Contribution;
import com.sece.microsave.entity.Group;
import com.sece.microsave.entity.Loan;
import com.sece.microsave.entity.Member;
import com.sece.microsave.repository.ContributionRepository;
import com.sece.microsave.repository.GroupRepository;
import com.sece.microsave.repository.LoanRepository;
import com.sece.microsave.repository.MemberRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupService {

	private final GroupRepository groupRepository;
	private final MemberRepository memberRepository;
	private final ContributionRepository contributionRepository;
	private final LoanRepository loanRepository;
	private final RepaymentService repaymentService;

	public GroupService(GroupRepository groupRepository, MemberRepository memberRepository,
			ContributionRepository contributionRepository, LoanRepository loanRepository,
			RepaymentService repaymentService) {
		this.groupRepository = groupRepository;
		this.memberRepository = memberRepository;
		this.contributionRepository = contributionRepository;
		this.loanRepository = loanRepository;
		this.repaymentService = repaymentService;
	}

	@Transactional
	public Group createGroup(String groupName) {
		if (groupName == null || groupName.isBlank()) {
			throw new IllegalArgumentException("Group name is required.");
		}
		return groupRepository.save(new Group(groupName));
	}

	@Transactional(readOnly = true)
	public Group getGroupById(Long groupId) {
		return groupRepository.findById(groupId)
				.orElseThrow(() -> new IllegalArgumentException("Group not found."));
	}

	@Transactional(readOnly = true)
	public List<Group> getAllGroups() {
		return groupRepository.findAll();
	}

	@Transactional(readOnly = true)
	public List<Member> getMembersByGroup(Long groupId) {
		Group group = getGroupById(groupId);
		return memberRepository.findByGroup(group);
	}

	@Transactional(readOnly = true)
	public List<Loan> getLoansByGroup(Long groupId) {
		List<Loan> groupLoans = new ArrayList<>();
		for (Member member : getMembersByGroup(groupId)) {
			groupLoans.addAll(loanRepository.findByMember(member));
		}
		return groupLoans;
	}

	@Transactional(readOnly = true)
	public BigDecimal getTotalSavings(Long groupId) {
		BigDecimal totalSavings = BigDecimal.ZERO;
		for (Member member : getMembersByGroup(groupId)) {
			for (Contribution contribution : contributionRepository.findByMember(member)) {
				totalSavings = totalSavings.add(contribution.getAmount());
			}
		}
		return totalSavings;
	}

	@Transactional(readOnly = true)
	public BigDecimal getAvailablePool(Long groupId) {
		BigDecimal availablePool = getTotalSavings(groupId);
		for (Loan loan : getLoansByGroup(groupId)) {
			availablePool = availablePool.subtract(repaymentService.getOutstandingAmount(loan.getId()));
		}
		return availablePool;
	}
}