import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class OverviewQueryDto {
  @ApiPropertyOptional({ example: '2026-10-27', description: 'Ngày phục vụ VN; mặc định hôm nay. Chỉ áp dụng thống kê chuyến.' })
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) serviceDate?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Chỉ System Admin được chọn trường khác.' })
  @IsOptional() @IsUUID() schoolId?: string;
}

export class OverviewTaskDto {
  @ApiProperty() kind!: string;
  @ApiProperty() label!: string;
  @ApiProperty() count!: number;
  @ApiProperty({ description: 'Đích nội bộ với bộ lọc tương ứng; không tự thực hiện thao tác.' }) href!: string;
}
export class OverviewTripCountsDto {
  @ApiProperty() SCHEDULED!: number;
  @ApiProperty() IN_PROGRESS!: number;
  @ApiProperty() COMPLETED!: number;
  @ApiProperty() CANCELLED!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ description: 'Tập con của SCHEDULED; đếm distinct Trip, không đếm số báo nghỉ/sự cố.' }) waitingAssignment!: number;
}
export class OverviewTripDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() schoolName!: string;
  @ApiProperty() serviceDate!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String }) scheduledStartTime!: string | null;
  @ApiProperty({ nullable: true, type: String }) scheduledEndTime!: string | null;
  @ApiProperty() driverName!: string;
  @ApiProperty() attendantName!: string;
  @ApiProperty() vehiclePlate!: string;
  @ApiProperty() waitingAssignment!: boolean;
}
export class OverviewInventoryDto {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
  @ApiProperty() count!: number;
  @ApiProperty({ nullable: true, type: String }) href!: string | null;
  @ApiProperty({ enum: ['SCOPE', 'OPERATOR'] }) scope!: 'SCOPE' | 'OPERATOR';
}
export class OverviewResponseDto {
  @ApiProperty() serviceDate!: string;
  @ApiProperty({ nullable: true, type: String }) schoolId!: string | null;
  @ApiProperty({ nullable: true, type: String }) schoolName!: string | null;
  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
  @ApiProperty({ type: OverviewTripCountsDto }) trips!: OverviewTripCountsDto;
  @ApiProperty({ type: [OverviewTaskDto], description: 'Hồ sơ chờ xử lý ở mọi ngày, trong phạm vi trường/role.' }) tasks!: OverviewTaskDto[];
  @ApiProperty({ type: [OverviewTripDto], description: 'Tối đa 8 chuyến của ngày chọn, ưu tiên chờ phân công rồi đang chạy.' }) attentionTrips!: OverviewTripDto[];
  @ApiProperty({ type: [OverviewTripDto], description: 'Chỉ hôm nay: tối đa 5 chuyến vẫn IN_PROGRESS từ ngày trước.' }) overdueRunningTrips!: OverviewTripDto[];
  @ApiProperty({ type: [OverviewInventoryDto], description: 'Hiện trạng; không phải số liệu lịch sử theo ngày chọn.' }) inventory!: OverviewInventoryDto[];
}
