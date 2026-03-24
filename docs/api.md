# API Reference

## Auth

### `POST /token`
Issue room-scoped JWT.

Request:
```json
{ "userId": "u1", "roomId": "r1", "role": "participant" }
```

Response:
```json
{ "token": "eyJ..." }
```

## Chat

### `POST /messages`
Publish chat message.

Request:
```json
{ "roomId": "r1", "senderId": "u1", "body": "hello" }
```

Response:
```json
{ "accepted": true }
```

## Signaling WebSocket

- `join` — joins room and starts presence tracking.
- `leave` — leaves room and emits presence update.
- `signal` — forwards SDP/ICE payloads.
- `chat` — in-room chat fanout.
