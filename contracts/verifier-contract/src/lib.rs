#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env,
};

const STORAGE_TTL_THRESHOLD: u32 = 535_679;
const STORAGE_TTL_EXTEND_TO: u32 = 535_679;

/// Attestations are keyed by a blinded key the attester derives off-chain
/// (see `attest`), never by (link_hash, recipient): both the call arguments and
/// the storage keys are public, so a joinable key would let the link creator
/// watch who claims which link.
#[contracttype]
pub enum DataKey {
    VerificationKey,
    Attester,
    Attestation(BytesN<32>),
    EmailAttestation(BytesN<32>),
    Nullifier(BytesN<32>),
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

        // UltraHonk proofs are standardized at 2144 bytes
        if proof.len() != 2144 {
            panic!("invalid proof length: expected 2144 bytes");
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
}

mod test;
