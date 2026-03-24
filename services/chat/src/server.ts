import Fastify from 'fastify';
import Redis from 'ioredis';
import { z } from 'zod';

const app = Fastify({ logger: true });
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

const messageSchema = z.object({
  roomId: z.string(),
  senderId: z.string(),
  body: z.string().min(1).max(4000)
});

app.post('/messages', async (req, reply) => {
  const payload = messageSchema.parse(req.body);
  await redis.xadd(`room:${payload.roomId}:chat`, '*', 'data', JSON.stringify(payload));
  await redis.publish(`room:${payload.roomId}:chat`, JSON.stringify(payload));
  reply.code(202).send({ accepted: true });
});

app.listen({ host: '0.0.0.0', port: Number(process.env.CHAT_PORT ?? 8091) });
