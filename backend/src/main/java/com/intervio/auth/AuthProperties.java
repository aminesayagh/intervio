package com.intervio.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param frontendUrl base URL of the frontend, used in email links and redirects
 * @param rememberMeKey secret that signs the "Remember me" cookie
 * @param mailFrom sender address of the emails
 */
@ConfigurationProperties("app")
public record AuthProperties(String frontendUrl, String rememberMeKey, String mailFrom) {
}
