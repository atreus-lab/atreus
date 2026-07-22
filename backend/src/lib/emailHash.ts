import { createHash } from "crypto";

/** Normalize email the same way batch creation does, then sha256 → hex. */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  const n = normalizeEmail(email);
  return n.length > 3 && n.length <= 254 && EMAIL_RE.test(n);
}

const HEX_64 = /^[0-9a-f]{64}$/;

export function isEmailHashHex(value: string): boolean {
  return HEX_64.test(value);
}
