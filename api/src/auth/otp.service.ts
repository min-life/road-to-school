import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryChannel, OtpPurpose, OtpChallenge } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import * as crypto from 'node:crypto';
import { EmailDeliveryService } from './email-delivery.service.js';
import { EsmsSmsService } from './esms-sms.service.js';
import { DeliveryError } from './delivery-error.js';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  @Inject(EmailDeliveryService)
  private readonly emailDelivery: EmailDeliveryService;
  @Inject(EsmsSmsService)
  private readonly smsDelivery: EsmsSmsService;

  isConsole(channel: DeliveryChannel): boolean {
    return channel === DeliveryChannel.SMS ? this.smsDelivery.isConsole() : this.emailDelivery.isConsole();
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Độ dài mã OTP lấy từ biến môi trường (mặc định 6 chữ số)
   */
  getOtpLength(): number {
    const raw = this.configService.get<string>('AUTH_OTP_LENGTH');
    const parsed = parseInt(raw || '6', 10);
    return isNaN(parsed) || parsed < 4 ? 6 : parsed;
  }

  /**
   * Thời hạn hiệu lực của mã OTP tính bằng giây (mặc định 300 giây = 5 phút)
   */
  getOtpTtlSeconds(): number {
    const raw = this.configService.get<string>('AUTH_OTP_TTL_SECONDS');
    const parsed = parseInt(raw || '300', 10);
    return isNaN(parsed) || parsed < 60 ? 300 : parsed;
  }

  /**
   * Sinh chuỗi OTP ngẫu nhiên an toàn (hỗ trợ số 0 ở đầu)
   */
  generateOtp(): string {
    const length = this.getOtpLength();
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += crypto.randomInt(0, 10).toString();
    }
    return otp;
  }

  /**
   * Băm mã OTP bằng thuật toán SHA-256
   */
  hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Chuẩn hóa thông tin định danh (Email hoặc Số điện thoại) và xác định kênh gửi
   */
  normalizeIdentifier(identifier: string): { normalized: string; channel: DeliveryChannel } {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return {
        normalized: trimmed.toLowerCase(),
        channel: DeliveryChannel.EMAIL,
      };
    }

    // Chuẩn hóa số điện thoại: loại bỏ khoảng trắng, dấu gạch nối, chuyển +84 thành 0
    let cleanPhone = trimmed.replace(/[\s\-().]/g, '');
    if (cleanPhone.startsWith('+84')) {
      cleanPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('84') && cleanPhone.length >= 11) {
      cleanPhone = '0' + cleanPhone.slice(2);
    }

    return {
      normalized: cleanPhone,
      channel: DeliveryChannel.SMS,
    };
  }

  /**
   * Kiểm tra điều kiện cấp mã OTP mới (Chỉ cho phép khi OTP gần nhất đã hết hạn expiresAt)
   */
  async canRequestNewOtp(
    identifier: string,
    purpose: OtpPurpose,
  ): Promise<{ allowed: boolean; remainingSeconds: number }> {
    const latestChallenge = await this.prisma.otpChallenge.findFirst({
      where: {
        identifier,
        purpose,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!latestChallenge) {
      return { allowed: true, remainingSeconds: 0 };
    }

    const now = new Date();
    if (now < latestChallenge.expiresAt) {
      const remainingSeconds = Math.ceil(
        (latestChallenge.expiresAt.getTime() - now.getTime()) / 1000,
      );
      return { allowed: false, remainingSeconds };
    }

    return { allowed: true, remainingSeconds: 0 };
  }

  /**
   * Tạo bản ghi thử thách OTP mới và phát mã qua kênh tương ứng
   */
  async createAndSendChallenge(
    identifier: string,
    purpose: OtpPurpose,
    userId?: string | null,
  ): Promise<{ expiresInSeconds: number }> {
    const { normalized, channel } = this.normalizeIdentifier(identifier);
    const ttlSeconds = this.getOtpTtlSeconds();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        userId: userId || null,
        identifier: normalized,
        channel,
        purpose,
        otpHash,
        expiresAt,
      },
    });

    await this.deliverChallenge(challenge.id, [{ channel, destination: normalized }], otp, purpose, ttlSeconds);

    return { expiresInSeconds: ttlSeconds };
  }

  /**
   * Phát thông báo OTP qua Email hoặc SMS
   */
  private async dispatchNotification(
    channel: DeliveryChannel,
    identifier: string,
    otp: string,
    purpose: OtpPurpose,
    ttlSeconds: number,
    requestId: string,
  ): Promise<void> {
    const minutes = Math.ceil(ttlSeconds / 60);

    let purposeText = 'xác thực';
    let subject = 'Mã xác thực RoadToSchool';
    if (purpose === OtpPurpose.PARENT_REGISTRATION) {
      purposeText = 'đăng ký tài khoản Phụ huynh';
      subject = 'Mã xác thực đăng ký tài khoản RoadToSchool';
    } else if (purpose === OtpPurpose.PASSWORD_RESET) {
      purposeText = 'đặt lại mật khẩu';
      subject = 'Mã xác thực đặt lại mật khẩu RoadToSchool';
    } else if (purpose === OtpPurpose.PARENT_STUDENT_LINKING) {
      purposeText = 'liên kết học sinh';
      subject = 'Mã xác thực liên kết học sinh RoadToSchool';
    } else if (purpose === OtpPurpose.STUDENT_UPDATE_REQUEST) {
      purposeText = 'yêu cầu cập nhật thông tin học sinh';
      subject = 'Mã xác thực yêu cầu cập nhật thông tin học sinh RoadToSchool';
    } else if (purpose === OtpPurpose.LEAVE_NOTICE) {
      purposeText = 'báo nghỉ chuyến xe';
      subject = 'Mã xác thực báo nghỉ RoadToSchool';
    }

    const messageContent = `Mã xác thực ${purposeText} RoadToSchool của bạn là: ${otp}. Mã có hiệu lực trong ${minutes} phút. Vui lòng không chia sẻ mã này với bất kỳ ai.`;

    if (channel === DeliveryChannel.EMAIL) {
      await this.emailDelivery.send(identifier, subject, messageContent);
    } else {
      await this.smsDelivery.sendOtp(identifier, otp, requestId);
    }
  }

  private async deliverChallenge(
    challengeId: string,
    contacts: { channel: DeliveryChannel; destination: string }[],
    otp: string, purpose: OtpPurpose, ttlSeconds: number,
  ): Promise<void> {
    let accepted = false;
    let uncertain = false;
    for (const contact of contacts) {
      try {
        const requestId = crypto.createHash('sha256')
          .update(challengeId + ':' + contact.channel + ':' + contact.destination).digest('hex').slice(0, 40);
        await this.dispatchNotification(contact.channel, contact.destination, otp, purpose, ttlSeconds, requestId);
        accepted = true;
      } catch (error) {
        uncertain ||= !(error instanceof DeliveryError) || error.uncertain;
        this.logger.warn('OTP delivery not confirmed for channel ' + contact.channel);
      }
    }
    if (accepted) return;
    if (!uncertain) {
      await this.prisma.otpChallenge.update({ where: { id: challengeId }, data: { expiresAt: new Date() } });
    }
    throw new DeliveryError(uncertain
      ? 'Chưa xác định kết quả gửi mã. Vui lòng chờ mã hết hạn trước khi yêu cầu lại'
      : 'Chưa gửi được mã xác thực. Vui lòng thử lại', uncertain);
  }

  /**
   * Tạo thử thách OTP liên kết Phụ huynh - Học sinh.
   * Ràng buộc chặt chẽ: parentId, studentId, guardianPhone và purpose PARENT_STUDENT_LINKING.
   */
  async createParentStudentChallenge(
    parentId: string,
    studentId: string,
    guardianPhone: string,
  ): Promise<{ challengeId: string; maskedPhone: string; expiresInSeconds: number }> {
    const { normalized } = this.normalizeIdentifier(guardianPhone);
    const ttlSeconds = this.getOtpTtlSeconds();
    const now = new Date();

    // 1. Kiểm tra rate-limit chống spam: không cho phép gửi lại khi mã gần nhất chưa hết hạn
    const latestChallenge = await this.prisma.otpChallenge.findFirst({
      where: {
        userId: parentId,
        studentId,
        purpose: OtpPurpose.PARENT_STUDENT_LINKING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestChallenge && now < latestChallenge.expiresAt) {
      const remainingSeconds = Math.ceil(
        (latestChallenge.expiresAt.getTime() - now.getTime()) / 1000,
      );
      throw new BadRequestException(
        `Vui lòng chờ ${remainingSeconds} giây trước khi yêu cầu mã xác thực mới`,
      );
    }

    // 2. Sinh mã OTP và băm SHA-256
    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        userId: parentId,
        studentId,
        identifier: normalized,
        channel: DeliveryChannel.SMS,
        purpose: OtpPurpose.PARENT_STUDENT_LINKING,
        otpHash,
        attempts: 0,
        expiresAt,
      },
    });

    // 3. Phát thông báo OTP
    await this.deliverChallenge(
      challenge.id, [{ channel: DeliveryChannel.SMS, destination: normalized }],
      otp, OtpPurpose.PARENT_STUDENT_LINKING, ttlSeconds,
    );

    // 4. Tạo masked phone (ẩn một phần số điện thoại để phụ huynh nhận diện)
    let maskedPhone = '***';
    if (normalized.length >= 7) {
      maskedPhone =
        normalized.slice(0, 3) + '****' + normalized.slice(-3);
    }

    return {
      challengeId: challenge.id,
      maskedPhone,
      expiresInSeconds: ttlSeconds,
    };
  }

  /**
   * Xác thực và tiêu thụ (consume) thử thách OTP liên kết Phụ huynh - Học sinh.
   * Thực thi trong transaction atomic để chống race condition và replay attack.
   */
  async verifyAndConsumeParentStudentChallenge(
    challengeId: string,
    parentId: string,
    plainOtp: string,
  ): Promise<OtpChallenge> {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.otpChallenge.findUnique({
        where: { id: challengeId },
      });

      if (!challenge || challenge.purpose !== OtpPurpose.PARENT_STUDENT_LINKING) {
        throw new BadRequestException('Mã thử thách OTP không tồn tại hoặc không hợp lệ');
      }

      if (challenge.userId !== parentId) {
        throw new BadRequestException('Bạn không có quyền sử dụng mã thử thách OTP này');
      }

      if (challenge.consumedAt !== null) {
        throw new BadRequestException('Mã xác thực đã được sử dụng trước đó');
      }

      const now = new Date();
      if (now >= challenge.expiresAt) {
        throw new BadRequestException('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới');
      }

      if (challenge.attempts >= 5) {
        throw new BadRequestException(
          'Bạn đã vượt quá số lần thử OTP cho phép (tối đa 5 lần). Vui lòng yêu cầu mã mới.',
        );
      }

      const inputHash = this.hashOtp(plainOtp.trim());
      if (inputHash !== challenge.otpHash) {
        await tx.otpChallenge.update({
          where: { id: challengeId },
          data: { attempts: { increment: 1 } },
        });
        const remaining = 5 - (challenge.attempts + 1);
        throw new BadRequestException(
          remaining > 0
            ? `Mã xác thực không chính xác. Bạn còn ${remaining} lần thử.`
            : 'Mã xác thực không chính xác. Bạn đã hết số lần thử cho mã này.',
        );
      }

      // Đánh dấu đã tiêu thụ OTP thành công
      const consumedChallenge = await tx.otpChallenge.update({
        where: { id: challengeId },
        data: { consumedAt: now },
      });

      return consumedChallenge;
    });
  }

  /**
   * Xác thực mã OTP (Hỗ trợ nhập sai không giới hạn, không khóa mã, chỉ từ chối khi sai hoặc hết hạn)
   */
  async verifyOtp(
    identifier: string,
    purpose: OtpPurpose,
    plainOtp: string,
  ): Promise<OtpChallenge> {
    const { normalized } = this.normalizeIdentifier(identifier);

    // Tìm thử thách OTP mới nhất của identifier và purpose
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        identifier: normalized,
        purpose,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!challenge || challenge.consumedAt !== null) {
      throw new BadRequestException('Mã xác thực không tồn tại hoặc đã được sử dụng');
    }

    const now = new Date();
    if (now >= challenge.expiresAt) {
      throw new BadRequestException('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    const inputHash = this.hashOtp(plainOtp.trim());
    if (inputHash !== challenge.otpHash) {
      // Quyết định PO: Không giới hạn số lần thử, không khóa mã, cho phép thử lại
      throw new BadRequestException('Mã xác thực không chính xác');
    }

    return challenge;
  }

  /**
   * Tạo thử thách OTP cho yêu cầu cập nhật thông tin/địa chỉ học sinh (Section 1.8 & Section 9)
   * Ràng buộc chặt chẽ: parentId, studentId, guardianPhone hiện tại, purpose STUDENT_UPDATE_REQUEST và payloadHash.
   */
  async createStudentUpdateRequestChallenge(
    parentId: string,
    studentId: string,
    guardianPhone: string,
    payloadHash: string,
  ): Promise<{ challengeId: string; maskedPhone: string; expiresInSeconds: number }> {
    const { normalized } = this.normalizeIdentifier(guardianPhone);
    const ttlSeconds = this.getOtpTtlSeconds();
    const now = new Date();

    // 1. Kiểm tra rate-limit chống spam: không cho phép gửi lại khi mã gần nhất chưa hết hạn
    const latestChallenge = await this.prisma.otpChallenge.findFirst({
      where: {
        userId: parentId,
        studentId,
        purpose: OtpPurpose.STUDENT_UPDATE_REQUEST,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestChallenge && now < latestChallenge.expiresAt) {
      const remainingSeconds = Math.ceil(
        (latestChallenge.expiresAt.getTime() - now.getTime()) / 1000,
      );
      throw new BadRequestException(
        `Vui lòng chờ ${remainingSeconds} giây trước khi yêu cầu mã xác thực mới`,
      );
    }

    // 2. Sinh mã OTP và băm SHA-256
    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        userId: parentId,
        studentId,
        identifier: normalized,
        channel: DeliveryChannel.SMS,
        purpose: OtpPurpose.STUDENT_UPDATE_REQUEST,
        otpHash,
        payloadHash,
        attempts: 0,
        expiresAt,
      },
    });

    // 3. Phát thông báo OTP
    await this.deliverChallenge(
      challenge.id, [{ channel: DeliveryChannel.SMS, destination: normalized }],
      otp, OtpPurpose.STUDENT_UPDATE_REQUEST, ttlSeconds,
    );

    // 4. Tạo masked phone (ẩn một phần số điện thoại để phụ huynh nhận diện)
    let maskedPhone = '***';
    if (normalized.length >= 7) {
      maskedPhone =
        normalized.slice(0, 3) + '****' + normalized.slice(-3);
    }

    return {
      challengeId: challenge.id,
      maskedPhone,
      expiresInSeconds: ttlSeconds,
    };
  }

  /**
   * Xác thực và tiêu thụ (consume) thử thách OTP yêu cầu cập nhật thông tin học sinh.
   * Ràng buộc kiểm tra khớp chính xác payloadHash đã cấp trước khi cho phép tiêu thụ OTP.
   */
  async verifyAndConsumeStudentUpdateRequestChallenge(
    challengeId: string,
    parentId: string,
    studentId: string,
    plainOtp: string,
    expectedPayloadHash: string,
  ): Promise<OtpChallenge> {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.otpChallenge.findUnique({
        where: { id: challengeId },
      });

      if (!challenge || challenge.purpose !== OtpPurpose.STUDENT_UPDATE_REQUEST) {
        throw new BadRequestException('Mã thử thách OTP không tồn tại hoặc không hợp lệ');
      }

      if (challenge.userId !== parentId) {
        throw new BadRequestException('Bạn không có quyền sử dụng mã thử thách OTP này');
      }

      if (challenge.studentId !== studentId) {
        throw new BadRequestException('Mã xác thực không thuộc về học sinh này');
      }

      if (challenge.consumedAt !== null) {
        throw new BadRequestException('Mã xác thực đã được sử dụng trước đó');
      }

      const now = new Date();
      if (now >= challenge.expiresAt) {
        throw new BadRequestException('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới');
      }

      if (challenge.attempts >= 5) {
        throw new BadRequestException(
          'Bạn đã vượt quá số lần thử OTP cho phép (tối đa 5 lần). Vui lòng yêu cầu mã mới.',
        );
      }

      // Kiểm tra ràng buộc payloadHash khớp chính xác
      if (challenge.payloadHash && challenge.payloadHash !== expectedPayloadHash) {
        throw new BadRequestException(
          'Dữ liệu đề xuất không khớp với mã OTP đã cấp. Vui lòng gửi lại yêu cầu OTP mới.',
        );
      }

      const inputHash = this.hashOtp(plainOtp.trim());
      if (inputHash !== challenge.otpHash) {
        await tx.otpChallenge.update({
          where: { id: challengeId },
          data: { attempts: { increment: 1 } },
        });
        const remaining = 5 - (challenge.attempts + 1);
        throw new BadRequestException(
          remaining > 0
            ? `Mã xác thực không chính xác. Bạn còn ${remaining} lần thử.`
            : 'Mã xác thực không chính xác. Bạn đã hết số lần thử cho mã này.',
        );
      }

      // Đánh dấu đã tiêu thụ OTP thành công
      const consumedChallenge = await tx.otpChallenge.update({
        where: { id: challengeId },
        data: { consumedAt: now },
      });

      return consumedChallenge;
    });
  }

  maskIdentifier(destination: string, channel: DeliveryChannel): string {
    if (channel === DeliveryChannel.EMAIL) {
      const parts = destination.split('@');
      if (parts.length !== 2) return destination;
      const [name, domain] = parts;
      const visible = name.length > 2 ? name.slice(0, 1) + '••••' + name.slice(-1) : name.slice(0, 1) + '••••';
      return `${visible}@${domain}`;
    }
    // SMS / phone
    const clean = destination.replace(/\s+/g, '');
    if (clean.length <= 4) return clean;
    const prefix = clean.slice(0, 2);
    const suffix = clean.slice(-3);
    return `${prefix}•••••${suffix}`;
  }

  async createLeaveNoticeChallenge(
    actorId: string,
    studentId: string | null,
    contacts: { channel: DeliveryChannel; destination: string; isConsole: boolean }[],
    payloadHash: string,
  ): Promise<{
    challengeId: string;
    maskedChannels: { channel: DeliveryChannel; destination: string; isConsole: boolean }[];
    expiresInSeconds: number;
  }> {
    if (!contacts.length) {
      throw new BadRequestException('Chưa có thông tin liên hệ hợp lệ để nhận mã xác thực');
    }

    const ttlSeconds = this.getOtpTtlSeconds();
    const now = new Date();

    // Rate limit: Không cho phép gửi lại khi mã gần nhất của actor và student chưa hết hạn
    const latestChallenge = await this.prisma.otpChallenge.findFirst({
      where: {
        userId: actorId,
        studentId: studentId ?? undefined,
        purpose: OtpPurpose.LEAVE_NOTICE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestChallenge && now < latestChallenge.expiresAt) {
      const remainingSeconds = Math.ceil(
        (latestChallenge.expiresAt.getTime() - now.getTime()) / 1000,
      );
      throw new BadRequestException(
        `Vui lòng chờ ${remainingSeconds} giây trước khi yêu cầu mã xác thực mới`,
      );
    }

    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const primaryIdentifier = contacts.map((c) => c.destination).join(',');

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        userId: actorId,
        studentId: studentId ?? undefined,
        identifier: primaryIdentifier,
        channel: contacts[0].channel,
        purpose: OtpPurpose.LEAVE_NOTICE,
        otpHash,
        payloadHash,
        attempts: 0,
        expiresAt,
      },
    });

    // Keep a challenge usable when at least one contact accepted the OTP.
    await this.deliverChallenge(challenge.id, contacts, otp, OtpPurpose.LEAVE_NOTICE, ttlSeconds);

    return {
      challengeId: challenge.id,
      maskedChannels: contacts.map((c) => ({
        channel: c.channel,
        destination: this.maskIdentifier(c.destination, c.channel),
        isConsole: this.isConsole(c.channel),
      })),
      expiresInSeconds: ttlSeconds,
    };
  }

  async verifyAndConsumeLeaveNoticeChallenge(
    tx: any,
    challengeId: string,
    plainOtp: string,
    expectedPayloadHash: string,
  ): Promise<OtpChallenge> {
    const challenge = await tx.otpChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.purpose !== OtpPurpose.LEAVE_NOTICE) {
      throw new BadRequestException('Mã xác thực không tồn tại hoặc không hợp lệ');
    }

    if (challenge.consumedAt !== null) {
      throw new BadRequestException('Mã xác thực đã được sử dụng trước đó');
    }

    const now = new Date();
    if (now >= challenge.expiresAt) {
      throw new BadRequestException('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    if (challenge.attempts >= 5) {
      throw new BadRequestException(
        'Bạn đã vượt quá số lần thử OTP cho phép (tối đa 5 lần). Vui lòng yêu cầu mã mới.',
      );
    }

    if (challenge.payloadHash && challenge.payloadHash !== expectedPayloadHash) {
      throw new BadRequestException(
        'Dữ liệu báo nghỉ không khớp với mã OTP đã cấp. Vui lòng gửi lại yêu cầu OTP mới.',
      );
    }

    const inputHash = this.hashOtp(plainOtp.trim());
    if (inputHash !== challenge.otpHash) {
      await tx.otpChallenge.update({
        where: { id: challengeId },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 5 - (challenge.attempts + 1);
      throw new BadRequestException(
        remaining > 0
          ? `Mã xác thực không chính xác. Bạn còn ${remaining} lần thử.`
          : 'Mã xác thực không chính xác. Bạn đã hết số lần thử cho mã này.',
      );
    }

    const consumedChallenge = await tx.otpChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: now },
    });

    return consumedChallenge;
  }
}


