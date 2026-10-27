import { notifyIncident, notifyLeave } from '../notifications/notification-events.js';
import { actionableIncidentWhere, adminSchoolScope } from '../overview/operations-policy.js';
import { notifyAssignment, notifyCancelledTrips } from '../notifications/notification-writer.js';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  Prisma,
  Role,
  TripIncidentType,
  TripIncidentStatus,
  TripStatus,
  LeaveNoticeKind,
  LeaveNoticeStatus,
  User,
} from '@prisma/client';
import { CreateIncidentDto } from './dto/create-incident.dto.js';
import { IncidentOptionsResponseDto } from './dto/incident-options-response.dto.js';
import {
  TripIncidentResponseDto,
  TripIncidentsTabResponseDto,
} from './dto/incident-response.dto.js';
import {
  ListIncidentsQueryDto,
  ListMineIncidentsQueryDto,
  PaginatedIncidentsResponseDto,
} from './dto/list-incidents-query.dto.js';
import { ResolveIncidentDto, ResolveIncidentAction } from './dto/resolve-incident.dto.js';
import { CancelTripIncidentDto } from './dto/cancel-trip-incident.dto.js';
import { ConfirmIncidentDto } from './dto/confirm-incident.dto.js';
import {
  ReplacementCandidatesResponseDto,
  IncidentCandidateDto,
} from './dto/replacement-candidates-response.dto.js';
import { formatDateToVnYmd, isTimeIntervalOverlapping } from '../trips/utils/trip-time.util.js';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  isTestMode(): boolean {
    const mode =
      this.configService.get<string>('TRIP_OPERATION_MODE') || process.env.TRIP_OPERATION_MODE;
    return mode?.toUpperCase() === 'TEST';
  }

  /**
   * Khóa Trip trước khi cập nhật hoặc đọc trạng thái nhạy cảm (CAS lock pattern).
   */
  async withTripLock<T>(id: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM trips WHERE id = ${id} FOR UPDATE`);
        return work(tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  /**
   * Kiểm tra quyền truy cập vào chuyến xe theo vai trò.
   */
  async assertTripAccess(
    trip: {
      id: string;
      schoolId: string;
      assignedDriverId: string;
      assignedBusAttendantId: string;
      attendances?: { studentId: string }[];
    },
    user: User,
  ): Promise<Set<string>> {
    if (user.role === Role.SYSTEM_ADMIN) return new Set();
    if (user.role === Role.SCHOOL_ADMIN && user.schoolId && user.schoolId === trip.schoolId)
      return new Set();
    if (user.role === Role.DRIVER && trip.assignedDriverId === user.id) return new Set();
    if (user.role === Role.BUS_ATTENDANT && trip.assignedBusAttendantId === user.id)
      return new Set();
    if (user.role === Role.PARENT) {
      const links = await this.prisma.parentStudentLink.findMany({
        where: {
          parentId: user.id,
          studentId: { in: (trip.attendances || []).map((a) => a.studentId) },
        },
        select: { studentId: true },
      });
      const rosterIds = new Set((trip.attendances || []).map((a) => a.studentId));
      const ids = new Set(
        links.filter((link) => rosterIds.has(link.studentId)).map((link) => link.studentId),
      );
      if (ids.size) return ids;
    }
    throw new ForbiddenException('Bạn không có quyền xem chuyến xe này');
  }

  /**
   * Lấy điều kiện và tùy chọn báo sự cố cho Trip đang xem.
   */
  async getIncidentOptions(tripId: string, currentUser: User): Promise<IncidentOptionsResponseDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        assignedDriver: { select: { id: true, fullName: true, role: true } },
        assignedBusAttendant: { select: { id: true, fullName: true, role: true } },
        attendances: { select: { studentId: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến xe');
    }

    await this.assertTripAccess(trip, currentUser);

    const now = new Date();
    const serverNow = now.toISOString();

    if (currentUser.role !== Role.DRIVER && currentUser.role !== Role.BUS_ATTENDANT) {
      return {
        canReport: false,
        disabledReason: 'ROLE_NOT_PERMITTED',
        availableTypes: [],
        expectedAssignee: null,
        serverNow,
      };
    }

    const isDriver = currentUser.role === Role.DRIVER;
    const targetType = isDriver
      ? TripIncidentType.ATTENDANT_MISSING
      : TripIncidentType.DRIVER_MISSING;
    const expectedAssignee = isDriver ? trip.assignedBusAttendant : trip.assignedDriver;

    // Phải là người được phân công cho chuyến này
    if (isDriver && trip.assignedDriverId !== currentUser.id) {
      return {
        canReport: false,
        disabledReason: 'NOT_ASSIGNED_DRIVER',
        availableTypes: [],
        expectedAssignee: null,
        serverNow,
      };
    }
    if (!isDriver && trip.assignedBusAttendantId !== currentUser.id) {
      return {
        canReport: false,
        disabledReason: 'NOT_ASSIGNED_ATTENDANT',
        availableTypes: [],
        expectedAssignee: null,
        serverNow,
      };
    }

    // Driver không báo nếu Giáo viên đã Ready
    if (isDriver && trip.attendantReadyAt) {
      return {
        canReport: false,
        disabledReason: 'ATTENDANT_ALREADY_READY',
        availableTypes: [],
        expectedAssignee: null,
        serverNow,
      };
    }

    // Trạng thái chuyến xe
    if (trip.status !== TripStatus.SCHEDULED || trip.actualStartTime) {
      return {
        canReport: false,
        disabledReason: 'TRIP_NOT_SCHEDULED',
        availableTypes: [],
        expectedAssignee: null,
        serverNow,
      };
    }

    // Rào cản thời gian ở LIVE mode
    let reportAvailableAt: string | null = null;
    if (!this.isTestMode()) {
      if (!trip.scheduledStartAt || !trip.scheduledEndAt) {
        return {
          canReport: false,
          disabledReason: 'MISSING_SCHEDULE_TIMES',
          availableTypes: [],
          expectedAssignee: null,
          serverNow,
        };
      }

      const startThreshold = new Date(trip.scheduledStartAt.getTime() - 15 * 60 * 1000);
      reportAvailableAt = startThreshold.toISOString();

      if (now < startThreshold) {
        return {
          canReport: false,
          disabledReason: 'TOO_EARLY',
          availableTypes: [],
          expectedAssignee: null,
          serverNow,
          reportAvailableAt,
        };
      }

      if (now > trip.scheduledEndAt) {
        return {
          canReport: false,
          disabledReason: 'SCHEDULED_END_TIME_EXCEEDED',
          availableTypes: [],
          expectedAssignee: null,
          serverNow,
        };
      }
    }

    // Kiểm tra xem đã có sự cố cùng loại đang mở chưa
    const existing = await this.prisma.tripIncident.findFirst({
      where: {
        tripId,
        type: targetType,
        status: TripIncidentStatus.WAITING_ASSIGNMENT,
      },
    });

    if (existing) {
      return {
        canReport: false,
        disabledReason: 'ALREADY_REPORTED',
        availableTypes: [],
        expectedAssignee,
        serverNow,
        existingIncidentId: existing.id,
      };
    }

    return {
      canReport: true,
      disabledReason: null,
      availableTypes: [targetType],
      expectedAssignee,
      serverNow,
      reportAvailableAt,
    };
  }

  /**
   * Báo thủ công sự cố thiếu nhân sự (ATTENDANT_MISSING hoặc DRIVER_MISSING).
   */
  async createManualIncident(
    tripId: string,
    dto: CreateIncidentDto,
    currentUser: User,
  ): Promise<TripIncidentResponseDto> {
    if (
      dto.type !== TripIncidentType.ATTENDANT_MISSING &&
      dto.type !== TripIncidentType.DRIVER_MISSING
    ) {
      throw new BadRequestException('Chỉ được báo sự cố ATTENDANT_MISSING hoặc DRIVER_MISSING');
    }

    if (currentUser.role === Role.DRIVER && dto.type !== TripIncidentType.ATTENDANT_MISSING) {
      throw new ForbiddenException('Tài xế chỉ được báo sự cố Giáo viên chưa đến (ATTENDANT_MISSING)');
    }
    if (currentUser.role === Role.BUS_ATTENDANT && dto.type !== TripIncidentType.DRIVER_MISSING) {
      throw new ForbiddenException(
        'Giáo viên phụ xe chỉ được báo sự cố Tài xế chưa đến (DRIVER_MISSING)',
      );
    }
    if (currentUser.role !== Role.DRIVER && currentUser.role !== Role.BUS_ATTENDANT) {
      throw new ForbiddenException('Chỉ tài xế hoặc giáo viên phụ xe mới có quyền báo thiếu nhân sự');
    }

    return this.withTripLock(tripId, async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: {
          route: true,
          school: true,
          assignedDriver: true,
          assignedBusAttendant: true,
        },
      });

      if (!trip) {
        throw new NotFoundException('Không tìm thấy chuyến xe');
      }

      if (trip.status !== TripStatus.SCHEDULED || trip.actualStartTime) {
        throw new ConflictException(
          'Chỉ có thể báo sự cố cho chuyến xe đang ở trạng thái SCHEDULED (chưa xuất phát)',
        );
      }

      const isDriver = currentUser.role === Role.DRIVER;
      if (isDriver) {
        if (trip.assignedDriverId !== currentUser.id) {
          throw new ForbiddenException('Bạn không phải tài xế được phân công cho chuyến này');
        }
        if (trip.attendantReadyAt) {
          throw new ConflictException('Giáo viên phụ xe đã xác nhận sẵn sàng, không thể báo chưa đến');
        }
      } else {
        if (trip.assignedBusAttendantId !== currentUser.id) {
          throw new ForbiddenException('Bạn không phải giáo viên phụ xe được phân công cho chuyến này');
        }
      }

      const targetAssigneeId = isDriver ? trip.assignedBusAttendantId : trip.assignedDriverId;
      const targetAssignee = isDriver ? trip.assignedBusAttendant : trip.assignedDriver;

      if (dto.expectedAssigneeId && dto.expectedAssigneeId !== targetAssigneeId) {
        throw new ConflictException(
          'Nhân sự được phân công đã thay đổi, vui lòng tải lại thông tin chuyến xe',
        );
      }

      const now = new Date();
      if (!this.isTestMode()) {
        if (!trip.scheduledStartAt || !trip.scheduledEndAt) {
          throw new BadRequestException(
            'Chuyến xe thiếu thông tin lịch trình thời gian ở chế độ LIVE',
          );
        }
        const startThreshold = new Date(trip.scheduledStartAt.getTime() - 15 * 60 * 1000);
        if (now < startThreshold) {
          throw new ConflictException(
            'Chưa đến giờ báo sự cố (cho phép từ 15 phút trước giờ bắt đầu dự kiến)',
          );
        }
        if (now > trip.scheduledEndAt) {
          throw new ConflictException('Chuyến xe đã vượt quá giờ kết thúc dự kiến, không thể báo sự cố');
        }
      }

      // Kiểm tra sự cố cùng loại đang mở (Idempotency)
      const existingOpen = await tx.tripIncident.findFirst({
        where: {
          tripId,
          type: dto.type,
          status: TripIncidentStatus.WAITING_ASSIGNMENT,
        },
        include: {
          trip: { include: { route: true, school: true } },
          reportedBy: true,
          processedBy: true,
        },
      });

      if (existingOpen) {
        return this.mapToResponseDto(existingOpen);
      }

      const dedupeKey = `manual:${tripId}:${dto.type}:${dto.idempotencyKey || currentUser.id}`;

      try {
        const incident = await tx.tripIncident.create({
          data: {
            tripId,
            type: dto.type,
            status: TripIncidentStatus.WAITING_ASSIGNMENT,
            reportedById: currentUser.id,
            description: dto.description?.trim() || null,
            dedupeKey,
            context: {
              expectedAssigneeId: targetAssigneeId,
              expectedAssigneeName: targetAssignee?.fullName || null,
              reportedAt: now.toISOString(),
            },
          },
          include: {
            trip: { include: { route: true, school: true } },
            reportedBy: true,
            processedBy: true,
          },
        });

        await notifyIncident(tx, incident.id, currentUser.id);
        this.logger.log(
          `Incident ${incident.id} [${incident.type}] reported by user ${currentUser.id} for trip ${tripId}`,
        );
        return this.mapToResponseDto(incident);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const rec = await tx.tripIncident.findUnique({
            where: { dedupeKey },
            include: {
              trip: { include: { route: true, school: true } },
              reportedBy: true,
              processedBy: true,
            },
          });
          if (rec) return this.mapToResponseDto(rec);
        }
        throw err;
      }
    });
  }

  /**
   * Lấy lịch sử sự cố cá nhân của tài xế / giáo viên:
   * reportedById = currentUser.id OR (type IN [OFF_ROUTE, LATE_STOP] AND status = CONFIRMED AND processedById = currentUser.id)
   */
  async listMine(
    query: ListMineIncidentsQueryDto,
    currentUser: User,
  ): Promise<PaginatedIncidentsResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TripIncidentWhereInput = {
      OR: [
        { reportedById: currentUser.id },
        {
          type: { in: [TripIncidentType.OFF_ROUTE, TripIncidentType.LATE_STOP] },
          status: TripIncidentStatus.CONFIRMED,
          processedById: currentUser.id,
        },
      ],
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.date
        ? {
            createdAt: {
              gte: new Date(`${query.date}T00:00:00.000Z`),
              lte: new Date(`${query.date}T23:59:59.999Z`),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.tripIncident.count({ where }),
      this.prisma.tripIncident.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          trip: { include: { route: true, school: true } },
          reportedBy: true,
          processedBy: true,
        },
      }),
    ]);

    return {
      items: items.map((i) => this.mapToResponseDto(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Danh sách sự cố cho Quản trị viên (School Admin scoped theo trường, System Admin xem tất cả).
   */
  async listAdmin(
    query: ListIncidentsQueryDto,
    currentUser: User,
  ): Promise<PaginatedIncidentsResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const schoolIdFilter = adminSchoolScope(currentUser, query.schoolId);

    const where: Prisma.TripIncidentWhereInput = {
      ...(query.actionable ? { AND: [actionableIncidentWhere(currentUser.role, schoolIdFilter)] } : {}),
      ...(schoolIdFilter ? { trip: { schoolId: schoolIdFilter } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.date
        ? {
            createdAt: {
              gte: new Date(`${query.date}T00:00:00.000Z`),
              lte: new Date(`${query.date}T23:59:59.999Z`),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.tripIncident.count({ where }),
      this.prisma.tripIncident.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          trip: { include: { route: true, school: true } },
          reportedBy: true,
          processedBy: true,
        },
      }),
    ]);

    return {
      items: items.map((i) => this.mapToResponseDto(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Danh sách sự cố trong Tab xem của một chuyến xe (kèm Privacy Masking cho Phụ huynh).
   */
  async listByTrip(tripId: string, currentUser: User): Promise<TripIncidentsTabResponseDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        attendances: { select: { studentId: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến xe');
    }

    await this.assertTripAccess(trip, currentUser);

    const items = await this.prisma.tripIncident.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      include: {
        trip: { include: { route: true, school: true } },
        reportedBy: true,
        processedBy: true,
      },
    });

    const isParent = currentUser.role === Role.PARENT;
    const mapped = items.map((i) => {
      const dto = this.mapToResponseDto(i);
      if (isParent) {
        // Privacy projection: chỉ xem loại, thời điểm, trạng thái
        return {
          id: dto.id,
          tripId: dto.tripId,
          type: dto.type,
          status: dto.status,
          createdAt: dto.createdAt,
          updatedAt: dto.updatedAt,
          processedAt: dto.processedAt,
          serviceDate: dto.serviceDate,
          routeName: dto.routeName,
          direction: dto.direction,
          schoolName: dto.schoolName,
          // Ẩn toàn bộ context, lý do, người báo, người xử lý
          description: null,
          context: null,
          resolution: null,
          reportedById: null,
          reportedByName: null,
          reportedByRole: null,
          processedById: null,
          processedByName: null,
        } as TripIncidentResponseDto;
      }
      return dto;
    });

    const pendingCount = items.filter(
      (i) =>
        i.status === TripIncidentStatus.WAITING_ASSIGNMENT ||
        i.status === TripIncidentStatus.WAITING_CONFIRMATION,
    ).length;
    const resolvedCount = items.filter(
      (i) => i.status === TripIncidentStatus.RESOLVED || i.status === TripIncidentStatus.CONFIRMED,
    ).length;

    return {
      items: mapped,
      total: items.length,
      pendingCount,
      resolvedCount,
    };
  }

  /**
   * Chi tiết sự cố theo ID với role-scoped projection.
   */
  async getDetail(id: string, currentUser: User): Promise<TripIncidentResponseDto> {
    const incident = await this.prisma.tripIncident.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            route: true,
            school: true,
            attendances: { select: { studentId: true } },
          },
        },
        reportedBy: true,
        processedBy: true,
      },
    });

    if (!incident) {
      throw new NotFoundException('Không tìm thấy sự cố');
    }

    if (currentUser.role === Role.PARENT) {
      await this.assertTripAccess(incident.trip, currentUser);
      const dto = this.mapToResponseDto(incident);
      return {
        id: dto.id,
        tripId: dto.tripId,
        type: dto.type,
        status: dto.status,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
        processedAt: dto.processedAt,
        serviceDate: dto.serviceDate,
        routeName: dto.routeName,
        direction: dto.direction,
        schoolName: dto.schoolName,
        description: null,
        context: null,
        resolution: null,
        reportedById: null,
        reportedByName: null,
        reportedByRole: null,
        processedById: null,
        processedByName: null,
      } as TripIncidentResponseDto;
    }

    if (currentUser.role === Role.SCHOOL_ADMIN) {
      if (incident.trip.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('Bạn không có quyền xem sự cố của trường khác');
      }
    } else if (currentUser.role === Role.DRIVER || currentUser.role === Role.BUS_ATTENDANT) {
      const isMine =
        incident.reportedById === currentUser.id ||
        incident.processedById === currentUser.id ||
        incident.trip.assignedDriverId === currentUser.id ||
        incident.trip.assignedBusAttendantId === currentUser.id;
      if (!isMine) {
        throw new ForbiddenException('Bạn không có quyền xem sự cố này');
      }
    }

    return this.mapToResponseDto(incident);
  }

  /**
   * Danh sách ứng viên nhân sự thay thế đủ điều kiện.
   */
  async getReplacementCandidates(
    id: string,
    currentUser: User,
  ): Promise<ReplacementCandidatesResponseDto> {
    const incident = await this.prisma.tripIncident.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            route: true,
          },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException('Không tìm thấy sự cố');
    }

    if (incident.type === TripIncidentType.ATTENDANT_MISSING) {
      if (
        currentUser.role !== Role.SYSTEM_ADMIN &&
        (currentUser.role !== Role.SCHOOL_ADMIN || currentUser.schoolId !== incident.trip.schoolId)
      ) {
        throw new ForbiddenException(
          'Chỉ Quản trị viên trường học của chuyến xe mới có quyền xử lý sự cố thiếu Giáo viên',
        );
      }
    } else if (incident.type === TripIncidentType.DRIVER_MISSING) {
      if (currentUser.role !== Role.SYSTEM_ADMIN) {
        throw new ForbiddenException('Chỉ Quản trị viên hệ thống mới có quyền xử lý sự cố thiếu Tài xế');
      }
    } else {
      throw new BadRequestException('Sự cố tự động không hỗ trợ tìm nhân sự thay thế');
    }

    const trip = incident.trip;
    const targetRole =
      incident.type === TripIncidentType.ATTENDANT_MISSING ? Role.BUS_ATTENDANT : Role.DRIVER;
    const excludeUserId =
      incident.type === TripIncidentType.ATTENDANT_MISSING
        ? trip.assignedBusAttendantId
        : trip.assignedDriverId;

    // 1. Lấy tất cả user active có role phù hợp
    const candidateUsers = await this.prisma.user.findMany({
      where: {
        role: targetRole,
        isActive: true,
        isVerified: true,
        id: { not: excludeUserId },
        ...(targetRole === Role.BUS_ATTENDANT ? { schoolId: trip.schoolId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
      },
    });

    if (candidateUsers.length === 0) {
      return { candidates: [], total: 0 };
    }

    const candidateIds = candidateUsers.map((u) => u.id);

    // 2. Kiểm tra trùng lịch chuyến xe khác trong cùng ngày serviceDate
    const existingTripsOnDate = await this.prisma.trip.findMany({
      where: {
        serviceDate: trip.serviceDate,
        id: { not: trip.id },
        status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
        OR: [
          { assignedDriverId: { in: candidateIds } },
          { assignedBusAttendantId: { in: candidateIds } },
        ],
      },
      select: {
        id: true,
        assignedDriverId: true,
        assignedBusAttendantId: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
      },
    });

    // 3. Kiểm tra báo nghỉ nhân sự trong ngày
    const leaveNoticesOnDate = await this.prisma.leaveNotice.findMany({
      where: {
        reportedById: { in: candidateIds },
        trip: { serviceDate: trip.serviceDate },
        status: { in: [LeaveNoticeStatus.RECORDED, LeaveNoticeStatus.PENDING_REPLACEMENT] },
      },
      select: { reportedById: true },
    });
    const onLeaveUserIds = new Set(leaveNoticesOnDate.map((n) => n.reportedById));

    const eligibleCandidates: IncidentCandidateDto[] = [];
    for (const user of candidateUsers) {
      if (onLeaveUserIds.has(user.id)) {
        continue;
      }

      // Check time overlap
      let hasOverlap = false;
      if (trip.scheduledStartAt && trip.scheduledEndAt) {
        const userTrips = existingTripsOnDate.filter(
          (t) => t.assignedDriverId === user.id || t.assignedBusAttendantId === user.id,
        );
        for (const ut of userTrips) {
          if (ut.scheduledStartAt && ut.scheduledEndAt) {
            if (
              isTimeIntervalOverlapping(
                trip.scheduledStartAt,
                trip.scheduledEndAt,
                ut.scheduledStartAt,
                ut.scheduledEndAt,
              )
            ) {
              hasOverlap = true;
              break;
            }
          } else {
            hasOverlap = true;
            break;
          }
        }
      }

      if (!hasOverlap) {
        eligibleCandidates.push(user);
      }
    }

    return {
      candidates: eligibleCandidates,
      total: eligibleCandidates.length,
    };
  }

  /**
   * Xử lý sự cố thiếu nhân sự: Người cũ đã đến (ARRIVED) hoặc Phân công thay thế (REPLACED).
   */
  async resolveIncident(
    id: string,
    dto: ResolveIncidentDto,
    currentUser: User,
  ): Promise<TripIncidentResponseDto> {
    const incident = await this.prisma.tripIncident.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            route: true,
            school: true,
          },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException('Không tìm thấy sự cố');
    }

    if (incident.type === TripIncidentType.ATTENDANT_MISSING) {
      if (
        currentUser.role !== Role.SYSTEM_ADMIN &&
        (currentUser.role !== Role.SCHOOL_ADMIN || currentUser.schoolId !== incident.trip.schoolId)
      ) {
        throw new ForbiddenException(
          'Chỉ Quản trị viên trường học của chuyến xe mới có quyền xử lý sự cố thiếu Giáo viên',
        );
      }
    } else if (incident.type === TripIncidentType.DRIVER_MISSING) {
      if (currentUser.role !== Role.SYSTEM_ADMIN) {
        throw new ForbiddenException('Chỉ Quản trị viên hệ thống mới có quyền xử lý sự cố thiếu Tài xế');
      }
    } else {
      throw new BadRequestException('Chỉ có thể xử lý sự cố thiếu nhân sự');
    }

    return this.withTripLock(incident.tripId, async (tx) => {
      // Re-read under lock
      const currentIncident = await tx.tripIncident.findUnique({
        where: { id },
        include: { trip: true },
      });

      if (!currentIncident) {
        throw new NotFoundException('Không tìm thấy sự cố');
      }

      if (currentIncident.status !== TripIncidentStatus.WAITING_ASSIGNMENT) {
        throw new ConflictException('Sự cố không ở trạng thái chờ xử lý (đã được xử lý hoặc đã đóng)');
      }

      if (dto.expectedStatus && currentIncident.status !== dto.expectedStatus) {
        throw new ConflictException('Trạng thái sự cố đã thay đổi, vui lòng tải lại');
      }

      const trip = currentIncident.trip;

      if (dto.action === ResolveIncidentAction.ARRIVED) {
        const reportedPersonId =
          currentIncident.type === TripIncidentType.ATTENDANT_MISSING
            ? trip.assignedBusAttendantId
            : trip.assignedDriverId;

        // BR: ARRIVED không được bypass nếu nhân sự đó đang có báo nghỉ hợp lệ chưa xử lý
        const openLeave = await tx.leaveNotice.findFirst({
          where: {
            tripId: trip.id,
            reportedById: reportedPersonId,
            status: { in: [LeaveNoticeStatus.RECORDED, LeaveNoticeStatus.PENDING_REPLACEMENT] },
          },
        });
        if (openLeave) {
          throw new ConflictException(
            'Nhân sự này đang có báo nghỉ chưa xử lý. Vui lòng xử lý tại luồng Báo nghỉ hoặc phân công thay thế.',
          );
        }

        const updated = await tx.tripIncident.update({
          where: { id },
          data: {
            status: TripIncidentStatus.RESOLVED,
            processedById: currentUser.id,
            processedAt: new Date(),
            resolution: {
              action: 'ARRIVED',
              reason: dto.reason?.trim() || 'Người cũ đã đến',
            },
          },
          include: {
            trip: { include: { route: true, school: true } },
            reportedBy: true,
            processedBy: true,
          },
        });

        await notifyIncident(tx, id, currentUser.id);
        this.logger.log(`Incident ${id} resolved as ARRIVED by user ${currentUser.id}`);
        return this.mapToResponseDto(updated);
      }

      if (dto.action === ResolveIncidentAction.REPLACED) {
        if (!dto.replacementUserId) {
          throw new BadRequestException('Bắt buộc phải chọn nhân sự thay thế khi action là REPLACED');
        }

        const replacementUser = await tx.user.findUnique({
          where: { id: dto.replacementUserId },
        });

        if (!replacementUser || !replacementUser.isActive || !replacementUser.isVerified) {
          throw new BadRequestException('Nhân sự thay thế không hợp lệ hoặc tài khoản bị khóa');
        }

        const isAttendantIncident = currentIncident.type === TripIncidentType.ATTENDANT_MISSING;
        const expectedRole = isAttendantIncident ? Role.BUS_ATTENDANT : Role.DRIVER;
        if (replacementUser.role !== expectedRole) {
          throw new BadRequestException(
            `Nhân sự thay thế phải có vai trò ${expectedRole}`,
          );
        }

        if (isAttendantIncident && replacementUser.schoolId !== trip.schoolId) {
          throw new BadRequestException('Giáo viên phụ xe thay thế phải thuộc cùng trường học');
        }

        const previousUserId = isAttendantIncident
          ? trip.assignedBusAttendantId
          : trip.assignedDriverId;

        // Cập nhật phân công chuyến xe
        if (isAttendantIncident) {
          await tx.trip.update({
            where: { id: trip.id },
            data: {
              assignedBusAttendantId: dto.replacementUserId,
              attendantReadyAt: null, // Reset Ready khi thay Giáo viên phụ xe
            },
          });

          // Đồng bộ nếu có LeaveNotice cho giáo viên cũ trên chuyến này
          await tx.leaveNotice.updateMany({
            where: {
              tripId: trip.id,
              kind: LeaveNoticeKind.BUS_ATTENDANT,
              status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            },
            data: {
              status: LeaveNoticeStatus.REPLACED,
              replacementUserId: dto.replacementUserId,
              processedById: currentUser.id,
              processedAt: new Date(),
            },
          });
        } else {
          await tx.trip.update({
            where: { id: trip.id },
            data: {
              assignedDriverId: dto.replacementUserId,
            },
          });

          // Đồng bộ nếu có LeaveNotice cho tài xế cũ trên chuyến này
          await tx.leaveNotice.updateMany({
            where: {
              tripId: trip.id,
              kind: LeaveNoticeKind.DRIVER,
              status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            },
            data: {
              status: LeaveNoticeStatus.REPLACED,
              replacementUserId: dto.replacementUserId,
              processedById: currentUser.id,
              processedAt: new Date(),
            },
          });
        }

        const updated = await tx.tripIncident.update({
          where: { id },
          data: {
            status: TripIncidentStatus.RESOLVED,
            processedById: currentUser.id,
            processedAt: new Date(),
            resolution: {
              action: 'REPLACED',
              previousUserId,
              replacementUserId: dto.replacementUserId,
              reason: dto.reason?.trim() || 'Đã phân công thay thế',
            },
          },
          include: {
            trip: { include: { route: true, school: true } },
            reportedBy: true,
            processedBy: true,
          },
        });

        this.logger.log(
          `Incident ${id} resolved as REPLACED (${previousUserId} -> ${dto.replacementUserId}) by user ${currentUser.id}`,
        );
        await notifyAssignment(tx, trip.id, previousUserId, dto.replacementUserId, `incident:${id}`, currentUser.id);
        await notifyIncident(tx, id, currentUser.id);
        const linkedLeaves = await tx.leaveNotice.findMany({ where: { tripId: trip.id, replacementUserId: dto.replacementUserId, status: 'REPLACED' }, select: { id: true } });
        for (const leave of linkedLeaves) await notifyLeave(tx, leave.id, currentUser.id);
        return this.mapToResponseDto(updated);
      }

      throw new BadRequestException('Hành động xử lý không hợp lệ');
    });
  }

  /**
   * Hủy chuyến xe từ sự cố thiếu nhân sự không thể bố trí thay thế.
   */
  async cancelTripFromIncident(
    id: string,
    dto: CancelTripIncidentDto,
    currentUser: User,
  ): Promise<TripIncidentResponseDto> {
    const incident = await this.prisma.tripIncident.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!incident) {
      throw new NotFoundException('Không tìm thấy sự cố');
    }

    if (incident.type === TripIncidentType.ATTENDANT_MISSING) {
      if (
        currentUser.role !== Role.SYSTEM_ADMIN &&
        (currentUser.role !== Role.SCHOOL_ADMIN || currentUser.schoolId !== incident.trip.schoolId)
      ) {
        throw new ForbiddenException(
          'Chỉ Quản trị viên trường học của chuyến xe mới có quyền hủy chuyến',
        );
      }
    } else if (incident.type === TripIncidentType.DRIVER_MISSING) {
      if (currentUser.role !== Role.SYSTEM_ADMIN) {
        throw new ForbiddenException('Chỉ Quản trị viên hệ thống mới có quyền hủy chuyến');
      }
    } else {
      throw new BadRequestException('Chỉ có thể hủy chuyến từ sự cố thiếu nhân sự');
    }

    return this.withTripLock(incident.tripId, async (tx) => {
      const currentIncident = await tx.tripIncident.findUnique({
        where: { id },
        include: { trip: true },
      });

      if (!currentIncident) {
        throw new NotFoundException('Không tìm thấy sự cố');
      }

      if (currentIncident.status !== TripIncidentStatus.WAITING_ASSIGNMENT) {
        throw new ConflictException('Sự cố không ở trạng thái chờ xử lý');
      }

      const trip = currentIncident.trip;
      if (trip.status !== TripStatus.SCHEDULED) {
        throw new ConflictException('Chỉ có thể hủy chuyến xe đang ở trạng thái SCHEDULED');
      }

      const now = new Date();
      const reason = dto.reason.trim();

      // Hủy Trip
      await tx.trip.update({
        where: { id: trip.id },
        data: {
          status: TripStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: now,
          cancelledById: currentUser.id,
        },
      });

      // Cập nhật sự cố hiện tại
      const updated = await tx.tripIncident.update({
        where: { id },
        data: {
          status: TripIncidentStatus.RESOLVED,
          processedById: currentUser.id,
          processedAt: now,
          resolution: {
            action: 'TRIP_CANCELLED',
            reason,
          },
        },
        include: {
          trip: { include: { route: true, school: true } },
          reportedBy: true,
          processedBy: true,
        },
      });

      // Đóng tất cả các sự cố khác còn mở của Trip này
      await tx.tripIncident.updateMany({
        where: {
          tripId: trip.id,
          id: { not: id },
          status: {
            in: [
              TripIncidentStatus.WAITING_ASSIGNMENT,
              TripIncidentStatus.WAITING_CONFIRMATION,
            ],
          },
        },
        data: {
          status: TripIncidentStatus.CLOSED,
          processedAt: now,
          resolution: {
            action: 'TRIP_CANCELLED',
            reason: 'Chuyến xe đã bị hủy',
          },
        },
      });

      // Đóng các báo nghỉ nhân sự đang chờ phân công
      await tx.leaveNotice.updateMany({
        where: {
          tripId: trip.id,
          status: LeaveNoticeStatus.PENDING_REPLACEMENT,
        },
        data: {
          status: LeaveNoticeStatus.TRIP_CANCELLED,
          cancelledAt: now,
          cancelledById: currentUser.id,
        },
      });

      await notifyCancelledTrips(tx, [trip.id], `incident:${id}`, currentUser.id);
      this.logger.log(`Trip ${trip.id} CANCELLED via Incident ${id} by user ${currentUser.id}`);
      return this.mapToResponseDto(updated);
    });
  }

  /**
   * Giáo viên phụ xe xác nhận sự cố tự động (OFF_ROUTE hoặc LATE_STOP).
   */
  async confirmAutoIncident(
    id: string,
    dto: ConfirmIncidentDto,
    currentUser: User,
  ): Promise<TripIncidentResponseDto> {
    if (currentUser.role !== Role.BUS_ATTENDANT) {
      throw new ForbiddenException('Chỉ giáo viên phụ xe mới có quyền xác nhận sự cố tự động');
    }

    const incident = await this.prisma.tripIncident.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!incident) {
      throw new NotFoundException('Không tìm thấy sự cố');
    }

    if (
      incident.type !== TripIncidentType.OFF_ROUTE &&
      incident.type !== TripIncidentType.LATE_STOP
    ) {
      throw new BadRequestException('Chỉ có thể xác nhận sự cố tự động (Lệch tuyến hoặc Đón trả trễ)');
    }

    return this.withTripLock(incident.tripId, async (tx) => {
      const currentIncident = await tx.tripIncident.findUnique({
        where: { id },
        include: { trip: true },
      });

      if (!currentIncident) {
        throw new NotFoundException('Không tìm thấy sự cố');
      }

      if (currentIncident.trip.assignedBusAttendantId !== currentUser.id) {
        throw new ForbiddenException(
          'Bạn không phải giáo viên phụ xe được phân công cho chuyến này',
        );
      }

      if (currentIncident.status !== TripIncidentStatus.WAITING_CONFIRMATION) {
        throw new ConflictException(
          'Sự cố không ở trạng thái chờ xác nhận (đã được xác nhận hoặc đã đóng)',
        );
      }

      if (dto.expectedStatus && currentIncident.status !== dto.expectedStatus) {
        throw new ConflictException('Trạng thái sự cố đã thay đổi, vui lòng tải lại');
      }

      const now = new Date();
      const updated = await tx.tripIncident.update({
        where: { id },
        data: {
          status: TripIncidentStatus.CONFIRMED,
          processedById: currentUser.id,
          processedAt: now,
          resolution: {
            action: 'ACKNOWLEDGED',
            reason: dto.reason.trim(),
            confirmedByRole: 'BUS_ATTENDANT',
          },
        },
        include: {
          trip: { include: { route: true, school: true } },
          reportedBy: true,
          processedBy: true,
        },
      });

      this.logger.log(`Incident ${id} CONFIRMED by Bus Attendant ${currentUser.id}`);
      return this.mapToResponseDto(updated);
    });
  }

  /**
   * Helper mapping Prisma entity sang TripIncidentResponseDto.
   */
  private mapToResponseDto(entity: any): TripIncidentResponseDto {
    const trip = entity.trip;
    return {
      id: entity.id,
      tripId: entity.tripId,
      type: entity.type,
      status: entity.status,
      reportedById: entity.reportedById ?? null,
      reportedByName: entity.reportedBy?.fullName ?? null,
      reportedByRole: entity.reportedBy?.role ?? null,
      description: entity.description ?? null,
      context: entity.context ?? null,
      processedById: entity.processedById ?? null,
      processedByName: entity.processedBy?.fullName ?? null,
      processedAt: entity.processedAt ? entity.processedAt.toISOString() : null,
      resolution: entity.resolution ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      routeId: trip?.routeId,
      routeName: trip?.route?.name,
      direction: trip?.direction,
      serviceDate: trip?.serviceDate ? formatDateToVnYmd(new Date(trip.serviceDate)) : undefined,
      schoolId: trip?.schoolId,
      schoolName: trip?.school?.name,
      scheduledStartTime: trip?.scheduledStartTime ?? null,
      scheduledEndTime: trip?.scheduledEndTime ?? null,
    };
  }
}
