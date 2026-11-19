#include "device_settings.h"
#include "config.h"
#include <ArduinoJson.h>
#include <Preferences.h>
#include <WiFi.h>

namespace {
DeviceSettings device;
WifiSettings wifi;

bool hexKey(const String& value) {
  if (value.length() != 64) return false;
  for (char c : value) if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))) return false;
  return true;
}

bool backendUrl(const String& value) {
  if (value.length() > 512 || !value.endsWith("/api/v1")) return false;
  const bool tls = value.startsWith("https://");
  if (!tls && !value.startsWith("http://")) return false;
  if (tls && strlen(kIotRootCa) == 0) return false;
  for (char c : value) if (static_cast<unsigned char>(c) <= 32 || c == '@' || c == '?' || c == '#') return false;
  const unsigned start = tls ? 8 : 7;
  const int slash = value.indexOf('/', start);
  if (slash <= static_cast<int>(start) || value.substring(slash) != "/api/v1") return false;
  String authority = value.substring(start, slash);
  authority.toLowerCase();
  String host = authority.startsWith("[") ? authority.substring(0, authority.indexOf(']') + 1)
                                        : authority.substring(0, authority.indexOf(':') < 0 ? authority.length() : authority.indexOf(':'));
  return host.length() && host != "localhost" && host != "[::1]" && host != "0.0.0.0" && !host.startsWith("127.");
}

bool writeBlob(const char* key, const String& value) {
  Preferences prefs;
  if (!prefs.begin("rts-iot", false)) return false;
  const bool saved = prefs.putString(key, value) == value.length() && prefs.getString(key) == value;
  prefs.end();
  return saved;
}
}

String hardwareDeviceId() {
  String mac = WiFi.macAddress();
  mac.replace(":", ""); mac.toUpperCase();
  return "ESP32_" + mac;
}

bool validDeviceSettings(const DeviceSettings& settings) {
  return settings.deviceId == hardwareDeviceId() && hexKey(settings.deviceKey) && backendUrl(settings.backendUrl);
}

bool validWifiSettings(const WifiSettings& settings) {
  if (!settings.ssid.length() || settings.ssid.length() > 32) return false;
  const size_t size = settings.password.length();
  if (size == 64) {
    for (char c : settings.password) if (!isxdigit(static_cast<unsigned char>(c))) return false;
    return true;
  }
  if (size < 8 || size > 63) return false;
  for (char c : settings.password) if (c < 32 || c > 126) return false;
  return true;
}

void loadSettings() {
  Preferences prefs;
  if (!prefs.begin("rts-iot", true)) return;
  const String savedDevice = prefs.getString("device");
  const String savedWifi = prefs.getString("wifi");
  prefs.end();
  StaticJsonDocument<1536> doc;
  if (!deserializeJson(doc, savedDevice)) {
    DeviceSettings candidate{doc["deviceId"].as<String>(), doc["backendUrl"].as<String>(), doc["deviceKey"].as<String>()};
    if (validDeviceSettings(candidate)) device = candidate;
  }
  doc.clear();
  if (!deserializeJson(doc, savedWifi)) {
    WifiSettings candidate{doc["ssid"].as<String>(), doc["password"].as<String>()};
    if (validWifiSettings(candidate)) wifi = candidate;
  }
}

const DeviceSettings& deviceSettings() { return device; }
const WifiSettings& wifiSettings() { return wifi; }

bool saveDeviceSettings(const DeviceSettings& settings) {
  if (!validDeviceSettings(settings)) return false;
  StaticJsonDocument<1536> doc;
  doc["deviceId"] = settings.deviceId; doc["backendUrl"] = settings.backendUrl; doc["deviceKey"] = settings.deviceKey;
  String encoded; serializeJson(doc, encoded);
  if (!writeBlob("device", encoded)) return false;
  device = settings;
  return true;
}

bool saveWifiSettings(const WifiSettings& settings) {
  if (!validWifiSettings(settings)) return false;
  StaticJsonDocument<512> doc;
  doc["ssid"] = settings.ssid; doc["password"] = settings.password;
  String encoded; serializeJson(doc, encoded);
  if (!writeBlob("wifi", encoded)) return false;
  wifi = settings;
  return true;
}
