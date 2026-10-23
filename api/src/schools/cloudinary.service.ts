import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadGatewayException,
  GatewayTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import * as crypto from 'crypto';

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isCloudinaryConfigured = false;

  constructor(private readonly configService: ConfigService) {
    this.initCloudinary();
  }

  private initCloudinary() {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isCloudinaryConfigured = true;
      this.logger.log('Cloudinary SDK configured successfully');
    } else {
      this.isCloudinaryConfigured = false;
      this.logger.warn(
        'Cloudinary credentials are not configured. School creation with image upload will be disabled.',
      );
    }
  }

  public isConfigured(): boolean {
    return this.isCloudinaryConfigured;
  }

  /**
   * Upload image buffer to Cloudinary using upload_stream.
   * Folder: roadtoschool/schools
   * Timeout: 15 seconds
   */
  async uploadSchoolImage(
    buffer: Buffer,
    originalName?: string,
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Dịch vụ lưu trữ ảnh Cloudinary chưa được cấu hình trên hệ thống',
      );
    }

    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const publicId = `school_${uniqueSuffix}`;

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'roadtoschool/schools',
          public_id: publicId,
          resource_type: 'image',
          timeout: 15000,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message || 'Unknown error'}`);
            if (error.name === 'TimeoutError' || error.http_code === 499) {
              return reject(
                new GatewayTimeoutException(
                  'Quá thời gian chờ phản hồi từ dịch vụ lưu trữ ảnh Cloudinary',
                ),
              );
            }
            return reject(
              new BadGatewayException(
                'Tải ảnh lên dịch vụ lưu trữ Cloudinary thất bại',
              ),
            );
          }

          if (!result || !result.secure_url) {
            return reject(
              new BadGatewayException(
                'Dịch vụ Cloudinary không trả về đường dẫn ảnh hợp lệ',
              ),
            );
          }

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      const readableStream = Readable.from(buffer);
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Upload student avatar buffer to Cloudinary.
   * Folder: roadtoschool/students
   * Timeout: 15 seconds
   */
  async uploadStudentAvatar(
    buffer: Buffer,
    originalName?: string,
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Dịch vụ lưu trữ ảnh Cloudinary chưa được cấu hình trên hệ thống',
      );
    }

    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const publicId = `student_${uniqueSuffix}`;

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'roadtoschool/students',
          public_id: publicId,
          resource_type: 'image',
          timeout: 15000,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(
              `Cloudinary upload failed: ${error.message || 'Unknown error'}`,
            );
            if (error.name === 'TimeoutError' || error.http_code === 499) {
              return reject(
                new GatewayTimeoutException(
                  'Quá thời gian chờ phản hồi từ dịch vụ lưu trữ ảnh Cloudinary',
                ),
              );
            }
            return reject(
              new BadGatewayException(
                'Tải ảnh lên dịch vụ lưu trữ Cloudinary thất bại',
              ),
            );
          }

          if (!result || !result.secure_url) {
            return reject(
              new BadGatewayException(
                'Dịch vụ Cloudinary không trả về đường dẫn ảnh hợp lệ',
              ),
            );
          }

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      const readableStream = Readable.from(buffer);
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Upload user account avatar buffer to Cloudinary.
   * Folder: roadtoschool/avatars
   * Timeout: 15 seconds
   */
  async uploadUserAvatar(
    buffer: Buffer,
    originalName?: string,
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Dịch vụ lưu trữ ảnh Cloudinary chưa được cấu hình trên hệ thống',
      );
    }

    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const publicId = `avatar_${uniqueSuffix}`;

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'roadtoschool/avatars',
          public_id: publicId,
          resource_type: 'image',
          timeout: 15000,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(
              `Cloudinary user avatar upload failed: ${error.message || 'Unknown error'}`,
            );
            if (error.name === 'TimeoutError' || error.http_code === 499) {
              return reject(
                new GatewayTimeoutException(
                  'Quá thời gian chờ phản hồi từ dịch vụ lưu trữ ảnh Cloudinary',
                ),
              );
            }
            return reject(
              new BadGatewayException(
                'Tải ảnh lên dịch vụ lưu trữ Cloudinary thất bại',
              ),
            );
          }

          if (!result || !result.secure_url) {
            return reject(
              new BadGatewayException(
                'Dịch vụ Cloudinary không trả về đường dẫn ảnh hợp lệ',
              ),
            );
          }

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      const readableStream = Readable.from(buffer);
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Xóa ảnh trên Cloudinary theo publicId (Non-blocking cleanup per Section 1.12).
   */
  async deleteImage(publicId: string): Promise<boolean> {
    if (!this.isConfigured() || !publicId) {
      return false;
    }
    try {
      const res = await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Cloudinary image cleanup for ${publicId}: ${res?.result || 'ok'}`);
      return res?.result === 'ok';
    } catch (err: any) {
      this.logger.warn(`Cloudinary cleanup failed for ${publicId}: ${err?.message || err}`);
      return false;
    }
  }
}

