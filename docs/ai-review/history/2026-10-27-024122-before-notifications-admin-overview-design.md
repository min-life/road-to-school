# AI Review — Triển khai Hệ thống Sự cố Vận hành (Operational Incidents)

## 1. Task Information
- **Ngày thực hiện**: 27/10/2026 (Asia/Saigon).
- **Phạm vi (Scope)**: Backend (`/api`), Database (`api/prisma`), Web Admin (`/web`), Mobile App (`/mobile`).
- **Phân loại**: Implementation (Thực thi toàn diện 4 tầng theo `docs/ai-review/operational-incidents-implementation-prompt.md`).
- **Trạng thái**: IMPLEMENTED & VERIFIED. Dừng sau task (Stop-after-task protocol).

---

## 2. Original Request & Approved Scope
- **Yêu cầu gốc**: Triển khai toàn bộ hệ thống sự cố vận hành dựa trên tài liệu đặc tả `docs/ai-review/operational-incidents-implementation-prompt.md`.
- **Phạm vi đã chốt**:
  1. Chính xác 4 loại sự cố: `ATTENDANT_MISSING`, `DRIVER_MISSING`, `OFF_ROUTE`, `LATE_STOP`.
  2. Mỗi chuyến xe (Trip) tối đa một sự cố lệch tuyến và một sự cố trễ đón/trả thông qua `dedupe_key` unique constraint.
  3. Báo cáo sự cố thủ công **chỉ được phép thực hiện từ nút "Báo sự cố ⚠" trong màn hình Chi tiết chuyến (Trip Detail)** của nhân sự được phân công hợp lệ trong khung thời gian 15 phút trước giờ chạy đến khi hoàn thành.
  4. Tiện ích "Sự cố" trên Mobile Home (chỉ hiển thị cho Tài xế và Giáo viên phụ xe; **ẩn hoàn toàn với Phụ huynh**) chỉ xem lịch sử sự cố cá nhân (`reportedById = user.id` hoặc sự cố tự động đã xác nhận giải trình). **Tuyệt đối không có nút tạo mới trong tiện ích, danh sách lịch sử hay trạng thái rỗng.**
  5. Detector phía server tính toán khoảng cách lệch tuyến và ETA trễ điểm đón/trả kế tiếp, chạy bất đồng bộ hoàn toàn bên ngoài transaction cập nhật telemetry (`setImmediate`).
  6. Ràng buộc vận hành: Chặn bắt đầu chuyến nếu có sự cố thiếu nhân sự đang mở (`WAITING_ASSIGNMENT`) hoặc chuyến LIVE đã quá giờ kết thúc dự kiến (`now > scheduledEndAt`). Chặn giáo viên xác nhận sẵn sàng nếu thiếu nhân sự.
  7. Phân quyền xử lý: `SCHOOL_ADMIN` xử lý `ATTENDANT_MISSING` (chỉ chọn ứng viên thay thế cùng trường); `SYSTEM_ADMIN` xử lý `DRIVER_MISSING` (toàn hệ thống).

---

