// Isolate delivery-intent helpers in business-rule suites; actual helpers are tested in notifications.spec.ts.
vi.mock('../notifications/notification-writer.js', () => ({ notifyTrip: vi.fn().mockResolvedValue(undefined), notifyAssignment: vi.fn().mockResolvedValue(undefined), notifyCancelledTrips: vi.fn().mockResolvedValue(undefined) }));
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TripsService } from './trips.service.js';
import { AttendanceStatus, Role, RouteDirection, RoutePlanStatus, TripStatus } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { formatDateToVnYmd } from './utils/trip-time.util.js';

describe('TripsService Business Rules', () => {
  let service: TripsService;
  let prismaMock: any;
  let configMock: any;

  const mockAdminUser = {
    id: 'admin-uuid',
    role: Role.SYSTEM_ADMIN,
    schoolId: null,
  };

  const mockSchoolAdminUser = {
    id: 'school-admin-uuid',
    role: Role.SCHOOL_ADMIN,
    schoolId: 'school-1',
  };

  const mockOtherSchoolAdminUser = {
    id: 'school-admin-other',
    role: Role.SCHOOL_ADMIN,
    schoolId: 'school-2',
  };

  const mockDriverUser = {
    id: 'driver-1',
    role: Role.DRIVER,
    schoolId: null,
  };

  const mockParentUser = {
    id: 'parent-1',
    role: Role.PARENT,
    schoolId: null,
  };

  const mockAttendantUser = {
    id: 'attendant-1',
    role: Role.BUS_ATTENDANT,
    schoolId: null,
  };

  beforeEach(() => {
    prismaMock = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      trip: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      routePlan: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      route: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      school: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      vehicle: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      parentStudentLink: {
        findMany: vi.fn(),
      },
      tripAttendance: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      systemSetting: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(prismaMock);
        }
        return cb;
      }),
    };

    configMock = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'TRIP_GENERATION_LOOKAHEAD_DAYS') return 7;
        return null;
      }),
    };

    service = new TripsService(prismaMock, configMock as any);
  });

  describe('Earliest Eligible Service Date (Rule 7.2)', () => {
    it('should NOT generate trips on or before activation date', async () => {
      // RoutePlan activated on 2026-10-26 in VN
      const activationDate = new Date('2026-10-26T03:00:00Z'); // 10:00 in VN
      const plan = {
        id: 'plan-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.ACTIVE,
        activatedAt: activationDate,
        school: {
          id: 'school-1',
          name: 'THPT Marie Curie',
          contractStartDate: new Date('2026-01-01'),
          contractEndDate: new Date('2027-01-01'),
          weeklySchedule: {
            monday: { start: '07:00', end: '17:30' },
          },
        },
        routes: [
          {
            id: 'route-1',
            direction: RouteDirection.TO_SCHOOL,
            estimatedDuration: 1800,
            proposedVehicleId: 'v1',
            defaultDriverId: 'd1',
            defaultBusAttendantId: 'ba1',
            stops: [],
          },
        ],
      };

      prismaMock.routePlan.findMany.mockResolvedValue([plan]);
      prismaMock.trip.findMany.mockResolvedValue([]);
      prismaMock.school.findUnique.mockResolvedValue({
        id: 'school-1',
        contractStartDate: new Date('2026-01-01'),
        contractEndDate: new Date('2027-01-01'),
      });

      // Attempt to generate for 2026-10-26 (same day as activation!)
      const result = await service.generateTrips(
        { schoolId: 'school-1', fromDate: '2026-10-26', toDate: '2026-10-26' },
        mockAdminUser as any,
      );

      // Should not be created because serviceDate <= activationLocalDate
      expect(result.createdCount).toBe(0);
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it('should generate trips for subsequent eligible school day after activation', async () => {
      // Activated on 2026-10-25
      const activationDate = new Date('2026-10-25T03:00:00Z');
      const plan = {
        id: 'plan-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.ACTIVE,
        activatedAt: activationDate,
        school: {
          id: 'school-1',
          name: 'THPT Marie Curie',
          contractStartDate: new Date('2026-01-01'),
          contractEndDate: new Date('2027-01-01'),
          weeklySchedule: {
            monday: { start: '07:00', end: '17:30' },
          },
        },
        routes: [
          {
            id: 'route-1',
            direction: RouteDirection.TO_SCHOOL,
            estimatedDuration: 1800, // 30 min
            proposedVehicleId: 'v1',
            defaultDriverId: 'd1',
            defaultBusAttendantId: 'ba1',
            stops: [{ studentId: 'student-1' }],
          },
        ],
      };

      prismaMock.routePlan.findMany.mockResolvedValue([plan]);
      prismaMock.trip.findMany.mockResolvedValue([]); // No existing trips
      prismaMock.school.findUnique.mockResolvedValue({
        id: 'school-1',
        contractStartDate: new Date('2026-01-01'),
        contractEndDate: new Date('2027-01-01'),
      });
      prismaMock.trip.create.mockResolvedValue({
        id: 'new-trip-1',
        serviceDate: '2026-10-26',
      });

      // Generate for 2026-10-26 (Monday, next day after 2026-10-25)
      const result = await service.generateTrips(
        { schoolId: 'school-1', fromDate: '2026-10-26', toDate: '2026-10-26' },
        mockAdminUser as any,
      );

      expect(result.createdCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(prismaMock.trip.create).toHaveBeenCalled();
    });
  });

  describe('Trip-by-Trip Idempotency (Rule 7.5 & 7.6)', () => {
    it('should SKIP existing trips and NOT overwrite them', async () => {
      const activationDate = new Date('2026-10-25T03:00:00Z');
      const plan = {
        id: 'plan-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.ACTIVE,
        activatedAt: activationDate,
        school: {
          id: 'school-1',
          name: 'THPT Marie Curie',
          contractStartDate: new Date('2026-01-01'),
          contractEndDate: new Date('2027-01-01'),
          weeklySchedule: {
            monday: { start: '07:00', end: '17:30' },
          },
        },
        routes: [
          {
            id: 'route-1',
            direction: RouteDirection.TO_SCHOOL,
            estimatedDuration: 1800,
            proposedVehicleId: 'v1',
            defaultDriverId: 'd1',
            defaultBusAttendantId: 'ba1',
            stops: [],
          },
        ],
      };

      prismaMock.routePlan.findMany.mockResolvedValue([plan]);
      prismaMock.school.findUnique.mockResolvedValue({
        id: 'school-1',
        contractStartDate: new Date('2026-01-01'),
        contractEndDate: new Date('2027-01-01'),
      });
      // Trip already exists in DB when checked by findUnique
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'existing-trip-1',
        routeId: 'route-1',
        serviceDate: '2026-10-26',
        assignedVehicleId: 'v-custom', // manually modified
      });

      const result = await service.generateTrips(
        { schoolId: 'school-1', fromDate: '2026-10-26', toDate: '2026-10-26' },
        mockAdminUser as any,
      );

      expect(result.createdCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });
  });

  describe('Single Trip Assignment Editing Scope & RBAC (Rule 8.1 & 8.3)', () => {
    it('should REJECT SYSTEM_ADMIN trying to edit busAttendantId', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        schoolId: 'school-1',
        serviceDate: '2026-10-26',
        status: TripStatus.SCHEDULED,
      });

      await expect(
        service.updateTripAssignment(
          'trip-1',
          { busAttendantId: 'ba2' },
          mockAdminUser as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should REJECT SCHOOL_ADMIN trying to edit vehicleId or driverId', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        schoolId: 'school-1',
        serviceDate: '2026-10-26',
        status: TripStatus.SCHEDULED,
      });

      await expect(
        service.updateTripAssignment(
          'trip-1',
          { vehicleId: 'v2' },
          mockSchoolAdminUser as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should REJECT SCHOOL_ADMIN editing a Trip belonging to another school', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        schoolId: 'school-1',
        serviceDate: '2026-10-26',
        status: TripStatus.SCHEDULED,
      });

      await expect(
        service.updateTripAssignment(
          'trip-1',
          { busAttendantId: 'ba2' },
          mockOtherSchoolAdminUser as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should REJECT editing assignment if Trip is COMPLETED or CANCELLED', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        schoolId: 'school-1',
        serviceDate: '2026-10-26',
        status: TripStatus.COMPLETED,
      });

      await expect(
        service.updateTripAssignment(
          'trip-1',
          { busAttendantId: 'ba2' },
          mockSchoolAdminUser as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Parent Student Privacy Masking (Rule 12.4)', () => {
    it('should MASK other students information in mobile trip detail', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        schoolId: 'school-1',
        attendances: [{ studentId: 'child-1' }, { studentId: 'child-2' }],
        serviceDate: '2026-10-26',
        status: TripStatus.SCHEDULED,
        scheduledStartTime: '06:15',
        scheduledEndTime: '06:45',
        scheduledStartAt: new Date(),
        scheduledEndAt: new Date(),
        assignedVehicle: { id: 'v1', licensePlate: '51B-123.45', brand: 'Ford Transit', seatCount: 16 },
        assignedDriver: { id: 'd1', fullName: 'Nguyễn Văn Tài', phoneNumber: '0901234567' },
        assignedBusAttendant: { id: 'ba1', fullName: 'Lê Thị Bảo', phoneNumber: '0907654321' },
        school: { id: 'school-1', name: 'THPT Marie Curie', addressText: '159 NKKN' },
        route: {
          id: 'route-1',
          name: 'Tuyến 1',
          routePlanId: 'plan-1',
          routePlan: { id: 'plan-1', name: 'Phương án 1' },
          direction: RouteDirection.TO_SCHOOL,
          stops: [
            {
              id: 'stop-1',
              stopOrder: 1,
              stopType: 'STUDENT_PICKUP',
              addressText: '123 Đường Số 1',
              latitude: 10.7,
              longitude: 106.6,
              plannedSecondsFromStart: 300,
              studentId: 'child-1', // Parent's child
              student: { id: 'child-1', fullName: 'Con của tôi', guardianPhone: '0901111111' },
            },
            {
              id: 'stop-2',
              stopOrder: 2,
              stopType: 'STUDENT_PICKUP',
              addressText: '456 Đường Bí Mật',
              latitude: 10.71,
              longitude: 106.61,
              plannedSecondsFromStart: 600,
              studentId: 'child-2', // Other student
              student: { id: 'child-2', fullName: 'Bé Nguyễn Khác', guardianPhone: '0909999999' },
            },
          ],
        },
      });

      prismaMock.tripAttendance.findMany.mockResolvedValue([{ studentId: 'child-1' }, { studentId: 'child-2' }]);
      // Parent is linked ONLY to child-1
      prismaMock.parentStudentLink.findMany.mockResolvedValue([
        { studentId: 'child-1', parentId: 'parent-1' },
      ]);

      const result = await service.getMobileTripDetail('trip-1', mockParentUser as any);

      const stops = result.stops;
      expect(stops).toHaveLength(2);

      // Child 1: Full info visible
      expect(stops[0].studentName).toContain('Con của tôi');
      expect(stops[0].isMyChild).toBe(true);

      // Child 2: Masked privacy
      expect(stops[1].studentName).toBe('Học sinh khác');
      expect(stops[1].isMyChild).toBe(false);
      expect(stops[1].addressText).toBe('Điểm đón học sinh');
      expect(stops[1].guardianPhone).toBeUndefined();
    });
  });

  describe('Trip Operation State & TEST Mode (BR-05, BR-06, D12)', () => {
    it('should allow attendant to mark ready anytime when in TEST mode even if too early', async () => {
      // Configure TEST mode
      configMock.get.mockImplementation((key: string) => {
        if (key === 'TRIP_OPERATION_MODE') return 'TEST';
        return null;
      });

      // Scheduled 2 hours in future (way before 15m threshold)
      const scheduledFuture = new Date(Date.now() + 2 * 60 * 60 * 1000);
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-test-1',
        assignedBusAttendantId: 'attendant-1',
        status: TripStatus.SCHEDULED,
        attendantReadyAt: null,
        scheduledStartAt: scheduledFuture,
        actualStartTime: null,
        actualEndTime: null,
        attendances: [
          { studentId: 's1', status: AttendanceStatus.PRESENT },
          { studentId: 's2', status: AttendanceStatus.ABSENT, absenceReason: 'Nghỉ ốm' },
          { studentId: 's3', status: AttendanceStatus.UNMARKED },
        ],
      });

      const result = await service.getOperationalState('trip-test-1', mockAttendantUser as any);

      // Verify counts
      expect(result.totalStudents).toBe(3);
      expect(result.presentCount).toBe(1);
      expect(result.absentCount).toBe(1);
      expect(result.markedCount).toBe(2);
      expect(result.unmarkedCount).toBe(1);
      expect(result.isAllMarked).toBe(false);

      // In TEST mode, canAttendantReady and canMarkReady must be true
      expect(result.canAttendantReady).toBe(true);
      expect(result.canMarkReady).toBe(true);
      expect(result.readyDisabledReason).toBeNull();
      expect(result.disabledReasons?.ready).toBeNull();
    });

    it('should block attendant ready with TOO_EARLY in LIVE mode when before threshold', async () => {
      // Configure LIVE mode
      configMock.get.mockImplementation((key: string) => {
        if (key === 'TRIP_OPERATION_MODE') return 'LIVE';
        return null;
      });

      // Scheduled 2 hours in future (way before 15m threshold)
      const scheduledFuture = new Date(Date.now() + 2 * 60 * 60 * 1000);
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-live-1',
        assignedBusAttendantId: 'attendant-1',
        status: TripStatus.SCHEDULED,
        attendantReadyAt: null,
        scheduledStartAt: scheduledFuture,
        actualStartTime: null,
        actualEndTime: null,
        attendances: [
          { studentId: 's1', status: AttendanceStatus.UNMARKED },
        ],
      });

      const result = await service.getOperationalState('trip-live-1', mockAttendantUser as any);

      expect(result.canAttendantReady).toBe(false);
      expect(result.canMarkReady).toBe(false);
      expect(result.readyDisabledReason).toBe('TOO_EARLY');
      expect(result.disabledReasons?.ready).toBe('TOO_EARLY');
    });

    it('should fallback to process.env.TRIP_OPERATION_MODE if configService returns undefined', () => {
      configMock.get.mockReturnValue(undefined);
      process.env.TRIP_OPERATION_MODE = 'test';

      expect(service.isTestMode()).toBe(true);

      process.env.TRIP_OPERATION_MODE = 'live';
      expect(service.isTestMode()).toBe(false);

      delete process.env.TRIP_OPERATION_MODE;
    });
  });

  describe('Trip Operation Flow V2: TO_SCHOOL & TO_PARKING (BF-01 to BF-12)', () => {
    it('TO_SCHOOL: should allow Driver to start trip without complete boarding (BF-01)', async () => {
      configMock.get.mockImplementation((key: string) => {
        if (key === 'TRIP_OPERATION_MODE') return 'TEST';
        return null;
      });

      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-school-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.SCHEDULED,
        assignedDriverId: 'driver-1',
        attendantReadyAt: new Date(),
        attendances: [
          { studentId: 's1', status: AttendanceStatus.UNMARKED },
          { studentId: 's2', status: AttendanceStatus.UNMARKED },
        ],
      });
      prismaMock.trip.update.mockResolvedValue({
        id: 'trip-school-1',
        status: TripStatus.IN_PROGRESS,
        actualStartTime: new Date(),
      });

      const res = await service.startTrip('trip-school-1', mockDriverUser as any);
      expect(res.trip.status).toBe(TripStatus.IN_PROGRESS);
    });

    it('TO_SCHOOL: should block arriveAtSchool when boarding is incomplete, and allow when complete (BF-02, BF-03, BF-04)', async () => {
      // Incomplete boarding: s2 is UNMARKED
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-school-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.IN_PROGRESS,
        assignedDriverId: 'driver-1',
        arrivedAtSchoolAt: null,
        attendances: [
          { studentId: 's1', status: AttendanceStatus.PRESENT },
          { studentId: 's2', status: AttendanceStatus.UNMARKED },
        ],
      });

      await expect(service.arriveAtSchool('trip-school-1', mockDriverUser as any)).rejects.toThrow(
        BadRequestException,
      );

      // Complete boarding: s1 is PRESENT, s2 is ABSENT with reason
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-school-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.IN_PROGRESS,
        assignedDriverId: 'driver-1',
        arrivedAtSchoolAt: null,
        attendances: [
          { studentId: 's1', status: AttendanceStatus.PRESENT },
          { studentId: 's2', status: AttendanceStatus.ABSENT, absenceReason: 'Nghỉ có phép' },
        ],
      });
      prismaMock.trip.update.mockResolvedValue({
        id: 'trip-school-1',
        arrivedAtSchoolAt: new Date(),
      });

      const res = await service.arriveAtSchool('trip-school-1', mockDriverUser as any);
      expect(res.message).toContain('Xác nhận đến trường thành công');
      expect(res.arrivedAtSchoolAt).toBeDefined();
    });

    it('TO_SCHOOL: should block alighting before school arrival, and allow after arrival for PRESENT students (BF-06)', async () => {
      // Before arrival: arrivedAtSchoolAt is null
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-school-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.IN_PROGRESS,
        assignedBusAttendantId: 'attendant-1',
        arrivedAtSchoolAt: null,
      });

      await expect(
        service.updateAlighting('trip-school-1', 's1', { isAlighted: true }, mockAttendantUser as any),
      ).rejects.toThrow('Chưa thể cho học sinh xuống xe. Xe chưa xác nhận đến trường.');

      // After arrival: arrivedAtSchoolAt is set, s1 is PRESENT
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-school-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.IN_PROGRESS,
        assignedBusAttendantId: 'attendant-1',
        arrivedAtSchoolAt: new Date(),
      });
      prismaMock.tripAttendance.findUnique.mockResolvedValue({
        tripId: 'trip-school-1',
        studentId: 's1',
        status: AttendanceStatus.PRESENT,
        alightedAt: null,
      });
      prismaMock.tripAttendance.update.mockResolvedValue({
        tripId: 'trip-school-1',
        studentId: 's1',
        status: AttendanceStatus.PRESENT,
        alightedAt: new Date(),
      });

      const res = await service.updateAlighting(
        'trip-school-1',
        's1',
        { isAlighted: true },
        mockAttendantUser as any,
      );
      expect(res.isAlighted).toBe(true);
      expect(res.alightedAt).toBeDefined();
    });

    it('TO_SCHOOL: should block Complete until arrived at school AND all PRESENT students alighted (BF-07)', async () => {
      // Arrived at school, but s1 hasn't alighted yet
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-school-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.IN_PROGRESS,
        assignedDriverId: 'driver-1',
        arrivedAtSchoolAt: new Date(),
        attendances: [
          { studentId: 's1', status: AttendanceStatus.PRESENT, alightedAt: null },
          { studentId: 's2', status: AttendanceStatus.ABSENT, absenceReason: 'Ốm' },
        ],
      });

      await expect(service.completeTrip('trip-school-1', mockDriverUser as any)).rejects.toThrow(
        'chưa được xác nhận xuống xe',
      );

      // Now s1 has alighted
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-school-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.IN_PROGRESS,
        assignedDriverId: 'driver-1',
        arrivedAtSchoolAt: new Date(),
        attendances: [
          { studentId: 's1', status: AttendanceStatus.PRESENT, alightedAt: new Date() },
          { studentId: 's2', status: AttendanceStatus.ABSENT, absenceReason: 'Ốm' },
        ],
      });
      prismaMock.trip.update.mockResolvedValue({
        id: 'trip-school-1',
        status: TripStatus.COMPLETED,
        actualEndTime: new Date(),
      });

      const res = await service.completeTrip('trip-school-1', mockDriverUser as any);
      expect(res.trip.status).toBe(TripStatus.COMPLETED);
    });

    it('TO_PARKING: should block Driver start until 100% boarded at school (BF-08, BF-09, BF-10)', async () => {
      // Incomplete boarding on TO_PARKING
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-parking-1',
        direction: RouteDirection.TO_PARKING,
        status: TripStatus.SCHEDULED,
        assignedDriverId: 'driver-1',
        attendantReadyAt: new Date(),
        attendances: [
          { studentId: 's1', status: AttendanceStatus.PRESENT },
          { studentId: 's2', status: AttendanceStatus.UNMARKED },
        ],
      });

      await expect(service.startTrip('trip-parking-1', mockDriverUser as any)).rejects.toThrow(
        'chưa điểm danh lên xe tại trường',
      );

      // Complete boarding on TO_PARKING
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-parking-1',
        direction: RouteDirection.TO_PARKING,
        status: TripStatus.SCHEDULED,
        assignedDriverId: 'driver-1',
        attendantReadyAt: new Date(),
        attendances: [
          { studentId: 's1', status: AttendanceStatus.PRESENT },
          { studentId: 's2', status: AttendanceStatus.ABSENT, absenceReason: 'Về với bố mẹ' },
        ],
      });
      prismaMock.trip.update.mockResolvedValue({
        id: 'trip-parking-1',
        status: TripStatus.IN_PROGRESS,
        actualStartTime: new Date(),
      });

      const res = await service.startTrip('trip-parking-1', mockDriverUser as any);
      expect(res.trip.status).toBe(TripStatus.IN_PROGRESS);
    });

    it('should forbid reset to UNMARKED after school arrival or after start (BF-05, RET-05)', async () => {
      // TO_SCHOOL: arrivedAtSchoolAt is set
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-school-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.IN_PROGRESS,
        assignedBusAttendantId: 'attendant-1',
        arrivedAtSchoolAt: new Date(),
      });

      await expect(
        service.updateAttendance(
          'trip-school-1',
          's1',
          { status: AttendanceStatus.UNMARKED },
          mockAttendantUser as any,
        ),
      ).rejects.toThrow('Không thể hoàn tác về Chưa điểm danh sau khi xe đã đến trường');

      // TO_PARKING: trip is IN_PROGRESS
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-parking-1',
        direction: RouteDirection.TO_PARKING,
        status: TripStatus.IN_PROGRESS,
        assignedBusAttendantId: 'attendant-1',
      });

      await expect(
        service.updateAttendance(
          'trip-parking-1',
          's1',
          { status: AttendanceStatus.UNMARKED },
          mockAttendantUser as any,
        ),
      ).rejects.toThrow('Không thể hoàn tác về Chưa điểm danh sau khi chuyến xe đã khởi hành');
    });
  });
});
