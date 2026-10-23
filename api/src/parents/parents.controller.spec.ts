import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role, StudentStatus } from '@prisma/client';
import { ParentsController } from './parents.controller.js';
import { ParentsService } from './parents.service.js';

describe('ParentsController', () => {
  let controller: ParentsController;
  let service: ParentsService;

  const parentId = 'parent-uuid-1';
  const studentId = 'student-uuid-1';

  const mockParentUser = {
    id: parentId,
    role: Role.PARENT,
  } as any;

  const mockStudent = {
    id: studentId,
    code: 'STUA7B3C9D2',
    fullName: 'Nguyễn Văn Bé',
    avatarUrl: null,
    schoolName: 'Trường Tiểu học Lê Quý Đôn',
    status: StudentStatus.AVAILABLE,
    linkedAt: '2026-10-23T08:00:00.000Z',
  };

  beforeEach(() => {
    service = {
      getLinkedStudents: vi.fn().mockResolvedValue([mockStudent]),
      getLinkedStudentDetail: vi.fn().mockResolvedValue({
        ...mockStudent,
        addressText: '123 Cầu Giấy',
        hasAddress: true,
      }),
      requestLinkOtp: vi.fn().mockResolvedValue({
        challengeId: 'challenge-uuid-1',
        maskedPhone: '0988***655',
        expiresInSeconds: 300,
        message: 'Mã xác thực OTP đã được gửi đến số điện thoại người giám hộ',
      }),
      verifyLinkOtp: vi.fn().mockResolvedValue({
        message: 'Liên kết học sinh thành công',
        studentId: studentId,
        code: 'STUA7B3C9D2',
        fullName: 'Nguyễn Văn Bé',
      }),
      unlinkStudent: vi.fn().mockResolvedValue({
        message: 'Hủy liên kết học sinh thành công',
      }),
    } as unknown as ParentsService;

    controller = new ParentsController(service);
  });

  it('getLinkedStudents gọi service.getLinkedStudents với parentId', async () => {
    const result = await controller.getLinkedStudents(mockParentUser);

    expect(service.getLinkedStudents).toHaveBeenCalledWith(parentId);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(studentId);
  });

  it('getLinkedStudentDetail gọi service.getLinkedStudentDetail với parentId và id', async () => {
    const result = await controller.getLinkedStudentDetail(
      studentId,
      mockParentUser,
    );

    expect(service.getLinkedStudentDetail).toHaveBeenCalledWith(
      parentId,
      studentId,
    );
    expect(result.id).toBe(studentId);
    expect(result.hasAddress).toBe(true);
  });

  it('requestLinkOtp gọi service.requestLinkOtp với parentId và dto', async () => {
    const dto = { studentCode: 'STUA7B3C9D2' };
    const result = await controller.requestLinkOtp(dto, mockParentUser);

    expect(service.requestLinkOtp).toHaveBeenCalledWith(parentId, dto);
    expect(result.challengeId).toBe('challenge-uuid-1');
  });

  it('verifyLinkOtp gọi service.verifyLinkOtp với parentId và dto', async () => {
    const dto = { challengeId: 'challenge-uuid-1', otp: '123456' };
    const result = await controller.verifyLinkOtp(dto, mockParentUser);

    expect(service.verifyLinkOtp).toHaveBeenCalledWith(parentId, dto);
    expect(result.studentId).toBe(studentId);
  });

  it('unlinkStudent gọi service.unlinkStudent với parentId và id', async () => {
    const result = await controller.unlinkStudent(studentId, mockParentUser);

    expect(service.unlinkStudent).toHaveBeenCalledWith(parentId, studentId);
    expect(result.message).toBe('Hủy liên kết học sinh thành công');
  });
});
