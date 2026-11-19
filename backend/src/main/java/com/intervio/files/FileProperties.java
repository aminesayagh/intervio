package com.intervio.files;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param root folder where uploaded files are kept (outside the web server, never served directly)
 * @param virusScan false only in tests; otherwise every upload is scanned by ClamAV
 */
@ConfigurationProperties("app.files")
public record FileProperties(String root, boolean virusScan, String clamavHost, int clamavPort) {
}
