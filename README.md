# Home Security Camera System

A low-cost, motion-triggered video monitoring system built with an **ESP32-CAM** and a full-stack web application. Records clips on motion detection, sends real-time alerts, and supports privacy controls including arming/disarming, region masking, and local storage — no cloud required.

---

## Features

- 📷 **Motion-triggered recording** — Automatically captures video clips when movement is detected
- 🔔 **Real-time alerts** — Instant notifications when motion events occur
- 🔒 **Arming & disarming** — Enable or disable monitoring remotely via the web UI
- 🟥 **Privacy masking** — Define regions of the frame to exclude from detection and recording
- 💾 **Local storage** — Footage saved locally, keeping your data off third-party servers
- 🌐 **Live stream** — View the camera feed in real time from any browser on your network


---

## Tech Stack

| Layer | Technology |
|---|---|
| Firmware | C++ (Arduino / ESP-IDF) |
| Backend | Node.js, TypeScript |
| Frontend | React, TypeScript, CSS |
| Hardware | ESP32-CAM module |

---

## Hardware Requirements

- **ESP32-CAM** module (AI-Thinker or compatible)
- USB-to-TTL serial adapter (for flashing firmware)
- 5V power supply
- MicroSD card (for local clip storage)
- Wi-Fi network

---

## Getting Started

### 1. Flash the ESP32-CAM firmware

```bash
cd ESP32Cam_WebUI
# Open in Arduino IDE or PlatformIO
# Select board: AI Thinker ESP32-CAM
# Set your Wi-Fi credentials in the config
# Upload the sketch
```

> **Note:** Connect GPIO0 to GND before uploading. Remove the jumper and press Reset after flashing.

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env   # Fill in your config (camera IP, ports, etc.)
npm run dev
```

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

Then open your browser and navigate to `http://localhost:5173` (or whichever port is configured).

---

## ️Configuration

Create a `.env` file in `backend/` with the following variables:

```env
CAMERA_IP=192.168.x.x       # Local IP of the ESP32-CAM
PORT=3000                    # Backend server port
STORAGE_PATH=./clips         # Directory for saved video clips
```

---

## Usage

1. Power on the ESP32-CAM and confirm it connects to your Wi-Fi (check Serial Monitor for its IP)
2. Start the backend and frontend servers
3. Open the dashboard in your browser
4. Use the **Arm** toggle to begin monitoring
5. Motion events will trigger clip recordings, which appear in the **Clips** section of the dashboard
6. Configure **privacy masks** from the settings panel to exclude specific frame regions

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## Authors

**Francisco Vu** — [franware1](https://github.com/franware1)
**Denis Hallvaxhiu** - [DenisHallvaxhiu](https://github.com/DenisHallvaxhiu)

