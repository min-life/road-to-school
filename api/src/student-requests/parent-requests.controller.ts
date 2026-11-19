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
  CreateRequestOtpDto,
  VerifyRequestOtpDto,
  ListRequestsQueryDto,
  RequestOtpResponseDto,
  StudentUpdateRequestDto,
  StudentUpdateRequestListResponseDto,
  ParentServiceAreaCheckDto,
  ParentServiceAreaCheckResponseDto,
} from './dto/index.js';

@ApiTags('Parent Student Update Requests')
@Controller('parents')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.PARENT)
@ApiBearerAuth('JWT-auth')
export class ParentRequestsController {
  constructor(private readonly studentRequestsService: StudentRequestsService) {}

  @Post('students/:id/service-area-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kiểm tra phạm vi phục vụ của địa chỉ đón trả (Chỉ đọc, dành cho phụ huynh liên kết)',
    description:
      'Xác thực tọa độ đề xuất so với bãi đỗ xe trung tâm đang hiệu lực và ranh giới trường học. Trả về trạng thái (IN_SERVICE_AREA, OUT_OF_SERVICE_AREA, UNAVAILABLE), khoảng cách, bán kính và dữ liệu ranh giới cho bản đồ.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh duy nhất (UUID) của học sinh',
    example: 'd3b07384-d113-46fb-97b7-5bf680b55580',
  })
  @ApiResponse({
    status: 200,
    description: 'Kết quả kiểm tra phạm vi phục vụ',
    type: ParentServiceAreaCheckResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tọa độ không hợp lệ hoặc học sinh bị vô hiệu hóa',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token không hợp lệ',
  })
  @ApiResponse({
    status: 403,
    description: 'Phụ huynh chưa liên kết với học sinh này',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy thông tin trường học của học sinh',
  })
  async checkServiceArea(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) studentId: string,
    @Body() dto: ParentServiceAreaCheckDto,
  ): Promise<ParentServiceAreaCheckResponseDto> {
    return this.studentRequestsService.checkParentServiceArea(
      user.id,
      studentId,
      dto,
    );
  }

  @ApiResponse({ status: 503, description: 'Không gửi được OTP hoặc chưa xác định kết quả gửi; khi kết quả chưa rõ phải chờ mã hết hạn trước khi yêu cầu lại' })
  @Post('students/:id/update-requests/otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Yêu cầu mã xác thực OTP để cập nhật thông tin hoặc địa chỉ học sinh',
    description:
      'Gửi mã OTP (6 số) tới số điện thoại người giám hộ hiện tại của học sinh. Mã OTP được ràng buộc mật thiết với dữ liệu đề xuất (payloadHash) để chống giả mạo.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh duy nhất (UUID) của học sinh',
    example: 'd3b07384-d113-46fb-97b7-5bf680b55580',
  })
  @ApiResponse({
    status: 200,
    description: 'Phát mã OTP thành công',
    type: RequestOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đề xuất không hợp lệ, không có thay đổi, hoặc học sinh bị vô hiệu hóa',
  })
  @ApiResponse({
    status: 403,
    description: 'Phụ huynh chưa liên kết với học sinh này',
  })
  @ApiResponse({
    status: 409,
    description: 'Học sinh đang có một yêu cầu cập nhật cùng loại đang chờ xét duyệt',
  })
  async requestOtp(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) studentId: string,
    @Body() dto: CreateRequestOtpDto,
  ): Promise<RequestOtpResponseDto> {
    return this.studentRequestsService.requestOtp(user.id, studentId, dto);
  }

  @Post('students/:id/update-requests/verify')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Xác thực mã OTP và chính thức tạo yêu cầu cập nhật (PENDING)',
    description:
      'Kiểm tra mã OTP và đối chiếu khớp chính xác payloadHash dữ liệu đề xuất. Nếu hợp lệ, tiêu thụ OTP và tạo bản ghi yêu cầu ở trạng thái PENDING kèm bản chụp beforeData.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh duy nhất (UUID) của học sinh',
    example: 'd3b07384-d113-46fb-97b7-5bf680b55580',
  })
  @ApiResponse({
    status: 201,
    description: 'Xác thực OTP thành công và tạo yêu cầu PENDING',
    type: StudentUpdateRequestDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mã OTP không chính xác, đã hết hạn, hoặc dữ liệu đề xuất không khớp với mã OTP đã cấp',
  })
  @ApiResponse({
    status: 403,
    description: 'Phụ huynh không có quyền liên kết với học sinh này',
  })
  @ApiResponse({
    status: 409,
    description: 'Đã có yêu cầu cùng loại đang chờ xét duyệt',
  })
  async verifyOtpAndCreate(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) studentId: string,
    @Body() dto: VerifyRequestOtpDto,
  ): Promise<StudentUpdateRequestDto> {
    return this.studentRequestsService.verifyOtpAndCreateRequest(
      user.id,
      studentId,
      dto,
    );
  }

  @Get('students/:id/update-requests')
  @ApiOperation({
    summary: 'Danh sách yêu cầu cập nhật của học sinh do phụ huynh quản lý',
    description:
      'Lấy danh sách các yêu cầu cập nhật (INFORMATION_UPDATE, ADDRESS_UPDATE) của học sinh với phân trang và lọc theo trạng thái.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh duy nhất (UUID) của học sinh',
    example: 'd3b07384-d113-46fb-97b7-5bf680b55580',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách yêu cầu cập nhật',
    type: StudentUpdateRequestListResponseDto,
  })
  async listRequests(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) studentId: string,
    @Query() query: ListRequestsQueryDto,
  ): Promise<StudentUpdateRequestListResponseDto> {
    return this.studentRequestsService.listParentRequests(
      user.id,
      studentId,
      query,
    );
  }

  @Get('update-requests/:requestId')
  @ApiOperation({
    summary: 'Chi tiết một yêu cầu cập nhật của phụ huynh',
    description:
      'Xem chi tiết thông tin dữ liệu gốc (beforeData), dữ liệu đề xuất (proposedData) và lý do từ chối (nếu có).',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Mã định danh yêu cầu cập nhật (UUID)',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết yêu cầu cập nhật',
    type: StudentUpdateRequestDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập yêu cầu này hoặc đã hủy liên kết học sinh',
  })
  @ApiResponse({
    status: 404,
    description: 'Yêu cầu không tồn tại',
  })
  async getRequestDetail(
    @CurrentUser() user: User,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ): Promise<StudentUpdateRequestDto> {
    return this.studentRequestsService.getParentRequestDetail(
      user.id,
      requestId,
    );
  }

  @Post('update-requests/:requestId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Phụ huynh hủy yêu cầu cập nhật đang chờ duyệt (PENDING)',
    description:
      'Cho phép phụ huynh đã tạo yêu cầu hủy khi còn ở trạng thái PENDING. Không yêu cầu mã OTP.',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Mã định danh yêu cầu cập nhật (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Hủy yêu cầu thành công',
    type: StudentUpdateRequestDto,
  })
  async cancelRequest(
    @CurrentUser() user: User,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ): Promise<StudentUpdateRequestDto> {
    return this.studentRequestsService.cancelParentRequest(user.id, requestId);
  }
}
