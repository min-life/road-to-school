vi.mock('../notifications/notification-writer.js', () => ({
  notifyTrip: vi.fn().mockResolvedValue(undefined),
  notifyAssignment: vi.fn().mockResolvedValue(undefined),
  notifyCancelledTrips: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../notifications/notification-events.js', () => ({
  notifyRequest: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../schools/location-province.js', () => ({
  provinceForCoordinates: vi.fn().mockImplementation((lat: number, lng: number) => {
    if (lat === 10.95 && lng === 106.85) return Promise.resolve('Đồng Nai');
    return Promise.resolve('Thành phố Hồ Chí Minh');
  }),
  administrativeLocationForCoordinates: vi.fn().mockResolvedValue({
    province: 'Thành phố Hồ Chí Minh',
    provinceId: '79',
    ward: 'Phường Bến Nghé',
    wardId: '26734',
  }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { StudentRequestsService } from './student-requests.service.js';
import {
  RequestType,
  RequestStatus,
  StudentStatus,
  Role,
  OtpPurpose,
} from '@prisma/client';
import { ServiceAreaStatus } from './dto/index.js';

describe('Parent Address Service Area Check & OTP Gate Verification', () => {
  let service: StudentRequestsService;
  let mockPrisma: any;
  let mockOtpService: any;

  const mockStudent = {
    id: 'stu-100',
    code: 'STU100',
    fullName: 'Trần Văn Bé',
    guardianPhone: '0901234567',
    addressText: '100 Nguyễn Huệ, Quận 1',
    latitude: 10.776,
    longitude: 106.700,
    schoolId: 'school-100',
    status: StudentStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSchool = {
    id: 'school-100',
    name: 'Trường Tiểu học Ánh Dương',
    province: 'Thành phố Hồ Chí Minh',
    isActive: true,
  };

  // Center parking lot in TP.HCM
  const mockParkingSetting = {
    key: 'PARKING_LOT',
    value: {
      latitude: 10.776889,
      longitude: 106.700806,
      addressText: 'Bãi đỗ xe trung tâm',
      maxOperatingRadiusKm: 50,
    },
  };

  beforeEach(() => {
    mockPrisma = {
      parentStudentLink: {
        findUnique: vi.fn().mockResolvedValue({
          parentId: 'parent-1',
          studentId: 'stu-100',
          student: mockStudent,
        }),
      },
      school: {
        findUnique: vi.fn().mockResolvedValue(mockSchool),
      },
      schoolScheduledChange: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      systemSetting: {
        findUnique: vi.fn().mockResolvedValue(mockParkingSetting),
      },
      studentUpdateRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'req-1',
          studentId: 'stu-100',
          parentId: 'parent-1',
          schoolId: 'school-100',
          type: RequestType.ADDRESS_UPDATE,
          status: RequestStatus.PENDING,
          beforeData: {},
          proposedData: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          student: mockStudent,
          parent: { id: 'parent-1', fullName: 'Phụ huynh 1' },
          school: { id: 'school-100', name: 'Trường Ánh Dương' },
        }),
      },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };

    mockOtpService = {
      createStudentUpdateRequestChallenge: vi.fn().mockResolvedValue({
        challengeId: 'chal-123',
        maskedPhone: '090****567',
        expiresInSeconds: 300,
      }),
      withVerifiedChallenge: vi.fn(async (params, callback) => callback(mockPrisma)),
    };

    service = new StudentRequestsService(mockPrisma, mockOtpService, {} as any);
  });

  describe('1. Quyền truy cập & Cách ly học sinh (Access Control)', () => {
    it('từ chối khi phụ huynh chưa liên kết với học sinh (ForbiddenException)', async () => {
      mockPrisma.parentStudentLink.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.checkParentServiceArea('parent-intruder', 'stu-100', {
          latitude: 10.78,
          longitude: 106.71,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('từ chối khi học sinh bị vô hiệu hóa DISABLED (BadRequestException)', async () => {
      mockPrisma.parentStudentLink.findUnique.mockResolvedValueOnce({
        parentId: 'parent-1',
        studentId: 'stu-100',
        student: { ...mockStudent, status: StudentStatus.DISABLED },
      });

      await expect(
        service.checkParentServiceArea('parent-1', 'stu-100', {
          latitude: 10.78,
          longitude: 106.71,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('báo lỗi khi không tìm thấy trường học (NotFoundException)', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.checkParentServiceArea('parent-1', 'stu-100', {
          latitude: 10.78,
          longitude: 106.71,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Kiểm tra vị trí trong, đúng rìa và ngoài bán kính Haversine', () => {
    it('trả về IN_SERVICE_AREA khi vị trí nằm sâu trong bán kính phục vụ', async () => {
      // Vị trí cách bãi đỗ xe ~500m
      const result = await service.checkParentServiceArea('parent-1', 'stu-100', {
        latitude: 10.780,
        longitude: 106.705,
      });

      expect(result.status).toBe(ServiceAreaStatus.IN_SERVICE_AREA);
      expect(result.distanceKm).toBeDefined();
      expect(result.distanceKm).toBeLessThan(50);
      expect(result.maxOperatingRadiusKm).toBe(50);
      expect(result.boundary).toBeDefined();
      expect(result.boundary?.center.latitude).toBeCloseTo(10.776889, 5);
      expect(result.boundary?.radiusMeters).toBe(50000);
      expect(result.boundary?.radiusKm).toBe(50);
    });

    it('chấp nhận điểm đúng rìa bán kính (distance <= maxRadiusKm)', async () => {
      // Cấu hình bãi xe với bán kính 10 km
      mockPrisma.systemSetting.findUnique.mockResolvedValueOnce({
        key: 'PARKING_LOT',
        value: {
          latitude: 10.0,
          longitude: 106.0,
          maxOperatingRadiusKm: 10,
        },
      });

      // Điểm cách đúng ~9.9 km (ngay rìa)
      const latNearEdge = 10.0 + 9.9 / 110.574;
      const result = await service.checkParentServiceArea('parent-1', 'stu-100', {
        latitude: latNearEdge,
        longitude: 106.0,
      });

      expect(result.status).toBe(ServiceAreaStatus.IN_SERVICE_AREA);
      expect(result.maxOperatingRadiusKm).toBe(10);
      expect(result.boundary?.radiusKm).toBe(10);
    });

    it('trả về OUT_OF_SERVICE_AREA khi vị trí vượt quá bán kính phục vụ', async () => {
      // Điểm cách xa ~100 km (Vũng Tàu / Cần Thơ)
      const result = await service.checkParentServiceArea('parent-1', 'stu-100', {
        latitude: 11.8,
        longitude: 107.5,
      });

      expect(result.status).toBe(ServiceAreaStatus.OUT_OF_SERVICE_AREA);
      expect(result.distanceKm).toBeGreaterThan(50);
      expect(result.maxOperatingRadiusKm).toBe(50);
      expect(result.message).toContain('vượt quá bán kính phục vụ');
    });

    it('trả về OUT_OF_SERVICE_AREA khi vị trí thuộc tỉnh khác với trường', async () => {
      // Điểm trong bán kính 50km (~25km) nhưng thuộc tỉnh 'Đồng Nai', trong khi trường ở 'Thành phố Hồ Chí Minh'
      const result = await service.checkParentServiceArea('parent-1', 'stu-100', {
        latitude: 10.95,
        longitude: 106.85,
      });

      expect(result.status).toBe(ServiceAreaStatus.OUT_OF_SERVICE_AREA);
      expect(result.message).toContain('khác tỉnh/thành');
    });

    it('trả về UNAVAILABLE khi bãi đỗ xe chưa được cấu hình hoặc lỗi tọa độ', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValueOnce({
        key: 'PARKING_LOT',
        value: null,
      });

      const result = await service.checkParentServiceArea('parent-1', 'stu-100', {
        latitude: 10.78,
        longitude: 106.71,
      });

      expect(result.status).toBe(ServiceAreaStatus.UNAVAILABLE);
      expect(result.message).toContain('Chưa thể kiểm tra phạm vi phục vụ');
    });
  });

  describe('3. Rà soát Backend trước khi gửi OTP (requestOtp Gate)', () => {
    it('cho phép gửi OTP khi địa chỉ đề xuất trong bán kính phục vụ', async () => {
      const res = await service.requestOtp('parent-1', 'stu-100', {
        type: RequestType.ADDRESS_UPDATE,
        proposedData: {
          addressText: '123 Đường Mới Hợp Lệ',
          latitude: 10.780,
          longitude: 106.705,
        },
      });

      expect(res.challengeId).toBe('chal-123');
      expect(mockOtpService.createStudentUpdateRequestChallenge).toHaveBeenCalled();
    });

    it('chặn gửi OTP (ConflictException) khi địa chỉ đề xuất nằm ngoài bán kính phục vụ', async () => {
      await expect(
        service.requestOtp('parent-1', 'stu-100', {
          type: RequestType.ADDRESS_UPDATE,
          proposedData: {
            addressText: '456 Đường Quá Xa Ngoài Bán Kính',
            latitude: 12.5,
            longitude: 108.5,
          },
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockOtpService.createStudentUpdateRequestChallenge).not.toHaveBeenCalled();
    });
  });

  describe('4. Bãi đỗ xe thay đổi trong lúc nhập OTP (Concurrency & Relocation during OTP)', () => {
    it('chặn giao dịch tạo yêu cầu nếu bãi xe dời vị trí khiến địa chỉ bị rơi ra ngoài bán kính', async () => {
      // Giả lập bãi xe ban đầu tại TP.HCM (khi gửi OTP) nhưng trong lúc phụ huynh nhập OTP,
      // bãi xe đã được cập nhật dời xa (hoặc scheduledChange có hiệu lực)
      mockOtpService.withVerifiedChallenge.mockImplementationOnce(async (params: any, cb: any) => {
        // Trong transaction, bãi xe đã bị thay đổi vị trí đến Hà Nội (21.0, 105.8)
        const txPrisma = {
          ...mockPrisma,
          systemSetting: {
            findUnique: vi.fn().mockResolvedValue({
              key: 'PARKING_LOT',
              value: {
                latitude: 21.028511,
                longitude: 105.854444,
                addressText: 'Bãi xe mới dời về Hà Nội',
                maxOperatingRadiusKm: 50,
              },
            }),
          },
        };
        return cb(txPrisma);
      });

      await expect(
        service.verifyOtpAndCreateRequest('parent-1', 'stu-100', {
          challengeId: 'chal-123',
          otp: '123456',
          type: RequestType.ADDRESS_UPDATE,
          proposedData: {
            addressText: '123 Đường Tại TP.HCM',
            latitude: 10.780,
            longitude: 106.705,
          },
        }),
      ).rejects.toThrow(ConflictException);

      // Yêu cầu không được tạo trong DB
      expect(mockPrisma.studentUpdateRequest.create).not.toHaveBeenCalled();
    });
  });
});
