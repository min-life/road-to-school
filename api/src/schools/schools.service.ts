import { assertSchoolWritable, effectiveSchool } from './school-policy.js';
import { ScheduledChangesService } from './scheduled-changes.service.js';
import { ContractLifecycleService } from './contract-lifecycle.service.js';
import { assertExtensionResources } from './contract-extension-policy.js';
import { contractDate, vietnamToday } from './school-effective-state.js';
import { PersonnelCredentialsService } from '../auth/personnel-credentials.service.js';
import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role, User, RoutePlanStatus, TripStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import { validateWeeklySchedule } from './schedule.validator.js';
import {
  ListSchoolsQueryDto,
  SchoolStatusFilter,
  SchoolListResponseDto,
  SchoolListItemDto,
  SchoolDetailResponseDto,
  UpdateSchoolStatusDto,
  UpdateSchoolStatusResponseDto,
  CreateSchoolDto,
  ListSchoolEmployeesQueryDto,
  SchoolEmployeeRoleFilter,
  SchoolEmployeeStatusFilter,
  SchoolEmployeeListResponseDto,
  CreateSchoolAdminDto,
  CreateSchoolAdminResponseDto,
  SchoolEmployeeDetailResponseDto,
  SchoolLocationImpactDto,
  UpdateSchoolLocationDto,
  UpdateSchoolContractDto,
  UpdateSchoolScheduleDto,
  UpdateSchoolScheduleResponseDto,
} from './dto/index.js';

