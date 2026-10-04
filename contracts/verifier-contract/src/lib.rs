#![no_std]
#![feature(allocator_api)]

use soroban_sdk::{contract, contractimpl, Bytes, Env, Symbol, Vec};

#[contract]
pub struct VerifierContract;

#[contractimpl]
impl VerifierContract {
    /// Verify a BN254 zero-knowledge proof using native CAP-0074 host functions.
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `public_inputs` - Serialized public inputs as bytes
    /// * `proof` - The zero-knowledge proof as bytes
    /// 
    /// # Returns
    /// * `true` if the proof is valid, `false` otherwise
    pub fn verify_proof(env: Env, public_inputs: Bytes, proof: Bytes) -> bool {
        env.crypto().bn254().pairing_check(proof, public_inputs)
    }

    /// Deprecated: Use verify_proof instead
    #[deprecated(note = "Use verify_proof with native BN254 verification")]
    pub fn attest(_env: Env, _link_hash: Bytes, _recipient: Bytes) -> bool {
        false
    }

    /// Deprecated: Use verify_proof instead  
    #[deprecated(note = "Use verify_proof with native BN254 verification")]
    pub fn is_attested(_env: Env, _link_hash: Bytes, _recipient: Bytes) -> bool {
        false
    }
}
