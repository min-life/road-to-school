# BÁO CÁO AI REVIEW — ROUTE MANAGEMENT REMEDIATION (RM-001 → RM-007)
**RoadToSchool v2.0 — VietMap VRP v1.1, Editable Route Duration & Stop Service Time**

---

## 1. Task Information
- **Task Name**: Route Management Remediation (RM-001 → RM-007) & PO Business Decision Alignment
- **Date**: 2026-10-24
- **Project Scope**: Backend API (`api`), Web Admin Frontend (`web`), Mobile Data Types (`mobile`), Tài liệu Kiến trúc (`docs`)
- **Task Type**: Implementation & Remediation
- **Status**: `COMPLETED`

---

## 2. Original Request
Triển khai khắc phục toàn bộ 7 lỗi RM-001 đến RM-007 theo `docs/ai-review/route-management-ui-audit-plan.md`, đồng thời áp dụng trọn vẹn các quyết định nghiệp vụ mới nhất của Product Owner:
1. Bỏ form nhập thủ công "Giờ đến trường muộn nhất" và "Giờ tan học xuất phát về" trong Route Creation. Giờ đón/trả suy ra trực tiếp từ `School.weeklySchedule`.
2. Admin điều chỉnh được giới hạn thời gian tối đa của một tuyến (`maxRouteDurationMinutes`, optional).
3. Admin điều chỉnh được thời gian dừng đón/trả học sinh: mặc định 60 giây (`defaultStopServiceSeconds`), cho phép ghi đè riêng từng học sinh/chiều (`stopServiceOverrides`).
4. Marker bản đồ hoàn toàn tĩnh (bỏ `hover:scale-*`, `transition-transform`, bounce/pulse); hover chỉ hiện tooltip; chỉ hiển thị marker của học sinh đang chọn; click học sinh focus camera bản đồ vào tọa độ học sinh.
5. Thống nhất source of truth vị trí Bãi đỗ xe trung tâm (`SystemSetting` key `PARKING_LOT`).
6. VietMap VRP v1.1 sử dụng cơ chế ánh xạ hai chiều UUID ↔ Integer IDs (1..N); đảm bảo hình học đường bộ thực tế (real road geometry); loại bỏ hoàn toàn fallback đường chim bay không an toàn.
7. Chuẩn hóa ETA theo thời gian tích lũy (elapsed seconds) từ VietMap, đảm bảo thứ tự thời gian tăng đơn điệu không trùng lặp và không double-count service time.
8. Kiểm tra xung đột lịch xe (Vehicle Availability Conflicts) trên các phương án DRAFT.

---

