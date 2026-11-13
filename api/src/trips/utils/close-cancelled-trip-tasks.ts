import { Prisma } from '@prisma/client';

/** Student notices remain effective if an eligible cancelled trip is reopened later. */
export async function closeCancelledTripTasks(db: Prisma.TransactionClient, tripIds: string[]): Promise<void> {
  if (!tripIds.length) return;
  const cancelled = await db.trip.findMany({ where: { id: { in: tripIds }, status: 'CANCELLED' }, select: { id: true } });
  const ids = cancelled.map(trip => trip.id);
  await db.leaveNotice.updateMany({ where: { tripId: { in: ids }, status: 'PENDING_REPLACEMENT' },
    data: { status: 'TRIP_CANCELLED', processedAt: new Date() } });
  await db.tripIncident.updateMany({ where: { tripId: { in: ids }, status: { in: ['WAITING_ASSIGNMENT', 'WAITING_CONFIRMATION'] } },
    data: { status: 'CLOSED', processedAt: new Date(), resolution: { action: 'TRIP_CANCELLED', reason: 'Chuyến xe đã hủy' } } });
}
