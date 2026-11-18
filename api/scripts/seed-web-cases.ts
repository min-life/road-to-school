/** PO-authorized local UI fixtures. INSERT only, no email/push/API calls, no migration. */
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaClient, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const { encodePolyline } = await import(new URL('../src/routes/utils/polyline.util.ts', import.meta.url).href) as typeof import('../src/routes/utils/polyline.util.js');
const { buildTripRouteSnapshot } = await import(new URL('../src/trips/utils/trip-snapshot-resolver.ts', import.meta.url).href) as typeof import('../src/trips/utils/trip-snapshot-resolver.js');
const { combineDateAndTimeUtc } = await import(new URL('../src/trips/utils/trip-time.util.ts', import.meta.url).href) as typeof import('../src/trips/utils/trip-time.util.js');
const DATASET = 'web-ui-cases-v1';
const manifestPath = fileURLToPath(new URL('../.seed-web-credentials.json', import.meta.url));
class SeedError extends Error {}
type Rows = {
  schools: Prisma.SchoolCreateManyInput[]; users: Prisma.UserCreateManyInput[];
  students: Prisma.StudentCreateManyInput[]; links: Prisma.ParentStudentLinkCreateManyInput[];
  vehicles: Prisma.VehicleCreateManyInput[]; plans: Prisma.RoutePlanCreateManyInput[];
  routes: Prisma.RouteCreateManyInput[]; stops: Prisma.RouteStopCreateManyInput[];
  trips: Prisma.TripCreateManyInput[]; attendances: Prisma.TripAttendanceCreateManyInput[];
  otps: Prisma.OtpChallengeCreateManyInput[]; leaves: Prisma.LeaveNoticeCreateManyInput[];
  requests: Prisma.StudentUpdateRequestCreateManyInput[]; incidents: Prisma.TripIncidentCreateManyInput[];
  notifications: Prisma.NotificationCreateManyInput[]; changes: Prisma.SchoolScheduledChangeCreateManyInput[];
  calendars: Prisma.ServiceCalendarEntryCreateManyInput[]; positions: Prisma.TripLocationPointCreateManyInput[];
};
type Manifest = {
  dataset: string; runId: string; date: string; createdAt: string; state: 'PENDING' | 'CREATED';
  target: { host: string; port: string; database: string }; password: string;
  accounts: { email: string; role: string; active: boolean; schoolId: string | null }[];
  cases: { key: string; id: string; screen: string; label: string; date?: string }[];
  expected: Record<string, number>;
};
const day = (value: string, offset = 0) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
const dateValue = (key: string) => new Date(`${key}T00:00:00Z`);
function schoolDay(base: string, offset: number) {
  let value = base;
  const direction = Math.sign(offset) || 1;
  for (let count = 0; count < Math.abs(offset); count++) {
    do { value = day(value, direction); } while ([0, 6].includes(dateValue(value).getUTCDay()));
  }
  while ([0, 6].includes(dateValue(value).getUTCDay())) value = day(value, direction);
  return value;
}
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));

