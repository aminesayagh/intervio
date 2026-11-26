package com.intervio;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

/**
 * Local secrets (MAS-39): the repository's root .env, read however the backend is started
 * (make, ./mvnw, the IDE), from the repository root or from backend/. Its lines count as
 * environment variables, below the real ones, so the same names work in both
 * (SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID…). Optional: servers and CI
 * have no .env and set real environment variables.
 */
public class LocalEnv implements EnvironmentPostProcessor {

	// Spring maps SPRING_SECURITY_… to spring.security.… only in a source with this suffix.
	static final String NAME = "localEnvFile-" + StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME;

	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		for (Path file : List.of(Path.of(".env"), Path.of("../.env"))) {
			if (Files.isRegularFile(file)) {
				environment.getPropertySources()
					.addAfter(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
							new SystemEnvironmentPropertySource(NAME, read(file)));
				return;
			}
		}
	}

	/** KEY=value lines; blank lines and # comments are skipped, surrounding quotes removed. */
	static Map<String, Object> read(Path file) {
		try {
			Map<String, Object> values = new LinkedHashMap<>();
			for (String line : Files.readAllLines(file)) {
				String trimmed = line.strip();
				int equals = trimmed.indexOf('=');
				if (trimmed.isEmpty() || trimmed.startsWith("#") || equals < 1) {
					continue;
				}
				String value = trimmed.substring(equals + 1).strip();
				if (value.length() >= 2 && (value.startsWith("\"") && value.endsWith("\"")
						|| value.startsWith("'") && value.endsWith("'"))) {
					value = value.substring(1, value.length() - 1);
				}
				values.put(trimmed.substring(0, equals).strip(), value);
			}
			return values;
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

}
