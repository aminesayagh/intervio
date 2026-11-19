package com.intervio.core.companies;

import com.intervio.files.FileAccessRule;
import com.intervio.files.StoredFile;
import org.springframework.stereotype.Component;

/** A company's logo can be read by the company's owner (later also by its bidders and contractors). */
@Component
class CompanyFileAccess implements FileAccessRule {

	private final CompanyRepository companies;

	CompanyFileAccess(CompanyRepository companies) {
		this.companies = companies;
	}

	@Override
	public boolean canRead(Long userId, StoredFile file) {
		return companies.existsByLogoFileIdAndOwnerId(file.getId(), userId);
	}

}
