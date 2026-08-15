import { normalizeEmail } from "./emailHash.js";

export type DkimVerifyResult = {
  ok: boolean;
  fromAddress?: string;
  signingDomain?: string;
  error?: string;
};

export type DkimVerifier = (rawMessage: string | Buffer) => Promise<DkimVerifyResult>;

/** Result of strict structural validation of the DKIM-Signature header (RFC 6376). */
export type DkimHeaderValidation =
  | {
      ok: true;
      signingDomain: string;
      selector: string;
      algorithm: string;
      signedHeaders: string[];
      signedAt?: number;
      expiresAt?: number;
    }
  | { ok: false; error: string };

/** Max age of an accepted signature (replay window), default 7 days. */
const DKIM_MAX_AGE_MS = Number(process.env.EMAIL_DKIM_MAX_AGE_MS ?? 7 * 24 * 60 * 60 * 1000);
/** Allowed clock skew for future-dated `t=` timestamps. */
const DKIM_CLOCK_SKEW_MS = 5 * 60 * 1000;

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const ALLOWED_ALGS = new Set(["rsa-sha256", "ed25519-sha256"]);
const CANON_RE = /^(simple|relaxed)\/(simple|relaxed)$/;

function splitHeaders(rawMessage: string): { headerBlock: string; body: string } {
  const sep = rawMessage.search(/\r?\n\r?\n/);
  if (sep < 0) return { headerBlock: rawMessage, body: "" };
  const bodyStart = rawMessage.indexOf("\n", sep + 1) + 1;
  return { headerBlock: rawMessage.slice(0, sep), body: rawMessage.slice(bodyStart) };
}

/** Count occurrences of a named header (case-insensitive) in the unfolded header block. */
function countHeader(headerBlock: string, name: string): number {
  const re = new RegExp(`^${name}:`, "gim");
  return (headerBlock.match(re) ?? []).length;
}

/** Extract the first named header value, unfolded; undefined when absent. */
function getHeaderValue(headerBlock: string, name: string): string | undefined {
  const unfolded = headerBlock.replace(/\r?\n[ \t]+/g, " ");
  const match = unfolded.match(new RegExp(`^${name}:\\s*(.*)$`, "im"));
  return match ? match[1]!.trim() : undefined;
}

/** Parse a DKIM tag-list ("k=v; k=v") into a record. Whitespace-tolerant. */
export function parseTagList(value: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const part of value.split(";")) {
    const entry = part.trim();
    if (!entry) continue;
    const eq = entry.indexOf("=");
    if (eq <= 0) continue;
    const key = entry.slice(0, eq).trim();
    const val = entry.slice(eq + 1).trim();
    if (key) tags[key.toLowerCase()] = val.replace(/\s+/g, "");
  }
  return tags;
}

/**
 * Strict pre-crypto validation of the first DKIM-Signature header, per RFC 6376
 * plus oracle hardening: version, algorithm strength, h= coverage, base64
 * integrity, timestamp freshness/expiry, body-length truncation, and a single
 * Message-ID. Runs before any DNS lookup so malformed input never reaches
 * mailauth.
 */
