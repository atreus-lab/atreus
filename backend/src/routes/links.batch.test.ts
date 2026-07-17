import type { Server } from "http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../lib/stellar.js", () => ({
  createBatchEscrowTransaction: vi.fn(async () => "tx-test"),
  submitAttestation: vi.fn(),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.VERCEL = "1";
  process.env.FRONTEND_URL = "https://frontend.example";
  const { default: app } = await import("../index.js");
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No test port");
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
}, 30_000);

afterAll(() => server ? new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) : undefined);

describe("batch link routes", () => {
  it("rejects invalid CSV with a correlation ID", async () => {
    const response = await fetch(`${baseUrl}/api/links/batch`, {
      method: "POST", headers: { "content-type": "application/json", "x-correlation-id": "test-correlation" },
      body: JSON.stringify({ creator: "GTEST", csv: "bad" }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ correlationId: "test-correlation" });
  });

  it("queues, polls, and downloads a completed batch", async () => {
    const response = await fetch(`${baseUrl}/api/links/batch`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ creator: "GTEST", csv: "amount,optional_email,optional_memo\n1,alice@example.com,payroll" }),
    });
    expect(response.status).toBe(202);
    const submitted = await response.json() as { batchId: string };
    let batch: any;
    for (let i = 0; i < 20; i++) {
      batch = await (await fetch(`${baseUrl}/api/links/batch/${submitted.batchId}`)).json();
      if (batch.status === "completed") break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(batch).toMatchObject({ status: "completed", successCount: 1, failureCount: 0 });
    expect(batch.rows[0].url).toContain("https://frontend.example/claim");
    const csv = await fetch(`${baseUrl}/api/links/batch/${submitted.batchId}/results.csv`);
    expect(csv.headers.get("content-type")).toContain("text/csv");
    expect(await csv.text()).toContain("tx-test");
  });

  it("returns not found for an unknown batch", async () => {
    expect((await fetch(`${baseUrl}/api/links/batch/missing`)).status).toBe(404);
  });
});
