import { planInvalidation } from '../../schools/school-policy.js';
import { frozenTripWhere } from '../../overview/operations-policy.js';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  Prisma,
  Role,
  TripStatus,
  LeaveNoticeStatus,
  TripIncidentStatus,
} from '@prisma/client';
import {
  combineDateAndTimeUtc,
  formatDateToVnYmd,
  isTimeIntervalOverlapping,
} from './trip-time.util.js';
import { assertResourcesNotAwaitingAdmin } from '../../schools/contract-resource-policy.js';

export interface StaffAvailabilityCheckParams {
  staffId: string;
  expectedRole: Role;
  schoolId: string;
  tripId: string;
  targetTrip?: {
    id: string;
    serviceDate: Date;
    scheduledStartTime?: string | null;
    scheduledEndTime?: string | null;
    scheduledStartAt?: Date | null;
    scheduledEndAt?: Date | null;
  } | null;
}

/**
 * Recheck khả dụng thời gian thực cho Tài xế hoặc Phụ xe (WF-08, WF-13, WF-17).
 * Ngăn chặn tuyệt đối việc gán trùng lịch, người đang có đơn nghỉ phép hoặc sự cố vắng mặt.
 */
export async function assertStaffAvailableForTrip(
  tx: Prisma.TransactionClient,
  params: StaffAvailabilityCheckParams,
): Promise<void> {
  const { staffId, expectedRole, schoolId, tripId } = params;

  // 1. Kiểm tra User tồn tại, hoạt động, đúng role và đúng schoolId (nếu phụ xe)
  const user = await tx.user.findUnique({
    where: { id: staffId },
    select: { id: true, fullName: true, role: true, schoolId: true, isActive: true, isVerified: true },
  });

  if (!user || !user.isActive || user.isVerified === false) {
    throw new BadRequestException('Nhân sự không tồn tại, chưa xác thực hoặc tài khoản đã bị vô hiệu hóa');
  }

  if (user.role !== expectedRole) {
    throw new BadRequestException(`Nhân sự phải có vai trò ${expectedRole} (hiện tại: ${user.role})`);
  }

  if (expectedRole === Role.BUS_ATTENDANT && user.schoolId !== schoolId) {
    throw new BadRequestException('Giáo viên phụ xe phải thuộc cùng trường học của chuyến xe');
  }

  // 2. Kiểm tra hold do trường hết hạn / chưa chốt hành chính (Mục 3.2)
  if (expectedRole === Role.DRIVER) {
    await assertResourcesNotAwaitingAdmin(tx, { driverId: staffId });
  } else {
    await assertResourcesNotAwaitingAdmin(tx, { busAttendantId: staffId });
  }

  // 3. Lấy thông tin chuyến xe mục tiêu
  let targetTrip = params.targetTrip;
  if (!targetTrip) {
    targetTrip = await tx.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        serviceDate: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
      },
    });
  }

  if (!targetTrip) {
    throw new BadRequestException('Không tìm thấy chuyến xe mục tiêu');
  }

  const serviceDateObj = targetTrip.serviceDate ? new Date(targetTrip.serviceDate) : new Date();
  const targetDateYmd = !isNaN(serviceDateObj.getTime())
    ? formatDateToVnYmd(serviceDateObj)
    : formatDateToVnYmd(new Date());
  const targetStartTime = targetTrip.scheduledStartTime || '06:00';
  const targetEndTime = targetTrip.scheduledEndTime || '07:00';
  const targetStart = targetTrip.scheduledStartAt || combineDateAndTimeUtc(targetDateYmd, targetStartTime);
  const targetEnd = targetTrip.scheduledEndAt || combineDateAndTimeUtc(targetDateYmd, targetEndTime);

  if (expectedRole === Role.DRIVER) {
    await assertSingleSchoolReservation(tx, schoolId, { defaultDriverId: staffId });
  }

  // 4. Kiểm tra đơn nghỉ phép (LeaveNotice) hợp lệ trong ngày/chuyến
  const openLeaves = tx.leaveNotice?.findMany
    ? await tx.leaveNotice.findMany({
        where: {
          reportedById: staffId,
          status: { in: [LeaveNoticeStatus.RECORDED, LeaveNoticeStatus.PENDING_REPLACEMENT, LeaveNoticeStatus.REPLACED] },
          trip: {
            serviceDate: targetTrip.serviceDate,
            status: { not: TripStatus.CANCELLED },
          },
        },
        include: {
          trip: { select: { scheduledStartTime: true, scheduledEndTime: true, scheduledStartAt: true, scheduledEndAt: true } },
        },
      })
    : [];

  for (const openLeave of openLeaves) {
    if (openLeave.tripId === tripId) {
      throw new ConflictException(`Nhân sự ${user.fullName} đang có đơn báo nghỉ trên chuyến xe này`);
    }
    const leaveStartTime = openLeave.trip.scheduledStartTime || '06:00';
    const leaveEndTime = openLeave.trip.scheduledEndTime || '07:00';
    const leaveStart = openLeave.trip.scheduledStartAt ?? combineDateAndTimeUtc(targetDateYmd, leaveStartTime);
    const leaveEnd = openLeave.trip.scheduledEndAt ?? combineDateAndTimeUtc(targetDateYmd, leaveEndTime);
    if (isTimeIntervalOverlapping(targetStart, targetEnd, leaveStart, leaveEnd)) {
      throw new ConflictException(
        `Nhân sự ${user.fullName} đã có đơn báo nghỉ trong khung giờ ${leaveStartTime} - ${leaveEndTime} ngày ${targetDateYmd}`,
      );
    }
  }

  // 5. Kiểm tra sự cố thiếu người (TripIncident WAITING_ASSIGNMENT)
  const openIncidents = tx.tripIncident?.findMany
    ? await tx.tripIncident.findMany({
        where: {
          status: TripIncidentStatus.WAITING_ASSIGNMENT,
          type: expectedRole === Role.DRIVER ? 'DRIVER_MISSING' : 'ATTENDANT_MISSING',
          trip: {
            id: { not: tripId },
            serviceDate: targetTrip.serviceDate,
            status: TripStatus.SCHEDULED,
            actualStartTime: null,
            OR: [
              { assignedDriverId: staffId },
              { assignedBusAttendantId: staffId },
            ],
          },
        },
        include: {
          trip: { select: { scheduledStartTime: true, scheduledEndTime: true, scheduledStartAt: true, scheduledEndAt: true } },
        },
      })
    : [];

  for (const openIncident of openIncidents) {
    const incStartTime = openIncident.trip.scheduledStartTime || '06:00';
    const incEndTime = openIncident.trip.scheduledEndTime || '07:00';
    const incStart = openIncident.trip.scheduledStartAt ?? combineDateAndTimeUtc(targetDateYmd, incStartTime);
    const incEnd = openIncident.trip.scheduledEndAt ?? combineDateAndTimeUtc(targetDateYmd, incEndTime);
    if (isTimeIntervalOverlapping(targetStart, targetEnd, incStart, incEnd)) {
      throw new ConflictException(
        `Nhân sự ${user.fullName} đang có sự cố vắng mặt chưa xử lý trên chuyến khác (${incStartTime} - ${incEndTime})`,
      );
    }
  }

  // 6. Kiểm tra trùng lịch chạy xe (Trip Overlap) với các chuyến SCHEDULED hoặc IN_PROGRESS khác
  const otherTrips = tx.trip?.findMany
    ? await tx.trip.findMany({
        where: {
          id: { not: tripId },
          AND: [{ OR: [
            { serviceDate: targetTrip.serviceDate },
            { scheduledStartAt: { lt: targetEnd }, scheduledEndAt: { gt: targetStart } },
          ] }],
          status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
          OR: [
            { assignedDriverId: staffId },
            { assignedBusAttendantId: staffId },
          ],
        },
        select: {
          id: true,
          serviceDate: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
          scheduledStartAt: true,
          scheduledEndAt: true,
          route: { select: { name: true } },
        },
      })
    : [];

  const tripsList = Array.isArray(otherTrips) ? otherTrips : [];
  for (const other of tripsList) {
    const otherStartTime = other.scheduledStartTime || '06:00';
    const otherEndTime = other.scheduledEndTime || '07:00';
    const otherDay = formatDateToVnYmd(other.serviceDate);
    const otherStart = other.scheduledStartAt || combineDateAndTimeUtc(otherDay, otherStartTime);
    const otherEnd = other.scheduledEndAt || combineDateAndTimeUtc(otherDay, otherEndTime);

    if (isTimeIntervalOverlapping(targetStart, targetEnd, otherStart, otherEnd)) {
      throw new ConflictException(
        `Nhân sự ${user.fullName} bị trùng lịch với chuyến xe "${other.route?.name || other.id}" (${otherStartTime} - ${otherEndTime})`,
      );
    }
  }
}

