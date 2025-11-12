/*******************************************************
 * ESP32-CAM (AI-Thinker): Serve UI from SPIFFS (/data)
 * - NO fallback page, NO file manager
 * - Root "/" serves /index.html from SPIFFS
 * - Also serves /styles.css from SPIFFS
 * - Endpoints: /stream, /capture, /flash, /setres
 *******************************************************/

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"
#include <SPIFFS.h>

// ---- Secrets (create config_secrets.h next to this .ino; do NOT commit) ----
//   #pragma once
//   #define WIFI_SSID "your-ssid"
//   #define WIFI_PASS "your-password"
#include "config_secrets.h"
#ifndef WIFI_SSID
  #define WIFI_SSID "YOUR_WIFI"
#endif
#ifndef WIFI_PASS
  #define WIFI_PASS "YOUR_PASS"
#endif

// ---- Camera defaults ----
#define DEFAULT_FRAMESIZE     FRAMESIZE_VGA   // QVGA/VGA/SVGA/XGA/SXGA/UXGA
#define DEFAULT_JPEG_QUALITY  20              // 10(best)..63(worst)

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
#define LED_FLASH_PIN        4
#define LED_FLASH_LEDC_CH    4
#define LED_FLASH_LEDC_FREQ  5000
#define LED_FLASH_LEDC_BITS  8

WebServer server(80);

// ---------- Helpers ----------
bool nameToFrameSize(const String& s, framesize_t& out) {
  if (s == "QVGA") out = FRAMESIZE_QVGA;
  else if (s == "VGA")  out = FRAMESIZE_VGA;
  else if (s == "SVGA") out = FRAMESIZE_SVGA;
  else if (s == "XGA")  out = FRAMESIZE_XGA;
  else if (s == "SXGA") out = FRAMESIZE_SXGA;
  else if (s == "UXGA") out = FRAMESIZE_UXGA;
  else return false;
  return true;
}

String contentTypeFor(const String& path) {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".css"))  return "text/css";
  if (path.endsWith(".js"))   return "application/javascript";
  if (path.endsWith(".png"))  return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".ico"))  return "image/x-icon";
  return "text/plain";
}

// Serve a static file from SPIFFS (404 if missing)
bool serveFile(String path) {
  if (path == "/") path = "/index.html";
  if (!SPIFFS.exists(path)) return false;
  File f = SPIFFS.open(path, "r");
  if (!f) return false;
  server.streamFile(f, contentTypeFor(path));
  f.close();
  return true;
}

// ---------- Camera init ----------
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size   = DEFAULT_FRAMESIZE;
    config.jpeg_quality = DEFAULT_JPEG_QUALITY;
    config.fb_count     = 2;
#ifdef CAMERA_GRAB_LATEST
    config.grab_mode    = CAMERA_GRAB_LATEST;
#endif
  } else {
    config.frame_size   = FRAMESIZE_QVGA;
    config.jpeg_quality = 25;
    config.fb_count     = 1;
  }
  return (esp_camera_init(&config) == ESP_OK);
}

// ---------- Flash PWM (v2.x vs v3.x core compatible) ----------
void initFlashPWM() {
  pinMode(LED_FLASH_PIN, OUTPUT);
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(LED_FLASH_PIN, LED_FLASH_LEDC_FREQ, LED_FLASH_LEDC_BITS); // v3.x API (pin-based)
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
void handleRoot() {
  if (!serveFile("/index.html")) server.send(404, "text/plain", "/index.html not found on SPIFFS");
}
void handleStatic() {
  if (!serveFile(server.uri())) server.send(404, "text/plain", "Not found");
}

void handleCapture() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) { server.send(500, "text/plain", "capture failed"); return; }
  server.setContentLength(fb->len);
  server.send(200, "image/jpeg", "");
  WiFiClient c = server.client();
  c.write(fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

void handleStream() {
  WiFiClient client = server.client();
  if (!client) return;
  client.setNoDelay(true);
  client.print(
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n"
    "Cache-Control: no-cache, no-store, must-revalidate\r\n"
    "Pragma: no-cache\r\n"
    "Connection: keep-alive\r\n\r\n"
  );
  while (client.connected()) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) { delay(5); continue; }
    client.print("--frame\r\n");
    client.print("Content-Type: image/jpeg\r\n");
    client.print("Content-Length: "); client.print(fb->len); client.print("\r\n\r\n");
    size_t w = client.write(fb->buf, fb->len);
    esp_camera_fb_return(fb);
    if (w != fb->len) break;
    client.print("\r\n");
    delay(1);
  }
  client.stop();
}

void handleSetRes() {
  if (!server.hasArg("size")) { server.send(400, "text/plain", "missing ?size"); return; }
  framesize_t fs;
  if (!nameToFrameSize(server.arg("size"), fs)) { server.send(400, "text/plain", "invalid size"); return; }
  sensor_t* s = esp_camera_sensor_get();
  if (!s) { server.send(500, "text/plain", "no sensor"); return; }
  s->set_framesize(s, fs);
  server.send(200, "text/plain", "res=" + server.arg("size"));
}

void handleFlash() {
  if (!server.hasArg("pwm")) { server.send(400, "text/plain", "missing ?pwm=0..255"); return; }
  int pwm = constrain(server.arg("pwm").toInt(), 0, 255);
  setFlashPWM(pwm);
  server.send(200, "text/plain", String("flash=") + pwm);
}

// ---------- Setup / Loop ----------
void setup() {
  Serial.begin(115200);
  delay(100);

  // Mount SPIFFS (no formatting, just mount; if empty, you'll get 404)
  if (!SPIFFS.begin(false)) {
    Serial.println("SPIFFS mount FAILED. Make sure you upload /data.");
    while (true) { delay(1000); }
  }

  if (!initCamera()){
    Serial.println("Camera init failed! Check power/board/PSRAM.");
    while(true){ delay(1000); }
  }
  initFlashPWM();

  // WiFi
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setHostname("esp32cam");
  Serial.printf("Connecting to %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
    delay(500); Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connect failed (check SSID/pass and 2.4 GHz).");
  }

  // Routes (only what you asked for)
  server.on("/",        HTTP_GET, handleRoot);
  server.on("/capture", HTTP_GET, handleCapture);
  server.on("/stream",  HTTP_GET, handleStream);
  server.on("/flash",   HTTP_GET, handleFlash);
  server.on("/setres",  HTTP_GET, handleSetRes);

  // Any other path tries to serve a file (e.g., /styles.css)
  server.onNotFound(handleStatic);

  server.begin();
  Serial.println("HTTP server started. Open http://<esp32-ip>/");
}

void loop() {
  server.handleClient();
}
