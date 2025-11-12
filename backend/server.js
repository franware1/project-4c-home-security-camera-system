import 'dotenv/config';
import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";

//Create an env file with ESP_HOST and PORT variables
const ESP_HOST = process.env.ESP_HOST;
const PORT = process.env.PORT;

// If Node < 18, uncomment next line and install node-fetch:
// import fetch from "node-fetch";

const app = express();
app.use(cors());                 // allow all origins in dev
app.use(express.json());
app.use(morgan("dev"));

// ---- API: status (optional helper on ESP32; if not present returns 404) ----
app.get("/api/status", async (req, res) => {
  try {
    const r = await fetch(`${ESP_HOST}/status`);
    res.status(r.status);
    for (const [k, v] of r.headers) res.setHeader(k, v);
    res.send(await r.text());
  } catch (e) {
    res.status(502).send(String(e));
  }
});

// ---- API: capture -> jpeg ---
app.get("/api/capture", async (req, res) => {
  try {
    const r = await fetch(`${ESP_HOST}/capture`);
    res.setHeader("Content-Type", "image/jpeg");
    (await r.arrayBuffer()) && res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(502).send(String(e));
  }
});

// ---- API: stream -> MJPEG passthrough ----
app.get("/api/stream", (req, res) => {
  http.get(`${ESP_HOST}/stream`, (r) => {
    // forward headers (includes multipart/x-mixed-replace)
    Object.entries(r.headers).forEach(([k, v]) => v && res.setHeader(k, v));
    r.pipe(res);
  }).on("error", (err) => {
    res.status(502).send(String(err));
  });
});

// ---- Controls ----
app.get("/api/flash", async (req, res) => {
  const pwm = req.query.pwm ?? "0";
  try {
    const r = await fetch(`${ESP_HOST}/flash?pwm=${pwm}`);
    res.status(r.status).send(await r.text());
  } catch (e) {
    res.status(502).send(String(e));
  }
});

app.get("/api/setres", async (req, res) => {
  const size = req.query.size ?? "VGA";
  try {
    const r = await fetch(`${ESP_HOST}/setres?size=${encodeURIComponent(size)}`);
    res.status(r.status).send(await r.text());
  } catch (e) {
    res.status(502).send(String(e));
  }
});

// ---- Serve frontend in production (after build) ----
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "../frontend/dist");
app.use(express.static(distDir));
// Catch-all to serve frontend index.html
app.use((req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});


app.listen(PORT, () => {
  console.log(`Backend on http://localhost:${PORT}`);
  console.log(`Proxying ESP32 at ${ESP_HOST}`);
});
