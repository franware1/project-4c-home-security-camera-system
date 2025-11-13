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

const RAW_HOST = '192.168.137.17' || 'http://192.168.1.50';
const ESP_HOST = normalizeHost(RAW_HOST);       // e.g. "http://192.168.12.181"
const PORT = Number(process.env.PORT) || 8080;

const ESP_URL = new URL(ESP_HOST);
const netClient = ESP_URL.protocol === 'https:' ? https : http;

const app = express();
app.use(cors());              // Allow all in dev; lock down later if you want
app.use(express.json());
app.use(morgan('dev'));

console.log(`Backend on port ${PORT}`);
console.log(`Proxying ESP32 at ${ESP_HOST}`);

// Helper to build full ESP URLs safely
const U = (p) => new URL(p, ESP_HOST).toString();

// Helper to proxy a GET and pipe raw body/headers to client (for JPEG/MJPEG)
function proxyPipe(pathname, res, overrideHeaders = {}) {
  const url = U(pathname);
  netClient
    .get(url, (r) => {
      // Forward headers from ESP, with optional overrides
      Object.entries(r.headers).forEach(([k, v]) => {
        if (v) res.setHeader(k, v);
      });
      Object.entries(overrideHeaders).forEach(([k, v]) => res.setHeader(k, v));

      // Pipe body
      r.pipe(res);
    })
    .on('error', (err) => {
      res.status(502).send(`Upstream error: ${String(err)}`);
    });
}

// ---------- API: status (optional; ESP must implement /status) ----------
app.get('/api/status', async (req, res) => {
  try {
    const r = await fetch(U('/status'));
    res.status(r.status);
    // Forward JSON (or text) as-is
    r.headers.forEach((v, k) => res.setHeader(k, v));
    res.send(await r.text());
  } catch (e) {
    res.status(502).send(String(e));
  }
});

// ---------- API: capture (single JPEG) ----------
app.get('/api/capture', (req, res) => {
  // Force JPEG content-type in case upstream omits it
  proxyPipe('/capture', res, { 'Content-Type': 'image/jpeg' });
});

// ---------- API: stream (MJPEG) ----------
app.get('/api/stream', (req, res) => {
  // ESP sets multipart/x-mixed-replace; we just pipe through
  proxyPipe('/stream', res);
});

// ---------- Controls ----------
app.get('/api/flash', async (req, res) => {
  const pwm = req.query?.pwm ?? '0';
  try {
    const r = await fetch(U(`/flash?pwm=${encodeURIComponent(pwm)}`));
    res.status(r.status).send(await r.text());
  } catch (e) {
    res.status(502).send(String(e));
  }
});

app.get('/api/setres', async (req, res) => {
  const size = req.query?.size ?? 'VGA';
  try {
    const r = await fetch(U(`/setres?size=${encodeURIComponent(size)}`));
    res.status(r.status).send(await r.text());
  } catch (e) {
    res.status(502).send(String(e));
  }
});

// ---------- Serve React build in production ----------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../frontend/dist');

// Only enable static serving if the build exists
app.use(express.static(distDir));
// Catch-all: let React Router handle client routes
app.use((req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`\n✅ Backend listening:  http://localhost:${PORT}`);
  console.log(`✅ ESP32 target:       ${ESP_HOST}\n`);
});
