import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Trang hiện tại', example: 1 })
  page: number;

  @ApiProperty({ description: 'Số lượng mục trên mỗi trang', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Tổng số mục thỏa mãn điều kiện', example: 1 })
  totalItems: number;

  @ApiProperty({ description: 'Tổng số trang', example: 1 })
  totalPages: number;
}

export class SchoolListItemDto {
  @ApiProperty({ description: 'ID định danh duy nhất của trường học', example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721' })
  id: string;

  @ApiProperty({ description: 'Tên trường học', example: 'Trường Tiểu học Lê Quý Đôn' })
  name: string;

  @ApiProperty({ description: 'Địa chỉ trường học chi tiết', example: 'Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội' })
  addressText: string;

  @ApiProperty({ description: 'Tọa độ vĩ độ (Latitude)', example: 21.028511 })
  latitude: number;

  @ApiProperty({ description: 'Tọa độ kinh độ (Longitude)', example: 105.772341 })
  longitude: number;

  @ApiProperty({ description: 'Đường dẫn ảnh trường học trên Cloudinary (nếu có)', nullable: true, example: 'https://res.cloudinary.com/.../school_1.webp' })
  imageUrl: string | null;

  @ApiProperty({ description: 'Ngày bắt đầu hợp đồng (định dạng YYYY-MM-DD)', example: '2026-09-01' })
  contractStartDate: string;

  @ApiProperty({ description: 'Ngày kết thúc hợp đồng (định dạng YYYY-MM-DD)', example: '2027-08-31' })
  contractEndDate: string;

  @ApiProperty({ description: 'Trạng thái hoạt động của trường học', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Thời điểm tạo bản ghi trường học', example: '2026-10-22T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Số lượng nhân viên trực thuộc trường học', example: 3 })
  employeeCount: number;
}

export class SchoolListResponseDto {
  @ApiProperty({ description: 'Danh sách các trường học', type: [SchoolListItemDto] })
  items: SchoolListItemDto[];

  @ApiProperty({ description: 'Thông tin phân trang', type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class SchoolDetailResponseDto {
  @ApiProperty({ description: 'ID định danh duy nhất của trường học', example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721' })
  id: string;

  @ApiProperty({ description: 'Tên trường học', example: 'Trường Tiểu học Lê Quý Đôn' })
  name: string;

  @ApiProperty({ description: 'Địa chỉ trường học chi tiết', example: 'Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội' })
  addressText: string;

  @ApiProperty({ description: 'Tọa độ vĩ độ (Latitude)', example: 21.028511 })
  latitude: number;

  @ApiProperty({ description: 'Tọa độ kinh độ (Longitude)', example: 105.772341 })
  longitude: number;

  @ApiProperty({ description: 'Đường dẫn ảnh trường học trên Cloudinary (nếu có)', nullable: true, example: 'https://res.cloudinary.com/.../school_1.webp' })
  imageUrl: string | null;

  @ApiProperty({ description: 'Định danh ảnh Cloudinary (Public ID)', nullable: true, example: 'roadtoschool/schools/school_123' })
  imagePublicId: string | null;

  @ApiProperty({ description: 'Ngày bắt đầu hợp đồng (định dạng YYYY-MM-DD)', example: '2026-09-01' })
  contractStartDate: string;

  @ApiProperty({ description: 'Ngày kết thúc hợp đồng (định dạng YYYY-MM-DD)', example: '2027-08-31' })
  contractEndDate: string;

  @ApiProperty({
    description: 'Lịch học theo tuần dạng JSON Object',
    example: {
      monday: { start: '07:00', end: '17:30' },
      tuesday: { start: '07:00', end: '17:30' },
    },
  })
  weeklySchedule: Record<string, any>;

  @ApiProperty({ description: 'Trạng thái hoạt động của trường học', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Thời điểm tạo bản ghi trường học', example: '2026-10-22T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Thời điểm cập nhật bản ghi trường học gần nhất', example: '2026-10-22T08:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ description: 'Số lượng nhân viên trực thuộc trường học', example: 3 })
  employeeCount: number;
}

export class UpdateSchoolStatusResponseDto {
  @ApiProperty({ description: 'ID trường học vừa cập nhật', example: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721' })
  id: string;

  @ApiProperty({ description: 'Trạng thái hoạt động sau khi cập nhật', example: false })
  isActive: boolean;

  @ApiProperty({ description: 'Thông báo kết quả', example: 'Cập nhật trạng thái trường học thành công' })
  message: string;
}
