package com.intervio.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Attempt limits (decision 70): 5 failed log-ins in a row block password log-in for 15
 * minutes; each kind of email link can be requested once per minute and 5 times per hour.
 */
// ponytail: in-memory counters, reset on restart and not shared between instances; move to
// the database or Redis when the backend runs on more than one instance.
@Component
public class AttemptLimiter {

	static final int MAX_FAILURES = 5;

	static final Duration LOCK = Duration.ofMinutes(15);

	static final int MAX_LINKS_PER_HOUR = 5;

	private final Clock clock;

	private final Map<String, Failures> failures = new ConcurrentHashMap<>();

	private final Map<String, Deque<Instant>> links = new ConcurrentHashMap<>();

	public AttemptLimiter() {
		this(Clock.systemUTC());
	}

	AttemptLimiter(Clock clock) {
		this.clock = clock;
	}

	public boolean isLocked(String email) {
		Failures f = failures.get(email);
		return f != null && f.lockedUntil != null && clock.instant().isBefore(f.lockedUntil);
	}

	public void recordFailure(String email) {
		failures.compute(email, (key, f) -> {
			Failures next = (f == null || f.lockedUntil != null) ? new Failures() : f;
			next.count++;
			if (next.count >= MAX_FAILURES) {
				next.lockedUntil = clock.instant().plus(LOCK);
			}
			return next;
		});
	}

	public void recordSuccess(String email) {
		failures.remove(email);
	}

	/** Returns true and records the request if a link of this kind may be sent now. */
	public synchronized boolean allowLink(String kind, String email) {
		Instant now = clock.instant();
		Deque<Instant> sent = links.computeIfAbsent(kind + ":" + email, key -> new ArrayDeque<>());
		while (!sent.isEmpty() && sent.peekFirst().isBefore(now.minus(Duration.ofHours(1)))) {
			sent.pollFirst();
		}
		boolean tooSoon = !sent.isEmpty() && sent.peekLast().isAfter(now.minus(Duration.ofMinutes(1)));
		if (tooSoon || sent.size() >= MAX_LINKS_PER_HOUR) {
			return false;
		}
		sent.addLast(now);
		return true;
	}

	private static final class Failures {

		int count;

		Instant lockedUntil;

	}

}
