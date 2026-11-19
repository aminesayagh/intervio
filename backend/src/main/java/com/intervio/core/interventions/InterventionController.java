package com.intervio.core.interventions;

import com.intervio.api.ApiException;
import com.intervio.api.Uuids;
import com.intervio.auth.AuthService;
import com.intervio.core.companies.Companies;
import com.intervio.core.companies.Company;
import com.intervio.files.FilePurpose;
import com.intervio.files.FileService;
import com.intervio.files.StoredFile;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Interventions on the client board (decisions 92-95). */
@RestController
@RequestMapping("/api/interventions")
class InterventionController {

	static final short SPECIFICATION = 1;

	/** How many interventions the sidebar lists (decision 92). */
	static final int RECENT = 6;

	private final InterventionRepository interventions;

	private final Companies companies;

	private final AuthService auth;

	private final FileService files;

	InterventionController(InterventionRepository interventions, Companies companies, AuthService auth,
			FileService files) {
		this.interventions = interventions;
		this.companies = companies;
		this.auth = auth;
		this.files = files;
	}

	record AddressRequest(@NotBlank @Size(max = 200) String street, @NotBlank @Size(max = 100) String city,
			@NotBlank @Size(max = 20) String postalCode) {
	}

	record CreateRequest(@NotBlank @Size(max = 200) String title, @Size(max = 2000) String description,
			@NotNull LocalDate offerDeadline, @Size(max = 20) List<UUID> specificationFileIds,
			@Valid AddressRequest address) {
	}

	/** One card in the gallery or one entry in the sidebar. */
	record Summary(UUID id, String title, String status, LocalDate offerDeadline, int documentCount,
			Instant updatedAt) {
	}

	record Recent(List<Summary> items, long total) {
	}

	record Document(UUID id, String name, String contentType, long sizeBytes) {
	}

	record Detail(UUID id, String title, String description, String status, LocalDate offerDeadline,
			Instant publishedAt, List<Document> specifications) {
	}

	/** "All interventions": the gallery, most recently updated first (decision 93). */
	@GetMapping
	List<Summary> list(Authentication authentication) {
		return interventions.findByCompanyIdOrderByUpdatedAtDesc(company(authentication).getId())
			.stream()
			.map(this::summary)
			.toList();
	}

	/** The sidebar: the six last opened, and how many the company has in all (decision 92). */
	@GetMapping("/recent")
	Recent recent(Authentication authentication) {
		Long userId = userId(authentication);
		Company company = companies.ofOwner(userId);
		List<Summary> items = interventions.findVisited(userId, company.getId(), Limit.of(RECENT))
			.stream()
			.map(this::summary)
			.toList();
		return new Recent(items, interventions.countByCompanyId(company.getId()));
	}

	/**
	 * "Create an intervention" (decision 94): a draft with its specifications; the company's first
	 * intervention also saves the company's registered address.
	 */
	@PostMapping
	@Transactional
	@ResponseStatus(HttpStatus.CREATED)
	Detail create(@Valid @RequestBody CreateRequest r, Authentication authentication) {
		Long userId = userId(authentication);
		Company company = companies.ofOwner(userId);
		if (!company.hasAddress()) {
			if (r.address() == null) {
				throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_ADDRESS_REQUIRED");
			}
			company.setAddress(r.address().street().trim(), r.address().city().trim(),
					r.address().postalCode().trim());
		}
		requireFuture(r.offerDeadline());
		String description = r.description() == null ? "" : r.description().trim();
		Intervention intervention = interventions
			.save(new Intervention(company.getId(), r.title().trim(), description, r.offerDeadline()));
		for (UUID fileId : r.specificationFileIds() == null ? List.<UUID>of() : r.specificationFileIds()) {
			StoredFile file = files.attach(fileId, userId, FilePurpose.DOCUMENT);
			interventions.addDocument(Uuids.v7(), company.getId(), intervention.getId(), file.originalName(),
					file.getId(), SPECIFICATION);
		}
		interventions.recordVisit(userId, intervention.getId());
		return detail(intervention);
	}

	/** Opening an intervention also puts it first in the sidebar. */
	@GetMapping("/{id}")
	@Transactional
	Detail get(@PathVariable UUID id, Authentication authentication) {
		Long userId = userId(authentication);
		Intervention intervention = find(id, companies.ofOwner(userId));
		interventions.recordVisit(userId, intervention.getId());
		return detail(intervention);
	}

	@PostMapping("/{id}/publish")
	@Transactional
	Detail publish(@PathVariable UUID id, Authentication authentication) {
		Intervention intervention = find(id, company(authentication));
		if (intervention.isPublished()) {
			throw new ApiException(HttpStatus.CONFLICT, "ERROR_ALREADY_PUBLISHED");
		}
		requireFuture(intervention.getOfferDeadline());
		intervention.publish();
		return detail(interventions.saveAndFlush(intervention));
	}

	private static void requireFuture(LocalDate deadline) {
		// ponytail: compared with the server's date; time zones matter once deadlines have a time.
		if (!deadline.isAfter(LocalDate.now())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_DEADLINE_PAST");
		}
	}

	private Intervention find(UUID id, Company company) {
		return interventions.findByUuidAndCompanyId(id, company.getId())
			.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ERROR_INTERVENTION_NOT_FOUND"));
	}

	private Summary summary(Intervention i) {
		return new Summary(i.getUuid(), i.getTitle(), status(i), i.getOfferDeadline(),
				interventions.countDocuments(i.getId()), i.getUpdatedAt());
	}

	private Detail detail(Intervention i) {
		List<Document> specs = interventions.documentFileIds(i.getId(), SPECIFICATION).stream().map(files::get).map(f ->
				new Document(f.getUuid(), f.originalName(), f.contentType(), f.sizeBytes())).toList();
		return new Detail(i.getUuid(), i.getTitle(), i.getDescription(), status(i), i.getOfferDeadline(),
				i.getPublishedAt(), specs);
	}

	private static String status(Intervention i) {
		return i.isPublished() ? "published" : "draft";
	}

	private Long userId(Authentication authentication) {
		return auth.current(authentication.getName()).getId();
	}

	private Company company(Authentication authentication) {
		return companies.ofOwner(userId(authentication));
	}

}
