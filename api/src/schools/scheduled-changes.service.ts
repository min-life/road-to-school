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
import { createHash } from 'node:crypto';
import { schoolChangeImpact, type SchoolServiceChange } from './school-change-impact.js';
import { effectiveSchool, type WeeklySchoolSchedule } from './school-policy.js';
import { isValidCalendarDate } from './schedule.validator.js';
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

  private resolveDate(type: 'INACTIVE' | 'LOCATION' | 'SCHEDULE', date?: string) {
    const today = vietnamToday();
    const tomorrow = new Date(`${today}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowDate = contractDate(tomorrow);
    return {
      today,
      earliest: type === 'INACTIVE' ? tomorrowDate : today,
      effectiveDate: date ?? (type === 'LOCATION' ? today : tomorrowDate),
    };
  }

  private async impactView(db: Prisma.TransactionClient, school: NonNullable<Awaited<ReturnType<typeof effectiveSchool>>>, change: SchoolServiceChange, date: string) {
    const today = vietnamToday();
    const impact = await schoolChangeImpact(db, school, change, date);
    const fingerprint = createHash('sha256').update(JSON.stringify([
      school.id, date, change, school.latitude, school.longitude, school.weeklySchedule, school.contractEndDate,
      impact.plans.map(plan => [plan.id, plan.status, plan.updatedAt]).sort((left, right) => String(left[0]).localeCompare(String(right[0]))),
      impact.flagged.map(plan => plan.id).sort(), impact.cancelled.map(trip => [trip.id, trip.reason]), impact.shifted, impact.preserved,
    ])).digest('hex');
    return {
      schoolId: school.id,
      schoolName: school.name,
      currentAddressText: school.addressText,
      currentLatitude: school.latitude,
      currentLongitude: school.longitude,
      hasCoordinateChanged: impact.locationChanged,
      draftPlansCount: impact.plans.filter(plan => plan.status === 'DRAFT').length,
      activePlansCount: impact.plans.filter(plan => plan.status === 'ACTIVE').length,
      cancelledPlansCount: 0,
      reoptimizationPlansCount: impact.flagged.length,
      scheduledTripsCount: impact.cancelled.length,
      cancelledTripsCount: impact.cancelled.length,
      cancelledTripsTodayCount: impact.cancelled.filter(trip => contractDate(trip.serviceDate) === today).length,
      updatedTripsCount: impact.shifted.length,
      preservedTripsCount: impact.preserved.length,
      inProgressTripsCount: impact.inProgress,
      inProgressTripsPreservedCount: impact.inProgress,
      expectedFingerprint: fingerprint,
      fingerprint,
    };
  }

  async getImpact(schoolId: string, actor: User, change: SchoolServiceChange | null, date?: string) {
    if (actor.role !== 'SYSTEM_ADMIN') throw new ForbiddenException('Chỉ nhà xe được xem tác động thay đổi trường');
    const { today, effectiveDate } = this.resolveDate(change?.type ?? 'LOCATION', date);
    const school = await effectiveSchool(this.prisma, schoolId);
    if (!school) throw new NotFoundException('Không tìm thấy trường học');
    if (!isValidCalendarDate(effectiveDate) || effectiveDate < today || effectiveDate > contractDate(school.contractEndDate)) {
      throw new BadRequestException('Ngày hiệu lực phải từ hôm nay đến hết hợp đồng');
    }
    return this.impactView(this.prisma, school, change ?? { type: 'LOCATION', latitude: school.latitude, longitude: school.longitude + 0.00001 }, effectiveDate);
  }

  async schedule(
    schoolId: string,
    type: 'INACTIVE' | 'LOCATION' | 'SCHEDULE',
    payload: Prisma.InputJsonObject,
    date: string | undefined,
    actor: User,
    expectedFingerprint?: string,
  ) {
    if (actor.role !== 'SYSTEM_ADMIN')
      throw new ForbiddenException('Chỉ nhà xe được hẹn thay đổi trường');
    if (type === 'LOCATION') payload = { ...payload, ...await administrativeLocationForCoordinates(Number(payload.latitude), Number(payload.longitude)) };
    return this.prisma.$transaction(
      async (tx) => {
        await lockOperations(tx);
        const { today, earliest, effectiveDate } = this.resolveDate(type, date);
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM schools WHERE id = ${schoolId} FOR UPDATE`,
        );
        let school = await tx.school.findUnique({ where: { id: schoolId } });
        if (!school) throw new NotFoundException('Không tìm thấy trường học');
        if (
          effectiveDate < earliest ||
          effectiveDate > contractDate(school.contractEndDate)
        )
          throw new BadRequestException(
            type === 'INACTIVE' ? 'Ngày hiệu lực phải từ ngày mai đến hết hợp đồng' : 'Ngày hiệu lực phải từ hôm nay đến hết hợp đồng',
          );
        await this.lifecycle.reconcileSchool(tx, school);
        school = (await tx.school.findUnique({ where: { id: schoolId } }))!;
        if (expectedFingerprint && type !== 'INACTIVE') {
          const impact = await this.impactView(tx, school, type === 'LOCATION'
            ? { type, latitude: Number(payload.latitude), longitude: Number(payload.longitude) }
            : { type, weeklySchedule: payload.weeklySchedule as WeeklySchoolSchedule }, effectiveDate);
          if (impact.expectedFingerprint !== expectedFingerprint) throw new ConflictException('Tác động đã thay đổi. Vui lòng xem lại trước khi xác nhận');
        }
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
        const applied = effectiveDate === today
          ? await this.lifecycle.reconcileSchool(tx, school)
          : null;
        if (applied) school = (await tx.school.findUnique({ where: { id: schoolId } }))!;
        await writeNotification(tx, {
          eventKey: `school-change:${change.id}:scheduled`,
          type: 'SCHOOL_SCHEDULE_CHANGED',
          title: applied ? 'Thông tin trường đã thay đổi' : 'Trường có lịch thay đổi',
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
          changeStatus: applied ? 'APPLIED' as const : change.status,
          reoptimizationPlansCount: applied?.reoptimizationPlans ?? 0,
          cancelledTripsCount: applied?.trips ?? 0,
          updatedTripsCount: applied?.updatedTrips ?? 0,
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
