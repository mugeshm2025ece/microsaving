package com.sece.microsave.repository;

import com.sece.microsave.entity.Loan;
import com.sece.microsave.entity.Member;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanRepository extends JpaRepository<Loan, Long> {
	List<Loan> findByMember(Member member);

	List<Loan> findByLoanStatusIgnoreCase(String loanStatus);
}