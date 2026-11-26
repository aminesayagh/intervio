package com.intervio.core.account;

import com.intervio.api.ApiException;
import com.intervio.auth.AuthService;
import com.intervio.auth.User;
import com.intervio.core.companies.Companies;
import com.intervio.core.interventions.Interventions;
import com.intervio.files.FileService;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deleting an account (decision 90): the company it owns, every file the user uploaded, then
 * the account, in one transaction. Each package answers for its own data.
 */
@Service
class AccountDeletion {

	private final AuthService auth;

	private final Companies companies;

	private final Interventions interventions;

	private final FileService files;

	private final EntityManager entityManager;

	AccountDeletion(AuthService auth, Companies companies, Interventions interventions, FileService files,
			EntityManager entityManager) {
		this.auth = auth;
		this.companies = companies;
		this.interventions = interventions;
		this.files = files;
		this.entityManager = entityManager;
	}

	/** The user typed their email to confirm; a company with a published intervention stays. */
	@Transactional
	void delete(String username, String typedEmail) {
		User user = auth.current(username);
		if (!user.getEmail().equalsIgnoreCase(typedEmail.trim())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_EMAIL_MISMATCH");
		}
		companies.ownedBy(user.getId()).ifPresent(company -> {
			// A published intervention involves bidders, so the account stays (decision 90).
			if (interventions.anyPublished(company.getId())) {
				throw new ApiException(HttpStatus.CONFLICT, "ERROR_ACCOUNT_HAS_INTERVENTIONS");
			}
			companies.delete(company);
		});
		user.setPhotoFileId(null);
		entityManager.flush(); // the company and the photo let go of the files before they go
		files.deleteAllUploadedBy(user.getId());
		auth.delete(user);
	}

}
