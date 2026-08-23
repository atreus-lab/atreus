#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env, Vec,
};

const STORAGE_TTL_THRESHOLD: u32 = 535_679;
const STORAGE_TTL_EXTEND_TO: u32 = 535_679;

/// Byte length of an UltraHonk proof produced by the Atreus claim circuit:
/// 458 BN254 field elements x 32 bytes. Measured against the pinned toolchain
/// (Noir 1.0.0-beta.22 / @aztec/bb.js 5.0.0-nightly.20260522), not assumed.
///
/// The previous value here was 2144 bytes (67 field elements), which is the
/// legacy Barretenberg *UltraPlonk* proof size. It predates this project's
/// migration to UltraHonk and was never updated, so the check rejected every
/// proof the circuit actually produces.
pub const ULTRA_HONK_PROOF_LEN: u32 = 14_656;

/// Upper bound on claims accepted by `attest_batch` in one call.
///
/// Each claim performs up to three persistent writes (nullifier, attestation,
/// optional email attestation) plus TTL extensions, so the real ceiling is
/// Soroban's per-transaction ledger-write and CPU budget, not this constant.
/// This bound exists so an oversized batch fails fast with a clear error
/// instead of burning fees to hit a resource-limit trap. The value that
/// actually fits must be confirmed on testnet.
pub const MAX_BATCH_CLAIMS: u32 = 100;

#[contracttype]
pub enum DataKey {
    VerificationKey,
    Attester,
    Attestation(BytesN<32>),
    EmailAttestation(BytesN<32>),
    Nullifier(BytesN<32>),
}

/// One claim inside an `attest_batch` call.
///
/// Every field is a blinded digest, never the underlying link or recipient.
/// `claim_key` and `email_key` are the same values `attest` and `attest_email`
/// take, computed off-chain by the attester (issue #118), so a batch reveals no
/// more to an on-chain observer than the same claims attested one at a time.
///
/// This matters more for a batch than for a single claim: passing `link_hash`
/// and `recipient` in the clear here would not only deanonymise each claim, it
/// would also group them, showing an observer that these particular recipients
/// were paid together by one sender.
///
/// `nullifier` stays in the clear because it is already a public output of the
/// ZK circuit and `mark_nullifier` publishes it the same way.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BatchClaim {
    pub claim_key: BytesN<32>,
    pub nullifier: BytesN<32>,
    pub email_key: Option<BytesN<32>>,
}
#[contract]
pub struct VerifierContract;

#[contractimpl]
impl VerifierContract {
    pub fn __constructor(env: Env, verification_key: Bytes, attester: Address) {
        env.storage()
            .instance()
            .set(&DataKey::VerificationKey, &verification_key);
        env.storage().instance().set(&DataKey::Attester, &attester);
    }

    /// Submit a ZK proof for on-chain receipt. This function accepts UltraHonk proof bytes,
    /// validates format (2144 bytes), and emits a proof submission event.
    ///
    /// Cryptographic verification is deferred pending Soroban Protocol 25/26 BN254 precompiles.
    /// The contract architecture is designed to integrate native verification once available.
    pub fn submit_proof(env: Env, recipient: Address, proof: Bytes) {
        recipient.require_auth();

        if proof.is_empty() {
            panic!("proof cannot be empty");
        }

        // Reject anything that is not exactly one UltraHonk proof from this
        // circuit. See ULTRA_HONK_PROOF_LEN for why this is not 2144.
        if proof.len() != ULTRA_HONK_PROOF_LEN {
            panic!("invalid proof length");
        }

        // The event keeps no recipient: it would tie a submission to an identity.
        env.events().publish((symbol_short!("proof"),), proof.len());
    }

    /// BN254 host functions are now available on Soroban (CAP-0074, Protocol 25), so
    /// native on-chain UltraHonk verification is possible.
    ///
    /// This contract still uses the attestation-oracle pattern: the real proof is
    /// generated client-side and verified off-chain by a trusted attester, which records
    /// an on-chain attestation (see `attest` / `is_attested` below) that `claim_link`
    /// checks before releasing funds. That is the verification gate today. Moving this
    /// function to native verification is planned follow-up work, outside issue #118.
    pub fn verify_proof(env: Env, public_inputs: Bytes, proof: Bytes) -> bool {
        let vk: Bytes = env
            .storage()
            .instance()
            .get(&DataKey::VerificationKey)
            .expect("VK not set");
        if proof.is_empty() {
            return false;
        }
        let _ = vk;
        let _ = public_inputs;
        !proof.is_empty()
    }

