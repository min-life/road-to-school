import { PersonnelCredentialsService } from '../auth/personnel-credentials.service.js';
import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import * as crypto from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateDriverDto,
  ListDriversQueryDto,
  DriverStatusFilter,
  DriverListResponseDto,
  CreateDriverResponseDto,
  DriverItemDto,
} from './dto/index.js';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  @Inject(PersonnelCredentialsService)
  private readonly credentials: PersonnelCredentialsService;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách tài xế toàn hệ thống do Nhà xe quản lý.
   * Hỗ trợ tìm kiếm, lọc trạng thái hoạt động và phân trang.
   */
  async listDrivers(query: ListDriversQueryDto): Promise<DriverListResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: Role.DRIVER,
    };

    if (query.status === DriverStatusFilter.ACTIVE) {
      where.isActive = true;
    } else if (query.status === DriverStatusFilter.INACTIVE) {
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

    const [drivers, totalItems] = await Promise.all([
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
          isVerified: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      items: drivers.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        email: d.email,
        phone: d.phone,
        role: d.role,
        isActive: d.isActive,
        isVerified: d.isVerified,
        avatarUrl: d.avatarUrl,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
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
   * Tạo mới tài khoản Tài xế thuộc biên chế Nhà xe.
   * - Vai trò: DRIVER
   * - schoolId: null
   * - Bắt buộc Email để bàn giao mật khẩu.
   */
  async createDriver(dto: Omit<CreateDriverDto, 'email'> & { email?: string }): Promise<CreateDriverResponseDto> {
    // 1. Chuẩn hóa Email và Số điện thoại
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
        'Email tài xế là bắt buộc để bàn giao mật khẩu',
      );
    }

    // 2. Kiểm tra trùng lặp định danh
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

    // 3. Sinh mật khẩu ngẫu nhiên an toàn bằng node:crypto và băm bằng bcryptjs
    const tempPassword = crypto.randomBytes(9).toString('base64url'); // 12 ký tự
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // 4. Lưu tài khoản mới vào PostgreSQL
    let newDriver: User;
    try {
      newDriver = await this.prisma.user.create({
        data: {
          fullName: dto.fullName.trim(),
          email,
          phone,
          passwordHash,
          role: Role.DRIVER,
          schoolId: null,
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

    const credentialDeliveryStatus = await this.credentials.deliverCreatedUser(newDriver, tempPassword);

    return {
      id: newDriver.id,
      fullName: newDriver.fullName,
      email: newDriver.email,
      phone: newDriver.phone,
      role: newDriver.role,
      schoolId: newDriver.schoolId,
      isActive: newDriver.isActive,
      isVerified: newDriver.isVerified,
      createdAt: newDriver.createdAt.toISOString(),
      credentialDeliveryStatus,
      message: credentialDeliveryStatus === 'FAILED'
        ? 'Đã tạo tài khoản tài xế nhưng chưa gửi được email mật khẩu'
        : 'Tạo tài khoản tài xế thành công',
    };
  }

  /**
   * Lấy chi tiết thông tin một tài xế theo ID
   */
  async getDriver(id: string): Promise<DriverItemDto> {
    const driver = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.DRIVER,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!driver) {
      throw new NotFoundException('Không tìm thấy tài xế');
    }

    return {
      id: driver.id,
      fullName: driver.fullName,
      email: driver.email,
      phone: driver.phone,
      role: driver.role,
      isActive: driver.isActive,
      isVerified: driver.isVerified,
      avatarUrl: driver.avatarUrl,
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
    };
  }
}
