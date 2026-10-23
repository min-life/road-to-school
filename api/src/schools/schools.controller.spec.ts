import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role } from '@prisma/client';
import { SchoolsController } from './schools.controller.js';
import { SchoolsService } from './schools.service.js';
import {
  SchoolStatusFilter,
  CreateSchoolDto,
  SchoolEmployeeRoleFilter,
  CreateSchoolAdminDto,
} from './dto/index.js';

describe('SchoolsController', () => {
  let controller: SchoolsController;
  let service: SchoolsService;

  const mockListResponse = {
    items: [],
    meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
  };

  const mockDetailResponse = {
    id: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
    name: 'Trường Tiểu học Lê Quý Đôn',
    addressText: 'Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
    latitude: 21.028511,
    longitude: 105.772341,
    imageUrl: null,
    imagePublicId: null,
    contractStartDate: '2026-09-01',
    contractEndDate: '2027-08-31',
    weeklySchedule: {
      monday: { start: '07:00', end: '17:30' },
    },
    isActive: true,
    createdAt: '2026-10-22T08:00:00.000Z',
    updatedAt: '2026-10-22T08:00:00.000Z',
    employeeCount: 0,
  };

  const mockStatusResponse = {
    id: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
    isActive: false,
    message: 'Cập nhật trạng thái trường học thành công',
  };

  const mockEmployeeListResponse = {
    items: [
      {
        id: 'user-uuid-1',
        fullName: 'Nguyễn Văn Hùng',
        email: 'hung@school.edu.vn',
        phone: null,
        role: Role.SCHOOL_ADMIN,
        isActive: true,
        createdAt: '2026-10-22T08:00:00.000Z',
      },
    ],
    meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
  };

  const mockCreateAdminResponse = {
    id: 'user-uuid-1',
    fullName: 'Nguyễn Văn Hùng',
    email: 'hung@school.edu.vn',
    phone: null,
    role: Role.SCHOOL_ADMIN,
    schoolId: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
    isActive: true,
    isVerified: true,
    createdAt: '2026-10-22T08:00:00.000Z',
    message: 'Tạo tài khoản quản trị trường học thành công',
  };

  beforeEach(() => {
    service = {
      findAll: vi.fn().mockResolvedValue(mockListResponse),
      findOne: vi.fn().mockResolvedValue(mockDetailResponse),
      updateStatus: vi.fn().mockResolvedValue(mockStatusResponse),
      create: vi.fn().mockResolvedValue(mockDetailResponse),
      findEmployees: vi.fn().mockResolvedValue(mockEmployeeListResponse),
      createSchoolAdmin: vi.fn().mockResolvedValue(mockCreateAdminResponse),
    } as unknown as SchoolsService;

    controller = new SchoolsController(service);
  });

  it('create gọi service.create với dto và file tùy chọn', async () => {
    const dto: CreateSchoolDto = {
      name: 'Trường Tiểu học Lê Quý Đôn',
      addressText: 'Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
      latitude: 21.028511,
      longitude: 105.772341,
      contractStartDate: '2026-09-01',
      contractEndDate: '2027-08-31',
      weeklySchedule: '{"monday":{"start":"07:00","end":"17:30"}}',
    };
    const mockFile = { originalname: 'gate.jpg', buffer: Buffer.from('test') } as any;

    const result = await controller.create(dto, mockFile);

    expect(service.create).toHaveBeenCalledWith(dto, mockFile);
    expect(result).toBe(mockDetailResponse);
  });

  it('findAll gọi service.findAll với đúng query parameters', async () => {
    const query = { page: 2, limit: 15, search: 'Lê Quý Đôn', status: SchoolStatusFilter.ACTIVE };
    const result = await controller.findAll(query);

    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result).toBe(mockListResponse);
  });

  it('findOne gọi service.findOne với ID uuid', async () => {
    const id = 'c1f8a847-75c1-4b36-a3d5-22e3914a8721';
    const result = await controller.findOne(id);

    expect(service.findOne).toHaveBeenCalledWith(id);
    expect(result).toBe(mockDetailResponse);
  });

  it('updateStatus gọi service.updateStatus với ID và dto', async () => {
    const id = 'c1f8a847-75c1-4b36-a3d5-22e3914a8721';
    const dto = { isActive: false };
    const result = await controller.updateStatus(id, dto);

    expect(service.updateStatus).toHaveBeenCalledWith(id, dto);
    expect(result).toBe(mockStatusResponse);
  });

  it('findEmployees gọi service.findEmployees với schoolId, query và user', async () => {
    const id = 'c1f8a847-75c1-4b36-a3d5-22e3914a8721';
    const query = { page: 1, limit: 10, role: SchoolEmployeeRoleFilter.SCHOOL_ADMIN };
    const mockUser = { id: 'user-admin-1', role: Role.SCHOOL_ADMIN, schoolId: id } as any;
    const result = await controller.findEmployees(id, query, mockUser);

    expect(service.findEmployees).toHaveBeenCalledWith(id, query, mockUser);
    expect(result).toBe(mockEmployeeListResponse);
  });

  it('findEmployeeDetail gọi service.findEmployeeDetail với schoolId, employeeId và user', async () => {
    const id = 'c1f8a847-75c1-4b36-a3d5-22e3914a8721';
    const employeeId = 'emp-uuid-1';
    const mockUser = { id: 'user-admin-1', role: Role.SCHOOL_ADMIN, schoolId: id } as any;
    (service as any).findEmployeeDetail = vi.fn().mockResolvedValue({
      id: employeeId,
      fullName: 'Nguyễn Văn Hùng',
      role: Role.BUS_ATTENDANT,
      schoolId: id,
    });

    const result = await controller.findEmployeeDetail(id, employeeId, mockUser);

    expect(service.findEmployeeDetail).toHaveBeenCalledWith(id, employeeId, mockUser);
    expect(result.id).toBe(employeeId);
  });

  it('createSchoolAdmin gọi service.createSchoolAdmin với schoolId, dto và user', async () => {
    const id = 'c1f8a847-75c1-4b36-a3d5-22e3914a8721';
    const dto: CreateSchoolAdminDto = {
      fullName: 'Nguyễn Văn Hùng',
      email: 'hung@school.edu.vn',
    };
    const mockUser = { id: 'sys-admin-1', role: Role.SYSTEM_ADMIN } as any;
    const result = await controller.createSchoolAdmin(id, dto, mockUser);

    expect(service.createSchoolAdmin).toHaveBeenCalledWith(id, dto, mockUser);
    expect(result).toBe(mockCreateAdminResponse);
  });
});

