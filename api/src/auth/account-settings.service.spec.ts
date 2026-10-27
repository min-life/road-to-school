import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('AuthService - Account Settings & Security', () => {
  let service: AuthService;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockOtpService: any;
  let mockConfigService: any;
  let mockCloudinaryService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      session: {
        updateMany: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };
    mockJwtService = { signAsync: vi.fn() };
    mockOtpService = {};
    mockConfigService = { get: vi.fn() };
    mockCloudinaryService = {
      uploadUserAvatar: vi.fn(),
      deleteImage: vi.fn().mockResolvedValue(true),
    };

    service = new AuthService(
      mockPrisma,
      mockJwtService,
      mockOtpService,
      mockConfigService,
      mockCloudinaryService,
    );
  });

  describe('changePassword & Session Revocation', () => {
    it('từ chối khi mật khẩu hiện tại không đúng', async () => {
      const hashed = await bcrypt.hash('CorrectPassword123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        passwordHash: hashed,
        isActive: true,
      });

      await expect(
        service.changePassword('u-1', 'session-current', {
          currentPassword: 'WrongPassword123',
          newPassword: 'NewPassword456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('từ chối khi mật khẩu mới trùng với mật khẩu hiện tại', async () => {
      const password = 'SamePassword123';
      const hashed = await bcrypt.hash(password, 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        passwordHash: hashed,
        isActive: true,
      });

      await expect(
        service.changePassword('u-1', 'session-current', {
          currentPassword: password,
          newPassword: password,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('MANDATORY: Đổi mật khẩu thành công, thu hồi TẤT CẢ các phiên khác và GIỮ LẠI phiên hiện tại (Section 1.11)', async () => {
      const currentPass = 'OldPassword123';
      const newPass = 'NewPassword789';
      const hashed = await bcrypt.hash(currentPass, 10);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        passwordHash: hashed,
        isActive: true,
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'u-1' });
      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.changePassword('u-1', 'session-current', {
        currentPassword: currentPass,
        newPassword: newPass,
      });

      expect(result.message).toBe('Đổi mật khẩu thành công');

      // Xác nhận User được cập nhật hash mới
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { passwordHash: expect.any(String) },
      });

      // Xác nhận chỉ thu hồi các phiên KHÁC (id: { not: 'session-current' })
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'u-1',
          id: { not: 'session-current' },
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date), pushToken: null,
        },
      });
    });
  });

  describe('updateParentName', () => {
    it('cho phép tài khoản PARENT cập nhật họ tên', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'p-1',
        fullName: 'Nguyễn Văn Phụ Huynh Mới',
        email: 'parent@example.com',
        phone: '0912345678',
        role: Role.PARENT,
        isActive: true,
        schoolId: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateParentName('p-1', Role.PARENT, {
        fullName: 'Nguyễn Văn Phụ Huynh Mới',
      });

      expect(result.fullName).toBe('Nguyễn Văn Phụ Huynh Mới');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { fullName: 'Nguyễn Văn Phụ Huynh Mới' },
      });
    });

    it('từ chối 403 Forbidden nếu vai trò không phải PARENT (ví dụ SCHOOL_ADMIN, DRIVER)', async () => {
      await expect(
        service.updateParentName('adm-1', Role.SCHOOL_ADMIN, {
          fullName: 'Tên Đổi',
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateParentName('drv-1', Role.DRIVER, {
          fullName: 'Tên Đổi',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('từ chối khi họ tên ngắn hơn 2 ký tự', async () => {
      await expect(
        service.updateParentName('p-1', Role.PARENT, {
          fullName: 'A',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateAvatar', () => {
    it('từ chối định dạng file không thuộc JPEG, PNG, WebP', async () => {
      const dummyFile: any = {
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('%PDF-1.4'),
      };

      await expect(service.updateAvatar('u-1', dummyFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('từ chối file vượt quá 5MB', async () => {
      const dummyFile: any = {
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024,
        buffer: Buffer.from([0xff, 0xd8, 0xff]),
      };

      await expect(service.updateAvatar('u-1', dummyFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('từ chối file có mimetype giả mạo (magic bytes không khớp)', async () => {
      const dummyFile: any = {
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('NOT_PNG_HEADER'),
      };

      await expect(service.updateAvatar('u-1', dummyFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('upload ảnh hợp lệ, cập nhật avatarUrl và dọn dẹp publicId cũ', async () => {
      // JPEG Magic bytes: FF D8 FF
      const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const file: any = {
        mimetype: 'image/jpeg',
        size: validJpegBuffer.length,
        buffer: validJpegBuffer,
        originalname: 'my-avatar.jpg',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        avatarPublicId: 'old-public-id',
      });
      mockCloudinaryService.uploadUserAvatar.mockResolvedValue({
        secureUrl: 'https://cloudinary.com/new-avatar.jpg',
        publicId: 'new-public-id',
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'u-1' });

      const result = await service.updateAvatar('u-1', file);

      expect(result.avatarUrl).toBe('https://cloudinary.com/new-avatar.jpg');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: {
          avatarUrl: 'https://cloudinary.com/new-avatar.jpg',
          avatarPublicId: 'new-public-id',
        },
      });

      // Cleanup publicId cũ
      expect(mockCloudinaryService.deleteImage).toHaveBeenCalledWith(
        'old-public-id',
      );
    });
  });
});
