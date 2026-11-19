package com.intervio.files;

import com.intervio.api.ApiException;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Every upload goes through here: rate limit, size, real type, image rebuild, virus scan, then
 * storage. Business modules then attach the file by its id.
 */
@Service
public class FileService {

	static final int MAX_UPLOADS_PER_HOUR = 20;

	private final StoredFileRepository files;

	private final FileStorage storage;

	private final VirusScanner scanner;

	private final List<FileAccessRule> accessRules;

	// ponytail: in-memory upload counters, per server; move with the other limits if Intervio scales out.
	private final Map<Long, Deque<Instant>> uploads = new ConcurrentHashMap<>();

	FileService(StoredFileRepository files, FileStorage storage, VirusScanner scanner, List<FileAccessRule> accessRules) {
		this.files = files;
		this.storage = storage;
		this.scanner = scanner;
		this.accessRules = accessRules;
	}

	@Transactional
	public StoredFile upload(Long userId, FilePurpose purpose, MultipartFile file) throws IOException {
		allowUpload(userId);
		if (file.getSize() > purpose.maxBytes) {
			throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "ERROR_FILE_TOO_LARGE");
		}
		byte[] bytes = file.getBytes();
		FileType type = FileType.detect(bytes, file.getOriginalFilename());
		if (type == null || !purpose.types.contains(type)) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_FILE_TYPE");
		}
		Map<String, Object> metadata = new LinkedHashMap<>();
		if (type.isImage()) {
			ImageCleaner.Cleaned cleaned = ImageCleaner.clean(bytes, type, purpose.maxPixels);
			bytes = cleaned.bytes();
			metadata.put("width", cleaned.width());
			metadata.put("height", cleaned.height());
		}
		scanner.check(bytes);
		metadata.put("contentType", type.contentType);
		metadata.put("sizeBytes", bytes.length);
		metadata.put("sha256", sha256(bytes));
		metadata.put("originalName", displayName(file.getOriginalFilename()));
		return files.save(new StoredFile(purpose, userId, storage.save(bytes), metadata));
	}

	/**
	 * A business record starts using an uploaded file. Only the uploader may attach it, and only for
	 * the purpose it was uploaded for.
	 */
	@Transactional
	public StoredFile attach(UUID uuid, Long userId, FilePurpose purpose) {
		StoredFile file = files.findByUuid(uuid)
			.filter(f -> f.getUploadedBy().equals(userId) && f.getPurpose() == purpose)
			.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ERROR_FILE_NOT_FOUND"));
		file.attach();
		return file;
	}

	/** The file and its content, if this user may read it; otherwise "not found" (no hint it exists). */
	@Transactional(readOnly = true)
	public Download read(UUID uuid, Long userId) {
		StoredFile file = files.findByUuid(uuid)
			.filter(f -> f.getUploadedBy().equals(userId) || accessRules.stream().anyMatch(r -> r.canRead(userId, f)))
			.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ERROR_FILE_NOT_FOUND"));
		return new Download(file, storage.read(file.getStorageKey()));
	}

	public StoredFile get(Long id) {
		return files.findById(id).orElseThrow();
	}

	@Transactional
	public void delete(Long id) {
		files.findById(id).ifPresent(file -> {
			files.delete(file);
			storage.delete(file.getStorageKey());
		});
	}

	/** Account deletion (decision 90): every file the user uploaded. */
	@Transactional
	public void deleteAllUploadedBy(Long userId) {
		for (StoredFile file : files.findByUploadedBy(userId)) {
			files.delete(file);
			storage.delete(file.getStorageKey());
		}
	}

	/** Files uploaded but never used within a day are removed. */
	@Scheduled(fixedDelay = 60 * 60 * 1000, initialDelay = 60 * 1000)
	@Transactional
	public void deleteUnused() {
		for (StoredFile file : files.findByAttachedAtIsNullAndCreatedAtBefore(Instant.now().minus(Duration.ofDays(1)))) {
			files.delete(file);
			storage.delete(file.getStorageKey());
		}
	}

	public record Download(StoredFile file, byte[] bytes) {
	}

	private synchronized void allowUpload(Long userId) {
		Instant now = Instant.now();
		Deque<Instant> recent = uploads.computeIfAbsent(userId, id -> new ArrayDeque<>());
		while (!recent.isEmpty() && recent.peekFirst().isBefore(now.minus(Duration.ofHours(1)))) {
			recent.pollFirst();
		}
		if (recent.size() >= MAX_UPLOADS_PER_HOUR) {
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "ERROR_TOO_MANY_UPLOADS");
		}
		recent.addLast(now);
	}

	/** The uploaded name, kept for display only: no folders, no control characters, at most 200 characters. */
	static String displayName(String name) {
		if (name == null || name.isBlank()) {
			return "file";
		}
		String base = name.replace('\\', '/');
		base = base.substring(base.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}\"]", "").trim();
		return base.isEmpty() ? "file" : base.length() > 200 ? base.substring(base.length() - 200) : base;
	}

	private static String sha256(byte[] bytes) {
		try {
			return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

}
