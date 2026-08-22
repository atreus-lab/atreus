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
    Attestation(BytesN<32>, Address),
    EmailAttestation(BytesN<32>, Address, BytesN<32>),
    Nullifier(BytesN<32>),
}

/// One claim inside an `attest_batch` call.
///
/// Carries exactly the same facts the single-claim path attests to, so a
/// batched claim is settled by `claim_link` through identical checks:
/// `link_hash` + `recipient` (the ZK attestation), `nullifier` (replay
/// protection), and `email_hash` when the link is email-restricted
/// (policy_type == 1). Batching changes how many transactions carry these
/// facts on-chain, never which facts are required.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BatchClaim {
    pub link_hash: BytesN<32>,
    pub recipient: Address,
    pub nullifier: BytesN<32>,
    pub email_hash: Option<BytesN<32>>,
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

        env.events()
            .publish((symbol_short!("proof"), recipient.clone()), proof.len());
    }

    /// On-chain BN254 pairing verification is not available on Soroban today: CAP-0074
    /// (BN254 host functions) is still proposed, not implemented, so there is no host
    /// function to check an UltraHonk/Groth16-over-BN254 proof inside the contract VM.
    /// (BLS12-381 pairing checks are live per CAP-0059, but this circuit's toolchain
    /// — Noir + Barretenberg — targets BN254, not BLS12-381.)
    ///
    /// Until that lands, this contract uses the attestation-oracle pattern instead:
    /// the real UltraHonk proof is generated client-side and verified off-chain by a
    /// trusted attester service (see `attest` / `is_attested` below), which then submits
    /// a signed, on-chain attestation that `claim_link` in the escrow contract checks
    /// before releasing funds. That's the actual verification gate today; this function
    /// is kept only as a placeholder for native verification once CAP-0074 ships.
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

    /// Record that `attester` has independently verified a real UltraHonk proof (off-chain)
    /// showing knowledge of the secret behind `link_hash`, bound to `recipient`. Only the
    /// trusted attester configured at deploy time may call this. This is the actual
    /// ZK-gating check `claim_link` relies on — see the doc comment on `verify_proof`.
    pub fn attest(env: Env, attester: Address, link_hash: BytesN<32>, recipient: Address) {
        attester.require_auth();

        let trusted: Address = env
            .storage()
            .instance()
            .get(&DataKey::Attester)
            .expect("attester not set");
        if attester != trusted {
            panic!("untrusted attester");
        }

        let attestation_key = DataKey::Attestation(link_hash.clone(), recipient.clone());
        env.storage().persistent().set(&attestation_key, &true);
        env.storage().persistent().extend_ttl(
            &attestation_key,
            STORAGE_TTL_THRESHOLD,
            STORAGE_TTL_EXTEND_TO,
        );

        env.events()
            .publish((symbol_short!("attested"), recipient), link_hash);
    }

    /// Whether the trusted attester has vouched for a valid ZK proof binding this
    /// (link_hash, recipient) pair. `claim_link` requires this to be true.
    pub fn is_attested(env: Env, link_hash: BytesN<32>, recipient: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Attestation(link_hash, recipient))
            .unwrap_or(false)
    }

    /// Record that `attester` has independently verified the email hash binding for
    /// this (link_hash, recipient) pair. Only the trusted attester may call this.
    /// Used by `claim_link` when `policy_type == 1` to verify the claimer owns the
    /// intended email address.
    pub fn attest_email(
        env: Env,
        attester: Address,
        link_hash: BytesN<32>,
        recipient: Address,
        email_hash: BytesN<32>,
    ) {
        attester.require_auth();

        let trusted: Address = env
            .storage()
            .instance()
            .get(&DataKey::Attester)
            .expect("attester not set");
        if attester != trusted {
            panic!("untrusted attester");
        }

        env.storage()
            .persistent()
            .set(
                &DataKey::EmailAttestation(link_hash.clone(), recipient.clone(), email_hash.clone()),
                &true,
            );

        env.events().publish(
            (symbol_short!("eml_att"), recipient),
            (link_hash, email_hash),
        );
    }

    /// Whether the trusted attester has vouched for a valid email binding for this
    /// (link_hash, recipient, email_hash) triple. Used by `claim_link` when
    /// `policy_type == 1` to verify the email-restricted claim.
    pub fn is_email_attested(
        env: Env,
        link_hash: BytesN<32>,
        recipient: Address,
        email_hash: BytesN<32>,
    ) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::EmailAttestation(link_hash, recipient, email_hash))
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

        let key = DataKey::Nullifier(nullifier.clone());
        env.storage().persistent().set(&key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&key, STORAGE_TTL_THRESHOLD, STORAGE_TTL_EXTEND_TO);

        env.events()
            .publish((symbol_short!("nullifier"),), nullifier);
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
    ///   `claim_link` still independently requires `is_email_attested` for
    ///   policy_type == 1.
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

            let attestation_key =
                DataKey::Attestation(claim.link_hash.clone(), claim.recipient.clone());
            env.storage().persistent().set(&attestation_key, &true);
            env.storage().persistent().extend_ttl(
                &attestation_key,
                STORAGE_TTL_THRESHOLD,
                STORAGE_TTL_EXTEND_TO,
            );

            // Per-claim event, matching the single-claim topic exactly: the
            // off-chain indexer keys on "attested"/"eml_att", so batched claims
            // must not disappear from analytics.
            env.events().publish(
                (symbol_short!("attested"), claim.recipient.clone()),
                claim.link_hash.clone(),
            );

            if let Some(email_hash) = claim.email_hash.clone() {
                let email_key = DataKey::EmailAttestation(
                    claim.link_hash.clone(),
                    claim.recipient.clone(),
                    email_hash.clone(),
                );
                env.storage().persistent().set(&email_key, &true);
                env.storage().persistent().extend_ttl(
                    &email_key,
                    STORAGE_TTL_THRESHOLD,
                    STORAGE_TTL_EXTEND_TO,
                );
                env.events().publish(
                    (symbol_short!("eml_att"), claim.recipient.clone()),
                    (claim.link_hash.clone(), email_hash),
                );
            }
        }

        env.events()
            .publish((symbol_short!("att_batch"), attester), count);

        count
    }
}

mod test;
