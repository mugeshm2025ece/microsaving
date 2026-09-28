package com.sece.microsave.repository;

import com.sece.microsave.entity.Contribution;
import com.sece.microsave.entity.Member;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContributionRepository extends JpaRepository<Contribution, Long> {
	List<Contribution> findByMember(Member member);
}