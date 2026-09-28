package com.sece.microsave.repository;

import com.sece.microsave.entity.Group;
import com.sece.microsave.entity.Member;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {
	List<Member> findByGroup(Group group);
}