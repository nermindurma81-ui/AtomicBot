import jwt from 'jsonwebtoken';

const clients = new Map();

export function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'No token');
      return;
    }

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET || 'atomicbot_secret_key_change_in_prod');
      clients.set(user.id, ws);
      ws.userId = user.id;
      ws.send(JSON.stringify({ type: 'connected', userId: user.id }));
    } catch {
      ws.close(1008, 'Invalid token');
      return;
    }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      } catch {}
    });

    ws.on('close', () => {
      if (ws.userId) clients.delete(ws.userId);
    });
  });
}

export function sendToUser(userId, data) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}
