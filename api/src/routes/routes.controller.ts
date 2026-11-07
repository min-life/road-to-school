import { GeographyQueryDto } from '../schools/dto/geography.dto.js';
import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiQuery,
} from '@nestjs/swagger';
import { RoutesService } from './routes.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { Role, RouteDirection, RoutePlanStatus } from '@prisma/client';
import type { User } from '@prisma/client';
import { RoutePreparationDto } from './dto/route-preparation.dto.js';
import { OptimizeRouteDto } from './dto/optimize-route.dto.js';
import { RoutePreviewResponseDto } from './dto/route-preview-response.dto.js';
import { CancelReturnRouteDto } from './dto/cancel-return-route.dto.js';
import { ConfirmRoutePlanDto } from './dto/confirm-route-plan.dto.js';
import { RoutePlanResponseDto } from './dto/route-plan-response.dto.js';
import { RouteResponseDto } from './dto/route-response.dto.js';
import { StudentRoutingDetailDto } from './dto/student-routing-status.dto.js';
import { CancelRoutePlanDto } from './dto/cancel-route-plan.dto.js';
import { ListRoutePlansQueryDto } from './dto/list-route-plans-query.dto.js';
import { ApprovalReadinessResponseDto } from './dto/approval-readiness.dto.js';
import { AssignVehicleGroupDto } from './dto/assign-vehicle-group.dto.js';
import { AssignDriverGroupDto } from './dto/assign-driver-group.dto.js';
import { AssignBusAttendantGroupDto } from './dto/assign-bus-attendant-group.dto.js';
import { ResourceAvailabilityService } from './resource-availability.service.js';
import {
  CandidateVehiclesResponseDto,
  CandidateDriversResponseDto,
  CandidateBusAttendantsResponseDto,
} from './dto/assignment-candidates.dto.js';
import { RoutePlanCancellationImpactDto } from './dto/route-plan-cancellation-impact.dto.js';
import {
  StudentInsertionOptionsResponseDto,
  PreviewStudentInsertionDto,
  PreviewStudentInsertionResponseDto,
  ConfirmStudentInsertionDto,
} from './dto/student-insertion.dto.js';

