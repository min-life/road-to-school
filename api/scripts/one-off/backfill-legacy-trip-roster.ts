/**
 * ONE-TIME LEGACY TRIP DATA SYNCHRONIZATION UTILITY
 * 
 * Mục đích:
 * Bổ sung các bản ghi TripAttendance (trạng thái UNMARKED) cho các chuyến xe đã được tạo từ trước
 * theo kiến trúc cũ mà chưa có Student Roster.
 * 
 * Quy tắc an toàn:
 * - Hỗ trợ chế độ --dry-run (mặc định) và --apply.
 * - Tuyệt đối không ghi đè hoặc reset bản ghi điểm danh hiện hữu.
 * - Idempotent: chạy nhiều lần không tạo bản ghi trùng lặp (dựa trên unique constraint tripId_studentId).
 * - Báo cáo chi tiết trước và sau khi thực thi.
 * 
 * Lệnh chạy:
 * Dry-run: node --env-file=.env scripts/one-off/backfill-legacy-trip-roster.ts --dry-run
 * Apply:   node --env-file=.env scripts/one-off/backfill-legacy-trip-roster.ts --apply
 */

import { PrismaClient, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface BackfillTripReport {
  tripId: string;
  serviceDate: string;
  status: string;
  routeName: string;
  expectedStudentCount: number;
  existingAttendanceCount: number;
  missingStudentCount: number;
  missingStudentIds: string[];
  anomalies: string[];
}

async function runBackfill() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const isDryRun = args.includes('--dry-run') || !isApply;

  console.log('================================================================');
  console.log(' ROADTOSCHOOL V2.0 — ONE-TIME LEGACY TRIP ROSTER SYNCHRONIZATION');
  console.log('================================================================');
  console.log(`Chế độ thực thi: ${isApply ? 'APPLY (THỰC THI GHI VÀO DB)' : 'DRY-RUN (CHỈ ĐỌC, KHÔNG GHI)'}`);
  console.log(`Thời điểm: ${new Date().toISOString()}`);
  console.log('----------------------------------------------------------------\n');

  // 1. Kiểm tra kết nối Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Kết nối Database thành công.');
  } catch (err: any) {
    console.error('✗ Lỗi kết nối Database:', err.message);
    process.exit(1);
  }

  // 2. Lấy toàn bộ danh sách Trip kèm thông tin Route, RouteStops và TripAttendance
  const trips = await prisma.trip.findMany({
    include: {
      route: {
        include: {
          stops: {
            select: {
              id: true,
              studentId: true,
              stopOrder: true,
              stopType: true,
              addressText: true,
            },
            orderBy: { stopOrder: 'asc' },
          },
        },
      },
      attendances: {
        select: {
          id: true,
          studentId: true,
          status: true,
        },
      },
    },
    orderBy: [{ serviceDate: 'asc' }, { scheduledStartTime: 'asc' }],
  });

  console.log(`Tổng số chuyến xe (Trip) tìm thấy trong Database: ${trips.length}\n`);

  let tripsWithFullRoster = 0;
  let tripsWithNoRoster = 0;
  let tripsWithPartialRoster = 0;
  let tripsWithZeroStudents = 0;
  let totalMissingRowsToInsert = 0;

  const tripReports: BackfillTripReport[] = [];

  for (const trip of trips) {
    const serviceDateStr = trip.serviceDate.toISOString().slice(0, 10);
    const existingStudentIdSet = new Set(trip.attendances.map((a) => a.studentId));

    // Lấy danh sách student IDs từ RouteStops của tuyến
    const routeStudentIds = trip.route?.stops
      ?.map((s) => s.studentId)
      ?.filter((id): id is string => Boolean(id)) || [];

    // Loại bỏ duplicate student IDs nếu có
    const distinctExpectedStudentIds = Array.from(new Set(routeStudentIds));

    const missingStudentIds = distinctExpectedStudentIds.filter(
      (sid) => !existingStudentIdSet.has(sid),
    );

    const anomalies: string[] = [];

    if (distinctExpectedStudentIds.length === 0) {
      tripsWithZeroStudents++;
      anomalies.push('Tuyến không có học sinh nào (0 students on route)');
    }

    if (trip.attendances.length === 0 && distinctExpectedStudentIds.length > 0) {
      tripsWithNoRoster++;
    } else if (trip.attendances.length > 0 && missingStudentIds.length > 0) {
      tripsWithPartialRoster++;
    } else if (trip.attendances.length > 0 && missingStudentIds.length === 0) {
      tripsWithFullRoster++;
    }

    totalMissingRowsToInsert += missingStudentIds.length;

    tripReports.push({
      tripId: trip.id,
      serviceDate: serviceDateStr,
      status: trip.status,
      routeName: trip.route?.name || 'N/A',
      expectedStudentCount: distinctExpectedStudentIds.length,
      existingAttendanceCount: trip.attendances.length,
      missingStudentCount: missingStudentIds.length,
      missingStudentIds,
      anomalies,
    });
  }

  // Báo cáo chi tiết từng chuyến
  console.log('CHI TIẾT RÀ SOÁT TỪNG CHUYẾN XE:');
  console.log('----------------------------------------------------------------');
  for (const rep of tripReports) {
    const statusTag = `[${rep.status}]`;
    const anomalyTag = rep.anomalies.length > 0 ? ` ⚠️ ${rep.anomalies.join('; ')}` : '';
    console.log(
      `- Trip: ${rep.tripId} | Ngày: ${rep.serviceDate} ${statusTag} | Tuyến: "${rep.routeName}"`,
    );
    console.log(
      `  Kỳ vọng: ${rep.expectedStudentCount} HS | Đã có: ${rep.existingAttendanceCount} bản ghi | Cần bổ sung: ${rep.missingStudentCount} bản ghi${anomalyTag}`,
    );
  }
  console.log('----------------------------------------------------------------\n');

  console.log('TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ (SUMMARY):');
  console.log(`- Tổng số chuyến xe: ${trips.length}`);
  console.log(`- Số chuyến đã có Roster đầy đủ: ${tripsWithFullRoster}`);
  console.log(`- Số chuyến hoàn toàn chưa có Roster (0 bản ghi): ${tripsWithNoRoster}`);
  console.log(`- Số chuyến thiếu một phần Roster: ${tripsWithPartialRoster}`);
  console.log(`- Số chuyến có 0 học sinh: ${tripsWithZeroStudents}`);
  console.log(`- Tổng số bản ghi TripAttendance cần bổ sung: ${totalMissingRowsToInsert}\n`);

  if (isDryRun) {
    console.log('================================================================');
    console.log(' KẾT THÚC CHẾ ĐỘ DRY-RUN');
    console.log(' Không có bất kỳ thay đổi nào được thực hiện trên Database.');
    console.log(' Để thực sự ghi dữ liệu vào Database, hãy chạy lệnh với cờ --apply:');
    console.log(' node --env-file=.env scripts/one-off/backfill-legacy-trip-roster.ts --apply');
    console.log('================================================================');
    return;
  }

  // Chế độ APPLY
  console.log('BẮT ĐẦU THỰC HIỆN ĐỒNG BỘ DỮ LIỆU (APPLY MODE)...');
  let insertedCount = 0;
  let skippedExistingCount = 0;
  let errorCount = 0;

  for (const rep of tripReports) {
    if (rep.missingStudentCount === 0) {
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        for (const studentId of rep.missingStudentIds) {
          await tx.tripAttendance.upsert({
            where: {
              tripId_studentId: {
                tripId: rep.tripId,
                studentId,
              },
            },
            create: {
              tripId: rep.tripId,
              studentId,
              status: AttendanceStatus.UNMARKED,
              absenceReason: null,
              markedById: null,
              markedAt: null,
            },
            update: {
              // Idempotent: Nếu đã tồn tại, không ghi đè status hay lý do hiện hữu
            },
          });
          insertedCount++;
        }
      });
      console.log(`✓ Đã bổ sung thành công ${rep.missingStudentCount} học sinh cho Trip ${rep.tripId}`);
    } catch (err: any) {
      errorCount++;
      console.error(`✗ Lỗi khi bổ sung cho Trip ${rep.tripId}:`, err.message);
    }
  }

  console.log('\n================================================================');
  console.log(' BÁO CÁO KẾT QUẢ THỰC HIỆN APPLY:');
  console.log(`- Số bản ghi TripAttendance đã bổ sung thành công: ${insertedCount}`);
  console.log(`- Số lỗi phát sinh: ${errorCount}`);
  console.log('================================================================\n');

  // Hậu kiểm tra tính nhất quán (Post-Verification)
  const postTotalAttendances = await prisma.tripAttendance.count();
  console.log(`HẬU KIỂM TRA: Tổng số bản ghi TripAttendance hiện tại trong DB: ${postTotalAttendances}`);
}

runBackfill()
  .catch((e) => {
    console.error('Fatal error in backfill script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
