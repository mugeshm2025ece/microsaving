package com.sece.microsave.controller;

import com.sece.microsave.entity.Member;
import com.sece.microsave.service.MemberService;
import java.util.List;
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
public class MemberController {

	private final MemberService memberService;

	public MemberController(MemberService memberService) {
		this.memberService = memberService;
	}

	@PostMapping("/groups/{groupId}/members")
	public ResponseEntity<MemberResponse> addMember(@PathVariable Long groupId,
			@RequestBody MemberRequest request) {
		Member member = memberService.addMember(groupId, request.memberName());
		return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(member));
	}

	@GetMapping("/groups/{groupId}/members")
	public List<MemberResponse> getMembers(@PathVariable Long groupId) {
		return memberService.getMembersByGroup(groupId).stream().map(this::toResponse).toList();
	}

	@GetMapping("/members/{memberId}")
	public MemberResponse getMemberById(@PathVariable Long memberId) {
		return toResponse(memberService.getMemberById(memberId));
	}

	private MemberResponse toResponse(Member member) {
		return new MemberResponse(member.getId(), member.getMemberName(), member.getGroup().getId());
	}

	public record MemberRequest(String memberName) {
	}

	public record MemberResponse(Long id, String memberName, Long groupId) {
	}
}