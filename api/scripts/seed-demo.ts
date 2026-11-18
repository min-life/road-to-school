/** Authorized local/demo seed. Default is read-only; --apply requires an exact DB name. */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaClient, Role, RouteDirection, RoutePlanStatus, RouteStopType, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Node 24 runs this .ts script directly; import source utilities without building the API.
const { encodePolyline } = await import(new URL('../src/routes/utils/polyline.util.ts', import.meta.url).href) as typeof import('../src/routes/utils/polyline.util.js');
const { buildTripRouteSnapshot } = await import(new URL('../src/trips/utils/trip-snapshot-resolver.ts', import.meta.url).href) as typeof import('../src/trips/utils/trip-snapshot-resolver.js');
const { combineDateAndTimeUtc, secondsToTimeStr } = await import(new URL('../src/trips/utils/trip-time.util.ts', import.meta.url).href) as typeof import('../src/trips/utils/trip-time.util.js');
const { createDemoIds, validateDemoIds } = await import(new URL('./demo-ids.ts', import.meta.url).href) as typeof import('./demo-ids.js');

const DATASET = 'roadtoschool-demo-v1';
const credentialsPath = fileURLToPath(new URL('../.seed-demo-credentials.json', import.meta.url));
const expected = { schools: 1, users: 11, students: 10, parentLinks: 10, vehicles: 2, plans: 1, routes: 2, stops: 24, trips: 2, attendances: 20 };
class SeedError extends Error {}

const existingManifest = existsSync(credentialsPath) ? JSON.parse(readFileSync(credentialsPath, 'utf8')) as { ids?: unknown } : null;
const demoIds: unknown = existingManifest ? existingManifest.ids : createDemoIds();
validateDemoIds(demoIds);
function id(key: string): string {
  const value = (demoIds as Record<string, string>)[key];
  if (!value) throw new SeedError(`Unknown demo ID key: ${key}`);
  return value;
}

const accounts = [
  { key: 'system', role: Role.SYSTEM_ADMIN, fullName: 'DEMO · Quản trị nhà xe' },
  { key: 'school', role: Role.SCHOOL_ADMIN, fullName: 'DEMO · Quản trị trường' },
  ...[1, 2].map(n => ({ key: `driver${n}`, role: Role.DRIVER, fullName: `DEMO · Tài xế ${n}` })),
  ...[1, 2].map(n => ({ key: `attendant${n}`, role: Role.BUS_ATTENDANT, fullName: `DEMO · Giáo viên phụ xe ${n}` })),
  ...[1, 2, 3, 4, 5].map(n => ({ key: `parent${n}`, role: Role.PARENT, fullName: `DEMO · Phụ huynh ${n}` })),
].map(account => ({ ...account, id: id(`user-${account.key}`), email: `${account.key}@demo.roadtoschool.test` }));
const studentIds = Array.from({ length: 10 }, (_, n) => id(`student-${n + 1}`));
const routeIds = [id('route-to-school'), id('route-to-parking')];
const tripIds = [id('trip-to-school'), id('trip-to-parking')];

function target() {
  const envPath = fileURLToPath(new URL('../.env', import.meta.url));
  if (existsSync(envPath)) process.loadEnvFile(envPath);
  let url: URL;
  try { url = new URL(process.env.DATABASE_URL || ''); }
  catch { throw new SeedError('DATABASE_URL không hợp lệ. Không in URL vì chứa mật khẩu.'); }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !database) throw new SeedError('Cần PostgreSQL URL có tên database.');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || process.env.NODE_ENV === 'production') {
    throw new SeedError('Script chỉ dành cho DB local; không chạy ở production hoặc host từ xa.');
  }
  const expectedDb = process.argv[process.argv.indexOf('--expect-db') + 1];
  if (process.argv.includes('--apply') && (!process.argv.includes('--expect-db') || expectedDb !== database)) {
    throw new SeedError('Khi ghi, cần --apply --expect-db <đúng tên database>.');
  }
  return { hostname: url.hostname, port: url.port || '5432', database };
}

