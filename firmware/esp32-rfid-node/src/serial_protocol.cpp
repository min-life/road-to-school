#include "serial_protocol.h"
#include "config.h"
#include "device_settings.h"
#include "scan_sender.h"
#include "wifi_manager.h"
#include <WiFi.h>
#include "runtime_config.h"

namespace {
String line;
bool overflow = false;

bool readText(JsonVariantConst value, size_t max, String& output) {
  if (!value.is<const char*>()) return false;
  JsonString text = value.as<JsonString>();
  if (!text.c_str() || text.size() > max || strlen(text.c_str()) != text.size()) return false;
  output = text.c_str();
  return true;
}

bool requestIdValid(const String& value) {
  if (value.length() != 36 || value[14] != '4') return false;
  for (unsigned i = 0; i < 36; ++i) {
    if (i == 8 || i == 13 || i == 18 || i == 23) { if (value[i] != '-') return false; }
    else if (!isxdigit(static_cast<unsigned char>(value[i]))) return false;
  }
  return strchr("89abAB", value[19]) != nullptr;
}

bool knownFields(JsonObjectConst object, const String& command) {
  for (JsonPairConst entry : object) {
    const String key = entry.key().c_str();
    if (key == "command" || key == "requestId") continue;
    if (command == "CONFIG_DEVICE" && (key == "deviceId" || key == "backendUrl" || key == "deviceKey")) continue;
    if (command == "SET_WIFI" && (key == "ssid" || key == "password")) continue;
    return false;
  }
  return true;
}

void handle(const String& input) {
  StaticJsonDocument<2560> doc;
  if (deserializeJson(doc, input) || !doc.is<JsonObject>()) return;
  String request, command;
  if (!readText(doc["requestId"], 36, request) || !requestIdValid(request)) return;
  if (!readText(doc["command"], 24, command) || !knownFields(doc.as<JsonObjectConst>(), command)) {
    sendError(request, "INVALID_COMMAND"); return;
  }
  if (command == "INFO") {
    StaticJsonDocument<256> data;
    data["protocolVersion"] = config::kProtocol; data["firmwareVersion"] = config::kVersion;
    data["deviceId"] = hardwareDeviceId(); data["configured"] = deviceSettings().deviceKey.length() > 0;
    data["wifiScan"] = true;
    data["wifiConnected"] = WiFi.status() == WL_CONNECTED;
    data["hasSavedWifi"] = wifiSettings().ssid.length() > 0;
    RuntimeAssignment assignment;
    data["runtimeConfigReady"] = runtimeSnapshot(assignment);
    data["vehicleAssignment"] = true;
    data["enrollment"] = true;
    data["attendance"] = true;
    sendReply(request, true, data.as<JsonVariantConst>()); return;
  }
  if (command == "SCAN_WIFI") { requestWifiScan(request); return; }
  if (command == "CONFIG_DEVICE") {
    if (scanPending() || wifiConfigPending()) { sendError(request, "DEVICE_BUSY"); return; }
    DeviceSettings settings;
    if (!readText(doc["deviceId"], 128, settings.deviceId) || !readText(doc["backendUrl"], 512, settings.backendUrl)
        || !readText(doc["deviceKey"], 64, settings.deviceKey) || !validDeviceSettings(settings)) {
      sendError(request, "INVALID_DEVICE_CONFIG"); return;
    }
    if (!saveDeviceSettings(settings)) { sendError(request, "NVS_WRITE_FAILED"); return; }
    runtimeInvalidate();
    StaticJsonDocument<128> data; data["deviceId"] = settings.deviceId;
    sendReply(request, true, data.as<JsonVariantConst>()); return;
  }
  if (command == "SET_WIFI") {
    if (!deviceSettings().deviceKey.length()) { sendError(request, "DEVICE_NOT_CONFIGURED"); return; }
    WifiSettings settings;
    if (!readText(doc["ssid"], 32, settings.ssid) || !readText(doc["password"], 64, settings.password)) {
      sendError(request, "INVALID_WIFI"); return;
    }
    requestWifi(request, settings); return;
  }
  sendError(request, "UNKNOWN_COMMAND");
}
}

void sendReply(const String& requestId, bool ok, JsonVariantConst data) {
  // Scan replies contain up to 20 SSIDs; avoid silently truncating them at 512 bytes.
  DynamicJsonDocument doc(256 + data.memoryUsage());
  doc["requestId"] = requestId; doc["ok"] = ok;
  if (!data.isNull()) doc["data"].set(data);
  serializeJson(doc, Serial); Serial.println();
}

void sendError(const String& requestId, const char* code) {
  StaticJsonDocument<96> data; data["code"] = code;
  sendReply(requestId, false, data.as<JsonVariantConst>());
}

void sendEvent(const char* event, const char* code) {
  StaticJsonDocument<128> doc;
  doc["event"] = event; doc["code"] = code;
  serializeJson(doc, Serial); Serial.println();
}

void serialTick() {
  // Bounded per iteration so a noisy serial sender cannot starve Wi-Fi/RFID.
  for (unsigned count = 0; count < 256 && Serial.available(); ++count) {
    const char c = Serial.read();
    if (c == '\n') {
      if (!overflow && line.length()) handle(line);
      line = ""; overflow = false;
    } else if (c != '\r' && !overflow) {
      if (line.length() >= config::kMaxSerialLine) { line = ""; overflow = true; }
      else line += c;
    }
  }
}
