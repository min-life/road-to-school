import { locationOptions } from '../schools/geography.js';
import { closeCancelledTripTasks } from '../trips/utils/close-cancelled-trip-tasks.js';
import { captureTripSnapshots } from '../trips/utils/capture-trip-snapshots.js';
import { administrativeLocationForCoordinates, provinceForCoordinates } from '../schools/location-province.js';
import { vietnamToday } from '../schools/school-effective-state.js';
import { frozenTripWhere } from '../overview/operations-policy.js';
import { lockOperations } from '../trips/utils/operations-lock.js';
import { notifyCancelledTrips, writeNotification } from '../notifications/notification-writer.js';
import { assertSchoolWritable, effectiveSchool } from '../schools/school-policy.js';
import { metresBetween } from '../trips/utils/navigation-state.js';
import { Optional } from '@nestjs/common';
import { EnrollmentSessionsService } from '../iot/enrollment/enrollment-sessions.service.js';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Prisma,
  Role,
  StudentStatus,
  User,
  RoutePlanStatus,
  TripStatus,
  RequestStatus,
  LeaveNoticeStatus,
} from '@prisma/client';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../schools/cloudinary.service.js';
import { generateStudentCode } from './utils/student-code.generator.js';
import {
  parseXlsxBuffer,
  generateXlsxBuffer,
  getStudentImportTemplateBuffer,
} from './utils/xlsx.js';
import {
  CreateStudentDto,
  ListStudentsQueryDto,
  UpdateStudentStatusDto,
  StudentListResponseDto,
  StudentDetailResponseDto,
  StudentItemDto,
  StudentDisableImpactDto,
  ServiceAreaCheckDto,
  ServiceAreaCheckResponseDto,
  ServiceAreaStatus,
  BulkImportPreviewResponseDto,
  BulkImportCommitDto,
  BulkImportCommitResponseDto,
  BulkExportDto,
  BulkExportScope,
  BulkImportRowErrorDto,
} from './dto/index.js';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  async revokeParentLink(
    schoolId: string,
    studentId: string,
    parentId: string,
    reason: string,
    actor: User,
  ) {
    if (actor.role !== Role.SCHOOL_ADMIN || actor.schoolId !== schoolId) {
      throw new ForbiddenException(
        'Chỉ quản trị viên đúng trường được thu hồi liên kết',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
      await assertSchoolWritable(tx, schoolId);
      const student = await tx.student.findFirst({
        where: { id: studentId, schoolId },
      });
      if (!student)
        throw new NotFoundException('Không tìm thấy học sinh trong trường');
      const link = await tx.parentStudentLink.findUnique({
        where: { parentId_studentId: { parentId, studentId } },
      });
      if (!link) throw new NotFoundException('Liên kết không còn tồn tại');
      const now = new Date();
      await tx.student.update({
        where: { id: studentId },
        data: {
          parentLinkAudit: [
            ...(Array.isArray(student.parentLinkAudit)
              ? student.parentLinkAudit
              : []),
            {
              action: 'REVOKED',
              parentId,
              reason,
              actorId: actor.id,
              occurredAt: now.toISOString(),
            },
          ] as Prisma.InputJsonArray,
        },
      });
      await tx.parentStudentLink.delete({
        where: { parentId_studentId: { parentId, studentId } },
      });
      await writeNotification(tx, {
        eventKey:
          'parent-link:' + studentId + ':' + parentId + ':' + now.toISOString(),
        type: 'PARENT_LINK_REVOKED',
        title: 'Liên kết học sinh đã được trường thu hồi',
        body: reason,
        targetType: 'SCHEDULE',
        targetId: 'current',
        userIds: [parentId],
        actorId: actor.id,
        push: true,
      });
      return { message: 'Đã thu hồi liên kết và lưu lý do' };
    });
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    @Optional() private readonly enrollments?: EnrollmentSessionsService,
  ) {}

  /**
   * Tính toán trường dẫn xuất hasAddress từ 3 thuộc tính địa chỉ
   */
  private computeHasAddress(
    addressText: string | null | undefined,
    latitude: number | null | undefined,
    longitude: number | null | undefined,
  ): boolean {
    return Boolean(
      addressText &&
        addressText.trim().length > 0 &&
        latitude !== null &&
        latitude !== undefined &&
        longitude !== null &&
        longitude !== undefined,
    );
  }

  /**
   * Kiểm định chữ ký file buffer (Magic Bytes) cho JPEG, PNG và WebP
   */
  private validateImageBuffer(buffer: Buffer, mimetype: string): boolean {
    if (mimetype === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimetype === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }
    if (mimetype === 'image/webp') {
      const isRiff =
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46;
      const isWebp =
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50;
      return isRiff && isWebp;
    }
    return false;
  }

  /**
   * Lấy danh sách học sinh theo trường học.
   * Hỗ trợ tìm kiếm, 2 bộ lọc độc lập (status và hasAddress) và phân trang Server-side.
   */
  async getLocationOptions(schoolId: string, actor: User, provinceId?: string) {
    if (actor.role !== Role.SYSTEM_ADMIN && (actor.role !== Role.SCHOOL_ADMIN || actor.schoolId !== schoolId)) {
      throw new ForbiddenException('Không có quyền xem học sinh trường khác');
    }
    if (!await this.prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } })) {
      throw new NotFoundException('Không tìm thấy trường học');
    }
    const students = await this.prisma.student.findMany({ where: { schoolId }, select: { provinceId: true, province: true, wardId: true, ward: true } });
    return locationOptions(students, provinceId);
  }

  async listStudents(
    schoolId: string,
    query: ListStudentsQueryDto,
    currentUser?: User,
  ): Promise<StudentListResponseDto> {
    // 1. Kiểm tra trường học tồn tại
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });

    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    // Kiểm tra cách ly trường học đối với SCHOOL_ADMIN
    if (currentUser && currentUser.role === Role.SCHOOL_ADMIN) {
      if (currentUser.schoolId !== schoolId) {
        throw new ForbiddenException(
          'Bạn không có quyền xem danh sách học sinh của trường học khác',
        );
      }
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    // 2. Xây dựng điều kiện lọc ở tầng Database
    const where: Prisma.StudentWhereInput = {
      schoolId,
    };

    if (query.routingStatus === 'UNASSIGNED') where.routeStops = { none: { route: { routePlan: { status: { in: ['DRAFT', 'ACTIVE'] } } } } };
    if (query.provinceId) where.provinceId = query.provinceId;
    if (query.wardId) where.wardId = query.wardId;
    // Bộ lọc 1: Trạng thái học sinh (AVAILABLE hoặc DISABLED)
    if (query.status) {
      where.status = query.status;
    }

    // Bộ lọc 2: Tình trạng địa chỉ dẫn xuất (hasAddress)
    if (query.hasAddress !== undefined) {
      if (query.hasAddress === true) {
        where.addressText = { not: null };
        where.latitude = { not: null };
        where.longitude = { not: null };
      } else if (query.hasAddress === false) {
        where.OR = [
          { addressText: null },
          { latitude: null },
          { longitude: null },
        ];
      }
    }

    // Tìm kiếm theo họ tên hoặc mã học sinh
    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      const searchCondition = {
        OR: [
          { fullName: { contains: searchTerm, mode: 'insensitive' as const } },
          { code: { contains: searchTerm, mode: 'insensitive' as const } },
        ],
      };

      if (where.OR) {
        where.AND = [searchCondition];
      } else {
        where.OR = searchCondition.OR;
      }
    }

    // 3. Thực hiện truy vấn song song count và findMany trước phân trang
    const [students, totalItems] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.student.count({ where }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      items: students.map((s) => ({
        id: s.id,
        code: s.code,
        schoolId: s.schoolId,
        fullName: s.fullName,
        guardianPhone: s.guardianPhone,
        avatarUrl: s.avatarUrl,
        addressText: s.addressText,
        province: s.province,
        provinceId: s.provinceId,
        wardId: s.wardId,
        ward: s.ward,
        latitude: s.latitude,
        longitude: s.longitude,
        status: s.status,
        hasAddress: this.computeHasAddress(
          s.addressText,
          s.latitude,
          s.longitude,
        ),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Tạo mới học sinh cho trường học.
   * - Chỉ SCHOOL_ADMIN được phép tạo cho trường của mình.
   * - Bắt buộc kiểm tra ràng buộc địa chỉ: hoặc không có gì (cả 3 null) hoặc có đủ 3 trường hợp lệ.
   * - Tự động sinh Student Code duy nhất (STU + 8 ký tự alphanumeric).
   */
  async createStudent(
    schoolId: string,
    dto: CreateStudentDto,
    file?: Express.Multer.File,
    currentUser?: User,
  ): Promise<StudentItemDto> {
    // 1. Kiểm tra quyền SCHOOL_ADMIN và cách ly trường học
    if (currentUser) {
      if (currentUser.role !== Role.SCHOOL_ADMIN) {
        throw new ForbiddenException(
          'Chỉ Quản trị viên trường học (SCHOOL_ADMIN) mới có quyền tạo học sinh',
        );
      }
      if (currentUser.schoolId !== schoolId) {
        throw new ForbiddenException(
          'Bạn không có quyền tạo học sinh cho trường học khác',
        );
      }
    }

    // 2. Kiểm tra trường học tồn tại và đang hoạt động
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, isActive: true },
    });

    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    if (!school.isActive) {
      throw new BadRequestException(
        'Không thể tạo học sinh cho trường học đang ngừng hoạt động',
      );
    }

    // 3. Kiểm định tính nhất quán dữ liệu địa chỉ (Address Data Invariant)
    const hasText = Boolean(dto.addressText && dto.addressText.trim().length > 0);
    const hasLat = dto.latitude !== undefined && dto.latitude !== null;
    const hasLng = dto.longitude !== undefined && dto.longitude !== null;

    let addressText: string | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (hasText || hasLat || hasLng) {
      if (!(hasText && hasLat && hasLng)) {
        throw new BadRequestException(
          'Nếu cung cấp địa chỉ, bắt buộc phải có đầy đủ Địa chỉ chi tiết, Vĩ độ và Kinh độ hợp lệ',
        );
      }
      addressText = dto.addressText!.trim();
      latitude = dto.latitude!;
      longitude = dto.longitude!;

      if (latitude < -90 || latitude > 90) {
        throw new BadRequestException(
          'Vĩ độ không hợp lệ (phải nằm trong khoảng [-90, 90])',
        );
      }
      if (longitude < -180 || longitude > 180) {
        throw new BadRequestException(
          'Kinh độ không hợp lệ (phải nằm trong khoảng [-180, 180])',
        );
      }
    }

    // 4. Chuẩn hóa số điện thoại người giám hộ
    let cleanPhone = dto.guardianPhone.trim().replace(/[\s\-().]/g, '');
    if (cleanPhone.startsWith('+84')) {
      cleanPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('84') && cleanPhone.length >= 11) {
      cleanPhone = '0' + cleanPhone.slice(2);
    }

    // 5. Upload avatar nếu có
    let avatarUrl: string | null = null;
    let avatarPublicId: string | null = null;

    if (file) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          'Kích thước ảnh đại diện vượt quá giới hạn cho phép (5 MB)',
        );
      }

      const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          'Định dạng tệp ảnh không được hỗ trợ. Chỉ chấp nhận JPEG, PNG hoặc WebP.',
        );
      }

      if (!file.buffer || file.buffer.length === 0) {
        throw new BadRequestException('Tệp ảnh tải lên bị rỗng');
      }

      if (!this.validateImageBuffer(file.buffer, file.mimetype)) {
        throw new BadRequestException(
          'Nội dung tệp ảnh không khớp với định dạng MIME được khai báo',
        );
      }

      if (this.cloudinaryService.isConfigured()) {
        const uploadResult = await this.cloudinaryService.uploadStudentAvatar(
          file.buffer,
          file.originalname,
        );
        avatarUrl = uploadResult.secureUrl;
        avatarPublicId = uploadResult.publicId;
      }
    }

    // 6. Sinh Student Code duy nhất với vòng lặp thử lại nếu collision
    let createdStudent: any = null;
    const maxRetries = 5;
    const geography = await administrativeLocationForCoordinates(dto.latitude, dto.longitude);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const code = generateStudentCode();
      try {
        createdStudent = await this.prisma.student.create({
          data: {
            ...geography,
            code,
            schoolId,
            fullName: dto.fullName.trim(),
            guardianPhone: cleanPhone,
            avatarUrl,
            avatarPublicId,
            addressText,
            latitude,
            longitude,
            status: StudentStatus.AVAILABLE,
          },
        });
        break;
      } catch (error: any) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target = error.meta?.target as string[] | undefined;
          if (target && target.includes('code')) {
            this.logger.warn(
              `Xung đột mã học sinh ${code} lần thử ${attempt}/${maxRetries}. Đang thử lại sinh mã mới...`,
            );
            if (attempt === maxRetries) {
              throw new ConflictException(
                'Không thể sinh mã học sinh duy nhất sau nhiều lần thử. Vui lòng thử lại.',
              );
            }
            continue;
          }
        }
        throw error;
      }
    }

    return {
      id: createdStudent.id,
      code: createdStudent.code,
      schoolId: createdStudent.schoolId,
      fullName: createdStudent.fullName,
      guardianPhone: createdStudent.guardianPhone,
      avatarUrl: createdStudent.avatarUrl,
      addressText: createdStudent.addressText,
      province: createdStudent.province,
      provinceId: createdStudent.provinceId,
      wardId: createdStudent.wardId,
      ward: createdStudent.ward,
      latitude: createdStudent.latitude,
      longitude: createdStudent.longitude,
      status: createdStudent.status,
      hasAddress: this.computeHasAddress(
        createdStudent.addressText,
        createdStudent.latitude,
        createdStudent.longitude,
      ),
      createdAt: createdStudent.createdAt.toISOString(),
      updatedAt: createdStudent.updatedAt.toISOString(),
    };
  }

  /**
   * Xem chi tiết một học sinh theo ID.
   */
  async getStudent(
    schoolId: string,
    studentId: string,
    currentUser?: User,
  ): Promise<StudentDetailResponseDto> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });

    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    if (currentUser && currentUser.role === Role.SCHOOL_ADMIN) {
      if (currentUser.schoolId !== schoolId) {
        throw new ForbiddenException(
          'Bạn không có quyền xem thông tin học sinh của trường học khác',
        );
      }
    }

    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      include: {
        school: {
          select: { name: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh');
    }

    return {
      id: student.id,
      code: student.code,
      schoolId: student.schoolId,
      schoolName: student.school.name,
      fullName: student.fullName,
      guardianPhone: student.guardianPhone,
      avatarUrl: student.avatarUrl,
      addressText: student.addressText,
      province: student.province,
      provinceId: student.provinceId,
      wardId: student.wardId,
      ward: student.ward,
      latitude: student.latitude,
      longitude: student.longitude,
      status: student.status,
      hasAddress: this.computeHasAddress(
        student.addressText,
        student.latitude,
        student.longitude,
      ),
      qrData: student.code,
      parentLinkAudit: student.parentLinkAudit,
      rfidCardUid: student.rfidCardUid ?? null,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
    };
  }

  /**
   * Đánh giá tác động trước khi vô hiệu hóa học sinh (DISABLED)
   */
  async getDisableImpact(
    schoolId: string,
    studentId: string,
    currentUser?: User,
  ): Promise<StudentDisableImpactDto> {
    if (currentUser) {
      if (currentUser.role === Role.SCHOOL_ADMIN && currentUser.schoolId !== schoolId) {
        throw new ForbiddenException('Bạn không có quyền xem thông tin học sinh của trường học khác');
      }
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh');
    }

    // 1. Tìm các RouteStop DRAFT hoặc ACTIVE mà học sinh đang tham gia
    const studentStops = await this.prisma.routeStop.findMany({
      where: {
        studentId,
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
            stops: { select: { studentId: true } },
          },
        },
      },
    });

    const draftPlanIds = new Set<string>();
    const activePlanIds = new Set<string>();
    const routeIds = new Set<string>();
    let emptyRoutesCount = 0;
    const emptyRoutePlans: {
      planId: string;
      planName: string;
      planStatus: RoutePlanStatus;
      routeId: string;
      routeName: string;
    }[] = [];

    for (const stop of studentStops) {
      const plan = stop.route.routePlan;
      if (plan.status === RoutePlanStatus.DRAFT) draftPlanIds.add(plan.id);
      if (plan.status === RoutePlanStatus.ACTIVE) activePlanIds.add(plan.id);
      routeIds.add(stop.routeId);

      const otherStudentsCount = stop.route.stops.filter(
        (s) => s.studentId && s.studentId !== studentId,
      ).length;
      if (otherStudentsCount === 0) {
        emptyRoutesCount++;
        emptyRoutePlans.push({
          planId: plan.id,
          planName: plan.name,
          planStatus: plan.status,
          routeId: stop.route.id,
          routeName: stop.route.name,
        });
      }
    }

    const routeIdArray = Array.from(routeIds);
    let cancellableScheduledTripsCount = 0;
    let frozenTripsCount = 0;

    if (routeIdArray.length > 0) {
      cancellableScheduledTripsCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIdArray },
          status: TripStatus.SCHEDULED,
          actualStartTime: null,
          attendantReadyAt: null,
                NOT: frozenTripWhere,
                serviceDate: { gte: new Date(vietnamToday()) },
          attendances: {
            some: { studentId, excludedAt: null },
          },
        },
      });

      frozenTripsCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIdArray },
          attendances: {
            some: { studentId },
          },
          OR: [
            { status: { in: [TripStatus.IN_PROGRESS, TripStatus.COMPLETED] } },
            { actualStartTime: { not: null } },
            { attendantReadyAt: { not: null } },
          ],
        },
      });
    }

    const expectedFingerprint = createHash('sha256')
      .update(`${studentId}_${routeIdArray.sort().join(',')}`)
      .digest('hex')
      .slice(0, 16);

    const requiresPlanCancellation = emptyRoutePlans.length > 0;

    return {
      studentId: student.id,
      code: student.code,
      fullName: student.fullName,
      schoolId: student.schoolId,
      affectedDraftPlansCount: draftPlanIds.size,
      draftRoutePlansCount: draftPlanIds.size,
      affectedActivePlansCount: activePlanIds.size,
      activeRoutePlansCount: activePlanIds.size,
      affectedRoutesCount: routeIds.size,
      cancellableScheduledTripsCount,
      scheduledTripsCount: cancellableScheduledTripsCount,
      frozenTripsCount,
      emptyRoutesCount,
      emptyRoutesWillCancelTripsCount: emptyRoutesCount,
      emptyRoutePlans,
      requiresPlanCancellation,
      expectedFingerprint,
    };
  }

  /**
   * Cập nhật trạng thái hoạt động của học sinh (AVAILABLE <-> DISABLED).
   * - Chỉ SCHOOL_ADMIN được phép thực hiện cho học sinh của trường mình.
   */
  async updateStatus(
    schoolId: string,
    studentId: string,
    dto: UpdateStudentStatusDto,
    currentUser?: User,
  ): Promise<StudentItemDto> {
    if (currentUser) {
      if (currentUser.role !== Role.SCHOOL_ADMIN) {
        throw new ForbiddenException(
          'Chỉ Quản trị viên trường học (SCHOOL_ADMIN) mới có quyền cập nhật trạng thái học sinh',
        );
      }
      if (currentUser.schoolId !== schoolId) {
        throw new ForbiddenException(
          'Bạn không có quyền thay đổi trạng thái học sinh của trường học khác',
        );
      }
    }

    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh');
    }

    if (dto.status === StudentStatus.DISABLED && student.status !== StudentStatus.DISABLED) {
      // Cascade nguyên tử khi DISABLED
      return this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
        // Serialize enrollment confirmation with this status change using the Student row.
        await tx.$queryRaw`SELECT id FROM students WHERE id=${studentId} FOR UPDATE`;
        const previous = await tx.student.findUniqueOrThrow({where:{id:studentId}});
        const nextVersion = new Date(Math.max(Date.now(), previous.updatedAt.getTime()+1));
        // Disable remains available if Mongo is down. Re-enable below fails closed instead.
        try { await this.enrollments?.invalidateStudent(studentId, nextVersion.toISOString()); } catch { /* PG status and null UID are authoritative. */ }
        // 1. Cập nhật trạng thái học sinh
        const updated = await tx.student.update({
          where: { id: studentId },
          data: { status: StudentStatus.DISABLED, rfidCardUid: null, updatedAt: nextVersion },
        });

        // 2. Tìm các điểm dừng trên các Route DRAFT hoặc ACTIVE
        const studentStops = await tx.routeStop.findMany({
          where: {
            studentId,
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
                stops: {
                  select: { id: true, studentId: true, stopOrder: true },
                },
              },
            },
          },
        });

        // Xác định các tuyến/phương án trở thành rỗng (học sinh này là học sinh cuối cùng)
        const emptyRoutePlans: {
          planId: string;
          planName: string;
          planStatus: RoutePlanStatus;
          routeId: string;
          routeName: string;
        }[] = [];

        for (const stop of studentStops) {
          const otherStudents = stop.route.stops.filter(
            (s) => s.studentId && s.studentId !== studentId,
          );
          if (otherStudents.length === 0) {
            emptyRoutePlans.push({
              planId: stop.route.routePlan.id,
              planName: stop.route.routePlan.name,
              planStatus: stop.route.routePlan.status,
              routeId: stop.route.id,
              routeName: stop.route.name,
            });
          }
        }

        const routeIds = Array.from(new Set(studentStops.map((s) => s.routeId)));

        if (routeIds.length > 0) {
        await captureTripSnapshots(tx, routeIds);
          // Xóa điểm dừng của học sinh khỏi các Route
          await tx.routeStop.deleteMany({
            where: {
              studentId,
              routeId: { in: routeIds },
            },
          });

          // Đánh lại thứ tự stopOrder cho các điểm dừng còn lại trên từng tuyến
          for (const rId of routeIds) {
            const remainingStops = await tx.routeStop.findMany({
              where: { routeId: rId },
              orderBy: { stopOrder: 'asc' },
            });
            for (let idx = 0; idx < remainingStops.length; idx++) {
              const rs = remainingStops[idx];
              if (rs.stopOrder !== idx + 1) {
                await tx.routeStop.update({
                  where: { id: rs.id },
                  data: { stopOrder: idx + 1 },
                });
              }
            }
          }

          // 3. Đồng bộ danh sách học sinh trên các Trip SCHEDULED chưa vận hành
          const unoperatedTrips = await tx.trip.findMany({
            where: {
              routeId: { in: routeIds },
              status: TripStatus.SCHEDULED,
              actualStartTime: null,
              attendantReadyAt: null,
              NOT: frozenTripWhere,
              serviceDate: { gte: new Date(vietnamToday()) },
            },
            include: {
              attendances: true,
            },
          });

          for (const trip of unoperatedTrips) {
            // Loại học sinh khỏi TripAttendance
            await tx.tripAttendance.updateMany({
              where: {
                tripId: trip.id,
                studentId,
                excludedAt: null,
              },
              data: {
                excludedAt: new Date(),
                exclusionReason: 'STUDENT_DISABLED',
              },
            });

            // Đồng bộ routeSnapshot nếu có
            if (trip.routeSnapshot && typeof trip.routeSnapshot === 'object') {
              const snap = trip.routeSnapshot as any;
              if (Array.isArray(snap.stops)) {
                const updatedStops = snap.stops
                  .filter((s: any) => s.studentId !== studentId)
                  .map((s: any, idx: number) => ({ ...s, stopOrder: idx + 1 }));
                await tx.trip.update({
                  where: { id: trip.id },
                  data: {
                    routeSnapshot: {
                      ...snap,
                      stops: updatedStops,
                    },
                  },
                });
              }
            }

            // Hủy các đơn nghỉ phép liên quan của học sinh trên chuyến này
            await tx.leaveNotice.updateMany({
              where: {
                tripId: trip.id,
                studentId,
                status: {
                  in: [
                    LeaveNoticeStatus.RECORDED,
                    LeaveNoticeStatus.PENDING_REPLACEMENT,
                  ],
                },
              },
              data: {
                status: LeaveNoticeStatus.WITHDRAWN,
                processedAt: new Date(),
                processedById: currentUser?.id,
              },
            });

            // Nếu chuyến xe trở thành rỗng (không còn học sinh hoạt động) -> HỦY CHUYẾN
            const activeCount = trip.attendances.filter(
              (a) => a.studentId !== studentId && !a.excludedAt,
            ).length;
            if (activeCount === 0) {
              await tx.trip.update({
                where: { id: trip.id },
                data: {
                  status: TripStatus.CANCELLED,
                  cancellationReason:
                    'Chuyến xe bị hủy tự động do tuyến không còn học sinh sau khi học sinh bị vô hiệu hóa',
                  cancelledAt: new Date(),
                  cancelledById: currentUser?.id,
                },
              });

              await closeCancelledTripTasks(tx, [trip.id]);
      await notifyCancelledTrips(tx, [trip.id], 'student-removal:' + studentId + ':' + trip.id, currentUser?.id);
            }
          }
        }

        // 4. Tự động hủy mọi yêu cầu cập nhật PENDING của học sinh
        await tx.studentUpdateRequest.updateMany({
          where: {
            studentId,
            status: RequestStatus.PENDING,
          },
          data: {
            status: RequestStatus.CANCELLED,
            resolution: {
              outcome: 'CANCELLED_DUE_TO_DISABLED',
              cancelledAt: new Date().toISOString(),
            },
          },
        });

        let message = 'Đã vô hiệu hóa học sinh thành công.';
        const requiresPlanCancellation = emptyRoutePlans.length > 0;
        if (requiresPlanCancellation) {
          const planNames = Array.from(new Set(emptyRoutePlans.map((p) => `"${p.planName}"`))).join(', ');
          const routeNames = Array.from(new Set(emptyRoutePlans.map((p) => `"${p.routeName}"`))).join(', ');
          message = `Đã vô hiệu hóa học sinh và loại khỏi tuyến. CẢNH BÁO VI PHẠM BẤT BIẾN: Đây là học sinh cuối cùng của tuyến ${routeNames}. Hệ thống tuyệt đối không cho phép tuyến xe không có học sinh. Bắt buộc phải hủy phương án ${planNames} để tối ưu lại lộ trình.`;
        }

        this.logger.log(`Student ${student.code} was DISABLED with atomic cascade.`);

        return {
          id: updated.id,
          code: updated.code,
          schoolId: updated.schoolId,
          fullName: updated.fullName,
          guardianPhone: updated.guardianPhone,
          avatarUrl: updated.avatarUrl,
          addressText: updated.addressText,
          latitude: updated.latitude,
          longitude: updated.longitude,
          status: updated.status,
          hasAddress: this.computeHasAddress(
            updated.addressText,
            updated.latitude,
            updated.longitude,
          ),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          message,
          emptyRoutePlans,
          requiresPlanCancellation,
        };
      });
    }

    const updated = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM students WHERE id=${studentId} FOR UPDATE`;
      const previous=await tx.student.findUniqueOrThrow({where:{id:studentId}});
      const nextVersion=new Date(Math.max(Date.now(),previous.updatedAt.getTime()+1));
      if(dto.status==='AVAILABLE' && previous.status==='DISABLED') await this.enrollments?.invalidateStudent(studentId,nextVersion.toISOString());
      return tx.student.update({where:{id:studentId},data:{status:dto.status,updatedAt:nextVersion,...(dto.status==='DISABLED'?{rfidCardUid:null}:{})}});
    });

    return {
      id: updated.id,
      code: updated.code,
      schoolId: updated.schoolId,
      fullName: updated.fullName,
      guardianPhone: updated.guardianPhone,
      avatarUrl: updated.avatarUrl,
      addressText: updated.addressText,
      latitude: updated.latitude,
      longitude: updated.longitude,
      status: updated.status,
      hasAddress: this.computeHasAddress(
        updated.addressText,
        updated.latitude,
        updated.longitude,
      ),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Kiểm tra phạm vi phục vụ của địa chỉ học sinh (Chỉ dành cho SCHOOL_ADMIN đúng trường)
   * Hoàn toàn chỉ đọc, tính toán theo bãi đỗ xe trung tâm đang hiệu lực và tỉnh/thành của trường.
   */
  async checkServiceArea(
    schoolId: string,
    dto: ServiceAreaCheckDto,
    currentUser: User,
  ): Promise<ServiceAreaCheckResponseDto> {
    // 1. Kiểm tra quyền SCHOOL_ADMIN và cách ly trường học
    if (currentUser.role !== Role.SCHOOL_ADMIN) {
      throw new ForbiddenException(
        'Chỉ Quản trị viên trường học (SCHOOL_ADMIN) mới có quyền kiểm tra phạm vi phục vụ',
      );
    }
    if (currentUser.schoolId !== schoolId) {
      throw new ForbiddenException(
        'Bạn không có quyền kiểm tra phạm vi phục vụ cho trường học khác',
      );
    }

    // 2. Lấy thông tin trường học hiệu lực (tính theo ngày Việt Nam)
    const today = vietnamToday();
    const school = await effectiveSchool(this.prisma, schoolId, today);
    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    // 3. Lấy cấu hình bãi đỗ xe trung tâm đang hiệu lực
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'PARKING_LOT' },
    });

    const val = setting?.value as any;
    if (!val || typeof val !== 'object') {
      return { status: ServiceAreaStatus.UNAVAILABLE };
    }

    const scheduled = val.scheduledChange;
    const isDue =
      scheduled?.effectiveDate && String(scheduled.effectiveDate) <= today;

    const parkingLat = Number(isDue ? scheduled.newLatitude : val.latitude);
    const parkingLng = Number(isDue ? scheduled.newLongitude : val.longitude);
    const maxRadiusKm = Number(val.maxOperatingRadiusKm ?? 50);

    if (
      !Number.isFinite(parkingLat) ||
      !Number.isFinite(parkingLng) ||
      Math.abs(parkingLat) > 90 ||
      Math.abs(parkingLng) > 180 ||
      !Number.isFinite(maxRadiusKm) ||
      maxRadiusKm <= 0
    ) {
      return { status: ServiceAreaStatus.UNAVAILABLE };
    }

    // 4. Kiểm tra bán kính Haversine (metresBetween)
    const distanceMeters = metresBetween(
      { latitude: parkingLat, longitude: parkingLng },
      { latitude: dto.latitude, longitude: dto.longitude },
    );
    const maxRadiusMeters = maxRadiusKm * 1000;

    if (distanceMeters > maxRadiusMeters) {
      return { status: ServiceAreaStatus.OUT_OF_SERVICE_AREA };
    }

    // 5. Kiểm tra tỉnh/thành nếu trường đã có thông tin tỉnh
    const schoolProvince = school.province?.trim();
    if (schoolProvince) {
      const studentProvince = (
        await provinceForCoordinates(dto.latitude, dto.longitude)
      )?.trim();

      if (
        studentProvince &&
        schoolProvince.toLowerCase() !== studentProvince.toLowerCase()
      ) {
        return { status: ServiceAreaStatus.OUT_OF_SERVICE_AREA };
      }
    }

    return { status: ServiceAreaStatus.IN_SERVICE_AREA };
  }

  // ==========================================
  // BULK IMPORT & EXPORT EXCEL METHODS
  // ==========================================

  /**
   * Tải tệp mẫu Excel .xlsx cho School Admin
   */
  async getImportTemplate(schoolId: string, currentUser: User): Promise<Buffer> {
    if (currentUser.role !== Role.SCHOOL_ADMIN || currentUser.schoolId !== schoolId) {
      throw new ForbiddenException('Chỉ Quản trị viên trường học đúng trường mới có quyền tải tệp mẫu');
    }
    return getStudentImportTemplateBuffer();
  }

  /**
   * Helper phân tích cú pháp và kiểm tra toàn bộ dòng trong tệp Excel
   */
  private async parseAndValidateImportRows(
    schoolId: string,
    fileBuffer: Buffer,
  ): Promise<{
    totalRows: number;
    validRows: Array<{
      rowNumber: number;
      fullName: string;
      phone: string;
      addressText: string | null;
      latitude: number | null;
      longitude: number | null;
      geography?: any;
    }>;
    errors: BulkImportRowErrorDto[];
  }> {
    const errors: BulkImportRowErrorDto[] = [];
    const validRows: Array<{
      rowNumber: number;
      fullName: string;
      phone: string;
      addressText: string | null;
      latitude: number | null;
      longitude: number | null;
      geography?: any;
    }> = [];

    let parsedRows;
    try {
      parsedRows = parseXlsxBuffer(fileBuffer);
    } catch (err: any) {
      errors.push({
        rowNumber: 1,
        message: err?.message || 'Tệp không đúng định dạng Excel .xlsx hoặc bị hỏng',
      });
      return { totalRows: 0, validRows: [], errors };
    }

    if (!parsedRows || parsedRows.length === 0) {
      errors.push({
        rowNumber: 1,
        message: 'Tệp Excel không chứa bất kỳ dữ liệu nào',
      });
      return { totalRows: 0, validRows: [], errors };
    }

    // Kiểm tra hàng tiêu đề (Row 1)
    const headerRow = parsedRows[0];
    const col0 = (headerRow.cells[0] || '').toLowerCase();
    const col1 = (headerRow.cells[1] || '').toLowerCase();

    if (!col0.includes('họ') && !col0.includes('tên')) {
      errors.push({
        rowNumber: 1,
        field: 'fullName',
        message: 'Cột 1 phải là tiêu đề "Họ và tên học sinh"',
      });
    }
    if (!col1.includes('thoại') && !col1.includes('sđt') && !col1.includes('phone')) {
      errors.push({
        rowNumber: 1,
        field: 'guardianPhone',
        message: 'Cột 2 phải là tiêu đề "Số điện thoại phụ huynh"',
      });
    }

    // Lọc các hàng dữ liệu (bỏ qua hàng tiêu đề và các hàng hoàn toàn trống)
    const dataRows = parsedRows.slice(1).filter((r) => {
      return Object.values(r.cells).some((val) => val && val.trim().length > 0);
    });

    if (dataRows.length === 0) {
      errors.push({
        rowNumber: 1,
        message: 'Tệp không chứa dòng dữ liệu học sinh nào',
      });
      return { totalRows: 0, validRows: [], errors };
    }

    if (dataRows.length > 200) {
      errors.push({
        rowNumber: 1,
        message: `Tệp vượt quá giới hạn tối đa 200 dòng (tìm thấy ${dataRows.length} dòng dữ liệu)`,
      });
      return { totalRows: dataRows.length, validRows: [], errors };
    }

    // Lấy thông tin trường và bãi đỗ xe trung tâm phục vụ kiểm tra phạm vi
    const today = vietnamToday();
    const school = await effectiveSchool(this.prisma, schoolId, today);
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'PARKING_LOT' },
    });

    const val = setting?.value as any;
    let hasParkingConfig = false;
    let parkingLat = 0;
    let parkingLng = 0;
    let maxRadiusMeters = 0;

    if (val && typeof val === 'object') {
      const scheduled = val.scheduledChange;
      const isDue = scheduled?.effectiveDate && String(scheduled.effectiveDate) <= today;
      parkingLat = Number(isDue ? scheduled.newLatitude : val.latitude);
      parkingLng = Number(isDue ? scheduled.newLongitude : val.longitude);
      const maxRadiusKm = Number(val.maxOperatingRadiusKm ?? 50);

      if (
        Number.isFinite(parkingLat) &&
        Number.isFinite(parkingLng) &&
        Math.abs(parkingLat) <= 90 &&
        Math.abs(parkingLng) <= 180 &&
        Number.isFinite(maxRadiusKm) &&
        maxRadiusKm > 0
      ) {
        hasParkingConfig = true;
        maxRadiusMeters = maxRadiusKm * 1000;
      }
    }

    const schoolProvince = school?.province?.trim();
    const seenRows = new Map<string, number>();

    // Duyệt từng dòng dữ liệu
    for (const r of dataRows) {
      const rowNum = r.rowNumber;
      const fullName = (r.cells[0] || '').trim();
      const rawPhone = (r.cells[1] || '').trim();
      const addressText = (r.cells[2] || '').trim();
      const rawLat = (r.cells[3] || '').trim();
      const rawLng = (r.cells[4] || '').trim();

      let rowHasError = false;

      // 1. Kiểm tra Họ và tên
      if (!fullName) {
        errors.push({
          rowNumber: rowNum,
          field: 'fullName',
          message: 'Họ và tên học sinh không được để trống',
        });
        rowHasError = true;
      } else if (fullName.length > 100) {
        errors.push({
          rowNumber: rowNum,
          field: 'fullName',
          message: 'Họ và tên học sinh không được vượt quá 100 ký tự',
        });
        rowHasError = true;
      }

      // 2. Kiểm tra Số điện thoại phụ huynh
      let cleanPhone = '';
      if (!rawPhone) {
        errors.push({
          rowNumber: rowNum,
          field: 'guardianPhone',
          message: 'Số điện thoại phụ huynh không được để trống',
        });
        rowHasError = true;
      } else {
        cleanPhone = rawPhone.replace(/[\s\-().]/g, '');
        if (cleanPhone.startsWith('+84')) {
          cleanPhone = '0' + cleanPhone.slice(3);
        } else if (cleanPhone.startsWith('84') && cleanPhone.length >= 11) {
          cleanPhone = '0' + cleanPhone.slice(2);
        }

        if (!/^0\d{9}$/.test(cleanPhone)) {
          errors.push({
            rowNumber: rowNum,
            field: 'guardianPhone',
            message: `Số điện thoại phụ huynh không hợp lệ (${rawPhone}). Vui lòng nhập 10 chữ số (bắt đầu bằng 0)`,
          });
          rowHasError = true;
        }
      }

      // 3. Kiểm tra Địa chỉ và Tọa độ (Cả 3 cùng có hoặc cả 3 cùng để trống)
      const hasAddr = addressText.length > 0;
      const hasLat = rawLat.length > 0;
      const hasLng = rawLng.length > 0;

      let lat: number | null = null;
      let lng: number | null = null;

      if (hasAddr || hasLat || hasLng) {
        if (!(hasAddr && hasLat && hasLng)) {
          errors.push({
            rowNumber: rowNum,
            field: 'addressText',
            message: 'Nếu nhập địa chỉ, bắt buộc phải có đủ cả Địa chỉ đón/trả, Vĩ độ và Kinh độ',
          });
          rowHasError = true;
        } else {
          lat = parseFloat(rawLat);
          lng = parseFloat(rawLng);

          if (isNaN(lat) || lat < -90 || lat > 90) {
            errors.push({
              rowNumber: rowNum,
              field: 'latitude',
              message: `Vĩ độ không hợp lệ (${rawLat}). Phải là số từ -90 đến 90`,
            });
            rowHasError = true;
          }
          if (isNaN(lng) || lng < -180 || lng > 180) {
            errors.push({
              rowNumber: rowNum,
              field: 'longitude',
              message: `Kinh độ không hợp lệ (${rawLng}). Phải là số từ -180 đến 180`,
            });
            rowHasError = true;
          }

          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            if (hasParkingConfig) {
              const distanceMeters = metresBetween(
                { latitude: parkingLat, longitude: parkingLng },
                { latitude: lat, longitude: lng },
              );
              if (distanceMeters > maxRadiusMeters) {
                errors.push({
                  rowNumber: rowNum,
                  field: 'addressText',
                  message: `Tọa độ nằm ngoài phạm vi phục vụ (${(distanceMeters / 1000).toFixed(1)} km / ${(maxRadiusMeters / 1000).toFixed(1)} km)`,
                });
                rowHasError = true;
              } else if (schoolProvince) {
                const studentProvince = (await provinceForCoordinates(lat, lng))?.trim();
                if (studentProvince && schoolProvince.toLowerCase() !== studentProvince.toLowerCase()) {
                  errors.push({
                    rowNumber: rowNum,
                    field: 'addressText',
                    message: `Tọa độ thuộc ${studentProvince}, khác tỉnh/thành với trường (${schoolProvince})`,
                  });
                  rowHasError = true;
                }
              }
            } else {
              errors.push({
                rowNumber: rowNum,
                field: 'addressText',
                message: 'Chưa thể kiểm tra phạm vi do bãi đỗ xe trung tâm chưa được cấu hình',
              });
              rowHasError = true;
            }
          }
        }
      }

      // 4. Phát hiện dòng trùng lặp hoàn toàn trong cùng tệp
      const rowKey = `${fullName.toLowerCase()}|${cleanPhone}|${addressText.toLowerCase()}|${lat}|${lng}`;
      if (seenRows.has(rowKey)) {
        errors.push({
          rowNumber: rowNum,
          field: 'row',
          message: `Dòng này trùng lặp với dòng ${seenRows.get(rowKey)} trong tệp`,
        });
        rowHasError = true;
      } else {
        seenRows.set(rowKey, rowNum);
      }

      if (!rowHasError) {
        validRows.push({
          rowNumber: rowNum,
          fullName,
          phone: cleanPhone,
          addressText: hasAddr ? addressText : null,
          latitude: lat,
          longitude: lng,
        });
      }
    }

    return { totalRows: dataRows.length, validRows, errors };
  }

  /**
   * Preview kiểm tra toàn bộ tệp Excel trước khi nhập
   */
  async previewImport(
    schoolId: string,
    file: Express.Multer.File,
    currentUser: User,
  ): Promise<BulkImportPreviewResponseDto> {
    if (currentUser.role !== Role.SCHOOL_ADMIN || currentUser.schoolId !== schoolId) {
      throw new ForbiddenException('Chỉ Quản trị viên trường học đúng trường mới có quyền xem trước tệp nhập');
    }

    const { totalRows, validRows, errors } = await this.parseAndValidateImportRows(
      schoolId,
      file.buffer,
    );

    const errorRowSet = new Set(errors.map((e) => e.rowNumber));
    const invalidRows = errorRowSet.size;
    const validRowsCount = Math.max(0, totalRows - invalidRows);

    if (errors.length === 0 && validRows.length > 0) {
      // Sinh previewToken có chữ ký số HMAC, thời hạn 30 phút
      const fileHash = createHash('sha256').update(file.buffer).digest('hex');
      const payload = JSON.stringify({
        schoolId,
        fileHash,
        totalRows: validRows.length,
        exp: Date.now() + 30 * 60 * 1000,
      });
      const secret = process.env.JWT_SECRET || 'roadtoschool-secret-key';
      const sig = createHmac('sha256', secret).update(payload).digest('hex');
      const previewToken = `${Buffer.from(payload).toString('base64url')}.${sig}`;

      return {
        totalRows: validRows.length,
        validRows: validRows.length,
        invalidRows: 0,
        errors: [],
        previewToken,
      };
    }

    return {
      totalRows,
      validRows: validRowsCount,
      invalidRows,
      errors,
    };
  }

  /**
   * Xác nhận nhập học sinh từ tệp Excel trong 1 transaction nguyên tử
   */
  async commitImport(
    schoolId: string,
    file: Express.Multer.File,
    dto: BulkImportCommitDto,
    currentUser: User,
  ): Promise<BulkImportCommitResponseDto> {
    if (currentUser.role !== Role.SCHOOL_ADMIN || currentUser.schoolId !== schoolId) {
      throw new ForbiddenException('Chỉ Quản trị viên trường học đúng trường mới có quyền xác nhận nhập');
    }

    // 1. Kiểm tra tính hợp lệ và chữ ký của previewToken
    const tokenParts = dto.previewToken.split('.');
    if (tokenParts.length !== 2) {
      throw new ConflictException('Mã xem trước (previewToken) không hợp lệ');
    }

    const [payloadB64, sig] = tokenParts;
    const secret = process.env.JWT_SECRET || 'roadtoschool-secret-key';
    let tokenData: any;

    try {
      const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const expectedSig = createHmac('sha256', secret).update(payloadStr).digest('hex');
      if (sig !== expectedSig) {
        throw new ConflictException('Chữ ký của mã xem trước không hợp lệ');
      }
      tokenData = JSON.parse(payloadStr);
    } catch (err: any) {
      throw new ConflictException('Mã xem trước (previewToken) không thể giải mã hoặc đã bị thay đổi');
    }

    if (tokenData.exp < Date.now()) {
      throw new ConflictException('Phiên xem trước đã hết hạn. Vui lòng tải lên và xem trước lại tệp.');
    }

    if (tokenData.schoolId !== schoolId) {
      throw new ConflictException('Mã xem trước không thuộc trường học hiện tại');
    }

    const fileHash = createHash('sha256').update(file.buffer).digest('hex');
    if (tokenData.fileHash !== fileHash) {
      throw new ConflictException('Nội dung tệp tải lên không khớp với phiên xem trước');
    }

    // 2. Kiểm tra biên nhận idempotency trước khi vào transaction
    const receiptKey = (`imp_${dto.importKey.replace(/-/g, '')}`).slice(0, 50);
    const existingReceipt = await this.prisma.systemSetting.findUnique({
      where: { key: receiptKey },
    });

    if (existingReceipt) {
      const recVal = existingReceipt.value as any;
      if (recVal?.fileHash === fileHash) {
        // Tái lặp idempotent: trả về kết quả đã commit trước đó
        return {
          importedCount: Number(recVal.importedCount ?? 0),
          importKey: dto.importKey,
        };
      }
      throw new ConflictException('Khóa importKey đã được sử dụng cho một tệp khác');
    }

    // 3. Phân tích và kiểm tra lại toàn bộ dòng để đảm bảo tính nhất quán
    const { totalRows, validRows, errors } = await this.parseAndValidateImportRows(
      schoolId,
      file.buffer,
    );

    if (errors.length > 0 || validRows.length === 0) {
      throw new UnprocessableEntityException({
        message: 'Tệp không còn hợp lệ hoặc chứa lỗi dòng',
        errors,
      });
    }

    // 4. Geocode địa lý cho các dòng có tọa độ (Thực hiện ngoài Transaction để tránh block DB)
    for (const item of validRows) {
      if (item.latitude !== null && item.longitude !== null) {
        item.geography = await administrativeLocationForCoordinates(item.latitude, item.longitude);
      }
    }

    // 5. Ghi cả lô vào DB trong đúng một Prisma Transaction
    const importedCount = await this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
      await assertSchoolWritable(tx, schoolId);

      // Kiểm tra lại receipt trong transaction chống race condition
      const inTxReceipt = await tx.systemSetting.findUnique({
        where: { key: receiptKey },
      });
      if (inTxReceipt) {
        return Number((inTxReceipt.value as any)?.importedCount ?? 0);
      }

      const usedCodes = new Set<string>();
      const studentRecords: Prisma.StudentCreateManyInput[] = [];

      for (const row of validRows) {
        let code = generateStudentCode();
        while (usedCodes.has(code)) {
          code = generateStudentCode();
        }
        usedCodes.add(code);

        studentRecords.push({
          code,
          schoolId,
          fullName: row.fullName,
          guardianPhone: row.phone,
          addressText: row.addressText,
          latitude: row.latitude,
          longitude: row.longitude,
          provinceId: row.geography?.provinceId ?? null,
          province: row.geography?.province ?? null,
          wardId: row.geography?.wardId ?? null,
          ward: row.geography?.ward ?? null,
          status: StudentStatus.AVAILABLE,
        });
      }

      // Tạo toàn bộ học sinh - không dùng skipDuplicates để đảm bảo tính nguyên tử
      await tx.student.createMany({
        data: studentRecords,
        skipDuplicates: false,
      });

      // Lưu biên nhận hoàn tất vào SystemSetting trong cùng transaction
      await tx.systemSetting.create({
        data: {
          id: randomUUID(),
          key: receiptKey,
          value: {
            actorId: currentUser.id,
            schoolId,
            fileHash,
            importedCount: studentRecords.length,
            committedAt: new Date().toISOString(),
          },
          updatedById: currentUser.id,
        },
      });

      return studentRecords.length;
    });

    return {
      importedCount,
      importKey: dto.importKey,
    };
  }

  /**
   * Tra cứu biên nhận kết quả nhập khi mất kết nối
   */
  async getImportReceipt(
    schoolId: string,
    importKey: string,
    currentUser: User,
  ): Promise<BulkImportCommitResponseDto> {
    if (currentUser.role !== Role.SCHOOL_ADMIN || currentUser.schoolId !== schoolId) {
      throw new ForbiddenException('Chỉ Quản trị viên trường học đúng trường mới có quyền tra cứu biên nhận');
    }

    const receiptKey = (`imp_${importKey.replace(/-/g, '')}`).slice(0, 50);
    const receipt = await this.prisma.systemSetting.findUnique({
      where: { key: receiptKey },
    });

    if (!receipt || (receipt.value as any)?.schoolId !== schoolId) {
      throw new NotFoundException('Chưa tìm thấy biên nhận cho khóa import này');
    }

    return {
      importedCount: Number((receipt.value as any)?.importedCount ?? 0),
      importKey,
    };
  }

  /**
   * Xuất danh sách học sinh ra file Excel .xlsx
   */
  async exportStudents(
    schoolId: string,
    dto: BulkExportDto,
    currentUser: User,
  ): Promise<Buffer> {
    if (currentUser.role !== Role.SCHOOL_ADMIN || currentUser.schoolId !== schoolId) {
      throw new ForbiddenException('Chỉ Quản trị viên trường học đúng trường mới có quyền xuất Excel');
    }

    let students: any[] = [];

    if (dto.scope === BulkExportScope.SELECTED) {
      if (!dto.studentIds || dto.studentIds.length === 0) {
        throw new BadRequestException('Danh sách studentIds không được để trống khi chọn phạm vi SELECTED');
      }

      students = await this.prisma.student.findMany({
        where: {
          id: { in: dto.studentIds },
          schoolId,
        },
        orderBy: { fullName: 'asc' },
      });

      if (students.length !== dto.studentIds.length) {
        throw new BadRequestException('Một số học sinh được chọn không tồn tại hoặc không thuộc trường của bạn');
      }
    } else if (dto.scope === BulkExportScope.FILTERED) {
      const where: Prisma.StudentWhereInput = { schoolId };

      if (dto.filters?.routingStatus === 'UNASSIGNED') {
        where.routeStops = {
          none: { route: { routePlan: { status: { in: ['DRAFT', 'ACTIVE'] } } } },
        };
      }
      if (dto.filters?.provinceId) where.provinceId = dto.filters.provinceId;
      if (dto.filters?.wardId) where.wardId = dto.filters.wardId;
      if (dto.filters?.status) where.status = dto.filters.status;

      if (dto.filters?.hasAddress !== undefined) {
        if (dto.filters.hasAddress) {
          where.addressText = { not: null };
          where.latitude = { not: null };
          where.longitude = { not: null };
        } else {
          where.OR = [{ addressText: null }, { latitude: null }, { longitude: null }];
        }
      }

      if (dto.filters?.search && dto.filters.search.trim().length > 0) {
        const s = dto.filters.search.trim();
        const searchCondition = {
          OR: [
            { fullName: { contains: s, mode: 'insensitive' as const } },
            { code: { contains: s, mode: 'insensitive' as const } },
          ],
        };
        if (where.OR) {
          where.AND = [searchCondition];
        } else {
          where.OR = searchCondition.OR;
        }
      }

      const totalCount = await this.prisma.student.count({ where });
      if (totalCount === 0) {
        throw new BadRequestException('Không có học sinh nào phù hợp với bộ lọc hiện tại để xuất');
      }
      if (totalCount > 5000) {
        throw new UnprocessableEntityException('Số lượng học sinh vượt quá giới hạn xuất 5.000 dòng. Vui lòng thu hẹp bộ lọc.');
      }

      students = await this.prisma.student.findMany({
        where,
        orderBy: { fullName: 'asc' },
        take: 5000,
      });
    }

    const headers = [
      'Mã học sinh',
      'Họ và tên học sinh',
      'Số điện thoại phụ huynh',
      'Địa chỉ đón/trả',
      'Tỉnh/thành',
      'Phường/xã',
      'Tình trạng địa chỉ',
      'Trạng thái',
    ];

    const rows = students.map((s) => [
      s.code,
      s.fullName,
      s.guardianPhone,
      s.addressText || '',
      s.province || '',
      s.ward || '',
      s.latitude !== null && s.longitude !== null ? 'Đã có tọa độ' : 'Chưa có địa chỉ',
      s.status === StudentStatus.AVAILABLE ? 'Đang hoạt động' : 'Ngừng hoạt động',
    ]);

    return generateXlsxBuffer('DanhSachHocSinh', headers, rows);
  }
}
