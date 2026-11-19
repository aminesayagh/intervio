package com.intervio.files;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Keeps file contents on the local disk under random names ("3f/a9/3fa9…"), never the uploaded name.
 * A file is written to a temporary file first and then moved, so a failed write leaves nothing behind.
 */
// ponytail: local disk only; swap this class for object storage if Intervio runs on several servers.
@Component
class FileStorage {

	private final Path root;

	FileStorage(FileProperties props) {
		this.root = Path.of(props.root()).toAbsolutePath().normalize();
	}

	String save(byte[] bytes) {
		String key = UUID.randomUUID().toString();
		Path target = path(key);
		try {
			Files.createDirectories(target.getParent());
			Path temp = Files.createTempFile(target.getParent(), "upload-", ".tmp");
			Files.write(temp, bytes);
			Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE);
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
		return key;
	}

	byte[] read(String key) {
		try {
			return Files.readAllBytes(path(key));
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	void delete(String key) {
		try {
			Files.deleteIfExists(path(key));
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	private Path path(String key) {
		Path p = root.resolve(key.substring(0, 2)).resolve(key.substring(2, 4)).resolve(key).normalize();
		if (!p.startsWith(root)) {
			throw new IllegalArgumentException("Invalid storage key");
		}
		return p;
	}

}
