import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
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
  ApiParam,
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
  VehicleDeactivationImpactDto,
  UpdateVehicleStatusDto,
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
      'Lấy danh sách phương tiện toàn hệ thống có hỗ trợ tìm kiếm (theo hãng, biển số), lọc trạng thái hoạt động (ALL, ACTIVE, INACTIVE) và phân trang máy chủ. Lưu ý: seatCount là số ghế khả dụng dành cho học sinh.',
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

  @Get(':id/deactivation-impact')
  @ApiOperation({
    summary: 'Xem trước tác động khi chuyển trạng thái phương tiện (Chỉ SYSTEM_ADMIN)',
    description:
      'Thống kê số lượng tuyến ACTIVE và chuyến xe SCHEDULED/IN_PROGRESS đang gán xe này trước khi quyết định ngừng hoạt động xe.',
  })
  @ApiParam({ name: 'id', description: 'ID phương tiện (UUID v4)' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin tác động khi ngừng hoạt động xe',
    type: VehicleDeactivationImpactDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phương tiện',
  })
  async getDeactivationImpact(
    @Param('id') id: string,
  ): Promise<VehicleDeactivationImpactDto> {
    return this.vehiclesService.getDeactivationImpact(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái hoạt động của xe (Chỉ SYSTEM_ADMIN)',
    description:
      'Chuyển trạng thái xe giữa hoạt động (isActive=true) và không hoạt động (isActive=false). Nếu xe còn tuyến ACTIVE hoặc chuyến SCHEDULED, bắt buộc truyền replacementVehicleId để bàn giao nguyên tử.',
  })
  @ApiParam({ name: 'id', description: 'ID phương tiện (UUID v4)' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái xe thành công',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Xe có chuyến Ready, đã điểm danh hoặc IN_PROGRESS hoặc thiếu xe thay thế hợp lệ khi còn phân công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phương tiện hoặc phương tiện thay thế',
  })
  async updateVehicleStatus(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleStatusDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.updateVehicleStatus(id, dto);
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
