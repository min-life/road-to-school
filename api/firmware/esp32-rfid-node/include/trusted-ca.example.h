#pragma once
// Copy to trusted-ca.h and insert the PUBLIC root CA for your HTTPS endpoint.
// HTTPS fails closed while this string is empty; setInsecure() is never used.
constexpr char kIotRootCa[] = "";
