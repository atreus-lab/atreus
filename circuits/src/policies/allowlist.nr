```noir
// Merkle Allowlist Membership Circuit
// Proves that an address is in the allowlist without revealing which one
// DEPTH = 20 supports up to ~1M addresses

pub struct MerkleProof {
    address: Field,
    merkle_root: Field,
    address_commitment: Field,
    path: [Field; 20],
    indices: [Field; 20],
}

fn pedersen_hash(inputs: [Field]) -> Field {
    // Using Blake2s-based hash for commitment
    // In production, use a proper Pedersen commitment scheme
    let h = blake2s(inputs);
    h
}

fn compute_merkle_root(address: Field, path: [Field; 20], indices: [Field; 20]) -> Field {
    let mut current = address;
    
    for i in 0..20 {
        let index = indices[i];
        let sibling = path[i];
        
        if index == Field(0) {
            // Current is on the left
            current = pedersen_hash([current, sibling]);
        } else {
            // Current is on the right
            current = pedersen_hash([sibling, current]);
        }
    }
    
    current
}

pub fn main(proof: MerkleProof) {
    // Compute the Merkle root from the address and path
    let computed_root = compute_merkle_root(proof.address, proof.path, proof.indices);
    
    // Constraint: computed root must match the public merkle_root
    assert(computed_root == proof.merkle_root);
    
    // Compute the address commitment
    let commitment = pedersen_hash([proof.address]);
    
    // Constraint: commitment must match the public address_commitment
    assert(commitment == proof.address_commitment);
}
