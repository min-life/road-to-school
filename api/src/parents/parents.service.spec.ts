import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { StudentStatus } from '@prisma/client';
import { ParentsService } from './parents.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from '../auth/otp.service.js';

describe('ParentsService', () => {
  let service: ParentsService;
  let prisma: PrismaService;
  let otpService: OtpService;

  const parentId = 'parent-uuid-1';
  const studentId = 'student-uuid-1';
  const schoolId = 'school-uuid-1';
  const studentCode = 'STUA7B3C9D2';

  const mockDate = new Date('2026-10-23T08:00:00.000Z');

  const mockStudent = {
    id: studentId,
    code: studentCode,
    schoolId: schoolId,
    fullName: 'Nguyễn Văn Bé',
    guardianPhone: '0988776655',
    avatarUrl: null,
    addressText: '123 Cầu Giấy',
    latitude: 21.033333,
    longitude: 105.783333,
    status: StudentStatus.AVAILABLE,
    createdAt: mockDate,
    updatedAt: mockDate,
    school: {
      id: schoolId,
      name: 'Trường Tiểu học Lê Quý Đôn',
      isActive: true,
    },
  };

  const mockLink = {
    id: 'link-uuid-1',
    parentId: parentId,
    studentId: studentId,
    linkedAt: mockDate,
    student: mockStudent,
  };

  beforeEach(() => {
    prisma = {
      parentStudentLink: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      student: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    } as unknown as PrismaService;

    otpService = {
      createParentStudentChallenge: vi.fn(),
      verifyAndConsumeParentStudentChallenge: vi.fn(),
    } as unknown as OtpService;

    service = new ParentsService(prisma, otpService);
  });

  describe('getLinkedStudents', () => {
    it('lấy danh sách học sinh đã liên kết của phụ huynh hiện tại', async () => {
      vi.mocked(prisma.parentStudentLink.findMany).mockResolvedValue([
        mockLink,
      ] as any);

      const result = await service.getLinkedStudents(parentId);

      expect(prisma.parentStudentLink.findMany).toHaveBeenCalledWith({
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
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(studentId);
      expect(result[0].schoolName).toBe('Trường Tiểu học Lê Quý Đôn');
      expect(result[0].status).toBe(StudentStatus.AVAILABLE);
    });

    it('vẫn giữ nguyên liên kết và hiển thị học sinh khi học sinh bị DISABLED (Quyết định D3)', async () => {
      const disabledLink = {
        ...mockLink,
        student: {
          ...mockStudent,
          status: StudentStatus.DISABLED,
        },
      };
      vi.mocked(prisma.parentStudentLink.findMany).mockResolvedValue([
        disabledLink,
      ] as any);

      const result = await service.getLinkedStudents(parentId);

      expect(result[0].status).toBe(StudentStatus.DISABLED);
    });
  });

  describe('getLinkedStudentDetail', () => {
    it('trả về chi tiết học sinh nếu phụ huynh đã liên kết', async () => {
      vi.mocked(prisma.parentStudentLink.findUnique).mockResolvedValue(
        mockLink as any,
      );

      const result = await service.getLinkedStudentDetail(parentId, studentId);

      expect(result.id).toBe(studentId);
      expect(result.fullName).toBe('Nguyễn Văn Bé');
      expect(result.hasAddress).toBe(true);
      expect(result.schoolName).toBe('Trường Tiểu học Lê Quý Đôn');
    });

    it('từ chối xem chi tiết nếu phụ huynh chưa liên kết (NotFoundException)', async () => {
      vi.mocked(prisma.parentStudentLink.findUnique).mockResolvedValue(null);

      await expect(
        service.getLinkedStudentDetail(parentId, studentId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestLinkOtp', () => {
    it('từ chối mã học sinh sai định dạng', async () => {
      await expect(
        service.requestLinkOtp(parentId, { studentCode: 'INVALID_CODE' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối nếu không tìm thấy học sinh với mã đã cung cấp', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(null);

      await expect(
        service.requestLinkOtp(parentId, { studentCode }),
      ).rejects.toThrow(NotFoundException);
    });

    it('từ chối yêu cầu liên kết nếu học sinh đang bị DISABLED (Quyết định D2)', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue({
        ...mockStudent,
        status: StudentStatus.DISABLED,
      } as any);

      await expect(
        service.requestLinkOtp(parentId, { studentCode }),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối yêu cầu liên kết nếu trường của học sinh đang INACTIVE (Quyết định D4)', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue({
        ...mockStudent,
        school: {
          ...mockStudent.school,
          isActive: false,
        },
      } as any);

      await expect(
        service.requestLinkOtp(parentId, { studentCode }),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối nếu phụ huynh đã liên kết với học sinh này trước đó', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(mockStudent as any);
      vi.mocked(prisma.parentStudentLink.findUnique).mockResolvedValue(
        mockLink as any,
      );

      await expect(
        service.requestLinkOtp(parentId, { studentCode }),
      ).rejects.toThrow(ConflictException);
    });

    it('tạo OTP challenge thành công và trả về challengeId và maskedPhone', async () => {
      vi.mocked(prisma.student.findUnique).mockResolvedValue(mockStudent as any);
      vi.mocked(prisma.parentStudentLink.findUnique).mockResolvedValue(null);
      vi.mocked(otpService.createParentStudentChallenge).mockResolvedValue({
        challengeId: 'challenge-uuid-1',
        maskedPhone: '0988***655',
        expiresInSeconds: 300,
      });

      const result = await service.requestLinkOtp(parentId, { studentCode });

      expect(otpService.createParentStudentChallenge).toHaveBeenCalledWith(
        parentId,
        studentId,
        '0988776655',
      );
      expect(result.challengeId).toBe('challenge-uuid-1');
      expect(result.maskedPhone).toBe('0988***655');
      expect(result.expiresInSeconds).toBe(300);
    });
  });

  describe('verifyLinkOtp', () => {
    it('xác thực OTP thành công, liên kết học sinh và trả về thông tin', async () => {
      vi.mocked(
        otpService.verifyAndConsumeParentStudentChallenge,
      ).mockResolvedValue({
        studentId,
      } as any);
      vi.mocked(prisma.student.findUnique).mockResolvedValue(mockStudent as any);
      vi.mocked(prisma.parentStudentLink.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.parentStudentLink.create).mockResolvedValue(mockLink as any);

      const result = await service.verifyLinkOtp(parentId, {
        challengeId: 'challenge-uuid-1',
        otp: '123456',
      });

      expect(
        otpService.verifyAndConsumeParentStudentChallenge,
      ).toHaveBeenCalledWith(
        'challenge-uuid-1',
        parentId,
        '123456',
      );
      expect(result.studentId).toBe(studentId);
      expect(result.code).toBe(studentCode);
    });

    it('từ chối xác thực nếu học sinh đã chuyển sang DISABLED trước khi nhập mã', async () => {
      vi.mocked(
        otpService.verifyAndConsumeParentStudentChallenge,
      ).mockResolvedValue({
        studentId,
      } as any);
      vi.mocked(prisma.student.findUnique).mockResolvedValue({
        ...mockStudent,
        status: StudentStatus.DISABLED,
      } as any);

      await expect(
        service.verifyLinkOtp(parentId, {
          challengeId: 'challenge-uuid-1',
          otp: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unlinkStudent', () => {
    it('hủy liên kết thành công của chính phụ huynh hiện tại', async () => {
      vi.mocked(prisma.parentStudentLink.findUnique).mockResolvedValue(
        mockLink as any,
      );
      vi.mocked(prisma.parentStudentLink.delete).mockResolvedValue(mockLink as any);

      const result = await service.unlinkStudent(parentId, studentId);

      expect(prisma.parentStudentLink.delete).toHaveBeenCalledWith({
        where: {
          parentId_studentId: {
            parentId,
            studentId,
          },
        },
      });
      expect(result.message).toBe('Hủy liên kết học sinh thành công');
    });

    it('từ chối hủy liên kết nếu chưa liên kết với học sinh này', async () => {
      vi.mocked(prisma.parentStudentLink.findUnique).mockResolvedValue(null);

      await expect(service.unlinkStudent(parentId, studentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
