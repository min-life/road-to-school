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

  // 4. Kiểm tra đơn nghỉ phép (LeaveNotice) hợp lệ trong ngày/chuyến
  const openLeave = tx.leaveNotice?.findFirst
    ? await tx.leaveNotice.findFirst({
        where: {
          reportedById: staffId,
          status: { in: [LeaveNoticeStatus.RECORDED, LeaveNoticeStatus.PENDING_REPLACEMENT, LeaveNoticeStatus.REPLACED] },
          trip: {
            serviceDate: targetTrip.serviceDate,
            status: { not: TripStatus.CANCELLED },
          },
        },
        include: {
          trip: { select: { scheduledStartTime: true, scheduledEndTime: true } },
        },
      })
    : null;

  if (openLeave) {
    if (openLeave.tripId === tripId) {
      throw new ConflictException(`Nhân sự ${user.fullName} đang có đơn báo nghỉ trên chuyến xe này`);
    }
    const leaveStartTime = openLeave.trip.scheduledStartTime || '06:00';
    const leaveEndTime = openLeave.trip.scheduledEndTime || '07:00';
    const leaveStart = combineDateAndTimeUtc(targetDateYmd, leaveStartTime);
    const leaveEnd = combineDateAndTimeUtc(targetDateYmd, leaveEndTime);
    if (isTimeIntervalOverlapping(targetStart, targetEnd, leaveStart, leaveEnd)) {
      throw new ConflictException(
        `Nhân sự ${user.fullName} đã có đơn báo nghỉ trong khung giờ ${leaveStartTime} - ${leaveEndTime} ngày ${targetDateYmd}`,
      );
    }
  }

  // 5. Kiểm tra sự cố thiếu người (TripIncident WAITING_ASSIGNMENT)
  const openIncident = tx.tripIncident?.findFirst
    ? await tx.tripIncident.findFirst({
        where: {
          status: TripIncidentStatus.WAITING_ASSIGNMENT,
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
          trip: { select: { scheduledStartTime: true, scheduledEndTime: true } },
        },
      })
    : null;

  if (openIncident) {
    const incStartTime = openIncident.trip.scheduledStartTime || '06:00';
    const incEndTime = openIncident.trip.scheduledEndTime || '07:00';
    const incStart = combineDateAndTimeUtc(targetDateYmd, incStartTime);
    const incEnd = combineDateAndTimeUtc(targetDateYmd, incEndTime);
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
          serviceDate: targetTrip.serviceDate,
          status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
          OR: [
            { assignedDriverId: staffId },
            { assignedBusAttendantId: staffId },
          ],
        },
        select: {
          id: true,
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
    const otherStart = other.scheduledStartAt || combineDateAndTimeUtc(targetDateYmd, otherStartTime);
    const otherEnd = other.scheduledEndAt || combineDateAndTimeUtc(targetDateYmd, otherEndTime);

    if (isTimeIntervalOverlapping(targetStart, targetEnd, otherStart, otherEnd)) {
      throw new ConflictException(
        `Nhân sự ${user.fullName} bị trùng lịch với chuyến xe "${other.route?.name || other.id}" (${otherStartTime} - ${otherEndTime})`,
      );
    }
  }
}