@ApiTags('Routes & VRP Optimization')
@ApiResponse({ status: 409, description: 'Phương án không còn hiệu lực hoặc nguồn lực có chuyến chờ admin chốt' })
@Controller('routes')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly resourceAvailabilityService: ResourceAvailabilityService,
  ) {}

  @Get('preparation/:schoolId')
  @Roles(Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Dữ liệu chuẩn bị lập tuyến (Chỉ SYSTEM_ADMIN)',
    description:
      'Lấy danh sách học sinh đủ điều kiện (AVAILABLE, có tọa độ, chưa có tuyến DRAFT), phương tiện khả dụng (sắp xếp theo seatCount giảm dần) và thông tin trường, bãi xe. provinceId/wardId chỉ thu hẹp danh sách theo lựa chọn người dùng sau kiểm eligibility; không gửi thì không tự lọc địa giới, không thay tiêu chí hoặc studentIds khi optimize/confirm.',
  })
  @ApiParam({ name: 'schoolId', description: 'ID của trường học đối tác' })
  @ApiResponse({
    status: 200,
    description: 'Dữ liệu chuẩn bị lập tuyến thành công',
    type: RoutePreparationDto,
  })
  @ApiResponse({ status: 400, description: 'Bộ lọc địa giới không hợp lệ' })
  async getPreparationData(
    @Param('schoolId') schoolId: string,
    @Query() query: GeographyQueryDto,
  ): Promise<RoutePreparationDto> {
    return this.routesService.getPreparationData(schoolId, query);
  }

  @ApiResponse({ status: 409, description: 'Học sinh đã thuộc phương án khác hoặc dữ liệu nguồn đã thay đổi' })
  @Post('optimize-preview')
  @Roles(Role.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chạy tối ưu VRP VietMap hai chiều tạo phương án Preview (Chỉ SYSTEM_ADMIN)',
    description:
      'Thực thi VietMap VRP chiều đi (Bãi xe -> Học sinh -> Trường) và chiều về (Trường -> Học sinh -> Bãi xe). Đảm bảo xe chiều về là tập con xe chiều đi và học sinh có đủ hai chiều.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tối ưu VRP thành công, trả về phương án Preview',
    type: RoutePreviewResponseDto,
  })
  async optimizePreview(
    @Body() dto: OptimizeRouteDto,
    @CurrentUser() currentUser: User,
  ): Promise<RoutePreviewResponseDto> {
    return this.routesService.optimizePreview(dto, currentUser);
  }

  @Post('preview/cancel-return')
  @Roles(Role.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hủy một tuyến về trong Preview và tính toán lại tuyến đi (Chỉ SYSTEM_ADMIN)',
    description:
      'Hủy một tuyến về riêng lẻ, loại các học sinh liên quan khỏi tuyến đi và tối ưu lại các tuyến đi bị ảnh hưởng bằng VietMap TSP v4. Chặn thao tác nếu làm tuyến đi rỗng.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật Preview sau khi hủy tuyến về thành công',
    type: RoutePreviewResponseDto,
  })
  async cancelReturnRoute(
    @Body() dto: CancelReturnRouteDto,
  ): Promise<RoutePreviewResponseDto> {
    return this.routesService.cancelReturnRoute(dto.previewToken, dto.returnRouteIndex);
  }

  @ApiResponse({ status: 409, description: 'Dữ liệu xem trước đã đổi, học sinh đã có phương án hoặc nguồn lực không còn phù hợp' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phiên xem trước còn hiệu lực' })
  @Post('confirm-plan')
  @Roles(Role.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Xác nhận lưu toàn bộ phương án RoutePlan DRAFT atomically (Chỉ SYSTEM_ADMIN)',
    description:
      'Lưu toàn bộ phương án Preview thành một RoutePlan DRAFT duy nhất trong một transaction atomic. Lưu các xe đề xuất, không cho phép xác nhận tuyến riêng lẻ.',
  })
  @ApiResponse({
    status: 201,
    description: 'Xác nhận và lưu RoutePlan DRAFT thành công',
    type: RoutePlanResponseDto,
  })
  async confirmPlan(
    @Body() dto: ConfirmRoutePlanDto,
    @CurrentUser() currentUser: User,
  ): Promise<RoutePlanResponseDto> {
    return this.routesService.confirmPreview(dto, currentUser);
  }

  @Get('route-plans')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Danh sách phương án tuyến RoutePlan',
    description:
      'Lấy danh sách các RoutePlan (DRAFT, CANCELLED). School Admin chỉ xem được phương án của trường mình.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách RoutePlan phân trang',
  })
  async listRoutePlans(
    @Query() query: ListRoutePlansQueryDto,
    @CurrentUser() currentUser?: User,
  ) {
    return this.routesService.listRoutePlans(query, currentUser!);
  }

  @Get('route-plans/:id')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Chi tiết phương án tuyến RoutePlan',
    description: 'Lấy chi tiết RoutePlan cùng tất cả các tuyến thành phần.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết RoutePlan',
    type: RoutePlanResponseDto,
  })
  async getRoutePlanDetail(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<RoutePlanResponseDto> {
    return this.routesService.getRoutePlanDetail(id, currentUser);
  }

  @Get('route-plans/:id/cancellation-impact')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Đánh giá tác động khi hủy phương án tuyến (DRAFT hoặc ACTIVE)',
    description:
      'Tính toán số lượng chuyến xe SCHEDULED bị ảnh hưởng, danh sách học sinh bị ngắt phân tuyến và các đơn xin nghỉ phép liên quan trước khi hủy.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan cần đánh giá tác động' })
  @ApiResponse({
    status: 200,
    description: 'Báo cáo tác động hủy phương án tuyến',
    type: RoutePlanCancellationImpactDto,
  })
  async getCancellationImpact(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<RoutePlanCancellationImpactDto> {
    return this.routesService.getCancellationImpact(id, currentUser);
  }

  @Post('route-plans/:id/cancel')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hủy toàn bộ phương án tuyến RoutePlan (DRAFT hoặc ACTIVE)',
    description:
      'Bắt buộc expectedFingerprint từ cancellation-impact. Chỉ hủy Trip chưa frozen; giữ chuyến frozen và giữ nguồn lực đến khi kết thúc. Fingerprint thiếu trả 400, thay đổi trả 409.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan cần hủy' })
  @ApiResponse({
    status: 200,
    description: 'Hủy toàn bộ RoutePlan thành công',
  })
  @ApiResponse({ status: 400, description: 'Thiếu expectedFingerprint hoặc payload không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Fingerprint đã thay đổi; tải lại cancellation-impact' })
  async cancelRoutePlan(
    @Param('id') id: string,
    @Body() dto: CancelRoutePlanDto,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    return this.routesService.cancelRoutePlan(id, dto.reason, currentUser, dto.expectedFingerprint);
  }

  @Get('route-plans/:id/approval-readiness')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Kiểm tra mức độ sẵn sàng phê duyệt phương án tuyến',
    description:
      'Thẩm định điều kiện kích hoạt phương án và hạn hợp đồng. blockers có thể có CONTRACT_EXPIRED; không dựa riêng status đã lưu để cho phép duyệt.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan cần kiểm tra' })
  @ApiResponse({
    status: 200,
    description: 'Báo cáo mức độ sẵn sàng phê duyệt',
    type: ApprovalReadinessResponseDto,
  })
  async getApprovalReadiness(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<ApprovalReadinessResponseDto> {
    return this.routesService.getApprovalReadiness(id, currentUser);
  }

  @Post('route-plans/:id/re-optimize')
  @Roles(Role.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tối ưu lại toàn bộ các tuyến trong RoutePlan theo bãi xe / trường học mới (Chỉ SYSTEM_ADMIN)',
    description:
      'Tối ưu lại tuyến theo nguyên tắc Route-by-Route: Giữ nguyên phân bổ học sinh và xe của từng tuyến. Chỉ kiểm tra 2 điều kiện: thời gian di chuyển tối đa và thời gian dừng xử lý. Cơ chế All-or-Nothing: nếu có tuyến vi phạm, lập tức báo lỗi và không cập nhật bất kỳ tuyến nào khác. Thành công: chuyển RoutePlan về DRAFT chờ School Admin duyệt.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan cần tối ưu lại' })
  @ApiResponse({
    status: 200,
    description: 'Tối ưu lại toàn bộ các tuyến thành công và đưa phương án về DRAFT',
    type: RoutePlanResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Có tuyến vi phạm thời gian di chuyển tối đa hoặc không tìm được lộ trình hợp lệ',
  })
  async reoptimizeRoutePlan(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<RoutePlanResponseDto> {
    return this.routesService.reoptimizeRoutePlan(id, currentUser);
  }

  @ApiResponse({ status: 409, description: 'Phương án/hợp đồng không còn hiệu lực hoặc nguồn lực còn chuyến hết hợp đồng chờ quản trị viên chốt' })
  @Post('route-plans/:id/approve')
  @Roles(Role.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Phê duyệt kích hoạt phương án tuyến DRAFT sang ACTIVE (Chỉ SCHOOL_ADMIN của trường)',
    description:
      'Chuyển trạng thái phương án từ DRAFT sang ACTIVE sau khi thẩm định 100% điều kiện tài nguyên. SYSTEM_ADMIN không có quyền gọi endpoint này.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan cần phê duyệt' })
  @ApiResponse({
    status: 200,
    description: 'Phê duyệt kích hoạt phương án thành công',
    type: RoutePlanResponseDto,
  })
  async approveRoutePlan(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<RoutePlanResponseDto> {
    return this.routesService.approveRoutePlan(id, currentUser);
  }

  @ApiResponse({ status: 409, description: 'Phương án/hợp đồng không còn hiệu lực hoặc nguồn lực còn chuyến hết hợp đồng chờ quản trị viên chốt' })
  @Get('route-plans/:id/candidate-vehicles')
  @Roles(Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Danh sách xe ứng viên khả dụng để thay thế cho nhóm xe (Chỉ SYSTEM_ADMIN)',
    description:
      'Lọc danh sách xe khả dụng theo sức chứa tối thiểu của nhóm tuyến và loại trừ xe đã dùng ở nhóm khác.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan' })
  @ApiQuery({ name: 'currentVehicleId', required: false, description: 'ID xe hiện tại của nhóm cần thay' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách xe ứng viên',
    type: CandidateVehiclesResponseDto,
  })
  async getCandidateVehicles(
    @Param('id') id: string,
    @Query('currentVehicleId') currentVehicleId?: string,
  ): Promise<CandidateVehiclesResponseDto> {
    return this.resourceAvailabilityService.getCandidateVehicles(id, currentVehicleId);
  }

  @ApiResponse({ status: 409, description: 'Phương án/hợp đồng không còn hiệu lực hoặc nguồn lực còn chuyến hết hợp đồng chờ quản trị viên chốt' })
  @Get('route-plans/:id/candidate-drivers')
  @Roles(Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Danh sách tài xế ứng viên khả dụng cho nhóm xe (Chỉ SYSTEM_ADMIN)',
    description:
      'Lọc danh sách tài xế thỏa mãn quy tắc Đơn trường trong thời gian hợp đồng trường chồng lấn.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'ID xe của nhóm phân công' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tài xế ứng viên',
    type: CandidateDriversResponseDto,
  })
  async getCandidateDrivers(
    @Param('id') id: string,
    @Query('vehicleId') vehicleId?: string,
  ): Promise<CandidateDriversResponseDto> {
    return this.resourceAvailabilityService.getCandidateDrivers(id, vehicleId);
  }

  @ApiResponse({ status: 409, description: 'Phương án/hợp đồng không còn hiệu lực hoặc nguồn lực còn chuyến hết hợp đồng chờ quản trị viên chốt' })
  @Get('route-plans/:id/candidate-bus-attendants')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Danh sách giáo viên phụ xe ứng viên khả dụng (Chỉ SCHOOL_ADMIN trường sở tại)',
    description:
      'Lọc danh sách giáo viên phụ xe thuộc biên chế của trường đang lập phương án.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách giáo viên phụ xe ứng viên',
    type: CandidateBusAttendantsResponseDto,
  })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Xe của nhóm đang chỉnh, để giữ phụ xe hiện tại trong danh sách ứng viên' })
  async getCandidateBusAttendants(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
    @Query('vehicleId') vehicleId?: string,
  ): Promise<CandidateBusAttendantsResponseDto> {
    return this.resourceAvailabilityService.getCandidateBusAttendants(id, currentUser.schoolId || undefined, vehicleId);
  }

  @ApiResponse({ status: 409, description: 'Phương án/hợp đồng không còn hiệu lực hoặc nguồn lực còn chuyến hết hợp đồng chờ quản trị viên chốt' })
  @Patch('route-plans/:id/assignments/vehicle')
  @Roles(Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Thay đổi phương tiện mặc định cho nhóm tuyến (Chỉ SYSTEM_ADMIN)',
    description:
      'Cập nhật đồng bộ phương tiện mới cho toàn bộ các tuyến trong nhóm đang sử dụng xe cũ.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan' })
  @ApiResponse({
    status: 200,
    description: 'Thay đổi phương tiện mặc định thành công',
    type: RoutePlanResponseDto,
  })
  async replaceVehicleGroup(
    @Param('id') id: string,
    @Body() dto: AssignVehicleGroupDto,
    @CurrentUser() currentUser: User,
  ): Promise<RoutePlanResponseDto> {
    return this.routesService.replaceVehicleGroup(id, dto, currentUser);
  }

  @ApiResponse({ status: 409, description: 'Phương án/hợp đồng không còn hiệu lực hoặc nguồn lực còn chuyến hết hợp đồng chờ quản trị viên chốt' })
  @Patch('route-plans/:id/assignments/driver')
  @Roles(Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Gán hoặc đổi tài xế mặc định cho nhóm xe (Chỉ SYSTEM_ADMIN)',
    description:
      'Cập nhật đồng bộ tài xế mặc định cho tất cả các tuyến sử dụng xe được chỉ định. Áp dụng quy tắc Đơn trường.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan' })
  @ApiResponse({
    status: 200,
    description: 'Gán tài xế mặc định thành công',
    type: RoutePlanResponseDto,
  })
  async assignDriverGroup(
    @Param('id') id: string,
    @Body() dto: AssignDriverGroupDto,
    @CurrentUser() currentUser: User,
  ): Promise<RoutePlanResponseDto> {
    return this.routesService.assignDriverGroup(id, dto, currentUser);
  }

  @ApiResponse({ status: 409, description: 'Phương án/hợp đồng không còn hiệu lực hoặc nguồn lực còn chuyến hết hợp đồng chờ quản trị viên chốt' })
  @Patch('route-plans/:id/assignments/bus-attendant')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Gán hoặc đổi giáo viên giám sát mặc định cho nhóm xe (Chỉ SCHOOL_ADMIN trường sở hữu)',
    description:
      'Cập nhật đồng bộ giáo viên giám sát mặc định cho tất cả các tuyến sử dụng xe được chỉ định.',
  })
  @ApiParam({ name: 'id', description: 'ID của RoutePlan' })
  @ApiResponse({
    status: 200,
    description: 'Gán giáo viên giám sát mặc định thành công',
    type: RoutePlanResponseDto,
  })
  async assignBusAttendantGroup(
    @Param('id') id: string,
    @Body() dto: AssignBusAttendantGroupDto,
    @CurrentUser() currentUser: User,
  ): Promise<RoutePlanResponseDto> {
    return this.routesService.assignBusAttendantGroup(id, dto, currentUser);
  }

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Danh sách các tuyến đường một chiều',
    description:
      'Lấy danh sách tuyến đường một chiều (TO_SCHOOL, TO_PARKING). Hỗ trợ tìm kiếm theo tên tuyến, lọc theo trường, chiều và trạng thái.',
  })
  @ApiQuery({ name: 'schoolId', required: false, description: 'Lọc theo ID trường' })
  @ApiQuery({
    name: 'direction',
    required: false,
    enum: RouteDirection,
    description: 'Chiều tuyến (TO_SCHOOL, TO_PARKING)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RoutePlanStatus,
    description: 'Trạng thái tuyến (DRAFT, CANCELLED)',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm theo tên tuyến' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các tuyến đường phân trang',
  })
  async listRoutes(
    @Query('schoolId') schoolId?: string,
    @Query('direction') direction?: RouteDirection,
    @Query('status') status?: RoutePlanStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() currentUser?: User,
  ) {
    return this.routesService.listRoutes(
      {
        schoolId,
        direction,
        status,
        search,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
      },
      currentUser!,
    );
  }

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Chi tiết một tuyến đường',
    description:
      'Lấy thông tin chi tiết tuyến đường bao gồm danh sách điểm dừng, học sinh, thứ tự đón/trả, xe đề xuất và polyline bản đồ.',
  })
  @ApiParam({ name: 'id', description: 'ID của tuyến đường' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết tuyến đường',
    type: RouteResponseDto,
  })
  async getRouteDetail(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<RouteResponseDto> {
    return this.routesService.getRouteDetail(id, currentUser);
  }

  @Get('students/:studentId/routing')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN, Role.PARENT)
  @ApiOperation({
    summary: 'Thông tin tuyến đường của một học sinh (Bảo mật quyền riêng tư)',
    description:
      'Lấy thông tin tuyến đưa đón của học sinh. Đảm bảo quyền riêng tư: chỉ trả về vị trí của học sinh hiện tại, trường học và bãi xe, không để lộ thông tin của học sinh khác.',
  })
  @ApiParam({ name: 'studentId', description: 'ID của học sinh' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin tuyến đường của học sinh',
    type: StudentRoutingDetailDto,
  })
  async getStudentRoutingDetail(
    @Param('studentId') studentId: string,
    @CurrentUser() currentUser: User,
  ): Promise<StudentRoutingDetailDto> {
    return this.routesService.getStudentRoutingDetail(studentId, currentUser);
  }

  @Get('students/:studentId/insertion-options')
  @Roles(Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách các cặp tuyến có sẵn có thể thêm học sinh (Chỉ SYSTEM_ADMIN)',
    description:
      'Tìm tất cả các cặp tuyến TO_SCHOOL và TO_PARKING thuộc cùng một RoutePlan ACTIVE/DRAFT của trường mà học sinh theo học.',
  })
  @ApiParam({ name: 'studentId', description: 'ID của học sinh cần tìm cặp tuyến' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách cặp tuyến ứng viên',
    type: StudentInsertionOptionsResponseDto,
  })
  async getStudentInsertionOptions(
    @Param('studentId') studentId: string,
    @CurrentUser() currentUser: User,
  ): Promise<StudentInsertionOptionsResponseDto> {
    return this.routesService.getInsertionOptions(studentId, currentUser);
  }

  @Post('student-insertions/preview')
  @Roles(Role.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mô phỏng chèn học sinh vào cặp tuyến có sẵn (Chỉ SYSTEM_ADMIN)',
    description:
      'Kiểm tra tính khả thi và mô phỏng vị trí dừng, thời gian di chuyển sau khi chèn học sinh vào cả hai chiều.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kết quả mô phỏng chèn học sinh',
    type: PreviewStudentInsertionResponseDto,
  })
  async previewStudentInsertion(
    @Body() dto: PreviewStudentInsertionDto,
    @CurrentUser() currentUser: User,
  ): Promise<PreviewStudentInsertionResponseDto> {
    return this.routesService.previewStudentInsertion(dto, currentUser);
  }

  @ApiResponse({ status: 409, description: 'Phương án/hợp đồng không còn hiệu lực hoặc nguồn lực còn chuyến hết hợp đồng chờ quản trị viên chốt' })
  @Post('student-insertions/confirm')
  @Roles(Role.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xác nhận chèn học sinh vào cặp tuyến có sẵn (Chỉ SYSTEM_ADMIN)',
    description:
      'Chèn học sinh vào cả hai chiều TO_SCHOOL và TO_PARKING trong cùng một RoutePlan. Chỉ có hiệu lực với các Trip sinh mới trong tương lai, không sửa đổi Trip đã sinh.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chèn học sinh vào tuyến thành công',
  })
  async confirmStudentInsertion(
    @Body() dto: ConfirmStudentInsertionDto,
    @CurrentUser() currentUser: User,
  ): Promise<{ success: boolean; message: string; outboundRouteId?: string; returnRouteId?: string }> {
    return this.routesService.confirmStudentInsertion(dto, currentUser);
  }
}
