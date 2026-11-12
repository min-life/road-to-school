import { lockOperations } from './utils/operations-lock.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  TripStatus,
  RouteDirection,
  Role,
  type Prisma,
  type User,
} from '@prisma/client';
import { notifyTrip } from '../notifications/notification-writer.js';
import type {
  MarkAttendanceDto,
  UpdateAlightingDto,
} from './dto/trip-operation.dto.js';
import type { ContractLifecycleService } from '../schools/contract-lifecycle.service.js';

/** Shared by manual attendance and RFID; caller owns the PG transaction and Trip lock. */
export async function lockTripOperation(
  tx: Prisma.TransactionClient,
  id: string,
  lifecycle?: ContractLifecycleService,
  reconcileSchool = true,
) {
  await lockOperations(tx);
  await tx.$queryRaw`SELECT id FROM trips WHERE id = ${id} FOR UPDATE`;
  const ref = await tx.trip.findUnique({
    where: { id },
    select: { schoolId: true },
  });
  if (ref && lifecycle) {
    await tx.$queryRaw`SELECT id FROM schools WHERE id = ${ref.schoolId} FOR UPDATE`;
    if (reconcileSchool) {
      const school = await tx.school.findUnique({
        where: { id: ref.schoolId },
      });
      if (school) await lifecycle.reconcileSchool(tx, school);
    }
  }
  await lifecycle?.assertTripContractOpen(id, tx);
}

export async function writeBoarding(
  tx: Prisma.TransactionClient,
  tripId: string,
  studentId: string,
  dto: MarkAttendanceDto,
  currentUser: User,
) {
  if (currentUser.role !== Role.BUS_ATTENDANT) {
    throw new ForbiddenException('Chỉ giáo viên phụ xe mới có quyền điểm danh');
  }

  const trip = await tx.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      status: true,
      direction: true,
      arrivedAtSchoolAt: true,
      attendantReadyAt: true,
      assignedBusAttendantId: true,
    },
  });

  if (!trip) {
    throw new NotFoundException('Không tìm thấy chuyến xe');
  }

  if (trip.assignedBusAttendantId !== currentUser.id) {
    throw new ForbiddenException(
      'Bạn không phải giáo viên phụ xe được phân công cho chuyến này',
    );
  }

  if (trip.direction === RouteDirection.TO_SCHOOL) {
    if (trip.status !== TripStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Chỉ được phép điểm danh khi chuyến xe đang hoạt động (IN_PROGRESS)',
      );
    }
    // OUT-05: KHÔNG CHO CHUYỂN VỀ UNMARKED SAU KHI ĐÃ XÁC NHẬN ĐẾN TRƯỜNG
    if (trip.arrivedAtSchoolAt) {
      throw new ConflictException(
        'Xe đã đến trường. Sử dụng thao tác correction có lý do và trạng thái kỳ vọng',
      );
    }
  } else {
    // TO_PARKING: Cho phép điểm danh khi SCHEDULED (sau khi Attendant Ready) hoặc IN_PROGRESS
    if (trip.status === TripStatus.SCHEDULED) {
      if (!trip.attendantReadyAt) {
        throw new BadRequestException(
          'Vui lòng xác nhận sẵn sàng trước khi điểm danh đón học sinh',
        );
      }
    } else if (trip.status === TripStatus.IN_PROGRESS) {
      // RET-05: Không cho chuyển về UNMARKED sau khi xe đã xuất phát
      if (dto.status === AttendanceStatus.UNMARKED) {
        throw new BadRequestException(
          'Không thể hoàn tác về Chưa điểm danh sau khi chuyến xe đã khởi hành',
        );
      }
    } else {
      throw new BadRequestException(
        'Chuyến xe không ở trạng thái cho phép điểm danh',
      );
    }
  }

  const attendance = await tx.tripAttendance.findUnique({
    where: {
      tripId_studentId: {
        tripId,
        studentId,
      },
    },
  });

  if (!attendance) {
    throw new NotFoundException(
      'Học sinh này không nằm trong danh sách chuyến xe',
    );
  }

  // OUT-05 & RET-05: Không cho học sinh đã xuống xe chuyển thành ABSENT
  if (attendance.alightedAt && dto.status === AttendanceStatus.ABSENT) {
    throw new BadRequestException(
      'Học sinh đã được xác nhận xuống xe, không thể chuyển sang vắng mặt',
    );
  }

  let updateData: any = {
    status: dto.status,
  };

  if (dto.status === AttendanceStatus.ABSENT) {
    const trimmedReason = (dto.absenceReason || '').trim();
    if (!trimmedReason) {
      throw new BadRequestException(
        'Lý do vắng mặt không được để trống khi học sinh vắng',
      );
    }
    updateData.absenceReason = trimmedReason;
    updateData.markedById = currentUser.id;
    updateData.markedAt = new Date();
  } else if (dto.status === AttendanceStatus.PRESENT) {
    updateData.absenceReason = null;
    updateData.markedById = currentUser.id;
    updateData.markedAt = new Date();
  } else if (dto.status === AttendanceStatus.UNMARKED) {
    // D09: Hoàn tác về UNMARKED
    updateData.absenceReason = null;
    updateData.markedById = null;
    updateData.markedAt = null;
    updateData.alightedAt = null;
  }

  const updated = await tx.tripAttendance.update({
    where: {
      tripId_studentId: {
        tripId,
        studentId,
      },
    },
    data: updateData,
  });

  if (attendance.status !== updated.status)
    await notifyTrip(
      tx,
      tripId,
      updated.status === AttendanceStatus.PRESENT
        ? 'BOARDING'
        : 'ATTENDANCE_CHANGED',
      currentUser.id,
      studentId,
      (updated.markedAt ?? new Date()).toISOString(),
    );
  return {
    message: 'Cập nhật điểm danh thành công',
    attendance: updated,
  };
}

