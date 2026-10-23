import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Role, StudentStatus, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../schools/cloudinary.service.js';
import { generateStudentCode } from './utils/student-code.generator.js';
import {
  CreateStudentDto,
  ListStudentsQueryDto,
  UpdateStudentStatusDto,
  StudentListResponseDto,
  StudentDetailResponseDto,
  StudentItemDto,
} from './dto/index.js';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Tính toán trường dẫn xuất hasAddress từ 3 thuộc tính địa chỉ
   */
  private computeHasAddress(
    addressText: string | null | undefined,
    latitude: number | null | undefined,
    longitude: number | null | undefined,
  ): boolean {
    return Boolean(
      addressText &&
        addressText.trim().length > 0 &&
        latitude !== null &&
        latitude !== undefined &&
        longitude !== null &&
        longitude !== undefined,
    );
  }

  /**
   * Kiểm định chữ ký file buffer (Magic Bytes) cho JPEG, PNG và WebP
   */
  private validateImageBuffer(buffer: Buffer, mimetype: string): boolean {
    if (mimetype === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimetype === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }
    if (mimetype === 'image/webp') {
      const isRiff =
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46;
      const isWebp =
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50;
      return isRiff && isWebp;
    }
    return false;
  }

  /**
   * Lấy danh sách học sinh theo trường học.
   * Hỗ trợ tìm kiếm, 2 bộ lọc độc lập (status và hasAddress) và phân trang Server-side.
   */
  async listStudents(
    schoolId: string,
    query: ListStudentsQueryDto,
    currentUser?: User,
  ): Promise<StudentListResponseDto> {
    // 1. Kiểm tra trường học tồn tại
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });

    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    // Kiểm tra cách ly trường học đối với SCHOOL_ADMIN
    if (currentUser && currentUser.role === Role.SCHOOL_ADMIN) {
      if (currentUser.schoolId !== schoolId) {
        throw new ForbiddenException(
          'Bạn không có quyền xem danh sách học sinh của trường học khác',
        );
      }
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    // 2. Xây dựng điều kiện lọc ở tầng Database
    const where: Prisma.StudentWhereInput = {
      schoolId,
    };

    // Bộ lọc 1: Trạng thái học sinh (AVAILABLE hoặc DISABLED)
    if (query.status) {
      where.status = query.status;
    }

    // Bộ lọc 2: Tình trạng địa chỉ dẫn xuất (hasAddress)
    if (query.hasAddress !== undefined) {
      if (query.hasAddress === true) {
        where.addressText = { not: null };
        where.latitude = { not: null };
        where.longitude = { not: null };
      } else if (query.hasAddress === false) {
        where.OR = [
          { addressText: null },
          { latitude: null },
          { longitude: null },
        ];
      }
    }

    // Tìm kiếm theo họ tên hoặc mã học sinh
    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      const searchCondition = {
        OR: [
          { fullName: { contains: searchTerm, mode: 'insensitive' as const } },
          { code: { contains: searchTerm, mode: 'insensitive' as const } },
        ],
      };

      if (where.OR) {
        where.AND = [searchCondition];
      } else {
        where.OR = searchCondition.OR;
      }
    }

    // 3. Thực hiện truy vấn song song count và findMany trước phân trang
    const [students, totalItems] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.student.count({ where }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      items: students.map((s) => ({
        id: s.id,
        code: s.code,
        schoolId: s.schoolId,
        fullName: s.fullName,
        guardianPhone: s.guardianPhone,
        avatarUrl: s.avatarUrl,
        addressText: s.addressText,
        latitude: s.latitude,
        longitude: s.longitude,
        status: s.status,
        hasAddress: this.computeHasAddress(
          s.addressText,
          s.latitude,
          s.longitude,
        ),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Tạo mới học sinh cho trường học.
   * - Chỉ SCHOOL_ADMIN được phép tạo cho trường của mình.
   * - Bắt buộc kiểm tra ràng buộc địa chỉ: hoặc không có gì (cả 3 null) hoặc có đủ 3 trường hợp lệ.
   * - Tự động sinh Student Code duy nhất (STU + 8 ký tự alphanumeric).
   */
  async createStudent(
    schoolId: string,
    dto: CreateStudentDto,
    file?: Express.Multer.File,
    currentUser?: User,
  ): Promise<StudentItemDto> {
    // 1. Kiểm tra quyền SCHOOL_ADMIN và cách ly trường học
    if (currentUser) {
      if (currentUser.role !== Role.SCHOOL_ADMIN) {
        throw new ForbiddenException(
          'Chỉ Quản trị viên trường học (SCHOOL_ADMIN) mới có quyền tạo học sinh',
        );
      }
      if (currentUser.schoolId !== schoolId) {
        throw new ForbiddenException(
          'Bạn không có quyền tạo học sinh cho trường học khác',
        );
      }
    }

    // 2. Kiểm tra trường học tồn tại và đang hoạt động
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, isActive: true },
    });

    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    if (!school.isActive) {
      throw new BadRequestException(
        'Không thể tạo học sinh cho trường học đang ngừng hoạt động',
      );
    }

    // 3. Kiểm định tính nhất quán dữ liệu địa chỉ (Address Data Invariant)
    const hasText = Boolean(dto.addressText && dto.addressText.trim().length > 0);
    const hasLat = dto.latitude !== undefined && dto.latitude !== null;
    const hasLng = dto.longitude !== undefined && dto.longitude !== null;

    let addressText: string | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (hasText || hasLat || hasLng) {
      if (!(hasText && hasLat && hasLng)) {
        throw new BadRequestException(
          'Nếu cung cấp địa chỉ, bắt buộc phải có đầy đủ Địa chỉ chi tiết, Vĩ độ và Kinh độ hợp lệ',
        );
      }
      addressText = dto.addressText!.trim();
      latitude = dto.latitude!;
      longitude = dto.longitude!;

      if (latitude < -90 || latitude > 90) {
        throw new BadRequestException(
          'Vĩ độ không hợp lệ (phải nằm trong khoảng [-90, 90])',
        );
      }
      if (longitude < -180 || longitude > 180) {
        throw new BadRequestException(
          'Kinh độ không hợp lệ (phải nằm trong khoảng [-180, 180])',
        );
      }
    }

    // 4. Chuẩn hóa số điện thoại người giám hộ
    let cleanPhone = dto.guardianPhone.trim().replace(/[\s\-().]/g, '');
    if (cleanPhone.startsWith('+84')) {
      cleanPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('84') && cleanPhone.length >= 11) {
      cleanPhone = '0' + cleanPhone.slice(2);
    }

    // 5. Upload avatar nếu có
    let avatarUrl: string | null = null;
    let avatarPublicId: string | null = null;

    if (file) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          'Kích thước ảnh đại diện vượt quá giới hạn cho phép (5 MB)',
        );
      }

      const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          'Định dạng tệp ảnh không được hỗ trợ. Chỉ chấp nhận JPEG, PNG hoặc WebP.',
        );
      }

      if (!file.buffer || file.buffer.length === 0) {
        throw new BadRequestException('Tệp ảnh tải lên bị rỗng');
      }

      if (!this.validateImageBuffer(file.buffer, file.mimetype)) {
        throw new BadRequestException(
          'Nội dung tệp ảnh không khớp với định dạng MIME được khai báo',
        );
      }

      if (this.cloudinaryService.isConfigured()) {
        const uploadResult = await this.cloudinaryService.uploadStudentAvatar(
          file.buffer,
          file.originalname,
        );
        avatarUrl = uploadResult.secureUrl;
        avatarPublicId = uploadResult.publicId;
      }
    }

    // 6. Sinh Student Code duy nhất với vòng lặp thử lại nếu collision
    let createdStudent: any = null;
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const code = generateStudentCode();
      try {
        createdStudent = await this.prisma.student.create({
          data: {
            code,
            schoolId,
            fullName: dto.fullName.trim(),
            guardianPhone: cleanPhone,
            avatarUrl,
            avatarPublicId,
            addressText,
            latitude,
            longitude,
            status: StudentStatus.AVAILABLE,
          },
        });
        break;
      } catch (error: any) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target = error.meta?.target as string[] | undefined;
          if (target && target.includes('code')) {
            this.logger.warn(
              `Xung đột mã học sinh ${code} lần thử ${attempt}/${maxRetries}. Đang thử lại sinh mã mới...`,
            );
            if (attempt === maxRetries) {
              throw new ConflictException(
                'Không thể sinh mã học sinh duy nhất sau nhiều lần thử. Vui lòng thử lại.',
              );
            }
            continue;
          }
        }
        throw error;
      }
    }

    return {
      id: createdStudent.id,
      code: createdStudent.code,
      schoolId: createdStudent.schoolId,
      fullName: createdStudent.fullName,
      guardianPhone: createdStudent.guardianPhone,
      avatarUrl: createdStudent.avatarUrl,
      addressText: createdStudent.addressText,
      latitude: createdStudent.latitude,
      longitude: createdStudent.longitude,
      status: createdStudent.status,
      hasAddress: this.computeHasAddress(
        createdStudent.addressText,
        createdStudent.latitude,
        createdStudent.longitude,
      ),
      createdAt: createdStudent.createdAt.toISOString(),
      updatedAt: createdStudent.updatedAt.toISOString(),
    };
  }

  /**
   * Xem chi tiết một học sinh theo ID.
   */
  async getStudent(
    schoolId: string,
    studentId: string,
    currentUser?: User,
  ): Promise<StudentDetailResponseDto> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });

    if (!school) {
      throw new NotFoundException('Không tìm thấy trường học');
    }

    if (currentUser && currentUser.role === Role.SCHOOL_ADMIN) {
      if (currentUser.schoolId !== schoolId) {
        throw new ForbiddenException(
          'Bạn không có quyền xem thông tin học sinh của trường học khác',
        );
      }
    }

    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      include: {
        school: {
          select: { name: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh');
    }

    return {
      id: student.id,
      code: student.code,
      schoolId: student.schoolId,
      schoolName: student.school.name,
      fullName: student.fullName,
      guardianPhone: student.guardianPhone,
      avatarUrl: student.avatarUrl,
      addressText: student.addressText,
      latitude: student.latitude,
      longitude: student.longitude,
      status: student.status,
      hasAddress: this.computeHasAddress(
        student.addressText,
        student.latitude,
        student.longitude,
      ),
      qrData: student.code,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
    };
  }

  /**
   * Cập nhật trạng thái hoạt động của học sinh (AVAILABLE <-> DISABLED).
   * - Chỉ SCHOOL_ADMIN được phép thực hiện cho học sinh của trường mình.
   */
  async updateStatus(
    schoolId: string,
    studentId: string,
    dto: UpdateStudentStatusDto,
    currentUser?: User,
  ): Promise<StudentItemDto> {
    if (currentUser) {
      if (currentUser.role !== Role.SCHOOL_ADMIN) {
        throw new ForbiddenException(
          'Chỉ Quản trị viên trường học (SCHOOL_ADMIN) mới có quyền cập nhật trạng thái học sinh',
        );
      }
      if (currentUser.schoolId !== schoolId) {
        throw new ForbiddenException(
          'Bạn không có quyền thay đổi trạng thái học sinh của trường học khác',
        );
      }
    }

    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh');
    }

    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        status: dto.status,
      },
    });

    return {
      id: updated.id,
      code: updated.code,
      schoolId: updated.schoolId,
      fullName: updated.fullName,
      guardianPhone: updated.guardianPhone,
      avatarUrl: updated.avatarUrl,
      addressText: updated.addressText,
      latitude: updated.latitude,
      longitude: updated.longitude,
      status: updated.status,
      hasAddress: this.computeHasAddress(
        updated.addressText,
        updated.latitude,
        updated.longitude,
      ),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
