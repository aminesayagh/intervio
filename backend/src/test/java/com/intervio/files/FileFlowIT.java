package com.intervio.files;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.intervio.TestcontainersConfiguration;
import com.intervio.auth.User;
import com.intervio.auth.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest(properties = { "app.files.virus-scan=false", "app.files.root=${java.io.tmpdir}/intervio-test-files" })
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class FileFlowIT {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private UserRepository users;

	@Test
	void logoIsUploadedAttachedAndReadOnlyByItsCompany() throws Exception {
		RequestPostProcessor owner = client("owner@files.test");
		json(owner, "/api/company", "{\"name\":\"Files Co\",\"country\":\"FR\",\"registrationNumber\":\"F-1\"}");

		String id = id(upload(owner, 1, "my logo.png", FileTypeTest.image("png")).andExpect(status().isCreated())
			.andExpect(jsonPath("$.contentType").value("image/png")));
		org.assertj.core.api.Assertions.assertThat(java.util.UUID.fromString(id).version())
			.as("public ids are UUID v7")
			.isEqualTo(7);
		json(owner, "/api/company/logo", "{\"fileId\":\"" + id + "\"}").andExpect(status().isOk())
			.andExpect(jsonPath("$.logoFileId").value(id));

		mvc.perform(get("/api/files/" + id).with(owner))
			.andExpect(status().isOk())
			.andExpect(header().string("Content-Type", "image/png"))
			.andExpect(header().string("Content-Disposition", containsString("inline")))
			.andExpect(header().string("Content-Security-Policy", "default-src 'none'; sandbox"));

		// Another logged-in user cannot read it, and is not told it exists.
		mvc.perform(get("/api/files/" + id).with(client("stranger@files.test"))).andExpect(status().isNotFound());
	}

	@Test
	void documentsDownloadAsAttachments() throws Exception {
		RequestPostProcessor uploader = client("docs@files.test");
		String id = id(upload(uploader, 2, "Specifications.docx", FileTypeTest.office("word/document.xml"))
			.andExpect(status().isCreated()));
		mvc.perform(get("/api/files/" + id).with(uploader))
			.andExpect(status().isOk())
			.andExpect(header().string("Content-Disposition", containsString("attachment")));
	}

	@Test
	void wrongTypesAndPurposesAreRefused() throws Exception {
		RequestPostProcessor uploader = client("refused@files.test");
		upload(uploader, 2, "report.pdf.exe", "MZ binary".getBytes()).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("ERROR_FILE_TYPE"));
		// A PDF is a document, not a logo.
		upload(uploader, 1, "logo.pdf", "%PDF-1.7".getBytes()).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("ERROR_FILE_TYPE"));
		upload(uploader, 1, "big.png", new byte[2 * 1024 * 1024 + 1]).andExpect(status().isPayloadTooLarge());
	}

	@Test
	void filesNeedALoggedInUser() throws Exception {
		mvc.perform(get("/api/files/00000000-0000-0000-0000-000000000000")).andExpect(status().isUnauthorized());
	}

	private RequestPostProcessor client(String email) {
		users.save(User.client("Test Client", email, User.LOCALE_EN));
		return user(email).roles("CLIENT");
	}

	private ResultActions upload(RequestPostProcessor who, int purpose, String name, byte[] bytes) throws Exception {
		return mvc.perform(multipart("/api/files").file(new MockMultipartFile("file", name, null, bytes))
			.param("purpose", String.valueOf(purpose))
			.with(who)
			.with(csrf()));
	}

	private ResultActions json(RequestPostProcessor who, String url, String body) throws Exception {
		return mvc.perform(put(url).with(who).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private static String id(ResultActions result) throws Exception {
		return JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.id");
	}

}
