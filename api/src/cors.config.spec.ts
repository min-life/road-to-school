import 'reflect-metadata';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GATEWAY_OPTIONS } from '@nestjs/websockets/constants.js';
import type { GatewayMetadata } from '@nestjs/websockets';
import { corsOrigin } from './cors.config.js';
import { IotScansGateway } from './iot/realtime/iot-scans.gateway.js';

describe('CORS_ALLOWED_ORIGINS', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('matches only exact configured browser origins for HTTP', () => {
    vi.stubEnv('CORS_ALLOWED_ORIGINS', ' https://admin.example.com, http://localhost:5173 ');
    const callback = vi.fn();
    corsOrigin('https://admin.example.com', callback);
    expect(callback).toHaveBeenLastCalledWith(null, true);
    corsOrigin('http://localhost:5173', callback);
    expect(callback).toHaveBeenLastCalledWith(null, true);
    corsOrigin('https://admin.example.com.other-domain.test', callback);
    expect(callback).toHaveBeenLastCalledWith(null, false);
  });

  it('does not open HTTP CORS when unset or configured with a wildcard', () => {
    const callback = vi.fn();
    for (const value of [undefined, '*']) {
      vi.stubEnv('CORS_ALLOWED_ORIGINS', value);
      corsOrigin('https://admin.example.com', callback);
      expect(callback).toHaveBeenLastCalledWith(null, false);
    }
  });

  it('checks browser origins on Socket.IO upgrades and accepts origin-less clients for authentication', () => {
    vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://admin.example.com');
    const options: GatewayMetadata = Reflect.getMetadata(GATEWAY_OPTIONS, IotScansGateway);
    const callback = vi.fn();
    options.allowRequest!({ headers: { origin: 'https://admin.example.com' } }, callback);
    expect(callback).toHaveBeenLastCalledWith(null, true);
    options.allowRequest!({ headers: { origin: 'https://another.example.com' } }, callback);
    expect(callback).toHaveBeenLastCalledWith(null, false);
    options.allowRequest!({ headers: {} }, callback);
    expect(callback).toHaveBeenLastCalledWith(null, true);
  });
});
