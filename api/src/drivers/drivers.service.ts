import { assertInactiveHandover } from '../trips/utils/staff-availability.helper.js';
import { lockOperations } from '../trips/utils/operations-lock.js';
import { PersonnelCredentialsService } from '../auth/personnel-credentials.service.js';
import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Role, User, RoutePlanStatus, TripStatus } from '@prisma/client';
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
  DriverDeactivationImpactDto,
  UpdateDriverStatusDto,
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
    if (!dto.phone || !dto.phone.trim()) {
      throw new BadRequestException('Số điện thoại nhân sự là bắt buộc');
    }

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

  /**
   * Xem trước tác động khi chuyển trạng thái tài xế
   */
  async getDriverDeactivationImpact(driverId: string): Promise<DriverDeactivationImpactDto> {
    const driver = await this.prisma.user.findFirst({
      where: { id: driverId, role: Role.DRIVER },
    });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy tài xế');
    }

    const defaultRoutes = await this.prisma.route.findMany({
      where: {
        defaultDriverId: driverId,
        routePlan: { status: RoutePlanStatus.ACTIVE },
      },
      include: {
        routePlan: { select: { id: true, name: true } },
        school: { select: { name: true } },
      },
    });

    const trips = await this.prisma.trip.findMany({
      where: {
        assignedDriverId: driverId,
        status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
      },
      include: {
        school: { select: { name: true } },
        route: { select: { name: true } },
      },
      orderBy: { serviceDate: 'asc' },
    });

    const inProgressTrips = trips.filter((t) => t.status === TripStatus.IN_PROGRESS);
    const scheduledTrips = trips.filter((t) => t.status === TripStatus.SCHEDULED);

    const canDeactivateDirectly = defaultRoutes.length === 0 && trips.length === 0;
    const hasBlockingInProgress = inProgressTrips.length > 0;

    return {
      driverId: driver.id,
      fullName: driver.fullName,
      email: driver.email,
      isActive: driver.isActive,
      defaultRoutesCount: defaultRoutes.length,
      scheduledTripsCount: scheduledTrips.length,
      inProgressTripsCount: inProgressTrips.length,
      canDeactivateDirectly,
      hasBlockingInProgress,
      affectedRoutes: defaultRoutes.map((r) => ({
        id: r.id,
        name: r.name,
        direction: r.direction,
        schoolName: r.school.name,
        routePlanId: r.routePlan.id,
        routePlanName: r.routePlan.name,
      })),
      affectedTrips: trips.map((t) => ({
        id: t.id,
        date: t.serviceDate.toISOString().split('T')[0],
        direction: t.direction,
        status: t.status,
        routeName: t.route.name,
        schoolName: t.school.name,
      })),
    };
  }

  /**
   * Cập nhật trạng thái hoạt động của tài xế (Bắt buộc chọn người thay thế nếu còn phân công)
   */
  async updateDriverStatus(driverId: string, dto: UpdateDriverStatusDto): Promise<DriverItemDto> {
    const driver = await this.prisma.user.findFirst({
      where: { id: driverId, role: Role.DRIVER },
    });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy tài xế');
    }

    if (dto.isActive === driver.isActive) {
      return this.getDriver(driverId);
    }

    if (dto.isActive) {
      const updated = await this.prisma.user.update({
        where: { id: driverId },
        data: { isActive: true },
      });
      return {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        isActive: updated.isActive,
        isVerified: updated.isVerified,
        avatarUrl: updated.avatarUrl,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    // Chuyển sang INACTIVE:
    // 1. Kiểm tra IN_PROGRESS -> Chặn tuyệt đối
    const inProgressCount = await this.prisma.trip.count({
      where: {
        assignedDriverId: driverId,
        status: TripStatus.IN_PROGRESS,
      },
    });
    if (inProgressCount > 0) {
      throw new BadRequestException('Không thể vô hiệu hóa tài xế đang thực hiện chuyến xe (IN_PROGRESS)');
    }

    // 2. Kiểm tra tuyến mặc định và chuyến SCHEDULED
    const [defaultRoutesCount, scheduledTripsCount] = await Promise.all([
      this.prisma.route.count({
        where: {
          defaultDriverId: driverId,
          routePlan: { status: RoutePlanStatus.ACTIVE },
        },
      }),
      this.prisma.trip.count({
        where: {
          assignedDriverId: driverId,
          status: TripStatus.SCHEDULED,
        },
      }),
    ]);

    const totalActiveAssignments = defaultRoutesCount + scheduledTripsCount;
    if (totalActiveAssignments > 0) {
      if (!dto.replacementUserId) {
        throw new BadRequestException(
          `Bắt buộc chọn tài xế thay thế (replacementUserId) vì tài xế này đang phụ trách ${defaultRoutesCount} tuyến và ${scheduledTripsCount} chuyến xe chưa hoàn thành`,
        );
      }
      if (dto.replacementUserId === driverId) {
        throw new BadRequestException('Tài xế thay thế không được trùng với tài xế hiện tại');
      }

      const replacementDriver = await this.prisma.user.findFirst({
        where: { id: dto.replacementUserId, role: Role.DRIVER },
      });
      if (!replacementDriver) {
        throw new NotFoundException('Không tìm thấy tài xế thay thế');
      }
      if (!replacementDriver.isActive) {
        throw new BadRequestException('Tài xế thay thế phải đang ở trạng thái hoạt động (isActive = true)');
      }

      // Thực hiện bàn giao nguyên tử và thu hồi session
      const updated = await this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
      await assertInactiveHandover(tx, 'assignedDriverId', driverId, dto.replacementUserId);
        await tx.route.updateMany({
          where: {
            defaultDriverId: driverId,
            routePlan: { status: RoutePlanStatus.ACTIVE },
          },
          data: { defaultDriverId: dto.replacementUserId },
        });

        await tx.trip.updateMany({
          where: {
            assignedDriverId: driverId,
            status: TripStatus.SCHEDULED,
          },
          data: { assignedDriverId: dto.replacementUserId },
        });

        await tx.session.updateMany({
          where: { userId: driverId, revokedAt: null },
          data: { revokedAt: new Date(), pushToken: null },
        });

        return tx.user.update({
          where: { id: driverId },
          data: { isActive: false },
        });
      });

      this.logger.log(
        `Đã vô hiệu hóa tài xế ${driver.fullName} (${driver.id}) và bàn giao ${defaultRoutesCount} tuyến, ${scheduledTripsCount} chuyến cho tài xế ${replacementDriver.fullName}`,
      );

      return {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        isActive: updated.isActive,
        isVerified: updated.isVerified,
        avatarUrl: updated.avatarUrl,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    // Không có phân công -> Vô hiệu hóa và thu hồi session
    const updated = await this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
      await assertInactiveHandover(tx, 'assignedDriverId', driverId);
      await tx.session.updateMany({
        where: { userId: driverId, revokedAt: null },
        data: { revokedAt: new Date(), pushToken: null },
      });

      return tx.user.update({
        where: { id: driverId },
        data: { isActive: false },
      });
    });

    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      isActive: updated.isActive,
      isVerified: updated.isVerified,
      avatarUrl: updated.avatarUrl,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
