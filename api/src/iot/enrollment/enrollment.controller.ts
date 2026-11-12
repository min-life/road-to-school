import {
  Body,
  Controller,
  Delete,
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
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Role, type User } from '@prisma/client';
import { AuthGuard } from '../../auth/auth.guard.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/auth-user.decorator.js';
import { IotDeviceGuard } from '../security/iot-device.guard.js';
import { IotDeviceParamsDto } from '../assignments/iot-assignment.dto.js';
import { ApiIotErrors } from '../iot-api-errors.js';
import { EnrollmentService } from './enrollment.service.js';
import {
  StartEnrollmentDto,
  EnrollmentIdDto,
  EnrollmentQueryDto,
  ConfirmEnrollmentDto,
  EnrollmentScanDto,
  EnrollmentResponseDto,
  EnrollmentListDto,
  EnrollmentCaptureAckDto,
  StudentRfidParamsDto,
  RevokeStudentRfidDto,
  StudentRfidBindingDto,
} from './enrollment.dto.js';
@ApiTags('IoT Card Enrollment')
@Controller('iot/enrollment-sessions')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
@ApiBearerAuth('JWT-auth')
export class EnrollmentController {
  constructor(private readonly enrollment: EnrollmentService) {}
  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Mở phiên REGISTER/REPLACE 5 phút; chỉ ESP32 chưa gắn xe, REPLACE giữ thẻ cũ tới confirm',
  })
  @ApiResponse({ status: 201, type: EnrollmentResponseDto })
  @ApiResponse({
    status: 200,
    type: EnrollmentResponseDto,
    description: 'Retry cùng phiên, không gia hạn',
  })
  @ApiIotErrors(400, 401, 403, 404, 409, 503)
  async start(
    @Body() dto: StartEnrollmentDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.enrollment.start(dto, user.id);
    response.status(result.created ? 201 : 200);
    return result.session;
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Phiên của người đang đăng nhập theo học sinh' })
  @ApiResponse({ status: 200, type: EnrollmentListDto })
  @ApiIotErrors(400, 401, 403, 503)
  list(@Query() q: EnrollmentQueryDto, @CurrentUser() user: User) {
    return this.enrollment.list(q.studentId, user.id, q.activeOnly);
  }
  @Get(':sessionId')
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Đọc trạng thái, candidate và feedback; không ghi dữ liệu trong GET',
  })
  @ApiResponse({ status: 200, type: EnrollmentResponseDto })
  @ApiIotErrors(400, 401, 403, 404, 503)
  get(@Param() p: EnrollmentIdDto, @CurrentUser() user: User) {
    return this.enrollment.get(p.sessionId, user.id);
  }
  @Post(':sessionId/confirm')
  @HttpCode(200)
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Xác nhận UID;202 nếu cần đối soát, không lặp ghi Student từ intent cũ',
  })
  @ApiResponse({ status: 200, type: EnrollmentResponseDto })
  @ApiResponse({
    status: 202,
    type: EnrollmentResponseDto,
    description: 'CONFIRMATION_PENDING: không mở phiên thay thế',
  })
  @ApiIotErrors(400, 401, 403, 404, 409, 410, 503)
  async confirm(
    @Param() p: EnrollmentIdDto,
    @Body() dto: ConfirmEnrollmentDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.enrollment.confirm(
      p.sessionId,
      dto.capturedScanId,
      user.id,
    );
    response.status(result.pending ? 202 : 200);
    return result.session;
  }
  @Post(':sessionId/reconcile')
  @HttpCode(200)
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Đối soát phiên pending kể cả creator bị khóa; PG read-only, không gán UID mới',
  })
  @ApiResponse({ status: 200, type: EnrollmentResponseDto })
  @ApiResponse({ status: 202, type: EnrollmentResponseDto })
  @ApiIotErrors(400, 401, 403, 404, 409, 503)
  async reconcile(
    @Param() p: EnrollmentIdDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.enrollment.reconcile(p.sessionId, user.id);
    response.status(result.pending ? 202 : 200);
    return { ...result.session, candidate: null, lastScanFeedback: null };
  }
  @Delete(':sessionId')
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Hủy phiên chưa xác nhận, không tháo UID hoặc hủy pending mù',
  })
  @ApiResponse({ status: 200, type: EnrollmentResponseDto })
  @ApiIotErrors(400, 401, 403, 404, 409, 503)
  cancel(@Param() p: EnrollmentIdDto, @CurrentUser() user: User) {
    return this.enrollment.cancel(p.sessionId, user.id);
  }
}
@ApiTags('IoT Card Enrollment')
@Controller('iot/students')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
@ApiBearerAuth('JWT-auth')
export class StudentRfidController {
  constructor(private readonly enrollment: EnrollmentService) {}
  @Delete(':studentId/rfid-card')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Hủy liên kết thẻ hiện tại theo UID/version; không đổi status, không xóa lịch sử; chặn phiên open/pending',
  })
  @ApiResponse({
    status: 200,
    type: StudentRfidBindingDto,
    description: 'UID null; retry khi đã null không ghi lại Student',
  })
  @ApiIotErrors(400, 401, 403, 404, 409, 503)
  revoke(@Param() p: StudentRfidParamsDto, @Body() dto: RevokeStudentRfidDto) {
    return this.enrollment.revoke(p.studentId, dto);
  }
}
@ApiTags('IoT Card Enrollment')
@Controller('iot/devices/:deviceId/enrollment-scans')
@UseGuards(IotDeviceGuard)
@ApiParam({ name: 'deviceId' })
@ApiHeader({ name: 'X-IoT-Device-Key', required: true })
export class EnrollmentDeviceController {
  constructor(private readonly enrollment: EnrollmentService) {}
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'ESP32 gửi UID ứng viên; không ghi Student/Mongo rfid_scans/điểm danh',
  })
  @ApiResponse({ status: 200, type: EnrollmentCaptureAckDto })
  @ApiIotErrors(400, 401, 403, 404, 409, 410, 503)
  capture(@Param() p: IotDeviceParamsDto, @Body() dto: EnrollmentScanDto) {
    return this.enrollment.capture(p.deviceId, dto);
  }
}
