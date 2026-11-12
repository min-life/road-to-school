import { Schema } from 'mongoose';

export interface IotDeviceWifi {
  deviceId: string;
  ssid: string;
  passwordMasked: string;
  passwordEncrypted: string;
  isConfigured: boolean;
  updatedAt: Date;
}

export const IotDeviceWifiSchema = new Schema<IotDeviceWifi>(
  {
    deviceId: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    ssid: { type: String, required: true, maxlength: 32 },
    passwordMasked: { type: String, default: '********', enum: ['********'] },
    // The Wi-Fi service encrypts before persistence; no plaintext readback endpoint.
    // Exclude the ciphertext from ordinary queries and JSON serialization.
    passwordEncrypted: { type: String, required: true, select: false },
    isConfigured: { type: Boolean, required: true, default: false },
  },
  {
    collection: 'device_wifi_configs',
    timestamps: { createdAt: false, updatedAt: true },
    strict: 'throw',
    toJSON: {
      transform: (_document, result) => {
        Reflect.deleteProperty(result, 'passwordEncrypted');
        return result;
      },
    },
  },
);

IotDeviceWifiSchema.index({ deviceId: 1 }, { unique: true });
