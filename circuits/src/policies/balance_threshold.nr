use std::hash::pedersen;

fn main(
    balance: Field,
    salt: Field,
    threshold: pub Field,
    address_commitment: pub Field,
) {
    // Ensure values fit in u64 range
    let u64_max: Field = 18446744073709551615;
    assert(balance <= u64_max);
    assert(threshold <= u64_max);

    // Constraint 1: balance >= threshold
    // The subtraction is well defined only if balance >= threshold
    assert(balance >= threshold);

    // Constraint 2: commitment binds balance and salt to identity
    let commitment = pedersen::hash([balance, salt]);
    assert(commitment == address_commitment);
}
