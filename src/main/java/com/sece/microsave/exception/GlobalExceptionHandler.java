package com.sece.microsave.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler({GroupNotFoundException.class, MemberNotFoundException.class,
			LoanNotFoundException.class, RepaymentNotFoundException.class,
			ContributionNotFoundException.class})
	public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException exception, HttpServletRequest request) {
		return createErrorResponse(HttpStatus.NOT_FOUND, exception.getMessage(), request);
	}

	@ExceptionHandler({InsufficientGroupBalanceException.class, OutstandingLoanException.class,
			InvalidRepaymentException.class})
	public ResponseEntity<ErrorResponse> handleBusinessRule(RuntimeException exception,
			HttpServletRequest request) {
		return createErrorResponse(HttpStatus.CONFLICT, exception.getMessage(), request);
	}

	@ExceptionHandler(InvalidRequestException.class)
	public ResponseEntity<ErrorResponse> handleInvalidRequest(InvalidRequestException exception,
			HttpServletRequest request) {
		return createErrorResponse(HttpStatus.BAD_REQUEST, exception.getMessage(), request);
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception,
			HttpServletRequest request) {
		String message = exception.getBindingResult().getFieldErrors().stream()
				.map(this::formatFieldError)
				.collect(Collectors.joining("; "));
		return createErrorResponse(HttpStatus.BAD_REQUEST, message, request);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponse> handleUnreadableRequest(HttpMessageNotReadableException exception,
			HttpServletRequest request) {
		return createErrorResponse(HttpStatus.BAD_REQUEST, "Request body is invalid or incomplete.", request);
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception, HttpServletRequest request) {
		return createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR,
				"An unexpected error occurred.", request);
	}

	private String formatFieldError(FieldError error) {
		return error.getField() + ": " + error.getDefaultMessage();
	}

	private ResponseEntity<ErrorResponse> createErrorResponse(HttpStatus status, String message,
			HttpServletRequest request) {
		ErrorResponse response = new ErrorResponse(LocalDateTime.now(), status.value(), message,
				request.getRequestURI());
		return ResponseEntity.status(status).body(response);
	}
}