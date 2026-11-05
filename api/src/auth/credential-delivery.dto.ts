import { ApiProperty } from '@nestjs/swagger';
import type { CredentialDeliveryStatus } from './email-delivery.service.js';

export class CredentialDeliveryResultDto {
  @ApiProperty({ description: 'Kết quả thao tác cấp mật khẩu' })
  message: string;

  @ApiProperty({ enum: ['SENT', 'FAILED', 'CONSOLE'], description: 'SENT: SMTP chấp nhận gửi, chưa chứng minh tới inbox; FAILED: chưa bàn giao được; CONSOLE: log development' })
  credentialDeliveryStatus: CredentialDeliveryStatus;
}
