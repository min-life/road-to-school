import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
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
import { TripsService } from './trips.service.js';
import { AttendanceCorrectionDto, AttendanceCorrectionResponseDto, ReopenTripDto, ReopenTripResponseDto, TripActionMessageDto, TripReasonDto } from './dto/trip-actions.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { GenerateTripsDto, GenerateTripsResponseDto } from './dto/generate-trips.dto.js';
import { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import {
  TripDetailResponseDto,
  TripListResponseDto,
} from './dto/trip-response.dto.js';
import { UpdateTripAssignmentDto } from './dto/update-trip-assignment.dto.js';
import {
  MobileParentScheduleResponseDto,
  MobileTripItemDto,
  MobileScheduleListResponseDto,
} from './dto/mobile-schedule-response.dto.js';
import {
  HomeTripResponseDto,
  ParentHomeCardsResponseDto,
  OperationalStateResponseDto,
  TripAttendanceListResponseDto,
  MarkAttendanceDto,
  UpdateAlightingDto,
  UpdateAlightingResponseDto,
  ArriveAtSchoolResponseDto,
  VerifyQrDto,
  VerifyQrResponseDto,
} from './dto/trip-operation.dto.js';

@ApiResponse({ status: 400, description: 'Dữ liệu hoặc điều kiện vận hành không hợp lệ' })
@ApiResponse({ status: 401, description: 'Chưa xác thực hoặc phiên hết hạn' })
@ApiResponse({ status: 403, description: 'Không thuộc school/assignment/linked Trip roster được phép' })
@ApiResponse({ status: 404, description: 'Không tìm thấy chuyến xe hoặc học sinh trong roster' })
@ApiResponse({ status: 500, description: 'Lỗi máy chủ; không xác nhận mutation thành công khi API trả lỗi' })
@ApiResponse({ status: 400, description: 'Payload thiếu hoặc không hợp lệ' })
@ApiResponse({ status: 401, description: 'Cần đăng nhập' })
@ApiResponse({ status: 403, description: 'Không có quyền thực hiện hoặc không đúng phạm vi trường' })
@ApiResponse({ status: 404, description: 'Không tìm thấy dữ liệu' })
@ApiTags('Trips & Schedule Operations')
@Controller('trips')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post(':id/attendance/:studentId/correction')
  @Roles(Role.BUS_ATTENDANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đính chính điểm danh sau khi đến trường, trước Complete, có lý do và audit' })
  @ApiParam({ name: 'id' }) @ApiParam({ name: 'studentId' })
  @ApiResponse({ status: 200, type: AttendanceCorrectionResponseDto, description: 'Điểm danh đã đính chính, không phát Boarding mới' })
  @ApiResponse({ status: 409, description: 'Không đúng giai đoạn, trẻ đã xuống hoặc trạng thái kỳ vọng đã đổi' })
  correctAttendance(@Param('id') id: string, @Param('studentId') studentId: string,
    @Body() dto: AttendanceCorrectionDto, @CurrentUser() user: User) {
    return this.tripsService.correctAttendance(id, studentId, dto, user);
  }

  @Post(':id/cancel-all-absent')
  @Roles(Role.BUS_ATTENDANT, Role.SCHOOL_ADMIN, Role.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hủy chuyến chiều về đã Ready do toàn bộ học sinh vắng mặt' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: TripActionMessageDto, description: 'Đã hủy và gửi thông báo' })
  @ApiResponse({ status: 409, description: 'Chuyến đã chạy, chưa Ready hoặc roster chưa toàn ABSENT có lý do' })
  cancelAllAbsent(@Param('id') id: string, @Body() dto: TripReasonDto, @CurrentUser() user: User) {
    return this.tripsService.cancelAllAbsent(id, dto, user);
  }

  @Post(':id/reopen')
  @Roles(Role.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mở lại chuyến CANCELLED trước giờ chạy, kiểm lịch, nguồn lực và lưu operationAudit' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: ReopenTripResponseDto, description: 'Đã mở lại với lộ trình, giờ và danh sách học sinh hiện hành. Giữ báo nghỉ còn hiệu lực và lưu audit trước–sau.' })
  @ApiResponse({ status: 409, description: 'Đã đến giờ xuất phát cũ hoặc mới, chuyến đã vận hành, phương án không phù hợp hoặc nguồn lực không khả dụng' })
  reopenTrip(@Param('id') id: string, @Body() dto: ReopenTripDto, @CurrentUser() user: User) {
    return this.tripsService.reopenTrip(id, dto, user);
  }

  @Post('generate')
  @Roles(Role.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sinh chuyến xe thủ công theo ngày hoặc khoảng ngày (Chỉ SYSTEM_ADMIN)',
    description:
      'Tạo các bản ghi Trip cho các phương án ACTIVE trong khoảng ngày chỉ định. Bỏ qua các chuyến đã tạo (Idempotent). Bắt đầu từ ngày học sau ngày kích hoạt.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kết quả sinh chuyến xe',
    type: GenerateTripsResponseDto,
  })
  async generateTrips(
    @Body() dto: GenerateTripsDto,
    @CurrentUser() currentUser: User,
  ): Promise<GenerateTripsResponseDto> {
    return this.tripsService.generateTrips(dto, currentUser);
  }

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Danh sách lịch trình chuyến xe hợp nhất (Persisted + Virtual Occurrences)',
    description:
      'Lấy danh sách các chuyến xe đã lập lịch và các lịch dự kiến trong tương lai. Hỗ trợ lọc theo trường, khoảng ngày, trạng thái, phân trang server-side.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách lịch trình chuyến xe phân trang',
    type: TripListResponseDto,
  })
  async listTrips(
    @Query() query: ListTripsQueryDto,
    @CurrentUser() currentUser: User,
  ): Promise<TripListResponseDto> {
    return this.tripsService.listTrips(query, currentUser);
  }

  // ==========================================
  // MOBILE SPECIFIC ENDPOINTS (Must precede :id)
  // ==========================================

  @Get(['mobile/driver-schedule', 'mobile/driver/schedule'])
  @Roles(Role.DRIVER)
  @ApiOperation({
    summary: 'Lịch vận hành dành cho Tài xế (Chỉ DRIVER)',
    description: 'Lấy danh sách các chuyến xe được phân công cho tài xế theo ngày hoặc khoảng ngày (Mon-Sun).',
  })
  @ApiQuery({ name: 'date', required: false, example: '2026-10-26' })
  @ApiQuery({ name: 'fromDate', required: false, example: '2026-10-26' })
  @ApiQuery({ name: 'toDate', required: false, example: '2026-10-30' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách chuyến xe trong ngày/tuần của tài xế',
    type: MobileScheduleListResponseDto,
  })
  async getDriverSchedule(
    @CurrentUser() currentUser: User,
    @Query('date') date?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<{ items: MobileTripItemDto[] }> {
    const items = await this.tripsService.getDriverSchedule({ date, fromDate, toDate }, currentUser);
    return { items };
  }

  @Get(['mobile/bus-attendant-schedule', 'mobile/bus-attendant/schedule'])
  @Roles(Role.BUS_ATTENDANT)
  @ApiOperation({
    summary: 'Lịch vận hành dành cho Giáo viên giám sát (Chỉ BUS_ATTENDANT)',
    description: 'Lấy danh sách các chuyến xe được phân công cho giáo viên giám sát theo ngày hoặc khoảng ngày.',
  })
  @ApiQuery({ name: 'date', required: false, example: '2026-10-26' })
  @ApiQuery({ name: 'fromDate', required: false, example: '2026-10-26' })
  @ApiQuery({ name: 'toDate', required: false, example: '2026-10-30' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách chuyến xe trong ngày/tuần của giáo viên',
    type: MobileScheduleListResponseDto,
  })
  async getBusAttendantSchedule(
    @CurrentUser() currentUser: User,
    @Query('date') date?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<{ items: MobileTripItemDto[] }> {
    const items = await this.tripsService.getBusAttendantSchedule({ date, fromDate, toDate }, currentUser);
    return { items };
  }

  @Get([
    'mobile/parent/student/:studentId/schedule',
    'mobile/parent/students/:studentId/schedule',
  ])
  @Roles(Role.PARENT)
  @ApiOperation({
    summary: 'Lịch đưa đón học sinh dành cho Phụ huynh (Chỉ PARENT)',
    description:
      'Lấy lịch đưa đón con theo ngày hoặc khoảng ngày. Áp dụng Privacy Masking: ẩn thông tin các học sinh khác.',
  })
  @ApiParam({ name: 'studentId', description: 'ID học sinh' })
  @ApiQuery({ name: 'date', required: false, example: '2026-10-26' })
  @ApiQuery({ name: 'fromDate', required: false, example: '2026-10-26' })
  @ApiQuery({ name: 'toDate', required: false, example: '2026-10-30' })
  @ApiResponse({
    status: 200,
    description: 'Lịch đưa đón học sinh theo ngày hoặc khoảng ngày',
    type: MobileParentScheduleResponseDto,
  })
  async getParentStudentSchedule(
    @Param('studentId') studentId: string,
    @CurrentUser() currentUser: User,
    @Query('date') date?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<MobileParentScheduleResponseDto> {
    return this.tripsService.getParentStudentSchedule(studentId, { date, fromDate, toDate }, currentUser);
  }

  @Get('mobile/home-trip')
  @Roles(Role.DRIVER, Role.BUS_ATTENDANT)
  @ApiOperation({
    summary: 'Chuyến xe ưu tiên hiển thị trên Trang chủ (Tài xế & Giáo viên)',
    description:
      'Lấy một chuyến xe ưu tiên hiển thị trên Trang chủ. Chuyến xe đang chạy (IN_PROGRESS) luôn được giữ ưu tiên cao nhất bất kể thời gian dự kiến; các chuyến SCHEDULED chưa đóng băng được tự động tính giờ hiệu lực theo lịch trường và lọc bỏ khi đã quá giờ kết thúc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chuyến xe ưu tiên trên trang chủ',
    type: HomeTripResponseDto,
  })
  async getHomeTrip(
    @CurrentUser() currentUser: User,
  ): Promise<HomeTripResponseDto> {
    return this.tripsService.getHomeTrip(currentUser);
  }

  @Get('mobile/parent/home-cards')
  @Roles(Role.PARENT)
  @ApiOperation({
    summary: 'Danh sách thẻ chuyến xe trang chủ dành cho Phụ huynh',
    description:
      'Lấy một chuyến xe ưu tiên cho mỗi học sinh phụ huynh đang theo dõi. Chuyến IN_PROGRESS luôn ưu tiên hiển thị; chuyến SCHEDULED được tính theo giờ hiệu lực và lọc bỏ khi đã kết thúc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thẻ chuyến xe của các con',
    type: ParentHomeCardsResponseDto,
  })
  async getParentHomeCards(
    @CurrentUser() currentUser: User,
  ): Promise<ParentHomeCardsResponseDto> {
    return this.tripsService.getParentHomeCards(currentUser);
  }

  @Get(['mobile/:id', 'mobile/:id/detail'])
  @Roles(Role.DRIVER, Role.BUS_ATTENDANT, Role.PARENT, Role.SCHOOL_ADMIN, Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Chi tiết chuyến xe trên Mobile (Có Privacy Masking)',
    description:
      'Lấy chi tiết chuyến xe cho tài xế, giáo viên hoặc phụ huynh. Phụ huynh chỉ nhận điểm của con mình và trường; không trả điểm bãi, điểm học sinh khác hoặc polyline đầy đủ.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết chuyến xe trên Mobile',
    type: TripDetailResponseDto,
  })
  async getMobileTripDetail(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<TripDetailResponseDto> {
    return this.tripsService.getMobileTripDetail(id, currentUser);
  }

  // ==========================================
  // PERSISTED TRIP CRUD ENDPOINTS
  // ==========================================

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Chi tiết chuyến xe thực tế đã lập lịch',
    description:
      'Xem thông tin chi tiết một chuyến xe đã tạo (bản đồ lộ trình, danh sách trạm đón/trả, phân công xe, tài xế, giáo viên).',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết chuyến xe',
    type: TripDetailResponseDto,
  })
  async getTripDetail(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<TripDetailResponseDto> {
    return this.tripsService.getTripDetail(id, currentUser);
  }

  @ApiResponse({ status: 409, description: 'Snapshot phân công đã thay đổi; mở lại form sau khi tải mới' })
  @Patch([':id', ':id/assignment', ':id/assignments'])
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Tinh chỉnh phân công xe/nhân sự cho một chuyến xe đơn lẻ',
    description:
      'Thay đổi xe, tài xế hoặc giáo viên giám sát cho đúng một chuyến xe cụ thể. Không ảnh hưởng đến phương án tuyến cha hay các chuyến khác.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật phân công chuyến xe thành công',
    type: TripDetailResponseDto,
  })
  async updateTripAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateTripAssignmentDto,
    @CurrentUser() currentUser: User,
  ): Promise<any> {
    const trip = await this.tripsService.updateTripAssignment(id, dto, currentUser);
    return {
      message: 'Cập nhật phân công chuyến xe thành công',
      trip,
      ...trip,
    };
  }

  // ==========================================
  // TRIP OPERATION & ATTENDANCE ENDPOINTS
  // ==========================================

  @ApiResponse({ status: 409, description: 'Hợp đồng đã hết hạn; thao tác vận hành bị chặn, trạng thái Trip được giữ cho quản trị viên xử lý' })
  @Post(':id/attendant-ready')
  @Roles(Role.BUS_ATTENDANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Giáo viên giám sát xác nhận sẵn sàng (Chỉ BUS_ATTENDANT)',
    description:
      'Xác nhận sẵn sàng cho chuyến xe SCHEDULED. LIVE mode: mở từ 15 phút trước scheduledStartAt. TEST mode: không giới hạn thời gian. Idempotent.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiResponse({ status: 200, description: 'Xác nhận sẵn sàng thành công' })
  async markAttendantReady(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.tripsService.markAttendantReady(id, currentUser);
  }

  @ApiResponse({ status: 409, description: 'Hợp đồng đã hết hạn; thao tác vận hành bị chặn, trạng thái Trip được giữ cho quản trị viên xử lý' })
  @Post(':id/start')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tài xế bắt đầu chuyến xe (Chỉ DRIVER)',
    description:
      'Chuyển trạng thái Trip từ SCHEDULED sang IN_PROGRESS. Điều kiện: Giáo viên đã Ready, danh sách học sinh không rỗng. Chiều TO_PARKING yêu cầu 100% học sinh đã lên xe. LIVE mode: mở từ 5 phút trước giờ chạy.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiResponse({ status: 200, description: 'Bắt đầu chuyến xe thành công' })
  async startTrip(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.tripsService.startTrip(id, currentUser);
  }

  @ApiResponse({ status: 409, description: 'Hợp đồng đã hết hạn; thao tác vận hành bị chặn, trạng thái Trip được giữ cho quản trị viên xử lý' })
  @Post(':id/arrive-at-school')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tài xế xác nhận xe đã đến trường (Chỉ DRIVER - TO_SCHOOL)',
    description:
      'Chỉ áp dụng cho chuyến xe chiều TO_SCHOOL đang IN_PROGRESS. Điều kiện: 100% học sinh đã được điểm danh lên xe (không còn UNMARKED). Ghi nhận mốc arrivedAtSchoolAt.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Xác nhận đến trường thành công',
    type: ArriveAtSchoolResponseDto,
  })
  async arriveAtSchool(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<ArriveAtSchoolResponseDto> {
    return this.tripsService.arriveAtSchool(id, currentUser);
  }

  @Get(':id/operational-state')
  @Roles(Role.DRIVER, Role.BUS_ATTENDANT, Role.PARENT, Role.SCHOOL_ADMIN, Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Lấy trạng thái vận hành của chuyến xe theo Role',
    description:
      'Dùng cho Smart Polling 5s; kiểm tra quyền trên từng Trip. Parent chỉ nhận children theo studentId thuộc roster đã liên kết; không global counts/action flags.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái vận hành chuyến xe',
    type: OperationalStateResponseDto,
  })
  async getOperationalState(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<OperationalStateResponseDto> {
    return this.tripsService.getOperationalState(id, currentUser);
  }

  @Get(':id/attendance')
  @Roles(Role.BUS_ATTENDANT, Role.DRIVER, Role.SCHOOL_ADMIN, Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Danh sách học sinh và điểm danh của chuyến xe (Roster)',
    description:
      'Lấy danh sách học sinh từ TripAttendance roster của chuyến xe. Giáo viên giám sát nhận đầy đủ thông tin để điểm danh.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách điểm danh học sinh',
    type: TripAttendanceListResponseDto,
  })
  async getTripAttendance(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<TripAttendanceListResponseDto> {
    return this.tripsService.getTripAttendance(id, currentUser);
  }

  @ApiResponse({ status: 409, description: 'Hợp đồng đã hết hạn, không thay đổi điểm danh; quản trị viên cần xử lý chuyến' })
  @Put(':id/attendance/:studentId')
  @Roles(Role.BUS_ATTENDANT)
  @ApiOperation({
    summary: 'Cập nhật trạng thái điểm danh cho một học sinh (Chỉ BUS_ATTENDANT)',
    description:
      'Hỗ trợ UNMARKED, PRESENT, ABSENT (bắt buộc absenceReason). Sau arrival chiều đi dùng POST correction. Cho phép hoàn tác trước arrival chiều đi hoặc trước Start chiều về.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiParam({ name: 'studentId', description: 'ID học sinh' })
  @ApiResponse({ status: 200, description: 'Cập nhật điểm danh thành công' })
  async updateAttendance(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.tripsService.updateAttendance(id, studentId, dto, currentUser);
  }

  @ApiResponse({ status: 409, description: 'Hợp đồng đã hết hạn, không thay đổi điểm danh; quản trị viên cần xử lý chuyến' })
  @Put(':id/attendance/:studentId/alighting')
  @Roles(Role.BUS_ATTENDANT)
  @ApiOperation({
    summary: 'Xác nhận hoặc hoàn tác học sinh xuống xe (Chỉ BUS_ATTENDANT)',
    description:
      'Chỉ áp dụng cho học sinh có trạng thái PRESENT khi chuyến xe đang IN_PROGRESS. Chiều TO_SCHOOL yêu cầu xe đã đến trường.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiParam({ name: 'studentId', description: 'ID học sinh' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái xuống xe thành công',
    type: UpdateAlightingResponseDto,
  })
  async updateAlighting(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateAlightingDto,
    @CurrentUser() currentUser: User,
  ): Promise<UpdateAlightingResponseDto> {
    return this.tripsService.updateAlighting(id, studentId, dto, currentUser);
  }

  @ApiResponse({ status: 409, description: 'Hợp đồng đã hết hạn; thao tác vận hành bị chặn, trạng thái Trip được giữ cho quản trị viên xử lý' })
  @Post(':id/attendance/verify-qr')
  @Roles(Role.BUS_ATTENDANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xác thực mã QR học sinh trước khi điểm danh (Chỉ BUS_ATTENDANT)',
    description:
      'Kiểm tra mã QR (Student.code) có thuộc danh sách học sinh của chuyến xe hay không. Trả về thông tin học sinh để xác nhận, không tự động đánh dấu có mặt.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin học sinh hợp lệ để điểm danh',
    type: VerifyQrResponseDto,
  })
  async verifyQrAttendance(
    @Param('id') id: string,
    @Body() dto: VerifyQrDto,
    @CurrentUser() currentUser: User,
  ): Promise<VerifyQrResponseDto> {
    return this.tripsService.verifyQrAttendance(id, dto, currentUser);
  }

  @ApiResponse({ status: 422, description: 'INCOMPLETE_ATTENDANCE: roster còn UNMARKED' })
  @ApiResponse({ status: 409, description: 'Hợp đồng đã hết hạn; thao tác vận hành bị chặn, trạng thái Trip được giữ cho quản trị viên xử lý' })
  @Post(':id/complete')
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tài xế hoàn thành chuyến xe (Chỉ DRIVER)',
    description:
      'Chuyển Trip sang COMPLETED: roster đủ, ABSENT có lý do, mọi PRESENT đã xuống xe; TO_SCHOOL phải xác nhận đến trường.',
  })
  @ApiParam({ name: 'id', description: 'ID chuyến xe (Trip UUID)' })
  @ApiResponse({ status: 200, description: 'Hoàn thành chuyến xe thành công' })
  async completeTrip(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.tripsService.completeTrip(id, currentUser);
  }
}
