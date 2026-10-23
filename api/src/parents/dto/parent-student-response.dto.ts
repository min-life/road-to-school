import { ApiProperty } from '@nestjs/swagger';
import { StudentStatus } from '@prisma/client';

export class ParentLinkedStudentItemDto {
  @ApiProperty({
    description: 'Mã định danh duy nhất UUID của học sinh',
    example: 's1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  id: string;

  @ApiProperty({
    description: 'Mã học sinh định danh duy nhất (STU + 8 ký tự)',
    example: 'STUA7B3C9D2',
  })
  code: string;

  @ApiProperty({
    description: 'Họ và tên học sinh',
    example: 'Nguyễn Minh Quân',
  })
  fullName: string;

  @ApiProperty({
    description: 'Ảnh đại diện của học sinh (nếu có)',
    nullable: true,
    example: 'https://res.cloudinary.com/demo/image/upload/v1/student.jpg',
  })
  avatarUrl: string | null;

  @ApiProperty({
    description: 'Tên trường học đối tác',
    example: 'Trường Tiểu học Lê Quý Đôn',
  })
  schoolName: string;

  @ApiProperty({
    description: 'Trạng thái hoạt động của học sinh (AVAILABLE hoặc DISABLED)',
    enum: StudentStatus,
    example: StudentStatus.AVAILABLE,
  })
  status: StudentStatus;

  @ApiProperty({
    description: 'Thời điểm liên kết',
    example: '2026-10-23T10:00:00.000Z',
  })
  linkedAt: string;
}

export class ParentLinkedStudentDetailResponseDto {
  @ApiProperty({
    description: 'Mã định danh duy nhất UUID của học sinh',
    example: 's1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  id: string;

  @ApiProperty({
    description: 'Mã học sinh',
    example: 'STUA7B3C9D2',
  })
  code: string;

  @ApiProperty({
    description: 'Họ và tên học sinh',
    example: 'Nguyễn Minh Quân',
  })
  fullName: string;

  @ApiProperty({
    description: 'Ảnh đại diện của học sinh (nếu có)',
    nullable: true,
    example: 'https://res.cloudinary.com/demo/image/upload/v1/student.jpg',
  })
  avatarUrl: string | null;

  @ApiProperty({
    description: 'Tên trường học đối tác',
    example: 'Trường Tiểu học Lê Quý Đôn',
  })
  schoolName: string;

  @ApiProperty({
    description: 'Địa chỉ đưa đón chi tiết (nếu có)',
    nullable: true,
    example: 'Số 10 Nguyễn Trãi, Thanh Xuân, Hà Nội',
  })
  addressText: string | null;

  @ApiProperty({
    description:
      'Tình trạng địa chỉ dẫn xuất (true: đã có địa chỉ đưa đón, false: chưa có địa chỉ)',
    example: true,
  })
  hasAddress: boolean;

  @ApiProperty({
    description: 'Trạng thái hoạt động của học sinh (AVAILABLE hoặc DISABLED)',
    enum: StudentStatus,
    example: StudentStatus.AVAILABLE,
  })
  status: StudentStatus;

  @ApiProperty({
    description: 'Thời điểm phụ huynh liên kết với học sinh',
    example: '2026-10-23T10:00:00.000Z',
  })
  linkedAt: string;
}
