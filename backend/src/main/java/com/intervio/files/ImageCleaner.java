package com.intervio.files;

import com.intervio.api.ApiException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.http.HttpStatus;

/**
 * Rebuilds uploaded images: the pixel size is checked before decoding (image bombs), and the image
 * is written again, which drops metadata such as GPS location and anything hidden after the image.
 */
final class ImageCleaner {

	record Cleaned(byte[] bytes, int width, int height) {
	}

	private ImageCleaner() {
	}

	static Cleaned clean(byte[] bytes, FileType type, int maxPixels) {
		try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
			Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
			if (!readers.hasNext()) {
				throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_FILE_TYPE");
			}
			ImageReader reader = readers.next();
			try {
				reader.setInput(in, true, true);
				int width = reader.getWidth(0);
				int height = reader.getHeight(0);
				if (width > maxPixels || height > maxPixels) {
					throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_IMAGE_TOO_LARGE");
				}
				BufferedImage image = reader.read(0);
				if (type == FileType.JPEG && image.getColorModel().hasAlpha()) {
					BufferedImage rgb = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
					rgb.getGraphics().drawImage(image, 0, 0, null);
					image = rgb;
				}
				ByteArrayOutputStream out = new ByteArrayOutputStream();
				if (!ImageIO.write(image, type == FileType.PNG ? "png" : "jpeg", out)) {
					throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_FILE_TYPE");
				}
				return new Cleaned(out.toByteArray(), width, height);
			}
			finally {
				reader.dispose();
			}
		}
		catch (IOException e) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "ERROR_FILE_TYPE");
		}
	}

}