    pub fn verification_key(env: Env) -> Bytes {
        env.storage()
            .instance()
            .get(&DataKey::VerificationKey)
            .expect("VK not set")
    }

    /// Record that `attester` has verified a real UltraHonk proof (off-chain) for one
    /// claim. Only the trusted attester configured at deploy time may call this. This is
    /// the actual ZK-gating check `claim_link` relies on — see the doc comment on
    /// `verify_proof`.
    ///
    /// `claim_key` is sha256("ATREUS_CLAIM_V1" || link_hash || recipient strkey || salt),
    /// computed by the attester from data it already holds. The salt is secret until the
    /// recipient claims, so this argument reveals neither the link nor the recipient.
    /// `claim_link` recomputes the same key from its own arguments.
    pub fn attest(env: Env, attester: Address, claim_key: BytesN<32>) {
        attester.require_auth();

        let trusted: Address = env
            .storage()
            .instance()
            .get(&DataKey::Attester)
            .expect("attester not set");
        if attester != trusted {
            panic!("untrusted attester");
        }

        let attestation_key = DataKey::Attestation(claim_key);
        env.storage().persistent().set(&attestation_key, &true);
        env.storage().persistent().extend_ttl(
            &attestation_key,
            STORAGE_TTL_THRESHOLD,
            STORAGE_TTL_EXTEND_TO,
        );

        env.events().publish((symbol_short!("attested"),), ());
    }