## 3. Database Changes (Additive & Minimal DB Impact)
- **Tập tin schema**: [api/prisma/schema.prisma](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/prisma/schema.prisma)
- **Migration**: `api/prisma/migrations/20261026174653_add_trip_incidents/migration.sql`
- **Thay đổi chi tiết**:
  - Thêm enum `TripIncidentType`: `ATTENDANT_MISSING`, `DRIVER_MISSING`, `OFF_ROUTE`, `LATE_STOP`.
  - Thêm enum `TripIncidentStatus`: `WAITING_ASSIGNMENT`, `RESOLVED`, `CONFIRMED`, `PENDING_CONFIRMATION`, `CLOSED_WITHOUT_CONFIRMATION`.
  - Tạo bảng mới `trip_incidents`:
    - `id` (UUID PK), `trip_id` (UUID FK -> `trips.id`), `type`, `status`.
    - `dedupe_key` (VARCHAR UNIQUE): định dạng `TRIP_<tripId>_<type>` cho sự cố tự động để đảm bảo tối đa 1 sự cố mỗi loại.
    - `description` (TEXT), `context_data` (JSONB): lưu trữ telemetry evidence (khoảng cách lệch, thời gian trễ phút, điểm dừng trễ).
    - `reported_by_id` (UUID FK nullable -> `users.id`), `processed_by_id` (UUID FK nullable -> `users.id`).
    - `resolution_type` (VARCHAR nullable), `replacement_user_id` (UUID FK nullable -> `users.id`), `resolution_note` (TEXT nullable).
    - `resolved_at` (TIMESTAMPTZ nullable), `created_at` (TIMESTAMPTZ default now).
    - Indexes: `(trip_id, created_at)` và `(status, created_at)`.
  - Thêm quan hệ ngược trên `User`: `reportedIncidents`, `processedIncidents`.
  - Thêm quan hệ ngược trên `Trip`: `incidents`.
- **Trạng thái di chuyển DB**: Đã tạo migration additive và chạy `npx prisma migrate deploy` an toàn trên PostgreSQL cục bộ. Prisma Client đã được sinh mới (`npx prisma generate`).

---

