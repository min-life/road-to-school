import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role } from '@prisma/client';
import { DriversController } from './drivers.controller.js';
import { DriversService } from './drivers.service.js';
import { DriverStatusFilter } from './dto/index.js';

describe('DriversController', () => {
  let controller: DriversController;
  let service: DriversService;

  const mockDriver = {
    id: 'driver-uuid-1',
    fullName: 'Trần Văn Lái',
    email: 'driver1@roadtoschool.vn',
    phone: '0912345678',
    role: Role.DRIVER,
    schoolId: null,
    isActive: true,
    isVerified: true,
    createdAt: '2026-10-23T08:00:00.000Z',
  };

  const mockListResponse = {
    items: [mockDriver],
    meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
  };

  beforeEach(() => {
    service = {
      listDrivers: vi.fn().mockResolvedValue(mockListResponse),
      getDriver: vi.fn().mockResolvedValue(mockDriver),
      createDriver: vi.fn().mockResolvedValue({
        ...mockDriver,
        message: 'Tạo tài khoản tài xế thành công',
      }),
    } as unknown as DriversService;

    controller = new DriversController(service);
  });

  it('listDrivers gọi service.listDrivers với query', async () => {
    const query = {
      page: 1,
      limit: 10,
      search: 'Trần',
      status: DriverStatusFilter.ACTIVE,
    };
    const result = await controller.listDrivers(query);

    expect(service.listDrivers).toHaveBeenCalledWith(query);
    expect(result).toBe(mockListResponse);
  });

  it('createDriver gọi service.createDriver với dto', async () => {
    const dto = {
      fullName: 'Trần Văn Lái',
      email: 'driver1@roadtoschool.vn',
    };
    const result = await controller.createDriver(dto);

    expect(service.createDriver).toHaveBeenCalledWith(dto);
    expect(result.id).toBe('driver-uuid-1');
  });

  it('getDriver gọi service.getDriver với id', async () => {
    const result = await controller.getDriver('driver-uuid-1');

    expect(service.getDriver).toHaveBeenCalledWith('driver-uuid-1');
    expect(result.id).toBe('driver-uuid-1');
  });
});
