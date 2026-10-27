// Isolate delivery-intent helpers in business-rule suites; actual helpers are tested in notifications.spec.ts.
vi.mock('../notifications/notification-writer.js', () => ({ notifyTrip: vi.fn().mockResolvedValue(undefined), notifyAssignment: vi.fn().mockResolvedValue(undefined), notifyCancelledTrips: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../notifications/notification-events.js', () => ({ notifyLeave: vi.fn().mockResolvedValue(undefined) }));
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  LeaveNoticeKind,
  LeaveNoticeStatus,
  Role,
  RouteDirection,
  TripStatus,
  User,
} from '@prisma/client';
import { LeaveNoticesService } from './leave-notices.service.js';

describe('LeaveNoticesService', () => {
  let service: LeaveNoticesService;
  let prismaMock: any;
  let otpServiceMock: any;

  const mockParent: User = {
    id: 'parent-1',
    email: 'parent@example.com',
    fullName: 'Phụ huynh Nguyễn Văn B',
    phone: '0901111222',
    passwordHash: 'hash',
    role: Role.PARENT,
    schoolId: null,
    avatarUrl: null,
    avatarPublicId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOtherParent: User = {
    id: 'parent-2',
    email: 'otherparent@example.com',
    fullName: 'Phụ huynh Trần Thị C',
    phone: '0903333444',
    passwordHash: 'hash',
    role: Role.PARENT,
    schoolId: null,
    avatarUrl: null,
    avatarPublicId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDriver: User = {
    id: 'driver-1',
    email: 'driver@example.com',
    fullName: 'Tài xế Lê Văn C',
    phone: '0905555666',
    passwordHash: 'hash',
    role: Role.DRIVER,
    schoolId: null,
    avatarUrl: null,
    avatarPublicId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAttendant: User = {
    id: 'attendant-1',
    email: 'attendant@example.com',
    fullName: 'Giáo viên Phạm Thị D',
    phone: '0907777888',
    passwordHash: 'hash',
    role: Role.BUS_ATTENDANT,
    schoolId: 'school-1',
    avatarUrl: null,
    avatarPublicId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSystemAdmin: User = {
    id: 'sysadmin-1',
    email: 'sysadmin@example.com',
    fullName: 'Quản trị viên Hệ thống',
    phone: '0909999000',
    passwordHash: 'hash',
    role: Role.SYSTEM_ADMIN,
    schoolId: null,
    avatarUrl: null,
    avatarPublicId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSchoolAdmin: User = {
    id: 'schadmin-1',
    email: 'schadmin@example.com',
    fullName: 'Quản trị viên Trường 1',
    phone: '0901234567',
    passwordHash: 'hash',
    role: Role.SCHOOL_ADMIN,
    schoolId: 'school-1',
    avatarUrl: null,
    avatarPublicId: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prismaMock = {
      $transaction: vi.fn(async (cb: any) => cb(prismaMock)),
      parentStudentLink: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      student: {
        findUnique: vi.fn(),
      },
      trip: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      tripAttendance: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      leaveNotice: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    };

    otpServiceMock = {
      createLeaveNoticeChallenge: vi.fn(),
      verifyAndConsumeLeaveNoticeChallenge: vi.fn(),
      maskIdentifier: vi.fn((dest, channel) => `${channel}:${dest}`),
    };

    service = new LeaveNoticesService(prismaMock, otpServiceMock);
  });

  describe('getOptions', () => {
    it('should throw ForbiddenException if Parent is not linked to student', async () => {
      prismaMock.parentStudentLink.findUnique.mockResolvedValue(null);

      await expect(
        service.getOptions(mockParent, {
          studentId: 'stu-99',
          serviceDate: '2026-10-26',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block TO_PARKING trip if attendantReadyAt is already set', async () => {
      prismaMock.parentStudentLink.findUnique.mockResolvedValue({
        parentId: mockParent.id,
        studentId: 'stu-1',
        student: { id: 'stu-1', fullName: 'Học sinh An', guardianPhone: '0901234567' },
      });

      prismaMock.trip.findMany.mockResolvedValue([
        {
          id: 'trip-return-1',
          routeId: 'route-1',
          serviceDate: new Date('2026-10-26'),
          scheduledStartTime: '16:30',
          scheduledEndTime: '17:15',
          direction: RouteDirection.TO_PARKING,
          status: TripStatus.SCHEDULED,
          actualStartTime: null,
          attendantReadyAt: new Date(),
          route: { id: 'route-1', name: 'Tuyến Về 01' },
          school: { id: 'school-1', name: 'Tiểu học FPT' },
          assignedVehicle: { licensePlate: '51B-12345' },
          leaveNotices: [],
          attendances: [{ status: AttendanceStatus.UNMARKED, alightedAt: null }],
        },
      ]);

      const res = await service.getOptions(mockParent, {
        studentId: 'stu-1',
        serviceDate: '2026-10-26',
      });

      expect(res.trips).toHaveLength(1);
      expect(res.trips[0].canReport).toBe(false);
      expect(res.trips[0].disabledReason).toBe(
        'Giáo viên phụ xe đã sẵn sàng cho chuyến về',
      );
    });

    it('should block student report if student is already marked PRESENT', async () => {
      prismaMock.parentStudentLink.findUnique.mockResolvedValue({
        parentId: mockParent.id,
        studentId: 'stu-1',
        student: { id: 'stu-1', fullName: 'Học sinh An', guardianPhone: '0901234567' },
      });

      prismaMock.trip.findMany.mockResolvedValue([
        {
          id: 'trip-morning-1',
          routeId: 'route-1',
          serviceDate: new Date('2026-10-26'),
          scheduledStartTime: '06:30',
          scheduledEndTime: '07:15',
          direction: RouteDirection.TO_SCHOOL,
          status: TripStatus.SCHEDULED,
          actualStartTime: null,
          attendantReadyAt: null,
          route: { id: 'route-1', name: 'Tuyến Đi 01' },
          school: { id: 'school-1', name: 'Tiểu học FPT' },
          assignedVehicle: { licensePlate: '51B-12345' },
          leaveNotices: [],
          attendances: [{ status: AttendanceStatus.PRESENT, alightedAt: null }],
        },
      ]);

      const res = await service.getOptions(mockParent, {
        studentId: 'stu-1',
        serviceDate: '2026-10-26',
      });

      expect(res.trips[0].canReport).toBe(false);
      expect(res.trips[0].disabledReason).toBe('Học sinh đã được điểm danh trên xe');
    });

    it('should allow report when trip is SCHEDULED and not yet started', async () => {
      prismaMock.parentStudentLink.findUnique.mockResolvedValue({
        parentId: mockParent.id,
        studentId: 'stu-1',
        student: { id: 'stu-1', fullName: 'Học sinh An', guardianPhone: '0901234567' },
      });

      prismaMock.trip.findMany.mockResolvedValue([
        {
          id: 'trip-morning-2',
          routeId: 'route-1',
          serviceDate: new Date('2026-10-26'),
          scheduledStartTime: '06:30',
          scheduledEndTime: '07:15',
          direction: RouteDirection.TO_SCHOOL,
          status: TripStatus.SCHEDULED,
          actualStartTime: null,
          attendantReadyAt: null,
          route: { id: 'route-1', name: 'Tuyến Đi 01' },
          school: { id: 'school-1', name: 'Tiểu học FPT' },
          assignedVehicle: { licensePlate: '51B-12345' },
          leaveNotices: [],
          attendances: [{ status: AttendanceStatus.UNMARKED, alightedAt: null }],
        },
      ]);

      const res = await service.getOptions(mockParent, {
        studentId: 'stu-1',
        serviceDate: '2026-10-26',
      });

      expect(res.trips[0].canReport).toBe(true);
      expect(res.trips[0].disabledReason).toBeNull();
    });
  });

  describe('requestOtp', () => {
    it('should send OTP to guardianPhone for Student notice', async () => {
      prismaMock.parentStudentLink.findUnique.mockResolvedValue({
        parentId: mockParent.id,
        studentId: 'stu-1',
        student: { id: 'stu-1', fullName: 'Học sinh An', guardianPhone: '0901234567' },
      });

      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.SCHEDULED,
        actualStartTime: null,
        attendantReadyAt: null,
        leaveNotices: [],
        attendances: [{ studentId: 'stu-1', status: AttendanceStatus.UNMARKED, alightedAt: null }],
      });

      otpServiceMock.createLeaveNoticeChallenge.mockResolvedValue({
        challengeId: 'chal-1',
        expiresAt: new Date(Date.now() + 180000),
        maskedDestinations: ['SMS:090••••567 (SMS console)'],
        deliveryChannels: ['SMS'],
      });

      const res = await service.requestOtp(mockParent, {
        tripId: 'trip-1',
        studentId: 'stu-1',
      });

      expect(res.challengeId).toBe('chal-1');
      expect(otpServiceMock.createLeaveNoticeChallenge).toHaveBeenCalledWith(
        mockParent.id,
        'stu-1',
        [{ channel: 'SMS', destination: '0901234567', isConsole: true }],
        expect.any(String),
      );
    });

    it('should fan out OTP to both Email and SMS for Staff when both contacts exist', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.SCHEDULED,
        actualStartTime: null,
        attendantReadyAt: null,
        assignedDriverId: mockDriver.id,
        leaveNotices: [],
      });

      otpServiceMock.createLeaveNoticeChallenge.mockResolvedValue({
        challengeId: 'chal-2',
        expiresAt: new Date(Date.now() + 180000),
        maskedDestinations: ['EMAIL:d••••@example.com', 'SMS:090••••666 (SMS console)'],
        deliveryChannels: ['EMAIL', 'SMS'],
      });

      const res = await service.requestOtp(mockDriver, {
        tripId: 'trip-1',
      });

      expect(res.challengeId).toBe('chal-2');
      expect(otpServiceMock.createLeaveNoticeChallenge).toHaveBeenCalledWith(
        mockDriver.id,
        null,
        [
          { channel: 'EMAIL', destination: 'driver@example.com', isConsole: false },
          { channel: 'SMS', destination: '0905555666', isConsole: true },
        ],
        expect.any(String),
      );
    });
  });

  describe('confirmNotice', () => {
    it('should mark student attendance as ABSENT and record snapshot on Student notice', async () => {
      prismaMock.parentStudentLink.findUnique.mockResolvedValue({
        parentId: mockParent.id,
        studentId: 'stu-1',
      });

      otpServiceMock.verifyAndConsumeLeaveNoticeChallenge.mockResolvedValue({
        id: 'chal-1',
        tripId: 'trip-1',
        studentId: 'stu-1',
      });

      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.SCHEDULED,
        actualStartTime: null,
        attendantReadyAt: null,
        attendances: [
          {
            id: 'att-1',
            studentId: 'stu-1',
            status: AttendanceStatus.UNMARKED,
            absenceReason: null,
            markedById: null,
            markedAt: null,
            alightedAt: null,
          },
        ],
        leaveNotices: [],
      });

      const createdNotice = {
        id: 'notice-1',
        tripId: 'trip-1',
        kind: LeaveNoticeKind.STUDENT,
        status: LeaveNoticeStatus.RECORDED,
        reportedById: mockParent.id,
        studentId: 'stu-1',
        reason: 'Ốm sốt',
        createdAt: new Date(),
        updatedAt: new Date(),
        trip: {
          id: 'trip-1',
          serviceDate: new Date('2026-10-26'),
          direction: RouteDirection.TO_SCHOOL,
          route: { name: 'Tuyến 01' },
          school: { name: 'Tiểu học FPT' },
        },
        student: { id: 'stu-1', fullName: 'Học sinh An' },
        reportedBy: mockParent,
        processedBy: null,
        replacementUser: null,
        cancelledBy: null,
      };

      prismaMock.leaveNotice.create.mockResolvedValue(createdNotice);

      const res = await service.confirmNotice(mockParent, {
        challengeId: 'chal-1',
        otp: '123456',
        tripId: 'trip-1',
        studentId: 'stu-1',
        reason: 'Ốm sốt',
      });

      expect(prismaMock.tripAttendance.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: expect.objectContaining({
          status: AttendanceStatus.ABSENT,
          absenceReason: 'Phụ huynh xin nghỉ',
        }),
      });

      expect(prismaMock.leaveNotice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: LeaveNoticeKind.STUDENT,
            status: LeaveNoticeStatus.RECORDED,
            attendanceBefore: {
              status: AttendanceStatus.UNMARKED,
              absenceReason: null,
              markedById: null,
              markedAt: null,
              alightedAt: null,
            },
          }),
        }),
      );

      expect(res.status).toBe(LeaveNoticeStatus.RECORDED);
    });

    it('should set status to PENDING_REPLACEMENT on Driver notice', async () => {
      otpServiceMock.verifyAndConsumeLeaveNoticeChallenge.mockResolvedValue({
        id: 'chal-2',
        tripId: 'trip-1',
        studentId: null,
      });

      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.SCHEDULED,
        actualStartTime: null,
        attendantReadyAt: null,
        assignedDriverId: mockDriver.id,
        leaveNotices: [],
      });

      const createdNotice = {
        id: 'notice-2',
        tripId: 'trip-1',
        kind: LeaveNoticeKind.DRIVER,
        status: LeaveNoticeStatus.PENDING_REPLACEMENT,
        reportedById: mockDriver.id,
        studentId: null,
        reason: 'Việc bận gia đình',
        createdAt: new Date(),
        updatedAt: new Date(),
        trip: {
          id: 'trip-1',
          serviceDate: new Date('2026-10-26'),
          direction: RouteDirection.TO_SCHOOL,
          route: { name: 'Tuyến 01' },
          school: { name: 'Tiểu học FPT' },
        },
        student: null,
        reportedBy: mockDriver,
        processedBy: null,
        replacementUser: null,
        cancelledBy: null,
      };

      prismaMock.leaveNotice.create.mockResolvedValue(createdNotice);

      const res = await service.confirmNotice(mockDriver, {
        challengeId: 'chal-2',
        otp: '123456',
        tripId: 'trip-1',
        reason: 'Việc bận gia đình',
      });

      expect(res.status).toBe(LeaveNoticeStatus.PENDING_REPLACEMENT);
      expect(prismaMock.tripAttendance.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelNotice (Withdrawal)', () => {
    it('should forbid other parents from cancelling a notice', async () => {
      prismaMock.leaveNotice.findUnique.mockResolvedValue({
        id: 'notice-1',
        tripId: 'trip-1',
        reportedById: mockParent.id,
        kind: LeaveNoticeKind.STUDENT,
        status: LeaveNoticeStatus.RECORDED,
        trip: { actualStartTime: null, status: TripStatus.SCHEDULED },
      });

      await expect(
        service.cancelNotice(mockOtherParent, 'notice-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block cancellation if trip already started', async () => {
      prismaMock.leaveNotice.findUnique.mockResolvedValue({
        id: 'notice-1',
        tripId: 'trip-1',
        reportedById: mockParent.id,
        kind: LeaveNoticeKind.STUDENT,
        status: LeaveNoticeStatus.RECORDED,
        trip: { actualStartTime: new Date(), status: TripStatus.IN_PROGRESS },
      });

      await expect(
        service.cancelNotice(mockParent, 'notice-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should restore attendance snapshot on student notice withdrawal if reason still matches', async () => {
      prismaMock.leaveNotice.findUnique.mockResolvedValue({
        id: 'notice-1',
        tripId: 'trip-1',
        studentId: 'stu-1',
        reportedById: mockParent.id,
        kind: LeaveNoticeKind.STUDENT,
        status: LeaveNoticeStatus.RECORDED,
        attendanceBefore: {
          status: AttendanceStatus.UNMARKED,
          absenceReason: null,
          markedById: null,
          markedAt: null,
          alightedAt: null,
        },
        trip: {
          id: 'trip-1',
          actualStartTime: null,
          status: TripStatus.SCHEDULED,
          direction: RouteDirection.TO_SCHOOL,
          serviceDate: new Date('2026-10-26'),
          route: { name: 'Tuyến 01' },
          school: { name: 'Trường 1' },
        },
        student: { id: 'stu-1', fullName: 'Học sinh An' },
        reportedBy: mockParent,
        processedBy: null,
        replacementUser: null,
        cancelledBy: null,
      });

      prismaMock.tripAttendance.findUnique.mockResolvedValue({
        id: 'att-1',
        status: AttendanceStatus.ABSENT,
        absenceReason: 'Phụ huynh xin nghỉ',
      });

      prismaMock.leaveNotice.update.mockResolvedValue({
        id: 'notice-1',
        status: LeaveNoticeStatus.WITHDRAWN,
        trip: {
          id: 'trip-1',
          actualStartTime: null,
          status: TripStatus.SCHEDULED,
          direction: RouteDirection.TO_SCHOOL,
          serviceDate: new Date('2026-10-26'),
          route: { name: 'Tuyến 01' },
          school: { name: 'Trường 1' },
        },
        student: { id: 'stu-1', fullName: 'Học sinh An' },
        reportedBy: mockParent,
        processedBy: null,
        replacementUser: null,
        cancelledBy: mockParent,
      });

      const res = await service.cancelNotice(mockParent, 'notice-1');

      expect(prismaMock.tripAttendance.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: expect.objectContaining({
          status: AttendanceStatus.UNMARKED,
          absenceReason: null,
        }),
      });
      expect(res.status).toBe(LeaveNoticeStatus.WITHDRAWN);
    });
  });

  describe('assignReplacement', () => {
    it('should forbid SCHOOL_ADMIN from replacing a Driver', async () => {
      prismaMock.leaveNotice.findUnique.mockResolvedValue({
        id: 'notice-d1',
        tripId: 'trip-1',
        kind: LeaveNoticeKind.DRIVER,
        status: LeaveNoticeStatus.PENDING_REPLACEMENT,
        trip: { id: 'trip-1', schoolId: 'school-1', status: TripStatus.SCHEDULED, actualStartTime: null },
      });

      await expect(
        service.assignReplacement(mockSchoolAdmin, 'notice-d1', {
          replacementUserId: 'driver-2',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reset attendantReadyAt when replacing Bus Attendant', async () => {
      prismaMock.leaveNotice.findUnique.mockResolvedValue({
        id: 'notice-a1',
        tripId: 'trip-1',
        kind: LeaveNoticeKind.BUS_ATTENDANT,
        status: LeaveNoticeStatus.PENDING_REPLACEMENT,
        trip: {
          id: 'trip-1',
          schoolId: 'school-1',
          status: TripStatus.SCHEDULED,
          actualStartTime: null,
          direction: RouteDirection.TO_SCHOOL,
          serviceDate: new Date('2026-10-26'),
          route: { name: 'Tuyến 01' },
          school: { name: 'Trường 1' },
        },
        student: null,
        reportedBy: mockAttendant,
        processedBy: null,
        replacementUser: null,
        cancelledBy: null,
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'attendant-2',
        role: Role.BUS_ATTENDANT,
        schoolId: 'school-1',
        isActive: true,
        fullName: 'Cô Mai',
      });

      prismaMock.trip.findFirst.mockResolvedValue(null);
      prismaMock.leaveNotice.findFirst.mockResolvedValue(null);

      prismaMock.leaveNotice.update.mockResolvedValue({
        id: 'notice-a1',
        status: LeaveNoticeStatus.REPLACED,
        replacementUserId: 'attendant-2',
        processedById: mockSchoolAdmin.id,
        trip: {
          id: 'trip-1',
          status: TripStatus.SCHEDULED,
          direction: RouteDirection.TO_SCHOOL,
          serviceDate: new Date('2026-10-26'),
          route: { name: 'Tuyến 01' },
          school: { name: 'Trường 1' },
        },
        student: null,
        reportedBy: mockAttendant,
        processedBy: mockSchoolAdmin,
        replacementUser: { id: 'attendant-2', fullName: 'Cô Mai' },
        cancelledBy: null,
      });

      const res = await service.assignReplacement(mockSchoolAdmin, 'notice-a1', {
        replacementUserId: 'attendant-2',
      });

      expect(prismaMock.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: {
          assignedBusAttendant: {
            connect: { id: 'attendant-2' },
          },
          attendantReadyAt: null,
        },
      });
      expect(res.status).toBe(LeaveNoticeStatus.REPLACED);
    });
  });

  describe('cancelTripFromNotice', () => {
    it('should throw BadRequestException if cancel reason is empty', async () => {
      await expect(
        service.cancelTripFromNotice(mockSchoolAdmin, 'notice-1', {
          cancellationReason: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel trip and mark pending notices as TRIP_CANCELLED', async () => {
      const initialNotice = {
        id: 'notice-a1',
        tripId: 'trip-1',
        kind: LeaveNoticeKind.BUS_ATTENDANT,
        status: LeaveNoticeStatus.PENDING_REPLACEMENT,
        trip: {
          id: 'trip-1',
          schoolId: 'school-1',
          status: TripStatus.SCHEDULED,
          actualStartTime: null,
          direction: RouteDirection.TO_SCHOOL,
          serviceDate: new Date('2026-10-26'),
          route: { name: 'Tuyến 01' },
          school: { name: 'Trường 1' },
        },
        student: null,
        reportedBy: mockAttendant,
        processedBy: null,
        replacementUser: null,
        cancelledBy: null,
      };

      const cancelledNotice = {
        ...initialNotice,
        status: LeaveNoticeStatus.TRIP_CANCELLED,
        processedById: mockSchoolAdmin.id,
        processedBy: mockSchoolAdmin,
        trip: {
          ...initialNotice.trip,
          status: TripStatus.CANCELLED,
        },
      };

      prismaMock.leaveNotice.findUnique
        .mockResolvedValueOnce(initialNotice)
        .mockResolvedValueOnce(cancelledNotice);

      const res = await service.cancelTripFromNotice(mockSchoolAdmin, 'notice-a1', {
        cancellationReason: 'Không tìm được giáo viên thay thế do thời tiết xấu',
      });

      expect(prismaMock.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: expect.objectContaining({
          status: TripStatus.CANCELLED,
          cancellationReason: 'Không tìm được giáo viên thay thế do thời tiết xấu',
          cancelledBy: { connect: { id: mockSchoolAdmin.id } },
        }),
      });

      expect(prismaMock.leaveNotice.updateMany).toHaveBeenCalledWith({
        where: {
          tripId: 'trip-1',
          status: LeaveNoticeStatus.PENDING_REPLACEMENT,
        },
        data: expect.objectContaining({
          status: LeaveNoticeStatus.TRIP_CANCELLED,
          processedById: mockSchoolAdmin.id,
        }),
      });

      expect(res.status).toBe(LeaveNoticeStatus.TRIP_CANCELLED);
    });
  });
});
