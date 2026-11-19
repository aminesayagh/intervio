package com.intervio.auth;

import com.intervio.api.ApiException;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.ott.GenerateOneTimeTokenRequest;
import org.springframework.security.authentication.ott.OneTimeToken;
import org.springframework.security.authentication.ott.OneTimeTokenAuthenticationToken;
import org.springframework.security.authentication.ott.OneTimeTokenService;
import org.springframework.security.core.userdetails.User.UserBuilder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService implements UserDetailsService {

	private final UserRepository users;

	private final PasswordEncoder passwords;

	private final OneTimeTokenService tokens;

	private final AuthMailer mailer;

	private final AttemptLimiter limiter;

	AuthService(UserRepository users, PasswordEncoder passwords, OneTimeTokenService tokens, AuthMailer mailer,
			AttemptLimiter limiter) {
		this.users = users;
		this.passwords = passwords;
		this.tokens = tokens;
		this.mailer = mailer;
		this.limiter = limiter;
	}

	static String normalize(String email) {
		return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
	}

	/** Spring Security reads users through this, for password log-in and "Remember me". */
	@Override
	public UserDetails loadUserByUsername(String email) {
		User user = users.findByEmail(normalize(email)).orElseThrow(() -> new UsernameNotFoundException(email));
		UserBuilder builder = org.springframework.security.core.userdetails.User.withUsername(user.getEmail());
		return builder.password(user.getPasswordHash() == null ? "" : user.getPasswordHash())
			.disabled(!user.isEmailVerified())
			.accountLocked(limiter.isLocked(user.getEmail()))
			.roles("CLIENT")
			.build();
	}

	/** Sign-up with a password (flow 4.1): sends the confirmation link. */
	@Transactional
	public void signUpWithPassword(String fullName, String email, String password, String locale) {
		User user = newClient(fullName, email, locale);
		user.setPasswordHash(passwords.encode(password));
		users.save(user);
		sendLink(user, EmailLink.CONFIRM);
	}

	/** Sign-up with a sign-in link (flow 4.3): no password, sends the sign-in link. */
	@Transactional
	public void signUpWithLink(String fullName, String email, String locale) {
		User user = users.save(newClient(fullName, email, locale));
		sendLink(user, EmailLink.SIGN_IN);
	}

	private User newClient(String fullName, String email, String locale) {
		String normalized = normalize(email);
		if (users.existsByEmail(normalized)) {
			throw new ApiException(HttpStatus.CONFLICT, "ERROR_EMAIL_TAKEN");
		}
		short lang = "fr".equals(locale) ? User.LOCALE_FR : User.LOCALE_EN;
		return User.client(fullName.trim(), normalized, lang);
	}

	/**
	 * Sends a link to an existing account. The answer never says whether the account exists;
	 * only the rate limit is reported.
	 */
	public void requestLink(EmailLink link, String email) {
		String normalized = normalize(email);
		if (!limiter.allowLink(link.name(), normalized)) {
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "ERROR_LINK_TOO_SOON");
		}
		Optional<User> user = users.findByEmail(normalized);
		if (link == EmailLink.CONFIRM) {
			user = user.filter(u -> !u.isEmailVerified());
		}
		user.ifPresent(u -> sendLink(u, link));
	}

	/** Called when a password log-in is refused because the email is not confirmed. */
	void resendConfirmation(String email) {
		String normalized = normalize(email);
		if (limiter.allowLink(EmailLink.CONFIRM.name(), normalized)) {
			users.findByEmail(normalized).filter(u -> !u.isEmailVerified()).ifPresent(u -> sendLink(u, EmailLink.CONFIRM));
		}
	}

	private void sendLink(User user, EmailLink link) {
		// ponytail: the purpose travels in the token's username ("RESET:email") so the
		// framework's token table needs no extra column.
		OneTimeToken token = tokens
			.generate(new GenerateOneTimeTokenRequest(link.name() + ":" + user.getEmail(), link.validity));
		mailer.send(user, link, token.getTokenValue());
	}

	/** Uses a link: confirms the email (a link proves it) and says which link it was. */
	@Transactional
	public UsedLink useLink(String tokenValue) {
		OneTimeToken token = tokens.consume(new OneTimeTokenAuthenticationToken(tokenValue));
		if (token == null) {
			throw new ApiException(HttpStatus.GONE, "ERROR_LINK_INVALID");
		}
		String[] parts = token.getUsername().split(":", 2);
		User user = users.findByEmail(parts[1]).orElseThrow(() -> new ApiException(HttpStatus.GONE, "ERROR_LINK_INVALID"));
		user.verifyEmail();
		return new UsedLink(EmailLink.valueOf(parts[0]), user.getEmail());
	}

	@Transactional
	public void setPassword(String email, String password) {
		users.findByEmail(email).orElseThrow().setPasswordHash(passwords.encode(password));
	}

	public Optional<User> find(String email) {
		return users.findByEmail(normalize(email));
	}

	public record UsedLink(EmailLink link, String email) {
	}

}
