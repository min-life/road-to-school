import { PersonnelCredentialsService } from '../auth/personnel-credentials.service.js';
import { notifyPlan } from '../notifications/notification-events.js';
import { notifyCancelledTrips } from '../notifications/notification-writer.js';
import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role, User, RoutePlanStatus, TripStatus, LeaveNoticeStatus, RouteDirection } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import { validateWeeklySchedule } from './schedule.validator.js';
import {
  getDayOfWeekKey,
  formatDateToVnYmd,
  timeStrToSeconds,
  secondsToTimeStr,
  combineDateAndTimeUtc,
} from '../trips/utils/trip-time.util.js';
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
    } else if (query.status === SchoolStatusFilter.INACTIVE) {
      where.isActive = false;
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

    const formattedItems: SchoolListItemDto[] = items.map((school) => ({
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
    }));

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

  /**
   * Cập nhật trạng thái hoạt động của trường học (isActive).
   * - Deactivate (isActive = false): Cho phép mọi lúc, không ảnh hưởng Users/Sessions.
   * - Reactivate (isActive = true): Chỉ cho phép khi hợp đồng còn hiệu lực
   *   (contractStartDate <= ngày_hiện_tại_VN <= contractEndDate).
   * - Idempotency: Nếu trạng thái không đổi, trả về kết quả thành công ngay không ghi DB.
   */
  async updateStatus(
    id: string,
    dto: UpdateSchoolStatusDto,
  ): Promise<UpdateSchoolStatusResponseDto> {
    const school = await this.prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
        contractStartDate: true,
        contractEndDate: true,
      },
    });

    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    // Idempotent: Nếu trạng thái gửi lên giống hệt trạng thái hiện tại
    if (school.isActive === dto.isActive) {
      return {
        id: school.id,
        isActive: school.isActive,
        message: 'Cập nhật trạng thái trường học thành công',
      };
    }

    // Nếu kích hoạt lại trường (isActive = true), kiểm tra hiệu lực hợp đồng theo giờ Việt Nam
    if (dto.isActive === true) {
      const startDateStr = school.contractStartDate.toISOString().split('T')[0];
      const endDateStr = school.contractEndDate.toISOString().split('T')[0];

      // Lấy ngày hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, định dạng YYYY-MM-DD)
      const currentDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(new Date());

      if (currentDateStr < startDateStr || currentDateStr > endDateStr) {
        throw new BadRequestException(
          'Không thể kích hoạt trường vì hợp đồng chưa có hiệu lực hoặc đã hết hạn',
        );
      }
    }

    // Cập nhật trạng thái duy nhất của School, không đụng chạm đến User hay Session
    const updated = await this.prisma.school.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: { id: true, isActive: true },
    });

    return {
      id: updated.id,
      isActive: updated.isActive,
      message: 'Cập nhật trạng thái trường học thành công',
    };
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
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
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
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
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
   * Cập nhật vị trí trường học kèm cascade hủy các phương án DRAFT/ACTIVE và chuyến xe SCHEDULED
   * Chỉ SYSTEM_ADMIN có quyền thực hiện. Khi sửa, nếu trường có bất kỳ phương án nào (DRAFT/ACTIVE) thì hủy toàn bộ.
   */
  async updateLocation(schoolId: string, dto: UpdateSchoolLocationDto, currentUser: User) {
    if (currentUser.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException('Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) mới có quyền cập nhật địa chỉ trường học');
    }
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    if (dto.expectedFingerprint) {
      const activeOrDraftPlans = await this.prisma.routePlan.findMany({
        where: {
          schoolId,
          status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
        },
        include: {
          routes: { select: { id: true } },
        },
      });
      const dCount = activeOrDraftPlans.filter((p) => p.status === RoutePlanStatus.DRAFT).length;
      const aCount = activeOrDraftPlans.filter((p) => p.status === RoutePlanStatus.ACTIVE).length;
      const rIds = activeOrDraftPlans.flatMap((p) => p.routes.map((r) => r.id));
      const sTripsCount = rIds.length > 0
        ? await this.prisma.trip.count({
            where: { routeId: { in: rIds }, status: TripStatus.SCHEDULED },
          })
        : 0;

      const currentFingerprint = createHash('sha256')
        .update(
          JSON.stringify([
            school.id,
            school.updatedAt.toISOString(),
            dCount,
            aCount,
            sTripsCount,
          ]),
        )
        .digest('hex');

      if (dto.expectedFingerprint !== currentFingerprint) {
        throw new ConflictException(
          'Dữ liệu trạng thái trường học đã thay đổi trong khi bạn đang thao tác. Vui lòng tải lại và kiểm tra lại tác động trước khi lưu.',
        );
      }
    }

    const reason = dto.reason || `Trường học thay đổi địa chỉ sang ${dto.addressText.trim()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const plans = await tx.routePlan.findMany({
        where: {
          schoolId,
          status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
        },
        include: {
          routes: { select: { id: true } },
        },
      });

      const planIds = plans.map((p) => p.id);
      const routeIds = plans.flatMap((p) => p.routes.map((r) => r.id));
      let cancelledTripsCount = 0;

      if (routeIds.length > 0) {
        const scheduledTrips = await tx.trip.findMany({
          where: {
            routeId: { in: routeIds },
            status: TripStatus.SCHEDULED,
          },
          select: { id: true },
        });

        cancelledTripsCount = scheduledTrips.length;
        const tripIds = scheduledTrips.map((t) => t.id);

        if (tripIds.length > 0) {
          await tx.trip.updateMany({
            where: { id: { in: tripIds } },
            data: {
              status: TripStatus.CANCELLED,
              cancellationReason: reason,
              cancelledAt: new Date(),
              cancelledById: currentUser.id,
            },
          });

          await notifyCancelledTrips(tx, tripIds, 'location:' + planIds.slice().sort().join(':'), currentUser.id);
          await tx.leaveNotice.updateMany({
            where: {
              tripId: { in: tripIds },
              status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            },
            data: {
              status: LeaveNoticeStatus.TRIP_CANCELLED,
              processedAt: new Date(),
              processedById: currentUser.id,
            },
          });
        }
      }

      if (planIds.length > 0) {
        await tx.routePlan.updateMany({
          where: { id: { in: planIds } },
          data: {
            status: RoutePlanStatus.CANCELLED,
            cancellationReason: reason,
            cancelledAt: new Date(),
            cancelledById: currentUser.id,
          },
        });
      }

      for (const planId of planIds) await notifyPlan(tx, planId, currentUser.id);
      const updatedSchool = await tx.school.update({
        where: { id: schoolId },
        data: {
          addressText: dto.addressText.trim(),
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });

      return {
        updatedSchool,
        cancelledPlansCount: planIds.length,
        cancelledTripsCount,
      };
    });

    this.logger.log(
      `Đã cập nhật địa chỉ trường ${schoolId}: hủy ${result.cancelledPlansCount} plans, ${result.cancelledTripsCount} trips.`,
    );

    return {
      success: true,
      message: result.cancelledPlansCount > 0
        ? `Cập nhật địa chỉ trường học thành công. Đã hủy ${result.cancelledPlansCount} phương án và ${result.cancelledTripsCount} chuyến xe chưa chạy liên quan.`
        : 'Cập nhật địa chỉ trường học thành công.',
      school: {
        id: result.updatedSchool.id,
        name: result.updatedSchool.name,
        addressText: result.updatedSchool.addressText,
        latitude: result.updatedSchool.latitude,
        longitude: result.updatedSchool.longitude,
      },
      cancelledPlansCount: result.cancelledPlansCount,
      cancelledTripsCount: result.cancelledTripsCount,
    };
  }

  /**
   * Cập nhật / gia hạn hợp đồng trường học (Chỉ SYSTEM_ADMIN và khi trường không có DRAFT/ACTIVE plan)
   */
  async updateContract(schoolId: string, dto: UpdateSchoolContractDto, currentUser: User) {
    if (currentUser.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException('Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) mới có quyền cập nhật hợp đồng');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    // Kiểm tra không có plan DRAFT hoặc ACTIVE
    const activePlans = await this.prisma.routePlan.findMany({
      where: {
        schoolId,
        status: { in: [RoutePlanStatus.DRAFT, RoutePlanStatus.ACTIVE] },
      },
      select: { id: true, name: true, status: true },
    });

    if (activePlans.length > 0) {
      throw new BadRequestException(
        `Không thể cập nhật hợp đồng khi trường vẫn còn ${activePlans.length} phương án DRAFT hoặc ACTIVE. Vui lòng hủy các phương án trước khi thay đổi thời hạn hợp đồng.`,
      );
    }

    const todayVn = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    if (dto.contractStartDate < todayVn) {
      throw new BadRequestException(
        `Ngày bắt đầu hợp đồng mới (${dto.contractStartDate}) phải từ ngày hôm nay (${todayVn}) trở đi theo giờ Việt Nam.`,
      );
    }

    if (dto.contractEndDate < dto.contractStartDate) {
      throw new BadRequestException('Ngày kết thúc hợp đồng phải lớn hơn hoặc bằng ngày bắt đầu hợp đồng');
    }

    const updated = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        contractStartDate: new Date(`${dto.contractStartDate}T00:00:00.000Z`),
        contractEndDate: new Date(`${dto.contractEndDate}T00:00:00.000Z`),
      },
    });

    this.logger.log(`Hợp đồng trường ${schoolId} đã được cập nhật bởi user ${currentUser.id}`);

    return {
      id: updated.id,
      name: updated.name,
      contractStartDate: updated.contractStartDate.toISOString().slice(0, 10),
      contractEndDate: updated.contractEndDate.toISOString().slice(0, 10),
      message: 'Cập nhật thời hạn hợp đồng thành công',
    };
  }

  /**
   * Cập nhật lịch học tuần của trường học kèm cascade:
   * - Hủy các chuyến xe SCHEDULED vào các ngày không còn lịch học
   * - Cập nhật lại khung giờ (scheduledStartTime, scheduledEndTime, scheduledStartAt, scheduledEndAt)
   *   cho các chuyến xe SCHEDULED vào các ngày có lịch học mới
   */
  async updateSchedule(
    schoolId: string,
    dto: UpdateSchoolScheduleDto,
    currentUser: User,
  ): Promise<UpdateSchoolScheduleResponseDto> {
    if (currentUser.role !== Role.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        'Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) mới có quyền cập nhật lịch học trường học',
      );
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    const validatedSchedule = validateWeeklySchedule(dto.weeklySchedule);

    const result = await this.prisma.$transaction(async (tx) => {
      const scheduledTrips = await tx.trip.findMany({
        where: {
          schoolId,
          status: TripStatus.SCHEDULED,
        },
        include: {
          route: {
            select: {
              id: true,
              direction: true,
              estimatedDurationSeconds: true,
            },
          },
        },
      });

      let cancelledTripsCount = 0;
      const notificationTripIds: string[] = [];
      let updatedTripsCount = 0;

      for (const trip of scheduledTrips) {
        const serviceDateStr = formatDateToVnYmd(trip.serviceDate);
        const dayKey = getDayOfWeekKey(serviceDateStr);
        const daySched = validatedSchedule[dayKey];

        if (!daySched || !daySched.start || !daySched.end) {
          // Ngày này không còn trong lịch học mới -> HỦY CHUYẾN
          await tx.trip.update({
            where: { id: trip.id },
            data: {
              status: TripStatus.CANCELLED,
              cancellationReason: 'Lịch học trường đã thay đổi (ngày nghỉ)',
              cancelledAt: new Date(),
              cancelledById: currentUser.id,
            },
          });

          await tx.leaveNotice.updateMany({
            where: {
              tripId: trip.id,
              status: LeaveNoticeStatus.PENDING_REPLACEMENT,
            },
            data: {
              status: LeaveNoticeStatus.TRIP_CANCELLED,
              processedAt: new Date(),
              processedById: currentUser.id,
            },
          });

          cancelledTripsCount++; notificationTripIds.push(trip.id);
        } else {
          // Ngày này vẫn có trong lịch học -> CẬP NHẬT LẠI KHUNG GIỜ
          let depTimeStr: string;
          let arrTimeStr: string;
          const durationSec = trip.route?.estimatedDurationSeconds || 0;

          if (trip.direction === RouteDirection.TO_SCHOOL) {
            arrTimeStr = daySched.start;
            const arrSec = timeStrToSeconds(daySched.start);
            const depSec = arrSec - durationSec;
            depTimeStr = secondsToTimeStr(depSec);
          } else {
            depTimeStr = daySched.end;
            const depSec = timeStrToSeconds(daySched.end);
            const arrSec = depSec + durationSec;
            arrTimeStr = secondsToTimeStr(arrSec);
          }

          const scheduledStartAt = combineDateAndTimeUtc(serviceDateStr, depTimeStr);
          const scheduledEndAt = combineDateAndTimeUtc(serviceDateStr, arrTimeStr);

          const timesChanged =
            trip.scheduledStartTime !== depTimeStr ||
            trip.scheduledEndTime !== arrTimeStr ||
            trip.scheduledStartAt?.getTime() !== scheduledStartAt.getTime() ||
            trip.scheduledEndAt?.getTime() !== scheduledEndAt.getTime();

          if (timesChanged) {
            let updatedSnapshot = trip.routeSnapshot;
            if (updatedSnapshot && typeof updatedSnapshot === 'object') {
              updatedSnapshot = {
                ...(updatedSnapshot as Record<string, any>),
                departureTime: depTimeStr,
              };
            }

            await tx.trip.update({
              where: { id: trip.id },
              data: {
                scheduledStartTime: depTimeStr,
                scheduledEndTime: arrTimeStr,
                scheduledStartAt,
                scheduledEndAt,
                routeSnapshot: updatedSnapshot as any,
              },
            });

            updatedTripsCount++;
          }
        }
      }

      await notifyCancelledTrips(tx, notificationTripIds, 'school-schedule:' + schoolId + ':' + new Date().toISOString(), currentUser.id);
      const updatedSchool = await tx.school.update({
        where: { id: schoolId },
        data: {
          weeklySchedule: validatedSchedule as any,
        },
      });

      return {
        updatedSchool,
        cancelledTripsCount,
        updatedTripsCount,
      };
    });

    this.logger.log(
      `Đã cập nhật lịch học trường ${schoolId}: hủy ${result.cancelledTripsCount} chuyến, cập nhật giờ ${result.updatedTripsCount} chuyến.`,
    );

    return {
      success: true,
      message: `Cập nhật lịch học thành công. Đã hủy ${result.cancelledTripsCount} chuyến xe không phù hợp và cập nhật khung giờ cho ${result.updatedTripsCount} chuyến xe.`,
      school: {
        id: result.updatedSchool.id,
        name: result.updatedSchool.name,
        weeklySchedule: result.updatedSchool.weeklySchedule as Record<string, any>,
      },
      cancelledTripsCount: result.cancelledTripsCount,
      updatedTripsCount: result.updatedTripsCount,
    };
  }
}

