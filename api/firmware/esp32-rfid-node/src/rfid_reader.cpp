#include "rfid_reader.h"
#include "config.h"
#include "scan_sender.h"
#include "serial_protocol.h"
#include <MFRC522.h>
#include <SPI.h>
#include <esp_timer.h>

namespace {
MFRC522 reader(config::kRfidSs, config::kRfidReset);
bool ready = false;
String lastUid;
unsigned long lastRead = 0;
esp_timer_handle_t buzzerTimer = nullptr;
void buzzerOff(void*) { digitalWrite(config::kBuzzer, LOW); }
}

void rfidBegin() {
  pinMode(config::kBuzzer, OUTPUT); digitalWrite(config::kBuzzer, LOW);
  esp_timer_create_args_t timer{};
  timer.callback = buzzerOff; timer.name = "rfid-beep";
  esp_timer_create(&timer, &buzzerTimer);
  SPI.begin(config::kRfidSck, config::kRfidMiso, config::kRfidMosi, config::kRfidSs);
  reader.PCD_Init(); delay(4);
  const byte version = reader.PCD_ReadRegister(MFRC522::VersionReg);
  ready = version != 0 && version != 0xFF;
  if (!ready) sendEvent("RFID", "READER_NOT_FOUND");
}

void rfidTick() {
  if (!ready || !reader.PICC_IsNewCardPresent() || !reader.PICC_ReadCardSerial()) return;
  String uid;
  for (byte i = 0; i < reader.uid.size; ++i) {
    char hex[3]; snprintf(hex, sizeof(hex), "%02X", reader.uid.uidByte[i]); uid += hex;
  }
  const auto type = MFRC522::PICC_GetType(reader.uid.sak);
  const String cardType = String(MFRC522::PICC_GetTypeName(type));
  const byte size = reader.uid.size;
  reader.PICC_HaltA(); reader.PCD_StopCrypto1();
  if (size != 4 && size != 7) { sendEvent("RFID", "UNSUPPORTED_UID_LENGTH"); return; }
  if (uid == lastUid && millis() - lastRead < config::kScanCooldownMs) return;
  lastUid = uid; lastRead = millis();
  StaticJsonDocument<256> event;
  event["event"] = "RFID_READ"; event["cardUid"] = uid; event["cardType"] = cardType;
  serializeJson(event, Serial); Serial.println();
  // A beep confirms physical reading only, never server persistence.
  if (buzzerTimer) {
    esp_timer_stop(buzzerTimer);
    digitalWrite(config::kBuzzer, HIGH);
    esp_timer_start_once(buzzerTimer, 60000);
  }
  captureScan(uid, cardType);
}
