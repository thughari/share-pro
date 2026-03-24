import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const app = Fastify({ logger: true });
const secret = process.env.JWT_SECRET ?? 'replace-me';

const issueTokenSchema = z.object({
  userId: z.string().min(1),
  roomId: z.string().min(1),
  role: z.enum(['host', 'co-host', 'participant'])
});

app.post('/token', async (request, reply) => {
  const body = issueTokenSchema.parse(request.body);
  const token = jwt.sign(
    { sub: body.userId, roomId: body.roomId, role: body.role },
    secret,
    { expiresIn: '8h' }
  );

  return reply.send({ token });
});

app.listen({ host: '0.0.0.0', port: Number(process.env.AUTH_PORT ?? 8090) });
