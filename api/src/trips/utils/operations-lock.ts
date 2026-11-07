import { Prisma } from '@prisma/client';

/** Use the generation lock before row locks in every operation that changes trip state or assignments. */
export async function lockOperations(
  tx: Prisma.TransactionClient,
): Promise<void> {
  if (typeof (tx as any)?.$queryRaw !== 'function') {
    return;
  }
  // The lock function returns PostgreSQL void, which Prisma cannot deserialize.
  // Execute it as a table function and return only a supported integer column.
  await tx.$queryRaw(
    Prisma.sql`SELECT 1::integer AS locked FROM pg_advisory_xact_lock(3202032)`,
  );
}
