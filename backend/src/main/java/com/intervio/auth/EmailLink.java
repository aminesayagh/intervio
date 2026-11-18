package com.intervio.auth;

import java.time.Duration;

/** The three links sent by email, each a Spring Security one-time token. */
public enum EmailLink {

	CONFIRM(Duration.ofHours(24)), SIGN_IN(Duration.ofMinutes(15)), RESET(Duration.ofHours(1));

	final Duration validity;

	EmailLink(Duration validity) {
		this.validity = validity;
	}

}
