import { Router } from 'express';
import client from 'prom-client';
import { listBatches } from '../lib/batchStore.js';

const router: Router = Router();

// Create a registry to hold our metrics
const register = new client.Registry();
// Default metrics spawn a background scrape interval; skip it under test so the
// interval does not keep the vitest worker alive.
if (process.env.NODE_ENV !== 'test') {
  client.collectDefaultMetrics({ register });
}

// Custom metrics
const proofLatency = new client.Histogram({
  name: 'atreus_proof_verify_latency_seconds',
  help: 'Latency of ZK proof verification in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const attestationCounter = new client.Counter({
  name: 'atreus_attestations_total',
  help: 'Total number of attestations submitted',
  labelNames: ['status'],
  registers: [register],
});

const queueDepthGauge = new client.Gauge({
  name: 'atreus_queue_depth',
  help: 'Current number of batches awaiting processing (queued or processing)',
  registers: [register],
});

// --- Attestation batching (see lib/attestationQueue.ts) ---------------------
// These exist to make the per-link vs batched comparison measurable from real
// runs rather than estimated: attestation_requests counts inbound claims,
// attestation_txs counts transactions actually submitted, and the ratio between
// them is the batching win.

const attestationRequestCounter = new client.Counter({
  name: 'atreus_attestation_requests_total',
  help: 'Attestation requests accepted for on-chain recording (batched or not)',
  registers: [register],
});

const attestationTxCounter = new client.Counter({
  name: 'atreus_attestation_txs_total',
  help: 'Attester transactions submitted on-chain',
  labelNames: ['mode', 'status'],
  registers: [register],
});

const attestationBatchSize = new client.Histogram({
  name: 'atreus_attestation_batch_size',
  help: 'Claims per attestation batch transaction',
  buckets: [1, 2, 5, 10, 25, 50, 100],
  registers: [register],
});

const attestationFeeStroops = new client.Counter({
  name: 'atreus_attestation_fee_stroops_total',
  help: 'Total stroops of transaction fee spent on attestation transactions',
  labelNames: ['mode'],
  registers: [register],
});

const attestationQueueDepth = new client.Gauge({
  name: 'atreus_attestation_queue_depth',
  help: 'Attestations currently queued awaiting a batch flush',
  registers: [register],
});

export {
  router as monitoringRouter,
  proofLatency,
  attestationCounter,
  queueDepthGauge,
  attestationRequestCounter,
  attestationTxCounter,
  attestationBatchSize,
  attestationFeeStroops,
  attestationQueueDepth,
};

// /healthz endpoint
router.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// /metrics endpoint for Prometheus
router.get('/metrics', async (req, res) => {
  try {
    // The batch store is the only in-process work queue; report how many
    // batches are waiting to be processed at scrape time.
    queueDepthGauge.set(listBatches().filter((b) => b.status === 'queued' || b.status === 'processing').length);
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end();
  }
});
