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
} from '@prisma/client';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from '../auth/otp.service.js';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

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
      const createdRequest = await this.prisma.studentUpdateRequest.create({
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
      });

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

        // Cập nhật địa chỉ và tọa độ học sinh nguyên tử
        const proposed = request.proposedData as Record<string, any>;
        await tx.student.update({
          where: { id: request.studentId },
          data: {
            addressText: String(proposed.addressText).trim(),
            latitude: Number(proposed.latitude),
            longitude: Number(proposed.longitude),
          },
        });
      }

      // 6. Chuyển trạng thái yêu cầu sang APPROVED và lưu người duyệt
      const updatedRequest = await tx.studentUpdateRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.APPROVED,
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
        `Yêu cầu ${requestId} (${request.type}) đã được phê duyệt thành công bởi ${reviewerRole} (${reviewerId})`,
      );

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

      return this.mapToDto(updatedRequest);
    });
  }
}
