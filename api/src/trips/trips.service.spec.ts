// Isolate delivery-intent helpers in business-rule suites; actual helpers are tested in notifications.spec.ts.
vi.mock('../notifications/notification-writer.js', () => ({ notifyTrip: vi.fn().mockResolvedValue(undefined), notifyAssignment: vi.fn().mockResolvedValue(undefined), notifyCancelledTrips: vi.fn().mockResolvedValue(undefined) }));
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TripsService } from './trips.service.js';
import { AttendanceStatus, Role, RouteDirection, RoutePlanStatus, TripStatus, TripIncidentType, TripIncidentStatus } from '@prisma/client';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

  it('records QR boarding immediately, ignores repeat scans and preserves recorded absences', async () => {
    const tripId = 'trip';
    const attendee = { id: 'row', studentId: 'student', status: AttendanceStatus.UNMARKED as AttendanceStatus };
    prismaMock.trip.findUnique.mockResolvedValue({
      id: tripId, schoolId: 'school-1', assignedBusAttendantId: mockAttendantUser.id,
      direction: RouteDirection.TO_SCHOOL, status: TripStatus.IN_PROGRESS,
      route: { stops: [] }, attendances: [attendee],
    });
    prismaMock.student = { findUnique: vi.fn().mockResolvedValue({
      id: attendee.studentId, code: 'TEST', schoolId: 'school-1',
      school: { isActive: true }, status: 'AVAILABLE',
    }) };
    prismaMock.tripAttendance.findUnique.mockResolvedValue(attendee);
    prismaMock.tripAttendance.update.mockResolvedValue({ ...attendee, status: AttendanceStatus.PRESENT });
    const scan = () => service.scanQrAttendance(tripId, { qrData: 'TEST' }, mockAttendantUser as never);

    await expect(scan()).resolves.toMatchObject({ currentStatus: AttendanceStatus.PRESENT, alreadyRecorded: false });
    attendee.status = AttendanceStatus.PRESENT;
    await expect(scan()).resolves.toMatchObject({ currentStatus: AttendanceStatus.PRESENT, alreadyRecorded: true });
    attendee.status = AttendanceStatus.ABSENT;
    await expect(scan()).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.tripAttendance.update).toHaveBeenCalledTimes(1);
  });

  beforeEach(() => {
    prismaMock = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      trip: {
        findUnique: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(null),
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
        findMany: vi.fn().mockResolvedValue([]),
      },
      school: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      vehicle: {
        findUnique: vi.fn().mockResolvedValue({ id: 'vehicle-1', isActive: true, seatCount: 30 }),
      },
      user: {
        findUnique: vi.fn().mockImplementation((args: any) => {
          if (args?.where?.id === 'd1') return Promise.resolve({ id: 'd1', role: Role.DRIVER, isActive: true, fullName: 'Driver 1' });
          if (args?.where?.id === 'ba1') return Promise.resolve({ id: 'ba1', role: Role.BUS_ATTENDANT, isActive: true, schoolId: 'school-1', fullName: 'Attendant 1' });
          return Promise.resolve(null);
        }),
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
        findUnique: vi.fn().mockResolvedValue({
          key: 'PARKING_LOT',
          value: {
            latitude: 10.77,
            longitude: 106.70,
            addressText: 'Bãi xe trung tâm',
            maxOperatingRadiusKm: 50,
          },
        }),
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

  afterEach(() => vi.useRealTimers());

  describe('System Admin cancellation before operation', () => {
    const trip = {
      id: 'trip-1',
      status: TripStatus.SCHEDULED,
      direction: RouteDirection.TO_SCHOOL,
      actualStartTime: null,
      actualEndTime: null,
      attendantReadyAt: null,
      attendances: [],
    };
    const dto = { reason: 'Điều chỉnh lịch phục vụ' };

    it.each([
      {},
      { attendantReadyAt: new Date(), attendances: [{ status: AttendanceStatus.ABSENT, markedAt: new Date() }] },
    ])('cancels an unoperated trip and closes pending tasks', async (overrides) => {
      prismaMock.trip.findUnique.mockResolvedValue({ ...trip, ...overrides });
      prismaMock.trip.findMany.mockResolvedValue([{ id: trip.id }]);
      prismaMock.leaveNotice = { updateMany: vi.fn() };
      prismaMock.tripIncident = { updateMany: vi.fn() };

      await expect(service.cancelTrip(trip.id, dto, mockAdminUser as any)).resolves.toEqual({ message: 'Đã hủy chuyến' });
      expect(prismaMock.trip.update).toHaveBeenCalledWith({
        where: { id: trip.id },
        data: expect.objectContaining({
          status: TripStatus.CANCELLED,
          cancelledById: mockAdminUser.id,
          cancellationReason: dto.reason,
          operationAudit: [expect.objectContaining({ action: 'CANCELLED_BY_ADMIN' })],
        }),
      });
      expect(prismaMock.leaveNotice.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'TRIP_CANCELLED' }),
      }));
      expect(prismaMock.tripIncident.updateMany).toHaveBeenCalled();
    });

    it.each([
      { status: TripStatus.IN_PROGRESS }, { status: TripStatus.CANCELLED }, { status: TripStatus.COMPLETED },
      { actualStartTime: new Date() }, { actualEndTime: new Date() },
      { attendances: [{ status: AttendanceStatus.PRESENT }] }, { attendances: [{ alightedAt: new Date() }] },
    ])('blocks cancellation after operation or a terminal status', async (overrides) => {
      prismaMock.trip.findUnique.mockResolvedValue({ ...trip, ...overrides });
      await expect(service.cancelTrip(trip.id, dto, mockAdminUser as any)).rejects.toThrow(ConflictException);
      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });

    it('denies School Admin access to the general cancellation action', async () => {
      await expect(service.cancelTrip(trip.id, dto, mockSchoolAdminUser as any)).rejects.toThrow(ForbiddenException);
      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });
  });

  describe('Staff leave when reopening trips', () => {
    const id = 'cancelled-trip';
    const driverNotice = { id: 'driver-notice', kind: 'DRIVER', reportedById: 'd1', status: 'TRIP_CANCELLED' };
    const attendantNotice = { id: 'attendant-notice', kind: 'BUS_ATTENDANT', reportedById: 'ba1', status: 'REPLACED' };
    const trip = {
      id, schoolId: 'school-1', status: TripStatus.CANCELLED, attendances: [],
      assignedVehicleId: 'vehicle-1', assignedDriverId: 'd1', assignedBusAttendantId: 'ba1',
      serviceDate: new Date('2026-11-20'), scheduledStartAt: new Date('2026-11-20T01:00:00Z'),
      route: { direction: RouteDirection.TO_SCHOOL, estimatedDurationSeconds: 900,
        routePlan: { activatedAt: new Date('2026-11-18') }, school: {} },
    };
    const dto = { reason: 'Hủy nhầm' };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-19T00:00:00Z'));
      prismaMock.trip.findUnique.mockResolvedValue(trip);
      prismaMock.leaveNotice = { findMany: vi.fn().mockResolvedValueOnce([driverNotice, attendantNotice]).mockResolvedValue([]), updateMany: vi.fn() };
    });

    function mockReopenSchedule() {
      vi.spyOn(service as any, 'planServiceDay').mockResolvedValue({ start: '08:00', end: '17:00' });
      vi.spyOn(service as any, 'prepareTrip').mockResolvedValue({ studentIds: [], snapshot: {} });
      prismaMock.trip.findMany.mockResolvedValue([]);
      prismaMock.school.findUnique.mockResolvedValue({ id: trip.schoolId });
      prismaMock.tripAttendance.updateMany = vi.fn();
      prismaMock.tripAttendance.findMany.mockResolvedValue([]);
    }

    it('shows only necessary notice fields, omits withdrawn notices and restricts access', async () => {
      await expect(service.getReopenStaffLeaveNotices(id, mockSchoolAdminUser as any)).rejects.toThrow(ForbiddenException);
      prismaMock.leaveNotice.findMany.mockReset().mockResolvedValue([
        driverNotice, { ...attendantNotice, status: 'WITHDRAWN' },
      ]);
      await expect(service.getReopenStaffLeaveNotices(id, mockAdminUser as any)).resolves.toEqual({
        items: [{ id: driverNotice.id, kind: 'DRIVER', staffId: 'd1' }],
      });
    });

    it('rejects partial or outdated confirmation before updating the trip', async () => {
      await expect(service.reopenTrip(id, { ...dto, confirmedStaffLeaveNoticeIds: [driverNotice.id, 'older-notice'] }, mockAdminUser as any))
        .rejects.toMatchObject({ response: { code: 'REOPEN_STAFF_LEAVE' } });
      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });

    it('records confirmation for retained staff and accepts a replacement without confirming the old notice', async () => {
      mockReopenSchedule();
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'd2', role: Role.DRIVER, isActive: true });
      await expect(service.reopenTrip(id, { ...dto, driverId: 'd2', confirmedStaffLeaveNoticeIds: [attendantNotice.id] }, mockAdminUser as any))
        .resolves.toMatchObject({ tripId: id });
      expect(prismaMock.trip.update.mock.calls[0][0].data).toMatchObject({
        status: TripStatus.SCHEDULED, assignedDriverId: 'd2', assignedBusAttendantId: 'ba1',
        operationAudit: [{ actorId: mockAdminUser.id, staffLeaveConfirmations: [{ noticeId: attendantNotice.id, kind: 'BUS_ATTENDANT', staffId: 'ba1' }] }],
      });
    });

    it('still checks resource availability after staff confirmation', async () => {
      mockReopenSchedule();
      prismaMock.vehicle.findUnique.mockResolvedValue(null);
      await expect(service.reopenTrip(id, { ...dto, confirmedStaffLeaveNoticeIds: [driverNotice.id, attendantNotice.id] }, mockAdminUser as any))
        .rejects.toMatchObject({ response: { code: 'REOPEN_VEHICLE' } });
      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });
  });

  describe('Mobile home trips', () => {
    const today = new Date('2026-11-20T00:00:00Z');
    const tomorrow = new Date('2026-11-21T00:00:00Z');

    function homeTrip(id: string, status: TripStatus, serviceDate = today, hour = '01') {
      const dateKey = serviceDate.toISOString().slice(0, 10);
      return {
        id, status, serviceDate,
        scheduledStartAt: new Date(`${dateKey}T${hour}:00:00Z`),
        scheduledEndAt: new Date(`${dateKey}T${hour}:30:00Z`),
        direction: RouteDirection.TO_SCHOOL,
        school: { name: 'School' },
        route: { id: 'route', name: 'Route', polylineGeometry: '' },
        assignedVehicle: { licensePlate: '51B-00000', brand: 'Bus', seatCount: 14 },
        assignedDriver: { id: mockDriverUser.id, fullName: 'Driver' },
        assignedBusAttendant: { id: mockAttendantUser.id, fullName: 'Attendant' },
        _count: { attendances: 1 },
        attendances: [{ status: AttendanceStatus.UNMARKED }],
        leaveNotices: [],
      };
    }

    it.each([
      [mockDriverUser, 'assignedDriverId'],
      [mockAttendantUser, 'assignedBusAttendantId'],
    ])('keeps the priority trip and queries same-day history in the staff assignment scope', async (user, assignmentField) => {
      vi.setSystemTime(new Date('2026-11-20T03:00:00Z'));
      vi.spyOn(service, 'getOperationalState').mockResolvedValue({ assignmentStatus: 'ASSIGNED' } as any);
      prismaMock.leaveNotice = { findFirst: vi.fn().mockResolvedValue(null) };
      prismaMock.trip.findMany
        .mockResolvedValueOnce([homeTrip('future', TripStatus.SCHEDULED, tomorrow), homeTrip('running', TripStatus.IN_PROGRESS)])
        .mockResolvedValueOnce([
          homeTrip('cancelled', TripStatus.CANCELLED),
          homeTrip('completed-later', TripStatus.COMPLETED, today, '02'),
          homeTrip('completed-earlier', TripStatus.COMPLETED),
        ]);

      const response = await service.getHomeTrip(user as any);

      expect(response.hasTrip).toBe(true);
      expect(response.trip?.id).toBe('running');
      expect(response.items.map(item => item.id)).toEqual(['running', 'completed-earlier', 'completed-later', 'cancelled']);
      expect(prismaMock.trip.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
        where: {
          [assignmentField]: user.id,
          id: { not: 'running' },
          serviceDate: today,
          status: { in: [TripStatus.COMPLETED, TripStatus.CANCELLED] },
        },
      }));
      expect(response.items[1]).toMatchObject({ canReportLeave: false });
      expect(service.getOperationalState).toHaveBeenCalledTimes(1);
    });

    it('shows staff history on the current Vietnam service date if no live trip remains', async () => {
      vi.setSystemTime(new Date('2026-11-19T18:00:00Z'));
      prismaMock.trip.findMany.mockResolvedValueOnce([])
        .mockResolvedValueOnce([homeTrip('cancelled', TripStatus.CANCELLED)]);

      const response = await service.getHomeTrip(mockDriverUser as any);

      expect(response).toMatchObject({ hasTrip: false, trip: null, items: [{ id: 'cancelled' }] });
      expect(prismaMock.trip.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
        where: expect.objectContaining({ serviceDate: today, assignedDriverId: mockDriverUser.id }),
      }));
    });

    it('shows no-guardian status only on the matching child’s card on a shared trip', async () => {
      vi.setSystemTime(new Date('2026-11-19T03:00:00Z'));
      prismaMock.parentStudentLink.findMany.mockResolvedValue([
        { student: { id: 'first', fullName: 'First' } },
        { student: { id: 'second', fullName: 'Second' } },
      ]);
      const trip = { ...homeTrip('shared', TripStatus.IN_PROGRESS), direction: RouteDirection.TO_PARKING,
        attendances: [{ status: AttendanceStatus.PRESENT, alightedAt: null }] };
      prismaMock.trip.findMany
        .mockResolvedValueOnce([{ ...trip, incidents: [{ id: 'report' }] }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...trip, incidents: [] }])
        .mockResolvedValueOnce([]);

      const { items } = await service.getParentHomeCards(mockParentUser as any);

      expect(items.map(card => [card.studentId, card.noGuardianAtStop])).toEqual([['first', true], ['second', false]]);
      for (const [call, studentId] of [[1, 'first'], [3, 'second']] as const) {
        expect(prismaMock.trip.findMany).toHaveBeenNthCalledWith(call, expect.objectContaining({
          include: expect.objectContaining({
            incidents: expect.objectContaining({
              where: expect.objectContaining({ context: { path: ['studentId'], equals: studentId } }),
            }),
          }),
        }));
      }
    });

    it('selects history per linked student and ranks cards across children', async () => {
      vi.setSystemTime(new Date('2026-11-20T03:00:00Z'));
      prismaMock.parentStudentLink.findMany.mockResolvedValue([
        { student: { id: 'child-one', fullName: 'Child one' } },
        { student: { id: 'child-two', fullName: 'Child two' } },
      ]);
      prismaMock.trip.findMany
        .mockResolvedValueOnce([homeTrip('expired', TripStatus.SCHEDULED)])
        .mockResolvedValueOnce([homeTrip('cancelled', TripStatus.CANCELLED)])
        .mockResolvedValueOnce([
          { ...homeTrip('marked', TripStatus.IN_PROGRESS), attendances: [{ status: AttendanceStatus.PRESENT }] },
          homeTrip('unmarked', TripStatus.IN_PROGRESS, tomorrow),
        ])
        .mockResolvedValueOnce([homeTrip('completed', TripStatus.COMPLETED, tomorrow)]);

      const response = await service.getParentHomeCards(mockParentUser as any);

      expect(response.items.map(item => [item.studentId, item.tripId])).toEqual([
        ['child-two', 'unmarked'], ['child-two', 'completed'], ['child-one', 'cancelled'],
      ]);
      expect(prismaMock.parentStudentLink.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { parentId: mockParentUser.id },
      }));
      expect(prismaMock.trip.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
        where: expect.objectContaining({ serviceDate: today, attendances: { some: { studentId: 'child-one', excludedAt: null } } }),
      }));
      expect(prismaMock.trip.findMany).toHaveBeenNthCalledWith(4, expect.objectContaining({
        where: expect.objectContaining({ serviceDate: tomorrow, attendances: { some: { studentId: 'child-two', excludedAt: null } } }),
      }));
    });
  });

  describe('Trip generation time eligibility (Rule 7.2)', () => {
    it.each(['2026-10-25T23:30:00Z', '2026-10-26T03:00:00Z'])('should skip a same-day trip at or after departure (%s)', async (now) => {
      vi.setSystemTime(new Date(now));
      const activationDate = new Date('2026-10-25T19:00:00Z'); // 02:00 in VN
      const plan = {
        id: 'plan-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.ACTIVE,
        activatedAt: activationDate,
        createdAt: new Date('2026-10-25T01:00:00Z'),
        school: {
          id: 'school-1',
          name: 'THPT Marie Curie',
          isActive: true,
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
            estimatedDurationSeconds: 1800,
            proposedVehicleId: 'v1',
            defaultDriverId: 'd1',
            defaultBusAttendantId: 'ba1',
            stops: [],
          },
        ],
      };

      prismaMock.routePlan.findMany.mockResolvedValue([plan]);
      prismaMock.routePlan.findUnique.mockResolvedValue(plan as any);
      prismaMock.route.findMany.mockResolvedValue([{ id: 'route-1', name: 'route-1' }]);
      prismaMock.route.findUnique.mockResolvedValue({
        ...plan.routes[0],
        schoolId: 'school-1',
        school: plan.school,
        routePlan: plan,
      });
      prismaMock.route.findMany.mockResolvedValue([{ id: 'route-1', name: 'route-1' }]);
      prismaMock.route.findUnique.mockResolvedValue({
        ...plan.routes[0],
        schoolId: 'school-1',
        school: plan.school,
        routePlan: plan,
      });
      prismaMock.trip.findMany.mockResolvedValue([]);
      prismaMock.school.findUnique.mockResolvedValue({
        id: 'school-1',
        isActive: true,
        contractStartDate: new Date('2026-01-01'),
        contractEndDate: new Date('2027-01-01'),
        weeklySchedule: {
          monday: { start: '07:00', end: '17:30' },
        },
      });

      // Attempt to generate for 2026-10-26 (same day as activation!)
      const result = await service.generateTrips(
        { schoolId: 'school-1', fromDate: '2026-10-26', toDate: '2026-10-26' },
        mockAdminUser as any,
      );

      expect(result.totalEligible).toBe(0);
      expect(result.createdCount).toBe(0);
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it.each(['2026-10-25T03:00:00Z', '2026-10-25T19:00:00Z'])('should generate a future departure for a plan activated at %s', async (activatedAt) => {
      vi.setSystemTime(new Date('2026-10-25T22:00:00Z')); // 05:00 on 26/10 in VN
      const activationDate = new Date(activatedAt);
      const plan = {
        id: 'plan-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.ACTIVE,
        activatedAt: activationDate,
        createdAt: new Date('2026-10-25T01:00:00Z'),
        school: {
          id: 'school-1',
          name: 'THPT Marie Curie',
          isActive: true,
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
            estimatedDurationSeconds: 1800,
            proposedVehicleId: 'v1',
            defaultDriverId: 'd1',
            defaultBusAttendantId: 'ba1',
            stops: [{ studentId: 'student-1', student: { id: 'student-1', status: 'AVAILABLE' } }],
          },
        ],
      };

      prismaMock.routePlan.findMany.mockResolvedValue([plan]);
      prismaMock.routePlan.findUnique.mockResolvedValue(plan as any);
      prismaMock.route.findMany.mockResolvedValue([{ id: 'route-1', name: 'route-1' }]);
      prismaMock.route.findUnique.mockResolvedValue({
        ...plan.routes[0],
        schoolId: 'school-1',
        school: plan.school,
        routePlan: plan,
      });
      prismaMock.route.findMany.mockResolvedValue([{ id: 'route-1', name: 'route-1' }]);
      prismaMock.route.findUnique.mockResolvedValue({
        ...plan.routes[0],
        schoolId: 'school-1',
        school: plan.school,
        routePlan: plan,
      });
      prismaMock.trip.findMany.mockResolvedValue([]); // No existing trips
      prismaMock.school.findUnique.mockResolvedValue({
        id: 'school-1',
        isActive: true,
        contractStartDate: new Date('2026-01-01'),
        contractEndDate: new Date('2027-01-01'),
        weeklySchedule: {
          monday: { start: '07:00', end: '17:30' },
        },
      });
      prismaMock.trip.create.mockResolvedValue({
        id: 'new-trip-1',
        serviceDate: '2026-10-26',
      });

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
      vi.setSystemTime(new Date('2026-10-25T22:00:00Z'));
      const activationDate = new Date('2026-10-25T03:00:00Z');
      const plan = {
        id: 'plan-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.ACTIVE,
        activatedAt: activationDate,
        createdAt: new Date('2026-10-25T01:00:00Z'),
        school: {
          id: 'school-1',
          name: 'THPT Marie Curie',
          isActive: true,
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
            estimatedDurationSeconds: 1800,
            proposedVehicleId: 'v1',
            defaultDriverId: 'd1',
            defaultBusAttendantId: 'ba1',
            stops: [],
          },
        ],
      };

      prismaMock.routePlan.findMany.mockResolvedValue([plan]);
      prismaMock.routePlan.findUnique.mockResolvedValue(plan as any);
      prismaMock.route.findMany.mockResolvedValue([{ id: 'route-1', name: 'route-1' }]);
      prismaMock.route.findUnique.mockResolvedValue({
        ...plan.routes[0],
        schoolId: 'school-1',
        school: plan.school,
        routePlan: plan,
      });
      prismaMock.school.findUnique.mockResolvedValue({
        id: 'school-1',
        isActive: true,
        contractStartDate: new Date('2026-01-01'),
        contractEndDate: new Date('2027-01-01'),
        weeklySchedule: {
          monday: { start: '07:00', end: '17:30' },
        },
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
    it('shares the stored route geometry while hiding other students’ stops and information', async () => {
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
          polylineGeometry: 'stored-trip-polyline',
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
      expect(result.polylineGeometry).toBe('stored-trip-polyline');

      const stops = result.stops;
      expect(stops).toHaveLength(1);

      // Child 1: Full info visible
      expect(stops[0].studentName).toContain('Con của tôi');
      expect(stops[0].isMyChild).toBe(true);
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
      ).rejects.toThrow();

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

    it('R02: should block startTrip when assigned bus attendant is in another IN_PROGRESS trip', async () => {
      prismaMock.trip.findMany.mockResolvedValue([]);
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        direction: RouteDirection.TO_SCHOOL,
        status: TripStatus.SCHEDULED,
        assignedDriverId: 'driver-1',
        assignedVehicleId: 'vehicle-1',
        assignedBusAttendantId: 'attendant-busy-1',
        attendantReadyAt: new Date(),
        scheduledStartAt: new Date(),
        scheduledEndAt: new Date(Date.now() + 3600000),
        attendances: [{ studentId: 's1', status: AttendanceStatus.UNMARKED }],
      });
      prismaMock.trip.findFirst.mockImplementation((args: any) => {
        if (args?.where?.status === TripStatus.IN_PROGRESS && args?.where?.id?.not) {
          return Promise.resolve({
            id: 'other-trip-in-progress',
            status: TripStatus.IN_PROGRESS,
            assignedDriverId: 'other-driver',
            assignedVehicleId: 'other-vehicle',
            assignedBusAttendantId: 'attendant-busy-1',
          });
        }
        return Promise.resolve(null);
      });

      await expect(service.startTrip('trip-1', mockDriverUser as any)).rejects.toThrow(
        'Giáo viên phụ xe đang thực hiện một chuyến xe khác chưa kết thúc',
      );
    });

    it('R03: should block markAttendantReady when there is an ATTENDANT_MISSING incident waiting assignment', async () => {
      prismaMock.trip.findMany.mockResolvedValue([]);
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        status: TripStatus.SCHEDULED,
        assignedBusAttendantId: 'attendant-1',
      });
      prismaMock.trip.findFirst.mockResolvedValue(null);
      prismaMock.leaveNotice = {
        findFirst: vi.fn().mockResolvedValue(null),
      };
      prismaMock.tripIncident = {
        findFirst: vi.fn().mockResolvedValue({
          id: 'inc-1',
          type: TripIncidentType.ATTENDANT_MISSING,
          status: TripIncidentStatus.WAITING_ASSIGNMENT,
        }),
      };

      await expect(service.markAttendantReady('trip-1', mockAttendantUser as any)).rejects.toThrow(
        'Chuyến xe có sự cố thiếu giáo viên phụ xe đang chờ xử lý',
      );
    });

    it('R06: should set startDisabledReason = ABSENT_REASON_REQUIRED when TO_PARKING student is ABSENT without reason', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        id: 'trip-parking-1',
        direction: RouteDirection.TO_PARKING,
        status: TripStatus.SCHEDULED,
        assignedDriverId: 'driver-1',
        assignedBusAttendantId: 'attendant-1',
        attendantReadyAt: new Date(),
        scheduledStartAt: new Date(Date.now() - 60000),
        scheduledEndAt: new Date(Date.now() + 3600000),
        attendances: [
          { studentId: 's1', status: AttendanceStatus.PRESENT },
          { studentId: 's2', status: AttendanceStatus.ABSENT, absenceReason: null },
        ],
      });

      const state = await service.getOperationalState('trip-parking-1', mockDriverUser as any);
      expect(state.canDriverStart).toBe(false);
      expect(state.startDisabledReason).toBe('ABSENT_REASON_REQUIRED');
    });
  });
});
