// backend/server.js
import "dotenv/config";
import "./db.js"
const PORT = process.env.PORT || 8000;

import express from "express"; 
import path from "node:path";
import server, { CAMERAS } from "./routes/server.js";
import auth from "./routes/auth.js";
import cors from 'cors'
import morgan from 'morgan'

const app = express();

const FRONTEND_ORIGIN = "http://localhost:5173"

// app.use(cors()) is implemented into the router themselves
app.use(express.json());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true

}))

// routes
app.use("/server", server)
app.use("/api/v1/sign", auth)

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
