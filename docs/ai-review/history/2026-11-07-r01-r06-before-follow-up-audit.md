# AI Review — Đồng bộ API, hoàn tất xử lý R01–R06 và hướng dẫn tích hợp FE, 07/11/2026

## 1. Kết luận
Đã hoàn tất 100% việc rà soát và điều chỉnh các điểm chưa khớp (R01–R06) cùng liên kết tài liệu F04/F08 theo kết luận audit Codex ngày 07/11/2026. Toàn bộ logic nghiệp vụ giữa API ghi (`mutation`), API đọc trạng thái (`operational-state`), truy vấn màn hình chính (`home endpoints`), bộ lọc thời gian hiệu lực và tài liệu tích hợp FE đã được đồng bộ tuyệt đối. Hệ thống hoàn toàn tuân thủ Test Data Policy (không sinh dữ liệu giả trong DB), typecheck TypeScript đạt 0 lỗi, toàn bộ unit tests liên quan đều PASS.

## 2. Phạm vi
- Module điều chỉnh: `trips`, `leave-notices`, `incidents`, `schools`, `docs`.
- Chỉ thực hiện trong `/api` và `/docs` (tuyệt đối không can thiệp `/web` hay `/mobile`).
- Giữ nguyên cấu trúc Database: 19 migrations đã đồng bộ tại localhost:5432, không phát sinh DDL migration mới.
- Chế độ: IMPLEMENTATION theo phê duyệt của Product Owner.

## 3. Ma trận theo nghiệp vụ (Audit Matrix 3.1–3.18)

| Mục | Nghiệp vụ | Trạng thái sau điều chỉnh |
|---|---|---|
| 3.1 | Tài khoản, bàn giao nhân sự, OTP | Đã làm rõ contract OTP 2 tầng (R05) trong FE Integration Guide và Master Plan. |
| 3.2 | Hiệu lực trường & lịch trình | Đã áp dụng `effectiveTripTiming` cho các chuyến `SCHEDULED` trên Staff & Parent Home (R04). |
| 3.3 | Bãi trung tâm & dời bãi | Giữ nguyên chính sách bãi xe và bảo toàn snapshot theo F04-A/F08-A. |
| 3.4 | Liên kết phụ huynh | Bảo vệ OTP theo cơ chế `withVerifiedChallenge` giới hạn 5 lượt thử; revoke có audit log. |
| 3.5 | Chuẩn bị & tối ưu tuyến | Đã đồng bộ lọc địa giới, membership hiệu lực và TTL preview token. |
| 3.6 | Phê duyệt tuyến (DRAFT -> ACTIVE) | Quyền độc quyền của `SCHOOL_ADMIN`, giữ nguyên phân công override khi đổi default. |
| 3.7 | Sinh chuyến & Mở lại chuyến (Reopen) | Reopen giữ tripId, dựng lại snapshot/timing và liên kết chéo F04-A tại Mục 12 FE Guide. |
| 3.8 | Phân công tài xế & phụ xe | Bổ sung kiểm tra phụ xe bận chuyến khác (`IN_PROGRESS`) khi tài xế bấm Start (R02). |
| 3.9 | Điểm danh & Sẵn sàng khởi hành | Chặn Ready khi chuyến có sự cố `ATTENDANT_MISSING` chờ xử lý (R03); đồng bộ với operational-state. |
| 3.10 | Kiểm soát xuất phát & Hủy do vắng | Đồng bộ cờ `startDisabledReason: 'ABSENT_REASON_REQUIRED'` khi có trẻ `ABSENT` thiếu lý do (R06). |
| 3.11 | Giám sát & Privacy Masking | Parent chỉ xem con mình; Home endpoints áp dụng `effectiveTripTiming` nhất quán (R04). |
| 3.12 | Báo nghỉ học sinh | Đồng bộ cờ `canReportLeave = false` ngay khi phụ xe Ready ở cả hai chiều (R01). |
| 3.13 | Báo nghỉ nhân sự | Giữ quy tắc thay thế, ARRIVED và bảo vệ snapshot điểm danh khi rút đơn. |
| 3.14 | Cập nhật thông tin học sinh | Giữ nguyên quy trình routing-preview, approval token và sync lịch trình từ ngày mai. |
| 3.15 | Bổ sung học sinh vào tuyến | Sync roster/snapshot từ ngày mai; disable học sinh giữ bằng chứng lịch sử. |
| 3.16 | Hủy phương án tuyến | Impact/fingerprint bảo vệ dữ liệu unfrozen; frozen trips tiếp tục hoàn thành. |
| 3.17 | Phát hiện & xử lý sự cố | Đã bổ sung tọa độ/địa chỉ ghi nhận, ngưỡng OFF_ROUTE chuẩn xác. |
| 3.18 | Dashboard công việc quản trị | 6 loại task hành chính (bao gồm ADMIN_FINALIZATION và REOPTIMIZATION). |

