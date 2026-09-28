package com.sece.microsave.repository;

import com.sece.microsave.entity.Loan;
import com.sece.microsave.entity.Repayment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepaymentRepository extends JpaRepository<Repayment, Long> {
	List<Repayment> findByLoan(Loan loan);
}