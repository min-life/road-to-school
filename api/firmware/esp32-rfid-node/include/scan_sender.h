#pragma once
#include <Arduino.h>

bool scanPending();
void captureScan(const String& uid, const String& cardType);
void scansTick();
