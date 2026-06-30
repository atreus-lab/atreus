#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol, BytesN, symbol_short};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LinkInfo {
    pub creator: Address,
    pub amount: i128,
    pub token: Address,
    pub claimed: bool,
}

#[contract]
pub struct AtreusContract;

#[contractimpl]
impl AtreusContract {
    pub fn create_link(
        env: Env,
        creator: Address,
        token: Address,
        amount: i128,
        link_hash: BytesN<32>,
    ) {
        creator.require_auth();

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&creator, &env.current_contract_address(), &amount);

        let link_info = LinkInfo {
            creator: creator.clone(),
            amount,
            token: token.clone(),
            claimed: false,
        };

        env.storage().persistent().set(&link_hash, &link_info);

        env.events().publish(
            (symbol_short!("created"), link_hash),
            (creator, amount, token),
        );
    }

    pub fn claim_link(
        env: Env,
        recipient: Address,
        link_hash: BytesN<32>,
        proof: soroban_sdk::Bytes,
    ) {
        let mut link_info: LinkInfo = env.storage().persistent().get(&link_hash).expect("Link not found");

        if link_info.claimed {
            panic!("Link already claimed");
        }

        // TODO: Call VerifierContract to verify the proof
        // for now, proof existence is enough

        let token_client = token::Client::new(&env, &link_info.token);
        token_client.transfer(&env.current_contract_address(), &recipient, &link_info.amount);

        link_info.claimed = true;
        env.storage().persistent().set(&link_hash, &link_info);

        env.events().publish(
            (symbol_short!("claimed"), link_hash),
            (recipient, link_info.amount),
        );
    }
}

mod test;
