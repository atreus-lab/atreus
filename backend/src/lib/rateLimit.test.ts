import { describe, expect, it } from "vitest";
import { SlidingWindowRateLimiter } from "./rateLimit.js";

describe("SlidingWindowRateLimiter", () => {
  it("allows up to max hits then blocks", () => {
    const lim = new SlidingWindowRateLimiter(2, 60_000);
    expect(lim.check("a", 1000).allowed).toBe(true);
    expect(lim.check("a", 1001).allowed).toBe(true);
    const blocked = lim.check("a", 1002);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after window", () => {
    const lim = new SlidingWindowRateLimiter(1, 1000);
    expect(lim.check("b", 0).allowed).toBe(true);
    expect(lim.check("b", 500).allowed).toBe(false);
    expect(lim.check("b", 1001).allowed).toBe(true);
  });
});