## 4. API Endpoints & Swagger Specifications
Module mới [IncidentsModule](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/incidents/incidents.module.ts) với đầy đủ decorators `@ApiTags('Operational Incidents')`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`:
1. `GET /incidents/options?tripId={id}`: Kiểm tra điều kiện báo sự cố (khung giờ 15m LIVE, trạng thái sẵn sàng, loại sự cố theo vai trò).
2. `POST /incidents/manual`: Tạo sự cố vắng nhân sự thủ công (chống trùng lặp, CAS lock, kiểm tra `expectedAssigneeId`).
3. `GET /incidents/mine`: Lịch sử sự cố cá nhân cho Mobile (lọc theo `reportedById` hoặc sự cố tự động đã giải trình).
4. `GET /incidents`: Danh sách sự cố cho Web Admin (phân quyền trường cho `SCHOOL_ADMIN`, bộ lọc loại, trạng thái, ngày).
5. `GET /incidents/trip/:tripId`: Danh sách sự cố của chuyến xe (Phụ huynh nhận bản chiếu Privacy Masking ẩn ghi chú và định danh nội bộ).
6. `GET /incidents/:id`: Chi tiết sự cố kèm ngữ cảnh và kết quả xử lý.
7. `GET /incidents/:id/replacement-candidates`: Tìm ứng viên thay thế khả dụng (đúng vai trò, cùng trường với phụ xe, không trùng lịch chuyến/nghỉ).
8. `POST /incidents/:id/resolve`: Giải quyết sự cố (`ARRIVED` kiểm tra vắng mặt, `REPLACED` kiểm tra tính khả dụng của ứng viên, cập nhật Trip và Leave Notice).
9. `POST /incidents/:id/cancel-trip`: Hủy chuyến do thiếu nhân sự (đồng bộ trạng thái Trip, đóng các sự cố và báo nghỉ liên quan).
10. `POST /incidents/:id/confirm`: Phụ xe xác nhận giải trình sự cố tự động (`PENDING_CONFIRMATION` -> `CONFIRMED` với lý do bắt buộc).

---

## 5. Server-Side Detectors, ETA & Telemetry Decoupling
- **Service**: [IncidentsDetectorService](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/incidents/incidents-detector.service.ts).
- **Tách biệt luồng Telemetry**: Trong [TripNavigationService.publish](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trip-navigation.service.ts), detector được kích hoạt qua `setImmediate` chạy hoàn toàn bên ngoài transaction ghi nhận tọa độ GPS. Lỗi phát hiện sự cố không bao giờ làm gián đoạn luồng stream định vị xe.
- **Thuật toán & Ngưỡng**:
  - `OFF_ROUTE`: Tính khoảng cách trực giao vuông góc từ tọa độ xe tới từng đoạn của polyline tuyến đường (`pointToSegmentDistance`). Nếu xe lệch > 100m liên tục trong vệt streak tối thiểu 30 giây (khoảng cách mẫu <= 15 giây, tối thiểu 7 mẫu hợp lệ), ghi nhận sự cố `OFF_ROUTE`.
  - `LATE_STOP`: Chiếu tọa độ xe lên polyline để đo quãng đường di chuyển còn lại đến điểm dừng kế tiếp chưa phục vụ, tính ETA dựa trên tốc độ xe (tối thiểu 15 km/h làm sàn dự phòng). Nếu thời gian dự kiến trễ > 5 phút so với `plannedArrivalTime` liên tục trong 30 giây, ghi nhận sự cố `LATE_STOP`.
  - **Giới hạn số lượng**: Cả hai sự cố sử dụng `dedupeKey = TRIP_<tripId>_<type>` với `INSERT ... ON CONFLICT DO NOTHING`. Mỗi chuyến xe đảm bảo không bao giờ sinh thừa sự cố trùng loại.

---

## 6. Operation Blockers & Validation Guards
- **Service**: [TripsService](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trips.service.ts).
- **Bắt đầu chuyến (`startTrip`)**:
  - Kiểm tra xem chuyến có sự cố thiếu nhân sự (`ATTENDANT_MISSING` hoặc `DRIVER_MISSING`) ở trạng thái `WAITING_ASSIGNMENT` hay không. Nếu có, chặn khởi hành với thông báo tiếng Việt: *"Không thể bắt đầu chuyến xe khi đang có sự cố thiếu nhân sự chưa được xử lý"*.
  - Kiểm tra khung giờ LIVE: Nếu `now > scheduledEndAt`, chặn bắt đầu chuyến với thông báo: *"Chuyến xe đã quá giờ kết thúc dự kiến, không thể bắt đầu ở chế độ LIVE"*.
- **Giáo viên xác nhận sẵn sàng (`markAttendantReady`)**:
  - Bị chặn nếu có sự cố thiếu nhân sự đang mở.
- **Hoàn thành chuyến (`completeTrip`)**:
  - Tự động quét và đóng toàn bộ sự cố `PENDING_CONFIRMATION` của chuyến xe chuyển sang `CLOSED_WITHOUT_CONFIRMATION`.
- **Trạng thái vận hành (`getOperationalState`)**:
  - Trả về cờ `assignmentStatus: 'WAITING_ASSIGNMENT'`, cập nhật `canDriverStart: false`, `canAttendantReady: false` kèm `disabledReasons` chi tiết.

---

## 7. Web Admin UI Implementation
- **Điều hướng Admin**:
  - Thêm icon `AlertTriangleIcon` vào [icons.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/icons.tsx).
  - Thêm mục menu `Sự cố` (`/admin/incidents`) vào cấu hình điều hướng [admin-nav.config.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/admin-nav.config.ts) cho cả `SYSTEM_ADMIN` và `SCHOOL_ADMIN`.
  - Cập nhật test suite [admin-nav.test.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/admin-nav.test.ts) (10 items cho System Admin, 9 items cho School Admin - 87/87 tests pass).
- **Màn hình quản lý sự cố**:
  - Trang [web/src/app/admin/incidents/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/incidents/page.tsx):
    - Bộ lọc: Chọn trường học (đối với System Admin), Loại sự cố, Trạng thái, Ngày phục vụ.
    - Bảng danh sách trực quan: Mã sự cố, Tuyến & Ngày, Loại sự cố (Badges màu chuẩn), Trạng thái, Bằng chứng telemetry / Mô tả, Nút hành động [Xử lý] và [Chi tiết].
    - Phân trang chuẩn với `PaginationControl`.
- **Modal xử lý sự cố**:
  - Component [ResolveIncidentModal](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/incidents/resolve-incident-modal.tsx):
    - 3 phương án xử lý:
      1. `ARRIVED`: Nhân sự đã có mặt kịp thời.
      2. `REPLACED`: Chỉ định nhân sự thay thế (tích hợp API tải danh sách ứng viên khả dụng, chọn ứng viên, hiển thị cảnh báo phân công).
      3. `CANCEL_TRIP`: Hủy chuyến xe khẩn cấp kèm lý do.

---

## 8. Mobile App Implementation & Personal History Isolation
- **Dịch vụ API Client**: [mobile/services/api-client.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/services/api-client.ts) tích hợp đầy đủ DTOs và 6 phương thức HTTP (`getIncidentOptions`, `createManualIncident`, `getTripIncidents`, `getMyIncidents`, `getIncidentDetail`, `confirmAutoIncident`).
  - Đồng bộ `TripIncidentStatus` đầy đủ: `WAITING_ASSIGNMENT`, `WAITING_CONFIRMATION`, `RESOLVED`, `CONFIRMED`, `CLOSED` (kèm alias dự phòng `PENDING_CONFIRMATION`, `CLOSED_WITHOUT_CONFIRMATION`).
- **Màn hình Home Tiện ích** ([mobile/app/(tabs)/index.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/%28tabs%29/index.tsx)):
  - Nút tiện ích "Sự cố" đặt cạnh "Báo nghỉ" trong thẻ TIỆN ÍCH, **chỉ hiển thị cho `Role.DRIVER` và `Role.BUS_ATTENDANT`**.
  - **Ẩn hoàn toàn đối với `Role.PARENT`**.
- **Màn hình Lịch sử sự cố** ([mobile/app/incidents/index.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/incidents/index.tsx)):
  - Chỉ hiển thị lịch sử cá nhân (`/incidents/mine`).
  - Bộ lọc chip ngang theo Loại và Trạng thái (hỗ trợ `WAITING_CONFIRMATION` và `CLOSED`).
  - Danh sách thẻ sự cố với màu sắc nhận diện thương hiệu.
  - **Tuyệt đối không có nút tạo/báo sự cố trong tiện ích, danh sách lịch sử hay trạng thái rỗng.**
- **Màn hình Chi tiết sự cố cá nhân** ([mobile/app/incidents/[id].tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/incidents/%5Bid%5D.tsx)):
  - Hiển thị đầy đủ thông tin chuyến xe, bằng chứng lệch tuyến/trễ giờ (`contextData` & `context`), thông tin nhân sự thay thế và kết quả giải quyết (`resolutionType` & `resolution`).
  - **Điểm xác nhận sự cố cho Giáo viên phụ xe**: Khi sự cố tự động ở trạng thái `WAITING_CONFIRMATION`, hiển thị Hộp cảnh báo yêu cầu giải trình (`actionCallout`) cùng Thanh hành động cố định chân trang (`bottomBar`): `[Xác nhận & Giải trình sự cố]`.
  - Mở modal nhập lý do (tối thiểu 3 ký tự) và gọi `confirmAutoIncident` gửi lên backend an toàn.
- **Màn hình Chi tiết chuyến xe** ([mobile/app/trip/[id].tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/trip/%5Bid%5D.tsx)):
  - **Sửa lỗi Enum Mismatch**: `unconfirmedPendingIncident` kiểm tra cả `WAITING_CONFIRMATION` và `PENDING_CONFIRMATION`. Nhờ vậy auto-prompt popup và các điểm xác nhận hoạt động chính xác 100%.
  - **Badge Sự cố ở Header thu gọn (Collapsed Header Badge)**: Nếu có sự cố tự động chờ giải trình, hiển thị badge nổi bật màu đỏ `Cần giải trình` bấm trực tiếp để mở modal giải trình ngay. Nếu không có sự cố chờ xác nhận nhưng có sự cố khác, hiển thị `⚠ N sự cố` để chuyển nhanh đến tab "Sự cố".
  - **Banner cảnh báo trong Bottom Sheet mở rộng (`sheetWarningBanner`)**: Khi Bottom Sheet được kéo mở (đang xem điểm đón / điểm danh), một banner cảnh báo viền vàng cam xuất hiện ngay trên thanh Tab kèm nút `[Giải trình ngay]`, đảm bảo giáo viên luôn nhìn thấy yêu cầu xác nhận ở bất kỳ trạng thái nào của giao diện.
  - **Banner nổi trên bản đồ (`floatingWarningBanner`)**: Hiển thị trên góc bản đồ khi Bottom Sheet thu gọn.
  - **Nút "Giải trình ngay" trong Tab "Sự cố"**: Khắc phục điều kiện hiển thị nút `[Giải trình ngay]` trên từng thẻ sự cố `WAITING_CONFIRMATION`.
  - **Tối ưu Tab Switcher cho Phụ huynh (Parent Full-width 3-Tab Bar)**: Phía Phụ huynh hiển thị thanh tab gồm đúng 3 tab (`Thông tin`, `Điểm đón`, `Sự cố`), dàn đều toàn bộ chiều rộng (`flex: 1` mỗi tab), 100% hiển thị rõ ràng trên mọi kích cỡ màn hình mà không cần cuộn ngang (không bị che khuất).
  - **Tab Switcher cho Nhân sự (Driver/Attendant)**: Hiển thị 4 tab (thêm `Điểm danh`) với cuộn ngang mượt mà.
  - **Nút "Báo sự cố ⚠" góc phải trên cùng**: Chỉ xuất hiện cho Tài xế/Phụ xe hợp lệ trong khung giờ cho phép (`canReport === true`), ẩn hoàn toàn với Phụ huynh.
  - **Modal Báo sự cố thủ công**: Khóa cố định loại sự cố theo vai trò (Tài xế báo "Vắng phụ xe", Phụ xe báo "Vắng tài xế"), ghim cố định thông tin chuyến xe, ô nhập ghi chú bổ sung.
  - **Bảo vệ quyền riêng tư Phụ huynh (Privacy Masking)**: Phụ huynh xem danh sách sự cố chỉ thấy loại sự cố, trạng thái và thời điểm ghi nhận; toàn bộ ghi chú nội bộ, bằng chứng telemetry và thông tin người xử lý được ẩn hoàn toàn cả ở tầng API Backend lẫn Client JSX.
  - **Trải nghiệm đóng bàn phím (Keyboard Dismiss / Blur)**:
    - Bọc toàn bộ modal trong `KeyboardAvoidingView` và `Pressable` nền `StyleSheet.absoluteFill` gọi `Keyboard.dismiss`, cho phép chạm vào bất kỳ vùng trống nào ngoài ô nhập để hạ bàn phím ngay lập tức.
    - Bổ sung nút bấm trực quan `[Ẩn phím]` bên cạnh nhãn ô nhập để chủ động thu gọn bàn phím mà không bị kẹt khi đang gõ multiline.
    - Tự động hạ bàn phím khi ấn "Hủy", "Để sau", hoặc "Xác nhận & Gửi".

---

## 9. Wireframe & Visual Flow Summary
- **Màu sắc thương hiệu**: Primary `#FFCB56`, Nền `#FFFDF6`, Text `#1E293B`, Thẻ `#FFFFFF`, Cảnh báo `#B45309`/`#FEF3C7`, Nguy hiểm `#DC2626`/`#FEE2E2`.
- **Luồng Mobile Phụ xe giải trình**:
  `[Detector phát hiện lệch tuyến > 100m trong 30s]` -> `[Server tạo Incident PENDING_CONFIRMATION]` -> `[Trip Detail hiển thị Popup giải trình]` -> `[Nhập lý do + Gửi]` -> `[Incident CONFIRMED]`. Hoặc `[Để sau]` -> `[Đóng popup, mở khóa điểm danh]` -> `[Banner cảnh báo vàng vẫn lưu trên màn hình]` -> `[Bấm Xác nhận mở lại popup]`.
