package com.intervio.files;

import com.intervio.api.ApiException;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Scans uploads with ClamAV (clamd's INSTREAM command over TCP). If the scanner cannot be reached,
 * the upload is refused: no file is stored without a scan.
 */
@Component
class VirusScanner {

	private static final int CHUNK = 64 * 1024;

	private final FileProperties props;

	VirusScanner(FileProperties props) {
		this.props = props;
	}

	void check(byte[] bytes) {
		if (!props.virusScan()) {
			return; // tests only
		}
		String reply;
		try {
			reply = scan(bytes);
		}
		catch (IOException e) {
			throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "ERROR_SCAN_UNAVAILABLE");
		}
		if (reply.endsWith("FOUND")) {
			throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "ERROR_FILE_INFECTED");
		}
		if (!reply.endsWith("OK")) {
			throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "ERROR_SCAN_UNAVAILABLE");
		}
	}

	/** Returns clamd's answer, for example "stream: OK" or "stream: Eicar-Signature FOUND". */
	String scan(byte[] bytes) throws IOException {
		try (Socket socket = new Socket()) {
			socket.connect(new InetSocketAddress(props.clamavHost(), props.clamavPort()), 3000);
			socket.setSoTimeout(60_000);
			DataOutputStream out = new DataOutputStream(socket.getOutputStream());
			out.write("zINSTREAM\0".getBytes(StandardCharsets.US_ASCII));
			for (int i = 0; i < bytes.length; i += CHUNK) {
				int n = Math.min(CHUNK, bytes.length - i);
				out.writeInt(n);
				out.write(bytes, i, n);
			}
			out.writeInt(0);
			out.flush();
			InputStream in = socket.getInputStream();
			ByteArrayOutputStream reply = new ByteArrayOutputStream();
			for (int c = in.read(); c > 0; c = in.read()) {
				reply.write(c);
			}
			return reply.toString(StandardCharsets.US_ASCII).trim();
		}
	}

}
