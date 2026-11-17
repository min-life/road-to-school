import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { StudentStatus } from '@prisma/client';

export class BulkImportRowErrorDto {
  @ApiProperty({ description: 'Số dòng thực tế trong tệp Excel (bắt đầu từ dòng 2)', example: 3 })
  rowNumber: number;

  @ApiPropertyOptional({ description: 'Tên trường bị lỗi (nếu xác định được)', example: 'guardianPhone' })
  field?: string;

  @ApiProperty({ description: 'Mô tả chi tiết nguyên nhân lỗi', example: 'Số điện thoại phụ huynh không hợp lệ' })
  message: string;
}

export class BulkImportPreviewResponseDto {
  @ApiProperty({ description: 'Tổng số dòng dữ liệu đọc được từ tệp (không tính header và dòng trống)', example: 10 })
  totalRows: number;

  @ApiProperty({ description: 'Số dòng dữ liệu hợp lệ sẵn sàng nhập', example: 8 })
  validRows: number;

  @ApiProperty({ description: 'Số dòng dữ liệu bị lỗi', example: 2 })
  invalidRows: number;

  @ApiProperty({
    type: [BulkImportRowErrorDto],
    description: 'Danh sách lỗi chi tiết theo từng dòng',
  })
  errors: BulkImportRowErrorDto[];

  @ApiPropertyOptional({
    description: 'Token xác thực kết quả preview, có hiệu lực trong 30 phút. Chỉ trả về khi invalidRows === 0 và validRows > 0',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  previewToken?: string;
}

export class BulkImportCommitDto {
  @ApiProperty({
    description: 'Token preview nhận được từ bước preview hợp lệ',
    example: 'preview-token-xyz',
  })
  @IsNotEmpty({ message: 'previewToken không được để trống' })
  @IsString({ message: 'previewToken phải là chuỗi ký tự' })
  previewToken: string;

  @ApiProperty({
    description: 'Khóa định danh giao dịch nhập do client sinh (UUIDv4) để chống gửi lặp và đối soát biên nhận',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'importKey không được để trống' })
  @IsString({ message: 'importKey phải là chuỗi ký tự' })
  importKey: string;
}

export class BulkImportCommitResponseDto {
  @ApiProperty({ description: 'Số lượng học sinh đã được lưu thành công vào cơ sở dữ liệu', example: 8 })
  importedCount: number;

  @ApiProperty({ description: 'Khóa biên nhận đã hoàn tất giao dịch', example: '550e8400-e29b-41d4-a716-446655440000' })
  importKey: string;
}

export enum BulkExportScope {
  SELECTED = 'SELECTED',
  FILTERED = 'FILTERED',
}

export class BulkExportFilterDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo tên hoặc mã' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: StudentStatus, description: 'Trạng thái học sinh' })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái có địa chỉ hay chưa' })
  @IsOptional()
  hasAddress?: boolean;

  @ApiPropertyOptional({ description: 'Lọc trạng thái gán tuyến (UNASSIGNED)' })
  @IsOptional()
  @IsString()
  routingStatus?: string;

  @ApiPropertyOptional({ description: 'Mã tỉnh/thành phố' })
  @IsOptional()
  @IsString()
  provinceId?: string;

  @ApiPropertyOptional({ description: 'Mã phường/xã' })
  @IsOptional()
  @IsString()
  wardId?: string;
}

export class BulkExportDto {
  @ApiProperty({
    enum: BulkExportScope,
    description: 'Phạm vi xuất: SELECTED (theo danh sách ID được chọn) hoặc FILTERED (theo bộ lọc hiện tại)',
    example: BulkExportScope.FILTERED,
  })
  @IsNotEmpty({ message: 'Phạm vi xuất scope không được để trống' })
  @IsEnum(BulkExportScope, { message: 'Phạm vi xuất phải là SELECTED hoặc FILTERED' })
  scope: BulkExportScope;

  @ApiPropertyOptional({
    type: [String],
    description: 'Danh sách UUID học sinh được chọn (bắt buộc khi scope = SELECTED)',
    example: ['c1f8a847-75c1-4b36-a3d5-22e3914a8721'],
  })
  @IsOptional()
  @IsArray({ message: 'studentIds phải là một mảng chuỗi UUID' })
  @IsString({ each: true, message: 'Mỗi studentId phải là chuỗi' })
  studentIds?: string[];

  @ApiPropertyOptional({
    type: BulkExportFilterDto,
    description: 'Các điều kiện lọc đang áp dụng (áp dụng khi scope = FILTERED)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BulkExportFilterDto)
  filters?: BulkExportFilterDto;
}
