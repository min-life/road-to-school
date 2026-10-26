import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service.js';

describe('SystemSettingsService - Parking Lot Management', () => {
  let service: SystemSettingsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      systemSetting: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn(),
      },
      routePlan: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      trip: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      leaveNotice: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    service = new SystemSettingsService(mockPrisma);
  });

  describe('getParkingLot', () => {
    it('trả về cấu hình mặc định khi chưa từng thiết lập trong Database', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const result = await service.getParkingLot();

      expect(result.addressText).toBe('Bãi đỗ xe trung tâm TP. Hồ Chí Minh');
      expect(result.latitude).toBe(10.776889);
      expect(result.longitude).toBe(106.700806);
      expect(result.updatedAt).toBeNull();
    });

    it('trả về cấu hình đã lưu trong Database', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        id: 'default',
        key: 'PARKING_LOT',
        value: {
          addressText: '123 Bến Vân Đồn, Quận 4, TP.HCM',
          latitude: 10.760123,
          longitude: 106.699876,
        },
        updatedAt: new Date('2026-10-23T10:00:00Z'),
      });

      const result = await service.getParkingLot();

      expect(result.addressText).toBe('123 Bến Vân Đồn, Quận 4, TP.HCM');
      expect(result.latitude).toBe(10.760123);
      expect(result.longitude).toBe(106.699876);
      expect(result.updatedAt).toBe('2026-10-23T10:00:00.000Z');
    });
  });

  describe('updateParkingLot', () => {
    it('cập nhật thành công tọa độ và địa chỉ bãi đỗ xe hợp lệ', async () => {
      const updateDto = {
        addressText: 'Bãi xe Suối Tiên, TP. Thủ Đức',
        latitude: 10.866222,
        longitude: 106.802111,
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({
        id: 'default',
        key: 'PARKING_LOT',
        value: updateDto,
        updatedAt: new Date('2026-10-23T12:00:00Z'),
      });

      const result = await service.updateParkingLot(updateDto, 'admin-id-1');

      expect(result.addressText).toBe(updateDto.addressText);
      expect(result.latitude).toBe(updateDto.latitude);
      expect(result.longitude).toBe(updateDto.longitude);
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'PARKING_LOT' },
        create: {
          key: 'PARKING_LOT',
          value: updateDto,
          updatedById: 'admin-id-1',
        },
        update: {
          value: updateDto,
          updatedById: 'admin-id-1',
        },
      });
    });

    it('từ chối khi địa chỉ để trống', async () => {
      await expect(
        service.updateParkingLot(
          { addressText: '   ', latitude: 10.5, longitude: 106.5 },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối khi vĩ độ hoặc kinh độ ngoài phạm vi hợp lệ WGS-84', async () => {
      await expect(
        service.updateParkingLot(
          { addressText: 'Địa chỉ', latitude: 95.0, longitude: 106.5 },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateParkingLot(
          { addressText: 'Địa chỉ', latitude: 10.5, longitude: -190.0 },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
