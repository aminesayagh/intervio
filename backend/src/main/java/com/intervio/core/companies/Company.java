package com.intervio.core.companies;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.id.uuid.UuidVersion7Strategy;
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

	/** Public identifier (UUID v7), the only id served outside the backend. */
	@UuidGenerator(algorithm = UuidVersion7Strategy.class)
	@Column(nullable = false, unique = true, updatable = false)
	private UUID uuid;

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

	@Column(name = "logo_file_id")
	private Long logoFileId;

	/** Registered address (decision 59): asked with the first intervention, null before. */
	@Column(length = 200)
	private String street;

	@Column(length = 100)
	private String city;

	@Column(name = "postal_code", length = 20)
	private String postalCode;

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

	void setLogoFileId(Long logoFileId) {
		this.logoFileId = logoFileId;
	}

	public boolean hasAddress() {
		return street != null;
	}

	public void setAddress(String street, String city, String postalCode) {
		this.street = street;
		this.city = city;
		this.postalCode = postalCode;
	}

	public String getStreet() {
		return street;
	}

	public String getCity() {
		return city;
	}

	public String getPostalCode() {
		return postalCode;
	}

	public UUID getUuid() {
		return uuid;
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

	Long getLogoFileId() {
		return logoFileId;
	}

}
