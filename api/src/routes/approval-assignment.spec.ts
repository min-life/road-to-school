import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoutesService } from './routes.service.js';
import { VietMapVRPService } from './vietmap-vrp.service.js';
import { ResourceAvailabilityService } from './resource-availability.service.js';
import { Role, RouteDirection, RoutePlanStatus } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Approval & Assignment Groups Business Rules', () => {
  let service: RoutesService;
  let resourceService: ResourceAvailabilityService;
  let prismaMock: any;
  let vrpServiceMock: any;

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

  beforeEach(() => {
    prismaMock = {
      routePlan: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      route: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
      vehicle: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      school: {
        findUnique: vi.fn(),
      },
      trip: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(prismaMock);
        }
        return cb;
      }),
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

    resourceService = new ResourceAvailabilityService(prismaMock);
    service = new RoutesService(prismaMock, vrpServiceMock as unknown as VietMapVRPService, resourceService);
  });

  describe('RoutePlan Cancellation Invariant', () => {
    it('should ALLOW cancellation if RoutePlan is ACTIVE (PO Lifecycle Decision)', async () => {
      prismaMock.routePlan.findUnique.mockResolvedValue({
        id: 'plan-active-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.ACTIVE,
        routes: [],
      });
      prismaMock.routePlan.update.mockResolvedValue({
        id: 'plan-active-1',
        status: RoutePlanStatus.CANCELLED,
      });

      const res = await service.cancelRoutePlan('plan-active-1', 'Hủy phương án', mockAdminUser as any);
      expect(res.message).toContain('Hủy phương án tuyến thành công');
    });

    it('should REJECT cancellation if RoutePlan is already CANCELLED', async () => {
      prismaMock.routePlan.findUnique.mockResolvedValue({
        id: 'plan-cancelled-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.CANCELLED,
        routes: [],
      });

      await expect(
        service.cancelRoutePlan('plan-cancelled-1', 'Hủy lại', mockAdminUser as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Approval Ownership (Rule 3.2)', () => {
    it('should REJECT SYSTEM_ADMIN from approving RoutePlan (ForbiddenException)', async () => {
      await expect(
        service.approveRoutePlan('plan-draft-1', mockAdminUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should REJECT SCHOOL_ADMIN from approving a RoutePlan belonging to another school', async () => {
      prismaMock.routePlan.findUnique.mockResolvedValue({
        id: 'plan-draft-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.DRAFT,
      });

      await expect(
        service.approveRoutePlan('plan-draft-1', mockOtherSchoolAdminUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should REJECT approval if RoutePlan is already ACTIVE', async () => {
      prismaMock.routePlan.findUnique.mockResolvedValue({
        id: 'plan-active-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.ACTIVE,
      });

      await expect(
        service.approveRoutePlan('plan-active-1', mockSchoolAdminUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT approval if RoutePlan is NOT ready (missing resources)', async () => {
      prismaMock.routePlan.findUnique.mockResolvedValue({
        id: 'plan-draft-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.DRAFT,
        school: {
          id: 'school-1',
          name: 'THPT Marie Curie',
          contractStartDate: new Date('2026-01-01'),
          contractEndDate: new Date('2027-01-01'),
          weeklySchedule: {},
        },
        routes: [
          {
            id: 'route-1',
            proposedVehicleId: null, // Missing vehicle!
            defaultDriverId: null,
            defaultBusAttendantId: null,
            stops: [],
          },
        ],
      });

      await expect(
        service.approveRoutePlan('plan-draft-1', mockSchoolAdminUser as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Group Consistency & Resource Assignments (Rule 4)', () => {
    it('should REJECT SCHOOL_ADMIN from replacing vehicle group (SYSTEM_ADMIN only)', async () => {
      await expect(
        service.replaceVehicleGroup(
          'plan-1',
          { currentVehicleId: 'v1', newVehicleId: 'v2' },
          mockSchoolAdminUser as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should REJECT SCHOOL_ADMIN from replacing driver group (SYSTEM_ADMIN only)', async () => {
      await expect(
        service.assignDriverGroup(
          'plan-1',
          { vehicleId: 'v1', driverId: 'd1' },
          mockSchoolAdminUser as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should REJECT SYSTEM_ADMIN from replacing bus attendant group (SCHOOL_ADMIN only)', async () => {
      await expect(
        service.assignBusAttendantGroup(
          'plan-1',
          { vehicleId: 'v1', busAttendantId: 'ba1' },
          mockAdminUser as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should REJECT null driver when RoutePlan is ACTIVE', async () => {
      prismaMock.routePlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        schoolId: 'school-1',
        status: RoutePlanStatus.ACTIVE,
      });

      await expect(
        service.assignDriverGroup(
          'plan-1',
          { vehicleId: 'v1', driverId: '' },
          mockAdminUser as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
