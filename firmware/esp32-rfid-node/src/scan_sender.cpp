#include "scan_sender.h"
#include "config.h"
#include "device_settings.h"
#include "serial_protocol.h"
#include "wifi_manager.h"
#include "runtime_config.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_system.h>
#include <sys/time.h>

namespace {
struct PendingScan {
  bool active = false;
  String scanId, cardUid, cardType, scannedAt, payload, assignmentId, vehicleId, mode, sessionId, tripId, phase, contextToken;
  unsigned long created = 0, lastAttempt = 0, wait = 0;
  int attempts = 0;
} pending;

enum class Result { Saved, Retry, Rejected };

String newScanId() {
  uint8_t random[16]; esp_fill_random(random, sizeof(random));
  random[6] = (random[6] & 0x0F) | 0x40;
  random[8] = (random[8] & 0x3F) | 0x80;
  String result; result.reserve(36);
  for (unsigned i = 0; i < sizeof(random); ++i) {
    if (i == 4 || i == 6 || i == 8 || i == 10) result += '-';
    char hex[3]; snprintf(hex, sizeof(hex), "%02x", random[i]); result += hex;
  }
  return result;
}

String utcTimestamp() {
  timeval now; gettimeofday(&now, nullptr);
  if (now.tv_sec < 1767225600) return ""; // Refuse an unset clock, never synthesize a scan timestamp.
  tm utc; gmtime_r(&now.tv_sec, &utc);
  char time[32]; strftime(time, sizeof(time), "%Y-%m-%dT%H:%M:%S", &utc);
  char milliseconds[8]; snprintf(milliseconds, sizeof(milliseconds), ".%03ldZ", now.tv_usec / 1000);
  return String(time) + milliseconds;
}

void scanEvent(const char* event, const char* code) {
  StaticJsonDocument<256> doc;
  doc["event"] = event; doc["code"] = code;
  doc["scanId"] = pending.scanId; doc["cardUid"] = pending.cardUid;
  serializeJson(doc, Serial); Serial.println();
}

bool matchesAck(const String& body) {
  StaticJsonDocument<2048> response;
  if (deserializeJson(response, body) || !response["duplicate"].is<bool>()) return false;
  if (pending.mode == "ENROLLMENT") return response["sessionId"].as<String>() == pending.sessionId
    && response["scanId"].as<String>() == pending.scanId && response["cardUid"].as<String>() == pending.cardUid
    && response["scannedAt"].as<String>() == pending.scannedAt
    && (response["state"].as<String>() == "CARD_CAPTURED" || response["state"].as<String>() == "COMPLETED");
  if (pending.mode == "ATTENDANCE") {
    const String state = response["state"].as<String>();
    return response["scanId"].as<String>() == pending.scanId && response["cardUid"].as<String>() == pending.cardUid
      && response["scannedAt"].as<String>() == pending.scannedAt && response["tripId"].as<String>() == pending.tripId
      && response["phase"].as<String>() == pending.phase && (state == "WAITING_CONFIRMATION" || state == "REJECTED"
      || state == "ALREADY_RECORDED" || state == "COMMITTING" || state == "RECONCILING" || state == "APPLIED" || state == "DISMISSED" || state == "EXPIRED");
  }
  JsonObjectConst scan = response["scan"].as<JsonObjectConst>();
  return scan["scanId"].as<String>() == pending.scanId
    && scan.containsKey("assignmentId") && scan.containsKey("vehicleId")
    && (pending.assignmentId.length() ? scan["assignmentId"].as<String>() == pending.assignmentId : scan["assignmentId"].isNull())
    && (pending.vehicleId.length() ? scan["vehicleId"].as<String>() == pending.vehicleId : scan["vehicleId"].isNull())
    && scan["deviceId"].as<String>() == deviceSettings().deviceId
    && scan["cardUid"].as<String>() == pending.cardUid
    && scan["cardType"].as<String>() == pending.cardType
    && scan["scannedAt"].as<String>() == pending.scannedAt;
}

Result postScan() {
  const auto& settings = deviceSettings();
  WiFiClient plain;
  WiFiClientSecure tls;
  HTTPClient http; // Destroy HTTPClient before the transport objects it references.
  const String endpoint = settings.backendUrl + (pending.mode == "ENROLLMENT" ? "/iot/devices/" + settings.deviceId + "/enrollment-scans" : pending.mode == "ATTENDANCE" ? "/iot/devices/" + settings.deviceId + "/attendance-scans" : String("/iot/scans"));
  if (endpoint.startsWith("https://")) {
    if (!strlen(kIotRootCa)) return Result::Rejected;
    tls.setCACert(kIotRootCa); tls.setHandshakeTimeout(3);
    if (!http.begin(tls, endpoint)) return Result::Retry;
  } else if (!http.begin(plain, endpoint)) return Result::Retry;
  http.setConnectTimeout(2000); http.setTimeout(2500);
  http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
  http.useHTTP10(true);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-IoT-Device-Key", settings.deviceKey);
  const int status = http.POST(pending.payload);
  Result result = Result::Retry;
  if (status == 200) {
    const int length = http.getSize();
    if (length >= 0 && length <= static_cast<int>(config::kMaxHttpReply)) {
      const String body = http.getString();
      if (matchesAck(body)) {
        result = Result::Saved;
        if (pending.mode == "ATTENDANCE") {
          StaticJsonDocument<2048> ack;
          if (!deserializeJson(ack, body) && ack["state"].as<String>() == "REJECTED") {
            scanEvent("ATTENDANCE_REJECTED", "CANDIDATE_REJECTED"); result = Result::Rejected;
          }
        }
      }
    }
  } else if (status >= 400 && status < 500 && status != 408 && status != 429) {
    if (pending.mode == "ENROLLMENT" && status == 409) {
      const int length = http.getSize();
      if (length >= 0 && length <= 2048) {
        StaticJsonDocument<2048> error;
        if (!deserializeJson(error, http.getString())) {
          const String code = error["code"].as<String>();
          if (code == "CARD_ALREADY_ASSIGNED" || code == "CARD_ALREADY_CAPTURED" || code == "CONFIRMATION_PENDING" || code == "CAPTURE_CONFLICT" || code == "SESSION_COMPLETED") scanEvent("ENROLLMENT_REJECTED", code.c_str());
        }
      }
    }
    if (status == 409 || status == 401 || status == 410) runtimeInvalidate();
    result = Result::Rejected;
  } else if (status >= 300 && status < 400) {
    result = Result::Rejected; // Never forward a credential to a redirect target.
  }
  http.end();
  return result;
}
}

