import { Prisma } from '@prisma/client';
import { serviceDay } from './school-policy.js';
import { contractDate } from './school-effective-state.js';
import { formatDateToVnYmd } from '../trips/utils/trip-time.util.js';
import { pendingParkingChange } from '../system-settings/parking-policy.js';

export async function firstServiceDate(
  db: Prisma.TransactionClient,
  plan: {
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
  const start = new Date(formatDateToVnYmd(plan.activatedAt));
  start.setUTCDate(start.getUTCDate() + 1);
  for (
    let date = start;
    date <= school.contractEndDate;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const day = contractDate(date);
    if (
      !(await pendingParkingChange(db, day)) &&
      (await serviceDay(db, plan.schoolId, day, plan.createdAt))
    )
      return day;
  }
  return null;
}
