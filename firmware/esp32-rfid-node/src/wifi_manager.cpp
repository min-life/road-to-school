#include "wifi_manager.h"
#include "config.h"
#include "serial_protocol.h"
#include "scan_sender.h"
#include <WiFi.h>
#include <esp_wifi.h>
#include <time.h>

namespace {
bool pending = false;
unsigned long started = 0;
String request;
WifiSettings candidate;
bool scanning = false;
String scanRequest;
bool scanLaunched = false;
unsigned long scanStarted = 0;
unsigned scanAttempts = 0;
bool connectStarted = false;
bool reconnectScheduled = false;
unsigned long reconnectScheduledAt = 0;
constexpr unsigned long kRadioSettleMs = 200;
constexpr unsigned long kScanDeadlineMs = 9000;

void pauseAutomaticConnection(bool keepConnected) {
  reconnectScheduled = false;
  WiFi.setAutoReconnect(false);
  // Never erase the saved AP/NVS when changing networks or scanning.
  if (!keepConnected || WiFi.status() != WL_CONNECTED) {
    // Stop the station as well: an SDK association/scan can survive disconnect alone.
    WiFi.disconnect(true, false);
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(false);
  }
}

void resumeSavedWifi(bool disconnectCurrent) {
  if (!disconnectCurrent && WiFi.status() == WL_CONNECTED) { WiFi.setAutoReconnect(true); return; }
  pauseAutomaticConnection(false);
  reconnectScheduled = wifiSettings().ssid.length() > 0;
  reconnectScheduledAt = millis();
  if (!reconnectScheduled) WiFi.setAutoReconnect(true);
}

void clearScan() {
  WiFi.scanDelete(); scanning = false; scanLaunched = false; scanRequest = "";
  resumeSavedWifi(false);
}

void failScan() {
  esp_wifi_scan_stop();
  sendError(scanRequest, "WIFI_SCAN_FAILED");
  clearScan();
}

void finishWifiScan(int count) {
  struct Network { String ssid; int32_t rssi; wifi_auth_mode_t auth; } networks[20];
  int used = 0;
  for (int i = 0; i < count; ++i) {
    const String ssid = WiFi.SSID(i);
    if (!ssid.length() || ssid.length() > 32) continue;
    int slot = -1;
    for (int j = 0; j < used; ++j) if (networks[j].ssid == ssid) { slot = j; break; }
    const int32_t rssi = WiFi.RSSI(i);
    if (slot >= 0 && networks[slot].rssi >= rssi) continue;
    if (slot < 0) {
      if (used < 20) slot = used++;
      else if (rssi > networks[used - 1].rssi) slot = used - 1;
      else continue;
    }
    networks[slot] = {ssid, rssi, WiFi.encryptionType(i)};
    for (int j = slot; j > 0 && networks[j].rssi > networks[j - 1].rssi; --j) {
      const Network swap = networks[j - 1]; networks[j - 1] = networks[j]; networks[j] = swap;
    }
  }
  DynamicJsonDocument data(4096);
  JsonArray list = data.createNestedArray("networks");
  for (int i = 0; i < used; ++i) {
    JsonObject item = list.createNestedObject();
    item["ssid"] = networks[i].ssid; item["rssi"] = networks[i].rssi;
    item["secure"] = networks[i].auth != WIFI_AUTH_OPEN;
    item["supported"] = networks[i].auth == WIFI_AUTH_WPA_PSK || networks[i].auth == WIFI_AUTH_WPA2_PSK
      || networks[i].auth == WIFI_AUTH_WPA_WPA2_PSK;
  }
  if (data.overflowed()) sendError(scanRequest, "WIFI_SCAN_FAILED");
  else sendReply(scanRequest, true, data.as<JsonVariantConst>());
  clearScan();
}

void wifiScanTick() {
  if (!scanning) return;
  if (!scanLaunched) {
    if (millis() - scanStarted < kRadioSettleMs) return;
    const int result = WiFi.scanNetworks(true, false);
    if (result == WIFI_SCAN_FAILED) {
      // An already-queued association event can outlive disconnect(); retry only within bounds.
      if (++scanAttempts >= 3) { sendEvent("WIFI_SCAN", "START_FAILED"); failScan(); return; }
      pauseAutomaticConnection(true); scanStarted = millis(); return;
    }
    scanLaunched = true; scanStarted = millis();
    if (result >= 0) finishWifiScan(result);
    return;
  }
  const int count = WiFi.scanComplete();
  if (count == WIFI_SCAN_RUNNING) {
    if (millis() - scanStarted >= kScanDeadlineMs) { sendEvent("WIFI_SCAN", "SCAN_TIMEOUT"); failScan(); }
    return;
  }
  if (count < 0) { sendEvent("WIFI_SCAN", "RESULT_FAILED"); failScan(); return; }
  finishWifiScan(count);
}

void restoreSavedWifi() {
  resumeSavedWifi(true);
}

void clearAttempt() {
  pending = false; connectStarted = false; request = ""; candidate = WifiSettings{};
}
}

