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

	AccountController(AuthService auth, CompanyRepository companies, FileService files, RememberMeServices rememberMe) {
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
		// ponytail: interventions do not exist yet, so nothing blocks the deletion; check for a
		// published intervention here when they arrive (decision 90).
		companies.findFirstByOwnerIdOrderById(user.getId()).ifPresent(companies::delete);
		user.setPhotoFileId(null);
		companies.flush();
		files.deleteAllUploadedBy(user.getId());
		auth.delete(user);
		rememberMe.logout(request, response, authentication);
		new SecurityContextLogoutHandler().logout(request, response, authentication);
	}

}
