package com.intervio.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Optional;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Ends a session whose user is gone (account deleted, email changed) or that was created before
 * "Log out of other devices" (decision 89). The request then goes on as a logged-out visitor.
 */
class SessionCutoffFilter extends OncePerRequestFilter {

	private final UserRepository users;

	SessionCutoffFilter(UserRepository users) {
		this.users = users;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		HttpSession session = request.getSession(false);
		if (session != null && auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
			// ponytail: one user lookup per signed-in request; cache it if it ever shows up in profiles.
			Optional<User> user = users.findByEmail(auth.getName());
			boolean ended = user.isEmpty() || user.get().getSessionsValidAfter() != null
					&& session.getCreationTime() < user.get().getSessionsValidAfter().toEpochMilli();
			if (ended) {
				session.invalidate();
				SecurityContextHolder.clearContext();
			}
		}
		chain.doFilter(request, response);
	}

}
