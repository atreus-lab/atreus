import { Router } from 'express';
import client from 'prom-client';

const router = Router();

// Create a registry to hold our metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

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
  help: 'Current number of pending requests in queue',
  registers: [register],
});

export {
  router as monitoringRouter,
  proofLatency,
  attestationCounter,
  queueDepthGauge,
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
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end();
  }
});
