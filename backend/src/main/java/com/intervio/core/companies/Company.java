package com.intervio.core.companies;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** The client's company, described during onboarding (decisions 58–65). */
@Entity
@Table(name = "companies")
public class Company {

	/** Industry codes 1–14 (decision 62); the frontend holds their names. */
	public static final int INDUSTRIES = 14;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true)
	private UUID uuid = UUID.randomUUID();

	@Column(name = "owner_id", nullable = false)
	private Long ownerId;

	@Column(nullable = false, length = 200)
	private String name;

	@Column(nullable = false, length = 2)
	private String country;

	@Column(name = "registration_number", nullable = false, length = 50)
	private String registrationNumber;

	@Column(nullable = false)
	private short[] industries = new short[0];

	// ponytail: the logo lives in the database (2 MB max); move it to file storage when one is chosen.
	private byte[] logo;

	@Column(name = "logo_content_type", length = 20)
	private String logoContentType;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected Company() {
	}

	Company(Long ownerId) {
		this.ownerId = ownerId;
	}

	@PrePersist
	void onCreate() {
		createdAt = updatedAt = Instant.now();
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	void setDetails(String name, String country, String registrationNumber) {
		this.name = name;
		this.country = country;
		this.registrationNumber = registrationNumber;
	}

	void setIndustries(short[] industries) {
		this.industries = industries;
	}

	void setLogo(byte[] logo, String contentType) {
		this.logo = logo;
		this.logoContentType = contentType;
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getCountry() {
		return country;
	}

	public String getRegistrationNumber() {
		return registrationNumber;
	}

	public short[] getIndustries() {
		return industries;
	}

	byte[] getLogo() {
		return logo;
	}

	String getLogoContentType() {
		return logoContentType;
	}

}
