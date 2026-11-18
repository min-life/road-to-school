/** Authorized local/demo workflow fixtures. Read-only unless --apply uses exact local DB. */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  AttendanceStatus, DeliveryChannel, LeaveNoticeKind, LeaveNoticeStatus, OtpPurpose,
  PrismaClient, RequestStatus, RequestType, TripIncidentStatus, TripIncidentType,
  type Prisma,
} from '@prisma/client';
const { validateDemoIds } = await import(new URL('./demo-ids.ts', import.meta.url).href) as typeof import('./demo-ids.js');

const DATASET = 'roadtoschool-demo-workflows-v1';
const credentialsPath = fileURLToPath(new URL('../.seed-demo-credentials.json', import.meta.url));
const expected = { otpChallenges: 4, leaveNotices: 4, updateRequests: 3, incidents: 4 };
const fixtureIds = {
  otpStudentRecorded: 'a1000000-0000-4000-8000-000000000001', otpStudentWithdrawn: 'a1000000-0000-4000-8000-000000000002',
  otpDriver: 'a1000000-0000-4000-8000-000000000003', otpAttendant: 'a1000000-0000-4000-8000-000000000004',
  leaveStudentRecorded: 'a2000000-0000-4000-8000-000000000001', leaveStudentWithdrawn: 'a2000000-0000-4000-8000-000000000002',
  leaveDriver: 'a2000000-0000-4000-8000-000000000003', leaveAttendant: 'a2000000-0000-4000-8000-000000000004',
  requestPendingPickup: 'a3000000-0000-4000-8000-000000000001', requestRejectedDropoff: 'a3000000-0000-4000-8000-000000000002',
  requestCancelled: 'a3000000-0000-4000-8000-000000000003',
  incidentAttendant: 'a4000000-0000-4000-8000-000000000001', incidentDriver: 'a4000000-0000-4000-8000-000000000002',
  incidentOffRoute: 'a4000000-0000-4000-8000-000000000003', incidentLateStop: 'a4000000-0000-4000-8000-000000000004',
} as const;
class SeedError extends Error {}

function target() {
  const envPath = fileURLToPath(new URL('../.env', import.meta.url));
  if (existsSync(envPath)) process.loadEnvFile(envPath);
  let url: URL;
  try { url = new URL(process.env.DATABASE_URL || ''); } catch { throw new SeedError('DATABASE_URL không hợp lệ.'); }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !database) throw new SeedError('Cần PostgreSQL URL có tên database.');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || process.env.NODE_ENV === 'production') {
    throw new SeedError('Script chỉ dành cho DB local, không chạy ở production hoặc host từ xa.');
  }
  const expectedDb = process.argv[process.argv.indexOf('--expect-db') + 1];
  if (process.argv.includes('--apply') && (!process.argv.includes('--expect-db') || expectedDb !== database)) {
    throw new SeedError('Khi ghi, cần --apply --expect-db <đúng tên database>.');
  }
  return { hostname: url.hostname, port: url.port || '5432', database };
}

function loadDemoIds(): Record<string, string> {
  if (!existsSync(credentialsPath)) throw new SeedError('Chưa có manifest bộ DEMO gốc. Chạy seed-demo.ts trước.');
  const manifest = JSON.parse(readFileSync(credentialsPath, 'utf8')) as { ids?: unknown };
  return validateDemoIds(manifest.ids);
}
const prisma = new PrismaClient({ log: [] });

async function counts(db: Prisma.TransactionClient | PrismaClient) {
  const [otpChallenges, leaveNotices, updateRequests, incidents] = await Promise.all([
    db.otpChallenge.count({ where: { id: { in: [fixtureIds.otpStudentRecorded, fixtureIds.otpStudentWithdrawn, fixtureIds.otpDriver, fixtureIds.otpAttendant] } } }),
    db.leaveNotice.count({ where: { id: { in: [fixtureIds.leaveStudentRecorded, fixtureIds.leaveStudentWithdrawn, fixtureIds.leaveDriver, fixtureIds.leaveAttendant] } } }),
    db.studentUpdateRequest.count({ where: { id: { in: [fixtureIds.requestPendingPickup, fixtureIds.requestRejectedDropoff, fixtureIds.requestCancelled] } } }),
    db.tripIncident.count({ where: { id: { in: [fixtureIds.incidentAttendant, fixtureIds.incidentDriver, fixtureIds.incidentOffRoute, fixtureIds.incidentLateStop] } } }),
  ]);
  return { otpChallenges, leaveNotices, updateRequests, incidents };
}
function isComplete(actual: typeof expected) { return Object.entries(expected).every(([key, value]) => actual[key as keyof typeof actual] === value); }
function isEmpty(actual: typeof expected) { return Object.values(actual).every(value => value === 0); }

