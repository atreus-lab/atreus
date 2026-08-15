import Database from 'better-sqlite3';
import { rpcServer } from './stellar.js';
import pino from 'pino';

const logger = pino({ name: 'indexer' });

export interface IndexedEvent {
  id: string; // tx_hash + event_index
  txHash: string;
  eventIndex: number;
  linkHash: string;
  eventType: 'created' | 'claimed' | 'refunded' | 'attested';
  timestamp: number;
  data: any;
}

export class AtreusIndexer {
  private db: Database.Database;

  constructor(dbPath: string = 'atreus_indexer.db') {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        tx_hash TEXT,
        event_index INTEGER,
        link_hash TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        data TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_events_link_hash ON events(link_hash);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

      CREATE TABLE IF NOT EXISTS checkpoints (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  private getCheckpoint(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM checkpoints WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  private setCheckpoint(key: string, value: string) {
    this.db.prepare('INSERT OR REPLACE INTO checkpoints (key, value) VALUES (?, ?)').run(key, value);
  }

  public async index() {
    const lastLedger = this.getCheckpoint('last_ledger');
    let currentLedger = lastLedger ? parseInt(lastLedger) : 0;

    // We'll fetch the latest ledger to know where to stop
    const latestLedgerInfo = await rpcServer.getLedger();
    const latestLedger = latestLedgerInfo.sequence;

    logger.info(`Starting indexer from ledger ${currentLedger} to ${latestLedger}`);

    while (currentLedger < latestLedger) {
      currentLedger++;
      try {
        await this.processLedger(currentLedger);
        this.setCheckpoint('last_ledger', currentLedger.toString());
      } catch (err) {
        logger.error(`Error processing ledger ${currentLedger}: ${err}`);
        // In a real production app, we might want a retry limit or alerting here
        throw err;
      }
    }

    logger.info('Indexing complete');
  }

  private async processLedger(ledgerSequence: number) {
    try {
      const ledger = await rpcServer.getLedger(ledgerSequence);
      const transactions = ledger.transactions;

      for (const tx of transactions) {
        await this.processTransaction(tx);
      }
    } catch (err) {
      logger.error(`Failed to fetch ledger ${ledgerSequence}: ${err}`);
      throw err;
    }
  }

  private async processTransaction(tx: any) {
    const txHash = tx.hash;
    const ops = tx.operations || [];

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (op.type !== 'contract_call') continue;

      const contractId = op.contract_id;
      const method = op.function;
      const isAtreus = contractId === process.env.NEXT_PUBLIC_CONTRACT_ID;
      const isVerifier = contractId === process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID;

      if (!isAtreus && !isVerifier) continue;

      let eventType: 'created' | 'claimed' | 'refunded' | 'attested' | null = null;
      let linkHash: string | null = null;

      if (isAtreus) {
        if (method === 'create_link') {
          eventType = 'created';
          linkHash = this.extractLinkHash(op.args);
        } else if (method === 'claim') {
          eventType = 'claimed';
          linkHash = this.extractLinkHash(op.args);
        } else if (method === 'refund') {
          eventType = 'refunded';
          linkHash = this.extractLinkHash(op.args);
        }
      } else if (isVerifier) {
        if (method === 'attest' || method === 'attest_email') {
          eventType = 'attested';
          linkHash = this.extractLinkHash(op.args);
        }
      }

      if (eventType && linkHash) {
        this.saveEvent({
          id: `${txHash}_${i}`,
          txHash,
          eventIndex: i,
          linkHash: linkHash.toLowerCase(),
          eventType,
          timestamp: tx.ledger_timestamp || Date.now(),
          data: JSON.stringify(op.args),
        });
      }
    }
  }

  private extractLinkHash(args: any[]): string | null {
    for (const arg of args) {
      const val = typeof arg === 'string' ? arg : JSON.stringify(arg);
      const match = val.match(/[0-9a-fA-F]{64}/);
      if (match) return match[0];
    }
    return null;
  }

  private saveEvent(event: IndexedEvent) {
    this.db.prepare(`
      INSERT OR IGNORE INTO events (id, tx_hash, event_index, link_hash, event_type, timestamp, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id,
      event.txHash,
      event.eventIndex,
      event.linkHash,
      event.eventType,
      event.timestamp,
      event.data
    );
  }

  public getEvents(filter: { linkHash?: string, eventType?: string }) {
    let query = 'SELECT * FROM events WHERE 1=1';
    const params: any[] = [];

    if (filter.linkHash) {
      query += ' AND link_hash = ?';
      params.push(filter.linkHash.toLowerCase());
    }
    if (filter.eventType) {
      query += ' AND event_type = ?';
      params.push(filter.eventType);
    }

    return this.db.prepare(query).all(params) as any[];
  }

  public ingestOffChainEvent(linkHash: string, eventType: string, sessionId: string, timestamp?: number): string {
    const id = `offchain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.db.prepare(`
      INSERT INTO events (id, link_hash, event_type, timestamp, data)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      linkHash.toLowerCase(),
      eventType,
      timestamp ?? Date.now(),
      JSON.stringify({ sessionId })
    );
    return id;
  }

  public reset() {
    this.db.prepare('DELETE FROM events').run();
    this.db.prepare('DELETE FROM checkpoints').run();
  }
}
