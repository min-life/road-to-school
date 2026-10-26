import {
  Controller,
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
} from './dto/index.js';

@ApiTags('Schools')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SYSTEM_ADMIN)
@Controller('schools')
export class SchoolsController {
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

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách trường học đối tác',
    description:
      'Trả về danh sách trường học có phân trang, hỗ trợ tìm kiếm theo tên và lọc theo trạng thái hoạt động. Chỉ SYSTEM_ADMIN được phép truy cập.',
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
      'Cho phép SYSTEM_ADMIN chuyển đổi trạng thái trường giữa Hoạt động (ACTIVE) và Ngừng hoạt động (INACTIVE). Khi kích hoạt lại trường, thời hạn hợp đồng phải còn hiệu lực.',
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
  ): Promise<UpdateSchoolStatusResponseDto> {
    return this.schoolsService.updateStatus(id, dto);
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
      'Khởi tạo tài khoản nhân viên trực thuộc trường. SYSTEM_ADMIN tạo tài khoản SCHOOL_ADMIN. SCHOOL_ADMIN chỉ được tạo tài khoản Giáo viên (BUS_ATTENDANT) cho trường của mình. Mật khẩu ngẫu nhiên băm bcryptjs và giao qua console ở development.',
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
    summary: 'Cập nhật địa chỉ và vị trí trường học kèm cascade hủy các phương án liên quan (Chỉ SYSTEM_ADMIN)',
    description:
      'Chỉ Quản trị viên hệ thống (SYSTEM_ADMIN) có quyền thực hiện. Khi sửa địa chỉ trường, nếu trường có bất kỳ phương án nào (DRAFT/ACTIVE) thì tự động hủy toàn bộ phương án đó và các chuyến xe SCHEDULED liên quan.',
  })
  @ApiParam({ name: 'id', description: 'Mã UUID trường học' })
  @ApiResponse({ status: 200, description: 'Cập nhật vị trí thành công' })
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
      'Chỉ được cập nhật khi trường không còn phương án DRAFT hoặc ACTIVE. Ngày bắt đầu mới phải từ ngày hôm nay trở đi (giờ VN).',
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
      'Cập nhật lịch học theo tuần của trường học. Tự động hủy các chuyến xe SCHEDULED vào các ngày không còn lịch học, và cập nhật lại khung giờ xuất phát/kết thúc cho các chuyến xe SCHEDULED vào các ngày có lịch học mới.',
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


