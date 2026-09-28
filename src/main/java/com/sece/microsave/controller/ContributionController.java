package com.sece.microsave.controller;

import com.sece.microsave.entity.Contribution;
import com.sece.microsave.dto.ContributionRequest;
import com.sece.microsave.dto.ContributionResponse;
import com.sece.microsave.service.ContributionService;
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
public class ContributionController {

	private final ContributionService contributionService;

	public ContributionController(ContributionService contributionService) {
		this.contributionService = contributionService;
	}

	@PostMapping("/members/{memberId}/contributions")
	public ResponseEntity<ContributionResponse> recordContribution(@PathVariable Long memberId,
			@Valid @RequestBody ContributionRequest request) {
		Contribution contribution = contributionService.recordContribution(memberId, request.amount(),
				request.contributionDate());
		return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(contribution));
	}

	@GetMapping("/members/{memberId}/contributions")
	public List<ContributionResponse> getMemberContributions(@PathVariable Long memberId) {
		return contributionService.getContributionsByMember(memberId).stream().map(this::toResponse).toList();
	}

	@GetMapping("/contributions/{contributionId}")
	public ContributionResponse getContributionById(@PathVariable Long contributionId) {
		return toResponse(contributionService.getContributionById(contributionId));
	}

	private ContributionResponse toResponse(Contribution contribution) {
		return new ContributionResponse(contribution.getId(), contribution.getAmount(),
				contribution.getContributionDate(), contribution.getMember().getId());
	}

}