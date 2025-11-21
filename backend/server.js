// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import https from "https";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

// ---------- Config helpers ----------
function normalizeHost(v) {
  if (!v) return "";
  return v.startsWith("http://") || v.startsWith("https://") ? v : `http://${v}`;
}

// Path to ffmpeg binary
// - By default uses "ffmpeg" (requires it to be on PATH)
// - You can override with env var FFMPEG_PATH
const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";

// Define your cameras here (or via env vars)
const CAMERAS = [
  {
    id: "front",
    label: "Front Door",
    baseUrl: normalizeHost(process.env.CAM_FRONT || "http://192.168.1.51"),
  },
  {
    id: "back",
    label: "Back Yard",
    baseUrl: normalizeHost(process.env.CAM_BACK || "http://192.168.1.52"),
  },
].filter((cam) => !!cam.baseUrl);

const PORT = process.env.PORT || 8000;

// Basic sanity log
if (CAMERAS.length === 0) {
  console.warn(
    "\n⚠️  No cameras configured. Set CAM_FRONT / CAM_BACK env vars or edit CAMERAS array.\n"
  );
} else {
  console.log("\n📹 Configured cameras:");
  CAMERAS.forEach((cam) => {
    console.log(`  - ${cam.id}: ${cam.baseUrl} (${cam.label})`);
  });
  console.log("");
}

console.log(`🎬 Using ffmpeg binary: ${FFMPEG_BIN}`);

// Helper to find a camera by id
function findCamera(id) {
  return CAMERAS.find((c) => c.id === id);
}

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Directory to store recordings (ensure it exists)
const recordingsDir = path.join(__dirname, "recordings");
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Map of active recordings: cameraId -> { filePath, ffmpeg }
const activeRecordings = new Map();

// ---------- Middleware ----------
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Helper to choose http/https based on baseUrl
function getHttpClient(url) {
  return url.startsWith("https://") ? https : http;
}

// Generic proxy helper for GET requests (per camera)
function proxyGetFromCamera(camera, res, targetPath) {
  if (!camera || !camera.baseUrl) {
    return res
      .status(500)
      .json({ error: "Camera is not configured on the server" });
  }

  const url = `${camera.baseUrl}${targetPath}`;
  const client = getHttpClient(url);

  const espReq = client.get(url, (espRes) => {
    res.writeHead(espRes.statusCode || 500, espRes.headers);
    espRes.pipe(res);
  });

  espReq.on("error", (err) => {
    console.error(`Error proxying to ESP (${camera.id} @ ${url}):`, err.message);
    if (!res.headersSent) {
      res
        .status(502)
        .json({ error: "Failed to reach ESP32 camera", details: err.message });
    }
  });
}

// ---------- API Routes ----------

// List all configured cameras (metadata only)
app.get("/api/cameras", (req, res) => {
  res.json(
    CAMERAS.map((cam) => ({
      id: cam.id,
      label: cam.label,
      baseUrl: cam.baseUrl,
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
app.get("/api/cameras/:id/stream", cameraMiddleware, (req, res) => {
  proxyGetFromCamera(req.camera, res, "/stream");
});

// Capture single frame -> /api/cameras/:id/capture
app.get("/api/cameras/:id/capture", cameraMiddleware, (req, res) => {
  proxyGetFromCamera(req.camera, res, "/capture");
});

// Get camera info (name, room, address) -> /api/cameras/:id/info
app.get("/api/cameras/:id/info", cameraMiddleware, (req, res) => {
  proxyGetFromCamera(req.camera, res, "/info");
});

// Control flash (expects ?pwm=0–255) -> /api/cameras/:id/flash?pwm=...
app.get("/api/cameras/:id/flash", cameraMiddleware, (req, res) => {
  const { pwm } = req.query;

  if (pwm === undefined) {
    return res.status(400).json({ error: 'Missing "pwm" query parameter' });
  }

  const targetPath = `/flash?pwm=${encodeURIComponent(pwm)}`;
  proxyGetFromCamera(req.camera, res, targetPath);
});

// Proxy config changes to ESP’s /config
app.get("/api/cameras/:id/config", cameraMiddleware, (req, res) => {
  const search = new URLSearchParams(req.query).toString();
  const targetPath = search ? `/config?${search}` : "/config";
  proxyGetFromCamera(req.camera, res, targetPath);
});

// ---- Recording: start (ffmpeg-based) ----
// POST /api/cameras/:id/record/start
app.post("/api/cameras/:id/record/start", cameraMiddleware, (req, res) => {
  const camera = req.camera;

  if (activeRecordings.has(camera.id)) {
    return res.json({
      ok: false,
      message: "Recording already in progress for this camera",
    });
  }

  const timestamp = Date.now();
  const filename = `${camera.id}_${timestamp}.mp4`;
  const filePath = path.join(recordingsDir, filename);

  const inputUrl = `${camera.baseUrl}/stream`;

  console.log(
    `[REC] Starting ffmpeg recording for camera "${camera.id}" → ${filename}`
  );

  // ffmpeg -y -i <url> -c:v libx264 -preset veryfast -crf 23 <filePath>
  const ffmpeg = spawn(FFMPEG_BIN, [
    "-y",
    "-i",
    inputUrl,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    filePath,
  ]);

  ffmpeg.stderr.on("data", (data) => {
    console.log(`[ffmpeg ${camera.id}] ${data}`);
  });

  ffmpeg.on("close", (code, signal) => {
    console.log(
      `[REC] ffmpeg for camera "${camera.id}" exited with code=${code} signal=${signal}`
    );
    activeRecordings.delete(camera.id);
  });

  ffmpeg.on("error", (err) => {
    console.error(`[REC] Failed to start ffmpeg for "${camera.id}":`, err);
    activeRecordings.delete(camera.id);
  });

  activeRecordings.set(camera.id, { filePath, ffmpeg });

  return res.json({
    ok: true,
    message: "Recording started",
    file: filename,
  });
});

// ---- Recording: stop (ffmpeg-based, idempotent) ----
// POST /api/cameras/:id/record/stop
app.post("/api/cameras/:id/record/stop", cameraMiddleware, (req, res) => {
  const camera = req.camera;
  const rec = activeRecordings.get(camera.id);

  if (!rec) {
    // No active recording – treat as success so frontend doesn't error
    return res.json({
      ok: false,
      message: "No active recording for this camera",
      file: null,
    });
  }

  console.log(
    `[REC] Stopping ffmpeg recording for camera "${camera.id}" → ${path.basename(
      rec.filePath
    )}`
  );

  // Politely ask ffmpeg to finish
  rec.ffmpeg.kill("SIGINT");

  activeRecordings.delete(camera.id);

  return res.json({
    ok: true,
    message: "Recording stop requested",
    file: path.basename(rec.filePath),
  });
});

// Optional: simple health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    cameras: CAMERAS.map((cam) => ({
      id: cam.id,
      label: cam.label,
      baseUrl: cam.baseUrl,
      recording: activeRecordings.has(cam.id),
    })),
  });
});

// ---------- Static Frontend (React build) ----------
const distDir = path.join(__dirname, "../frontend/dist");

app.use(express.static(distDir));

app.use((req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`\n✅ Backend listening:\nhttp://localhost:${PORT}`);
  if (CAMERAS.length) {
    console.log("✅ Cameras:");
    CAMERAS.forEach((cam) => {
      console.log(`   - ${cam.id}: ${cam.baseUrl} (${cam.label})`);
    });
  } else {
    console.log("⚠️  No cameras configured.");
  }
  console.log("");
});
