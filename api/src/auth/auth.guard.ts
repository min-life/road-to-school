import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtPayload } from './auth.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Vui lòng cung cấp Access Token để truy cập');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Định dạng Authorization header phải là Bearer <token>');
    }

    const secret =
      this.configService.get<string>('AUTH_JWT_ACCESS_SECRET') ||
      'roadtoschool_default_jwt_secret_dev';

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('Access Token không hợp lệ hoặc đã hết hạn');
    }

    if (!payload.sid || !payload.sub || typeof payload.ver !== 'number') {
      throw new UnauthorizedException('Token payload không đầy đủ thông tin xác thực');
    }

    // Kiểm tra trực tiếp trạng thái Session trong PostgreSQL
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Phiên đăng nhập không tồn tại');
    }

    // Kiểm tra thu hồi tức thì (Immediate Revocation)
    if (session.revokedAt !== null) {
      throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi');
    }

    // Kiểm tra thời hạn hiệu lực của Session
    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }

    // Kiểm tra phiên bản Token (Full Token Pair Rotation check)
    if (session.tokenVersion !== payload.ver) {
      throw new UnauthorizedException('Token không khớp với phiên bản phiên hiện tại');
    }

    // Kiểm tra trạng thái tài khoản
    if (!session.user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    // Gắn thông tin người dùng và phiên vào request
    request.user = session.user;
    request.session = session;

    return true;
  }
}
