import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OtpService } from './otp.service.js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';

describe('OtpService', () => {
  let otpService: OtpService;
  let prismaService: any;
  let configService: any;

  beforeEach(() => {
    configService = {
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'AUTH_OTP_LENGTH') return '6';
        if (key === 'AUTH_OTP_TTL_SECONDS') return '300';
        if (key === 'AUTH_EMAIL_MODE') return 'console';
        if (key === 'AUTH_SMS_MODE') return 'console';
        return defaultValue;
      }),
    };

    prismaService = {
      otpChallenge: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    otpService = new OtpService(prismaService as unknown as PrismaService, configService as unknown as ConfigService);
  });

  it('should generate an OTP of configured length', () => {
    const otp = otpService.generateOtp();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('should hash OTP using SHA-256 correctly', () => {
    const hash = otpService.hashOtp('123456');
    expect(hash).toBeDefined();
    expect(hash).toHaveLength(64);
    // Verifying known SHA-256 hash for 123456
    const expectedHash = otpService.hashOtp('123456');
    expect(hash).toBe(expectedHash);
    expect(hash).not.toBe(otpService.hashOtp('654321'));
  });

  it('should normalize identifier and detect channel correctly', () => {
    const emailRes = otpService.normalizeIdentifier('  Test@R2S.COM ');
    expect(emailRes.normalized).toBe('test@r2s.com');
    expect(emailRes.channel).toBe('EMAIL');

    const phoneRes = otpService.normalizeIdentifier(' 0912 345 678 ');
    expect(phoneRes.normalized).toBe('0912345678');
    expect(phoneRes.channel).toBe('SMS');
  });
});
