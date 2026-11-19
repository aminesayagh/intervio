package com.intervio.core.companies;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest(properties = { "app.files.virus-scan=false", "app.files.root=${java.io.tmpdir}/intervio-test-files" })
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CompanyFlowIT {

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

		mvc.perform(get("/api/company").with(client)).andExpect(jsonPath("$.logoFileId").doesNotExist())
			.andExpect(jsonPath("$.name").value("Martin Industries SA"));
	}

	@Test
	void sameCompanyCannotBeRegisteredTwice() throws Exception {
		details(client("first@company.test"), "Acme", "DE", "HRB 1234").andExpect(status().isOk());
		details(client("second@company.test"), "Acme GmbH", "DE", "hrb1234").andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("ERROR_COMPANY_EXISTS"));
	}

	@Test
	void logoMustBeAFileUploadedByTheClientAsALogo() throws Exception {
		RequestPostProcessor client = client("grace@company.test");
		details(client, "Hopper Maintenance", "US", "12-3456789");
		json(client, "/api/company/logo", "{\"fileId\":\"00000000-0000-0000-0000-000000000000\"}")
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("ERROR_FILE_NOT_FOUND"));
	}

	@Test
	void onlyClientsHaveACompany() throws Exception {
		// A real account (sessions of unknown users are ended), seen with another role.
		users.save(User.client("Test Contractor", "contractor@company.test", User.LOCALE_EN));
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


}
