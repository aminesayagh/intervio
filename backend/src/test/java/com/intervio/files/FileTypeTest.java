package com.intervio.files;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.intervio.api.ApiException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class FileTypeTest {

	@Test
	void recognizesAcceptedTypesFromTheirContent() throws IOException {
		assertThat(FileType.detect("%PDF-1.7 ...".getBytes(), "spec.pdf")).isEqualTo(FileType.PDF);
		assertThat(FileType.detect(image("png"), "logo.png")).isEqualTo(FileType.PNG);
		assertThat(FileType.detect(image("jpeg"), "photo.jpeg")).isEqualTo(FileType.JPEG);
		assertThat(FileType.detect(office("word/document.xml"), "a.docx")).isEqualTo(FileType.DOCX);
		assertThat(FileType.detect(office("xl/workbook.xml"), "a.xlsx")).isEqualTo(FileType.XLSX);
		assertThat(FileType.detect(office("ppt/presentation.xml"), "a.pptx")).isEqualTo(FileType.PPTX);
		byte[] ole2 = { (byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1, 0 };
		assertThat(FileType.detect(ole2, "old.xls")).isEqualTo(FileType.XLS);
		assertThat(FileType.detect("id;name\n1;Pump\n".getBytes(StandardCharsets.UTF_8), "list.csv"))
			.isEqualTo(FileType.CSV);
	}

	@Test
	void refusesEverythingElse() throws IOException {
		assertThat(FileType.detect("<html><script>".getBytes(), "logo.png")).isNull(); // renamed file
		assertThat(FileType.detect(office("word/document.xml", "word/vbaProject.bin"), "macro.docx")).isNull();
		assertThat(FileType.detect(office("other/file.txt"), "a.docx")).isNull();
		assertThat(FileType.detect(new byte[] { 'a', 0, 'b' }, "binary.csv")).isNull();
		assertThat(FileType.detect("plain text".getBytes(), "notes.txt")).isNull();
	}

	@Test
	void imagesAreRebuiltWithinThePixelLimit() throws IOException {
		ImageCleaner.Cleaned cleaned = ImageCleaner.clean(image("png"), FileType.PNG, 2000);
		assertThat(cleaned.width()).isEqualTo(40);
		assertThat(FileType.detect(cleaned.bytes(), "x.png")).isEqualTo(FileType.PNG);
		assertThatThrownBy(() -> ImageCleaner.clean(image("png"), FileType.PNG, 20))
			.isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("ERROR_IMAGE_TOO_LARGE"));
	}

	static byte[] image(String format) throws IOException {
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		ImageIO.write(new BufferedImage(40, 30, BufferedImage.TYPE_INT_RGB), format, out);
		return out.toByteArray();
	}

	static byte[] office(String... entries) throws IOException {
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		try (ZipOutputStream zip = new ZipOutputStream(out)) {
			zip.putNextEntry(new ZipEntry("[Content_Types].xml"));
			zip.write("<Types/>".getBytes());
			for (String e : entries) {
				zip.putNextEntry(new ZipEntry(e));
				zip.write("x".getBytes());
			}
		}
		return out.toByteArray();
	}

}
