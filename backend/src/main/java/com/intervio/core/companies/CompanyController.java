package com.intervio.core.companies;

import com.intervio.api.ApiException;
import com.intervio.auth.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Onboarding: the client's company, its industries and its logo. */
@RestController
@RequestMapping("/api/company")
class CompanyController {

	static final long MAX_LOGO_BYTES = 2 * 1024 * 1024;

	private final CompanyRepository companies;

	private final AuthService auth;

	CompanyController(CompanyRepository companies, AuthService auth) {
		this.companies = companies;
		this.auth = auth;
	}

	record DetailsRequest(@NotBlank @Size(max = 200) String name, @NotNull @Pattern(regexp = "[A-Z]{2}") String country,
			@NotBlank @Size(max = 50) String registrationNumber) {
	}

	record IndustriesRequest(@NotNull List<Integer> industries) {
	}

	record CompanyResponse(String name, String country, String registrationNumber, List<Integer> industries,
			boolean hasLogo) {

		static CompanyResponse of(Company c) {
			List<Integer> industries = new java.util.ArrayList<>();
			for (short code : c.getIndustries()) {
				industries.add((int) code);
			}
			return new CompanyResponse(c.getName(), c.getCountry(), c.getRegistrationNumber(), industries,
					c.getLogo() != null);
		}
	}

	@GetMapping
	CompanyResponse get(Authentication authentication) {
		return CompanyResponse.of(current(authentication));
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
		return CompanyResponse.of(companies.save(company));
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
		return CompanyResponse.of(company);
	}

	/** Step 3: the logo, PNG or JPG up to 2 MB (decision 63). */
	@PutMapping(path = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Transactional
	void saveLogo(@RequestParam("file") MultipartFile file, Authentication authentication) throws IOException {
		if (file.getSize() > MAX_LOGO_BYTES) {
			throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "ERROR_FILE_TOO_LARGE");
		}
		byte[] bytes = file.getBytes();
		String type = imageType(bytes);
		if (type == null) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_LOGO_TYPE");
		}
		current(authentication).setLogo(bytes, type);
	}

	@GetMapping("/logo")
	ResponseEntity<byte[]> logo(Authentication authentication) {
		Company company = current(authentication);
		if (company.getLogo() == null) {
			throw new ApiException(HttpStatus.NOT_FOUND, "ERROR_NO_LOGO");
		}
		return ResponseEntity.ok().contentType(MediaType.parseMediaType(company.getLogoContentType())).body(company.getLogo());
	}

	/** Reads the file's first bytes rather than trusting its name or declared type. */
	static String imageType(byte[] b) {
		if (b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
			return MediaType.IMAGE_PNG_VALUE;
		}
		if (b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
			return MediaType.IMAGE_JPEG_VALUE;
		}
		return null;
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
