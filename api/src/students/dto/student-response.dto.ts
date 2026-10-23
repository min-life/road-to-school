import { ApiProperty } from '@nestjs/swagger';
import { StudentStatus } from '@prisma/client';
import { PaginationMetaDto } from '../../schools/dto/school-response.dto.js';

export class StudentItemDto {
  @ApiProperty({
    description: 'Mã định danh duy nhất UUID của học sinh',
    example: 's1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  id: string;

  @ApiProperty({
    description: 'Mã học sinh duy nhất toàn hệ thống (STU + 8 ký tự alphanumeric)',
    example: 'STUA7B3C9D2',
  })
  code: string;

  @ApiProperty({
    description: 'Mã định danh UUID của trường học',
    example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
  })
  schoolId: string;

  @ApiProperty({
    description: 'Họ và tên đầy đủ của học sinh',
    example: 'Nguyễn Minh Quân',
  })
  fullName: string;

  @ApiProperty({
    description: 'Số điện thoại của người giám hộ',
    example: '0912345678',
  })
  guardianPhone: string;

  @ApiProperty({
    description: 'Ảnh đại diện của học sinh (nếu có)',
    nullable: true,
    example: 'https://res.cloudinary.com/demo/image/upload/v1/student.jpg',
  })
  avatarUrl: string | null;

  @ApiProperty({
    description: 'Địa chỉ đưa đón chi tiết (nếu có)',
    nullable: true,
    example: 'Số 10 Nguyễn Trãi, Thanh Xuân, Hà Nội',
  })
  addressText: string | null;

  @ApiProperty({
    description: 'Vĩ độ vị trí đón/trả học sinh (nếu có)',
    nullable: true,
    example: 21.002345,
  })
  latitude: number | null;

  @ApiProperty({
    description: 'Kinh độ vị trí đón/trả học sinh (nếu có)',
    nullable: true,
    example: 105.823456,
  })
  longitude: number | null;

  @ApiProperty({
    description: 'Trạng thái hoạt động chính thức của học sinh',
    enum: StudentStatus,
    example: StudentStatus.AVAILABLE,
  })
  status: StudentStatus;

  @ApiProperty({
    description:
      'Tình trạng địa chỉ dẫn xuất (true: đã có đủ địa chỉ văn bản và tọa độ hợp lệ, false: chưa có địa chỉ)',
    example: true,
  })
  hasAddress: boolean;

  @ApiProperty({
    description: 'Thời điểm tạo hồ sơ học sinh',
    example: '2026-10-23T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Thời điểm cập nhật hồ sơ gần nhất',
    example: '2026-10-23T10:00:00.000Z',
  })
  updatedAt: string;
}

export class StudentListResponseDto {
  @ApiProperty({
    description: 'Danh sách học sinh',
    type: [StudentItemDto],
  })
  items: StudentItemDto[];

  @ApiProperty({
    description: 'Thông tin phân trang',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

export class StudentDetailResponseDto extends StudentItemDto {
  @ApiProperty({
    description: 'Tên trường học đối tác',
    example: 'Trường Tiểu học Lê Quý Đôn',
  })
  schoolName: string;

  @ApiProperty({
    description: 'Dữ liệu mã QR dùng để quét liên kết (chính là Student Code)',
    example: 'STUA7B3C9D2',
  })
  qrData: string;
}