void wifiBegin() {
  WiFi.setAutoReconnect(true);
  const auto& saved = wifiSettings();
  if (saved.ssid.length()) WiFi.begin(saved.ssid.c_str(), saved.password.c_str());
  // SNTP runs asynchronously. Scans are refused until a real UTC clock is available.
  configTime(0, 0, "time.cloudflare.com", "pool.ntp.org");
}

bool wifiConfigPending() { return pending || scanning; }

void requestWifiScan(const String& requestId) {
  if (wifiConfigPending() || scanPending()) { sendError(requestId, "DEVICE_BUSY"); return; }
  pauseAutomaticConnection(true);
  scanning = true; scanRequest = requestId; scanLaunched = false;
  scanStarted = millis(); scanAttempts = 0;
}

void requestWifi(const String& requestId, const WifiSettings& settings) {
  if (wifiConfigPending() || scanPending()) { sendError(requestId, "DEVICE_BUSY"); return; }
  if (!validWifiSettings(settings)) { sendError(requestId, "INVALID_WIFI"); return; }
  pauseAutomaticConnection(false);
  candidate = settings; request = requestId; pending = true; connectStarted = false; started = millis();
}

void wifiTick() {
  wifiScanTick();
  if (!pending) {
    if (!scanning && reconnectScheduled && millis() - reconnectScheduledAt >= kRadioSettleMs) {
      reconnectScheduled = false;
      const auto& saved = wifiSettings();
      WiFi.begin(saved.ssid.c_str(), saved.password.c_str());
      WiFi.setAutoReconnect(true);
    }
    return;
  }
  if (!connectStarted) {
    if (millis() - started < kRadioSettleMs) return;
    WiFi.begin(candidate.ssid.c_str(), candidate.password.c_str());
    connectStarted = true; started = millis(); return;
  }
  if (WiFi.status() == WL_CONNECTED && WiFi.SSID() == candidate.ssid && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
    if (!saveWifiSettings(candidate)) {
      sendError(request, "NVS_WRITE_FAILED"); restoreSavedWifi(); clearAttempt(); return;
    }
    StaticJsonDocument<256> data;
    data["connected"] = true; data["ssid"] = candidate.ssid; data["ip"] = WiFi.localIP().toString();
    sendReply(request, true, data.as<JsonVariantConst>());
    clearAttempt(); WiFi.setAutoReconnect(true); return;
  }
  if (millis() - started >= config::kWifiConnectMs) {
    const wl_status_t status = WiFi.status();
    sendError(request, status == WL_NO_SSID_AVAIL ? "WIFI_NETWORK_NOT_FOUND"
      : status == WL_CONNECT_FAILED ? "WIFI_CONNECT_FAILED" : "WIFI_CONNECT_TIMEOUT");
    restoreSavedWifi(); clearAttempt();
  }
}
