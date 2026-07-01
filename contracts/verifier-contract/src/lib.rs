#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Bytes, Env};

#[contracttype]
pub enum DataKey {
    VerificationKey,
}

#[contract]
pub struct VerifierContract;

#[contractimpl]
impl VerifierContract {
    pub fn __constructor(env: Env, verification_key: Bytes) {
        env.storage().instance().set(&DataKey::VerificationKey, &verification_key);
    }

    pub fn verify_proof(env: Env, public_inputs: Bytes, proof: Bytes) -> bool {
        let vk: Bytes = env.storage().instance().get(&DataKey::VerificationKey).expect("VK not set");
        if proof.is_empty() {
            return false;
        }
        // TODO: Call native BN254 host functions to verify UltraHonk proof
        // This will be replaced with rs-soroban-ultrahonk generated code
        // For now, accept non-empty proofs (placeholder for integration)
        let _ = vk;
        let _ = public_inputs;
        !proof.is_empty()
    }

    pub fn verification_key(env: Env) -> Bytes {
        env.storage().instance().get(&DataKey::VerificationKey).expect("VK not set")
    }
}
