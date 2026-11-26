package com.intervio.core.account;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.RememberMeServices;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Settings, Security: "Delete account" (decision 90). The deletion itself is AccountDeletion's. */
@RestController
@RequestMapping("/api/account")
class AccountController {

	private final AccountDeletion deletion;

	private final LogoutHandler rememberMe;

	AccountController(AccountDeletion deletion, RememberMeServices rememberMe) {
		this.deletion = deletion;
		this.rememberMe = (LogoutHandler) rememberMe;
	}

	record DeleteRequest(@NotBlank String email) {
	}

	/** The user types their email to confirm; once deleted, they are logged out. */
	@DeleteMapping
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@Valid @RequestBody DeleteRequest r, Authentication authentication, HttpServletRequest request,
			HttpServletResponse response) {
		deletion.delete(authentication.getName(), r.email());
		rememberMe.logout(request, response, authentication);
		new SecurityContextLogoutHandler().logout(request, response, authentication);
	}

}
