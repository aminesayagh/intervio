package com.intervio.core.companies;

import com.intervio.api.ApiException;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** What other services may ask about companies. */
@Service
public class Companies {

	private final CompanyRepository companies;

	Companies(CompanyRepository companies) {
		this.companies = companies;
	}

	/** The company the user owns; onboarding guarantees one before the client board opens. */
	public Company ofOwner(Long userId) {
		return companies.findFirstByOwnerIdOrderById(userId)
			.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ERROR_NO_COMPANY"));
	}

	/** The company the user owns, if any (the account can exist before onboarding ends). */
	public Optional<Company> ownedBy(Long userId) {
		return companies.findFirstByOwnerIdOrderById(userId);
	}

	/** Deletes the company; its drafts, documents and visits go with it (on delete cascade). */
	public void delete(Company company) {
		companies.delete(company);
	}

}
