import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pino from 'pino';
import type { BatchRecord } from './batch';

const logger = pino({ name: 'batchStore' });

function getStoreDir(): string {
  // Vercel serverless functions have a read-only filesystem except /tmp, so
  // default to /tmp there. Locally /tmp is also writable, so this is safe in
  // both environments; BATCH_STORE_DIR always wins if explicitly set.
  const tmp = process.env.VERCEL ? '/tmp/.batch-store/' : './.batch-store/';
  return process.env.BATCH_STORE_DIR ?? tmp;
}

function ensureStoreDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function batchFilePath(dir: string, id: string): string {
  return join(dir, `${id}.json`);
}

export function saveBatch(batch: BatchRecord): void {
  const dir = getStoreDir();
  try {
    ensureStoreDir(dir);
    writeFileSync(batchFilePath(dir, batch.id), JSON.stringify(batch, null, 2), 'utf-8');
  } catch (err) {
    logger.error({ err, batchId: batch.id }, 'Failed to save batch to disk');
  }
}

export function loadBatch(id: string): BatchRecord | undefined {
  const dir = getStoreDir();
  const filePath = batchFilePath(dir, id);
  if (!existsSync(filePath)) {
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as BatchRecord;
  } catch (err) {
    logger.error({ err, batchId: id }, 'Failed to load batch from disk');
    return undefined;
  }
}

export function listBatches(): BatchRecord[] {
  const dir = getStoreDir();
  let files: string[];
  try {
    ensureStoreDir(dir);
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch (err) {
    logger.error({ err, dir }, 'Failed to open batch store directory');
    return [];
  }
  const records: BatchRecord[] = [];
  for (const file of files) {
    try {
      records.push(JSON.parse(readFileSync(join(dir, file), 'utf-8')) as BatchRecord);
    } catch (err) {
      logger.error({ err, file }, 'Failed to parse batch file, skipping');
    }
  }
  return records;
}
