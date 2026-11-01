import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { LeaveNoticesService } from './leave-notices.service.js';
import {
  LeaveNoticeOptionsQueryDto,
  LeaveNoticeOptionsResponseDto,
} from './dto/leave-notice-options.dto.js';
import {
  LeaveNoticeOtpResponseDto,
  RequestLeaveNoticeOtpDto,
} from './dto/leave-notice-otp.dto.js';
import { ConfirmLeaveNoticeDto } from './dto/leave-notice-confirm.dto.js';
import {
  LeaveNoticeListResponseDto,
  LeaveNoticeResponseDto,
} from './dto/leave-notice-response.dto.js';
import { ListLeaveNoticesQueryDto } from './dto/list-leave-notices-query.dto.js';
import { ReplacementCandidatesResponseDto } from './dto/replacement-candidate.dto.js';
import { AssignReplacementDto } from './dto/assign-replacement.dto.js';
import { CancelTripFromNoticeDto } from './dto/cancel-trip.dto.js';

@ApiTags('Leave Notices')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('leave-notices')
export class LeaveNoticesController {
  constructor(private readonly leaveNoticesService: LeaveNoticesService) {}

  @Get('options')
  @Roles(Role.PARENT, Role.DRIVER, Role.BUS_ATTENDANT)
  @ApiOperation({
    summary: 'Lấy danh sách chuyến xe đủ điều kiện báo nghỉ và kênh nhận mã OTP',
    description: 'Chỉ trả về các chuyến xe thực tế SCHEDULED chưa bắt đầu, loại bỏ các chuyến VIRTUAL dự kiến.',
  })
  @ApiResponse({ status: 200, type: LeaveNoticeOptionsResponseDto, description: 'Lấy tùy chọn thành công' })
  @ApiResponse({ status: 400, description: 'Tham số yêu cầu không hợp lệ hoặc thiếu studentId khi là Phụ huynh' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập học sinh hoặc vai trò không hợp lệ' })
  async getOptions(
    @CurrentUser() user: User,
    @Query() query: LeaveNoticeOptionsQueryDto,
  ): Promise<LeaveNoticeOptionsResponseDto> {
    return this.leaveNoticesService.getOptions(user, query);
  }

  @ApiResponse({ status: 503, description: 'Không gửi được OTP hoặc chưa xác định kết quả gửi; khi kết quả chưa rõ phải chờ mã hết hạn trước khi yêu cầu lại' })
  @Post('otp')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.PARENT, Role.DRIVER, Role.BUS_ATTENDANT)
  @ApiOperation({
    summary: 'Yêu cầu gửi mã xác thực OTP báo nghỉ',
    description: 'Tự động gửi OTP tới số điện thoại người giám hộ (đối với học sinh) hoặc qua Email/SMS console (đối với nhân sự).',
  })
  @ApiResponse({ status: 200, type: LeaveNoticeOtpResponseDto, description: 'Gửi mã OTP thành công' })
  @ApiResponse({ status: 400, description: 'Chuyến xe không hợp lệ, học sinh đã lên xe hoặc đã quá giờ báo nghỉ' })
  @ApiResponse({ status: 409, description: 'Đã có báo nghỉ đang có hiệu lực cho chuyến xe này' })
  @ApiResponse({ status: 429, description: 'Yêu cầu gửi OTP quá nhanh, vui lòng chờ' })
  async requestOtp(
    @CurrentUser() user: User,
    @Body() dto: RequestLeaveNoticeOtpDto,
  ): Promise<LeaveNoticeOtpResponseDto> {
    return this.leaveNoticesService.requestOtp(user, dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.PARENT, Role.DRIVER, Role.BUS_ATTENDANT)
  @ApiOperation({
    summary: 'Xác thực OTP và ghi nhận báo nghỉ chính thức',
    description: 'Xác thực OTP và cập nhật trạng thái điểm danh học sinh sang ABSENT hoặc chuyến xe sang Chờ phân công.',
  })
  @ApiResponse({ status: 200, type: LeaveNoticeResponseDto, description: 'Báo nghỉ thành công' })
  @ApiResponse({ status: 400, description: 'Mã OTP không chính xác hoặc đã hết hạn' })
  @ApiResponse({ status: 409, description: 'Chuyến xe đã bắt đầu hoặc trạng thái phân công đã thay đổi' })
  async confirmNotice(
    @CurrentUser() user: User,
    @Body() dto: ConfirmLeaveNoticeDto,
  ): Promise<LeaveNoticeResponseDto> {
    return this.leaveNoticesService.confirmNotice(user, dto);
  }

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN, Role.DRIVER, Role.BUS_ATTENDANT, Role.PARENT)
  @ApiOperation({
    summary: 'Lấy danh sách các đơn báo nghỉ',
    description: 'Truy vấn danh sách đơn báo nghỉ theo phân quyền vai trò (Phụ huynh thấy con mình, nhân sự thấy đơn của mình, Admin thấy phạm vi trường/hệ thống).',
  })
  @ApiResponse({ status: 200, type: LeaveNoticeListResponseDto, description: 'Lấy danh sách thành công' })
  async listNotices(
    @CurrentUser() user: User,
    @Query() query: ListLeaveNoticesQueryDto,
  ): Promise<LeaveNoticeListResponseDto> {
    return this.leaveNoticesService.listNotices(user, query);
  }

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN, Role.DRIVER, Role.BUS_ATTENDANT, Role.PARENT)
  @ApiOperation({
    summary: 'Xem chi tiết một đơn báo nghỉ',
    description: 'Lấy thông tin chi tiết của đơn báo nghỉ kèm các cờ quyền hành động tương ứng.',
  })
  @ApiResponse({ status: 200, type: LeaveNoticeResponseDto, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn báo nghỉ' })
  async getNoticeDetail(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<LeaveNoticeResponseDto> {
    return this.leaveNoticesService.getNoticeDetail(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.PARENT, Role.DRIVER, Role.BUS_ATTENDANT)
  @ApiOperation({
    summary: 'Hủy báo nghỉ (Chỉ người tạo mới có quyền hủy)',
    description: 'Hủy đơn báo nghỉ trước khi chuyến xe xuất phát; khôi phục điểm danh trước đó đối với học sinh.',
  })
  @ApiResponse({ status: 200, type: LeaveNoticeResponseDto, description: 'Hủy báo nghỉ thành công' })
  @ApiResponse({ status: 400, description: 'Chuyến xe đã bắt đầu hoặc đã bố trí người thay thế' })
  @ApiResponse({ status: 403, description: 'Chỉ người tạo báo nghỉ mới có quyền hủy' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn báo nghỉ' })
  async cancelNotice(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<LeaveNoticeResponseDto> {
    return this.leaveNoticesService.cancelNotice(user, id);
  }

  @Get(':id/replacement-candidates')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách nhân sự thay thế khả dụng',
    description: 'Quản trị viên nhà xe lấy tài xế thay thế; Quản trị viên trường học lấy giáo viên phụ xe thay thế.',
  })
  @ApiResponse({ status: 200, type: ReplacementCandidatesResponseDto, description: 'Lấy ứng viên thành công' })
  @ApiResponse({ status: 400, description: 'Đơn báo nghỉ không ở trạng thái chờ phân công' })
  @ApiResponse({ status: 403, description: 'Không có quyền phân công nhân sự này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn báo nghỉ' })
  async getReplacementCandidates(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ReplacementCandidatesResponseDto> {
    return this.leaveNoticesService.getReplacementCandidates(user, id);
  }

  @Post(':id/assign-replacement')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Phân công nhân sự thay thế cho chuyến xe',
    description: 'Gán người thay thế cho chuyến xe và cập nhật đơn báo nghỉ sang REPLACED. Đổi giáo viên phụ xe sẽ đặt lại trạng thái Ready.',
  })
  @ApiResponse({ status: 200, type: LeaveNoticeResponseDto, description: 'Phân công nhân sự thành công' })
  @ApiResponse({ status: 400, description: 'Nhân sự thay thế không hợp lệ hoặc không thuộc trường' })
  @ApiResponse({ status: 409, description: 'Nhân sự đã có lịch chạy trùng giờ hoặc đơn báo nghỉ đã được xử lý' })
  async assignReplacement(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AssignReplacementDto,
  ): Promise<LeaveNoticeResponseDto> {
    return this.leaveNoticesService.assignReplacement(user, id, dto);
  }

  @Post(':id/cancel-trip')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Hủy chuyến xe khi không bố trí được nhân sự thay thế',
    description: 'Chuyển chuyến xe sang CANCELLED với lý do bắt buộc và đóng các đơn báo nghỉ nhân sự đang chờ phân công thành TRIP_CANCELLED. Hành động này không thể khôi phục.',
  })
  @ApiResponse({ status: 200, type: LeaveNoticeResponseDto, description: 'Hủy chuyến xe thành công' })
  @ApiResponse({ status: 400, description: 'Lý do hủy chuyến không được để trống' })
  @ApiResponse({ status: 409, description: 'Chuyến xe không còn ở trạng thái chờ vận hành' })
  async cancelTripFromNotice(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CancelTripFromNoticeDto,
  ): Promise<LeaveNoticeResponseDto> {
    return this.leaveNoticesService.cancelTripFromNotice(user, id, dto);
  }
}