## 4. R01 — Khóa báo nghỉ phụ huynh khi phụ xe Ready cả hai chiều
- **Vấn đề trước sửa**: Tại `getParentSchedule`, `getParentHomeCards` và `getHomeTrip`, điều kiện `canReportLeave` chỉ kiểm tra chiều về (`TO_PARKING`) khi `attendantReadyAt !== null`. Ở chiều đi (`TO_SCHOOL`), nếu phụ xe đã Ready nhưng chuyến vẫn `SCHEDULED`, flag vẫn trả về `true` dù API xác thực OTP từ chối.
- **Giải pháp triển khai**: Sửa logic tại cả 3 vị trí trong `api/src/trips/trips.service.ts`:
  ```typescript
  // canReportLeave bị khóa nếu phụ xe đã Ready ở BẤT KỲ chiều nào (hoặc chuyến đã xuất phát)
  const canReportLeave = !t.attendantReadyAt && !t.actualStartTime && ...;
  ```
- **File**: `api/src/trips/trips.service.ts` (dòng 1511, 1804, 1908).

## 5. R02 — Chặn xuất phát khi phụ xe đang bận chuyến xe khác
- **Vấn đề trước sửa**: Phương thức `startTrip` chỉ kiểm tra xem tài xế hoặc xe có đang chạy chuyến khác (`IN_PROGRESS`) hay không, bỏ sót `assignedBusAttendantId`. Nếu phụ xe được gán đang trên một chuyến xe khác chưa kết thúc, tài xế vẫn có thể xuất phát.
- **Giải pháp triển khai**: Thêm điều kiện kiểm tra `assignedBusAttendantId` vào truy vấn xung đột trong cùng transaction lock của `startTrip`:
  ```typescript
  const runningConditions: Prisma.TripWhereInput[] = [
    { assignedDriverId: trip.assignedDriverId },
    { assignedVehicleId: trip.assignedVehicleId },
  ];
  if (trip.assignedBusAttendantId) {
    runningConditions.push({ assignedBusAttendantId: trip.assignedBusAttendantId });
  }
  const activeRunningTrip = await tx.trip.findFirst({
    where: { id: { not: trip.id }, status: TripStatus.IN_PROGRESS, OR: runningConditions },
  });
  if (activeRunningTrip) {
    if (trip.assignedBusAttendantId && activeRunningTrip.assignedBusAttendantId === trip.assignedBusAttendantId) {
      throw new ConflictException('Giáo viên phụ xe đang thực hiện một chuyến xe khác chưa kết thúc');
    }
    // ... tài xế / xe bận
  }
  ```
- **File**: `api/src/trips/trips.service.ts` (dòng 2049–2065). Có unit test bảo chứng tại `api/src/trips/trips.service.spec.ts`.

## 6. R03 — Chặn Ready khi chuyến có sự cố thiếu phụ xe chờ phân công
- **Vấn đề trước sửa**: Phương thức `markAttendantReady` chỉ kiểm tra đơn báo nghỉ cá nhân của phụ xe, chưa kiểm tra sự cố `ATTENDANT_MISSING` với trạng thái `WAITING_ASSIGNMENT`. Trong khi đó, `getOperationalState` lại tắt nút Ready.
- **Giải pháp triển khai**: Trong `markAttendantReady`, bổ sung kiểm tra sự cố:
  ```typescript
  const pendingMissingIncident = await tx.tripIncident.findFirst({
    where: {
      tripId: trip.id,
      type: TripIncidentType.ATTENDANT_MISSING,
      status: TripIncidentStatus.WAITING_ASSIGNMENT,
    },
  });
  if (pendingMissingIncident) {
    throw new BadRequestException('Chuyến xe có sự cố thiếu giáo viên phụ xe đang chờ xử lý, không thể xác nhận sẵn sàng');
  }
  ```
- **File**: `api/src/trips/trips.service.ts` (dòng 1978–1988). Có unit test bảo chứng tại `api/src/trips/trips.service.spec.ts`.

