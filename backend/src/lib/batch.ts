import { createHash, randomBytes, randomUUID } from "crypto";

export const MAX_BATCH_ROWS = 100;
export const MAX_BATCH_AMOUNT = 1_000_000;

export interface BatchInputRow {
  row: number;
  amount: string;
  email?: string;
  memo?: string;
}

export type BatchRowStatus = "pending" | "processing" | "success" | "failed";

export interface BatchResultRow extends BatchInputRow {
  status: BatchRowStatus;
  url?: string;
  txHash?: string;
  error?: string;
  attempts?: number;
}

export interface BatchRecord {
  id: string;
  correlationId: string;
  creator: string;
  createdAt: string;
  completedAt?: string;
  status: "queued" | "processing" | "completed";
  totalAmount: string;
  successCount: number;
  failureCount: number;
  rows: BatchResultRow[];
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  if (quoted) throw new Error("Unclosed quoted field");
  values.push(value.trim());
  return values;
}

export function parseBatchCsv(csv: string): BatchInputRow[] {
  const normalized = csv.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim() !== "");
  if (!lines.length) throw new Error("CSV is empty");
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  if (headers.join(",") !== "amount,optional_email,optional_memo") {
    throw new Error("Header must be: amount,optional_email,optional_memo");
  }
  if (lines.length - 1 > MAX_BATCH_ROWS) throw new Error(`CSV exceeds the ${MAX_BATCH_ROWS} row limit`);
  if (lines.length === 1) throw new Error("CSV must contain at least one data row");

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seen = new Set<string>();
  return lines.slice(1).map((line, index) => {
    const rowNumber = index + 2;
    const fields = parseCsvLine(line);
    if (fields.length !== 3) throw new Error(`Row ${rowNumber}: expected 3 columns`);
    const [amount, email, memo] = fields;
    if (!/^\d+(\.\d{1,7})?$/.test(amount) || Number(amount) <= 0) {
      throw new Error(`Row ${rowNumber}: invalid amount`);
    }
    if (Number(amount) > MAX_BATCH_AMOUNT) throw new Error(`Row ${rowNumber}: amount exceeds ${MAX_BATCH_AMOUNT}`);
    if (email && !emailPattern.test(email)) throw new Error(`Row ${rowNumber}: invalid email`);
    if (memo.length > 280) throw new Error(`Row ${rowNumber}: memo exceeds 280 characters`);
    const duplicateKey = `${amount}\u0000${email.toLowerCase()}\u0000${memo}`;
    if (seen.has(duplicateKey)) throw new Error(`Row ${rowNumber}: duplicate row`);
    seen.add(duplicateKey);
    return { row: rowNumber, amount, email: email || undefined, memo: memo || undefined };
  });
}

export function createBatchRecord(creator: string, correlationId: string, rows: BatchInputRow[]): BatchRecord {
  const totalStroops = rows.reduce((sum, row) => {
    const [whole, fraction = ""] = row.amount.split(".");
    return sum + BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, "0"));
  }, 0n);
  const totalAmount = `${totalStroops / 10_000_000n}.${String(totalStroops % 10_000_000n).padStart(7, "0")}`.replace(/\.?0+$/, "");
  return {
    id: randomUUID(), correlationId, creator, createdAt: new Date().toISOString(), status: "queued",
    totalAmount, successCount: 0, failureCount: 0,
    rows: rows.map((row) => ({ ...row, status: "pending" })),
  };
}

export async function processBatch(
  batch: BatchRecord,
  createLink: (row: BatchInputRow, secret: Uint8Array) => Promise<string>,
  origin: string,
  options: { maxAttempts?: number; retryDelayMs?: number } = {},
): Promise<void> {
  batch.status = "processing";
  const maxAttempts = options.maxAttempts ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 500;
  for (const result of batch.rows) {
    result.status = "processing";
    const secret = randomBytes(32);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      result.attempts = attempt;
      try {
        result.txHash = await createLink(result, secret);
        const url = new URL("/claim", origin);
        url.hash = secret.toString("hex");
        if (result.email) url.searchParams.set("email", Buffer.from(result.email).toString("base64"));
        result.url = url.toString();
        result.status = "success";
        batch.successCount++;
        break;
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, retryDelayMs * 2 ** (attempt - 1)));
      }
    }
    if (result.status !== "success") {
      result.status = "failed";
      batch.failureCount++;
    }
  }
  batch.status = "completed";
  batch.completedAt = new Date().toISOString();
}

function csvCell(value: unknown): string {
  const stringValue = value == null ? "" : String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

export function batchResultsCsv(batch: BatchRecord): string {
  const header = "row,amount,optional_email,optional_memo,status,url,transaction_hash,error";
  return [header, ...batch.rows.map((row) => [row.row, row.amount, row.email, row.memo, row.status, row.url, row.txHash, row.error].map(csvCell).join(","))].join("\n");
}

export function emailHash(email?: string): Uint8Array | undefined {
  return email ? createHash("sha256").update(email.toLowerCase().trim()).digest() : undefined;
}