async function incidentContexts(tx: Prisma.TransactionClient, ids: Record<string, string>) {
  const trip = await tx.trip.findUniqueOrThrow({ where: { id: ids['trip-to-parking'] } });
  const snapshot = trip.routeSnapshot as { stops?: Array<{ id: string; stopOrder: number; stopType: string; addressText: string; plannedArrivalTime?: string }> } | null;
  const stop = snapshot?.stops?.find(item => item.stopType === 'DROPOFF' && item.plannedArrivalTime);
  if (!stop) throw new SeedError('Chuyến DEMO thiếu điểm trả và giờ dự kiến trong snapshot.');
  const planned = new Date(`${trip.serviceDate.toISOString().slice(0, 10)}T${stop.plannedArrivalTime}:00+07:00`);
  if (!Number.isFinite(planned.getTime())) throw new SeedError('Giờ điểm trả DEMO không hợp lệ.');
  const outbound = await tx.trip.findUniqueOrThrow({ where: { id: ids['trip-to-school'] } });
  if (!outbound.scheduledStartAt) throw new SeedError('Chuyến đi DEMO thiếu giờ xuất phát.');
  return {
    offRoute: { source: 'DEMO', distanceMeters: 420, thresholdMeters: 100, durationSeconds: 35,
      sampleCount: 8, detectedAt: new Date(outbound.scheduledStartAt.getTime() + 300_000).toISOString() },
    lateStop: { source: 'DEMO', stopId: stop.id, stopOrder: stop.stopOrder, stopAddress: stop.addressText,
      plannedArrivalAt: planned.toISOString(), estimatedArrivalAt: new Date(planned.getTime() + 720_000).toISOString(),
      delaySeconds: 720, thresholdSeconds: 300, durationSeconds: 35, sampleCount: 8,
      detectedAt: new Date(planned.getTime() + 360_000).toISOString() },
  };
}

async function repairIncidentContexts(tx: Prisma.TransactionClient, ids: Record<string, string>, apply: boolean) {
  const contexts = await incidentContexts(tx, ids);
  const targets = [
    { id: fixtureIds.incidentOffRoute, tripId: ids['trip-to-school'], type: TripIncidentType.OFF_ROUTE,
      dedupeKey: 'demo-workflow:incident:off-route', legacy: 'deviationMeters', context: contexts.offRoute },
    { id: fixtureIds.incidentLateStop, tripId: ids['trip-to-parking'], type: TripIncidentType.LATE_STOP,
      dedupeKey: 'demo-workflow:incident:late-stop', legacy: 'delayMinutes', context: contexts.lateStop },
  ];
  let repaired = 0;
  for (const target of targets) {
    const row = await tx.tripIncident.findUniqueOrThrow({ where: { id: target.id } });
    const context = row.context as Record<string, unknown> | null;
    if (row.tripId !== target.tripId || row.type !== target.type || row.dedupeKey !== target.dedupeKey || context?.source !== 'DEMO') {
      throw new SeedError('Không đúng bản ghi DEMO được phép sửa.');
    }
    if (!(target.legacy in context)) continue;
    if (apply) {
      const updated = await tx.tripIncident.updateMany({ where: { id: row.id, updatedAt: row.updatedAt }, data: { context: target.context } });
      if (updated.count !== 1) throw new SeedError('Bản ghi vừa thay đổi; dừng sửa để bảo vệ dữ liệu.');
    }
    repaired++;
  }
  return { [apply ? 'repairedContexts' : 'wouldRepairContexts']: repaired };
}

