package com.intervio.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class AiLimiterTest {

	/** A clock the test moves forward. */
	static final class Moving extends Clock {

		Instant now = Instant.parse("2026-11-25T08:00:00Z");

		@Override
		public Instant instant() {
			return now;
		}

		@Override
		public java.time.ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(java.time.ZoneId zone) {
			return this;
		}

	}

	@Test
	void twentyInTenMinutesAHundredInADayPerPerson() {
		Moving clock = new Moving();
		AiLimiter limiter = new AiLimiter(clock);
		for (int i = 0; i < AiLimiter.PER_BURST; i++) {
			assertThat(limiter.allow("a")).isTrue();
		}
		assertThat(limiter.allow("a")).isFalse();
		assertThat(limiter.allow("b")).isTrue(); // per person

		for (int burst = 1; burst < AiLimiter.PER_DAY / AiLimiter.PER_BURST; burst++) {
			clock.now = clock.now.plus(AiLimiter.BURST).plusSeconds(1);
			for (int i = 0; i < AiLimiter.PER_BURST; i++) {
				assertThat(limiter.allow("a")).isTrue();
			}
		}
		clock.now = clock.now.plus(AiLimiter.BURST).plusSeconds(1);
		assertThat(limiter.allow("a")).isFalse(); // a hundred today

		clock.now = clock.now.plus(Duration.ofDays(1));
		assertThat(limiter.allow("a")).isTrue();
	}

}
