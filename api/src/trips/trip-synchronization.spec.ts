import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AttendanceStatus, Role, RouteDirection, TripStatus } from '@prisma/client';
import { TripsService } from './trips.service.js';

// In-memory service tests only: no Nest application, PrismaClient or database connection.
const user = (role: Role, id = 'reader', schoolId: string | null = 'school') => ({ role, id, schoolId } as any);
const makeTrip = () => ({
  id: 'trip', schoolId: 'school', serviceDate: new Date('2026-10-25'),
  direction: RouteDirection.TO_SCHOOL, status: TripStatus.IN_PROGRESS as TripStatus,
  assignedVehicleId: 'vehicle', assignedDriverId: 'driver', assignedBusAttendantId: 'attendant',
  attendantReadyAt: new Date(), arrivedAtSchoolAt: new Date(),
  assignedVehicle: { id: 'vehicle', licensePlate: 'plate', brand: 'bus', seatCount: 16 },
  assignedDriver: { id: 'driver', fullName: 'Driver' },
  assignedBusAttendant: { id: 'attendant', fullName: 'Attendant' },
  school: { id: 'school', name: 'School', latitude: 1, longitude: 1 },
  route: { id: 'route', name: 'Route', routePlanId: 'plan', routePlan: { name: 'Plan' }, stops: [] },
  attendances: [
    { studentId: 'child-a', status: AttendanceStatus.PRESENT, alightedAt: new Date(), markedAt: null, absenceReason: null },
    { studentId: 'child-b', status: AttendanceStatus.PRESENT, alightedAt: null, markedAt: null, absenceReason: null },
    { studentId: 'other', status: AttendanceStatus.ABSENT, alightedAt: null, markedAt: null, absenceReason: 'Private' },
  ],
});

