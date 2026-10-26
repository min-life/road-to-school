import { ApiProperty } from '@nestjs/swagger';
import { RoutePlanStatus } from '@prisma/client';

export class EmptyRoutePlanSummaryDto {
  @ApiProperty({ description: 'ID phương án tuyến' })
  planId: string;

  @ApiProperty({ description: 'Tên phương án tuyến' })
  planName: string;

  @ApiProperty({ description: 'Trạng thái phương án tuyến', enum: RoutePlanStatus })
  planStatus: RoutePlanStatus;

  @ApiProperty({ description: 'ID tuyến xe rỗng' })
  routeId: string;

  @ApiProperty({ description: 'Tên tuyến xe rỗng' })
  routeName: string;
}

export class StudentDisableImpactDto {
  @ApiProperty({ description: 'ID học sinh' })
  studentId: string;

  @ApiProperty({ description: 'Mã định danh học sinh (STU...)' })
  code: string;

  @ApiProperty({ description: 'Họ tên học sinh' })
  fullName: string;

  @ApiProperty({ description: 'ID trường học' })
  schoolId: string;

  @ApiProperty({ description: 'Số phương án DRAFT bị ảnh hưởng' })
  affectedDraftPlansCount: number;

  @ApiProperty({ description: 'Alias số phương án DRAFT bị ảnh hưởng (frontend)' })
  draftRoutePlansCount: number;

  @ApiProperty({ description: 'Số phương án ACTIVE bị ảnh hưởng' })
  affectedActivePlansCount: number;

  @ApiProperty({ description: 'Alias số phương án ACTIVE bị ảnh hưởng (frontend)' })
  activeRoutePlansCount: number;

  @ApiProperty({ description: 'Số tuyến xe bị loại bỏ học sinh' })
  affectedRoutesCount: number;

  @ApiProperty({ description: 'Số chuyến xe SCHEDULED chưa vận hành sẽ loại học sinh khỏi danh sách' })
  cancellableScheduledTripsCount: number;

  @ApiProperty({ description: 'Alias số chuyến xe SCHEDULED chưa vận hành (frontend)' })
  scheduledTripsCount: number;

  @ApiProperty({ description: 'Số chuyến xe đã Ready hoặc đang chạy được bảo lưu dữ liệu cũ' })
  frozenTripsCount: number;

  @ApiProperty({ description: 'Số tuyến xe sẽ trở thành rỗng (không còn học sinh)' })
  emptyRoutesCount: number;

  @ApiProperty({ description: 'Alias số tuyến rỗng (frontend)' })
  emptyRoutesWillCancelTripsCount: number;

  @ApiProperty({
    description: 'Danh sách các phương án có tuyến trở thành rỗng (học sinh cuối cùng)',
    type: [EmptyRoutePlanSummaryDto],
  })
  emptyRoutePlans: EmptyRoutePlanSummaryDto[];

  @ApiProperty({
    description: 'Cờ cảnh báo bắt buộc hủy phương án (vi phạm bất biến không được phép có tuyến 0 học sinh)',
    example: true,
  })
  requiresPlanCancellation: boolean;

  @ApiProperty({ description: 'Fingerprint trạng thái hiện tại để kiểm tra xung đột' })
  expectedFingerprint: string;
}
