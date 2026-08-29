import {
  rpc,
  Keypair,
  Address,
  Operation,
  TransactionBuilder,
  Networks,
  xdr,
  scValToNative,
} from '@stellar/stellar-sdk';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value.trim();
    }
  }
}

const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC_URL);
const networkPassphrase = Networks.TESTNET;

const attesterSecret = process.env.ATTESTER_SECRET_KEY;
if (!attesterSecret) {
  throw new Error('ATTESTER_SECRET_KEY is missing');
}
const deployerKp = Keypair.fromSecret(attesterSecret);
console.log('Deployer/Attester Public Key:', deployerKp.publicKey());

async function sendAndPoll(tx) {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  const prepared = await server.prepareTransaction(tx);
  prepared.sign(deployerKp);
  const sendRes = await server.sendTransaction(prepared);
  if (sendRes.status === 'ERROR') {
    throw new Error(`Send failed: ${sendRes.errorResultXdr || JSON.stringify(sendRes)}`);
  }
  console.log('Submitted tx hash:', sendRes.hash);
  const start = Date.now();
  while (Date.now() - start < 45000) {
    const res = await server.getTransaction(sendRes.hash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return res;
    }
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(res)}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error('Timeout waiting for tx');
}

async function uploadWasm(wasmPath) {
  const wasmBuffer = fs.readFileSync(wasmPath);
  const wasmHash = crypto.createHash('sha256').update(wasmBuffer).digest();
  console.log(`Checking if wasm ${path.basename(wasmPath)} (hash: ${wasmHash.toString('hex')}) is already uploaded...`);
  
  const lk = xdr.LedgerKey.contractCode(new xdr.LedgerKeyContractCode({ hash: wasmHash }));
  const existing = await server.getLedgerEntries(lk);
  if (existing.entries && existing.entries.length > 0) {
    console.log('WASM already installed on testnet!');
    return wasmHash;
  }

  console.log('Uploading WASM...');
  const account = await server.getAccount(deployerKp.publicKey());
  const uploadOp = Operation.uploadContractWasm({ wasm: wasmBuffer });
  const tx = new TransactionBuilder(account, { fee: '100000', networkPassphrase })
    .addOperation(uploadOp)
    .setTimeout(60)
    .build();

  await sendAndPoll(tx);
  console.log('WASM uploaded successfully!');
  return wasmHash;
}

async function deploy() {
  const deployerAddr = new Address(deployerKp.publicKey());

  const verifierWasmPath = path.resolve(__dirname, '../../contracts/target/wasm32v1-none/release/verifier_contract.wasm');
  const atreusWasmPath = path.resolve(__dirname, '../../contracts/target/wasm32v1-none/release/atreus_contract.wasm');

  // 1. Upload WASMs
  const verifierWasmHash = await uploadWasm(verifierWasmPath);
  const atreusWasmHash = await uploadWasm(atreusWasmPath);

  // 2. Deploy VerifierContract
  console.log('\n--- Deploying VerifierContract ---');
  const verifierSalt = crypto.randomBytes(32);
  let account = await server.getAccount(deployerKp.publicKey());
  const verifierOp = Operation.createCustomContract({
    address: deployerAddr,
    wasmHash: verifierWasmHash,
    salt: verifierSalt,
    constructorArgs: [
      xdr.ScVal.scvBytes(Buffer.alloc(32)), // verification_key (32 bytes)
      deployerAddr.toScVal(),              // attester (Address)
    ],
  });

  let tx = new TransactionBuilder(account, { fee: '100000', networkPassphrase })
    .addOperation(verifierOp)
    .setTimeout(60)
    .build();

  const verifierRes = await sendAndPoll(tx);
  const verifierContractId = scValToNative(verifierRes.resultMetaXdr.value().sorobanMeta().returnValue());
  console.log('VerifierContract deployed successfully at:', verifierContractId);

  // 3. Deploy AtreusContract
  console.log('\n--- Deploying AtreusContract ---');
  const atreusSalt = crypto.randomBytes(32);
  account = await server.getAccount(deployerKp.publicKey());
  const atreusOp = Operation.createCustomContract({
    address: deployerAddr,
    wasmHash: atreusWasmHash,
    salt: atreusSalt,
    constructorArgs: [
      new Address(verifierContractId).toScVal(), // verifier (Address)
    ],
  });

  tx = new TransactionBuilder(account, { fee: '100000', networkPassphrase })
    .addOperation(atreusOp)
    .setTimeout(60)
    .build();

  const atreusRes = await sendAndPoll(tx);
  const atreusContractId = scValToNative(atreusRes.resultMetaXdr.value().sorobanMeta().returnValue());
  console.log('AtreusContract deployed successfully at:', atreusContractId);

  console.log('\n=======================================');
  console.log('DEPLOYMENT COMPLETE:');
  console.log('NEXT_PUBLIC_VERIFIER_CONTRACT_ID=' + verifierContractId);
  console.log('NEXT_PUBLIC_CONTRACT_ID=' + atreusContractId);
  console.log('=======================================\n');
}

deploy().catch(console.error);
