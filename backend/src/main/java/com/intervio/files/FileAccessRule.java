package com.intervio.files;

/**
 * Lets a business module say who may read the files it uses (for example, the company module for
 * logos). The uploader can always read their own file; anyone else needs a rule that allows it.
 */
public interface FileAccessRule {

	boolean canRead(Long userId, StoredFile file);

}