async function createFixtures(tx: Prisma.TransactionClient, ids: Record<string, string>) {
  const school = await tx.school.findUnique({ where: { id: ids.school }, select: { id: true } });
  const trips = await tx.trip.count({ where: { id: { in: [ids['trip-to-school'], ids['trip-to-parking']] } } });
  if (!school || trips !== 2) throw new SeedError('Bộ DEMO gốc thiếu trường hoặc chuyến; không tạo dữ liệu rời rạc.');
  const tripToSchool = ids['trip-to-school'], tripToParking = ids['trip-to-parking'];
  const now = new Date(), expiredAt = new Date(now.getTime() - 60_000), consumedAt = new Date(now.getTime() - 120_000);
  const otpRows = [
    { id: fixtureIds.otpStudentRecorded, userId: ids['user-parent1'], studentId: ids['student-1'], identifier: 'parent1@demo.roadtoschool.test' },
    { id: fixtureIds.otpStudentWithdrawn, userId: ids['user-parent1'], studentId: ids['student-2'], identifier: 'parent1@demo.roadtoschool.test' },
    { id: fixtureIds.otpDriver, userId: ids['user-driver1'], studentId: null, identifier: 'driver1@demo.roadtoschool.test' },
    { id: fixtureIds.otpAttendant, userId: ids['user-attendant2'], studentId: null, identifier: 'attendant2@demo.roadtoschool.test' },
  ];
  await tx.otpChallenge.createMany({ data: otpRows.map(row => ({ ...row, channel: DeliveryChannel.EMAIL, purpose: OtpPurpose.LEAVE_NOTICE,
    otpHash: 'demo-fixture-consumed-not-a-real-otp', payloadHash: `demo-workflow:${row.id}`, attempts: 0, expiresAt: expiredAt, consumedAt })) });

  const attendance = await tx.tripAttendance.findUnique({ where: { tripId_studentId: { tripId: tripToSchool, studentId: ids['student-1'] } } });
  if (!attendance || attendance.status !== AttendanceStatus.UNMARKED || attendance.excludedAt) {
    throw new SeedError('Điểm danh DEMO của học sinh 01 không còn nguyên trạng; không ghi đè dữ liệu đã thao tác.');
  }
  const attendanceBefore = { status: attendance.status, absenceReason: attendance.absenceReason, markedById: attendance.markedById,
    markedAt: attendance.markedAt?.toISOString() ?? null, alightedAt: attendance.alightedAt?.toISOString() ?? null };
  await tx.tripAttendance.update({ where: { id: attendance.id }, data: { status: AttendanceStatus.ABSENT,
    absenceReason: 'Phụ huynh xin nghỉ', markedById: ids['user-parent1'], markedAt: now } });
  await tx.leaveNotice.createMany({ data: [
    { id: fixtureIds.leaveStudentRecorded, tripId: tripToSchool, kind: LeaveNoticeKind.STUDENT, reportedById: ids['user-parent1'],
      studentId: ids['student-1'], otpChallengeId: fixtureIds.otpStudentRecorded, status: LeaveNoticeStatus.RECORDED, attendanceBefore },
    { id: fixtureIds.leaveStudentWithdrawn, tripId: tripToParking, kind: LeaveNoticeKind.STUDENT, reportedById: ids['user-parent1'],
      studentId: ids['student-2'], otpChallengeId: fixtureIds.otpStudentWithdrawn, status: LeaveNoticeStatus.WITHDRAWN,
      cancelledAt: new Date(now.getTime() - 30_000), cancelledById: ids['user-parent1'] },
    { id: fixtureIds.leaveDriver, tripId: tripToSchool, kind: LeaveNoticeKind.DRIVER, reportedById: ids['user-driver1'], studentId: null,
      otpChallengeId: fixtureIds.otpDriver, status: LeaveNoticeStatus.PENDING_REPLACEMENT },
    { id: fixtureIds.leaveAttendant, tripId: tripToParking, kind: LeaveNoticeKind.BUS_ATTENDANT, reportedById: ids['user-attendant2'], studentId: null,
      otpChallengeId: fixtureIds.otpAttendant, status: LeaveNoticeStatus.PENDING_REPLACEMENT },
  ] });

  const students = await tx.student.findMany({ where: { id: { in: [ids['student-3'], ids['student-4'], ids['student-5']] } },
    select: { id: true, addressText: true, latitude: true, longitude: true } });
  if (students.length !== 3) throw new SeedError('Bộ DEMO gốc thiếu học sinh cho yêu cầu đổi điểm đón/trả.');
  const student = (studentId: string) => students.find(item => item.id === studentId)!;
  const before = (studentId: string) => ({ addressText: student(studentId).addressText, latitude: Number(student(studentId).latitude), longitude: Number(student(studentId).longitude) });
  await tx.studentUpdateRequest.createMany({ data: [
    { id: fixtureIds.requestPendingPickup, studentId: ids['student-3'], parentId: ids['user-parent2'], schoolId: school.id,
      type: RequestType.ADDRESS_UPDATE, status: RequestStatus.PENDING, beforeData: before(ids['student-3']),
      proposedData: { addressText: 'DEMO · Điểm đón mới, Quận Bình Thạnh, TP. Hồ Chí Minh', latitude: 10.8038, longitude: 106.7102, changeTarget: 'PICKUP' } },
    { id: fixtureIds.requestRejectedDropoff, studentId: ids['student-4'], parentId: ids['user-parent2'], schoolId: school.id,
      type: RequestType.ADDRESS_UPDATE, status: RequestStatus.REJECTED, beforeData: before(ids['student-4']),
      proposedData: { addressText: 'DEMO · Điểm trả đề xuất, Quận 3, TP. Hồ Chí Minh', latitude: 10.7842, longitude: 106.6847, changeTarget: 'DROPOFF' },
      rejectionReason: 'Điểm đề xuất nằm ngoài phạm vi tuyến đang phục vụ.', reviewedById: ids['user-school'], reviewedAt: now },
    { id: fixtureIds.requestCancelled, studentId: ids['student-5'], parentId: ids['user-parent3'], schoolId: school.id,
      type: RequestType.ADDRESS_UPDATE, status: RequestStatus.CANCELLED, beforeData: before(ids['student-5']),
      proposedData: { addressText: 'DEMO · Điểm đón/trả tạm thời, Quận 1, TP. Hồ Chí Minh', latitude: 10.7756, longitude: 106.7004, changeTarget: 'BOTH' } },
  ] });

  const contexts = await incidentContexts(tx, ids);
  await tx.tripIncident.createMany({ data: [
    { id: fixtureIds.incidentAttendant, tripId: tripToSchool, type: TripIncidentType.ATTENDANT_MISSING, status: TripIncidentStatus.WAITING_ASSIGNMENT,
      reportedById: ids['user-driver1'], description: 'Giáo viên phụ xe chưa có mặt tại điểm tập kết.',
      context: { source: 'DEMO', expectedAssigneeId: ids['user-attendant1'] }, dedupeKey: 'demo-workflow:incident:attendant-missing' },
    { id: fixtureIds.incidentDriver, tripId: tripToParking, type: TripIncidentType.DRIVER_MISSING, status: TripIncidentStatus.RESOLVED,
      reportedById: ids['user-attendant2'], description: 'Tài xế báo đến muộn, đã bố trí tài xế thay thế.',
      context: { source: 'DEMO', expectedAssigneeId: ids['user-driver2'] }, dedupeKey: 'demo-workflow:incident:driver-missing',
      processedById: ids['user-system'], processedAt: now, resolution: { action: 'REPLACEMENT_ASSIGNED', note: 'Dữ liệu mẫu kiểm tra trạng thái đã xử lý.' } },
    { id: fixtureIds.incidentOffRoute, tripId: tripToSchool, type: TripIncidentType.OFF_ROUTE, status: TripIncidentStatus.WAITING_CONFIRMATION,
      description: 'Hệ thống phát hiện xe rời hành lang tuyến dự kiến.', context: contexts.offRoute, dedupeKey: 'demo-workflow:incident:off-route' },
    { id: fixtureIds.incidentLateStop, tripId: tripToParking, type: TripIncidentType.LATE_STOP, status: TripIncidentStatus.CONFIRMED,
      description: 'Xe đến điểm trả chậm hơn lịch dự kiến.', context: contexts.lateStop, dedupeKey: 'demo-workflow:incident:late-stop',
      processedById: ids['user-system'], processedAt: now, resolution: { action: 'CONFIRMED', note: 'Ùn tắc giao thông trên lộ trình.' } },
  ] });
  return counts(tx);
}