export async function writeAlighting(
  tx: Prisma.TransactionClient,
  tripId: string,
  studentId: string,
  dto: UpdateAlightingDto,
  currentUser: User,
) {
  if (currentUser.role !== Role.BUS_ATTENDANT) {
    throw new ForbiddenException(
      'Chỉ giáo viên phụ xe mới có quyền xác nhận học sinh xuống xe',
    );
  }

  const trip = await tx.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      status: true,
      direction: true,
      arrivedAtSchoolAt: true,
      assignedBusAttendantId: true,
    },
  });

  if (!trip) {
    throw new NotFoundException('Không tìm thấy chuyến xe');
  }

  if (trip.assignedBusAttendantId !== currentUser.id) {
    throw new ForbiddenException(
      'Bạn không phải giáo viên phụ xe được phân công cho chuyến này',
    );
  }

  if (trip.status !== TripStatus.IN_PROGRESS) {
    throw new BadRequestException(
      'Chỉ có thể xác nhận xuống xe khi chuyến xe đang hoạt động (IN_PROGRESS)',
    );
  }

  // OUT-06: Với TO_SCHOOL, bắt buộc xe đã đến trường mới được cho học sinh xuống xe
  if (trip.direction === RouteDirection.TO_SCHOOL && !trip.arrivedAtSchoolAt) {
    throw new BadRequestException(
      'Chưa thể cho học sinh xuống xe. Xe chưa xác nhận đến trường.',
    );
  }

  const attendance = await tx.tripAttendance.findUnique({
    where: {
      tripId_studentId: {
        tripId,
        studentId,
      },
    },
  });

  if (!attendance) {
    throw new NotFoundException(
      'Học sinh này không nằm trong danh sách chuyến xe',
    );
  }

  // BF-06: Chỉ học sinh PRESENT mới được xuống xe
  if (attendance.status !== AttendanceStatus.PRESENT) {
    throw new BadRequestException(
      'Chỉ có thể xác nhận xuống xe cho học sinh có mặt trên xe (PRESENT)',
    );
  }

  const alightedAt = dto.isAlighted ? new Date() : null;

  const updated = await tx.tripAttendance.update({
    where: {
      tripId_studentId: {
        tripId,
        studentId,
      },
    },
    data: { alightedAt },
  });

  if (Boolean(attendance.alightedAt) !== dto.isAlighted)
    await notifyTrip(
      tx,
      tripId,
      dto.isAlighted ? 'ALIGHTING' : 'ATTENDANCE_CHANGED',
      currentUser.id,
      studentId,
      (updated.alightedAt ?? new Date()).toISOString(),
    );
  return {
    message: dto.isAlighted
      ? 'Xác nhận học sinh đã xuống xe thành công'
      : 'Đã hoàn tác trạng thái chưa xuống xe',
    alightedAt: updated.alightedAt ? updated.alightedAt.toISOString() : null,
    isAlighted: Boolean(updated.alightedAt),
  };
}
