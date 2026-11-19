package com.intervio.auth;

import java.time.Duration;

/** The links sent by email, each a Spring Security one-time token. */
public enum EmailLink {

	CONFIRM(Duration.ofHours(24)), SIGN_IN(Duration.ofMinutes(15)), RESET(Duration.ofHours(1)),

	/** Sent to the new address when the email changes (decision 88). */
	CHANGE_EMAIL(Duration.ofHours(24));

	final Duration validity;

	EmailLink(Duration validity) {
		this.validity = validity;
	}

}
