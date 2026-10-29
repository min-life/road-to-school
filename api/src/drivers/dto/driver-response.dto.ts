import { CredentialDeliveryResultDto } from '../../auth/credential-delivery.dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaginationMetaDto } from '../../schools/dto/school-response.dto.js';

export class DriverItemDto {
  @ApiProperty({
    description: 'Mã định danh duy nhất của tài xế',
    example: 'd1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  id: string;

  @ApiProperty({
    description: 'Họ và tên tài xế',
    example: 'Trần Văn Lái',
  })
  fullName: string;

  @ApiProperty({
    description: 'Địa chỉ email (nếu có)',
    nullable: true,
    example: 'lai.tv@roadtoschool.vn',
  })
  email: string | null;

  @ApiProperty({
    description: 'Số điện thoại liên hệ (nếu có)',
    nullable: true,
    example: '0987654321',
  })
  phone: string | null;

  @ApiProperty({
    description: 'Vai trò tài khoản',
    enum: Role,
    example: Role.DRIVER,
  })
  role: Role;

  @ApiProperty({
    description: 'Trạng thái hoạt động của tài khoản',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Trạng thái xác thực tài khoản',
    example: true,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Ảnh đại diện (nếu có)',
    nullable: true,
    example: null,
  })
  avatarUrl: string | null;

  @ApiProperty({
    description: 'Thời điểm tạo tài khoản',
    example: '2026-10-23T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Thời điểm cập nhật tài khoản gần nhất',
    example: '2026-10-23T10:00:00.000Z',
  })
  updatedAt: string;
}

export class DriverListResponseDto {
  @ApiProperty({
    description: 'Danh sách tài xế',
    type: [DriverItemDto],
  })
  items: DriverItemDto[];

  @ApiProperty({
    description: 'Thông tin phân trang',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

export class CreateDriverResponseDto extends CredentialDeliveryResultDto {
  @ApiProperty({
    description: 'Mã định danh duy nhất của tài xế vừa tạo',
    example: 'd1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  id: string;

  @ApiProperty({
    description: 'Họ và tên tài xế',
    example: 'Trần Văn Lái',
  })
  fullName: string;

  @ApiProperty({
    description: 'Địa chỉ email (nếu có)',
    nullable: true,
    example: 'lai.tv@roadtoschool.vn',
  })
  email: string | null;

  @ApiProperty({
    description: 'Số điện thoại liên hệ (nếu có)',
    nullable: true,
    example: '0987654321',
  })
  phone: string | null;

  @ApiProperty({
    description: 'Vai trò tài khoản',
    enum: Role,
    example: Role.DRIVER,
  })
  role: Role;

  @ApiProperty({
    description: 'Trường học trực thuộc (luôn là null đối với tài xế Nhà xe)',
    nullable: true,
    example: null,
  })
  schoolId: string | null;

  @ApiProperty({
    description: 'Trạng thái hoạt động của tài khoản',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Trạng thái xác thực tài khoản',
    example: true,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Thời điểm khởi tạo tài khoản',
    example: '2026-10-23T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Thông báo kết quả',
    example: 'Tạo tài khoản tài xế thành công',
  })
  declare message: string;
}
