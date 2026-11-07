import { administrativeLocationForCoordinates } from './location-province.js';
import { lockOperations } from '../trips/utils/operations-lock.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContractLifecycleService } from './contract-lifecycle.service.js';
import { contractDate, vietnamToday } from './school-effective-state.js';
import {
  adminRecipients,
  writeNotification,
} from '../notifications/notification-writer.js';

@Injectable()
export class ScheduledChangesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: ContractLifecycleService,
  ) {}
  async schedule(
    schoolId: string,
    type: 'INACTIVE' | 'LOCATION' | 'SCHEDULE',
    payload: Prisma.InputJsonObject,
    date: string | undefined,
    actor: User,
  ) {
    if (actor.role !== 'SYSTEM_ADMIN')
      throw new ForbiddenException('Chỉ nhà xe được hẹn thay đổi trường');
    if (type === 'LOCATION') payload = { ...payload, ...await administrativeLocationForCoordinates(Number(payload.latitude), Number(payload.longitude)) };
    const tomorrow = new Date(`${vietnamToday()}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const effectiveDate = date ?? contractDate(tomorrow);
    return this.prisma.$transaction(
      async (tx) => {
      await lockOperations(tx);
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM schools WHERE id = ${schoolId} FOR UPDATE`,
        );
        let school = await tx.school.findUnique({ where: { id: schoolId } });
        if (!school) throw new NotFoundException('Không tìm thấy trường học');
        if (
          effectiveDate <= vietnamToday() ||
          effectiveDate > contractDate(school.contractEndDate)
        )
          throw new BadRequestException(
            'Ngày hiệu lực phải từ ngày mai đến hết hợp đồng',
          );
        await this.lifecycle.reconcileSchool(tx, school);
        school = (await tx.school.findUnique({ where: { id: schoolId } }))!;
        if (
          await tx.schoolScheduledChange.findFirst({
            where: {
              schoolId,
              type,
              status: 'PENDING',
              effectiveDate: new Date(effectiveDate),
            },
          })
        )
          throw new ConflictException(
            'Đã có lịch cùng loại trong ngày này. Hủy lịch cũ trước khi tạo lại',
          );
        const change = await tx.schoolScheduledChange.create({
          data: {
            schoolId,
            type,
            payload,
            effectiveDate: new Date(effectiveDate),
            createdById: actor.id,
          },
        });
        const people = await tx.trip.findMany({
          where: { schoolId, serviceDate: { gte: new Date(effectiveDate) } },
          select: {
            assignedDriverId: true,
            assignedBusAttendantId: true,
            attendances: {
              select: {
                student: {
                  select: { parentLinks: { select: { parentId: true } } },
                },
              },
            },
          },
        });
        const audience = people.flatMap((t) => [
          t.assignedDriverId,
          t.assignedBusAttendantId,
          ...t.attendances.flatMap((a) =>
            a.student.parentLinks.map((l) => l.parentId),
          ),
        ]);
        await writeNotification(tx, {
          eventKey: `school-change:${change.id}:scheduled`,
          type: 'SCHOOL_SCHEDULE_CHANGED',
          title: 'Trường có lịch thay đổi',
          body: `${school.name} · ${effectiveDate}`,
          targetType: 'SCHEDULE',
          targetId: effectiveDate,
          userIds: [
            ...(await adminRecipients(tx, 'SYSTEM_ADMIN')),
            ...(await adminRecipients(tx, 'SCHOOL_ADMIN', schoolId)),
            ...audience,
          ],
          actorId: actor.id,
          context: { schoolId, effectiveDate, changeId: change.id },
        });
        return {
          school,
          scheduledChangeId: change.id,
          effectiveDate,
          changeStatus: change.status,
        };
      },
      { timeout: 30000 },
    );
  }
  async list(schoolId: string, actor: User) {
    this.assertAccess(schoolId, actor);
    const rows = await this.prisma.schoolScheduledChange.findMany({
      where: { schoolId },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => ({
      ...row,
      effectiveDate: contractDate(row.effectiveDate),
    }));
  }
  private assertAccess(schoolId: string, actor: User) {
    if (
      actor.role !== 'SYSTEM_ADMIN' &&
      !(actor.role === 'SCHOOL_ADMIN' && actor.schoolId === schoolId)
    )
      throw new ForbiddenException('Không có quyền quản lý lịch trường này');
  }
  async cancel(schoolId: string, id: string, actor: User) {
    if (actor.role !== 'SYSTEM_ADMIN')
      throw new ForbiddenException('Chỉ nhà xe được hủy lịch thay đổi');
    return this.prisma.$transaction(async (tx) => {
      await lockOperations(tx);
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM schools WHERE id = ${schoolId} FOR UPDATE`,
      );
      const change = await tx.schoolScheduledChange.findFirst({
        where: { id, schoolId },
      });
      if (!change) throw new NotFoundException('Không tìm thấy lịch thay đổi');
      if (
        change.status !== 'PENDING' ||
        contractDate(change.effectiveDate) <= vietnamToday()
      )
        throw new ConflictException(
          'Chỉ hủy lịch còn chờ và chưa đến ngày hiệu lực',
        );
      const result = await tx.schoolScheduledChange.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await writeNotification(tx, {
        eventKey: `school-change:${id}:cancelled`,
        type: 'SCHOOL_SCHEDULE_CHANGED',
        title: 'Đã hủy lịch thay đổi trường',
        body: contractDate(change.effectiveDate),
        targetType: 'SCHEDULE',
        targetId: contractDate(change.effectiveDate),
        userIds: await adminRecipients(tx, 'SCHOOL_ADMIN', schoolId),
        actorId: actor.id,
      });
      return { ...result, effectiveDate: contractDate(result.effectiveDate) };
    });
  }
  async reactivate(schoolId: string, actor: User) {
    if (actor.role !== 'SYSTEM_ADMIN')
      throw new ForbiddenException('Chỉ nhà xe được kích hoạt trường');
    return this.prisma.$transaction(
      async (tx) => {
      await lockOperations(tx);
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM schools WHERE id = ${schoolId} FOR UPDATE`,
        );
        const school = await tx.school.findUnique({ where: { id: schoolId } });
        if (!school) throw new NotFoundException('Không tìm thấy trường học');
        await this.lifecycle.reconcileSchool(tx, school);
        if (
          vietnamToday() < contractDate(school.contractStartDate) ||
          vietnamToday() > contractDate(school.contractEndDate)
        )
          throw new BadRequestException(
            'Chỉ kích hoạt khi hợp đồng còn hiệu lực',
          );
        const updated = await tx.school.update({
          where: { id: schoolId },
          data: { isActive: true },
        });
        return {
          id: schoolId,
          isActive: updated.isActive,
          message: 'Kích hoạt trường thành công. Nhân sự cần đăng nhập lại',
        };
      },
      { timeout: 30000 },
    );
  }
}
