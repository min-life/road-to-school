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
import { StudentsService } from './students.service.js';
import {
  CreateStudentDto,
  ListStudentsQueryDto,
  UpdateStudentStatusDto,
  StudentListResponseDto,
  StudentDetailResponseDto,
  StudentItemDto,
  StudentDisableImpactDto,
} from './dto/index.js';

@ApiTags('Students')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('schools/:schoolId/students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách học sinh của trường học',
    description:
      'Trả về danh sách học sinh trực thuộc trường học. Hỗ trợ tìm kiếm theo họ tên/mã học sinh, 2 bộ lọc độc lập (status và hasAddress) và phân trang Server-side. SYSTEM_ADMIN có quyền xem tất cả trường học; SCHOOL_ADMIN chỉ được xem trường của mình.',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'Mã định danh UUID của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách học sinh thành công',
    type: StudentListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mã trường học không đúng định dạng UUID hoặc tham số lọc không hợp lệ',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền xem học sinh của trường học khác',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy trường học',
  })
  async listStudents(
    @Param(
      'schoolId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã trường học không đúng định dạng UUID'),
      }),
    )
    schoolId: string,
    @Query() query: ListStudentsQueryDto,
    @CurrentUser() user: User,
  ): Promise<StudentListResponseDto> {
    return this.studentsService.listStudents(schoolId, query, user);
  }

  @Post()
  @Roles(Role.SCHOOL_ADMIN)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tạo hồ sơ học sinh mới (Chỉ dành cho SCHOOL_ADMIN)',
    description:
      'Tạo mới học sinh trực thuộc trường học của School Admin đang đăng nhập. Tự động sinh mã học sinh duy nhất (STU + 8 ký tự alphanumeric), gán trạng thái AVAILABLE, tải ảnh đại diện lên Cloudinary (tùy chọn) và xác thực dữ liệu địa chỉ nếu có. SYSTEM_ADMIN không có quyền tạo.',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'Mã định danh UUID của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fullName', 'guardianPhone'],
      properties: {
        fullName: {
          type: 'string',
          example: 'Nguyễn Minh Quân',
          description: 'Họ và tên học sinh',
        },
        guardianPhone: {
          type: 'string',
          example: '0912345678',
          description: 'Số điện thoại người giám hộ',
        },
        addressText: {
          type: 'string',
          example: 'Số 10 Nguyễn Trãi, Thanh Xuân, Hà Nội',
          description: 'Địa chỉ đưa đón chi tiết tùy chọn',
        },
        latitude: {
          type: 'number',
          example: 21.002345,
          description: 'Vĩ độ (-90 đến 90)',
        },
        longitude: {
          type: 'number',
          example: 105.823456,
          description: 'Kinh độ (-180 đến 180)',
        },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Tệp ảnh đại diện tùy chọn (JPEG, PNG, WebP, tối đa 5 MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo học sinh thành công',
    type: StudentItemDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu đầu vào không hợp lệ, thông tin địa chỉ nửa vời hoặc trường học đang ngừng hoạt động',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description:
      'Bạn không có quyền thực hiện thao tác này (yêu cầu SCHOOL_ADMIN của đúng trường, SYSTEM_ADMIN bị chặn)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy trường học',
  })
  async createStudent(
    @Param(
      'schoolId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã trường học không đúng định dạng UUID'),
      }),
    )
    schoolId: string,
    @Body() dto: CreateStudentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User,
  ): Promise<StudentItemDto> {
    return this.studentsService.createStudent(schoolId, dto, file, user);
  }

  @Get(':id')
  @Roles(Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Xem chi tiết học sinh',
    description:
      'Trả về thông tin chi tiết của một học sinh, bao gồm mã học sinh, tên trường học, dữ liệu mã QR và tình trạng địa chỉ dẫn xuất (hasAddress).',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'Mã định danh UUID của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh UUID của học sinh',
    example: 's1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết học sinh thành công',
    type: StudentDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mã trường học hoặc mã học sinh không đúng định dạng UUID',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền xem thông tin học sinh của trường học khác',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy trường học hoặc học sinh',
  })
  async getStudent(
    @Param(
      'schoolId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã trường học không đúng định dạng UUID'),
      }),
    )
    schoolId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã học sinh không đúng định dạng UUID'),
      }),
    )
    id: string,
    @CurrentUser() user: User,
  ): Promise<StudentDetailResponseDto> {
    return this.studentsService.getStudent(schoolId, id, user);
  }

  @Get(':id/disable-impact')
  @Roles(Role.SCHOOL_ADMIN, Role.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Đánh giá tác động trước khi vô hiệu hóa học sinh',
    description:
      'Tính toán số lượng phương án tuyến ảnh hưởng, số chuyến xe SCHEDULED sẽ bị loại bỏ học sinh và số chuyến có thể bị hủy do rỗng.',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'Mã định danh UUID của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh UUID của học sinh',
    example: 's1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Báo cáo tác động vô hiệu hóa học sinh',
    type: StudentDisableImpactDto,
  })
  async getDisableImpact(
    @Param(
      'schoolId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã trường học không đúng định dạng UUID'),
      }),
    )
    schoolId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã học sinh không đúng định dạng UUID'),
      }),
    )
    id: string,
    @CurrentUser() user: User,
  ): Promise<StudentDisableImpactDto> {
    return this.studentsService.getDisableImpact(schoolId, id, user);
  }

  @Patch(':id/status')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({
    summary: 'Cập nhật trạng thái hoạt động của học sinh (AVAILABLE hoặc DISABLED)',
    description:
      'Cho phép School Admin chuyển đổi trạng thái học sinh giữa AVAILABLE (Khả dụng) và DISABLED (Đã vô hiệu hóa). Khi học sinh bị DISABLED, chặn liên kết phụ huynh mới nhưng giữ nguyên các liên kết cũ.',
  })
  @ApiParam({
    name: 'schoolId',
    description: 'Mã định danh UUID của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh UUID của học sinh',
    example: 's1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái học sinh thành công',
    type: StudentItemDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Trạng thái mới không hợp lệ',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền thay đổi trạng thái học sinh của trường học khác',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy trường học hoặc học sinh',
  })
  async updateStatus(
    @Param(
      'schoolId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã trường học không đúng định dạng UUID'),
      }),
    )
    schoolId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Mã học sinh không đúng định dạng UUID'),
      }),
    )
    id: string,
    @Body() dto: UpdateStudentStatusDto,
    @CurrentUser() user: User,
  ): Promise<StudentItemDto> {
    return this.studentsService.updateStatus(schoolId, id, dto, user);
  }
}