try {
  const database = target(), ids = loadDemoIds();
  await prisma.$connect();
  const actual = await counts(prisma);
  console.log(JSON.stringify({ target: database, dataset: DATASET, mode: process.argv.includes('--apply') ? 'APPLY' : 'READ_ONLY' }));
  if (process.argv.includes('--repair-incident-context')) {
    console.log(JSON.stringify(await prisma.$transaction(tx => repairIncidentContexts(tx, ids, process.argv.includes('--apply')))));
  }
  else if (isComplete(actual)) console.log(JSON.stringify({ alreadyExists: true, counts: actual }));
  else if (!isEmpty(actual)) throw new SeedError('Bộ dữ liệu workflow DEMO đang tồn tại một phần; không tự sửa hoặc ghi đè.');
  else if (!process.argv.includes('--apply')) console.log(JSON.stringify({ wouldCreate: expected, note: 'Không ghi DB. Dùng --apply --expect-db <database> khi đã được phép.' }));
  else {
    const created = await prisma.$transaction(tx => createFixtures(tx, ids), { timeout: 30_000 });
    if (!isComplete(created)) throw new SeedError('Transaction hoàn tất nhưng số lượng fixture không đúng mong đợi.');
    console.log(JSON.stringify({ created }));
  }
} catch (error) {
  const code = error && typeof error === 'object' ? Reflect.get(error, 'code') ?? Reflect.get(error, 'errorCode') : undefined;
  const detail = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[DATABASE_URL]') : 'Lỗi không xác định';
  console.error(error instanceof SeedError ? error.message : `Seed workflow thất bại (${String(code ?? 'UNKNOWN')}): ${detail}`);
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
