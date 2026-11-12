#pragma once
#include <Arduino.h>

struct DeviceSettings { String deviceId; String backendUrl; String deviceKey; };
struct WifiSettings { String ssid; String password; };

String hardwareDeviceId();
bool validDeviceSettings(const DeviceSettings& settings);
bool validWifiSettings(const WifiSettings& settings);
void loadSettings();
const DeviceSettings& deviceSettings();
const WifiSettings& wifiSettings();
bool saveDeviceSettings(const DeviceSettings& settings);
bool saveWifiSettings(const WifiSettings& settings);
