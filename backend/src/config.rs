use std::env;

#[derive(Clone)]
pub struct Config {
    pub stellar_network: String,
    pub soroban_rpc_url: String,
    pub atreus_contract_id: String,
    // Removed: attester_secret_key
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let stellar_network = env::var("STELLAR_NETWORK")
            .map_err(|_| "STELLAR_NETWORK not set")?;
        let soroban_rpc_url = env::var("SOROBAN_RPC_URL")
            .map_err(|_| "SOROBAN_RPC_URL not set")?;
        let atreus_contract_id = env::var("ATREUS_CONTRACT_ID")
            .map_err(|_| "ATREUS_CONTRACT_ID not set")?;

        Ok(Self {
            stellar_network,
            soroban_rpc_url,
            atreus_contract_id,
        })
    }
}
