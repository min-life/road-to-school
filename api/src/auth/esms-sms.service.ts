import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryError } from './delivery-error.js';

@Injectable()
export class EsmsSmsService {
  private readonly logger = new Logger(EsmsSmsService.name);

  constructor(private readonly config: ConfigService) {}

  isConsole(): boolean {
    const mode = (this.config.get<string>('AUTH_SMS_MODE') || 'console').toLowerCase();
    if (!['console', 'esms'].includes(mode)) throw new DeliveryError('Chế độ SMS không hợp lệ');
    if (mode === 'console' && this.config.get<string>('NODE_ENV') === 'production') {
      throw new DeliveryError('Không cho phép SMS console ở production');
    }
    return mode === 'console';
  }

  async sendOtp(phone: string, otp: string, requestId: string): Promise<void> {
    if (this.isConsole()) {
      this.logger.log(`[AUTH_SMS_CONSOLE] To: ${phone} | OTP: ${otp}`);
      return;
    }
    const apiKey = this.config.get<string>('ESMS_API_KEY');
    const secretKey = this.config.get<string>('ESMS_SECRET_KEY');
    if (!apiKey || !secretKey) throw new DeliveryError('Chưa cấu hình thông tin kết nối eSMS');
    if (!/^\d{6}$/.test(otp)) throw new DeliveryError('Mẫu OTP eSMS yêu cầu mã gồm 6 chữ số');
    let response: Response;
    try {
      response = await fetch('https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          ApiKey: apiKey, SecretKey: secretKey, Phone: phone,
          Content: `${otp} la ma xac minh dang ky Baotrixemay cua ban`,
          Brandname: 'Baotrixemay', SmsType: '2', IsUnicode: '0', Sandbox: '0', RequestId: requestId,
        }),
      });
    } catch {
      throw new DeliveryError('Chưa xác định kết quả gửi SMS. Vui lòng chờ trước khi yêu cầu lại', true);
    }
    if (!response.ok) throw new DeliveryError('Dịch vụ SMS chưa phản hồi hợp lệ', true);
    let result: { CodeResult?: string | number };
    try { result = await response.json() as typeof result; }
    catch { throw new DeliveryError('Không đọc được kết quả gửi SMS', true); }
    const code = String(result?.CodeResult || '');
    if (code === '100') return;
    const rejected = ['101', '102', '103', '104', '146'].includes(code);
    throw new DeliveryError('Dịch vụ SMS chưa chấp nhận yêu cầu gửi mã', !rejected);
  }
}
