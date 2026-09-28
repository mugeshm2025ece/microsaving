package com.sece.microsave.service;

import com.sece.microsave.entity.Group;
import com.sece.microsave.entity.Member;
import com.sece.microsave.exception.GroupNotFoundException;
import com.sece.microsave.exception.InvalidRequestException;
import com.sece.microsave.exception.MemberNotFoundException;
import com.sece.microsave.repository.GroupRepository;
import com.sece.microsave.repository.MemberRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService {

	private final MemberRepository memberRepository;
	private final GroupRepository groupRepository;

	public MemberService(MemberRepository memberRepository, GroupRepository groupRepository) {
		this.memberRepository = memberRepository;
		this.groupRepository = groupRepository;
	}

	@Transactional
	public Member addMember(Long groupId, String memberName) {
		if (memberName == null || memberName.isBlank()) {
			throw new InvalidRequestException("Member name is required.");
		}
		Group group = groupRepository.findById(groupId)
				.orElseThrow(() -> new GroupNotFoundException("Group not found."));
		return memberRepository.save(new Member(memberName, group));
	}

	@Transactional(readOnly = true)
	public Member getMemberById(Long memberId) {
		return memberRepository.findById(memberId)
				.orElseThrow(() -> new MemberNotFoundException("Member not found."));
	}

	@Transactional(readOnly = true)
	public List<Member> getMembersByGroup(Long groupId) {
		Group group = groupRepository.findById(groupId)
				.orElseThrow(() -> new GroupNotFoundException("Group not found."));
		return memberRepository.findByGroup(group);
	}
}