# AI Review Report — Trip Operation Implementation (Quản lý Vận hành Chuyến xe)

## 1. Task Information
- **Task Name**: Trip Operation Management Implementation (Phase 2 Master Prompt)
- **Date**: 2026-10-25
- **Project Scope**: Database (PostgreSQL / Prisma), Backend (NestJS), Mobile (Expo React Native), Documentation & Verification
- **Task Type**: Implementation & Database Migration
- **Status**: `COMPLETED`

---

## 2. Original Request
Triển khai toàn diện phân hệ **Trip Operation Management (Quản lý Vận hành Chuyến xe)** cho RoadToSchool v2.0 dựa trên các quyết định nghiệp vụ đã được Product Owner phê duyệt (`D01` đến `D12`):
- Vận hành vòng đời chuyến xe: `SCHEDULED` -> `IN_PROGRESS` -> `COMPLETED`.
- Quy tắc sẵn sàng khởi hành của Giáo viên giám sát (`attendantReadyAt`).
- Bắt đầu chuyến xe và kết thúc chuyến xe của Tài xế.
- Danh sách học sinh theo từng chuyến (`TripAttendance` roster) và điểm danh 3 trạng thái (`UNMARKED`, `PRESENT`, `ABSENT`).
- Hỗ trợ hoàn tác điểm danh về `UNMARKED` (`D09`), bắt buộc lý do vắng mặt khi `ABSENT` (`D04`).
- Quét mã QR thẻ học sinh (`Student.code`) xác thực trước khi điểm danh (`D08`).
- Smart Polling 5s cho Mobile không làm reload bản đồ (`D07`).
- Phụ huynh theo dõi trạng thái điểm danh và lý do vắng của con mình (`D05`, `D10`).
- Không tạo mock/fake data trong DB; thực thi an toàn schema migration và one-off backfill script cho 10 chuyến xe hiện hữu.

---

## 3. Approved Scope
- **Phê duyệt nghiệp vụ**: Quyết định `D01`–`D12` từ Product Owner đã được tích hợp vào [docs/ai-review/trip-operation-business-architecture-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/trip-operation-business-architecture-plan.md).
- **Phạm vi Backend**:
  - Prisma Schema: thêm model `TripAttendance` và trường `attendantReadyAt` trên `Trip`.
  - Migration: `20261025052642_add_trip_attendance_roster`.
  - One-off script: [api/scripts/one-off/backfill-legacy-trip-roster.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/scripts/one-off/backfill-legacy-trip-roster.ts).
  - Trips Controller & Service: 9 API endpoints vận hành và DTOs tương ứng.
- **Phạm vi Mobile**:
  - `api-client.ts`: Expose các method gọi API vận hành.
  - `(tabs)/index.tsx`: Home screen hiển thị 1 chuyến ưu tiên cho Tài xế/Giáo viên (`D06`) và thẻ theo học sinh cho Phụ huynh (`D05`, `D10`).
  - `trip/[id].tsx`: Bottom sheet 2 trạng thái, Fixed Bottom Action, tab Điểm danh thủ công mặc định, nút Quét QR, Modal lý do vắng mặt, Modal hoàn tác, Smart Polling 5s không remount bản đồ.
- **Giới hạn phạm vi (Out-of-Scope)**:
  - Không tạo mock test data tự tiện trong cơ sở dữ liệu.
  - Không can thiệp vào Web Admin ngoài phạm vi nghiệp vụ vận hành chuyến.

---

