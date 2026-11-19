package com.intervio.files;

import java.util.EnumSet;
import java.util.Set;

/** What a file is for; it sets the accepted types and limits. Stored as files.purpose (smallint). */
public enum FilePurpose {

	/** Company logo (decision 63): PNG or JPG, 2 MB. */
	COMPANY_LOGO(1, 2, EnumSet.of(FileType.PNG, FileType.JPEG), 2000),

	/** Specifications, shared documents, RFI and change-request documents, reports: 10 MB. */
	DOCUMENT(2, 10, EnumSet.allOf(FileType.class), 8000);

	public final short code;

	final long maxBytes;

	final Set<FileType> types;

	/** Largest width or height accepted for images. */
	final int maxPixels;

	FilePurpose(int code, int maxMegabytes, Set<FileType> types, int maxPixels) {
		this.code = (short) code;
		this.maxBytes = maxMegabytes * 1024L * 1024L;
		this.types = types;
		this.maxPixels = maxPixels;
	}

	static FilePurpose of(short code) {
		for (FilePurpose p : values()) {
			if (p.code == code) {
				return p;
			}
		}
		throw new IllegalArgumentException("Unknown file purpose " + code);
	}

}
