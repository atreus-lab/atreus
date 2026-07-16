#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env};

#[contracttype]
pub enum DataKey {
    VerificationKey,
    Attester,
    Attestation(BytesN<32>, Address),
    EmailAttestation(BytesN<32>, Address, BytesN<32>),
}

#[contract]
pub struct VerifierContract;

#[contractimpl]
impl VerifierContract {
    pub fn __constructor(env: Env, verification_key: Bytes, attester: Address) {
        env.storage().instance().set(&DataKey::VerificationKey, &verification_key);
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

        env.events().publish(
            (symbol_short!("proof"), recipient.clone()),
            proof.len()
        );
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
        let vk: Bytes = env.storage().instance().get(&DataKey::VerificationKey).expect("VK not set");
        if proof.is_empty() {
            return false;
        }
        let _ = vk;
        let _ = public_inputs;
        !proof.is_empty()
    }

    pub fn verification_key(env: Env) -> Bytes {
        env.storage().instance().get(&DataKey::VerificationKey).expect("VK not set")
    }

    /// Record that `attester` has independently verified a real UltraHonk proof (off-chain)
    /// showing knowledge of the secret behind `link_hash`, bound to `recipient`. Only the
    /// trusted attester configured at deploy time may call this. This is the actual
    /// ZK-gating check `claim_link` relies on — see the doc comment on `verify_proof`.
    pub fn attest(env: Env, attester: Address, link_hash: BytesN<32>, recipient: Address) {
        attester.require_auth();

        let trusted: Address = env.storage().instance().get(&DataKey::Attester).expect("attester not set");
        if attester != trusted {
            panic!("untrusted attester");
        }

        env.storage()
            .persistent()
            .set(&DataKey::Attestation(link_hash.clone(), recipient.clone()), &true);

        env.events().publish(
            (symbol_short!("attested"), recipient),
            link_hash,
        );
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
}
