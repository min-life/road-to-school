#pragma once
#include <Arduino.h>
#include <ArduinoJson.h>

void serialTick();
void sendReply(const String& requestId, bool ok, JsonVariantConst data = JsonVariantConst());
void sendError(const String& requestId, const char* code);
void sendEvent(const char* event, const char* code);
