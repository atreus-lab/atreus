/**
 * In-memory fast-path cache of nullifiers already known to be used. This is
 * purely an optimization to avoid an RPC round trip to the VerifierContract
 * on every /attest call — it is NOT the source of truth and is lost on
 * restart. The on-chain VerifierContract (mark_nullifier / is_nullifier_used)
 * is the durable, restart-safe check; see stellar.ts.
 */
const used = new Set<string>();

/** Normalizes a nullifier hex string (optional 0x prefix, any case) to a plain lowercase hex key. */
export function normalizeNullifierHex(nullifierHex: string): string {
  return nullifierHex.toLowerCase().replace(/^0x/, "");
}

export function isNullifierUsedLocally(nullifierHex: string): boolean {
  return used.has(normalizeNullifierHex(nullifierHex));
}

export function markNullifierUsedLocally(nullifierHex: string): void {
  used.add(normalizeNullifierHex(nullifierHex));
}

/** Test helper — clears all state. */
export function resetNullifierStore(): void {
  used.clear();
}
