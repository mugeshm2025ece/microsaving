package com.sece.microsave.service;

import com.sece.microsave.entity.Contribution;
import com.sece.microsave.entity.Member;
import com.sece.microsave.repository.ContributionRepository;
import com.sece.microsave.repository.MemberRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContributionService {

	private final ContributionRepository contributionRepository;
	private final MemberRepository memberRepository;

	public ContributionService(ContributionRepository contributionRepository, MemberRepository memberRepository) {
		this.contributionRepository = contributionRepository;
		this.memberRepository = memberRepository;
	}

	@Transactional
	public Contribution recordContribution(Long memberId, BigDecimal amount, LocalDate contributionDate) {
		if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new IllegalArgumentException("Contribution amount must be greater than zero.");
		}
		if (contributionDate == null) {
			throw new IllegalArgumentException("Contribution date is required.");
		}
		Member member = memberRepository.findById(memberId)
				.orElseThrow(() -> new IllegalArgumentException("Member not found."));
		return contributionRepository.save(new Contribution(amount, contributionDate, member));
	}

	@Transactional(readOnly = true)
	public List<Contribution> getContributionsByMember(Long memberId) {
		Member member = memberRepository.findById(memberId)
				.orElseThrow(() -> new IllegalArgumentException("Member not found."));
		return contributionRepository.findByMember(member);
	}

	@Transactional(readOnly = true)
	public Contribution getContributionById(Long contributionId) {
		return contributionRepository.findById(contributionId)
				.orElseThrow(() -> new IllegalArgumentException("Contribution not found."));
	}
}