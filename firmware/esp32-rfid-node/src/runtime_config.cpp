#include "runtime_config.h"
#include "config.h"
#include "device_settings.h"
#include "wifi_manager.h"
#include "scan_sender.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

namespace {
struct Result {
  bool valid = false;
  char assignment[37] = {}, vehicle[37] = {}, session[37] = {}, mode[16] = {}, trip[37] = {}, phase[16] = {}, token[1025] = {};
  int64_t expires = 0;
  unsigned generation = 0;
};
struct Work { DeviceSettings settings; unsigned generation; };
portMUX_TYPE mutex = portMUX_INITIALIZER_UNLOCKED;
bool busy = false, resultReady = false;
Result completed, current;
unsigned generation = 0;
unsigned long lastPoll = 0, pollDelay = 0;
bool wasAvailable = false;

bool uuid(const char* value) {
  if (!value || strlen(value) != 36) return false;
  for (unsigned i = 0; i < 36; ++i) {
    if (i == 8 || i == 13 || i == 18 || i == 23) { if (value[i] != '-') return false; }
    else if (!isxdigit(static_cast<unsigned char>(value[i]))) return false;
  }
  return true;
}

bool request(const DeviceSettings& settings, const String& suffix, const String* payload, String& body) {
  WiFiClient plain;
  WiFiClientSecure tls;
  HTTPClient http;
  const String endpoint = settings.backendUrl + "/iot/devices/" + settings.deviceId + suffix;
  if (endpoint.startsWith("https://")) {
    if (!strlen(kIotRootCa)) return false;
    tls.setCACert(kIotRootCa); tls.setHandshakeTimeout(3);
    if (!http.begin(tls, endpoint)) return false;
  } else if (!http.begin(plain, endpoint)) return false;
  http.setConnectTimeout(2000); http.setTimeout(2500);
  http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS); http.useHTTP10(true);
  http.addHeader("X-IoT-Device-Key", settings.deviceKey);
  int status;
  if (payload) { http.addHeader("Content-Type", "application/json"); status = http.POST(*payload); }
  else status = http.GET();
  const int length = http.getSize();
  const bool ok = status == 200 && length >= 0 && length <= 2048;
  if (ok) body = http.getString();
  http.end(); return ok;
}