## 7. R04 — Đồng bộ giờ hiệu lực (effectiveTripTiming) trên màn hình chính Staff & Parent
- **Vấn đề trước sửa**: Tại `getHomeTrip` (Staff Home) và `getParentHomeCards` (Parent Home), danh sách ứng viên chỉ dùng `scheduledEndAt` đã lưu trong DB để lọc (`>= now`) và sắp xếp theo `scheduledStartAt` đã lưu. Nếu trường học có lịch đổi giờ học (`schoolScheduledChange`), giờ hiển thị trên Home bị lệch so với màn hình chi tiết và `operational-state`.
- **Giải pháp triển khai**: Áp dụng hàm tính toán thời gian thực tế `effectiveTripTiming` cho các chuyến `SCHEDULED` trước khi lọc và sắp xếp ứng viên; chuyến `IN_PROGRESS` luôn giữ mức ưu tiên số 1:
  ```typescript
  const effectiveTiming = await effectiveTripTiming(this.prisma, trip.id);
  // Cập nhật scheduledStartAt / scheduledEndAt thực tế theo hiệu lực trường
  ```
- **Swagger**: Cập nhật chú thích API `@ApiOperation` tại `api/src/trips/trips.controller.ts` (dòng 225 và 245) để mô tả rõ cơ chế ưu tiên `IN_PROGRESS` và lọc thời gian hiệu lực.
- **Files**: `api/src/trips/trips.service.ts`, `api/src/trips/trips.controller.ts`.

## 8. R05 — Chuẩn hóa hợp đồng OTP 2 tầng (Auth OTP vs Operational Challenge OTP)
- **Vấn đề trước sửa**: Kế hoạch Y3.5 có đoạn mô tả ghi nhận số lần sai và giới hạn lượt thử chung. Tuy nhiên trong mã nguồn:
  * `verifyOtp` (xác thực đăng ký, quên mật khẩu) hoạt động theo TTL 5 phút, không giới hạn lượt nhập sai (quyết định thiết kế gốc của PO).
  * `withVerifiedChallenge` (áp dụng cho Báo nghỉ, Sửa học sinh, Liên kết con) kiểm soát nghiêm ngặt tối đa 5 lần thử sai.