export function validateDkimSignatureHeader(
  rawMessage: string,
  opts: { now?: number; maxAgeMs?: number } = {},
): DkimHeaderValidation {
  const now = opts.now ?? Date.now();
  const maxAgeMs = opts.maxAgeMs ?? DKIM_MAX_AGE_MS;
  const { headerBlock, body } = splitHeaders(rawMessage);

  if (!/^DKIM-Signature:/im.test(headerBlock)) {
    return { ok: false, error: "Message has no DKIM-Signature header" };
  }

  const sigValue = getHeaderValue(headerBlock, "DKIM-Signature");
  if (!sigValue) {
    return { ok: false, error: "Could not parse DKIM-Signature header" };
  }
  const tags = parseTagList(sigValue);

  if (tags.v !== "1") {
    return { ok: false, error: `Unsupported DKIM version (v=${tags.v ?? "missing"}, expected v=1)` };
  }
  if (!tags.a || !ALLOWED_ALGS.has(tags.a)) {
    return { ok: false, error: `Disallowed signature algorithm (a=${tags.a ?? "missing"}; allowed: rsa-sha256, ed25519-sha256)` };
  }
  if (!tags.d || !/^[^@\s]+\.[^@\s]+$/.test(tags.d)) {
    return { ok: false, error: "DKIM-Signature missing valid d= (signing domain) tag" };
  }
  if (!tags.s) {
    return { ok: false, error: "DKIM-Signature missing s= (selector) tag" };
  }
  if (!tags.h) {
    return { ok: false, error: "DKIM-Signature missing h= (signed header fields) tag" };
  }
  const signedHeaders = tags.h.split(":").map((h) => h.toLowerCase());
  if (!signedHeaders.includes("from")) {
    return { ok: false, error: "DKIM-Signature h= must cover the From header" };
  }
  if (!tags.b || !BASE64_RE.test(tags.b)) {
    return { ok: false, error: "DKIM-Signature b= tag missing or not valid base64" };
  }
  if (!tags.bh || !BASE64_RE.test(tags.bh)) {
    return { ok: false, error: "DKIM-Signature bh= (body hash) tag missing or not valid base64" };
  }
  if (tags.c !== undefined && !CANON_RE.test(tags.c)) {
    return { ok: false, error: `Invalid canonicalization (c=${tags.c}; expected header/simple|relaxed and body/simple|relaxed)` };
  }

  const signedAt = tags.t !== undefined ? Number(tags.t) : undefined;
  const expiresAt = tags.x !== undefined ? Number(tags.x) : undefined;
  if (signedAt !== undefined && !Number.isFinite(signedAt)) {
    return { ok: false, error: "DKIM-Signature t= tag is not a valid timestamp" };
  }
  if (expiresAt !== undefined && !Number.isFinite(expiresAt)) {
    return { ok: false, error: "DKIM-Signature x= tag is not a valid timestamp" };
  }
  if (signedAt !== undefined && expiresAt !== undefined && expiresAt < signedAt) {
    return { ok: false, error: "DKIM-Signature x= (expiry) predates t= (signed time)" };
  }
  if (expiresAt !== undefined && expiresAt * 1000 <= now) {
    return { ok: false, error: "DKIM signature expired (x= timestamp in the past)" };
  }
  if (signedAt !== undefined && signedAt * 1000 > now + DKIM_CLOCK_SKEW_MS) {
    return { ok: false, error: "DKIM-Signature t= timestamp is in the future beyond clock skew" };
  }
  if (signedAt !== undefined && now - signedAt * 1000 > maxAgeMs) {
    return { ok: false, error: "DKIM signature is stale beyond the accepted replay window (t= too old)" };
  }

  // l= smaller than the actual body lets attackers append unsigned content.
  if (tags.l !== undefined) {
    const bodyLen = Number(tags.l);
    const actualBodyBytes = Buffer.byteLength(body, "utf8");
    if (!Number.isFinite(bodyLen) || bodyLen < actualBodyBytes) {
      return { ok: false, error: `DKIM-Signature l= (${tags.l}) truncates the signed body (${actualBodyBytes} bytes); partial-body signatures rejected` };
    }
  }

  // Replay hygiene: the Message-ID is the message identity the oracle relies on.
  const messageIdCount = countHeader(headerBlock, "Message-ID");
  if (messageIdCount === 0) {
    return { ok: false, error: "Message has no Message-ID header" };
  }
  if (messageIdCount > 1) {
    return { ok: false, error: "Message has duplicate Message-ID headers" };
  }

  return {
    ok: true,
    signingDomain: tags.d.toLowerCase(),
    selector: tags.s,
    algorithm: tags.a,
    signedHeaders,
    signedAt,
    expiresAt,
  };
}

/** From-domain alignment with the signing domain (exact match or subdomain). */
export function fromDomainAligns(fromAddress: string, signingDomain: string): boolean {
  const at = fromAddress.lastIndexOf("@");
  if (at < 0) return false;
  const fromDomain = fromAddress.slice(at + 1).toLowerCase();
  const d = signingDomain.toLowerCase();
  return fromDomain === d || fromDomain.endsWith(`.${d}`);
}

/**
 * Extract the first From: address from raw RFC822 headers (case-insensitive).
 * Supports `Name <user@domain>` and bare `user@domain`.
 */
