import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { DriversService } from './drivers.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DriverStatusFilter } from './dto/index.js';

describe('DriversService', () => {
  let service: DriversService;
  let prisma: PrismaService;

  const mockDate = new Date('2026-10-23T08:00:00.000Z');
  const mockDriver = {
    id: 'driver-uuid-1',
    fullName: 'Trần Văn Lái',
    email: 'driver1@roadtoschool.vn',
    phone: '0912345678',
    role: Role.DRIVER,
    schoolId: null,
    isActive: true,
    isVerified: true,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(() => {
    prisma = {
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new DriversService(prisma);
  });

  describe('listDrivers', () => {
    it('lấy danh sách tài xế phân trang mặc định', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockDriver] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await service.listDrivers({});

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: Role.DRIVER,
          }),
          skip: 0,
          take: 10,
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('driver-uuid-1');
      expect(result.meta.totalItems).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('áp dụng bộ lọc search và status', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockDriver] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      await service.listDrivers({
        search: 'Trần Văn',
        status: DriverStatusFilter.ACTIVE,
        page: 2,
        limit: 5,
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: Role.DRIVER,
            isActive: true,
            OR: [
              { fullName: { contains: 'Trần Văn', mode: 'insensitive' } },
              { email: { contains: 'Trần Văn', mode: 'insensitive' } },
              { phone: { contains: 'Trần Văn', mode: 'insensitive' } },
            ],
          }),
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  describe('createDriver', () => {
    it('tạo tài xế thành công với chỉ email', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockDriver as any);

      const result = await service.createDriver({
        fullName: 'Trần Văn Lái',
        email: 'driver1@roadtoschool.vn',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullName: 'Trần Văn Lái',
            email: 'driver1@roadtoschool.vn',
            phone: null,
            role: Role.DRIVER,
            schoolId: null,
            isActive: true,
            isVerified: true,
          }),
        }),
      );
      expect(result.id).toBe('driver-uuid-1');
      expect(result.role).toBe(Role.DRIVER);
      expect(result.schoolId).toBeNull();
    });

    it('tạo tài xế thành công với chỉ số điện thoại', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        ...mockDriver,
        email: null,
      } as any);

      const result = await service.createDriver({
        fullName: 'Trần Văn Lái',
        phone: '0912345678',
      });

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.phone).toBe('0912345678');
    });

    it('ném lỗi BadRequestException nếu thiếu cả email lẫn số điện thoại', async () => {
      await expect(
        service.createDriver({
          fullName: 'Trần Văn Lái',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi ConflictException nếu email đã tồn tại', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        ...mockDriver,
        email: 'driver1@roadtoschool.vn',
      } as any);

      await expect(
        service.createDriver({
          fullName: 'Trần Văn Lái',
          email: 'driver1@roadtoschool.vn',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('ném lỗi ConflictException nếu số điện thoại đã tồn tại', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        ...mockDriver,
        phone: '0912345678',
      } as any);

      await expect(
        service.createDriver({
          fullName: 'Trần Văn Lái',
          phone: '0912345678',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getDriver', () => {
    it('trả về thông tin chi tiết tài xế', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockDriver as any);

      const result = await service.getDriver('driver-uuid-1');

      expect(result.id).toBe('driver-uuid-1');
      expect(result.fullName).toBe('Trần Văn Lái');
      expect(result.role).toBe(Role.DRIVER);
    });

    it('ném lỗi NotFoundException nếu không tìm thấy tài xế', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(service.getDriver('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
