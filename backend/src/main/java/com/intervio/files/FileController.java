package com.intervio.files;

import com.intervio.api.ApiException;
import com.intervio.auth.AuthService;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Upload one file, then download it; every call needs a logged-in user. */
@RestController
@RequestMapping("/api/files")
class FileController {

	private final FileService files;

	private final AuthService auth;

	FileController(FileService files, AuthService auth) {
		this.files = files;
		this.auth = auth;
	}

	/** purpose: 1 company logo, 2 document. Answers the file id to attach to a business record. */
	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	Map<String, Object> upload(@RequestParam("file") MultipartFile file, @RequestParam("purpose") short purpose,
			Authentication authentication) throws IOException {
		FilePurpose p;
		try {
			p = FilePurpose.of(purpose);
		}
		catch (IllegalArgumentException e) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_VALIDATION");
		}
		StoredFile stored = files.upload(userId(authentication), p, file);
		return Map.of("id", stored.getUuid(), "name", stored.originalName(), "contentType", stored.contentType(),
				"sizeBytes", stored.sizeBytes());
	}

	@GetMapping("/{id}")
	ResponseEntity<byte[]> download(@PathVariable UUID id, Authentication authentication) {
		FileService.Download d = files.read(id, userId(authentication));
		StoredFile file = d.file();
		// Images are shown in the page; anything else is downloaded, never opened by the browser.
		ContentDisposition disposition = (file.contentType().startsWith("image/") ? ContentDisposition.inline()
				: ContentDisposition.attachment())
			.filename(file.originalName(), java.nio.charset.StandardCharsets.UTF_8)
			.build();
		return ResponseEntity.ok()
			.contentType(MediaType.parseMediaType(file.contentType()))
			.header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
			.header("Content-Security-Policy", "default-src 'none'; sandbox")
			.header(HttpHeaders.CACHE_CONTROL, "private, no-store")
			.body(d.bytes());
	}

	private Long userId(Authentication authentication) {
		return auth.find(authentication.getName()).orElseThrow().getId();
	}

}