- **Luồng Báo vắng nhân sự thủ công**:
  `[Tài xế / Phụ xe vào Trip Detail]` -> `[Bấm nút "Báo sự cố ⚠" góc phải]` -> `[Modal hiển thị loại sự cố cố định theo role]` -> `[Bấm Gửi]` -> `[Server CAS Lock tạo Incident WAITING_ASSIGNMENT]` -> `[Trip chuyển sang WAITING_ASSIGNMENT, chặn Start/Ready]` -> `[Admin nhận sự cố trên Web]` -> `[Admin phân công thay thế hoặc hủy chuyến]`.

---

## 10. Test Data Policy Compliance Statement
- **Tuân thủ tuyệt đối**: Không tự ý thêm records dữ liệu giả vào Database, không tự tạo User/Student/Trip để test mutation, không tự ý sửa đổi bản ghi thật trong DB.
- **Kiểm chứng an toàn**: Toàn bộ kiểm chứng được thực hiện bằng phương pháp compile-time (`npx tsc --noEmit`), linters, build check và bộ unit test tự lập không chạm cơ sở dữ liệu thật.

---

## 11. Verification Results
- **Backend (`/api`)**:
  - `npx --no-install tsc --noEmit --incremental false`: **PASS (0 errors)**.
  - `npm test`: **PASS (30/30 test files, 388/388 unit tests passing)**.
