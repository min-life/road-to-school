import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OtpService } from './otp.service.js';
import { AuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { CloudinaryService } from '../schools/cloudinary.service.js';
import { EmailDeliveryService } from './email-delivery.service.js';
import { EsmsSmsService } from './esms-sms.service.js';
import { PersonnelCredentialsService } from './personnel-credentials.service.js';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('AUTH_JWT_ACCESS_SECRET') ||
          'roadtoschool_default_jwt_secret_dev',
        signOptions: {
          expiresIn: parseInt(
            configService.get<string>('AUTH_ACCESS_TOKEN_TTL_SECONDS') || '900',
            10,
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, AuthGuard, RolesGuard, CloudinaryService, EmailDeliveryService, EsmsSmsService, PersonnelCredentialsService],
  exports: [AuthService, OtpService, AuthGuard, RolesGuard, JwtModule, CloudinaryService, EmailDeliveryService, EsmsSmsService, PersonnelCredentialsService],
})
export class AuthModule {}

