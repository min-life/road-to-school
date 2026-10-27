import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User, OtpPurpose, DeliveryChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from './otp.service.js';
import { CloudinaryService } from '../schools/cloudinary.service.js';
import bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
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


export interface JwtPayload {
  sub: string;
  role: Role;
  sid: string;
  ver: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Thời hạn Access Token tính bằng giây (mặc định 900s = 15 phút)
   */
  getAccessTokenTtlSeconds(): number {
    const raw = this.configService.get<string>('AUTH_ACCESS_TOKEN_TTL_SECONDS');
    const parsed = parseInt(raw || '900', 10);
    return isNaN(parsed) || parsed < 60 ? 900 : parsed;
  }

  /**
   * Thời hạn Refresh Token tính bằng giây (mặc định 604800s = 7 ngày)
   */
  getRefreshTokenTtlSeconds(): number {
    const raw = this.configService.get<string>('AUTH_REFRESH_TOKEN_TTL_SECONDS');
    const parsed = parseInt(raw || '604800', 10);
    return isNaN(parsed) || parsed < 3600 ? 604800 : parsed;
  }

  /**
   * Chuẩn hóa đối tượng User trả về cho client (loại bỏ trường nhạy cảm như passwordHash)
   */
  sanitizeUser(user: User): UserResponseDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      schoolId: user.schoolId,
    };
  }

  /**
   * Sinh chuỗi ngẫu nhiên Refresh Token an toàn (64 ký tự hex)
   */
  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Băm Refresh Token bằng SHA-256
   */
  hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Tạo bản ghi Session mới trong Database và sinh cặp Access Token / Refresh Token
   */
  async createSessionAndTokenPair(
    user: User,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const rawRefreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(rawRefreshToken);
    const refreshTtlMs = this.getRefreshTokenTtlSeconds() * 1000;
    const expiresAt = new Date(Date.now() + refreshTtlMs);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        tokenVersion: 1,
        deviceInfo: deviceInfo || null,
        ipAddress: ipAddress || null,
        expiresAt,
      },
    });

    const accessToken = await this.signAccessToken({
      sub: user.id,
      role: user.role,
      sid: session.id,
      ver: session.tokenVersion,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Ký số Access Token JWT
   */
  async signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      expiresIn: this.getAccessTokenTtlSeconds(),
    });
  }

  /**
   * Đăng nhập trên Web (Chỉ cho phép SYSTEM_ADMIN và SCHOOL_ADMIN)
   */
  async webLogin(
    dto: LoginDto,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const { normalized } = this.otpService.normalizeIdentifier(dto.identifier);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalized }, { phone: normalized }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const allowedWebRoles: Role[] = [Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN];
    if (!allowedWebRoles.includes(user.role)) {
      throw new ForbiddenException('Tài khoản không được phép truy cập trên nền tảng Web');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa');
    }

    return this.createSessionAndTokenPair(user, deviceInfo, ipAddress);
  }

  /**
   * Đăng nhập trên Mobile (Chỉ cho phép DRIVER, BUS_ATTENDANT, PARENT)
   */
  async mobileLogin(
    dto: LoginDto,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const { normalized } = this.otpService.normalizeIdentifier(dto.identifier);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalized }, { phone: normalized }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const forbiddenMobileRoles: Role[] = [Role.SYSTEM_ADMIN, Role.SCHOOL_ADMIN];
    if (forbiddenMobileRoles.includes(user.role)) {
      throw new ForbiddenException('Tài khoản quản trị chỉ có thể đăng nhập trên Web');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa');
    }

    return this.createSessionAndTokenPair(user, deviceInfo, ipAddress);
  }

  /**
   * Yêu cầu mã OTP đăng ký Phụ huynh (Chưa tạo User ở bước này)
   */
  async registerRequestOtp(dto: RegisterRequestOtpDto): Promise<MessageResponseDto> {
    const { normalized } = this.otpService.normalizeIdentifier(dto.identifier);

    // Kiểm tra xem email hoặc số điện thoại đã tồn tại trong bảng User chưa
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalized }, { phone: normalized }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email hoặc số điện thoại đã được đăng ký trong hệ thống');
    }

    // Kiểm tra xem có mã OTP hiện tại còn hạn không (chỉ cấp lại khi mã cũ đã hết hạn expiresAt)
    const { allowed, remainingSeconds } = await this.otpService.canRequestNewOtp(
      normalized,
      OtpPurpose.PARENT_REGISTRATION,
    );

    if (!allowed) {
      throw new BadRequestException(
        `Mã xác thực hiện tại vẫn còn hiệu lực trong ${remainingSeconds} giây. Vui lòng chờ hết hạn để yêu cầu mã mới.`,
      );
    }

    await this.otpService.createAndSendChallenge(
      normalized,
      OtpPurpose.PARENT_REGISTRATION,
      null, // User chưa tạo
    );

    return { message: 'Mã xác thực đã được gửi thành công' };
  }

  /**
   * Xác thực OTP đăng ký, tạo tài khoản Phụ huynh và tự động đăng nhập (Auto Login)
   */
  async registerVerify(
    dto: RegisterVerifyDto,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Xác nhận mật khẩu không trùng khớp');
    }

    const { normalized, channel } = this.otpService.normalizeIdentifier(dto.identifier);

    // Xác thực mã OTP
    const challenge = await this.otpService.verifyOtp(
      normalized,
      OtpPurpose.PARENT_REGISTRATION,
      dto.otp,
    );

    // Transaction nguyên tử: kiểm tra uniqueness lần hai, tạo User, consume OTP, tạo Session
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const rawRefreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(rawRefreshToken);
    const refreshTtlMs = this.getRefreshTokenTtlSeconds() * 1000;
    const expiresAt = new Date(Date.now() + refreshTtlMs);

    const result = await this.prisma.$transaction(async (tx) => {
      // Kiểm tra lại User không tồn tại (phòng tránh race condition hai request đồng thời)
      const existing = await tx.user.findFirst({
        where: {
          OR: [{ email: normalized }, { phone: normalized }],
        },
      });

      if (existing) {
        throw new ConflictException('Email hoặc số điện thoại đã được đăng ký trong hệ thống');
      }

      // Đánh dấu OTP đã sử dụng
      await tx.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });

      // Tạo User Phụ huynh mới
      const newUser = await tx.user.create({
        data: {
          email: channel === DeliveryChannel.EMAIL ? normalized : null,
          phone: channel === DeliveryChannel.SMS ? normalized : null,
          fullName: dto.fullName.trim(),
          passwordHash,
          role: Role.PARENT,
          isVerified: true,
          isActive: true,
          avatarUrl: null,
        },
      });

      // Tạo Session cho thiết bị
      const newSession = await tx.session.create({
        data: {
          userId: newUser.id,
          refreshTokenHash,
          tokenVersion: 1,
          deviceInfo: deviceInfo || null,
          ipAddress: ipAddress || null,
          expiresAt,
        },
      });

      return { user: newUser, session: newSession };
    });

    const accessToken = await this.signAccessToken({
      sub: result.user.id,
      role: result.user.role,
      sid: result.session.id,
      ver: result.session.tokenVersion,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: this.sanitizeUser(result.user),
    };
  }

  /**
   * Yêu cầu mã OTP Quên mật khẩu (Phản hồi trung tính 100% chống User Enumeration)
   */
  async forgotPasswordRequestOtp(
    dto: ForgotPasswordRequestOtpDto,
  ): Promise<MessageResponseDto> {
    const { normalized } = this.otpService.normalizeIdentifier(dto.identifier);

    // Tìm User trong DB
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalized }, { phone: normalized }],
      },
    });

    if (user && user.isActive) {
      // Kiểm tra xem OTP trước đó đã hết hạn chưa
      const { allowed } = await this.otpService.canRequestNewOtp(
        normalized,
        OtpPurpose.PASSWORD_RESET,
      );

      if (allowed) {
        await this.otpService.createAndSendChallenge(
          normalized,
          OtpPurpose.PASSWORD_RESET,
          user.id,
        );
      }
    }

    // Luôn trả về phản hồi đồng nhất
    return {
      message: 'Nếu tài khoản tồn tại và đủ điều kiện, mã xác minh sẽ được gửi.',
    };
  }

  /**
   * Đặt lại mật khẩu trực tiếp qua OTP và thu hồi toàn bộ các phiên của tài khoản
   */
  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Xác nhận mật khẩu mới không trùng khớp');
    }

    const { normalized } = this.otpService.normalizeIdentifier(dto.identifier);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalized }, { phone: normalized }],
      },
    });

    if (!user) {
      throw new BadRequestException('Yêu cầu đặt lại mật khẩu không hợp lệ');
    }

    // Xác thực mã OTP
    const challenge = await this.otpService.verifyOtp(
      normalized,
      OtpPurpose.PASSWORD_RESET,
      dto.otp,
    );

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Transaction nguyên tử: Cập nhật mật khẩu, consume OTP, thu hồi TẤT CẢ các phiên
    await this.prisma.$transaction(async (tx) => {
      // Đánh dấu OTP đã sử dụng
      await tx.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });

      // Cập nhật mật khẩu mới
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // Thu hồi TẤT CẢ các phiên của người dùng (Immediate Revocation)
      await tx.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
            pushToken: null,
        },
      });
    });

    return {
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại trên tất cả thiết bị.',
    };
  }

  /**
   * Xoay vòng toàn bộ cặp Token (Atomic Conditional Update qua tokenVersion)
   */
  async refreshToken(dto: RefreshTokenDto): Promise<TokenPairResponseDto> {
    const rawRefreshToken = dto.refreshToken.trim();
    const currentHash = this.hashRefreshToken(rawRefreshToken);

    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash: currentHash,
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }

    if (session.revokedAt !== null || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi hoặc đã hết hạn');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    // Atomic Conditional Update: Chỉ thành công khi refreshTokenHash và tokenVersion khớp chính xác
    const newRefreshToken = this.generateRefreshToken();
    const newRefreshTokenHash = this.hashRefreshToken(newRefreshToken);
    const refreshTtlMs = this.getRefreshTokenTtlSeconds() * 1000;
    const newExpiresAt = new Date(Date.now() + refreshTtlMs);

    const updateResult = await this.prisma.session.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: currentHash,
        tokenVersion: session.tokenVersion,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        tokenVersion: { increment: 1 },
        expiresAt: newExpiresAt,
      },
    });

    if (updateResult.count === 0) {
      // Xung đột đồng thời hoặc session đã bị làm mới bởi request khác
      throw new UnauthorizedException('Phiên đăng nhập đã được làm mới hoặc đã bị thu hồi');
    }

    const nextTokenVersion = session.tokenVersion + 1;
    const accessToken = await this.signAccessToken({
      sub: session.user.id,
      role: session.user.role,
      sid: session.id,
      ver: nextTokenVersion,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Lấy thông tin tài khoản hiện tại
   */
  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Đăng xuất: Thu hồi phiên đăng nhập hiện tại
   */
  async logout(sessionId: string): Promise<MessageResponseDto> {
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: {
          id: sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
            pushToken: null,
        },
      });
    }

    return { message: 'Đăng xuất thành công' };
  }

  /**
   * Kiểm định chữ ký file buffer (Magic Bytes) cho JPEG, PNG và WebP
   */
  private validateImageBuffer(buffer: Buffer, mimetype: string): boolean {
    const lower = mimetype.toLowerCase();
    if (lower === 'image/jpeg' || lower === 'image/jpg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimetype === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }
    if (mimetype === 'image/webp') {
      return (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      );
    }
    return false;
  }

  /**
   * Đổi mật khẩu tài khoản hiện tại:
   * - Xác minh mật khẩu hiện tại
   * - Kiểm tra mật khẩu mới khác mật khẩu cũ
   * - Cập nhật hash
   * - Thu hồi các phiên đăng nhập khác, duy trì phiên hiện tại
   */
  async changePassword(
    userId: string,
    currentSessionId: string,
    dto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu hiện tại');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });

      // Thu hồi toàn bộ các phiên khác của người dùng này (Section 1.11)
      await tx.session.updateMany({
        where: {
          userId,
          id: { not: currentSessionId },
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
            pushToken: null,
        },
      });
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  /**
   * Cập nhật ảnh đại diện người dùng qua Cloudinary
   */
  async updateAvatar(
    userId: string,
    file?: Express.Multer.File,
  ): Promise<AvatarResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn tệp hình ảnh để tải lên');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimes.includes(file.mimetype.toLowerCase())) {
      throw new BadRequestException('Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG hoặc WebP');
    }

    this.logger.log(
      `[AVATAR_UPLOAD] User ${userId} uploading avatar: ${file.originalname} (${file.size} bytes, ${file.mimetype})`,
    );

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Kích thước tệp ảnh vượt quá giới hạn tối đa 5MB');
    }

    if (!this.validateImageBuffer(file.buffer, file.mimetype)) {
      throw new BadRequestException('Nội dung tệp ảnh không hợp lệ hoặc bị hỏng');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, avatarPublicId: true },
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    const oldPublicId = user.avatarPublicId;

    const uploadResult = await this.cloudinaryService.uploadUserAvatar(
      file.buffer,
      file.originalname,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: uploadResult.secureUrl,
        avatarPublicId: uploadResult.publicId,
      },
    });

    // Cleanup ảnh cũ nếu có (Section 1.12: non-blocking cleanup)
    if (oldPublicId) {
      this.cloudinaryService.deleteImage(oldPublicId).catch((err) => {
        this.logger.warn(`Lỗi khi dọn dẹp avatar cũ ${oldPublicId}: ${err?.message || err}`);
      });
    }

    return {
      avatarUrl: uploadResult.secureUrl,
      message: 'Cập nhật ảnh đại diện thành công',
    };
  }

  /**
   * Cập nhật họ tên tài khoản (Chỉ áp dụng cho vai trò PARENT)
   */
  async updateParentName(
    userId: string,
    userRole: Role,
    dto: UpdateParentNameDto,
  ): Promise<UserResponseDto> {
    if (userRole !== Role.PARENT) {
      throw new ForbiddenException('Chỉ tài khoản Phụ huynh mới có quyền đổi tên hiển thị');
    }

    const trimmedName = dto.fullName?.trim();
    if (!trimmedName || trimmedName.length < 2) {
      throw new BadRequestException('Họ và tên phải có tối thiểu 2 ký tự');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: trimmedName },
    });

    return this.sanitizeUser(updatedUser);
  }
}

