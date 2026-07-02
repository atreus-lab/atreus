import { UltraHonkBackend, Barretenberg } from "@aztec/bb.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const circuitsDir = resolve(__dirname, "../../circuits");
const compiled = JSON.parse(readFileSync(resolve(circuitsDir, "target/secret.json"), "utf-8"));
const witness = readFileSync(resolve(circuitsDir, "target/secret.gz"));

console.log("Initializing Barretenberg (single-threaded, Wasm backend, no workers)...");
const api = await Barretenberg.initSingleton({ threads: 1, backend: "Wasm" });
console.log("Initializing UltraHonkBackend...");
const backend = new UltraHonkBackend(compiled.bytecode, api);

console.log("Generating proof...");
const result = await backend.generateProof(witness);
console.log("Proof generated! Byte length:", result.proof.length);
console.log("Public inputs:", result.publicInputs.length);

console.log("Verifying proof...");
const verified = await backend.verifyProof(result);
console.log("Verified:", verified);
