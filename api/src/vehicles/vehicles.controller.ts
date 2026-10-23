import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '@prisma/client';
import {
  CreateVehicleDto,
  ListVehiclesQueryDto,
  VehicleResponseDto,
  VehicleListResponseDto,
} from './dto/index.js';

@ApiTags('Vehicles')
@Controller('vehicles')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
@ApiBearerAuth('JWT-auth')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách phương tiện vận tải (Chỉ SYSTEM_ADMIN)',
    description:
      'Lấy danh sách phương tiện toàn hệ thống có hỗ trợ tìm kiếm (theo hãng, biển số) và phân trang máy chủ. Lưu ý: seatCount là số ghế khả dụng dành cho học sinh.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách phương tiện phân trang thành công',
    type: VehicleListResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ SYSTEM_ADMIN mới có quyền truy cập danh sách phương tiện',
  })
  async listVehicles(
    @Query() query: ListVehiclesQueryDto,
  ): Promise<VehicleListResponseDto> {
    return this.vehiclesService.listVehicles(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Thêm phương tiện mới (Chỉ SYSTEM_ADMIN)',
    description:
      'Tạo mới phương tiện vận tải thuộc quản lý của nhà xe. seatCount là số lượng ghế khả dụng dành cho học sinh (không bao gồm tài xế hay nhân sự).',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo phương tiện mới thành công',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ',
  })
  @ApiResponse({
    status: 409,
    description: 'Biển số xe đã tồn tại trên hệ thống',
  })
  async createVehicle(
    @Body() dto: CreateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.createVehicle(dto);
  }
}
