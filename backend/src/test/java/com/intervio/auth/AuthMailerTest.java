package com.intervio.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;

class AuthMailerTest {

	@Test
	void templateValuesAreEscaped() {
		String html = AuthMailer.fill(Map.of("greeting", "Hello <script>alert(1)</script>,", "url",
				"http://localhost:5173/auth/link?token=a&b"));
		assertThat(html).contains("Hello &lt;script&gt;alert(1)&lt;/script&gt;,")
			.doesNotContain("<script>")
			.contains("href=\"http://localhost:5173/auth/link?token=a&amp;b\"")
			.contains("src=\"cid:logo\"");
	}

	@Test
	void everyLinkHasItsTextsInBothLanguages() {
		for (EmailLink link : EmailLink.values()) {
			for (boolean fr : new boolean[] { false, true }) {
				AuthMailer.Content c = AuthMailer.content(link, fr);
				assertThat(c.subject()).isNotBlank();
				assertThat(c.button()).isNotBlank();
			}
		}
	}

}
