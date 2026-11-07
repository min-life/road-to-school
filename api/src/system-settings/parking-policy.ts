import { Prisma } from '@prisma/client';
import { vietnamToday } from '../schools/school-effective-state.js';
import { ConflictException } from '@nestjs/common';
import { metresBetween } from '../trips/utils/navigation-state.js';

export function configuredParking(value: Prisma.JsonValue | null | undefined) {
  const parking = value as Prisma.JsonObject | null;
  if (typeof parking?.latitude !== 'number' || typeof parking.longitude !== 'number' ||
      !Number.isFinite(parking.latitude) || !Number.isFinite(parking.longitude) ||
      Math.abs(parking.latitude) > 90 || Math.abs(parking.longitude) > 180) {
    throw new ConflictException('Cần cấu hình bãi trung tâm trước khi lập lịch phục vụ');
  }
  return { latitude: parking.latitude, longitude: parking.longitude,
    addressText: String(parking.addressText ?? ''), maxOperatingRadiusKm: Number(parking.maxOperatingRadiusKm ?? 50) };
}

export async function pendingParkingChange(
  db: Pick<Prisma.TransactionClient, 'systemSetting'>,
  date = vietnamToday(),
): Promise<boolean> {
  const setting = await db.systemSetting.findUnique({
    where: { key: 'PARKING_LOT' },
  });
  const value = setting?.value as Prisma.JsonObject | null;
  const change = value?.scheduledChange as Prisma.JsonObject | null;
  return !!change && String(change.effectiveDate) <= date;
}

export async function assertLocationWithinServiceArea(
  db: Prisma.TransactionClient,
  schoolId: string,
  location: { latitude: number; longitude: number; province?: string | null },
): Promise<void> {
  const school = await db.school.findUnique({ where: { id: schoolId } });
  const setting = await db.systemSetting.findUnique({
    where: { key: 'PARKING_LOT' },
  });
  const parking = configuredParking(setting?.value);
  const { latitude, longitude } = parking;
  if (
    school?.province &&
    location.province &&
    school.province.trim().toLowerCase() !==
      location.province.trim().toLowerCase()
  ) {
    throw new ConflictException('Điểm đón khác tỉnh/thành với trường');
  }
  const radius = Number(parking?.maxOperatingRadiusKm ?? 50);
  if (metresBetween({ latitude, longitude }, location) > radius * 1000) {
    throw new ConflictException(
      'Điểm đón vượt bán kính phục vụ ' + radius + 'km',
    );
  }
}
