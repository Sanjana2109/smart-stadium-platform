import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { redis, redisSub } from './redis';
import { startSimulationEngine, triggerSurge } from './simulation';
import { handleAiQuery } from './ai';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend engine running' });
});

// AI Copilot Endpoint
app.post('/api/copilot', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });
    
    const reply = await handleAiQuery(prompt);
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: 'Internal AI Error' });
  }
});

// Admin Simulation Endpoints
app.post('/api/simulate/surge', async (req, res) => {
  try {
    const { zone } = req.body;
    if (!zone) return res.status(400).json({ error: 'Zone required' });
    
    await triggerSurge(zone, 95);
    res.json({ status: 'Surge triggered', zone });
  } catch (error) {
    res.status(500).json({ error: 'Error triggering surge' });
  }
});

app.post('/api/simulate/innings-break', async (req, res) => {
  try {
    await triggerSurge('zone_A', 90);
    await triggerSurge('zone_B', 92);
    await triggerSurge('zone_C', 88);
    await triggerSurge('zone_D', 95);
    res.json({ status: 'Innings break triggered' });
  } catch (error) {
    res.status(500).json({ error: 'Error triggering innings break' });
  }
});

// Live state endpoints
app.get('/api/state/pois', async (req, res) => {
  try {
    const raw = await redis.hgetall('stadium:pois');
    const pois: Record<string, any> = {};
    for (const [key, val] of Object.entries(raw)) {
      pois[key] = JSON.parse(val);
    }
    res.json(pois);
  } catch (error) {
    console.error('[API] POI fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch POI data' });
  }
});

app.get('/api/state/zones', async (req, res) => {
  try {
    const raw = await redis.hgetall('stadium:zones');
    const zones: Record<string, any> = {};
    for (const [key, val] of Object.entries(raw)) {
      zones[key] = JSON.parse(val);
    }
    res.json(zones);
  } catch (error) {
    console.error('[API] Zone fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch zone data' });
  }
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ALL clients join a global room to receive ALL updates
  socket.join('global');

  socket.on('subscribeAdmin', () => {
    socket.join('admin');
    console.log(`Socket ${socket.id} joined admin`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Redis Pub/Sub → broadcast to ALL connected WebSocket clients
redisSub.subscribe('stadium_updates', (err, count) => {
  if (err) console.error('[RedisSub] Failed to subscribe:', err);
  else console.log(`[RedisSub] Subscribed successfully! (${count} channels)`);
});

redisSub.on('message', (channel, message) => {
  if (channel === 'stadium_updates') {
    const data = JSON.parse(message);
    // Broadcast every event to every connected client
    io.to('global').emit('stadium_updates', data);
  }
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`[Server] Core API & WebSocket running on port ${PORT}`);
  startSimulationEngine();
});
