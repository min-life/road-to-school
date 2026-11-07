import { assertInactiveHandover } from '../trips/utils/staff-availability.helper.js';
import { lockOperations } from '../trips/utils/operations-lock.js';
import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, RoutePlanStatus, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateVehicleDto,
  ListVehiclesQueryDto,
  VehicleResponseDto,
  VehicleListResponseDto,
  VehicleDeactivationImpactDto,
  UpdateVehicleStatusDto,
} from './dto/index.js';

export function normalizeLicensePlate(plate: string): string {
  return (plate || '').trim().toUpperCase().replace(/[\s\.\-]/g, '');
}

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo mới phương tiện vận tải (Chỉ SYSTEM_ADMIN)
   * Lưu ý về seatCount: Là số lượng ghế khả dụng để chở HỌC SINH (không bao gồm tài xế hay nhân sự).
   */
  async createVehicle(dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    const brand = dto.brand.trim();
    const color = dto.color.trim();
    const licensePlate = dto.licensePlate.trim().toUpperCase();
    const normalizedPlate = normalizeLicensePlate(licensePlate);

    // Kiểm tra trùng lặp biển số trước
    const existing = await this.prisma.vehicle.findFirst({
      where: {
        OR: [{ licensePlate }, { normalizedPlate }],
      },
    });

    if (existing) {
      throw new ConflictException('Biển số xe đã tồn tại trên hệ thống');
    }

    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          brand,
          seatCount: dto.seatCount,
          licensePlate,
          normalizedPlate,
          color,
        },
      });

      this.logger.log(`Tạo phương tiện mới thành công: ${vehicle.licensePlate} (${vehicle.brand}, ${vehicle.seatCount} chỗ học sinh)`);

      return {
        id: vehicle.id,
        brand: vehicle.brand,
        seatCount: vehicle.seatCount,
        licensePlate: vehicle.licensePlate,
        color: vehicle.color,
        isActive: vehicle.isActive,
        createdAt: vehicle.createdAt.toISOString(),
        updatedAt: vehicle.updatedAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Biển số xe đã tồn tại trên hệ thống');
      }
      throw error;
    }
  }

  /**
   * Lấy danh sách phương tiện có tìm kiếm, lọc trạng thái và phân trang máy chủ
   */
  async listVehicles(query: ListVehiclesQueryDto): Promise<VehicleListResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};

    if (query.status === 'ACTIVE') {
      where.isActive = true;
    } else if (query.status === 'INACTIVE') {
      where.isActive = false;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const sNormalized = normalizeLicensePlate(s);
      where.OR = [
        { brand: { contains: s, mode: 'insensitive' } },
        { licensePlate: { contains: s, mode: 'insensitive' } },
        { normalizedPlate: { contains: sNormalized, mode: 'insensitive' } },
      ];
    }

    const [total, vehicles] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: vehicles.map((v) => ({
        id: v.id,
        brand: v.brand,
        seatCount: v.seatCount,
        licensePlate: v.licensePlate,
        color: v.color,
        isActive: v.isActive,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
      total,
      page,
      totalPages,
    };
  }

  /**
   * Xem trước tác động khi chuyển trạng thái phương tiện
   */
  async getDeactivationImpact(vehicleId: string): Promise<VehicleDeactivationImpactDto> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Không tìm thấy phương tiện');
    }

    // 1. Tuyến thuộc RoutePlan ACTIVE đang gán xe này
    const proposedRoutes = await this.prisma.route.findMany({
      where: {
        proposedVehicleId: vehicleId,
        routePlan: { status: RoutePlanStatus.ACTIVE },
      },
      include: {
        routePlan: { select: { id: true, name: true } },
        school: { select: { name: true } },
      },
    });

    // 2. Chuyến xe SCHEDULED và IN_PROGRESS đang gán xe này
    const trips = await this.prisma.trip.findMany({
      where: {
        assignedVehicleId: vehicleId,
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

    const canDeactivateDirectly = proposedRoutes.length === 0 && trips.length === 0;
    const hasBlockingInProgress = inProgressTrips.length > 0;

    return {
      vehicleId: vehicle.id,
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand,
      isActive: vehicle.isActive,
      proposedRoutesCount: proposedRoutes.length,
      scheduledTripsCount: scheduledTrips.length,
      inProgressTripsCount: inProgressTrips.length,
      canDeactivateDirectly,
      hasBlockingInProgress,
      affectedRoutes: proposedRoutes.map((r) => ({
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
   * Cập nhật trạng thái hoạt động của xe (Kèm bàn giao bắt buộc nếu có phân công)
   */
  async updateVehicleStatus(vehicleId: string, dto: UpdateVehicleStatusDto): Promise<VehicleResponseDto> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Không tìm thấy phương tiện');
    }

    if (dto.isActive === vehicle.isActive) {
      return {
        id: vehicle.id,
        brand: vehicle.brand,
        seatCount: vehicle.seatCount,
        licensePlate: vehicle.licensePlate,
        color: vehicle.color,
        isActive: vehicle.isActive,
        createdAt: vehicle.createdAt.toISOString(),
        updatedAt: vehicle.updatedAt.toISOString(),
      };
    }

    // Chuyển sang ACTIVE -> không cần bàn giao
    if (dto.isActive) {
      const updated = await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { isActive: true },
      });
      return {
        id: updated.id,
        brand: updated.brand,
        seatCount: updated.seatCount,
        licensePlate: updated.licensePlate,
        color: updated.color,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    // Chuyển sang INACTIVE:
    // 1. Kiểm tra IN_PROGRESS -> Chặn tuyệt đối
    const inProgressCount = await this.prisma.trip.count({
      where: {
        assignedVehicleId: vehicleId,
        status: TripStatus.IN_PROGRESS,
      },
    });
    if (inProgressCount > 0) {
      throw new BadRequestException('Không thể ngừng hoạt động xe khi đang có chuyến xe đang thực hiện (IN_PROGRESS)');
    }

    // 2. Kiểm tra các tuyến Route (ACTIVE plan) và chuyến SCHEDULED
    const [proposedRoutesCount, scheduledTripsCount] = await Promise.all([
      this.prisma.route.count({
        where: {
          proposedVehicleId: vehicleId,
          routePlan: { status: RoutePlanStatus.ACTIVE },
        },
      }),
      this.prisma.trip.count({
        where: {
          assignedVehicleId: vehicleId,
          status: TripStatus.SCHEDULED,
        },
      }),
    ]);

    const totalActiveAssignments = proposedRoutesCount + scheduledTripsCount;
    if (totalActiveAssignments > 0) {
      if (!dto.replacementVehicleId) {
        throw new BadRequestException(
          `Bắt buộc chọn phương tiện thay thế (replacementVehicleId) vì xe này đang được phân công cho ${proposedRoutesCount} tuyến và ${scheduledTripsCount} chuyến xe chưa hoàn thành`,
        );
      }
      if (dto.replacementVehicleId === vehicleId) {
        throw new BadRequestException('Phương tiện thay thế không được trùng với phương tiện hiện tại');
      }

      const replacementVehicle = await this.prisma.vehicle.findUnique({
        where: { id: dto.replacementVehicleId },
      });
      if (!replacementVehicle) {
        throw new NotFoundException('Không tìm thấy phương tiện thay thế');
      }
      if (!replacementVehicle.isActive) {
        throw new BadRequestException('Phương tiện thay thế phải đang ở trạng thái hoạt động (isActive = true)');
      }
      if (replacementVehicle.seatCount < vehicle.seatCount) {
        throw new BadRequestException(
          `Phương tiện thay thế (${replacementVehicle.licensePlate}, ${replacementVehicle.seatCount} chỗ) có sức chứa nhỏ hơn xe hiện tại (${vehicle.seatCount} chỗ)`,
        );
      }

      // Thực hiện bàn giao nguyên tử (Atomic Handover)
      const updated = await this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
      await assertInactiveHandover(tx, 'assignedVehicleId', vehicleId, dto.replacementVehicleId);
        // Gán xe mới cho các Route thuộc plan ACTIVE
        await tx.route.updateMany({
          where: {
            proposedVehicleId: vehicleId,
            routePlan: { status: RoutePlanStatus.ACTIVE },
          },
          data: { proposedVehicleId: dto.replacementVehicleId },
        });

        // Gán xe mới cho các chuyến SCHEDULED
        await tx.trip.updateMany({
          where: {
            assignedVehicleId: vehicleId,
            status: TripStatus.SCHEDULED,
          },
          data: { assignedVehicleId: dto.replacementVehicleId },
        });

        // Inactive xe cũ
        return tx.vehicle.update({
          where: { id: vehicleId },
          data: { isActive: false },
        });
      });

      this.logger.log(
        `Đã ngừng hoạt động xe ${vehicle.licensePlate} và bàn giao ${proposedRoutesCount} tuyến, ${scheduledTripsCount} chuyến cho xe ${replacementVehicle.licensePlate}`,
      );

      return {
        id: updated.id,
        brand: updated.brand,
        seatCount: updated.seatCount,
        licensePlate: updated.licensePlate,
        color: updated.color,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    // Không có ràng buộc -> Ngừng hoạt động trực tiếp
    const updated = await this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
      await assertInactiveHandover(tx, 'assignedVehicleId', vehicleId);
      return tx.vehicle.update({ where: { id: vehicleId }, data: { isActive: false } });
    });

    return {
      id: updated.id,
      brand: updated.brand,
      seatCount: updated.seatCount,
      licensePlate: updated.licensePlate,
      color: updated.color,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
