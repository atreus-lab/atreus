/**
 * Simple in-memory sliding-window rate limiter.
 * Matches the existing in-memory batch store pattern (single-instance).
 */

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number };

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxHits: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const prev = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (prev.length >= this.maxHits) {
      const oldest = prev[0]!;
      this.hits.set(key, prev);
      return { allowed: false, retryAfterMs: Math.max(0, oldest + this.windowMs - now) };
    }
    prev.push(now);
    this.hits.set(key, prev);
    return { allowed: true };
  }

  /** Test helper */
  reset(): void {
    this.hits.clear();
  }
}

/** Email verify/confirm endpoints: 5 requests / 15 min per key. */
export const emailEndpointLimiter = new SlidingWindowRateLimiter(5, 15 * 60 * 1000);