## 4. Analysis & Decisions
1. **D01 (Đồng thời đơn giản)**: Sử dụng Prisma Transaction `$transaction` và atomic conditional checks trên trường `status` và `TripAttendance` để tránh race condition khi tài xế và giáo viên thao tác đồng thời.
2. **D02 (Minimal Database Roster)**: Sử dụng duy nhất bảng `TripAttendance` đại diện cho cả danh sách học sinh thuộc chuyến và dữ liệu điểm danh. Không tạo bảng thừa `TripStudent`.
3. **D03 (Ràng buộc phân công tài nguyên)**: Chặn cập nhật xe/tài xế/giáo viên khi chuyến đã `IN_PROGRESS` hoặc `COMPLETED`. Khi đổi giáo viên trên chuyến `SCHEDULED`, tự động reset `attendantReadyAt = null`.
4. **D04 (Validation lý do vắng)**: Bắt buộc `absenceReason` là chuỗi không rỗng đã trim khi `status = ABSENT`. Tự động xóa `absenceReason = null` khi chuyển sang `PRESENT` hoặc `UNMARKED`.
5. **D05 & D10 (Bảo mật quyền riêng tư Phụ huynh)**: Phụ huynh chỉ xem được trạng thái điểm danh và lý do vắng của chính con mình; thông tin học sinh khác trên tuyến được ẩn danh.
6. **D06 (Hết hạn chuyến xe trên Trang chủ)**: Trang chủ tự động ẩn các chuyến có `scheduledEndAt < now` mà không tự ý đổi trạng thái Trip sang `CANCELLED` hoặc `COMPLETED`.
7. **D07 (Smart Polling 5s)**: Sử dụng polling 5 giây qua endpoint `GET /trips/:id/operational-state` khi màn hình active; dừng khi blur hoặc app chuyển sang background. Tuyệt đối không reload WebView bản đồ.
8. **D08 (Mã QR hiện tại)**: Chấp nhận `Student.code` làm dữ liệu QR hợp lệ. Xác thực sự tồn tại trong danh sách chuyến trước khi đánh dấu có mặt.
9. **D09 (Hoàn tác điểm danh)**: Cho phép chuyển trạng thái học sinh về `UNMARKED` trong khi chuyến đang `IN_PROGRESS` (giữ nguyên bản ghi, xóa `markedAt`, `markedById`, `absenceReason`).
10. **D11 (Chuyến xe tối thiểu 1 học sinh)**: Bỏ qua không sinh chuyến rỗng trong `generateTripsInternal`; chặn bắt đầu và kết thúc chuyến nếu danh sách học sinh rỗng.
11. **D12 (Cấu hình môi trường)**: Đọc biến `TRIP_OPERATION_MODE` (`LIVE` vs `TEST`). Trong `TEST` mode, bỏ qua giới hạn thời gian mở cổng sẵn sàng (15m) và bắt đầu chuyến (5m).

---

## 5. Implementation Details
### Files Created / Modified
1. [api/prisma/schema.prisma](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/prisma/schema.prisma):
   - Thêm `enum AttendanceStatus { UNMARKED, PRESENT, ABSENT }`.
   - Thêm `attendantReadyAt DateTime?` và quan hệ `attendances TripAttendance[]` vào model `Trip`.
   - Thêm model `TripAttendance` với ràng buộc `@@unique([tripId, studentId])`.
2. [api/prisma/migrations/20261025052642_add_trip_attendance_roster/migration.sql](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/prisma/migrations/20261025052642_add_trip_attendance_roster/migration.sql):
   - Migration DDL tạo bảng `trip_attendances` và foreign keys.
3. [api/scripts/one-off/backfill-legacy-trip-roster.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/scripts/one-off/backfill-legacy-trip-roster.ts):
   - Script độc lập đồng bộ roster cho các chuyến xe đã sinh trước đó từ `RouteStop`.
4. [api/src/trips/dto/trip-operation.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/dto/trip-operation.dto.ts):
   - Khai báo DTOs: `MarkAttendanceDto`, `VerifyQrDto`, `VerifyQrResponseDto`, `TripAttendanceListResponseDto`, `OperationalStateResponseDto`, `HomeTripResponseDto`, `ParentHomeCardsResponseDto`.
5. [api/src/trips/dto/trip-response.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/dto/trip-response.dto.ts):
   - Bổ sung thông tin `attendanceStatus`, `absenceReason`, `attendanceMarkedAt`, `guardianPhone` trên `TripStopResponseDto`.
