/**
 * test-attestation.mjs — End-to-end smoke test for B6.
 *
 * 1. Generate random 32-byte secret
 * 2. Compute sha256 → link_hash
 * 3. Pick a random Stellar recipient
 * 4. Compute field-domain inputs (secretField, recipientField, linkHashField, nullifierField)
 * 5. Execute Noir circuit → witness
 * 6. Generate real UltraHonk proof
 * 7. POST to http://localhost:3001/api/links/:hash/attest
 * 8. Confirm success + attestationTx hash
 *
 * Run from repo root: node backend/scripts/test-attestation.mjs
 */

import { Barretenberg, BarretenbergSync, UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { Keypair } from "@stellar/stellar-sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash, randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Constants ──
const FR_ORDER = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const PEDERSEN_HASH_INDEX = 0;

// ── Field encoding (must match backend/src/lib/zk.ts) ──
function secretToField(secretBytes) {
  const hex = Buffer.from(secretBytes).toString("hex");
  return BigInt("0x" + hex) % FR_ORDER;
}

function addressToField(stellarAddr) {
  // StrKey.decodeEd25519PublicKey returns the raw 32-byte public key
  const pubkeyBytes = Keypair.fromPublicKey(stellarAddr).rawPublicKey();
  const hex = Buffer.from(pubkeyBytes).toString("hex");
  return BigInt("0x" + hex) % FR_ORDER;
}

function frBuffer(val) {
  const buf = Buffer.alloc(32);
  let v = val;
  for (let i = 31; i >= 0; i--) {
    buf[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return buf;
}

function sha256Hex(bytes) {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

async function main() {
  console.log("=== Atreus B6 Attestation Smoke Test ===\n");

  // 1. Generate random secret
  const secret = randomBytes(32);
  const secretHex = secret.toString("hex");
  console.log("Secret (hex):", secretHex);

  // 2. Compute sha256 → link_hash
  const linkHashSha = sha256Hex(secret);
  console.log("Link hash (sha256):", linkHashSha);

  // 3. Pick random recipient
  const recipientKp = Keypair.random();
  const recipient = recipientKp.publicKey();
  console.log("Recipient:", recipient);

  // 4. Compute field-domain values
  const secretField = secretToField(secret);
  const recipientField = addressToField(recipient);
  console.log("secretField:", secretField.toString());
  console.log("recipientField:", recipientField.toString());

  // 5. Compute Pedersen hashes (same as the circuit expects)
  console.log("\nInitializing BarretenbergSync for Pedersen hashing...");
  const bbSync = await BarretenbergSync.initSingleton();

  const linkHashResult = bbSync.pedersenHash({
    inputs: [frBuffer(secretField)],
    hashIndex: PEDERSEN_HASH_INDEX,
  });
  const linkHashField = BigInt("0x" + Buffer.from(linkHashResult.hash).toString("hex"));

  const nullifierResult = bbSync.pedersenHash({
    inputs: [frBuffer(secretField), frBuffer(recipientField)],
    hashIndex: PEDERSEN_HASH_INDEX,
  });
  const nullifierField = BigInt("0x" + Buffer.from(nullifierResult.hash).toString("hex"));

  console.log("linkHashField (Pedersen):", "0x" + linkHashField.toString(16).padStart(64, "0"));
  console.log("nullifierField (Pedersen):", "0x" + nullifierField.toString(16).padStart(64, "0"));

  // 6. Load circuit and execute to produce witness
  const circuitPath = resolve(__dirname, "../../circuits/target/secret.json");
  const circuit = JSON.parse(readFileSync(circuitPath, "utf-8"));

  console.log("\nExecuting circuit to produce witness...");
  const noir = new Noir(circuit);

  // The circuit main(secret, recipient, link_hash, nullifier) expects:
  //   secret: private Field
  //   recipient: pub Field
  //   link_hash: pub Field
  //   nullifier: pub Field
  const inputs = {
    secret: "0x" + secretField.toString(16).padStart(64, "0"),
    recipient: "0x" + recipientField.toString(16).padStart(64, "0"),
    link_hash: "0x" + linkHashField.toString(16).padStart(64, "0"),
    nullifier: "0x" + nullifierField.toString(16).padStart(64, "0"),
  };
  console.log("Circuit inputs:", inputs);

  const { witness } = await noir.execute(inputs);
  console.log("Witness generated! Byte length:", witness.length);

  // 7. Generate UltraHonk proof
  console.log("\nInitializing Barretenberg for proof generation...");
  const api = await Barretenberg.initSingleton({ threads: 1, backend: "Wasm" });
  const backend = new UltraHonkBackend(circuit.bytecode, api);

  console.log("Generating UltraHonk proof...");
  const proofResult = await backend.generateProof(witness);
  console.log("Proof generated! Byte length:", proofResult.proof.length);
  console.log("Public inputs:", proofResult.publicInputs);

  // Quick self-check: verify locally before sending
  console.log("\nLocal verification...");
  const localVerified = await backend.verifyProof(proofResult);
  console.log("Local verified:", localVerified);
  if (!localVerified) {
    throw new Error("Local proof verification failed — aborting");
  }

  await api.destroy();

  // 8. POST to backend attest endpoint
  const proofHex = Buffer.from(proofResult.proof).toString("hex");
  const url = `http://localhost:3001/api/links/${linkHashSha}/attest`;
  console.log("\nPOSTing to:", url);
  console.log("Body: { recipient:", recipient, ", secret:", secretHex.substring(0, 16) + "..., proof:", proofHex.substring(0, 32) + "... }");

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient,
      secret: secretHex,
      proof: proofHex,
    }),
  });

  const body = await resp.json();
  console.log("\nResponse status:", resp.status);
  console.log("Response body:", JSON.stringify(body, null, 2));

  if (!resp.ok) {
    throw new Error(`Attestation failed: ${JSON.stringify(body)}`);
  }

  console.log("\n✅ Attestation successful! TX hash:", body.attestationTx);
  console.log("\nTo verify is_attested on-chain, run:");
  console.log(`  stellar contract invoke --id CB3GJLFAGH2WQTQHSMAB7GABK4NC5Q74XDV2U7MWAYEKQV7YMBV2O7KD --source-account atreus-deployer --network testnet -- is_attested --link_hash ${linkHashSha} --recipient ${recipient}`);
}

main().catch((e) => {
  console.error("\n❌ FAILED:", e.message || e);
  console.error(e.stack);
  process.exit(1);
});
