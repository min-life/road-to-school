import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role, type User } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { OverviewQueryDto, OverviewResponseDto } from './overview.dto.js';
import { OverviewService } from './overview.service.js';

@ApiTags('Admin Overview')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
@Controller('admin/overview')
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}
  @Get()
  @ApiOperation({ summary: 'Tổng quan vận hành theo ngày, việc chờ xử lý mọi ngày và hiện trạng theo role', description: 'Chỉ đọc dữ liệu hiện có, không sinh chuyến hoặc xử lý hồ sơ. School Admin bị giới hạn trường từ session.' })
  @ApiResponse({ status: 200, type: OverviewResponseDto })
  @ApiResponse({ status: 400, description: 'Ngày hoặc schoolId không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Phiên không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không phải admin hoặc truy cập trường khác' })
  @ApiResponse({ status: 404, description: 'Trường không tồn tại' })
  @ApiResponse({ status: 500, description: 'Lỗi hệ thống' })
  get(@CurrentUser() user: User, @Query() query: OverviewQueryDto): Promise<OverviewResponseDto> { return this.overview.get(user, query); }
}
