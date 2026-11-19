package com.intervio.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.intervio.TestcontainersConfiguration;
import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Settings: profile, email change, password, other devices, account deletion (decisions 86-90). */
@SpringBootTest(properties = { "app.files.virus-scan=false", "app.files.root=${java.io.tmpdir}/intervio-settings-it" })
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SettingsFlowIT {

	private static final String PASSWORD = "correct horse battery";

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private JavaMailSender mail;

	@BeforeEach
	void resetMail() {
		clearInvocations(mail);
		when(mail.createMimeMessage()).thenAnswer(i -> new MimeMessage((Session) null));
	}

	@Test
	void renameAndChangePassword() throws Exception {
		MockHttpSession session = account("rename@example.com");
		send(session, put("/api/profile"), "{\"fullName\":\"Ada King\"}").andExpect(jsonPath("$.fullName").value("Ada King"))
			.andExpect(jsonPath("$.hasPassword").value(true))
			.andExpect(jsonPath("$.googleConnected").value(false));

		send(session, put("/api/profile/password"), "{\"currentPassword\":\"wrong password!\",\"newPassword\":\"another long password\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("ERROR_WRONG_PASSWORD"));
		send(session, put("/api/profile/password"), "{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"another long password\"}")
			.andExpect(status().isNoContent());
		login("rename@example.com", "another long password").andExpect(status().isNoContent());
	}

	@Test
	void changeEmailAfterConfirmation() throws Exception {
		MockHttpSession session = account("old@example.com");
		send(session, post("/api/profile/email"), "{\"email\":\"New@Example.com\"}")
			.andExpect(jsonPath("$.email").value("old@example.com"))
			.andExpect(jsonPath("$.pendingEmail").value("new@example.com"));

		MockHttpSession confirmed = useLink(lastLinkToken());
		mvc.perform(get("/api/auth/me").session(confirmed)).andExpect(jsonPath("$.email").value("new@example.com"))
			.andExpect(jsonPath("$.pendingEmail").doesNotExist());
		// The old session named the old email: it is ended.
		mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
		login("new@example.com", PASSWORD).andExpect(status().isNoContent());
	}

	@Test
	void aCancelledChangeLinkNoLongerWorks() throws Exception {
		MockHttpSession session = account("cancel@example.com");
		send(session, post("/api/profile/email"), "{\"email\":\"other@example.com\"}").andExpect(status().isOk());
		String token = lastLinkToken();
		send(session, delete("/api/profile/email"), "").andExpect(jsonPath("$.pendingEmail").doesNotExist());
		mvc.perform(post("/api/auth/token").with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"token\":\"" + token + "\"}")).andExpect(status().isGone());
	}

	@Test
	void logOutOfOtherDevices() throws Exception {
		MockHttpSession other = account("devices@example.com");
		MockHttpSession here = (MockHttpSession) login("devices@example.com", PASSWORD).andReturn().getRequest().getSession();
		Thread.sleep(5); // both sessions exist strictly before the cut-off
		MockHttpSession kept = (MockHttpSession) send(here, post("/api/profile/sessions/end"), "")
			.andExpect(status().isNoContent())
			.andReturn()
			.getRequest()
			.getSession();
		mvc.perform(get("/api/auth/me").session(other)).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/auth/me").session(kept)).andExpect(status().isOk());
	}

	@Test
	void deleteAccount() throws Exception {
		MockHttpSession session = account("delete@example.com");
		send(session, delete("/api/account"), "{\"email\":\"someone@example.com\"}").andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("ERROR_EMAIL_MISMATCH"));
		send(session, delete("/api/account"), "{\"email\":\"Delete@example.com\"}").andExpect(status().isNoContent());
		login("delete@example.com", PASSWORD).andExpect(status().isUnauthorized());
	}

	/** Signs up with a password, confirms the email, and returns the logged-in session. */
	private MockHttpSession account(String email) throws Exception {
		mvc.perform(post("/api/auth/signup").with(csrf()).contentType(MediaType.APPLICATION_JSON)
			.content("{\"fullName\":\"Ada Lovelace\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
			.andExpect(status().isNoContent());
		return useLink(lastLinkToken());
	}

	private MockHttpSession useLink(String token) throws Exception {
		return (MockHttpSession) mvc
			.perform(post("/api/auth/token").with(csrf()).contentType(MediaType.APPLICATION_JSON)
				.content("{\"token\":\"" + token + "\"}"))
			.andExpect(status().isOk())
			.andReturn()
			.getRequest()
			.getSession();
	}

	private org.springframework.test.web.servlet.ResultActions login(String email, String password) throws Exception {
		return mvc.perform(post("/api/auth/login").with(csrf()).param("email", email).param("password", password));
	}

	private org.springframework.test.web.servlet.ResultActions send(MockHttpSession session,
			MockHttpServletRequestBuilder request, String json) throws Exception {
		return mvc.perform(request.session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private String lastLinkToken() throws Exception {
		ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
		verify(mail, Mockito.atLeastOnce()).send(sent.capture());
		Matcher m = Pattern.compile("token=([\\w-]+)").matcher(plainText(sent.getValue()));
		assertThat(m.find()).isTrue();
		return m.group(1);
	}

	private static String plainText(Part part) throws Exception {
		Object content = part.getContent();
		if (content instanceof String text) {
			return part.isMimeType("text/plain") ? text : null;
		}
		if (content instanceof Multipart multipart) {
			for (int i = 0; i < multipart.getCount(); i++) {
				BodyPart child = multipart.getBodyPart(i);
				String text = plainText(child);
				if (text != null) {
					return text;
				}
			}
		}
		return null;
	}

}
