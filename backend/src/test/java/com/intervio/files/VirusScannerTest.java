package com.intervio.files;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.intervio.api.ApiException;
import java.io.DataInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** The ClamAV client against a tiny fake clamd that speaks the same INSTREAM protocol. */
class VirusScannerTest {

	@Test
	void cleanInfectedAndUnreachable() throws Exception {
		try (ServerSocket clamd = new ServerSocket(0)) {
			Thread server = new Thread(() -> answer(clamd, "stream: OK"), "fake-clamd-ok");
			server.start();
			scanner(clamd.getLocalPort()).check("hello".getBytes()); // no exception: clean
			server.join();

			server = new Thread(() -> answer(clamd, "stream: Eicar-Signature FOUND"), "fake-clamd-found");
			server.start();
			assertThatThrownBy(() -> scanner(clamd.getLocalPort()).check("virus".getBytes()))
				.isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("ERROR_FILE_INFECTED"));
			server.join();
		}
		int closedPort;
		try (ServerSocket s = new ServerSocket(0)) {
			closedPort = s.getLocalPort();
		}
		assertThatThrownBy(() -> scanner(closedPort).check("x".getBytes()))
			.isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("ERROR_SCAN_UNAVAILABLE"));
	}

	private static VirusScanner scanner(int port) {
		return new VirusScanner(new FileProperties("unused", true, "localhost", port));
	}

	/** Reads "zINSTREAM\0", then length-prefixed chunks until a zero length, then answers. */
	private static void answer(ServerSocket clamd, String reply) {
		try (Socket s = clamd.accept()) {
			DataInputStream in = new DataInputStream(s.getInputStream());
			in.readFully(new byte[10]);
			for (int n = in.readInt(); n > 0; n = in.readInt()) {
				in.readFully(new byte[n]);
			}
			OutputStream out = s.getOutputStream();
			out.write((reply + "\0").getBytes(StandardCharsets.US_ASCII));
			out.flush();
		}
		catch (IOException e) {
			throw new IllegalStateException(e);
		}
	}

}
