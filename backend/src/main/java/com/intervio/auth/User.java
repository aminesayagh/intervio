package com.intervio.auth;

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

@Entity
@Table(name = "users")
public class User {

	public static final short ROLE_CLIENT = 1;

	public static final short LOCALE_EN = 1;

	public static final short LOCALE_FR = 2;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Public identifier (UUID v7), the only id served outside the backend. */
	@UuidGenerator(algorithm = UuidVersion7Strategy.class)
	@Column(nullable = false, unique = true, updatable = false)
	private UUID uuid;

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

	@Column(name = "photo_file_id")
	private Long photoFileId;

	/** The new email, until its confirmation link is opened (decision 88). */
	@Column(name = "pending_email", length = 320)
	private String pendingEmail;

	/** Sessions and "Remember me" cookies older than this are ended (decision 89). */
	/** The Google account photo, refreshed at each Google log-in; an uploaded photo wins. */
	@Column(name = "google_picture_url", length = 1000)
	private String googlePictureUrl;

	@Column(name = "sessions_valid_after")
	private Instant sessionsValidAfter;

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

	public void setFullName(String fullName) {
		this.fullName = fullName;
	}

	public void setPhotoFileId(Long photoFileId) {
		this.photoFileId = photoFileId;
	}

	public void setPendingEmail(String pendingEmail) {
		this.pendingEmail = pendingEmail;
	}

	/** The new email replaces the old one; Google was linked to the old one, so it is unlinked. */
	void confirmEmailChange() {
		email = pendingEmail;
		pendingEmail = null;
		googleId = null;
		googlePictureUrl = null;
		verifyEmail();
	}

	void endSessionsBefore(Instant instant) {
		sessionsValidAfter = instant;
	}

	/** Only an https address from Google is kept; anything else is dropped. */
	void setGooglePictureUrl(String url) {
		googlePictureUrl = url != null && url.startsWith("https://") && url.length() <= 1000 ? url : null;
	}

	public String getGooglePictureUrl() {
		return googlePictureUrl;
	}

	public Long getPhotoFileId() {
		return photoFileId;
	}

	public String getPendingEmail() {
		return pendingEmail;
	}

	public Instant getSessionsValidAfter() {
		return sessionsValidAfter;
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
