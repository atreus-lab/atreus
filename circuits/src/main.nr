mod policies;

fn main(
    policy_type: pub Field,
    balance: Field,
    salt: Field,
    threshold: pub Field,
    address_commitment: pub Field,
) {
    match policy_type {
        2 => {
            policies::balance_threshold::main(balance, salt, threshold, address_commitment);
        }
        _ => {
            // Existing policies 0/1 would be dispatched here
            assert(false);
        }
    }
}
