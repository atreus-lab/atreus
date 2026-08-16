import Database from 'better-sqlite3';
import { rpcServer, scValToNative } from './stellar.js';
import pino from 'pino';

const logger = pino({ name: 'indexer' });

export interface IndexedEvent {
  id: string; // tx_hash + event_index
  txHash: string;
  eventIndex: number;
  linkHash: string;
  eventType: 'created' | 'claimed' | 'refunded' | 'attested' | 'eml_att';
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
    const lastLedgerStr = this.getCheckpoint('last_ledger');
    let startLedger = lastLedgerStr ? parseInt(lastLedgerStr) : 0;

    try {
      // Probe the server to find the oldest available ledger and the current latest
      const probe = await rpcServer.getEvents({ startLedger });
      const oldestLedger = probe.oldestLedger;
      const latestLedger = (await rpcServer.getLatestLedger()).sequence;

      startLedger = Math.max(startLedger, oldestLedger);

      logger.info(`Starting indexer from ledger ${startLedger} to ${latestLedger} (Server oldest: ${oldestLedger})`);

      while (startLedger <= latestLedger) {
        const endLedger = Math.min(startLedger + 1000, latestLedger);
        const response = await rpcServer.getEvents({
          startLedger,
          endLedger
        });

        if (response.events.length > 0) {
          this.processEvents(response.events);
        }

        startLedger = response.latestLedger + 1;
        this.setCheckpoint('last_ledger', startLedger.toString());

        if (response.events.length === 0 && startLedger > latestLedger) break;
      }
    } catch (err) {
      logger.error(`Fatal indexer error: ${err}`);
      throw err;
    }

    logger.info('Indexing complete');
  }

  private processEvents(events: any[]) {
    const EVENT_TOPICS = ['created', 'claimed', 'refunded', 'attested', 'eml_att'];

    for (const event of events) {
      const topic = event.topic;
      if (!topic || topic.length < 2) continue;

      // topic[0] is the symbol string (e.g. 'created')
      const symbol = scValToNative(topic[0]);
      if (!EVENT_TOPICS.includes(symbol)) continue;

      // topic[1] is the link hash (scvBytes)
      const hashVal = scValToNative(topic[1]);
      if (!hashVal || !(hashVal instanceof Uint8Array)) continue;
      const linkHash = Buffer.from(hashVal).toString('hex');

      this.saveEvent({
        id: `${event.txHash}_${event.operationIndex}`,
        txHash: event.txHash,
        eventIndex: event.operationIndex,
        linkHash: linkHash.toLowerCase(),
        eventType: symbol === 'eml_att' ? 'attested' : symbol,
        timestamp: event.timestamp || Date.now(),
        data: JSON.stringify(event.value),
      });
    }
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
