package com.intervio.api;

import java.security.SecureRandom;
import java.util.UUID;

/** UUID v7 (RFC 9562) for rows inserted without Hibernate's generator. */
public final class Uuids {

	private static final SecureRandom RANDOM = new SecureRandom();

	private Uuids() {
	}

	public static UUID v7() {
		long millis = System.currentTimeMillis();
		long msb = (millis << 16) | 0x7000L | (RANDOM.nextInt() & 0x0FFFL);
		long lsb = (RANDOM.nextLong() & 0x3FFFFFFFFFFFFFFFL) | 0x8000000000000000L;
		return new UUID(msb, lsb);
	}

}
