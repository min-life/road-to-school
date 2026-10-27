import { Body, ConflictException, Controller, Delete, Get, Param, ParseUUIDPipe, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role, type User } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentSessionId, CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { NotificationListDto, NotificationResultDto, NotificationSummaryDto, NotificationTargetDto, NotificationsQueryDto, PushRegistrationDto } from './notifications.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@ApiResponse({ status: 400, description: 'Query/body/UUID không hợp lệ' })
@ApiResponse({ status: 401, description: 'Phiên không hợp lệ hoặc bị thu hồi' })
@ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
@ApiResponse({ status: 404, description: 'Thông báo không thuộc tài khoản hoặc không tồn tại' })
@ApiResponse({ status: 409, description: 'Tài khoản hoặc phiên đăng ký thiết bị đã thay đổi' })
@ApiResponse({ status: 500, description: 'Lỗi hệ thống' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() @ApiOperation({ summary: 'Danh sách thông báo cá nhân, GET không đánh đã đọc' }) @ApiResponse({ status: 200, type: NotificationListDto })
  list(@CurrentUser() user: User, @Query() query: NotificationsQueryDto) { return this.notifications.list(user, query); }
  @Get('summary') @ApiOperation({ summary: 'Chưa đọc và sự cố cần xử lý theo role, toàn phạm vi tài khoản' }) @ApiResponse({ status: 200, type: NotificationSummaryDto })
  summary(@CurrentUser() user: User) { return this.notifications.summary(user); }
  @Put('read-all') @ApiOperation({ summary: 'Đánh dấu đã đọc; không thay trạng thái sự cố' }) @ApiResponse({ status: 200, type: NotificationResultDto })
  readAll(@CurrentUser() user: User) { return this.notifications.read(user); }
  @Put('device') @Roles(Role.DRIVER, Role.BUS_ATTENDANT, Role.PARENT) @ApiOperation({ summary: 'Đăng ký Expo token vào Session hiện tại, không gửi push' }) @ApiResponse({ status: 200, type: NotificationResultDto })
  register(@CurrentUser() user: User, @CurrentSessionId() sid: string, @Body() body: PushRegistrationDto) {
    if (body.expectedUserId !== user.id) throw new ConflictException('Tài khoản đã thay đổi, vui lòng đăng ký lại thiết bị');
    return this.notifications.register(user, sid, body.token);
  }
  @Delete('device') @Roles(Role.DRIVER, Role.BUS_ATTENDANT, Role.PARENT) @ApiOperation({ summary: 'Ngừng nhận push trên Session hiện tại' }) @ApiResponse({ status: 200, type: NotificationResultDto })
  unregister(@CurrentUser() user: User, @CurrentSessionId() sid: string) { return this.notifications.register(user, sid, null); }
  @Get(':id/target') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ summary: 'Kiểm quyền/trạng thái mới nhất và trả đích nội bộ an toàn' }) @ApiResponse({ status: 200, type: NotificationTargetDto })
  target(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) { return this.notifications.target(user, id); }
  @Put(':id/read') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ summary: 'Đánh dấu một thông báo thuộc tài khoản đã đọc' }) @ApiResponse({ status: 200, type: NotificationResultDto })
  read(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) { return this.notifications.read(user, id); }
}
