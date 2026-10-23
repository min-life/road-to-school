import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaginationMetaDto } from './school-response.dto.js';

export class SchoolEmployeeItemDto {
  @ApiProperty({
    description: 'Mã định danh duy nhất của người dùng',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  id: string;

  @ApiProperty({
    description: 'Họ và tên nhân viên trường học',
    example: 'Nguyễn Văn Hùng',
  })
  fullName: string;

  @ApiProperty({
    description: 'Địa chỉ email (nếu có)',
    nullable: true,
    example: 'hung.nv@school.edu.vn',
  })
  email: string | null;

  @ApiProperty({
    description: 'Số điện thoại liên hệ (nếu có)',
    nullable: true,
    example: '0912345678',
  })
  phone: string | null;

  @ApiProperty({
    description: 'Vai trò của nhân viên trong trường',
    enum: Role,
    example: Role.SCHOOL_ADMIN,
  })
  role: Role;

  @ApiProperty({
    description: 'Trạng thái hoạt động của tài khoản',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Thời điểm tạo tài khoản',
    example: '2026-10-22T10:00:00.000Z',
  })
  createdAt: string;
}

export class SchoolEmployeeListResponseDto {
  @ApiProperty({
    description: 'Danh sách nhân viên trường học thỏa mãn điều kiện lọc',
    type: [SchoolEmployeeItemDto],
  })
  items: SchoolEmployeeItemDto[];

  @ApiProperty({
    description: 'Thông tin phân trang',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

export class CreateSchoolAdminResponseDto {
  @ApiProperty({
    description: 'Mã định danh duy nhất của tài khoản vừa tạo',
    example: 'd3f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  id: string;

  @ApiProperty({
    description: 'Họ và tên quản trị viên trường học',
    example: 'Nguyễn Văn Hùng',
  })
  fullName: string;

  @ApiProperty({
    description: 'Địa chỉ email (nếu có)',
    nullable: true,
    example: 'hung.nv@school.edu.vn',
  })
  email: string | null;

  @ApiProperty({
    description: 'Số điện thoại liên hệ (nếu có)',
    nullable: true,
    example: '0912345678',
  })
  phone: string | null;

  @ApiProperty({
    description: 'Vai trò tài khoản',
    enum: Role,
    example: Role.SCHOOL_ADMIN,
  })
  role: Role;

  @ApiProperty({
    description: 'Mã trường học liên kết',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  schoolId: string;

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
    example: '2026-10-22T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Thông báo kết quả',
    example: 'Tạo tài khoản quản trị trường học thành công',
  })
  message: string;
}

export class SchoolEmployeeDetailResponseDto {
  @ApiProperty({
    description: 'Mã định danh duy nhất của nhân viên',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  id: string;

  @ApiProperty({
    description: 'Họ và tên nhân viên',
    example: 'Nguyễn Văn Hùng',
  })
  fullName: string;

  @ApiProperty({
    description: 'Địa chỉ email (nếu có)',
    nullable: true,
    example: 'hung.nv@school.edu.vn',
  })
  email: string | null;

  @ApiProperty({
    description: 'Số điện thoại liên hệ (nếu có)',
    nullable: true,
    example: '0912345678',
  })
  phone: string | null;

  @ApiProperty({
    description: 'Vai trò của nhân viên trong trường',
    enum: Role,
    example: Role.BUS_ATTENDANT,
  })
  role: Role;

  @ApiProperty({
    description: 'Mã trường học liên kết',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  schoolId: string;

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
    example: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
  })
  avatarUrl: string | null;

  @ApiProperty({
    description: 'Thời điểm tạo tài khoản',
    example: '2026-10-22T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Thời điểm cập nhật tài khoản gần nhất',
    example: '2026-10-22T10:00:00.000Z',
  })
  updatedAt: string;
}

