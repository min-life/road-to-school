import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { DeliveryError } from './delivery-error.js';

export type CredentialDeliveryStatus = 'SENT' | 'FAILED' | 'CONSOLE';

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  constructor(private readonly config: ConfigService) {}

  isConsole(): boolean {
    return this.mode() === 'console';
  }

  private mode(): string {
    const mode = (this.config.get<string>('AUTH_EMAIL_MODE') || 'console').toLowerCase();
    if (!['console', 'smtp'].includes(mode)) {
      throw new DeliveryError('Chế độ gửi email chưa được cấu hình hợp lệ');
    }
    if (mode === 'console' && this.config.get<string>('NODE_ENV') === 'production') {
      throw new DeliveryError('Không cho phép gửi email bằng console ở production');
    }
    return mode;
  }

  async send(to: string, subject: string, text: string): Promise<'SENT' | 'CONSOLE'> {
    if (this.isConsole()) {
      this.logger.log(`[EMAIL_CONSOLE] To: ${to} | ${subject} | ${text}`);
      return 'CONSOLE';
    }
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    const port = Number(this.config.get<string>('SMTP_PORT') || '587');
    if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new DeliveryError('Cấu hình SMTP chưa đầy đủ hoặc không hợp lệ');
    }
    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465, auth: { user, pass },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });
    try {
      const result = await transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM') || 'RoadToSchool <no-reply@r2s.com>',
        to, subject, text,
      });
      if (!result.accepted?.length) throw new DeliveryError('Máy chủ email chưa chấp nhận người nhận');
      return 'SENT';
    } catch (error) {
      if (error instanceof DeliveryError) throw error;
      // A broken connection after DATA can mean the message was accepted.
      const code = (error as { code?: string }).code;
      throw new DeliveryError('Không thể xác nhận gửi email. Vui lòng thử lại sau', !['EAUTH', 'EENVELOPE'].includes(code || ''));
    } finally {
      transporter.close();
    }
  }

  async sendCredentials(to: string, fullName: string, password: string): Promise<CredentialDeliveryStatus> {
    try {
      return await this.send(to, 'Thông tin tài khoản RoadToSchool',
        `Xin chào ${fullName},\nTài khoản: ${to}\nMật khẩu mới: ${password}\nDùng thông tin này cho lần đăng nhập tiếp theo.`);
    } catch {
      this.logger.warn('Không thể bàn giao mật khẩu qua email; tài khoản vẫn được giữ lại');
      return 'FAILED';
    }
  }
}
