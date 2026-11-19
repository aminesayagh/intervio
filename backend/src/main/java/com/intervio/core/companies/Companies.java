package com.intervio.core.companies;

import com.intervio.api.ApiException;
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

}
