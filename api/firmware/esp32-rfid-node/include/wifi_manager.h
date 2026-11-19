#pragma once
#include "device_settings.h"

void wifiBegin();
void wifiTick();
bool wifiConfigPending();
void requestWifi(const String& requestId, const WifiSettings& settings);
void requestWifiScan(const String& requestId);
