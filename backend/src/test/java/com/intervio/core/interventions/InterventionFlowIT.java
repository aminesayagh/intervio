package com.intervio.core.interventions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.intervio.TestcontainersConfiguration;
import com.intervio.api.Uuids;
import com.intervio.auth.User;
import com.intervio.auth.UserRepository;
import com.jayway.jsonpath.JsonPath;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Creating, listing, opening and publishing interventions (decisions 92-95). */
@SpringBootTest(properties = { "app.files.virus-scan=false", "app.files.root=${java.io.tmpdir}/intervio-interventions-it" })
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class InterventionFlowIT {

	private static final String DEADLINE = LocalDate.now().plusMonths(1).toString();

	private static final String ADDRESS = "{\"street\":\"12 rue des Ateliers\",\"city\":\"Lyon\",\"postalCode\":\"69007\"}";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private UserRepository users;

	@Test
	void createOpenAndPublish() throws Exception {
		RequestPostProcessor client = client("first@interventions.test", "FR-1");

		// The first intervention asks the company's registered address.
		send(client, post("/api/interventions"), create("Pump overhaul", null)).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("ERROR_ADDRESS_REQUIRED"));

		String fileId = JsonPath.read(mvc.perform(multipart("/api/files")
			.file(new MockMultipartFile("file", "Pump specification.pdf", null, "%PDF-1.7 spec".getBytes()))
			.param("purpose", "2")
			.with(client)
			.with(csrf())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");

		String body = send(client, post("/api/interventions"),
				"{\"title\":\" Pump overhaul \",\"description\":\"Seals and bearings\",\"offerDeadline\":\"" + DEADLINE
						+ "\",\"specificationFileIds\":[\"" + fileId + "\"],\"address\":" + ADDRESS + "}")
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.title").value("Pump overhaul"))
			.andExpect(jsonPath("$.status").value("draft"))
			.andExpect(jsonPath("$.documents[0].name").value("Pump specification.pdf"))
			.andExpect(jsonPath("$.documents[0].type").value("specification"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		String id = JsonPath.read(body, "$.id");
		assertThat(java.util.UUID.fromString(id).version()).isEqualTo(7);
		mvc.perform(get("/api/company").with(client)).andExpect(jsonPath("$.hasAddress").value(true));

		// Later interventions no longer need the address.
		send(client, post("/api/interventions"), create("Boiler inspection", null)).andExpect(status().isCreated());

		// The sidebar lists the last opened first; opening one moves it to the top.
		mvc.perform(get("/api/interventions/recent").with(client))
			.andExpect(jsonPath("$.total").value(2))
			.andExpect(jsonPath("$.items[0].title").value("Boiler inspection"));
		mvc.perform(get("/api/interventions/" + id).with(client)).andExpect(status().isOk());
		mvc.perform(get("/api/interventions/recent").with(client))
			.andExpect(jsonPath("$.items[0].title").value("Pump overhaul"))
			.andExpect(jsonPath("$.items[0].documentCount").value(1));

		mvc.perform(get("/api/interventions").with(client)).andExpect(jsonPath("$.length()").value(2));

		send(client, post("/api/interventions/" + id + "/publish"), "").andExpect(jsonPath("$.status").value("published"));
		send(client, post("/api/interventions/" + id + "/publish"), "").andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("ERROR_ALREADY_PUBLISHED"));
	}

	@Test
	void offerDeadlineMustBeInTheFuture() throws Exception {
		RequestPostProcessor client = client("deadline@interventions.test", "FR-2");
		send(client, post("/api/interventions"),
				"{\"title\":\"Late\",\"offerDeadline\":\"" + LocalDate.now() + "\",\"address\":" + ADDRESS + "}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("ERROR_DEADLINE_PAST"));
	}

	@Test
	void anotherCompanyCannotOpenIt() throws Exception {
		RequestPostProcessor owner = client("owner@interventions.test", "FR-3");
		String id = JsonPath.read(send(owner, post("/api/interventions"), create("Private", ADDRESS))
			.andReturn().getResponse().getContentAsString(), "$.id");
		RequestPostProcessor other = client("other@interventions.test", "FR-4");
		mvc.perform(get("/api/interventions/" + id).with(other)).andExpect(status().isNotFound());
		mvc.perform(get("/api/interventions/" + Uuids.v7()).with(owner)).andExpect(status().isNotFound());
	}

	/** A published intervention keeps the account; with drafts only, it is deleted (decision 90, #76). */
	@Test
	void aPublishedInterventionKeepsTheAccount() throws Exception {
		RequestPostProcessor keeps = client("keeps@interventions.test", "FR-90");
		String id = JsonPath.read(send(keeps, post("/api/interventions"), create("Valve check", ADDRESS))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString(), "$.id");
		send(keeps, post("/api/interventions/" + id + "/publish"), "").andExpect(jsonPath("$.status").value("published"));
		send(keeps, delete("/api/account"), "{\"email\":\"keeps@interventions.test\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("ERROR_ACCOUNT_HAS_INTERVENTIONS"));

		RequestPostProcessor leaves = client("leaves@interventions.test", "FR-91");
		send(leaves, post("/api/interventions"), create("Draft only", ADDRESS)).andExpect(status().isCreated());
		send(leaves, delete("/api/account"), "{\"email\":\"leaves@interventions.test\"}")
			.andExpect(status().isNoContent());
	}

	private static String create(String title, String address) {
		return "{\"title\":\"" + title + "\",\"offerDeadline\":\"" + DEADLINE + "\""
				+ (address == null ? "" : ",\"address\":" + address) + "}";
	}

	/** A client with a company (onboarding step 1). */
	private RequestPostProcessor client(String email, String number) throws Exception {
		users.save(User.client("Test Client", email, User.LOCALE_EN));
		RequestPostProcessor client = user(email).roles("CLIENT");
		send(client, put("/api/company"), "{\"name\":\"Test Co\",\"country\":\"FR\",\"registrationNumber\":\"" + number + "\"}")
			.andExpect(status().isOk());
		return client;
	}

	private ResultActions send(RequestPostProcessor client, MockHttpServletRequestBuilder request, String json)
			throws Exception {
		return mvc.perform(request.with(client).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json));
	}

}
