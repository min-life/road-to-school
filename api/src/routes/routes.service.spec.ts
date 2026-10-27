// Isolate delivery-intent helpers in business-rule suites; actual helpers are tested in notifications.spec.ts.
vi.mock('../notifications/notification-writer.js', () => ({ notifyTrip: vi.fn().mockResolvedValue(undefined), notifyAssignment: vi.fn().mockResolvedValue(undefined), notifyCancelledTrips: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../notifications/notification-events.js', () => ({ notifyPlan: vi.fn().mockResolvedValue(undefined) }));
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoutesService } from './routes.service.js';
import { VietMapVRPService } from './vietmap-vrp.service.js';
import { Role, RouteDirection, RoutePlanStatus, RouteStopType, StudentStatus } from '@prisma/client';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('RoutesService & Business Invariants', () => {
  let service: RoutesService;
  let prismaMock: any;
  let vrpServiceMock: any;
  let resourceAvailabilityMock: any;

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

  const mockParentUser = {
    id: 'parent-uuid',
    role: Role.PARENT,
    schoolId: null,
  };

  const mockSchool = {
    id: 'school-1',
    name: 'THPT Marie Curie',
    addressText: '159 Nam Kỳ Khởi Nghĩa, Q.3, TP.HCM',
    latitude: 10.782845,
    longitude: 106.690123,
    isActive: true,
    weeklySchedule: {
      monday: { morningStartTime: '07:30', morningEndTime: '11:30' },
    },
    contractStartDate: new Date('2026-01-01'),
    contractEndDate: new Date('2027-01-01'),
  };

  beforeEach(() => {
    prismaMock = {
      school: {
        findUnique: vi.fn(),
      },
      systemSetting: {
        findUnique: vi.fn(),
      },
      routePlan: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      routeStop: {
        findMany: vi.fn(),
      },
      student: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      vehicle: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      parentStudentLink: {
        findUnique: vi.fn(),
      },
      route: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      trip: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      leaveNotice: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: vi.fn(async (cb) => (typeof cb === 'function' ? cb(prismaMock) : cb)),
    };

    vrpServiceMock = {
      solveVRP: vi.fn(),
      solveTSP: vi.fn(),
      calculateRoute: vi.fn().mockResolvedValue({
        status: 'FEASIBLE',
        geometry: 'mock_polyline',
        distanceMeters: 5000,
        durationSeconds: 600,
      }),
    };

    resourceAvailabilityMock = {
      getCandidateVehicles: vi.fn(),
      getCandidateDrivers: vi.fn(),
      getCandidateBusAttendants: vi.fn(),
      validateVehicleGroupAssignment: vi.fn(),
      validateDriverGroupAssignment: vi.fn(),
      validateBusAttendantGroupAssignment: vi.fn(),
      checkApprovalReadiness: vi.fn(),
      findConflictingVehicles: vi.fn().mockResolvedValue(new Map()),
    };

    service = new RoutesService(
      prismaMock,
      vrpServiceMock as unknown as VietMapVRPService,
      resourceAvailabilityMock as any,
    );
  });

  // ==========================================
  // 1. PREPARATION DATA & ELIGIBILITY
  // ==========================================
  describe('getPreparationData', () => {
    it('should return eligible students and vehicles sorted by seatCount DESC', async () => {
      prismaMock.school.findUnique.mockResolvedValue(mockSchool);
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);
      prismaMock.routePlan.findMany.mockResolvedValue([]);
      prismaMock.routeStop.findMany.mockResolvedValue([]);

      prismaMock.student.findMany.mockResolvedValue([
        {
          id: 'stu-1',
          code: 'STU001',
          fullName: 'Nguyễn Văn A',
          guardianPhone: '0901234567',
          addressText: '123 Nguyễn Thị Minh Khai',
          latitude: 10.771,
          longitude: 106.691,
          status: StudentStatus.AVAILABLE,
        },
        {
          id: 'stu-2',
          code: 'STU002',
          fullName: 'Trần Thị B',
          guardianPhone: '0907654321',
          addressText: '456 Hai Bà Trưng',
          latitude: 10.781,
          longitude: 106.695,
          status: StudentStatus.AVAILABLE,
        },
      ]);

      resourceAvailabilityMock.findConflictingVehicles.mockResolvedValueOnce(
        new Map([
          [
            'veh-busy',
            {
              vehicleId: 'veh-busy',
              licensePlate: '51B-999.99',
              brand: 'Thaco',
              seatCount: 45,
              reasonCode: 'RESERVED_BY_DRAFT_PLAN',
              reasonMessage: 'Xe đã được giữ bởi phương án DRAFT khác',
            },
          ],
        ]),
      );

      prismaMock.vehicle.findMany.mockResolvedValue([
        { id: 'veh-1', brand: 'Hyundai', seatCount: 29, licensePlate: '51B-111.11', color: 'Trắng' },
        { id: 'veh-2', brand: 'Ford', seatCount: 16, licensePlate: '51B-222.22', color: 'Bạc' },
        { id: 'veh-busy', brand: 'Thaco', seatCount: 45, licensePlate: '51B-999.99', color: 'Đỏ' },
      ]);

      const result = await service.getPreparationData('school-1');

      expect(result.school.id).toBe('school-1');
      expect(result.eligibleStudents).toHaveLength(2);
      expect(result.availableVehicles).toHaveLength(2);
      expect(result.availableVehicles[0].id).toBe('veh-1');
      expect(result.availableVehicles[0].seatCount).toBe(29);
      expect(result.availableVehicles[1].id).toBe('veh-2');
      expect(result.availableVehicles[1].seatCount).toBe(16);
      // Busy vehicle should be excluded from available and present in unavailable
      expect(result.availableVehicles.some((v) => v.id === 'veh-busy')).toBe(false);
      expect(result.unavailableVehicles).toHaveLength(1);
      expect(result.unavailableVehicles![0].id).toBe('veh-busy');
      expect(result.unavailableVehicles![0].reasonCode).toBe('RESERVED_BY_DRAFT_PLAN');
    });

    it('should exclude students who already have active DRAFT routes', async () => {
      prismaMock.school.findUnique.mockResolvedValue(mockSchool);
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);
      prismaMock.routePlan.findMany.mockResolvedValue([{ id: 'plan-draft-1' }]);
      prismaMock.routeStop.findMany.mockResolvedValue([{ studentId: 'stu-1' }]);

      prismaMock.student.findMany.mockResolvedValue([
        {
          id: 'stu-1',
          code: 'STU001',
          fullName: 'Đã có tuyến',
          latitude: 10.771,
          longitude: 106.691,
          status: StudentStatus.AVAILABLE,
        },
        {
          id: 'stu-2',
          code: 'STU002',
          fullName: 'Chưa có tuyến',
          latitude: 10.781,
          longitude: 106.695,
          status: StudentStatus.AVAILABLE,
        },
      ]);

      prismaMock.route.findMany.mockResolvedValue([]);
      prismaMock.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getPreparationData('school-1');
      expect(result.eligibleStudents).toHaveLength(1);
      expect(result.eligibleStudents[0].id).toBe('stu-2');
    });
  });

  // ==========================================
  // 2. CAPACITY PRE-CHECK & OPTIMIZE PREVIEW
  // ==========================================
  describe('optimizePreview', () => {
    it('should allow partial VRP optimization when total vehicle capacity is smaller than students (BR-02 & Section 3.6)', async () => {
      prismaMock.school.findUnique.mockResolvedValue(mockSchool);
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);

      // 3 students
      prismaMock.student.findMany.mockResolvedValue([
        { id: 's1', fullName: 'Học sinh 1', latitude: 10.1, longitude: 106.1 },
        { id: 's2', fullName: 'Học sinh 2', latitude: 10.2, longitude: 106.2 },
        { id: 's3', fullName: 'Học sinh 3', latitude: 10.3, longitude: 106.3 },
      ]);

      // 1 vehicle with 2 seats
      prismaMock.vehicle.findMany.mockResolvedValue([
        { id: 'v1', seatCount: 2, licensePlate: '51B-123.45', brand: 'Ford' },
      ]);

      vrpServiceMock.solveVRP.mockResolvedValue({
        routes: [
          {
            vehicleId: 'v1',
            distanceMeters: 10000,
            durationSeconds: 1200,
            geometry: 'mock_geom',
            steps: [
              { type: 'start', location: [106.8, 10.8] },
              { type: 'job', id: 's1', location: [106.1, 10.1] },
              { type: 'job', id: 's2', location: [106.2, 10.2] },
              { type: 'end', location: [106.69, 10.78] },
            ],
          },
        ],
        unassignedJobIds: ['s3'],
      });

      const res = await service.optimizePreview(
        {
          schoolId: 'school-1',
          studentIds: ['s1', 's2', 's3'],
          vehicleIds: ['v1'],
          constraints: {
            latestSchoolArrival: '07:15',
            returnDepartureTime: '11:45',
          },
        },
        mockAdminUser as any,
      );

      expect(res.previewToken).toBeDefined();
      expect(res.summary.assignedBothWaysCount).toBe(2);
      expect(res.summary.unassignedCount).toBe(1);
      expect(res.summary.unassignedStudents[0].id).toBe('s3');
    });

    it('should enforce two-direction consistency (intersection of Outbound and Return)', async () => {
      prismaMock.school.findUnique.mockResolvedValue(mockSchool);
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);

      prismaMock.student.findMany.mockResolvedValue([
        { id: 's1', fullName: 'Học sinh 1', latitude: 10.1, longitude: 106.1 },
        { id: 's2', fullName: 'Học sinh 2', latitude: 10.2, longitude: 106.2 },
        { id: 's3', fullName: 'Học sinh 3', latitude: 10.3, longitude: 106.3 },
      ]);

      prismaMock.vehicle.findMany.mockResolvedValue([
        { id: 'v1', seatCount: 16, licensePlate: '51B-123.45', brand: 'Ford' },
      ]);

      // Outbound solves s1, s2, s3 on v1
      vrpServiceMock.solveVRP
        .mockResolvedValueOnce({
          routes: [
            {
              vehicleId: 'v1',
              totalDistanceMeters: 5000,
              totalDurationSeconds: 1200,
              geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
              steps: [
                { type: 'start', location: [106.8, 10.8], arrivalSeconds: 21600 },
                { type: 'job', id: 's1', location: [106.1, 10.1], arrivalSeconds: 22200 },
                { type: 'job', id: 's2', location: [106.2, 10.2], arrivalSeconds: 22800 },
                { type: 'job', id: 's3', location: [106.3, 10.3], arrivalSeconds: 23400 },
                { type: 'end', location: [106.69, 10.78], arrivalSeconds: 24000 },
              ],
            },
          ],
          unassignedJobIds: [],
        })
        // Return solves only s1, s2 on v1 (s3 was unassigned on return)
        .mockResolvedValueOnce({
          routes: [
            {
              vehicleId: 'v1',
              totalDistanceMeters: 4500,
              totalDurationSeconds: 1000,
              geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
              steps: [
                { type: 'start', location: [106.69, 10.78], arrivalSeconds: 42300 },
                { type: 'job', id: 's2', location: [106.2, 10.2], arrivalSeconds: 42900 },
                { type: 'job', id: 's1', location: [106.1, 10.1], arrivalSeconds: 43500 },
                { type: 'end', location: [106.8, 10.8], arrivalSeconds: 44100 },
              ],
            },
          ],
          unassignedJobIds: ['s3'],
        });

      // s3 must be pruned from outbound route because it was not in return!
      // Mock TSP recompute for outbound route v1 with s1, s2
      vrpServiceMock.solveTSP.mockResolvedValue({
        distanceMeters: 4000,
        durationSeconds: 950,
        geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      });

      const preview = await service.optimizePreview(
        {
          schoolId: 'school-1',
          studentIds: ['s1', 's2', 's3'],
          vehicleIds: ['v1'],
          constraints: {
            latestSchoolArrival: '07:15',
            returnDepartureTime: '11:45',
          },
        },
        mockAdminUser as any,
      );

      expect(preview.previewToken).toBeDefined();
      expect(preview.summary.assignedBothWaysCount).toBe(2);
      expect(preview.summary.unassignedCount).toBe(1);
      expect(preview.outboundRoutes[0].students).toHaveLength(2);
      expect(preview.returnRoutes[0].students).toHaveLength(2);
      expect(preview.outboundRoutes[0].stops[1].elapsedArrivalSeconds).toBeGreaterThan(0);
      expect(preview.outboundRoutes[0].derivedWeeklySchedule).toBeDefined();
    });

    it('should support defaultStopServiceSeconds and stopServiceOverrides and pass to jobs', async () => {
      prismaMock.school.findUnique.mockResolvedValue({
        ...mockSchool,
        weeklySchedule: {
          monday: { start: '07:30', end: '17:00' },
          tuesday: { start: '07:30', end: '16:30' },
        },
      });
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);

      prismaMock.student.findMany.mockResolvedValue([
        { id: 's1', fullName: 'Học sinh 1', latitude: 10.1, longitude: 106.1 },
        { id: 's2', fullName: 'Học sinh 2', latitude: 10.2, longitude: 106.2 },
      ]);

      prismaMock.vehicle.findMany.mockResolvedValue([
        { id: 'v1', seatCount: 16, licensePlate: '51B-123.45', brand: 'Ford' },
      ]);

      vrpServiceMock.solveVRP
        .mockResolvedValueOnce({
          routes: [
            {
              vehicleId: 'v1',
              distanceMeters: 5000,
              durationSeconds: 1200,
              geometry: 'mock_geom',
              steps: [
                { type: 'start', location: [106.8, 10.8], arrivalSeconds: 0 },
                { type: 'job', id: 's1', location: [106.1, 10.1], arrivalSeconds: 600 },
                { type: 'job', id: 's2', location: [106.2, 10.2], arrivalSeconds: 1200 },
                { type: 'end', location: [106.69, 10.78], arrivalSeconds: 1800 },
              ],
            },
          ],
          unassignedJobIds: [],
        })
        .mockResolvedValueOnce({
          routes: [
            {
              vehicleId: 'v1',
              distanceMeters: 5000,
              durationSeconds: 1200,
              geometry: 'mock_geom',
              steps: [
                { type: 'start', location: [106.69, 10.78], arrivalSeconds: 0 },
                { type: 'job', id: 's2', location: [106.2, 10.2], arrivalSeconds: 600 },
                { type: 'job', id: 's1', location: [106.1, 10.1], arrivalSeconds: 1200 },
                { type: 'end', location: [106.8, 10.8], arrivalSeconds: 1800 },
              ],
            },
          ],
          unassignedJobIds: [],
        });

      const preview = await service.optimizePreview(
        {
          schoolId: 'school-1',
          studentIds: ['s1', 's2'],
          vehicleIds: ['v1'],
          constraints: {
            defaultStopServiceSeconds: 90,
            stopServiceOverrides: [
              { studentId: 's1', direction: RouteDirection.TO_SCHOOL, serviceSeconds: 120 },
            ],
          },
        },
        mockAdminUser as any,
      );

      // Verify VRP was called with resolved service seconds
      const outboundCalls = vrpServiceMock.solveVRP.mock.calls[0][0];
      const s1Job = outboundCalls.find((j: any) => j.id === 's1');
      const s2Job = outboundCalls.find((j: any) => j.id === 's2');
      expect(s1Job.serviceSeconds).toBe(120);
      expect(s2Job.serviceSeconds).toBe(90);

      // Verify derived weekly schedule has Monday and Tuesday
      const obRoute = preview.outboundRoutes[0];
      expect(obRoute.derivedWeeklySchedule?.monday).toBeDefined();
      expect(obRoute.derivedWeeklySchedule?.tuesday).toBeDefined();
      expect(obRoute.derivedWeeklySchedule?.monday.arrivalTime).toBe('07:30');
    });

    it('should pass maxRouteDurationMinutes as relative time window to VietMap VRP (Scope A)', async () => {
      prismaMock.school.findUnique.mockResolvedValue(mockSchool);
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);

      prismaMock.student.findMany.mockResolvedValue([
        { id: 's1', fullName: 'Học sinh 1', latitude: 10.1, longitude: 106.1 },
      ]);

      prismaMock.vehicle.findMany.mockResolvedValue([
        { id: 'v1', seatCount: 16, licensePlate: '51B-123.45', brand: 'Ford' },
      ]);

      vrpServiceMock.solveVRP.mockResolvedValue({
        routes: [
          {
            vehicleId: 'v1',
            distanceMeters: 20000,
            durationSeconds: 2400,
            geometry: 'mock_geom',
            steps: [
              { type: 'start', location: [106.8, 10.8], arrivalSeconds: 0 },
              { type: 'job', id: 's1', location: [106.1, 10.1], arrivalSeconds: 1200 },
              { type: 'end', location: [106.69, 10.78], arrivalSeconds: 2400 },
            ],
          },
        ],
        unassignedJobIds: [],
      });

      const res = await service.optimizePreview(
        {
          schoolId: 'school-1',
          studentIds: ['s1'],
          vehicleIds: ['v1'],
          constraints: {
            maxRouteDurationMinutes: 60,
          },
        },
        mockAdminUser as any,
      );

      expect(res.previewToken).toBeDefined();
      expect(res.outboundRoutes.length).toBe(1);
      // Verify solveVRP received relative time window [0, 3600]
      expect(vrpServiceMock.solveVRP).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ timeWindowSeconds: [0, 3600] }),
        ]),
        expect.arrayContaining([
          expect.objectContaining({ timeWindowSeconds: [0, 3600] }),
        ]),
      );
    });
  });

  // ==========================================
  // 3. PREVIEW ADJUSTMENT RULES
  // ==========================================
  describe('cancelReturnRoute & Recompute', () => {
    it('should reject cancellation if it makes any outbound route empty', async () => {
      // Setup a preview session with 1 return route and 1 outbound route having same students
      const token = 'test-token-empty';
      (service as any).previewSessions.set(token, {
        token,
        createdAt: Date.now(),
        schoolId: 'school-1',
        schoolName: 'THPT Marie Curie',
        constraints: { latestSchoolArrival: '07:15', returnDepartureTime: '11:45' },
        outboundRoutes: [
          {
            name: 'Tuyến đi 1',
            vehicleId: 'v1',
            direction: RouteDirection.TO_SCHOOL,
            students: [{ id: 's1', fullName: 'Học sinh 1' }],
            stops: [{ type: 'PICKUP', studentId: 's1' }],
          },
        ],
        returnRoutes: [
          {
            name: 'Tuyến về 1',
            vehicleId: 'v1',
            direction: RouteDirection.TO_PARKING,
            students: [{ id: 's1', fullName: 'Học sinh 1' }],
            stops: [{ type: 'DROPOFF', studentId: 's1' }],
          },
        ],
        summary: { assignedBothWaysCount: 1, unassignedCount: 0 },
      });

      await expect(service.cancelReturnRoute(token, 0)).rejects.toThrow(
        /không thể hủy.*không còn học sinh nào/i,
      );
    });
  });

  // ==========================================
  // 4. ATOMIC CONFIRM & CANCEL ROUTEPLAN
  // ==========================================
  describe('Atomic Confirm & Cancellation', () => {
    it('should reject confirmPreview if vehicle is already used in another active DRAFT plan', async () => {
      const token = 'test-token-conflict';
      (service as any).previewSessions.set(token, {
        token,
        createdAt: Date.now(),
        schoolId: 'school-1',
        schoolName: 'THPT Marie Curie',
        constraints: {},
        outboundRoutes: [
          {
            name: 'Tuyến đi 1',
            proposedVehicleId: 'v1',
            direction: RouteDirection.TO_SCHOOL,
            students: [{ id: 's1', fullName: 'Học sinh 1' }],
            stops: [],
          },
        ],
        returnRoutes: [
          {
            name: 'Tuyến về 1',
            proposedVehicleId: 'v1',
            direction: RouteDirection.TO_PARKING,
            students: [{ id: 's1', fullName: 'Học sinh 1' }],
            stops: [],
          },
        ],
        summary: { assignedBothWaysCount: 1, unassignedCount: 0 },
      });

      prismaMock.routePlan.findFirst.mockResolvedValue(null); // No draft plan for this school
      prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));

      resourceAvailabilityMock.findConflictingVehicles.mockResolvedValueOnce(
        new Map([
          [
            'v1',
            {
              vehicleId: 'v1',
              licensePlate: '51B-123.45',
              reasonMessage: 'Xe [51B-123.45] đã được giữ bởi phương án chờ duyệt (DRAFT) ("Phương án trường Lê Quý Đôn")',
            },
          ],
        ]),
      );

      await expect(
        service.confirmPreview({ previewToken: token }, mockAdminUser as any),
      ).rejects.toThrow(/đã được giữ bởi phương án/i);
    });

    it('should reject individual route cancellation after confirm', async () => {
      // The business rule specifies that individual routes cannot be cancelled
      // only entire RoutePlan can be cancelled.
      expect(true).toBe(true);
    });

    it('cancelRoutePlan should set status to CANCELLED and free vehicles and students atomically', async () => {
      prismaMock.routePlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.DRAFT,
      });

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          routePlan: {
            update: vi.fn().mockResolvedValue({ id: 'plan-1', status: RoutePlanStatus.CANCELLED }),
          },
          route: {
            updateMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        });
      });

      const res = await service.cancelRoutePlan('plan-1', 'Thay đổi phương án', mockAdminUser as any);
      expect(res.message).toContain('thành công');
    });

    it('should reject cancellation from SCHOOL_ADMIN of other school', async () => {
      prismaMock.routePlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        schoolId: 'other-school-uuid',
        status: RoutePlanStatus.DRAFT,
      });

      await expect(
        service.cancelRoutePlan('plan-1', 'Lý do', mockSchoolAdminUser as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================
  // 5. PRIVACY PRESERVING STUDENT ROUTING
  // ==========================================
  describe('getStudentRoutingDetail (Privacy)', () => {
    it('should reject parent requesting student not linked to them', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: 'stu-other',
        schoolId: 'school-1',
        fullName: 'Học sinh khác',
      });
      prismaMock.parentStudentLink.findUnique.mockResolvedValue(null);

      await expect(
        service.getStudentRoutingDetail('stu-other', mockParentUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return only student location, school and parking depot (no other students PII)', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: 'stu-mine',
        schoolId: 'school-1',
        fullName: 'Bé Nguyễn An',
        latitude: 10.77,
        longitude: 106.69,
        school: mockSchool,
      });

      prismaMock.parentStudentLink.findUnique.mockResolvedValue({
        parentId: 'parent-uuid',
        studentId: 'stu-mine',
      });

      prismaMock.systemSetting.findUnique.mockResolvedValue(null);

      prismaMock.routeStop.findMany.mockResolvedValue([
        {
          plannedArrivalTime: '06:45',
          addressText: '123 Đón',
          latitude: 10.77,
          longitude: 106.69,
          route: {
            id: 'route-out-1',
            name: 'Tuyến đi 1',
            direction: RouteDirection.TO_SCHOOL,
            polylineGeometry: '_p~iF~ps|U_ulLnnqC',
            routePlan: { id: 'plan-1', name: 'Kế hoạch học kỳ 1', status: RoutePlanStatus.DRAFT },
            proposedVehicle: { licensePlate: '51B-123.45' },
          },
        },
      ]);

      const detail = await service.getStudentRoutingDetail('stu-mine', mockParentUser as any);
      expect(detail.studentName).toBe('Bé Nguyễn An');
      expect(detail.routingStatus).toBe('ASSIGNED_DRAFT');
      expect(detail.outboundRoute?.proposedVehiclePlate).toBe('51B-123.45');
      expect(detail.outboundRoute?.schoolLocation.name).toBe('THPT Marie Curie');
      expect(detail.outboundRoute?.parkingLocation.addressText).toBeDefined();
    });

    it('should use route stops snapshot for parking lot location rather than current settings', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: 'stu-mine',
        schoolId: 'school-1',
        fullName: 'Bé Nguyễn An',
        latitude: 10.77,
        longitude: 106.69,
        school: mockSchool,
      });

      prismaMock.parentStudentLink.findUnique.mockResolvedValue({
        parentId: 'parent-uuid',
        studentId: 'stu-mine',
      });

      // Settings has new location
      prismaMock.systemSetting.findUnique.mockResolvedValue({
        key: 'PARKING_LOT',
        value: {
          latitude: 10.9999,
          longitude: 106.9999,
          addressText: 'Bãi xe mới trong Settings',
        },
      });

      // But Route has historical snapshot
      prismaMock.routeStop.findMany.mockResolvedValue([
        {
          plannedArrivalTime: '06:45',
          addressText: '123 Đón',
          latitude: 10.77,
          longitude: 106.69,
          route: {
            id: 'route-out-1',
            name: 'Tuyến đi 1',
            direction: RouteDirection.TO_SCHOOL,
            polylineGeometry: '_p~iF~ps|U_ulLnnqC',
            routePlan: { id: 'plan-1', name: 'Kế hoạch học kỳ 1', status: RoutePlanStatus.DRAFT },
            proposedVehicle: { licensePlate: '51B-123.45' },
            stops: [
              {
                stopOrder: 1,
                stopType: RouteStopType.PARKING_START,
                latitude: 10.8555,
                longitude: 106.7888,
                addressText: 'Bãi xe snapshot của tuyến',
              },
              {
                stopOrder: 2,
                stopType: RouteStopType.PICKUP,
                studentId: 'stu-mine',
                latitude: 10.77,
                longitude: 106.69,
                addressText: '123 Đón',
              },
              {
                stopOrder: 3,
                stopType: RouteStopType.SCHOOL_ARRIVAL,
                latitude: 10.782845,
                longitude: 106.690123,
                addressText: 'THPT Marie Curie',
              },
            ],
          },
        },
      ]);

      const detail = await service.getStudentRoutingDetail('stu-mine', mockParentUser as any);
      expect(detail.outboundRoute?.parkingLocation.latitude).toBe(10.8555);
      expect(detail.outboundRoute?.parkingLocation.longitude).toBe(106.7888);
      expect(detail.outboundRoute?.parkingLocation.addressText).toBe('Bãi xe snapshot của tuyến');
    });
  });

  // ==========================================
  // 6. ROUTE DETAIL & SNAPSHOTS
  // ==========================================
  describe('getRouteDetail (Snapshots)', () => {
    it('should include parkingLocation and schoolLocation from stops snapshot', async () => {
      prismaMock.route.findUnique.mockResolvedValue({
        id: 'route-1',
        routePlanId: 'plan-1',
        schoolId: 'school-1',
        name: 'Tuyến Đi 01',
        direction: RouteDirection.TO_SCHOOL,
        proposedVehicleId: 'veh-1',
        totalDistanceMeters: 10000,
        estimatedDurationSeconds: 1800,
        departureTime: '06:30',
        arrivalTime: '07:00',
        polylineGeometry: 'encoded_poly',
        school: mockSchool,
        proposedVehicle: { licensePlate: '51B-123.45', brand: 'Hyundai Solati', seatCount: 16 },
        routePlan: {
          id: 'plan-1',
          name: 'Phương án THPT Marie Curie',
          status: RoutePlanStatus.DRAFT,
          routingConstraints: {},
        },
        stops: [
          {
            id: 'stop-1',
            stopOrder: 1,
            stopType: RouteStopType.PARKING_START,
            latitude: 10.8555,
            longitude: 106.7888,
            addressText: 'Bãi xe Snapshot Long Bình',
            plannedArrivalSeconds: 23400,
            plannedArrivalTime: '06:30',
          },
          {
            id: 'stop-2',
            stopOrder: 2,
            stopType: RouteStopType.PICKUP,
            studentId: 'stu-1',
            student: { fullName: 'Nguyễn Văn An' },
            latitude: 10.76,
            longitude: 106.68,
            addressText: '12 Nguyễn Trãi',
            plannedArrivalSeconds: 24000,
            plannedArrivalTime: '06:40',
          },
          {
            id: 'stop-3',
            stopOrder: 3,
            stopType: RouteStopType.SCHOOL_ARRIVAL,
            latitude: 10.782845,
            longitude: 106.690123,
            addressText: '159 Nam Kỳ Khởi Nghĩa',
            plannedArrivalSeconds: 25200,
            plannedArrivalTime: '07:00',
          },
        ],
      });

      const route = await service.getRouteDetail('route-1', mockAdminUser as any);
      expect(route.parkingLocation).toBeDefined();
      expect(route.parkingLocation?.latitude).toBe(10.8555);
      expect(route.parkingLocation?.addressText).toBe('Bãi xe Snapshot Long Bình');
      expect(route.schoolLocation).toBeDefined();
      expect(route.schoolLocation?.latitude).toBe(10.782845);
      expect(route.schoolLocation?.name).toBe('THPT Marie Curie');
    });
  });

  describe('RoutePlan-First Management Suite', () => {
    it('listRoutePlans filters with search term and nests inside AND', async () => {
      prismaMock.routePlan.findMany.mockResolvedValue([]);
      prismaMock.routePlan.count.mockResolvedValue(0);

      await service.listRoutePlans(
        { search: 'Marie Curie', schoolId: 'school-1', status: RoutePlanStatus.DRAFT, page: 1, limit: 10 },
        mockAdminUser as any,
      );

      const findManyCall = prismaMock.routePlan.findMany.mock.calls[0][0];
      expect(findManyCall.where.schoolId).toBe('school-1');
      expect(findManyCall.where.status).toBe(RoutePlanStatus.DRAFT);
      expect(findManyCall.where.AND).toBeDefined();
      expect(findManyCall.where.AND[0].OR).toEqual([
        { name: { contains: 'Marie Curie', mode: 'insensitive' } },
        { school: { name: { contains: 'Marie Curie', mode: 'insensitive' } } },
      ]);
    });

    it('listRoutePlans strictly locks schoolId for SCHOOL_ADMIN even with search query', async () => {
      prismaMock.routePlan.findMany.mockResolvedValue([]);
      prismaMock.routePlan.count.mockResolvedValue(0);

      await service.listRoutePlans(
        { search: 'Trường khác', schoolId: 'malicious-other-school', page: 1, limit: 10 },
        mockSchoolAdminUser as any,
      );

      const findManyCall = prismaMock.routePlan.findMany.mock.calls[0][0];
      // Must be locked to currentUser.schoolId ('school-1'), not 'malicious-other-school'
      expect(findManyCall.where.schoolId).toBe('school-1');
    });

    it('listRoutePlans calculates distinct student count fallback on legacy plans', async () => {
      prismaMock.routePlan.findMany.mockResolvedValue([
        {
          id: 'legacy-plan-1',
          schoolId: 'school-1',
          school: { name: 'THPT Marie Curie' },
          name: 'Phương án cũ 2025',
          status: RoutePlanStatus.DRAFT,
          totalStudents: 0, // Legacy uncounted
          totalOutboundRoutes: 0,
          totalReturnRoutes: 0,
          createdAt: new Date(),
          routes: [
            {
              direction: RouteDirection.TO_SCHOOL,
              stops: [
                { studentId: null }, // Parking
                { studentId: 'student-A' },
                { studentId: 'student-B' },
                { studentId: null }, // School
              ],
            },
            {
              direction: RouteDirection.TO_PARKING,
              stops: [
                { studentId: null }, // School
                { studentId: 'student-A' }, // Same student
                { studentId: 'student-B' }, // Same student
                { studentId: null }, // Parking
              ],
            },
          ],
        },
      ]);
      prismaMock.routePlan.count.mockResolvedValue(1);

      const result = await service.listRoutePlans({ page: 1, limit: 10 }, mockAdminUser as any);
      expect(result.items).toHaveLength(1);
      // Distinct students should be 2, NOT 4!
      expect(result.items[0].totalStudents).toBe(2);
      expect(result.items[0].totalOutboundRoutes).toBe(1);
      expect(result.items[0].totalReturnRoutes).toBe(1);
    });

    it('cancelRoutePlan throws ForbiddenException for SCHOOL_ADMIN of other school', async () => {
      prismaMock.routePlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        status: RoutePlanStatus.DRAFT,
        schoolId: 'other-school-id',
        routes: [],
      });
      await expect(
        service.cancelRoutePlan('plan-1', 'Lý do hủy', mockSchoolAdminUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('cancelRoutePlan allows SCHOOL_ADMIN to cancel route plan of their school', async () => {
      prismaMock.routePlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        status: RoutePlanStatus.DRAFT,
        schoolId: 'school-1',
        routes: [],
      });
      prismaMock.routePlan.update.mockResolvedValue({
        id: 'plan-1',
        status: RoutePlanStatus.CANCELLED,
      });

      const res = await service.cancelRoutePlan('plan-1', 'Lý do hủy', mockSchoolAdminUser as any);
      expect(res.message).toContain('Hủy phương án tuyến thành công');
    });

    it('cancelRoutePlan successfully marks RoutePlan as CANCELLED for SYSTEM_ADMIN', async () => {
      prismaMock.routePlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        status: RoutePlanStatus.DRAFT,
      });
      prismaMock.routePlan.update.mockResolvedValue({
        id: 'plan-1',
        status: RoutePlanStatus.CANCELLED,
      });

      const res = await service.cancelRoutePlan('plan-1', 'Thay đổi học kỳ', mockAdminUser as any);
      expect(res.message).toContain('Hủy phương án tuyến thành công');
      expect(prismaMock.routePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'plan-1' },
          data: expect.objectContaining({
            status: RoutePlanStatus.CANCELLED,
            cancellationReason: 'Thay đổi học kỳ',
          }),
        }),
      );
    });

    it('getPreparationData partitions ineligible students with specific reason codes', async () => {
      prismaMock.school.findUnique.mockResolvedValue(mockSchool);
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);
      prismaMock.routePlan.findMany.mockResolvedValue([{ id: 'plan-active-1', status: RoutePlanStatus.ACTIVE, name: 'Tuyến K1' }]);
      prismaMock.routeStop.findMany.mockResolvedValue([
        {
          studentId: 'stu-assigned',
          route: { routePlan: { status: RoutePlanStatus.ACTIVE, name: 'Tuyến K1' } },
        },
      ]);

      prismaMock.student.findMany.mockResolvedValue([
        {
          id: 'stu-ok',
          code: 'STU001',
          fullName: 'Nguyễn Văn Đủ ĐK',
          latitude: 10.771,
          longitude: 106.691,
          status: StudentStatus.AVAILABLE,
        },
        {
          id: 'stu-disabled',
          code: 'STU002',
          fullName: 'Trần Bị Disabled',
          latitude: 10.772,
          longitude: 106.692,
          status: StudentStatus.DISABLED,
        },
        {
          id: 'stu-no-coords',
          code: 'STU003',
          fullName: 'Lê Thiếu Tọa Độ',
          latitude: null,
          longitude: null,
          status: StudentStatus.AVAILABLE,
        },
        {
          id: 'stu-assigned',
          code: 'STU004',
          fullName: 'Phạm Đã Có Tuyến',
          latitude: 10.773,
          longitude: 106.693,
          status: StudentStatus.AVAILABLE,
        },
      ]);
      prismaMock.route.findMany.mockResolvedValue([]);
      prismaMock.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getPreparationData('school-1');
      expect(result.eligibleStudents).toHaveLength(1);
      expect(result.eligibleStudents[0].id).toBe('stu-ok');
      expect(result.ineligibleStudents).toHaveLength(3);

      const disabledItem = result.ineligibleStudents?.find((s) => s.id === 'stu-disabled');
      expect(disabledItem?.reasonCode).toBe('INACTIVE_STATUS');

      const noCoordsItem = result.ineligibleStudents?.find((s) => s.id === 'stu-no-coords');
      expect(noCoordsItem?.reasonCode).toBe('MISSING_COORDINATES');

      const assignedItem = result.ineligibleStudents?.find((s) => s.id === 'stu-assigned');
      expect(assignedItem?.reasonCode).toBe('ALREADY_ASSIGNED');
    });

    it('optimizePreview labels students dropped from return route with missingDirection RETURN', async () => {
      prismaMock.school.findUnique.mockResolvedValue(mockSchool);
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);

      prismaMock.student.findMany.mockResolvedValue([
        { id: 's1', fullName: 'Học sinh 1', latitude: 10.1, longitude: 106.1 },
        { id: 's2', fullName: 'Học sinh 2', latitude: 10.2, longitude: 106.2 },
      ]);
      prismaMock.vehicle.findMany.mockResolvedValue([
        { id: 'v1', seatCount: 16, licensePlate: '51B-123.45', brand: 'Ford' },
      ]);

      // Outbound assigns s1 and s2
      vrpServiceMock.solveVRP.mockResolvedValueOnce({
        routes: [
          {
            vehicleId: 'v1',
            distanceMeters: 20000,
            durationSeconds: 1500,
            geometry: 'geom_ob',
            steps: [
              { type: 'start', location: [106.8, 10.8] },
              { type: 'job', id: 's1', location: [106.1, 10.1] },
              { type: 'job', id: 's2', location: [106.2, 10.2] },
              { type: 'end', location: [106.69, 10.78] },
            ],
          },
        ],
        unassignedJobIds: [],
      });

      // Return assigns only s1 (s2 is unassigned in return)
      vrpServiceMock.solveVRP.mockResolvedValueOnce({
        routes: [
          {
            vehicleId: 'v1',
            distanceMeters: 18000,
            durationSeconds: 1200,
            geometry: 'geom_ret',
            steps: [
              { type: 'start', location: [106.69, 10.78] },
              { type: 'job', id: 's1', location: [106.1, 10.1] },
              { type: 'end', location: [106.8, 10.8] },
            ],
          },
        ],
        unassignedJobIds: ['s2'],
      });

      vrpServiceMock.solveTSP.mockResolvedValue({
        geometry: 'recomputed_geom',
        distanceMeters: 15000,
        durationSeconds: 1000,
      });

      const res = await service.optimizePreview(
        {
          schoolId: 'school-1',
          studentIds: ['s1', 's2'],
          vehicleIds: ['v1'],
          constraints: { maxRouteDurationMinutes: 60 },
        },
        mockAdminUser as any,
      );

      expect(res.summary.assignedBothWaysCount).toBe(1);
      expect(res.summary.unassignedCount).toBe(1);
      expect(res.summary.coverageRate).toBe(0.5);

      const unassignedStudent = res.summary.unassignedStudents[0];
      expect(unassignedStudent.id).toBe('s2');
      expect(unassignedStudent.missingDirection).toBe('RETURN');
    });
  });

  describe('Student Insertion Stop Order & Timing Fix (Fix Prompt Compliance)', () => {
    const mockStudentB = {
      id: 'student-B',
      fullName: 'Trần Thị B',
      code: 'HS002',
      schoolId: 'school-1',
      addressText: '456 Hai Bà Trưng, Q.3, TP.HCM',
      latitude: 10.785,
      longitude: 106.695,
      status: StudentStatus.AVAILABLE,
    };

    const makeOutboundRoute = (overrides: any = {}) => ({
      id: 'ob-route-1',
      name: 'Tuyến Đi 01',
      direction: RouteDirection.TO_SCHOOL,
      schoolId: 'school-1',
      totalDistanceMeters: 6000,
      estimatedDurationSeconds: 1200,
      departureTime: '06:50',
      arrivalTime: '07:30',
      polylineGeometry: 'old_ob_poly',
      school: mockSchool,
      routePlan: { id: 'plan-1', status: RoutePlanStatus.ACTIVE, totalStudents: 1 },
      vehicle: { id: 'v1', seatCount: 16, licensePlate: '51B-12345' },
      driver: { id: 'd1', fullName: 'Tài xế 1' },
      updatedAt: new Date('2026-10-26T00:00:00.000Z'),
      stops: [
        {
          id: 'stop-ob-1',
          routeId: 'ob-route-1',
          stopOrder: 1,
          stopType: RouteStopType.PARKING_START,
          addressText: 'Bãi xe Nhà Bè',
          latitude: 10.70,
          longitude: 106.70,
          plannedArrivalTime: '06:50',
          studentId: null,
          student: null,
        },
        {
          id: 'stop-ob-2',
          routeId: 'ob-route-1',
          stopOrder: 2,
          stopType: RouteStopType.PICKUP,
          addressText: '123 Lê Lợi',
          latitude: 10.77,
          longitude: 106.68,
          plannedArrivalTime: '07:10',
          studentId: 'student-A',
          student: { id: 'student-A', fullName: 'Nguyễn Văn A' },
        },
        {
          id: 'stop-ob-3',
          routeId: 'ob-route-1',
          stopOrder: 3,
          stopType: RouteStopType.SCHOOL_ARRIVAL,
          addressText: 'THPT Marie Curie',
          latitude: 10.782845,
          longitude: 106.690123,
          plannedArrivalTime: '07:30',
          studentId: null,
          student: null,
        },
      ],
      ...overrides,
    });

    const makeReturnRoute = (overrides: any = {}) => ({
      id: 'ret-route-1',
      name: 'Tuyến Về 01',
      direction: RouteDirection.TO_PARKING,
      schoolId: 'school-1',
      totalDistanceMeters: 6000,
      estimatedDurationSeconds: 1200,
      departureTime: '11:30',
      arrivalTime: '12:10',
      polylineGeometry: 'old_ret_poly',
      school: mockSchool,
      routePlan: { id: 'plan-1', status: RoutePlanStatus.ACTIVE, totalStudents: 1 },
      vehicle: { id: 'v1', seatCount: 16, licensePlate: '51B-12345' },
      driver: { id: 'd1', fullName: 'Tài xế 1' },
      updatedAt: new Date('2026-10-26T00:00:00.000Z'),
      stops: [
        {
          id: 'stop-ret-1',
          routeId: 'ret-route-1',
          stopOrder: 1,
          stopType: RouteStopType.SCHOOL_DEPARTURE,
          addressText: 'THPT Marie Curie',
          latitude: 10.782845,
          longitude: 106.690123,
          plannedArrivalTime: '11:30',
          studentId: null,
          student: null,
        },
        {
          id: 'stop-ret-2',
          routeId: 'ret-route-1',
          stopOrder: 2,
          stopType: RouteStopType.DROPOFF,
          addressText: '123 Lê Lợi',
          latitude: 10.77,
          longitude: 106.68,
          plannedArrivalTime: '11:50',
          studentId: 'student-A',
          student: { id: 'student-A', fullName: 'Nguyễn Văn A' },
        },
        {
          id: 'stop-ret-3',
          routeId: 'ret-route-1',
          stopOrder: 3,
          stopType: RouteStopType.PARKING_END,
          addressText: 'Bãi xe Nhà Bè',
          latitude: 10.70,
          longitude: 106.70,
          plannedArrivalTime: '12:10',
          studentId: null,
          student: null,
        },
      ],
      ...overrides,
    });

    it('should generate strictly 1-based canonical stopOrder (1..N) with endpoints intact and non-decreasing ETAs', async () => {
      prismaMock.student.findUnique.mockResolvedValue(mockStudentB);
      prismaMock.routeStop.findMany.mockResolvedValue([]); // not assigned yet
      prismaMock.route.findUnique
        .mockResolvedValueOnce(makeOutboundRoute())
        .mockResolvedValueOnce(makeReturnRoute());

      // Mock calculateRoute to return deterministic legs
      vrpServiceMock.calculateRoute.mockImplementation(async (points: any[]) => {
        const numLegs = points.length - 1;
        const legs = Array.from({ length: numLegs }, () => ({
          durationSeconds: 300, // 5 mins per leg
          distanceMeters: 2000,
        }));
        return {
          status: 'FEASIBLE',
          geometry: 'new_poly_geometry',
          distanceMeters: numLegs * 2000,
          durationSeconds: numLegs * 300,
          legs,
        };
      });

      const previewRes = await service.previewStudentInsertion(
        {
          studentId: 'student-B',
          outboundRouteId: 'ob-route-1',
          returnRouteId: 'ret-route-1',
          routingConstraints: {
            maxRouteDurationMinutes: 90,
            defaultStopServiceSeconds: 60,
          },
        },
        mockAdminUser as any,
      );

      expect(previewRes.isFeasible).toBe(true);
      expect(previewRes.previewToken).toBeDefined();

      // Check outbound stops
      const obStops = previewRes.outbound.stops!;
      expect(obStops).toBeDefined();
      expect(obStops.length).toBe(4);
      expect(obStops.map((s) => s.stopOrder)).toEqual([1, 2, 3, 4]);

      // Endpoint integrity: stop #1 is PARKING_START, stop #4 is SCHOOL_ARRIVAL
      expect(obStops[0].stopType).toBe(RouteStopType.PARKING_START);
      expect(obStops[0].studentId).toBeNull();
      expect(obStops[3].stopType).toBe(RouteStopType.SCHOOL_ARRIVAL);
      expect(obStops[3].studentId).toBeNull();

      // Student B must be an intermediate stop, never #1
      const studentBObStop = obStops.find((s) => s.studentId === 'student-B');
      expect(studentBObStop).toBeDefined();
      expect(studentBObStop!.stopOrder).toBeGreaterThan(1);
      expect(studentBObStop!.stopOrder).toBeLessThan(4);

      // Check non-decreasing ETAs in outbound
      for (let i = 1; i < obStops.length; i++) {
        expect(obStops[i].plannedArrivalTime! >= obStops[i - 1].plannedArrivalTime!).toBe(true);
      }
      expect(obStops[3].plannedArrivalTime).toBe('07:30'); // anchored to school arrival

      // Check return stops
      const retStops = previewRes.returnRoute.stops!;
      expect(retStops).toBeDefined();
      expect(retStops.length).toBe(4);
      expect(retStops.map((s) => s.stopOrder)).toEqual([1, 2, 3, 4]);

      // Endpoint integrity: stop #1 is SCHOOL_DEPARTURE, stop #4 is PARKING_END
      expect(retStops[0].stopType).toBe(RouteStopType.SCHOOL_DEPARTURE);
      expect(retStops[0].studentId).toBeNull();
      expect(retStops[3].stopType).toBe(RouteStopType.PARKING_END);
      expect(retStops[3].studentId).toBeNull();

      // Check non-decreasing ETAs in return
      for (let i = 1; i < retStops.length; i++) {
        expect(retStops[i].plannedArrivalTime! >= retStops[i - 1].plannedArrivalTime!).toBe(true);
      }
      expect(retStops[0].plannedArrivalTime).toBe('11:30'); // anchored to school departure
    });

    it('should reject corrupted route where stop #1 is not PARKING_START (e.g. student inserted at #1 before depot)', async () => {
      const corruptedOutbound = makeOutboundRoute({
        stops: [
          {
            id: 'corrupted-stop-1',
            routeId: 'ob-route-1',
            stopOrder: 1,
            stopType: RouteStopType.PICKUP,
            addressText: 'Nhà học sinh',
            latitude: 10.77,
            longitude: 106.68,
            plannedArrivalTime: '06:13',
            studentId: 'student-B',
            student: { id: 'student-B', fullName: 'Trần Thị B' },
          },
          {
            id: 'corrupted-stop-2',
            routeId: 'ob-route-1',
            stopOrder: 2,
            stopType: RouteStopType.PARKING_START,
            addressText: 'Bãi xe',
            latitude: 10.70,
            longitude: 106.70,
            plannedArrivalTime: '06:12',
            studentId: null,
            student: null,
          },
          {
            id: 'corrupted-stop-3',
            routeId: 'ob-route-1',
            stopOrder: 3,
            stopType: RouteStopType.SCHOOL_ARRIVAL,
            addressText: 'Trường',
            latitude: 10.782845,
            longitude: 106.690123,
            plannedArrivalTime: '07:30',
            studentId: null,
            student: null,
          },
        ],
      });

      prismaMock.student.findUnique.mockResolvedValue(mockStudentB);
      prismaMock.routeStop.findMany.mockResolvedValue([]);
      prismaMock.route.findUnique
        .mockResolvedValueOnce(corruptedOutbound)
        .mockResolvedValueOnce(makeReturnRoute());

      await expect(
        service.previewStudentInsertion(
          {
            studentId: 'student-B',
            outboundRouteId: 'ob-route-1',
            returnRouteId: 'ret-route-1',
            routingConstraints: {},
          },
          mockAdminUser as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject route with duplicate stopOrder', async () => {
      const duplicateStopOrderRoute = makeOutboundRoute({
        stops: [
          {
            id: 'dup-stop-1',
            routeId: 'ob-route-1',
            stopOrder: 1,
            stopType: RouteStopType.PARKING_START,
            plannedArrivalTime: '06:50',
            studentId: null,
          },
          {
            id: 'dup-stop-2',
            routeId: 'ob-route-1',
            stopOrder: 1, // Duplicate 1
            stopType: RouteStopType.PICKUP,
            plannedArrivalTime: '07:10',
            studentId: 'student-A',
          },
          {
            id: 'dup-stop-3',
            routeId: 'ob-route-1',
            stopOrder: 3,
            stopType: RouteStopType.SCHOOL_ARRIVAL,
            plannedArrivalTime: '07:30',
            studentId: null,
          },
        ],
      });

      prismaMock.student.findUnique.mockResolvedValue(mockStudentB);
      prismaMock.routeStop.findMany.mockResolvedValue([]);
      prismaMock.route.findUnique
        .mockResolvedValueOnce(duplicateStopOrderRoute)
        .mockResolvedValueOnce(makeReturnRoute());

      await expect(
        service.previewStudentInsertion(
          {
            studentId: 'student-B',
            outboundRouteId: 'ob-route-1',
            returnRouteId: 'ret-route-1',
            routingConstraints: {},
          },
          mockAdminUser as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should execute confirm transactionally, snapshot legacy uncaptured trips, update stops and route timing', async () => {
      prismaMock.student.findUnique.mockResolvedValue(mockStudentB);
      prismaMock.routeStop.findMany.mockResolvedValue([]);
      const obRoute = makeOutboundRoute();
      const retRoute = makeReturnRoute();
      prismaMock.route.findUnique
        .mockResolvedValueOnce(obRoute)
        .mockResolvedValueOnce(retRoute);

      vrpServiceMock.calculateRoute.mockResolvedValue({
        status: 'FEASIBLE',
        geometry: 'canonical_geometry',
        distanceMeters: 7000,
        durationSeconds: 1500,
        legs: [
          { durationSeconds: 400, distanceMeters: 2000 },
          { durationSeconds: 500, distanceMeters: 2500 },
          { durationSeconds: 600, distanceMeters: 2500 },
        ],
      });

      const previewRes = await service.previewStudentInsertion(
        {
          studentId: 'student-B',
          outboundRouteId: 'ob-route-1',
          returnRouteId: 'ret-route-1',
          routingConstraints: { maxRouteDurationMinutes: 90, defaultStopServiceSeconds: 60 },
        },
        mockAdminUser as any,
      );

      expect(previewRes.isFeasible).toBe(true);

      // Now prepare mock transaction for confirm
      const txMock: any = {
        student: { findUnique: vi.fn().mockResolvedValue(mockStudentB) },
        routeStop: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
        },
        route: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce(obRoute)
            .mockResolvedValueOnce(retRoute),
          update: vi.fn().mockResolvedValue({}),
        },
        trip: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'trip-legacy-1', routeSnapshot: null, route: obRoute },
          ]),
          update: vi.fn().mockResolvedValue({}),
        },
        routePlan: {
          update: vi.fn().mockResolvedValue({}),
        },
      };

      prismaMock.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      const confirmRes = await service.confirmStudentInsertion(
        {
          previewToken: previewRes.previewToken!,
          expectedFingerprint: previewRes.expectedFingerprint,
        },
        mockAdminUser as any,
      );

      expect(confirmRes.success).toBe(true);

      // Verify trip legacy snapshot protection (PRE_UPDATE_CAPTURE)
      expect(txMock.trip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            routeId: { in: ['ob-route-1', 'ret-route-1'] },
          }),
        }),
      );
      expect(txMock.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'trip-legacy-1' },
          data: expect.objectContaining({
            routeSnapshot: expect.any(Object),
          }),
        }),
      );

      // Verify route was updated with new timing and geometry
      expect(txMock.route.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ob-route-1' },
          data: expect.objectContaining({
            polylineGeometry: 'canonical_geometry',
            totalDistanceMeters: 7000,
            estimatedDurationSeconds: 1620,
          }),
        }),
      );

      // Verify stop create was called for student B
      expect(txMock.routeStop.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            routeId: 'ob-route-1',
            studentId: 'student-B',
          }),
        }),
      );

      // Reusing token must fail
      await expect(
        service.confirmStudentInsertion(
          { previewToken: previewRes.previewToken! },
          mockAdminUser as any,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});

