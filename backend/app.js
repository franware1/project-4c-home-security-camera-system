// backend/server.js
import "dotenv/config";
import "./db.js"
const PORT = process.env.PORT || 5000;

import express from "express"; 
import path from "node:path";
import server from "./routes/server.js";
import auth from "./routes/auth.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Header", "*");

  next();
});

// routes
app.use("/api/v1/", server)
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
