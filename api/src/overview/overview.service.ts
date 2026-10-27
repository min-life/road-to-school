import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { formatDateToVnYmd } from '../trips/utils/trip-time.util.js';
import { actionableIncidentWhere, actionableLeaveWhere, actionableRequestWhere, adminSchoolScope, effectiveMembership, serviceDate, staffBlockers } from './operations-policy.js';
import type { OverviewQueryDto, OverviewResponseDto, OverviewTripDto } from './overview.dto.js';

const tripSelect = {
  id: true, routeSnapshot: true, serviceDate: true, status: true, scheduledStartTime: true, scheduledEndTime: true,
  route: { select: { name: true } }, school: { select: { name: true } },
  assignedDriver: { select: { fullName: true } }, assignedBusAttendant: { select: { fullName: true } },
  assignedVehicle: { select: { licensePlate: true } },
  leaveNotices: { where: { status: 'PENDING_REPLACEMENT', kind: { in: ['DRIVER', 'BUS_ATTENDANT'] } }, select: { id: true }, take: 1 },
  incidents: { where: { status: 'WAITING_ASSIGNMENT', type: { in: ['DRIVER_MISSING', 'ATTENDANT_MISSING'] } }, select: { id: true }, take: 1 },
} satisfies Prisma.TripSelect;
type OverviewTrip = Prisma.TripGetPayload<{ select: typeof tripSelect }>;
function mapTrip(trip: OverviewTrip): OverviewTripDto {
  const snapshot = trip.routeSnapshot;
  const name = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) && typeof snapshot.routeName === 'string' ? snapshot.routeName : trip.route.name;
  return {
    id: trip.id, name, schoolName: trip.school.name, serviceDate: trip.serviceDate.toISOString().slice(0, 10), status: trip.status,
    scheduledStartTime: trip.scheduledStartTime, scheduledEndTime: trip.scheduledEndTime,
    driverName: trip.assignedDriver.fullName, attendantName: trip.assignedBusAttendant.fullName,
    vehiclePlate: trip.assignedVehicle.licensePlate,
    waitingAssignment: trip.status === 'SCHEDULED' && (trip.leaveNotices.length > 0 || trip.incidents.length > 0),
  };
}
function link(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return `${path}?${query}`;
}

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: User, query: OverviewQueryDto): Promise<OverviewResponseDto> {
    const schoolId = adminSchoolScope(user, query.schoolId);
    const today = formatDateToVnYmd(new Date());
    const day = query.serviceDate ?? today;
    const date = serviceDate(day);
    const school = schoolId ? await this.prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }) : null;
    if (schoolId && !school) throw new NotFoundException('Không tìm thấy trường học');
    const scope = schoolId ? { schoolId } : {};
    const daily: Prisma.TripWhereInput = { ...scope, serviceDate: date };
    const system = user.role === Role.SYSTEM_ADMIN;
    const groups = await Promise.all([
      this.prisma.trip.groupBy({ by: ['status'], where: daily, _count: { _all: true } }),
      this.prisma.trip.count({ where: { ...daily, status: 'SCHEDULED', ...staffBlockers } }),
      this.prisma.tripIncident.count({ where: actionableIncidentWhere(user.role, schoolId) }),
      this.prisma.leaveNotice.count({ where: actionableLeaveWhere(user.role, schoolId) }),
      this.prisma.studentUpdateRequest.count({ where: actionableRequestWhere(user.role, schoolId) }),
      this.prisma.routePlan.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      this.prisma.trip.findMany({ where: { ...daily, status: 'SCHEDULED', ...staffBlockers }, select: tripSelect, orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }], take: 8 }),
      this.prisma.trip.findMany({ where: { ...daily, status: 'IN_PROGRESS' }, select: tripSelect, orderBy: [{ actualStartTime: 'asc' }, { id: 'asc' }], take: 8 }),
      this.prisma.trip.findMany({ where: { ...daily, status: 'SCHEDULED', NOT: staffBlockers }, select: tripSelect, orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }], take: 8 }),
      day === today ? this.prisma.trip.findMany({ where: { ...scope, serviceDate: { lt: date }, status: 'IN_PROGRESS' }, select: tripSelect, orderBy: [{ serviceDate: 'asc' }, { id: 'asc' }], take: 5 }) : Promise.resolve([]),
    ]);
    const [counts, waiting, incidents, leaves, requests, plans, blocked, running, upcoming, overdue] = groups;
    const trips = { SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0, total: 0, waitingAssignment: waiting };
    for (const group of counts) { trips[group.status] = group._count._all; trips.total += group._count._all; }
    const planCount = (status: string) => plans.find(p => p.status === status)?._count._all ?? 0;
    const tasks = [
      { kind: 'INCIDENT', label: 'Sự cố cần xử lý', count: incidents, href: link('/admin/incidents', { schoolId, type: system ? 'DRIVER_MISSING' : 'ATTENDANT_MISSING', status: 'WAITING_ASSIGNMENT', actionable: 'true' }) },
      { kind: 'LEAVE', label: 'Báo nghỉ chờ bố trí', count: leaves, href: link('/admin/leave-notices', { schoolId, kind: system ? 'DRIVER' : 'BUS_ATTENDANT', status: 'PENDING_REPLACEMENT', actionable: 'true' }) },
      { kind: 'REQUEST', label: 'Yêu cầu cần xử lý', count: requests, href: link('/admin/requests', { schoolId, status: 'PENDING', actionable: 'true' }) },
      { kind: 'PLAN', label: system ? 'Chờ trường duyệt' : 'Phương án cần duyệt', count: planCount('DRAFT'), href: link('/admin/routes', { schoolId, status: 'DRAFT' }) },
    ];
    const inventory = [
      { key: 'activePlans', label: 'Phương án đang hoạt động', count: planCount('ACTIVE'), href: link('/admin/routes', { schoolId, status: 'ACTIVE' }), scope: 'SCOPE' as const },
    ];
    if (system) {
      const [schools, vehicles, drivers] = await Promise.all([
        this.prisma.school.count({ where: { isActive: true, ...(schoolId ? { id: schoolId } : {}) } }),
        this.prisma.vehicle.count(), this.prisma.user.count({ where: { role: Role.DRIVER, isActive: true } }),
      ]);
      inventory.push(
        { key: 'schools', label: 'Trường đang hoạt động', count: schools, href: schoolId ? `/admin/schools/${schoolId}` : '/admin/schools', scope: 'SCOPE' },
      );
      return { serviceDate: day, schoolId: schoolId ?? null, schoolName: school?.name ?? null, generatedAt: new Date().toISOString(), trips, tasks,
        attentionTrips: [...blocked, ...running, ...upcoming].slice(0, 8).map(mapTrip), overdueRunningTrips: overdue.map(mapTrip),
        inventory: [...inventory, { key: 'vehicles', label: 'Phương tiện nhà xe', count: vehicles, href: '/admin/vehicles', scope: 'OPERATOR' }, { key: 'drivers', label: 'Tài xế đang hoạt động', count: drivers, href: '/admin/drivers', scope: 'OPERATOR' }] };
    }
    const [students, unassigned, attendants] = await Promise.all([
      this.prisma.student.count({ where: { schoolId, status: 'AVAILABLE' } }),
      this.prisma.student.count({ where: { schoolId, status: 'AVAILABLE', routeStops: { none: effectiveMembership } } }),
      this.prisma.user.count({ where: { schoolId, role: Role.BUS_ATTENDANT, isActive: true } }),
    ]);
    return { serviceDate: day, schoolId: schoolId ?? null, schoolName: school?.name ?? null, generatedAt: new Date().toISOString(), trips, tasks,
      attentionTrips: [...blocked, ...running, ...upcoming].slice(0, 8).map(mapTrip), overdueRunningTrips: overdue.map(mapTrip),
      inventory: [...inventory, { key: 'students', label: 'Học sinh đang hoạt động', count: students, href: '/admin/students?status=AVAILABLE', scope: 'SCOPE' },
        { key: 'unassigned', label: 'Học sinh chưa có tuyến', count: unassigned, href: '/admin/students?status=AVAILABLE&routingStatus=UNASSIGNED', scope: 'SCOPE' },
        { key: 'attendants', label: 'Giáo viên đang hoạt động', count: attendants, href: '/admin/teachers', scope: 'SCOPE' }] };
  }
}
