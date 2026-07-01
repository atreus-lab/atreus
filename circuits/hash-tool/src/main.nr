fn main(secret: Field, recipient: pub Field) -> pub [Field; 2] {
    let link_hash = std::hash::pedersen_hash([secret]);
    let nullifier = std::hash::pedersen_hash([secret, recipient]);
    [link_hash, nullifier]
}