export function extractFromAddress(rawMessage: string): string | undefined {
  const headerEnd = rawMessage.search(/\r?\n\r?\n/);
  const headers = headerEnd >= 0 ? rawMessage.slice(0, headerEnd) : rawMessage;
  // Unfold continued headers
  const unfolded = headers.replace(/\r?\n[ \t]+/g, " ");
  const match = unfolded.match(/^From:\s*(.+)$/im);
  if (!match) return undefined;
  const value = match[1]!.trim();
  const angle = value.match(/<([^>]+)>/);
  const addr = (angle ? angle[1]! : value).trim().replace(/^"|"$/g, "");
  if (!addr.includes("@")) return undefined;
  return normalizeEmail(addr);
}

/** Whether the raw message body or subject contains the challenge token. */
export function messageContainsChallenge(rawMessage: string, challenge: string): boolean {
  if (!challenge || challenge.length < 8) return false;
  return rawMessage.includes(challenge);
}

let injectedVerifier: DkimVerifier | null = null;

/** Test / DI hook — inject a mock verifier (cleared via `resetDkimVerifier`). */
export function setDkimVerifier(verifier: DkimVerifier | null): void {
  injectedVerifier = verifier;
}

export function resetDkimVerifier(): void {
  injectedVerifier = null;
}

/**
 * Cryptographic DKIM verification via mailauth (RFC 6376).
 * Resolves DNS for public keys unless a custom verifier is injected.
 */
export async function verifyDkimSignature(rawMessage: string | Buffer): Promise<DkimVerifyResult> {
  if (injectedVerifier) {
    return injectedVerifier(rawMessage);
  }

  const raw = typeof rawMessage === "string" ? rawMessage : rawMessage.toString("utf8");

  // Strict RFC 6376 + oracle hardening before any DNS work.
  const strict = validateDkimSignatureHeader(raw);
  if (!strict.ok) {
    return { ok: false, error: strict.error };
  }

  try {
    // Dynamic import keeps test startup light when a mock verifier is injected.
    const { authenticate } = await import("mailauth");
    const result = await authenticate(raw, {
      disableArc: true,
      disableDmarc: true,
      disableBimi: true,
    });

    const dkim = result.dkim as {
      status?: { result?: string; comment?: string };
      results?: Array<{
        status?: { result?: string; comment?: string };
        signingDomain?: string;
        aligned?: boolean;
      }>;
    };

    const results = dkim?.results ?? [];
    const passed = results.find((r) => r.status?.result === "pass");
    if (!passed) {
      const comment =
        dkim?.status?.comment ||
        results.map((r) => r.status?.comment || r.status?.result).filter(Boolean).join("; ") ||
        "DKIM verification failed";
      return { ok: false, error: comment };
    }

    const fromAddress = extractFromAddress(raw);
    // Cross-domain spoof defense: the passing signature must actually cover the
    // From domain (exact or subdomain), not an unrelated attacker domain.
    if (fromAddress && passed.signingDomain && !fromDomainAligns(fromAddress, passed.signingDomain)) {
      return {
        ok: false,
        error: `From domain does not align with signing domain d=${passed.signingDomain}`,
      };
    }
    return {
      ok: true,
      fromAddress,
      signingDomain: passed.signingDomain,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "DKIM verification error";
    return { ok: false, error: message };
  }
}

/**
 * Full ownership check: DKIM passes, From matches claimed email, challenge present.
 */
export async function verifyEmailOwnership(params: {
  claimedEmail: string;
  challenge: string;
  rawMessage: string;
}): Promise<{ ok: true; fromAddress: string } | { ok: false; error: string }> {
  const claimed = normalizeEmail(params.claimedEmail);
  if (!messageContainsChallenge(params.rawMessage, params.challenge)) {
    return { ok: false, error: "Verification challenge not found in message subject or body" };
  }

  const dkim = await verifyDkimSignature(params.rawMessage);
  if (!dkim.ok) {
    return { ok: false, error: dkim.error || "DKIM signature verification failed" };
  }

  const from = dkim.fromAddress ?? extractFromAddress(params.rawMessage);
  if (!from) {
    return { ok: false, error: "Could not parse From address from message" };
  }
  if (from !== claimed) {
    return {
      ok: false,
      error: `From address (${from}) does not match claimed email (${claimed})`,
    };
  }
  // Spoof defense: when the verifier reports a signing domain, it must cover
  // the (already claimed-matching) From address's domain.
  if (dkim.signingDomain && !fromDomainAligns(from, dkim.signingDomain)) {
    return {
      ok: false,
      error: `From address domain does not align with DKIM signing domain d=${dkim.signingDomain}`,
    };
  }

  return { ok: true, fromAddress: from };
}
