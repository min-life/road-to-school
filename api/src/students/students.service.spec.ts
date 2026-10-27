vi.mock('../notifications/notification-writer.js', () => ({ notifyCancelledTrips: vi.fn() }));
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, StudentStatus, Prisma, RoutePlanStatus, TripStatus, LeaveNoticeStatus } from '@prisma/client';
import { StudentsService } from './students.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../schools/cloudinary.service.js';

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: PrismaService;
  let cloudinaryService: CloudinaryService;

  const mockDate = new Date('2026-10-23T08:00:00.000Z');
  const schoolId = 'c1f8a847-75c1-4b36-a3d5-22e3914a8721';
  const otherSchoolId = 'd2f8a847-75c1-4b36-a3d5-22e3914a8722';

  const mockSchoolAdmin = {
    id: 'user-admin-1',
    role: Role.SCHOOL_ADMIN,
    schoolId: schoolId,
  } as any;

  const mockSystemAdmin = {
    id: 'user-sysadmin-1',
    role: Role.SYSTEM_ADMIN,
    schoolId: null,
  } as any;

  const mockStudent = {
    id: 'student-uuid-1',
    code: 'STUA7B3C9D2',
    schoolId: schoolId,
    fullName: 'Nguyễn Văn Bé',
    guardianPhone: '0988776655',
    avatarUrl: null,
    avatarPublicId: null,
    addressText: '123 Đường Cầu Giấy, Hà Nội',
    latitude: 21.033333,
    longitude: 105.783333,
    status: StudentStatus.AVAILABLE,
    createdAt: mockDate,
    updatedAt: mockDate,
    school: {
      id: schoolId,
      name: 'Trường Tiểu học Lê Quý Đôn',
      isActive: true,
    },
  };

  beforeEach(() => {
    prisma = {
      school: {
        findUnique: vi.fn(),
      },
      student: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      routeStop: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn().mockResolvedValue({}),
      },
      tripAttendance: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      trip: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
      },
      leaveNotice: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      studentUpdateRequest: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: vi.fn(async (cb) => cb(prisma)),
    } as unknown as PrismaService;

    cloudinaryService = {
      isConfigured: vi.fn().mockReturnValue(true),
      uploadStudentAvatar: vi.fn(),
    } as unknown as CloudinaryService;

    service = new StudentsService(prisma, cloudinaryService);
  });

  describe('listStudents', () => {
    it('cho phép SCHOOL_ADMIN xem học sinh của trường mình', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        name: 'Trường Lê Quý Đôn',
        isActive: true,
      } as any);
      vi.mocked(prisma.student.findMany).mockResolvedValue([mockStudent] as any);
      vi.mocked(prisma.student.count).mockResolvedValue(1);

      const result = await service.listStudents(schoolId, {}, mockSchoolAdmin);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].code).toBe('STUA7B3C9D2');
      expect(result.items[0].hasAddress).toBe(true);
      expect(result.meta.totalItems).toBe(1);
    });

    it('chặn SCHOOL_ADMIN xem học sinh của trường khác (ForbiddenException)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: otherSchoolId,
        name: 'Trường Khác',
        isActive: true,
      } as any);

      await expect(
        service.listStudents(otherSchoolId, {}, mockSchoolAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('cho phép SYSTEM_ADMIN xem học sinh của bất kỳ trường nào', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: otherSchoolId,
        name: 'Trường Khác',
        isActive: true,
      } as any);
      vi.mocked(prisma.student.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.student.count).mockResolvedValue(0);

      const result = await service.listStudents(otherSchoolId, {}, mockSystemAdmin);

      expect(result.items).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
    });

    it('áp dụng 2 bộ lọc độc lập: status và hasAddress', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        isActive: true,
      } as any);
      vi.mocked(prisma.student.findMany).mockResolvedValue([]);
      vi.mocked(prisma.student.count).mockResolvedValue(0);

      await service.listStudents(
        schoolId,
        {
          status: StudentStatus.AVAILABLE,
          hasAddress: false,
          search: 'Nguyễn',
        },
        mockSchoolAdmin,
      );

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: schoolId,
            status: StudentStatus.AVAILABLE,
            OR: [
              { addressText: null },
              { latitude: null },
              { longitude: null },
            ],
            AND: [
              {
                OR: [
                  { fullName: { contains: 'Nguyễn', mode: 'insensitive' } },
                  { code: { contains: 'Nguyễn', mode: 'insensitive' } },
                ],
              },
            ],
          }),
        }),
      );
    });
  });

  describe('createStudent', () => {
    it('chặn SYSTEM_ADMIN tạo học sinh (chỉ SCHOOL_ADMIN)', async () => {
      await expect(
        service.createStudent(
          schoolId,
          {
            fullName: 'Nguyễn Văn Bé',
            guardianPhone: '0988776655',
          },
          undefined,
          mockSystemAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('chặn SCHOOL_ADMIN tạo học sinh cho trường khác', async () => {
      await expect(
        service.createStudent(
          otherSchoolId,
          {
            fullName: 'Nguyễn Văn Bé',
            guardianPhone: '0988776655',
          },
          undefined,
          mockSchoolAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('từ chối tạo học sinh nếu trường đang ngừng hoạt động (INACTIVE)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        isActive: false,
      } as any);

      await expect(
        service.createStudent(
          schoolId,
          {
            fullName: 'Nguyễn Văn Bé',
            guardianPhone: '0988776655',
          },
          undefined,
          mockSchoolAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối địa chỉ nửa vời (chỉ có addressText mà thiếu tọa độ)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        isActive: true,
      } as any);

      await expect(
        service.createStudent(
          schoolId,
          {
            fullName: 'Nguyễn Văn Bé',
            guardianPhone: '0988776655',
            addressText: '123 Đường Cầu Giấy',
          },
          undefined,
          mockSchoolAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối tọa độ không hợp lệ (latitude > 90)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        isActive: true,
      } as any);

      await expect(
        service.createStudent(
          schoolId,
          {
            fullName: 'Nguyễn Văn Bé',
            guardianPhone: '0988776655',
            addressText: '123 Đường Cầu Giấy',
            latitude: 95,
            longitude: 105,
          },
          undefined,
          mockSchoolAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('tạo học sinh thành công không có địa chỉ (addressText=null, lat=null, lng=null)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        name: 'Trường Lê Quý Đôn',
        isActive: true,
      } as any);
      vi.mocked(prisma.student.create).mockResolvedValue({
        ...mockStudent,
        addressText: null,
        latitude: null,
        longitude: null,
      } as any);

      const result = await service.createStudent(
        schoolId,
        {
          fullName: 'Nguyễn Văn Bé',
          guardianPhone: '0988776655',
        },
        undefined,
        mockSchoolAdmin,
      );

      expect(prisma.student.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: schoolId,
            fullName: 'Nguyễn Văn Bé',
            guardianPhone: '0988776655',
            addressText: null,
            latitude: null,
            longitude: null,
            status: StudentStatus.AVAILABLE,
          }),
        }),
      );
      expect(result.hasAddress).toBe(false);
      expect(result.status).toBe(StudentStatus.AVAILABLE);
    });

    it('tạo học sinh thành công có đầy đủ địa chỉ và ảnh đại diện', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        name: 'Trường Lê Quý Đôn',
        isActive: true,
      } as any);
      vi.mocked(cloudinaryService.uploadStudentAvatar).mockResolvedValue({
        secureUrl: 'https://res.cloudinary.com/avatar.webp',
        publicId: 'roadtoschool/students/avatar_1',
      });
      vi.mocked(prisma.student.create).mockResolvedValue({
        ...mockStudent,
        avatarUrl: 'https://res.cloudinary.com/avatar.webp',
        avatarPublicId: 'roadtoschool/students/avatar_1',
      } as any);

      const mockFile = {
        buffer: Buffer.from([
          0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
          0x50,
        ]),
        mimetype: 'image/webp',
        size: 12,
      } as any;

      const result = await service.createStudent(
        schoolId,
        {
          fullName: 'Nguyễn Văn Bé',
          guardianPhone: '0988776655',
          addressText: '123 Đường Cầu Giấy',
          latitude: 21.033333,
          longitude: 105.783333,
        },
        mockFile,
        mockSchoolAdmin,
      );

      expect(cloudinaryService.uploadStudentAvatar).toHaveBeenCalledWith(
        mockFile.buffer,
        undefined,
      );
      expect(result.hasAddress).toBe(true);
      expect(result.avatarUrl).toBe('https://res.cloudinary.com/avatar.webp');
    });

    it('thử lại sinh mã nếu gặp trùng lặp mã học sinh (P2002 collision retry)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        name: 'Trường Lê Quý Đôn',
        isActive: true,
      } as any);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on code',
        {
          code: 'P2002',
          clientVersion: '6.0.0',
          meta: { target: ['code'] },
        },
      );

      vi.mocked(prisma.student.create)
        .mockRejectedValueOnce(prismaError)
        .mockResolvedValueOnce(mockStudent as any);

      const result = await service.createStudent(
        schoolId,
        {
          fullName: 'Nguyễn Văn Bé',
          guardianPhone: '0988776655',
        },
        undefined,
        mockSchoolAdmin,
      );

      expect(prisma.student.create).toHaveBeenCalledTimes(2);
      expect(result.code).toBe('STUA7B3C9D2');
    });
  });

  describe('getStudent', () => {
    it('trả về chi tiết học sinh với schoolName và qrData', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        isActive: true,
      } as any);
      vi.mocked(prisma.student.findFirst).mockResolvedValue(mockStudent as any);

      const result = await service.getStudent(
        schoolId,
        'student-uuid-1',
        mockSchoolAdmin,
      );

      expect(result.id).toBe('student-uuid-1');
      expect(result.code).toBe('STUA7B3C9D2');
      expect(result.schoolName).toBe('Trường Tiểu học Lê Quý Đôn');
      expect(result.hasAddress).toBe(true);
    });

    it('ném lỗi NotFoundException nếu học sinh không thuộc trường chỉ định', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        isActive: true,
      } as any);
      vi.mocked(prisma.student.findFirst).mockResolvedValue(null);

      await expect(
        service.getStudent(schoolId, 'non-existent', mockSchoolAdmin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('cho phép SCHOOL_ADMIN cập nhật trạng thái từ AVAILABLE sang DISABLED', async () => {
      vi.mocked(prisma.student.findFirst).mockResolvedValue(mockStudent as any);
      vi.mocked(prisma.student.update).mockResolvedValue({
        ...mockStudent,
        status: StudentStatus.DISABLED,
      } as any);

      const result = await service.updateStatus(
        schoolId,
        'student-uuid-1',
        { status: StudentStatus.DISABLED },
        mockSchoolAdmin,
      );

      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'student-uuid-1' },
          data: { status: StudentStatus.DISABLED },
        }),
      );
      expect(result.status).toBe(StudentStatus.DISABLED);
    });

    it('chặn SYSTEM_ADMIN cập nhật trạng thái học sinh', async () => {
      await expect(
        service.updateStatus(
          schoolId,
          'student-uuid-1',
          { status: StudentStatus.DISABLED },
          mockSystemAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('loại học sinh khỏi tuyến, đồng bộ chuyến SCHEDULED và cảnh báo phương án rỗng khi là học sinh cuối cùng', async () => {
      vi.mocked(prisma.student.findFirst).mockResolvedValue(mockStudent as any);
      vi.mocked(prisma.student.update).mockResolvedValue({
        ...mockStudent,
        status: StudentStatus.DISABLED,
      } as any);

      const mockRoute = {
        id: 'route-1',
        name: 'Tuyến Sáng Lê Quý Đôn 1',
        routePlan: {
          id: 'plan-1',
          name: 'Phương án Học kỳ 1',
          status: RoutePlanStatus.ACTIVE,
        },
        stops: [
          { id: 'stop-student-1', studentId: 'student-uuid-1', stopOrder: 1 },
        ],
      };

      vi.mocked(prisma.routeStop.findMany).mockResolvedValueOnce([
        {
          id: 'stop-student-1',
          studentId: 'student-uuid-1',
          routeId: 'route-1',
          route: mockRoute,
        },
      ] as any);

      // Remaining stops after delete is empty
      vi.mocked(prisma.routeStop.findMany).mockResolvedValueOnce([]);

      const mockTrip = {
        id: 'trip-1',
        routeId: 'route-1',
        status: TripStatus.SCHEDULED,
        actualStartTime: null,
        attendantReadyAt: null,
        attendances: [
          { studentId: 'student-uuid-1', excludedAt: null },
        ],
        routeSnapshot: {
          stops: [
            { id: 'stop-student-1', studentId: 'student-uuid-1', stopOrder: 1 },
          ],
        },
      };

      vi.mocked(prisma.trip.findMany).mockResolvedValue([mockTrip] as any);

      const result = await service.updateStatus(
        schoolId,
        'student-uuid-1',
        { status: StudentStatus.DISABLED },
        mockSchoolAdmin,
      );

      // 1. Phải xóa routeStop của học sinh
      expect(prisma.routeStop.deleteMany).toHaveBeenCalledWith({
        where: {
          studentId: 'student-uuid-1',
          routeId: { in: ['route-1'] },
        },
      });

      // 2. Phải đánh dấu excludedAt trên tripAttendance
      expect(prisma.tripAttendance.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tripId: 'trip-1',
            studentId: 'student-uuid-1',
            excludedAt: null,
          },
          data: expect.objectContaining({
            exclusionReason: 'STUDENT_DISABLED',
          }),
        }),
      );

      // 3. Phải đồng bộ routeSnapshot loại bỏ học sinh
      expect(prisma.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'trip-1' },
          data: expect.objectContaining({
            routeSnapshot: expect.objectContaining({
              stops: [],
            }),
          }),
        }),
      );

      // 4. Do chuyến xe không còn học sinh hoạt động nào -> Hủy chuyến
      expect(prisma.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'trip-1' },
          data: expect.objectContaining({
            status: TripStatus.CANCELLED,
          }),
        }),
      );

      // 5. Kết quả phải trả về emptyRoutePlans và message cảnh báo
      expect(result.emptyRoutePlans).toBeDefined();
      expect(result.emptyRoutePlans?.length).toBe(1);
      expect(result.emptyRoutePlans?.[0].planId).toBe('plan-1');
      expect(result.emptyRoutePlans?.[0].routeName).toBe('Tuyến Sáng Lê Quý Đôn 1');
      expect(result.message).toContain('học sinh cuối cùng');
    });
  });

  describe('getDisableImpact', () => {
    it('phát hiện đúng tuyến sẽ rỗng và trả về emptyRoutePlans khi học sinh là người duy nhất trên tuyến', async () => {
      vi.mocked(prisma.student.findFirst).mockResolvedValue(mockStudent as any);

      const mockRoute = {
        id: 'route-single',
        name: 'Tuyến Độc Nhất',
        routePlan: {
          id: 'plan-active-1',
          name: 'Phương án Chính Thức',
          status: RoutePlanStatus.ACTIVE,
        },
        stops: [
          { studentId: 'student-uuid-1' },
        ],
      };

      vi.mocked(prisma.routeStop.findMany).mockResolvedValue([
        {
          id: 'stop-single',
          studentId: 'student-uuid-1',
          routeId: 'route-single',
          route: mockRoute,
        },
      ] as any);

      vi.mocked(prisma.trip.count).mockResolvedValue(2);

      const impact = await service.getDisableImpact(schoolId, 'student-uuid-1', mockSchoolAdmin);

      expect(impact.studentId).toBe('student-uuid-1');
      expect(impact.code).toBe(mockStudent.code);
      expect(impact.emptyRoutesCount).toBe(1);
      expect(impact.emptyRoutePlans.length).toBe(1);
      expect(impact.emptyRoutePlans[0].planId).toBe('plan-active-1');
      expect(impact.emptyRoutePlans[0].routeName).toBe('Tuyến Độc Nhất');
      expect(impact.activeRoutePlansCount).toBe(1);
      expect(impact.scheduledTripsCount).toBe(2);
      expect(impact.requiresPlanCancellation).toBe(true);
    });
  });
});