describe('Trip synchronization authorization and operation serialization', () => {
  let trip: ReturnType<typeof makeTrip>;
  let db: any;
  let service: TripsService;
  beforeEach(() => {
    trip = makeTrip();
    db = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      trip: { findUnique: vi.fn(async () => trip), findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
      tripAttendance: { findUnique: vi.fn(), findMany: vi.fn(async () => trip.attendances), update: vi.fn() },
      parentStudentLink: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn() },
      user: { findUnique: vi.fn() }, vehicle: { findUnique: vi.fn() },
      school: { findUnique: vi.fn() },
      $transaction: vi.fn(async (work: any) => work(db)),
    };
    service = new TripsService(db, { get: () => 'TEST' } as any);
  });

  it.each([
    [Role.DRIVER, 'wrong', 'school'], [Role.BUS_ATTENDANT, 'wrong', 'school'],
    [Role.SCHOOL_ADMIN, 'reader', 'other-school'], [Role.SCHOOL_ADMIN, 'reader', null],
    [Role.PARENT, 'parent', null],
  ])('denies detail/mobile/state outside object scope for %s (%s/%s)', async (role, id, school) => {
    const actor = user(role as Role, id as string, school);
    await expect(service.getTripDetail('trip', actor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getMobileTripDetail('trip', actor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getOperationalState('trip', actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    [Role.SYSTEM_ADMIN, 'reader'], [Role.SCHOOL_ADMIN, 'reader'],
    [Role.DRIVER, 'driver'], [Role.BUS_ATTENDANT, 'attendant'],
  ])('allows authorized detail/state for %s', async (role, id) => {
    expect((await service.getTripDetail('trip', user(role as Role, id))).id).toBe('trip');
    expect((await service.getOperationalState('trip', user(role as Role, id))).status).toBe(TripStatus.IN_PROGRESS);
  });

  it.each([user(Role.SCHOOL_ADMIN, 'reader', 'other'), user(Role.SCHOOL_ADMIN, 'reader', null),
    user(Role.DRIVER, 'wrong'), user(Role.BUS_ATTENDANT, 'wrong'), user(Role.PARENT)])(
    'denies roster outside scope: %j', async actor => {
      await expect(service.getTripAttendance('trip', actor)).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it('denies a linked child not in this Trip roster', async () => {
    db.parentStudentLink.findMany.mockResolvedValue([{ studentId: 'not-in-roster' }]);
    await expect(service.getOperationalState('trip', user(Role.PARENT))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not turn a missing School Admin scope into a system-wide list', async () => {
    await expect(service.listTrips({} as any, user(Role.SCHOOL_ADMIN, 'reader', null)))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(db.trip.findMany).not.toHaveBeenCalled();
  });

  it('returns independent own-child state without other-child data, counts or action flags', async () => {
    db.parentStudentLink.findMany.mockResolvedValue([{ studentId: 'child-a' }, { studentId: 'child-b' }]);
    const result = await service.getOperationalState('trip', user(Role.PARENT));
    expect(result.children.map(child => [child.studentId, child.isAlighted])).toEqual([
      ['child-a', true], ['child-b', false],
    ]);
    expect(result).not.toHaveProperty('totalStudents');
    expect(result).not.toHaveProperty('canStartTrip');
    expect(result).not.toHaveProperty('childIsAlighted');
    expect(JSON.stringify(result)).not.toContain('Private');
    expect(JSON.stringify(result)).not.toContain('other');
  });

  it('rechecks assignment on the next read', async () => {
    await service.getOperationalState('trip', user(Role.DRIVER, 'driver'));
    trip.assignedDriverId = 'replacement';
    await expect(service.getOperationalState('trip', user(Role.DRIVER, 'driver'))).rejects.toBeInstanceOf(ForbiddenException);
    await service.getOperationalState('trip', user(Role.DRIVER, 'replacement'));
  });

  it('filters persisted Parent schedule by roster even when route stops are empty', async () => {
    db.parentStudentLink.findUnique.mockResolvedValue({ studentId: 'child-a' });
    db.school.findUnique.mockResolvedValue(null);
    (db as any).student = { findUnique: vi.fn().mockResolvedValue({ id: 'child-a', fullName: 'A' }) };
    await service.getParentStudentSchedule('child-a', '2026-10-25', user(Role.PARENT));
    expect(db.trip.findMany.mock.calls[0][0].where).toMatchObject({ attendances: { some: { studentId: 'child-a', excludedAt: null } } });
    expect(db.trip.findMany.mock.calls[0][0].where).not.toHaveProperty('route');
  });

  it.each(['assignment', 'ready', 'start', 'arrival', 'boarding', 'alighting', 'complete'])(
    'awaits the same parameterized Trip row lock before %s reads its preconditions', async operation => {
      let release!: () => void;
      db.$queryRaw.mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
      // A transition that completed while waiting must be read after acquiring the lock.
      trip.status = TripStatus.COMPLETED;
      const calls: Record<string, () => Promise<any>> = {
        assignment: () => service.updateTripAssignment('trip', { driverId: 'new' }, user(Role.SYSTEM_ADMIN)),
        ready: () => service.markAttendantReady('trip', user(Role.BUS_ATTENDANT, 'attendant')),
        start: () => service.startTrip('trip', user(Role.DRIVER, 'driver')),
        arrival: () => service.arriveAtSchool('trip', user(Role.DRIVER, 'driver')),
        boarding: () => service.updateAttendance('trip', 'child-a', { status: AttendanceStatus.PRESENT }, user(Role.BUS_ATTENDANT, 'attendant')),
        alighting: () => service.updateAlighting('trip', 'child-a', { isAlighted: false }, user(Role.BUS_ATTENDANT, 'attendant')),
        complete: () => service.completeTrip('trip', user(Role.DRIVER, 'driver')),
      };
      const pending = calls[operation]();
      const assertion = expect(pending).rejects.toBeInstanceOf(BadRequestException);
      expect(db.trip.findUnique).not.toHaveBeenCalled();
      const query = db.$queryRaw.mock.calls[0][0];
      expect(query.sql).toBe('SELECT id FROM trips WHERE id = ? FOR UPDATE');
      expect(query.values).toEqual(['trip']);
      release();
      await assertion;
      expect(db.trip.update).not.toHaveBeenCalled();
      expect(db.tripAttendance.update).not.toHaveBeenCalled();
    },
  );

  it('rejects Start after a Ready reset or assignment revocation', async () => {
    trip.status = TripStatus.SCHEDULED;
    trip.attendantReadyAt = null as any;
    await expect(service.startTrip('trip', user(Role.DRIVER, 'driver'))).rejects.toBeInstanceOf(BadRequestException);
    trip.assignedDriverId = 'replacement';
    await expect(service.startTrip('trip', user(Role.DRIVER, 'driver'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.trip.update).not.toHaveBeenCalled();
  });

  it('rechecks state so a second device cannot start an already started Trip', async () => {
    trip.status = TripStatus.SCHEDULED;
    db.trip.update.mockImplementation(async ({ data }: any) => Object.assign(trip, data));
    await service.startTrip('trip', user(Role.DRIVER, 'driver'));
    await expect(service.startTrip('trip', user(Role.DRIVER, 'driver'))).rejects.toBeInstanceOf(BadRequestException);
    expect(db.trip.update).toHaveBeenCalledTimes(1);
  });

  it('rejects stale assignment form snapshots instead of overwriting another assignment', async () => {
    trip.status = TripStatus.SCHEDULED;
    await expect(service.updateTripAssignment('trip', { driverId: 'new', expectedDriverId: 'old' }, user(Role.SYSTEM_ADMIN)))
      .rejects.toBeInstanceOf(ConflictException);
    expect(db.trip.update).not.toHaveBeenCalled();
  });

  it('resets Ready when changing Attendant under the Trip lock', async () => {
    trip.status = TripStatus.SCHEDULED;
    db.user.findUnique.mockResolvedValue({ id: 'next', role: Role.BUS_ATTENDANT, isActive: true, schoolId: 'school' });
    vi.spyOn(service, 'getTripDetail').mockResolvedValue({ id: 'trip' } as any);
    await service.updateTripAssignment('trip', { busAttendantId: 'next' }, user(Role.SCHOOL_ADMIN));
    expect(db.trip.update).toHaveBeenCalledWith({ where: { id: 'trip' }, data: {
      assignedBusAttendantId: 'next', attendantReadyAt: null,
    } });
  });
});
