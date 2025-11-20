/*******************************************************
 * ESP32-CAM (AI-Thinker): Minimal API firmware (non-blocking stream)
 * - Endpoints:
 *     GET /capture       -> single JPEG
 *     GET /stream        -> MJPEG multipart stream (non-blocking)
 *     GET /flash?pwm=0..255
 *     GET /status        -> JSON
 *     GET /info          -> JSON (name, room, address)
 *     GET /config        -> update name/room/address via query params
 *     GET /debug         -> JSON with call counters
 *******************************************************/

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"
#include <Preferences.h>

// ---- Secrets (put in config_secrets.h; do NOT commit) ----
//   #pragma once
//   #define WIFI_HOME_SSID "your-ssid"
//   #define WIFI_HOME_PASS "your-password"
#include "config_secrets.h"

// Fallbacks if not defined in config_secrets.h
#ifndef WIFI_HOME_SSID
#define WIFI_HOME_SSID "YOUR_HOME_SSID"
#endif
#ifndef WIFI_HOME_PASS
#define WIFI_HOME_PASS "YOUR_HOME_PASS"
#endif

// ---- Camera defaults (fixed VGA) ----
#define DEFAULT_FRAMESIZE FRAMESIZE_VGA  // 640x480
#define DEFAULT_JPEG_QUALITY 35          // 10(best)..63(worst), higher=faster

// ---- AI-Thinker pins (DO NOT CHANGE) ----
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

// ---- Flash LED ----
#define LED_FLASH_PIN 4
#define LED_FLASH_LEDC_CH 4
#define LED_FLASH_LEDC_FREQ 5000
#define LED_FLASH_LEDC_BITS 8

WebServer server(80);
Preferences prefs;

// ---- Camera config (user-editable, stored in NVS) ----
String g_camName = "Default_Name";
String g_camRoom = "Default_Room";
String g_camAddress = "Default_Address";

// ---- Debug counters ----
uint32_t g_captureCalls = 0;
uint32_t g_streamSessions = 0;
uint32_t g_flashCalls = 0;
uint32_t g_statusCalls = 0;
uint32_t g_debugCalls = 0;

// ---- Streaming state (non-blocking) ----
WiFiClient streamClient;
bool streamingActive = false;
uint32_t lastFrameMs = 0;
const uint32_t STREAM_INTERVAL_MS = 10;  // min delay between frames

// ---------- Camera config load/save (NVS) ----------
void loadCameraConfig() {
  prefs.begin("camcfg", true);  // read-only
  g_camName = prefs.getString("name", "Default_Name");
  g_camRoom = prefs.getString("room", "Default_Room");
  g_camAddress = prefs.getString("address", "Default_Address");

  prefs.end();

  Serial.println("[CFG] Loaded camera config:");
  Serial.println("      name: " + g_camName);
  Serial.println("      room: " + g_camRoom);
  Serial.println("      addr: " + g_camAddress);
}

void saveCameraConfig() {
  prefs.begin("camcfg", false);  // read/write
  prefs.putString("name", g_camName);
  prefs.putString("room", g_camRoom);
  prefs.putString("address", g_camAddress);
  prefs.end();

  Serial.println("[CFG] Saved camera config:");
  Serial.println("      name: " + g_camName);
  Serial.println("      room: " + g_camRoom);
  Serial.println("      addr: " + g_camAddress);
}

// ---------- Camera init ----------
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = DEFAULT_FRAMESIZE;
    config.jpeg_quality = DEFAULT_JPEG_QUALITY;
    config.fb_count = 1;  // single buffer for stability
#ifdef CAMERA_GRAB_LATEST
    config.grab_mode = CAMERA_GRAB_LATEST;
#endif
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 40;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return false;
  }
  Serial.println("Camera init OK");
  return true;
}

