package com.intervio.core.companies;

import com.intervio.api.ApiException;
import com.intervio.auth.AuthService;
import com.intervio.auth.User;
import com.intervio.files.FileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.RememberMeServices;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Settings, Security: "Delete account" (decision 90). It lives with the companies because it
 * deletes the company the account owns.
 */
@RestController
@RequestMapping("/api/account")
class AccountController {

	private final AuthService auth;

	private final CompanyRepository companies;

	private final FileService files;

	private final LogoutHandler rememberMe;

	private final JdbcTemplate jdbc;

	AccountController(AuthService auth, CompanyRepository companies, FileService files, RememberMeServices rememberMe,
			JdbcTemplate jdbc) {
		this.jdbc = jdbc;
		this.auth = auth;
		this.companies = companies;
		this.files = files;
		this.rememberMe = (LogoutHandler) rememberMe;
	}

	record DeleteRequest(@NotBlank String email) {
	}

	/**
	 * The user types their email to confirm. Deletes the company, every file the user uploaded,
	 * then the account, and logs out.
	 */
	@DeleteMapping
	@Transactional
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@Valid @RequestBody DeleteRequest r, Authentication authentication, HttpServletRequest request,
			HttpServletResponse response) {
		User user = auth.current(authentication.getName());
		if (!user.getEmail().equalsIgnoreCase(r.email().trim())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_EMAIL_MISMATCH");
		}
		companies.findFirstByOwnerIdOrderById(user.getId()).ifPresent(company -> {
			// A published intervention involves bidders, so the account stays (decision 90). Drafts,
			// documents and visits are deleted with the company (on delete cascade).
			Boolean published = jdbc.queryForObject(
					"select exists (select 1 from interventions where company_id = ? and published_at is not null)",
					Boolean.class, company.getId());
			if (Boolean.TRUE.equals(published)) {
				throw new ApiException(HttpStatus.CONFLICT, "ERROR_ACCOUNT_HAS_INTERVENTIONS");
			}
			companies.delete(company);
		});
		user.setPhotoFileId(null);
		companies.flush();
		files.deleteAllUploadedBy(user.getId());
		auth.delete(user);
		rememberMe.logout(request, response, authentication);
		new SecurityContextLogoutHandler().logout(request, response, authentication);
	}

}