function build(runId: string, base: string, now: Date, passwordHash: string, parking: { latitude: number; longitude: number; addressText: string }) {
  const rows: Rows = { schools: [], users: [], students: [], links: [], vehicles: [], plans: [], routes: [], stops: [], trips: [], attendances: [], otps: [], leaves: [], requests: [], incidents: [], notifications: [], changes: [], calendars: [], positions: [] };
  const cases: Manifest['cases'] = [];
  const tag = runId.replaceAll('-', '').slice(0, 8);
  function id(key: string) {
    const bytes = createHash('sha256').update(`${DATASET}:${runId}:${key}`).digest().subarray(0, 16);
    bytes[6] = (bytes[6]! & 15) | 64; bytes[8] = (bytes[8]! & 63) | 128;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  const mark = (key: string, screen: string, label: string, date?: string) => {
    cases.push({ key, id: id(key), screen, label: `WEBTEST ${tag} · ${label}`, ...(date ? { date } : {}) });
    return id(key);
  };
  const name = (label: string) => `WEBTEST ${tag} · ${label}`;
  const weekly = { monday: { start: '07:00', end: '16:00' }, tuesday: { start: '07:00', end: '16:00' }, wednesday: { start: '07:00', end: '11:30' }, thursday: { start: '07:00', end: '16:00' }, friday: { start: '07:30', end: '15:30' } };
  const schoolNames = ['Trường đầy đủ dữ liệu', 'Trường thứ hai — kiểm tra phân quyền', 'Trường trống', 'Trường ngừng hoạt động', 'Trường hết hợp đồng', 'Trường hợp đồng tương lai', 'Trường thiếu tọa độ học sinh', ...Array.from({ length: 18 }, (_, n) => `Trường phân trang ${n + 1}`)];
  schoolNames.forEach((label, n) => rows.schools.push({
    id: mark(`school-${n}`, '/admin/schools', label), name: name(label), addressText: `Dữ liệu mô phỏng · cơ sở ${n + 1}, TP. Hồ Chí Minh`,
    latitude: 10.781 + n * .001, longitude: 106.701 + n * .001, province: 'TP. Hồ Chí Minh',
    contractStartDate: dateValue(day(base, n === 5 ? 20 : -180)), contractEndDate: dateValue(day(base, n === 4 ? -1 : 365)),
    weeklySchedule: json(weekly), isActive: n !== 3,
  }));
  let phoneIndex = 0;
  const phoneBase = String(parseInt(tag.slice(0, 5), 16) % 900000 + 100000);
  function user(key: string, role: Prisma.UserCreateManyInput['role'], label: string, school?: number, active = true) {
    const userId = id(`user-${key}`);
    rows.users.push({ id: userId, email: `${key}@wtest-${tag}.roadtoschool.test`, phone: `09${phoneBase}${String(phoneIndex++).padStart(2, '0')}`,
      passwordHash, role, fullName: name(label), schoolId: school === undefined ? null : id(`school-${school}`), isActive: active, isVerified: true });
    return userId;
  }
  const system = user('system', 'SYSTEM_ADMIN', 'Quản trị nhà xe');
  const admin = user('school', 'SCHOOL_ADMIN', 'Quản trị trường đầy đủ', 0);
  user('school-inactive-account', 'SCHOOL_ADMIN', 'Tài khoản quản trị bị khóa', 0, false);
  const otherAdmin = user('school2', 'SCHOOL_ADMIN', 'Quản trị trường thứ hai', 1);
  user('school-empty', 'SCHOOL_ADMIN', 'Quản trị trường trống', 2);
  const inactiveAdmin = user('school-stopped', 'SCHOOL_ADMIN', 'Quản trị trường ngừng hoạt động', 3);
  const expiredAdmin = user('school-expired', 'SCHOOL_ADMIN', 'Quản trị trường hết hợp đồng', 4);
  user('school-future', 'SCHOOL_ADMIN', 'Quản trị trường hợp đồng tương lai', 5);
  const drivers = Array.from({ length: 18 }, (_, n) => user(`driver${n + 1}`, 'DRIVER', `Tài xế ${n + 1}${n === 17 ? ' — ngừng hoạt động' : ''}`, undefined, n !== 17));
  const attendants = Array.from({ length: 20 }, (_, n) => user(`attendant${n + 1}`, 'BUS_ATTENDANT', `Giáo viên phụ xe ${n + 1}`, 0, n !== 19));
  const otherAttendant = user('attendant-other', 'BUS_ATTENDANT', 'Phụ xe trường thứ hai', 1);
  const stoppedAttendant = user('attendant-stopped', 'BUS_ATTENDANT', 'Phụ xe trường ngừng hoạt động', 3);
  const expiredAttendant = user('attendant-expired', 'BUS_ATTENDANT', 'Phụ xe trường hết hợp đồng', 4);
  const parents = Array.from({ length: 8 }, (_, n) => user(`parent${n + 1}`, 'PARENT', `Phụ huynh ${n + 1}`));
  const vehicles = Array.from({ length: 18 }, (_, n) => {
    const number = String((parseInt(tag.slice(0, 4), 16) * 19 + n) % 90000 + 10000);
    const licensePlate = `51B-${number.slice(0, 3)}.${number.slice(3)}`;
    rows.vehicles.push({ id: id(`vehicle-${n}`), brand: name(n === 16 ? 'Xe 2 chỗ — kiểm tra sức chứa' : `Xe ${n + 1}`), licensePlate,
      normalizedPlate: licensePlate.replace(/[^A-Z0-9]/g, ''), color: n % 2 ? 'Trắng' : 'Vàng', seatCount: n === 16 ? 2 : 16, isActive: n !== 17 });
    return id(`vehicle-${n}`);
  });
  const cohorts: Record<number, Prisma.StudentCreateManyInput[]> = {};
  for (const school of [0, 1, 3, 4, 6]) {
    const count = school === 0 ? 48 : 6;
    cohorts[school] = [];
    for (let n = 0; n < count; n++) {
      const missing = school === 6 || (school === 0 && n === 44), disabled = school === 0 && n >= 46;
      const student: Prisma.StudentCreateManyInput = { id: id(`student-${school}-${n}`), code: `STUWT${tag.toUpperCase()}${school}${String(n).padStart(3, '0')}`,
        schoolId: id(`school-${school}`), fullName: name(`Học sinh ${school + 1}.${String(n + 1).padStart(2, '0')}${disabled ? ' — tạm ngừng' : missing ? ' — chưa có địa chỉ' : n === 43 ? ' — tên dài để kiểm tra xuống dòng trên màn hình nhỏ' : ''}`),
        guardianPhone: rows.users.find(item => item.id === parents[n % parents.length])!.phone!, status: disabled ? 'DISABLED' : 'AVAILABLE',
        addressText: missing ? null : `Địa chỉ mô phỏng · Điểm đón ${n + 1}, TP. Hồ Chí Minh`, latitude: missing ? null : 10.77 + n * .0003 + school * .002,
        longitude: missing ? null : 106.69 + n * .0002 + school * .002, province: school === 0 && n === 45 ? 'Đồng Nai' : 'TP. Hồ Chí Minh' };
      rows.students.push(student); cohorts[school]!.push(student);
      rows.links.push({ id: id(`link-${school}-${n}`), parentId: parents[n % parents.length]!, studentId: student.id! });
    }
  }
  const constraints = { maxRouteDurationMinutes: 60, defaultStopServiceSeconds: 60, geometrySource: 'WEBTEST_SIMULATED_NOT_ROAD_VERIFIED' };
  type Group = { students: Prisma.StudentCreateManyInput[]; crew: number; vehicle?: string | null; driver?: string | null; attendant?: string | null };
  const routeInfo = new Map<string, { route: Prisma.RouteCreateManyInput; students: Prisma.StudentCreateManyInput[]; school: number; crew: number }>();
  function plan(key: string, school: number, status: Prisma.RoutePlanCreateManyInput['status'], label: string, groups: Group[], selected?: Prisma.StudentCreateManyInput[], reopt = false) {
    const assigned = groups.flatMap(group => group.students), all = selected ?? assigned;
    const unassigned = all.filter(student => !assigned.some(item => item.id === student.id));
    rows.plans.push({ id: mark(`plan-${key}`, '/admin/routes', label), schoolId: id(`school-${school}`), name: name(label), status,
      createdById: system, totalStudents: assigned.length, totalOutboundRoutes: groups.length, totalReturnRoutes: groups.length,
      scheduleScope: json({ createdAt: now.toISOString(), constraints, summary: { totalSelectedStudents: all.length, assignedBothWaysCount: assigned.length,
        unassignedCount: unassigned.length, coverageRate: all.length ? assigned.length / all.length : 0,
        unassignedStudents: unassigned.map(student => ({ id: student.id, fullName: student.fullName, addressText: student.addressText, reason: 'Dữ liệu mô phỏng: thiếu sức chứa trong phương án kiểm thử', missingDirection: 'BOTH' })) } }),
      routingConstraints: json(constraints), needsReoptimization: reopt, reoptimizationReason: reopt ? 'WEBTEST: cần kiểm tra lại lộ trình' : null,
      ...(status === 'ACTIVE' || status === 'CANCELLED' || status === 'EXPIRED' ? { approvedById: school === 1 ? otherAdmin : school === 4 ? expiredAdmin : school === 3 ? inactiveAdmin : admin, activatedAt: new Date(now.getTime() - 86400000) } : {}),
      ...(status === 'CANCELLED' ? { cancelledById: system, cancelledAt: now, cancellationReason: 'WEBTEST: phương án hủy để xem lịch sử' } : {}),
    });
    groups.forEach((group, n) => {
      for (const direction of ['TO_SCHOOL', 'TO_PARKING'] as const) {
        const routeKey = `${key}-${n}-${direction}`, routeId = id(`route-${routeKey}`);
        const schoolRow = rows.schools[school]!;
        const ordered = direction === 'TO_SCHOOL' ? group.students : [...group.students].reverse();
        const coords = direction === 'TO_SCHOOL' ? [parking, ...ordered, schoolRow] : [schoolRow, ...ordered, parking];
        const departure = direction === 'TO_SCHOOL' ? '06:30' : '16:00', arrival = direction === 'TO_SCHOOL' ? '07:00' : '16:30';
        const start = direction === 'TO_SCHOOL' ? 23400 : 57600;
        const route: Prisma.RouteCreateManyInput = { id: routeId, routePlanId: id(`plan-${key}`), schoolId: schoolRow.id!, name: name(`${label} · ${direction === 'TO_SCHOOL' ? 'Đi' : 'Về'} ${n + 1}`), direction,
          proposedVehicleId: group.vehicle === undefined ? vehicles[group.crew]! : group.vehicle,
          defaultDriverId: group.driver === undefined ? drivers[group.crew]! : group.driver,
          defaultBusAttendantId: group.attendant === undefined ? attendants[group.crew]! : group.attendant,
          totalDistanceMeters: 8500 + n * 700, estimatedDurationSeconds: 1800, departureTime: departure, arrivalTime: arrival,
          polylineGeometry: encodePolyline(coords.map(point => [Number(point.latitude), Number(point.longitude)] as [number, number])), routingConstraints: json(constraints) };
        rows.routes.push(route); routeInfo.set(routeKey, { route, students: ordered, school, crew: group.crew });
        coords.forEach((point, index) => rows.stops.push({ id: id(`stop-${routeKey}-${index}`), routeId, stopOrder: index + 1,
          stopType: index === 0 ? direction === 'TO_SCHOOL' ? 'PARKING_START' : 'SCHOOL_DEPARTURE' : index === coords.length - 1 ? direction === 'TO_SCHOOL' ? 'SCHOOL_ARRIVAL' : 'PARKING_END' : direction === 'TO_SCHOOL' ? 'PICKUP' : 'DROPOFF',
          studentId: index > 0 && index < coords.length - 1 ? ordered[index - 1]!.id! : null,
          addressText: String(point.addressText), latitude: Number(point.latitude), longitude: Number(point.longitude), plannedArrivalSeconds: start + Math.round(index * 1800 / (coords.length - 1)),
          plannedArrivalTime: `${String(Math.floor((start + Math.round(index * 1800 / (coords.length - 1))) / 3600)).padStart(2, '0')}:${String(Math.floor((start + Math.round(index * 1800 / (coords.length - 1))) % 3600 / 60)).padStart(2, '0')}` }));
      }
    });
  }
  plan('active', 0, 'ACTIVE', 'Đang hoạt động — 2 xe', [{ students: cohorts[0]!.slice(0, 6), crew: 0 }, { students: cohorts[0]!.slice(6, 12), crew: 1 }]);
  plan('partial', 0, 'DRAFT', 'Chưa duyệt — chỉ xếp 4/12 học sinh', [{ students: cohorts[0]!.slice(12, 14), crew: 7 }, { students: cohorts[0]!.slice(14, 16), crew: 8 }], cohorts[0]!.slice(12, 24));
  plan('ready', 0, 'DRAFT', 'Đủ phân công — chờ trường duyệt', [{ students: cohorts[0]!.slice(24, 28), crew: 5 }]);
  plan('missing', 0, 'DRAFT', 'Chưa phân xe và nhân sự', [{ students: cohorts[0]!.slice(28, 32), crew: 9, vehicle: null, driver: null, attendant: null }]);
  plan('reopt', 0, 'DRAFT', 'Cần tối ưu lại', [{ students: cohorts[0]!.slice(32, 36), crew: 6 }], undefined, true);
  plan('attendant', 0, 'DRAFT', 'Chờ trường phân giáo viên', [{ students: cohorts[0]!.slice(36, 40), crew: 4, attendant: null }]);
  plan('cancelled', 0, 'CANCELLED', 'Phương án đã hủy', [{ students: cohorts[0]!.slice(0, 4), crew: 10 }]);
  plan('empty', 0, 'DRAFT', 'Phương án không còn tuyến', []);
  plan('other', 1, 'ACTIVE', 'Phương án trường thứ hai', [{ students: cohorts[1]!, crew: 11, attendant: otherAttendant }]);
  plan('stopped', 3, 'CANCELLED', 'Trường ngừng — còn chuyến cần chốt', [{ students: cohorts[3]!, crew: 12, attendant: stoppedAttendant }]);
  plan('expired', 4, 'EXPIRED', 'Phương án hết hạn hợp đồng', [{ students: cohorts[4]!, crew: 13, attendant: expiredAttendant }]);

  function trip(key: string, routeKey: string, date: string, status: Prisma.TripCreateManyInput['status'], mode: 'unmarked' | 'ready' | 'marked' | 'mixed' | 'alighted' | 'excluded' | 'finalization' = 'unmarked', crewOverride?: number) {
    const info = routeInfo.get(routeKey)!; assert.ok(info, routeKey);
    const { route, students, school } = info, crew = crewOverride ?? info.crew;
    const schedule = weekly[['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateValue(date).getUTCDay()] as keyof typeof weekly];
    const endTime = route.direction === 'TO_PARKING' ? schedule?.end || route.departureTime! : schedule?.start || route.arrivalTime!;
    const endSeconds = Number(endTime.slice(0, 2)) * 3600 + Number(endTime.slice(3)) * 60;
    const toTime = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}`;
    const startTime = route.direction === 'TO_SCHOOL' ? toTime(endSeconds - 1800) : endTime;
    const arrivalTime = route.direction === 'TO_SCHOOL' ? endTime : toTime(endSeconds + 1800);
    const startAt = combineDateAndTimeUtc(date, startTime), endAt = combineDateAndTimeUtc(date, arrivalTime);
    const started = status === 'IN_PROGRESS' || status === 'COMPLETED';
    const actualStart = status === 'IN_PROGRESS' ? new Date(now.getTime() - 1200000) : startAt;
    const stops = rows.stops.filter(stop => stop.routeId === route.id).map((stop, index, all) => ({ ...stop, id: stop.id!, student: students.find(student => student.id === stop.studentId),
      plannedArrivalSeconds: Number(startTime.slice(0, 2)) * 3600 + Number(startTime.slice(3)) * 60 + Math.round(index * 1800 / (all.length - 1)),
      plannedArrivalTime: toTime(Number(startTime.slice(0, 2)) * 3600 + Number(startTime.slice(3)) * 60 + Math.round(index * 1800 / (all.length - 1))) }));
    const snapshot = buildTripRouteSnapshot({ routeId: route.id!, routeName: route.name, direction: route.direction, schoolId: route.schoolId, schoolName: rows.schools[school]!.name,
      schoolCoords: rows.schools[school]!, parkingCoords: parking, polylineGeometry: route.polylineGeometry, totalDistanceMeters: route.totalDistanceMeters!, estimatedDurationSeconds: 1800,
      departureTime: startTime, arrivalTime, stops, routingConstraints: constraints, snapshotReason: 'MANUAL' });
    const result: Prisma.TripCreateManyInput = { id: mark(`trip-${key}`, '/admin/trips', key, date), routeId: route.id!, schoolId: route.schoolId, direction: route.direction, serviceDate: dateValue(date), status,
      scheduledStartAt: startAt, scheduledEndAt: endAt, scheduledStartTime: startTime, scheduledEndTime: arrivalTime,
      assignedVehicleId: vehicles[crew]!, assignedDriverId: drivers[crew]!, assignedBusAttendantId: crewOverride === undefined ? route.defaultBusAttendantId! : attendants[crew]!,
      routeSnapshot: json(snapshot), actualStartTime: started ? actualStart : null, actualEndTime: status === 'COMPLETED' ? endAt : null,
      attendantReadyAt: started || mode === 'ready' || mode === 'mixed' ? new Date((started ? actualStart : now).getTime() - 60000) : null,
      arrivedAtSchoolAt: status === 'COMPLETED' && route.direction === 'TO_SCHOOL' ? endAt : null,
      ...(status === 'CANCELLED' ? { cancelledAt: now, cancelledById: system, cancellationReason: 'WEBTEST: chuyến hủy để xem trạng thái' } : {}),
      ...(mode === 'finalization' ? { adminFinalization: json({ state: 'PENDING', trigger: school === 3 ? 'SCHOOL_INACTIVE' : 'CONTRACT_EXPIRED', effectiveDate: base, detectedAt: now.toISOString(), source: 'WEBTEST' }) } : {}),
    };
    rows.trips.push(result);
    students.forEach((student, n) => {
      const attendanceStatus = mode === 'unmarked' || mode === 'ready' || (mode === 'marked' && n > 0) ? 'UNMARKED'
        : n === students.length - 1 && mode !== 'alighted' ? 'ABSENT' : mode === 'mixed' && n === 0 && status !== 'COMPLETED' ? 'UNMARKED' : 'PRESENT';
      const time = started ? actualStart : now;
      rows.attendances.push({ id: id(`attendance-${key}-${n}`), tripId: result.id!, studentId: student.id!, status: attendanceStatus,
        absenceReason: attendanceStatus === 'ABSENT' ? 'WEBTEST: phụ huynh báo nghỉ' : null,
        markedById: attendanceStatus === 'UNMARKED' ? null : result.assignedBusAttendantId, markedAt: attendanceStatus === 'UNMARKED' ? null : time,
        alightedAt: attendanceStatus === 'PRESENT' && (status === 'COMPLETED' || mode === 'alighted' || (mode === 'mixed' && n === 1)) ? new Date(Math.min(now.getTime(), time.getTime() + 300000)) : null,
        ...(mode === 'excluded' && n === 0 ? { excludedAt: now, exclusionReason: 'WEBTEST: học sinh đã gỡ khỏi chuyến' } : {}) });
    });
    return result;
  }
  // Future dates leave ordinary assignment/replacement forms actionable after seeding.
  const nextDate = schoolDay(base, 1);
  const runningDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now.getTime() - 1200000));
  const running = trip('đang chạy — điểm danh hỗn hợp và GPS mô phỏng', 'active-0-TO_SCHOOL', runningDate, 'IN_PROGRESS', 'mixed');
  const editable = trip('chờ xuất phát — chưa điểm danh', 'active-1-TO_SCHOOL', nextDate, 'SCHEDULED');
  trip('phụ xe đã sẵn sàng — khóa đổi phân công', 'active-1-TO_PARKING', nextDate, 'SCHEDULED', 'ready');
  trip('đã ghi điểm danh — khóa đổi phân công', 'active-0-TO_SCHOOL', schoolDay(nextDate, 1), 'SCHEDULED', 'marked', 2);
  const completed = trip('hoàn thành — đã xuống xe', 'active-0-TO_PARKING', schoolDay(base, -2), 'COMPLETED', 'alighted');
  const cancelled = trip('đã hủy — báo nghỉ không còn bố trí', 'cancelled-0-TO_SCHOOL', base, 'CANCELLED');
  trip('học sinh bị loại khỏi roster', 'active-1-TO_PARKING', schoolDay(base, -3), 'COMPLETED', 'excluded');
  const noGps = trip('đang chạy — không có GPS', 'active-1-TO_SCHOOL', runningDate, 'IN_PROGRESS', 'mixed');
  trip('chốt hành chính — trường ngừng hoạt động', 'stopped-0-TO_SCHOOL', runningDate, 'IN_PROGRESS', 'finalization');
  trip('chốt hành chính — hợp đồng hết hạn', 'expired-0-TO_SCHOOL', runningDate, 'IN_PROGRESS', 'finalization');
  trip('chuyến trường thứ hai', 'other-0-TO_SCHOOL', nextDate, 'SCHEDULED');
  for (let n = 0; n < 12; n++) trip(`phân trang lịch ${n + 1}`, n % 2 ? 'active-0-TO_PARKING' : 'active-0-TO_SCHOOL', schoolDay(base, -4 - n), 'COMPLETED', n % 2 ? 'alighted' : 'mixed');
  const leaveTrips = Array.from({ length: 10 }, (_, n) => trip(`báo nghỉ ${n + 1}`, n % 2 ? 'active-1-TO_PARKING' : 'active-1-TO_SCHOOL', schoolDay(nextDate, 2 + n), n === 7 ? 'CANCELLED' : 'SCHEDULED'));
  for (const [n, kind, status] of [
    [0, 'STUDENT', 'RECORDED'], [1, 'STUDENT', 'WITHDRAWN'],
    [2, 'DRIVER', 'PENDING_REPLACEMENT'], [3, 'BUS_ATTENDANT', 'PENDING_REPLACEMENT'],
    [4, 'DRIVER', 'REPLACED'], [5, 'BUS_ATTENDANT', 'REPLACED'],
    [6, 'DRIVER', 'WITHDRAWN'], [7, 'DRIVER', 'TRIP_CANCELLED'],
    [8, 'BUS_ATTENDANT', 'WITHDRAWN'], [9, 'BUS_ATTENDANT', 'TRIP_CANCELLED'],
  ] as const) {
    const target = leaveTrips[n]!;
    if (status === 'TRIP_CANCELLED') { target.status = 'CANCELLED'; target.cancelledAt = now; target.cancelledById = system; target.cancellationReason = 'WEBTEST: hủy chuyến có báo nghỉ'; }
    const student = cohorts[0]![6]!, original = kind === 'STUDENT' ? parents[6 % parents.length]! : kind === 'DRIVER' ? target.assignedDriverId : target.assignedBusAttendantId;
    const replacement = kind === 'DRIVER' ? drivers[3]! : attendants[3]!;
    const reporter = rows.users.find(user => user.id === original)!;
    const otp = id(`otp-${n}`), consumed = new Date(now.getTime() - 120000);
    rows.otps.push({ id: otp, userId: original, studentId: kind === 'STUDENT' ? student.id! : null, identifier: reporter.email!, channel: 'EMAIL', purpose: 'LEAVE_NOTICE',
      otpHash: 'WEBTEST-CONSUMED-NOT-A-REAL-OTP', payloadHash: `WEBTEST:${runId}:${n}`, attempts: 0, consumedAt: consumed, expiresAt: new Date(now.getTime() - 60000) });
    rows.leaves.push({ id: mark(`leave-${n}`, '/admin/leave-notices', `${kind} — ${status}`, new Date(target.serviceDate).toISOString().slice(0, 10)), tripId: target.id!, kind, status, reportedById: original,
      studentId: kind === 'STUDENT' ? student.id! : null, otpChallengeId: otp,
      ...(status === 'REPLACED' ? { replacementUserId: replacement, processedById: kind === 'DRIVER' ? system : admin, processedAt: now } : {}),
      ...(status === 'WITHDRAWN' ? { cancelledAt: now, cancelledById: original } : {}),
      ...(status === 'TRIP_CANCELLED' ? { processedById: system, processedAt: now } : {}),
      ...(kind === 'STUDENT' ? { attendanceBefore: json({ status: 'UNMARKED', markedAt: null, markedById: null, absenceReason: null, alightedAt: null }) } : {}) });
    if (kind === 'STUDENT' && status === 'RECORDED') {
      const attendance = rows.attendances.find(row => row.tripId === target.id && row.studentId === student.id)!;
      attendance.status = 'ABSENT'; attendance.absenceReason = 'Phụ huynh xin nghỉ'; attendance.markedById = original; attendance.markedAt = now;
    }
    if (status === 'REPLACED') { if (kind === 'DRIVER') target.assignedDriverId = replacement; else target.assignedBusAttendantId = replacement; }
  }

  const requestStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
  for (const type of ['ADDRESS_UPDATE', 'INFORMATION_UPDATE'] as const) for (const [index, status] of requestStatuses.entries()) {
    const studentIndex = type === 'ADDRESS_UPDATE' ? status === 'APPROVED' ? 41 : 8 + index : 40 + index;
    const student = cohorts[0]![studentIndex]!;
    const before = type === 'ADDRESS_UPDATE' ? { addressText: student.addressText, latitude: student.latitude, longitude: student.longitude } : { fullName: student.fullName, guardianPhone: student.guardianPhone };
    const proposed = type === 'ADDRESS_UPDATE' ? { addressText: `WEBTEST: điểm đón đề nghị ${index + 1}`, latitude: Number(student.latitude) + .001, longitude: Number(student.longitude) + .001 }
      : { fullName: name(`Học sinh đã cập nhật ${index + 1}`), guardianPhone: student.guardianPhone };
    if (status === 'APPROVED') Object.assign(student, proposed);
    rows.requests.push({ id: mark(`request-${type}-${status}`, '/admin/requests', `${type} — ${status}`), schoolId: student.schoolId, studentId: student.id!, parentId: parents[studentIndex % parents.length]!,
      type, status, beforeData: json(before), proposedData: json(proposed),
      ...(status === 'APPROVED' ? { resolution: json({ outcome: 'DIRECT_UPDATE', source: 'WEBTEST' }), reviewedById: type === 'ADDRESS_UPDATE' ? system : admin, reviewedAt: now } : {}),
      ...(status === 'REJECTED' ? { reviewedById: type === 'ADDRESS_UPDATE' ? system : admin, reviewedAt: now, rejectionReason: 'WEBTEST: thông tin cần xác minh lại' } : {}) });
  }
  // An unassigned student gives School Admin an actionable direct-address request.
  const freeStudent = cohorts[0]![42]!;
  rows.requests.push({ id: mark('request-unassigned-address', '/admin/requests', 'Đổi địa chỉ học sinh chưa phân tuyến'), schoolId: freeStudent.schoolId, studentId: freeStudent.id!, parentId: parents[42 % parents.length]!, type: 'ADDRESS_UPDATE', status: 'PENDING',
    beforeData: json({ addressText: freeStudent.addressText, latitude: freeStudent.latitude, longitude: freeStudent.longitude }), proposedData: json({ addressText: 'WEBTEST: địa chỉ mới chưa phân tuyến', latitude: 10.782, longitude: 106.702 }) });

  const incidentTypes = ['ATTENDANT_MISSING', 'DRIVER_MISSING', 'OFF_ROUTE', 'LATE_STOP', 'NO_GUARDIAN_AT_STOP', 'TRAFFIC_DELAY', 'GPS_SIGNAL_LOST'] as const;
  incidentTypes.forEach((type, n) => {
    const target = n < 2 ? trip(`sự cố thiếu nhân sự ${n + 1}`, 'active-1-TO_SCHOOL', schoolDay(nextDate, 12 + n), 'SCHEDULED') : n === 6 ? noGps : running;
    const stop = rows.stops.find(stop => stop.routeId === target.routeId && stop.studentId)!;
    const status = n < 2 ? 'WAITING_ASSIGNMENT' : n % 2 ? 'CONFIRMED' : 'WAITING_CONFIRMATION';
    rows.incidents.push({ id: mark(`incident-${type}`, '/admin/incidents', type), tripId: target.id!, type, status,
      description: name(`${type} — dữ liệu sự cố mô phỏng, không phải detector thực tế`), dedupeKey: `${DATASET}:${runId}:${type}`, reportedById: n < 2 ? type === 'DRIVER_MISSING' ? target.assignedBusAttendantId : target.assignedDriverId : n > 3 ? target.assignedDriverId : null,
      context: json({ source: 'WEBTEST_SIMULATED', ...(n < 2 ? { expectedAssigneeId: type === 'DRIVER_MISSING' ? target.assignedDriverId : target.assignedBusAttendantId } : {}),
        ...(n === 6 ? {} : { latitude: stop.latitude, longitude: stop.longitude, studentId: stop.studentId }),
        ...(type === 'OFF_ROUTE' ? { distanceMeters: 420, thresholdMeters: 100, durationSeconds: 35, sampleCount: 8, detectedAt: now.toISOString() } : {}),
        ...(type === 'LATE_STOP' ? { delaySeconds: 720, thresholdSeconds: 300, durationSeconds: 35, stopId: stop.id, stopOrder: stop.stopOrder, stopAddress: stop.addressText,
          plannedArrivalAt: now.toISOString(), estimatedArrivalAt: new Date(now.getTime() + 720000).toISOString() } : {}) }),
      ...(status === 'CONFIRMED' ? { processedById: system, processedAt: now, resolution: json({ action: 'CONFIRMED', reason: 'WEBTEST: đã kiểm tra nguyên nhân' }) } : {}) });
  });
  for (const [n, status] of ['RESOLVED', 'CLOSED'].entries()) rows.incidents.push({ id: mark(`incident-history-${n}`, '/admin/incidents', `Sự cố nhân sự — ${status}`), tripId: completed.id!, type: 'DRIVER_MISSING', status: status as 'RESOLVED' | 'CLOSED',
    dedupeKey: `${DATASET}:${runId}:history:${n}`, description: name('Sự cố lịch sử đã xử lý'), context: json({ source: 'WEBTEST_SIMULATED' }), processedById: system, processedAt: now, resolution: json({ action: 'ARRIVED', reason: 'WEBTEST: tài xế đã có mặt' }) });

  for (const [n, type, status, offset] of [[0, 'SCHEDULE', 'PENDING', 14], [1, 'LOCATION', 'PENDING', 21], [2, 'INACTIVE', 'PENDING', 35], [3, 'INACTIVE', 'CANCELLED', 30], [4, 'SCHEDULE', 'APPLIED', -10], [5, 'LOCATION', 'FAILED', -2]] as const) {
    const payload = type === 'SCHEDULE' ? { weeklySchedule: weekly } : type === 'LOCATION' ? { addressText: name('Vị trí trường đã hẹn'), latitude: 10.79, longitude: 106.71 } : { isActive: false };
    rows.changes.push({ id: mark(`change-${n}`, '/admin/schools', `${type} — ${status}`, day(base, offset)), schoolId: id('school-0'), type, status, effectiveDate: dateValue(day(base, offset)), payload: json(payload), createdById: system,
      createdAt: new Date(now.getTime() - (status === 'APPLIED' ? 20 : 1) * 86400000),
      ...(status === 'APPLIED' ? { appliedAt: dateValue(day(base, -10)) } : {}), ...(status === 'CANCELLED' ? { cancelledAt: now } : {}),
      ...(status === 'FAILED' ? { lastError: 'WEBTEST: lỗi áp dụng mô phỏng để kiểm tra hiển thị' } : {}) });
  }
  // Only school-specific entries affect the new fixture school. Operator entry is in 2098.
  const calendarCases = [
    { kind: 'HOLIDAY', status: 'APPROVED', calendar: 'SOLAR', recurrence: 'ONCE', offset: 50 },
    { kind: 'HOLIDAY', status: 'APPROVED', calendar: 'SOLAR', recurrence: 'ANNUAL', offset: 80 },
    { kind: 'HOLIDAY', status: 'APPROVED', calendar: 'LUNAR', recurrence: 'ANNUAL', offset: 90 },
    { kind: 'HOLIDAY', status: 'CANCELLED', calendar: 'SOLAR', recurrence: 'ONCE', offset: 51 },
    ...['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((status, n) => ({ kind: 'MAKEUP', status, calendar: 'SOLAR', recurrence: 'ONCE', offset: 55 + n })),
  ];
  calendarCases.forEach((item, n) => {
    const [year, month, dayNumber] = day(base, item.offset).split('-').map(Number);
    rows.calendars.push({ id: mark(`calendar-${n}`, '/admin/calendar', `${item.kind} ${item.status} ${item.calendar} ${item.recurrence}`), schoolId: id('school-0'), title: name(`${item.kind} ${item.status} ${item.calendar} ${item.recurrence}`),
      kind: item.kind, status: item.status, calendar: item.calendar, recurrence: item.recurrence, year: item.recurrence === 'ANNUAL' ? null : year!, month: item.calendar === 'LUNAR' ? 1 : month!, day: item.calendar === 'LUNAR' ? 1 : dayNumber!,
      createdById: admin, ...(item.kind === 'MAKEUP' ? { startTime: '07:30', endTime: '15:30' } : {}),
      ...(item.status === 'APPROVED' && item.kind === 'MAKEUP' || item.status === 'REJECTED' ? { reviewedById: system, reviewedAt: now } : {}),
      ...(item.status === 'REJECTED' ? { reason: 'WEBTEST: chưa đủ điều kiện vận hành' } : {}), ...(item.status === 'CANCELLED' ? { cancelledAt: now } : {}) });
  });
  rows.calendars.push({ id: mark('calendar-operator', '/admin/calendar', 'Ngày nghỉ nhà xe năm 2098 — không ảnh hưởng lịch hiện tại'), schoolId: null, title: name('Ngày nghỉ nhà xe mô phỏng năm 2098'),
    kind: 'HOLIDAY', status: 'APPROVED', calendar: 'SOLAR', recurrence: 'ONCE', year: 2098, month: 12, day: 31, createdById: system });

  const targets = [{ type: 'PLAN', id: id('plan-ready') }, { type: 'TRIP', id: editable.id! }, { type: 'INCIDENT', id: id('incident-DRIVER_MISSING') }, { type: 'LEAVE', id: id('leave-2') }, { type: 'REQUEST', id: id('request-ADDRESS_UPDATE-PENDING') }, { type: 'TRIP', id: id('notification-unavailable-target') }];
  for (const recipient of [system, admin]) for (let n = 0; n < 26; n++) {
    const target = targets[n % targets.length]!;
    rows.notifications.push({ id: id(`notification-${recipient}-${n}`), userId: recipient, eventKey: `${DATASET}:${runId}:${recipient}:${n}`,
      type: n % 3 ? 'ASSIGNMENT' : 'TRIP_INCIDENT', title: name(`Thông báo ${n + 1} — ${target.type}`), body: 'Thông báo mô phỏng để kiểm tra đã đọc/chưa đọc, phân trang và mở đối tượng.',
      targetType: target.type, targetId: target.id, context: json({ source: 'WEBTEST_SIMULATED' }), readAt: n % 3 === 0 ? now : null,
      createdAt: new Date(now.getTime() - n * 60000), pushState: 'NONE' });
  }
  const run = id('gps-run-simulated');
  const gpsStops = rows.stops.filter(stop => stop.routeId === running.routeId);
  for (let n = 0; n < 18; n++) {
    const point = gpsStops[Math.min(gpsStops.length - 1, Math.floor(n / 3))]!;
    rows.positions.push({ tripId: running.id!, sequence: n + 1, latitude: point.latitude + .00001 * (n % 3), longitude: point.longitude,
      recordedAt: new Date(now.getTime() - (18 - n) * 30000), runId: run });
  }
  // Disjoint segments must remain disjoint on the recorded-track UI.
  rows.positions.push({ tripId: running.id!, sequence: 19, latitude: 10.781, longitude: 106.701, recordedAt: new Date(now.getTime() - 5000), runId: id('gps-run-after-gap') });
  return { rows, cases, id, tag };
}

function validate(rows: Rows) {
  const uuid4 = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
  for (const [table, entries] of Object.entries(rows)) {
    if (table === 'positions') continue;
    assert.equal(new Set(entries.map(row => (row as { id: string }).id)).size, entries.length, `Duplicate ID: ${table}`);
    entries.forEach(row => assert.match((row as { id: string }).id, uuid4));
  }
  assert.equal(new Set(rows.users.map(row => row.phone)).size, rows.users.length);
  assert.equal(new Set(rows.users.map(row => row.email)).size, rows.users.length);
  assert.equal(new Set(rows.trips.map(row => `${row.routeId}:${new Date(row.serviceDate).toISOString()}`)).size, rows.trips.length);
  assert.equal(new Set(rows.attendances.map(row => `${row.tripId}:${row.studentId}`)).size, rows.attendances.length);
  for (const trip of rows.trips) {
    const route = rows.routes.find(row => row.id === trip.routeId)!;
    assert.ok(route && route.schoolId === trip.schoolId);
    assert.ok(rows.vehicles.some(row => row.id === trip.assignedVehicleId));
    assert.ok(rows.users.some(row => row.id === trip.assignedDriverId && row.role === 'DRIVER'));
    assert.ok(rows.users.some(row => row.id === trip.assignedBusAttendantId && row.role === 'BUS_ATTENDANT' && row.schoolId === trip.schoolId));
    const snapshot = trip.routeSnapshot as { stops: { studentId?: string }[] };
    const ids = new Set(snapshot.stops.filter(stop => stop.studentId).map(stop => stop.studentId));
    assert.equal(rows.attendances.filter(row => row.tripId === trip.id).length, ids.size);
    assert.ok(rows.attendances.filter(row => row.tripId === trip.id).every(row => ids.has(row.studentId)));
    if (trip.status === 'COMPLETED') assert.ok(rows.attendances.filter(row => row.tripId === trip.id && !row.excludedAt).every(row => row.status !== 'UNMARKED' && (row.status !== 'PRESENT' || row.alightedAt)));
  }
  for (const leave of rows.leaves) assert.ok(rows.otps.some(row => row.id === leave.otpChallengeId && row.consumedAt));
  for (const request of rows.requests) assert.ok(rows.links.some(link => link.studentId === request.studentId && link.parentId === request.parentId));
  assert.deepEqual(new Set(rows.trips.map(row => row.status)), new Set(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']));
  assert.deepEqual(new Set(rows.attendances.map(row => row.status)), new Set(['UNMARKED', 'PRESENT', 'ABSENT']));
  assert.equal(new Set(rows.incidents.map(row => row.type)).size, 7);
  assert.equal(new Set(rows.leaves.map(row => row.status)).size, 5);
  assert.equal(new Set(rows.requests.map(row => row.status)).size, 4);
}

async function scopedCounts(db: Prisma.TransactionClient, rows: Rows) {
  const ids = (items: { id?: string }[]) => ({ id: { in: items.map(row => row.id!) } });
  const values = await Promise.all([
    db.school.count({ where: ids(rows.schools) }), db.user.count({ where: ids(rows.users) }), db.student.count({ where: ids(rows.students) }), db.parentStudentLink.count({ where: ids(rows.links) }),
    db.vehicle.count({ where: ids(rows.vehicles) }), db.routePlan.count({ where: ids(rows.plans) }), db.route.count({ where: ids(rows.routes) }), db.routeStop.count({ where: ids(rows.stops) }),
    db.trip.count({ where: ids(rows.trips) }), db.tripAttendance.count({ where: ids(rows.attendances) }), db.otpChallenge.count({ where: ids(rows.otps) }), db.leaveNotice.count({ where: ids(rows.leaves) }),
    db.studentUpdateRequest.count({ where: ids(rows.requests) }), db.tripIncident.count({ where: ids(rows.incidents) }), db.notification.count({ where: ids(rows.notifications) }),
    db.schoolScheduledChange.count({ where: ids(rows.changes) }), db.serviceCalendarEntry.count({ where: ids(rows.calendars) }),
    db.tripLocationPoint.count({ where: { tripId: { in: [...new Set(rows.positions.map(row => row.tripId))] }, runId: { in: [...new Set(rows.positions.map(row => row.runId))] } } }),
  ]);
  return Object.fromEntries(Object.keys(rows).map((key, n) => [key, values[n]!])) as Record<string, number>;
}
async function insert(db: Prisma.TransactionClient, rows: Rows) {
  await db.school.createMany({ data: rows.schools }); await db.user.createMany({ data: rows.users });
  await db.student.createMany({ data: rows.students }); await db.parentStudentLink.createMany({ data: rows.links });
  await db.vehicle.createMany({ data: rows.vehicles }); await db.routePlan.createMany({ data: rows.plans });
  await db.route.createMany({ data: rows.routes }); await db.routeStop.createMany({ data: rows.stops });
  await db.trip.createMany({ data: rows.trips }); await db.tripAttendance.createMany({ data: rows.attendances });
  await db.otpChallenge.createMany({ data: rows.otps }); await db.leaveNotice.createMany({ data: rows.leaves });
  await db.studentUpdateRequest.createMany({ data: rows.requests }); await db.tripIncident.createMany({ data: rows.incidents });
  await db.notification.createMany({ data: rows.notifications }); await db.schoolScheduledChange.createMany({ data: rows.changes });
  await db.serviceCalendarEntry.createMany({ data: rows.calendars }); await db.tripLocationPoint.createMany({ data: rows.positions });
}

async function main() {
  const now = new Date();
  const fallbackParking = { latitude: 10.865432, longitude: 106.789123, addressText: 'Bãi xe mặc định API — vị trí mô phỏng nếu chưa cấu hình' };
  if (process.argv.includes('--self-check')) {
    const { rows } = build('d91f3331-c372-477b-a281-d893be0dc900', '2026-11-06', new Date('2026-11-06T03:00:00Z'), 'self-check-not-a-password', fallbackParking);
    validate(rows);
    console.log(JSON.stringify({ selfCheck: 'PASS', databaseAccessed: false, rows: Object.fromEntries(Object.entries(rows).map(([key, entries]) => [key, entries.length])) }));
    return;
  }
  const envPath = fileURLToPath(new URL('../.env', import.meta.url));
  if (existsSync(envPath)) process.loadEnvFile(envPath);
  const url = new URL(process.env.DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || process.env.NODE_ENV === 'production') throw new SeedError('Chỉ cho phép PostgreSQL local, không production.');
  const target = { host: url.hostname, port: url.port || '5432', database: decodeURIComponent(url.pathname.slice(1)) };
  const apply = process.argv.includes('--apply');
  if (apply && (!process.argv.includes('--expect-db') || process.argv[process.argv.indexOf('--expect-db') + 1] !== target.database)) throw new SeedError('Cần --apply --expect-db <đúng tên DB>.');
  const old: Manifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, '')) : null;
  if (old && (old.dataset !== DATASET || JSON.stringify(old.target) !== JSON.stringify(target))) throw new SeedError('Manifest thuộc bộ hoặc DB khác. Không ghi đè.');
  const base = old?.date ?? (process.argv.includes('--date') ? process.argv[process.argv.indexOf('--date') + 1]! : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base) || dateValue(base).toISOString().slice(0, 10) !== base) throw new SeedError('Ngày cần YYYY-MM-DD hợp lệ.');
  const db = new PrismaClient({ log: [] });
  try {
    const setting = await db.systemSetting.findUnique({ where: { key: 'PARKING_LOT' } });
    const value = setting?.value as typeof fallbackParking | undefined;
    const parking = value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) ? value : fallbackParking;
    const runId = old?.runId ?? randomUUID(), password = old?.password ?? `WTest_${randomBytes(18).toString('base64url')}!`;
    const createdAt = old?.createdAt ?? now.toISOString();
    const { rows, cases, id } = build(runId, base, new Date(createdAt), apply && !old ? await bcrypt.hash(password, 12) : 'not-used-on-read-or-rerun', parking);
    validate(rows);
    const expected = Object.fromEntries(Object.entries(rows).map(([key, entries]) => [key, entries.length]));
    const counts = await scopedCounts(db, rows);
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    console.log(JSON.stringify({ dataset: DATASET, target, mode: apply ? 'APPLY' : 'READ_ONLY', date: base }));
    if (total > 0) {
      if (!old || Object.entries(old.expected).some(([key, n]) => counts[key] !== n)) throw new SeedError('Bộ WEBTEST đã bị sửa/xóa một phần. Không tự phục hồi hoặc ghi đè.');
      if (process.argv.includes('--refresh-gps')) {
        if (!apply) throw new SeedError('--refresh-gps cần --apply --expect-db vì sẽ thêm một GPS mô phỏng mới.');
        const fixture = old.cases.find(item => item.key.startsWith('trip-') && item.label.includes('GPS mô phỏng'));
        if (!fixture) throw new SeedError('Manifest thiếu chuyến GPS mô phỏng.');
        await db.$transaction(async tx => {
          const trip = await tx.trip.findUniqueOrThrow({ where: { id: fixture.id } });
          if (trip.status !== 'IN_PROGRESS') throw new SeedError('Chuyến test không còn đang chạy. Không đổi trạng thái để tạo GPS.');
          const last = await tx.tripLocationPoint.findFirst({ where: { tripId: fixture.id }, orderBy: { sequence: 'desc' } });
          if (!last) throw new SeedError('Thiếu GPS mô phỏng trước đó.');
          await tx.tripLocationPoint.create({ data: { tripId: fixture.id, sequence: last.sequence + 1, latitude: last.latitude, longitude: last.longitude, recordedAt: new Date(), runId: id('gps-pulse') } });
        }, { isolationLevel: 'Serializable' });
        console.log(JSON.stringify({ simulatedGpsAdded: 1, tripId: fixture.id, note: 'Fresh trong khoảng 15 giây, sau đó tự thành stale; không phải GPS thực.' }));
        return;
      }
      if (apply && old.state === 'PENDING') writeFileSync(manifestPath, JSON.stringify({ ...old, state: 'CREATED' }, null, 2), { mode: 0o600 });
      console.log(JSON.stringify({ alreadyExists: true, counts, credentialsFile: manifestPath, writes: 0 }));
      return;
    }
    if (old) throw new SeedError('Manifest tồn tại nhưng DB thiếu bộ WEBTEST. Giữ file và kiểm tra DB, không tạo lại tự động.');
    if (!apply) { console.log(JSON.stringify({ wouldCreate: expected, globalParkingUntouched: true, note: 'Mặc định chỉ đọc. --apply --expect-db khi được PO cho phép.' })); return; }
    const manifest: Manifest = { dataset: DATASET, runId, date: base, createdAt, state: 'PENDING', target, password, cases, expected,
      accounts: rows.users.map(row => ({ email: row.email!, role: row.role, active: row.isActive ?? true, schoolId: row.schoolId ?? null })) };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600, flag: 'wx' });
    const actual = await db.$transaction(async tx => {
      await insert(tx, rows);
      const actual = await scopedCounts(tx, rows);
      assert.deepEqual(actual, expected);
      return actual;
    }, { timeout: 60000, isolationLevel: 'Serializable' });
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, state: 'CREATED' }, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ created: actual, credentialsFile: manifestPath, passwordPrinted: false, existingRecordsUpdated: 0, externalRequests: 0 }));
  } finally { await db.$disconnect(); }
}
main().catch(error => {
  if (process.argv.includes('--self-check')) console.error(error instanceof Error ? error.message : 'Self-check failed');
  console.error(error instanceof SeedError ? error.message : `Seed thất bại (${String(error?.code ?? error?.errorCode ?? 'SELF_CHECK_OR_UNKNOWN')}); không in lỗi thô/credentials.`);
  process.exitCode = 1;
});
