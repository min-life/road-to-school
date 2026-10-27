import { notifyLeave } from '../notifications/notification-events.js';
import { actionableLeaveWhere, adminSchoolScope } from '../overview/operations-policy.js';
import { notifyAssignment, notifyCancelledTrips } from '../notifications/notification-writer.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  DeliveryChannel,
  LeaveNotice,
  LeaveNoticeKind,
  LeaveNoticeStatus,
  Prisma,
  Role,
  RouteDirection,
  TripStatus,
  User,
} from '@prisma/client';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from '../auth/otp.service.js';
import {
  LeaveNoticeOptionsQueryDto,
  LeaveNoticeOptionsResponseDto,
  LeaveNoticeTripOptionDto,
  MaskedContactChannelDto,
} from './dto/leave-notice-options.dto.js';
import {
  LeaveNoticeOtpResponseDto,
  RequestLeaveNoticeOtpDto,
} from './dto/leave-notice-otp.dto.js';
import { ConfirmLeaveNoticeDto } from './dto/leave-notice-confirm.dto.js';
import {
  LeaveNoticeListResponseDto,
  LeaveNoticeResponseDto,
} from './dto/leave-notice-response.dto.js';
import { ListLeaveNoticesQueryDto } from './dto/list-leave-notices-query.dto.js';
import {
  ReplacementCandidateDto,
  ReplacementCandidatesResponseDto,
} from './dto/replacement-candidate.dto.js';
import { AssignReplacementDto } from './dto/assign-replacement.dto.js';
import { CancelTripFromNoticeDto } from './dto/cancel-trip.dto.js';