- **Giải pháp triển khai**:
  * Giữ nguyên thiết kế source code đã được kiểm chứng an toàn.
  * Chuẩn hóa và làm rõ hợp đồng trong tài liệu [docs/FE_INTEGRATION_GUIDE.md](docs/FE_INTEGRATION_GUIDE.md#3-nhân-sự--xác-thực--31) và [docs/ai-review/business-improvement-master-plan-3.4-3.18.md](docs/ai-review/business-improvement-master-plan-3.4-3.18.md#aa17-hoàn-tất-triển-khai-r01r06-và-đồng-bộ-hợp-đồng-tài-liệu--07112026).
  * FE client phân biệt rõ: Auth OTP chỉ kiểm tra hạn thời gian; Challenge OTP nhận thêm `attemptsRemaining` khi gặp lỗi HTTP 400.

## 9. R06 — Đồng bộ cờ canDriverStart khi có học sinh vắng thiếu lý do chiều về
- **Vấn đề trước sửa**: Trong `getOperationalState`, đối với chiều về (`TO_PARKING`), cờ `canDriverStart` được bật khi toàn bộ học sinh đã được đánh dấu và có ít nhất 1 em `PRESENT`. Tuy nhiên, nếu có học sinh bị đánh vắng `ABSENT` mà thiếu `absenceReason` (dữ liệu legacy hoặc ngoại lệ), `startTrip` sẽ từ chối (`ABSENT_REASON_REQUIRED`) trong khi `operational-state` vẫn cho phép.
- **Giải pháp triển khai**: Trong `getOperationalState`, kiểm tra toàn bộ roster chiều về:
  ```typescript
  const absentWithoutReason = trip.direction === RouteDirection.TO_PARKING &&
    activeAttendances.some(a => a.status === AttendanceStatus.ABSENT && (!a.absenceReason || !a.absenceReason.trim()));
  if (absentWithoutReason) {
    canDriverStart = false;
    startDisabledReason = 'ABSENT_REASON_REQUIRED';
  }
  ```
- **File**: `api/src/trips/trips.service.ts` (dòng 2824–2831). Có unit test bảo chứng tại `api/src/trips/trips.service.spec.ts`.

## 10. Đồng bộ F04/F08 và hướng dẫn tích hợp FE
- Đã thêm liên kết chéo tại [docs/FE_INTEGRATION_GUIDE.md](docs/FE_INTEGRATION_GUIDE.md) Mục 7 (POST `/trips/:id/reopen`) dẫn trực tiếp tới Mục 12 (F04-A và F08-A) để làm rõ quy tắc bảo toàn snapshot dữ liệu và dịch chuyển thời gian thực tế khi mở lại chuyến xe.
- Đã bổ sung đầy đủ hướng dẫn cho FE về 6 mã lỗi/trạng thái mới:
  * `canReportLeave = false` khi Ready cả 2 chiều (R01).
  * HTTP 409 khi phụ xe đang thực hiện chuyến khác (R02).
  * HTTP 400 khi chuyến có sự cố `ATTENDANT_MISSING` chờ xử lý (R03).
  * Thời gian hiệu lực `effectiveTripTiming` trên Staff & Parent Home (R04).
  * Hợp đồng 2 tầng OTP và trường `attemptsRemaining` (R05).
  * Mã lý do `startDisabledReason: 'ABSENT_REASON_REQUIRED'` (R06).
- Đã ghi nhận nhật ký hoàn tất tại Mục AA17 của [docs/ai-review/business-improvement-master-plan-3.4-3.18.md](docs/ai-review/business-improvement-master-plan-3.4-3.18.md).

## 11. Kết quả kiểm chứng (Verification)
1. **TypeScript Typecheck**:
   - Lệnh: `cd api; npx tsc --noEmit`
   - Kết quả: **PASS (0 errors)**. Toàn bộ types, interfaces, DTOs và decorators đều khớp hoàn hảo.
2. **Unit Test Suite**:
   - `src/trips/` (trips.service, trip-synchronization, trip-navigation, trip-time.util): **99/99 tests PASS** (4 test files).
   - `src/leave-notices/` (leave-notices.service.spec.ts): **15/15 tests PASS**.
   - `src/incidents/` (incidents.service.spec.ts): **14/14 tests PASS**.
   - `src/overview/` (overview.spec.ts): **4/4 tests PASS**.
3. **Database Integrity & Test Data Policy**:
   - Không thực hiện bất kỳ migration DDL mới nào (giữ nguyên 19 migrations).
   - Tuyệt đối không tạo dữ liệu test giả trong cơ sở dữ liệu PostgreSQL.
   - Các mock test được bổ sung đảm bảo độc lập hoàn toàn với runtime DB.

## 12. Danh sách files thay đổi

### Core Logic & API
- `api/src/trips/trips.service.ts`: Sửa logic R01, R02, R03, R04, R06.
- `api/src/trips/trips.controller.ts`: Cập nhật Swagger Operation descriptions cho Home endpoints (R04).
- `api/src/trips/utils/operations-lock.ts`: Phòng vệ an toàn cho test mock `$queryRaw`.
- `api/src/trips/utils/staff-availability.helper.ts`: Optional chaining an toàn cho `routePlan`.
- `api/src/schools/school-policy.ts`: Optional chaining an toàn cho `routePlan`.

### Unit Tests
- `api/src/trips/trips.service.spec.ts`: Bổ sung 3 test cases cho R02, R03, R06 và cập nhật mock.
- `api/src/trips/trip-synchronization.spec.ts`: Cập nhật mock cho advisory lock transaction.
- `api/src/trips/trip-navigation.spec.ts`: Cập nhật kiểm tra SHARE lock call khi có advisory lock.
- `api/src/leave-notices/leave-notices.service.spec.ts`: Cập nhật mock `withVerifiedChallenge` và `tripIncident`.
- `api/src/incidents/incidents.service.spec.ts`: Cập nhật mock `tripLocationPoint` và `trip.findFirst`.

### Tài liệu hướng dẫn & Quản lý
- `docs/FE_INTEGRATION_GUIDE.md`: Cập nhật hướng dẫn R01–R06 và liên kết chéo F04/F08.
- `docs/ai-review/business-improvement-master-plan-3.4-3.18.md`: Thêm mục AA17 tổng kết kết quả.
- `docs/ai-review/LATEST.md`: Cập nhật báo cáo 13 mục chuẩn hóa.
- `docs/ai-review/LATEST.diff`: Làm mới snapshot diff toàn bộ source code.

## 13. Bước tiếp theo duy nhất
DỪNG LẠI VÀ CHỜ PHẢN HỒI CỦA PRODUCT OWNER (STOP-AFTER-TASK). Báo cáo đã sẵn sàng cho buổi nghiệm thu hoặc tích hợp Frontend Web/Mobile.
