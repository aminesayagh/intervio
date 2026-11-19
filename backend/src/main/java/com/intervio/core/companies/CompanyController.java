package com.intervio.core.companies;

import com.intervio.api.ApiException;
import com.intervio.auth.AuthService;
import com.intervio.files.FilePurpose;
import com.intervio.files.FileService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Onboarding: the client's company, its industries and its logo. */
@RestController
@RequestMapping("/api/company")
class CompanyController {

	private final CompanyRepository companies;

	private final AuthService auth;

	private final FileService files;

	CompanyController(CompanyRepository companies, AuthService auth, FileService files) {
		this.companies = companies;
		this.auth = auth;
		this.files = files;
	}

	record DetailsRequest(@NotBlank @Size(max = 200) String name, @NotNull @Pattern(regexp = "[A-Z]{2}") String country,
			@NotBlank @Size(max = 50) String registrationNumber) {
	}

	record IndustriesRequest(@NotNull List<Integer> industries) {
	}

	record LogoRequest(@NotNull UUID fileId) {
	}

	record CompanyResponse(String name, String country, String registrationNumber, List<Integer> industries,
			UUID logoFileId) {
	}

	private CompanyResponse response(Company c) {
		List<Integer> industries = new java.util.ArrayList<>();
		for (short code : c.getIndustries()) {
			industries.add((int) code);
		}
		UUID logo = c.getLogoFileId() == null ? null : files.get(c.getLogoFileId()).getUuid();
		return new CompanyResponse(c.getName(), c.getCountry(), c.getRegistrationNumber(), industries, logo);
	}

	@GetMapping
	CompanyResponse get(Authentication authentication) {
		return response(current(authentication));
	}

	/** Step 1: creates the company, or updates it when the client comes back to this step. */
	@PutMapping
	@Transactional
	CompanyResponse saveDetails(@Valid @RequestBody DetailsRequest r, Authentication authentication) {
		Long ownerId = ownerId(authentication);
		Company company = companies.findFirstByOwnerIdOrderById(ownerId).orElseGet(() -> new Company(ownerId));
		// Same company typed with or without spaces is still the same company (decision 65).
		String number = r.registrationNumber().replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
		companies.findByCountryAndRegistrationNumber(r.country(), number)
			.filter(other -> !other.getId().equals(company.getId()))
			.ifPresent(other -> {
				throw new ApiException(HttpStatus.CONFLICT, "ERROR_COMPANY_EXISTS");
			});
		company.setDetails(r.name().trim(), r.country(), number);
		return response(companies.save(company));
	}

	/** Step 2: the industries, from none to all. */
	@PutMapping("/industries")
	@Transactional
	CompanyResponse saveIndustries(@Valid @RequestBody IndustriesRequest r, Authentication authentication) {
		short[] codes = new short[r.industries().size()];
		for (int i = 0; i < codes.length; i++) {
			int code = r.industries().get(i);
			if (code < 1 || code > Company.INDUSTRIES) {
				throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_VALIDATION");
			}
			codes[i] = (short) code;
		}
		Company company = current(authentication);
		company.setIndustries(sortedUnique(codes));
		return response(company);
	}

	/** Step 3: the logo, uploaded first to /api/files (purpose 1); the previous logo is deleted. */
	@PutMapping("/logo")
	@Transactional
	CompanyResponse saveLogo(@Valid @RequestBody LogoRequest r, Authentication authentication) {
		Long userId = ownerId(authentication);
		Company company = current(authentication);
		Long previous = company.getLogoFileId();
		company.setLogoFileId(files.attach(r.fileId(), userId, FilePurpose.COMPANY_LOGO).getId());
		if (previous != null) {
			files.delete(previous);
		}
		return response(company);
	}

	private static short[] sortedUnique(short[] codes) {
		short[] copy = codes.clone();
		Arrays.sort(copy);
		int n = 0;
		for (int i = 0; i < copy.length; i++) {
			if (i == 0 || copy[i] != copy[i - 1]) {
				copy[n++] = copy[i];
			}
		}
		return Arrays.copyOf(copy, n);
	}

	private Long ownerId(Authentication authentication) {
		return auth.find(authentication.getName()).orElseThrow().getId();
	}

	private Company current(Authentication authentication) {
		return companies.findFirstByOwnerIdOrderById(ownerId(authentication))
			.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ERROR_NO_COMPANY"));
	}

}
