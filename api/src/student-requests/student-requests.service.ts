import { notifyCancelledTrips } from '../notifications/notification-writer.js';
import { notifyRequest } from '../notifications/notification-events.js';
import { actionableRequestWhere } from '../overview/operations-policy.js';
import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Role,
  RequestType,
  RequestStatus,
  StudentStatus,
  Student,
  StudentUpdateRequest,
  RoutePlanStatus,
  TripStatus,
  RouteDirection,
} from '@prisma/client';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from '../auth/otp.service.js';
import { VietMapVRPService } from '../routes/vietmap-vrp.service.js';
import {
  CreateRequestOtpDto,
  VerifyRequestOtpDto,
  ReviewRequestDto,
  UpdateStudentAddressDto,
  ListRequestsQueryDto,
  RequestOtpResponseDto,
  StudentUpdateRequestDto,
  StudentUpdateRequestDetailDto,
  StudentUpdateRequestListResponseDto,
  StudentAddressRoutingPreviewDto,
  StudentAddressRoutingPreviewResponseDto,
  ApproveAddressRequestDto,
  RouteFeasibilityItemDto,
} from './dto/index.js';

/**
 * Hàm băm Canonical SHA-256 dữ liệu đề xuất để ràng buộc với OTP Challenge (Section 1.8 & 4.5)
 */
export function hashProposedPayload(type: RequestType, payload: Record<string, any>): string {
  const canonicalObj: Record<string, any> = {};
  if (type === RequestType.INFORMATION_UPDATE) {
    if (payload.fullName !== undefined) canonicalObj.fullName = String(payload.fullName).trim();
    if (payload.guardianPhone !== undefined) canonicalObj.guardianPhone = String(payload.guardianPhone).trim();
  } else if (type === RequestType.ADDRESS_UPDATE) {
    canonicalObj.addressText = String(payload.addressText || '').trim();
    canonicalObj.latitude = Number(payload.latitude);
    canonicalObj.longitude = Number(payload.longitude);
  }

  // Sắp xếp các khóa theo bảng chữ cái để tạo chuỗi JSON chuẩn tắc duy nhất
  const sortedKeys = Object.keys(canonicalObj).sort();
  const sortedObj: Record<string, any> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = canonicalObj[k];
  }
  return crypto.createHash('sha256').update(JSON.stringify(sortedObj)).digest('hex');
}

@Injectable()
export class StudentRequestsService {
  private readonly logger = new Logger(StudentRequestsService.name);
  private readonly addressPreviewSessions = new Map<
    string,
    {
      previewToken: string;
      requestId: string;
      studentId: string;
      newLatitude: number;
      newLongitude: number;
      newAddressText: string;
      routes: Array<{
        routeId: string;
        newGeometry: string;
        newDistanceMeters: number;
        newDurationSeconds: number;
        newPlannedArrivalTime?: string;
      }>;
      createdAt: number;
      expectedFingerprint: string;
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly vietmapVRPService: VietMapVRPService,
  ) {}

  private parseTimeToSeconds(time: string): number {
    const [h, m] = (time || '07:00').split(':').map(Number);
    return (h || 0) * 3600 + (m || 0) * 60;
  }

