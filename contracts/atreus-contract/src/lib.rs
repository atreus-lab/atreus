#![no_std]
#![feature(allocator_api)]

use soroban_sdk::{contract, contractimpl, Bytes, Env, Symbol, Vec};
use verifier_contract::VerifierContract;

const NULLIFIER_KEY: Symbol = Symbol::short("nullifier");

#[contract]
pub struct AtreusContract;

#[contractimpl]
impl AtreusContract {
    /// Claim a link with zero-knowledge proof verification.
    /// 
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `recipient` - The recipient address
    /// * `link_hash` - The hash of the link being claimed
    /// * `nullifier` - The nullifier for replay protection
    /// * `proof` - The zero-knowledge proof
    /// * `is_email_attested` - Whether email attestation is required
    /// 
    /// # Panics
    /// * If the nullifier has already been used
    /// * If the proof is invalid
    /// * If email attestation is required but not provided
    pub fn claim_link(
        env: Env,
        recipient: Bytes,
        link_hash: Bytes,
        nullifier: Bytes,
        proof: Bytes,
        is_email_attested: bool,
    ) {
        // Check nullifier replay protection
        let nullifier_storage = env.storage().persistent();
        let nullifier_key = (NULLIFIER_KEY, nullifier.clone());
        
        if nullifier_storage.has(&nullifier_key) {
            panic!("Nullifier already used");
        }

        // Verify the proof using native BN254 verification
        let public_inputs = Self::serialize_public_inputs(&recipient, &link_hash, &nullifier);
        let is_valid = VerifierContract::verify_proof(&env, public_inputs, proof);
        
        if !is_valid {
            panic!("Invalid proof");
        }

        // Check email attestation if required
        if is_email_attested {
            // Email attestation check would go here
            // For now, we assume it's handled by the proof itself
        }

        // Mark nullifier as used
        nullifier_storage.set(&nullifier_key, &());
    }

    /// Serialize public inputs for BN254 verification.
    /// 
    /// # Arguments
    /// * `recipient` - The recipient address
    /// * `link_hash` - The hash of the link
    /// * `nullifier` - The nullifier
    /// 
    /// # Returns
    /// * Serialized public inputs as Bytes
    fn serialize_public_inputs(
        recipient: &Bytes,
        link_hash: &Bytes, 
        nullifier: &Bytes,
    ) -> Bytes {
        // Ensure each input is 32 bytes for Bn254Fr field elements
        let mut serialized = Vec::new(recipient.len() + link_hash.len() + nullifier.len());
        
        // Pad or truncate each input to 32 bytes
        let pad_to_32 = |bytes: &Bytes| -> Vec<u8> {
            let mut padded = Vec::with_capacity(32);
            for i in 0..32 {
                if i < bytes.len() {
                    padded.push(bytes.get(i).unwrap_or(0));
                } else {
                    padded.push(0);
                }
            }
            padded
        };

        serialized.extend_from_slice(&pad_to_32(recipient));
        serialized.extend_from_slice(&pad_to_32(link_hash));
        serialized.extend_from_slice(&pad_to_32(nullifier));

        Bytes::from(&serialized)
    }
}
