import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DeliveryChannel, LeaveNoticeKind, RouteDirection } from '@prisma/client';

export class LeaveNoticeOptionsQueryDto {
  @ApiPropertyOptional({ description: 'ID học sinh (bắt buộc đối với Phụ huynh)' })
  @IsOptional()
  @IsUUID('4', { message: 'studentId phải là UUID hợp lệ' })
  studentId?: string;

  @ApiPropertyOptional({ example: '2026-10-27', description: 'Ngày vận hành cần lọc (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'serviceDate phải có định dạng YYYY-MM-DD' })
  serviceDate?: string;

  @ApiPropertyOptional({ enum: RouteDirection, description: 'Chiều tuyến đường (TO_SCHOOL | TO_PARKING)' })
  @IsOptional()
  @IsEnum(RouteDirection, { message: 'direction không hợp lệ' })
  direction?: RouteDirection;
}

export class MaskedContactChannelDto {
  @ApiProperty({ enum: DeliveryChannel, example: DeliveryChannel.SMS })
  channel: DeliveryChannel;

  @ApiProperty({ example: '09•••••123' })
  destination: string;

  @ApiProperty({ example: true, description: 'true nếu đang dùng chế độ console mô phỏng' })
  isConsole: boolean;
}

export class LeaveNoticeTripOptionDto {
  @ApiProperty({ example: 'trip-uuid-1' })
  tripId: string;

  @ApiProperty({ example: 'route-uuid-1' })
  routeId: string;

  @ApiProperty({ example: 'Tuyến Đi 01' })
  routeName: string;

  @ApiProperty({ example: '2026-10-27' })
  serviceDate: string;

  @ApiProperty({ enum: RouteDirection, example: RouteDirection.TO_SCHOOL })
  direction: RouteDirection;

  @ApiPropertyOptional({ example: '06:15' })
  scheduledStartTime?: string | null;

  @ApiPropertyOptional({ example: '07:10' })
  scheduledEndTime?: string | null;

  @ApiProperty({ example: true })
  canReport: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  disabledReason?: string | null;
}

export class LeaveNoticeOptionsResponseDto {
  @ApiProperty({ type: [LeaveNoticeTripOptionDto] })
  trips: LeaveNoticeTripOptionDto[];

  @ApiProperty({ type: [MaskedContactChannelDto] })
  maskedChannels: MaskedContactChannelDto[];

  @ApiProperty({ example: 'Nguyễn Văn An' })
  subjectName: string;

  @ApiProperty({ enum: LeaveNoticeKind, example: LeaveNoticeKind.STUDENT })
  kind: LeaveNoticeKind;
}
