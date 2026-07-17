import { describe, expect, it, vi } from "vitest";
import { batchResultsCsv, createBatchRecord, parseBatchCsv, processBatch } from "./batch.js";

const header = "amount,optional_email,optional_memo";

describe("parseBatchCsv", () => {
  it("parses quoted commas, CRLF, BOM, and optional fields", () => {
    const rows = parseBatchCsv(`\uFEFF${header}\r\n1.25,alice@example.com,"refund, July"\r\n2,,`);
    expect(rows).toEqual([
      { row: 2, amount: "1.25", email: "alice@example.com", memo: "refund, July" },
      { row: 3, amount: "2", email: undefined, memo: undefined },
    ]);
  });

  it.each([
    ["wrong,email,memo\n1,a@b.com,x", "Header must be"],
    [`${header}\n1,bad-email,x`, "invalid email"],
    [`${header}\n0,,x`, "invalid amount"],
    [`${header}\n1.12345678,,x`, "invalid amount"],
    [`${header}\n1000001,,x`, "amount exceeds"],
    [`${header}\n1,,x\n1,,x`, "duplicate row"],
    [`${header}\n"1,,x`, "Unclosed quoted field"],
    [`${header}\n1,x`, "expected 3 columns"],
  ])("rejects malformed input: %s", (csv, message) => {
    expect(() => parseBatchCsv(csv)).toThrow(message);
  });

  it("rejects more than 100 rows", () => {
    const csv = [header, ...Array.from({ length: 101 }, (_, i) => `${i + 1},,row ${i}`)].join("\n");
    expect(() => parseBatchCsv(csv)).toThrow("100 row limit");
  });
});

describe("batch processing", () => {
  it.each([1, 10, 100])("processes %i rows sequentially", async (count) => {
    const csv = [header, ...Array.from({ length: count }, (_, i) => `${i + 1},,memo ${i}`)].join("\n");
    const batch = createBatchRecord("creator", "correlation", parseBatchCsv(csv));
    let active = 0;
    let peak = 0;
    const create = vi.fn(async () => {
      active++;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active--;
      return "tx";
    });
    await processBatch(batch, create, "https://example.com", { retryDelayMs: 0 });
    expect(create).toHaveBeenCalledTimes(count);
    expect(peak).toBe(1);
    expect(batch).toMatchObject({ status: "completed", successCount: count, failureCount: 0 });
  });

  it("retries transient failures and reports permanent failures per row", async () => {
    const batch = createBatchRecord("creator", "correlation", parseBatchCsv(`${header}\n1,,first\n2,,second`));
    let calls = 0;
    await processBatch(batch, async (row) => {
      calls++;
      if (row.row === 2 && calls < 3) throw new Error("rate limited");
      if (row.row === 3) throw new Error("RPC unavailable");
      return "tx-success";
    }, "https://example.com", { retryDelayMs: 0 });
    expect(batch.successCount).toBe(1);
    expect(batch.failureCount).toBe(1);
    expect(batch.rows[0]).toMatchObject({ status: "success", attempts: 3 });
    expect(batch.rows[1]).toMatchObject({ status: "failed", attempts: 3, error: "RPC unavailable" });
    expect(batchResultsCsv(batch)).toContain("RPC unavailable");
  });
});
