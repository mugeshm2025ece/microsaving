package com.sece.microsave.exception;

public class OutstandingLoanException extends RuntimeException {
	public OutstandingLoanException(String message) {
		super(message);
	}
}