import { randomBytes } from "crypto";
import { hashEmail, normalizeEmail } from "./emailHash.js";

export type PendingVerification = {
  challenge: string;
  createdAt: number;
  expiresAt: number;
};

export type VerifiedEmail = {
  verifiedAt: number;
  expiresAt: number;
};

const CHALLENGE_TTL_MS = Number(process.env.EMAIL_CHALLENGE_TTL_MS ?? 24 * 60 * 60 * 1000);
const VERIFIED_TTL_MS = Number(process.env.EMAIL_VERIFIED_TTL_MS ?? 60 * 60 * 1000);

/** emailHash (hex) → pending challenge. Never stores raw email. */
const pending = new Map<string, PendingVerification>();
/** emailHash (hex) → verified record. */
const verified = new Map<string, VerifiedEmail>();

function prune(now = Date.now()): void {
  for (const [k, v] of pending) {
    if (v.expiresAt <= now) pending.delete(k);
  }
  for (const [k, v] of verified) {
    if (v.expiresAt <= now) verified.delete(k);
  }
}

export function createChallenge(email: string, now = Date.now()): {
  emailHash: string;
  challenge: string;
  expiresAt: number;
} {
  prune(now);
  const emailHash = hashEmail(email);
  const challenge = randomBytes(16).toString("hex");
  const expiresAt = now + CHALLENGE_TTL_MS;
  pending.set(emailHash, { challenge, createdAt: now, expiresAt });
  // Starting a new challenge invalidates a previous verification for this hash.
  verified.delete(emailHash);
  return { emailHash, challenge, expiresAt };
}

export function getPending(emailHash: string, now = Date.now()): PendingVerification | undefined {
  prune(now);
  const p = pending.get(emailHash);
  if (!p || p.expiresAt <= now) {
    pending.delete(emailHash);
    return undefined;
  }
  return p;
}

export function markVerified(emailHash: string, now = Date.now()): VerifiedEmail {
  prune(now);
  pending.delete(emailHash);
  const record: VerifiedEmail = {
    verifiedAt: now,
    expiresAt: now + VERIFIED_TTL_MS,
  };
  verified.set(emailHash, record);
  return record;
}

export function isEmailHashVerified(emailHash: string, now = Date.now()): boolean {
  prune(now);
  const v = verified.get(emailHash);
  if (!v || v.expiresAt <= now) {
    verified.delete(emailHash);
    return false;
  }
  return true;
}

/** Convenience: verify by raw email (normalized + hashed). */
export function isEmailVerified(email: string, now = Date.now()): boolean {
  return isEmailHashVerified(hashEmail(normalizeEmail(email)), now);
}

/** Test helper — clears all state. */
export function resetEmailVerificationStore(): void {
  pending.clear();
  verified.clear();
}
