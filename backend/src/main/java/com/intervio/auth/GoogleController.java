package com.intervio.auth;

import java.net.URI;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Whether Google sign-in is on, and a way back when it isn't (MAS-38). */
@RestController
class GoogleController {

	private final ObjectProvider<ClientRegistrationRepository> google;

	private final AuthProperties props;

	GoogleController(ObjectProvider<ClientRegistrationRepository> google, AuthProperties props) {
		this.google = google;
		this.props = props;
	}

	record Providers(boolean google) {
	}

	/** The sign-in screens show "Continue with Google" only when it can work. */
	@GetMapping("/api/auth/providers")
	Providers providers() {
		return new Providers(google.getIfAvailable() != null);
	}

	/**
	 * Google's addresses that Spring Security doesn't handle (all of them when Google is off):
	 * back to the log-in page, which says Google sign-in failed, never a server error page.
	 */
	@RequestMapping({ "/oauth2/**", "/login/oauth2/**" })
	ResponseEntity<Void> back() {
		return ResponseEntity.status(HttpStatus.FOUND)
			.location(URI.create(props.frontendUrl() + "/login?error=google"))
			.build();
	}

}