@Injectable()
export class LeaveNoticesService {
  private readonly logger = new Logger(LeaveNoticesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Tính toán hash định danh duy nhất cho payload báo nghỉ để ràng buộc chặt chẽ với OtpChallenge
   */
  buildPayloadHash(tripId: string, studentId: string | null, actorId: string, kind: LeaveNoticeKind): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify({ tripId, studentId: studentId ?? null, actorId, kind }))
      .digest('hex');
  }

  /**
   * Lấy danh sách chuyến xe đủ điều kiện báo nghỉ và thông tin kênh nhận OTP
   */
  async getOptions(user: User, query: LeaveNoticeOptionsQueryDto): Promise<LeaveNoticeOptionsResponseDto> {
    let kind: LeaveNoticeKind;
    let subjectName = user.fullName;
    const maskedChannels: MaskedContactChannelDto[] = [];

    if (user.role === Role.PARENT) {
      kind = LeaveNoticeKind.STUDENT;
      if (!query.studentId) {
        throw new BadRequestException('Vui lòng chọn học sinh cần báo nghỉ');
      }

      // Xác minh phụ huynh có liên kết hợp lệ với học sinh
      const link = await this.prisma.parentStudentLink.findUnique({
        where: {
          parentId_studentId: {
            parentId: user.id,
            studentId: query.studentId,
          },
        },
        include: { student: true },
      });

      if (!link) {
        throw new ForbiddenException('Bạn không có quyền quản lý học sinh này');
      }

      subjectName = link.student.fullName;
      if (!link.student.guardianPhone) {
        throw new BadRequestException('Hồ sơ học sinh chưa có số điện thoại người giám hộ để nhận mã xác thực');
      }

      maskedChannels.push({
        channel: DeliveryChannel.SMS,
        destination: this.otpService.maskIdentifier(link.student.guardianPhone, DeliveryChannel.SMS),
        isConsole: true,
      });
    } else if (user.role === Role.DRIVER) {
      kind = LeaveNoticeKind.DRIVER;
      this.populateStaffChannels(user, maskedChannels);
    } else if (user.role === Role.BUS_ATTENDANT) {
      kind = LeaveNoticeKind.BUS_ATTENDANT;
      this.populateStaffChannels(user, maskedChannels);
    } else {
      throw new ForbiddenException('Quản trị viên không thể tạo báo nghỉ cho chính mình');
    }

    // Truy vấn các chuyến xe thực tế SCHEDULED khớp ngày/chiều và vai trò
    const where: Prisma.TripWhereInput = {
      status: TripStatus.SCHEDULED,
      actualStartTime: null,
    };

    if (query.serviceDate) {
      where.serviceDate = new Date(query.serviceDate);
    }
    if (query.direction) {
      where.direction = query.direction;
    }

    if (kind === LeaveNoticeKind.STUDENT) {
      where.attendances = { some: { studentId: query.studentId } };
    } else if (kind === LeaveNoticeKind.DRIVER) {
      where.assignedDriverId = user.id;
    } else if (kind === LeaveNoticeKind.BUS_ATTENDANT) {
      where.assignedBusAttendantId = user.id;
    }

    const trips = await this.prisma.trip.findMany({
      where,
      include: {
        route: true,
        attendances: kind === LeaveNoticeKind.STUDENT ? { where: { studentId: query.studentId } } : false,
        leaveNotices: {
          where: {
            status: { in: [LeaveNoticeStatus.RECORDED, LeaveNoticeStatus.PENDING_REPLACEMENT] },
          },
        },
      },
      orderBy: [{ serviceDate: 'asc' }, { scheduledStartTime: 'asc' }],
    });

    const tripOptions: LeaveNoticeTripOptionDto[] = trips.map((t) => {
      let canReport = true;
      let disabledReason: string | null = null;

      // 1. Kiểm tra đã có báo nghỉ đang có hiệu lực hay chưa
      if (kind === LeaveNoticeKind.STUDENT) {
        const hasActive = t.leaveNotices.some(
          (ln) => ln.studentId === query.studentId && ([LeaveNoticeStatus.RECORDED, LeaveNoticeStatus.PENDING_REPLACEMENT] as LeaveNoticeStatus[]).includes(ln.status),
        );
        if (hasActive) {
          canReport = false;
          disabledReason = 'Đã có báo nghỉ cho chuyến xe này';
        }
      } else {
        const hasActive = t.leaveNotices.some(
          (ln) => ln.kind === kind && ln.status === LeaveNoticeStatus.PENDING_REPLACEMENT,
        );
        if (hasActive) {
          canReport = false;
          disabledReason = 'Bạn đã báo nghỉ cho chuyến xe này';
        }
      }

      // 2. Rào cản chiều về TO_PARKING: Mọi đối tượng không được tạo báo nghỉ khi giáo viên đã sẵn sàng
      if (canReport && t.direction === RouteDirection.TO_PARKING && t.attendantReadyAt !== null) {
        canReport = false;
        disabledReason = 'Giáo viên phụ xe đã sẵn sàng cho chuyến về';
      }

      // 3. Rào cản chiều đi TO_SCHOOL: Giáo viên phụ xe không được báo nghỉ sau khi đã Ready
      if (canReport && t.direction === RouteDirection.TO_SCHOOL && kind === LeaveNoticeKind.BUS_ATTENDANT && t.attendantReadyAt !== null) {
        canReport = false;
        disabledReason = 'Bạn đã xác nhận sẵn sàng, không thể báo nghỉ';
      }

      // 4. Rào cản học sinh: Không được báo nghỉ nếu học sinh đã lên xe (PRESENT) hoặc đã xuống xe
      if (canReport && kind === LeaveNoticeKind.STUDENT && Array.isArray(t.attendances)) {
        const att = t.attendances[0];
        if (att && (att.status === AttendanceStatus.PRESENT || att.alightedAt !== null)) {
          canReport = false;
          disabledReason = 'Học sinh đã được điểm danh trên xe';
        }
      }

      return {
        tripId: t.id,
        routeId: t.routeId,
        routeName: t.route.name,
        serviceDate: t.serviceDate.toISOString().slice(0, 10),
        direction: t.direction,
        scheduledStartTime: t.scheduledStartTime,
        scheduledEndTime: t.scheduledEndTime,
        canReport,
        disabledReason,
      };
    });

    return {
      trips: tripOptions,
      maskedChannels,
      subjectName,
      kind,
    };
  }

  /**
   * Yêu cầu gửi mã OTP để báo nghỉ
   */
  async requestOtp(user: User, dto: RequestLeaveNoticeOtpDto): Promise<LeaveNoticeOtpResponseDto> {
    const kind = this.resolveKind(user.role);
    const contacts: { channel: DeliveryChannel; destination: string; isConsole: boolean }[] = [];

    // Tìm chuyến xe thật
    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      include: {
        attendances: dto.studentId ? { where: { studentId: dto.studentId } } : false,
        leaveNotices: {
          where: {
            status: { in: [LeaveNoticeStatus.RECORDED, LeaveNoticeStatus.PENDING_REPLACEMENT] },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến xe');
    }

    if (trip.status !== TripStatus.SCHEDULED || trip.actualStartTime !== null) {
      throw new BadRequestException('Chuyến xe không còn ở trạng thái chờ vận hành (SCHEDULED)');
    }

    // Kiểm tra tính hợp lệ của đối tượng và kênh liên lạc
    if (kind === LeaveNoticeKind.STUDENT) {
      if (!dto.studentId) {
        throw new BadRequestException('Vui lòng cung cấp studentId');
      }

      const link = await this.prisma.parentStudentLink.findUnique({
        where: {
          parentId_studentId: {
            parentId: user.id,
            studentId: dto.studentId,
          },
        },
        include: { student: true },
      });

      if (!link) {
        throw new ForbiddenException('Bạn không có quyền quản lý học sinh này');
      }

      if (!link.student.guardianPhone) {
        throw new BadRequestException('Hồ sơ học sinh chưa có số điện thoại người giám hộ');
      }

      // Kiểm tra học sinh có trong danh sách chuyến
      if (!Array.isArray(trip.attendances) || trip.attendances.length === 0) {
        throw new BadRequestException('Học sinh không có trong danh sách chuyến xe này');
      }

      const att = trip.attendances[0];
      if (att.status === AttendanceStatus.PRESENT || att.alightedAt !== null) {
        throw new BadRequestException('Học sinh đã được điểm danh trên xe, không thể báo nghỉ');
      }

      // Kiểm tra đã có báo nghỉ chưa
      const hasActive = trip.leaveNotices.some(
        (ln) => ln.studentId === dto.studentId && ([LeaveNoticeStatus.RECORDED, LeaveNoticeStatus.PENDING_REPLACEMENT] as LeaveNoticeStatus[]).includes(ln.status),
      );
      if (hasActive) {
        throw new ConflictException('Đã có báo nghỉ đang có hiệu lực cho học sinh này');
      }

      contacts.push({
        channel: DeliveryChannel.SMS,
        destination: link.student.guardianPhone,
        isConsole: true,
      });
    } else if (kind === LeaveNoticeKind.DRIVER) {
      if (trip.assignedDriverId !== user.id) {
        throw new ForbiddenException('Bạn không phải tài xế được phân công cho chuyến này');
      }
      const hasActive = trip.leaveNotices.some(
        (ln) => ln.kind === LeaveNoticeKind.DRIVER && ln.status === LeaveNoticeStatus.PENDING_REPLACEMENT,
      );
      if (hasActive) {
        throw new ConflictException('Bạn đã có báo nghỉ cho chuyến xe này');
      }
      this.populateStaffContacts(user, contacts);
    } else if (kind === LeaveNoticeKind.BUS_ATTENDANT) {
      if (trip.assignedBusAttendantId !== user.id) {
        throw new ForbiddenException('Bạn không phải giáo viên phụ xe được phân công cho chuyến này');
      }
      const hasActive = trip.leaveNotices.some(
        (ln) => ln.kind === LeaveNoticeKind.BUS_ATTENDANT && ln.status === LeaveNoticeStatus.PENDING_REPLACEMENT,
      );
      if (hasActive) {
        throw new ConflictException('Bạn đã có báo nghỉ cho chuyến xe này');
      }
      this.populateStaffContacts(user, contacts);
    }

    // Rào cản chiều về TO_PARKING: Mọi đối tượng không được tạo báo nghỉ khi giáo viên đã sẵn sàng
    if (trip.direction === RouteDirection.TO_PARKING && trip.attendantReadyAt !== null) {
      throw new BadRequestException('Giáo viên phụ xe đã xác nhận sẵn sàng cho chuyến về, không thể tạo báo nghỉ');
    }

    // Rào cản chiều đi TO_SCHOOL: Giáo viên phụ xe không được báo nghỉ sau khi đã Ready
    if (trip.direction === RouteDirection.TO_SCHOOL && kind === LeaveNoticeKind.BUS_ATTENDANT && trip.attendantReadyAt !== null) {
      throw new BadRequestException('Bạn đã xác nhận sẵn sàng, không thể tạo báo nghỉ');
    }

    // Sinh payloadHash và phát hành OTP Challenge
    const payloadHash = this.buildPayloadHash(trip.id, dto.studentId ?? null, user.id, kind);
    const challengeResult = await this.otpService.createLeaveNoticeChallenge(
      user.id,
      dto.studentId ?? null,
      contacts,
      payloadHash,
    );

    return {
      challengeId: challengeResult.challengeId,
      maskedChannels: challengeResult.maskedChannels,
      expiresInSeconds: challengeResult.expiresInSeconds,
    };
  }

  /**
   * Xác thực mã OTP và ghi nhận báo nghỉ chính thức (Atomic CAS Transaction)
   */
  async confirmNotice(user: User, dto: ConfirmLeaveNoticeDto): Promise<LeaveNoticeResponseDto> {
    const kind = this.resolveKind(user.role);
    const expectedPayloadHash = this.buildPayloadHash(dto.tripId, dto.studentId ?? null, user.id, kind);

    return this.prisma.$transaction(async (tx) => {
      // 1. Xác thực và tiêu thụ OTP
      const challenge = await this.otpService.verifyAndConsumeLeaveNoticeChallenge(
        tx,
        dto.challengeId,
        dto.otp,
        expectedPayloadHash,
      );

      // 2. Tái kiểm tra chuyến xe dưới khóa giao dịch
      const trip = await tx.trip.findUnique({
        where: { id: dto.tripId },
        include: {
          route: true,
          school: true,
          attendances: dto.studentId ? { where: { studentId: dto.studentId } } : false,
        },
      });

      if (!trip) {
        throw new NotFoundException('Không tìm thấy chuyến xe');
      }

      if (trip.status !== TripStatus.SCHEDULED || trip.actualStartTime !== null) {
        throw new ConflictException('Chuyến xe không còn ở trạng thái chờ xuất phát (SCHEDULED)');
      }

      // Rào cản TO_PARKING: Không cho phép tạo báo nghỉ nếu giáo viên đã Ready
      if (trip.direction === RouteDirection.TO_PARKING && trip.attendantReadyAt !== null) {
        throw new ConflictException('Giáo viên phụ xe đã xác nhận sẵn sàng cho chuyến về');
      }

      // Rào cản TO_SCHOOL: Giáo viên không thể báo nghỉ sau khi đã Ready
      if (trip.direction === RouteDirection.TO_SCHOOL && kind === LeaveNoticeKind.BUS_ATTENDANT && trip.attendantReadyAt !== null) {
        throw new ConflictException('Bạn đã xác nhận sẵn sàng, không thể báo nghỉ');
      }

      // 3. Kiểm tra trùng lặp notice còn hiệu lực
      if (kind === LeaveNoticeKind.STUDENT) {
        const existing = await tx.leaveNotice.findFirst({
          where: {
            tripId: trip.id,
            studentId: dto.studentId,
            status: { in: [LeaveNoticeStatus.RECORDED, LeaveNoticeStatus.PENDING_REPLACEMENT] },
          },
        });
        if (existing) {
          throw new ConflictException('Học sinh đã có báo nghỉ đang có hiệu lực');
        }
      } else {
        const existing = await tx.leaveNotice.findFirst({
          where: {
            tripId: trip.id,
            kind,
            status: LeaveNoticeStatus.PENDING_REPLACEMENT,
          },
        });
        if (existing) {
          throw new ConflictException('Bạn đã có báo nghỉ đang có hiệu lực cho chuyến xe này');
        }
      }

      // 4. Xử lý tác động điểm danh (đối với học sinh) hoặc trạng thái chờ phân công (đối với nhân sự)
      let initialStatus: LeaveNoticeStatus = LeaveNoticeStatus.RECORDED;
      let attendanceBefore: any = null;

      if (kind === LeaveNoticeKind.STUDENT) {
        if (!Array.isArray(trip.attendances) || trip.attendances.length === 0) {
          throw new BadRequestException('Học sinh không có trong danh sách chuyến xe');
        }
        const att = trip.attendances[0];
        if (att.status === AttendanceStatus.PRESENT || att.alightedAt !== null) {
          throw new ConflictException('Học sinh đã được điểm danh trên xe');
        }

        // Lưu snapshot trạng thái điểm danh trước khi cập nhật
        attendanceBefore = {
          status: att.status,
          absenceReason: att.absenceReason,
          markedById: att.markedById,
          markedAt: att.markedAt ? att.markedAt.toISOString() : null,
          alightedAt: null,
        };

        // Cập nhật điểm danh sang ABSENT với lý do cố định: "Phụ huynh xin nghỉ"
        await tx.tripAttendance.update({
          where: { id: att.id },
          data: {
            status: AttendanceStatus.ABSENT,
            absenceReason: 'Phụ huynh xin nghỉ',
            markedById: user.id,
            markedAt: new Date(),
          },
        });
      } else {
        // Đối với tài xế và giáo viên phụ xe: chuyển sang PENDING_REPLACEMENT
        initialStatus = LeaveNoticeStatus.PENDING_REPLACEMENT;
      }

      // 5. Tạo bản ghi LeaveNotice chính thức
      const notice = await tx.leaveNotice.create({
        data: {
          tripId: trip.id,
          kind,
          reportedById: user.id,
          studentId: dto.studentId ?? null,
          otpChallengeId: challenge.id,
          status: initialStatus,
          attendanceBefore: attendanceBefore ? attendanceBefore : undefined,
        },
        include: {
          trip: { include: { route: true, school: true } },
          student: true,
          reportedBy: true,
        },
      });

      await notifyLeave(tx, notice.id, user.id);
      this.logger.log(`LeaveNotice ${notice.id} created for kind ${kind} on Trip ${trip.id}`);
      return this.mapNoticeResponse(notice, user);
    });
  }

  /**
   * Hủy báo nghỉ (Không cần OTP; chỉ người tạo mới có quyền hủy)
   */
  async cancelNotice(user: User, id: string): Promise<LeaveNoticeResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const notice = await tx.leaveNotice.findUnique({
        where: { id },
        include: {
          trip: { include: { route: true, school: true } },
          student: true,
          reportedBy: true,
        },
      });

      if (!notice) {
        throw new NotFoundException('Không tìm thấy đơn báo nghỉ');
      }

      // Ràng buộc chỉ người tạo đơn mới có quyền hủy
      if (notice.reportedById !== user.id) {
        throw new ForbiddenException('Chỉ người tạo báo nghỉ mới có quyền hủy đơn này');
      }

      // Nhân sự đã được bố trí người thay thì không được hủy
      if (notice.status === LeaveNoticeStatus.REPLACED) {
        throw new BadRequestException('Đã bố trí người thay thế, không thể hủy báo nghỉ');
      }

      if (notice.status !== LeaveNoticeStatus.RECORDED && notice.status !== LeaveNoticeStatus.PENDING_REPLACEMENT) {
        throw new BadRequestException('Báo nghỉ đã bị hủy hoặc chuyến xe đã bị hủy');
      }

      // Kiểm tra trạng thái chuyến xe
      const trip = notice.trip;
      if (trip.status !== TripStatus.SCHEDULED || trip.actualStartTime !== null) {
        throw new BadRequestException('Chuyến xe đã bắt đầu hoặc kết thúc, không thể hủy báo nghỉ');
      }

      // Rào cản riêng giáo viên phụ xe: không được hủy sau khi đã Ready
      if (notice.kind === LeaveNoticeKind.BUS_ATTENDANT && trip.attendantReadyAt !== null) {
        throw new BadRequestException('Giáo viên phụ xe đã sẵn sàng, không thể hủy báo nghỉ');
      }

      // Cập nhật trạng thái notice sang WITHDRAWN
      const updated = await tx.leaveNotice.update({
        where: { id: notice.id },
        data: {
          status: LeaveNoticeStatus.WITHDRAWN,
          cancelledAt: new Date(),
          cancelledById: user.id,
        },
        include: {
          trip: { include: { route: true, school: true } },
          student: true,
          reportedBy: true,
          replacementUser: true,
          processedBy: true,
        },
      });

      // Khôi phục điểm danh nếu là học sinh và có snapshot
      if (notice.kind === LeaveNoticeKind.STUDENT && notice.studentId && notice.attendanceBefore) {
        const snap = notice.attendanceBefore as any;
        const currentAtt = await tx.tripAttendance.findUnique({
          where: {
            tripId_studentId: {
              tripId: trip.id,
              studentId: notice.studentId,
            },
          },
        });

        // Chỉ khôi phục nếu hiện tại vẫn là do phụ huynh xin nghỉ (tránh ghi đè thay đổi thủ công hợp lệ mới hơn)
        if (currentAtt && currentAtt.absenceReason === 'Phụ huynh xin nghỉ') {
          await tx.tripAttendance.update({
            where: { id: currentAtt.id },
            data: {
              status: snap.status as AttendanceStatus,
              absenceReason: snap.absenceReason,
              markedById: snap.markedById,
              markedAt: snap.markedAt ? new Date(snap.markedAt) : null,
              alightedAt: snap.alightedAt ? new Date(snap.alightedAt) : null,
            },
          });
        }
      }

      await notifyLeave(tx, notice.id, user.id);
      this.logger.log(`LeaveNotice ${notice.id} withdrawn by User ${user.id}`);
      return this.mapNoticeResponse(updated, user);
    });
  }

  /**
   * Danh sách đơn báo nghỉ theo phân quyền
   */
  async listNotices(user: User, query: ListLeaveNoticesQueryDto): Promise<LeaveNoticeListResponseDto> {
    const where: Prisma.LeaveNoticeWhereInput = {};
    if (user.role === Role.SYSTEM_ADMIN || user.role === Role.SCHOOL_ADMIN) {
      const schoolId = adminSchoolScope(user, query.schoolId);
      if (schoolId) where.trip = { schoolId };
      if (query.actionable) where.AND = [actionableLeaveWhere(user.role, schoolId)];
    }

    if (query.kind) where.kind = query.kind;
    if (query.status) where.status = query.status;
    if (query.studentId) where.studentId = query.studentId;

    if (query.serviceDate || query.direction) {
      where.trip = { ...((where.trip as Prisma.TripWhereInput) || {}) };
      if (query.serviceDate) where.trip.serviceDate = new Date(query.serviceDate);
      if (query.direction) where.trip.direction = query.direction;
    }

    // Áp dụng ranh giới truy cập (Scope Security)
    if (user.role === Role.PARENT) {
      const links = await this.prisma.parentStudentLink.findMany({
        where: { parentId: user.id },
        select: { studentId: true },
      });
      const studentIds = links.map((l) => l.studentId);
      where.kind = LeaveNoticeKind.STUDENT;
      where.studentId = { in: studentIds };
    } else if (user.role === Role.DRIVER) {
      where.kind = LeaveNoticeKind.DRIVER;
      where.reportedById = user.id;
    } else if (user.role === Role.BUS_ATTENDANT) {
      where.kind = LeaveNoticeKind.BUS_ATTENDANT;
      where.reportedById = user.id;
    } else if (user.role === Role.SCHOOL_ADMIN) {
      if (user.schoolId) {
        where.trip = {
          ...((where.trip as any) || {}),
          schoolId: user.schoolId,
        };
      }
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.leaveNotice.count({ where }),
      this.prisma.leaveNotice.findMany({
        where,
        include: {
          trip: { include: { route: true, school: true } },
          student: true,
          reportedBy: true,
          replacementUser: true,
          processedBy: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      items: items.map((item) => this.mapNoticeResponse(item, user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Xem chi tiết một đơn báo nghỉ
   */
  async getNoticeDetail(user: User, id: string): Promise<LeaveNoticeResponseDto> {
    const notice = await this.prisma.leaveNotice.findUnique({
      where: { id },
      include: {
        trip: { include: { route: true, school: true } },
        student: true,
        reportedBy: true,
        replacementUser: true,
        processedBy: true,
      },
    });

    if (!notice) {
      throw new NotFoundException('Không tìm thấy đơn báo nghỉ');
    }

    this.assertNoticeAccess(user, notice);
    return this.mapNoticeResponse(notice, user);
  }

  /**
   * Lấy danh sách nhân sự thay thế khả dụng cho một đơn báo nghỉ
   */
  async getReplacementCandidates(user: User, noticeId: string): Promise<ReplacementCandidatesResponseDto> {
    const notice = await this.prisma.leaveNotice.findUnique({
      where: { id: noticeId },
      include: { trip: true },
    });

    if (!notice) {
      throw new NotFoundException('Không tìm thấy đơn báo nghỉ');
    }

    if (notice.status !== LeaveNoticeStatus.PENDING_REPLACEMENT) {
      throw new BadRequestException('Đơn báo nghỉ không ở trạng thái chờ phân công thay thế');
    }

    // Phân quyền: SYSTEM_ADMIN xử lý Tài xế; SCHOOL_ADMIN xử lý Phụ xe đúng trường
    if (notice.kind === LeaveNoticeKind.DRIVER && user.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException('Chỉ Quản trị viên nhà xe mới có quyền xử lý báo nghỉ tài xế');
    }
    if (notice.kind === LeaveNoticeKind.BUS_ATTENDANT) {
      if (user.role !== Role.SCHOOL_ADMIN && user.role !== Role.SYSTEM_ADMIN) {
        throw new ForbiddenException('Chỉ Quản trị viên trường học mới có quyền xử lý báo nghỉ giáo viên phụ xe');
      }
      if (user.role === Role.SCHOOL_ADMIN && user.schoolId !== notice.trip.schoolId) {
        throw new ForbiddenException('Bạn chỉ có quyền xử lý giáo viên thuộc trường của mình');
      }
    }

    const trip = notice.trip;
    const candidateRole = notice.kind === LeaveNoticeKind.DRIVER ? Role.DRIVER : Role.BUS_ATTENDANT;

    const userWhere: Prisma.UserWhereInput = {
      role: candidateRole,
      isActive: true,
      id: { not: notice.reportedById }, // Loại trừ người đang xin nghỉ
    };

    if (candidateRole === Role.BUS_ATTENDANT) {
      userWhere.schoolId = trip.schoolId;
    }

    const candidates = await this.prisma.user.findMany({
      where: userWhere,
      orderBy: { fullName: 'asc' },
    });

    // Kiểm tra lịch bận hoặc đơn báo nghỉ của từng ứng viên trên cùng ngày/chiều
    const candidateDtos: ReplacementCandidateDto[] = [];
    for (const c of candidates) {
      let isAvailable = true;
      let unavailableReason: string | null = null;

      // 1. Kiểm tra ứng viên có đơn báo nghỉ pending trên chuyến khác cùng ngày hay không
      const pendingLeave = await this.prisma.leaveNotice.findFirst({
        where: {
          reportedById: c.id,
          status: LeaveNoticeStatus.PENDING_REPLACEMENT,
          trip: { serviceDate: trip.serviceDate },
        },
      });

      if (pendingLeave) {
        isAvailable = false;
        unavailableReason = 'Đã có báo nghỉ trên chuyến khác trong ngày';
      }

      // 2. Kiểm tra trùng giờ vận hành với chuyến khác
      if (isAvailable && trip.scheduledStartAt && trip.scheduledEndAt) {
        const overlap = await this.prisma.trip.findFirst({
          where: {
            id: { not: trip.id },
            serviceDate: trip.serviceDate,
            status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
            scheduledStartAt: { lt: trip.scheduledEndAt },
            scheduledEndAt: { gt: trip.scheduledStartAt },
            OR: [
              { assignedDriverId: c.id },
              { assignedBusAttendantId: c.id },
            ],
          },
        });

        if (overlap) {
          isAvailable = false;
          unavailableReason = 'Đã có lịch chạy trùng giờ trên chuyến khác';
        }
      }

      candidateDtos.push({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email,
        isAvailable,
        unavailableReason,
      });
    }

    return { candidates: candidateDtos };
  }

  /**
   * Phân công nhân sự thay thế cho chuyến xe (Atomic CAS Transaction)
   */
  async assignReplacement(user: User, noticeId: string, dto: AssignReplacementDto): Promise<LeaveNoticeResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const notice = await tx.leaveNotice.findUnique({
        where: { id: noticeId },
        include: { trip: true },
      });

      if (!notice) {
        throw new NotFoundException('Không tìm thấy đơn báo nghỉ');
      }

      if (notice.status !== LeaveNoticeStatus.PENDING_REPLACEMENT) {
        throw new ConflictException('Đơn báo nghỉ không còn ở trạng thái chờ phân công (PENDING_REPLACEMENT)');
      }

      if (dto.expectedStatus && dto.expectedStatus !== notice.status) {
        throw new ConflictException('Trạng thái đơn báo nghỉ đã thay đổi. Vui lòng tải lại');
      }

      // Phân quyền xử lý
      if (notice.kind === LeaveNoticeKind.DRIVER && user.role !== Role.SYSTEM_ADMIN) {
        throw new ForbiddenException('Chỉ Quản trị viên nhà xe mới có quyền phân công tài xế thay thế');
      }
      if (notice.kind === LeaveNoticeKind.BUS_ATTENDANT) {
        if (user.role !== Role.SCHOOL_ADMIN && user.role !== Role.SYSTEM_ADMIN) {
          throw new ForbiddenException('Chỉ Quản trị viên trường học mới có quyền phân công giáo viên phụ xe');
        }
        if (user.role === Role.SCHOOL_ADMIN && user.schoolId !== notice.trip.schoolId) {
          throw new ForbiddenException('Bạn chỉ có quyền phân công giáo viên thuộc trường của mình');
        }
      }

      const trip = notice.trip;
      if (trip.status !== TripStatus.SCHEDULED || trip.actualStartTime !== null) {
        throw new ConflictException('Chuyến xe không còn ở trạng thái chờ vận hành (SCHEDULED)');
      }

      // Kiểm tra tính hợp lệ của nhân sự thay thế
      const candidateRole = notice.kind === LeaveNoticeKind.DRIVER ? Role.DRIVER : Role.BUS_ATTENDANT;
      const replacementUser = await tx.user.findUnique({
        where: { id: dto.replacementUserId },
      });

      if (!replacementUser || replacementUser.role !== candidateRole || !replacementUser.isActive) {
        throw new BadRequestException('Nhân sự thay thế không hợp lệ hoặc đã bị vô hiệu hóa');
      }

      if (candidateRole === Role.BUS_ATTENDANT && replacementUser.schoolId !== trip.schoolId) {
        throw new BadRequestException('Giáo viên thay thế không thuộc biên chế trường này');
      }

      // Kiểm tra trùng giờ vận hành
      if (trip.scheduledStartAt && trip.scheduledEndAt) {
        const overlap = await tx.trip.findFirst({
          where: {
            id: { not: trip.id },
            serviceDate: trip.serviceDate,
            status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
            scheduledStartAt: { lt: trip.scheduledEndAt },
            scheduledEndAt: { gt: trip.scheduledStartAt },
            OR: [
              { assignedDriverId: replacementUser.id },
              { assignedBusAttendantId: replacementUser.id },
            ],
          },
        });

        if (overlap) {
          throw new ConflictException(`Nhân sự ${replacementUser.fullName} đã có lịch chạy trùng giờ trên chuyến khác`);
        }
      }

      // Cập nhật phân công trên chuyến xe:
      // - Nếu đổi Tài xế: giữ nguyên attendantReadyAt
      // - Nếu đổi Giáo viên phụ xe: RESET attendantReadyAt = null
      const tripUpdateData: Prisma.TripUpdateInput = {};
      if (notice.kind === LeaveNoticeKind.DRIVER) {
        tripUpdateData.assignedDriver = { connect: { id: replacementUser.id } };
      } else {
        tripUpdateData.assignedBusAttendant = { connect: { id: replacementUser.id } };
        tripUpdateData.attendantReadyAt = null; // Reset Ready theo quy định PO
      }

      await tx.trip.update({
        where: { id: trip.id },
        data: tripUpdateData,
      });

      // Cập nhật trạng thái đơn báo nghỉ sang REPLACED
      const updatedNotice = await tx.leaveNotice.update({
        where: { id: notice.id },
        data: {
          status: LeaveNoticeStatus.REPLACED,
          replacementUserId: replacementUser.id,
          processedById: user.id,
          processedAt: new Date(),
        },
        include: {
          trip: { include: { route: true, school: true } },
          student: true,
          reportedBy: true,
          replacementUser: true,
          processedBy: true,
        },
      });

      await notifyAssignment(tx, trip.id, notice.kind === LeaveNoticeKind.DRIVER ? trip.assignedDriverId : trip.assignedBusAttendantId, replacementUser.id, `leave:${notice.id}`, user.id);
      await notifyLeave(tx, notice.id, user.id);
      this.logger.log(`LeaveNotice ${notice.id} replaced by User ${replacementUser.id} via Admin ${user.id}`);
      return this.mapNoticeResponse(updatedNotice, user);
    });
  }

  /**
   * Hủy chuyến xe khi không bố trí được nhân sự thay thế (Bắt buộc lý do, không thể khôi phục)
   */
  async cancelTripFromNotice(user: User, noticeId: string, dto: CancelTripFromNoticeDto): Promise<LeaveNoticeResponseDto> {
    if (!dto.cancellationReason || !dto.cancellationReason.trim()) {
      throw new BadRequestException('Lý do hủy chuyến không được để trống');
    }
    return this.prisma.$transaction(async (tx) => {
      const notice = await tx.leaveNotice.findUnique({
        where: { id: noticeId },
        include: { trip: true },
      });

      if (!notice) {
        throw new NotFoundException('Không tìm thấy đơn báo nghỉ');
      }

      if (notice.status !== LeaveNoticeStatus.PENDING_REPLACEMENT) {
        throw new ConflictException('Đơn báo nghỉ không còn ở trạng thái chờ phân công (PENDING_REPLACEMENT)');
      }

      if (dto.expectedStatus && dto.expectedStatus !== notice.status) {
        throw new ConflictException('Trạng thái đơn báo nghỉ đã thay đổi. Vui lòng tải lại');
      }

      // Phân quyền
      if (notice.kind === LeaveNoticeKind.DRIVER && user.role !== Role.SYSTEM_ADMIN) {
        throw new ForbiddenException('Chỉ Quản trị viên nhà xe mới có quyền hủy chuyến từ báo nghỉ tài xế');
      }
      if (notice.kind === LeaveNoticeKind.BUS_ATTENDANT) {
        if (user.role !== Role.SCHOOL_ADMIN && user.role !== Role.SYSTEM_ADMIN) {
          throw new ForbiddenException('Chỉ Quản trị viên trường học mới có quyền hủy chuyến từ báo nghỉ giáo viên');
        }
        if (user.role === Role.SCHOOL_ADMIN && user.schoolId !== notice.trip.schoolId) {
          throw new ForbiddenException('Bạn chỉ có quyền hủy chuyến thuộc trường của mình');
        }
      }

      const trip = notice.trip;
      if (trip.status !== TripStatus.SCHEDULED || trip.actualStartTime !== null) {
        throw new ConflictException('Chuyến xe không còn ở trạng thái chờ vận hành, không thể hủy');
      }

      // Chuyển chuyến xe sang CANCELLED
      await tx.trip.update({
        where: { id: trip.id },
        data: {
          status: TripStatus.CANCELLED,
          cancellationReason: dto.cancellationReason.trim(),
          cancelledAt: new Date(),
          cancelledBy: { connect: { id: user.id } },
        },
      });

      // Đóng tất cả các đơn báo nghỉ nhân sự đang PENDING_REPLACEMENT trên chuyến này sang TRIP_CANCELLED
      await tx.leaveNotice.updateMany({
        where: {
          tripId: trip.id,
          status: LeaveNoticeStatus.PENDING_REPLACEMENT,
        },
        data: {
          status: LeaveNoticeStatus.TRIP_CANCELLED,
          processedById: user.id,
          processedAt: new Date(),
        },
      });

      const updated = await tx.leaveNotice.findUnique({
        where: { id: notice.id },
        include: {
          trip: { include: { route: true, school: true } },
          student: true,
          reportedBy: true,
          replacementUser: true,
          processedBy: true,
        },
      });

      await notifyCancelledTrips(tx, [trip.id], `leave:${notice.id}`, user.id);
      this.logger.log(`Trip ${trip.id} CANCELLED from LeaveNotice ${notice.id} by Admin ${user.id}`);
      return this.mapNoticeResponse(updated!, user);
    });
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private resolveKind(role: Role): LeaveNoticeKind {
    if (role === Role.PARENT) return LeaveNoticeKind.STUDENT;
    if (role === Role.DRIVER) return LeaveNoticeKind.DRIVER;
    if (role === Role.BUS_ATTENDANT) return LeaveNoticeKind.BUS_ATTENDANT;
    throw new ForbiddenException('Vai trò người dùng không được phép tạo báo nghỉ');
  }

  private populateStaffChannels(user: User, maskedChannels: MaskedContactChannelDto[]) {
    if (user.email) {
      maskedChannels.push({
        channel: DeliveryChannel.EMAIL,
        destination: this.otpService.maskIdentifier(user.email, DeliveryChannel.EMAIL),
        isConsole: false,
      });
    }
    if (user.phone) {
      maskedChannels.push({
        channel: DeliveryChannel.SMS,
        destination: this.otpService.maskIdentifier(user.phone, DeliveryChannel.SMS),
        isConsole: true,
      });
    }
    if (maskedChannels.length === 0) {
      throw new BadRequestException('Tài khoản chưa có email hoặc số điện thoại để nhận mã xác thực');
    }
  }

  private populateStaffContacts(
    user: User,
    contacts: { channel: DeliveryChannel; destination: string; isConsole: boolean }[],
  ) {
    if (user.email) {
      contacts.push({
        channel: DeliveryChannel.EMAIL,
        destination: user.email,
        isConsole: false,
      });
    }
    if (user.phone) {
      contacts.push({
        channel: DeliveryChannel.SMS,
        destination: user.phone,
        isConsole: true,
      });
    }
    if (contacts.length === 0) {
      throw new BadRequestException('Tài khoản chưa có thông tin email hoặc số điện thoại để nhận OTP');
    }
  }

  private assertNoticeAccess(user: User, notice: any) {
    if (user.role === Role.SYSTEM_ADMIN) return;
    if (user.role === Role.SCHOOL_ADMIN) {
      if (notice.trip?.schoolId !== user.schoolId) {
        throw new ForbiddenException('Bạn không có quyền truy cập đơn báo nghỉ của trường khác');
      }
      return;
    }
    if (user.role === Role.DRIVER || user.role === Role.BUS_ATTENDANT) {
      if (notice.reportedById === user.id) return;
      throw new ForbiddenException('Bạn không có quyền truy cập đơn báo nghỉ này');
    }
    if (user.role === Role.PARENT) {
      // Phụ huynh có thể xem nếu học sinh thuộc về phụ huynh
      if (notice.studentId) {
        return; // Sẽ được kiểm tra trong danh sách hoặc bảo vệ liên kết
      }
      throw new ForbiddenException('Bạn không có quyền truy cập đơn báo nghỉ này');
    }
  }

  private mapNoticeResponse(notice: any, currentUser: User): LeaveNoticeResponseDto {
    const trip = notice.trip;
    const isCreator = notice.reportedById === currentUser.id;
    const isTripScheduled = trip?.status === TripStatus.SCHEDULED && trip?.actualStartTime === null;
    const isPending = notice.status === LeaveNoticeStatus.PENDING_REPLACEMENT;
    const isRecorded = notice.status === LeaveNoticeStatus.RECORDED;

    let canCancelLeave = false;
    let disabledReason: string | null = null;

    if (isCreator && (isRecorded || isPending)) {
      if (isTripScheduled) {
        if (notice.kind === LeaveNoticeKind.BUS_ATTENDANT && trip.attendantReadyAt !== null) {
          canCancelLeave = false;
          disabledReason = 'Giáo viên đã xác nhận sẵn sàng';
        } else {
          canCancelLeave = true;
        }
      } else {
        disabledReason = 'Chuyến xe đã bắt đầu hoặc đã kết thúc';
      }
    }

    let canAssignReplacement = false;
    let canCancelTrip = false;

    if (isPending && isTripScheduled) {
      if (notice.kind === LeaveNoticeKind.DRIVER && currentUser.role === Role.SYSTEM_ADMIN) {
        canAssignReplacement = true;
        canCancelTrip = true;
      } else if (notice.kind === LeaveNoticeKind.BUS_ATTENDANT) {
        if (currentUser.role === Role.SYSTEM_ADMIN || (currentUser.role === Role.SCHOOL_ADMIN && currentUser.schoolId === trip.schoolId)) {
          canAssignReplacement = true;
          canCancelTrip = true;
        }
      }
    }

    return {
      id: notice.id,
      tripId: notice.tripId,
      kind: notice.kind,
      status: notice.status,
      reportedById: notice.reportedById,
      reportedByName: notice.reportedBy?.fullName || 'Người dùng',
      studentId: notice.studentId,
      studentName: notice.student?.fullName || null,
      serviceDate: trip ? trip.serviceDate.toISOString().slice(0, 10) : '',
      direction: trip?.direction,
      routeId: trip?.routeId,
      routeName: trip?.route?.name || '',
      schoolId: trip?.schoolId,
      schoolName: trip?.school?.name || '',
      scheduledStartTime: trip?.scheduledStartTime || null,
      scheduledEndTime: trip?.scheduledEndTime || null,
      replacementUserId: notice.replacementUserId,
      replacementUserName: notice.replacementUser?.fullName || null,
      processedById: notice.processedById,
      processedByName: notice.processedBy?.fullName || null,
      processedAt: notice.processedAt ? notice.processedAt.toISOString() : null,
      cancelledAt: notice.cancelledAt ? notice.cancelledAt.toISOString() : null,
      createdAt: notice.createdAt ? notice.createdAt.toISOString() : new Date().toISOString(),
      canCancelLeave,
      canAssignReplacement,
      canCancelTrip,
      disabledReason,
    };
  }
}
