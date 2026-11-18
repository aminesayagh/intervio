package com.intervio.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class AttemptLimiterTest {

	private Instant now = Instant.parse("2026-11-18T10:00:00Z");

	private final AttemptLimiter limiter = new AttemptLimiter(new Clock() {
		@Override
		public Instant instant() {
			return now;
		}

		@Override
		public ZoneId getZone() {
			return ZoneId.of("UTC");
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}
	});

	@Test
	void locksAfterFiveFailuresForFifteenMinutes() {
		for (int i = 0; i < 4; i++) {
			limiter.recordFailure("a@b.c");
		}
		assertThat(limiter.isLocked("a@b.c")).isFalse();
		limiter.recordFailure("a@b.c");
		assertThat(limiter.isLocked("a@b.c")).isTrue();
		now = now.plus(Duration.ofMinutes(15));
		assertThat(limiter.isLocked("a@b.c")).isFalse();
	}

	@Test
	void successResetsTheCount() {
		for (int i = 0; i < 4; i++) {
			limiter.recordFailure("a@b.c");
		}
		limiter.recordSuccess("a@b.c");
		limiter.recordFailure("a@b.c");
		assertThat(limiter.isLocked("a@b.c")).isFalse();
	}

	@Test
	void linksOncePerMinuteAndFivePerHour() {
		assertThat(limiter.allowLink("SIGN_IN", "a@b.c")).isTrue();
		assertThat(limiter.allowLink("SIGN_IN", "a@b.c")).isFalse();
		assertThat(limiter.allowLink("RESET", "a@b.c")).isTrue(); // other kind of link
		for (int i = 0; i < 4; i++) {
			now = now.plus(Duration.ofMinutes(2));
			assertThat(limiter.allowLink("SIGN_IN", "a@b.c")).isTrue();
		}
		now = now.plus(Duration.ofMinutes(2));
		assertThat(limiter.allowLink("SIGN_IN", "a@b.c")).isFalse(); // sixth in the hour
		now = now.plus(Duration.ofHours(1));
		assertThat(limiter.allowLink("SIGN_IN", "a@b.c")).isTrue();
	}

}
