import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signPayload, deliverWebhook, type WebhookPayload } from "./webhook.js";
import { createHmac } from "crypto";

const SAMPLE_PAYLOAD: WebhookPayload = {
  batchId: "test-batch-id",
  rowIndex: 0,
  csvRow: 2,
  status: "success",
  url: "https://app.atreus.xyz/claim#abc123",
  txHash: "abc123txhash",
  error: null,
  completedAt: "2025-01-01T00:00:00Z",
};

// -------------------------------------------------------------------
// signPayload
// -------------------------------------------------------------------

describe("signPayload", () => {
  it("produces a consistent HMAC-SHA256 hex signature", () => {
    process.env.WEBHOOK_SECRET = "test-secret";
    const body = JSON.stringify(SAMPLE_PAYLOAD);
    const expected = createHmac("sha256", "test-secret").update(body).digest("hex");
    expect(signPayload(body)).toBe(expected);
  });

  it("uses empty string when WEBHOOK_SECRET is not set", () => {
    delete process.env.WEBHOOK_SECRET;
    const body = "{}";
    const expected = createHmac("sha256", "").update(body).digest("hex");
    expect(signPayload(body)).toBe(expected);
  });

  it("produces different signatures for different secrets", () => {
    const body = JSON.stringify(SAMPLE_PAYLOAD);
    process.env.WEBHOOK_SECRET = "secret-a";
    const sigA = signPayload(body);
    process.env.WEBHOOK_SECRET = "secret-b";
    const sigB = signPayload(body);
    expect(sigA).not.toBe(sigB);
  });
});

// -------------------------------------------------------------------
// deliverWebhook
// -------------------------------------------------------------------

describe("deliverWebhook", () => {
  beforeEach(() => {
    process.env.WEBHOOK_SECRET = "test-secret";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("POSTs payload with correct headers on first attempt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const promise = deliverWebhook("https://example.com/webhook", SAMPLE_PAYLOAD);
    await vi.runAllTimersAsync();
    await promise;

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.com/webhook");
    expect(opts.method).toBe("POST");

    const headers = opts.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-Atreus-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);

    // Verify the signature in the header is correct
    const body = opts.body as string;
    const expectedSig = `sha256=${createHmac("sha256", "test-secret").update(body).digest("hex")}`;
    expect(headers["X-Atreus-Signature"]).toBe(expectedSig);
  });

  it("resolves immediately on HTTP 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const promise = deliverWebhook("https://example.com/webhook", SAMPLE_PAYLOAD);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("retries up to 3 times on non-ok response then throws", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const promise = deliverWebhook("https://example.com/webhook", SAMPLE_PAYLOAD);
    const assertion = expect(promise).rejects.toThrow("HTTP 500");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries up to 3 times on network error then throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network failure"));
    vi.stubGlobal("fetch", fetchMock);

    const promise = deliverWebhook("https://example.com/webhook", SAMPLE_PAYLOAD);
    const assertion = expect(promise).rejects.toThrow("Network failure");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("succeeds on second attempt after first failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const promise = deliverWebhook("https://example.com/webhook", SAMPLE_PAYLOAD);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses exponential backoff delays between retries", async () => {
    const callTimes: number[] = [];
    const fetchMock = vi.fn().mockImplementation(async () => {
      callTimes.push(Date.now());
      return { ok: false, status: 500 };
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = deliverWebhook("https://example.com/webhook", SAMPLE_PAYLOAD);
    const caught = promise.catch(() => {});
    await vi.runAllTimersAsync();
    await caught;

    expect(callTimes).toHaveLength(3);
    // Gap between attempt 1→2 should be ~500ms, 2→3 ~1000ms
    expect(callTimes[1]! - callTimes[0]!).toBeGreaterThanOrEqual(500);
    expect(callTimes[2]! - callTimes[1]!).toBeGreaterThanOrEqual(1000);
  });
});
