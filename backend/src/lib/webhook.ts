import { createHmac } from "crypto";

export interface WebhookPayload {
  batchId: string;
  rowIndex: number;
  row: number;
  status: "success" | "failed";
  url?: string;
  txHash?: string;
  error?: string | null;
  completedAt: string;
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

/**
 * Sign a JSON payload body with HMAC-SHA256 using WEBHOOK_SECRET env var.
 * Returns the signature hex string (without prefix).
 */
export function signPayload(body: string): string {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    // Warn loudly — an empty secret produces a forgeable signature.
    console.warn("[webhook] WEBHOOK_SECRET is not set; webhook signatures will be insecure");
  }
  return createHmac("sha256", secret ?? "").update(body).digest("hex");
}

/**
 * Deliver a webhook payload to a URL with HMAC-SHA256 signature header.
 * Retries up to MAX_ATTEMPTS times with exponential backoff (500ms, 1000ms, 2000ms).
 * Throws after all attempts are exhausted.
 */
export async function deliverWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Atreus-Signature": `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return;
      lastError = new Error(`Webhook responded with HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) =>
        setTimeout(resolve, BASE_DELAY_MS * 2 ** (attempt - 1)),
      );
    }
  }

  throw lastError;
}
