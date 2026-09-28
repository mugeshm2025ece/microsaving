package com.sece.microsave.exception;

public class InsufficientGroupBalanceException extends RuntimeException {
	public InsufficientGroupBalanceException(String message) {
		super(message);
	}
}