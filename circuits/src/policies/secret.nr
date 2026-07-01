// policies/secret.nr
// Proves knowledge of a link secret without revealing it.
//
// Public inputs (order matters):
//   [0] recipient    — Stellar address as BN254 field element
//   [1] link_hash    — pedersen_hash([secret])
//   [2] nullifier    — pedersen_hash([secret, recipient])
//
// Private inputs:
//   secret           — the link secret (32-byte random value)

pub fn verify(
    secret: Field,
    recipient: Field,
    link_hash: Field,
    nullifier: Field,
) {
    // Constraint 1: prove knowledge of secret (reveals link_hash)
    let computed_hash = std::hash::pedersen_hash([secret]);
    assert(computed_hash == link_hash);

    // Constraint 2: nullifier binds secret + recipient (prevents replay/sniping)
    let computed_nullifier = std::hash::pedersen_hash([secret, recipient]);
    assert(computed_nullifier == nullifier);
}

#[test]
fn test_happy_path() {
    let s = 42;
    let r = 123;
    let h = std::hash::pedersen_hash([s]);
    let n = std::hash::pedersen_hash([s, r]);
    verify(s, r, h, n);
}

