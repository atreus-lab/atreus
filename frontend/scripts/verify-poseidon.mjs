import { mkdirSync, writeFileSync } from "fs";
import { compile, createFileManager } from "@noir-lang/noir_wasm";
import { Noir } from "@noir-lang/noir_js";
import initACVM from "@noir-lang/acvm_js";
import initNoirC from "@noir-lang/noirc_abi";
import { poseidon2 } from "poseidon-lite";

// ---------- Noir side ----------
const noirSource = `
fn main(x: Field, y: Field) -> pub Field {
    std::hash::poseidon::bn254::hash_2([x, y])
}
`;

async function runNoir() {
  const dir = "C:/Users/sayan/atreus/frontend/noir-test/" + Math.random().toString(36).slice(2);
  mkdirSync(dir, { recursive: true });
  mkdirSync(dir + "/src", { recursive: true });
  writeFileSync(dir + "/Nargo.toml", `[package]\nname = "test"\ntype = "bin"\nversion = "0.1.0"\n`);
  writeFileSync(dir + "/src/main.nr", noirSource);

  console.log("Compiling Noir circuit...");
  const fm = createFileManager(dir);
  const compiled = await compile(fm, dir);
  
  console.log("Compile result keys:", Object.keys(compiled));

  // Get the circuit object
  const circuit = compiled.circuit || compiled.program || compiled;
  if (!circuit || !circuit.bytecode) {
    console.error("Compilation result:", JSON.stringify(compiled, null, 2).substring(0, 500));
    throw new Error("No circuit in compile result");
  }
  console.log("Compiled OK");

  await Promise.all([
    initACVM(),
    initNoirC(),
  ]);

  const noir = new Noir(circuit);
  const result = await noir.execute({ x: "1", y: "2" });
  
  const noirHex = result.returnValue.toString(16);
  console.log("Noir  hash_2([1, 2]) =", noirHex);
  return noirHex;
}

// ---------- JS side ----------
function runJS() {
  const jsHex = poseidon2([1n, 2n]).toString(16);
  console.log("JS    poseidon2([1, 2]) =", jsHex);
  return jsHex;
}

// ---------- Compare ----------
async function main() {
  console.log("=== Poseidon Compatibility Verification ===\n");

  const noirHex = await runNoir();
  const jsHex = runJS();

  const expected = "115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189a";

  console.log("\n--- Results ---");
  console.log("Expected (circomlibjs vector):", expected);
  console.log("Noir:",                                noirHex);
  console.log("poseidon-lite:",                       jsHex);

  const match = noirHex === jsHex && jsHex === expected;
  console.log("\n✓ NOIR == JS:",      noirHex === jsHex ? "YES" : "NO");
  console.log("✓ BOTH == VECTOR:",   jsHex === expected ? "YES" : "NO");
  console.log("✓ ALL THREE MATCH:",  match ? "YES ✅ Pipeline is SOLID" : "NO ❌ Hash mismatch - pivot needed");

  if (!match) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
