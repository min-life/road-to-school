import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OtpService } from './otp.service.js';
import { ConfigService } from '@nestjs/config';
import { DeliveryChannel, OtpPurpose } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailDeliveryService } from './email-delivery.service.js';
import { EsmsSmsService } from './esms-sms.service.js';

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
    Object.assign(otpService, {
      emailDelivery: new EmailDeliveryService(configService),
      smsDelivery: new EsmsSmsService(configService),
    });
  });

  it('should generate an OTP of configured length', () => {
    const otp = otpService.generateOtp();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('stores the hash of the fixed code for a console OTP challenge', async () => {
    prismaService.otpChallenge.create.mockResolvedValue({ id: 'challenge' });
    await otpService.createAndSendChallenge('0912345678', OtpPurpose.PARENT_STUDENT_LINKING);
    expect(prismaService.otpChallenge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ otpHash: otpService.hashOtp('000000') }),
    });
    expect(otpService.generateOtp([DeliveryChannel.EMAIL, DeliveryChannel.SMS])).toBe('000000');
  });

  it.each([
    { AUTH_EMAIL_MODE: 'smtp', AUTH_SMS_MODE: 'console', NODE_ENV: 'development' },
    { AUTH_EMAIL_MODE: 'console', AUTH_SMS_MODE: 'esms', NODE_ENV: 'development' },
    { AUTH_EMAIL_MODE: 'console', AUTH_SMS_MODE: 'console', NODE_ENV: 'production' },
  ])('uses the configured generator for mixed delivery or production (%o)', (settings) => {
    configService.get.mockImplementation((key: keyof typeof settings) => settings[key] ?? '8');
    expect(otpService.generateOtp([DeliveryChannel.EMAIL, DeliveryChannel.SMS])).toMatch(/^\d{8}$/);
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
