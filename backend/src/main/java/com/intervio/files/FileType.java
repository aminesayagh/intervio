package com.intervio.files;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * The file types Intervio accepts, recognized from the file's own bytes, never from what the browser
 * declares. Office files are checked inside (they are ZIP archives) and refused if they hold macros.
 */
public enum FileType {

	PDF("application/pdf"), PNG("image/png"), JPEG("image/jpeg"),
	DOCX("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
	XLSX("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
	PPTX("application/vnd.openxmlformats-officedocument.presentationml.presentation"), DOC("application/msword"),
	XLS("application/vnd.ms-excel"), PPT("application/vnd.ms-powerpoint"), CSV("text/csv");

	public final String contentType;

	FileType(String contentType) {
		this.contentType = contentType;
	}

	public boolean isImage() {
		return this == PNG || this == JPEG;
	}

	/** Returns the type, or null when the content is not an accepted type. */
	public static FileType detect(byte[] b, String fileName) {
		String ext = extension(fileName);
		if (starts(b, '%', 'P', 'D', 'F', '-')) {
			return PDF;
		}
		if (starts(b, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
			return PNG;
		}
		if (starts(b, 0xFF, 0xD8, 0xFF)) {
			return JPEG;
		}
		if (starts(b, 'P', 'K', 3, 4)) {
			return officeOpenXml(b);
		}
		// Legacy Office files share one container format; the extension tells which one it is.
		if (starts(b, 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1)) {
			return switch (ext) {
				case "doc" -> DOC;
				case "xls" -> XLS;
				case "ppt" -> PPT;
				default -> null;
			};
		}
		if (ext.equals("csv") && isText(b)) {
			return CSV;
		}
		return null;
	}

	/** Word, Excel or PowerPoint (2007+) by the folders in the archive; null if it holds macros. */
	private static FileType officeOpenXml(byte[] b) {
		boolean contentTypes = false;
		FileType type = null;
		int entries = 0;
		try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(b))) {
			for (ZipEntry e = zip.getNextEntry(); e != null; e = zip.getNextEntry()) {
				if (++entries > 10_000) {
					return null; // not an Office document
				}
				String name = e.getName();
				if (name.toLowerCase(Locale.ROOT).endsWith("vbaproject.bin")) {
					return null; // macros
				}
				contentTypes |= name.equals("[Content_Types].xml");
				if (type == null) {
					type = name.startsWith("word/") ? DOCX
							: name.startsWith("xl/") ? XLSX : name.startsWith("ppt/") ? PPTX : null;
				}
			}
		}
		catch (IOException e) {
			return null;
		}
		return contentTypes ? type : null;
	}

	/** Text (UTF-8 or the single-byte encodings Excel uses for CSV): no binary NUL byte. */
	private static boolean isText(byte[] b) {
		for (byte x : b) {
			if (x == 0) {
				return false;
			}
		}
		return true;
	}

	private static boolean starts(byte[] b, int... prefix) {
		if (b.length < prefix.length) {
			return false;
		}
		for (int i = 0; i < prefix.length; i++) {
			if ((b[i] & 0xFF) != prefix[i]) {
				return false;
			}
		}
		return true;
	}

	private static String extension(String name) {
		if (name == null) {
			return "";
		}
		int dot = name.lastIndexOf('.');
		return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
	}

}
