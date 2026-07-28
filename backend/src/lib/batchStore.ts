import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pino from 'pino';
import type { BatchRecord } from './batch';

const logger = pino({ name: 'batchStore' });

function getStoreDir(): string {
  return process.env.BATCH_STORE_DIR ?? './.batch-store/';
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
  ensureStoreDir(dir);
  const records: BatchRecord[] = [];
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch (err) {
    logger.error({ err }, 'Failed to read batch store directory');
    return records;
  }
  for (const file of files) {
    try {
      records.push(JSON.parse(readFileSync(join(dir, file), 'utf-8')) as BatchRecord);
    } catch (err) {
      logger.error({ err, file }, 'Failed to parse batch file, skipping');
    }
  }
  return records;
}