// ---------- Flash PWM ----------
void initFlashPWM() {
  pinMode(LED_FLASH_PIN, OUTPUT);
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(LED_FLASH_PIN, LED_FLASH_LEDC_FREQ, LED_FLASH_LEDC_BITS);
  ledcWrite(LED_FLASH_PIN, 0);
#else
  ledcSetup(LED_FLASH_LEDC_CH, LED_FLASH_LEDC_FREQ, LED_FLASH_LEDC_BITS);
  ledcAttachPin(LED_FLASH_PIN, LED_FLASH_LEDC_CH);
  ledcWrite(LED_FLASH_LEDC_CH, 0);
#endif
}

void setFlashPWM(uint8_t duty) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(LED_FLASH_PIN, duty);
#else
  ledcWrite(LED_FLASH_LEDC_CH, duty);
#endif
}

// ---------- Handlers ----------

void handleCapture() {
  g_captureCalls++;
  uint32_t t0 = millis();
  Serial.printf("[CAPTURE] #%u called at %lu ms\n", g_captureCalls, t0);

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[CAPTURE] fb == NULL, sending 500");
    server.send(500, "text/plain", "capture failed");
    return;
  }

  Serial.printf("[CAPTURE] frame size = %u bytes\n", fb->len);

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.setContentLength(fb->len);
  server.send(200, "image/jpeg", "");
  WiFiClient c = server.client();
  size_t w = c.write(fb->buf, fb->len);
  esp_camera_fb_return(fb);

  Serial.printf("[CAPTURE] wrote %u bytes\n", (unsigned)w);
}

// Camera info (JSON)
void handleCameraInfo() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  String json = "{";
  json += "\"name\":\"" + g_camName + "\",";
  json += "\"room\":\"" + g_camRoom + "\",";
  json += "\"address\":\"" + g_camAddress + "\"";
  json += "}";
  server.send(200, "application/json", json);
}

// Camera config update (via query params)
//   /config?name=FrontDoor&room=Porch&addr=123%20Main
void handleSetCameraConfig() {
  Serial.println("[CFG] Update requested");

  bool changed = false;

  if (server.hasArg("name")) {
    g_camName = server.arg("name");
    changed = true;
  }

  if (server.hasArg("room")) {
    g_camRoom = server.arg("room");
    changed = true;
  }

  if (server.hasArg("addr")) {  // short alias
    g_camAddress = server.arg("addr");
    changed = true;
  } else if (server.hasArg("address")) {  // or full name
    g_camAddress = server.arg("address");
    changed = true;
  }

  if (changed) {
    saveCameraConfig();
  }

  handleCameraInfo();  // respond with current config
}

// Non-blocking stream: set up client + headers; frames sent in loop()
void handleStream() {
  g_streamSessions++;
  uint32_t tStart = millis();

  // If an old stream is active, close it
  if (streamingActive && streamClient && streamClient.connected()) {
    Serial.println("[STREAM] Replacing existing stream client");
    streamClient.stop();
  }

  streamClient = server.client();
  if (!streamClient) {
    Serial.println("[STREAM] client invalid");
    return;
  }

  streamClient.setNoDelay(true);

  streamClient.print(
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n"
    "Cache-Control: no-cache, no-store, must-revalidate\r\n"
    "Pragma: no-cache\r\n"
    "Connection: keep-alive\r\n\r\n");

  streamingActive = true;
  lastFrameMs = 0;

  IPAddress remote = streamClient.remoteIP();
  Serial.printf("[STREAM] Session #%u started from %s at %lu ms\n",
                g_streamSessions,
                remote.toString().c_str(),
                tStart);
}

void handleFlash() {
  g_flashCalls++;
  uint32_t t0 = millis();
  Serial.printf("[FLASH] #%u called at %lu ms\n", g_flashCalls, t0);

  if (!server.hasArg("pwm")) {
    Serial.println("[FLASH] missing ?pwm");
    server.send(400, "text/plain", "missing ?pwm=0..255");
    return;
  }
  int pwm = constrain(server.arg("pwm").toInt(), 0, 255);
  setFlashPWM(pwm);
  Serial.printf("[FLASH] pwm=%d\n", pwm);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", String("flash=") + pwm);
}

void handleStatus() {
  g_statusCalls++;
  uint32_t t0 = millis();
  Serial.printf("[STATUS] #%u called at %lu ms\n", g_statusCalls, t0);

  String j = String("{\"ip\":\"") + WiFi.localIP().toString() + "\",\"heap\":" + ESP.getFreeHeap() + ",\"psram\":" + ESP.getPsramSize() + "}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", j);
}

