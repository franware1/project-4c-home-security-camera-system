// backend/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------- Config ----------
function normalizeHost(v) {
  if (!v) return '';
  return v.startsWith('http://') || v.startsWith('https://') ? v : `http://${v}`;
}

const ESP_HOST_RAW = process.env.ESP_HOST || ''; // e.g. "192.168.1.42" or "192.168.1.42:81"
const ESP_HOST = normalizeHost(ESP_HOST_RAW);    // ensures http:// prefix if missing
const PORT = process.env.PORT || 4000;           // backend port

if (!ESP_HOST) {
  console.warn('\n⚠️  No ESP_HOST set in .env – backend will start, but ESP routes will fail.\n');
}

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Helper to choose http/https based on ESP_HOST
function getHttpClient(url) {
  return url.startsWith('https://') ? https : http;
}

// Generic proxy helper for GET requests
function proxyGet(req, res, targetPath) {
  if (!ESP_HOST) {
    return res.status(500).json({ error: 'ESP_HOST is not configured on the server' });
  }

  const url = `${ESP_HOST}${targetPath}`;
  const client = getHttpClient(url);

  const espReq = client.get(url, espRes => {
    // Forward original status and headers (especially important for stream / images)
    res.writeHead(espRes.statusCode || 500, espRes.headers);
    espRes.pipe(res);
  });

  espReq.on('error', err => {
    console.error(`Error proxying to ESP (${url}):`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to reach ESP32', details: err.message });
    }
  });
}

// ---------- API Routes ----------

// Stream video from ESP -> /api/stream
app.get('/api/stream', (req, res) => {
  proxyGet(req, res, '/stream');
});

// Capture single frame -> /api/capture
app.get('/api/capture', (req, res) => {
  proxyGet(req, res, '/capture');
});

// Get camera info (name, etc.) -> /api/camera-info
app.get('/api/camera-info', (req, res) => {
  proxyGet(req, res, '/info');
});

// Control flash (expects ?pwm=0–255) -> /api/flash?pwm=...
app.get('/api/flash', (req, res) => {
  const { pwm } = req.query;

  if (pwm === undefined) {
    return res.status(400).json({ error: 'Missing "pwm" query parameter' });
  }

  const targetPath = `/flash?pwm=${encodeURIComponent(pwm)}`;
  proxyGet(req, res, targetPath);
});

// Optional: simple health check (does NOT call ESP)
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    espHost: ESP_HOST_RAW || null,
  });
});

// ---------- Static Frontend (React build) ----------
const distDir = path.join(__dirname, '../frontend/dist');

// Serve compiled frontend if it exists
app.use(express.static(distDir));

// Catch-all: let React Router handle client routes
app.use((req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`\n✅ Backend listening:\nhttp://localhost:${PORT}`);
  console.log(`✅ ESP32 target:\n${ESP_HOST}\n`);
});
