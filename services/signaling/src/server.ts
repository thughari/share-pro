import { createServer } from 'node:http';
import Redis from 'ioredis';
import pino from 'pino';
import { WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

const wsMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join'), roomId: z.string(), userId: z.string() }),
  z.object({ type: z.literal('leave'), roomId: z.string(), userId: z.string() }),
  z.object({ type: z.literal('signal'), roomId: z.string(), userId: z.string(), payload: z.any() }),
  z.object({ type: z.literal('chat'), roomId: z.string(), userId: z.string(), body: z.string().max(4000) })
]);

const port = Number(process.env.SIGNALING_PORT ?? 8080);
const server = createServer();
const wss = new WebSocketServer({ server });

const roomSockets = new Map<string, Set<WebSocket>>();

function addToRoom(roomId: string, socket: WebSocket): void {
  if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
  roomSockets.get(roomId)!.add(socket);
}

function removeFromRoom(roomId: string, socket: WebSocket): void {
  roomSockets.get(roomId)?.delete(socket);
  if (roomSockets.get(roomId)?.size === 0) roomSockets.delete(roomId);
}

function broadcastRoom(roomId: string, message: unknown): void {
  for (const client of roomSockets.get(roomId) ?? []) {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
  }
}

wss.on('connection', (socket) => {
  let joinedRoom: string | undefined;

  socket.on('message', async (raw) => {
    try {
      const payload = wsMessageSchema.parse(JSON.parse(String(raw)));

      if (payload.type === 'join') {
        joinedRoom = payload.roomId;
        addToRoom(payload.roomId, socket);
        await redis.hset(`room:${payload.roomId}:presence`, payload.userId, Date.now().toString());
        broadcastRoom(payload.roomId, { type: 'presence', userId: payload.userId, state: 'joined' });
      }

      if (payload.type === 'leave') {
        removeFromRoom(payload.roomId, socket);
        await redis.hdel(`room:${payload.roomId}:presence`, payload.userId);
        broadcastRoom(payload.roomId, { type: 'presence', userId: payload.userId, state: 'left' });
      }

      if (payload.type === 'signal' || payload.type === 'chat') {
        await redis.publish(`room:${payload.roomId}:events`, JSON.stringify(payload));
        broadcastRoom(payload.roomId, payload);
      }
    } catch (error) {
      logger.warn({ error }, 'invalid signaling payload');
      socket.send(JSON.stringify({ type: 'error', code: 'INVALID_PAYLOAD' }));
    }
  });

  socket.on('close', () => {
    if (joinedRoom) removeFromRoom(joinedRoom, socket);
  });
});

server.listen(port, () => {
  logger.info({ port }, 'signaling server listening');
});
