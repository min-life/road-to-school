import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from '../auth/otp.service.js';
import {
  normalizeStudentCode,
  isValidStudentCode,
} from '../students/utils/student-code.generator.js';
import {
  RequestLinkOtpDto,
  RequestLinkOtpResponseDto,
  VerifyLinkOtpDto,
  VerifyLinkOtpResponseDto,
  ParentLinkedStudentItemDto,
  ParentLinkedStudentDetailResponseDto,
} from './dto/index.js';

@Injectable()
export class ParentsService {
  private readonly logger = new Logger(ParentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Tính toán trường dẫn xuất hasAddress
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
   * Lấy danh sách các học sinh mà Phụ huynh hiện tại đã liên kết
   */
  async getLinkedStudents(parentId: string): Promise<ParentLinkedStudentItemDto[]> {
    const links = await this.prisma.parentStudentLink.findMany({
      where: { parentId },
      orderBy: { linkedAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            code: true,
            fullName: true,
            avatarUrl: true,
            status: true,
            school: {
              select: { name: true },
            },
          },
        },
      },
    });

    return links.map((link) => ({
      id: link.student.id,
      code: link.student.code,
      fullName: link.student.fullName,
      avatarUrl: link.student.avatarUrl,
      schoolName: link.student.school.name,
      status: link.student.status,
      linkedAt: link.linkedAt.toISOString(),
    }));
  }

  /**
   * Lấy thông tin chi tiết một học sinh mà Phụ huynh đã liên kết
   */
  async getLinkedStudentDetail(
    parentId: string,
    studentId: string,
  ): Promise<ParentLinkedStudentDetailResponseDto> {
    const link = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
      include: {
        student: {
          include: {
            school: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException(
        'Không tìm thấy học sinh hoặc bạn chưa liên kết với học sinh này',
      );
    }

    const { student } = link;

    return {
      id: student.id,
      code: student.code,
      fullName: student.fullName,
      avatarUrl: student.avatarUrl,
      schoolName: student.school.name,
      addressText: student.addressText,
      hasAddress: this.computeHasAddress(
        student.addressText,
        student.latitude,
        student.longitude,
      ),
      status: student.status,
      linkedAt: link.linkedAt.toISOString(),
    };
  }

  /**
   * Khởi tạo yêu cầu liên kết Phụ huynh - Học sinh:
   * 1. Tìm học sinh theo Student Code
   * 2. Kiểm tra trạng thái học sinh (chặn nếu DISABLED)
   * 3. Kiểm tra trạng thái trường học (chặn nếu INACTIVE)
   * 4. Kiểm tra xem phụ huynh đã liên kết học sinh này chưa
   * 5. Tạo thử thách OTP và phát mã SMS đến số điện thoại người giám hộ
   */
  async requestLinkOtp(
    parentId: string,
    dto: RequestLinkOtpDto,
  ): Promise<RequestLinkOtpResponseDto> {
    const normalizedCode = normalizeStudentCode(dto.studentCode);

    if (!isValidStudentCode(normalizedCode)) {
      throw new BadRequestException(
        'Mã học sinh không đúng định dạng. Yêu cầu tiền tố STU theo sau là đúng 8 ký tự alphanumeric (gồm ít nhất 1 chữ cái và 1 chữ số)',
      );
    }

    const student = await this.prisma.student.findUnique({
      where: { code: normalizedCode },
      include: {
        school: {
          select: { id: true, isActive: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy học sinh với mã đã cung cấp');
    }

    // Quyết định D2: Học sinh DISABLED không được tạo liên kết mới
    if (student.status === StudentStatus.DISABLED) {
      throw new BadRequestException(
        'Học sinh hiện đang bị vô hiệu hóa, không thể thực hiện liên kết mới',
      );
    }

    // Quyết định D4: Trường học INACTIVE không được khởi tạo liên kết mới
    if (!student.school.isActive) {
      throw new BadRequestException(
        'Trường học của học sinh đang ngừng hoạt động, không thể thực hiện liên kết',
      );
    }

    // Kiểm tra liên kết đã tồn tại
    const existingLink = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId: student.id,
        },
      },
    });

    if (existingLink) {
      throw new ConflictException('Bạn đã liên kết với học sinh này trước đó');
    }

    // Tạo OTP Challenge gửi đến số điện thoại giám hộ
    const challengeResult = await this.otpService.createParentStudentChallenge(
      parentId,
      student.id,
      student.guardianPhone,
    );

    return {
      challengeId: challengeResult.challengeId,
      maskedPhone: challengeResult.maskedPhone,
      expiresInSeconds: challengeResult.expiresInSeconds,
      message: 'Mã xác thực đã được gửi đến số điện thoại người giám hộ',
    };
  }

  /**
   * Xác thực mã OTP và hoàn tất tạo liên kết ParentStudentLink:
   * - Xác thực challengeId, OTP, hạn dùng và attempts
   * - Tiêu thụ mã OTP ngay trong transaction
   * - Kiểm tra lại tính hợp lệ của học sinh và trường học
   * - Tạo bản ghi liên kết chống duplicate
   */
  async verifyLinkOtp(
    parentId: string,
    dto: VerifyLinkOtpDto,
  ): Promise<VerifyLinkOtpResponseDto> {
    // 1. Xác thực và tiêu thụ OTP
    const challenge =
      await this.otpService.verifyAndConsumeParentStudentChallenge(
        dto.challengeId,
        parentId,
        dto.otp,
      );

    const studentId = challenge.studentId;
    if (!studentId) {
      throw new BadRequestException('Thử thách OTP không chứa thông tin học sinh');
    }

    // 2. Thực hiện kiểm tra và tạo liên kết trong transaction
    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({
        where: { id: studentId },
        include: {
          school: {
            select: { id: true, isActive: true },
          },
        },
      });

      if (!student) {
        throw new NotFoundException('Không tìm thấy học sinh');
      }

      if (student.status === StudentStatus.DISABLED) {
        throw new BadRequestException(
          'Học sinh hiện đang bị vô hiệu hóa, không thể hoàn tất liên kết',
        );
      }

      if (!student.school.isActive) {
        throw new BadRequestException(
          'Trường học của học sinh đang ngừng hoạt động, không thể hoàn tất liên kết',
        );
      }

      const existingLink = await tx.parentStudentLink.findUnique({
        where: {
          parentId_studentId: {
            parentId,
            studentId: student.id,
          },
        },
      });

      if (existingLink) {
        throw new ConflictException('Bạn đã liên kết với học sinh này trước đó');
      }

      await tx.parentStudentLink.create({
        data: {
          parentId,
          studentId: student.id,
        },
      });

      return {
        message: 'Liên kết học sinh thành công',
        studentId: student.id,
        code: student.code,
        fullName: student.fullName,
      };
    });
  }

  /**
   * Hủy liên kết Phụ huynh - Học sinh (Swipe-to-Unlink & Detail Unlink)
   */
  async unlinkStudent(
    parentId: string,
    studentId: string,
  ): Promise<{ message: string }> {
    const link = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
    });

    if (!link) {
      throw new NotFoundException(
        'Không tìm thấy liên kết với học sinh này hoặc đã bị hủy trước đó',
      );
    }

    await this.prisma.parentStudentLink.delete({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
    });

    return {
      message: 'Hủy liên kết học sinh thành công',
    };
  }
}
