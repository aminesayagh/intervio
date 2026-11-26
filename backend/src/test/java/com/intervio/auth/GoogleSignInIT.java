package com.intervio.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.intervio.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.web.servlet.MockMvc;

/** MAS-38: the sign-in screens know whether Google works, and Google's addresses never end on an error page. */
@SpringBootTest(properties = {
		"spring.security.oauth2.client.registration.google.client-id=test-client",
		"spring.security.oauth2.client.registration.google.client-secret=test-secret" })
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class GoogleSignInIT {

	@Autowired
	private MockMvc mvc;

	@Test
	void googleConfigured() throws Exception {
		mvc.perform(get("/api/auth/providers")).andExpect(status().isOk()).andExpect(jsonPath("$.google").value(true));
		mvc.perform(get("/oauth2/authorization/google")).andExpect(status().is3xxRedirection());
	}

	@Test
	void unknownGoogleAddressGoesBackToLogIn() throws Exception {
		mvc.perform(get("/oauth2/somewhere"))
			.andExpect(status().isFound())
			.andExpect(header().string("Location", "http://localhost:5173/login?error=google"));
	}

	@Test
	void googleNotConfigured() {
		GoogleController controller = new GoogleController(
				new StaticListableBeanFactory().getBeanProvider(ClientRegistrationRepository.class),
				new AuthProperties("http://localhost:5173", "key", "from@example.com"));
		assertThat(controller.providers().google()).isFalse();
	}

}
