package com.intervio.auth;

import com.intervio.files.FilePurpose;
import com.intervio.files.FileService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Arrays;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Settings: the Profile and Security tabs (decisions 87-89). */
@RestController
@RequestMapping("/api/profile")
class ProfileController {

	private final AuthService auth;

	private final FileService files;

	private final StampedRememberMeServices rememberMe;

	private final SecurityContextRepository contexts = new HttpSessionSecurityContextRepository();

	ProfileController(AuthService auth, FileService files, StampedRememberMeServices rememberMe) {
		this.auth = auth;
		this.files = files;
		this.rememberMe = rememberMe;
	}

	record NameRequest(@NotBlank @Size(max = 200) String fullName) {
	}

	record PhotoRequest(@NotNull UUID fileId) {
	}

	record EmailRequest(@NotBlank @Email @Size(max = 320) String email) {
	}

	record PasswordRequest(String currentPassword, @NotBlank @Size(min = 12, max = 200) String newPassword) {
	}

	@PutMapping
	Me rename(@Valid @RequestBody NameRequest r, Authentication authentication) {
		return Me.of(auth.rename(authentication.getName(), r.fullName()), files);
	}

	/** The photo is uploaded first to /api/files (purpose 3); the previous one is deleted. */
	@PutMapping("/photo")
	@Transactional
	Me setPhoto(@Valid @RequestBody PhotoRequest r, Authentication authentication) {
		User user = auth.current(authentication.getName());
		Long previous = user.getPhotoFileId();
		user.setPhotoFileId(files.attach(r.fileId(), user.getId(), FilePurpose.USER_PHOTO).getId());
		if (previous != null) {
			files.delete(previous);
		}
		return Me.of(user, files);
	}

	@DeleteMapping("/photo")
	@Transactional
	Me removePhoto(Authentication authentication) {
		User user = auth.current(authentication.getName());
		Long previous = user.getPhotoFileId();
		user.setPhotoFileId(null);
		if (previous != null) {
			files.delete(previous);
		}
		return Me.of(user, files);
	}

	/** Sends the confirmation link to the new email; also used to resend it. */
	@PostMapping("/email")
	Me changeEmail(@Valid @RequestBody EmailRequest r, Authentication authentication) {
		return Me.of(auth.requestEmailChange(authentication.getName(), r.email()), files);
	}

	@DeleteMapping("/email")
	Me cancelEmailChange(Authentication authentication) {
		return Me.of(auth.cancelEmailChange(authentication.getName()), files);
	}

	@PutMapping("/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void changePassword(@Valid @RequestBody PasswordRequest r, Authentication authentication) {
		auth.changePassword(authentication.getName(), r.currentPassword(), r.newPassword());
	}

	/**
	 * "Log out of other devices": ends every earlier session and cookie, then gives this device a
	 * new session (and a new "Remember me" cookie if it had one), so it stays logged in.
	 */
	@PostMapping("/sessions/end")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void endOtherSessions(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
		auth.endSessions(authentication.getName());
		SecurityContext context = SecurityContextHolder.getContext();
		request.getSession().invalidate();
		request.getSession(true);
		contexts.saveContext(context, request, response);
		boolean remembered = request.getCookies() != null && Arrays.stream(request.getCookies())
			.map(Cookie::getName)
			.anyMatch(StampedRememberMeServices.COOKIE::equals);
		if (remembered) {
			rememberMe.onLoginSuccess(request, response, authentication);
		}
	}

}
