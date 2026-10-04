use crate::config::Config;
use soroban_sdk::{Bytes, Env, Symbol, Vec};

pub struct Relayer {
    config: Config,
}

impl Relayer {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    pub fn submit_claim(
        &self,
        contract_id: &str,
        recipient: &str,
        link_hash: &Bytes,
        nullifier: &Bytes,
        proof: &Bytes,
    ) -> Result<String, String> {
        let env = Env::new();
        let contract = env.get_contract(contract_id)
            .map_err(|e| format!("Invalid contract ID: {}", e))?;

        // Submit claim transaction directly to Stellar
        let tx = env.submit_transaction(
            contract,
            vec![env.call(
                Symbol::new("claim_link"),
                vec![Bytes::from(recipient), link_hash.clone(), nullifier.clone(), proof.clone()],
            )],
        ).map_err(|e| format!("Transaction failed: {}", e))?;

        Ok(tx.hash())
    }
}
