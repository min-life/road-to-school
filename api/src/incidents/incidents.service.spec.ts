// Isolate delivery-intent helpers in business-rule suites; actual helpers are tested in notifications.spec.ts.
vi.mock('../notifications/notification-writer.js', () => ({ notifyTrip: vi.fn().mockResolvedValue(undefined), notifyAssignment: vi.fn().mockResolvedValue(undefined), notifyCancelledTrips: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../notifications/notification-events.js', () => ({ notifyIncident: vi.fn().mockResolvedValue(undefined), notifyLeave: vi.fn().mockResolvedValue(undefined) }));
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncidentsService } from './incidents.service.js';
import { IncidentsDetectorService } from './incidents-detector.service.js';
import {
  Role,
  TripIncidentType,
  TripIncidentStatus,
  TripStatus,
  RouteDirection,
  RouteStopType,
  AttendanceStatus,
  LeaveNoticeKind,
  LeaveNoticeStatus,
  User,
} from '@prisma/client';
import { ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('IncidentsService & IncidentsDetectorService', () => {
  let incidentsService: IncidentsService;
  let detectorService: IncidentsDetectorService;
  let mockPrisma: any;
  let mockConfig: any;

  const mockDriver: User = {
    id: 'driver-1',
    email: 'driver@test.com',
    phone: '0901111111',
    fullName: 'Nguyễn Văn Tài Xế',
    passwordHash: 'hash',
    role: Role.DRIVER,
    avatarUrl: null,
    avatarPublicId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schoolId: null,
  };

  const mockAttendant: User = {
    id: 'attendant-1',
    email: 'attendant@test.com',
    phone: '0902222222',
    fullName: 'Trần Thị Bảo Mẫu',
    passwordHash: 'hash',
    role: Role.BUS_ATTENDANT,
    avatarUrl: null,
    avatarPublicId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schoolId: 'school-1',
  };

  const mockParent: User = {
    id: 'parent-1',
    email: 'parent@test.com',
    phone: '0903333333',
    fullName: 'Lê Văn Phụ Huynh',
    passwordHash: 'hash',
    role: Role.PARENT,
    avatarUrl: null,
    avatarPublicId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schoolId: null,
  };

  const mockSchoolAdmin: User = {
    id: 'admin-school-1',
    email: 'schooladmin@test.com',
    phone: '0904444444',
    fullName: 'Hoàng Văn Quản Lý',
    passwordHash: 'hash',
    role: Role.SCHOOL_ADMIN,
    avatarUrl: null,
    avatarPublicId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schoolId: 'school-1',
  };

  const mockSystemAdmin: User = {
    id: 'admin-system-1',
    email: 'systemadmin@test.com',
    phone: '0905555555',
    fullName: 'Tổng Quản Trị',
    passwordHash: 'hash',
    role: Role.SYSTEM_ADMIN,
    avatarUrl: null,
    avatarPublicId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schoolId: null,
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      $queryRaw: vi.fn(async () => []),
      trip: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      tripIncident: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 'unit-incident' }),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      leaveNotice: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      parentStudentLink: {
        findMany: vi.fn(),
      },
    };

    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === 'TRIP_OPERATION_MODE') return 'TEST';
        return null;
      }),
    };

    incidentsService = new IncidentsService(mockPrisma as any, mockConfig as any);
    detectorService = new IncidentsDetectorService(mockPrisma as any);
  });

  describe('1. getIncidentOptions & createManualIncident', () => {
    it('cho phép Driver báo ATTENDANT_MISSING khi trip SCHEDULED và chưa Ready', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        status: TripStatus.SCHEDULED,
        assignedDriverId: 'driver-1',
        assignedBusAttendantId: 'attendant-1',
        attendantReadyAt: null,
        actualStartTime: null,
        schoolId: 'school-1',
        assignedDriver: mockDriver,
        assignedBusAttendant: mockAttendant,
        attendances: [],
      });
      mockPrisma.tripIncident.findFirst.mockResolvedValue(null);

      const options = await incidentsService.getIncidentOptions('trip-1', mockDriver);
      expect(options.canReport).toBe(true);
      expect(options.availableTypes).toEqual([TripIncidentType.ATTENDANT_MISSING]);
      expect(options.expectedAssignee?.id).toBe('attendant-1');
    });

    it('chặn Driver báo khi Giáo viên đã xác nhận Ready', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        status: TripStatus.SCHEDULED,
        assignedDriverId: 'driver-1',
        assignedBusAttendantId: 'attendant-1',
        attendantReadyAt: new Date(),
        actualStartTime: null,
        schoolId: 'school-1',
        assignedDriver: mockDriver,
        assignedBusAttendant: mockAttendant,
        attendances: [],
      });

      const options = await incidentsService.getIncidentOptions('trip-1', mockDriver);
      expect(options.canReport).toBe(false);
      expect(options.disabledReason).toBe('ATTENDANT_ALREADY_READY');
    });

    it('chặn Driver tạo DRIVER_MISSING (sai type)', async () => {
      await expect(
        incidentsService.createManualIncident(
          'trip-1',
          { type: TripIncidentType.DRIVER_MISSING },
          mockDriver,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('bảo vệ expectedAssigneeId khi người được phân công đã bị thay đổi trước khi gửi', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        status: TripStatus.SCHEDULED,
        assignedDriverId: 'driver-1',
        assignedBusAttendantId: 'attendant-new-2', // Admin vừa đổi người
        attendantReadyAt: null,
        actualStartTime: null,
        schoolId: 'school-1',
      });

      await expect(
        incidentsService.createManualIncident(
          'trip-1',
          {
            type: TripIncidentType.ATTENDANT_MISSING,
            expectedAssigneeId: 'attendant-1', // Client gửi id cũ
          },
          mockDriver,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('2. listMine & listByTrip (Privacy Masking)', () => {
    it('listMine chỉ trả về sự cố do chính người dùng báo hoặc auto incident đã CONFIRMED', async () => {
      mockPrisma.tripIncident.count.mockResolvedValue(1);
      mockPrisma.tripIncident.findMany.mockResolvedValue([
        {
          id: 'inc-1',
          tripId: 'trip-1',
          type: TripIncidentType.ATTENDANT_MISSING,
          status: TripIncidentStatus.WAITING_ASSIGNMENT,
          reportedById: 'driver-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          trip: { routeId: 'r-1', schoolId: 's-1' },
          reportedBy: mockDriver,
          processedBy: null,
        },
      ]);

      const res = await incidentsService.listMine({}, mockDriver);
      expect(res.total).toBe(1);
      expect(mockPrisma.tripIncident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { reportedById: 'driver-1' },
              {
                type: { in: [TripIncidentType.OFF_ROUTE, TripIncidentType.LATE_STOP] },
                status: TripIncidentStatus.CONFIRMED,
                processedById: 'driver-1',
              },
            ],
          }),
        }),
      );
    });

    it('listByTrip ẩn toàn bộ thông tin nhạy cảm đối với Phụ huynh (Privacy Masking)', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        schoolId: 'school-1',
        assignedDriverId: 'driver-1',
        assignedBusAttendantId: 'attendant-1',
        attendances: [{ studentId: 'student-1' }],
      });
      mockPrisma.parentStudentLink.findMany.mockResolvedValue([{ studentId: 'student-1' }]);

      mockPrisma.tripIncident.findMany.mockResolvedValue([
        {
          id: 'inc-offroute-1',
          tripId: 'trip-1',
          type: TripIncidentType.OFF_ROUTE,
          status: TripIncidentStatus.CONFIRMED,
          description: 'Lái xe tránh ngập lụt',
          context: { distanceMeters: 145 },
          resolution: { action: 'ACKNOWLEDGED', reason: 'Đường ngập' },
          reportedById: null,
          processedById: 'attendant-1',
          processedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          trip: { route: { name: 'Tuyến Đi 01' }, school: { name: 'Trường FPT' } },
        },
      ]);

      const res = await incidentsService.listByTrip('trip-1', mockParent);
      expect(res.items.length).toBe(1);
      const masked = res.items[0];
      // Phụ huynh chỉ thấy loại, thời điểm, trạng thái
      expect(masked.type).toBe(TripIncidentType.OFF_ROUTE);
      expect(masked.status).toBe(TripIncidentStatus.CONFIRMED);
      expect(masked.description).toBeNull();
      expect(masked.context).toBeNull();
      expect(masked.resolution).toBeNull();
      expect(masked.reportedByName).toBeNull();
      expect(masked.processedByName).toBeNull();
    });
  });

  describe('3. resolveIncident & cancelTripFromIncident', () => {
    it('ARRIVED bị chặn nếu nhân sự đó đang có LeaveNotice chưa xử lý', async () => {
      mockPrisma.tripIncident.findUnique.mockResolvedValue({
        id: 'inc-1',
        tripId: 'trip-1',
        type: TripIncidentType.ATTENDANT_MISSING,
        status: TripIncidentStatus.WAITING_ASSIGNMENT,
        trip: {
          id: 'trip-1',
          schoolId: 'school-1',
          assignedBusAttendantId: 'attendant-1',
        },
      });

      mockPrisma.leaveNotice.findFirst.mockResolvedValue({
        id: 'leave-1',
        status: LeaveNoticeStatus.PENDING_REPLACEMENT,
      });

      await expect(
        incidentsService.resolveIncident(
          'inc-1',
          { action: 'ARRIVED' as any },
          mockSchoolAdmin,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('REPLACED cập nhật nhân sự mới cho chuyến xe và đồng bộ trạng thái LeaveNotice', async () => {
      mockPrisma.tripIncident.findUnique.mockResolvedValue({
        id: 'inc-1',
        tripId: 'trip-1',
        type: TripIncidentType.ATTENDANT_MISSING,
        status: TripIncidentStatus.WAITING_ASSIGNMENT,
        trip: {
          id: 'trip-1',
          schoolId: 'school-1',
          assignedBusAttendantId: 'attendant-1',
          route: { name: 'Tuyến 1' },
          school: { name: 'Trường 1' },
        },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'attendant-new-2',
        role: Role.BUS_ATTENDANT,
        schoolId: 'school-1',
        isActive: true,
        isVerified: true,
      });

      mockPrisma.tripIncident.update.mockResolvedValue({
        id: 'inc-1',
        tripId: 'trip-1',
        type: TripIncidentType.ATTENDANT_MISSING,
        status: TripIncidentStatus.RESOLVED,
        createdAt: new Date(),
        updatedAt: new Date(),
        trip: { route: { name: 'Tuyến 1' }, school: { name: 'Trường 1' } },
      });

      await incidentsService.resolveIncident(
        'inc-1',
        { action: 'REPLACED' as any, replacementUserId: 'attendant-new-2' },
        mockSchoolAdmin,
      );

      // Reset Ready cho Giáo viên phụ xe mới
      expect(mockPrisma.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'trip-1' },
          data: { assignedBusAttendantId: 'attendant-new-2', attendantReadyAt: null },
        }),
      );

      // Đồng bộ LeaveNotice cũ
      expect(mockPrisma.leaveNotice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tripId: 'trip-1',
            kind: LeaveNoticeKind.BUS_ATTENDANT,
            status: LeaveNoticeStatus.PENDING_REPLACEMENT,
          },
          data: expect.objectContaining({
            status: LeaveNoticeStatus.REPLACED,
            replacementUserId: 'attendant-new-2',
          }),
        }),
      );
    });

    it('cancelTripFromIncident hủy chuyến xe và đóng toàn bộ sự cố mở còn lại', async () => {
      mockPrisma.tripIncident.findUnique.mockResolvedValue({
        id: 'inc-1',
        tripId: 'trip-1',
        type: TripIncidentType.DRIVER_MISSING,
        status: TripIncidentStatus.WAITING_ASSIGNMENT,
        trip: {
          id: 'trip-1',
          status: TripStatus.SCHEDULED,
        },
      });

      mockPrisma.tripIncident.update.mockResolvedValue({
        id: 'inc-1',
        tripId: 'trip-1',
        type: TripIncidentType.DRIVER_MISSING,
        status: TripIncidentStatus.RESOLVED,
        createdAt: new Date(),
        updatedAt: new Date(),
        trip: { route: { name: 'Tuyến 1' }, school: { name: 'Trường 1' } },
      });

      await incidentsService.cancelTripFromIncident(
        'inc-1',
        { reason: 'Không tìm thấy tài xế' },
        mockSystemAdmin,
      );

      expect(mockPrisma.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'trip-1' },
          data: expect.objectContaining({
            status: TripStatus.CANCELLED,
            cancellationReason: 'Không tìm thấy tài xế',
          }),
        }),
      );

      expect(mockPrisma.tripIncident.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tripId: 'trip-1',
            id: { not: 'inc-1' },
          }),
          data: expect.objectContaining({
            status: TripIncidentStatus.CLOSED,
          }),
        }),
      );
    });
  });

  describe('4. confirmAutoIncident', () => {
    it('chỉ Giáo viên phụ xe được phân công mới có quyền xác nhận sự cố tự động', async () => {
      mockPrisma.tripIncident.findUnique.mockResolvedValue({
        id: 'inc-offroute-1',
        tripId: 'trip-1',
        type: TripIncidentType.OFF_ROUTE,
        status: TripIncidentStatus.WAITING_CONFIRMATION,
        trip: {
          id: 'trip-1',
          assignedBusAttendantId: 'attendant-different',
        },
      });

      await expect(
        incidentsService.confirmAutoIncident(
          'inc-offroute-1',
          { reason: 'Xe tránh đường tắc' },
          mockAttendant,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('5. IncidentsDetectorService pure math & streaks', () => {
    it('tính khoảng cách vuông góc từ điểm GPS tới đoạn thẳng chuẩn xác', () => {
      // Tuyến đi dọc theo kinh tuyến ở TP.HCM (lat ~10.76)
      const pLat = 10.763;
      const pLng = 106.662; // Cách khoảng 220 mét về phía đông của 106.660
      const aLat = 10.760;
      const aLng = 106.660;
      const bLat = 10.770;
      const bLng = 106.660;

      const dist = detectorService.pointToSegmentDistance(pLng, pLat, aLng, aLat, bLng, bLat);
      expect(dist).toBeGreaterThan(200);
      expect(dist).toBeLessThan(230);
    });

    it('không tạo OFF_ROUTE nếu độ dài chuỗi lệch chưa đủ 30 giây', async () => {
      const trip = { id: 'trip-1' };
      const polyline: [number, number][] = [
        [10.760, 106.660],
        [10.770, 106.660],
      ];
      // 4 samples cách nhau 5s (tổng 15s < 30s)
      const now = Date.now();
      const points = [0, 5000, 10000, 15000].map((t, idx) => ({
        sequence: idx + 1,
        latitude: 10.765,
        longitude: 106.663, // lệch ~300m
        recordedAt: new Date(now + t),
      }));

      await detectorService.evaluateOffRoute(trip, {} as any, polyline, points);
      expect(mockPrisma.tripIncident.create).not.toHaveBeenCalled();
    });

    it('tạo OFF_ROUTE khi lệch > 100m liên tục >= 30 giây với ít nhất 7 mẫu hợp lệ', async () => {
      const trip = { id: 'trip-1' };
      const polyline: [number, number][] = [
        [10.760, 106.660],
        [10.770, 106.660],
      ];
      // 7 samples cách nhau 5s (tổng 30s)
      const now = Date.now();
      const points = [0, 5000, 10000, 15000, 20000, 25000, 30000].map((t, idx) => ({
        sequence: idx + 1,
        latitude: 10.765,
        longitude: 106.663, // lệch ~300m > 100m
        recordedAt: new Date(now + t),
      }));

      await detectorService.evaluateOffRoute(trip, {} as any, polyline, points);
      expect(mockPrisma.tripIncident.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tripId: 'trip-1',
            type: TripIncidentType.OFF_ROUTE,
            status: TripIncidentStatus.WAITING_CONFIRMATION,
            dedupeKey: 'trip-1:OFF_ROUTE',
          }),
        }),
      );
    });

    it('reset streak khi có khoảng trống thời gian giữa 2 mẫu GPS > 15 giây', async () => {
      const trip = { id: 'trip-1' };
      const polyline: [number, number][] = [
        [10.760, 106.660],
        [10.770, 106.660],
      ];
      const now = Date.now();
      // Có gap 20s giữa mẫu 3 và 4
      const offsets = [0, 5000, 10000, 30000, 35000, 40000, 45000];
      const points = offsets.map((t, idx) => ({
        sequence: idx + 1,
        latitude: 10.765,
        longitude: 106.663,
        recordedAt: new Date(now + t),
      }));

      await detectorService.evaluateOffRoute(trip, {} as any, polyline, points);
      // Do streak bị đứt ở mẫu 3->4, đoạn sau chỉ có 4 mẫu (15s < 30s) -> không tạo sự cố
      expect(mockPrisma.tripIncident.create).not.toHaveBeenCalled();
    });
  });
});
