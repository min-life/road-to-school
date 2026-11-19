#include <Arduino.h>
#include <WiFi.h>
#include "device_settings.h"
#include "rfid_reader.h"
#include "scan_sender.h"
#include "serial_protocol.h"
#include "wifi_manager.h"
#include "runtime_config.h"

void setup() {
  Serial.begin(115200);
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  loadSettings();
  wifiBegin();
  rfidBegin();
  sendEvent("BOOT", "READY");
}

void loop() {
  serialTick();
  wifiTick();
  runtimeTick();
  rfidTick();
  if (!wifiConfigPending()) scansTick();
  delay(2);
}
