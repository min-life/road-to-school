import {
  Injectable,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateVehicleDto,
  ListVehiclesQueryDto,
  VehicleResponseDto,
  VehicleListResponseDto,
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
   * Lấy danh sách phương tiện có tìm kiếm và phân trang máy chủ
   */
  async listVehicles(query: ListVehiclesQueryDto): Promise<VehicleListResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};

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
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
      total,
      page,
      totalPages,
    };
  }
}
