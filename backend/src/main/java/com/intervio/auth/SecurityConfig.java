package com.intervio.auth;

import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.ott.JdbcOneTimeTokenService;
import org.springframework.security.authentication.ott.OneTimeTokenService;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import tools.jackson.databind.json.JsonMapper;

@Configuration
class SecurityConfig {

	static final int REMEMBER_ME_SECONDS = (int) Duration.ofDays(30).toSeconds();

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, AuthService auth, AttemptLimiter limiter,
			AuthProperties props, GoogleUserService googleUsers, ObjectProvider<ClientRegistrationRepository> google,
			JsonMapper json) throws Exception {
		http.csrf(csrf -> csrf.spa())
			.authorizeHttpRequests(requests -> requests
				.requestMatchers("/api/auth/me", "/api/auth/password").authenticated()
				.requestMatchers("/api/auth/**", "/oauth2/**", "/login/oauth2/**", "/error").permitAll()
				.anyRequest().authenticated())
			.exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
			// Password log-in (form fields: email, password, rememberMe).
			.formLogin(form -> form.loginPage("/login")
				.loginProcessingUrl("/api/auth/login")
				.usernameParameter("email")
				.passwordParameter("password")
				.successHandler((request, response, authentication) -> {
					limiter.recordSuccess(authentication.getName());
					response.setStatus(HttpStatus.NO_CONTENT.value());
				})
				.failureHandler((request, response, exception) -> {
					String email = AuthService.normalize(request.getParameter("email"));
					HttpStatus status;
					String code;
					if (exception instanceof DisabledException) {
						auth.resendConfirmation(email);
						status = HttpStatus.FORBIDDEN;
						code = "ERROR_EMAIL_NOT_CONFIRMED";
					}
					else {
						if (!(exception instanceof LockedException)) {
							limiter.recordFailure(email);
						}
						boolean locked = limiter.isLocked(email);
						status = locked ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.UNAUTHORIZED;
						code = locked ? "ERROR_TOO_MANY_ATTEMPTS" : "ERROR_AUTH_FAIL";
					}
					response.setStatus(status.value());
					response.setContentType("application/json");
					json.writeValue(response.getOutputStream(), Map.of("code", code));
				}))
			.rememberMe(remember -> remember.key(props.rememberMeKey())
				.rememberMeParameter("rememberMe")
				.tokenValiditySeconds(REMEMBER_ME_SECONDS))
			.logout(logout -> logout.logoutUrl("/api/auth/logout")
				.logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler()));
		// Google is enabled only when its client id and secret are configured.
		if (google.getIfAvailable() != null) {
			http.oauth2Login(oauth -> oauth.loginPage("/login")
				.userInfoEndpoint(info -> info.oidcUserService(googleUsers))
				.defaultSuccessUrl(props.frontendUrl() + "/", true)
				.failureUrl(props.frontendUrl() + "/login?error=google"));
		}
		return http.build();
	}

	/**
	 * Password checks: a locked account is refused before the password is checked; an
	 * unconfirmed email only after, so the message never reveals an account to a stranger.
	 */
	@Bean
	DaoAuthenticationProvider authenticationProvider(AuthService auth, PasswordEncoder passwords) {
		DaoAuthenticationProvider provider = new DaoAuthenticationProvider(auth);
		provider.setPasswordEncoder(passwords);
		provider.setPreAuthenticationChecks(user -> {
			if (!user.isAccountNonLocked()) {
				throw new LockedException("locked");
			}
		});
		provider.setPostAuthenticationChecks(user -> {
			if (!user.isEnabled()) {
				throw new DisabledException("email not confirmed");
			}
		});
		return provider;
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	OneTimeTokenService oneTimeTokenService(JdbcTemplate jdbc) {
		return new JdbcOneTimeTokenService(jdbc);
	}

}