async function assertSingleSchoolReservation(
  tx: Prisma.TransactionClient,
  schoolId: string,
  resource: Prisma.RouteWhereInput,
): Promise<void> {
  const school = await tx.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new BadRequestException('Không tìm thấy trường');
  const reservations = await tx.route.findMany({
    where: { ...resource, schoolId: { not: schoolId }, routePlan: {
      status: { in: ['DRAFT', 'ACTIVE'] },
      school: { contractStartDate: { lte: school.contractEndDate }, contractEndDate: { gte: school.contractStartDate } },
    } },
    include: { routePlan: true },
  });
  for (const route of reservations) {
    if (route.routePlan?.createdAt && !await planInvalidation(tx, route.schoolId, route.routePlan.createdAt)) {
      throw new ConflictException('Nguồn lực đang được giữ cho hợp đồng trường khác');
    }
  }
}

export async function assertVehicleAvailableForTrip(
  tx: Prisma.TransactionClient,
  vehicleId: string,
  schoolId: string,
  trip: NonNullable<StaffAvailabilityCheckParams['targetTrip']>,
  studentCount: number,
): Promise<void> {
  const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle?.isActive) throw new ConflictException('Xe không tồn tại hoặc đã ngừng hoạt động');
  if (vehicle.seatCount < studentCount) throw new ConflictException('Xe không đủ chỗ cho danh sách học sinh của chuyến');
  await assertResourcesNotAwaitingAdmin(tx, { vehicleId });
  await assertSingleSchoolReservation(tx, schoolId, { proposedVehicleId: vehicleId });
  const day = formatDateToVnYmd(trip.serviceDate);
  const start = trip.scheduledStartAt ?? combineDateAndTimeUtc(day, trip.scheduledStartTime || '06:00');
  const end = trip.scheduledEndAt ?? combineDateAndTimeUtc(day, trip.scheduledEndTime || '07:00');
  const others = await tx.trip.findMany({ where: {
    id: { not: trip.id }, assignedVehicleId: vehicleId,
    OR: [
      { serviceDate: trip.serviceDate },
      { scheduledStartAt: { lt: end }, scheduledEndAt: { gt: start } },
    ],
    status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
  } });
  for (const other of others) {
    const otherDay = formatDateToVnYmd(other.serviceDate);
    const otherStart = other.scheduledStartAt ?? combineDateAndTimeUtc(otherDay, other.scheduledStartTime || '06:00');
    const otherEnd = other.scheduledEndAt ?? combineDateAndTimeUtc(otherDay, other.scheduledEndTime || '07:00');
    if (isTimeIntervalOverlapping(start, end, otherStart, otherEnd)) {
      throw new ConflictException('Xe có lịch chạy trùng chuyến khác');
    }
  }
}

