import { LocationOptionsDto, LocationOptionsQueryDto } from './dto/geography.dto.js';
import { ScheduledLocationResponseDto } from './dto/lifecycle-response.dto.js';
import {
  Controller,
  Inject,
  HttpCode,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { SchoolsService } from './schools.service.js';
import { PersonnelCredentialsService } from '../auth/personnel-credentials.service.js';
import { CredentialDeliveryResultDto } from '../auth/credential-delivery.dto.js';
import {
  ListSchoolsQueryDto,
  SchoolListResponseDto,
  SchoolDetailResponseDto,
  UpdateSchoolStatusDto,
  UpdateSchoolStatusResponseDto,
  CreateSchoolDto,
  ListSchoolEmployeesQueryDto,
  SchoolEmployeeListResponseDto,
  CreateSchoolAdminDto,
  CreateSchoolAdminResponseDto,
  SchoolEmployeeDetailResponseDto,
  SchoolLocationImpactDto,
  UpdateSchoolLocationDto,
  UpdateSchoolContractDto,
  UpdateSchoolScheduleDto,
  UpdateSchoolScheduleResponseDto,
  EmployeeDeactivationImpactDto,
  UpdateEmployeeStatusDto,
} from './dto/index.js';

@ApiResponse({ status: 409, description: 'Lịch trùng/đã đến hạn, nguồn lực không phù hợp hoặc dữ liệu thay đổi đồng thời' })
@ApiResponse({ status: 500, description: 'Không lưu được thay đổi; không xác nhận thành công' })
@ApiTags('Schools')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
@Controller('schools')
export class SchoolsController {
  @Inject(PersonnelCredentialsService)
  private readonly credentials: PersonnelCredentialsService;

  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tạo trường học mới kèm ảnh cổng trường (tùy chọn)',
    description:
      'Tạo mới thông tin trường học đối tác bao gồm tọa độ vị trí VietMap, thời hạn hợp đồng và lịch học theo tuần. Hỗ trợ tải lên ảnh cổng trường tùy chọn lên Cloudinary. Chỉ SYSTEM_ADMIN được phép thực hiện.',
  })
  @ApiBody({
    description: 'Dữ liệu form tạo trường học dạng multipart/form-data',
    schema: {
      type: 'object',
      required: [
        'name',
        'addressText',
        'latitude',
        'longitude',
        'contractStartDate',
        'contractEndDate',
        'weeklySchedule',
      ],
      properties: {
        name: {
          type: 'string',
          example: 'Trường Tiểu học Lê Quý Đôn',
          description: 'Tên trường học (tối thiểu 2 ký tự)',
        },
        addressText: {
          type: 'string',
          example:
            'Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
          description: 'Địa chỉ trường học chi tiết (tối thiểu 5 ký tự)',
        },
        latitude: {
          type: 'number',
          example: 21.028511,
          description: 'Vĩ độ (Latitude, từ -90 đến 90)',
        },
        longitude: {
          type: 'number',
          example: 105.772341,
          description: 'Kinh độ (Longitude, từ -180 đến 180)',
        },
        contractStartDate: {
          type: 'string',
          format: 'date',
          example: '2026-09-01',
          description: 'Ngày bắt đầu hợp đồng (định dạng YYYY-MM-DD)',
        },
        contractEndDate: {
          type: 'string',
          format: 'date',
          example: '2027-08-31',
          description:
            'Ngày kết thúc hợp đồng (định dạng YYYY-MM-DD, >= contractStartDate)',
        },
        weeklySchedule: {
          type: 'string',
          example:
            '{"monday":{"start":"07:00","end":"17:30"},"tuesday":{"start":"07:00","end":"17:30"}}',
          description:
            'Lịch học tuần dạng chuỗi JSON Object (chỉ chứa các ngày trong tuần và giờ bắt đầu/kết thúc 24h)',
        },
        image: {
          type: 'string',
          format: 'binary',
          description:
            'Tệp ảnh cổng trường học tùy chọn (JPEG, PNG, WebP, tối đa 5 MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo trường học thành công',
    type: SchoolDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu đầu vào không hợp lệ hoặc sai định dạng lịch học / ngày hợp đồng / định dạng tệp ảnh',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description:
      'Bạn không có quyền thực hiện thao tác này (yêu cầu SYSTEM_ADMIN)',
  })
  @ApiResponse({
    status: 502,
    description: 'Lỗi tải ảnh lên dịch vụ lưu trữ Cloudinary',
  })
  @ApiResponse({
    status: 503,
    description: 'Dịch vụ lưu trữ ảnh Cloudinary chưa được cấu hình',
  })
  async create(
    @Body() dto: CreateSchoolDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<SchoolDetailResponseDto> {
    return this.schoolsService.create(dto, file);
  }

  @Get('location-options')
  @ApiOperation({ summary: 'Tỉnh/phường có trong địa chỉ trường hiện hành, chỉ SYSTEM_ADMIN; không gọi VietMap' })
  @ApiResponse({ status: 200, type: LocationOptionsDto })
  @ApiResponse({ status: 400, description: 'provinceId không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Cần đăng nhập' })
  @ApiResponse({ status: 403, description: 'Chỉ SYSTEM_ADMIN' })
  locationOptions(@Query() query: LocationOptionsQueryDto): Promise<LocationOptionsDto> {
    return this.schoolsService.getLocationOptions(query.provinceId);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách trường học đối tác',
    description:
      'Trả về danh sách trường học có phân trang, hỗ trợ tìm kiếm theo tên, trạng thái và provinceId/wardId tùy chọn (AND), theo địa chỉ đang hiệu lực. Chỉ SYSTEM_ADMIN được phép truy cập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách trường học thành công',
    type: SchoolListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tham số phân trang hoặc bộ lọc không hợp lệ',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description:
      'Bạn không có quyền thực hiện thao tác này (yêu cầu SYSTEM_ADMIN)',
  })
  async findAll(
    @Query() query: ListSchoolsQueryDto,
  ): Promise<SchoolListResponseDto> {
    return this.schoolsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết thông tin trường học',
    description:
      'Lấy đầy đủ thông tin chi tiết của một trường học bao gồm lịch học tuần và thời hạn hợp đồng. SYSTEM_ADMIN có thể xem trường ở cả trạng thái Hoạt động và Ngừng hoạt động.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh UUID của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin chi tiết trường học thành công',
    type: SchoolDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mã trường học không đúng định dạng UUID',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description:
      'Bạn không có quyền thực hiện thao tác này (yêu cầu SYSTEM_ADMIN)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy trường học',
  })
  async findOne(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã trường học không đúng định dạng UUID'),
      }),
    )
    id: string,
  ): Promise<SchoolDetailResponseDto> {
    return this.schoolsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái hoạt động của trường học',
    description:
      'Ngừng hoạt động được hẹn bằng effectiveDate, mặc định ngày mai, tối đa ngày cuối hợp đồng. Response giữ isActive đang hiệu lực và thêm scheduledChangeId/effectiveDate/changeStatus. Kích hoạt lại ngay khi hợp đồng còn hiệu lực; không phục hồi phương án cũ, nhân sự đăng nhập mới.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh UUID của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái trường học thành công',
    type: UpdateSchoolStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu đầu vào không hợp lệ hoặc hợp đồng trường học chưa có hiệu lực / đã hết hạn',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description:
      'Bạn không có quyền thực hiện thao tác này (yêu cầu SYSTEM_ADMIN)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy trường học',
  })
  async updateStatus(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã trường học không đúng định dạng UUID'),
      }),
    )
    id: string,
    @Body() dto: UpdateSchoolStatusDto,
    @CurrentUser() actor?: User,
  ): Promise<UpdateSchoolStatusResponseDto> {
    return this.schoolsService.updateStatus(id, dto, actor);
  }

  @Get(':id/employees')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách nhân viên của trường học',
    description:
      'Trả về danh sách nhân viên trực thuộc trường học. SYSTEM_ADMIN có thể xem tất cả nhân viên (SCHOOL_ADMIN và BUS_ATTENDANT). SCHOOL_ADMIN chỉ được xem danh sách giáo viên (BUS_ATTENDANT) thuộc trường của mình.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh UUID của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách nhân viên trường học thành công',
    type: SchoolEmployeeListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mã trường học không đúng định dạng UUID hoặc tham số phân trang/lọc không hợp lệ',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description:
      'Bạn không có quyền thực hiện thao tác này (yêu cầu SYSTEM_ADMIN hoặc SCHOOL_ADMIN đúng trường)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy trường học',
  })
  async findEmployees(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã trường học không đúng định dạng UUID'),
      }),
    )
    id: string,
    @Query() query: ListSchoolEmployeesQueryDto,
    @CurrentUser() user?: User,
  ): Promise<SchoolEmployeeListResponseDto> {
    return user
      ? this.schoolsService.findEmployees(id, query, user)
      : this.schoolsService.findEmployees(id, query);
  }

  @Get(':id/employees/:employeeId')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Xem chi tiết nhân viên trường học',
    description:
      'Trả về thông tin chi tiết của một nhân viên trực thuộc trường học. SCHOOL_ADMIN chỉ xem được thông tin của Giáo viên (BUS_ATTENDANT) trực thuộc trường mình.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh UUID của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiParam({
    name: 'employeeId',
    description: 'Mã định danh UUID của nhân viên',
    example: 'd3f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Xem chi tiết nhân viên thành công',
    type: SchoolEmployeeDetailResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền xem thông tin nhân viên trường học khác',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy trường học hoặc nhân viên',
  })
  async findEmployeeDetail(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã trường học không đúng định dạng UUID'),
      }),
    )
    id: string,
    @Param(
      'employeeId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã nhân viên không đúng định dạng UUID'),
      }),
    )
    employeeId: string,
    @CurrentUser() user?: User,
  ): Promise<SchoolEmployeeDetailResponseDto> {
    return this.schoolsService.findEmployeeDetail(id, employeeId, user);
  }

  @Post(':id/employees')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Tạo tài khoản nhân viên trường học (SCHOOL_ADMIN hoặc BUS_ATTENDANT)',
    description:
      'Khởi tạo tài khoản nhân viên trực thuộc trường. SYSTEM_ADMIN tạo tài khoản SCHOOL_ADMIN. SCHOOL_ADMIN chỉ được tạo tài khoản Giáo viên (BUS_ATTENDANT) cho trường của mình. Email và số điện thoại bắt buộc; mật khẩu chỉ bàn giao qua email hoặc console development. credentialDeliveryStatus: SENT/FAILED/CONSOLE; FAILED vẫn giữ tài khoản.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh UUID của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo tài khoản nhân viên thành công',
    type: CreateSchoolAdminResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu đầu vào không hợp lệ hoặc trường học đang ngừng hoạt động (INACTIVE)',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description:
      'Bạn không có quyền thực hiện thao tác này (yêu cầu SYSTEM_ADMIN hoặc SCHOOL_ADMIN đúng trường)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy trường học',
  })
  @ApiResponse({
    status: 409,
    description: 'Email hoặc số điện thoại đã tồn tại trên hệ thống',
  })
  async createSchoolAdmin(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã trường học không đúng định dạng UUID'),
      }),
    )
    id: string,
    @Body() dto: CreateSchoolAdminDto,
    @CurrentUser() user?: User,
  ): Promise<CreateSchoolAdminResponseDto> {
    return user
      ? this.schoolsService.createSchoolAdmin(id, dto, user)
      : this.schoolsService.createSchoolAdmin(id, dto);
  }

  @Post(':id/employees/:employeeId/credentials/resend')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Cấp lại mật khẩu nhân sự trường qua email', description: 'SYSTEM_ADMIN cấp cho SCHOOL_ADMIN; SCHOOL_ADMIN cấp cho BUS_ATTENDANT cùng trường. Lưu mật khẩu mới trước gửi email; giữ phiên/push token, cho phép khi Trip đang chạy. FAILED: mật khẩu đã đổi nhưng chưa bàn giao; cần cấp lại. Không nhận body.' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID trường' })
  @ApiParam({ name: 'employeeId', format: 'uuid', description: 'ID nhân sự' })
  @ApiResponse({ status: 200, type: CredentialDeliveryResultDto, description: 'Đã đổi mật khẩu; kết quả bàn giao SENT/FAILED/CONSOLE' })
  @ApiResponse({ status: 400, description: 'UUID sai, nhân sự không hoạt động hoặc thiếu email hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 403, description: 'Sai role hoặc ngoài phạm vi trường' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân sự trong trường' })
  @ApiResponse({ status: 409, description: 'Đang cấp mật khẩu hoặc tài khoản thay đổi đồng thời' })
  @ApiResponse({ status: 500, description: 'Không lưu được mật khẩu; không xác nhận cấp lại thành công' })
  async resendEmployeeCredentials(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('employeeId', new ParseUUIDPipe({ version: '4' })) employeeId: string,
    @CurrentUser() user: User,
  ): Promise<CredentialDeliveryResultDto> {
    return this.credentials.resend(employeeId, user, id);
  }

  @Get(':id/employees/:employeeId/deactivation-impact')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Xem trước tác động khi chuyển trạng thái nhân viên trường học',
    description:
      'Thống kê số lượng tuyến ACTIVE và chuyến xe SCHEDULED/IN_PROGRESS đang phân công cho nhân viên này trước khi vô hiệu hóa tài khoản.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID trường học' })
  @ApiParam({ name: 'employeeId', format: 'uuid', description: 'ID nhân viên' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin tác động khi vô hiệu hóa nhân viên',
    type: EmployeeDeactivationImpactDto,
  })
  @ApiResponse({ status: 403, description: 'Sai role hoặc ngoài phạm vi trường' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân viên trong trường' })
  async getEmployeeDeactivationImpact(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('employeeId', new ParseUUIDPipe({ version: '4' })) employeeId: string,
    @CurrentUser() user: User,
  ): Promise<EmployeeDeactivationImpactDto> {
    return this.schoolsService.getEmployeeDeactivationImpact(id, employeeId, user);
  }

  @Patch(':id/employees/:employeeId/status')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Cập nhật trạng thái hoạt động của nhân viên trường học',
    description:
      'Chuyển trạng thái nhân viên giữa hoạt động (isActive=true) và không hoạt động (isActive=false). Nếu nhân viên còn tuyến ACTIVE hoặc chuyến SCHEDULED, bắt buộc truyền replacementUserId cùng trường để bàn giao nguyên tử. Từ chối nếu còn chuyến Ready/đã điểm danh/đang chạy. Toàn bộ Session trên Mobile App sẽ bị thu hồi khi ngừng hoạt động thành công.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID trường học' })
  @ApiParam({ name: 'employeeId', format: 'uuid', description: 'ID nhân viên' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái nhân viên thành công',
    type: SchoolEmployeeDetailResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Nhân viên có chuyến IN_PROGRESS hoặc thiếu nhân sự thay thế hợp lệ' })
  @ApiResponse({ status: 403, description: 'Sai role hoặc ngoài phạm vi trường' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân sự hoặc nhân sự thay thế' })
  async updateEmployeeStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('employeeId', new ParseUUIDPipe({ version: '4' })) employeeId: string,
    @Body() dto: UpdateEmployeeStatusDto,
    @CurrentUser() user: User,
  ): Promise<SchoolEmployeeDetailResponseDto> {
    return this.schoolsService.updateEmployeeStatus(id, employeeId, dto, user);
  }

  @Get(':id/settings')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Lấy cấu hình chi tiết của trường học',
    description:
      'Lấy thông tin địa chỉ, tọa độ, hợp đồng và lịch tuần của trường học. SYSTEM_ADMIN có thể xem mọi trường; SCHOOL_ADMIN chỉ được xem trường của mình.',
  })
  @ApiParam({ name: 'id', description: 'Mã UUID trường học' })
  @ApiResponse({ status: 200, description: 'Cấu hình trường học' })
  async getSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.schoolsService.getSchoolSettings(id, user);
  }

  @Get(':id/location-impact')
  @Roles(Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Đánh giá tác động trước khi thay đổi vị trí trường học (Chỉ SYSTEM_ADMIN)',
    description:
      'Trả về số lượng phương án DRAFT/ACTIVE và chuyến xe SCHEDULED sẽ bị hủy nếu vị trí trường thay đổi, cùng số chuyến xe IN_PROGRESS được bảo lưu. Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) có quyền thực hiện.',
  })
  @ApiParam({ name: 'id', description: 'Mã UUID trường học' })
  @ApiResponse({ status: 200, description: 'Đánh giá tác động thay đổi vị trí', type: SchoolLocationImpactDto })
  async getLocationImpact(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ): Promise<SchoolLocationImpactDto> {
    return this.schoolsService.getLocationImpact(
      id,
      user,
      latitude ? parseFloat(latitude) : undefined,
      longitude ? parseFloat(longitude) : undefined,
    );
  }

  @Patch(':id/location')
  @Roles(Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Hẹn đổi địa chỉ và vị trí trường học (SYSTEM_ADMIN)',
    description:
      'effectiveDate tùy chọn, mặc định ngày mai, đến hết hợp đồng. Trước ngày đó phương án cũ tiếp tục. Đến ngày hủy toàn bộ phương án cũ; chuyến đã điểm danh/đang chạy giữ cho admin chốt, lịch sử giữ nguyên. Response School là dữ liệu hôm nay, counters đã thực hiện bằng 0 khi mới hẹn; thêm scheduledChangeId/effectiveDate/changeStatus. Phải tạo mới phương án sau đổi địa chỉ; giữ quy tắc sinh ngày sau activation nên có thể gián đoạn ngày chuyển.',
  })
  @ApiParam({ name: 'id', description: 'Mã UUID trường học' })
  @ApiResponse({ status: 200, description: 'Đã hẹn đổi vị trí; chưa hủy ngay', type: ScheduledLocationResponseDto })
  async updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolLocationDto,
    @CurrentUser() user: User,
  ) {
    return this.schoolsService.updateLocation(id, dto, user);
  }

  @Patch(':id/contract')
  @Roles(Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Cập nhật / gia hạn hợp đồng trường học (Chỉ SYSTEM_ADMIN)',
    description:
      'Không DRAFT/ACTIVE: cập nhật kỳ hợp đồng. Còn phương án: chỉ gia hạn thuần giữ ngày bắt đầu, kiểm tra nguồn lực đã phân công và xung đột trong thời gian gia hạn; DRAFT thiếu phân công không tự gán thêm. Hết hạn phải đối soát hủy phương án cũ trước, không làm sống lại chúng.',
  })
  @ApiParam({ name: 'id', description: 'Mã UUID trường học' })
  @ApiResponse({ status: 200, description: 'Cập nhật hợp đồng thành công' })
  async updateContract(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolContractDto,
    @CurrentUser() user: User,
  ) {
    return this.schoolsService.updateContract(id, dto, user);
  }

  @Patch(':id/schedule')
  @Roles(Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Cập nhật lịch học tuần của trường học (Chỉ SYSTEM_ADMIN)',
    description:
      'Hẹn lịch tuần bằng effectiveDate tùy chọn, mặc định ngày mai, đến hết hợp đồng. Không ảnh hưởng hôm nay. Tới ngày cập nhật giờ/hủy chuyến chưa vận hành phù hợp lịch mới; không sửa lịch sử/điểm danh. Giữ response cũ, thêm scheduledChangeId/effectiveDate/changeStatus; counters là số đã thực hiện, bằng 0 khi hẹn.',
  })
  @ApiParam({ name: 'id', description: 'Mã UUID trường học' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật lịch học thành công',
    type: UpdateSchoolScheduleResponseDto,
  })
  async updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolScheduleDto,
    @CurrentUser() user: User,
  ): Promise<UpdateSchoolScheduleResponseDto> {
    return this.schoolsService.updateSchedule(id, dto, user);
  }
}