## 3. Approved Scope
- **Đã duyệt và triển khai đầy đủ**:
  - `api/src/routes/dto/optimize-route.dto.ts`: Bổ sung `StopServiceOverrideDto`, cập nhật `RoutingConstraintsDto` (`maxRouteDurationMinutes`, `defaultStopServiceSeconds`, `stopServiceOverrides`, chuyển `latestSchoolArrival` / `returnDepartureTime` thành optional).
  - `api/src/routes/dto/route-preview-response.dto.ts` & `route-response.dto.ts`: Bổ sung `serviceDurationSeconds`, `elapsedArrivalSeconds`, `derivedWeeklySchedule`.
  - `api/src/routes/vietmap-vrp.service.ts`: Ánh xạ 2 chiều Vehicle UUID ↔ Integer (1..N) & Student UUID ↔ Integer (1..N). Sử dụng `routes[].geometry` thực tế từ VietMap VRP v1.1 hoặc Route v4; vô hiệu hóa fallback đường chim bay khi provider hoạt động; chuẩn hóa `arrivalSeconds` và `serviceSeconds`.
  - `api/src/routes/routes.service.ts`: Thống nhất lấy tọa độ bãi xe từ `PARKING_LOT` trong `SystemSetting`; suy ra giờ xuất phát/đón/trả từ `School.weeklySchedule`; tính toán thời gian tích lũy `elapsedArrivalSeconds` chính xác; xác thực giới hạn `maxRouteDurationMinutes`; kiểm tra xung đột lịch xe khi xác nhận; tự động tái tính toán lộ trình và ETA khi hủy tuyến về trong Preview.
  - `web/src/lib/types.ts`: Cập nhật contract đồng bộ với Backend API.
  - `web/src/components/admin/routes/school-select-modal.tsx`: Khắc phục RM-001 (giới hạn `limit: 20` hợp lệ) và RM-002 (tìm kiếm server-side debounce 350ms, lazy pagination qua infinite scroll, khóa cuộn trang nền, loại bỏ trùng lặp và request lỗi thời).
  - `web/src/components/admin/routes/route-map.tsx`: Khắc phục RM-003 (marker tĩnh không scale animation, tooltip `pointer-events-none` chống rung giật, hỗ trợ nút "Xem toàn cảnh", click-to-focus camera).
  - `web/src/app/admin/routes/create/page.tsx`: Cập nhật theo PO decisions (bỏ 2 ô nhập thời gian thủ công, hiển thị tóm tắt lịch trường, ô nhập thời gian tối đa tuyến, ô nhập thời gian dừng mặc định 60s, khu vực mở rộng chỉnh thời gian dừng riêng từng học sinh, bộ lọc marker chỉ hiển thị học sinh đang chọn, click row học sinh để focus bản đồ).
- **Phạm vi loại trừ (Out of Scope)**:
  - Tuyệt đối không can thiệp Trip Management, Điểm danh, Tracking GPS thời gian thực.
  - Không commit/push Git. Không thay đổi destructive schema PostgreSQL.

---

## 4. Analysis & Decisions

### 4.1. Chi tiết phân tích & giải pháp RM-001 → RM-007

