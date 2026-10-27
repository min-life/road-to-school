import { describe, it, expect, vi } from 'vitest';
import { Role, type User } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service.js';
import { actionableIncidentWhere, actionableLeaveWhere, actionableRequestWhere, adminSchoolScope, effectiveMembership, serviceDate, staffBlockers } from './operations-policy.js';
import { OverviewService } from './overview.service.js';

describe('overview scopes and metric definitions', () => {
  it('fails closed for nonadmins and School Admin accounts missing school scope', () => {
    expect(() => adminSchoolScope({ role: Role.PARENT, schoolId: null })).toThrow();
    expect(() => adminSchoolScope({ role: Role.SCHOOL_ADMIN, schoolId: null })).toThrow();
    expect(() => adminSchoolScope({ role: Role.SCHOOL_ADMIN, schoolId: 'own' }, 'other')).toThrow();
    expect(adminSchoolScope({ role: Role.SCHOOL_ADMIN, schoolId: 'own' })).toBe('own');
    expect(adminSchoolScope({ role: Role.SYSTEM_ADMIN, schoolId: null }, 'selected')).toBe('selected');
  });
  it('rejects rolled-over dates instead of silently counting a different day', () => {
    expect(() => serviceDate('2026-02-30')).toThrow();
    expect(() => serviceDate('2026-13-01')).toThrow();
    expect(serviceDate('2028-02-29').toISOString()).toBe('2028-02-29T00:00:00.000Z');
  });
  it('uses role-specific actions, not all pending records of a school', () => {
    expect(actionableIncidentWhere(Role.SYSTEM_ADMIN).type).toBe('DRIVER_MISSING');
    expect(actionableIncidentWhere(Role.SCHOOL_ADMIN, 'school').type).toBe('ATTENDANT_MISSING');
    expect(actionableLeaveWhere(Role.SYSTEM_ADMIN).kind).toBe('DRIVER');
    expect(actionableRequestWhere(Role.SYSTEM_ADMIN).type).toBe('ADDRESS_UPDATE');
    expect(actionableRequestWhere(Role.SCHOOL_ADMIN, 'school').OR).toEqual([
      { type: 'INFORMATION_UPDATE' }, { type: 'ADDRESS_UPDATE', student: { status: 'AVAILABLE', routeStops: { none: effectiveMembership } } },
    ]);
  });
  it('keeps actual Trip counts daily, action backlog all dates and inventory current, with no writes', async () => {
    const client = {
      school: { findUnique: vi.fn().mockResolvedValue({ name: 'School' }) },
      trip: { groupBy: vi.fn().mockResolvedValue([{ status: 'SCHEDULED', _count: { _all: 3 } }, { status: 'COMPLETED', _count: { _all: 2 } }]), count: vi.fn().mockResolvedValue(1), findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
      tripIncident: { count: vi.fn().mockResolvedValue(2) }, leaveNotice: { count: vi.fn().mockResolvedValue(1) }, studentUpdateRequest: { count: vi.fn().mockResolvedValue(4) },
      routePlan: { groupBy: vi.fn().mockResolvedValue([{ status: 'DRAFT', _count: { _all: 1 } }]) }, student: { count: vi.fn().mockResolvedValue(7) }, user: { count: vi.fn().mockResolvedValue(2) },
    };
    const result = await new OverviewService(client as unknown as PrismaService).get({ id: 'admin', role: Role.SCHOOL_ADMIN, schoolId: 'school' } as User, { serviceDate: '2026-10-26' });
    expect(result.trips).toEqual({ SCHEDULED: 3, IN_PROGRESS: 0, COMPLETED: 2, CANCELLED: 0, total: 5, waitingAssignment: 1 });
    expect(client.trip.count).toHaveBeenCalledWith({ where: { schoolId: 'school', serviceDate: new Date('2026-10-26T00:00:00.000Z'), status: 'SCHEDULED', ...staffBlockers } });
    expect(client.tripIncident.count).toHaveBeenCalledWith({ where: actionableIncidentWhere(Role.SCHOOL_ADMIN, 'school') });
    expect(client.student.count).toHaveBeenCalledWith({ where: { schoolId: 'school', status: 'AVAILABLE', routeStops: { none: effectiveMembership } } });
    expect(result.tasks.find(task => task.kind === 'PLAN')?.label).toBe('Phương án cần duyệt');
    expect(result.tasks[0].href).toContain('actionable=true');
    expect(client.trip.create).not.toHaveBeenCalled();
  });
});
