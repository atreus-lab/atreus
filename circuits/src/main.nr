mod policies;

fn main(
    secret: Field,
    recipient: pub Field,
    link_hash: pub Field,
    nullifier: pub Field,
) {
    policies::secret::verify(secret, recipient, link_hash, nullifier);
}

#[test]
fn test_main_happy_path() {
    let s = 42;
    let r = 123;
    let h = std::hash::pedersen_hash([s]);
    let n = std::hash::pedersen_hash([s, r]);
    main(s, r, h, n);
}
