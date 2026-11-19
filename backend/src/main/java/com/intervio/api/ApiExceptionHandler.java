package com.intervio.api;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/** Turns every expected failure into {"code": "ERROR_..."}, for all controllers. */
@RestControllerAdvice
class ApiExceptionHandler {

	@ExceptionHandler(ApiException.class)
	ResponseEntity<Map<String, String>> onApiError(ApiException e) {
		return ResponseEntity.status(e.status()).body(Map.of("code", e.code()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<Map<String, String>> onInvalid(MethodArgumentNotValidException e) {
		return ResponseEntity.badRequest().body(Map.of("code", "ERROR_VALIDATION"));
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	ResponseEntity<Map<String, String>> onTooLarge(MaxUploadSizeExceededException e) {
		return ResponseEntity.status(413).body(Map.of("code", "ERROR_FILE_TOO_LARGE"));
	}

}
