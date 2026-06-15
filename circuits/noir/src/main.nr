use dep::std;

fn main(
    secret: Field, 
    link_hash: pub Field,
    recipient_address: pub Field
) {
    // 1. Prove knowledge of the secret
    let computed_hash = std::hash::pedersen_hash([secret]);
    assert(computed_hash == link_hash);

    // 2. The recipient_address is a public input to bind the proof to a specific claim
    // (Prevents front-running or proof-re-use by others)
    assert(recipient_address != 0);
}

#[test]
fn test_main() {
    let secret = 123;
    let link_hash = std::hash::pedersen_hash([secret]);
    let recipient = 456;

    main(secret, link_hash, recipient);
}
