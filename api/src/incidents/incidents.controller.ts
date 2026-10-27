import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { IncidentsService } from './incidents.service.js';
import { CreateIncidentDto } from './dto/create-incident.dto.js';
import { IncidentOptionsResponseDto } from './dto/incident-options-response.dto.js';
import {
  TripIncidentResponseDto,
  TripIncidentsTabResponseDto,
} from './dto/incident-response.dto.js';
import {
  ListIncidentsQueryDto,
  ListMineIncidentsQueryDto,
  PaginatedIncidentsResponseDto,
} from './dto/list-incidents-query.dto.js';
import { ResolveIncidentDto } from './dto/resolve-incident.dto.js';
import { CancelTripIncidentDto } from './dto/cancel-trip-incident.dto.js';
import { ConfirmIncidentDto } from './dto/confirm-incident.dto.js';
import { ReplacementCandidatesResponseDto } from './dto/replacement-candidates-response.dto.js';

@ApiTags('Operational Incidents')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get('trips/:id/incident-options')
  @Roles(Role.DRIVER, Role.BUS_ATTENDANT, Role.SCHOOL_ADMIN, Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Lấy điều kiện và tùy chọn báo sự cố cho Trip đang xem',
    description:
      'Kiểm tra vai trò nhân sự phân công, trạng thái SCHEDULED và cửa sổ thời gian LIVE (15 phút trước giờ chạy).',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (UUID)' })
  @ApiResponse({ status: 200, type: IncidentOptionsResponseDto })
  async getIncidentOptions(
    @Param('id') tripId: string,
    @CurrentUser() currentUser: User,
  ): Promise<IncidentOptionsResponseDto> {
    return this.incidentsService.getIncidentOptions(tripId, currentUser);
  }

  @Post('trips/:id/incidents')
  @Roles(Role.DRIVER, Role.BUS_ATTENDANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Báo thủ công sự cố thiếu nhân sự cho chuyến xe (Chỉ DRIVER hoặc BUS_ATTENDANT)',
    description:
      'Driver chỉ được báo ATTENDANT_MISSING; Bus Attendant chỉ được báo DRIVER_MISSING. Yêu cầu Trip SCHEDULED chưa chạy.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (UUID)' })
  @ApiResponse({ status: 200, type: TripIncidentResponseDto })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc loại sự cố không được phép' })
  @ApiResponse({ status: 403, description: 'Không đúng vai trò hoặc không thuộc chuyến xe' })
  @ApiResponse({ status: 409, description: 'Xung đột trạng thái, đổi nhân sự hoặc hết giờ' })
  async createManualIncident(
    @Param('id') tripId: string,
    @Body() dto: CreateIncidentDto,
    @CurrentUser() currentUser: User,
  ): Promise<TripIncidentResponseDto> {
    return this.incidentsService.createManualIncident(tripId, dto, currentUser);
  }

  @Get('trips/:id/incidents')
  @Roles(Role.DRIVER, Role.BUS_ATTENDANT, Role.PARENT, Role.SCHOOL_ADMIN, Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Danh sách sự cố trong Tab xem của một chuyến xe (Có Privacy Masking cho Phụ huynh)',
    description:
      'Hiển thị tất cả sự cố của chuyến xe bao gồm cả trạng thái chờ xử lý. Phụ huynh chỉ thấy loại, thời điểm và trạng thái.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (UUID)' })
  @ApiResponse({ status: 200, type: TripIncidentsTabResponseDto })
  async listByTrip(
    @Param('id') tripId: string,
    @CurrentUser() currentUser: User,
  ): Promise<TripIncidentsTabResponseDto> {
    return this.incidentsService.listByTrip(tripId, currentUser);
  }

  @Get('incidents/mine')
  @Roles(Role.DRIVER, Role.BUS_ATTENDANT, Role.SCHOOL_ADMIN, Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Lấy lịch sử sự cố cá nhân của nhân sự (Tiện ích Sự cố Mobile)',
    description:
      'Chỉ trả về sự cố do chính người dùng báo hoặc sự cố tự động đã được chính người dùng xác nhận.',
  })
  @ApiResponse({ status: 200, type: PaginatedIncidentsResponseDto })
  async listMine(
    @Query() query: ListMineIncidentsQueryDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedIncidentsResponseDto> {
    return this.incidentsService.listMine(query, currentUser);
  }

  @Get('incidents')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Danh sách sự cố vận hành cho Quản trị viên (Web Admin)',
    description:
      'School Admin được giới hạn tự động theo trường học của mình. System Admin có thể lọc theo trường học bất kỳ.',
  })
  @ApiResponse({ status: 200, type: PaginatedIncidentsResponseDto })
  async listAdmin(
    @Query() query: ListIncidentsQueryDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedIncidentsResponseDto> {
    return this.incidentsService.listAdmin(query, currentUser);
  }

  @Get('incidents/:id/replacement-candidates')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách ứng viên nhân sự thay thế cho sự cố thiếu nhân sự',
    description:
      'Lọc nhân sự active, đúng vai trò (Giáo viên phụ xe phải cùng trường), không trùng lịch chuyến xe khác trong ngày.',
  })
  @ApiParam({ name: 'id', description: 'ID sự cố (UUID)' })
  @ApiResponse({ status: 200, type: ReplacementCandidatesResponseDto })
  async getReplacementCandidates(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<ReplacementCandidatesResponseDto> {
    return this.incidentsService.getReplacementCandidates(id, currentUser);
  }

  @Get('incidents/:id')
  @Roles(Role.DRIVER, Role.BUS_ATTENDANT, Role.PARENT, Role.SCHOOL_ADMIN, Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Chi tiết một sự cố vận hành theo ID',
    description: 'Áp dụng phân quyền và Privacy Masking cho Phụ huynh.',
  })
  @ApiParam({ name: 'id', description: 'ID sự cố (UUID)' })
  @ApiResponse({ status: 200, type: TripIncidentResponseDto })
  async getDetail(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<TripIncidentResponseDto> {
    return this.incidentsService.getDetail(id, currentUser);
  }

  @Post('incidents/:id/resolve')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quản trị viên xử lý sự cố thiếu nhân sự (ARRIVED hoặc REPLACED)',
    description:
      'ARRIVED xác nhận người cũ đã đến. REPLACED cập nhật nhân sự mới cho chuyến xe và đồng bộ trạng thái Báo nghỉ.',
  })
  @ApiParam({ name: 'id', description: 'ID sự cố (UUID)' })
  @ApiResponse({ status: 200, type: TripIncidentResponseDto })
  @ApiResponse({ status: 400, description: 'Thiếu nhân sự thay thế hoặc dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền xử lý sự cố của trường hoặc vai trò này' })
  @ApiResponse({ status: 409, description: 'Sự cố đã được xử lý hoặc xung đột trạng thái' })
  async resolveIncident(
    @Param('id') id: string,
    @Body() dto: ResolveIncidentDto,
    @CurrentUser() currentUser: User,
  ): Promise<TripIncidentResponseDto> {
    return this.incidentsService.resolveIncident(id, dto, currentUser);
  }

  @Post('incidents/:id/cancel-trip')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hủy chuyến xe do không thể bố trí nhân sự thay thế',
    description:
      'Chuyển Trip sang CANCELLED, đóng sự cố hiện tại và tất cả sự cố/báo nghỉ nhân sự khác của chuyến xe.',
  })
  @ApiParam({ name: 'id', description: 'ID sự cố (UUID)' })
  @ApiResponse({ status: 200, type: TripIncidentResponseDto })
  @ApiResponse({ status: 400, description: 'Lý do hủy không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền hủy chuyến xe này' })
  @ApiResponse({ status: 409, description: 'Chuyến xe không ở trạng thái SCHEDULED' })
  async cancelTripFromIncident(
    @Param('id') id: string,
    @Body() dto: CancelTripIncidentDto,
    @CurrentUser() currentUser: User,
  ): Promise<TripIncidentResponseDto> {
    return this.incidentsService.cancelTripFromIncident(id, dto, currentUser);
  }

  @Post('incidents/:id/confirm')
  @Roles(Role.BUS_ATTENDANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Giáo viên phụ xe xác nhận sự cố tự động (OFF_ROUTE hoặc LATE_STOP)',
    description:
      'Bắt buộc nhập lý do giải trình. Sau khi xác nhận thành công, sự cố chuyển sang CONFIRMED và xuất hiện trong Tiện ích Sự cố cá nhân.',
  })
  @ApiParam({ name: 'id', description: 'ID sự cố (UUID)' })
  @ApiResponse({ status: 200, type: TripIncidentResponseDto })
  @ApiResponse({ status: 400, description: 'Lý do không hợp lệ hoặc sự cố không phải loại tự động' })
  @ApiResponse({ status: 403, description: 'Chỉ giáo viên phụ xe của chuyến xe mới có quyền xác nhận' })
  @ApiResponse({ status: 409, description: 'Sự cố đã được xác nhận hoặc đã đóng' })
  async confirmAutoIncident(
    @Param('id') id: string,
    @Body() dto: ConfirmIncidentDto,
    @CurrentUser() currentUser: User,
  ): Promise<TripIncidentResponseDto> {
    return this.incidentsService.confirmAutoIncident(id, dto, currentUser);
  }
}
