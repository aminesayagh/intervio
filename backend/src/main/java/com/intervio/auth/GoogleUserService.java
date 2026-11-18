package com.intervio.auth;

import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Continue with Google": finds the user by Google id, else links the account with the same
 * email when Google has verified it (decision 68), else creates a client.
 */
@Component
class GoogleUserService extends OidcUserService {

	private final UserRepository users;

	GoogleUserService(UserRepository users) {
		this.users = users;
	}

	@Override
	@Transactional
	public OidcUser loadUser(OidcUserRequest request) {
		OidcUser google = super.loadUser(request);
		User user = users.findByGoogleId(google.getSubject()).orElseGet(() -> {
			if (!Boolean.TRUE.equals(google.getEmailVerified())) {
				throw new OAuth2AuthenticationException(new OAuth2Error("email_not_verified"));
			}
			String email = AuthService.normalize(google.getEmail());
			User found = users.findByEmail(email).orElseGet(() -> {
				String name = google.getFullName() != null ? google.getFullName() : email;
				short locale = "fr".equals(google.getLocale()) ? User.LOCALE_FR : User.LOCALE_EN;
				return User.client(name, email, locale);
			});
			found.linkGoogle(google.getSubject());
			return users.save(found);
		});
		// The principal's name is the email, like for password log-in.
		var authorities = List.of(new SimpleGrantedAuthority("ROLE_CLIENT"));
		return new DefaultOidcUser(authorities, google.getIdToken(), google.getUserInfo(), "email") {
			@Override
			public String getName() {
				return user.getEmail();
			}
		};
	}

}
