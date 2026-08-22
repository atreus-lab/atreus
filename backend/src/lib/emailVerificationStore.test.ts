import { describe, expect, it } from "vitest";
import { hashEmail } from "./emailHash.js";
import {
  createChallenge,
  getPending,
  isEmailHashVerified,
  markVerified,
  registerChallengeAttempt,
  remainingChallengeAttempts,
  resetEmailVerificationStore,
} from "./emailVerificationStore.js";

describe("email verification store", () => {
  it("issues a challenge keyed by email hash", () => {
    resetEmailVerificationStore();
    const { emailHash, challenge, expiresAt } = createChallenge("alice@example.com");
    expect(emailHash).toBe(hashEmail("alice@example.com"));
    expect(challenge).toMatch(/^[0-9a-f]{32}$/);
    expect(expiresAt).toBeGreaterThan(Date.now());
  });

  it("challenge is single-use: markVerified consumes the pending record", () => {
    resetEmailVerificationStore();
    const { emailHash } = createChallenge("bob@example.com");
    expect(getPending(emailHash)).toBeDefined();
    markVerified(emailHash);
    expect(getPending(emailHash)).toBeUndefined();
    expect(isEmailHashVerified(emailHash)).toBe(true);
  });

  it("registerChallengeAttempt caps brute-force attempts and burns the challenge", () => {
    resetEmailVerificationStore();
    const { emailHash } = createChallenge("eve@example.com");
    for (let i = 0; i < 5; i++) {
      expect(registerChallengeAttempt(emailHash)).toBe(true);
    }
    expect(remainingChallengeAttempts(emailHash)).toBe(0);
    // 6th attempt is refused and the challenge is burned.
    expect(registerChallengeAttempt(emailHash)).toBe(false);
    expect(getPending(emailHash)).toBeUndefined();
  });

  it("starting a new challenge invalidates a previous verification", () => {
    resetEmailVerificationStore();
    const { emailHash } = createChallenge("carol@example.com");
    markVerified(emailHash);
    expect(isEmailHashVerified(emailHash)).toBe(true);
    createChallenge("carol@example.com");
    expect(isEmailHashVerified(emailHash)).toBe(false);
  });

  it("expired challenges are not returned", () => {
    resetEmailVerificationStore();
    const now = Date.now();
    const { emailHash } = createChallenge("dave@example.com", now - 25 * 60 * 60 * 1000);
    expect(getPending(emailHash)).toBeUndefined();
    expect(registerChallengeAttempt(emailHash)).toBe(false);
  });
});
