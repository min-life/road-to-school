import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
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
} from './dto/index.js';

@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);

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
    dto: CreateSchoolAdminDto,
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

    if (!email && !phone) {
      throw new BadRequestException(
        'Bắt buộc phải cung cấp ít nhất Email hoặc Số điện thoại',
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

    // 6. Bàn giao mật khẩu tạm ra Backend Console chỉ trong môi trường Development
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(
        `[CONSOLE_CREDENTIAL_DELIVERY] Tạo tài khoản ${targetRole} thành công:\n` +
          `  - Họ và tên:    ${newUser.fullName}\n` +
          `  - School ID:    ${schoolId}\n` +
          `  - Định danh:    ${email || phone}\n` +
          `  - Mật khẩu tạm: ${tempPassword}\n` +
          `  *(Lưu ý: Chỉ phục vụ Development. Tuyệt đối không trả ra HTTP response)*`,
      );
    }

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
      message: `Tạo tài khoản ${roleNameVi} thành công`,
    };
  }
}
