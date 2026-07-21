import { normalizeEmail } from "./emailHash.js";

export type DkimVerifyResult = {
  ok: boolean;
  fromAddress?: string;
  signingDomain?: string;
  error?: string;
};

export type DkimVerifier = (rawMessage: string | Buffer) => Promise<DkimVerifyResult>;

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
  if (!raw.includes("DKIM-Signature:")) {
    return { ok: false, error: "Message has no DKIM-Signature header" };
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

  return { ok: true, fromAddress: from };
}
