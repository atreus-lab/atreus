import { BarretenbergSync } from "@aztec/bb.js";

function frBuffer(val) {
  const buf = Buffer.alloc(32);
  buf.writeBigUInt64BE(val, 24);
  return buf;
}

async function main() {
  const api = await BarretenbergSync.initSingleton();

  const NOIR_H1 = "0x13b4df2bb5c6ef44590c1f54edb6eddd576d276e8043972f1ed0f3746b422925";
  const NOIR_H2 = "0x0703a1b35910f85a0dbe265fcb79f0ff627b537b29fa711b13552226560eee68";

  for (const hashIndex of [0, 1, 7]) {
    console.log(`\n=== hashIndex = ${hashIndex} ===`);

    const h1Result = api.pedersenHash({
      inputs: [frBuffer(42n)],
      hashIndex,
    });
    const h1 = "0x" + Buffer.from(h1Result.hash).toString("hex");
    console.log("bb.js pedersen_hash([42])       =", h1);
    console.log("Noir                              ", NOIR_H1);
    console.log("Match:", h1 === NOIR_H1 ? "YES" : "NO");

    const h2Result = api.pedersenHash({
      inputs: [frBuffer(42n), frBuffer(123n)],
      hashIndex,
    });
    const h2 = "0x" + Buffer.from(h2Result.hash).toString("hex");
    console.log("bb.js pedersen_hash([42, 123])  =", h2);
    console.log("Noir                              ", NOIR_H2);
    console.log("Match:", h2 === NOIR_H2 ? "YES" : "NO");
  }

  BarretenbergSync.destroySingleton();
}

main().catch(console.error);
