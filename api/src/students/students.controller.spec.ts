import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role, StudentStatus } from '@prisma/client';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

describe('StudentsController', () => {
  let controller: StudentsController;
  let service: StudentsService;

  const schoolId = 'c1f8a847-75c1-4b36-a3d5-22e3914a8721';
  const mockStudent = {
    id: 'student-uuid-1',
    code: 'STUA7B3C9D2',
    fullName: 'Nguyễn Văn Bé',
    guardianPhone: '0988776655',
    avatarUrl: null,
    status: StudentStatus.AVAILABLE,
    hasAddress: true,
    createdAt: '2026-10-23T08:00:00.000Z',
  };

  const mockListResponse = {
    items: [mockStudent],
    meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
  };

  const mockUser = {
    id: 'user-admin-1',
    role: Role.SCHOOL_ADMIN,
    schoolId: schoolId,
  } as any;

  beforeEach(() => {
    service = {
      listStudents: vi.fn().mockResolvedValue(mockListResponse),
      getStudent: vi.fn().mockResolvedValue({
        ...mockStudent,
        schoolId,
        schoolName: 'Trường Lê Quý Đôn',
        qrData: 'STUA7B3C9D2',
        updatedAt: '2026-10-23T08:00:00.000Z',
      }),
      createStudent: vi.fn().mockResolvedValue({
        ...mockStudent,
        schoolId,
        schoolName: 'Trường Lê Quý Đôn',
        qrData: 'STUA7B3C9D2',
        updatedAt: '2026-10-23T08:00:00.000Z',
      }),
      updateStatus: vi.fn().mockResolvedValue({
        id: 'student-uuid-1',
        code: 'STUA7B3C9D2',
        status: StudentStatus.DISABLED,
        message: 'Cập nhật trạng thái học sinh thành công',
      }),
    } as unknown as StudentsService;

    controller = new StudentsController(service);
  });

  it('listStudents gọi service.listStudents với schoolId, query và user', async () => {
    const query = { page: 1, limit: 10, status: StudentStatus.AVAILABLE };
    const result = await controller.listStudents(schoolId, query, mockUser);

    expect(service.listStudents).toHaveBeenCalledWith(schoolId, query, mockUser);
    expect(result).toBe(mockListResponse);
  });

  it('createStudent gọi service.createStudent với schoolId, dto, user và avatar file tùy chọn', async () => {
    const dto = {
      fullName: 'Nguyễn Văn Bé',
      guardianPhone: '0988776655',
    };
    const file = { buffer: Buffer.from('test') } as any;

    const result = await controller.createStudent(schoolId, dto, file, mockUser);

    expect(service.createStudent).toHaveBeenCalledWith(schoolId, dto, file, mockUser);
    expect(result.id).toBe('student-uuid-1');
  });

  it('getStudent gọi service.getStudent với schoolId, id và user', async () => {
    const result = await controller.getStudent(schoolId, 'student-uuid-1', mockUser);

    expect(service.getStudent).toHaveBeenCalledWith(
      schoolId,
      'student-uuid-1',
      mockUser,
    );
    expect(result.id).toBe('student-uuid-1');
  });

  it('updateStatus gọi service.updateStatus với schoolId, id, dto và user', async () => {
    const dto = { status: StudentStatus.DISABLED };
    const result = await controller.updateStatus(
      schoolId,
      'student-uuid-1',
      dto,
      mockUser,
    );

    expect(service.updateStatus).toHaveBeenCalledWith(
      schoolId,
      'student-uuid-1',
      dto,
      mockUser,
    );
    expect(result.status).toBe(StudentStatus.DISABLED);
  });
});