  private secondsToTimeString(seconds: number): string {
    const totalMins = Math.floor(seconds / 60);
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Kiểm định tính hợp lệ và ý nghĩa của dữ liệu đề xuất thay đổi so với dữ liệu hiện tại
   */
  private validateProposedData(
    type: RequestType,
    payload: Record<string, any>,
    student: Student,
  ): void {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Dữ liệu đề xuất không hợp lệ');
    }

    if (type === RequestType.INFORMATION_UPDATE) {
      const hasFullName = payload.fullName !== undefined && String(payload.fullName).trim().length > 0;
      const hasGuardianPhone = payload.guardianPhone !== undefined && String(payload.guardianPhone).trim().length > 0;

      if (!hasFullName && !hasGuardianPhone) {
        throw new BadRequestException('Dữ liệu đề xuất phải chứa họ tên hoặc số điện thoại người giám hộ');
      }

      if (hasFullName) {
        const name = String(payload.fullName).trim();
        if (name.length < 2 || name.length > 100) {
          throw new BadRequestException('Họ tên học sinh phải có từ 2 đến 100 ký tự');
        }
      }

      if (hasGuardianPhone) {
        const phone = String(payload.guardianPhone).trim();
        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
          throw new BadRequestException('Số điện thoại người giám hộ phải gồm 10 chữ số và bắt đầu bằng số 0');
        }
      }

      // Kiểm tra có sự thay đổi thực sự so với hiện tại
      const nameChanged = hasFullName && String(payload.fullName).trim() !== student.fullName;
      const phoneChanged = hasGuardianPhone && String(payload.guardianPhone).trim() !== student.guardianPhone;

      if (!nameChanged && !phoneChanged) {
        throw new BadRequestException('Dữ liệu đề xuất không có gì thay đổi so với thông tin hiện tại của học sinh');
      }
    } else if (type === RequestType.ADDRESS_UPDATE) {
      if (!payload.addressText || String(payload.addressText).trim().length < 3) {
        throw new BadRequestException('Địa chỉ chi tiết phải có tối thiểu 3 ký tự');
      }

      const lat = Number(payload.latitude);
      const lng = Number(payload.longitude);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new BadRequestException('Vĩ độ (latitude) phải nằm trong khoảng từ -90 đến 90');
      }

      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new BadRequestException('Kinh độ (longitude) phải nằm trong khoảng từ -180 đến 180');
      }

      const addrChanged = String(payload.addressText).trim() !== student.addressText;
      const latChanged = Math.abs(lat - Number(student.latitude)) > 0.000001;
      const lngChanged = Math.abs(lng - Number(student.longitude)) > 0.000001;

      if (!addrChanged && !latChanged && !lngChanged) {
        throw new BadRequestException('Địa chỉ và tọa độ đề xuất không có gì thay đổi so với hiện tại');
      }
    }
  }

  /**
   * Ánh xạ bản ghi Prisma StudentUpdateRequest sang DTO
   */
  private mapToDto(
    req: StudentUpdateRequest & {
      student?: Student;
      parent?: { id: string; fullName: string };
      school?: { id: string; name: string };
      reviewedBy?: { id: string; fullName: string } | null;
    },
  ): StudentUpdateRequestDto {
    const resolution = (req as any).resolution as Record<string, any> | null;
    return {
      id: req.id,
      studentId: req.studentId,
      studentName: req.student?.fullName || '',
      studentCode: req.student?.code || '',
      parentId: req.parentId,
      parentName: req.parent?.fullName || '',
      schoolId: req.schoolId,
      schoolName: req.school?.name || '',
      type: req.type,
      status: req.status,
      beforeData: req.beforeData as Record<string, any>,
      proposedData: req.proposedData as Record<string, any>,
      rejectionReason: req.rejectionReason,
      reviewedBy: req.reviewedBy?.fullName || null,
      reviewedAt: req.reviewedAt ? req.reviewedAt.toISOString() : null,
      resolution,
      resolutionOutcome: resolution?.outcome || null,
      canCancel: req.status === RequestStatus.PENDING,
      canCheckRouting: req.status === RequestStatus.PENDING && req.type === RequestType.ADDRESS_UPDATE,
      canApprove: req.status === RequestStatus.PENDING,
      canReject: req.status === RequestStatus.PENDING,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
    };
  }

  // =========================================================================
  // 1. PARENT APIS (Section 9)
  // =========================================================================

  /**
   * API A: Phụ huynh yêu cầu mã OTP để cập nhật thông tin/địa chỉ học sinh
   */
  async requestOtp(
    parentId: string,
    studentId: string,
    dto: CreateRequestOtpDto,
  ): Promise<RequestOtpResponseDto> {
    const link = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: { parentId, studentId },
      },
      include: {
        student: true,
      },
    });

    if (!link) {
      throw new ForbiddenException('Bạn không có quyền gửi yêu cầu cập nhật cho học sinh này');
    }

    const student = link.student;
    if (student.status === StudentStatus.DISABLED) {
      throw new BadRequestException('Học sinh đang bị vô hiệu hóa (DISABLED). Không thể tạo yêu cầu cập nhật.');
    }

    // 1. Kiểm tra tính hợp lệ và thay đổi thực sự của dữ liệu đề xuất
    this.validateProposedData(dto.type, dto.proposedData, student);

    // 2. Kiểm tra quy tắc duy nhất một yêu cầu PENDING cho mỗi loại yêu cầu (Section 1.4)
    const existingPending = await this.prisma.studentUpdateRequest.findFirst({
      where: {
        studentId,
        type: dto.type,
        status: RequestStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'Học sinh đang có một yêu cầu cập nhật cùng loại đang chờ xét duyệt. Vui lòng chờ xử lý xong.',
      );
    }

    // 3. Tính toán payloadHash canonical
    const payloadHash = hashProposedPayload(dto.type, dto.proposedData);

    // 4. Phát mã OTP gửi đến số điện thoại người giám hộ HIỆN TẠI của học sinh
    const result = await this.otpService.createStudentUpdateRequestChallenge(
      parentId,
      studentId,
      student.guardianPhone,
      payloadHash,
    );

    return {
      challengeId: result.challengeId,
      maskedPhone: result.maskedPhone,
      expiresInSeconds: result.expiresInSeconds,
      message: 'Mã xác thực OTP đã được gửi đến số điện thoại người giám hộ hiện tại của học sinh',
    };
  }

  /**
   * API B: Phụ huynh xác thực mã OTP và chính thức tạo yêu cầu cập nhật PENDING
   */
  async verifyOtpAndCreateRequest(
    parentId: string,
    studentId: string,
    dto: VerifyRequestOtpDto,
  ): Promise<StudentUpdateRequestDto> {
    const link = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: { parentId, studentId },
      },
      include: {
        student: true,
      },
    });

    if (!link) {
      throw new ForbiddenException('Bạn không có quyền gửi yêu cầu cập nhật cho học sinh này');
    }

    const student = link.student;
    if (student.status === StudentStatus.DISABLED) {
      throw new BadRequestException('Học sinh đang bị vô hiệu hóa (DISABLED). Không thể tạo yêu cầu cập nhật.');
    }

    // 1. Kiểm tra lại dữ liệu đề xuất
    this.validateProposedData(dto.type, dto.proposedData, student);

    // 2. Tính toán payloadHash mong đợi và xác thực OTP
    const expectedPayloadHash = hashProposedPayload(dto.type, dto.proposedData);

    await this.otpService.verifyAndConsumeStudentUpdateRequestChallenge(
      dto.challengeId,
      parentId,
      studentId,
      dto.otp,
      expectedPayloadHash,
    );

    // 3. Tạo snapshot beforeData tương ứng với loại yêu cầu
    let beforeData: Record<string, any> = {};
    if (dto.type === RequestType.INFORMATION_UPDATE) {
      beforeData = {
        fullName: student.fullName,
        guardianPhone: student.guardianPhone,
      };
    } else {
      beforeData = {
        addressText: student.addressText,
        latitude: Number(student.latitude),
        longitude: Number(student.longitude),
      };
    }

    // 4. Tạo yêu cầu cập nhật trong Database với xử lý concurrency chống trùng lặp PENDING
    try {
      const createdRequest = await this.prisma.$transaction(async tx => { const created = await tx.studentUpdateRequest.create({
        data: {
          studentId,
          parentId,
          schoolId: student.schoolId,
          type: dto.type,
          status: RequestStatus.PENDING,
          beforeData,
          proposedData: dto.proposedData,
        },
        include: {
          student: true,
          parent: { select: { id: true, fullName: true } },
          school: { select: { id: true, name: true } },
        },
      }); await notifyRequest(tx, created.id, parentId); return created; });

      this.logger.log(
        `Phụ huynh ${parentId} đã tạo yêu cầu ${dto.type} thành công cho học sinh ${student.code}`,
      );

      return this.mapToDto(createdRequest);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Học sinh đang có một yêu cầu cập nhật cùng loại đang chờ xét duyệt',
        );
      }
      throw error;
    }
  }

  /**
   * API C: Phụ huynh xem danh sách các yêu cầu cập nhật của học sinh
   */
  async listParentRequests(
    parentId: string,
    studentId: string,
    query: ListRequestsQueryDto,
  ): Promise<StudentUpdateRequestListResponseDto> {
    const link = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: { parentId, studentId },
      },
    });

    if (!link) {
      throw new ForbiddenException('Bạn không có quyền xem yêu cầu của học sinh này');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.StudentUpdateRequestWhereInput = {
      parentId,
      studentId,
    };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const [total, items] = await Promise.all([
      this.prisma.studentUpdateRequest.count({ where }),
      this.prisma.studentUpdateRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: true,
          parent: { select: { id: true, fullName: true } },
          school: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => this.mapToDto(item)),
      total,
      page,
      totalPages,
    };
  }

  /**
   * API D: Phụ huynh xem chi tiết yêu cầu cập nhật
   */
  async getParentRequestDetail(
    parentId: string,
    requestId: string,
  ): Promise<StudentUpdateRequestDto> {
    const request = await this.prisma.studentUpdateRequest.findUnique({
      where: { id: requestId },
      include: {
        student: true,
        parent: { select: { id: true, fullName: true } },
        school: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Yêu cầu cập nhật không tồn tại');
    }

    if (request.parentId !== parentId) {
      throw new ForbiddenException('Bạn không có quyền xem yêu cầu cập nhật này');
    }

    // Section 1.7: Kiểm tra nếu liên kết Phụ huynh - Học sinh đã bị hủy
    const link = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: { parentId, studentId: request.studentId },
      },
    });

    if (!link) {
      throw new ForbiddenException('Bạn đã hủy liên kết với học sinh này nên không thể xem chi tiết yêu cầu');
    }

    return this.mapToDto(request);
  }

  /**
   * Phụ huynh hủy yêu cầu cập nhật địa chỉ khi còn ở trạng thái PENDING (không cần OTP).
   */
  async cancelParentRequest(parentId: string, requestId: string): Promise<StudentUpdateRequestDto> {
    const request = await this.prisma.studentUpdateRequest.findUnique({
      where: { id: requestId },
      include: {
        student: true,
        parent: { select: { id: true, fullName: true } },
        school: { select: { id: true, name: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Yêu cầu không tồn tại');
    }

    if (request.parentId !== parentId) {
      throw new ForbiddenException('Bạn không có quyền hủy yêu cầu này');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException('Chỉ có thể hủy yêu cầu đang ở trạng thái chờ duyệt (PENDING)');
    }

    const updated = await this.prisma.studentUpdateRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.CANCELLED,
        resolution: {
          outcome: 'CANCELLED_BY_PARENT',
          cancelledAt: new Date().toISOString(),
        },
      },
      include: {
        student: true,
        parent: { select: { id: true, fullName: true } },
        school: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    this.logger.log(`Phụ huynh ${parentId} đã hủy yêu cầu ${requestId}`);
    return this.mapToDto(updated);
  }

  // =========================================================================
  // 2. SCHOOL ADMIN APIS (Section 10)
  // =========================================================================

  /**
   * Danh sách yêu cầu cập nhật thuộc trường của School Admin
   */
  async listSchoolRequests(
    schoolId: string,
    query: ListRequestsQueryDto,
  ): Promise<StudentUpdateRequestListResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.StudentUpdateRequestWhereInput = {
      schoolId,
      ...(query.actionable ? { AND: [actionableRequestWhere(Role.SCHOOL_ADMIN, schoolId)] } : {}),
    };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.student = {
        OR: [
          { fullName: { contains: s, mode: 'insensitive' } },
          { code: { contains: s, mode: 'insensitive' } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.studentUpdateRequest.count({ where }),
      this.prisma.studentUpdateRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: true,
          parent: { select: { id: true, fullName: true } },
          school: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => this.mapToDto(item)),
      total,
      page,
      totalPages,
    };
  }

  /**
   * Lịch sử yêu cầu cập nhật của một học sinh cụ thể thuộc trường
   */
  async listStudentRequestHistory(
    schoolId: string,
    studentId: string,
    query: ListRequestsQueryDto,
  ): Promise<StudentUpdateRequestListResponseDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student || student.schoolId !== schoolId) {
      throw new NotFoundException('Học sinh không tồn tại trong trường của bạn');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.StudentUpdateRequestWhereInput = {
      schoolId,
      studentId,
    };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const [total, items] = await Promise.all([
      this.prisma.studentUpdateRequest.count({ where }),
      this.prisma.studentUpdateRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: true,
          parent: { select: { id: true, fullName: true } },
          school: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => this.mapToDto(item)),
      total,
      page,
      totalPages,
    };
  }

  /**
   * Xem chi tiết yêu cầu kèm kiểm tra dữ liệu cũ (Stale Data Detection) cho School Admin
   */
  async getSchoolRequestDetail(
    schoolId: string,
    requestId: string,
  ): Promise<StudentUpdateRequestDetailDto> {
    const request = await this.prisma.studentUpdateRequest.findUnique({
      where: { id: requestId },
      include: {
        student: true,
        parent: { select: { id: true, fullName: true } },
        school: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!request || request.schoolId !== schoolId) {
      throw new NotFoundException('Yêu cầu cập nhật không tồn tại trong trường của bạn');
    }

    const baseDto = this.mapToDto(request);

    // Tính toán dữ liệu hiện tại và cờ isStale
    let currentStudentData: Record<string, any> = {};
    let isStale = false;

    if (request.type === RequestType.INFORMATION_UPDATE) {
      currentStudentData = {
        fullName: request.student.fullName,
        guardianPhone: request.student.guardianPhone,
      };
      const before = request.beforeData as Record<string, any>;
      isStale =
        (before.fullName && before.fullName !== request.student.fullName) ||
        (before.guardianPhone && before.guardianPhone !== request.student.guardianPhone);
    } else {
      currentStudentData = {
        addressText: request.student.addressText,
        latitude: Number(request.student.latitude),
        longitude: Number(request.student.longitude),
      };
      const before = request.beforeData as Record<string, any>;
      isStale =
        before.addressText !== request.student.addressText ||
        Math.abs(Number(before.latitude) - Number(request.student.latitude)) > 0.000001 ||
        Math.abs(Number(before.longitude) - Number(request.student.longitude)) > 0.000001;
    }

    return {
      ...baseDto,
      currentStudentData,
      isStale,
    };
  }

  /**
   * Cập nhật địa chỉ trực tiếp bởi School Admin (Section 13)
   */
  async directUpdateStudentAddress(
    schoolId: string,
    studentId: string,
    dto: UpdateStudentAddressDto,
  ): Promise<Student> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student || student.schoolId !== schoolId) {
      throw new NotFoundException('Học sinh không tồn tại trong trường của bạn');
    }

    if (student.status === StudentStatus.DISABLED) {
      throw new BadRequestException('Không thể cập nhật địa chỉ khi học sinh đang bị vô hiệu hóa (DISABLED)');
    }

    const activeRouteStop = await this.prisma.routeStop.findFirst({
      where: {
        studentId,
        route: {
          routePlan: {
            status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
          },
        },
      },
    });

    if (activeRouteStop) {
      throw new BadRequestException(
        'Học sinh đang thuộc phương án phân tuyến DRAFT hoặc ACTIVE. Không thể cập nhật địa chỉ trực tiếp.',
      );
    }

    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        addressText: dto.addressText.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    this.logger.log(
      `School Admin đã cập nhật trực tiếp địa chỉ học sinh ${student.code}: ${dto.addressText}`,
    );

    return updated;
  }

  // =========================================================================
  // 3. SYSTEM ADMIN APIS (Section 11)
  // =========================================================================

  /**
   * Danh sách yêu cầu cập nhật địa chỉ dành riêng cho System Admin (Chỉ ADDRESS_UPDATE)
   */
  async listSystemAdminAddressRequests(
    query: ListRequestsQueryDto,
  ): Promise<StudentUpdateRequestListResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.StudentUpdateRequestWhereInput = {
      type: RequestType.ADDRESS_UPDATE, // BẮT BUỘC CHỈ LẤY ADDRESS_UPDATE (Section 11)
      ...(query.schoolId ? { schoolId: query.schoolId } : {}),
      ...(query.actionable ? { AND: [actionableRequestWhere(Role.SYSTEM_ADMIN, query.schoolId)] } : {}),
    };

    if (query.status) where.status = query.status;

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { student: { fullName: { contains: s, mode: 'insensitive' } } },
        { student: { code: { contains: s, mode: 'insensitive' } } },
        { school: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.studentUpdateRequest.count({ where }),
      this.prisma.studentUpdateRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: true,
          parent: { select: { id: true, fullName: true } },
          school: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => this.mapToDto(item)),
      total,
      page,
      totalPages,
    };
  }

  /**
   * Xem chi tiết yêu cầu địa chỉ cho System Admin
   */
  async getSystemAdminAddressRequestDetail(
    requestId: string,
  ): Promise<StudentUpdateRequestDetailDto> {
    const request = await this.prisma.studentUpdateRequest.findUnique({
      where: { id: requestId },
      include: {
        student: true,
        parent: { select: { id: true, fullName: true } },
        school: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Yêu cầu cập nhật không tồn tại');
    }

    // Bảo vệ cách ly: System Admin không được truy xuất INFORMATION_UPDATE
    if (request.type !== RequestType.ADDRESS_UPDATE) {
      throw new ForbiddenException('Quản trị viên hệ thống chỉ có quyền xử lý yêu cầu cập nhật địa chỉ');
    }

    const baseDto = this.mapToDto(request);

    const currentStudentData = {
      addressText: request.student.addressText,
      latitude: Number(request.student.latitude),
      longitude: Number(request.student.longitude),
    };
    const before = request.beforeData as Record<string, any>;
    const isStale =
      before.addressText !== request.student.addressText ||
      Math.abs(Number(before.latitude) - Number(request.student.latitude)) > 0.000001 ||
      Math.abs(Number(before.longitude) - Number(request.student.longitude)) > 0.000001;

    return {
      ...baseDto,
      currentStudentData,
      isStale,
    };
  }

  // =========================================================================
  // 4. SHARED APPROVAL & REJECTION TRANSACTION (Section 12)
  // =========================================================================

  /**
   * Phê duyệt yêu cầu cập nhật học sinh (Dùng chung cho cả School Admin và System Admin)
   * Đảm bảo nguyên tử: One Valid Decision, Stale Data Detection, Safe Concurrency.
   */
  async approveRequest(
    requestId: string,
    reviewerId: string,
    reviewerRole: Role,
    reviewerSchoolId?: string | null,
    approveDto?: ApproveAddressRequestDto,
  ): Promise<StudentUpdateRequestDto> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Tải yêu cầu và thông tin học sinh
      const request = await tx.studentUpdateRequest.findUnique({
        where: { id: requestId },
        include: {
          student: true,
          parent: { select: { id: true, fullName: true } },
          school: { select: { id: true, name: true } },
        },
      });

      if (!request) {
        throw new NotFoundException('Yêu cầu cập nhật không tồn tại');
      }

      // 2. Kiểm tra thẩm quyền phê duyệt
      if (reviewerRole === Role.SCHOOL_ADMIN) {
        if (request.schoolId !== reviewerSchoolId) {
          throw new ForbiddenException('Bạn chỉ có quyền phê duyệt yêu cầu của học sinh thuộc trường mình');
        }
      } else if (reviewerRole === Role.SYSTEM_ADMIN) {
        if (request.type !== RequestType.ADDRESS_UPDATE) {
          throw new ForbiddenException(
            'Quản trị viên hệ thống chỉ có quyền phê duyệt yêu cầu cập nhật địa chỉ (ADDRESS_UPDATE)',
          );
        }
      } else {
        throw new ForbiddenException('Bạn không có quyền phê duyệt yêu cầu này');
      }

      // 3. Quy tắc Single Decision: Chỉ được phê duyệt khi đang ở trạng thái PENDING
      if (request.status !== RequestStatus.PENDING) {
        throw new ConflictException('Yêu cầu này đã được xử lý trước đó bởi quản trị viên khác');
      }

      // 4. Kiểm tra trạng thái học sinh (Section 1.5): Không được duyệt nếu Student đang DISABLED
      if (request.student.status === StudentStatus.DISABLED) {
        throw new BadRequestException(
          'Không thể phê duyệt yêu cầu khi học sinh đang ở trạng thái vô hiệu hóa (DISABLED)',
        );
      }

      let resolutionData: Record<string, any> | null = null;

      // 5. Kiểm tra xung đột dữ liệu cũ (Stale Data Policy - Section 1.6)
      if (request.type === RequestType.INFORMATION_UPDATE) {
        const before = request.beforeData as Record<string, any>;
        const isStale =
          (before.fullName && before.fullName !== request.student.fullName) ||
          (before.guardianPhone && before.guardianPhone !== request.student.guardianPhone);

        if (isStale) {
          throw new ConflictException(
            'Dữ liệu học sinh hiện tại đã thay đổi so với thời điểm gửi yêu cầu (Stale Data Conflict). Không thể phê duyệt.',
          );
        }

        // Cập nhật thông tin học sinh nguyên tử
        const proposed = request.proposedData as Record<string, any>;
        const updateData: Prisma.StudentUpdateInput = {};
        if (proposed.fullName) updateData.fullName = String(proposed.fullName).trim();
        if (proposed.guardianPhone) updateData.guardianPhone = String(proposed.guardianPhone).trim();

        await tx.student.update({
          where: { id: request.studentId },
          data: updateData,
        });
      } else if (request.type === RequestType.ADDRESS_UPDATE) {
        const before = request.beforeData as Record<string, any>;
        const isStale =
          before.addressText !== request.student.addressText ||
          Math.abs(Number(before.latitude) - Number(request.student.latitude)) > 0.000001 ||
          Math.abs(Number(before.longitude) - Number(request.student.longitude)) > 0.000001;

        if (isStale) {
          throw new ConflictException(
            'Địa chỉ hoặc tọa độ học sinh hiện tại đã thay đổi so với thời điểm gửi yêu cầu (Stale Data Conflict). Không thể phê duyệt.',
          );
        }

        const proposed = request.proposedData as Record<string, any>;
        const newAddressText = String(proposed.addressText).trim();
        const newLatitude = Number(proposed.latitude);
        const newLongitude = Number(proposed.longitude);

        // Kiểm tra xem học sinh có thuộc tuyến DRAFT hoặc ACTIVE nào không
        const routeStops = await tx.routeStop.findMany({
          where: {
            studentId: request.studentId,
            route: {
              routePlan: {
                status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
              },
            },
          },
          include: {
            route: true,
          },
        });

        if (reviewerRole === Role.SCHOOL_ADMIN && routeStops.length > 0) {
          throw new BadRequestException(
            'Học sinh đang thuộc phương án phân tuyến. Yêu cầu đổi địa chỉ phải do Quản trị viên hệ thống (System Admin) kiểm tra lộ trình và phê duyệt.',
          );
        }

        // Cập nhật địa chỉ và tọa độ học sinh nguyên tử
        await tx.student.update({
          where: { id: request.studentId },
          data: {
            addressText: newAddressText,
            latitude: newLatitude,
            longitude: newLongitude,
          },
        });

        let outcome: 'DIRECT_UPDATE' | 'REOPTIMIZED' | 'REMOVED_FROM_ROUTES' = 'DIRECT_UPDATE';

        if (routeStops.length > 0) {
          const decision = approveDto?.decision || approveDto?.resolutionOutcome || 'REOPTIMIZED';
          const routeIds = Array.from(new Set(routeStops.map((rs: any) => rs.routeId)));

          if (decision === 'REMOVED_FROM_ROUTES') {
            outcome = 'REMOVED_FROM_ROUTES';

            // Xóa điểm dừng của học sinh
            await tx.routeStop.deleteMany({
              where: {
                studentId: request.studentId,
                routeId: { in: routeIds },
              },
            });

            // Loại học sinh khỏi các Trip SCHEDULED chưa vận hành
            const unoperatedScheduledTrips = await tx.trip.findMany({
              where: {
                routeId: { in: routeIds },
                status: TripStatus.SCHEDULED,
                actualStartTime: null,
                attendantReadyAt: null,
              },
              include: {
                attendances: true,
              },
            });

            for (const trip of unoperatedScheduledTrips) {
              await tx.tripAttendance.updateMany({
                where: {
                  tripId: trip.id,
                  studentId: request.studentId,
                  excludedAt: null,
                },
                data: {
                  excludedAt: new Date(),
                  exclusionReason: 'STUDENT_ADDRESS_CHANGED_REMOVED',
                },
              });

              // Kiểm tra nếu chuyến không còn học sinh hoạt động nào -> Hủy chuyến
              const activeCount = trip.attendances.filter(
                (a) => a.studentId !== request.studentId && !a.excludedAt,
              ).length;
              if (activeCount === 0) {
                await tx.trip.update({
                  where: { id: trip.id },
                  data: {
                    status: TripStatus.CANCELLED,
                    cancellationReason: 'Hủy tự động do tuyến không còn học sinh sau khi đổi địa chỉ',
                  },
                });

              await notifyCancelledTrips(tx, [trip.id], 'student-removal:' + request.studentId + ':' + trip.id, reviewerId);
            }
            }
          } else {
            // REOPTIMIZED: Cập nhật tọa độ điểm dừng và geometry/metrics đã preview trên các tuyến
            outcome = 'REOPTIMIZED';
            let previewSession: any = null;
            if (approveDto?.previewToken) {
              previewSession = this.addressPreviewSessions.get(approveDto.previewToken);
            }

            if (previewSession && Array.isArray(previewSession.routes)) {
              for (const r of previewSession.routes) {
                await tx.route.update({
                  where: { id: r.routeId },
                  data: {
                    polylineGeometry: r.newGeometry,
                    totalDistanceMeters: r.newDistanceMeters,
                    estimatedDurationSeconds: r.newDurationSeconds,
                  },
                });
              }
            }

            await tx.routeStop.updateMany({
              where: {
                studentId: request.studentId,
                routeId: { in: routeIds },
              },
              data: {
                addressText: newAddressText,
                latitude: newLatitude,
                longitude: newLongitude,
              },
            });

            if (approveDto?.previewToken) {
              this.addressPreviewSessions.delete(approveDto.previewToken);
            }
          }
        }

        resolutionData = {
          outcome,
          reviewedByRole: reviewerRole,
          affectedRoutesCount: routeStops.length,
          reviewedAt: new Date().toISOString(),
        };
      }

      // 6. Chuyển trạng thái yêu cầu sang APPROVED và lưu người duyệt
      const updatedRequest = await tx.studentUpdateRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.APPROVED,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          resolution: resolutionData || Prisma.DbNull,
        },
        include: {
          student: true,
          parent: { select: { id: true, fullName: true } },
          school: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
      });

      this.logger.log(
        `Yêu cầu ${requestId} (${request.type}) đã được phê duyệt thành công bởi ${reviewerRole} (${reviewerId})`,
      );

      await notifyRequest(tx, updatedRequest.id, reviewerId);
      return this.mapToDto(updatedRequest);
    });
  }

  /**
   * Từ chối yêu cầu cập nhật học sinh (Dùng chung cho cả School Admin và System Admin)
   */
  async rejectRequest(
    requestId: string,
    reviewerId: string,
    reviewerRole: Role,
    dto: ReviewRequestDto,
    reviewerSchoolId?: string | null,
  ): Promise<StudentUpdateRequestDto> {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.studentUpdateRequest.findUnique({
        where: { id: requestId },
        include: {
          student: true,
          parent: { select: { id: true, fullName: true } },
          school: { select: { id: true, name: true } },
        },
      });

      if (!request) {
        throw new NotFoundException('Yêu cầu cập nhật không tồn tại');
      }

      // Kiểm tra quyền
      if (reviewerRole === Role.SCHOOL_ADMIN) {
        if (request.schoolId !== reviewerSchoolId) {
          throw new ForbiddenException('Bạn chỉ có quyền từ chối yêu cầu của học sinh thuộc trường mình');
        }
      } else if (reviewerRole === Role.SYSTEM_ADMIN) {
        if (request.type !== RequestType.ADDRESS_UPDATE) {
          throw new ForbiddenException(
            'Quản trị viên hệ thống chỉ có quyền từ chối yêu cầu cập nhật địa chỉ (ADDRESS_UPDATE)',
          );
        }
      } else {
        throw new ForbiddenException('Bạn không có quyền từ chối yêu cầu này');
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new ConflictException('Yêu cầu này đã được xử lý trước đó bởi quản trị viên khác');
      }

      const updatedRequest = await tx.studentUpdateRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.REJECTED,
          rejectionReason: dto.rejectionReason?.trim() || null,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
        include: {
          student: true,
          parent: { select: { id: true, fullName: true } },
          school: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, fullName: true } },
        },
      });

      this.logger.log(
        `Yêu cầu ${requestId} (${request.type}) đã bị từ chối bởi ${reviewerRole} (${reviewerId})`,
      );

      await notifyRequest(tx, updatedRequest.id, reviewerId);
      return this.mapToDto(updatedRequest);
    });
  }

  /**
   * Mô phỏng và kiểm tra tính khả thi định tuyến cho yêu cầu đổi địa chỉ của học sinh
   * Sử dụng routing solver thực tế và hai tiêu chí tối ưu (Thời gian tối đa tuyến & Thời gian dừng tại điểm)
   */
  async previewAddressRouting(
    requestId: string,
    dto?: StudentAddressRoutingPreviewDto,
  ): Promise<StudentAddressRoutingPreviewResponseDto> {
    const request = await this.prisma.studentUpdateRequest.findUnique({
      where: { id: requestId },
      include: {
        student: true,
        school: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Yêu cầu không tồn tại');
    }

    if (request.type !== RequestType.ADDRESS_UPDATE) {
      throw new BadRequestException('Chỉ hỗ trợ xem trước định tuyến cho yêu cầu đổi địa chỉ');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException('Yêu cầu không còn ở trạng thái chờ duyệt (PENDING)');
    }

    const proposed = request.proposedData as Record<string, any>;
    const newLat = Number(proposed.latitude);
    const newLng = Number(proposed.longitude);

    if (
      Number.isNaN(newLat) ||
      Number.isNaN(newLng) ||
      newLat < -90 ||
      newLat > 90 ||
      newLng < -180 ||
      newLng > 180
    ) {
      throw new BadRequestException('Tọa độ địa chỉ đề xuất mới không hợp lệ');
    }

    // Tìm các tuyến DRAFT hoặc ACTIVE mà học sinh đang tham gia
    const studentStops = await this.prisma.routeStop.findMany({
      where: {
        studentId: request.studentId,
        route: {
          routePlan: {
            status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
          },
        },
      },
      include: {
        route: {
          include: {
            routePlan: true,
            proposedVehicle: true,
            stops: {
              orderBy: { stopOrder: 'asc' },
            },
          },
        },
      },
    });

    if (studentStops.length === 0) {
      return {
        previewToken: null,
        allFeasible: true,
        overallFeasibility: 'FEASIBLE',
        hasInfeasible: false,
        hasUnavailable: false,
        routes: [],
        scheduledTripsToRefreshCount: 0,
        affectedScheduledTripsCount: 0,
        frozenTripsCount: 0,
        preservedTripsCount: 0,
        expectedFingerprint: 'NO_ACTIVE_ROUTES',
      };
    }

    const routeItems: RouteFeasibilityItemDto[] = [];
    const sessionRoutes: Array<{
      routeId: string;
      newGeometry: string;
      newDistanceMeters: number;
      newDurationSeconds: number;
      newPlannedArrivalTime?: string;
    }> = [];

    let allFeasible = true;
    let hasInfeasible = false;
    let hasUnavailable = false;

    for (const rs of studentStops) {
      const route = rs.route;
      const vehicleCap = route.proposedVehicle?.seatCount || 30;
      const studentCount = route.stops.filter((s: any) => s.studentId).length;
      const isCapacityOk = studentCount <= vehicleCap;

      // Tiêu chí tối ưu: Ưu tiên tham số truyền vào -> Route constraints -> RoutePlan constraints -> Defaults (90m, 60s)
      const planConstraints = (route.routePlan.routingConstraints as any) || {};
      const routeConstraints = (route.routingConstraints as any) || {};
      const maxDurationMinutes = Math.max(
        10,
        Number(
          dto?.routingConstraints?.maxRouteDurationMinutes ??
            routeConstraints.maxRouteDurationMinutes ??
            planConstraints.maxRouteDurationMinutes ??
            90,
        ),
      );
      const defaultStopServiceSeconds = Math.max(
        10,
        Math.min(
          300,
          Number(
            dto?.routingConstraints?.defaultStopServiceSeconds ??
              routeConstraints.defaultStopServiceSeconds ??
              planConstraints.defaultStopServiceSeconds ??
              60,
          ),
        ),
      );
      const stopOverrides =
        dto?.routingConstraints?.stopServiceOverrides ??
        routeConstraints.stopServiceOverrides ??
        planConstraints.stopServiceOverrides ??
        [];

      // Tạo chuỗi điểm dừng với tọa độ mới của học sinh này, giữ nguyên tọa độ của tất cả học sinh khác
      let studentStopIndex = 0;
      const updatedPoints: { latitude: number; longitude: number }[] = route.stops.map((s, idx) => {
        if (s.studentId === request.studentId) {
          studentStopIndex = idx;
          return { latitude: newLat, longitude: newLng };
        }
        return { latitude: s.latitude, longitude: s.longitude };
      });

      const calc = await this.vietmapVRPService.calculateRoute(updatedPoints);

      if (calc.status === 'UNAVAILABLE') {
        hasUnavailable = true;
        allFeasible = false;
        routeItems.push({
          routeId: route.id,
          routeName: route.name,
          direction: route.direction,
          planId: route.routePlanId,
          planStatus: route.routePlan.status,
          status: 'UNAVAILABLE',
          feasibility: 'UNAVAILABLE',
          reason: calc.reason,
          infeasibilityReason: calc.reason,
          totalStudents: studentCount,
          oldDurationSeconds: route.estimatedDurationSeconds,
          newDurationSeconds: route.estimatedDurationSeconds,
          oldDistanceMeters: route.totalDistanceMeters,
          newDistanceMeters: route.totalDistanceMeters,
          newPolylineGeometry: route.polylineGeometry,
        });
      } else {
        // Tính tổng thời gian dừng tại các điểm trên tuyến
        let serviceSecondsTotal = 0;
        let serviceBeforeStudent = 0;
        for (let i = 0; i < route.stops.length; i++) {
          const s = route.stops[i];
          if (s.studentId) {
            const match = stopOverrides.find(
              (o: any) => o.studentId === s.studentId && (!o.direction || o.direction === route.direction),
            );
            const sSec =
              match && typeof match.serviceSeconds === 'number' && match.serviceSeconds > 0
                ? Math.round(match.serviceSeconds)
                : defaultStopServiceSeconds;
            serviceSecondsTotal += sSec;
            if (i < studentStopIndex) {
              serviceBeforeStudent += sSec;
            }
          }
        }

        const totalRouteDuration = calc.durationSeconds + serviceSecondsTotal;
        let feasible = true;
        let reason: string | undefined;

        if (!isCapacityOk) {
          feasible = false;
          reason = `Vượt quá sức chứa phương tiện (${vehicleCap} chỗ, hiện tại ${studentCount})`;
        } else if (totalRouteDuration > maxDurationMinutes * 60) {
          feasible = false;
          reason = `Thời gian tuyến (${Math.round(totalRouteDuration / 60)} phút) vượt quá giới hạn tối đa (${maxDurationMinutes} phút)`;
        }

        if (!feasible) {
          allFeasible = false;
          hasInfeasible = true;
        }

        // Tính giờ dự kiến mới tại điểm dừng của học sinh
        let newPlannedArrivalTime: string | undefined;
        const drivingFraction = updatedPoints.length > 1 ? studentStopIndex / (updatedPoints.length - 1) : 0.5;

        if (route.direction === RouteDirection.TO_SCHOOL) {
          const arrSec = this.parseTimeToSeconds(route.arrivalTime || '07:15');
          const depSec = arrSec - totalRouteDuration;
          const stopSec = Math.round(depSec + calc.durationSeconds * drivingFraction + serviceBeforeStudent);
          newPlannedArrivalTime = this.secondsToTimeString(stopSec);
        } else {
          const depSec = this.parseTimeToSeconds(route.departureTime || '16:30');
          const stopSec = Math.round(depSec + calc.durationSeconds * drivingFraction + serviceBeforeStudent);
          newPlannedArrivalTime = this.secondsToTimeString(stopSec);
        }

        routeItems.push({
          routeId: route.id,
          routeName: route.name,
          direction: route.direction,
          planId: route.routePlanId,
          planStatus: route.routePlan.status,
          status: feasible ? 'FEASIBLE' : 'INFEASIBLE',
          feasibility: feasible ? 'FEASIBLE' : 'INFEASIBLE',
          reason,
          infeasibilityReason: reason,
          totalStudents: studentCount,
          oldDurationSeconds: route.estimatedDurationSeconds,
          newDurationSeconds: totalRouteDuration,
          oldDistanceMeters: route.totalDistanceMeters,
          newDistanceMeters: calc.distanceMeters,
          newPolylineGeometry: calc.geometry,
          newPlannedArrivalTime,
        });

        sessionRoutes.push({
          routeId: route.id,
          newGeometry: calc.geometry,
          newDistanceMeters: calc.distanceMeters,
          newDurationSeconds: totalRouteDuration,
          newPlannedArrivalTime,
        });
      }
    }

    const routeIds = Array.from(new Set(studentStops.map((rs: any) => rs.routeId)));
    const scheduledTripsCount = await this.prisma.trip.count({
      where: {
        routeId: { in: routeIds },
        status: TripStatus.SCHEDULED,
        actualStartTime: null,
        attendantReadyAt: null,
      },
    });

    const frozenTripsCount = await this.prisma.trip.count({
      where: {
        routeId: { in: routeIds },
        OR: [
          { status: TripStatus.IN_PROGRESS },
          { status: TripStatus.COMPLETED },
          { actualStartTime: { not: null } },
          { attendantReadyAt: { not: null } },
        ],
      },
    });

    const expectedFingerprint = crypto
      .createHash('sha256')
      .update(`${request.id}_${newLat}_${newLng}_${routeIds.sort().join(',')}`)
      .digest('hex')
      .slice(0, 16);

    let previewToken: string | null = null;
    if (allFeasible) {
      previewToken = `prev_${request.id}_${Date.now()}`;
      this.addressPreviewSessions.set(previewToken, {
        previewToken,
        requestId: request.id,
        studentId: request.studentId,
        newLatitude: newLat,
        newLongitude: newLng,
        newAddressText: proposed.addressText || '',
        routes: sessionRoutes,
        createdAt: Date.now(),
        expectedFingerprint,
      });
    }

    const overallFeasibility: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE' = hasUnavailable
      ? 'UNAVAILABLE'
      : allFeasible
      ? 'FEASIBLE'
      : 'INFEASIBLE';

    return {
      previewToken,
      allFeasible,
      overallFeasibility,
      hasInfeasible,
      hasUnavailable,
      routes: routeItems,
      scheduledTripsToRefreshCount: scheduledTripsCount,
      affectedScheduledTripsCount: scheduledTripsCount,
      frozenTripsCount,
      preservedTripsCount: frozenTripsCount,
      expectedFingerprint,
    };
  }
}
