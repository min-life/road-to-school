#pragma once
#include <Arduino.h>

struct RuntimeAssignment { String assignmentId, vehicleId, mode, enrollmentSessionId, tripId, phase, contextToken; };
void runtimeTick();
void runtimeInvalidate();
bool runtimeSnapshot(RuntimeAssignment& output);
