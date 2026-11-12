#pragma once

namespace config {
constexpr char kVersion[] = "1.4.0-poc";
constexpr int kProtocol = 1;
constexpr int kRfidSs = 5;
constexpr int kRfidSck = 18;
constexpr int kRfidMiso = 19;
constexpr int kRfidMosi = 23;
constexpr int kRfidReset = 22;
constexpr int kBuzzer = 4;
constexpr unsigned long kScanCooldownMs = 2000;
constexpr unsigned long kWifiConnectMs = 12000;
constexpr unsigned long kPendingScanMs = 30000;
constexpr int kMaxPostAttempts = 4;
constexpr unsigned kMaxSerialLine = 2048;
constexpr unsigned kMaxHttpReply = 4096;
}

// Optional public PEM root CA, never a Wi-Fi password or device credential.
#if __has_include("trusted-ca.h")
#include "trusted-ca.h"
#else
constexpr char kIotRootCa[] = "";
#endif
