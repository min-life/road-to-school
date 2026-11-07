import { Prisma } from '@prisma/client';
import { vietnamToday } from './school-effective-state.js';
import { GeographyQueryDto } from './dto/geography.dto.js';

type LocationInput = {
  province?: unknown;
  provinceId?: unknown;
  wardId?: unknown;
  ward?: unknown;
};
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export function geographyFields(value: LocationInput) {
  return {
    province: text(value.province),
    provinceId: text(value.provinceId),
    wardId: text(value.wardId),
    ward: text(value.ward),
  };
}

export function matchesGeography(
  value: LocationInput,
  query: GeographyQueryDto,
) {
  return (
    (!query.provinceId || value.provinceId === query.provinceId) &&
    (!query.wardId || value.wardId === query.wardId)
  );
}

/** Read effective locations, including changes already due while catch-up is delayed. */
export async function effectiveSchoolLocations(db: Prisma.TransactionClient) {
  const schools = await db.school.findMany({
    select: {
      id: true,
      province: true,
      provinceId: true,
      wardId: true,
      ward: true,
      scheduledChanges: {
        where: {
          type: 'LOCATION',
          status: 'PENDING',
          effectiveDate: { lte: new Date(vietnamToday()) },
        },
        orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
        select: { payload: true },
      },
    },
  });
  return schools.map((school) => {
    const last = school.scheduledChanges.at(-1);
    return {
      id: school.id,
      ...geographyFields(last ? (last.payload as Prisma.JsonObject) : school),
    };
  });
}

/** Build options only from records inside the caller's authorized scope. */
export function locationOptions(rows: LocationInput[], provinceId?: string) {
  const provinces = new Map<string, { id: string; name: string }>();
  const wards = new Map<
    string,
    { id: string; name: string; provinceId: string }
  >();
  for (const row of rows) {
    const value = geographyFields(row);
    if (value.provinceId && value.province)
      provinces.set(value.provinceId, {
        id: value.provinceId,
        name: value.province,
      });
    if (
      value.wardId &&
      value.ward &&
      value.provinceId &&
      (!provinceId || provinceId === value.provinceId)
    ) {
      wards.set(value.provinceId + ':' + value.wardId, {
        id: value.wardId,
        name: value.ward,
        provinceId: value.provinceId,
      });
    }
  }
  const byName = (
    a: { name: string; id: string },
    b: { name: string; id: string },
  ) => a.name.localeCompare(b.name, 'vi') || a.id.localeCompare(b.id);
  return {
    provinces: [...provinces.values()].sort(byName),
    wards: [...wards.values()].sort(byName),
  };
}
