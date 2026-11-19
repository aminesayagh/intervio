package com.intervio.core.companies;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface CompanyRepository extends JpaRepository<Company, Long> {

	/** A user may own several companies later; onboarding works on the first one. */
	Optional<Company> findFirstByOwnerIdOrderById(Long ownerId);

	Optional<Company> findByCountryAndRegistrationNumber(String country, String registrationNumber);

	boolean existsByLogoFileIdAndOwnerId(Long logoFileId, Long ownerId);

}
