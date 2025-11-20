// backend/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------- Config helpers ----------
function normalizeHost(v) {
  if (!v) return '';
  return v.startsWith('http://') || v.startsWith('https://') ? v : `http://${v}`;
}

// Define your cameras here (or via env vars)
// You can add/remove entries as needed.
const CAMERAS = [
  {
    id: 'front',                       // used in URLs: /api/cameras/front/...
    label: 'Front Door',               // just a human-friendly label
    baseUrl: normalizeHost(process.env.CAM_FRONT || 'http://192.168.12.181'),
  },
  {
    id: 'back',
    label: 'Back Yard',
    baseUrl: normalizeHost(process.env.CAM_BACK || 'http://192.168.12.181'),
  },
  // Add more cameras if you want:
  // {
  //   id: 'garage',
  //   label: 'Garage',
  //   baseUrl: normalizeHost(process.env.CAM_GARAGE || 'http://192.168.1.53'),
  // },
].filter(cam => !!cam.baseUrl); // drop any empty ones

const PORT = process.env.PORT || 4000;

// Basic sanity log
if (CAMERAS.length === 0) {
  console.warn('\n⚠️  No cameras configured. Set CAM_FRONT / CAM_BACK env vars or edit CAMERAS array.\n');
} else {
  console.log('\n📹 Configured cameras:');
  CAMERAS.forEach(cam => {
    console.log(`  - ${cam.id}: ${cam.baseUrl} (${cam.label})`);
  });
  console.log('');
}

// Helper to find a camera by id
function findCamera(id) {
  return CAMERAS.find(c => c.id === id);
}

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Helper to choose http/https based on baseUrl
function getHttpClient(url) {
  return url.startsWith('https://') ? https : http;
}

// Generic proxy helper for GET requests (per camera)
function proxyGetFromCamera(camera, res, targetPath) {
  if (!camera || !camera.baseUrl) {
    return res.status(500).json({ error: 'Camera is not configured on the server' });
  }

  const url = `${camera.baseUrl}${targetPath}`;
  const client = getHttpClient(url);

  const espReq = client.get(url, espRes => {
    // Forward original status and headers (important for MJPEG / images)
    res.writeHead(espRes.statusCode || 500, espRes.headers);
    espRes.pipe(res);
  });

  espReq.on('error', err => {
    console.error(`Error proxying to ESP (${camera.id} @ ${url}):`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to reach ESP32 camera', details: err.message });
    }
  });
}

// ---------- API Routes ----------

// List all configured cameras (metadata only)
app.get('/api/cameras', (req, res) => {
  res.json(
    CAMERAS.map(cam => ({
      id: cam.id,
      label: cam.label,
      baseUrl: cam.baseUrl, // you can omit this if you don’t want to expose LAN IPs
    }))
  );
});

// Middleware: ensure camera exists
function cameraMiddleware(req, res, next) {
  const { id } = req.params;
  const camera = findCamera(id);
  if (!camera) {
    return res.status(404).json({ error: `Unknown camera id "${id}"` });
  }
  req.camera = camera;
  next();
}

// Stream video from specific camera -> /api/cameras/:id/stream
app.get('/api/cameras/:id/stream', cameraMiddleware, (req, res) => {
  proxyGetFromCamera(req.camera, res, '/stream');
});

// Capture single frame -> /api/cameras/:id/capture
app.get('/api/cameras/:id/capture', cameraMiddleware, (req, res) => {
  proxyGetFromCamera(req.camera, res, '/capture');
});

// Get camera info (name, room, address) -> /api/cameras/:id/info
app.get('/api/cameras/:id/info', cameraMiddleware, (req, res) => {
  proxyGetFromCamera(req.camera, res, '/info');
});

// Control flash (expects ?pwm=0–255) -> /api/cameras/:id/flash?pwm=...
app.get('/api/cameras/:id/flash', cameraMiddleware, (req, res) => {
  const { pwm } = req.query;

  if (pwm === undefined) {
    return res.status(400).json({ error: 'Missing "pwm" query parameter' });
  }

  const targetPath = `/flash?pwm=${encodeURIComponent(pwm)}`;
  proxyGetFromCamera(req.camera, res, targetPath);
});

// Proxy config changes to ESP’s /config
// You can pass any query params supported by the ESP, e.g.:
//   /api/cameras/front/config?name=LivingRoom&room=Living%20Room&addr=123%20Main
app.get('/api/cameras/:id/config', cameraMiddleware, (req, res) => {
  const search = new URLSearchParams(req.query).toString();
  const targetPath = search ? `/config?${search}` : '/config';
  proxyGetFromCamera(req.camera, res, targetPath);
});

// Optional: simple health check (does NOT call ESP)
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    cameras: CAMERAS.map(cam => ({
      id: cam.id,
      label: cam.label,
      baseUrl: cam.baseUrl,
    })),
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
  if (CAMERAS.length) {
    console.log('✅ Cameras:');
    CAMERAS.forEach(cam => {
      console.log(`   - ${cam.id}: ${cam.baseUrl} (${cam.label})`);
    });
  } else {
    console.log('⚠️  No cameras configured.');
  }
  console.log('');
});
