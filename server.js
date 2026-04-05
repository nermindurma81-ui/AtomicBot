import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import taskRoutes from './routes/tasks.js';
import connectorRoutes from './routes/connectors.js';
import modelRoutes from './routes/models.js';
import cronRoutes from './routes/crons.js';
import skillRoutes from './routes/skills.js';
import vpsRoutes from './routes/vps.js';
import { initDB } from './db.js';
import { authMiddleware } from './middleware/auth.js';
import { setupWebSocket } from './websocket.js';
import { initCronJobs } from './routes/crons.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

initDB();

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/connectors', authMiddleware, connectorRoutes);
app.use('/api/models', authMiddleware, modelRoutes);
app.use('/api/crons', authMiddleware, cronRoutes);
app.use('/api/skills', authMiddleware, skillRoutes);
app.use('/api/vps', authMiddleware, vpsRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

// Serve built frontend
const frontendDist = join(__dirname, 'frontend', 'dist');
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(join(frontendDist, 'index.html'));
  });
}

setupWebSocket(wss);
initCronJobs();

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AtomicBot running on http://0.0.0.0:${PORT}`);
});
