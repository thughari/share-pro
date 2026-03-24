# Share Pro — Desktop-first Video Conferencing Platform

Production-oriented monorepo for a Zoom-class conferencing system with:

- Electron + React + TypeScript desktop client
- WebRTC media stack with mediasoup SFU
- Distributed signaling (WebSocket + Redis pub/sub)
- coturn STUN/TURN for NAT traversal
- Observability (Prometheus/Grafana + JSON logs)
- Kubernetes-ready deployment assets

## Monorepo Layout

- `apps/desktop` — Electron desktop application
- `services/signaling` — Room/signaling service (WebSocket)
- `services/media` — SFU orchestration service (mediasoup)
- `services/auth` — JWT authentication and role service
- `services/chat` — Real-time chat service
- `packages/shared` — shared protocol/contracts/types
- `packages/native-screen` — native Node addon interface placeholder for optimized screen capture
- `infra` — Docker, K8s, coturn, Prometheus, Grafana configs
- `docs` — architecture and operational docs
- `tests/load` — k6 load tests for signaling

## Toolchain Requirements

- Node.js **20 LTS** (recommended)
- pnpm 9 (`corepack enable`)

> Note: Node 24 can trigger native postinstall/version mismatches (for example `esbuild`) in this stack.

## Quick Start

1. Install pnpm and Node.js 20+
2. Copy env:
   - `cp .env.example .env`
3. Run local stack:
   - `docker compose -f infra/docker/docker-compose.yml up -d`
4. Install dependencies:
   - `pnpm install`
5. Start services (in separate terminals):
   - `pnpm dev:signaling`
   - `pnpm dev:media`
   - `pnpm dev:desktop`

## Production Readiness Highlights

- SFU-only group calls (no mesh)
- Simulcast profiles (low/med/high)
- Reconnection with backoff + ICE restarts
- Waiting room and host role enforcement
- JWT-based authz/authn with rate-limited APIs
- Structured JSON logs and metrics endpoints

## Run Instructions

For complete step-by-step commands (prerequisites, boot order, smoke tests, load tests, and shutdown), see:

- `docs/runbook.md`

Quick start:

```bash
cp .env.example .env
docker compose -f infra/docker/docker-compose.yml up -d
pnpm install
# then run in separate terminals:
pnpm dev:auth
pnpm dev:chat
pnpm dev:signaling
pnpm dev:media
pnpm dev:desktop
```

## Status

This repository provides a production-grade baseline architecture and implementation scaffolding for enterprise conferencing. It is designed to be extended with hardware acceleration modules, cloud recording pipelines, and advanced AI features.
