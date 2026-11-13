import { mobileApiClient } from './api-client';

export type RfidPhase = 'BOARDING' | 'ALIGHTING';
export type RfidState =
  | 'WAITING_CONFIRMATION'
  | 'COMMITTING'
  | 'RECONCILING'
  | 'APPLIED'
  | 'ALREADY_RECORDED'
  | 'REJECTED'
  | 'DISMISSED'
  | 'EXPIRED';
export interface RfidAttendanceEvent {
  scanId: string;
  deviceId: string;
  tripId: string;
  studentId: string | null;
  studentName: string | null;
  studentCode: string | null;
  cardUid: string;
  phase: RfidPhase;
  state: RfidState;
  resultCode: string | null;
  scannedAt: string;
  expiresAt: string;
  serverTime: string;
  confirmedById: string | null;
  confirmedAt: string | null;
  current: boolean;
  historical: boolean;
}
export interface RfidAttendanceList {
  data: RfidAttendanceEvent[];
  total: number;
  page: number;
  limit: number;
  phase: RfidPhase | null;
  serverTime: string;
  reader: {
    deviceId: string | null;
    status: 'NO_DEVICE' | 'PENDING' | 'READY';
    lastAckAt: string | null;
  };
}
const path = (tripId: string) =>
  `/trips/${encodeURIComponent(tripId)}/rfid-scans`;
export const rfidAttendanceApi = {
  list: (tripId: string, view: 'queue' | 'history', page: number) =>
    mobileApiClient.request<RfidAttendanceList>(
      `${path(tripId)}?view=${view}&page=${page}&limit=10`,
      { method: 'GET' },
    ),
  confirm: (tripId: string, scanId: string) =>
    mobileApiClient.request<RfidAttendanceEvent>(
      `${path(tripId)}/${encodeURIComponent(scanId)}/confirm`,
      { method: 'POST', body: '{}' },
    ),
  dismiss: (tripId: string, scanId: string) =>
    mobileApiClient.request<RfidAttendanceEvent>(
      `${path(tripId)}/${encodeURIComponent(scanId)}/dismiss`,
      { method: 'POST', body: '{}' },
    ),
};
