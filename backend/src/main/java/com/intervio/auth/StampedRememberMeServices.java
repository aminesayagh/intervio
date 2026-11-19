package com.intervio.auth;

import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;

/**
 * "Remember me" cookies whose signature also covers the user's {@code sessions_valid_after}, so
 * "Log out of other devices" (decision 89) makes every earlier cookie invalid.
 */
class StampedRememberMeServices extends TokenBasedRememberMeServices {

	static final String COOKIE = "remember-me";

	private final UserRepository users;

	StampedRememberMeServices(String key, AuthService auth, UserRepository users) {
		super(key, auth);
		this.users = users;
		setParameter("rememberMe");
		setCookieName(COOKIE);
		setTokenValiditySeconds(SecurityConfig.REMEMBER_ME_SECONDS);
	}

	@Override
	protected String makeTokenSignature(long expiry, String username, String password,
			RememberMeTokenAlgorithm algorithm) {
		String stamp = users.findByEmail(username)
			.map(User::getSessionsValidAfter)
			.map(instant -> String.valueOf(instant.toEpochMilli()))
			.orElse("");
		return super.makeTokenSignature(expiry, username, password + ":" + stamp, algorithm);
	}

}
