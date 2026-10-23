import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ForbiddenException,
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
  UpdateStudentAddressDto,
  ListRequestsQueryDto,
  StudentUpdateRequestDto,
  StudentUpdateRequestDetailDto,
  StudentUpdateRequestListResponseDto,
} from './dto/index.js';

@ApiTags('School Admin Student Update Requests')
@Controller('schools/:schoolId')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SCHOOL_ADMIN)
@ApiBearerAuth('JWT-auth')
export class SchoolRequestsController {
  constructor(private readonly studentRequestsService: StudentRequestsService) {}

  private checkSchoolIsolation(user: User, schoolId: string): void {
    if (user.schoolId !== schoolId) {
      throw new ForbiddenException(
        'Bạn chỉ có quyền quản trị dữ liệu thuộc trường học của mình',
      );
    }
  }

  @Get('update-requests')
  @ApiOperation({
    summary: 'Danh sách yêu cầu cập nhật học sinh thuộc trường',
    description:
      'Lấy danh sách các yêu cầu cập nhật thông tin và địa chỉ học sinh của trường. Hỗ trợ tìm kiếm theo tên/mã học sinh, lọc theo loại/trạng thái và phân trang Server-side.',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'Mã định danh duy nhất (UUID) của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách yêu cầu cập nhật',
    type: StudentUpdateRequestListResponseDto,
  })
  async listRequests(
    @CurrentUser() user: User,
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Query() query: ListRequestsQueryDto,
  ): Promise<StudentUpdateRequestListResponseDto> {
    this.checkSchoolIsolation(user, schoolId);
    return this.studentRequestsService.listSchoolRequests(schoolId, query);
  }

  @Get('students/:id/update-requests')
  @ApiOperation({
    summary: 'Lịch sử các yêu cầu cập nhật của một học sinh cụ thể trong trường',
    description:
      'Truy vấn toàn bộ lịch sử các yêu cầu cập nhật (PENDING, APPROVED, REJECTED) của học sinh.',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'Mã định danh duy nhất (UUID) của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh duy nhất (UUID) của học sinh',
    example: 'd3b07384-d113-46fb-97b7-5bf680b55580',
  })
  @ApiResponse({
    status: 200,
    description: 'Lịch sử yêu cầu cập nhật của học sinh',
    type: StudentUpdateRequestListResponseDto,
  })
  async listStudentRequestHistory(
    @CurrentUser() user: User,
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) studentId: string,
    @Query() query: ListRequestsQueryDto,
  ): Promise<StudentUpdateRequestListResponseDto> {
    this.checkSchoolIsolation(user, schoolId);
    return this.studentRequestsService.listStudentRequestHistory(
      schoolId,
      studentId,
      query,
    );
  }

  @Get('update-requests/:requestId')
  @ApiOperation({
    summary: 'Chi tiết yêu cầu cập nhật kèm phát hiện Stale Data',
    description:
      'Xem chi tiết trước và sau thay đổi, dữ liệu học sinh hiện tại và cờ isStale để cảnh báo nếu dữ liệu gốc đã bị thay đổi trước đó.',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'Mã định danh trường học (UUID)',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Mã định danh yêu cầu cập nhật (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết yêu cầu cập nhật',
    type: StudentUpdateRequestDetailDto,
  })
  async getRequestDetail(
    @CurrentUser() user: User,
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ): Promise<StudentUpdateRequestDetailDto> {
    this.checkSchoolIsolation(user, schoolId);
    return this.studentRequestsService.getSchoolRequestDetail(schoolId, requestId);
  }

  @Post('update-requests/:requestId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Phê duyệt yêu cầu cập nhật thông tin hoặc địa chỉ học sinh',
    description:
      'Phê duyệt nguyên tử: kiểm tra trạng thái PENDING, học sinh AVAILABLE, và dữ liệu gốc không bị xung đột (No Stale Conflict). Cập nhật dữ liệu học sinh và chuyển trạng thái APPROVED.',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'Mã định danh trường học (UUID)',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Mã định danh yêu cầu cập nhật (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Phê duyệt thành công và dữ liệu học sinh đã được cập nhật',
    type: StudentUpdateRequestDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Học sinh đang bị vô hiệu hóa (DISABLED) nên không thể phê duyệt',
  })
  @ApiResponse({
    status: 409,
    description:
      'Yêu cầu đã được xử lý trước đó hoặc dữ liệu học sinh hiện tại đã thay đổi so với thời điểm gửi yêu cầu (Stale Data Conflict)',
  })
  async approveRequest(
    @CurrentUser() user: User,
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ): Promise<StudentUpdateRequestDto> {
    this.checkSchoolIsolation(user, schoolId);
    return this.studentRequestsService.approveRequest(
      requestId,
      user.id,
      user.role,
      user.schoolId,
    );
  }

  @Post('update-requests/:requestId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Từ chối yêu cầu cập nhật của phụ huynh',
    description:
      'Từ chối yêu cầu PENDING kèm lý do tùy chọn. Dữ liệu học sinh được giữ nguyên không đổi.',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'Mã định danh trường học (UUID)',
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
    status: 409,
    description: 'Yêu cầu đã được xử lý trước đó',
  })
  async rejectRequest(
    @CurrentUser() user: User,
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: ReviewRequestDto,
  ): Promise<StudentUpdateRequestDto> {
    this.checkSchoolIsolation(user, schoolId);
    return this.studentRequestsService.rejectRequest(
      requestId,
      user.id,
      user.role,
      dto,
      user.schoolId,
    );
  }

  @Patch('students/:id/address')
  @ApiOperation({
    summary: 'School Admin cập nhật trực tiếp địa chỉ đưa đón của học sinh',
    description:
      'Cho phép School Admin cập nhật địa chỉ và tọa độ đón trả học sinh thuộc trường mình mà không cần qua quy trình OTP. Yêu cầu học sinh phải ở trạng thái AVAILABLE.',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'Mã định danh trường học (UUID)',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh học sinh (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật địa chỉ học sinh thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Học sinh đang bị vô hiệu hóa hoặc dữ liệu tọa độ không hợp lệ',
  })
  async directUpdateAddress(
    @CurrentUser() user: User,
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) studentId: string,
    @Body() dto: UpdateStudentAddressDto,
  ) {
    this.checkSchoolIsolation(user, schoolId);
    return this.studentRequestsService.directUpdateStudentAddress(
      schoolId,
      studentId,
      dto,
    );
  }
}
