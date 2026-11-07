import { Prisma } from '@prisma/client';

export type AssignmentField =
  'assignedVehicleId' | 'assignedDriverId' | 'assignedBusAttendantId';

export async function recordAssignmentOverride(
  db: Prisma.TransactionClient,
  tripId: string,
  fields: AssignmentField[],
  actorId: string,
): Promise<void> {
  if (!fields.length) return;
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: { operationAudit: true },
  });
  if (!trip) return;
  await db.trip.update({
    where: { id: tripId },
    data: {
      operationAudit: [
        ...(Array.isArray(trip.operationAudit) ? trip.operationAudit : []),
        {
          action: 'ASSIGNMENT_OVERRIDE',
          fields,
          actorId,
          occurredAt: new Date().toISOString(),
        },
      ] as Prisma.InputJsonArray,
    },
  });
}

export function hasAssignmentOverride(
  audit: Prisma.JsonValue | null,
  field: AssignmentField,
): boolean {
  return (
    Array.isArray(audit) &&
    audit.some(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        entry.action === 'ASSIGNMENT_OVERRIDE' &&
        Array.isArray(entry.fields) &&
        entry.fields.includes(field),
    )
  );
}