export async function assertInactiveHandover(
  tx: Prisma.TransactionClient,
  field: 'assignedVehicleId' | 'assignedDriverId' | 'assignedBusAttendantId',
  resourceId: string,
  replacementId?: string,
): Promise<void> {
  const trips = await tx.trip.findMany({ where: {
    [field]: resourceId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
  }, include: { attendances: true } });
  const frozen = await tx.trip.count({ where: {
    [field]: resourceId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] }, AND: frozenTripWhere,
  } });
  if (frozen) throw new ConflictException('Nguồn lực còn chuyến Ready, đã điểm danh hoặc đang chạy; cần xử lý chuyến trước');
  const routeField = field === 'assignedVehicleId' ? 'proposedVehicleId' :
    field === 'assignedDriverId' ? 'defaultDriverId' : 'defaultBusAttendantId';
  const routes = await tx.route.findMany({
    where: { [routeField]: resourceId, routePlan: { status: 'ACTIVE' } },
    include: { school: true, stops: { select: { studentId: true } } },
  });
  if ((trips.length || routes.length) && !replacementId) throw new ConflictException('Phân công đã thay đổi; cần chọn nguồn lực bàn giao');
  if (!replacementId) return;
  if (replacementId === resourceId) throw new BadRequestException('Nguồn lực thay thế phải khác nguồn lực ngừng hoạt động');
  const isVehicle = field === 'assignedVehicleId';
  const role = field === 'assignedDriverId' ? Role.DRIVER : Role.BUS_ATTENDANT;
  const vehicle = isVehicle ? await tx.vehicle.findUnique({ where: { id: replacementId } }) : null;
  const staff = isVehicle ? null : await tx.user.findUnique({ where: { id: replacementId } });
  if (isVehicle ? !vehicle?.isActive : !staff?.isActive || !staff.isVerified || staff.role !== role) {
    throw new ConflictException('Nguồn lực thay thế không còn đủ điều kiện');
  }
  await assertResourcesNotAwaitingAdmin(tx, isVehicle ? { vehicleId: replacementId }
    : role === Role.DRIVER ? { driverId: replacementId } : { busAttendantId: replacementId });

  const affectedSchools = new Map(routes.map(route => [route.schoolId, route.school]));
  for (const trip of trips) {
    if (!affectedSchools.has(trip.schoolId)) {
      const school = await tx.school.findUniqueOrThrow({ where: { id: trip.schoolId } });
      affectedSchools.set(school.id, school);
    }
  }
  if (isVehicle || role === Role.DRIVER) {
    for (const school of affectedSchools.values()) {
      await assertSingleSchoolReservation(tx, school.id, { [routeField]: replacementId });
      const overlappingSchool = [...affectedSchools.values()].some(other =>
        other.id !== school.id && other.contractStartDate <= school.contractEndDate &&
        other.contractEndDate >= school.contractStartDate);
      if (overlappingSchool) throw new ConflictException('Bàn giao sẽ gán cùng nguồn lực cho hai hợp đồng chồng lấn');
    }
  } else if ([...affectedSchools.keys()].some(schoolId => schoolId !== staff?.schoolId)) {
    throw new ConflictException('Phụ xe thay thế phải thuộc đúng trường');
  }

  const groups = new Map<string, string | null>();
  for (const route of routes) {
    if (vehicle && new Set(route.stops.flatMap(stop => stop.studentId ? [stop.studentId] : [])).size > vehicle.seatCount) {
      throw new ConflictException('Xe thay thế không đủ chỗ cho tuyến');
    }
    if (groups.has(route.routePlanId) && groups.get(route.routePlanId) !== route.proposedVehicleId) {
      throw new ConflictException('Bàn giao sẽ gán cùng nguồn lực cho nhiều nhóm tuyến');
    }
    groups.set(route.routePlanId, route.proposedVehicleId);
  }
  for (const [routePlanId, currentVehicleId] of groups) {
    const otherGroup = await tx.route.findFirst({
      where: {
        routePlanId,
        [routeField]: replacementId,
        OR: [{ proposedVehicleId: { not: currentVehicleId } }, ...(currentVehicleId ? [{ proposedVehicleId: null }] : [])],
      },
      select: { id: true },
    });
    if (otherGroup) throw new ConflictException('Nguồn lực thay thế đã được gán cho nhóm tuyến khác');
    if (!vehicle) continue;

    const route = routes.find(item => item.routePlanId === routePlanId)!;
    const reserved = await tx.routePlan.findMany({
      where: {
        id: { not: routePlanId },
        status: { in: ['DRAFT', 'ACTIVE'] },
        routes: { some: { proposedVehicleId: replacementId } },
        school: {
          contractStartDate: { lte: route.school.contractEndDate },
          contractEndDate: { gte: route.school.contractStartDate },
        },
      },
      select: { schoolId: true, createdAt: true },
    });
    for (const plan of reserved) {
      if (!await planInvalidation(tx, plan.schoolId, plan.createdAt)) {
        throw new ConflictException('Xe thay thế đang được giữ bởi phương án khác');
      }
    }
  }

  if (vehicle && groups.size > 1) {
    for (const route of routes) {
      const overlappingPlan = routes.some(other =>
        other.routePlanId !== route.routePlanId &&
        other.school.contractStartDate <= route.school.contractEndDate &&
        other.school.contractEndDate >= route.school.contractStartDate);
      if (overlappingPlan) throw new ConflictException('Xe thay thế sẽ được giữ bởi nhiều phương án chồng lấn');
    }
  }

  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i];
    const day = formatDateToVnYmd(trip.serviceDate);
    const start = trip.scheduledStartAt ?? combineDateAndTimeUtc(day, trip.scheduledStartTime || '06:00');
    const end = trip.scheduledEndAt ?? combineDateAndTimeUtc(day, trip.scheduledEndTime || '07:00');
    for (const other of trips.slice(i + 1)) {
      const otherDay = formatDateToVnYmd(other.serviceDate);
      const otherStart = other.scheduledStartAt ?? combineDateAndTimeUtc(otherDay, other.scheduledStartTime || '06:00');
      const otherEnd = other.scheduledEndAt ?? combineDateAndTimeUtc(otherDay, other.scheduledEndTime || '07:00');
      if (isTimeIntervalOverlapping(start, end, otherStart, otherEnd)) {
        throw new ConflictException('Các chuyến cần bàn giao có giờ trùng nhau');
      }
    }
  }
  for (const trip of trips) {
    if (field === 'assignedVehicleId') {
      await assertVehicleAvailableForTrip(tx, replacementId, trip.schoolId, trip, trip.attendances.filter(a => !a.excludedAt).length);
    } else {
      await assertStaffAvailableForTrip(tx, { staffId: replacementId,
        expectedRole: field === 'assignedDriverId' ? Role.DRIVER : Role.BUS_ATTENDANT,
        schoolId: trip.schoolId, tripId: trip.id, targetTrip: trip });
    }
  }
}