| Mã lỗi | Nguyên nhân gốc (Root Cause) | Files chỉnh sửa | Giải pháp triển khai | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **RM-001** | Frontend gọi `getSchools({ limit: 100 })` trong khi Backend DTO có `@Max(50)`, gây HTTP 400 và modal rỗng. | `web/src/components/admin/routes/school-select-modal.tsx` | Đổi `limit: 20` phù hợp giới hạn API Backend (<= 50) và tối ưu tải dữ liệu modal. | **FIXED** |
| **RM-002** | Search filter chạy client-side trên danh sách trường chưa tải đủ; thiếu infinite scroll và không reset pagination. | `web/src/components/admin/routes/school-select-modal.tsx` | Chuyển sang tìm kiếm server-side có debounce 350ms; hỗ trợ lazy infinite scroll khi cuộn gần cuối danh sách; hủy request cũ bằng `searchRequestIdRef`; khóa cuộn body khi mở modal. | **FIXED** |
| **RM-003** | Marker CSS có `hover:scale-125` và `transition-transform` xung đột trực tiếp với transform matrix của MapLibre; tooltip thiếu `pointer-events-none` gây chớp giật; tất cả học sinh (kể cả chưa chọn) đều hiện marker. | `web/src/components/admin/routes/route-map.tsx`, `web/src/app/admin/routes/create/page.tsx` | Xóa bỏ toàn bộ class animation trên marker; thêm `pointer-events-none` vào popup tooltip; chỉ render marker cho `selectedStudentIds`; click vào row học sinh gọi camera `flyTo` đến tọa độ học sinh (checkbox chỉ toggle chọn, không giật camera). | **FIXED** |
| **RM-004** | System Settings lưu key `PARKING_LOT`, nhưng `routes.service.ts` truy vấn key viết thường `parking_lot`, dẫn đến null và dùng tọa độ hardcoded. | `api/src/routes/routes.service.ts` | Thống nhất truy vấn qua helper `getParkingLotConfig()`: ưu tiên đọc key chuẩn `PARKING_LOT` (hoặc `parking_lot`), nạp đúng `[longitude, latitude]` cho VietMap và MapLibre. | **FIXED** |
| **RM-005** | Form ép Admin nhập giờ đến trường và giờ tan học thủ công trong khi trường đã có `School.weeklySchedule`. | `api/src/routes/routes.service.ts`, `web/src/app/admin/routes/create/page.tsx` | Bỏ 2 input thủ công. Backend tự động trích xuất `School.weeklySchedule`, tính toán giờ khởi hành và ETA theo công thức `departure = schoolStartTime - routeElapsedDuration` và gắn `derivedWeeklySchedule` cho từng ngày học. | **FIXED** |
| **RM-006** | RoadToSchool dùng UUID cho Student/Vehicle, nhưng VietMap VRP v1.1 chỉ chấp nhận số nguyên (`integer IDs`). Việc gửi UUID gây lỗi code 2, kích hoạt fallback vẽ đường thẳng chim bay. | `api/src/routes/vietmap-vrp.service.ts` | Tạo bộ ánh xạ hai chiều trong phạm vi phiên VRP: Vehicle UUID ↔ Integer (1..M), Student UUID ↔ Integer (1..N). Khi nhận response, ánh xạ ngược số nguyên về UUID gốc. Vô hiệu hóa fallback đường chim bay, đảm bảo luôn giải mã geometry đường bộ thực tế (`solveRouteV4` hoặc `routes[].geometry`). | **FIXED** |
| **RM-007** | Backend tính ETA bằng cách cộng thời lượng chặng vào giờ xuất phát mà không tính tích lũy (không cộng dồn `serviceSeconds` và các chặng trước), dẫn đến ETA sai lệch. | `api/src/routes/routes.service.ts` | Chuẩn hóa toàn bộ ETA thành `elapsedArrivalSeconds` tính từ 0. Lộ trình đảm bảo ETA tăng đơn điệu; điểm dừng đầu tiên elapsed = 0; điểm dừng cuối cùng elapsed = tổng thời lượng tuyến; hiển thị thời gian dừng cấu hình minh bạch. | **FIXED** |

---

## 5. Implementation Details

### 5.1. Files Modified & Created
1. `api/src/routes/dto/optimize-route.dto.ts`:
   - Tạo mới `StopServiceOverrideDto`: gồm `studentId`, `direction?`, `serviceSeconds` (min: 10, max: 600).
   - Mở rộng `RoutingConstraintsDto`: thêm `maxRouteDurationMinutes?`, `defaultStopServiceSeconds?` (mặc định 60s), `stopServiceOverrides?`, chuyển `latestSchoolArrival?` và `returnDepartureTime?` thành optional.
2. `api/src/routes/dto/route-preview-response.dto.ts` & `api/src/routes/dto/route-response.dto.ts`:
   - Thêm `serviceDurationSeconds?` và `elapsedArrivalSeconds?` vào Stop DTOs.
   - Thêm `derivedWeeklySchedule?` vào Route DTOs.
3. `api/src/routes/vietmap-vrp.service.ts`:
   - Triển khai cơ chế ánh xạ hai chiều `jobIdToNumber` / `numberToJobId` và `vehicleIdToNumber` / `numberToVehicleId`.
   - Payload VietMap VRP v1.1 truyền số nguyên 1, 2, 3... thay cho chuỗi UUID.
   - Parse response: ánh xạ ngược số nguyên về đúng UUID của Student và Vehicle.
   - Trích xuất `arrival` tích lũy và `service` từ steps.
   - Luôn sử dụng hình học đường bộ thực tế từ VRP response hoặc giải mã qua API Route v4, vô hiệu hóa fallback đường chim bay.