    /// Whether the trusted attester has vouched for a valid ZK proof under this blinded
    /// claim key. `claim_link` requires this to be true.
    pub fn is_attested(env: Env, claim_key: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Attestation(claim_key))
            .unwrap_or(false)
    }

    /// Record that `attester` has verified email ownership for one claim. Only the
    /// trusted attester may call this. Used by `claim_link` when `policy_type == 1`.
    ///
    /// `email_key` is sha256("ATREUS_EMAIL_V1" || link_hash || recipient strkey ||
    /// email_hash || salt), blinded for the same reason as `claim_key` in `attest`.
    pub fn attest_email(env: Env, attester: Address, email_key: BytesN<32>) {
        attester.require_auth();

        let trusted: Address = env
            .storage()
            .instance()
            .get(&DataKey::Attester)
            .expect("attester not set");
        if attester != trusted {
            panic!("untrusted attester");
        }

        let attestation_key = DataKey::EmailAttestation(email_key);
        env.storage().persistent().set(&attestation_key, &true);
        env.storage().persistent().extend_ttl(
            &attestation_key,
            STORAGE_TTL_THRESHOLD,
            STORAGE_TTL_EXTEND_TO,
        );

        env.events().publish((symbol_short!("eml_att"),), ());
    }

    /// Whether the trusted attester has vouched for the email binding under this blinded
    /// email key. Used by `claim_link` when `policy_type == 1`.
    pub fn is_email_attested(env: Env, email_key: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::EmailAttestation(email_key))
            .unwrap_or(false)
    }

    /// Records `nullifier` as used, on-chain. Only the trusted attester may call this.
    ///
    /// This is the durable, restart-safe counterpart to the backend's in-memory
    /// nullifier cache: the backend checks its local cache first (fast path) and
    /// falls back to `is_nullifier_used` below when the cache misses — e.g. right
    /// after a backend restart, when the cache is empty. Persistent storage (not
    /// temporary) ensures a marked nullifier cannot be purged by TTL expiry and
    /// silently allow a replay.
    pub fn mark_nullifier(env: Env, attester: Address, nullifier: BytesN<32>) {
        attester.require_auth();

        let trusted: Address = env
            .storage()
            .instance()
            .get(&DataKey::Attester)
            .expect("attester not set");
        if attester != trusted {
            panic!("untrusted attester");
        }

        let key = DataKey::Nullifier(nullifier);
        env.storage().persistent().set(&key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&key, STORAGE_TTL_THRESHOLD, STORAGE_TTL_EXTEND_TO);

        // The nullifier stays out of the event: published, it would let anyone
        // correlate marks with the claims that produced them.
        env.events().publish((symbol_short!("nullifier"),), ());
    }

    /// Whether `nullifier` has already been marked used on-chain via `mark_nullifier`.
    pub fn is_nullifier_used(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Nullifier(nullifier))
            .unwrap_or(false)
    }

    /// Record N claims' attestations, nullifiers, and (where present) email bindings
    /// in a single transaction. Returns the number of claims written.
    ///
    /// This is the batching win: the per-claim path costs up to three separate
    /// attester transactions (`attest`, `attest_email`, `mark_nullifier`), so a
    /// batch of N claims collapses up to 3N transactions into one. It writes the
    /// *same* storage keys as those three functions, so `is_attested`,
    /// `is_email_attested`, and `is_nullifier_used` — and therefore `claim_link` —
    /// behave identically whether a claim was attested singly or in a batch.
    ///
    /// Security properties deliberately preserved:
    ///
    /// - **Unlinkability (issue #118).** Claims are supplied as blinded `claim_key` /
    ///   `email_key` digests, exactly as `attest` and `attest_email` take them. A batch
    ///   therefore leaks no link or recipient, and emits no per-claim topic that would
    ///   let an observer group recipients paid by one sender.
    /// - **Replay protection.** Each nullifier is checked against storage and then
    ///   marked before the next claim is processed. Because a claim's nullifier is
    ///   marked as it is handled, a batch containing the same nullifier twice fails
    ///   on the second occurrence: batching cannot become a way to spend one link
    ///   twice. Panicking reverts the whole transaction, so a batch is atomic —
    ///   either every claim is recorded or none is. That is the safe default: a
    ///   used nullifier in a batch means a bug or a race upstream, and silently
    ///   skipping it would mask a double-spend attempt from the caller.
    /// - **Email restriction.** An email binding is recorded only when the caller
    ///   supplies one, exactly as `attest_email` does. Batching does not create a
    ///   path that settles an email-restricted link without its binding, because
    ///   `claim_link` still independently requires `is_email_attested`.
    /// - **Attester trust.** Checked once for the batch, identically to the
    ///   single-claim functions.
    ///
    /// Note this does NOT weaken recipient authorization: `claim_link` still
    /// requires `recipient.require_auth()` per claim at settlement. Attestation
    /// and settlement remain separate steps; only attestation is batched here.
    pub fn attest_batch(env: Env, attester: Address, claims: Vec<BatchClaim>) -> u32 {
        attester.require_auth();

        let trusted: Address = env
            .storage()
            .instance()
            .get(&DataKey::Attester)
            .expect("attester not set");
        if attester != trusted {
            panic!("untrusted attester");
        }

        let count = claims.len();
        if count == 0 {
            panic!("empty batch");
        }
        if count > MAX_BATCH_CLAIMS {
            panic!("batch exceeds maximum size");
        }

        for claim in claims.iter() {
            // Replay check first, and mark immediately — this is what makes a
            // duplicate nullifier *within* one batch fail on its second occurrence.
            let nullifier_key = DataKey::Nullifier(claim.nullifier.clone());
            let used: bool = env.storage().persistent().get(&nullifier_key).unwrap_or(false);
            if used {
                panic!("nullifier already used");
            }
            env.storage().persistent().set(&nullifier_key, &true);
            env.storage().persistent().extend_ttl(
                &nullifier_key,
                STORAGE_TTL_THRESHOLD,
                STORAGE_TTL_EXTEND_TO,
            );

            let attestation_key = DataKey::Attestation(claim.claim_key.clone());
            env.storage().persistent().set(&attestation_key, &true);
            env.storage().persistent().extend_ttl(
                &attestation_key,
                STORAGE_TTL_THRESHOLD,
                STORAGE_TTL_EXTEND_TO,
            );

            if let Some(email_key) = claim.email_key.clone() {
                let email_attestation_key = DataKey::EmailAttestation(email_key);
                env.storage().persistent().set(&email_attestation_key, &true);
                env.storage().persistent().extend_ttl(
                    &email_attestation_key,
                    STORAGE_TTL_THRESHOLD,
                    STORAGE_TTL_EXTEND_TO,
                );
            }
        }

        // Topics carry no per-claim data, matching `attest`. Publishing the count
        // alone still tells an observer a batch happened and how large it was;
        // that is unavoidable from the transaction itself and reveals nothing
        // about which links or recipients it covered.
        env.events()
            .publish((symbol_short!("att_batch"),), count);

        count
    }
}

mod test;
