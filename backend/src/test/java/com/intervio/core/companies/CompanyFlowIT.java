package com.intervio.core.companies;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.intervio.TestcontainersConfiguration;
import com.intervio.auth.User;
import com.intervio.auth.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CompanyFlowIT {

	private static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0, 0 };

	@Autowired
	private MockMvc mvc;

	@Autowired
	private UserRepository users;

	@Test
	void onboardingSteps() throws Exception {
		RequestPostProcessor client = client("ada@company.test");
		mvc.perform(get("/api/company").with(client)).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("ERROR_NO_COMPANY"));

		details(client, "  Martin Industries ", "FR", "552 100 554 00025").andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Martin Industries"))
			.andExpect(jsonPath("$.registrationNumber").value("55210055400025"));

		// Coming back to step 1 updates the same company.
		details(client, "Martin Industries SA", "FR", "55210055400025").andExpect(status().isOk());

		json(client, "/api/company/industries", "{\"industries\":[3,1,3]}").andExpect(status().isOk())
			.andExpect(jsonPath("$.industries[0]").value(1))
			.andExpect(jsonPath("$.industries[1]").value(3));
		json(client, "/api/company/industries", "{\"industries\":[15]}").andExpect(status().isBadRequest());

		logo(client, PNG).andExpect(status().isNoContent());
		mvc.perform(get("/api/company/logo").with(client))
			.andExpect(status().isOk())
			.andExpect(content().contentType(MediaType.IMAGE_PNG));
		mvc.perform(get("/api/company").with(client)).andExpect(jsonPath("$.hasLogo").value(true))
			.andExpect(jsonPath("$.name").value("Martin Industries SA"));
	}

	@Test
	void sameCompanyCannotBeRegisteredTwice() throws Exception {
		details(client("first@company.test"), "Acme", "DE", "HRB 1234").andExpect(status().isOk());
		details(client("second@company.test"), "Acme GmbH", "DE", "hrb1234").andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("ERROR_COMPANY_EXISTS"));
	}

	@Test
	void logoMustBePngOrJpgUpToTwoMegabytes() throws Exception {
		RequestPostProcessor client = client("grace@company.test");
		details(client, "Hopper Maintenance", "US", "12-3456789");
		logo(client, "not an image".getBytes()).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("ERROR_LOGO_TYPE"));
		byte[] large = new byte[(int) CompanyController.MAX_LOGO_BYTES + 1];
		System.arraycopy(PNG, 0, large, 0, PNG.length);
		logo(client, large).andExpect(status().isPayloadTooLarge())
			.andExpect(jsonPath("$.code").value("ERROR_FILE_TOO_LARGE"));
	}

	@Test
	void onlyClientsHaveACompany() throws Exception {
		mvc.perform(get("/api/company").with(user("contractor@company.test").roles("CONTRACTOR")))
			.andExpect(status().isForbidden());
	}

	private RequestPostProcessor client(String email) {
		users.save(User.client("Test Client", email, User.LOCALE_EN));
		return user(email).roles("CLIENT");
	}

	private ResultActions details(RequestPostProcessor client, String name, String country, String number)
			throws Exception {
		return json(client, "/api/company", "{\"name\":\"" + name + "\",\"country\":\"" + country
				+ "\",\"registrationNumber\":\"" + number + "\"}");
	}

	private ResultActions json(RequestPostProcessor client, String url, String body) throws Exception {
		return mvc.perform(put(url).with(client).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private ResultActions logo(RequestPostProcessor client, byte[] bytes) throws Exception {
		return mvc.perform(multipart(HttpMethod.PUT, "/api/company/logo")
			.file(new MockMultipartFile("file", "logo.png", "image/png", bytes))
			.with(client)
			.with(csrf()));
	}

}
