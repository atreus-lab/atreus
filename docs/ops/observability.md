# Atreus Observability & Ops Guide

This document provides instructions for running, monitoring, and maintaining the Atreus observability stack.

## Overview

The observability stack consists of:
- **Backend API**: The core service providing payment link logic and analytics endpoints.
- **Chain Indexer**: A background service that scans the Soroban network for Atreus and Verifier contract events.
- **Prometheus**: Collects metrics from the backend.
- **Grafana**: Visualizes the metrics.

## Running the Stack

### Local Development
Using Docker Compose:
```bash
docker-compose up -d
```

This starts all services. The backend API will be available on port `3001`, and Grafana on port `3000`.

### Manual Indexer Run
To run the indexer manually for a catch-up:
```bash
cd backend
node dist/indexer.js
```

## Event Storage

The analytics API and the chain indexer share a single event store. Two backends are available:

- **SQLite** (default): restart-safe persistence in `atreus_indexer.db`, used for the self-hosted Docker stack and the standalone indexer.
- **In-memory**: used automatically on Vercel serverless functions (ephemeral, read-only filesystem; the native `better-sqlite3` module does not reliably load there). It is also used if SQLite cannot be opened. In-memory data does not survive a restart, matching the previous behavior of the analytics API on serverless.

Selection is automatic. You can force the in-memory backend with the `ATREUS_ANALYTICS_STORE=memory` env var, or change the SQLite path with `ATREUS_INDEXER_DB`.

## Monitoring & Metrics

### Health Check
The `/monitoring/healthz` endpoint provides a basic health status:
- `GET /monitoring/healthz` $\rightarrow$ `{"status": "ok", ...}`

### Prometheus Metrics
Metrics are exposed at `/monitoring/metrics`. Key metrics include:
- `atreus_proof_verify_latency_seconds`: Histogram of ZK proof verification time, observed around `verifyClaimProof` in the attest handler.
- `atreus_attestations_total`: Counter of attestations submitted, labeled by status (`success`, `proof_failed`, `failed`).
- `atreus_queue_depth`: Current number of batches waiting to be processed (status `queued` or `processing`), computed at scrape time.

### Grafana Dashboard
Grafana is pre-configured to connect to Prometheus. You can track link creation volume and claim rates directly from the Admin Analytics page in the frontend.

## Maintenance

### Rotating Keys
The backend uses several secret keys (e.g., `ATTESTER_SECRET_KEY`, `BATCH_CREATOR_SECRET_KEY`). 
To rotate:
1. Generate a new keypair.
2. Update the `.env` file.
3. Restart the services: \`docker-compose restart backend indexer\`.

### Indexer Recovery
If the indexer crashes, it will resume from the last saved ledger sequence stored in \`atreus_indexer.db\`. To reset the indexer and start from scratch, delete the `atreus_indexer.db` file and restart the service.
