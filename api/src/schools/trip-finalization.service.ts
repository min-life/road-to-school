import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { tripBlockReason, tripPolicyEffectiveDate } from './school-policy.js';
import { requiresAdminFinalization } from './school-effective-state.js';
import { FinalizeTripDto } from './dto/service-calendar.dto.js';
import {
  notifyCancelledTrips,
  writeNotification,
} from '../notifications/notification-writer.js';

@Injectable()
export class TripFinalizationService {
  constructor(private readonly prisma: PrismaService) {}
  async list(actor: User) {
    if (actor.role !== 'SYSTEM_ADMIN') throw new ForbiddenException();
    const trips = await this.prisma.trip.findMany({
      where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      include: { attendances: true },
      orderBy: { serviceDate: 'asc' },
    });
    const result: unknown[] = [];
    for (const trip of trips)
      if (requiresAdminFinalization(trip)) {
        const reason = await tripBlockReason(this.prisma, trip.id);
        if (reason)
          result.push({
            ...trip,
            adminFinalization: trip.adminFinalization ?? {
              state: 'PENDING',
              trigger: reason,
              effectiveDate: await tripPolicyEffectiveDate(
                this.prisma,
                trip.id,
                reason,
              ),
            },
          });
      }
    return result;
  }
  async finalize(id: string, dto: FinalizeTripDto, actor: User) {
    if (actor.role !== 'SYSTEM_ADMIN') throw new ForbiddenException();
    if (!dto.reason.trim())
      throw new BadRequestException('Cần lý do chốt chuyến');
    return this.prisma.$transaction(async (tx) => {
      const ref = await tx.trip.findUnique({
        where: { id },
        select: { schoolId: true },
      });
      if (!ref) throw new NotFoundException('Không tìm thấy chuyến');
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM schools WHERE id = ${ref.schoolId} FOR UPDATE`,
      );
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM trips WHERE id = ${id} FOR UPDATE`,
      );
      const trip = await tx.trip.findUnique({
        where: { id },
        include: { attendances: true },
      });
      if (!trip || trip.status !== dto.expectedStatus)
        throw new ConflictException('Trạng thái chuyến đã thay đổi');
      const trigger = await tripBlockReason(tx, id);
      if (!trigger || !requiresAdminFinalization(trip))
        throw new ConflictException('Chuyến không thuộc nhóm chờ admin chốt');
      const oldAudit =
        trip.adminFinalization &&
        typeof trip.adminFinalization === 'object' &&
        !Array.isArray(trip.adminFinalization)
          ? trip.adminFinalization
          : {};
      const result = await tx.trip.update({
        where: { id },
        data: {
          status: dto.finalStatus,
          ...(dto.finalStatus === 'CANCELLED'
            ? {
                cancelledAt: new Date(),
                cancelledById: actor.id,
                cancellationReason: dto.reason.trim(),
              }
            : {}),
          adminFinalization: {
            trigger,
            effectiveDate: await tripPolicyEffectiveDate(tx, trip.id, trigger),
            detectedAt: new Date().toISOString(),
            ...oldAudit,
            state: 'FINALIZED',
            previousStatus: trip.status,
            finalStatus: dto.finalStatus,
            reason: dto.reason.trim(),
            finalizedById: actor.id,
            finalizedAt: new Date().toISOString(),
          },
        },
      });
      if (dto.finalStatus === 'CANCELLED')
        await tx.leaveNotice.updateMany({
          where: { tripId: id, status: 'PENDING_REPLACEMENT' },
          data: {
            status: 'TRIP_CANCELLED',
            processedAt: new Date(),
            processedById: actor.id,
          },
        });
      if (dto.finalStatus === 'CANCELLED')
        await notifyCancelledTrips(
          tx,
          [id],
          `admin-finalization:${id}`,
          actor.id,
        );
      await writeNotification(tx, {
        eventKey: `admin-finalization:${id}:finalized`,
        type: 'TRIP_ADMIN_FINALIZED',
        title: 'Admin đã chốt chuyến ngoại lệ',
        body: dto.reason.trim(),
        targetType: 'TRIP',
        targetId: id,
        userIds: [trip.assignedDriverId, trip.assignedBusAttendantId],
        actorId: actor.id,
      });
      return result;
    });
  }
}
