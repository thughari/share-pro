# Runbook: How to Run Share Pro

This guide gives exact commands for local development, service-by-service runs, and infrastructure boot.

## 1) Prerequisites

- Node.js 20 LTS (recommended; avoid Node 24 for now due native postinstall incompatibilities)
- pnpm 9+
- Docker + Docker Compose
- (Optional) k6 for load testing

Verify:

```bash
node -v
corepack enable
pnpm -v
docker -v
docker compose version
```

## 2) Clone and configure

```bash
git clone <your-repo-url> share-pro
cd share-pro
cp .env.example .env
```

## 3) Start infrastructure dependencies

This starts Redis, coturn, Prometheus, and Grafana.

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Check containers:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

## 4) Install JS/TS dependencies

```bash
pnpm install
```

## 5) Run services (recommended: separate terminals)

Terminal A:
```bash
pnpm dev:auth
```

Terminal B:
```bash
pnpm dev:chat
```

Terminal C:
```bash
pnpm dev:signaling
```

Terminal D:
```bash
pnpm dev:media
```

Terminal E:
```bash
pnpm dev:desktop
```

## 6) Access points

- Desktop UI dev server: `http://localhost:5173`
- Signaling WebSocket: `ws://localhost:8080`
- Auth API: `http://localhost:8090/token`
- Chat API: `http://localhost:8091/messages`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

## 7) Quick functional smoke test

Issue a token:

```bash
curl -X POST http://localhost:8090/token \
  -H 'content-type: application/json' \
  -d '{"userId":"u1","roomId":"demo-room","role":"host"}'
```

Send a chat message:

```bash
curl -X POST http://localhost:8091/messages \
  -H 'content-type: application/json' \
  -d '{"roomId":"demo-room","senderId":"u1","body":"hello"}'
```

## 8) Run tests and builds

```bash
pnpm -r test
pnpm -r build
```

## 9) Run load test (k6)

```bash
k6 run tests/load/signaling-k6.js
```

## 10) Stop everything

```bash
docker compose -f infra/docker/docker-compose.yml down
```


## Troubleshooting

### If `pnpm install` fails on esbuild/Node version mismatch

1. Ensure you are on Node 20:

```bash
node -v
```

2. Switch to Node 20 (nvm):

```bash
nvm install 20
nvm use 20
```

3. Clean install artifacts and retry:

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm store prune
pnpm install
```


### Verify cross-tab video/screen share

1. Open the app in two tabs/windows.
2. Use the same `Room ID` in both tabs and different `User ID`s.
3. Click **Join** in both tabs and allow camera/mic permissions.
4. Click **Share Screen** in one tab and accept the browser prompt.
5. The second tab should show the remote video tile with shared content.

If remote video stays empty, confirm signaling server is reachable at `VITE_SIGNALING_URL` and both tabs joined the same room.
