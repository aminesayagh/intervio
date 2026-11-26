package com.intervio;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

class LocalEnvTest {

	@Test
	void readsEnvStyleNamesAsSpringProperties(@TempDir Path dir) throws Exception {
		Path file = dir.resolve(".env");
		Files.writeString(file, """
				# Google sign-in
				SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID=abc
				OPENAI_API_KEY="quoted"

				not a line
				""");
		StandardEnvironment environment = new StandardEnvironment();
		environment.getPropertySources().addLast(new SystemEnvironmentPropertySource(LocalEnv.NAME, LocalEnv.read(file)));
		assertThat(Binder.get(environment)
			.bind("spring.security.oauth2.client.registration.google.client-id", String.class)
			.get()).isEqualTo("abc");
		assertThat(environment.getProperty("OPENAI_API_KEY")).isEqualTo("quoted");
	}

}
