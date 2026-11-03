import { planInvalidation } from './school-policy.js';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertResourcesNotAwaitingAdmin } from './contract-resource-policy.js';

export async function assertExtensionResources(
  tx: Prisma.TransactionClient,
  schoolId: string,
  fromDate: Date,
  toDate: Date,
): Promise<void> {
  const routes = await tx.route.findMany({
    where: { schoolId, routePlan: { status: { in: ['DRAFT', 'ACTIVE'] } } },
    include: {
      proposedVehicle: true,
      defaultDriver: true,
      defaultBusAttendant: true,
      stops: { select: { studentId: true } },
    },
  });
  const vehicleIds = new Set<string>();
  const driverIds = new Set<string>();
  for (const route of routes) {
    const students = new Set(
      route.stops.map((stop) => stop.studentId).filter(Boolean),
    ).size;
    if (
      (route.proposedVehicle && route.proposedVehicle.seatCount < students) ||
      (route.defaultDriver &&
        (!route.defaultDriver.isActive ||
          route.defaultDriver.role !== 'DRIVER')) ||
      (route.defaultBusAttendant &&
        (!route.defaultBusAttendant.isActive ||
          route.defaultBusAttendant.role !== 'BUS_ATTENDANT' ||
          route.defaultBusAttendant.schoolId !== schoolId))
    ) {
      throw new ConflictException(
        'Phân công hiện tại không còn phù hợp để gia hạn',
      );
    }
    if (route.proposedVehicle) vehicleIds.add(route.proposedVehicle.id);
    if (route.defaultDriver) driverIds.add(route.defaultDriver.id);
    await assertResourcesNotAwaitingAdmin(tx, {
      vehicleId: route.proposedVehicleId,
      driverId: route.defaultDriverId,
      busAttendantId: route.defaultBusAttendantId,
    });
  }
  if (!routes.length) return;
  const conflicts = await tx.route.findMany({
    where: {
      schoolId: { not: schoolId },
      OR: [
        { proposedVehicleId: { in: [...vehicleIds] } },
        { defaultDriverId: { in: [...driverIds] } },
      ],
      routePlan: {
        status: { in: ['DRAFT', 'ACTIVE'] },
        school: {
          contractStartDate: { lte: toDate },
          contractEndDate: { gte: fromDate },
        },
      },
    },
    include: { routePlan: true },
  });
  for (const conflict of conflicts) {
    if (
      !(await planInvalidation(
        tx,
        conflict.schoolId,
        conflict.routePlan.createdAt,
      ))
    )
      throw new ConflictException(
        'Xe hoặc tài xế đã được giữ cho trường khác trong khoảng gia hạn',
      );
  }
}
