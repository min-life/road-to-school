import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, type User } from '@prisma/client';
import type { Response } from 'express';
import { AuthGuard } from '../../auth/auth.guard.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/auth-user.decorator.js';
import { IotDeviceGuard } from '../security/iot-device.guard.js';
import { IotDeviceParamsDto } from '../assignments/iot-assignment.dto.js';
import { ApiIotErrors } from '../iot-api-errors.js';
import { AttendanceService } from './attendance.service.js';
import {
  AttendanceScanDto,
  AttendanceActionDto,
  AttendanceTripParamsDto,
  AttendanceEventParamsDto,
  AttendanceListQueryDto,
  AttendanceEventDto,
  AttendanceListDto,
  AttendanceCaptureAckDto,
} from './attendance.dto.js';
@ApiTags('IoT Trip Attendance')
@Controller('iot/devices/:deviceId/attendance-scans')
@UseGuards(IotDeviceGuard)
@ApiHeader({ name: 'X-IoT-Device-Key', required: true })
@ApiParam({ name: 'deviceId' })
export class AttendanceDeviceController {
  constructor(private readonly attendance: AttendanceService) {}
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Capture RFID theo context; chỉ tạo candidate/rejection, chưa ghi điểm danh PG',
    description:
      '200 WAITING_CONFIRMATION, REJECTED hoặc ALREADY_RECORDED; retry cùng payload idempotent. Không gửi Student PII về ESP.',
  })
  @ApiResponse({ status: 200, type: AttendanceCaptureAckDto })
  @ApiIotErrors(400, 401, 404, 409, 503, 500)
  capture(@Param() p: IotDeviceParamsDto, @Body() dto: AttendanceScanDto) {
    return this.attendance.capture(p.deviceId, dto);
  }
}
@ApiTags('IoT Trip Attendance')
@Controller('trips/:tripId/rfid-scans')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.BUS_ATTENDANT)
@ApiBearerAuth('JWT-auth')
@ApiParam({ name: 'tripId', format: 'uuid' })
export class AttendanceTripController {
  constructor(private readonly attendance: AttendanceService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Hàng chờ/lịch sử RFID đúng phụ xe phân công; GET không ghi dữ liệu',
  })
  @ApiResponse({ status: 200, type: AttendanceListDto })
  @ApiIotErrors(400, 401, 403, 404, 503, 500)
  list(
    @Param() p: AttendanceTripParamsDto,
    @Query() q: AttendanceListQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.attendance.list(p.tripId, q, user);
  }
  @Post(':scanId/confirm')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'scanId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Phụ xe xác nhận; retry pending đọc PG receipt, không áp dụng lại lượt cũ',
    description:
      'Không nhận UID/Student/phase trong body. 200 APPLIED/ALREADY_RECORDED/historical hoặc REJECTED sau đối soát; 202 pending. current=false sau manual override.',
  })
  @ApiResponse({ status: 200, type: AttendanceEventDto })
  @ApiResponse({ status: 202, type: AttendanceEventDto })
  @ApiBody({
    type: AttendanceActionDto,
    required: false,
    description:
      'Empty body only; UID/Student/phase are inferred from stored candidate',
  })
  @ApiIotErrors(400, 401, 403, 404, 409, 410, 503, 500)
  async confirm(
    @Param() p: AttendanceEventParamsDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
    @Body() body: AttendanceActionDto,
  ) {
    void body;
    const result = await this.attendance.confirm(p.tripId, p.scanId, user);
    response.status(result.pending ? 202 : 200);
    return result.event;
  }
  @Post(':scanId/dismiss')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'scanId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Bỏ qua candidate/rejection; không ghi ABSENT, không hủy intent pending',
  })
  @ApiResponse({ status: 200, type: AttendanceEventDto })
  @ApiIotErrors(400, 401, 403, 404, 409, 503, 500)
  @ApiBody({ type: AttendanceActionDto, required: false })
  dismiss(
    @Param() p: AttendanceEventParamsDto,
    @CurrentUser() user: User,
    @Body() body: AttendanceActionDto,
  ) {
    void body;
    return this.attendance.dismiss(p.tripId, p.scanId, user);
  }
}
