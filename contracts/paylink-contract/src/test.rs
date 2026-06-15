#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Env, BytesN};

#[test]
fn test_create_and_claim() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PayLinkContract);
    let client = PayLinkContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let link_hash = BytesN::from_array(&env, &[0u8; 32]);
    let amount = 1000i128;

    client.create_link(&creator, &token, &amount, &link_hash);

    let recipient = Address::generate(&env);
    let proof = soroban_sdk::Bytes::new(&env); // Dummy proof
    client.claim_link(&recipient, &link_hash, &proof);
}
