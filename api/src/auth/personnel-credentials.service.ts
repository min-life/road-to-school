import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { isEmail } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailDeliveryService } from './email-delivery.service.js';
import type { CredentialDeliveryStatus } from './email-delivery.service.js';
import { CredentialDeliveryResultDto } from './credential-delivery.dto.js';

@Injectable()
export class PersonnelCredentialsService {
  // Prevent overlapping sends in this API process; CAS also rejects competing hash writes.
  private readonly pending = new Set<string>();

  constructor(private readonly prisma: PrismaService, private readonly email: EmailDeliveryService) {}

  async deliverCreatedUser(target: User, password: string): Promise<CredentialDeliveryStatus> {
    if (this.pending.has(target.id)) return 'FAILED';
    this.pending.add(target.id);
    try {
      const before = await this.prisma.user.findUnique({ where: { id: target.id } });
      if (!before || !before.isActive || before.passwordHash !== target.passwordHash || before.email !== target.email) return 'FAILED';
      const status = await this.email.sendCredentials(target.email!, target.fullName, password);
      const after = await this.prisma.user.findUnique({ where: { id: target.id } });
      return after?.isActive && after.passwordHash === target.passwordHash && after.email === target.email ? status : 'FAILED';
    } catch {
      // The User was already committed; never make the client retry account creation.
      return 'FAILED';
    } finally {
      this.pending.delete(target.id);
    }
  }

  private assertAccess(target: User, actor: User, schoolId?: string): void {
    if (schoolId) {
      if (target.schoolId !== schoolId) throw new NotFoundException('Không tìm thấy nhân sự của trường');
      const allowed = (actor.role === Role.SYSTEM_ADMIN && target.role === Role.SCHOOL_ADMIN)
        || (actor.role === Role.SCHOOL_ADMIN && actor.schoolId === schoolId && target.role === Role.BUS_ATTENDANT);
      if (!allowed) throw new ForbiddenException('Bạn không được cấp lại mật khẩu cho nhân sự này');
    } else if (actor.role !== Role.SYSTEM_ADMIN || target.role !== Role.DRIVER) {
      throw new ForbiddenException('Chỉ nhà xe được cấp lại mật khẩu tài xế');
    }
    if (!target.isActive) throw new BadRequestException('Không cấp lại mật khẩu cho tài khoản đã vô hiệu hóa');
    if (!target.email || !isEmail(target.email)) throw new BadRequestException('Nhân sự chưa có email hợp lệ');
  }

  async resend(id: string, actor: User, schoolId?: string): Promise<CredentialDeliveryResultDto> {
    if (this.pending.has(id)) throw new ConflictException('Đang cấp lại mật khẩu cho nhân sự này');
    this.pending.add(id);
    try {
      const target = await this.prisma.user.findUnique({ where: { id } });
      if (!target) throw new NotFoundException('Không tìm thấy nhân sự');
      this.assertAccess(target, actor, schoolId);
      const password = randomBytes(9).toString('base64url');
      const passwordHash = await bcrypt.hash(password, 10);
      const changed = await this.prisma.user.updateMany({
        where: { id, passwordHash: target.passwordHash, updatedAt: target.updatedAt,
          isActive: true, email: target.email, role: target.role, schoolId: target.schoolId },
        data: { passwordHash },
      });
      if (changed.count !== 1) throw new ConflictException('Tài khoản vừa thay đổi. Vui lòng tải lại');
      // PO: save first, preserve all Sessions and push tokens, allow IN_PROGRESS assignments.
      const credentialDeliveryStatus = await this.email.sendCredentials(target.email!, target.fullName, password);
      const current = await this.prisma.user.findUnique({ where: { id }, select: { passwordHash: true, email: true, isActive: true } });
      if (!current || current.passwordHash !== passwordHash || current.email !== target.email || !current.isActive) {
        throw new ConflictException('Tài khoản đã thay đổi trong lúc gửi email. Không dùng mật khẩu của lần gửi này');
      }
      return {
        credentialDeliveryStatus,
        message: credentialDeliveryStatus === 'FAILED'
          ? 'Đã đổi mật khẩu nhưng chưa gửi được email. Các phiên hiện tại vẫn giữ nguyên; cần gửi lại mật khẩu mới'
          : credentialDeliveryStatus === 'CONSOLE'
            ? 'Đã cấp mật khẩu mới qua console development. Các phiên hiện tại vẫn giữ nguyên'
            : 'Đã đổi mật khẩu và máy chủ email đã chấp nhận gửi. Các phiên hiện tại vẫn giữ nguyên',
      };
    } finally {
      this.pending.delete(id);
    }
  }
}
