import { Schema } from 'mongoose';

export interface IotDevice {
  deviceId: string;
  name: string;
  macAddress: string;
  chipModel: string;
  firmwareVersion: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeenAt?: Date;
  reportedAssignmentId?: string | null;
  lastConfigAckAt?: Date | null;
  reportedAttendanceTripId?: string | null;
  reportedAttendancePhase?: string | null;
  reportedAttendanceVersion?: string | null;
  lastAttendanceAckAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const IotDeviceSchema = new Schema<IotDevice>(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
      immutable: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    macAddress: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^(?:[0-9A-F]{12}|(?:[0-9A-F]{2}:){5}[0-9A-F]{2})$/,
    },
    chipModel: { type: String, required: true, trim: true, maxlength: 80 },
    firmwareVersion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'OFFLINE',
      required: true,
    },
    lastSeenAt: { type: Date },
    reportedAssignmentId: { type: String, default: null },
    lastConfigAckAt: { type: Date, default: null },
    reportedAttendanceTripId: { type: String, default: null },
    reportedAttendancePhase: {
      type: String,
      enum: ['BOARDING', 'ALIGHTING', null],
      default: null,
    },
    reportedAttendanceVersion: { type: String, default: null },
    lastAttendanceAckAt: { type: Date, default: null },
  },
  { collection: 'devices', timestamps: true, strict: 'throw' },
);

IotDeviceSchema.index({ deviceId: 1 }, { unique: true });
IotDeviceSchema.index({ macAddress: 1 });
