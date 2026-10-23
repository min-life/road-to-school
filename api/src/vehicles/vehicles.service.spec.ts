import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { VehiclesService, normalizeLicensePlate } from './vehicles.service.js';
import { Prisma } from '@prisma/client';

describe('VehiclesService & Capacity Semantics', () => {
  let service: VehiclesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      vehicle: {
        findFirst: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };
    service = new VehiclesService(mockPrisma);
  });

  describe('normalizeLicensePlate', () => {
    it('chuẩn hóa biển số xe chính xác (loại bỏ khoảng trắng, dấu chấm, dấu gạch nối, chuyển in hoa)', () => {
      expect(normalizeLicensePlate('51B - 123.45')).toBe('51B12345');
      expect(normalizeLicensePlate('  29a-999.99  ')).toBe('29A99999');
      expect(normalizeLicensePlate('60-B1 4567')).toBe('60B14567');
    });
  });

  describe('createVehicle - Capacity Semantics & Persistence', () => {
    it('MANDATORY: Lưu đúng seatCount đại diện cho số ghế khả dụng chở HỌC SINH (không tự trừ ghế tài xế hay nhân sự)', async () => {
      // Ví dụ PO: Xe 16 chỗ vật lý, 1 tài xế, 1 phụ xe, 14 ghế học sinh -> Request gửi seatCount = 14
      const createDto = {
        brand: 'Hyundai Solati',
        seatCount: 14,
        licensePlate: '51B-123.45',
        color: 'Trắng',
      };

      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      mockPrisma.vehicle.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({
          id: 'v-123',
          brand: data.brand,
          seatCount: data.seatCount, // Phải giữ nguyên 14
          licensePlate: data.licensePlate,
          normalizedPlate: data.normalizedPlate,
          color: data.color,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await service.createVehicle(createDto);

      // Xác nhận Backend lưu và trả về chính xác seatCount = 14
      expect(result.seatCount).toBe(14);
      expect(mockPrisma.vehicle.create).toHaveBeenCalledWith({
        data: {
          brand: 'Hyundai Solati',
          seatCount: 14,
          licensePlate: '51B-123.45',
          normalizedPlate: '51B12345',
          color: 'Trắng',
        },
      });
    });

    it('từ chối khi biển số xe đã tồn tại (kiểm tra trước bằng normalizedPlate)', async () => {
      const createDto = {
        brand: 'Ford Transit',
        seatCount: 16,
        licensePlate: '29B-999.88',
        color: 'Bạc',
      };

      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'existing-id' });

      await expect(service.createVehicle(createDto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.vehicle.create).not.toHaveBeenCalled();
    });

    it('xử lý an toàn khi xảy ra race condition qua lỗi Prisma P2002', async () => {
      const createDto = {
        brand: 'Toyota HiAce',
        seatCount: 10,
        licensePlate: '50A-111.22',
        color: 'Xanh',
      };

      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      mockPrisma.vehicle.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.createVehicle(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('listVehicles', () => {
    it('tìm kiếm và phân trang phía máy chủ', async () => {
      mockPrisma.vehicle.count.mockResolvedValue(25);
      mockPrisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'v-1',
          brand: 'Hyundai',
          seatCount: 14,
          licensePlate: '51B-11111',
          color: 'Trắng',
          createdAt: new Date('2026-10-23T10:00:00Z'),
          updatedAt: new Date('2026-10-23T10:00:00Z'),
        },
      ]);

      const result = await service.listVehicles({ page: 2, limit: 10, search: 'Hyundai' });

      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(result.items.length).toBe(1);
      expect(result.items[0].seatCount).toBe(14);
    });
  });
});
