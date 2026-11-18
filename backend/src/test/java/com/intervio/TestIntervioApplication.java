package com.intervio;

import org.springframework.boot.SpringApplication;

public class TestIntervioApplication {

	public static void main(String[] args) {
		SpringApplication.from(IntervioApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
