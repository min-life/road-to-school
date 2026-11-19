import { Prisma } from '@prisma/client';
import { vietnamToday } from '../schools/school-effective-state.js';
import { ConflictException } from '@nestjs/common';
import { metresBetween } from '../trips/utils/navigation-state.js';
import { provinceForCoordinates } from '../schools/location-province.js';

export function effectiveParking(
  value: Prisma.JsonValue | null | undefined,
  today = vietnamToday(),
) {
  const parking = value as Prisma.JsonObject | null;
  if (!parking || typeof parking !== 'object') {
    return null;
  }
  const scheduled = parking.scheduledChange as Prisma.JsonObject | null;
  const isDue = !!scheduled?.effectiveDate && String(scheduled.effectiveDate) <= today;

  const lat = Number(isDue ? scheduled?.newLatitude : parking.latitude);
  const lng = Number(isDue ? scheduled?.newLongitude : parking.longitude);
  const addressText = String(isDue ? (scheduled?.newAddressText ?? '') : (parking.addressText ?? ''));
  const maxOperatingRadiusKm = Number(parking.maxOperatingRadiusKm ?? 50);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    !Number.isFinite(maxOperatingRadiusKm) ||
    maxOperatingRadiusKm <= 0
  ) {
    return null;
  }

  return {
    latitude: lat,
    longitude: lng,
    addressText,
    maxOperatingRadiusKm,
  };
}

export function configuredParking(value: Prisma.JsonValue | null | undefined, today = vietnamToday()) {
  const effective = effectiveParking(value, today);
  if (!effective) {
    throw new ConflictException('Cần cấu hình bãi trung tâm trước khi lập lịch phục vụ');
  }
  return effective;
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
  db: Pick<Prisma.TransactionClient, 'school' | 'systemSetting'>,
  schoolId: string,
  location: { latitude: number; longitude: number; province?: string | null },
  today = vietnamToday(),
): Promise<void> {
  const school = await db.school.findUnique({ where: { id: schoolId } });
  const setting = await db.systemSetting.findUnique({
    where: { key: 'PARKING_LOT' },
  });
  const parking = configuredParking(setting?.value, today);
  const { latitude, longitude } = parking;

  const schoolProvince = school?.province?.trim();
  let studentProvince = location.province?.trim();
  if (!studentProvince && schoolProvince) {
    studentProvince = (await provinceForCoordinates(location.latitude, location.longitude))?.trim() ?? undefined;
  }

  if (
    schoolProvince &&
    studentProvince &&
    schoolProvince.toLowerCase() !== studentProvince.toLowerCase()
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
