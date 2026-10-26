import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
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
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { StudentRequestsService } from './student-requests.service.js';
import {
  ReviewRequestDto,
  ListRequestsQueryDto,
  StudentUpdateRequestDto,
  StudentUpdateRequestDetailDto,
  StudentUpdateRequestListResponseDto,
  ApproveAddressRequestDto,
  StudentAddressRoutingPreviewDto,
  StudentAddressRoutingPreviewResponseDto,
} from './dto/index.js';

@ApiTags('System Admin Address Update Requests')
@Controller('system-admin/update-requests')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
@ApiBearerAuth('JWT-auth')
export class SystemRequestsController {
  constructor(private readonly studentRequestsService: StudentRequestsService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách yêu cầu cập nhật địa chỉ học sinh toàn hệ thống (SYSTEM_ADMIN)',
    description:
      'Chỉ trả về danh sách các yêu cầu thuộc loại ADDRESS_UPDATE trên toàn hệ thống. Tuyệt đối không trả về yêu cầu cập nhật thông tin cá nhân (INFORMATION_UPDATE) để bảo đảm quyền riêng tư.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách yêu cầu cập nhật địa chỉ',
    type: StudentUpdateRequestListResponseDto,
  })
  async listAddressRequests(
    @Query() query: ListRequestsQueryDto,
  ): Promise<StudentUpdateRequestListResponseDto> {
    return this.studentRequestsService.listSystemAdminAddressRequests(query);
  }

  @Get(':requestId')
  @ApiOperation({
    summary: 'Chi tiết yêu cầu cập nhật địa chỉ học sinh (SYSTEM_ADMIN)',
    description:
      'Xem chi tiết địa chỉ trước và sau thay đổi, dữ liệu học sinh hiện tại và cờ cảnh báo isStale. Chỉ hỗ trợ yêu cầu loại ADDRESS_UPDATE.',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Mã định danh yêu cầu cập nhật (UUID)',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết yêu cầu cập nhật địa chỉ',
    type: StudentUpdateRequestDetailDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập yêu cầu không phải loại ADDRESS_UPDATE',
  })
  @ApiResponse({
    status: 404,
    description: 'Yêu cầu không tồn tại',
  })
  async getAddressRequestDetail(
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ): Promise<StudentUpdateRequestDetailDto> {
    return this.studentRequestsService.getSystemAdminAddressRequestDetail(
      requestId,
    );
  }

  @Post(':requestId/routing-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'SYSTEM_ADMIN kiểm tra tính khả thi định tuyến trước khi duyệt',
    description:
      'Chạy mô phỏng định tuyến địa chỉ mới cho từng tuyến học sinh tham gia và đánh giá tính khả thi.',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Mã định danh yêu cầu cập nhật (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Kết quả mô phỏng định tuyến',
    type: StudentAddressRoutingPreviewResponseDto,
  })
  async previewRouting(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: StudentAddressRoutingPreviewDto,
  ): Promise<StudentAddressRoutingPreviewResponseDto> {
    return this.studentRequestsService.previewAddressRouting(requestId, dto);
  }

  @Post(':requestId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'SYSTEM_ADMIN phê duyệt yêu cầu cập nhật địa chỉ học sinh',
    description:
      'Chính sách One Valid Decision: Hỗ trợ các hành động DIRECT_UPDATE, REOPTIMIZED hoặc REMOVED_FROM_ROUTES tùy thuộc vào kết quả kiểm tra định tuyến.',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Mã định danh yêu cầu cập nhật (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Phê duyệt thành công và cập nhật địa chỉ học sinh',
    type: StudentUpdateRequestDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Học sinh đang bị vô hiệu hóa (DISABLED)',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ được phép phê duyệt yêu cầu loại ADDRESS_UPDATE',
  })
  @ApiResponse({
    status: 409,
    description:
      'Yêu cầu đã được xử lý trước đó bởi quản trị viên khác hoặc dữ liệu học sinh hiện tại đã thay đổi (Stale Data Conflict)',
  })
  async approveAddressRequest(
    @CurrentUser() user: User,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto?: ApproveAddressRequestDto,
  ): Promise<StudentUpdateRequestDto> {
    return this.studentRequestsService.approveRequest(
      requestId,
      user.id,
      user.role,
      null,
      dto,
    );
  }

  @Post(':requestId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'SYSTEM_ADMIN từ chối yêu cầu cập nhật địa chỉ học sinh',
    description:
      'Từ chối yêu cầu cập nhật địa chỉ đang ở trạng thái PENDING kèm lý do từ chối (tùy chọn).',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Mã định danh yêu cầu cập nhật (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Từ chối yêu cầu thành công',
    type: StudentUpdateRequestDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ được phép từ chối yêu cầu loại ADDRESS_UPDATE',
  })
  @ApiResponse({
    status: 409,
    description: 'Yêu cầu đã được xử lý trước đó bởi quản trị viên khác',
  })
  async rejectAddressRequest(
    @CurrentUser() user: User,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: ReviewRequestDto,
  ): Promise<StudentUpdateRequestDto> {
    return this.studentRequestsService.rejectRequest(
      requestId,
      user.id,
      user.role,
      dto,
      null,
    );
  }
}
