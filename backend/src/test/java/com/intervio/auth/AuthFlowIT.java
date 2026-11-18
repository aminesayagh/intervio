package com.intervio.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.intervio.TestcontainersConfiguration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthFlowIT {

	private static final String PASSWORD = "correct horse battery";

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private JavaMailSender mail;

	@BeforeEach
	void resetMail() {
		clearInvocations(mail);
	}

	@Test
	void signUpConfirmThenLogIn() throws Exception {
		signUp("ada@example.com").andExpect(status().isNoContent());

		login("ada@example.com", PASSWORD).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("ERROR_EMAIL_NOT_CONFIRMED"));

		MockHttpSession session = useLink(lastLinkToken(), "home");
		mvc.perform(get("/api/auth/me").session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.fullName").value("Ada Lovelace"));

		login("ADA@example.com", PASSWORD).andExpect(status().isNoContent());
		mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
	}

	@Test
	void emailAlreadyUsed() throws Exception {
		signUp("grace@example.com").andExpect(status().isNoContent());
		signUp("grace@example.com").andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("ERROR_EMAIL_TAKEN"));
	}

	@Test
	void fiveFailuresBlockLogIn() throws Exception {
		signUp("alan@example.com");
		useLink(lastLinkToken(), "home");
		for (int i = 0; i < 4; i++) {
			login("alan@example.com", "wrong password!").andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("ERROR_AUTH_FAIL"));
		}
		login("alan@example.com", "wrong password!").andExpect(status().isTooManyRequests());
		login("alan@example.com", PASSWORD).andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("ERROR_TOO_MANY_ATTEMPTS"));
	}

	@Test
	void forgotPasswordNeverRevealsAccounts() throws Exception {
		postJson("/api/auth/password/forgot", "{\"email\":\"nobody@example.com\"}").andExpect(status().isNoContent());
		verify(mail, never()).send(any(SimpleMailMessage.class));
	}

	@Test
	void resetPasswordThenLogIn() throws Exception {
		signUp("linus@example.com");
		useLink(lastLinkToken(), "home");
		clearInvocations(mail);

		postJson("/api/auth/password/forgot", "{\"email\":\"linus@example.com\"}").andExpect(status().isNoContent());
		MockHttpSession session = useLink(lastLinkToken(), "reset-password");
		mvc.perform(post("/api/auth/password").session(session)
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"password\":\"a brand new password\"}")).andExpect(status().isNoContent());

		login("linus@example.com", "a brand new password").andExpect(status().isNoContent());
	}

	@Test
	void usedLinkIsNoLongerValid() throws Exception {
		signUp("barbara@example.com");
		String token = lastLinkToken();
		useLink(token, "home");
		postJson("/api/auth/token", "{\"token\":\"" + token + "\"}").andExpect(status().isGone())
			.andExpect(jsonPath("$.code").value("ERROR_LINK_INVALID"));
	}

	private ResultActions signUp(String email) throws Exception {
		return postJson("/api/auth/signup",
				"{\"fullName\":\"Ada Lovelace\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}");
	}

	private ResultActions login(String email, String password) throws Exception {
		return mvc.perform(post("/api/auth/login").with(csrf()).param("email", email).param("password", password));
	}

	private MockHttpSession useLink(String token, String next) throws Exception {
		return (MockHttpSession) postJson("/api/auth/token", "{\"token\":\"" + token + "\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.next").value(next))
			.andReturn()
			.getRequest()
			.getSession();
	}

	private ResultActions postJson(String url, String body) throws Exception {
		return mvc.perform(post(url).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private String lastLinkToken() {
		ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
		verify(mail, org.mockito.Mockito.atLeastOnce()).send(sent.capture());
		Matcher m = Pattern.compile("token=([\\w-]+)").matcher(sent.getValue().getText());
		assertThat(m.find()).isTrue();
		return m.group(1);
	}

}
