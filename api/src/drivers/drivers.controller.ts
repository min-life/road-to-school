import {
  Controller,
  Inject,
  HttpCode,
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
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { PersonnelCredentialsService } from '../auth/personnel-credentials.service.js';
import { CredentialDeliveryResultDto } from '../auth/credential-delivery.dto.js';
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
  @Inject(PersonnelCredentialsService)
  private readonly credentials: PersonnelCredentialsService;

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
      'Khởi tạo tài khoản tài xế thuộc biên chế Nhà xe (schoolId = null). Bắt buộc họ tên và email; số điện thoại tùy chọn. Mật khẩu chỉ bàn giao qua email hoặc console development. credentialDeliveryStatus: SENT/FAILED/CONSOLE; FAILED vẫn giữ tài khoản đã tạo.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo tài khoản tài xế thành công',
    type: CreateDriverResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu đầu vào không hợp lệ hoặc thiếu Email bắt buộc',
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

  @Post(':id/credentials/resend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cấp lại mật khẩu tài xế qua email', description: 'Sinh và lưu mật khẩu mới trước khi gửi email đã lưu. Không thu hồi phiên/push token, không chặn Trip đang chạy. FAILED vẫn có nghĩa mật khẩu đã đổi; cần gọi lại để cấp mật khẩu khác. Không nhận body.' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID tài xế' })
  @ApiResponse({ status: 200, type: CredentialDeliveryResultDto, description: 'Đã đổi mật khẩu; xem credentialDeliveryStatus để biết kết quả bàn giao' })
  @ApiResponse({ status: 400, description: 'UUID sai, tài khoản không hoạt động hoặc thiếu email hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 403, description: 'Không có quyền cấp mật khẩu tài xế' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài xế' })
  @ApiResponse({ status: 409, description: 'Đang cấp mật khẩu hoặc tài khoản thay đổi đồng thời' })
  @ApiResponse({ status: 500, description: 'Không lưu được mật khẩu; không xác nhận cấp lại thành công' })
  async resendCredentials(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: User): Promise<CredentialDeliveryResultDto> {
    return this.credentials.resend(id, user);
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
