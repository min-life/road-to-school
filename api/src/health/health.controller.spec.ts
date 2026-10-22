import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let healthController: HealthController;
  let healthService: HealthService;

  beforeEach(() => {
    healthService = {
      getHealth: vi.fn().mockReturnValue({
        status: 'ok',
        timestamp: '2026-10-22T00:00:00.000Z',
      }),
      getDbHealth: vi.fn().mockResolvedValue({
        status: 'ok',
        database: 'connected',
        timestamp: '2026-10-22T00:00:00.000Z',
      }),
    } as unknown as HealthService;

    healthController = new HealthController(healthService);
  });

  it('should return health status', () => {
    const result = healthController.getHealth();
    expect(result.status).toBe('ok');
    expect(result).toHaveProperty('timestamp');
  });

  it('should return database health status', async () => {
    const result = await healthController.getDbHealth();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result).toHaveProperty('timestamp');
  });
});