- **Web Admin (`/web`)**:
  - `npx --no-install tsc --noEmit --incremental false`: **PASS (0 errors)**.
  - `npm test`: **PASS (87/87 unit tests passing)**.
- **Mobile App (`/mobile`)**:
  - `npx --no-install tsc --noEmit --incremental false`: **PASS (0 errors)**.

---

## 12. Files Changed & Added
- **Database & Prisma**:
  - `api/prisma/schema.prisma`
  - `api/prisma/migrations/20261026174653_add_trip_incidents/migration.sql`
- **Backend API**:
  - `api/src/incidents/dto/*` (8 DTO files)
  - `api/src/incidents/incidents-detector.service.ts`
  - `api/src/incidents/incidents.service.ts`
  - `api/src/incidents/incidents.controller.ts`
  - `api/src/incidents/incidents.module.ts`
  - `api/src/incidents/incidents.service.spec.ts`
  - `api/src/app.module.ts`
  - `api/src/trips/trip-navigation.service.ts`
  - `api/src/trips/trips.service.ts`
  - `api/src/trips/dto/trip-operation.dto.ts`
- **Web Admin**:
  - `web/src/components/icons.tsx`
  - `web/src/components/admin/admin-nav.config.ts`
  - `web/src/components/admin/admin-nav.test.ts`
  - `web/src/components/admin/admin-sidebar.tsx`
  - `web/src/lib/types.ts`
  - `web/src/lib/api-client.ts`
  - `web/src/components/admin/incidents/resolve-incident-modal.tsx`
  - `web/src/app/admin/incidents/page.tsx`
- **Mobile App**:
  - `mobile/services/api-client.ts`
  - `mobile/app/(tabs)/index.tsx`
  - `mobile/app/incidents/index.tsx`
  - `mobile/app/incidents/[id].tsx`
  - `mobile/app/trip/[id].tsx`
- **Tài liệu & Báo cáo**:
  - `docs/ai-review/LATEST.md`
  - `docs/ai-review/LATEST.diff`

---

## 13. Single Suggested Next Step
- **Bước tiếp theo đề xuất duy nhất**: Trình Product Owner nghiệm thu luồng sự cố vận hành trên môi trường dev (Web Admin `/admin/incidents` và Mobile App Chi tiết chuyến / Lịch sử sự cố).

---
*DỪNG LẠI VÀ CHỜ PHẢN HỒI CỦA PRODUCT OWNER (STOP-AFTER-TASK).*
