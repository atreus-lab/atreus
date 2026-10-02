use atreus_contract::{AtreusContract, Error};
use soroban_sdk::{Env, Vec};

#[test]
fn test_claim_link_balance_threshold_success() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AtreusContract);
    let contract = AtreusContract::new(&env, &contract_id);

    let threshold: u64 = 100;
    let policy_params = Vec::from_array(&env, threshold.to_be_bytes());
    let res = AtreusContract::claim_link(&env, 2, policy_params, threshold, 0);
    assert_eq!(res, Ok(()));
}

#[test]
fn test_claim_link_balance_threshold_mismatch() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AtreusContract);

    let threshold_param: u64 = 100;
    let policy_params = Vec::from_array(&env, threshold_param.to_be_bytes());
    let proof_threshold: u64 = 50;

    let res = AtreusContract::claim_link(&env, 2, policy_params, proof_threshold, 0);
    assert_eq!(res, Err(Error::ThresholdMismatch));
}

#[test]
fn test_claim_link_balance_threshold_invalid_params() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AtreusContract);

    let policy_params = Vec::from_array(&env, [1u8, 2, 3]);
    let res = AtreusContract::claim_link(&env, 2, policy_params, 100, 0);
    assert_eq!(res, Err(Error::InvalidParams));
}

#[test]
fn test_claim_link_unsupported_policy() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AtreusContract);

    let policy_params = Vec::new(&env);
    let res = AtreusContract::claim_link(&env, 99, policy_params, 0, 0);
    assert_eq!(res, Err(Error::UnsupportedPolicy));
}
