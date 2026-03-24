# Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

## Local Development

1. Start infra:
   - `docker compose -f infra/docker/docker-compose.yml up -d`
2. Install deps:
   - `pnpm install`
3. Run services:
   - `pnpm dev:auth`
   - `pnpm dev:chat`
   - `pnpm dev:signaling`
   - `pnpm dev:media`
   - `pnpm dev:desktop`

## Production Deployment

- Build and push per-service images.
- Apply k8s manifests under `infra/k8s`.
- Configure cloud load balancer with sticky routing for websocket connections.
- Run coturn on public IP with TLS certificates.
