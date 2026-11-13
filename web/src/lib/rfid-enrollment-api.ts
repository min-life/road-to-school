import { apiClient } from "./api-client";
export interface RfidSession {
  operation: "REGISTER" | "REPLACE";
  expectedPreviousCardUid: string | null;
  id: string;
  deviceId: string;
  studentId: string;
  state: string;
  isOpen: boolean;
  expiresAt: string;
  serverTime: string;
  lastDeviceAckAt: string | null;
  candidate: {
    scanId: string;
    cardUid: string;
    scannedAt: string;
    capturedAt: string;
  } | null;
  lastScanFeedback: { scanId: string; code: string; observedAt: string } | null;
  bindingCurrent: boolean;
}
const root = "/iot/enrollment-sessions";
export const enrollmentApi = {
  list: (studentId: string) =>
    apiClient.request<{ data: RfidSession[] }>(
      `${root}?studentId=${encodeURIComponent(studentId)}&activeOnly=true`,
      { cache: "no-store" },
    ),
  get: (id: string) =>
    apiClient.request<RfidSession>(`${root}/${encodeURIComponent(id)}`, {
      cache: "no-store",
    }),
  start: (
    schoolId: string,
    studentId: string,
    deviceId: string,
    operation: "REGISTER" | "REPLACE" = "REGISTER",
    expectedPreviousCardUid?: string,
    expectedStudentVersion?: string,
  ) =>
    apiClient.request<RfidSession>(root, {
      method: "POST",
      body: JSON.stringify({
        schoolId,
        studentId,
        deviceId,
        operation,
        ...(operation === "REPLACE"
          ? { expectedPreviousCardUid, expectedStudentVersion }
          : {}),
      }),
    }),
  revoke: (
    studentId: string,
    expectedCardUid: string,
    expectedStudentVersion: string,
  ) =>
    apiClient.request<{
      studentId: string;
      rfidCardUid: null;
      updatedAt: string;
    }>(`/iot/students/${encodeURIComponent(studentId)}/rfid-card`, {
      method: "DELETE",
      body: JSON.stringify({ expectedCardUid, expectedStudentVersion }),
    }),
  confirm: (s: RfidSession) =>
    apiClient.request<RfidSession>(
      `${root}/${encodeURIComponent(s.id)}/confirm`,
      {
        method: "POST",
        body: JSON.stringify({ capturedScanId: s.candidate?.scanId }),
      },
    ),
  cancel: (id: string) =>
    apiClient.request<RfidSession>(`${root}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  reconcile: (id: string) =>
    apiClient.request<RfidSession>(
      `${root}/${encodeURIComponent(id)}/reconcile`,
      { method: "POST" },
    ),
};
