import { AdminTripResponseDto } from './dto/admin-trip-response.dto.js';
import {
  CalendarEntryResponseDto,
  ScheduledChangeResponseDto,
} from './dto/lifecycle-response.dto.js';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { ScheduledChangesService } from './scheduled-changes.service.js';
import { ServiceCalendarService } from './service-calendar.service.js';
import {
  CalendarDecisionDto,
  CreateCalendarEntryDto,
  FinalizeTripDto,
} from './dto/service-calendar.dto.js';
import { TripFinalizationService } from './trip-finalization.service.js';

@ApiTags('School lifecycle')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN', 'SCHOOL_ADMIN')
@ApiResponse({
  status: 500,
  description: 'Không ghi được thay đổi; transaction rollback',
})
@ApiResponse({ status: 400, description: 'Dữ liệu/ngày không hợp lệ' })
@ApiResponse({
  status: 401,
  description: 'Chưa xác thực hoặc trường ngừng hoạt động',
})
@ApiResponse({ status: 403, description: 'Sai vai trò hoặc phạm vi trường' })
@ApiResponse({ status: 404, description: 'Không tìm thấy dữ liệu' })
@ApiResponse({
  status: 409,
  description:
    'Lịch đã đến hạn, trùng lịch nghỉ nhà xe hoặc trạng thái thay đổi đồng thời',
})
@Controller()
export class SchoolLifecycleController {
  constructor(
    private readonly changes: ScheduledChangesService,
    private readonly calendar: ServiceCalendarService,
    private readonly finalization: TripFinalizationService,
  ) {}
  @Get('schools/:schoolId/scheduled-changes')
  @ApiOperation({
    summary: 'Xem lịch thay đổi trường; GET không đối soát/ghi DB',
  })
  @ApiParam({ name: 'schoolId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description:
      'Danh sách SchoolScheduledChange: id, schoolId, type, effectiveDate, payload, status, audit',
    type: ScheduledChangeResponseDto,
    isArray: true,
  })
  listChanges(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @CurrentUser() actor: User,
  ) {
    return this.changes.list(schoolId, actor);
  }

  @Post('schools/:schoolId/scheduled-changes/:id/cancel')
  @HttpCode(200)
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Hủy lịch thay đổi trước ngày hiệu lực' })
  @ApiParam({ name: 'schoolId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    type: ScheduledChangeResponseDto,
    description: 'Lịch chuyển CANCELLED; không phục hồi chuyến đã hủy',
  })
  cancelChange(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: User,
  ) {
    return this.changes.cancel(schoolId, id, actor);
  }

  @Get('service-calendar')
  @ApiOperation({
    summary:
      'Xem ngày nghỉ và yêu cầu học bù; trường thấy lịch nhà xe và trường mình',
  })
  @ApiQuery({ name: 'schoolId', required: false, format: 'uuid' })
  @ApiResponse({
    status: 200,
    description:
      'Danh sách ServiceCalendarEntry; APPROVED học bù vẫn bị chặn bởi bất kỳ nghỉ nhà xe trùng ngày',
    type: CalendarEntryResponseDto,
    isArray: true,
  })
  listCalendar(
    @CurrentUser() actor: User,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.calendar.list(actor, schoolId);
  }

  @Post('service-calendar')
  @ApiOperation({
    summary: 'Tạo ngày nghỉ hoặc đề nghị học bù',
    description:
      'HOLIDAY được duyệt ngay theo phạm vi quyền. MAKEUP là ONCE, bắt buộc trường/giờ, chờ SYSTEM_ADMIN duyệt. Báo trước ngày. Âm lịch UTC+7; ngày lặp không tồn tại bỏ lần đó.',
  })
  @ApiResponse({
    status: 201,
    type: CalendarEntryResponseDto,
    description:
      'ServiceCalendarEntry được tạo: HOLIDAY APPROVED / MAKEUP PENDING',
  })
  createCalendar(
    @Body() dto: CreateCalendarEntryDto,
    @CurrentUser() actor: User,
  ) {
    return this.calendar.create(dto, actor);
  }

  @Post('service-calendar/:id/decision')
  @HttpCode(200)
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Duyệt hoặc từ chối học bù trước ngày diễn ra' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    type: CalendarEntryResponseDto,
    description: 'ServiceCalendarEntry APPROVED/REJECTED và audit người duyệt',
  })
  decideCalendar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CalendarDecisionDto,
    @CurrentUser() actor: User,
  ) {
    return this.calendar.decide(id, dto, actor);
  }

  @Post('service-calendar/:id/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Hủy thông báo ngày nghỉ trước ngày; không phục hồi Trip CANCELLED',
    description: 'Chưa hỗ trợ hủy học bù.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    type: CalendarEntryResponseDto,
    description: 'Ngày nghỉ chuyển CANCELLED',
  })
  cancelCalendar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: User,
  ) {
    return this.calendar.cancel(id, actor);
  }

  @Get('trips/admin-finalizations')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({
    summary:
      'Danh sách chuyến ngoại lệ đang chờ admin; tính cả sự kiện đến hạn chưa đối soát',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách Trip giữ nguyên trạng thái, có lý do chờ chốt',
    type: AdminTripResponseDto,
    isArray: true,
  })
  pending(@CurrentUser() actor: User) {
    return this.finalization.list(actor);
  }

  @Post('trips/:id/admin-finalization')
  @HttpCode(200)
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({
    summary: 'Admin chốt chuyến ngoại lệ COMPLETED/CANCELLED',
    description:
      'Bắt buộc lý do và expectedStatus; không tự sửa điểm danh/alightedAt hoặc actualEndTime. Chốt xong mới giải phóng nguồn lực ngoại lệ.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description:
      'Trip giữ toàn bộ dữ liệu cũ, thêm adminFinalization FINALIZED',
    type: AdminTripResponseDto,
  })
  finalize(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizeTripDto,
    @CurrentUser() actor: User,
  ) {
    return this.finalization.finalize(id, dto, actor);
  }
}
