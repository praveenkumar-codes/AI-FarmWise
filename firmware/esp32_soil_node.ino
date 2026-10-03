/*
 * =============================================================================
 * AI FarmWise — Physical ESP32 Soil Moisture Telemetry Node (Production Firmware)
 * =============================================================================
 * Hardware:
 *   - MCU: ESP32 DevKit V1 (38-pin or 30-pin)
 *   - Sensor: Capacitive Soil Moisture Sensor v1.2 / v2.0
 *   - Pin Mapping:
 *       VCC  -> 3.3V
 *       GND  -> GND
 *       AOUT -> GPIO 34 (ADC1_CH6 — safe for simultaneous Wi-Fi operation)
 *
 * Calibration Constants (12-bit ADC: 0..4095):
 *   - Dry Air (~3200 raw ADC)         ->   0.0% Volumetric Water Content (VWC)
 *   - Saturated/Submerged (~1400 ADC) -> 100.0% Volumetric Water Content (VWC)
 *
 * Serial Monitor (115200 baud):
 *   Prints every 3 seconds:
 *   - Raw 12-bit ADC reading (0..4095)
 *   - Sensor voltage (V)
 *   - Calibrated Soil Moisture (% VWC) & Critical Threshold status (< 30.0%)
 *   - Wi-Fi RSSI / IP & HTTP POST status
 * =============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ------------------------- Network & Endpoint Config -------------------------
const char* WIFI_SSID     = "YOUR_FARM_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_FARM_WIFI_PASSWORD";
const char* SERVER_URL    = "http://192.168.1.100:8000/api/v1/telemetry";
const char* DEVICE_ID     = "esp32_zone_01";

// ------------------------- Hardware & Calibration ----------------------------
static const uint8_t  SOIL_ADC_PIN        = 34;     // ADC1_CH6 (GPIO 34)
static const int      ADC_DRY_AIR         = 3200;   // 0.0% VWC
static const int      ADC_SATURATED_WATER = 1400;   // 100.0% VWC
static const float    CRITICAL_MOISTURE   = 30.0f;  // Rice (Vegetative) threshold
static const uint8_t  OVERSAMPLE_COUNT    = 16;     // Multi-sample smoothing

// ------------------------- Non-Blocking Timers -------------------------------
static const unsigned long TELEMETRY_INTERVAL_MS      = 3000UL;   // Transmit every 3s
static const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000UL;   // Reconnect check every 5s
static const uint16_t      HTTP_TIMEOUT_MS            = 2500;

static unsigned long lastTelemetryMillis = 0;
static unsigned long lastWifiCheckMillis = 0;
static unsigned long packetCounter       = 0;

struct SoilReading {
  int   rawAdc;
  float voltage;
  float moisturePct;
};

// ------------------------- Helper: Read & Calibrate Sensor -------------------
SoilReading readCalibratedSoilSensor() {
  long adcSum = 0;
  for (uint8_t i = 0; i < OVERSAMPLE_COUNT; ++i) {
    adcSum += analogRead(SOIL_ADC_PIN);
    delayMicroseconds(250);
  }
  const float avgAdc = static_cast<float>(adcSum) / static_cast<float>(OVERSAMPLE_COUNT);
  const float voltage = (avgAdc / 4095.0f) * 3.3f;

  // Linear inverse mapping: 3200 -> 0.0%, 1400 -> 100.0%
  float moisturePct = (static_cast<float>(ADC_DRY_AIR) - avgAdc) * 100.0f /
                      static_cast<float>(ADC_DRY_AIR - ADC_SATURATED_WATER);

  if (moisturePct < 0.0f) {
    moisturePct = 0.0f;
  } else if (moisturePct > 100.0f) {
    moisturePct = 100.0f;
  }

  SoilReading result;
  result.rawAdc      = static_cast<int>(roundf(avgAdc));
  result.voltage     = roundf(voltage * 100.0f) / 100.0f;
  result.moisturePct = roundf(moisturePct * 10.0f) / 10.0f;
  return result;
}

// ------------------------- Helper: Print to Serial Monitor -------------------
void printSerialMonitorTelemetry(const SoilReading& r) {
  ++packetCounter;
  const char* statusTag = (r.moisturePct < CRITICAL_MOISTURE)
                            ? "CRITICAL (<30.0% - IRRIGATION NEEDED)"
                            : "OPTIMAL (>=30.0%)";

  Serial.println(F("------------------------------------------------------------"));
  Serial.printf("[ESP32 #%lu] Device: %s | Pin: GPIO %u (ADC1_CH6)\n",
                packetCounter, DEVICE_ID, SOIL_ADC_PIN);
  Serial.printf("  -> Raw ADC (12-bit) : %d  (Dry=%d, Wet=%d)\n",
                r.rawAdc, ADC_DRY_AIR, ADC_SATURATED_WATER);
  Serial.printf("  -> Sensor Voltage   : %.2f V\n", r.voltage);
  Serial.printf("  -> Soil Moisture    : %.1f %% VWC  [%s]\n",
                r.moisturePct, statusTag);

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("  -> Wi-Fi Status     : CONNECTED (IP: %s, RSSI: %d dBm)\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println(F("  -> Wi-Fi Status     : DISCONNECTED (Auto-reconnect active)"));
  }
}

// ------------------------- Helper: Non-Blocking Wi-Fi ------------------------
void maintainWiFiConnection(unsigned long nowMs) {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }
  if (nowMs - lastWifiCheckMillis >= WIFI_RECONNECT_INTERVAL_MS) {
    lastWifiCheckMillis = nowMs;
    Serial.println(F("[WIFI] Link down — triggering non-blocking reconnect..."));
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

// ------------------------- Helper: HTTP POST Telemetry -----------------------
void postTelemetry(const SoilReading& r) {
  char jsonPayload[128];
  snprintf(
    jsonPayload,
    sizeof(jsonPayload),
    "{\"device_id\":\"%s\",\"soil_moisture\":%.1f}",
    DEVICE_ID,
    r.moisturePct
  );

  Serial.printf("  -> JSON Payload     : %s\n", jsonPayload);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("  -> HTTP Dispatch    : SKIPPED (Wi-Fi offline)"));
    return;
  }

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

  if (!http.begin(client, SERVER_URL)) {
    Serial.println(F("  -> HTTP Dispatch    : FAILED to initialize HTTPClient"));
    return;
  }

  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(reinterpret_cast<uint8_t*>(jsonPayload), strlen(jsonPayload));
  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("  -> HTTP Dispatch    : POST %d OK | Server Response: %s\n",
                  httpCode, response.c_str());
  } else {
    Serial.printf("  -> HTTP Dispatch    : POST ERROR (%s)\n",
                  http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ------------------------- Arduino Lifecycle ---------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);

  // Configure 12-bit ADC resolution and 11dB attenuation (full 0..3.3V range on GPIO 34)
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_ADC_PIN, ADC_11db);
  pinMode(SOIL_ADC_PIN, INPUT);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.println();
  Serial.println(F("============================================================"));
  Serial.println(F(" AI FarmWise — ESP32 Soil Sensor Node Serial Monitor (115200)"));
  Serial.println(F(" Pin: GPIO 34 (ADC1_CH6) | Calibration: 3200=0%, 1400=100%"));
  Serial.println(F("============================================================"));
}

void loop() {
  const unsigned long nowMs = millis();

  // 1. Non-blocking Wi-Fi supervision
  maintainWiFiConnection(nowMs);

  // 2. Non-blocking 3-second sensor read + Serial Monitor print + HTTP POST
  if (nowMs - lastTelemetryMillis >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMillis = nowMs;
    const SoilReading reading = readCalibratedSoilSensor();
    printSerialMonitorTelemetry(reading);
    postTelemetry(reading);
  }
}
