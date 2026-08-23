import { createHash } from "crypto";

// Blinded attestation keys (issue #118). The attester publishes only these digests,
// so an on-chain observer cannot link an attestation to a link or a recipient.
// Byte layout must stay in lockstep with the VerifierContract.
const CLAIM_TAG = "ATREUS_CLAIM_V1";
const EMAIL_TAG = "ATREUS_EMAIL_V1";

export const SALT_BYTES = 32;
const HASH_BYTES = 32;
const STRKEY_CHARS = 56;

function fixedBytes(name: string, value: Uint8Array, len: number): Buffer {
  if (!value || value.length !== len) {
    throw new Error(`${name} must be ${len} bytes (got ${value ? value.length : "undefined"})`);
  }
  return Buffer.from(value);
}

/** Stellar strkeys are exactly 56 ASCII chars; anything else would desync the contract. */
function recipientAscii(recipient: string): Buffer {
  if (typeof recipient !== "string" || recipient.length !== STRKEY_CHARS) {
    const got = typeof recipient === "string" ? `${recipient.length} chars` : typeof recipient;
    throw new Error(`recipient must be a ${STRKEY_CHARS}-char Stellar strkey (got ${got})`);
  }
  return Buffer.from(recipient, "ascii");
}

/** sha256("ATREUS_CLAIM_V1" || link_hash || recipient_strkey || salt). */
export function computeClaimKey(linkHash: Uint8Array, recipient: string, salt: Uint8Array): Buffer {
  return createHash("sha256")
    .update(Buffer.from(CLAIM_TAG, "ascii"))
    .update(fixedBytes("linkHash", linkHash, HASH_BYTES))
    .update(recipientAscii(recipient))
    .update(fixedBytes("salt", salt, SALT_BYTES))
    .digest();
}

/** sha256("ATREUS_EMAIL_V1" || link_hash || recipient_strkey || email_hash || salt). */
export function computeEmailKey(
  linkHash: Uint8Array,
  recipient: string,
  emailHash: Uint8Array,
  salt: Uint8Array,
): Buffer {
  return createHash("sha256")
    .update(Buffer.from(EMAIL_TAG, "ascii"))
    .update(fixedBytes("linkHash", linkHash, HASH_BYTES))
    .update(recipientAscii(recipient))
    .update(fixedBytes("emailHash", emailHash, HASH_BYTES))
    .update(fixedBytes("salt", salt, SALT_BYTES))
    .digest();
}