@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);

  @Inject(PersonnelCredentialsService)
  private readonly credentials: PersonnelCredentialsService;

  @Inject(ScheduledChangesService) private readonly changes: ScheduledChangesService;
  @Inject(ContractLifecycleService) private readonly lifecycle: ContractLifecycleService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Kiểm tra tính hợp lệ của tệp ảnh thông qua magic bytes ở đầu buffer.
   */
  private validateImageMagicBytes(buffer: Buffer, mimetype: string): boolean {
    if (!buffer || buffer.length < 12) return false;
    if (mimetype === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimetype === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
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
   * Tạo trường học mới với dữ liệu multipart form và ảnh cổng trường tùy chọn (Cloudinary).
   * - Hợp đồng: contractEndDate >= contractStartDate
   * - Lịch học: JSON Object hợp lệ với các ngày trong tuần
   * - Ảnh: Nếu có ảnh, upload lên Cloudinary (chấp nhận ảnh mồ côi nếu DB insert sau đó lỗi)
   * - Nếu không có ảnh: không gọi Cloudinary, không yêu cầu Cloudinary credentials
   */
  async create(
    dto: CreateSchoolDto,
    file?: Express.Multer.File,
  ): Promise<SchoolDetailResponseDto> {
    // 1. Kiểm tra thứ tự ngày hợp đồng
    if (dto.contractEndDate < dto.contractStartDate) {
      throw new BadRequestException(
        'Ngày kết thúc hợp đồng phải lớn hơn hoặc bằng ngày bắt đầu',
      );
    }

    // 2. Kiểm tra và chuẩn hóa cấu trúc lịch học tuần
    const validatedSchedule = validateWeeklySchedule(dto.weeklySchedule);

    // 3. Xử lý tải ảnh tùy chọn lên Cloudinary
    let imageUrl: string | null = null;
    let imagePublicId: string | null = null;

    if (file) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          'Kích thước ảnh vượt quá giới hạn tối đa cho phép (5 MB)',
        );
      }

      const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          'Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận JPEG, PNG hoặc WebP',
        );
      }

      if (!file.buffer || file.buffer.length === 0) {
        throw new BadRequestException('Tệp ảnh rỗng hoặc không hợp lệ');
      }

      if (!this.validateImageMagicBytes(file.buffer, file.mimetype)) {
        throw new BadRequestException(
          'Nội dung tệp ảnh không đúng với định dạng được khai báo',
        );
      }

      const uploadResult = await this.cloudinaryService.uploadSchoolImage(
        file.buffer,
        file.originalname,
      );
      imageUrl = uploadResult.secureUrl;
      imagePublicId = uploadResult.publicId;
    }

    // 4. Lưu bản ghi trường học vào PostgreSQL qua Prisma
    const school = await this.prisma.school.create({
      data: {
        name: dto.name,
        addressText: dto.addressText,
        latitude: dto.latitude,
        longitude: dto.longitude,
        imageUrl,
        imagePublicId,
        contractStartDate: new Date(`${dto.contractStartDate}T00:00:00.000Z`),
        contractEndDate: new Date(`${dto.contractEndDate}T00:00:00.000Z`),
        weeklySchedule: validatedSchedule as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    return {
      id: school.id,
      name: school.name,
      addressText: school.addressText,
      latitude: school.latitude,
      longitude: school.longitude,
      imageUrl: school.imageUrl,
      imagePublicId: school.imagePublicId,
      contractStartDate: school.contractStartDate.toISOString().split('T')[0],
      contractEndDate: school.contractEndDate.toISOString().split('T')[0],
      weeklySchedule:
        typeof school.weeklySchedule === 'string'
          ? JSON.parse(school.weeklySchedule)
          : (school.weeklySchedule as Record<string, any>),
      isActive: school.isActive,
      createdAt: school.createdAt.toISOString(),
      updatedAt: school.updatedAt.toISOString(),
      employeeCount: 0,
    };
  }

  /**
   * Lấy danh sách trường học đối tác có phân trang, tìm kiếm và lọc trạng thái.
   * Truy vấn tối ưu: phân trang tại Database, tính toán số lượng nhân viên qua _count
   * (chỉ đếm SCHOOL_ADMIN và BUS_ATTENDANT), loại trừ triệt để N+1 query.
   */
  async findAll(query: ListSchoolsQueryDto): Promise<SchoolListResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.SchoolWhereInput = {};

    // Tìm kiếm theo tên trường (không phân biệt chữ hoa/thường)
    if (query.search && query.search.trim().length > 0) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    // Lọc theo trạng thái hoạt động
    if (query.status === SchoolStatusFilter.ACTIVE) {
      where.isActive = true;
      where.scheduledChanges = { none: { type: 'INACTIVE', status: 'PENDING', effectiveDate: { lte: new Date(vietnamToday()) } } };
    } else if (query.status === SchoolStatusFilter.INACTIVE) {
      where.OR = [{ isActive: false }, { scheduledChanges: { some: { type: 'INACTIVE', status: 'PENDING', effectiveDate: { lte: new Date(vietnamToday()) } } } }];
    }

    // Thực hiện truy vấn song song lấy danh sách và tổng số bản ghi
    const [items, totalItems] = await Promise.all([
      this.prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          _count: {
            select: {
              users: {
                where: {
                  role: { in: [Role.SCHOOL_ADMIN, Role.BUS_ATTENDANT] },
                },
              },
            },
          },
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    const formattedItems: SchoolListItemDto[] = await Promise.all(items.map(async stored => {
      const school = { ...stored, ...await effectiveSchool(this.prisma, stored.id) };
      return ({
      id: school.id,
      name: school.name,
      addressText: school.addressText,
      latitude: school.latitude,
      longitude: school.longitude,
      imageUrl: school.imageUrl,
      contractStartDate: school.contractStartDate.toISOString().split('T')[0],
      contractEndDate: school.contractEndDate.toISOString().split('T')[0],
      isActive: school.isActive,
      createdAt: school.createdAt.toISOString(),
      employeeCount: school._count.users,
    }); }));

    return {
      items: formattedItems,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Lấy thông tin chi tiết của 1 trường học theo ID.
   * SYSTEM_ADMIN có thể xem chi tiết trường học dù trường đang ACTIVE hay INACTIVE.
   */
  async findOne(id: string): Promise<SchoolDetailResponseDto> {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: {
              where: {
                role: { in: [Role.SCHOOL_ADMIN, Role.BUS_ATTENDANT] },
              },
            },
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    Object.assign(school, await effectiveSchool(this.prisma, id));
    const weeklySchedule =
      typeof school.weeklySchedule === 'string'
        ? JSON.parse(school.weeklySchedule)
        : (school.weeklySchedule as Record<string, any>);

    return {
      id: school.id,
      name: school.name,
      addressText: school.addressText,
      latitude: school.latitude,
      longitude: school.longitude,
      imageUrl: school.imageUrl,
      imagePublicId: school.imagePublicId,
      contractStartDate: school.contractStartDate.toISOString().split('T')[0],
      contractEndDate: school.contractEndDate.toISOString().split('T')[0],
      weeklySchedule,
      isActive: school.isActive,
      createdAt: school.createdAt.toISOString(),
      updatedAt: school.updatedAt.toISOString(),
      employeeCount: school._count.users,
    };
  }

  /** Inactive is scheduled; reactivation reconciles due changes and requires fresh login. */
  async updateStatus(id: string, dto: UpdateSchoolStatusDto, actor?: User): Promise<UpdateSchoolStatusResponseDto> {
    if (!actor) throw new ForbiddenException();
    if (dto.isActive) return this.changes.reactivate(id, actor);
    const result = await this.changes.schedule(id, 'INACTIVE', { isActive: false }, dto.effectiveDate, actor);
    return { id, isActive: result.school.isActive, message: 'Đã hẹn ngừng hoạt động trường', scheduledChangeId: result.scheduledChangeId, effectiveDate: result.effectiveDate, changeStatus: result.changeStatus };
  }

  /**
   * Lấy danh sách nhân viên trực thuộc một trường học (chỉ SCHOOL_ADMIN và BUS_ATTENDANT).
   * Hỗ trợ tìm kiếm theo tên/email/SĐT, lọc theo vai trò, lọc theo trạng thái và phân trang tại Database.
   * Cho phép SYSTEM_ADMIN xem danh sách nhân viên kể cả khi trường đang INACTIVE.
   */
  async findEmployees(
    schoolId: string,
    query: ListSchoolEmployeesQueryDto,
    currentUser?: User,
  ): Promise<SchoolEmployeeListResponseDto> {
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
          'Bạn không có quyền xem nhân viên của trường học khác',
        );
      }
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    // 2. Xây dựng điều kiện lọc theo vai trò
    // - SCHOOL_ADMIN chỉ được xem BUS_ATTENDANT (Giáo viên) của trường mình
    // - SYSTEM_ADMIN có thể xem cả SCHOOL_ADMIN và BUS_ATTENDANT
    let allowedRoles: Role[];
    if (currentUser && currentUser.role === Role.SCHOOL_ADMIN) {
      allowedRoles = [Role.BUS_ATTENDANT];
    } else {
      allowedRoles = query.role
        ? [query.role as unknown as Role]
        : [Role.SCHOOL_ADMIN, Role.BUS_ATTENDANT];
    }

    const where: Prisma.UserWhereInput = {
      schoolId,
      role: { in: allowedRoles },
    };

    if (query.status === SchoolEmployeeStatusFilter.ACTIVE) {
      where.isActive = true;
    } else if (query.status === SchoolEmployeeStatusFilter.INACTIVE) {
      where.isActive = false;
    }

    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      where.OR = [
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // 3. Thực hiện truy vấn song song lấy danh sách và tổng số bản ghi
    const [users, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      items: users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
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
   * Xem chi tiết một nhân viên trường học (SCHOOL_ADMIN hoặc BUS_ATTENDANT).
   */
  async findEmployeeDetail(
    schoolId: string,
    employeeId: string,
    currentUser?: User,
  ): Promise<SchoolEmployeeDetailResponseDto> {
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
          'Bạn không có quyền xem nhân viên của trường học khác',
        );
      }
    }

    const employee = await this.prisma.user.findFirst({
      where: {
        id: employeeId,
        schoolId,
        role: { in: [Role.SCHOOL_ADMIN, Role.BUS_ATTENDANT] },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        schoolId: true,
        isActive: true,
        isVerified: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Không tìm thấy nhân viên trường học');
    }

    // SCHOOL_ADMIN chỉ được xem chi tiết BUS_ATTENDANT
    if (
      currentUser &&
      currentUser.role === Role.SCHOOL_ADMIN &&
      employee.role !== Role.BUS_ATTENDANT
    ) {
      throw new NotFoundException('Không tìm thấy nhân viên trường học');
    }

    return {
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      schoolId: employee.schoolId!,
      isActive: employee.isActive,
      isVerified: employee.isVerified,
      avatarUrl: employee.avatarUrl,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    };
  }

  /**
   * Tạo mới tài khoản Quản trị trường học (SCHOOL_ADMIN) hoặc Giáo viên (BUS_ATTENDANT) trực thuộc trường.
   * - SYSTEM_ADMIN tạo SCHOOL_ADMIN.
   * - SCHOOL_ADMIN tạo BUS_ATTENDANT cho trường mình.
   */
  async createSchoolAdmin(
    schoolId: string,
    dto: Omit<CreateSchoolAdminDto, 'email'> & { email?: string },
    currentUser?: User,
  ): Promise<CreateSchoolAdminResponseDto> {
    // 1. Kiểm tra trường học tồn tại và trạng thái hoạt động
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, isActive: true },
    });

    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    // Kiểm tra cách ly trường học đối với SCHOOL_ADMIN
    if (currentUser && currentUser.role === Role.SCHOOL_ADMIN) {
      if (currentUser.schoolId !== schoolId) {
        throw new ForbiddenException(
          'Bạn không có quyền tạo nhân viên cho trường học khác',
        );
      }
    }

    // Quyết định vai trò tạo dựa trên thẩm quyền của người thực hiện:
    // - SCHOOL_ADMIN chỉ tạo BUS_ATTENDANT
    // - SYSTEM_ADMIN tạo SCHOOL_ADMIN
    const targetRole =
      currentUser && currentUser.role === Role.SCHOOL_ADMIN
        ? Role.BUS_ATTENDANT
        : Role.SCHOOL_ADMIN;

    const roleNameVi =
      targetRole === Role.BUS_ATTENDANT
        ? 'giáo viên'
        : 'quản trị trường học';

    await assertSchoolWritable(this.prisma, schoolId);
    if (!school.isActive) {
      throw new BadRequestException(
        targetRole === Role.BUS_ATTENDANT
          ? 'Không thể tạo tài khoản giáo viên cho trường học đang ngừng hoạt động.'
          : 'Không thể tạo tài khoản quản trị cho trường học đang ngừng hoạt động.',
      );
    }

    // 2. Chuẩn hóa Email và Số điện thoại
    let email: string | null = null;
    if (dto.email && dto.email.trim().length > 0) {
      email = dto.email.trim().toLowerCase();
    }

    let phone: string | null = null;
    if (dto.phone && dto.phone.trim().length > 0) {
      let cleanPhone = dto.phone.trim().replace(/[\s\-().]/g, '');
      if (cleanPhone.startsWith('+84')) {
        cleanPhone = '0' + cleanPhone.slice(3);
      } else if (cleanPhone.startsWith('84') && cleanPhone.length >= 11) {
        cleanPhone = '0' + cleanPhone.slice(2);
      }
      phone = cleanPhone;
    }

    if (!email) {
      throw new BadRequestException(
        'Email nhân sự là bắt buộc để bàn giao mật khẩu',
      );
    }

    // 3. Kiểm tra trùng lặp Email và Số điện thoại trước khi ghi DB
    const conflictOr: Prisma.UserWhereInput[] = [];
    if (email) conflictOr.push({ email });
    if (phone) conflictOr.push({ phone });

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: conflictOr },
      select: { email: true, phone: true },
    });

    if (existingUser) {
      if (email && existingUser.email === email) {
        throw new ConflictException(
          'Email này đã được sử dụng bởi một tài khoản khác',
        );
      }
      if (phone && existingUser.phone === phone) {
        throw new ConflictException(
          'Số điện thoại này đã được sử dụng bởi một tài khoản khác',
        );
      }
      throw new ConflictException(
        'Thông tin định danh (Email hoặc Số điện thoại) đã tồn tại trên hệ thống',
      );
    }

    // 4. Sinh mật khẩu ngẫu nhiên an toàn bằng node:crypto và băm bằng bcryptjs
    const tempPassword = crypto.randomBytes(9).toString('base64url'); // 12 ký tự ngẫu nhiên an toàn
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // 5. Lưu tài khoản mới vào PostgreSQL qua Prisma
    let newUser: User;
    try {
      newUser = await this.prisma.user.create({
        data: {
          fullName: dto.fullName.trim(),
          email,
          phone,
          passwordHash,
          role: targetRole,
          schoolId,
          isActive: true,
          isVerified: true,
          avatarUrl: null,
        },
      });
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Email hoặc số điện thoại đã tồn tại trên hệ thống',
        );
      }
      throw error;
    }

    const credentialDeliveryStatus = await this.credentials.deliverCreatedUser(newUser, tempPassword);

    return {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      schoolId: newUser.schoolId!,
      isActive: newUser.isActive,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt.toISOString(),
      credentialDeliveryStatus,
      message: credentialDeliveryStatus === 'FAILED'
        ? `Đã tạo tài khoản ${roleNameVi} nhưng chưa gửi được email mật khẩu`
        : `Tạo tài khoản ${roleNameVi} thành công`,
    };
  }

  /**
   * Lấy cài đặt chi tiết của trường học
   */
  async getSchoolSettings(schoolId: string, currentUser: User) {
    if (currentUser.role === Role.SCHOOL_ADMIN && currentUser.schoolId !== schoolId) {
      throw new ForbiddenException('Bạn chỉ có quyền xem cài đặt trường học của mình');
    }
    const school = await effectiveSchool(this.prisma, schoolId);
    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }
    return {
      id: school.id,
      name: school.name,
      addressText: school.addressText,
      latitude: school.latitude,
      longitude: school.longitude,
      imageUrl: school.imageUrl,
      contractStartDate: school.contractStartDate.toISOString().slice(0, 10),
      contractEndDate: school.contractEndDate.toISOString().slice(0, 10),
      weeklySchedule: school.weeklySchedule,
      isActive: school.isActive,
      createdAt: school.createdAt.toISOString(),
      updatedAt: school.updatedAt.toISOString(),
    };
  }

  /**
   * Đánh giá tác động khi thay đổi vị trí trường học (Chỉ SYSTEM_ADMIN)
   */
  async getLocationImpact(
    schoolId: string,
    currentUser: User,
    targetLatitude?: number,
    targetLongitude?: number,
  ): Promise<SchoolLocationImpactDto> {
    if (currentUser.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException('Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) mới có quyền kiểm tra tác động thay đổi vị trí trường học');
    }
    const school = await effectiveSchool(this.prisma, schoolId);
    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    const plans = await this.prisma.routePlan.findMany({
      where: {
        schoolId,
        status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
      },
      include: {
        routes: { select: { id: true } },
      },
    });

    const routeIds = plans.flatMap((p) => p.routes.map((r) => r.id));
    let scheduledTripsCount = 0;
    let inProgressTripsCount = 0;

    if (routeIds.length > 0) {
      scheduledTripsCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIds },
          status: TripStatus.SCHEDULED,
        },
      });
      inProgressTripsCount = await this.prisma.trip.count({
        where: {
          routeId: { in: routeIds },
          status: TripStatus.IN_PROGRESS,
        },
      });
    }

    const draftPlansCount = plans.filter((p) => p.status === RoutePlanStatus.DRAFT).length;
    const activePlansCount = plans.filter((p) => p.status === RoutePlanStatus.ACTIVE).length;
    const cancelledPlansCount = draftPlansCount + activePlansCount;

    const hasCoordinateChanged =
      targetLatitude !== undefined && targetLongitude !== undefined
        ? Math.abs(school.latitude - targetLatitude) > 1e-6 ||
          Math.abs(school.longitude - targetLongitude) > 1e-6
        : true;

    const expectedFingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          school.id,
          school.updatedAt.toISOString(),
          draftPlansCount,
          activePlansCount,
          scheduledTripsCount,
        ]),
      )
      .digest('hex');

    return {
      schoolId: school.id,
      schoolName: school.name,
      currentAddressText: school.addressText,
      currentLatitude: school.latitude,
      currentLongitude: school.longitude,
      hasCoordinateChanged,
      draftPlansCount,
      activePlansCount,
      cancelledPlansCount,
      scheduledTripsCount,
      cancelledTripsCount: scheduledTripsCount,
      inProgressTripsCount,
      inProgressTripsPreservedCount: inProgressTripsCount,
      expectedFingerprint,
      fingerprint: expectedFingerprint,
    };
  }

  /**
   * Hẹn đổi vị trí trường; chỉ hủy phương án cũ khi đến ngày hiệu lực
   * Chỉ SYSTEM_ADMIN; response giữ thông tin đang có hiệu lực và thêm lịch hẹn.
   */
  async updateLocation(schoolId: string, dto: UpdateSchoolLocationDto, actor: User) {
    if (dto.expectedFingerprint) {
      const impact = await this.getLocationImpact(schoolId, actor, dto.latitude, dto.longitude);
      if (impact.expectedFingerprint !== dto.expectedFingerprint) throw new ConflictException('Dữ liệu trường vừa thay đổi. Vui lòng tải lại');
    }
    const result = await this.changes.schedule(schoolId, 'LOCATION', { addressText: dto.addressText.trim(), latitude: dto.latitude, longitude: dto.longitude }, dto.effectiveDate, actor);
    return { success: true, message: 'Đã hẹn đổi địa điểm trường', school: { id: schoolId, name: result.school.name, addressText: result.school.addressText, latitude: result.school.latitude, longitude: result.school.longitude }, cancelledPlansCount: 0, cancelledTripsCount: 0, scheduledChangeId: result.scheduledChangeId, effectiveDate: result.effectiveDate, changeStatus: result.changeStatus };
  }

  /**
   * Cập nhật hợp đồng; gia hạn thuần được phép khi phân công đang có vẫn phù hợp.
   */
  async updateContract(schoolId: string, dto: UpdateSchoolContractDto, currentUser: User) {
    if (currentUser.role !== Role.SYSTEM_ADMIN) throw new ForbiddenException('Chỉ nhà xe được cập nhật hợp đồng');
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM schools WHERE id = ${schoolId} FOR UPDATE`);
      const school = await tx.school.findUnique({ where: { id: schoolId } });
      if (!school) throw new NotFoundException('Không tìm thấy trường học');
      if (dto.expectedUpdatedAt && dto.expectedUpdatedAt !== school.updatedAt.toISOString()) {
        throw new ConflictException('Thông tin trường vừa thay đổi. Vui lòng tải lại');
      }
      if (dto.contractEndDate < dto.contractStartDate) throw new BadRequestException('Ngày kết thúc phải từ ngày bắt đầu trở đi');
      const pendingOutsideContract = await tx.schoolScheduledChange.findFirst({ where: { schoolId, status: 'PENDING', effectiveDate: { gt: new Date(dto.contractEndDate + 'T00:00:00Z') } } });
      if (pendingOutsideContract) throw new ConflictException('Có lịch thay đổi nằm sau ngày hết hợp đồng mới; cần hủy lịch đó trước');
      const existingStart = contractDate(school.contractStartDate);
      const existingEnd = contractDate(school.contractEndDate);
      const extension = dto.contractStartDate === existingStart && dto.contractEndDate >= existingEnd;
      await this.lifecycle.reconcileSchool(tx, school);
      const planCount = await tx.routePlan.count({ where: { schoolId, status: { in: ['DRAFT', 'ACTIVE'] } } });
      if (planCount && !extension) throw new BadRequestException('Khi còn phương án chỉ cho phép giữ ngày bắt đầu và gia hạn ngày kết thúc');
      if (!extension && dto.contractStartDate < vietnamToday()) throw new BadRequestException('Ngày bắt đầu kỳ mới phải từ hôm nay trở đi');
      if (extension && dto.contractEndDate > existingEnd) {
        const fromDate = new Date(school.contractEndDate.getTime() + 86400000);
        await assertExtensionResources(tx, schoolId, fromDate, new Date(dto.contractEndDate + 'T00:00:00.000Z'));
      }
      const updated = await tx.school.update({ where: { id: schoolId }, data: {
        contractStartDate: new Date(dto.contractStartDate + 'T00:00:00.000Z'),
        contractEndDate: new Date(dto.contractEndDate + 'T00:00:00.000Z'),
      } });
      return { id: updated.id, name: updated.name,
        contractStartDate: contractDate(updated.contractStartDate), contractEndDate: contractDate(updated.contractEndDate),
        message: 'Cập nhật thời hạn hợp đồng thành công' };
    }, { timeout: 30000 });
  }

  /**
   * Cập nhật lịch học tuần của trường học kèm cascade:
   * - Hủy các chuyến xe SCHEDULED vào các ngày không còn lịch học
   * - Cập nhật lại khung giờ (scheduledStartTime, scheduledEndTime, scheduledStartAt, scheduledEndAt)
   *   cho các chuyến xe SCHEDULED vào các ngày có lịch học mới
   */
  async updateSchedule(schoolId: string, dto: UpdateSchoolScheduleDto, actor: User): Promise<UpdateSchoolScheduleResponseDto> {
    const schedule = validateWeeklySchedule(dto.weeklySchedule);
    const result = await this.changes.schedule(schoolId, 'SCHEDULE', { weeklySchedule: schedule as unknown as Prisma.InputJsonObject }, dto.effectiveDate, actor);
    return { success: true, message: 'Đã hẹn đổi lịch học', school: { id: schoolId, name: result.school.name, weeklySchedule: result.school.weeklySchedule as Record<string, unknown> }, cancelledTripsCount: 0, updatedTripsCount: 0, scheduledChangeId: result.scheduledChangeId, effectiveDate: result.effectiveDate, changeStatus: result.changeStatus };
  }
}
