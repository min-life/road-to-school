import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  StudentRequestsService,
  hashProposedPayload,
} from './student-requests.service.js';
import {
  Role,
  RequestType,
  RequestStatus,
  StudentStatus,
} from '@prisma/client';

describe('StudentRequestsService - Comprehensive Lifecycle & Concurrency', () => {
  let service: StudentRequestsService;
  let mockPrisma: any;
  let mockOtpService: any;

  const mockStudent = {
    id: 'stu-1',
    code: 'STU12345678',
    fullName: 'Nguyễn Văn Em Bé',
    guardianPhone: '0912345678',
    addressText: '123 Đường Cũ, Quận 1',
    latitude: 10.776,
    longitude: 106.700,
    schoolId: 'school-1',
    status: StudentStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      parentStudentLink: {
        findUnique: vi.fn(),
      },
      student: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      studentUpdateRequest: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      routeStop: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };

    mockOtpService = {
      createStudentUpdateRequestChallenge: vi.fn(),
      verifyAndConsumeStudentUpdateRequestChallenge: vi.fn(),
    };

    const mockVietmapVRP = {
      calculateRoute: vi.fn().mockResolvedValue({
        status: 'FEASIBLE',
        geometry: 'mock_polyline',
        distanceMeters: 5000,
        durationSeconds: 600,
      }),
    };

    service = new StudentRequestsService(mockPrisma, mockOtpService, mockVietmapVRP as any);
  });

  describe('hashProposedPayload Canonicalization (Section 1.8 & 4.5)', () => {
    it('sinh cùng một hash bất kể thứ tự các key trong proposedData', () => {
      const payloadA = { fullName: 'Nguyễn Văn A', guardianPhone: '0987654321' };
      const payloadB = { guardianPhone: '0987654321', fullName: 'Nguyễn Văn A' };

      const hashA = hashProposedPayload(RequestType.INFORMATION_UPDATE, payloadA);
      const hashB = hashProposedPayload(RequestType.INFORMATION_UPDATE, payloadB);

      expect(hashA).toBe(hashB);
    });

    it('sinh hash khác nhau khi thay đổi tọa độ địa chỉ', () => {
      const addrA = { addressText: 'Địa chỉ A', latitude: 10.123, longitude: 106.123 };
      const addrB = { addressText: 'Địa chỉ A', latitude: 10.124, longitude: 106.123 };

      const hashA = hashProposedPayload(RequestType.ADDRESS_UPDATE, addrA);
      const hashB = hashProposedPayload(RequestType.ADDRESS_UPDATE, addrB);

      expect(hashA).not.toBe(hashB);
    });
  });

  describe('requestOtp & Payload-bound OTP Delivery', () => {
    it('từ chối khi phụ huynh chưa liên kết với học sinh', async () => {
      mockPrisma.parentStudentLink.findUnique.mockResolvedValue(null);

      await expect(
        service.requestOtp('p-1', 'stu-1', {
          type: RequestType.INFORMATION_UPDATE,
          proposedData: { fullName: 'Tên Mới' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('từ chối khi học sinh đang ở trạng thái DISABLED (Section 1.5)', async () => {
      mockPrisma.parentStudentLink.findUnique.mockResolvedValue({
        student: { ...mockStudent, status: StudentStatus.DISABLED },
      });

      await expect(
        service.requestOtp('p-1', 'stu-1', {
          type: RequestType.INFORMATION_UPDATE,
          proposedData: { fullName: 'Tên Mới' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối khi dữ liệu đề xuất không có gì thay đổi so với hiện tại', async () => {
      mockPrisma.parentStudentLink.findUnique.mockResolvedValue({
        student: mockStudent,
      });

      await expect(
        service.requestOtp('p-1', 'stu-1', {
          type: RequestType.INFORMATION_UPDATE,
          proposedData: { fullName: mockStudent.fullName },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối khi đã có một yêu cầu PENDING cùng loại (Single Pending Policy - Section 1.4)', async () => {
      mockPrisma.parentStudentLink.findUnique.mockResolvedValue({
        student: mockStudent,
      });
      mockPrisma.studentUpdateRequest.findFirst.mockResolvedValue({
        id: 'existing-pending-id',
        status: RequestStatus.PENDING,
      });

      await expect(
        service.requestOtp('p-1', 'stu-1', {
          type: RequestType.INFORMATION_UPDATE,
          proposedData: { fullName: 'Tên Đổi Khác' },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('phát mã OTP gửi đến SỐ ĐIỆN THOẠI HIỆN TẠI của người giám hộ (không phải số mới)', async () => {
      mockPrisma.parentStudentLink.findUnique.mockResolvedValue({
        student: mockStudent,
      });
      mockPrisma.studentUpdateRequest.findFirst.mockResolvedValue(null);
      mockOtpService.createStudentUpdateRequestChallenge.mockResolvedValue({
        challengeId: 'challenge-123',
        maskedPhone: '091****678',
        expiresInSeconds: 300,
      });

      const proposedData = {
        fullName: 'Nguyễn Văn Đổi Tên',
        guardianPhone: '0999999999', // Số mới đề xuất
      };

      const result = await service.requestOtp('p-1', 'stu-1', {
        type: RequestType.INFORMATION_UPDATE,
        proposedData,
      });

      expect(result.challengeId).toBe('challenge-123');
      // OTP phải gửi tới số HIỆN TẠI là mockStudent.guardianPhone ('0912345678')
      expect(mockOtpService.createStudentUpdateRequestChallenge).toHaveBeenCalledWith(
        'p-1',
        'stu-1',
        '0912345678',
        expect.any(String), // payloadHash
      );
    });
  });

  describe('verifyOtpAndCreateRequest & Snapshot Creation', () => {
    it('tạo yêu cầu PENDING kèm beforeData snapshot sau khi OTP được xác thực thành công', async () => {
      mockPrisma.parentStudentLink.findUnique.mockResolvedValue({
        student: mockStudent,
      });
      mockOtpService.verifyAndConsumeStudentUpdateRequestChallenge.mockResolvedValue({
        id: 'challenge-123',
      });
      mockPrisma.studentUpdateRequest.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({
          id: 'req-1',
          ...data,
          student: mockStudent,
          parent: { id: 'p-1', fullName: 'Phụ huynh' },
          school: { id: 'school-1', name: 'Trường A' },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const proposedData = {
        addressText: '456 Đường Mới, Quận 3',
        latitude: 10.789,
        longitude: 106.711,
      };

      const result = await service.verifyOtpAndCreateRequest('p-1', 'stu-1', {
        challengeId: 'challenge-123',
        otp: '123456',
        type: RequestType.ADDRESS_UPDATE,
        proposedData,
      });

      expect(result.status).toBe(RequestStatus.PENDING);
      expect(result.beforeData).toEqual({
        addressText: mockStudent.addressText,
        latitude: mockStudent.latitude,
        longitude: mockStudent.longitude,
      });
      expect(result.proposedData).toEqual(proposedData);
    });
  });

  describe('Shared approveRequest - Single Decision, Concurrency & Stale Detection', () => {
    it('Stale Data Conflict: từ chối 409 khi dữ liệu học sinh hiện tại đã thay đổi so với beforeData (Section 1.6)', async () => {
      const pendingRequest = {
        id: 'req-stale',
        studentId: 'stu-1',
        schoolId: 'school-1',
        type: RequestType.INFORMATION_UPDATE,
        status: RequestStatus.PENDING,
        beforeData: {
          fullName: 'Tên Cũ Ban Đầu',
          guardianPhone: '0912345678',
        },
        proposedData: {
          fullName: 'Tên Đề Xuất Mới',
        },
        student: {
          ...mockStudent,
          fullName: 'Tên Đã Bị Thay Đổi Trực Tiếp Khác Rồi', // Không khớp với beforeData
        },
      };

      mockPrisma.studentUpdateRequest.findUnique.mockResolvedValue(pendingRequest);

      await expect(
        service.approveRequest('req-stale', 'admin-1', Role.SCHOOL_ADMIN, 'school-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('Single Valid Decision: từ chối 409 khi yêu cầu đã được xử lý trước đó (Section 1.3)', async () => {
      const alreadyApprovedRequest = {
        id: 'req-already',
        studentId: 'stu-1',
        schoolId: 'school-1',
        type: RequestType.ADDRESS_UPDATE,
        status: RequestStatus.APPROVED, // Đã duyệt
        student: mockStudent,
      };

      mockPrisma.studentUpdateRequest.findUnique.mockResolvedValue(alreadyApprovedRequest);

      await expect(
        service.approveRequest('req-already', 'admin-1', Role.SCHOOL_ADMIN, 'school-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('School Isolation: School Admin không được phê duyệt yêu cầu của trường khác', async () => {
      const request = {
        id: 'req-other-school',
        studentId: 'stu-1',
        schoolId: 'school-2', // Thuộc trường 2
        type: RequestType.ADDRESS_UPDATE,
        status: RequestStatus.PENDING,
        student: mockStudent,
      };

      mockPrisma.studentUpdateRequest.findUnique.mockResolvedValue(request);

      await expect(
        service.approveRequest('req-other-school', 'admin-1', Role.SCHOOL_ADMIN, 'school-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Role Isolation: SYSTEM_ADMIN không được phê duyệt yêu cầu INFORMATION_UPDATE (Section 11)', async () => {
      const request = {
        id: 'req-info',
        studentId: 'stu-1',
        schoolId: 'school-1',
        type: RequestType.INFORMATION_UPDATE,
        status: RequestStatus.PENDING,
        student: mockStudent,
      };

      mockPrisma.studentUpdateRequest.findUnique.mockResolvedValue(request);

      await expect(
        service.approveRequest('req-info', 'sysadmin-1', Role.SYSTEM_ADMIN, null),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Phê duyệt thành công: Cập nhật dữ liệu học sinh và chuyển trạng thái APPROVED nguyên tử', async () => {
      const pendingRequest = {
        id: 'req-valid',
        studentId: 'stu-1',
        schoolId: 'school-1',
        type: RequestType.ADDRESS_UPDATE,
        status: RequestStatus.PENDING,
        beforeData: {
          addressText: mockStudent.addressText,
          latitude: mockStudent.latitude,
          longitude: mockStudent.longitude,
        },
        proposedData: {
          addressText: '789 Đường Mới Duyệt, Quận 1',
          latitude: 10.781,
          longitude: 106.705,
        },
        student: mockStudent,
      };

      mockPrisma.studentUpdateRequest.findUnique.mockResolvedValue(pendingRequest);
      mockPrisma.student.update.mockResolvedValue({ id: 'stu-1' });
      mockPrisma.studentUpdateRequest.update.mockResolvedValue({
        ...pendingRequest,
        status: RequestStatus.APPROVED,
        reviewedById: 'admin-1',
        reviewedAt: new Date(),
        student: mockStudent,
        parent: { id: 'p-1', fullName: 'Phụ huynh' },
        school: { id: 'school-1', name: 'Trường A' },
        reviewedBy: { id: 'admin-1', fullName: 'School Admin' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.approveRequest(
        'req-valid',
        'admin-1',
        Role.SCHOOL_ADMIN,
        'school-1',
      );

      expect(result.status).toBe(RequestStatus.APPROVED);
      // Xác nhận Student được cập nhật địa chỉ mới nguyên tử
      expect(mockPrisma.student.update).toHaveBeenCalledWith({
        where: { id: 'stu-1' },
        data: {
          addressText: '789 Đường Mới Duyệt, Quận 1',
          latitude: 10.781,
          longitude: 106.705,
        },
      });
    });
  });

  describe('rejectRequest', () => {
    it('từ chối yêu cầu và không làm thay đổi dữ liệu học sinh', async () => {
      const pendingRequest = {
        id: 'req-rej',
        studentId: 'stu-1',
        schoolId: 'school-1',
        type: RequestType.INFORMATION_UPDATE,
        status: RequestStatus.PENDING,
        beforeData: { fullName: mockStudent.fullName },
        proposedData: { fullName: 'Tên Bị Từ Chối' },
        student: mockStudent,
      };

      mockPrisma.studentUpdateRequest.findUnique.mockResolvedValue(pendingRequest);
      mockPrisma.studentUpdateRequest.update.mockResolvedValue({
        ...pendingRequest,
        status: RequestStatus.REJECTED,
        rejectionReason: 'Hồ sơ không hợp lệ',
        reviewedById: 'admin-1',
        reviewedAt: new Date(),
        student: mockStudent,
        parent: { id: 'p-1', fullName: 'Phụ huynh' },
        school: { id: 'school-1', name: 'Trường A' },
        reviewedBy: { id: 'admin-1', fullName: 'School Admin' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.rejectRequest(
        'req-rej',
        'admin-1',
        Role.SCHOOL_ADMIN,
        { rejectionReason: 'Hồ sơ không hợp lệ' },
        'school-1',
      );

      expect(result.status).toBe(RequestStatus.REJECTED);
      expect(result.rejectionReason).toBe('Hồ sơ không hợp lệ');
      expect(mockPrisma.student.update).not.toHaveBeenCalled();
    });
  });

  describe('directUpdateStudentAddress (Section 13)', () => {
    it('School Admin cập nhật trực tiếp địa chỉ học sinh thuộc trường', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(mockStudent);
      mockPrisma.student.update.mockResolvedValue({
        ...mockStudent,
        addressText: 'Địa chỉ cập nhật trực tiếp',
        latitude: 10.888,
        longitude: 106.888,
      });

      const result = await service.directUpdateStudentAddress(
        'school-1',
        'stu-1',
        {
          addressText: 'Địa chỉ cập nhật trực tiếp',
          latitude: 10.888,
          longitude: 106.888,
        },
      );

      expect(result.addressText).toBe('Địa chỉ cập nhật trực tiếp');
      expect(mockPrisma.student.update).toHaveBeenCalledWith({
        where: { id: 'stu-1' },
        data: {
          addressText: 'Địa chỉ cập nhật trực tiếp',
          latitude: 10.888,
          longitude: 106.888,
        },
      });
    });
  });
});
