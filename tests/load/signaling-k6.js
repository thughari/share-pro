import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  vus: 1000,
  duration: '2m'
};

export default function () {
  const userId = `${__VU}-${__ITER}`;
  const roomId = 'load-room';

  const res = ws.connect('ws://localhost:8080', {}, (socket) => {
    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'join', roomId, userId }));
      socket.send(JSON.stringify({ type: 'chat', roomId, userId, body: 'ping' }));
    });

    socket.setTimeout(() => socket.close(), 500);
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
  sleep(1);
}