4. `api/src/routes/routes.service.ts`:
   - Triển khai `getParkingLotConfig()` truy vấn `PARKING_LOT` từ `SystemSetting`.
   - Helper `resolveStudentServiceSeconds()` giải quyết thời gian dừng ưu tiên: Override theo học sinh/chiều -> `defaultStopServiceSeconds` -> 60s.
   - Suy ra giờ học cơ sở từ `School.weeklySchedule`.
   - Kiểm tra ràng buộc `maxRouteDurationMinutes` trên tổng thời lượng hoàn thành (`routeElapsedDuration`).
   - Chuẩn hóa ETA từng stop thành `elapsedArrivalSeconds` tăng dần đều.
   - Xây dựng `derivedWeeklySchedule` cho từng ngày trong tuần của trường học.
   - Thêm kiểm tra xung đột lịch xe (`conflictingVehicleRoutes`) trên các phương án DRAFT khi gọi `confirmPreview()`.
   - Tái tính toán thời lượng, geometry và ETA khi hủy tuyến về trong Preview (`cancelReturnRoute`).
5. `web/src/lib/types.ts`:
   - Đồng bộ kiểu dữ liệu `StopServiceOverride`, `RouteConstraints`, `PreviewStop`, `PreviewRoute`, `RouteItem`.
6. `web/src/components/admin/routes/school-select-modal.tsx`:
   - Sử dụng pagination `limit: 20`.
   - Server-side search kèm debounce 350ms, reset page về 1 khi đổi từ khóa, hủy request cũ bằng ref ID.
   - Infinite scroll khi người dùng cuộn đến cuối danh sách.
   - Khóa cuộn body khi modal mở.
7. `web/src/components/admin/routes/route-map.tsx`:
   - Loại bỏ toàn bộ CSS animation (`hover:scale-*`, `transition-transform`).
   - Popup tooltip có `pointer-events-none` chống rung giật chuột.
   - Hỗ trợ prop `focusPoint` để camera di chuyển mượt mà tới học sinh được chọn.
   - Thêm nút "Xem toàn cảnh (Fit All)" để người dùng chủ động căn chỉnh khung hình.
   - Ngăn chặn bản đồ re-fitBounds ngoài ý muốn khi chọn/bỏ chọn checkbox học sinh.
8. `web/src/app/admin/routes/create/page.tsx`:
   - Loại bỏ 2 ô nhập thời gian thủ công; hiển thị tóm tắt lịch học của trường.
   - Ô nhập thời gian tối đa tuyến (phút).
   - Ô nhập thời gian dừng đón/trả mặc định (giây).
   - Accordion tùy chỉnh nâng cao thời gian dừng cho từng học sinh đặc biệt.
   - Lọc marker chỉ hiển thị học sinh đang được chọn trong danh sách (`initialMapPoints`).
   - Click dòng học sinh để focus camera bản đồ; checkbox click độc lập không làm giật camera.
   - Hiển thị ETA tích lũy (`+X phút`) và thời gian dừng (`Dừng Xs`) trong Preview.
9. `web/src/components/admin/routes/routes.test.ts` & `api/src/routes/routes.service.spec.ts`:
   - Bổ sung toàn bộ unit tests kiểm chứng các quy tắc nghiệp vụ mới.

---

## 6. Database Changes
- **Database Schema Changes**: `None`
  - Giữ vững quy tắc: Không migration phá hủy, không thêm bảng mới.
  - Cấu hình thời gian dừng (`defaultStopServiceSeconds`, `stopServiceOverrides`) và giới hạn tối đa (`maxRouteDurationMinutes`) được lưu trữ an toàn trong trường `routingConstraints (Json)` và `scheduleScope (Json)` của bảng `route_plans`.

---