6. [api/src/trips/trips.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trips.service.ts):
   - Triển khai 10 phương thức nghiệp vụ: `isTestMode`, `getHomeTrip`, `getParentHomeCards`, `markAttendantReady`, `startTrip`, `getTripAttendance`, `updateAttendance`, `verifyQrAttendance`, `completeTrip`, `getOperationalState`.
   - Cập nhật logic sinh chuyến `generateTripsInternal` gắn `attendances` và tuân thủ `D11`.
   - Cập nhật `updateTripAssignment` tuân thủ `D03`.
7. [api/src/trips/trips.controller.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trips.controller.ts):
   - Định tuyến và bảo vệ bằng RolesGuard các endpoints vận hành với đầy đủ Swagger decorators.
8. [mobile/services/api-client.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/services/api-client.ts):
   - Khai báo các interface và method tương ứng cho mobile client.
9. [mobile/app/(tabs)/index.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/(tabs)/index.tsx):
   - Giao diện Trang chủ theo vai trò (Driver/Attendant: 1 chuyến xe ưu tiên; Parent: danh sách thẻ theo con kèm trạng thái điểm danh và lý do vắng).
10. [mobile/app/trip/[id].tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/trip/[id].tsx):
    - Toàn bộ giao diện vận hành chuyến: Fixed Bottom Action, tab Điểm danh thủ công mặc định kèm thanh tiến độ và nút Quét QR, Modal lý do vắng mặt bắt buộc, Modal hoàn tác về UNMARKED, Smart Polling 5s memoized map HTML.

---

## 6. Database Changes
- **New Tables**:
  - `trip_attendances`: Lưu trữ danh sách học sinh theo chuyến xe và trạng thái điểm danh (`id`, `trip_id`, `student_id`, `status`, `absence_reason`, `marked_by_id`, `marked_at`, `created_at`, `updated_at`).
- **New Columns on Existing Tables**:
  - `trips.attendant_ready_at`: Thời điểm giáo viên giám sát xác nhận sẵn sàng (`DateTime?`).
- **Constraints & Indexes**:
  - `@@unique([tripId, studentId])` trên `trip_attendances`.
  - Indexes: `[tripId, status]`, `[studentId]`, `[markedById]`.
- **Migration Status**:
  - Migration `20261025052642_add_trip_attendance_roster` đã được apply thành công trên PostgreSQL.

---

## 7. API & Swagger Changes
Tất cả endpoints đã được đồng bộ Swagger tại `http://localhost:3000/api/docs`:
- `GET /api/v1/trips/mobile/home-trip` (Roles: `DRIVER`, `BUS_ATTENDANT`)
- `GET /api/v1/trips/mobile/parent/home-cards` (Roles: `PARENT`)
- `POST /api/v1/trips/:id/attendant-ready` (Roles: `BUS_ATTENDANT`)
- `POST /api/v1/trips/:id/start` (Roles: `DRIVER`)
- `GET /api/v1/trips/:id/operational-state` (Roles: `DRIVER`, `BUS_ATTENDANT`, `PARENT`, `SCHOOL_ADMIN`, `SYSTEM_ADMIN`)
- `GET /api/v1/trips/:id/attendance` (Roles: `BUS_ATTENDANT`, `DRIVER`, `SCHOOL_ADMIN`, `SYSTEM_ADMIN`)
- `PUT /api/v1/trips/:id/attendance/:studentId` (Roles: `BUS_ATTENDANT`)
- `POST /api/v1/trips/:id/attendance/verify-qr` (Roles: `BUS_ATTENDANT`)
- `POST /api/v1/trips/:id/complete` (Roles: `DRIVER`)

---

