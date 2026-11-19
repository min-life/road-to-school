import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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

function enrollmentSchoolScope(user: User): string | undefined {
  if (user.role === Role.SYSTEM_ADMIN) return undefined;
  if (user.role === Role.SCHOOL_ADMIN && user.schoolId) return user.schoolId;
  throw new ForbiddenException('Tài khoản chưa được gán quyền đăng ký thẻ cho trường');
}

@ApiTags('IoT Card Enrollment')
@Controller('iot/enrollment-sessions')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
@ApiBearerAuth('JWT-auth')
export class EnrollmentController {
  constructor(private readonly enrollment: EnrollmentService) {}
  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Mở phiên REGISTER/REPLACE 5 phút, giữ thẻ cũ đến khi xác nhận',
    description:
      'SYSTEM_ADMIN có thể đăng ký hoặc đổi thẻ. SCHOOL_ADMIN chỉ đăng ký thẻ mới cho học sinh của trường mình. ESP32 đã gắn xe cần firmware từ 1.4.0 và xe chưa có chuyến sẵn sàng hoặc đang phục vụ.',
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
    const result = await this.enrollment.start(dto, user.id, enrollmentSchoolScope(user));
    response.status(result.created ? 201 : 200);
    return result.session;
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Phiên do người đăng nhập mở cho học sinh thuộc phạm vi quản lý' })
  @ApiResponse({ status: 200, type: EnrollmentListDto })
  @ApiIotErrors(400, 401, 403, 404, 503)
  list(@Query() q: EnrollmentQueryDto, @CurrentUser() user: User) {
    return this.enrollment.list(q.studentId, user.id, q.activeOnly, enrollmentSchoolScope(user));
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
    return this.enrollment.get(p.sessionId, user.id, enrollmentSchoolScope(user));
  }
  @Post(':sessionId/confirm')
  @HttpCode(200)
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Xác nhận UID; trả 409 nếu xe đã sẵn sàng hoặc đang phục vụ, 202 nếu cần đối soát',
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
      false,
      enrollmentSchoolScope(user),
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
      'Đối soát phiên pending; SCHOOL_ADMIN chỉ đối soát phiên đăng ký do mình mở trong trường',
  })
  @ApiResponse({ status: 200, type: EnrollmentResponseDto })
  @ApiResponse({ status: 202, type: EnrollmentResponseDto })
  @ApiIotErrors(400, 401, 403, 404, 409, 503)
  async reconcile(
    @Param() p: EnrollmentIdDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.enrollment.reconcile(p.sessionId, user.id, enrollmentSchoolScope(user));
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
    return this.enrollment.cancel(p.sessionId, user.id, enrollmentSchoolScope(user));
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
      'ESP32 gửi UID ứng viên; trả 409 nếu xe cần phục vụ chuyến, không ghi điểm danh',
  })
  @ApiResponse({ status: 200, type: EnrollmentCaptureAckDto })
  @ApiIotErrors(400, 401, 403, 404, 409, 410, 503)
  capture(@Param() p: IotDeviceParamsDto, @Body() dto: EnrollmentScanDto) {
    return this.enrollment.capture(p.deviceId, dto);
  }
}
