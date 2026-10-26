import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ResourceAvailabilityService,
  isContractOverlap,
  toDateString,
} from './resource-availability.service.js';
import { RoutePlanStatus } from '@prisma/client';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('ResourceAvailabilityService — Vehicle Availability & Reservation (BR-V01 to BR-V05)', () => {
  let service: ResourceAvailabilityService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      school: {
        findUnique: vi.fn(),
      },
      routePlan: {
        findUnique: vi.fn(),
      },
      route: {
        findMany: vi.fn(),
      },
      vehicle: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    };

    service = new ResourceAvailabilityService(prismaMock);
  });

  // ========================================================
  // 1. DATE-ONLY CONTRACT OVERLAP SEMANTICS (BR-V03)
  // ========================================================
  describe('isContractOverlap (Date-Only Semantics)', () => {
    it('should return true when periods overlap', () => {
      // 2026-10-01 - 2026-12-31 and 2026-11-01 - 2027-01-31
      expect(
        isContractOverlap(
          new Date('2026-10-01T00:00:00.000Z'),
          new Date('2026-12-31T00:00:00.000Z'),
          new Date('2026-11-01T00:00:00.000Z'),
          new Date('2027-01-31T00:00:00.000Z'),
        ),
      ).toBe(true);
    });

    it('should return true when period A is entirely inside period B', () => {
      expect(
        isContractOverlap(
          '2026-10-15',
          '2026-11-15',
          '2026-10-01',
          '2026-12-31',
        ),
      ).toBe(true);
    });

    it('should return true on single-day boundary contact (startA <= endB && startB <= endA)', () => {
      expect(
        isContractOverlap(
          '2026-10-01',
          '2026-10-31',
          '2026-10-31',
          '2026-11-30',
        ),
      ).toBe(true);
    });

    it('should return false when periods are strictly disjoint (A before B)', () => {
      expect(
        isContractOverlap(
          '2026-01-01',
          '2026-05-31',
          '2026-06-01',
          '2026-12-31',
        ),
      ).toBe(false);
    });

    it('should return false when periods are strictly disjoint (A after B)', () => {
      expect(
        isContractOverlap(
          '2027-01-01',
          '2027-06-30',
          '2026-01-01',
          '2026-12-31',
        ),
      ).toBe(false);
    });
  });

  // ========================================================
  // 2. FIND CONFLICTING VEHICLES (BR-V01, BR-V02, BR-V04, BR-V05)
  // ========================================================
  describe('findConflictingVehicles', () => {
    const targetSchool = {
      id: 'target-school-id',
      name: 'Trường Tiểu học Marie Curie',
      contractStartDate: new Date('2026-10-01'),
      contractEndDate: new Date('2026-12-31'),
    };

    it('should detect conflict when vehicle is reserved in a DRAFT RoutePlan (BR-V02)', async () => {
      prismaMock.school.findUnique.mockResolvedValue(targetSchool);

      prismaMock.route.findMany.mockResolvedValue([
        {
          proposedVehicleId: 'veh-1',
          proposedVehicle: {
            id: 'veh-1',
            licensePlate: '51B-123.45',
            brand: 'Hyundai Solati',
            seatCount: 16,
          },
          routePlan: {
            id: 'plan-draft-1',
            name: 'Phương án DRAFT Kỳ 1',
            status: RoutePlanStatus.DRAFT,
            schoolId: 'other-school-id',
            school: {
              id: 'other-school-id',
              name: 'Trường Vinschool',
              contractStartDate: new Date('2026-11-01'),
              contractEndDate: new Date('2027-01-31'),
            },
          },
        },
      ]);

      const conflicts = await service.findConflictingVehicles(
        ['veh-1'],
        targetSchool.id,
      );

      expect(conflicts.has('veh-1')).toBe(true);
      const conflict = conflicts.get('veh-1')!;
      expect(conflict.reasonCode).toBe('RESERVED_BY_DRAFT_PLAN');
      expect(conflict.conflictingPlanStatus).toBe(RoutePlanStatus.DRAFT);
      expect(conflict.conflictingSchoolName).toBe('Trường Vinschool');
      expect(conflict.reasonMessage).toContain('51B-123.45');
      expect(conflict.reasonMessage).toContain('chờ duyệt (DRAFT)');
    });

    it('should detect conflict when vehicle is reserved in an ACTIVE RoutePlan (BR-V01)', async () => {
      prismaMock.school.findUnique.mockResolvedValue(targetSchool);

      prismaMock.route.findMany.mockResolvedValue([
        {
          proposedVehicleId: 'veh-2',
          proposedVehicle: {
            id: 'veh-2',
            licensePlate: '51B-678.90',
            brand: 'Thaco Town',
            seatCount: 29,
          },
          routePlan: {
            id: 'plan-active-1',
            name: 'Phương án Tuyến Năm học 2026',
            status: RoutePlanStatus.ACTIVE,
            schoolId: 'target-school-id', // Same school!
            school: targetSchool,
          },
        },
      ]);

      const conflicts = await service.findConflictingVehicles(
        ['veh-2'],
        targetSchool.id,
      );

      expect(conflicts.has('veh-2')).toBe(true);
      const conflict = conflicts.get('veh-2')!;
      expect(conflict.reasonCode).toBe('RESERVED_BY_ACTIVE_PLAN');
      expect(conflict.conflictingPlanStatus).toBe(RoutePlanStatus.ACTIVE);
      expect(conflict.reasonMessage).toContain('cùng trường này');
    });

    it('should NOT detect conflict if contract periods do not overlap', async () => {
      prismaMock.school.findUnique.mockResolvedValue(targetSchool);

      prismaMock.route.findMany.mockResolvedValue([
        {
          proposedVehicleId: 'veh-3',
          proposedVehicle: {
            id: 'veh-3',
            licensePlate: '51B-333.33',
            brand: 'Ford Transit',
            seatCount: 16,
          },
          routePlan: {
            id: 'plan-future-1',
            name: 'Phương án Hè 2027',
            status: RoutePlanStatus.ACTIVE,
            schoolId: 'other-school-id',
            school: {
              id: 'other-school-id',
              name: 'Trường Quốc tế Úc',
              contractStartDate: new Date('2027-06-01'),
              contractEndDate: new Date('2027-08-31'),
            },
          },
        },
      ]);

      const conflicts = await service.findConflictingVehicles(
        ['veh-3'],
        targetSchool.id,
      );

      expect(conflicts.has('veh-3')).toBe(false);
    });

    it('should NOT self-conflict when excludePlanId is provided (BR-V04)', async () => {
      prismaMock.school.findUnique.mockResolvedValue(targetSchool);

      // Prisma query will be called with routePlanId: { not: 'plan-current' }
      // Simulating database returning empty because it excluded the current plan
      prismaMock.route.findMany.mockResolvedValue([]);

      const conflicts = await service.findConflictingVehicles(
        ['veh-1'],
        targetSchool.id,
        'plan-current',
      );

      expect(conflicts.has('veh-1')).toBe(false);
      expect(prismaMock.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            routePlanId: { not: 'plan-current' },
          }),
        }),
      );
    });
  });

  // ========================================================
  // 3. VALIDATE VEHICLE FOR GROUP REPLACEMENT (Gate 4)
  // ========================================================
  describe('validateVehicleForGroup (Replacement)', () => {
    it('should throw ConflictException if newVehicle is reserved in an overlapping contract RoutePlan', async () => {
      const plan = {
        id: 'plan-1',
        schoolId: 'school-1',
        school: {
          id: 'school-1',
          name: 'THPT Lê Hồng Phong',
          contractStartDate: new Date('2026-10-01'),
          contractEndDate: new Date('2026-12-31'),
        },
        routes: [
          {
            id: 'route-1',
            name: 'Tuyến 1',
            proposedVehicleId: 'veh-old',
            stops: [{ studentId: 's1' }],
          },
        ],
      };

      prismaMock.routePlan.findUnique.mockResolvedValue(plan);
      prismaMock.vehicle.findUnique.mockResolvedValue({
        id: 'veh-new',
        licensePlate: '51B-888.88',
        seatCount: 29,
      });

      // Target school for findConflictingVehicles
      prismaMock.school.findUnique.mockResolvedValue(plan.school);

      // Simulating findConflictingVehicles finding veh-new in a DRAFT plan
      prismaMock.route.findMany.mockResolvedValue([
        {
          proposedVehicleId: 'veh-new',
          proposedVehicle: {
            id: 'veh-new',
            licensePlate: '51B-888.88',
            brand: 'Thaco',
            seatCount: 29,
          },
          routePlan: {
            id: 'other-plan-draft',
            name: 'Phương án DRAFT khác',
            status: RoutePlanStatus.DRAFT,
            schoolId: 'school-2',
            school: {
              id: 'school-2',
              name: 'THPT Nguyễn Thị Minh Khai',
              contractStartDate: new Date('2026-10-15'),
              contractEndDate: new Date('2026-11-15'),
            },
          },
        },
      ]);

      await expect(
        service.validateVehicleForGroup('plan-1', 'veh-old', 'veh-new'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ========================================================
  // 4. GET CANDIDATE VEHICLES (Gate 4)
  // ========================================================
  describe('getCandidateVehicles', () => {
    it('should mark reserved vehicle as ineligible with clear reason message', async () => {
      const plan = {
        id: 'plan-1',
        schoolId: 'school-1',
        school: {
          id: 'school-1',
          name: 'THPT Lê Hồng Phong',
          contractStartDate: new Date('2026-10-01'),
          contractEndDate: new Date('2026-12-31'),
        },
        routes: [
          {
            id: 'route-1',
            name: 'Tuyến 1',
            proposedVehicleId: 'veh-old',
            stops: [{ studentId: 's1' }],
          },
        ],
      };

      prismaMock.routePlan.findUnique.mockResolvedValue(plan);
      prismaMock.school.findUnique.mockResolvedValue(plan.school);

      // veh-conflict is reserved in an overlapping plan
      prismaMock.route.findMany.mockResolvedValue([
        {
          proposedVehicleId: 'veh-conflict',
          proposedVehicle: {
            id: 'veh-conflict',
            licensePlate: '51B-999.99',
            brand: 'Hyundai',
            seatCount: 29,
          },
          routePlan: {
            id: 'other-active-plan',
            name: 'Phương án ACTIVE trường khác',
            status: RoutePlanStatus.ACTIVE,
            schoolId: 'school-3',
            school: {
              id: 'school-3',
              name: 'THCS Bàn Cờ',
              contractStartDate: new Date('2026-09-01'),
              contractEndDate: new Date('2026-11-30'),
            },
          },
        },
      ]);

      prismaMock.vehicle.findMany.mockResolvedValue([
        {
          id: 'veh-free',
          licensePlate: '51B-111.11',
          brand: 'Ford',
          seatCount: 16,
          color: 'Trắng',
        },
        {
          id: 'veh-conflict',
          licensePlate: '51B-999.99',
          brand: 'Hyundai',
          seatCount: 29,
          color: 'Đỏ',
        },
      ]);

      const result = await service.getCandidateVehicles('plan-1', 'veh-old');

      const freeCandidate = result.candidates.find((c) => c.id === 'veh-free');
      expect(freeCandidate?.isEligible).toBe(true);

      const conflictCandidate = result.candidates.find((c) => c.id === 'veh-conflict');
      expect(conflictCandidate?.isEligible).toBe(false);
      expect(conflictCandidate?.reason).toContain('51B-999.99');
      expect(conflictCandidate?.reason).toContain('đang hoạt động (ACTIVE)');
    });
  });
});
