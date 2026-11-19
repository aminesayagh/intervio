package com.intervio.files;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface StoredFileRepository extends JpaRepository<StoredFile, Long> {

	Optional<StoredFile> findByUuid(UUID uuid);

	List<StoredFile> findByAttachedAtIsNullAndCreatedAtBefore(Instant before);

}
