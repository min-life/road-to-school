import { effectiveSchool } from './school-policy.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ServiceCalendarEntry, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateCalendarEntryDto,
  CalendarDecisionDto,
} from './dto/service-calendar.dto.js';
import { calendarMatches, calendarOccurrence } from './service-calendar.js';
import { contractDate, vietnamToday } from './school-effective-state.js';
import {
  adminRecipients,
  writeNotification,
} from '../notifications/notification-writer.js';

@Injectable()
export class ServiceCalendarService {
  constructor(private readonly prisma: PrismaService) {}
  private access(actor: User, schoolId: string | null) {
    if (
      actor.role !== 'SYSTEM_ADMIN' &&
      !(
        actor.role === 'SCHOOL_ADMIN' &&
        schoolId &&
        schoolId === actor.schoolId
      )
    )
      throw new ForbiddenException('Không có quyền quản lý lịch này');
  }
  private async lock(tx: Prisma.TransactionClient) {
    // Shared transaction lock prevents holiday insertion racing makeup approval.
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(3202032)`);
  }
  async list(actor: User, schoolId?: string) {
    if (schoolId) this.access(actor, schoolId);
    const scope = actor.role === 'SCHOOL_ADMIN' ? actor.schoolId : schoolId;
    if (!['SYSTEM_ADMIN', 'SCHOOL_ADMIN'].includes(actor.role))
      throw new ForbiddenException();
    const rows = await this.prisma.serviceCalendarEntry.findMany({
      where: scope ? { OR: [{ schoolId: scope }, { schoolId: null }] } : {},
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((row) => this.effective(row)));
  }
  private async effective(entry: ServiceCalendarEntry) {
    let blocked = false;
    if (entry.kind === 'MAKEUP' && entry.status === 'APPROVED') {
      const date = calendarOccurrence(entry, entry.year!);
      const holidays = await this.prisma.serviceCalendarEntry.findMany({
        where: { schoolId: null, kind: 'HOLIDAY', status: 'APPROVED' },
      });
      blocked = Boolean(date && holidays.some((h) => calendarMatches(h, date)));
    }
    return {
      ...entry,
      effectiveStatus: blocked ? 'BLOCKED' : entry.status,
      effectiveStatusReason: blocked ? 'OPERATOR_HOLIDAY' : null,
    };
  }
  private async assertMakeup(
    tx: Prisma.TransactionClient,
    entry: CreateCalendarEntryDto | ServiceCalendarEntry,
  ) {
    const date = calendarOccurrence(
      {
        ...entry,
        year: entry.year ?? null,
        leapMonth: entry.leapMonth ?? false,
      },
      entry.year!,
    );
    if (!date || date <= vietnamToday())
      throw new BadRequestException('Học bù phải vào ngày hợp lệ sau hôm nay');
    const school = await effectiveSchool(tx, entry.schoolId!, date);
    if (
      !school ||
      !school.isActive ||
      date < contractDate(school.contractStartDate) ||
      date > contractDate(school.contractEndDate)
    )
      throw new BadRequestException(
        'Ngày học bù phải thuộc hợp đồng trường hoạt động',
      );
    const holidays = await tx.serviceCalendarEntry.findMany({
      where: { schoolId: null, status: 'APPROVED', kind: 'HOLIDAY' },
    });
    if (holidays.some((h) => calendarMatches(h, date)))
      throw new ConflictException('Học bù trùng ngày nghỉ nhà xe');
    const other = await tx.serviceCalendarEntry.findMany({
      where: {
        schoolId: entry.schoolId,
        kind: 'MAKEUP',
        status: { in: ['APPROVED', 'PENDING'] },
      },
    });
    if (
      other.some(
        (e) =>
          (!('id' in entry) || e.id !== entry.id) && calendarMatches(e, date),
      )
    )
      throw new ConflictException('Đã có yêu cầu học bù trong ngày này');
    return date;
  }
  async create(dto: CreateCalendarEntryDto, actor: User) {
    if (dto.kind === 'MAKEUP' && actor.role !== 'SCHOOL_ADMIN')
      throw new ForbiddenException('Trường đề nghị học bù, nhà xe duyệt');
    const schoolId = dto.schoolId ?? null;
    this.access(actor, schoolId);
    if (
      dto.kind === 'MAKEUP' &&
      (!schoolId ||
        dto.recurrence !== 'ONCE' ||
        !dto.startTime ||
        !dto.endTime ||
        dto.startTime >= dto.endTime)
    )
      throw new BadRequestException(
        'Học bù cần trường, năm cụ thể và giờ bắt đầu < giờ kết thúc',
      );
    if (dto.calendar === 'SOLAR' && dto.leapMonth)
      throw new BadRequestException('Lịch dương không có tháng nhuận');
    if ((dto.recurrence === 'ONCE') !== (dto.year != null))
      throw new BadRequestException('ONCE cần năm; ANNUAL không nhận năm');
    if (dto.kind === 'HOLIDAY' && (dto.startTime || dto.endTime))
      throw new BadRequestException('Ngày nghỉ không nhận giờ học');
    return this.prisma
      .$transaction(async (tx) => {
        await this.lock(tx);
        if (
          schoolId &&
          !(await tx.school.findUnique({ where: { id: schoolId } }))
        )
          throw new NotFoundException('Không tìm thấy trường');
        const candidate = {
          ...dto,
          year: dto.year ?? null,
          leapMonth: dto.leapMonth ?? false,
        };
        if (dto.recurrence === 'ONCE') {
          const date = calendarOccurrence(candidate, dto.year!);
          if (!date || date <= vietnamToday())
            throw new BadRequestException(
              'Ngày nghỉ phải tồn tại và báo trước hôm nay',
            );
        } else {
          // Recurrences whose day is absent in a particular year skip that occurrence.
          const years = Array.from({ length: 300 }, (_, i) => 1900 + i);
          if (!years.some((y) => calendarOccurrence(candidate, y)))
            throw new BadRequestException('Ngày lặp không hợp lệ');
          if (calendarMatches(candidate, vietnamToday()))
            throw new BadRequestException(
              'Không thêm ngày nghỉ áp dụng hôm nay',
            );
        }
        if (dto.kind === 'MAKEUP') await this.assertMakeup(tx, dto);
        const entry = await tx.serviceCalendarEntry.create({
          data: {
            ...dto,
            schoolId,
            leapMonth: dto.leapMonth ?? false,
            status: dto.kind === 'MAKEUP' ? 'PENDING' : 'APPROVED',
            createdById: actor.id,
          },
        });
        if (dto.kind === 'MAKEUP')
          await this.notify(
            tx,
            entry,
            'requested',
            await adminRecipients(tx, 'SYSTEM_ADMIN'),
            actor.id,
          );
        if (!schoolId && dto.kind === 'HOLIDAY') {
          const makeups = await tx.serviceCalendarEntry.findMany({
            where: { kind: 'MAKEUP', status: 'APPROVED' },
          });
          for (const makeup of makeups) {
            const date = calendarOccurrence(makeup, makeup.year!);
            if (date && date > vietnamToday() && calendarMatches(entry, date))
              await this.notify(
                tx,
                entry,
                `blocked:${makeup.id}`,
                await adminRecipients(tx, 'SCHOOL_ADMIN', makeup.schoolId!),
                actor.id,
              );
          }
        }
        return entry;
      })
      .then((entry) => this.effective(entry));
  }
  private async notify(
    tx: Prisma.TransactionClient,
    entry: ServiceCalendarEntry,
    action: string,
    userIds: string[],
    actorId: string,
  ) {
    await writeNotification(tx, {
      eventKey: `calendar:${entry.id}:${action}`,
      type: 'SERVICE_CALENDAR_CHANGED',
      title: action.startsWith('blocked')
        ? 'Ngày học bù bị chặn bởi lịch nghỉ nhà xe'
        : 'Lịch dịch vụ đã cập nhật',
      body: entry.title,
      targetType: 'SCHEDULE',
      targetId: 'current',
      userIds,
      actorId,
    });
  }
  async decide(id: string, dto: CalendarDecisionDto, actor: User) {
    if (actor.role !== 'SYSTEM_ADMIN')
      throw new ForbiddenException('Chỉ nhà xe được duyệt học bù');
    if (dto.status === 'REJECTED' && !dto.reason?.trim())
      throw new BadRequestException('Cần lý do từ chối');
    return this.prisma
      .$transaction(async (tx) => {
        await this.lock(tx);
        const entry = await tx.serviceCalendarEntry.findUnique({
          where: { id },
        });
        if (!entry) throw new NotFoundException('Không tìm thấy lịch');
        if (entry.kind !== 'MAKEUP' || entry.status !== 'PENDING')
          throw new ConflictException('Chỉ duyệt yêu cầu học bù còn chờ');
        const date = calendarOccurrence(entry, entry.year!);
        if (!date || date <= vietnamToday())
          throw new ConflictException('Yêu cầu đã đến ngày hoặc không hợp lệ');
        if (dto.status === 'APPROVED') await this.assertMakeup(tx, entry);
        const updated = await tx.serviceCalendarEntry.update({
          where: { id },
          data: {
            status: dto.status,
            reviewedById: actor.id,
            reviewedAt: new Date(),
            reason: dto.reason,
          },
        });
        await this.notify(
          tx,
          updated,
          dto.status,
          await adminRecipients(tx, 'SCHOOL_ADMIN', entry.schoolId!),
          actor.id,
        );
        return updated;
      })
      .then((entry) => this.effective(entry));
  }
  async cancel(id: string, actor: User) {
    return this.prisma
      .$transaction(async (tx) => {
        await this.lock(tx);
        const entry = await tx.serviceCalendarEntry.findUnique({
          where: { id },
        });
        if (!entry) throw new NotFoundException('Không tìm thấy lịch');
        this.access(actor, entry.schoolId);
        if (entry.kind !== 'HOLIDAY')
          throw new BadRequestException(
            'Hủy học bù chưa thuộc contract được duyệt',
          );
        if (entry.status !== 'APPROVED')
          throw new ConflictException('Lịch không còn hiệu lực');
        const date =
          entry.recurrence === 'ONCE'
            ? calendarOccurrence(entry, entry.year!)
            : null;
        if (
          (date && date <= vietnamToday()) ||
          calendarMatches(entry, vietnamToday())
        )
          throw new ConflictException('Không hủy lịch đã đến ngày');
        return tx.serviceCalendarEntry.update({
          where: { id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
      })
      .then((entry) => this.effective(entry));
  }
}
