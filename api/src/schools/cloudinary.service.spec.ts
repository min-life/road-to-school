import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ServiceUnavailableException,
  BadGatewayException,
  GatewayTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service.js';
import { v2 as cloudinary } from 'cloudinary';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let configService: ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration Status', () => {
    it('isConfigured = false khi thiếu một trong các biến cấu hình Cloudinary', () => {
      configService = {
        get: vi.fn((key: string) => {
          if (key === 'CLOUDINARY_CLOUD_NAME') return 'demo';
          return undefined; // Thiếu KEY và SECRET
        }),
      } as unknown as ConfigService;

      service = new CloudinaryService(configService);
      expect(service.isConfigured()).toBe(false);
    });

    it('isConfigured = true khi đầy đủ cả 3 biến cấu hình Cloudinary', () => {
      configService = {
        get: vi.fn((key: string) => {
          if (key === 'CLOUDINARY_CLOUD_NAME') return 'demo_cloud';
          if (key === 'CLOUDINARY_API_KEY') return '123456789';
          if (key === 'CLOUDINARY_API_SECRET') return 'secret_xyz';
          return undefined;
        }),
      } as unknown as ConfigService;

      service = new CloudinaryService(configService);
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('uploadSchoolImage', () => {
    it('ném ServiceUnavailableException nếu dịch vụ chưa được cấu hình', async () => {
      configService = {
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      service = new CloudinaryService(configService);
      const dummyBuffer = Buffer.from('image content');

      await expect(service.uploadSchoolImage(dummyBuffer)).rejects.toThrow(
        new ServiceUnavailableException(
          'Dịch vụ lưu trữ ảnh Cloudinary chưa được cấu hình trên hệ thống',
        ),
      );
    });

    it('trả về secureUrl và publicId khi tải ảnh thành công', async () => {
      configService = {
        get: vi.fn((key: string) => {
          if (key === 'CLOUDINARY_CLOUD_NAME') return 'demo_cloud';
          if (key === 'CLOUDINARY_API_KEY') return '123456789';
          if (key === 'CLOUDINARY_API_SECRET') return 'secret_xyz';
          return undefined;
        }),
      } as unknown as ConfigService;

      service = new CloudinaryService(configService);

      const mockResult = {
        secure_url: 'https://res.cloudinary.com/demo/image/upload/roadtoschool/schools/school_1.webp',
        public_id: 'roadtoschool/schools/school_1',
      };

      vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(
        ((options: any, callback: any) => {
          // Simulate successful async stream upload
          process.nextTick(() => {
            if (callback) callback(undefined, mockResult);
          });
          return {
            write: vi.fn(),
            end: vi.fn(),
            on: vi.fn(),
            once: vi.fn(),
            emit: vi.fn(),
          } as any;
        }) as any,
      );

      const dummyBuffer = Buffer.from('valid image buffer');
      const result = await service.uploadSchoolImage(dummyBuffer, 'gate.jpg');

      expect(result).toEqual({
        secureUrl: mockResult.secure_url,
        publicId: mockResult.public_id,
      });
    });

    it('ném BadGatewayException khi Cloudinary gặp lỗi tải lên', async () => {
      configService = {
        get: vi.fn((key: string) => {
          if (key === 'CLOUDINARY_CLOUD_NAME') return 'demo_cloud';
          if (key === 'CLOUDINARY_API_KEY') return '123456789';
          if (key === 'CLOUDINARY_API_SECRET') return 'secret_xyz';
          return undefined;
        }),
      } as unknown as ConfigService;

      service = new CloudinaryService(configService);

      vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(
        ((options: any, callback: any) => {
          process.nextTick(() => {
            if (callback) callback(new Error('Internal Cloudinary Error'), undefined);
          });
          return {
            write: vi.fn(),
            end: vi.fn(),
            on: vi.fn(),
            once: vi.fn(),
            emit: vi.fn(),
          } as any;
        }) as any,
      );

      const dummyBuffer = Buffer.from('valid image buffer');
      await expect(service.uploadSchoolImage(dummyBuffer)).rejects.toThrow(
        new BadGatewayException('Tải ảnh lên dịch vụ lưu trữ Cloudinary thất bại'),
      );
    });

    it('ném GatewayTimeoutException khi Cloudinary timeout', async () => {
      configService = {
        get: vi.fn((key: string) => {
          if (key === 'CLOUDINARY_CLOUD_NAME') return 'demo_cloud';
          if (key === 'CLOUDINARY_API_KEY') return '123456789';
          if (key === 'CLOUDINARY_API_SECRET') return 'secret_xyz';
          return undefined;
        }),
      } as unknown as ConfigService;

      service = new CloudinaryService(configService);

      const timeoutError: any = new Error('Connection timeout');
      timeoutError.name = 'TimeoutError';

      vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(
        ((options: any, callback: any) => {
          process.nextTick(() => {
            if (callback) callback(timeoutError, undefined);
          });
          return {
            write: vi.fn(),
            end: vi.fn(),
            on: vi.fn(),
            once: vi.fn(),
            emit: vi.fn(),
          } as any;
        }) as any,
      );

      const dummyBuffer = Buffer.from('valid image buffer');
      await expect(service.uploadSchoolImage(dummyBuffer)).rejects.toThrow(
        new GatewayTimeoutException(
          'Quá thời gian chờ phản hồi từ dịch vụ lưu trữ ảnh Cloudinary',
        ),
      );
    });
  });
});
