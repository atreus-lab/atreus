import { UltraHonkBackend, Barretenberg } from "@aztec/bb.js";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const wasmDir = resolve(
    __dirname, "..", "node_modules", "@aztec", "bb.js",
    "dest", "node", "barretenberg_wasm"
  );
  const cwd = process.cwd();
  for (const f of ["barretenberg-threads.wasm.gz", "barretenberg.wasm"]) {
    const src = resolve(wasmDir, f);
    const dst = resolve(cwd, f);
    if (existsSync(src) && !existsSync(dst)) copyFileSync(src, dst);
  }

  const circuitsDir = resolve(__dirname, "../../circuits");
  const compiled = JSON.parse(readFileSync(resolve(circuitsDir, "target/secret.json"), "utf-8"));
  const witness = readFileSync(resolve(circuitsDir, "target/secret.gz"));

  console.log("Initializing Barretenberg...");
  const api = await Barretenberg.initSingleton();
  console.log("Initializing UltraHonkBackend...");
  const backend = new UltraHonkBackend(compiled.bytecode, api);

  console.log("Generating proof...");
  const result = await backend.generateProof(witness);
  console.log("Proof generated! Byte length:", result.proof.length);
  console.log("Public inputs:", result.publicInputs.length);

  writeFileSync(resolve(circuitsDir, "target/proof.bin"), result.proof);
  console.log("Proof written to target/proof.bin");

  console.log("Verifying proof...");
  const verified = await backend.verifyProof(result);
  console.log("Verified:", verified);

  console.log("Getting verification key...");
  const vk = await backend.getVerificationKey();
  writeFileSync(resolve(circuitsDir, "target/vk.bin"), vk);
  console.log("VK written to target/vk.bin (" + vk.length + " bytes)");
}

main().catch(console.error);
