package com.intervio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class IntervioApplication {

	public static void main(String[] args) {
		SpringApplication.run(IntervioApplication.class, args);
	}

}
