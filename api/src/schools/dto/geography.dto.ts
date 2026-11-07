import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GeographyQueryDto {
  @ApiPropertyOptional({
    description:
      'ID tỉnh/thành VietMap; chỉ lọc khi người dùng gửi, không phải mã hành chính Nhà nước',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  provinceId?: string;

  @ApiPropertyOptional({
    description:
      'ID phường/xã VietMap. Kết hợp AND với provinceId nếu gửi cả hai',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  wardId?: string;
}

export class GeographyFieldsDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'ID tỉnh/thành VietMap của địa chỉ mới hai cấp',
  })
  provinceId?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'ID phường/xã VietMap của địa chỉ mới hai cấp',
  })
  wardId?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Tên đầy đủ phường/xã mới; null nếu chưa xác định',
  })
  ward?: string | null;
}

export class LocationOptionsQueryDto {
  @ApiPropertyOptional({
    description:
      'Giới hạn danh sách phường/xã theo ID tỉnh VietMap; danh sách tỉnh vẫn giữ nguyên',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  provinceId?: string;
}

class ProvinceOptionDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
}
class WardOptionDto extends ProvinceOptionDto {
  @ApiProperty() provinceId: string;
}
export class LocationOptionsDto {
  @ApiProperty({ type: [ProvinceOptionDto] }) provinces: ProvinceOptionDto[];
  @ApiProperty({ type: [WardOptionDto] }) wards: WardOptionDto[];
}
