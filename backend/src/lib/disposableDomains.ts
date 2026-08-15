import { normalizeEmail } from "./emailHash.js";

/**
 * Disposable / throwaway email providers rejected by the email-ownership
 * oracle: a burner address defeats the point of proving long-term control of
 * an inbox before funds are bound to it. Extend via EMAIL_BLOCKED_DOMAINS
 * (comma-separated, merged with this default list).
 */
const DEFAULT_BLOCKED_DOMAINS = [
  "10minutemail.com",
  "dispostable.com",
  "getnada.com",
  "guerrillamail.com",
  "mail-drop.cc",
  "maildrop.cc",
  "mailinator.com",
  "sharklasers.com",
  "tempmail.com",
  "tempmailo.com",
  "trashmail.com",
  "yopmail.com",
];

function blockedSet(extraDomains: string[] = []): Set<string> {
  const fromEnv = (process.env.EMAIL_BLOCKED_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_BLOCKED_DOMAINS, ...fromEnv, ...extraDomains.map((d) => d.toLowerCase())]);
}

/** True when the email's domain (or its parent) is a known disposable provider. */
export function isDisposableEmail(email: string, extraDomains: string[] = []): boolean {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at < 0) return false;
  const domain = normalized.slice(at + 1);
  const blocked = blockedSet(extraDomains);
  if (blocked.has(domain)) return true;
  // Block subdomains of blocked providers (e.g. x.mailinator.com).
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    if (blocked.has(parts.slice(i).join("."))) return true;
  }
  return false;
}
