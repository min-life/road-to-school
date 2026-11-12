import { Schema } from 'mongoose';
import { randomUUID } from 'node:crypto';
export const ENROLLMENT_STATES = [
  'WAITING_CARD',
  'CARD_CAPTURED',
  'COMMITTING',
  'RECONCILING',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'INVALIDATED',
  'FAILED',
] as const;
export type EnrollmentState = (typeof ENROLLMENT_STATES)[number];
export interface EnrollmentSession {
  _id: string;
  deviceId: string;
  studentId: string;
  createdById: string;
  studentVersion: string;
  operation?: 'REGISTER' | 'REPLACE';
  expectedPreviousCardUid?: string;
  startedAt: Date;
  expiresAt: Date;
  state: EnrollmentState;
  isOpen: boolean;
  version: number;
  lastDeviceAckAt?: Date | null;
  capturedScanId?: string;
  capturedCardUid?: string;
  capturedScannedAt?: Date;
  capturedAt?: Date;
  capturedCardType?: string;
  confirmRequestedAt?: Date;
  closedAt?: Date;
  closeReason?: string;
  reconciledById?: string;
  reconciledAt?: Date;
  lastScanFeedback?: { scanId: string; code: string; observedAt: Date };
}
export const EnrollmentSessionSchema = new Schema<EnrollmentSession>(
  {
    _id: { type: String, default: () => randomUUID() },
    deviceId: { type: String, required: true, maxlength: 128 },
    studentId: { type: String, required: true },
    createdById: { type: String, required: true },
    studentVersion: { type: String, required: true },
    operation: {
      type: String,
      enum: ['REGISTER', 'REPLACE'],
      default: 'REGISTER',
    },
    expectedPreviousCardUid: {
      type: String,
      match: /^(?:[0-9A-F]{8}|[0-9A-F]{14})$/,
    },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    state: { type: String, enum: ENROLLMENT_STATES, required: true },
    isOpen: { type: Boolean, required: true },
    version: { type: Number, default: 0 },
    lastDeviceAckAt: Date,
    capturedScanId: String,
    capturedCardUid: { type: String, match: /^(?:[0-9A-F]{8}|[0-9A-F]{14})$/ },
    capturedScannedAt: Date,
    capturedAt: Date,
    capturedCardType: { type: String, maxlength: 80 },
    confirmRequestedAt: Date,
    closedAt: Date,
    closeReason: { type: String, maxlength: 80 },
    reconciledById: String,
    reconciledAt: Date,
    lastScanFeedback: {
      type: new Schema(
        { scanId: String, code: String, observedAt: Date },
        { _id: false },
      ),
    },
  },
  {
    collection: 'rfid_enrollment_sessions',
    strict: 'throw',
    writeConcern: { w: 'majority', j: true, wtimeout: 2000 },
  },
);
EnrollmentSessionSchema.index(
  { deviceId: 1 },
  { unique: true, partialFilterExpression: { isOpen: true } },
);
EnrollmentSessionSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { isOpen: true } },
);
EnrollmentSessionSchema.index(
  { capturedScanId: 1 },
  {
    unique: true,
    partialFilterExpression: { capturedScanId: { $type: 'string' } },
  },
);
EnrollmentSessionSchema.index({ deviceId: 1, startedAt: -1 });
EnrollmentSessionSchema.index({ studentId: 1, startedAt: -1 });
