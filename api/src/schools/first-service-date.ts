import { Prisma } from '@prisma/client';
import { pendingSchoolReoptimization, serviceDay } from './school-policy.js';
import { contractDate } from './school-effective-state.js';
import { calculateTripTiming, formatDateToVnYmd } from '../trips/utils/trip-time.util.js';
import { pendingParkingChange } from '../system-settings/parking-policy.js';

export async function firstServiceDate(
  db: Prisma.TransactionClient,
  plan: {
    id: string;
    schoolId: string;
    status: string;
    createdAt: Date;
    activatedAt: Date | null;
    needsReoptimization: boolean;
  },
): Promise<string | null> {
  if (plan.status !== 'ACTIVE' || !plan.activatedAt || plan.needsReoptimization)
    return null;
  const school = await db.school.findUnique({ where: { id: plan.schoolId } });
  if (!school) return null;
  const routes = await db.route.findMany({
    where: { routePlanId: plan.id },
    select: { direction: true, estimatedDurationSeconds: true },
  });
  if (!routes.length || await pendingSchoolReoptimization(db, school, routes)) return null;
  const approvedAt = plan.activatedAt.getTime();
  const contractStart = contractDate(school.contractStartDate);
  const activationDay = formatDateToVnYmd(plan.activatedAt);
  const start = new Date(activationDay < contractStart ? contractStart : activationDay);
  for (
    let date = start;
    date <= school.contractEndDate;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const day = contractDate(date);
    if (await pendingParkingChange(db, day)) continue;
    const schedule = await serviceDay(db, plan.schoolId, day, plan.createdAt);
    if (!schedule) continue;
    const hasDepartureAfterApproval = routes.some(route =>
      calculateTripTiming(route.direction, route.estimatedDurationSeconds, schedule, day)
        .scheduledStartAt.getTime() > approvedAt,
    );
    if (hasDepartureAfterApproval) return day;
  }
  return null;
}