function serviceDate(): string {
  const requested = process.argv[process.argv.indexOf('--date') + 1];
  let date: Date;
  if (process.argv.includes('--date')) {
    if (!requested || !/^\d{4}-\d{2}-\d{2}$/.test(requested)) throw new SeedError('--date cần YYYY-MM-DD.');
    date = new Date(`${requested}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== requested) throw new SeedError('Ngày không tồn tại.');
  } else {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    date = new Date(`${today}T00:00:00Z`);
    do { date.setUTCDate(date.getUTCDate() + 1); } while ([0, 6].includes(date.getUTCDay()));
  }
  if ([0, 6].includes(date.getUTCDay())) throw new SeedError('Bộ mẫu có lịch học thứ Hai–thứ Sáu.');
  return date.toISOString().slice(0, 10);
}

async function counts(db: Prisma.TransactionClient) {
  const values = await Promise.all([
    db.school.count({ where: { id: id('school') } }), db.user.count({ where: { id: { in: accounts.map(a => a.id) } } }),
    db.student.count({ where: { id: { in: studentIds } } }), db.parentStudentLink.count({ where: { studentId: { in: studentIds } } }),
    db.vehicle.count({ where: { id: { in: [id('vehicle-1'), id('vehicle-2')] } } }), db.routePlan.count({ where: { id: id('plan') } }),
    db.route.count({ where: { id: { in: routeIds } } }), db.routeStop.count({ where: { routeId: { in: routeIds } } }),
    db.trip.count({ where: { id: { in: tripIds } } }), db.tripAttendance.count({ where: { tripId: { in: tripIds } } }),
  ]);
  return Object.fromEntries(Object.keys(expected).map((key, index) => [key, values[index]!])) as typeof expected;
}

async function verify(db: Prisma.TransactionClient) {
  const actual = await counts(db);
  if (Object.entries(expected).some(([key, value]) => actual[key as keyof typeof actual] !== value)) {
    throw new SeedError('Bộ dữ liệu DEMO đã tồn tại nhưng không còn đủ cấu trúc; không sửa hoặc ghi đè.');
  }
  return actual;
}

function distance(points: { latitude: number; longitude: number }[]) {
  let meters = 0;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]!, b = points[index]!;
    const dy = (b.latitude - a.latitude) * Math.PI / 180;
    const dx = (b.longitude - a.longitude) * Math.PI / 180 * Math.cos(a.latitude * Math.PI / 180);
    meters += 6371000 * Math.hypot(dx, dy);
  }
  return Math.round(meters);
}

async function createDataset(tx: Prisma.TransactionClient, date: string, passwordHash: string) {
  const start = new Date(`${date}T00:00:00Z`), end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  const school = await tx.school.create({ data: {
    id: id('school'), name: 'DEMO · Trường RoadToSchool', addressText: 'DEMO · Trung tâm TP. Hồ Chí Minh',
    latitude: 10.781, longitude: 106.700, contractStartDate: start, contractEndDate: end,
    weeklySchedule: Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => [day, { start: '07:00', end: '16:00' }])),
  } });
  await tx.user.createMany({ data: accounts.map(account => ({
    id: account.id, email: account.email, fullName: account.fullName, role: account.role, passwordHash,
    phone: account.role === Role.PARENT ? `09000071${account.key.slice(-1).padStart(2, '0')}` : null,
    schoolId: account.role === Role.SCHOOL_ADMIN || account.role === Role.BUS_ATTENDANT ? school.id : null,
    isVerified: true, isActive: true,
  })) });
  const students = Array.from({ length: 10 }, (_, n) => ({
    id: studentIds[n]!, code: `STUD3M0A${String(n + 1).padStart(3, '0')}`, schoolId: school.id,
    fullName: `DEMO · Học sinh ${String(n + 1).padStart(2, '0')}`, guardianPhone: `09000071${String(Math.floor(n / 2) + 1).padStart(2, '0')}`,
    addressText: `DEMO · Điểm đón ${n + 1}, TP. Hồ Chí Minh`, latitude: 10.772 + n * .0007, longitude: 106.694 + n * .0005,
  }));
  await tx.student.createMany({ data: students });
  await tx.parentStudentLink.createMany({ data: students.map((student, n) => ({ id: id(`parent-link-${n}`), parentId: id(`user-parent${Math.floor(n / 2) + 1}`), studentId: student.id })) });
  await tx.vehicle.createMany({ data: [1, 2].map(n => ({
    id: id(`vehicle-${n}`), brand: 'DEMO · Xe 16 chỗ', seatCount: 16, color: 'Vàng',
    licensePlate: `50F-900.0${n}`, normalizedPlate: `50F9000${n}`,
  })) });
  const constraints = { maxRouteDurationMinutes: 60, defaultStopServiceSeconds: 30, geometrySource: 'DEMO_STRAIGHT_LINE_NOT_ROAD_VERIFIED' };
  await tx.routePlan.create({ data: {
    id: id('plan'), schoolId: school.id, name: 'DEMO · Tuyến hai chiều', status: RoutePlanStatus.ACTIVE,
    createdById: id('user-system'), approvedById: id('user-school'), activatedAt: new Date(),
    scheduleScope: { createdAt: new Date().toISOString(), constraints, summary: { assignedBothWaysCount: 10 } },
    routingConstraints: constraints, totalStudents: 10, totalOutboundRoutes: 1, totalReturnRoutes: 1,
  } });
  const setting = await tx.systemSetting.findUnique({ where: { key: 'PARKING_LOT' } });
  const value = setting?.value as { latitude?: number; longitude?: number; addressText?: string } | null;
  const parking = { latitude: value?.latitude ?? 10.776889, longitude: value?.longitude ?? 106.700806, addressText: value?.addressText ?? 'Bãi đỗ xe trung tâm TP. Hồ Chí Minh' };
  for (const index of [0, 1]) {
    const outbound = index === 0, direction = outbound ? RouteDirection.TO_SCHOOL : RouteDirection.TO_PARKING;
    const departureTime = outbound ? '06:30' : '16:00', arrivalTime = outbound ? '07:00' : '16:30';
    const points = [
      { ...(outbound ? parking : school), stopType: outbound ? RouteStopType.PARKING_START : RouteStopType.SCHOOL_DEPARTURE, studentId: null },
      ...(outbound ? students : [...students].reverse()).map(student => ({ ...student, stopType: outbound ? RouteStopType.PICKUP : RouteStopType.DROPOFF, studentId: student.id })),
      { ...(outbound ? school : parking), stopType: outbound ? RouteStopType.SCHOOL_ARRIVAL : RouteStopType.PARKING_END, studentId: null },
    ];
    const departureSeconds = outbound ? 23400 : 57600;
    const route = await tx.route.create({ data: {
      id: routeIds[index]!, routePlanId: id('plan'), schoolId: school.id, name: outbound ? 'DEMO · Chiều đến trường' : 'DEMO · Chiều về bãi', direction,
      proposedVehicleId: id(`vehicle-${index + 1}`), defaultDriverId: id(`user-driver${index + 1}`), defaultBusAttendantId: id(`user-attendant${index + 1}`),
      departureTime, arrivalTime, totalDistanceMeters: distance(points), estimatedDurationSeconds: 1800, routingConstraints: constraints,
      polylineGeometry: encodePolyline(points.map(point => [point.latitude, point.longitude])),
      stops: { create: points.map((point, order) => ({
        id: id(`stop-${index}-${order}`), stopOrder: order, stopType: point.stopType, studentId: point.studentId,
        addressText: point.addressText, latitude: point.latitude, longitude: point.longitude,
        plannedArrivalSeconds: departureSeconds + Math.round(order * 1800 / 11),
        plannedArrivalTime: secondsToTimeStr(departureSeconds + Math.round(order * 1800 / 11)),
      })) },
    }, include: { stops: { orderBy: { stopOrder: 'asc' }, include: { student: { select: { fullName: true } } } } } });
    const snapshot = buildTripRouteSnapshot({
      routeId: route.id, routeName: route.name, direction, schoolId: school.id, schoolName: school.name,
      schoolCoords: school, parkingCoords: parking, polylineGeometry: route.polylineGeometry,
      totalDistanceMeters: route.totalDistanceMeters, estimatedDurationSeconds: 1800,
      departureTime, arrivalTime, routingConstraints: constraints, stops: route.stops, snapshotReason: 'GENERATION',
    });
    await tx.trip.create({ data: {
      id: tripIds[index]!, routeId: route.id, schoolId: school.id, serviceDate: start, direction,
      scheduledStartAt: combineDateAndTimeUtc(date, departureTime), scheduledEndAt: combineDateAndTimeUtc(date, arrivalTime),
      scheduledStartTime: departureTime, scheduledEndTime: arrivalTime, assignedVehicleId: id(`vehicle-${index + 1}`),
      assignedDriverId: id(`user-driver${index + 1}`), assignedBusAttendantId: id(`user-attendant${index + 1}`),
      routeSnapshot: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue,
      attendances: { createMany: { data: students.map(student => ({ studentId: student.id })) } },
    } });
  }
  return verify(tx);
}

const prisma = new PrismaClient({ log: [] });
try {
  const database = target();
  await prisma.$connect();
  const school = await prisma.school.findUnique({ where: { id: id('school') }, select: { name: true } });
  console.log(JSON.stringify({ target: database, dataset: DATASET, mode: process.argv.includes('--apply') ? 'APPLY' : 'READ_ONLY' }));
  if (school) {
    if (school.name !== 'DEMO · Trường RoadToSchool') throw new SeedError('ID đã tồn tại với tên khác. Không ghi đè.');
    console.log(JSON.stringify({ alreadyExists: true, counts: await verify(prisma), credentialsFile: credentialsPath }));
  } else if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ wouldCreate: expected, serviceDate: serviceDate(), note: 'Không ghi DB. Dùng --apply --expect-db <database> khi đã được phép.' }));
  } else {
    if (existsSync(credentialsPath)) throw new SeedError('File credentials đã tồn tại nhưng DB không có bộ DEMO. Giữ file cũ và kiểm tra DB trước khi tiếp tục.');
    const date = serviceDate(), password = `Rts_${randomBytes(16).toString('base64url')}!`;
    const passwordHash = await bcrypt.hash(password, 12);
    // Persist credentials first, so a successful DB commit cannot leave inaccessible accounts.
    const manifest = { dataset: DATASET, target: database, serviceDate: date, state: 'PENDING', ids: demoIds, password, accounts: accounts.map(({ email, role }) => ({ email, role })) };
    writeFileSync(credentialsPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    const result = await prisma.$transaction(tx => createDataset(tx, date, passwordHash), { timeout: 30000 });
    manifest.state = 'CREATED';
    writeFileSync(credentialsPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ created: result, serviceDate: date, credentialsFile: credentialsPath, passwordPrinted: false }));
  }
} catch (error) {
  const code = error && typeof error === 'object' ? Reflect.get(error, 'code') ?? Reflect.get(error, 'errorCode') : undefined;
  console.error(error instanceof SeedError ? error.message : `Seed thất bại (${String(code ?? 'UNKNOWN')}). Không in lỗi thô để bảo vệ credentials.`);
  if (code === 'P2021' || code === 'P2022') console.error('DB thiếu bảng/cột. Cần áp dụng migration đã được phê duyệt trước khi seed.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
