import { ConfigModule, ConditionalModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IotModule } from './iot.module.js';
import { isIotEnabled, IOT_DATABASE } from './iot.constants.js';
import { createIotDatabaseOptions } from './database/iot-database.options.js';
import { IotDeviceSchema } from './database/schemas/device.schema.js';
import { IotRfidScanSchema } from './database/schemas/rfid-scan.schema.js';
import { IotDeviceWifiSchema } from './database/schemas/device-wifi.schema.js';

// Schema metadata/configuration only: no documents, fixtures, network or DB writes.
describe('IoT infrastructure isolation', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('requires an explicit enable flag', () => {
    expect(isIotEnabled({})).toBe(false);
    expect(isIotEnabled({ IOT_ENABLED: 'false' })).toBe(false);
    expect(isIotEnabled({ IOT_ENABLED: '1' })).toBe(false);
    expect(isIotEnabled({ IOT_ENABLED: ' TRUE ' })).toBe(true);
  });

  it('does not initialize MongoDB when IoT is disabled', async () => {
    vi.stubEnv('IOT_ENABLED', 'false');
    vi.stubEnv('MONGODB_IOT_URI', '');
    const connect = vi.spyOn(mongoose, 'createConnection');
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true }),
        ConditionalModule.registerWhen(IotModule, isIotEnabled, { debug: false }),
      ],
    }).compile();
    try {
      await module.init();
      expect(connect).not.toHaveBeenCalled();
    } finally {
      await module.close();
      connect.mockRestore();
    }
  });

  it('fails on missing configuration without using the business DATABASE_URL', () => {
    expect(() => createIotDatabaseOptions(undefined)).toThrow('MONGODB_IOT_URI');
    expect(() => createIotDatabaseOptions('')).toThrow('MONGODB_IOT_URI');
    expect(() => createIotDatabaseOptions('postgresql://')).toThrow('MONGODB_IOT_URI');
  });

  it('fixes the separate database name and bounds connection failures', () => {
    const options = createIotDatabaseOptions('mongodb://127.0.0.1:27017');
    expect(options.dbName).toBe(IOT_DATABASE);
    expect(options.bufferCommands).toBe(false);
    expect(options.serverSelectionTimeoutMS).toBe(5000);
    expect(options.retryAttempts).toBe(1);
  });

  it('registers exactly the three planned collections with strict schemas', () => {
    const schemas = [IotDeviceSchema, IotRfidScanSchema, IotDeviceWifiSchema];
    expect(schemas.map((schema) => schema.get('collection'))).toEqual([
      'devices', 'rfid_scans', 'device_wifi_configs',
    ]);
    for (const schema of schemas) {
      expect(schema.get('strict')).toBe('throw');
      if(schema!==IotRfidScanSchema){
        expect(Object.hasOwn(schema.paths, 'studentId')).toBe(false);
        expect(Object.hasOwn(schema.paths, 'tripId')).toBe(false);
      } else {
        expect(schema.path('tripId').isRequired).toBeFalsy();
        expect(schema.path('studentId').isRequired).toBeFalsy();
      }
    }
  });

  it('enforces device identity uniqueness without marking a new device online', () => {
    expect(IotDeviceSchema.indexes()).toContainEqual([{ deviceId: 1 }, { unique: true }]);
    expect(IotDeviceSchema.path('status').options.default).toBe('OFFLINE');
    expect(IotDeviceSchema.path('lastSeenAt').options.default).toBeUndefined();
  });

  it('keeps scan delivery identity unique but permits later scans of the same card', () => {
    expect(IotRfidScanSchema.indexes()).toContainEqual([{ scanId: 1 }, { unique: true }]);
    const cardIndex = IotRfidScanSchema.indexes().find(([keys]) => 'cardUid' in keys);
    expect(cardIndex?.[1].unique).not.toBe(true);
    expect(IotRfidScanSchema.path('scannedAt').isRequired).toBe(true);
  });

  it('hides Wi-Fi ciphertext from queries and requires device confirmation', () => {
    expect(IotDeviceWifiSchema.path('passwordEncrypted').options.select).toBe(false);
    expect(IotDeviceWifiSchema.path('password')).toBeUndefined();
    expect(IotDeviceWifiSchema.path('isConfigured').options.default).toBe(false);
    expect(IotDeviceWifiSchema.indexes()).toContainEqual([{ deviceId: 1 }, { unique: true }]);
  });
});
