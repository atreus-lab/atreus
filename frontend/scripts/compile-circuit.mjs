// Quick compile test via noir_wasm
// Run: node scripts/compile-circuit.mjs
import { compile, createFileManager } from "@noir-lang/noir_wasm";

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "../../circuits");

async function main() {
  console.log("Compiling circuit at:", projectDir);

  const fm = createFileManager(projectDir);
  const result = await compile(fm, projectDir);

  if (result.circuit?.bytecode) {
    console.log("✅ Compilation successful");
    console.log("Circuit name:", result.circuit.name);
    console.log("Bytecode length:", result.circuit.bytecode.length, "bytes");
    console.log("ABI parameters:", result.circuit.abi.parameters.length);
  } else {
    console.log("❌ Compilation failed or unexpected result format");
    console.log("Keys:", Object.keys(result));
  }
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
