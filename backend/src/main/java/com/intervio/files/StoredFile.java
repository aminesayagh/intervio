package com.intervio.files;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.id.uuid.UuidVersion7Strategy;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** An uploaded file. Only files that passed every check (type, size, virus scan) are stored. */
@Entity
@Table(name = "files")
public class StoredFile {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Public identifier (UUID v7), the only id served outside the backend. */
	@UuidGenerator(algorithm = UuidVersion7Strategy.class)
	@Column(nullable = false, unique = true, updatable = false)
	private UUID uuid;

	@Column(nullable = false)
	private short purpose;

	@Column(name = "uploaded_by", nullable = false)
	private Long uploadedBy;

	@Column(name = "storage_key", nullable = false, unique = true, length = 36)
	private String storageKey;

	/** contentType, sizeBytes, sha256, originalName, and width and height for images. */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false)
	private Map<String, Object> metadata;

	/** When a business record started using the file; unused files are deleted after a day. */
	@Column(name = "attached_at")
	private Instant attachedAt;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	protected StoredFile() {
	}

	StoredFile(FilePurpose purpose, Long uploadedBy, String storageKey, Map<String, Object> metadata) {
		this.purpose = purpose.code;
		this.uploadedBy = uploadedBy;
		this.storageKey = storageKey;
		this.metadata = metadata;
	}

	void attach() {
		attachedAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public UUID getUuid() {
		return uuid;
	}

	public FilePurpose getPurpose() {
		return FilePurpose.of(purpose);
	}

	public Long getUploadedBy() {
		return uploadedBy;
	}

	String getStorageKey() {
		return storageKey;
	}

	public String contentType() {
		return (String) metadata.get("contentType");
	}

	public String originalName() {
		return (String) metadata.get("originalName");
	}

	public long sizeBytes() {
		return ((Number) metadata.get("sizeBytes")).longValue();
	}

}
