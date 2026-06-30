#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, BytesN, symbol_short};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LinkInfo {
    pub creator: Address,
    pub amount: i128,
    pub token: Address,
    pub claimed: bool,
}

#[contract]
pub struct PayLinkContract;

#[contractimpl]
impl PayLinkContract {
    /// Create a new payment link by escrowing funds.
    pub fn create_link(
        env: Env,
        creator: Address,
        token: Address,
        amount: i128,
        link_hash: BytesN<32>,
    ) {
        creator.require_auth();

        // Transfer funds from creator to the contract (escrow)
        // Note: In a real implementation, you'd use the token client to transfer.
        
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

    /// Claim funds from a link using a proof or preimage.
    pub fn claim_link(
        env: Env,
        recipient: Address,
        link_hash: BytesN<32>,
        proof: soroban_sdk::Bytes, // ZK Proof
    ) {
        let mut link_info: LinkInfo = env.storage().persistent().get(&link_hash).expect("Link not found");
        
        if link_info.claimed {
            panic!("Link already claimed");
        }

        // TODO: Call VerifierContract to verify the proof
        // For now, we simulate a successful verification.

        link_info.claimed = true;
        env.storage().persistent().set(&link_hash, &link_info);

        // Transfer funds to recipient
        // Note: In a real implementation, you'd use the token client to transfer link_info.amount.

        env.events().publish(
            (symbol_short!("claimed"), link_hash),
            (recipient, link_info.amount),
        );
    }
}

mod test;
