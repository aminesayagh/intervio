package com.intervio.files;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Turns on the hourly removal of unused uploads. */
@Configuration
@EnableScheduling
class FilesConfig {

}
