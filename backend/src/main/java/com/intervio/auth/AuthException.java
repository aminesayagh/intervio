package com.intervio.auth;

import org.springframework.http.HttpStatus;

/** An expected auth failure, sent to the frontend as {"code": "ERROR_..."}; the frontend shows the message. */
class AuthException extends RuntimeException {

	final HttpStatus status;

	final String code;

	AuthException(HttpStatus status, String code) {
		super(code);
		this.status = status;
		this.code = code;
	}

}
