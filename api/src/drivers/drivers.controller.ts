import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { DriversService } from './drivers.service.js';
import {
  CreateDriverDto,
  ListDriversQueryDto,
  DriverListResponseDto,
  CreateDriverResponseDto,
  DriverItemDto,
} from './dto/index.js';

@ApiTags('Drivers')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tài xế của đơn vị vận tải',
    description:
      'Trả về danh sách tài xế (vai trò DRIVER). Hỗ trợ tìm kiếm theo họ tên/email/SĐT, lọc theo trạng thái tài khoản và phân trang. Chỉ SYSTEM_ADMIN được phép truy cập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tài xế thành công',
    type: DriverListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tham số truy vấn hoặc phân trang không hợp lệ',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền thực hiện thao tác này (yêu cầu SYSTEM_ADMIN)',
  })
  async listDrivers(
    @Query() query: ListDriversQueryDto,
  ): Promise<DriverListResponseDto> {
    return this.driversService.listDrivers(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo tài khoản tài xế mới',
    description:
      'Khởi tạo tài khoản tài xế thuộc biên chế Nhà xe (schoolId = null). Bắt buộc cung cấp họ tên và ít nhất một định danh (Email hoặc Số điện thoại). Mật khẩu ngẫu nhiên băm bcryptjs và giao qua console ở development.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo tài khoản tài xế thành công',
    type: CreateDriverResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu đầu vào không hợp lệ hoặc thiếu cả Email lẫn Số điện thoại',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền thực hiện thao tác này (yêu cầu SYSTEM_ADMIN)',
  })
  @ApiResponse({
    status: 409,
    description: 'Email hoặc số điện thoại đã tồn tại trên hệ thống',
  })
  async createDriver(
    @Body() dto: CreateDriverDto,
  ): Promise<CreateDriverResponseDto> {
    return this.driversService.createDriver(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết tài khoản tài xế',
    description:
      'Trả về thông tin chi tiết của một tài xế theo mã định danh UUID. Chỉ SYSTEM_ADMIN được phép truy cập.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh UUID của tài xế',
    example: 'd1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Xem chi tiết tài xế thành công',
    type: DriverItemDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mã tài xế không đúng định dạng UUID',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền thực hiện thao tác này (yêu cầu SYSTEM_ADMIN)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tài xế',
  })
  async getDriver(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã tài xế không đúng định dạng UUID'),
      }),
    )
    id: string,
  ): Promise<DriverItemDto> {
    return this.driversService.getDriver(id);
  }
}
