import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role, type Prisma, type User } from '@prisma/client';

export function adminSchoolScope(user: Pick<User, 'role' | 'schoolId'>, schoolId?: string): string | undefined {
  if (user.role === Role.SYSTEM_ADMIN) return schoolId;
  if (user.role !== Role.SCHOOL_ADMIN || !user.schoolId) throw new ForbiddenException('Không có quyền xem tổng quan');
  if (schoolId && schoolId !== user.schoolId) throw new ForbiddenException('Không có quyền xem trường khác');
  return user.schoolId;
}

export function serviceDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('Ngày phục vụ không hợp lệ');
  }
  return date;
}

export const effectiveMembership: Prisma.RouteStopWhereInput = {
  route: { routePlan: { status: { in: ['DRAFT', 'ACTIVE'] } } },
};

export function actionableIncidentWhere(role: Role, schoolId?: string): Prisma.TripIncidentWhereInput {
  return {
    status: 'WAITING_ASSIGNMENT',
    type: role === Role.SYSTEM_ADMIN ? 'DRIVER_MISSING' : 'ATTENDANT_MISSING',
    trip: { status: 'SCHEDULED', actualStartTime: null, ...(schoolId ? { schoolId } : {}) },
  };
}

export function actionableLeaveWhere(role: Role, schoolId?: string): Prisma.LeaveNoticeWhereInput {
  return {
    status: 'PENDING_REPLACEMENT',
    kind: role === Role.SYSTEM_ADMIN ? 'DRIVER' : 'BUS_ATTENDANT',
    trip: { status: 'SCHEDULED', actualStartTime: null, ...(schoolId ? { schoolId } : {}) },
  };
}

export function actionableRequestWhere(role: Role, schoolId?: string): Prisma.StudentUpdateRequestWhereInput {
  return {
    status: 'PENDING', ...(schoolId ? { schoolId } : {}),
    student: { status: 'AVAILABLE' },
    ...(role === Role.SYSTEM_ADMIN ? { type: 'ADDRESS_UPDATE' as const } : {
      OR: [
        { type: 'INFORMATION_UPDATE' as const },
        { type: 'ADDRESS_UPDATE' as const, student: { status: 'AVAILABLE', routeStops: { none: effectiveMembership } } },
      ],
    }),
  };
}

export const staffBlockers: Prisma.TripWhereInput = {
  OR: [
    { leaveNotices: { some: { status: 'PENDING_REPLACEMENT', kind: { in: ['DRIVER', 'BUS_ATTENDANT'] } } } },
    { incidents: { some: { status: 'WAITING_ASSIGNMENT', type: { in: ['DRIVER_MISSING', 'ATTENDANT_MISSING'] } } } },
  ],
};