Result fetch(const Work& work) {
  Result result; result.generation = work.generation;
  String body;
  if (!request(work.settings, "/runtime-config", nullptr, body)) return result;
  StaticJsonDocument<2048> config;
  if (deserializeJson(config, body) || config["deviceId"].as<String>() != work.settings.deviceId
    || !config.containsKey("assignmentId") || !config.containsKey("vehicleId") || !config["expiresAtEpoch"].is<int64_t>()) return result;
  const int64_t now = time(nullptr), expires = config["expiresAtEpoch"].as<int64_t>();
  if (now < 1767225600 || expires <= now || expires > now + 65) return result;
  const bool unbound = config["assignmentId"].isNull();
  if (unbound != config["vehicleId"].isNull()) return result;
  if (!unbound) {
    const char* assignment = config["assignmentId"].as<const char*>();
    const char* vehicle = config["vehicleId"].as<const char*>();
    if (!uuid(assignment) || !uuid(vehicle)) return result;
    strlcpy(result.assignment, assignment, sizeof(result.assignment));
    strlcpy(result.vehicle, vehicle, sizeof(result.vehicle));
  }
  const String mode = config["mode"].as<String>();
  if (mode != "ENROLLMENT" && mode != "VEHICLE_SCAN" && mode != "POC" && mode != "ATTENDANCE") return result;
  if ((mode == "VEHICLE_SCAN" || mode == "ATTENDANCE") != !unbound) return result;
  strlcpy(result.mode, mode.c_str(), sizeof(result.mode));
  if (mode == "ENROLLMENT") {
    const char* session = config["enrollmentSessionId"].as<const char*>();
    if (!unbound || !uuid(session)) return result;
    strlcpy(result.session, session, sizeof(result.session));
  } else if (!config["enrollmentSessionId"].isNull()) return result;
  if (mode == "ATTENDANCE") {
    const char* trip = config["tripId"].as<const char*>();
    const String phase = config["phase"].as<String>(), token = config["contextToken"].as<String>();
    if (unbound || !uuid(trip) || (phase != "BOARDING" && phase != "ALIGHTING") || !token.length() || token.length() > 1024) return result;
    strlcpy(result.trip, trip, sizeof(result.trip));
    strlcpy(result.phase, phase.c_str(), sizeof(result.phase));
    strlcpy(result.token, token.c_str(), sizeof(result.token));
  }
  StaticJsonDocument<2048> heartbeat;
  heartbeat["mode"] = mode;
  if (mode == "ATTENDANCE") heartbeat["contextToken"] = result.token;
  if (mode == "ENROLLMENT") heartbeat["enrollmentSessionId"] = result.session;
  else heartbeat["enrollmentSessionId"] = nullptr;
  heartbeat["firmwareVersion"] = config::kVersion;
  if (unbound) heartbeat["assignmentId"] = nullptr;
  else heartbeat["assignmentId"] = result.assignment;
  String payload; serializeJson(heartbeat, payload);
  if (!request(work.settings, "/heartbeat", &payload, body)) return result;
  StaticJsonDocument<512> ack;
  if (deserializeJson(ack, body) || !ack.containsKey("assignmentId") || !ack["acknowledgedAt"].is<const char*>()) return result;
  if (unbound ? !ack["assignmentId"].isNull() : ack["assignmentId"].as<String>() != result.assignment) return result;
  if (ack["mode"].as<String>() != mode) return result;
  if (mode == "ENROLLMENT" ? ack["enrollmentSessionId"].as<String>() != result.session : !ack["enrollmentSessionId"].isNull()) return result;
  result.valid = true; result.expires = expires; return result;
}

void worker(void* argument) {
  Work* work = static_cast<Work*>(argument);
  const Result result = fetch(*work);
  delete work;
  portENTER_CRITICAL(&mutex);
  completed = result; resultReady = true; busy = false;
  portEXIT_CRITICAL(&mutex);
  vTaskDelete(nullptr);
}
}

void runtimeInvalidate() {
  ++generation; current = Result{}; pollDelay = 0;
}

bool runtimeSnapshot(RuntimeAssignment& output) {
  if (!current.valid || current.expires <= time(nullptr)) return false;
  output.assignmentId = current.assignment; output.vehicleId = current.vehicle; output.mode = current.mode; output.enrollmentSessionId = current.session; output.tripId = current.trip; output.phase = current.phase; output.contextToken = current.token; return true;
}

void runtimeTick() {
  const bool available = WiFi.status() == WL_CONNECTED && !wifiConfigPending() && deviceSettings().deviceKey.length();
  if (!available) {
    if (wasAvailable) runtimeInvalidate();
    wasAvailable = false; return;
  }
  wasAvailable = true;
  Result result; bool received = false, running;
  portENTER_CRITICAL(&mutex);
  if (resultReady) { result = completed; resultReady = false; received = true; }
  running = busy;
  portEXIT_CRITICAL(&mutex);
  if (received && result.generation == generation) {
    if (result.valid) current = result;
    // A failed refresh retains the old lease only until its original expiry.
    pollDelay = result.valid ? 30000 : 5000; lastPoll = millis();
  }
  if (running || scanPending() || time(nullptr) < 1767225600 || (pollDelay && millis() - lastPoll < pollDelay)) return;
  Work* work = new (std::nothrow) Work{deviceSettings(), generation};
  if (!work) { lastPoll = millis(); pollDelay = 5000; return; }
  portENTER_CRITICAL(&mutex); busy = true; portEXIT_CRITICAL(&mutex);
  if (xTaskCreate(worker, "iot-config", 16384, work, 1, nullptr) != pdPASS) {
    delete work; portENTER_CRITICAL(&mutex); busy = false; portEXIT_CRITICAL(&mutex);
    lastPoll = millis(); pollDelay = 5000;
  }
}