// Small debug endpoint returning counters
void handleDebug() {
  g_debugCalls++;
  uint32_t t0 = millis();
  Serial.printf("[DEBUG] #%u called at %lu ms\n", g_debugCalls, t0);

  String j = "{";
  j += "\"capture\":" + String(g_captureCalls);
  j += ",\"stream\":" + String(g_streamSessions);
  j += ",\"flash\":" + String(g_flashCalls);
  j += ",\"status\":" + String(g_statusCalls);
  j += ",\"debug\":" + String(g_debugCalls);
  j += "}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", j);
}

// ---------- WIFI CONNECT ----------
void connectWiFi() {
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  WiFi.setHostname(g_camName.c_str());  // use dynamic camera name as hostname
  WiFi.setTxPower(WIFI_POWER_19_5dBm);

  Serial.println("[WIFI] Connecting...");
  Serial.printf("[WIFI] SSID: %s\n", WIFI_HOME_SSID);

  WiFi.begin(WIFI_HOME_SSID, WIFI_HOME_PASS);

  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 30000) {
    delay(500);
    wl_status_t st = WiFi.status();
    Serial.print(".");
    Serial.print((int)st);
  }
  Serial.println();

  wl_status_t finalStatus = WiFi.status();
  if (finalStatus == WL_CONNECTED) {
    Serial.print("[WIFI] Connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.print("[WIFI] Connect failed. Status = ");
    Serial.println((int)finalStatus);
  }
}

// ---------- Streaming frame sender (called from loop) ----------
void pumpStreamFrame() {
  if (!streamingActive) return;
  if (!streamClient || !streamClient.connected()) {
    if (streamingActive) {
      Serial.println("[STREAM] client disconnected, stopping stream");
    }
    streamingActive = false;
    if (streamClient) streamClient.stop();
    return;
  }

  uint32_t now = millis();
  if (now - lastFrameMs < STREAM_INTERVAL_MS) {
    return;  // too soon, wait a bit
  }
  lastFrameMs = now;

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[STREAM] fb == NULL, skipping frame");
    return;
  }

  // Write multipart frame
  streamClient.print("--frame\r\n");
  streamClient.print("Content-Type: image/jpeg\r\n");
  streamClient.print("Content-Length: ");
  streamClient.print(fb->len);
  streamClient.print("\r\n\r\n");

  size_t w = streamClient.write(fb->buf, fb->len);
  esp_camera_fb_return(fb);

  if (w != fb->len) {
    Serial.printf("[STREAM] short write: wrote %u of %u, closing\n",
                  (unsigned)w, (unsigned)fb->len);
    streamClient.stop();
    streamingActive = false;
    return;
  }

  streamClient.print("\r\n");
}

// ---------- Setup / Loop ----------
void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("\n=== ESP32-CAM Home Security Firmware (NON-BLOCKING STREAM) ===");

  loadCameraConfig();  // load name/room/address before WiFi

  if (!initCamera()) {
    Serial.println("Camera init failed! Halting.");
    while (true) { delay(1000); }
  }

  initFlashPWM();
  connectWiFi();

  // Routes
  server.on("/capture", HTTP_GET, handleCapture);
  server.on("/stream", HTTP_GET, handleStream);
  server.on("/flash", HTTP_GET, handleFlash);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/info", HTTP_GET, handleCameraInfo);
  server.on("/config", HTTP_GET, handleSetCameraConfig);
  server.on("/debug", HTTP_GET, handleDebug);

  server.onNotFound([]() {
    Serial.printf("[404] %s\n", server.uri().c_str());
    server.send(404, "text/plain", "Not found");
  });

  server.begin();
  Serial.println("[HTTP] Server started.");
  Serial.println("Try: /capture, /stream, /flash, /status, /info, /config, /debug");
}

void loop() {
  server.handleClient();  // handle new HTTP requests
  pumpStreamFrame();      // send one frame if streaming
}
