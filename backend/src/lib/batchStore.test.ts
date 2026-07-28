import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BatchRecord } from './batch';
import { listBatches, loadBatch, saveBatch } from './batchStore';

let testDir: string;

function makeBatch(overrides: Partial<BatchRecord> = {}): BatchRecord {
  return {
    id: 'b1',
    correlationId: 'c1',
    creator: 'u1',
    createdAt: new Date().toISOString(),
    status: 'queued',
    totalAmount: '100',
    successCount: 0,
    failureCount: 0,
    rows: [],
    ...overrides,
  };
}

describe('batchStore', () => {
  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'batch-store-'));
    process.env.BATCH_STORE_DIR = testDir;
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    delete process.env.BATCH_STORE_DIR;
  });

  it('saves and loads a batch', () => {
    const batch = makeBatch();
    saveBatch(batch);
    expect(loadBatch('b1')).toEqual(batch);
  });

  it('returns undefined for a missing batch', () => {
    expect(loadBatch('nonexistent')).toBeUndefined();
  });

  it('lists all saved batches', () => {
    saveBatch(makeBatch({ id: 'b1' }));
    saveBatch(makeBatch({ id: 'b2' }));
    expect(listBatches().map((b) => b.id).sort()).toEqual(['b1', 'b2']);
  });

  it('returns an empty array when the store dir is empty', () => {
    expect(listBatches()).toEqual([]);
  });

  it('overwrites an existing batch on save', () => {
    saveBatch(makeBatch({ status: 'queued' }));
    saveBatch(makeBatch({ status: 'completed', successCount: 1 }));
    expect(loadBatch('b1')?.status).toBe('completed');
  });
});
