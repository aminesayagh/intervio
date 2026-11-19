package com.intervio.core.interventions;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.id.uuid.UuidVersion7Strategy;

/** An intervention of a company: a draft until it is published (decisions 94, 95). */
@Entity
@Table(name = "interventions")
class Intervention {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@UuidGenerator(algorithm = UuidVersion7Strategy.class)
	@Column(nullable = false, unique = true, updatable = false)
	private UUID uuid;

	@Column(name = "company_id", nullable = false, updatable = false)
	private Long companyId;

	@Column(nullable = false, length = 200)
	private String title;

	@Column(nullable = false, length = 2000)
	private String description;

	@Column(name = "offer_deadline", nullable = false)
	private LocalDate offerDeadline;

	@Column(name = "published_at")
	private Instant publishedAt;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected Intervention() {
	}

	Intervention(Long companyId, String title, String description, LocalDate offerDeadline) {
		this.companyId = companyId;
		this.title = title;
		this.description = description;
		this.offerDeadline = offerDeadline;
	}

	@PrePersist
	void onCreate() {
		createdAt = updatedAt = Instant.now();
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	void publish() {
		publishedAt = Instant.now();
	}

	boolean isPublished() {
		return publishedAt != null;
	}

	Long getId() {
		return id;
	}

	UUID getUuid() {
		return uuid;
	}

	Long getCompanyId() {
		return companyId;
	}

	String getTitle() {
		return title;
	}

	String getDescription() {
		return description;
	}

	LocalDate getOfferDeadline() {
		return offerDeadline;
	}

	Instant getPublishedAt() {
		return publishedAt;
	}

	Instant getUpdatedAt() {
		return updatedAt;
	}

}
