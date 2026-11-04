import { AttendanceStatus, RoutePlanStatus, TripStatus } from '@prisma/client';
import { formatDateToVnYmd } from '../trips/utils/trip-time.util.js';

/** Contract dates are PostgreSQL DATE values, not local timestamps. */
export function contractDate(value: Date | string | undefined | null): string {
  if (!value) return '';
  return typeof value === 'string'
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);
}

export function vietnamToday(now = new Date()): string {
  return formatDateToVnYmd(now);
}

export function isContractExpired(
  contractEndDate: Date | string,
  today = vietnamToday(),
): boolean {
  return contractDate(contractEndDate) < today;
}

export function effectivePlanStatus(
  status: RoutePlanStatus,
  contractEndDate: Date | string,
  today = vietnamToday(),
): RoutePlanStatus {
  if (
    (status === RoutePlanStatus.DRAFT || status === RoutePlanStatus.ACTIVE) &&
    isContractExpired(contractEndDate, today)
  )
    return RoutePlanStatus.CANCELLED;
  return status;
}

export function canServeOnDate(
  school: {
    isActive: boolean;
    contractStartDate: Date | string;
    contractEndDate: Date | string;
  },
  serviceDate: string,
): boolean {
  return (
    school.isActive &&
    contractDate(school.contractStartDate) <= serviceDate &&
    serviceDate <= contractDate(school.contractEndDate)
  );
}

export function requiresAdminFinalization(trip: {
  status: TripStatus;
  attendances: {
    status: AttendanceStatus;
    markedAt: Date | null;
    alightedAt: Date | null;
  }[];
}): boolean {
  return (
    trip.status === TripStatus.IN_PROGRESS ||
    (trip.status === TripStatus.SCHEDULED &&
      trip.attendances.some(
        (a) =>
          a.status !== AttendanceStatus.UNMARKED ||
          a.markedAt !== null ||
          a.alightedAt !== null,
      ))
  );
}
