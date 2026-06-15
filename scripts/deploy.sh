#!/bin/bash

# Deployment script for ZK-PayLink contracts
echo "Deploying ZK-PayLink contracts to Stellar Testnet..."

# 1. Build contracts
cd contracts && cargo build --target wasm32-unknown-unknown --release

# 2. Deploy Verifier
# stellar contract deploy --wasm target/wasm32-unknown-unknown/release/verifier_contract.wasm --source-account S... --network testnet

# 3. Deploy PayLink
# stellar contract deploy --wasm target/wasm32-unknown-unknown/release/paylink_contract.wasm --source-account S... --network testnet

echo "Deployment complete!"
