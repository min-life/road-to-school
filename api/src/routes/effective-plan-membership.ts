import { Prisma } from '@prisma/client';
import { planInvalidation } from '../schools/school-policy.js';

export async function effectiveMembershipPlans(
  db: Prisma.TransactionClient,
  schoolId: string,
  studentIds?: string[],
  excludePlanId?: string,
) {
  const candidates = await db.routePlan.findMany({
    where: {
      schoolId,
      status: { in: ['DRAFT', 'ACTIVE'] },
      ...(excludePlanId ? { id: { not: excludePlanId } } : {}),
      ...(studentIds ? { routes: { some: { stops: { some: { studentId: { in: studentIds } } } } } } : {}),
    },
    select: { id: true, createdAt: true },
  });
  const planIds: string[] = [];
  for (const plan of candidates) {
    if (!await planInvalidation(db, schoolId, plan.createdAt)) planIds.push(plan.id);
  }
  return planIds;
}
