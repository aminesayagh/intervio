package com.intervio.auth;

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

@Entity
@Table(name = "users")
public class User {

	public static final short ROLE_CLIENT = 1;

	public static final short LOCALE_EN = 1;

	public static final short LOCALE_FR = 2;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true)
	private UUID uuid = UUID.randomUUID();

	@Column(name = "full_name", nullable = false, length = 200)
	private String fullName;

	@Column(nullable = false, unique = true, length = 320)
	private String email;

	@Column(nullable = false)
	private short role;

	@Column(name = "password_hash", length = 200)
	private String passwordHash;

	@Column(name = "google_id", unique = true, length = 100)
	private String googleId;

	@Column(name = "email_verified_at")
	private Instant emailVerifiedAt;

	@Column(nullable = false)
	private short locale = LOCALE_EN;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected User() {
	}

	/** A client signing up from the public page. */
	public static User client(String fullName, String email, short locale) {
		User user = new User();
		user.fullName = fullName;
		user.email = email;
		user.role = ROLE_CLIENT;
		user.locale = locale;
		return user;
	}

	@PrePersist
	void onCreate() {
		createdAt = updatedAt = Instant.now();
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	public boolean isEmailVerified() {
		return emailVerifiedAt != null;
	}

	public void verifyEmail() {
		if (emailVerifiedAt == null) {
			emailVerifiedAt = Instant.now();
		}
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	/**
	 * Links a Google account (decision 68). An email that was never confirmed is confirmed
	 * now and its password removed, so whoever registered it before cannot keep access.
	 */
	public void linkGoogle(String googleId) {
		if (!isEmailVerified()) {
			passwordHash = null;
			verifyEmail();
		}
		this.googleId = googleId;
	}

	public Long getId() {
		return id;
	}

	public String getFullName() {
		return fullName;
	}

	public String getEmail() {
		return email;
	}

	public short getRole() {
		return role;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public String getGoogleId() {
		return googleId;
	}

	public short getLocale() {
		return locale;
	}

}
