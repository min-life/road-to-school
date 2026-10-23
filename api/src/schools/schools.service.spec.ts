import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  BadGatewayException,
  ConflictException,
} from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';
import { SchoolsService } from './schools.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import {
  SchoolStatusFilter,
  CreateSchoolDto,
  SchoolEmployeeRoleFilter,
  SchoolEmployeeStatusFilter,
  CreateSchoolAdminDto,
} from './dto/index.js';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let prisma: PrismaService;
  let cloudinaryService: CloudinaryService;

  const mockDate = new Date('2026-10-22T08:00:00.000Z');
  const mockSchool = {
    id: 'c1f8a847-75c1-4b36-a3d5-22e3914a8721',
    name: 'Trường Tiểu học Lê Quý Đôn',
    addressText: 'Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
    latitude: 21.028511,
    longitude: 105.772341,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/school_1.webp',
    imagePublicId: 'roadtoschool/schools/school_1',
    contractStartDate: new Date('2026-09-01T00:00:00.000Z'),
    contractEndDate: new Date('2027-08-31T00:00:00.000Z'),
    weeklySchedule: {
      monday: { start: '07:00', end: '17:30' },
      tuesday: { start: '07:00', end: '17:30' },
    },
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    _count: {
      users: 4,
    },
  };

  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
  ]);
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);

  beforeEach(() => {
    prisma = {
      school: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    } as unknown as PrismaService;

    cloudinaryService = {
      isConfigured: vi.fn().mockReturnValue(true),
      uploadSchoolImage: vi.fn().mockResolvedValue({
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/roadtoschool/schools/school_mock.webp',
        publicId: 'roadtoschool/schools/school_mock',
      }),
    } as unknown as CloudinaryService;

    service = new SchoolsService(prisma, cloudinaryService);
  });

  describe('create', () => {
    const baseDto: CreateSchoolDto = {
      name: 'Trường Tiểu học Lê Quý Đôn',
      addressText: 'Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
      latitude: 21.028511,
      longitude: 105.772341,
      contractStartDate: '2026-09-01',
      contractEndDate: '2027-08-31',
      weeklySchedule: JSON.stringify({
        monday: { start: '07:00', end: '17:30' },
      }),
    };

    it('tạo trường học thành công khi KHÔNG có ảnh (imageUrl = null, không gọi Cloudinary)', async () => {
      // Giả lập Cloudinary chưa cấu hình trong môi trường
      vi.mocked(cloudinaryService.isConfigured).mockReturnValue(false);

      vi.mocked(prisma.school.create).mockResolvedValue({
        ...mockSchool,
        imageUrl: null,
        imagePublicId: null,
      } as any);

      const result = await service.create(baseDto);

      expect(cloudinaryService.uploadSchoolImage).not.toHaveBeenCalled();
      expect(prisma.school.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: baseDto.name,
          addressText: baseDto.addressText,
          latitude: baseDto.latitude,
          longitude: baseDto.longitude,
          imageUrl: null,
          imagePublicId: null,
          contractStartDate: new Date('2026-09-01T00:00:00.000Z'),
          contractEndDate: new Date('2027-08-31T00:00:00.000Z'),
          weeklySchedule: { monday: { start: '07:00', end: '17:30' } },
          isActive: true,
        }),
      });

      expect(result.imageUrl).toBeNull();
      expect(result.imagePublicId).toBeNull();
      expect(result.contractStartDate).toBe('2026-09-01');
      expect(result.contractEndDate).toBe('2027-08-31');
      expect(result.isActive).toBe(true);
      expect(result.employeeCount).toBe(0);
    });

    it('tạo trường học thành công kèm ảnh JPEG hợp lệ qua Cloudinary', async () => {
      const mockFile = {
        originalname: 'school_gate.jpg',
        mimetype: 'image/jpeg',
        size: validJpegBuffer.length,
        buffer: validJpegBuffer,
      } as Express.Multer.File;

      vi.mocked(prisma.school.create).mockResolvedValue({
        ...mockSchool,
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/roadtoschool/schools/school_mock.webp',
        imagePublicId: 'roadtoschool/schools/school_mock',
      } as any);

      const result = await service.create(baseDto, mockFile);

      expect(cloudinaryService.uploadSchoolImage).toHaveBeenCalledWith(
        mockFile.buffer,
        mockFile.originalname,
      );
      expect(prisma.school.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/roadtoschool/schools/school_mock.webp',
          imagePublicId: 'roadtoschool/schools/school_mock',
        }),
      });

      expect(result.imageUrl).toContain('school_mock');
    });

    it('tạo trường học thành công kèm ảnh PNG hợp lệ qua Cloudinary', async () => {
      const mockFile = {
        originalname: 'school_gate.png',
        mimetype: 'image/png',
        size: validPngBuffer.length,
        buffer: validPngBuffer,
      } as Express.Multer.File;

      vi.mocked(prisma.school.create).mockResolvedValue(mockSchool as any);

      await service.create(baseDto, mockFile);
      expect(cloudinaryService.uploadSchoolImage).toHaveBeenCalled();
    });

    it('tạo trường học thành công kèm ảnh WebP hợp lệ qua Cloudinary', async () => {
      const mockFile = {
        originalname: 'school_gate.webp',
        mimetype: 'image/webp',
        size: validWebpBuffer.length,
        buffer: validWebpBuffer,
      } as Express.Multer.File;

      vi.mocked(prisma.school.create).mockResolvedValue(mockSchool as any);

      await service.create(baseDto, mockFile);
      expect(cloudinaryService.uploadSchoolImage).toHaveBeenCalled();
    });

    it('ném BadRequestException nếu contractEndDate < contractStartDate', async () => {
      const invalidDto: CreateSchoolDto = {
        ...baseDto,
        contractStartDate: '2027-01-01',
        contractEndDate: '2026-01-01',
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        new BadRequestException('Ngày kết thúc hợp đồng phải lớn hơn hoặc bằng ngày bắt đầu'),
      );
      expect(prisma.school.create).not.toHaveBeenCalled();
    });

    it('ném BadRequestException nếu tệp ảnh vượt quá 5 MB', async () => {
      const oversizedFile = {
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024 + 1, // 5MB + 1 byte
        buffer: Buffer.alloc(100),
      } as Express.Multer.File;

      await expect(service.create(baseDto, oversizedFile)).rejects.toThrow(
        new BadRequestException('Kích thước ảnh vượt quá giới hạn tối đa cho phép (5 MB)'),
      );
      expect(cloudinaryService.uploadSchoolImage).not.toHaveBeenCalled();
      expect(prisma.school.create).not.toHaveBeenCalled();
    });

    it('ném BadRequestException nếu định dạng MIME không được hỗ trợ (ví dụ image/gif)', async () => {
      const gifFile = {
        originalname: 'anim.gif',
        mimetype: 'image/gif',
        size: 1000,
        buffer: Buffer.alloc(100),
      } as Express.Multer.File;

      await expect(service.create(baseDto, gifFile)).rejects.toThrow(
        new BadRequestException(
          'Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận JPEG, PNG hoặc WebP',
        ),
      );
      expect(cloudinaryService.uploadSchoolImage).not.toHaveBeenCalled();
    });

    it('ném BadRequestException nếu tệp ảnh rỗng', async () => {
      const emptyFile = {
        originalname: 'empty.jpg',
        mimetype: 'image/jpeg',
        size: 0,
        buffer: Buffer.alloc(0),
      } as Express.Multer.File;

      await expect(service.create(baseDto, emptyFile)).rejects.toThrow(
        new BadRequestException('Tệp ảnh rỗng hoặc không hợp lệ'),
      );
      expect(cloudinaryService.uploadSchoolImage).not.toHaveBeenCalled();
    });

    it('ném BadRequestException nếu nội dung buffer bị giả mạo MIME type (magic bytes sai)', async () => {
      const spoofedFile = {
        originalname: 'fake.png',
        mimetype: 'image/png',
        size: 50,
        buffer: Buffer.from('this is plain text pretending to be png'),
      } as Express.Multer.File;

      await expect(service.create(baseDto, spoofedFile)).rejects.toThrow(
        new BadRequestException('Nội dung tệp ảnh không đúng với định dạng được khai báo'),
      );
      expect(cloudinaryService.uploadSchoolImage).not.toHaveBeenCalled();
      expect(prisma.school.create).not.toHaveBeenCalled();
    });

    it('không gọi prisma.school.create nếu Cloudinary upload thất bại', async () => {
      const mockFile = {
        originalname: 'school.jpg',
        mimetype: 'image/jpeg',
        size: validJpegBuffer.length,
        buffer: validJpegBuffer,
      } as Express.Multer.File;

      vi.mocked(cloudinaryService.uploadSchoolImage).mockRejectedValue(
        new BadGatewayException('Tải ảnh lên dịch vụ lưu trữ Cloudinary thất bại'),
      );

      await expect(service.create(baseDto, mockFile)).rejects.toThrow(BadGatewayException);
      expect(prisma.school.create).not.toHaveBeenCalled();
    });

    it('ném lỗi và chấp nhận ảnh mồ côi (không rollback destroy) nếu DB insert thất bại sau khi upload ảnh', async () => {
      const mockFile = {
        originalname: 'school.jpg',
        mimetype: 'image/jpeg',
        size: validJpegBuffer.length,
        buffer: validJpegBuffer,
      } as Express.Multer.File;

      vi.mocked(prisma.school.create).mockRejectedValue(new Error('PostgreSQL Connection Failed'));

      await expect(service.create(baseDto, mockFile)).rejects.toThrow('PostgreSQL Connection Failed');
      // Không có lời gọi destroy nào tới Cloudinary (Chấp nhận ảnh mồ côi theo chính sách PO)
    });
  });

  describe('findAll', () => {
    it('lấy danh sách trường học với phân trang mặc định (page=1, limit=10)', async () => {
      vi.mocked(prisma.school.findMany).mockResolvedValue([mockSchool as any]);
      vi.mocked(prisma.school.count).mockResolvedValue(1);

      const result = await service.findAll({});

      expect(prisma.school.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          _count: {
            select: {
              users: {
                where: {
                  role: { in: [Role.SCHOOL_ADMIN, Role.BUS_ATTENDANT] },
                },
              },
            },
          },
        },
      });

      expect(result.items.length).toBe(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
      });
      expect(result.items[0].employeeCount).toBe(4);
    });

    it('lọc danh sách theo tên trường (search) không phân biệt hoa thường', async () => {
      vi.mocked(prisma.school.findMany).mockResolvedValue([]);
      vi.mocked(prisma.school.count).mockResolvedValue(0);

      await service.findAll({ search: 'Lê Quý Đôn' });

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: {
              contains: 'Lê Quý Đôn',
              mode: 'insensitive',
            },
          },
        }),
      );
    });

    it('lọc danh sách theo trạng thái ACTIVE', async () => {
      vi.mocked(prisma.school.findMany).mockResolvedValue([]);
      vi.mocked(prisma.school.count).mockResolvedValue(0);

      await service.findAll({ status: SchoolStatusFilter.ACTIVE });

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('lọc danh sách theo trạng thái INACTIVE', async () => {
      vi.mocked(prisma.school.findMany).mockResolvedValue([]);
      vi.mocked(prisma.school.count).mockResolvedValue(0);

      await service.findAll({ status: SchoolStatusFilter.INACTIVE });

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: false },
        }),
      );
    });

    it('trả về danh sách rỗng với totalPages = 0 khi không có trường nào', async () => {
      vi.mocked(prisma.school.findMany).mockResolvedValue([]);
      vi.mocked(prisma.school.count).mockResolvedValue(0);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('lấy thông tin chi tiết trường học theo ID hợp lệ', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any);

      const result = await service.findOne(mockSchool.id);

      expect(prisma.school.findUnique).toHaveBeenCalledWith({
        where: { id: mockSchool.id },
        include: {
          _count: {
            select: {
              users: {
                where: {
                  role: { in: [Role.SCHOOL_ADMIN, Role.BUS_ATTENDANT] },
                },
              },
            },
          },
        },
      });

      expect(result.id).toBe(mockSchool.id);
      expect(result.name).toBe(mockSchool.name);
      expect(result.contractStartDate).toBe('2026-09-01');
      expect(result.contractEndDate).toBe('2027-08-31');
      expect(result.weeklySchedule).toEqual(mockSchool.weeklySchedule);
      expect(result.employeeCount).toBe(4);
    });

    it('ném lỗi NotFoundException nếu không tìm thấy trường học', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(null);

      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('parse weeklySchedule từ string nếu lưu dưới dạng text trong DB', async () => {
      const schoolWithStringSchedule = {
        ...mockSchool,
        weeklySchedule: JSON.stringify({
          monday: { start: '08:00', end: '16:00' },
        }),
      };
      vi.mocked(prisma.school.findUnique).mockResolvedValue(
        schoolWithStringSchedule as any,
      );

      const result = await service.findOne(mockSchool.id);
      expect(result.weeklySchedule).toEqual({
        monday: { start: '08:00', end: '16:00' },
      });
    });
  });

  describe('updateStatus', () => {
    it('deactivate trường học thành công (isActive = false) không phụ thuộc ngày hợp đồng', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: mockSchool.id,
        isActive: true,
        contractStartDate: new Date('2020-01-01'),
        contractEndDate: new Date('2020-12-31'),
      } as any);

      vi.mocked(prisma.school.update).mockResolvedValue({
        id: mockSchool.id,
        isActive: false,
      } as any);

      const result = await service.updateStatus(mockSchool.id, {
        isActive: false,
      });

      expect(prisma.school.update).toHaveBeenCalledWith({
        where: { id: mockSchool.id },
        data: { isActive: false },
        select: { id: true, isActive: true },
      });
      expect(result.isActive).toBe(false);
    });

    it('idempotent: nếu trạng thái không đổi thì không gọi database update', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: mockSchool.id,
        isActive: true,
        contractStartDate: mockSchool.contractStartDate,
        contractEndDate: mockSchool.contractEndDate,
      } as any);

      const result = await service.updateStatus(mockSchool.id, {
        isActive: true,
      });

      expect(prisma.school.update).not.toHaveBeenCalled();
      expect(result.isActive).toBe(true);
      expect(result.message).toBe('Cập nhật trạng thái trường học thành công');
    });

    it('kích hoạt lại trường (isActive = true) thành công nếu hợp đồng còn hiệu lực', async () => {
      const pastStart = new Date('2020-01-01');
      const farFutureEnd = new Date('2099-12-31');

      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: mockSchool.id,
        isActive: false,
        contractStartDate: pastStart,
        contractEndDate: farFutureEnd,
      } as any);

      vi.mocked(prisma.school.update).mockResolvedValue({
        id: mockSchool.id,
        isActive: true,
      } as any);

      const result = await service.updateStatus(mockSchool.id, {
        isActive: true,
      });

      expect(prisma.school.update).toHaveBeenCalledWith({
        where: { id: mockSchool.id },
        data: { isActive: true },
        select: { id: true, isActive: true },
      });
      expect(result.isActive).toBe(true);
    });

    it('từ chối kích hoạt lại trường nếu hợp đồng đã hết hạn (endDate < currentDate)', async () => {
      const expiredStart = new Date('2020-01-01');
      const expiredEnd = new Date('2021-01-01');

      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: mockSchool.id,
        isActive: false,
        contractStartDate: expiredStart,
        contractEndDate: expiredEnd,
      } as any);

      await expect(
        service.updateStatus(mockSchool.id, { isActive: true }),
      ).rejects.toThrow(
        'Không thể kích hoạt trường vì hợp đồng chưa có hiệu lực hoặc đã hết hạn',
      );
      expect(prisma.school.update).not.toHaveBeenCalled();
    });

    it('từ chối kích hoạt lại trường nếu hợp đồng chưa bắt đầu (startDate > currentDate)', async () => {
      const futureStart = new Date('2099-01-01');
      const futureEnd = new Date('2100-01-01');

      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: mockSchool.id,
        isActive: false,
        contractStartDate: futureStart,
        contractEndDate: futureEnd,
      } as any);

      await expect(
        service.updateStatus(mockSchool.id, { isActive: true }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.school.update).not.toHaveBeenCalled();
    });

    it('ném lỗi NotFoundException nếu trường học không tồn tại', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent-uuid', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findEmployees', () => {
    const mockEmployeeAdmin = {
      id: 'e1-uuid',
      fullName: 'Trần Thị Admin',
      email: 'admin@school.edu.vn',
      phone: '0912345678',
      role: Role.SCHOOL_ADMIN,
      isActive: true,
      createdAt: mockDate,
    };

    const mockEmployeeAttendant = {
      id: 'e2-uuid',
      fullName: 'Nguyễn Văn Phụ Xe',
      email: 'attendant@school.edu.vn',
      phone: '0987654321',
      role: Role.BUS_ATTENDANT,
      isActive: false,
      createdAt: mockDate,
    };

    it('ném lỗi NotFoundException nếu trường học không tồn tại', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(null);

      await expect(service.findEmployees('non-existent-school', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lấy danh sách nhân viên mặc định (chỉ lấy SCHOOL_ADMIN và BUS_ATTENDANT, skip=0, take=10)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({ id: mockSchool.id } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        mockEmployeeAdmin,
        mockEmployeeAttendant,
      ] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(2);

      const result = await service.findEmployees(mockSchool.id, {});

      expect(prisma.school.findUnique).toHaveBeenCalledWith({
        where: { id: mockSchool.id },
        select: { id: true },
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: mockSchool.id,
          role: { in: [Role.SCHOOL_ADMIN, Role.BUS_ATTENDANT] },
          isActive: undefined,
        },
        skip: 0,
        take: 10,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      expect(result.items.length).toBe(2);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        totalItems: 2,
        totalPages: 1,
      });
    });

    it('trả về danh sách rỗng với totalPages = 0 khi trường chưa có nhân viên', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({ id: mockSchool.id } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      const result = await service.findEmployees(mockSchool.id, { page: 1, limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('lọc nhân viên theo vai trò SCHOOL_ADMIN', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({ id: mockSchool.id } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockEmployeeAdmin] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      await service.findEmployees(mockSchool.id, {
        role: SchoolEmployeeRoleFilter.SCHOOL_ADMIN,
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: mockSchool.id,
            role: { in: [Role.SCHOOL_ADMIN] },
          }),
        }),
      );
    });

    it('lọc nhân viên theo vai trò BUS_ATTENDANT', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({ id: mockSchool.id } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockEmployeeAttendant] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      await service.findEmployees(mockSchool.id, {
        role: SchoolEmployeeRoleFilter.BUS_ATTENDANT,
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: mockSchool.id,
            role: { in: [Role.BUS_ATTENDANT] },
          }),
        }),
      );
    });

    it('lọc nhân viên theo trạng thái ACTIVE (isActive = true)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({ id: mockSchool.id } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      await service.findEmployees(mockSchool.id, {
        status: SchoolEmployeeStatusFilter.ACTIVE,
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('lọc nhân viên theo trạng thái INACTIVE (isActive = false)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({ id: mockSchool.id } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      await service.findEmployees(mockSchool.id, {
        status: SchoolEmployeeStatusFilter.INACTIVE,
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: false,
          }),
        }),
      );
    });

    it('tìm kiếm nhân viên theo từ khóa (fullName, email, phone) không phân biệt hoa thường', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({ id: mockSchool.id } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      await service.findEmployees(mockSchool.id, { search: 'Nguyễn' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { fullName: { contains: 'Nguyễn', mode: 'insensitive' } },
              { email: { contains: 'Nguyễn', mode: 'insensitive' } },
              { phone: { contains: 'Nguyễn', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('cho phép xem danh sách nhân viên ngay cả khi trường học đang ở trạng thái INACTIVE', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: mockSchool.id,
        isActive: false,
      } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockEmployeeAdmin] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await service.findEmployees(mockSchool.id, {});

      expect(result.items.length).toBe(1);
    });

    it('không bao giờ trả về passwordHash hoặc secrets trong danh sách nhân viên', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({ id: mockSchool.id } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockEmployeeAdmin] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await service.findEmployees(mockSchool.id, {});

      for (const item of result.items) {
        expect((item as any).passwordHash).toBeUndefined();
        expect((item as any).password).toBeUndefined();
      }
    });
  });

  describe('createSchoolAdmin', () => {
    const activeSchool = {
      id: mockSchool.id,
      name: mockSchool.name,
      isActive: true,
    };

    it('ném lỗi NotFoundException nếu trường học không tồn tại', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(null);

      await expect(
        service.createSchoolAdmin('non-existent-id', {
          fullName: 'Trần Văn Hùng',
          email: 'hung@school.edu.vn',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('từ chối tạo tài khoản với BadRequestException nếu trường học đang ngừng hoạt động (isActive = false)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: mockSchool.id,
        name: mockSchool.name,
        isActive: false,
      } as any);

      await expect(
        service.createSchoolAdmin(mockSchool.id, {
          fullName: 'Trần Văn Hùng',
          email: 'hung@school.edu.vn',
        }),
      ).rejects.toThrow(
        new BadRequestException('Không thể tạo tài khoản quản trị cho trường học đang ngừng hoạt động.'),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('tạo SCHOOL_ADMIN thành công chỉ với email (phone = null)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(activeSchool as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'new-admin-uuid-1',
        fullName: 'Nguyễn Văn Hùng',
        email: 'hung@school.edu.vn',
        phone: null,
        role: Role.SCHOOL_ADMIN,
        schoolId: mockSchool.id,
        isActive: true,
        isVerified: true,
        createdAt: mockDate,
      } as any);

      const result = await service.createSchoolAdmin(mockSchool.id, {
        fullName: '  Nguyễn Văn Hùng  ',
        email: '  HUNG@SCHOOL.EDU.VN  ',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: mockSchool.id,
          role: Role.SCHOOL_ADMIN,
          fullName: 'Nguyễn Văn Hùng',
          email: 'hung@school.edu.vn',
          phone: null,
          isActive: true,
          isVerified: true,
          passwordHash: expect.any(String),
        }),
      });

      expect(result).toEqual({
        id: 'new-admin-uuid-1',
        fullName: 'Nguyễn Văn Hùng',
        email: 'hung@school.edu.vn',
        phone: null,
        role: Role.SCHOOL_ADMIN,
        schoolId: mockSchool.id,
        isActive: true,
        isVerified: true,
        createdAt: mockDate.toISOString(),
        message: 'Tạo tài khoản quản trị trường học thành công',
      });

      expect((result as any).password).toBeUndefined();
      expect((result as any).temporaryPassword).toBeUndefined();
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('tạo SCHOOL_ADMIN thành công chỉ với phone (email = null), chuẩn hóa số điện thoại hợp lệ', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(activeSchool as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'new-admin-uuid-2',
        fullName: 'Lê Văn Nam',
        email: null,
        phone: '0912345678',
        role: Role.SCHOOL_ADMIN,
        schoolId: mockSchool.id,
        isActive: true,
        isVerified: true,
        createdAt: mockDate,
      } as any);

      const result = await service.createSchoolAdmin(mockSchool.id, {
        fullName: 'Lê Văn Nam',
        phone: '+84 912 345 678',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: mockSchool.id,
          role: Role.SCHOOL_ADMIN,
          fullName: 'Lê Văn Nam',
          email: null,
          phone: '0912345678',
          isActive: true,
          isVerified: true,
        }),
      });

      expect(result.phone).toBe('0912345678');
      expect(result.email).toBeNull();
    });

    it('tạo SCHOOL_ADMIN thành công khi cung cấp cả email và phone', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(activeSchool as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'new-admin-uuid-3',
        fullName: 'Phạm Thị Mai',
        email: 'mai@school.edu.vn',
        phone: '0988777666',
        role: Role.SCHOOL_ADMIN,
        schoolId: mockSchool.id,
        isActive: true,
        isVerified: true,
        createdAt: mockDate,
      } as any);

      const result = await service.createSchoolAdmin(mockSchool.id, {
        fullName: 'Phạm Thị Mai',
        email: 'mai@school.edu.vn',
        phone: '0988777666',
      });

      expect(result.email).toBe('mai@school.edu.vn');
      expect(result.phone).toBe('0988777666');
    });

    it('ném lỗi ConflictException nếu email đã tồn tại trong hệ thống (pre-check)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(activeSchool as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'existing-uuid',
        email: 'hung@school.edu.vn',
        phone: null,
      } as any);

      await expect(
        service.createSchoolAdmin(mockSchool.id, {
          fullName: 'Nguyễn Văn Hùng',
          email: 'hung@school.edu.vn',
        }),
      ).rejects.toThrow(
        new ConflictException('Email này đã được sử dụng bởi một tài khoản khác'),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('ném lỗi ConflictException nếu số điện thoại đã tồn tại trong hệ thống (pre-check)', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(activeSchool as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'existing-uuid',
        email: null,
        phone: '0912345678',
      } as any);

      await expect(
        service.createSchoolAdmin(mockSchool.id, {
          fullName: 'Nguyễn Văn Hùng',
          phone: '0912345678',
        }),
      ).rejects.toThrow(
        new ConflictException('Số điện thoại này đã được sử dụng bởi một tài khoản khác'),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('bắt lỗi Prisma P2002 Unique Constraint và ném ConflictException khi xảy ra race condition', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(activeSchool as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        {
          code: 'P2002',
          clientVersion: '6.19.3',
          meta: { target: ['email'] },
        },
      );
      vi.mocked(prisma.user.create).mockRejectedValue(p2002Error);

      await expect(
        service.createSchoolAdmin(mockSchool.id, {
          fullName: 'Nguyễn Văn Hùng',
          email: 'hung@school.edu.vn',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('bàn giao mật khẩu qua Logger trong Development nhưng không bao giờ ghi password vào response', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(activeSchool as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'new-admin-uuid-4',
        fullName: 'Nguyễn Văn Hùng',
        email: 'hung@school.edu.vn',
        phone: null,
        role: Role.SCHOOL_ADMIN,
        schoolId: mockSchool.id,
        isActive: true,
        isVerified: true,
        createdAt: mockDate,
      } as any);

      const loggerSpy = vi
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => {});

      // 1. Khi NODE_ENV === 'development', logger được kích hoạt
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = await service.createSchoolAdmin(mockSchool.id, {
        fullName: 'Nguyễn Văn Hùng',
        email: 'hung@school.edu.vn',
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CONSOLE_CREDENTIAL_DELIVERY]'),
      );
      expect((result as any).password).toBeUndefined();

      // 2. Khi NODE_ENV === 'production' hoặc 'test', tuyệt đối không log plaintext ra console
      loggerSpy.mockClear();
      process.env.NODE_ENV = 'production';

      await service.createSchoolAdmin(mockSchool.id, {
        fullName: 'Nguyễn Văn Hùng',
        email: 'hung2@school.edu.vn',
      });

      expect(loggerSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
      loggerSpy.mockRestore();
    });

    it('cho phép SCHOOL_ADMIN tạo tài khoản BUS_ATTENDANT cho trường của mình', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'new-attendant-uuid',
        fullName: 'Cô Mai Giáo Viên',
        email: 'mai.teacher@school.edu.vn',
        phone: null,
        role: Role.BUS_ATTENDANT,
        schoolId: mockSchool.id,
        isActive: true,
        isVerified: true,
        createdAt: mockDate,
      } as any);

      const mockSchoolAdminUser = {
        id: 'admin-1',
        role: Role.SCHOOL_ADMIN,
        schoolId: mockSchool.id,
      } as any;

      const result = await service.createSchoolAdmin(
        mockSchool.id,
        {
          fullName: 'Cô Mai Giáo Viên',
          email: 'mai.teacher@school.edu.vn',
        },
        mockSchoolAdminUser,
      );

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: mockSchool.id,
          role: Role.BUS_ATTENDANT,
        }),
      });
      expect(result.role).toBe(Role.BUS_ATTENDANT);
    });

    it('chặn SCHOOL_ADMIN tạo nhân viên cho trường khác', async () => {
      const mockSchoolAdminUser = {
        id: 'admin-1',
        role: Role.SCHOOL_ADMIN,
        schoolId: 'other-school-id',
      } as any;

      await expect(
        service.createSchoolAdmin(
          mockSchool.id,
          {
            fullName: 'Cô Mai Giáo Viên',
            email: 'mai.teacher@school.edu.vn',
          },
          mockSchoolAdminUser,
        ),
      ).rejects.toThrow();
    });
  });

  describe('findEmployeeDetail', () => {
    it('cho phép SCHOOL_ADMIN xem chi tiết BUS_ATTENDANT thuộc trường mình', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 'emp-uuid-1',
        fullName: 'Cô Mai Giáo Viên',
        email: 'mai.teacher@school.edu.vn',
        phone: '0912345678',
        role: Role.BUS_ATTENDANT,
        schoolId: mockSchool.id,
        isActive: true,
        isVerified: true,
        createdAt: mockDate,
        updatedAt: mockDate,
      } as any);

      const mockSchoolAdminUser = {
        id: 'admin-1',
        role: Role.SCHOOL_ADMIN,
        schoolId: mockSchool.id,
      } as any;

      const result = await service.findEmployeeDetail(
        mockSchool.id,
        'emp-uuid-1',
        mockSchoolAdminUser,
      );

      expect(result.id).toBe('emp-uuid-1');
      expect(result.role).toBe(Role.BUS_ATTENDANT);
    });

    it('chặn SCHOOL_ADMIN xem chi tiết nhân viên của trường khác', async () => {
      const mockSchoolAdminUser = {
        id: 'admin-1',
        role: Role.SCHOOL_ADMIN,
        schoolId: 'other-school-id',
      } as any;

      await expect(
        service.findEmployeeDetail(
          mockSchool.id,
          'emp-uuid-1',
          mockSchoolAdminUser,
        ),
      ).rejects.toThrow();
    });
  });
});

