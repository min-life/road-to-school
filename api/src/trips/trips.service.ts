import { closeCancelledTripTasks } from '../trips/utils/close-cancelled-trip-tasks.js';
import { recordAssignmentOverride, type AssignmentField } from './utils/trip-assignment-audit.js';
import { configuredParking, pendingParkingChange } from '../system-settings/parking-policy.js';
import { lockOperations } from '../trips/utils/operations-lock.js';
import { AttendanceCorrectionDto, ReopenTripDto, TripReasonDto } from './dto/trip-actions.dto.js';
import { lockTripOperation, writeBoarding, writeAlighting } from './attendance-operations.js';
import { effectiveTripTiming } from '../schools/trip-schedule-view.js';
import { tripBlockReason, serviceDay } from '../schools/school-policy.js';
import { assertResourcesNotAwaitingAdmin } from '../schools/contract-resource-policy.js';
import { notifyAssignment, notifyTrip, notifyCancelledTrips } from '../notifications/notification-writer.js';
import {
  Injectable,
  Inject,
  ConflictException,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContractLifecycleService } from '../schools/contract-lifecycle.service.js';
import { canServeOnDate, isContractExpired } from '../schools/school-effective-state.js';
import {
  Prisma,
  Role,
  RouteDirection,
  RoutePlanStatus,
  RouteStopType,
  TripStatus,
  AttendanceStatus,
  LeaveNoticeKind,
  LeaveNoticeStatus,
  TripIncidentType,
  TripIncidentStatus,
  User,
} from '@prisma/client';
import {
  MarkAttendanceDto,
  UpdateAlightingDto,
  UpdateAlightingResponseDto,
  ArriveAtSchoolResponseDto,
  VerifyQrDto,
  VerifyQrResponseDto,
  TripAttendanceStudentItemDto,
  TripAttendanceListResponseDto,
  OperationalStateResponseDto,
  HomeTripResponseDto,
  ParentHomeCardsResponseDto,
  ParentHomeCardItemDto,
} from './dto/trip-operation.dto.js';
import {
  GenerateTripsDto,
  GenerateTripsResponseDto,
  TripGenerationFailureDto,
} from './dto/generate-trips.dto.js';
import { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import {
  TripDetailResponseDto,
  TripItemResponseDto,
  TripListResponseDto,
  TripStopResponseDto,
} from './dto/trip-response.dto.js';
import { UpdateTripAssignmentDto } from './dto/update-trip-assignment.dto.js';
import {
  MobileParentScheduleResponseDto,
  MobileTripItemDto,
} from './dto/mobile-schedule-response.dto.js';
import {
  combineDateAndTimeUtc,
  formatDateToVnYmd,
  getDayOfWeekKey,
  getDayOfWeekVietnamese,
  secondsToTimeStr,
  timeStrToSeconds,
} from './utils/trip-time.util.js';
import {
  buildTripRouteSnapshot,
  resolveTripRoute,
  filterActiveAttendances,
} from './utils/trip-snapshot-resolver.js';
import { isTripFrozen } from '../overview/operations-policy.js';
import { assertStaffAvailableForTrip, assertVehicleAvailableForTrip } from './utils/staff-availability.helper.js';

@Injectable()
export class TripsService {
  @Inject(ContractLifecycleService)
  private readonly contractLifecycle: ContractLifecycleService;
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}


  /** Operation writers lock the same parent before reading state or roster. */
  private withTripLock<T>(id: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await lockTripOperation(tx,id,this.contractLifecycle);
      return work(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async correctAttendance(
    id: string,
    studentId: string,
    dto: AttendanceCorrectionDto,
    user: User,
  ) {
    return this.withTripLock(id, async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id } });
      if (!trip) throw new NotFoundException('Không tìm thấy chuyến');
      if (
        user.role !== Role.BUS_ATTENDANT ||
        trip.assignedBusAttendantId !== user.id
      ) {
        throw new ForbiddenException(
          'Chỉ phụ xe đang được phân công được đính chính',
        );
      }
      if (
        trip.direction !== RouteDirection.TO_SCHOOL ||
        trip.status !== TripStatus.IN_PROGRESS ||
        !trip.arrivedAtSchoolAt
      ) {
        throw new ConflictException(
          'Chỉ đính chính sau khi đến trường và trước khi hoàn thành',
        );
      }
      const attendance = await tx.tripAttendance.findUnique({
        where: { tripId_studentId: { tripId: id, studentId } },
      });
      if (!attendance || attendance.excludedAt)
        throw new NotFoundException('Học sinh không thuộc roster hoạt động');
      if (attendance.status !== dto.expectedStatus || attendance.alightedAt) {
        throw new ConflictException(
          'Điểm danh đã thay đổi hoặc trẻ đã xuống xe',
        );
      }
      if (attendance.status === dto.status)
        return { message: 'Điểm danh đã ở trạng thái này', attendance };
      const now = new Date();
      const updated = await tx.tripAttendance.update({
        where: { id: attendance.id },
        data: {
          status: dto.status,
          absenceReason:
            dto.status === AttendanceStatus.ABSENT ? dto.reason : null,
          markedById: user.id,
          markedAt: now,
        },
      });
      const audit = [
        ...(Array.isArray(trip.operationAudit) ? trip.operationAudit : []),
        {
          action: 'ATTENDANCE_CORRECTION',
          studentId,
          beforeStatus: attendance.status,
          afterStatus: dto.status,
          reason: dto.reason,
          actorId: user.id,
          occurredAt: now.toISOString(),
        },
      ];
      await tx.trip.update({
        where: { id },
        data: { operationAudit: audit as Prisma.InputJsonArray },
      });
      await notifyTrip(
        tx,
        id,
        'ATTENDANCE_CORRECTION',
        user.id,
        studentId,
        now.toISOString(),
      );
      return { message: 'Đã đính chính điểm danh', attendance: updated };
    });
  }

  async cancelAllAbsent(id: string, dto: TripReasonDto, user: User) {
    return this.withTripLock(id, async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id },
        include: { attendances: true },
      });
      if (!trip) throw new NotFoundException('Không tìm thấy chuyến');
      const allowed =
        user.role === Role.SYSTEM_ADMIN ||
        (user.role === Role.SCHOOL_ADMIN && user.schoolId === trip.schoolId) ||
        (user.role === Role.BUS_ATTENDANT &&
          user.id === trip.assignedBusAttendantId);
      if (!allowed)
        throw new ForbiddenException('Không có quyền hủy chuyến này');
      const roster = trip.attendances.filter((a) => !a.excludedAt);
      if (
        trip.direction !== RouteDirection.TO_PARKING ||
        trip.status !== TripStatus.SCHEDULED ||
        trip.actualStartTime ||
        !trip.attendantReadyAt ||
        !roster.length ||
        roster.some(
          (a) =>
            a.status !== AttendanceStatus.ABSENT ||
            a.alightedAt ||
            !a.absenceReason?.trim(),
        )
      ) {
        throw new ConflictException(
          'Chỉ hủy chiều về đã Ready khi toàn bộ học sinh được ghi vắng có lý do',
        );
      }
      const now = new Date();
      await tx.trip.update({
        where: { id },
        data: {
          status: TripStatus.CANCELLED,
          cancelledAt: now,
          cancelledById: user.id,
          cancellationReason: dto.reason,
          operationAudit: [
            ...(Array.isArray(trip.operationAudit) ? trip.operationAudit : []),
            {
              action: 'CANCEL_ALL_ABSENT',
              reason: dto.reason,
              actorId: user.id,
              occurredAt: now.toISOString(),
            },
          ] as Prisma.InputJsonArray,
        },
      });
      await tx.leaveNotice.updateMany({
        where: { tripId: id, status: LeaveNoticeStatus.PENDING_REPLACEMENT },
        data: {
          status: LeaveNoticeStatus.TRIP_CANCELLED,
          processedAt: now,
          processedById: user.id,
        },
      });
      await closeCancelledTripTasks(tx, [id]);
      await notifyCancelledTrips(
        tx,
        [id],
        'all-absent:' + id + ':' + now.toISOString(),
        user.id,
      );
      return { message: 'Đã hủy chuyến do toàn bộ học sinh vắng mặt' };
    });
  }

  async reopenTrip(id: string, dto: ReopenTripDto, user: User) {
    if (user.role !== Role.SYSTEM_ADMIN)
      throw new ForbiddenException('Chỉ nhà xe được mở lại chuyến');
    return this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
      const trip = await tx.trip.findUnique({
        where: { id },
        include: {
          attendances: true,
          route: { include: {
            routePlan: true,
            school: true,
            stops: { include: { student: true }, orderBy: { stopOrder: 'asc' } },
          } },
        },
      });
      if (!trip) throw new NotFoundException('Không tìm thấy chuyến');
      if (
        trip.status !== TripStatus.CANCELLED ||
        !trip.scheduledStartAt ||
        new Date() >= trip.scheduledStartAt ||
        trip.actualStartTime ||
        trip.actualEndTime ||
        trip.attendances.some(
          (a) => a.status === AttendanceStatus.PRESENT || a.alightedAt,
        )
      ) {
        throw new ConflictException(
          'Chỉ mở lại chuyến đã hủy trước giờ chạy, chưa nhận trẻ hoặc xuất phát',
        );
      }
      const plan = trip.route.routePlan;
      const date = trip.serviceDate.toISOString().slice(0, 10);
      const day = plan.activatedAt && await this.planServiceDay(tx, plan, trip.route.school, date);
      if (!day?.start || !day.end) {
        throw new ConflictException('Phương án hoặc ngày phục vụ không còn hiệu lực');
      }
      const { timing, studentIds, snapshot } = await this.prepareTrip(tx, trip.route, day, date, 'MANUAL');
      if (new Date() >= timing.scheduledStartAt) {
        throw new ConflictException('Giờ xuất phát theo lịch hiện hành đã qua');
      }
      const targetTrip = { ...trip, ...timing };
      const vehicleId = dto.vehicleId ?? trip.assignedVehicleId;
      const driverId = dto.driverId ?? trip.assignedDriverId;
      const busAttendantId = dto.busAttendantId ?? trip.assignedBusAttendantId;
      await assertVehicleAvailableForTrip(
        tx,
        vehicleId,
        trip.schoolId,
        targetTrip,
        studentIds.length,
      );
      await assertStaffAvailableForTrip(tx, {
        staffId: driverId,
        expectedRole: Role.DRIVER,
        schoolId: trip.schoolId,
        tripId: id,
        targetTrip,
      });
      await assertStaffAvailableForTrip(tx, {
        staffId: busAttendantId,
        expectedRole: Role.BUS_ATTENDANT,
        schoolId: trip.schoolId,
        tripId: id,
        targetTrip,
      });
      const notices = await tx.leaveNotice.findMany({
        where: {
          tripId: id,
          kind: LeaveNoticeKind.STUDENT,
          status: LeaveNoticeStatus.RECORDED,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      const now = new Date();
      if (now >= trip.scheduledStartAt || now >= timing.scheduledStartAt) {
        throw new ConflictException('Đã đến giờ xuất phát, không thể mở lại chuyến');
      }
      const before = {
        status: trip.status,
        routeSnapshot: trip.routeSnapshot,
        roster: trip.attendances,
        scheduledStartAt: trip.scheduledStartAt,
        scheduledEndAt: trip.scheduledEndAt,
        scheduledStartTime: trip.scheduledStartTime,
        scheduledEndTime: trip.scheduledEndTime,
        vehicleId: trip.assignedVehicleId,
        driverId: trip.assignedDriverId,
        busAttendantId: trip.assignedBusAttendantId,
        attendantReadyAt: trip.attendantReadyAt,
        cancelledById: trip.cancelledById,
      };
      await tx.tripAttendance.updateMany({
        where: { tripId: id, excludedAt: null, studentId: { notIn: studentIds } },
        data: { excludedAt: now, exclusionReason: 'ROSTER_SYNC_REMOVED' },
      });
      await tx.tripAttendance.updateMany({
        where: { tripId: id, studentId: { in: studentIds } },
        data: {
          status: AttendanceStatus.UNMARKED,
          absenceReason: null,
          markedAt: null,
          markedById: null,
          alightedAt: null,
          excludedAt: null,
          exclusionReason: null,
        },
      });
      const existingIds = new Set(trip.attendances.map(attendance => attendance.studentId));
      const addedIds = studentIds.filter(studentId => !existingIds.has(studentId));
      if (addedIds.length) {
        await tx.tripAttendance.createMany({ data: addedIds.map(studentId => ({ tripId: id, studentId })) });
      }
      const rosterIds = new Set(studentIds);
      for (const notice of notices) {
        if (!notice.studentId || !rosterIds.has(notice.studentId)) continue;
        const appliedAt = (notice.attendanceBefore as Prisma.JsonObject | null)?.appliedMarkedAt;
        await tx.tripAttendance.update({
          where: { tripId_studentId: { tripId: id, studentId: notice.studentId } },
          data: {
            status: AttendanceStatus.ABSENT,
            absenceReason: 'Phụ huynh xin nghỉ',
            markedById: notice.reportedById,
            markedAt: typeof appliedAt === 'number' && Number.isFinite(appliedAt)
              ? new Date(appliedAt)
              : notice.createdAt,
          },
        });
      }
      const roster = await tx.tripAttendance.findMany({ where: { tripId: id } });
      const after = { status: TripStatus.SCHEDULED, ...timing, routeSnapshot: snapshot, roster, vehicleId, driverId, busAttendantId, attendantReadyAt: null };
      const audit = [
        ...(Array.isArray(trip.operationAudit) ? trip.operationAudit : []),
        {
          action: 'REOPENED',
          reason: dto.reason,
          actorId: user.id,
          occurredAt: now.toISOString(),
          before: JSON.parse(JSON.stringify(before)),
          after: JSON.parse(JSON.stringify(after)),
          previousCancellationReason: trip.cancellationReason,
          previousCancelledAt: trip.cancelledAt?.toISOString() ?? null,
        },
      ];
      await tx.trip.update({
        where: { id },
        data: {
          status: TripStatus.SCHEDULED,
          ...timing,
          routeSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          assignedVehicleId: vehicleId,
          assignedDriverId: driverId,
          assignedBusAttendantId: busAttendantId,
          attendantReadyAt: null,
          cancelledAt: null,
          cancelledById: null,
          cancellationReason: null,
          operationAudit: audit as Prisma.InputJsonArray,
        },
      });
      await notifyTrip(
        tx,
        id,
        'REOPENED',
        user.id,
        undefined,
        now.toISOString(),
      );
      return { message: 'Đã mở lại chuyến', tripId: id };
    });
  }

  async assertTripOperationAllowed(id: string, db: Prisma.TransactionClient = this.prisma): Promise<void> {
    await this.contractLifecycle?.assertTripContractOpen(id, db);
  }

  async assertTripAccess(trip: {
    id: string; schoolId: string; assignedDriverId: string; assignedBusAttendantId: string;
    attendances?: { studentId: string }[];
  }, user: User): Promise<Set<string>> {
    if (user.role === Role.SYSTEM_ADMIN) return new Set();
    if (user.role === Role.SCHOOL_ADMIN && user.schoolId && user.schoolId === trip.schoolId) return new Set();
    if (user.role === Role.DRIVER && trip.assignedDriverId === user.id) return new Set();
    if (user.role === Role.BUS_ATTENDANT && trip.assignedBusAttendantId === user.id) return new Set();
    if (user.role === Role.PARENT) {
      const links = await this.prisma.parentStudentLink.findMany({
        where: { parentId: user.id, studentId: { in: (trip.attendances || []).map(a => a.studentId) } },
        select: { studentId: true },
      });
      const rosterIds = new Set((trip.attendances || []).map(a => a.studentId));
      const ids = new Set(links.filter(link => rosterIds.has(link.studentId)).map(link => link.studentId));
      if (ids.size) return ids;
    }
    throw new ForbiddenException('Bạn không có quyền xem chuyến xe này');
  }

  /**
   * Cron Job: Tự động quét và sinh chuyến xe hàng ngày cho tất cả các trường có phương án ACTIVE.
   * Chạy lúc 02:00 sáng mỗi ngày theo múi giờ Việt Nam. Cửa sổ lookahead lấy từ ENV TRIP_GENERATION_LOOKAHEAD_DAYS (mặc định 7 ngày).
   */
  @Cron('0 2 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async handleDailyCronGeneration(): Promise<void> {
    await this.contractLifecycle?.reconcile();
    const lookaheadDays = Number(this.configService.get('TRIP_GENERATION_LOOKAHEAD_DAYS')) || 7;
    this.logger.log(`[Cron] Bắt đầu tự động sinh chuyến xe hàng ngày (Lookahead: ${lookaheadDays} ngày)...`);
    const todayVn = formatDateToVnYmd(new Date());
    const toDateVn = this.addDaysToYmd(todayVn, lookaheadDays);
    await this.generateTripsInternal(undefined, todayVn, toDateVn);
  }

  /**
   * Sinh chuyến xe thủ công theo khoảng ngày cho đúng một trường cụ thể có phương án ACTIVE.
   * Chỉ SYSTEM_ADMIN được phép gọi. Bắt buộc schoolId, date range phải nằm trong thời hạn hợp đồng trường.
   */
  async generateTrips(
    dto: GenerateTripsDto,
    currentUser?: User,
  ): Promise<GenerateTripsResponseDto> {
    if (currentUser && currentUser.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException('Chỉ SYSTEM_ADMIN mới có quyền sinh chuyến xe thủ công');
    }

    await this.contractLifecycle?.reconcile();

    const { schoolId, fromDate, toDate } = dto;
    if (!schoolId || schoolId.trim() === '' || schoolId.toLowerCase() === 'all') {
      throw new BadRequestException('schoolId là bắt buộc và chỉ được sinh chuyến cho đúng một trường cụ thể');
    }

    if (fromDate > toDate) {
      throw new BadRequestException('fromDate không thể lớn hơn toDate');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học được chỉ định');
    }

    const contractStart = formatDateToVnYmd(new Date(school.contractStartDate));
    const contractEnd = formatDateToVnYmd(new Date(school.contractEndDate));

    if (fromDate < contractStart || toDate > contractEnd) {
      throw new BadRequestException(
        `Khoảng ngày sinh chuyến (${fromDate} đến ${toDate}) phải nằm trong thời hạn hợp đồng của trường (${contractStart} đến ${contractEnd})`,
      );
    }

    return this.generateTripsInternal(schoolId, fromDate, toDate);
  }

  /**
   * Logic cốt lõi sinh chuyến xe theo khoảng ngày (dùng chung cho Manual Generate 1 trường & Cron Job toàn hệ thống).
   */
  private async planServiceDay(
    db: Prisma.TransactionClient,
    plan: Pick<import('@prisma/client').RoutePlan, 'status' | 'activatedAt' | 'createdAt' | 'needsReoptimization'>,
    school: Pick<import('@prisma/client').School, 'id' | 'contractStartDate' | 'contractEndDate' | 'isActive'>,
    date: string,
  ) {
    const activationDay = plan.activatedAt ? formatDateToVnYmd(plan.activatedAt) : '1970-01-01';
    if (plan.status !== RoutePlanStatus.ACTIVE || plan.needsReoptimization || date <= activationDay ||
        isContractExpired(school.contractEndDate) || !canServeOnDate(school, date) ||
        await pendingParkingChange(db, date)) return null;
    return serviceDay(db, school.id, date, plan.createdAt);
  }

  private tripTiming(direction: RouteDirection, duration: number, day: { start: string; end: string }, date: string) {
    const start = direction === RouteDirection.TO_SCHOOL
      ? timeStrToSeconds(day.start) - duration
      : timeStrToSeconds(day.end);
    const end = start + duration;
    const midnight = combineDateAndTimeUtc(date, '00:00').getTime();
    return {
      scheduledStartTime: this.tripClockTime(start),
      scheduledEndTime: this.tripClockTime(end),
      scheduledStartAt: new Date(midnight + start * 1000),
      scheduledEndAt: new Date(midnight + end * 1000),
    };
  }

  private tripClockTime(seconds: number): string {
    return secondsToTimeStr(((seconds % 86400) + 86400) % 86400);
  }

  private async prepareTrip(
    tx: Prisma.TransactionClient,
    route: Prisma.RouteGetPayload<{ include: { school: true; stops: { include: { student: true } } } }>,
    day: { start: string; end: string },
    serviceDate: string,
    snapshotReason: 'GENERATION' | 'MANUAL',
  ) {
    const studentIds = [...new Set(route.stops.flatMap(stop => stop.studentId ? [stop.studentId] : []))];
    if (!studentIds.length) throw new ConflictException('Tuyến không có học sinh nào');
    if (route.stops.some(stop => stop.studentId && stop.student?.status !== 'AVAILABLE')) {
      throw new ConflictException('Tuyến có học sinh không còn đủ điều kiện phục vụ');
    }

    const duration = route.estimatedDurationSeconds;
    const timing = this.tripTiming(route.direction, duration, day, serviceDate);
    const { scheduledStartTime, scheduledEndTime } = timing;
    const parking = await tx.systemSetting.findUnique({ where: { key: 'PARKING_LOT' } });
    const delta = timeStrToSeconds(scheduledStartTime) - timeStrToSeconds(route.departureTime ?? scheduledStartTime);
    const snapshot = buildTripRouteSnapshot({
      routeId: route.id,
      routeName: route.name,
      direction: route.direction,
      schoolId: route.schoolId,
      schoolName: route.school.name,
      schoolCoords: {
        latitude: route.school.latitude,
        longitude: route.school.longitude,
        addressText: route.school.addressText,
      },
      parkingCoords: configuredParking(parking?.value),
      polylineGeometry: route.polylineGeometry,
      totalDistanceMeters: route.totalDistanceMeters,
      estimatedDurationSeconds: duration,
      departureTime: scheduledStartTime,
      arrivalTime: scheduledEndTime,
      routingConstraints: route.routingConstraints,
      stops: route.stops.map(stop => ({
        ...stop,
        plannedArrivalTime: stop.plannedArrivalTime
          ? this.tripClockTime(timeStrToSeconds(stop.plannedArrivalTime) + delta)
          : null,
      })),
      snapshotReason,
    });

    return { timing, studentIds, snapshot };
  }

  private async generateTripsInternal(
    schoolId: string | undefined,
    fromDate: string,
    toDate: string,
  ): Promise<GenerateTripsResponseDto> {
    const candidates = await this.prisma.route.findMany({
      where: { schoolId, routePlan: { status: RoutePlanStatus.ACTIVE, needsReoptimization: false } },
      select: { id: true, name: true },
    });
    const initialParking = await this.prisma.systemSetting.findUnique({ where: { key: 'PARKING_LOT' } });
    configuredParking(initialParking?.value);

    let totalEligible = 0;
    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failures: TripGenerationFailureDto[] = [];

    for (const candidate of candidates) {
      for (const serviceDate of this.getDateRangeArray(fromDate, toDate)) {
        try {
          const result = await this.prisma.$transaction(async tx => {
            await lockOperations(tx);
            const route = await tx.route.findUnique({
              where: { id: candidate.id },
              include: {
                school: true,
                routePlan: true,
                stops: { include: { student: true }, orderBy: { stopOrder: 'asc' } },
              },
            });
            if (!route || (schoolId && route.schoolId !== schoolId)) return 'ineligible';
            const day = await this.planServiceDay(tx, route.routePlan, route.school, serviceDate);
            if (!day) return 'ineligible';

            totalEligible++;
            const date = new Date(serviceDate + 'T00:00:00.000Z');
            if (await tx.trip.findUnique({ where: { routeId_serviceDate: { routeId: route.id, serviceDate: date } } })) {
              return 'skipped';
            }

            const { proposedVehicleId: vehicleId, defaultDriverId: driverId, defaultBusAttendantId: busAttendantId } = route;
            if (!vehicleId || !driverId || !busAttendantId) {
              throw new ConflictException('Tuyến chưa có đầy đủ Xe, Tài xế hoặc Giáo viên mặc định');
            }
            const { timing, studentIds, snapshot } = await this.prepareTrip(tx, route, day, serviceDate, 'GENERATION');
            const targetTrip = { id: '', serviceDate: date, ...timing };

            await assertVehicleAvailableForTrip(tx, vehicleId, route.schoolId, targetTrip, studentIds.length);
            await assertStaffAvailableForTrip(tx, { staffId: driverId, expectedRole: Role.DRIVER, schoolId: route.schoolId, tripId: '', targetTrip });
            await assertStaffAvailableForTrip(tx, { staffId: busAttendantId, expectedRole: Role.BUS_ATTENDANT, schoolId: route.schoolId, tripId: '', targetTrip });

            await tx.trip.create({ data: {
              routeId: route.id,
              schoolId: route.schoolId,
              serviceDate: date,
              direction: route.direction,
              status: TripStatus.SCHEDULED,
              ...timing,
              assignedVehicleId: vehicleId,
              assignedDriverId: driverId,
              assignedBusAttendantId: busAttendantId,
              routeSnapshot: snapshot as unknown as Prisma.InputJsonValue,
              attendances: { createMany: { data: studentIds.map(studentId => ({ studentId, status: AttendanceStatus.UNMARKED })) } },
            } });
            return 'created';
          });
          if (result === 'created') createdCount++;
          if (result === 'skipped') skippedCount++;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            skippedCount++;
          } else {
            failedCount++;
            failures.push({
              routeId: candidate.id,
              routeName: candidate.name,
              serviceDate,
              reason: error instanceof Error ? error.message : 'Lỗi khi lưu chuyến xe',
            });
          }
        }
      }
    }

    this.logger.log(
      `Trip Generation Result: eligible=${totalEligible}, created=${createdCount}, skipped=${skippedCount}, failed=${failedCount}`,
    );

    return {
      totalEligible,
      createdCount,
      skippedCount,
      failedCount,
      failures,
    };
  }

  /**
   * Lấy danh sách lịch trình hợp nhất (Persisted Trips + Virtual Occurrences) kèm phân trang server-side chuẩn.
   */
  async listTrips(query: ListTripsQueryDto, currentUser: User): Promise<TripListResponseDto> {
    if (currentUser.role === Role.SCHOOL_ADMIN && !currentUser.schoolId) {
      throw new ForbiddenException('Tài khoản chưa được phân công trường');
    }
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));

    // Khóa trường nếu là SCHOOL_ADMIN
    const effectiveSchoolId =
      currentUser.role === Role.SCHOOL_ADMIN ? currentUser.schoolId : query.schoolId;

    // Khoảng ngày: Mặc định từ hôm nay đến 14 ngày tới nếu không truyền
    const todayVn = formatDateToVnYmd(new Date());
    const fromDate = query.fromDate || todayVn;
    const toDate = query.toDate || this.addDaysToYmd(fromDate, 13);

    // 1. Lấy tất cả Persisted Trips trong khoảng ngày
    const tripWhere: any = {
      serviceDate: {
        gte: new Date(`${fromDate}T00:00:00.000Z`),
        lte: new Date(`${toDate}T00:00:00.000Z`),
      },
    };
    if (effectiveSchoolId) {
      tripWhere.schoolId = effectiveSchoolId;
    }

    const persistedTrips = await this.prisma.trip.findMany({
      where: tripWhere,
      include: {
        school: { select: { id: true, name: true } },
        assignedVehicle: { select: { id: true, licensePlate: true, brand: true, seatCount: true } },
        assignedDriver: { select: { id: true, fullName: true, phone: true } },
        assignedBusAttendant: { select: { id: true, fullName: true, phone: true } },
        leaveNotices: {
          where: {
            status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            kind: { in: [LeaveNoticeKind.DRIVER, LeaveNoticeKind.BUS_ATTENDANT] },
          },
          select: { id: true, kind: true },
        },
        route: {
          select: {
            id: true,
            name: true,
            routePlanId: true,
            routePlan: { select: { id: true, name: true } },
            stops: { select: { studentId: true } },
          },
        },
      },
      orderBy: [{ serviceDate: 'asc' }, { scheduledStartTime: 'asc' }],
    });

    // Tạo Set để tra cứu các chuyến đã có: key = `${routeId}_${serviceDateYmd}`
    const persistedKeySet = new Set<string>();
    const persistedItems: TripItemResponseDto[] = [];

    for (const pt of persistedTrips) {
      Object.assign(pt, await effectiveTripTiming(this.prisma, pt.id));
      const dateYmd = formatDateToVnYmd(new Date(pt.serviceDate));
      const key = `${pt.routeId}_${dateYmd}`;
      persistedKeySet.add(key);

      const studentIds = new Set(pt.route.stops.map((s) => s.studentId).filter(Boolean));
      const hasPendingStaff = (pt.leaveNotices || []).length > 0;
      const canReportLeave =
        !await tripBlockReason(this.prisma, pt.id) &&
        pt.status === TripStatus.SCHEDULED &&
        !pt.actualStartTime &&
        (pt.direction !== RouteDirection.TO_PARKING || !pt.attendantReadyAt);

      persistedItems.push({
        type: 'PERSISTED',
        id: pt.id,
        tripId: pt.id,
        routeId: pt.routeId,
        routeName: pt.route.name,
        routePlanId: pt.route.routePlanId,
        routePlanName: pt.route.routePlan.name,
        schoolId: pt.schoolId,
        schoolName: pt.school.name,
        serviceDate: dateYmd,
        dayOfWeek: getDayOfWeekVietnamese(getDayOfWeekKey(dateYmd)),
        direction: pt.direction,
        status: pt.status,
        scheduledStartAt: pt.scheduledStartAt,
        scheduledEndAt: pt.scheduledEndAt,
        scheduledStartTime: pt.scheduledStartTime,
        scheduledEndTime: pt.scheduledEndTime,
        vehicleId: pt.assignedVehicle.id,
        vehiclePlate: pt.assignedVehicle.licensePlate,
        vehicleBrand: pt.assignedVehicle.brand,
        vehicleSeats: pt.assignedVehicle.seatCount,
        driverId: pt.assignedDriver.id,
        driverName: pt.assignedDriver.fullName,
        driverPhone: pt.assignedDriver.phone,
        busAttendantId: pt.assignedBusAttendant.id,
        busAttendantName: pt.assignedBusAttendant.fullName,
        busAttendantPhone: pt.assignedBusAttendant.phone,
        studentCount: studentIds.size,
        assignmentStatus: hasPendingStaff ? 'WAITING_ASSIGNMENT' : 'ASSIGNED',
        canReportLeave,
      });
    }

    // 2. Tính toán Virtual Occurrences cho các ngày chưa có Trip
    const virtualItems: TripItemResponseDto[] = [];
    const planWhere: any = { status: RoutePlanStatus.ACTIVE, needsReoptimization: false };
    if (effectiveSchoolId) {
      planWhere.schoolId = effectiveSchoolId;
    }

    const activePlans = await this.prisma.routePlan.findMany({
      where: planWhere,
      include: {
        school: true,
        routes: {
          include: {
            proposedVehicle: true,
            defaultDriver: true,
            defaultBusAttendant: true,
            stops: { select: { studentId: true } },
          },
        },
      },
    });

    const dates = this.getDateRangeArray(fromDate, toDate);

    for (const plan of activePlans) {
      const school = plan.school;

      for (const serviceDateStr of dates) {
        const daySched = await this.planServiceDay(this.prisma, plan, school, serviceDateStr);
        if (!daySched || !daySched.start || !daySched.end) continue;

        for (const route of plan.routes) {
          const key = `${route.id}_${serviceDateStr}`;
          if (persistedKeySet.has(key)) {
            // Đã có Trip thật -> không sinh Virtual
            continue;
          }

          const timing = this.tripTiming(route.direction, route.estimatedDurationSeconds, daySched, serviceDateStr);
          const { scheduledStartTime: depTimeStr, scheduledEndTime: arrTimeStr } = timing;

          const studentIds = new Set(route.stops.map((s) => s.studentId).filter(Boolean));

          virtualItems.push({
            type: 'VIRTUAL',
            id: `virtual_${route.id}_${serviceDateStr}`,
            tripId: null,
            routeId: route.id,
            routeName: route.name,
            routePlanId: plan.id,
            routePlanName: plan.name,
            schoolId: plan.schoolId,
            schoolName: school.name,
            serviceDate: serviceDateStr,
            dayOfWeek: getDayOfWeekVietnamese(getDayOfWeekKey(serviceDateStr)),
            direction: route.direction,
            status: 'NOT_CREATED',
            scheduledStartAt: timing.scheduledStartAt,
            scheduledEndAt: timing.scheduledEndAt,
            scheduledStartTime: depTimeStr,
            scheduledEndTime: arrTimeStr,
            vehicleId: route.proposedVehicle?.id,
            vehiclePlate: route.proposedVehicle?.licensePlate || 'Chưa gán',
            vehicleBrand: route.proposedVehicle?.brand || null,
            vehicleSeats: route.proposedVehicle?.seatCount || null,
            driverId: route.defaultDriver?.id,
            driverName: route.defaultDriver?.fullName || 'Chưa gán',
            driverPhone: route.defaultDriver?.phone || null,
            busAttendantId: route.defaultBusAttendant?.id,
            busAttendantName: route.defaultBusAttendant?.fullName || 'Chưa gán',
            busAttendantPhone: route.defaultBusAttendant?.phone || null,
            studentCount: studentIds.size,
            assignmentStatus: 'ASSIGNED',
            canReportLeave: false,
          });
        }
      }
    }

    // 3. Hợp nhất danh sách và áp dụng bộ lọc status & search
    let unified = [...persistedItems, ...virtualItems];

    if (query.status) {
      const targetStatus = query.status.trim().toUpperCase();
      if (targetStatus === 'NOT_CREATED') {
        unified = unified.filter((item) => item.type === 'VIRTUAL');
      } else {
        unified = unified.filter((item) => item.type === 'PERSISTED' && item.status === targetStatus);
      }
    }

    if (query.search) {
      const q = query.search.trim().toLowerCase();
      unified = unified.filter(
        (item) =>
          item.routeName.toLowerCase().includes(q) ||
          item.schoolName.toLowerCase().includes(q) ||
          item.vehiclePlate.toLowerCase().includes(q) ||
          item.driverName.toLowerCase().includes(q),
      );
    }

    // 4. Sắp xếp ổn định theo serviceDate tăng dần, sau đó theo giờ xuất phát
    unified.sort((a, b) => {
      if (a.serviceDate !== b.serviceDate) {
        return a.serviceDate.localeCompare(b.serviceDate);
      }
      return (a.scheduledStartTime || '').localeCompare(b.scheduledStartTime || '');
    });

    const total = unified.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const items = unified.slice(skip, skip + limit);

    return {
      items,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Xem chi tiết chuyến xe đã lập lịch (Trip Detail).
   */
  async getTripDetail(id: string, currentUser: User): Promise<TripDetailResponseDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        school: true,
        assignedVehicle: true,
        assignedDriver: true,
        assignedBusAttendant: true,
        attendances: true,
        leaveNotices: {
          where: {
            status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            kind: { in: [LeaveNoticeKind.DRIVER, LeaveNoticeKind.BUS_ATTENDANT] },
          },
          select: { id: true, kind: true },
        },
        route: {
          include: {
            routePlan: true,
            stops: {
              include: {
                student: true,
              },
              orderBy: { stopOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến xe');
    }

    await this.assertTripAccess(trip, currentUser);

    Object.assign(trip, await effectiveTripTiming(this.prisma, trip.id));
    const dateYmd = formatDateToVnYmd(new Date(trip.serviceDate));
    const resolvedRoute = resolveTripRoute(trip);
    const activeAttendances = filterActiveAttendances(trip.attendances || []);
    const excludedStudentIds = new Set(
      (trip.attendances || []).filter((a) => a.excludedAt).map((a) => a.studentId),
    );

    const parkingLocation = resolvedRoute.parkingCoords
      ? {
          latitude: resolvedRoute.parkingCoords.latitude,
          longitude: resolvedRoute.parkingCoords.longitude,
          addressText: resolvedRoute.parkingCoords.addressText || '',
        }
      : undefined;

    const schoolCoords = resolvedRoute.schoolCoords || {
      latitude: trip.school.latitude,
      longitude: trip.school.longitude,
      addressText: trip.school.addressText,
    };

    const schoolLocation = {
      latitude: schoolCoords.latitude,
      longitude: schoolCoords.longitude,
      name: resolvedRoute.schoolName || trip.school.name,
    };

    const attendanceMap = new Map((trip.attendances || []).map((a) => [a.studentId, a]));

    const stops: TripStopResponseDto[] = resolvedRoute.stops
      .filter((s) => !s.studentId || !excludedStudentIds.has(s.studentId))
      .map((s, idx) => {
        const att = s.studentId ? attendanceMap.get(s.studentId) : undefined;
        return {
          id: s.id,
          stopOrder: idx + 1,
          stopType: s.stopType,
          studentId: s.studentId || null,
          studentName: s.studentName || null,
          addressText: s.addressText,
          latitude: s.latitude,
          longitude: s.longitude,
          plannedArrivalTime: s.plannedArrivalTime || null,
          attendanceStatus: att ? att.status : AttendanceStatus.UNMARKED,
          absenceReason: att?.status === AttendanceStatus.ABSENT ? att.absenceReason : null,
          attendanceMarkedAt: att?.markedAt ? att.markedAt.toISOString() : null,
        };
      });

    return {
      type: 'PERSISTED',
      id: trip.id,
      tripId: trip.id,
      routeId: trip.routeId,
      routeName: resolvedRoute.routeName,
      routePlanId: resolvedRoute.routePlanId || trip.route?.routePlanId || '',
      routePlanName: resolvedRoute.routePlanName || trip.route?.routePlan?.name || '',
      schoolId: trip.schoolId,
      schoolName: resolvedRoute.schoolName || trip.school.name,
      serviceDate: dateYmd,
      dayOfWeek: getDayOfWeekVietnamese(getDayOfWeekKey(dateYmd)),
      direction: trip.direction,
      status: trip.status,
      operationAudit: trip.operationAudit,
      adminFinalization: trip.adminFinalization as Record<string, unknown> | null,
      scheduledStartAt: trip.scheduledStartAt,
      scheduledEndAt: trip.scheduledEndAt,
      scheduledStartTime: trip.scheduledStartTime,
      scheduledEndTime: trip.scheduledEndTime,
      vehicleId: trip.assignedVehicle.id,
      vehiclePlate: trip.assignedVehicle.licensePlate,
      vehicleBrand: trip.assignedVehicle.brand,
      vehicleSeats: trip.assignedVehicle.seatCount,
      driverId: trip.assignedDriver.id,
      driverName: trip.assignedDriver.fullName,
      driverPhone: trip.assignedDriver.phone,
      busAttendantId: trip.assignedBusAttendant.id,
      busAttendantName: trip.assignedBusAttendant.fullName,
      busAttendantPhone: trip.assignedBusAttendant.phone,
      studentCount: activeAttendances.length,
      polylineGeometry: resolvedRoute.polylineGeometry,
      totalDistanceMeters: resolvedRoute.totalDistanceMeters,
      estimatedDurationSeconds: resolvedRoute.estimatedDurationSeconds,
      isAttendantReady: Boolean(trip.attendantReadyAt),
      attendantReadyAt: trip.attendantReadyAt,
      actualStartTime: trip.actualStartTime,
      actualEndTime: trip.actualEndTime,
      stops,
      parkingLocation,
      schoolLocation,
      assignmentStatus: (trip.leaveNotices || []).length > 0 ? 'WAITING_ASSIGNMENT' : 'ASSIGNED',
      canReportLeave:
        !await tripBlockReason(this.prisma, trip.id) &&
        trip.status === TripStatus.SCHEDULED &&
        !trip.actualStartTime &&
        (trip.direction !== RouteDirection.TO_PARKING || !trip.attendantReadyAt),
    };
  }

  /**
   * Tinh chỉnh phân công Xe/Tài xế/Giáo viên cho một chuyến xe cụ thể (chỉ ảnh hưởng chuyến này).
   */
  async updateTripAssignment(
    id: string,
    dto: UpdateTripAssignmentDto,
    currentUser: User,
  ): Promise<TripDetailResponseDto> {
    await this.withTripLock(id, async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id },
        include: {
          school: true,
          attendances: { select: { status: true, studentId: true, excludedAt: true } },
          route: {
            include: { stops: { select: { studentId: true } } },
          },
        },
      });

      if (!trip) {
        throw new NotFoundException('Không tìm thấy chuyến xe');
      }

      if (trip.status !== TripStatus.SCHEDULED) {
        throw new BadRequestException('Chỉ có thể điều phối lại chuyến xe đang ở trạng thái SCHEDULED (chờ vận hành)');
      }

      if (isTripFrozen(trip)) {
        throw new ConflictException(
          'Chuyến xe đã ở trạng thái đóng băng, không thể thay đổi phân công thông thường',
        );
      }

      if (currentUser.role === Role.SCHOOL_ADMIN && trip.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('Bạn không có quyền chỉnh sửa chuyến xe của trường khác');
      }

      // Phân quyền chi tiết theo từng trường (Field-level RBAC):
      // SYSTEM_ADMIN: Chỉ được phân công / thay đổi Xe và Tài xế. Cấm chạm vào Giáo viên phụ xe.
      // SCHOOL_ADMIN: Chỉ được phân công / thay đổi Giáo viên phụ xe. Cấm chạm vào Xe và Tài xế.
      if (currentUser.role === Role.SYSTEM_ADMIN) {
        if (dto.busAttendantId !== undefined) {
          throw new ForbiddenException(
            'SYSTEM_ADMIN không có quyền phân công hoặc chỉnh sửa Giáo viên phụ xe. Quyền này thuộc SCHOOL_ADMIN trường sở tại.',
          );
        }
        if (!dto.vehicleId && !dto.driverId) {
          throw new BadRequestException('Vui lòng cung cấp thông tin Phương tiện hoặc Tài xế cần cập nhật');
        }
      } else if (currentUser.role === Role.SCHOOL_ADMIN) {
        if (dto.vehicleId !== undefined || dto.driverId !== undefined) {
          throw new ForbiddenException(
            'SCHOOL_ADMIN không có quyền phân công hoặc chỉnh sửa Phương tiện hoặc Tài xế. Quyền này thuộc SYSTEM_ADMIN.',
          );
        }
        if (!dto.busAttendantId) {
          throw new BadRequestException('Vui lòng cung cấp thông tin Giáo viên phụ xe cần cập nhật');
        }
      } else {
        throw new ForbiddenException('Bạn không có quyền cập nhật phân công chuyến xe');
      }


      if ((dto.expectedVehicleId !== undefined && dto.expectedVehicleId !== trip.assignedVehicleId) ||
          (dto.expectedDriverId !== undefined && dto.expectedDriverId !== trip.assignedDriverId) ||
          (dto.expectedBusAttendantId !== undefined && dto.expectedBusAttendantId !== trip.assignedBusAttendantId)) {
        throw new ConflictException('Phân công đã thay đổi. Vui lòng mở lại form.');
      }

      if (dto.driverId && tx.leaveNotice) {
        const activeDriverNotice = await tx.leaveNotice.findFirst({
          where: {
            tripId: id,
            kind: LeaveNoticeKind.DRIVER,
            status: LeaveNoticeStatus.PENDING_REPLACEMENT,
          },
        });
        if (activeDriverNotice) {
          throw new BadRequestException('Chuyến xe đang có báo nghỉ tài xế cần xử lý tại tab Báo nghỉ');
        }
      }

      if (dto.busAttendantId && tx.leaveNotice) {
        const activeAttendantNotice = await tx.leaveNotice.findFirst({
          where: {
            tripId: id,
            kind: LeaveNoticeKind.BUS_ATTENDANT,
            status: LeaveNoticeStatus.PENDING_REPLACEMENT,
          },
        });
        if (activeAttendantNotice) {
          throw new BadRequestException('Chuyến xe đang có báo nghỉ giáo viên cần xử lý tại tab Báo nghỉ');
        }
      }

      await assertResourcesNotAwaitingAdmin(tx, dto);
      const dataToUpdate: any = {};

      // 1. Kiểm tra xe thay thế
      if (dto.vehicleId) {
        await assertVehicleAvailableForTrip(tx, dto.vehicleId, trip.schoolId, trip,
          trip.attendances.filter(a => !a.excludedAt).length);
        dataToUpdate.assignedVehicleId = dto.vehicleId;
      }

      // 2. Kiểm tra tài xế thay thế
      if (dto.driverId) {
        await assertStaffAvailableForTrip(tx, {
          staffId: dto.driverId,
          expectedRole: Role.DRIVER,
          schoolId: trip.schoolId,
          tripId: trip.id,
          targetTrip: trip,
        });
        dataToUpdate.assignedDriverId = dto.driverId;
      }

      // 3. Kiểm tra giáo viên giám sát thay thế
      if (dto.busAttendantId) {
        await assertStaffAvailableForTrip(tx, {
          staffId: dto.busAttendantId,
          expectedRole: Role.BUS_ATTENDANT,
          schoolId: trip.schoolId,
          tripId: trip.id,
          targetTrip: trip,
        });
        dataToUpdate.assignedBusAttendantId = dto.busAttendantId;
        // D03: Nếu đổi Giáo viên phụ xe, bắt buộc reset attendantReadyAt = null
        if (dto.busAttendantId !== trip.assignedBusAttendantId) {
          dataToUpdate.attendantReadyAt = null;
        }
      }

      if (dto.reason) {
        dataToUpdate.cancellationReason = dto.reason;
      }

      await tx.trip.update({
        where: { id },
        data: dataToUpdate,
      });

      const changedFields = (['assignedVehicleId', 'assignedDriverId', 'assignedBusAttendantId'] as AssignmentField[])
        .filter(field => dataToUpdate[field] && dataToUpdate[field] !== trip[field]);
      await recordAssignmentOverride(tx, id, changedFields, currentUser.id);
      if (dto.driverId) await notifyAssignment(tx, id, trip.assignedDriverId, dto.driverId, `trip:${id}:driver:${dto.driverId}:${new Date().toISOString()}`, currentUser.id);
      if (dto.busAttendantId) await notifyAssignment(tx, id, trip.assignedBusAttendantId, dto.busAttendantId, `trip:${id}:attendant:${dto.busAttendantId}:${new Date().toISOString()}`, currentUser.id);
      this.logger.log(`Trip ${id} assignments updated by User ${currentUser.id}`);

    });
    return this.getTripDetail(id, currentUser);
  }

  // ==========================================
  // MOBILE APIS
  // ==========================================

  /**
   * Lịch vận hành ngày/tuần dành riêng cho Tài xế (DRIVER).
   */
  async getDriverSchedule(
    queryParam: string | { date?: string; fromDate?: string; toDate?: string },
    currentUser: User,
  ): Promise<MobileTripItemDto[]> {
    if (currentUser.role !== Role.DRIVER) {
      throw new ForbiddenException('Chỉ tài xế mới có quyền truy cập màn hình này');
    }

    let dateFilter: any;
    let fallbackDateStr: string;
    if (typeof queryParam === 'string') {
      fallbackDateStr = queryParam;
      dateFilter = new Date(`${queryParam}T00:00:00.000Z`);
    } else if (queryParam?.fromDate && queryParam?.toDate) {
      fallbackDateStr = queryParam.fromDate;
      dateFilter = {
        gte: new Date(`${queryParam.fromDate}T00:00:00.000Z`),
        lte: new Date(`${queryParam.toDate}T00:00:00.000Z`),
      };
    } else if (queryParam?.date) {
      fallbackDateStr = queryParam.date;
      dateFilter = new Date(`${queryParam.date}T00:00:00.000Z`);
    } else {
      fallbackDateStr = formatDateToVnYmd(new Date());
      dateFilter = new Date(`${fallbackDateStr}T00:00:00.000Z`);
    }

    // 1. Chuyến thật đã gán cho tài xế này
    const persisted = await this.prisma.trip.findMany({
      where: {
        serviceDate: dateFilter,
        assignedDriverId: currentUser.id,
      },
      include: {
        school: { select: { name: true } },
        assignedVehicle: { select: { licensePlate: true, brand: true } },
        assignedBusAttendant: { select: { fullName: true } },
        leaveNotices: {
          where: {
            status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            kind: { in: [LeaveNoticeKind.DRIVER, LeaveNoticeKind.BUS_ATTENDANT] },
          },
          select: { id: true },
        },
        route: {
          select: {
            id: true,
            name: true,
            stops: { select: { studentId: true } },
          },
        },
      },
      orderBy: [{ serviceDate: 'asc' }, { scheduledStartTime: 'asc' }],
    });

    for (const pt of persisted) Object.assign(pt, await effectiveTripTiming(this.prisma, pt.id));
    return await Promise.all(persisted.map(async (pt) => {
      const studentIds = new Set(pt.route.stops.map((s) => s.studentId).filter(Boolean));
      const sDate = formatDateToVnYmd(new Date(pt.serviceDate));
      const hasPendingStaff = (pt.leaveNotices || []).length > 0;
      const canReportLeave =
        !hasPendingStaff &&
        !await tripBlockReason(this.prisma, pt.id) &&
        pt.status === TripStatus.SCHEDULED &&
        !pt.actualStartTime &&
        (pt.direction !== RouteDirection.TO_PARKING || !pt.attendantReadyAt);

      return {
        id: pt.id,
        isVirtual: false,
        type: 'PERSISTED' as const,
        routeId: pt.route.id,
        routeName: pt.route.name,
        direction: pt.direction,
        schoolName: pt.school.name,
        scheduledStartTime: pt.scheduledStartTime,
        scheduledEndTime: pt.scheduledEndTime,
        scheduledTime: `${pt.scheduledStartTime} - ${pt.scheduledEndTime}`,
        vehiclePlate: pt.assignedVehicle.licensePlate,
        vehicleBrand: pt.assignedVehicle.brand,
        busAttendantName: pt.assignedBusAttendant.fullName,
        studentCount: studentIds.size,
        status: pt.status,
        serviceDate: sDate,
        assignmentStatus: hasPendingStaff ? 'WAITING_ASSIGNMENT' : 'ASSIGNED',
        canReportLeave,
      };
    }));;
  }

  /**
   * Lịch vận hành ngày/tuần dành riêng cho Giáo viên giám sát (BUS_ATTENDANT).
   */
  async getBusAttendantSchedule(
    queryParam: string | { date?: string; fromDate?: string; toDate?: string },
    currentUser: User,
  ): Promise<MobileTripItemDto[]> {
    if (currentUser.role !== Role.BUS_ATTENDANT) {
      throw new ForbiddenException('Chỉ giáo viên giám sát mới có quyền truy cập màn hình này');
    }

    let dateFilter: any;
    let fallbackDateStr: string;
    if (typeof queryParam === 'string') {
      fallbackDateStr = queryParam;
      dateFilter = new Date(`${queryParam}T00:00:00.000Z`);
    } else if (queryParam?.fromDate && queryParam?.toDate) {
      fallbackDateStr = queryParam.fromDate;
      dateFilter = {
        gte: new Date(`${queryParam.fromDate}T00:00:00.000Z`),
        lte: new Date(`${queryParam.toDate}T00:00:00.000Z`),
      };
    } else if (queryParam?.date) {
      fallbackDateStr = queryParam.date;
      dateFilter = new Date(`${queryParam.date}T00:00:00.000Z`);
    } else {
      fallbackDateStr = formatDateToVnYmd(new Date());
      dateFilter = new Date(`${fallbackDateStr}T00:00:00.000Z`);
    }

    const persisted = await this.prisma.trip.findMany({
      where: {
        serviceDate: dateFilter,
        assignedBusAttendantId: currentUser.id,
      },
      include: {
        school: { select: { name: true } },
        assignedVehicle: { select: { licensePlate: true, brand: true } },
        assignedDriver: { select: { fullName: true } },
        leaveNotices: {
          where: {
            status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            kind: { in: [LeaveNoticeKind.DRIVER, LeaveNoticeKind.BUS_ATTENDANT] },
          },
          select: { id: true },
        },
        route: {
          select: {
            id: true,
            name: true,
            stops: { select: { studentId: true } },
          },
        },
      },
      orderBy: [{ serviceDate: 'asc' }, { scheduledStartTime: 'asc' }],
    });

    return await Promise.all(persisted.map(async (pt) => {
      const studentIds = new Set(pt.route.stops.map((s) => s.studentId).filter(Boolean));
      const sDate = formatDateToVnYmd(new Date(pt.serviceDate));
      const hasPendingStaff = (pt.leaveNotices || []).length > 0;
      const canReportLeave =
        !hasPendingStaff &&
        !await tripBlockReason(this.prisma, pt.id) &&
        pt.status === TripStatus.SCHEDULED &&
        !pt.actualStartTime &&
        (pt.direction !== RouteDirection.TO_PARKING || !pt.attendantReadyAt);

      return {
        id: pt.id,
        isVirtual: false,
        type: 'PERSISTED' as const,
        routeId: pt.route.id,
        routeName: pt.route.name,
        direction: pt.direction,
        schoolName: pt.school.name,
        scheduledStartTime: pt.scheduledStartTime,
        scheduledEndTime: pt.scheduledEndTime,
        scheduledTime: `${pt.scheduledStartTime} - ${pt.scheduledEndTime}`,
        vehiclePlate: pt.assignedVehicle.licensePlate,
        vehicleBrand: pt.assignedVehicle.brand,
        driverName: pt.assignedDriver.fullName,
        studentCount: studentIds.size,
        status: pt.status,
        serviceDate: sDate,
        assignmentStatus: hasPendingStaff ? 'WAITING_ASSIGNMENT' : 'ASSIGNED',
        canReportLeave,
      };
    }));;
  }

  /**
   * Lịch đưa đón con dành riêng cho Phụ huynh (PARENT).
   * Kiểm tra liên kết con và trả về các chuyến xe con tham gia.
   */
  async getParentStudentSchedule(
    studentId: string,
    queryParam: string | { date?: string; fromDate?: string; toDate?: string },
    currentUser: User,
  ): Promise<MobileParentScheduleResponseDto> {
    if (currentUser.role === Role.PARENT) {
      const link = await this.prisma.parentStudentLink.findUnique({
        where: {
          parentId_studentId: {
            parentId: currentUser.id,
            studentId,
          },
        },
      });
      if (!link) {
        throw new ForbiddenException('Bạn không có quyền xem thông tin của học sinh này');
      }
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh');
    }

    let dateFilter: any;
    let fallbackDateStr: string;
    if (typeof queryParam === 'string') {
      fallbackDateStr = queryParam;
      dateFilter = new Date(`${queryParam}T00:00:00.000Z`);
    } else if (queryParam?.fromDate && queryParam?.toDate) {
      fallbackDateStr = queryParam.fromDate;
      dateFilter = {
        gte: new Date(`${queryParam.fromDate}T00:00:00.000Z`),
        lte: new Date(`${queryParam.toDate}T00:00:00.000Z`),
      };
    } else if (queryParam?.date) {
      fallbackDateStr = queryParam.date;
      dateFilter = new Date(`${queryParam.date}T00:00:00.000Z`);
    } else {
      fallbackDateStr = formatDateToVnYmd(new Date());
      dateFilter = new Date(`${fallbackDateStr}T00:00:00.000Z`);
    }

    // Tìm các chuyến xe ngày đó mà học sinh có mặt trong RouteStop
    const trips = await this.prisma.trip.findMany({
      where: {
        serviceDate: dateFilter,
        attendances: { some: { studentId, excludedAt: null } },
      },
      include: {
        school: { select: { name: true } },
        assignedVehicle: { select: { licensePlate: true, brand: true } },
        assignedDriver: { select: { fullName: true } },
        assignedBusAttendant: { select: { fullName: true } },
        leaveNotices: {
          select: { id: true, studentId: true, status: true, kind: true },
        },
        attendances: {
          where: { studentId, excludedAt: null },
          select: { status: true, alightedAt: true },
        },
        route: {
          select: {
            id: true,
            name: true,
            stops: { select: { studentId: true } },
          },
        },
      },
      orderBy: [{ serviceDate: 'asc' }, { scheduledStartTime: 'asc' }],
    });

    for (const trip of trips) Object.assign(trip, await effectiveTripTiming(this.prisma, trip.id));
    const mobileTrips: MobileTripItemDto[] = await Promise.all(trips.map(async (t) => {
      const studentIds = new Set(t.route.stops.map((s) => s.studentId).filter(Boolean));
      const sDate = formatDateToVnYmd(new Date(t.serviceDate));
      const hasPendingStaff = (t.leaveNotices || []).some(
        (ln) =>
          ln.status === LeaveNoticeStatus.PENDING_REPLACEMENT &&
          (ln.kind === LeaveNoticeKind.DRIVER || ln.kind === LeaveNoticeKind.BUS_ATTENDANT),
      );
      const activeStudentNotice = (t.leaveNotices || []).some(
        (ln) =>
          ln.studentId === studentId &&
          (ln.status === LeaveNoticeStatus.RECORDED || ln.status === LeaveNoticeStatus.PENDING_REPLACEMENT),
      );
      const myAtt = t.attendances?.[0];
      const isBoardedOrAlighted = myAtt
        ? myAtt.status === AttendanceStatus.PRESENT || Boolean(myAtt.alightedAt)
        : false;

      const canReportLeave =
        !activeStudentNotice &&
        !isBoardedOrAlighted &&
        !await tripBlockReason(this.prisma, t.id) &&
        t.status === TripStatus.SCHEDULED &&
        !t.actualStartTime &&
        !t.attendantReadyAt;

      return {
        id: t.id,
        isVirtual: false,
        type: 'PERSISTED' as const,
        routeId: t.route.id,
        routeName: t.route.name,
        direction: t.direction,
        schoolName: t.school.name,
        scheduledStartTime: t.scheduledStartTime,
        scheduledEndTime: t.scheduledEndTime,
        scheduledTime: `${t.scheduledStartTime} - ${t.scheduledEndTime}`,
        vehiclePlate: t.assignedVehicle.licensePlate,
        vehicleBrand: t.assignedVehicle.brand,
        driverName: t.assignedDriver.fullName,
        busAttendantName: t.assignedBusAttendant.fullName,
        studentCount: studentIds.size,
        status: t.status,
        serviceDate: sDate,
        assignmentStatus: hasPendingStaff ? 'WAITING_ASSIGNMENT' : 'ASSIGNED',
        canReportLeave,
      };
    }));;

    // Bổ sung Virtual Occurrences nếu phụ huynh xem lịch theo khoảng ngày (tuần) và chưa có Trip thật
    if (typeof queryParam !== 'string' && queryParam?.fromDate && queryParam?.toDate) {
      const persistedKeySet = new Set(
        trips.map((t) => `${t.routeId}_${formatDateToVnYmd(new Date(t.serviceDate))}`),
      );

      const activePlans = await this.prisma.routePlan.findMany({
        where: {
          status: RoutePlanStatus.ACTIVE,
          needsReoptimization: false,
          routes: {
            some: {
              stops: { some: { studentId } },
            },
          },
        },
        include: {
          school: true,
          routes: {
            where: {
              stops: { some: { studentId } },
            },
            include: {
              proposedVehicle: true,
              defaultDriver: true,
              defaultBusAttendant: true,
              stops: { select: { studentId: true } },
            },
          },
        },
      });

      const dates = this.getDateRangeArray(queryParam.fromDate, queryParam.toDate);
      for (const plan of activePlans) {
        const school = plan.school;

        for (const serviceDateStr of dates) {
          const daySched = await this.planServiceDay(this.prisma, plan, school, serviceDateStr);
          if (!daySched || !daySched.start || !daySched.end) continue;

          for (const route of plan.routes) {
            const key = `${route.id}_${serviceDateStr}`;
            if (persistedKeySet.has(key)) continue;

            const timing = this.tripTiming(route.direction, route.estimatedDurationSeconds, daySched, serviceDateStr);
            const { scheduledStartTime: depTimeStr, scheduledEndTime: arrTimeStr } = timing;

            const studentIds = new Set(route.stops.map((s) => s.studentId).filter(Boolean));

            mobileTrips.push({
              id: `virtual_${route.id}_${serviceDateStr}`,
              isVirtual: true,
              type: 'VIRTUAL',
              routeId: route.id,
              routeName: route.name,
              direction: route.direction,
              schoolName: school.name,
              scheduledStartTime: depTimeStr,
              scheduledEndTime: arrTimeStr,
              scheduledTime: `${depTimeStr} - ${arrTimeStr}`,
              vehiclePlate: route.proposedVehicle?.licensePlate || 'Chờ phân công',
              vehicleBrand: route.proposedVehicle?.brand || '',
              driverName: route.defaultDriver?.fullName || 'Chờ phân công',
              busAttendantName: route.defaultBusAttendant?.fullName || 'Chờ phân công',
              studentCount: studentIds.size,
              status: 'NOT_CREATED',
              serviceDate: serviceDateStr,
              assignmentStatus: 'ASSIGNED',
              canReportLeave: false,
            });
          }
        }
      }

      mobileTrips.sort((a, b) => {
        if (a.serviceDate !== b.serviceDate) return a.serviceDate.localeCompare(b.serviceDate);
        return (a.scheduledStartTime || '').localeCompare(b.scheduledStartTime || '');
      });
    }

    return {
      studentId: student.id,
      studentName: student.fullName,
      selectedDate: fallbackDateStr,
      trips: mobileTrips,
      items: mobileTrips,
    };
  }

  /**
   * Chi tiết chuyến xe hiển thị trên Mobile (áp dụng Privacy Masking cho Phụ huynh).
   */
  async getMobileTripDetail(tripId: string, currentUser: User): Promise<TripDetailResponseDto> {
    const detail = await this.getTripDetail(tripId, currentUser);

    // Nếu người xem là PARENT: Ẩn toàn bộ thông tin PII của các học sinh khác
    if (currentUser.role === Role.PARENT) {
      // Lấy danh sách ID con của phụ huynh này
      const parentLinks = await this.prisma.parentStudentLink.findMany({
        where: { parentId: currentUser.id },
        select: { studentId: true },
      });
      const roster = await this.prisma.tripAttendance.findMany({
        where: { tripId, excludedAt: null },
        select: { studentId: true },
      });
      const rosterIds = new Set(roster.map(a => a.studentId));
      const myChildIds = new Set(parentLinks.filter(l => rosterIds.has(l.studentId)).map(l => l.studentId));

      detail.studentCount = myChildIds.size;
      detail.operationAudit = undefined;
      detail.parkingLocation = undefined;
      detail.polylineGeometry = '';
      detail.stops = detail.stops.filter((s) =>
        s.studentId ? myChildIds.has(s.studentId) :
          s.stopType === RouteStopType.SCHOOL_ARRIVAL || s.stopType === RouteStopType.SCHOOL_DEPARTURE,
      ).map((s) => {
        if (!s.studentId) {
          // Trạm trường học hoặc bãi xe
          return s;
        }

        const isMine = myChildIds.has(s.studentId);
        if (isMine) {
          return {
            ...s,
            studentName: `${s.studentName} (Con bạn)`,
            isMyChild: true,
            attendanceStatus: s.attendanceStatus,
            absenceReason: s.absenceReason, // D10: Phụ huynh được xem lý do vắng của con mình
            attendanceMarkedAt: s.attendanceMarkedAt,
          };
        } else {
          // Ẩn tên và chi tiết số nhà riêng của học sinh khác (Privacy Masking)
          return {
            ...s,
            studentId: undefined,
            studentName: 'Học sinh khác',
            addressText: 'Điểm đón học sinh',
            isMyChild: false,
            attendanceStatus: undefined,
            absenceReason: undefined,
            attendanceMarkedAt: undefined,
          };
        }
      });
    }

    return detail;
  }

  // ==========================================
  // TRIP OPERATION METHODS (PHASE 2 IMPLEMENTATION)
  // ==========================================

  /**
   * Kiểm tra xem hệ thống có đang chạy ở chế độ TEST hay không.
   * Chế độ TEST nới lỏng các rào cản thời gian (15m Ready, 5m Start).
   */
  isTestMode(): boolean {
    const mode = this.configService.get<string>('TRIP_OPERATION_MODE') || process.env.TRIP_OPERATION_MODE;
    return mode?.toUpperCase() === 'TEST';
  }

  /**
   * Lấy duy nhất 1 chuyến xe ưu tiên cho Tài xế hoặc Giáo viên phụ xe trên Trang chủ (BR-02 & D06).
   * Loại bỏ các chuyến đã quá thời gian kết thúc dự kiến (scheduledEndAt < now).
   */
  async getHomeTrip(currentUser: User): Promise<HomeTripResponseDto> {
    if (currentUser.role !== Role.DRIVER && currentUser.role !== Role.BUS_ATTENDANT) {
      throw new ForbiddenException('Chỉ tài xế hoặc giáo viên phụ xe mới có quyền truy cập màn hình này');
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // D311-01 / Bug B-01 / R04: Lấy các chuyến IN_PROGRESS (không lọc giờ) và SCHEDULED hôm nay/chưa quá giờ để tính giờ hiệu lực
    const where: any = {
      OR: [
        { status: TripStatus.IN_PROGRESS },
        {
          status: TripStatus.SCHEDULED,
          OR: [
            { serviceDate: { gte: startOfToday } },
            { scheduledEndAt: { gte: now } },
            { scheduledEndAt: null },
          ],
        },
      ],
    };

    if (currentUser.role === Role.DRIVER) {
      where.assignedDriverId = currentUser.id;
    } else {
      where.assignedBusAttendantId = currentUser.id;
    }

    const candidateTrips = await this.prisma.trip.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        assignedVehicle: true,
        assignedDriver: true,
        assignedBusAttendant: true,
        route: {
          select: {
            id: true,
            name: true,
            polylineGeometry: true,
          },
        },
        attendances: true,
      },
    });

    if (candidateTrips.length === 0) {
      return { hasTrip: false, trip: null };
    }

    // R04: Áp dụng effectiveTripTiming cho các chuyến SCHEDULED trước khi lọc và sắp xếp
    for (const trip of candidateTrips) {
      if (trip.status === TripStatus.SCHEDULED) {
        const timing = await effectiveTripTiming(this.prisma, trip.id);
        if (timing) {
          Object.assign(trip, timing);
        }
      }
    }

    // Lọc lại: giữ lại IN_PROGRESS, và SCHEDULED chỉ giữ nếu chưa quá scheduledEndAt
    const validTrips = candidateTrips.filter((t) => {
      if (t.status === TripStatus.IN_PROGRESS) return true;
      if (t.status === TripStatus.SCHEDULED) {
        return !t.scheduledEndAt || t.scheduledEndAt >= now;
      }
      return false;
    });

    if (validTrips.length === 0) {
      return { hasTrip: false, trip: null };
    }

    // Sắp xếp ưu tiên:
    // 1. IN_PROGRESS lên đầu
    // 2. SCHEDULED theo thời gian bắt đầu gần nhất (đã tính theo effectiveTripTiming)
    validTrips.sort((a, b) => {
      if (a.status === TripStatus.IN_PROGRESS && b.status !== TripStatus.IN_PROGRESS) return -1;
      if (b.status === TripStatus.IN_PROGRESS && a.status !== TripStatus.IN_PROGRESS) return 1;
      const tA = a.scheduledStartAt ? a.scheduledStartAt.getTime() : 0;
      const tB = b.scheduledStartAt ? b.scheduledStartAt.getTime() : 0;
      return tA - tB;
    });

    const selected = validTrips[0];
    const operationalState = await this.getOperationalState(selected.id, currentUser);
    const userNotice = await this.prisma.leaveNotice.findFirst({
      where: {
        tripId: selected.id,
        reportedById: currentUser.id,
        status: { in: [LeaveNoticeStatus.RECORDED, LeaveNoticeStatus.PENDING_REPLACEMENT] },
      },
    });
    const canReportLeave =
      !await tripBlockReason(this.prisma, selected.id) &&
      !userNotice &&
      selected.status === TripStatus.SCHEDULED &&
      !selected.actualStartTime &&
      !selected.attendantReadyAt;

    return {
      hasTrip: true,
      trip: {
        id: selected.id,
        routeId: selected.route.id,
        routeName: selected.route.name,
        direction: selected.direction,
        schoolName: selected.school.name,
        serviceDate: formatDateToVnYmd(new Date(selected.serviceDate)),
        scheduledStartTime: selected.scheduledStartTime,
        scheduledEndTime: selected.scheduledEndTime,
        scheduledTime: `${selected.scheduledStartTime || ''} - ${selected.scheduledEndTime || ''}`,
        status: selected.status,
        vehiclePlate: selected.assignedVehicle.licensePlate,
        vehicleBrand: selected.assignedVehicle.brand,
        vehicleSeats: selected.assignedVehicle.seatCount,
        studentCount: selected.attendances.length,
        polylineGeometry: selected.route.polylineGeometry,
        driver: {
          id: selected.assignedDriver.id,
          fullName: selected.assignedDriver.fullName,
          phone: selected.assignedDriver.phone,
          isCurrentUser: currentUser.id === selected.assignedDriver.id,
        },
        busAttendant: {
          id: selected.assignedBusAttendant.id,
          fullName: selected.assignedBusAttendant.fullName,
          phone: selected.assignedBusAttendant.phone,
          isCurrentUser: currentUser.id === selected.assignedBusAttendant.id,
        },
        operationalState,
        assignmentStatus: operationalState.assignmentStatus,
        canReportLeave,
        leaveNoticeId: userNotice?.id || null,
      },
    };
  }

  /**
   * Lấy danh sách thẻ chuyến xe theo từng con cho Phụ huynh trên Trang chủ (BR-12, D06, D10).
   */
  async getParentHomeCards(currentUser: User): Promise<ParentHomeCardsResponseDto> {
    if (currentUser.role !== Role.PARENT) {
      throw new ForbiddenException('Chỉ phụ huynh mới có quyền truy cập màn hình này');
    }

    const links = await this.prisma.parentStudentLink.findMany({
      where: { parentId: currentUser.id },
      include: {
        student: {
          include: {
            school: true,
          },
        },
      },
    });

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const items: ParentHomeCardItemDto[] = [];

    for (const link of links) {
      const student = link.student;
      // D311-01 / Bug B-01 / R04: Chuyến IN_PROGRESS luôn giữ vị trí ưu tiên số 1, SCHEDULED áp dụng effectiveTripTiming trước khi lọc
      const trips = await this.prisma.trip.findMany({
        where: {
          OR: [
            { status: TripStatus.IN_PROGRESS },
            {
              status: TripStatus.SCHEDULED,
              OR: [
                { serviceDate: { gte: startOfToday } },
                { scheduledEndAt: { gte: now } },
                { scheduledEndAt: null },
              ],
            },
          ],
          attendances: {
            some: { studentId: student.id, excludedAt: null },
          },
        },
        include: {
          school: true,
          assignedVehicle: true,
          assignedDriver: true,
          route: true,
          attendances: {
            where: { studentId: student.id, excludedAt: null },
          },
        },
      });

      if (trips.length === 0) continue;

      // R04: Áp dụng effectiveTripTiming cho các chuyến SCHEDULED
      for (const trip of trips) {
        if (trip.status === TripStatus.SCHEDULED) {
          const timing = await effectiveTripTiming(this.prisma, trip.id);
          if (timing) {
            Object.assign(trip, timing);
          }
        }
      }

      const validTrips = trips.filter((t) => {
        if (t.status === TripStatus.IN_PROGRESS) return true;
        if (t.status === TripStatus.SCHEDULED) {
          return !t.scheduledEndAt || t.scheduledEndAt >= now;
        }
        return false;
      });

      if (validTrips.length === 0) continue;

      // Sắp xếp ưu tiên:
      // 1. IN_PROGRESS + con chưa điểm danh (UNMARKED)
      // 2. IN_PROGRESS + con đã điểm danh
      // 3. SCHEDULED theo giờ gần nhất (đã tính theo effectiveTripTiming)
      validTrips.sort((a, b) => {
        const aIsRunning = a.status === TripStatus.IN_PROGRESS;
        const bIsRunning = b.status === TripStatus.IN_PROGRESS;
        const aAtt = a.attendances[0];
        const bAtt = b.attendances[0];
        const aUnmarked = !aAtt || aAtt.status === AttendanceStatus.UNMARKED;
        const bUnmarked = !bAtt || bAtt.status === AttendanceStatus.UNMARKED;

        if (aIsRunning && !bIsRunning) return -1;
        if (!aIsRunning && bIsRunning) return 1;
        if (aIsRunning && bIsRunning) {
          if (aUnmarked && !bUnmarked) return -1;
          if (!aUnmarked && bUnmarked) return 1;
        }
        const tA = a.scheduledStartAt ? a.scheduledStartAt.getTime() : 0;
        const tB = b.scheduledStartAt ? b.scheduledStartAt.getTime() : 0;
        return tA - tB;
      });

      const bestTrip = validTrips[0];
      const myAtt = bestTrip.attendances[0];
      const activeNotice = await this.prisma.leaveNotice.findFirst({
        where: {
          tripId: bestTrip.id,
          studentId: student.id,
          status: { in: [LeaveNoticeStatus.RECORDED, LeaveNoticeStatus.PENDING_REPLACEMENT] },
        },
      });
      const canReportLeave =
        !await tripBlockReason(this.prisma, bestTrip.id) &&
        !activeNotice &&
        bestTrip.status === TripStatus.SCHEDULED &&
        !bestTrip.actualStartTime &&
        !bestTrip.attendantReadyAt;

      items.push({
        studentId: student.id,
        studentName: student.fullName,
        studentAvatar: student.avatarUrl,
        schoolName: bestTrip.school.name,
        tripId: bestTrip.id,
        routeName: bestTrip.route.name,
        direction: bestTrip.direction,
        serviceDate: formatDateToVnYmd(new Date(bestTrip.serviceDate)),
        scheduledTime: `${bestTrip.scheduledStartTime || ''} - ${bestTrip.scheduledEndTime || ''}`,
        tripStatus: bestTrip.status,
        vehiclePlate: bestTrip.assignedVehicle.licensePlate,
        driverName: bestTrip.assignedDriver.fullName,
        attendanceStatus: myAtt ? myAtt.status : AttendanceStatus.UNMARKED,
        markedAt: myAtt?.markedAt ? myAtt.markedAt.toISOString() : null,
        absenceReason: myAtt?.status === AttendanceStatus.ABSENT ? myAtt.absenceReason : null,
        childIsAlighted: Boolean(myAtt?.alightedAt),
        childAlightedAt: myAtt?.alightedAt ? myAtt.alightedAt.toISOString() : null,
        canReportLeave,
        hasLeaveNotice: Boolean(activeNotice),
        leaveNoticeId: activeNotice?.id || null,
      });
    }

    return { items };
  }

  /**
   * Giáo viên phụ xe xác nhận sẵn sàng lên xe (BR-05 & D12).
   */
  async markAttendantReady(tripId: string, currentUser: User): Promise<{ message: string; attendantReadyAt: Date }> {
    if (currentUser.role !== Role.BUS_ATTENDANT) {
      throw new ForbiddenException('Chỉ giáo viên phụ xe mới có quyền xác nhận sẵn sàng');
    }

    return this.withTripLock(tripId, async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
      });

      if (!trip) {
        throw new NotFoundException('Không tìm thấy chuyến xe');
      }

      await assertResourcesNotAwaitingAdmin(tx, { vehicleId: trip.assignedVehicleId, driverId: trip.assignedDriverId, busAttendantId: trip.assignedBusAttendantId }, trip.id);

      if (trip.assignedBusAttendantId !== currentUser.id) {
        throw new ForbiddenException('Bạn không phải giáo viên phụ xe được phân công cho chuyến này');
      }

      if (trip.status !== TripStatus.SCHEDULED) {
        throw new BadRequestException('Chỉ có thể xác nhận sẵn sàng cho chuyến xe đang ở trạng thái SCHEDULED');
      }

      const attendantNotice = tx.leaveNotice
        ? await tx.leaveNotice.findFirst({
            where: {
              tripId,
              kind: LeaveNoticeKind.BUS_ATTENDANT,
              status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            },
          })
        : null;
      if (attendantNotice) {
        throw new BadRequestException('Bạn đang có báo nghỉ cho chuyến xe này, không thể xác nhận sẵn sàng');
      }

      // R03: Kiểm tra sự cố thiếu phụ xe đang chờ xử lý
      const attendantIncident = tx.tripIncident
        ? await tx.tripIncident.findFirst({
            where: {
              tripId,
              type: TripIncidentType.ATTENDANT_MISSING,
              status: TripIncidentStatus.WAITING_ASSIGNMENT,
            },
          })
        : null;
      if (attendantIncident) {
        throw new BadRequestException('Chuyến xe có sự cố thiếu giáo viên phụ xe đang chờ xử lý, không thể xác nhận sẵn sàng');
      }

      // Idempotent: Nếu đã sẵn sàng trước đó, trả về thời gian hiện hành
      if (trip.attendantReadyAt) {
        return {
          message: 'Giáo viên phụ xe đã sẵn sàng',
          attendantReadyAt: trip.attendantReadyAt,
        };
      }

      const timing = await effectiveTripTiming(tx, tripId);
      const scheduledStartAt = timing?.scheduledStartAt ?? trip.scheduledStartAt;
      // Rào cản thời gian ở chế độ LIVE (15 phút trước scheduledStartAt)
      if (!this.isTestMode() && scheduledStartAt) {
        const now = new Date();
        const readyThreshold = new Date(scheduledStartAt.getTime() - 15 * 60 * 1000);
        if (now < readyThreshold) {
          throw new BadRequestException('Chưa đến giờ xác nhận sẵn sàng (cho phép từ 15 phút trước giờ theo lịch)');
        }
      }

      const readyAt = new Date();
      const updated = await tx.trip.update({
        where: { id: tripId },
        data: {
          ...(timing ? { ...timing, routeSnapshot: timing.routeSnapshot ?? Prisma.DbNull } : {}),
          attendantReadyAt: readyAt,
        },
      });

      await notifyTrip(tx, tripId, 'READY', currentUser.id, undefined, updated.attendantReadyAt!.toISOString());
      this.logger.log(`Trip ${tripId} Attendant Ready confirmed by User ${currentUser.id}`);
      return {
        message: 'Xác nhận sẵn sàng thành công',
        attendantReadyAt: updated.attendantReadyAt!,
      };
    });
  }

  /**
   * Tài xế bắt đầu chuyến xe (BR-06, D11 & D12).
   */
  async startTrip(tripId: string, currentUser: User): Promise<{ message: string; trip: any }> {
    if (currentUser.role !== Role.DRIVER) {
      throw new ForbiddenException('Chỉ tài xế mới có quyền bắt đầu chuyến xe');
    }

    return this.withTripLock(tripId, async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { attendances: true },
      });

      if (!trip) {
        throw new NotFoundException('Không tìm thấy chuyến xe');
      }

      await assertResourcesNotAwaitingAdmin(tx, { vehicleId: trip.assignedVehicleId, driverId: trip.assignedDriverId, busAttendantId: trip.assignedBusAttendantId }, trip.id);

      if (trip.assignedDriverId !== currentUser.id) {
        throw new ForbiddenException('Bạn không phải tài xế được phân công cho chuyến này');
      }

      if (trip.status !== TripStatus.SCHEDULED) {
        throw new BadRequestException('Chỉ có thể bắt đầu chuyến xe đang ở trạng thái SCHEDULED (chờ vận hành)');
      }

      const vehicle = await tx.vehicle.findUnique({ where: { id: trip.assignedVehicleId } });
      if (!vehicle?.isActive || vehicle.seatCount < trip.attendances.filter(a => !a.excludedAt).length) {
        throw new ConflictException('Xe không còn hoạt động hoặc không đủ sức chứa roster chuyến');
      }
      // D38-02 / R02: Kiểm tra tài xế, phương tiện hoặc giáo viên phụ xe có đang thực hiện chuyến khác đang IN_PROGRESS hay không
      const activeRunningTripOr: Prisma.TripWhereInput[] = [
        { assignedDriverId: currentUser.id },
        { assignedVehicleId: trip.assignedVehicleId },
      ];
      if (trip.assignedBusAttendantId) {
        activeRunningTripOr.push({ assignedBusAttendantId: trip.assignedBusAttendantId });
      }
      const activeRunningTrip = tx.trip.findFirst
        ? await tx.trip.findFirst({
            where: {
              id: { not: tripId },
              status: TripStatus.IN_PROGRESS,
              OR: activeRunningTripOr,
            },
            select: { id: true, assignedDriverId: true, assignedVehicleId: true, assignedBusAttendantId: true },
          })
        : null;
      if (activeRunningTrip) {
        if (activeRunningTrip.assignedDriverId === currentUser.id) {
          throw new ConflictException('Tài xế đang thực hiện một chuyến xe khác chưa kết thúc');
        } else if (activeRunningTrip.assignedVehicleId === trip.assignedVehicleId) {
          throw new ConflictException('Phương tiện đang được sử dụng trong một chuyến xe khác chưa kết thúc');
        } else if (
          trip.assignedBusAttendantId &&
          activeRunningTrip.assignedBusAttendantId === trip.assignedBusAttendantId
        ) {
          throw new ConflictException('Giáo viên phụ xe đang thực hiện một chuyến xe khác chưa kết thúc');
        }
      }

      const pendingStaffNotice = tx.leaveNotice
        ? await tx.leaveNotice.findFirst({
            where: {
              tripId,
              kind: { in: [LeaveNoticeKind.DRIVER, LeaveNoticeKind.BUS_ATTENDANT] },
              status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            },
          })
        : null;
      if (pendingStaffNotice) {
        throw new BadRequestException('Chuyến xe đang chờ phân công lại nhân sự nghỉ, không thể bắt đầu');
      }

      const pendingStaffIncident = tx.tripIncident
        ? await tx.tripIncident.findFirst({
            where: {
              tripId,
              type: { in: [TripIncidentType.ATTENDANT_MISSING, TripIncidentType.DRIVER_MISSING] },
              status: TripIncidentStatus.WAITING_ASSIGNMENT,
            },
          })
        : null;
      if (pendingStaffIncident) {
        throw new BadRequestException(
          'Chuyến xe đang chờ xử lý sự cố nhân sự chưa đến, không thể bắt đầu',
        );
      }

      if (!trip.attendantReadyAt) {
        throw new BadRequestException('Giáo viên phụ xe chưa xác nhận sẵn sàng');
      }

      const activeAttendances = filterActiveAttendances(trip.attendances);
      // D11: Chuyến xe bắt buộc phải có ít nhất 1 học sinh
      if (activeAttendances.length === 0) {
        throw new BadRequestException('Chuyến xe không có học sinh trong danh sách, không thể xuất phát');
      }

      // RET-03: Chiều TO_PARKING bắt buộc phải điểm danh lên xe đầy đủ trước khi xuất phát
      if (trip.direction === RouteDirection.TO_PARKING) {
        const unmarked = activeAttendances.filter((a) => a.status === AttendanceStatus.UNMARKED);
        if (unmarked.length > 0) {
          throw new BadRequestException(
            `Chưa thể xuất phát. Còn ${unmarked.length} học sinh chưa điểm danh lên xe tại trường.`,
          );
        }
        const invalidAbsent = activeAttendances.filter(
          (a) => a.status === AttendanceStatus.ABSENT && (!a.absenceReason || !a.absenceReason.trim()),
        );
        if (invalidAbsent.length > 0) {
          throw new BadRequestException('Có học sinh vắng mặt nhưng chưa có lý do hợp lệ');
        }

        // D310-01: Nếu toàn bộ học sinh đều vắng mặt
        const presentCount = activeAttendances.filter(
          (a) => a.status === AttendanceStatus.PRESENT,
        ).length;
        if (presentCount === 0) {
          throw new ConflictException('Tất cả học sinh đều vắng mặt, không thể bắt đầu chuyến đi bình thường');
        }
      }

      // Rào cản thời gian ở chế độ LIVE (5 phút trước scheduledStartAt và chưa quá scheduledEndAt)
      if (!this.isTestMode()) {
        const now = new Date();
        if (trip.scheduledStartAt) {
          const startThreshold = new Date(trip.scheduledStartAt.getTime() - 5 * 60 * 1000);
          if (now < startThreshold) {
            throw new BadRequestException('Chưa đến giờ xuất phát (cho phép từ 5 phút trước giờ theo lịch)');
          }
        }
        if (trip.scheduledEndAt && now > trip.scheduledEndAt) {
          throw new BadRequestException(
            'Chuyến xe đã vượt quá thời gian kết thúc dự kiến, không thể bắt đầu',
          );
        }
      }

      const updated = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.IN_PROGRESS,
          actualStartTime: new Date(),
        },
      });

      await notifyTrip(tx, tripId, 'STARTED', currentUser.id);
      this.logger.log(`Trip ${tripId} Started by Driver ${currentUser.id}`);
      return {
        message: 'Bắt đầu chuyến xe thành công',
        trip: updated,
      };
    });
  }

  /**
   * Tài xế xác nhận xe đã đến trường (OUT-04).
   * Chỉ áp dụng cho chuyến xe chiều TO_SCHOOL đang IN_PROGRESS.
   * Yêu cầu 100% học sinh đã được điểm danh lên xe (0 UNMARKED, mọi ABSENT có lý do).
   */
  async arriveAtSchool(tripId: string, currentUser: User): Promise<ArriveAtSchoolResponseDto> {
    if (currentUser.role !== Role.DRIVER) {
      throw new ForbiddenException('Chỉ tài xế mới có quyền xác nhận đến trường');
    }

    return this.withTripLock(tripId, async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { attendances: true },
      });

      if (!trip) {
        throw new NotFoundException('Không tìm thấy chuyến xe');
      }

      if (trip.assignedDriverId !== currentUser.id) {
        throw new ForbiddenException('Bạn không phải tài xế được phân công cho chuyến này');
      }

      if (trip.direction !== RouteDirection.TO_SCHOOL) {
        throw new BadRequestException(
          'Xác nhận đến trường chỉ áp dụng cho chuyến xe đưa học sinh đến trường (TO_SCHOOL)',
        );
      }

      if (trip.status !== TripStatus.IN_PROGRESS) {
        throw new BadRequestException('Chỉ có thể xác nhận đến trường khi chuyến xe đang hoạt động (IN_PROGRESS)');
      }

      // Idempotent: Nếu đã đến trường trước đó, trả về thời gian hiện hành
      if (trip.arrivedAtSchoolAt) {
        return {
          message: 'Chuyến xe đã xác nhận đến trường trước đó',
          arrivedAtSchoolAt: trip.arrivedAtSchoolAt.toISOString(),
        };
      }

      const activeAttendances = filterActiveAttendances(trip.attendances);
      if (activeAttendances.length === 0) {
        throw new BadRequestException('Chuyến xe không có học sinh trong danh sách');
      }

      // BF-03: Chỉ ENABLE khi 100% học sinh đã được điểm danh
      const unmarked = activeAttendances.filter((a) => a.status === AttendanceStatus.UNMARKED);
      if (unmarked.length > 0) {
        throw new BadRequestException(
          `Chưa thể xác nhận đến trường. Còn ${unmarked.length} học sinh chưa được điểm danh lên xe.`,
        );
      }

      const invalidAbsent = activeAttendances.filter(
        (a) => a.status === AttendanceStatus.ABSENT && (!a.absenceReason || !a.absenceReason.trim()),
      );
      if (invalidAbsent.length > 0) {
        throw new BadRequestException('Có học sinh vắng mặt nhưng chưa có lý do hợp lệ');
      }

      const arrivedAt = new Date();
      const updated = await tx.trip.update({
        where: { id: tripId },
        data: { arrivedAtSchoolAt: arrivedAt },
      });

      await notifyTrip(tx, tripId, 'ARRIVED', currentUser.id);
      this.logger.log(`Trip ${tripId} Arrived at School confirmed by Driver ${currentUser.id}`);
      return {
        message: 'Xác nhận đến trường thành công',
        arrivedAtSchoolAt: updated.arrivedAtSchoolAt!.toISOString(),
      };
    });
  }

  /**
   * Lấy danh sách điểm danh chi tiết từ TripAttendance Roster (BR-07, D02).
   */
  async getTripAttendance(tripId: string, currentUser: User): Promise<TripAttendanceListResponseDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: {
          include: {
            stops: {
              where: { studentId: { not: null } },
              orderBy: { stopOrder: 'asc' },
            },
          },
        },
        attendances: {
          include: {
            student: true,
            markedBy: { select: { fullName: true } },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến xe');
    }

    if (currentUser.role === Role.PARENT) {
      throw new ForbiddenException('Phụ huynh không có quyền xem toàn bộ danh sách điểm danh chuyến xe');
    }

    await this.assertTripAccess(trip, currentUser);

    const resolvedRoute = resolveTripRoute(trip);
    const stopMap = new Map(resolvedRoute.stops.map((s) => [s.studentId, s]));
    const activeAttendances = filterActiveAttendances(trip.attendances);

    const students: TripAttendanceStudentItemDto[] = activeAttendances.map((att) => {
      const stop = stopMap.get(att.studentId);
      return {
        studentId: att.studentId,
        studentCode: att.student.code,
        fullName: att.student.fullName,
        avatarUrl: att.student.avatarUrl,
        stopOrder: stop?.stopOrder ?? 1,
        addressText: stop?.addressText || att.student.addressText || 'Điểm đón học sinh',
        plannedArrivalTime: stop?.plannedArrivalTime || null,
        status: att.status,
        absenceReason: att.status === AttendanceStatus.ABSENT ? att.absenceReason : null,
        markedById: att.markedById,
        markedByName: att.markedBy?.fullName || null,
        markedAt: att.markedAt ? att.markedAt.toISOString() : null,
        alightedAt: att.alightedAt ? att.alightedAt.toISOString() : null,
        isAlighted: Boolean(att.alightedAt),
      };
    });

    students.sort((a, b) => a.stopOrder - b.stopOrder);

    const totalStudents = students.length;
    const presentCount = students.filter((s) => s.status === AttendanceStatus.PRESENT).length;
    const absentCount = students.filter((s) => s.status === AttendanceStatus.ABSENT).length;
    const unmarkedCount = students.filter((s) => s.status === AttendanceStatus.UNMARKED).length;
    const markedCount = presentCount + absentCount;
    const isAllMarked = totalStudents > 0 && unmarkedCount === 0;
    const alightedCount = students.filter((s) => s.status === AttendanceStatus.PRESENT && s.isAlighted).length;
    const pendingAlightCount = students.filter((s) => s.status === AttendanceStatus.PRESENT && !s.isAlighted).length;
    const isAllAlighted = presentCount > 0 ? pendingAlightCount === 0 : totalStudents > 0;

    return {
      tripId: trip.id,
      totalStudents,
      markedCount,
      presentCount,
      absentCount,
      unmarkedCount,
      isAllMarked,
      alightedCount,
      pendingAlightCount,
      isAllAlighted,
      students,
    };
  }

  /**
   * Cập nhật điểm danh học sinh (BR-07, D04, D09).
   * Hỗ trợ đầy đủ chuyển đổi giữa UNMARKED, PRESENT, ABSENT.
   */
  async updateAttendance(
    tripId: string,
    studentId: string,
    dto: MarkAttendanceDto,
    currentUser: User,
  ): Promise<{ message: string; attendance: any }> {
    if (currentUser.role !== Role.BUS_ATTENDANT) {
      throw new ForbiddenException('Chỉ giáo viên phụ xe mới có quyền điểm danh');
    }

    return this.withTripLock(tripId, tx => writeBoarding(tx, tripId, studentId, dto, currentUser));
  }

  /**
   * Xác thực mã QR quét được và trả về thông tin đối soát trước khi ghi nhận (BR-09 & D08).
   */
  async verifyQrAttendance(
    tripId: string,
    dto: VerifyQrDto,
    currentUser: User,
  ): Promise<VerifyQrResponseDto> {
    if (currentUser.role !== Role.BUS_ATTENDANT) {
      throw new ForbiddenException('Chỉ giáo viên phụ xe mới có quyền quét mã điểm danh');
    }

    await this.assertTripOperationAllowed(tripId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: {
          include: {
            stops: {
              where: { studentId: { not: null } },
              orderBy: { stopOrder: 'asc' },
            },
          },
        },
        attendances: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến xe');
    }

    if (trip.assignedBusAttendantId !== currentUser.id) {
      throw new ForbiddenException('Bạn không phải giáo viên phụ xe được phân công cho chuyến này');
    }

    if (trip.direction === RouteDirection.TO_SCHOOL) {
      if (trip.status !== TripStatus.IN_PROGRESS) {
        throw new BadRequestException('Chỉ có thể quét điểm danh khi chuyến xe đang hoạt động (IN_PROGRESS)');
      }
      if (trip.arrivedAtSchoolAt) {
        throw new BadRequestException('Xe đã đến trường, không thể quét mã đón học sinh lên xe');
      }
    } else {
      // TO_PARKING
      if (trip.status === TripStatus.SCHEDULED) {
        if (!trip.attendantReadyAt) {
          throw new BadRequestException('Vui lòng xác nhận sẵn sàng trước khi quét mã điểm danh');
        }
      } else if (trip.status !== TripStatus.IN_PROGRESS) {
        throw new BadRequestException('Chuyến xe không ở trạng thái cho phép quét mã điểm danh');
      }
    }

    const student = await this.prisma.student.findUnique({
      where: { code: dto.qrData },
    });

    if (!student) {
      throw new NotFoundException(`Không tìm thấy học sinh với mã ${dto.qrData}`);
    }

    const attendance = trip.attendances.find((a) => a.studentId === student.id);
    if (!attendance) {
      throw new BadRequestException(
        `Học sinh ${student.fullName} (${student.code}) không thuộc danh sách chuyến xe này`,
      );
    }

    const stop = trip.route.stops.find((s) => s.studentId === student.id);

    return {
      studentId: student.id,
      studentCode: student.code,
      fullName: student.fullName,
      avatarUrl: student.avatarUrl,
      stopOrder: stop?.stopOrder ?? 1,
      addressText: stop?.addressText || student.addressText || 'Điểm đón học sinh',
      currentStatus: attendance.status,
      absenceReason: attendance.absenceReason,
    };
  }

  /**
   * Giáo viên phụ xe xác nhận học sinh xuống xe (OUT-06, RET-06).
   * Chỉ áp dụng cho học sinh có trạng thái PRESENT (có mặt trên xe).
   */
  async updateAlighting(
    tripId: string,
    studentId: string,
    dto: UpdateAlightingDto,
    currentUser: User,
  ): Promise<UpdateAlightingResponseDto> {
    if (currentUser.role !== Role.BUS_ATTENDANT) {
      throw new ForbiddenException('Chỉ giáo viên phụ xe mới có quyền xác nhận học sinh xuống xe');
    }

    return this.withTripLock(tripId, tx => writeAlighting(tx, tripId, studentId, dto, currentUser));
  }

  /**
   * Tài xế hoàn thành chuyến xe (BR-10, D02 & D11).
   * Kiểm tra 100% học sinh đã có trạng thái hợp lệ trong TripAttendance Roster.
   */
  async completeTrip(tripId: string, currentUser: User): Promise<{ message: string; trip: any }> {
    if (currentUser.role !== Role.DRIVER) {
      throw new ForbiddenException('Chỉ tài xế mới có quyền hoàn thành chuyến xe');
    }

    return this.withTripLock(tripId, async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: {
          attendances: true,
        },
      });

      if (!trip) {
        throw new NotFoundException('Không tìm thấy chuyến xe');
      }

      if (trip.assignedDriverId !== currentUser.id) {
        throw new ForbiddenException('Bạn không phải tài xế được phân công cho chuyến này');
      }

      if (trip.status !== TripStatus.IN_PROGRESS) {
        throw new BadRequestException('Chuyến xe không ở trạng thái đang vận hành (IN_PROGRESS)');
      }

      const activeAttendances = filterActiveAttendances(trip.attendances);
      // D11: Chuyến xe bắt buộc phải có ít nhất 1 học sinh
      if (activeAttendances.length === 0) {
        throw new BadRequestException('Chuyến xe không có học sinh trong danh sách, không thể hoàn thành');
      }

      // BF-07: TO_SCHOOL chỉ Complete sau khi đã xác nhận Đến trường
      if (trip.direction === RouteDirection.TO_SCHOOL && !trip.arrivedAtSchoolAt) {
        throw new BadRequestException('Chưa thể hoàn thành chuyến xe. Xe chưa xác nhận đến trường.');
      }

      // BR-10: Kiểm tra còn học sinh UNMARKED không
      const unmarked = activeAttendances.filter((a) => a.status === AttendanceStatus.UNMARKED);
      if (unmarked.length > 0) {
        throw new UnprocessableEntityException({
          error: 'INCOMPLETE_ATTENDANCE',
          message: `Chuyến xe còn ${unmarked.length} học sinh chưa được điểm danh. Vui lòng hoàn tất điểm danh trước khi kết thúc chuyến.`,
          unmarkedCount: unmarked.length,
        });
      }

      // Kiểm tra tất cả ABSENT đều có lý do hợp lệ
      const invalidAbsent = activeAttendances.filter(
        (a) => a.status === AttendanceStatus.ABSENT && (!a.absenceReason || !a.absenceReason.trim()),
      );
      if (invalidAbsent.length > 0) {
        throw new BadRequestException('Có học sinh vắng mặt nhưng chưa có lý do hợp lệ');
      }

      // BF-06, BF-07, BF-11: Tất cả học sinh PRESENT phải được đánh dấu đã xuống xe
      const pendingAlight = activeAttendances.filter(
        (a) => a.status === AttendanceStatus.PRESENT && !a.alightedAt,
      );
      if (pendingAlight.length > 0) {
        throw new BadRequestException(
          `Chưa thể hoàn thành chuyến xe. Còn ${pendingAlight.length} học sinh có mặt trên xe chưa được xác nhận xuống xe.`,
        );
      }

      const updated = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.COMPLETED,
          actualEndTime: new Date(),
        },
      });

      // Đóng các sự cố tự động còn chờ xác nhận (CLOSED_WITHOUT_CONFIRMATION)
      if (tx.tripIncident) {
        await tx.tripIncident.updateMany({
          where: {
            tripId,
            status: TripIncidentStatus.WAITING_CONFIRMATION,
          },
          data: {
            status: TripIncidentStatus.CLOSED,
            processedAt: new Date(),
            resolution: {
              action: 'CLOSED_WITHOUT_CONFIRMATION',
              reason: 'Chuyến xe kết thúc khi chưa xác nhận',
            },
          },
        });
      }

      await notifyTrip(tx, tripId, 'COMPLETED', currentUser.id);
      this.logger.log(`Trip ${tripId} Completed by Driver ${currentUser.id}`);
      return {
        message: 'Hoàn thành chuyến xe thành công',
        trip: updated,
      };
    });
  }

  /**
   * Endpoint siêu nhẹ phục vụ Polling realtime trạng thái vận hành (BR-06, D07).
   */
  async getOperationalState(tripId: string, currentUser: User): Promise<OperationalStateResponseDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        attendances: true,
        school: { select: { contractEndDate: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến xe');
    }

    const allowedChildren = await this.assertTripAccess(trip, currentUser);
    Object.assign(trip, await effectiveTripTiming(this.prisma, trip.id));
    const now = new Date();
    const isTest = this.isTestMode();
    const isAttendantReady = Boolean(trip.attendantReadyAt);

    let readyThreshold = trip.scheduledStartAt
      ? new Date(trip.scheduledStartAt.getTime() - 15 * 60 * 1000)
      : null;
    let startThreshold = trip.scheduledStartAt
      ? new Date(trip.scheduledStartAt.getTime() - 5 * 60 * 1000)
      : null;

    const totalStudents = trip.attendances.length;
    const presentCount = trip.attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const absentCount = trip.attendances.filter((a) => a.status === AttendanceStatus.ABSENT).length;
    const unmarkedCount = trip.attendances.filter((a) => a.status === AttendanceStatus.UNMARKED).length;
    const markedCount = presentCount + absentCount;
    const isAllMarked = totalStudents > 0 && unmarkedCount === 0;
    const alightedCount = trip.attendances.filter(
      (a) => a.status === AttendanceStatus.PRESENT && a.alightedAt,
    ).length;
    const pendingAlightCount = trip.attendances.filter(
      (a) => a.status === AttendanceStatus.PRESENT && !a.alightedAt,
    ).length;
    const isAllAlighted = presentCount > 0 ? pendingAlightCount === 0 : totalStudents > 0;
    const isSchoolArrived = Boolean(trip.arrivedAtSchoolAt);

    let canAttendantReady = false;
    let readyDisabledReason: string | null = null;
    if (trip.status === TripStatus.SCHEDULED) {
      if (isAttendantReady) {
        readyDisabledReason = 'ALREADY_READY';
      } else if (isTest || (readyThreshold && now >= readyThreshold)) {
        canAttendantReady = true;
      } else {
        readyDisabledReason = 'TOO_EARLY';
      }
    } else {
      readyDisabledReason = 'TRIP_NOT_SCHEDULED';
    }

    const pendingStaffNotices = this.prisma.leaveNotice
      ? await this.prisma.leaveNotice.findMany({
          where: {
            tripId,
            kind: { in: [LeaveNoticeKind.DRIVER, LeaveNoticeKind.BUS_ATTENDANT] },
            status: LeaveNoticeStatus.PENDING_REPLACEMENT,
          },
        })
      : [];
    const pendingStaffIncidents = this.prisma.tripIncident
      ? await this.prisma.tripIncident.findMany({
          where: {
            tripId,
            type: { in: [TripIncidentType.ATTENDANT_MISSING, TripIncidentType.DRIVER_MISSING] },
            status: TripIncidentStatus.WAITING_ASSIGNMENT,
          },
        })
      : [];
    const hasPendingStaffIncident = pendingStaffIncidents.length > 0;
    const hasPendingStaffLeaveNotice = pendingStaffNotices.length > 0;
    const assignmentStatus: 'ASSIGNED' | 'WAITING_ASSIGNMENT' =
      hasPendingStaffLeaveNotice || hasPendingStaffIncident ? 'WAITING_ASSIGNMENT' : 'ASSIGNED';
    const attendantHasPendingNotice = pendingStaffNotices.some(
      (n) => n.kind === LeaveNoticeKind.BUS_ATTENDANT,
    );
    const attendantHasIncident = pendingStaffIncidents.some(
      (i) => i.type === TripIncidentType.ATTENDANT_MISSING,
    );

    if (attendantHasPendingNotice || attendantHasIncident) {
      canAttendantReady = false;
      readyDisabledReason = attendantHasPendingNotice
        ? 'ATTENDANT_ON_LEAVE'
        : 'ATTENDANT_REPORTED_MISSING';
    }

    let canDriverStart = false;
    let startDisabledReason: string | null = null;
    if (trip.status === TripStatus.SCHEDULED) {
      if (hasPendingStaffLeaveNotice || hasPendingStaffIncident) {
        startDisabledReason = 'WAITING_ASSIGNMENT';
      } else if (!isAttendantReady) {
        startDisabledReason = 'WAITING_FOR_ATTENDANT';
      } else if (totalStudents === 0) {
        startDisabledReason = 'EMPTY_ROSTER';
      } else if (trip.direction === RouteDirection.TO_PARKING && !isAllMarked) {
        // RET-03: TO_PARKING requires 100% boarding before Start
        startDisabledReason = 'PENDING_BOARDING';
      } else if (
        trip.direction === RouteDirection.TO_PARKING &&
        trip.attendances.some(
          (a) =>
            !a.excludedAt &&
            a.status === AttendanceStatus.ABSENT &&
            (!a.absenceReason || !a.absenceReason.trim()),
        )
      ) {
        startDisabledReason = 'ABSENT_REASON_REQUIRED';
      } else if (trip.direction === RouteDirection.TO_PARKING && presentCount === 0) {
        startDisabledReason = 'ALL_STUDENTS_ABSENT';
      } else if (!isTest && (!trip.scheduledStartAt || !trip.scheduledEndAt)) {
        startDisabledReason = 'MISSING_SCHEDULE_TIMES';
      } else if (!isTest && trip.scheduledEndAt && now > trip.scheduledEndAt) {
        startDisabledReason = 'SCHEDULED_END_TIME_EXCEEDED';
      } else if (isTest || (startThreshold && now >= startThreshold)) {
        canDriverStart = true;
      } else {
        startDisabledReason = 'TOO_EARLY';
      }
    } else if (trip.status === TripStatus.IN_PROGRESS) {
      startDisabledReason = 'ALREADY_STARTED';
    } else {
      startDisabledReason = 'TRIP_COMPLETED';
    }

    let canArriveAtSchool = false;
    let arriveAtSchoolDisabledReason: string | null = null;
    if (trip.direction === RouteDirection.TO_SCHOOL) {
      if (trip.status === TripStatus.SCHEDULED) {
        arriveAtSchoolDisabledReason = 'TRIP_NOT_STARTED';
      } else if (trip.status === TripStatus.IN_PROGRESS) {
        if (isSchoolArrived) {
          arriveAtSchoolDisabledReason = 'ALREADY_ARRIVED';
        } else if (totalStudents === 0) {
          arriveAtSchoolDisabledReason = 'EMPTY_ROSTER';
        } else if (!isAllMarked) {
          arriveAtSchoolDisabledReason = 'PENDING_BOARDING';
        } else {
          canArriveAtSchool = true;
        }
      } else {
        arriveAtSchoolDisabledReason = 'TRIP_COMPLETED';
      }
    } else {
      arriveAtSchoolDisabledReason = 'NOT_APPLICABLE_FOR_DIRECTION';
    }

    let canDriverComplete = false;
    let completeDisabledReason: string | null = null;
    if (trip.status === TripStatus.IN_PROGRESS) {
      if (totalStudents === 0) {
        completeDisabledReason = 'EMPTY_ROSTER';
      } else if (!isAllMarked) {
        completeDisabledReason = 'PENDING_ATTENDANCE';
      } else if (trip.direction === RouteDirection.TO_SCHOOL && !isSchoolArrived) {
        completeDisabledReason = 'NOT_ARRIVED_AT_SCHOOL';
      } else if (pendingAlightCount > 0) {
        completeDisabledReason = 'STUDENTS_NOT_ALIGHTED';
      } else {
        canDriverComplete = true;
      }
    } else if (trip.status === TripStatus.SCHEDULED) {
      completeDisabledReason = 'TRIP_NOT_STARTED';
    } else {
      completeDisabledReason = 'TRIP_ALREADY_COMPLETED';
    }

    const lifecycleBlock = await tripBlockReason(this.prisma, trip.id);
    if (lifecycleBlock) {
      canDriverStart = false;
      canDriverComplete = false;
      canArriveAtSchool = false;
      canAttendantReady = false;
      startDisabledReason = lifecycleBlock;
      completeDisabledReason = lifecycleBlock;
      arriveAtSchoolDisabledReason = lifecycleBlock;
      readyDisabledReason = lifecycleBlock;
    }

    const children = trip.attendances.filter(a => allowedChildren.has(a.studentId)).map(a => ({
      studentId: a.studentId, attendanceStatus: a.status,
      absenceReason: a.status === AttendanceStatus.ABSENT ? a.absenceReason : null,
      markedAt: a.markedAt?.toISOString() || null,
      alightedAt: a.alightedAt?.toISOString() || null, isAlighted: Boolean(a.alightedAt),
    }));
    if (currentUser.role === Role.PARENT) {
      return {
        tripId: trip.id, status: trip.status, direction: trip.direction,
        actualStartTime: trip.actualStartTime?.toISOString() || null,
        actualEndTime: trip.actualEndTime?.toISOString() || null,
        arrivedAtSchoolAt: trip.arrivedAtSchoolAt?.toISOString() || null,
        isSchoolArrived, children,
        assignmentStatus,
        hasPendingStaffLeaveNotice,
        pendingStaffLeaveNoticeCount: pendingStaffNotices.length,
        hasPendingStaffIncident,
        pendingStaffIncidentCount: pendingStaffIncidents.length,
      };
    }
    canDriverStart = currentUser.role === Role.DRIVER && canDriverStart;
    canDriverComplete = currentUser.role === Role.DRIVER && canDriverComplete;
    canArriveAtSchool = currentUser.role === Role.DRIVER && canArriveAtSchool;
    canAttendantReady = currentUser.role === Role.BUS_ATTENDANT && canAttendantReady;

    return {
      tripId: trip.id,
      status: trip.status,
      direction: trip.direction,
      isAttendantReady,
      attendantReadyAt: trip.attendantReadyAt ? trip.attendantReadyAt.toISOString() : null,
      actualStartTime: trip.actualStartTime ? trip.actualStartTime.toISOString() : null,
      actualEndTime: trip.actualEndTime ? trip.actualEndTime.toISOString() : null,
      arrivedAtSchoolAt: trip.arrivedAtSchoolAt ? trip.arrivedAtSchoolAt.toISOString() : null,
      isSchoolArrived,
      totalStudents,
      markedCount,
      presentCount,
      absentCount,
      unmarkedCount,
      isAllMarked,
      alightedCount,
      pendingAlightCount,
      isAllAlighted,
      canDriverStart,
      canStartTrip: canDriverStart,
      canArriveAtSchool,
      canDriverComplete,
      canCompleteTrip: canDriverComplete,
      canAttendantReady,
      canMarkReady: canAttendantReady,
      startDisabledReason,
      arriveAtSchoolDisabledReason,
      completeDisabledReason,
      readyDisabledReason,
      disabledReasons: {
        ready: readyDisabledReason,
        start: startDisabledReason,
        arriveAtSchool: arriveAtSchoolDisabledReason,
        complete: completeDisabledReason,
      },
      assignmentStatus,
      hasPendingStaffLeaveNotice,
      pendingStaffLeaveNoticeCount: pendingStaffNotices.length,
      hasPendingStaffIncident,
      pendingStaffIncidentCount: pendingStaffIncidents.length,
      children: [],
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private getDateRangeArray(startStr: string, endStr: string): string[] {
    const result: string[] = [];
    let curr = new Date(`${startStr}T00:00:00.000Z`);
    const end = new Date(`${endStr}T00:00:00.000Z`);

    while (curr <= end) {
      result.push(formatDateToVnYmd(curr));
      curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
    }
    return result;
  }

  private addDaysToYmd(ymd: string, days: number): string {
    const dt = new Date(`${ymd}T00:00:00.000Z`);
    const future = new Date(dt.getTime() + days * 24 * 60 * 60 * 1000);
    return formatDateToVnYmd(future);
  }
}
