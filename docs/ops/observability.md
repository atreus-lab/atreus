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
\`\`\`bash
docker-compose up -d
\`\`\`

This starts all services. The backend API will be available on port `3001`, and Grafana on port `3000`.

### Manual Indexer Run
To run the indexer manually for a catch-up:
\`\`\`bash
cd backend
pnpm run dev # and then run the indexer.ts script if decoupled
\`\`\`

## Monitoring & Metrics

### Health Check
The `/monitoring/healthz` endpoint provides a basic health status:
- `GET /monitoring/healthz` $\rightarrow$ `{"status": "ok", ...}`

### Prometheus Metrics
Metrics are exposed at `/monitoring/metrics`. Key metrics include:
- `atreus_proof_verify_latency_seconds`: Histogram of ZK proof verification time.
- `atreus_attestations_total`: Counter of submitted attestations (labeled by status).
- `atreus_queue_depth`: Current number of pending requests.

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
