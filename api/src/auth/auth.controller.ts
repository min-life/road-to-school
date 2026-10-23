import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import {
  LoginDto,
  RegisterRequestOtpDto,
  RegisterVerifyDto,
  ForgotPasswordRequestOtpDto,
  ResetPasswordDto,
  RefreshTokenDto,
  AuthResponseDto,
  TokenPairResponseDto,
  UserResponseDto,
  MessageResponseDto,
  ChangePasswordDto,
  UpdateParentNameDto,
  AvatarResponseDto,
} from './dto/index.js';
import { CurrentUser, CurrentSessionId } from './decorators/auth-user.decorator.js';
import { Role, type User } from '@prisma/client';
import type { Request } from 'express';


@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('web/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập dành cho Quản trị viên trên Web',
    description:
      'Xác thực tài khoản và cấp cặp Token (Access Token và Refresh Token) dành riêng cho SYSTEM_ADMIN và SCHOOL_ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Thông tin đăng nhập không chính xác',
  })
  @ApiResponse({
    status: 403,
    description: 'Tài khoản không được phép truy cập trên nền tảng Web hoặc đã bị vô hiệu hóa',
  })
  async webLogin(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.webLogin(dto, deviceInfo, ipAddress);
  }

  @Post('mobile/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập dành cho ứng dụng di động',
    description:
      'Xác thực tài khoản và cấp cặp Token dành riêng cho DRIVER, BUS_ATTENDANT và PARENT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Thông tin đăng nhập không chính xác',
  })
  @ApiResponse({
    status: 403,
    description: 'Tài khoản quản trị chỉ có thể đăng nhập trên Web hoặc đã bị vô hiệu hóa',
  })
  async mobileLogin(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.mobileLogin(dto, deviceInfo, ipAddress);
  }

  @Post('register/request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Yêu cầu mã OTP đăng ký Phụ huynh',
    description:
      'Kiểm tra định danh chưa được đăng ký và phát mã OTP xác thực (tuyệt đối chưa tạo User trong DB).',
  })
  @ApiResponse({
    status: 200,
    description: 'Mã xác thực đã được gửi thành công',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mã OTP cũ vẫn còn hiệu lực, vui lòng chờ hết hạn để yêu cầu mã mới',
  })
  @ApiResponse({
    status: 409,
    description: 'Email hoặc số điện thoại đã tồn tại trong hệ thống',
  })
  async registerRequestOtp(
    @Body() dto: RegisterRequestOtpDto,
  ): Promise<MessageResponseDto> {
    return this.authService.registerRequestOtp(dto);
  }

  @Post('register/verify')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Xác thực OTP và hoàn tất đăng ký Phụ huynh (Tự động đăng nhập)',
    description:
      'Xác thực mã OTP, tạo tài khoản Phụ huynh chính thức trong DB, cấp phiên làm việc và Token Pair để tự động đăng nhập.',
  })
  @ApiResponse({
    status: 201,
    description: 'Đăng ký tài khoản thành công và tự động đăng nhập',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mã xác thực không hợp lệ, đã hết hạn hoặc xác nhận mật khẩu không khớp',
  })
  @ApiResponse({
    status: 409,
    description: 'Email hoặc số điện thoại đã tồn tại',
  })
  async registerVerify(
    @Body() dto: RegisterVerifyDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.registerVerify(dto, deviceInfo, ipAddress);
  }

  @Post('forgot-password/request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Yêu cầu mã OTP đặt lại mật khẩu',
    description:
      'Gửi mã OTP đặt lại mật khẩu qua email hoặc SMS với phản hồi trung tính đồng nhất để chống User Enumeration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Phản hồi trung tính đồng nhất (thành công dù tài khoản có tồn tại hay không)',
    type: MessageResponseDto,
  })
  async forgotPasswordRequestOtp(
    @Body() dto: ForgotPasswordRequestOtpDto,
  ): Promise<MessageResponseDto> {
    return this.authService.forgotPasswordRequestOtp(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đặt lại mật khẩu trực tiếp bằng mã OTP',
    description:
      'Xác thực mã OTP và cập nhật mật khẩu mới, đồng thời thu hồi tất cả các phiên đăng nhập đang hoạt động của tài khoản.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại trên tất cả thiết bị.',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mã xác thực không hợp lệ, đã hết hạn hoặc mật khẩu xác nhận không khớp',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới cặp Token (Xoay vòng toàn bộ)',
    description:
      'Sử dụng Refresh Token hợp lệ để cập nhật Session và cấp cặp Access Token, Refresh Token hoàn toàn mới. Token cũ bị vô hiệu ngay lập tức.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cặp Token mới được cấp thành công',
    type: TokenPairResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Phiên đăng nhập không hợp lệ, đã hết hạn hoặc đã bị thu hồi',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<TokenPairResponseDto> {
    return this.authService.refreshToken(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Lấy thông tin tài khoản người dùng hiện tại',
    description:
      'Kiểm tra tính hợp lệ của Access Token và Session trong Database, trả về thông tin hồ sơ người dùng đang đăng nhập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin tài khoản hợp lệ',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc phiên đăng nhập không còn hiệu lực',
  })
  async getMe(@CurrentUser() user: User): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(user.id);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng xuất và thu hồi phiên làm việc hiện tại',
    description:
      'Thu hồi bản ghi Session trong Database, làm Access Token và Refresh Token của phiên hiện tại mất hiệu lực ngay lập tức.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng xuất thành công',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực hoặc phiên đăng nhập không còn hiệu lực',
  })
  async logout(
    @CurrentSessionId() sessionId: string,
  ): Promise<MessageResponseDto> {
    return this.authService.logout(sessionId);
  }

  @Post('me/change-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đổi mật khẩu tài khoản hiện tại',
    description:
      'Xác minh mật khẩu hiện tại, cập nhật mật khẩu mới và thu hồi toàn bộ các phiên làm việc khác trên các thiết bị khác để bảo mật.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đổi mật khẩu thành công',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Mật khẩu mới không được trùng với mật khẩu hiện tại hoặc không đủ độ dài',
  })
  @ApiResponse({
    status: 401,
    description: 'Mật khẩu hiện tại không chính xác hoặc chưa xác thực',
  })
  async changePassword(
    @CurrentUser() user: User,
    @CurrentSessionId() sessionId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.changePassword(user.id, sessionId, dto);
  }

  @Post('me/avatar')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cập nhật ảnh đại diện tài khoản hiện tại',
    description:
      'Tải lên tệp ảnh (JPEG/PNG/WebP, tối đa 5MB) lưu trữ qua Cloudinary và cập nhật ảnh đại diện tài khoản.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Tệp hình ảnh avatar mới (JPEG/PNG/WebP, tối đa 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật ảnh đại diện thành công',
    type: AvatarResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tệp ảnh không hợp lệ hoặc vượt quá dung lượng cho phép',
  })
  async updateAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<AvatarResponseDto> {
    return this.authService.updateAvatar(user.id, file);
  }

  @Patch('me/name')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.PARENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cập nhật họ tên tài khoản Phụ huynh',
    description:
      'Cho phép tài khoản có vai trò PARENT cập nhật họ tên hiển thị của chính mình. Các vai trò khác bị từ chối 403.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật họ tên thành công',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ tài khoản Phụ huynh mới có quyền đổi tên hiển thị',
  })
  async updateParentName(
    @CurrentUser() user: User,
    @Body() dto: UpdateParentNameDto,
  ): Promise<UserResponseDto> {
    return this.authService.updateParentName(user.id, user.role, dto);
  }
}

