import {
  ConflictException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function lockIotDevice(
  tx: Prisma.TransactionClient,
  deviceId: string,
  shared = false,
) {
  if (shared)
    await tx.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock_shared(hashtextextended(${`iot:device:${deviceId}`}, 0))::text AS locked`,
    );
  else
    await tx.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`iot:device:${deviceId}`}, 0))::text AS locked`,
    );
}
export function iotAssignmentError(error: unknown): never {
  if (error instanceof HttpException) throw error;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new ConflictException(
      'Xe hoặc thiết bị đã được gán bởi thao tác khác. Tải lại danh sách.',
    );
  }
  throw new ServiceUnavailableException('Dữ liệu gán xe IoT chưa sẵn sàng');
}
export async function lockIotScan(tx: Prisma.TransactionClient, scanId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'iot:scan:'+scanId},0))::text AS locked`;
}
export function assertAssignmentTime(
  assignedAt: Date,
  releasedAt: Date | null,
  scannedAt: Date,
  now = Date.now(),
) {
  if (
    scannedAt.getTime() < assignedAt.getTime() ||
    (releasedAt && scannedAt.getTime() >= releasedAt.getTime()) ||
    now - scannedAt.getTime() > 120000 ||
    scannedAt.getTime() > now + 5000
  ) {
    throw new ConflictException({
      code: 'STALE_ASSIGNMENT',
      message:
        'Lần gán xe hoặc thời gian quẹt không còn hợp lệ. Đồng bộ cấu hình rồi quẹt lại.',
    });
  }
}
