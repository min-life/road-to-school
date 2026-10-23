import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/auth-user.decorator.js';
import { ParentsService } from './parents.service.js';
import {
  RequestLinkOtpDto,
  RequestLinkOtpResponseDto,
  VerifyLinkOtpDto,
  VerifyLinkOtpResponseDto,
  ParentLinkedStudentItemDto,
  ParentLinkedStudentDetailResponseDto,
} from './dto/index.js';

@ApiTags('Parents')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.PARENT)
@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get('students')
  @ApiOperation({
    summary: 'Lấy danh sách các học sinh mà Phụ huynh đã liên kết',
    description:
      'Trả về danh sách tất cả học sinh mà tài khoản Phụ huynh hiện tại đã liên kết thành công để hiển thị thẻ theo dõi tại tab "Theo dõi". Chỉ PARENT được phép truy cập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách học sinh liên kết thành công',
    type: [ParentLinkedStudentItemDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền thực hiện thao tác này (yêu cầu vai trò PARENT)',
  })
  async getLinkedStudents(
    @CurrentUser() user: User,
  ): Promise<ParentLinkedStudentItemDto[]> {
    return this.parentsService.getLinkedStudents(user.id);
  }

  @Get('students/:id')
  @ApiOperation({
    summary: 'Xem chi tiết học sinh mà Phụ huynh đã liên kết',
    description:
      'Trả về thông tin chi tiết của học sinh đã liên kết (phục vụ Section 1: Thông tin học sinh). Chỉ cho phép truy cập nếu bản ghi liên kết giữa Phụ huynh và Học sinh tồn tại.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh UUID của học sinh',
    example: 's1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Xem chi tiết học sinh thành công',
    type: ParentLinkedStudentDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mã học sinh không đúng định dạng UUID',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền thực hiện thao tác này (yêu cầu vai trò PARENT)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy học sinh hoặc bạn chưa liên kết với học sinh này',
  })
  async getLinkedStudentDetail(
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
  ): Promise<ParentLinkedStudentDetailResponseDto> {
    return this.parentsService.getLinkedStudentDetail(user.id, id);
  }

  @Post('link-requests')
  @ApiOperation({
    summary: 'Khởi tạo yêu cầu liên kết học sinh (gửi mã OTP về SĐT người giám hộ)',
    description:
      'Phụ huynh nhập mã học sinh hoặc quét mã QR. Hệ thống kiểm tra học sinh khả dụng (AVAILABLE) và trường học đang hoạt động, sau đó sinh mã OTP và gửi SMS đến số điện thoại người giám hộ đã đăng ký.',
  })
  @ApiResponse({
    status: 200,
    description: 'Yêu cầu gửi mã OTP thành công',
    type: RequestLinkOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Mã học sinh không đúng định dạng, học sinh đang bị vô hiệu hóa hoặc trường ngừng hoạt động',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền thực hiện thao tác này (yêu cầu vai trò PARENT)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy học sinh với mã đã cung cấp',
  })
  @ApiResponse({
    status: 409,
    description: 'Bạn đã liên kết với học sinh này trước đó',
  })
  async requestLinkOtp(
    @Body() dto: RequestLinkOtpDto,
    @CurrentUser() user: User,
  ): Promise<RequestLinkOtpResponseDto> {
    return this.parentsService.requestLinkOtp(user.id, dto);
  }

  @Post('verify-link')
  @ApiOperation({
    summary: 'Xác thực mã OTP và hoàn tất liên kết Phụ huynh - Học sinh',
    description:
      'Phụ huynh nhập mã OTP nhận được qua SMS. Hệ thống kiểm tra tính hợp lệ và tiêu thụ mã OTP ngay trong transaction, tạo bản ghi liên kết mới và trả về thông tin học sinh.',
  })
  @ApiResponse({
    status: 201,
    description: 'Liên kết học sinh thành công',
    type: VerifyLinkOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Mã OTP không chính xác, đã hết hạn, đã qua sử dụng hoặc học sinh đang bị vô hiệu hóa',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền thực hiện thao tác này (yêu cầu vai trò PARENT)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy học sinh',
  })
  @ApiResponse({
    status: 409,
    description: 'Bạn đã liên kết với học sinh này trước đó',
  })
  async verifyLinkOtp(
    @Body() dto: VerifyLinkOtpDto,
    @CurrentUser() user: User,
  ): Promise<VerifyLinkOtpResponseDto> {
    return this.parentsService.verifyLinkOtp(user.id, dto);
  }

  @Delete('students/:id')
  @ApiOperation({
    summary: 'Hủy liên kết Phụ huynh - Học sinh',
    description:
      'Cho phép Phụ huynh hủy liên kết với học sinh (áp dụng cho cả thao tác Swipe-to-Unlink tại danh sách và nút Hủy liên kết tại màn hình Chi tiết). Thao tác này chỉ xóa liên kết của chính phụ huynh đó, không xóa hồ sơ học sinh và không ảnh hưởng đến các phụ huynh khác.',
  })
  @ApiParam({
    name: 'id',
    description: 'Mã định danh UUID của học sinh cần hủy liên kết',
    example: 's1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  @ApiResponse({
    status: 200,
    description: 'Hủy liên kết học sinh thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Mã học sinh không đúng định dạng UUID',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc Access Token không hợp lệ / đã hết hạn',
  })
  @ApiResponse({
    status: 403,
    description: 'Bạn không có quyền thực hiện thao tác này (yêu cầu vai trò PARENT)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy liên kết với học sinh này hoặc đã bị hủy trước đó',
  })
  async unlinkStudent(
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
  ): Promise<{ message: string }> {
    return this.parentsService.unlinkStudent(user.id, id);
  }
}
