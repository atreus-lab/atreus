/**
 * Optional Vercel helper: copy Barretenberg wasm into backend/wasm/ so
 * vercel.json includeFiles can bundle them if a future code path needs an
 * explicit wasmPath. bb.js auto-resolution works without this on Node 20+.
 */
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, "..");
const wasmSrcDir = resolve(
  backendRoot,
  "node_modules",
  "@aztec",
  "bb.js",
  "dest",
  "node",
  "barretenberg_wasm"
);
const wasmDstDir = resolve(backendRoot, "wasm");

if (!existsSync(wasmSrcDir)) {
  console.warn("[prepare-wasm] @aztec/bb.js wasm not found — skipping");
  process.exit(0);
}

mkdirSync(wasmDstDir, { recursive: true });
for (const file of ["barretenberg-threads.wasm.gz", "barretenberg.wasm"]) {
  const src = resolve(wasmSrcDir, file);
  const dst = resolve(wasmDstDir, file);
  if (existsSync(src)) {
    copyFileSync(src, dst);
    console.log(`[prepare-wasm] copied ${file}`);
  }
}