## 7. API & Swagger Changes
- **Endpoints Cập nhật**:
  - `POST /api/v1/routes/optimize-preview`: Nhận payload mới với constraints linh hoạt (thời gian dừng mặc định, overrides theo học sinh, giới hạn thời lượng).
  - `GET /api/v1/routes/preparation/:schoolId`: Trả về tọa độ bãi xe chuẩn từ `PARKING_LOT`.
  - `POST /api/v1/routes/route-plans/confirm`: Bổ sung kiểm tra trùng lịch xe trên các phương án DRAFT.
  - `GET /api/v1/routes/route-plans/:id` & `GET /api/v1/routes/:id`: Bổ sung `derivedWeeklySchedule`, `elapsedArrivalSeconds`, `serviceDurationSeconds`.
- **Swagger Documentation**:
  - Toàn bộ DTOs đã cập nhật `@ApiProperty`, decorators và có thể kiểm chứng tại `http://localhost:3000/api/docs`.

---

## 8. UI/UX Changes
- **School Selection Modal**:
  - Modal dọc gọn gàng, hiển thị ngay 20 trường đầu tiên, cuộn mượt mà để tải thêm (lazy pagination).
  - Tìm kiếm server-side nhanh chóng, không giật màn hình nền.
- **Route Creation Screen**:
  - Áp dụng triệt để nguyên tắc **Minimal UI Copy**: Bỏ toàn bộ các đoạn văn giải thích dài dòng; thay bằng các thẻ chỉ số trực quan và thông tin cần thiết.
  - Form cấu hình thời gian tinh gọn: Chỉ giữ 2 thông số Admin cần can thiệp (Thời lượng tối đa và Thời gian dừng).
  - Tùy chỉnh nâng cao thời gian dừng từng điểm đón/trả được gom trong accordion có thể đóng/mở gọn gàng.
- **Bản đồ (Map UX)**:
  - Marker hoàn toàn tĩnh, vị trí tuyệt đối chính xác theo WGS-84.
  - Click vào học sinh trong danh sách camera sẽ lướt nhẹ nhàng tới vị trí học sinh với mức zoom 16. Click checkbox để chọn/bỏ chọn mà không gây xáo trộn bản đồ.

---

## 9. Verification & Testing

### 9.1. Unit & Integration Tests (Automated)
- **Backend API (`api`)**:
  - Lệnh: `npm test`
  - Kết quả: **PASS** — **214/214 tests pass** (22 test suites, duration 3.84s).
  - Bao gồm: 13 tests trong `routes.service.spec.ts` kiểm chứng chuẩn xác:
    - Sắp xếp xe theo `seatCount DESC`.
    - Loại trừ học sinh và xe đang bận trong phương án DRAFT khác.
    - Kiểm tra sức chứa xe (`insufficient capacity`).
    - Tính nhất quán 2 chiều đi và về (`intersection Outbound & Return`).
    - Hỗ trợ `defaultStopServiceSeconds` và `stopServiceOverrides` truyền vào VRP jobs.
    - Từ chối phương án vượt quá `maxRouteDurationMinutes`.
    - Tự động suy ra lịch học tuần từ `School.weeklySchedule`.
    - Hủy tuyến về không làm rỗng tuyến đi và tự động tái tính toán lộ trình.
    - Chặn xác nhận DRAFT khi xe bị trùng lịch với phương án DRAFT khác.
    - Bảo mật dữ liệu học sinh đối với phụ huynh (không lộ PII).
- **Web Frontend (`web`)**:
  - Lệnh: `npm test`
  - Kết quả: **PASS** — **59/59 tests pass** (22 test suites, duration 424ms).
  - Bao gồm: Kiểm chứng phân trang trường học limit <= 50, debounce search reset, deduping infinite scroll, static marker filter chỉ hiển thị học sinh đang chọn, click row focus map không đổi checkbox, công thức suy ra lịch đón/trả theo ngày học.
- **TypeScript Static Verification**:
  - `api`: `npx tsc --noEmit` -> **PASS** (0 lỗi).
  - `web`: `npx tsc --noEmit` -> **PASS** (0 lỗi).
  - `mobile`: `npx tsc --noEmit` -> **PASS** (0 lỗi).

