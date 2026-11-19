package com.intervio.auth;

import com.intervio.api.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Auth endpoints. Password log-in and log-out are handled by Spring Security (SecurityConfig). */
@RestController
@RequestMapping("/api/auth")
class AuthController {

	/** Session flag set by a reset link: only such a session may set a password without the old one. */
	static final String RESET_ALLOWED = "intervio.passwordResetAllowed";

	private final AuthService auth;

	private final SecurityContextRepository contexts = new HttpSessionSecurityContextRepository();

	AuthController(AuthService auth) {
		this.auth = auth;
	}

	record SignUpRequest(@NotBlank @Size(max = 200) String fullName, @NotBlank @Email @Size(max = 320) String email,
			@NotBlank @Size(min = 12, max = 200) String password, String locale) {
	}

	record LinkSignUpRequest(@NotBlank @Size(max = 200) String fullName,
			@NotBlank @Email @Size(max = 320) String email, String locale) {
	}

	record EmailRequest(@NotBlank @Email String email) {
	}

	record TokenRequest(@NotBlank String token) {
	}

	record PasswordRequest(@NotBlank @Size(min = 12, max = 200) String password) {
	}

	@PostMapping("/signup")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void signUp(@Valid @RequestBody SignUpRequest r) {
		auth.signUpWithPassword(r.fullName(), r.email(), r.password(), r.locale());
	}

	@PostMapping("/signup/link")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void signUpWithLink(@Valid @RequestBody LinkSignUpRequest r) {
		auth.signUpWithLink(r.fullName(), r.email(), r.locale());
	}

	/** "Email me a sign-in link instead" on the log-in screen, and "Resend the link". */
	@PostMapping("/link")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void signInLink(@Valid @RequestBody EmailRequest r) {
		auth.requestLink(EmailLink.SIGN_IN, r.email());
	}

	/** "Resend the link" after a sign-up with a password. */
	@PostMapping("/confirmation")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void resendConfirmation(@Valid @RequestBody EmailRequest r) {
		auth.requestLink(EmailLink.CONFIRM, r.email());
	}

	@PostMapping("/password/forgot")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void forgotPassword(@Valid @RequestBody EmailRequest r) {
		auth.requestLink(EmailLink.RESET, r.email());
	}

	/** Opening a link from an email: logs the user in. */
	@PostMapping("/token")
	Map<String, String> useLink(@Valid @RequestBody TokenRequest r, HttpServletRequest request,
			HttpServletResponse response) {
		AuthService.UsedLink used = auth.useLink(r.token());
		UserDetails user = auth.loadUserByUsername(used.email());
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities()));
		SecurityContextHolder.setContext(context);
		if (request.getSession(false) != null) {
			request.changeSessionId(); // session fixation protection
		}
		contexts.saveContext(context, request, response);
		boolean reset = used.link() == EmailLink.RESET;
		request.getSession().setAttribute(RESET_ALLOWED, reset);
		return Map.of("next", reset ? "reset-password" : "home");
	}

	/** "Set a new password" after a reset link; the user stays logged in. */
	@PostMapping("/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void setPassword(@Valid @RequestBody PasswordRequest r, Authentication authentication, HttpSession session) {
		if (!Boolean.TRUE.equals(session.getAttribute(RESET_ALLOWED))) {
			throw new ApiException(HttpStatus.FORBIDDEN, "ERROR_RESET_NOT_ALLOWED");
		}
		auth.setPassword(authentication.getName(), r.password());
		session.removeAttribute(RESET_ALLOWED);
	}

	@GetMapping("/me")
	Map<String, String> me(Authentication authentication) {
		User user = auth.find(authentication.getName()).orElseThrow();
		return Map.of("fullName", user.getFullName(), "email", user.getEmail());
	}

}
