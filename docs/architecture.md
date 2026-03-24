# Architecture

## High-Level Design

```text
Desktop (Electron + React)
   |  WebSocket signaling + REST auth/chat
   v
Signaling Service (Node.js + ws) <--> Redis pub/sub/presence
   |
   v
Media Service (mediasoup SFU workers)
   |
   +--> STUN/TURN (coturn)
```

## Key Decisions

1. **SFU topology via mediasoup** for large room fanout and simulcast handling.
2. **Separated control plane/data plane**:
   - Control plane: signaling/auth/chat services.
   - Data plane: SFU media routing.
3. **Redis-backed horizontal scaling** for websocket node fanout and room presence.
4. **Electron desktop-first client** for deep system integrations (screen capture + permissions + hardware acceleration extensions).

## Reliability Controls

- Auto-reconnect with exponential backoff and ICE restart.
- Room state in Redis for stateless signaling pods.
- Health checks and rolling restarts in Kubernetes.
- Backpressure controls in signaling to prevent fanout overload.

## Security Controls

- JWT-authenticated room join claims.
- DTLS-SRTP via WebRTC transport defaults.
- Input schema validation with `zod`.
- Service-level rate limiting and payload size caps.