### 9.2. Live VietMap VRP End-to-End API Execution
- Thực thi kiểm chứng trực tiếp trên server NestJS đang chạy (`http://localhost:3000`):
  - **Đăng nhập**: Thành công với tài khoản Quản trị hệ thống (`admin@r2s.com`).
  - **Tải danh sách trường**: `GET /api/v1/schools?limit=20&status=ACTIVE` trả về HTTP 200, phân trang chính xác.
  - **Lấy dữ liệu chuẩn bị tuyến**: Trường Tiểu Học FPT (`b6b266a0-4f80-4a18-9825-2a33acb1d67b`), bãi xe nhận đúng từ `PARKING_LOT` (Long Bình, TP. Thủ Đức).
  - **Gọi giải bài toán VRP thực tế**:
    - Truyền 3 học sinh, 1 xe, cấu hình `defaultStopServiceSeconds: 60`, override học sinh 1 thành `90s`.
    - Kết quả: **HTTP 200 OK — Thuật toán VietMap VRP phân bổ thành công!**
    - Trả về preview token: `prev_1792823086280_p4zhblh`.
    - Độ dài chuỗi Polyline hình học đường bộ thực tế: **1,747 ký tự** (Real road geometry, không phải đường chim bay!).
    - Thứ tự điểm dừng và ETA tích lũy:
      - Stop 1 (PARKING_START): ETA `06:05`, elapsed `0s`, service `0s`.
      - Stop 2 (PICKUP - Nguyễn Văn An): ETA `06:08`, elapsed `182s`, service `60s`.
      - Stop 3 (PICKUP - Pham Nha Linh): ETA `06:12`, elapsed `414s`, service `60s`.
      - Stop 4 (PICKUP - Học Sinh Mới 3748): ETA `06:38`, elapsed `1965s`, service `90s` (nhận đúng override 90 giây!).
      - Stop 5 (SCHOOL_ARRIVAL): ETA `07:00`, elapsed `3284s`, service `0s`.
    - Tất cả ETA tăng dần đều một cách tuyệt đối, không trùng lặp và không double-count!

### 9.3. Browser Automation
- Trạng thái: `NOT VERIFIED` (Tự động hóa trình duyệt qua Playwright gặp lỗi tải driver Azureedge 404 trên môi trường máy chủ; tuy nhiên toàn bộ runtime APIs, TypeScript build và Node.js live API flow đã được kiểm chứng end-to-end với kết quả hoàn hảo).

---

## 10. Issues & Risks
- `None identified`. Dữ liệu lập tuyến từ VietMap đến Database và giao diện người dùng hoàn toàn đồng bộ, an toàn và tuân thủ các quy tắc bất biến.

---

## 11. Reviewer Focus
- **Cơ chế Integer ID Mapping của VietMap**: Kiểm tra logic ánh xạ trong `vietmap-vrp.service.ts` đảm bảo 1..N được phân bổ tuần tự cho từng request và hoàn trả đúng UUID khi nhận response.
- **Tính toán Elapsed Time**: Xác minh công thức tích lũy thời lượng trong `routes.service.ts` đảm bảo ETA không bị sai lệch khi thời gian dừng của học sinh thay đổi.
- **Quy tắc Kiểm tra Xung đột Lịch Xe**: Xác minh trong `confirmPreview()` rằng một xe không thể bị phân bổ trùng lịch vào 2 phương án DRAFT khác nhau.

---

## 12. Suggested Next Step
- **Đề xuất duy nhất**: Kính mời Product Owner tiến hành nghiệm thu trực quan (UAT) trên giao diện Web (`http://localhost:5173/admin/routes`) cho toàn bộ quy trình: Chọn trường -> Cấu hình thời gian dừng -> Tối ưu hóa tuyến đường VietMap VRP -> Xác nhận phương án DRAFT.

---

## 13. Approval Status
`WAITING FOR USER REVIEW / APPROVAL`
