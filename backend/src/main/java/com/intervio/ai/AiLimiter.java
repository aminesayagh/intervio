package com.intervio.ai;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/** Requests to the AI per person (decision 153): 20 in 10 minutes, 100 in a day. */
// ponytail: in-memory counters, reset on restart and not shared between instances, as
// AttemptLimiter; move to the database or Redis when the backend runs on more than one.
@Component
class AiLimiter {

	static final int PER_BURST = 20;

	static final Duration BURST = Duration.ofMinutes(10);

	static final int PER_DAY = 100;

	private final Clock clock;

	private final Map<String, Deque<Instant>> asked = new ConcurrentHashMap<>();

	AiLimiter() {
		this(Clock.systemUTC());
	}

	AiLimiter(Clock clock) {
		this.clock = clock;
	}

	/** Returns true and records the request if this person may ask now. */
	synchronized boolean allow(String person) {
		Instant now = clock.instant();
		Deque<Instant> times = asked.computeIfAbsent(person, key -> new ArrayDeque<>());
		while (!times.isEmpty() && times.peekFirst().isBefore(now.minus(Duration.ofDays(1)))) {
			times.pollFirst();
		}
		long recent = times.stream().filter(t -> t.isAfter(now.minus(BURST))).count();
		if (times.size() >= PER_DAY || recent >= PER_BURST) {
			return false;
		}
		times.addLast(now);
		return true;
	}

}
