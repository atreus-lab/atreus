#!/bin/bash

set -e

echo "Starting migration to Soroban SDK 26.1.0..."

# Update dependencies
echo "Updating dependencies..."
cd contracts
cargo update

# Build contracts
echo "Building contracts..."
cargo build --release

# Deploy to testnet
echo "Deploying to Stellar Testnet..."
soroban contract deploy \
    --source-account testnet-account \
    --network testnet \
    --wasm ./target/wasm32-unknown-unknown/release/atreus-contract.wasm

echo "Migration complete!"
