/** Explicitly authorized local data for the driver replacement UI. No external delivery. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaClient, type Prisma } from '@prisma/client';
const { validateDemoIds } = await import(new URL('./demo-ids.ts', import.meta.url).href) as typeof import('./demo-ids.js');
const { buildTripRouteSnapshot } = await import(new URL('../src/trips/utils/trip-snapshot-resolver.ts', import.meta.url).href) as typeof import('../src/trips/utils/trip-snapshot-resolver.js');
const { combineDateAndTimeUtc } = await import(new URL('../src/trips/utils/trip-time.util.ts', import.meta.url).href) as typeof import('../src/trips/utils/trip-time.util.js');

const fixture = {
  plan: 'b5000000-0000-4000-8000-000000000001',
  outbound: 'b5000000-0000-4000-8000-000000000002',
  inbound: 'b5000000-0000-4000-8000-000000000003',
  trip: 'b5000000-0000-4000-8000-000000000004',
  otp: 'b5000000-0000-4000-8000-000000000005',
  notice: 'b5000000-0000-4000-8000-000000000006',
};
class DemoError extends Error {}
const p = new PrismaClient({ log: [] });
async function secondNotice(ids: Record<string, string>, apply: boolean) {
  const tripId = 'b6000000-0000-4000-8000-000000000001';
  const otpId = 'b6000000-0000-4000-8000-000000000002';
  const noticeId = 'b6000000-0000-4000-8000-000000000003';
  return p.$transaction(async tx => {
    const existing = await tx.leaveNotice.findUnique({ where: { id: noticeId }, include: { trip: true } });
    if (existing) return { alreadyExists: true, noticeId, tripId: existing.tripId, status: existing.status,
      serviceDate: existing.trip.serviceDate.toISOString().slice(0, 10) };
    const source = await tx.trip.findUniqueOrThrow({ where: { id: fixture.trip }, include: {
      route: { include: { routePlan: true } }, attendances: { select: { studentId: true } },
    } });
    if (source.route.routePlan.status !== 'ACTIVE' || source.attendances.length !== 10) throw new DemoError('Phương án demo hoặc roster không còn hợp lệ.');
    const date = new Date(source.serviceDate);
    do { date.setUTCDate(date.getUTCDate() + 1); } while ([0, 6].includes(date.getUTCDay()));
    const ymd = date.toISOString().slice(0, 10);
    if (!source.scheduledStartTime || !source.scheduledEndTime) throw new DemoError('Chuyến demo thiếu giờ vận hành.');
    const start = combineDateAndTimeUtc(ymd, source.scheduledStartTime), end = combineDateAndTimeUtc(ymd, source.scheduledEndTime);
    const users = await tx.user.count({ where: { id: { in: [ids['user-driver1'], ids['user-driver2']] }, role: 'DRIVER', isActive: true } });
    if (users !== 2) throw new DemoError('Tài xế demo không còn khả dụng.');
    const busy = await tx.trip.count({ where: { serviceDate: date, status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      scheduledStartAt: { lt: end }, scheduledEndAt: { gt: start }, OR: [
        { assignedDriverId: { in: [ids['user-driver1'], ids['user-driver2']] } },
        { assignedBusAttendantId: source.assignedBusAttendantId }, { assignedVehicleId: source.assignedVehicleId },
      ] } });
    const leave = await tx.leaveNotice.count({ where: { reportedById: ids['user-driver1'], status: 'PENDING_REPLACEMENT', trip: { serviceDate: date } } });
    const duplicate = await tx.trip.count({ where: { routeId: source.routeId, serviceDate: date } });
    if (busy || leave || duplicate) throw new DemoError('Ngày demo kế tiếp đã có lịch/đơn nghỉ. Không ghi đè dữ liệu hiện có.');
    if (!apply) return { wouldCreate: { trip: 1, attendances: 10, consumedOtp: 1, driverLeaveNotice: 1 }, serviceDate: ymd };
    await tx.trip.create({ data: { id: tripId, routeId: source.routeId, schoolId: source.schoolId, direction: source.direction,
      serviceDate: date, status: 'SCHEDULED', scheduledStartAt: start, scheduledEndAt: end,
      scheduledStartTime: source.scheduledStartTime, scheduledEndTime: source.scheduledEndTime,
      assignedVehicleId: source.assignedVehicleId, assignedBusAttendantId: source.assignedBusAttendantId, assignedDriverId: ids['user-driver2'],
      routeSnapshot: source.routeSnapshot as Prisma.InputJsonValue,
      attendances: { create: source.attendances.map(({ studentId }) => ({ studentId })) },
    } });
    const now = new Date();
    await tx.otpChallenge.create({ data: { id: otpId, userId: ids['user-driver2'], identifier: 'driver2@demo.roadtoschool.test',
      channel: 'EMAIL', purpose: 'LEAVE_NOTICE', otpHash: 'consumed-demo-not-a-valid-otp', consumedAt: now, expiresAt: now } });
    await tx.leaveNotice.create({ data: { id: noticeId, tripId, kind: 'DRIVER', reportedById: ids['user-driver2'],
      otpChallengeId: otpId, status: 'PENDING_REPLACEMENT' } });
    return { created: true, noticeId, tripId, serviceDate: ymd, driver: 'DEMO · Tài xế 2',
      availableReplacement: 'DEMO · Tài xế 1', time: `${source.scheduledStartTime} - ${source.scheduledEndTime}`, roster: 10 };
  }, { timeout: 30000 });
}
async function run() {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
  const url = new URL(process.env.DATABASE_URL || '');
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || process.env.NODE_ENV === 'production') throw new DemoError('Chỉ chạy trên PostgreSQL local.');
  const apply = process.argv.includes('--apply');
  if (apply && (!process.argv.includes('--expect-db') || process.argv[process.argv.indexOf('--expect-db') + 1] !== database)) {
    throw new DemoError('Cần --expect-db khớp chính xác tên database.');
  }
  const manifest = JSON.parse(readFileSync(fileURLToPath(new URL('../.seed-demo-credentials.json', import.meta.url)), 'utf8'));
  const ids = validateDemoIds(manifest.ids);
  if (process.argv.includes('--second-notice')) {
    console.log(JSON.stringify({ database, mode: apply ? 'APPLY' : 'READ_ONLY', ...await secondNotice(ids, apply) }));
    return;
  }
  const existing = await p.leaveNotice.findUnique({ where: { id: fixture.notice }, include: { trip: true } });
  if (existing) {
    console.log(JSON.stringify({ alreadyExists: true, noticeId: existing.id, tripId: existing.tripId,
      noticeStatus: existing.status, tripStatus: existing.trip.status, serviceDate: existing.trip.serviceDate.toISOString().slice(0, 10) }));
    return;
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  do { date.setUTCDate(date.getUTCDate() + 1); } while ([0, 6].includes(date.getUTCDay()));
  const ymd = date.toISOString().slice(0, 10);
  const result = await p.$transaction(async tx => {
    const school = await tx.school.findUniqueOrThrow({ where: { id: ids.school } });
    if (!school.isActive || school.contractStartDate > date || school.contractEndDate < date) throw new DemoError('Trường DEMO không đủ điều kiện hợp đồng.');
    if (await tx.routePlan.count({ where: { schoolId: school.id, status: 'ACTIVE' } })) throw new DemoError('Trường đã có phương án ACTIVE; không tạo thêm phương án trùng.');
    const sourcePlan = await tx.routePlan.findUniqueOrThrow({ where: { id: ids.plan } });
    const sources = await tx.route.findMany({ where: { id: { in: [ids['route-to-school'], ids['route-to-parking']] } },
      include: { stops: { orderBy: { stopOrder: 'asc' }, include: { student: { select: { fullName: true } } } } } });
    const outbound = sources.find(r => r.direction === 'TO_SCHOOL');
    if (sources.length !== 2 || !outbound?.departureTime || !outbound.arrivalTime) throw new DemoError('Thiếu tuyến DEMO gốc.');
    const students = [...new Set(outbound.stops.flatMap(s => s.studentId ? [s.studentId] : []))];
    if (students.length !== 10) throw new DemoError('Roster DEMO gốc không còn đủ 10 học sinh.');
    const staff = await tx.user.findMany({ where: { id: { in: [ids['user-driver1'], ids['user-driver2'], ids['user-attendant1'], ids['user-school'], ids['user-system']] }, isActive: true } });
    if (staff.length !== 5 || !staff.some(u => u.id === ids['user-driver2'] && u.role === 'DRIVER')) throw new DemoError('Nhân sự DEMO không còn hợp lệ.');
    const start = combineDateAndTimeUtc(ymd, outbound.departureTime), end = combineDateAndTimeUtc(ymd, outbound.arrivalTime);
    const busy = await tx.trip.count({ where: { serviceDate: date, status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      scheduledStartAt: { lt: end }, scheduledEndAt: { gt: start }, OR: [
        { assignedDriverId: { in: [ids['user-driver1'], ids['user-driver2']] } },
        { assignedBusAttendantId: ids['user-attendant1'] }, { assignedVehicleId: ids['vehicle-1'] },
      ] } });
    const replacementLeave = await tx.leaveNotice.count({ where: { reportedById: ids['user-driver2'], status: 'PENDING_REPLACEMENT', trip: { serviceDate: date } } });
    if (busy || replacementLeave) throw new DemoError('Nhân sự/xe bận hoặc tài xế thay thế có báo nghỉ.');
    if (!apply) return { wouldCreate: { plan: 1, routes: 2, stops: 24, trips: 1, attendances: 10, consumedOtp: 1, driverLeaveNotice: 1 }, serviceDate: ymd };

    await tx.routePlan.create({ data: { id: fixture.plan, schoolId: school.id,
      name: 'DEMO · Kiểm tra thay thế tài xế', status: 'ACTIVE', createdById: ids['user-system'], approvedById: ids['user-school'], activatedAt: new Date(),
      totalStudents: 10, totalOutboundRoutes: 1, totalReturnRoutes: 1,
      routingConstraints: sourcePlan.routingConstraints as Prisma.InputJsonValue,
      scheduleScope: { source: 'AUTHORIZED_DEMO_DRIVER_REPLACEMENT', summary: { assignedBothWaysCount: 10 } },
    } });
    for (const source of sources) {
      await tx.route.create({ data: { id: source.direction === 'TO_SCHOOL' ? fixture.outbound : fixture.inbound,
        routePlanId: fixture.plan, schoolId: school.id, name: source.direction === 'TO_SCHOOL' ? 'DEMO · Thay tài xế · Chiều đi' : 'DEMO · Thay tài xế · Chiều về', direction: source.direction,
        proposedVehicleId: ids['vehicle-1'], defaultDriverId: ids['user-driver1'], defaultBusAttendantId: ids['user-attendant1'],
        departureTime: source.departureTime, arrivalTime: source.arrivalTime, totalDistanceMeters: source.totalDistanceMeters,
        estimatedDurationSeconds: source.estimatedDurationSeconds, polylineGeometry: source.polylineGeometry,
        routingConstraints: source.routingConstraints as Prisma.InputJsonValue,
        stops: { create: source.stops.map(({ stopOrder, stopType, studentId, addressText, latitude, longitude, plannedArrivalSeconds, plannedArrivalTime }) =>
          ({ stopOrder, stopType, studentId, addressText, latitude, longitude, plannedArrivalSeconds, plannedArrivalTime })) },
      } });
    }
    const route = await tx.route.findUniqueOrThrow({ where: { id: fixture.outbound }, include: { stops: { orderBy: { stopOrder: 'asc' }, include: { student: { select: { fullName: true } } } } } });
    const parking = route.stops.find(s => s.stopType === 'PARKING_START');
    if (!parking) throw new DemoError('Thiếu điểm xuất phát DEMO.');
    const snapshot = buildTripRouteSnapshot({ routeId: route.id, routeName: route.name, direction: route.direction,
      schoolId: school.id, schoolName: school.name, schoolCoords: school, parkingCoords: parking,
      polylineGeometry: route.polylineGeometry, totalDistanceMeters: route.totalDistanceMeters, estimatedDurationSeconds: route.estimatedDurationSeconds,
      departureTime: route.departureTime!, arrivalTime: route.arrivalTime!, routingConstraints: route.routingConstraints,
      stops: route.stops, snapshotReason: 'GENERATION' });
    await tx.trip.create({ data: { id: fixture.trip, routeId: route.id, schoolId: school.id, serviceDate: date, direction: 'TO_SCHOOL', status: 'SCHEDULED',
      scheduledStartAt: start, scheduledEndAt: end, scheduledStartTime: route.departureTime, scheduledEndTime: route.arrivalTime,
      assignedVehicleId: ids['vehicle-1'], assignedDriverId: ids['user-driver1'], assignedBusAttendantId: ids['user-attendant1'],
      routeSnapshot: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue,
      attendances: { create: students.map(studentId => ({ studentId })) },
    } });
    const now = new Date();
    await tx.otpChallenge.create({ data: { id: fixture.otp, userId: ids['user-driver1'], identifier: 'driver1@demo.roadtoschool.test',
      channel: 'EMAIL', purpose: 'LEAVE_NOTICE', otpHash: 'consumed-demo-not-a-valid-otp', consumedAt: now, expiresAt: now } });
    await tx.leaveNotice.create({ data: { id: fixture.notice, tripId: fixture.trip, kind: 'DRIVER', reportedById: ids['user-driver1'],
      otpChallengeId: fixture.otp, status: 'PENDING_REPLACEMENT' } });
    return { created: true, planId: fixture.plan, tripId: fixture.trip, noticeId: fixture.notice, serviceDate: ymd,
      driver: 'DEMO · Tài xế 1', availableReplacement: 'DEMO · Tài xế 2', time: `${route.departureTime} - ${route.arrivalTime}`, roster: students.length };
  }, { timeout: 30000 });
  console.log(JSON.stringify({ database, mode: apply ? 'APPLY' : 'READ_ONLY', ...result }));
}
try { await run(); }
catch (error) { console.error(error instanceof DemoError ? error.message : `Không tạo dữ liệu (${error && typeof error === 'object' ? Reflect.get(error, 'code') || 'UNKNOWN' : 'UNKNOWN'}).`); process.exitCode = 1; }
finally { await p.$disconnect(); }
