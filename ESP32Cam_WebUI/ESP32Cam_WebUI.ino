/*******************************************************
 * ESP32-CAM (AI-Thinker): API-only firmware (no SPIFFS)
 * - Endpoints:
 *     GET /capture   -> single JPEG
 *     GET /stream    -> MJPEG multipart stream
 *     GET /flash?pwm=0..255
 *     GET /setres?size=QVGA|VGA|SVGA|XGA|SXGA|UXGA
 *     GET /setquality?p=10..63   (10=best, 63=worst)
 *     GET /status    -> JSON (optional)
 * - Use with a separate backend (Node/Express) that proxies to the browser.
 *******************************************************/

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"

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


// ---- Camera defaults (tuned for speed over quality) ----
// Use lower resolution for faster streaming (QVGA is 320x240)
#define DEFAULT_FRAMESIZE     FRAMESIZE_QVGA   // QVGA/VGA/SVGA/XGA/SXGA/UXGA
// Higher number = more compression = smaller files = faster
#define DEFAULT_JPEG_QUALITY  30               // 10(best)..63(worst)

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
    config.fb_count     = 2;      // 2 buffers keeps streaming smooth
  #ifdef CAMERA_GRAB_LATEST
    config.grab_mode    = CAMERA_GRAB_LATEST;
  #endif
  } else {
    config.frame_size   = FRAMESIZE_QVGA;
    config.jpeg_quality = 35;     // a bit more compressed on no-PSRAM boards
    config.fb_count     = 1;
  }
  return (esp_camera_init(&config) == ESP_OK);
}

// ---------- Flash PWM (core v2.x vs v3.x compatible) ----------
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

// ---------- Handlers (API only) ----------
void handleCapture() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) { server.send(500, "text/plain", "capture failed"); return; }
  server.setContentLength(fb->len);
  server.send(200, "image/jpeg", "");
  WiFiClient c = server.client();
  c.write(fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

// MJPEG stream: tuned a bit for responsiveness
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
    if (!fb) {
      delay(5);
      continue;
    }
    client.print("--frame\r\n");
    client.print("Content-Type: image/jpeg\r\n");
    client.print("Content-Length: "); client.print(fb->len); client.print("\r\n\r\n");

    size_t w = client.write(fb->buf, fb->len);
    esp_camera_fb_return(fb);

    if (w != fb->len) {
      // client couldn’t keep up → break out
      break;
    }
    client.print("\r\n");

    // Small delay so we don't absolutely hammer the hotspot
    delay(5);
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

void handleSetQuality() {
  if (!server.hasArg("p")) { server.send(400, "text/plain", "missing ?p=10..63"); return; }
  int q = constrain(server.arg("p").toInt(), 10, 63);
  sensor_t* s = esp_camera_sensor_get();
  if (!s) { server.send(500, "text/plain", "no sensor"); return; }
  s->set_quality(s, q);
  server.send(200, "text/plain", String("quality=") + q);
}

void handleFlash() {
  if (!server.hasArg("pwm")) { server.send(400, "text/plain", "missing ?pwm=0..255"); return; }
  int pwm = constrain(server.arg("pwm").toInt(), 0, 255);
  setFlashPWM(pwm);
  server.send(200, "text/plain", String("flash=") + pwm);
}

void handleStatus() {
  String j = String("{\"ip\":\"") + WiFi.localIP().toString() +
             "\",\"heap\":" + ESP.getFreeHeap() +
             ",\"psram\":" + ESP.getPsramSize() + "}";
  server.send(200, "application/json", j);
}

// ---------- WIFI CONNECT (HOME / HOTSPOT) ----------
void connectWiFi() {
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);              // keep WiFi fully awake for better throughput
  WiFi.setHostname("esp32cam");

  Serial.println("[HOME] Connecting to WiFi...");
  Serial.printf("SSID: %s\n", WIFI_HOME_SSID);
  WiFi.begin(WIFI_HOME_SSID, WIFI_HOME_PASS);

  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 30000) {
    delay(500);
    wl_status_t st = WiFi.status();
    Serial.print(".");
    Serial.print((int)st);  // print numeric status
  }
  Serial.println();

  wl_status_t finalStatus = WiFi.status();
  if (finalStatus == WL_CONNECTED) {
    Serial.print("WiFi connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.print("WiFi connect failed. Status = ");
    Serial.println((int)finalStatus);
  }
}

// ---------- Setup / Loop ----------
void setup() {
  Serial.begin(115200);
  delay(100);

  if (!initCamera()) {
    Serial.println("Camera init failed! Check power/board/PSRAM.");
    while (true) { delay(1000); }
  }
  initFlashPWM();

  // WiFi
  connectWiFi();

  // API routes only
  server.on("/capture",   HTTP_GET, handleCapture);
  server.on("/stream",    HTTP_GET, handleStream);
  server.on("/flash",     HTTP_GET, handleFlash);
  server.on("/setres",    HTTP_GET, handleSetRes);
  server.on("/setquality",HTTP_GET, handleSetQuality);
  server.on("/status",    HTTP_GET, handleStatus);

  // 404 for everything else
  server.onNotFound([]() {
    server.send(404, "text/plain", "Not found");
  });

  server.begin();
  Serial.println("HTTP server started. Try: /capture, /stream, /flash, /setres, /setquality, /status");
}

void loop() {
  server.handleClient();
}
