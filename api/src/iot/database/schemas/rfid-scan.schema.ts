import { Schema } from 'mongoose';
import type { AttendanceContext } from '../../attendance/attendance-context.service.js';
export const ATTENDANCE_STATES = [
  'WAITING_CONFIRMATION',
  'COMMITTING',
  'RECONCILING',
  'APPLIED',
  'ALREADY_RECORDED',
  'REJECTED',
  'DISMISSED',
  'EXPIRED',
] as const;
export type AttendanceState = (typeof ATTENDANCE_STATES)[number];

export interface IotRfidScan {
  scanId: string;
  cardUid: string;
  cardType?: string;
  deviceId: string;
  scannedAt: Date;
  createdAt: Date;
  assignmentId?: string | null;
  vehicleId?: string | null;
  vehicleLicensePlateSnapshot?: string | null;
  purpose?: 'RAW' | 'ATTENDANCE';
  tripId?: string;
  studentId?: string;
  studentVersion?: string;
  studentNameSnapshot?: string;
  studentCodeSnapshot?: string;
  phase?: 'BOARDING' | 'ALIGHTING';
  context?: AttendanceContext;
  contextToken?: string;
  processingState?: AttendanceState;
  resultCode?: string;
  expiresAt?: Date;
  confirmedById?: string;
  confirmedAt?: Date;
  closedAt?: Date;
  processingVersion?: number;
}

export const IotRfidScanSchema = new Schema<IotRfidScan>(
  {
    scanId: {
      type: String,
      required: true,
      immutable: true,
      match:
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    },
    cardUid: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^(?:[0-9A-F]{8}|[0-9A-F]{14})$/,
    },
    cardType: { type: String, trim: true, maxlength: 80 },
    deviceId: { type: String, required: true, trim: true, maxlength: 128 },
    scannedAt: { type: Date, required: true },
    assignmentId: { type: String, default: null },
    vehicleId: { type: String, default: null },
    vehicleLicensePlateSnapshot: { type: String, default: null, maxlength: 20 },
    purpose: { type: String, enum: ['RAW', 'ATTENDANCE'] },
    tripId: String,
    studentId: String,
    studentVersion: String,
    studentNameSnapshot: String,
    studentCodeSnapshot: String,
    phase: { type: String, enum: ['BOARDING', 'ALIGHTING'] },
    context: { type: Schema.Types.Mixed },
    contextToken: { type: String, maxlength: 1024 },
    processingState: { type: String, enum: ATTENDANCE_STATES },
    resultCode: String,
    expiresAt: Date,
    confirmedById: String,
    confirmedAt: Date,
    closedAt: Date,
    processingVersion: { type: Number, default: 0 },
  },
  {
    collection: 'rfid_scans',
    timestamps: { createdAt: true, updatedAt: false },
    strict: 'throw',
    writeConcern: { w: 'majority', j: true, wtimeout: 2000 },
  },
);

IotRfidScanSchema.index({ scanId: 1 }, { unique: true });
IotRfidScanSchema.index({ cardUid: 1 });
IotRfidScanSchema.index({ deviceId: 1 });
IotRfidScanSchema.index({ scannedAt: -1 });
IotRfidScanSchema.index({ vehicleId: 1, scannedAt: -1 });
IotRfidScanSchema.index({ assignmentId: 1, scannedAt: -1 });
IotRfidScanSchema.index({ tripId: 1, processingState: 1, createdAt: -1 });
IotRfidScanSchema.index({ studentId: 1, scannedAt: -1 });