bool scanPending() { return pending.active; }

void captureScan(const String& uid, const String& cardType) {
  if (pending.active) { sendEvent("SCAN_SKIPPED", "AWAITING_PREVIOUS_ACK"); return; }
  if (!deviceSettings().deviceKey.length()) { sendEvent("SCAN_SKIPPED", "DEVICE_NOT_CONFIGURED"); return; }
  if (WiFi.status() != WL_CONNECTED || wifiConfigPending()) { sendEvent("SCAN_SKIPPED", "WIFI_NOT_READY"); return; }
  RuntimeAssignment assignment;
  if (!runtimeSnapshot(assignment)) { sendEvent("SCAN_SKIPPED", "RUNTIME_CONFIG_NOT_READY"); return; }
  const String scannedAt = utcTimestamp();
  if (!scannedAt.length()) { sendEvent("SCAN_SKIPPED", "CLOCK_NOT_READY"); return; }
  pending = PendingScan{};
  pending.scanId = newScanId(); pending.cardUid = uid; pending.cardType = cardType;
  pending.scannedAt = scannedAt; pending.created = millis(); pending.active = true;
  pending.assignmentId = assignment.assignmentId; pending.vehicleId = assignment.vehicleId;
  pending.mode = assignment.mode; pending.sessionId = assignment.enrollmentSessionId;
  pending.tripId = assignment.tripId; pending.phase = assignment.phase; pending.contextToken = assignment.contextToken;
  StaticJsonDocument<2048> doc;
  doc["scanId"] = pending.scanId;
  if (pending.mode == "ENROLLMENT") doc["sessionId"] = pending.sessionId;
  else if (pending.mode == "ATTENDANCE") doc["contextToken"] = pending.contextToken;
  else doc["deviceId"] = deviceSettings().deviceId;
  doc["cardUid"] = uid; doc["cardType"] = cardType; doc["scannedAt"] = scannedAt;
  if (pending.mode != "ENROLLMENT" && pending.mode != "ATTENDANCE") {
    if (pending.assignmentId.length()) doc["assignmentId"] = pending.assignmentId;
    else doc["assignmentId"] = nullptr;
  }
  serializeJson(doc, pending.payload);
  scanEvent("SCAN_READ", "AWAITING_SERVER_ACK");
}

void scansTick() {
  if (!pending.active) return;
  if (millis() - pending.created >= config::kPendingScanMs) {
    scanEvent("SCAN_FAILED", "ACK_TIMEOUT"); pending = PendingScan{}; return;
  }
  if (WiFi.status() != WL_CONNECTED || millis() - pending.lastAttempt < pending.wait) return;
  pending.lastAttempt = millis(); ++pending.attempts;
  const Result result = postScan();
  if (result == Result::Saved) {
    scanEvent(pending.mode == "ENROLLMENT" ? "ENROLLMENT_CAPTURED" : pending.mode == "ATTENDANCE" ? "ATTENDANCE_CAPTURED" : "SCAN_SAVED", "SERVER_ACK"); pending = PendingScan{}; return;
  }
  if (result == Result::Rejected || pending.attempts >= config::kMaxPostAttempts) {
    scanEvent("SCAN_FAILED", result == Result::Rejected ? "SERVER_REJECTED" : "RETRIES_EXHAUSTED");
    pending = PendingScan{}; return;
  }
  pending.wait = (1000UL << pending.attempts) + (esp_random() % 250);
}