## 8. UI/UX Changes
- **Mobile Home (`mobile/app/(tabs)/index.tsx`)**:
  - Driver/Attendant: Card chuyến xe vận hành ưu tiên với thông tin phương tiện, nhân sự phụ trách kèm nhãn `(Bạn)`, tiến độ sẵn sàng/điểm danh, nút "Xem chi tiết & Vận hành". Empty state lịch sự khi không có chuyến xe.
  - Parent: Danh sách thẻ theo từng con, hiển thị rõ ràng lộ trình, trạng thái xe, trạng thái điểm danh (`Có mặt`, `Vắng mặt` + lý do vắng).
- **Mobile Trip Detail (`mobile/app/trip/[id].tsx`)**:
  - Fixed Bottom Action: Pinned cố định sát đáy màn hình, tách biệt khỏi bottom sheet, tôn trọng safe area.
  - Tab Điểm danh: Mặc định hiển thị danh sách thủ công, thanh tìm kiếm học sinh, thanh tiến độ điểm danh, nút `[Quét QR]` góc phải trên.
  - Tối giản câu chữ: Tuân thủ triệt để nguyên tắc Minimal UI Copy, sử dụng badges, pills, màu sắc trạng thái trực quan thay vì các đoạn văn bản hướng dẫn dài dòng.

---

## 9. Verification & Testing
1. **Schema Migration & Roster Backfill**:
   - `npx prisma migrate dev`: `PASS`
   - `backfill-legacy-trip-roster.ts --dry-run`: `PASS` (Phát hiện 20 học sinh trên 10 chuyến cần bổ sung).
   - `backfill-legacy-trip-roster.ts --apply`: `PASS` (Tạo thành công 20 dòng `TripAttendance` với 0 lỗi).
   - Re-run `--dry-run`: `PASS` (0 dòng cần bổ sung, 10/10 chuyến đầy đủ roster - Idempotent).
2. **Backend Unit Tests**:
   - `npm test` trong `api`: `PASS` (26/26 test suites passed, 261/261 tests passed).
3. **Type Checking**:
   - `npx tsc --noEmit` trong `api`: `PASS` (0 errors).
   - `npx tsc --noEmit` trong `mobile`: `PASS` (0 errors).
   - `npx tsc --noEmit` trong `web`: `PASS` (0 errors).
4. **Swagger Contract Verification**:
   - Truy vấn `http://localhost:3000/api/docs-json`: `PASS` (84 endpoints hợp lệ, đầy đủ 9 endpoint mới của Trip Operation).

---

## 10. Issues & Risks
- **Test Data Policy**: Tuân thủ tuyệt đối quy định không sinh dữ liệu giả/mock trong database thực.
- **Camera Permissions trên Thiết bị di động**: Màn hình quét QR đã bổ sung fallback nhập mã học sinh bằng tay để đảm bảo hoạt động tốt ngay cả khi quyền truy cập camera bị từ chối hoặc khi chạy trên simulator.

---

## 11. Reviewer Focus
- **Tính toàn vẹn của State Machine**: Đảm bảo các chuyển đổi trạng thái `SCHEDULED` -> `IN_PROGRESS` -> `COMPLETED` tuân thủ đúng thứ tự và điều kiện cổng chặn (Giáo viên Ready -> Tài xế Start -> Điểm danh 100% -> Tài xế Complete).
- **Quyền riêng tư PII**: Kiểm tra kỹ endpoint `GET /trips/mobile/:id` và `GET /trips/mobile/parent/home-cards` đảm bảo Phụ huynh chỉ xem được dữ liệu học sinh của chính mình.
- **Hiệu năng Polling**: Kiểm tra cơ chế Smart Polling 5s chỉ fetch operational state và không reload Map WebView.

---

## 12. Suggested Next Step
- Trình Product Owner xem xét, nghiệm thu luồng vận hành chuyến xe trên Mobile (Driver, Bus Attendant, Parent) và chuẩn bị cho giai đoạn tích hợp GPS tracking thực tế (Realtime Location Simulation / Tracking).

---

## 13. Approval Status
`WAITING FOR USER REVIEW / APPROVAL`
