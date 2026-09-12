import { createRequire } from "module";
import { scValToNative } from "@stellar/stellar-sdk";
import { rpcServer } from "./stellar.js";
import pino from "pino";

const logger = pino({ name: "indexer" });
const require = createRequire(import.meta.url);

export interface IndexedEvent {
  id: string; // tx_hash + event_index
  txHash: string;
  eventIndex: number;
  linkHash: string;
  eventType: "created" | "claimed" | "refunded" | "attested" | "eml_att";
  timestamp: number;
  data: string;
}

export interface EventFilter {
  linkHash?: string;
  eventType?: string;
}

interface EventStore {
  saveEvent(event: IndexedEvent): void;
  getEvents(filter: EventFilter): any[];
  ingestOffChainEvent(linkHash: string, eventType: string, sessionId: string, timestamp?: number): string;
  reset(): void;
  getCheckpoint(key: string): string | null;
  setCheckpoint(key: string, value: string): void;
}

/**
 * In-memory store used when the SQLite backend is unavailable or unwanted
 * (Vercel serverless functions have an ephemeral, read-only filesystem and
 * native modules like better-sqlite3 do not reliably load there). It mirrors
 * the EventStore contract so the rest of the code is agnostic to the backing
 * store. Data does not survive a restart, which matches the previous behavior
 * of the analytics API on serverless.
 */
class MemoryStore implements EventStore {
  private events: IndexedEvent[] = [];
  private checkpoints = new Map<string, string>();

  saveEvent(event: IndexedEvent): void {
    if (this.events.some((e) => e.id === event.id)) return;
    this.events.push(event);
  }

  getEvents(filter: EventFilter): any[] {
    return this.events
      .filter((e) => !filter.linkHash || e.linkHash === filter.linkHash.toLowerCase())
      .filter((e) => !filter.eventType || e.eventType === filter.eventType)
      .map((e) => ({
        id: e.id,
        tx_hash: e.txHash,
        event_index: e.eventIndex,
        link_hash: e.linkHash,
        event_type: e.eventType,
        timestamp: e.timestamp,
        data: e.data,
      }));
  }

  ingestOffChainEvent(linkHash: string, eventType: string, sessionId: string, timestamp?: number): string {
    const id = `offchain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.saveEvent({
      id,
      txHash: id,
      eventIndex: 0,
      linkHash: linkHash.toLowerCase(),
      eventType: eventType as IndexedEvent["eventType"],
      timestamp: timestamp ?? Date.now(),
      data: JSON.stringify({ sessionId }),
    });
    return id;
  }

  reset(): void {
    this.events = [];
    this.checkpoints.clear();
  }

  getCheckpoint(key: string): string | null {
    return this.checkpoints.get(key) ?? null;
  }

  setCheckpoint(key: string, value: string): void {
    this.checkpoints.set(key, value);
  }
}

class SqliteStore implements EventStore {
  private db: any;

  constructor(dbPath: string) {
    const Database = require("better-sqlite3");
    this.db = new Database(dbPath);
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

  saveEvent(event: IndexedEvent): void {
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

  getEvents(filter: EventFilter): any[] {
    let query = "SELECT * FROM events WHERE 1=1";
    const params: any[] = [];

    if (filter.linkHash) {
      query += " AND link_hash = ?";
      params.push(filter.linkHash.toLowerCase());
    }
    if (filter.eventType) {
      query += " AND event_type = ?";
      params.push(filter.eventType);
    }

    return this.db.prepare(query).all(params) as any[];
  }

  ingestOffChainEvent(linkHash: string, eventType: string, sessionId: string, timestamp?: number): string {
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

  reset(): void {
    this.db.prepare("DELETE FROM events").run();
    this.db.prepare("DELETE FROM checkpoints").run();
  }

  getCheckpoint(key: string): string | null {
    const row = this.db.prepare("SELECT value FROM checkpoints WHERE key = ?").get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setCheckpoint(key: string, value: string): void {
    this.db.prepare("INSERT OR REPLACE INTO checkpoints (key, value) VALUES (?, ?)").run(key, value);
  }
}

/**
 * Picks the best available event store. On Vercel serverless functions we never
 * attempt SQLite: the filesystem is ephemeral and read-only, and the native
 * module does not reliably load in the Lambda runtime. Elsewhere we prefer
 * restart-safe SQLite persistence and only fall back to memory if the native
 * module is missing.
 */
export function createEventStore(): EventStore {
  if (process.env.VERCEL || process.env.ATREUS_ANALYTICS_STORE === "memory") {
    logger.info("Using in-memory event store");
    return new MemoryStore();
  }
  try {
    return new SqliteStore(process.env.ATREUS_INDEXER_DB || "atreus_indexer.db");
  } catch (err) {
    logger.warn({ err }, "better-sqlite3 unavailable, falling back to in-memory event store");
    return new MemoryStore();
  }
}

export class AtreusIndexer {
  private store: EventStore;

  constructor(store: EventStore = createEventStore()) {
    this.store = store;
  }

  public async index() {
    const lastLedgerStr = this.store.getCheckpoint("last_ledger");
    let startLedger = lastLedgerStr ? parseInt(lastLedgerStr) : 0;

    try {
      // Probe the server to find the oldest available ledger and the current latest
      const probe = await rpcServer.getEvents({ filters: [], startLedger });
      const oldestLedger = probe.oldestLedger;
      const latestLedger = (await rpcServer.getLatestLedger()).sequence;

      startLedger = Math.max(startLedger, oldestLedger);

      logger.info(`Starting indexer from ledger ${startLedger} to ${latestLedger} (Server oldest: ${oldestLedger})`);

      while (startLedger <= latestLedger) {
        const endLedger = Math.min(startLedger + 1000, latestLedger);
        const response = await rpcServer.getEvents({
          filters: [],
          startLedger,
          endLedger
        });

        if (response.events.length > 0) {
          this.processEvents(response.events);
        }

        startLedger = response.latestLedger + 1;
        this.store.setCheckpoint("last_ledger", startLedger.toString());

        if (response.events.length === 0 && startLedger > latestLedger) break;
      }
    } catch (err) {
      logger.error(`Fatal indexer error: ${err}`);
      throw err;
    }

    logger.info("Indexing complete");
  }

  private processEvents(events: any[]) {
    const EVENT_TOPICS = ["created", "claimed", "refunded", "attested", "eml_att"];

    for (const event of events) {
      const topic = event.topic;
      if (!topic || topic.length < 2) continue;

      // topic[0] is the symbol string (e.g. 'created')
      const symbol = scValToNative(topic[0]);
      if (!EVENT_TOPICS.includes(symbol)) continue;

      // topic[1] is the link hash (scvBytes)
      const hashVal = scValToNative(topic[1]);
      if (!hashVal || !(hashVal instanceof Uint8Array)) continue;
      const linkHash = Buffer.from(hashVal).toString("hex");

      this.store.saveEvent({
        id: `${event.txHash}_${event.operationIndex}`,
        txHash: event.txHash,
        eventIndex: event.operationIndex,
        linkHash: linkHash.toLowerCase(),
        eventType: symbol === "eml_att" ? "attested" : symbol,
        timestamp: event.timestamp || Date.now(),
        data: JSON.stringify(event.value),
      });
    }
  }

  public getEvents(filter: EventFilter) {
    return this.store.getEvents(filter);
  }

  public ingestOffChainEvent(linkHash: string, eventType: string, sessionId: string, timestamp?: number): string {
    return this.store.ingestOffChainEvent(linkHash, eventType, sessionId, timestamp);
  }

  public reset() {
    this.store.reset();
  }
}