# BÁO CÁO AI REVIEW — KHẮC PHỤC LỖI TÍNH NHẤT QUÁN DỮ LIỆU BẢN ĐỒ & MARKER TUYẾN
**Mã đợt review:** `2026-10-24-1415-route-map-data-consistency-fix`  
**Dự án:** RoadToSchool v2.0  
**Phân hệ:** Route Management (Web Student Detail, Web Route Detail, Mobile Parent Route Detail)  
**Thời gian thực hiện:** 24/10/2026 14:15:00 +07:00  
**Tác vụ:** Điều tra nguyên nhân gốc, sửa tại nguồn, đồng bộ dữ liệu bản đồ Cross-Platform cho 3 lỗi BUG-01, BUG-02, BUG-03.

---

## 1. Metadata
- **Module / Feature:** Route Management — Map Data Consistency & Marker Remediation
- **Thời điểm:** 2026-10-24T14:15:00+07:00
- **Tác giả:** Senior Full-Stack Engineer / GIS & MapLibre Integration Specialist
- **Môi trường:** Development (PostgreSQL 16, NestJS 10, Next.js 15, Expo React Native, MapLibre GL v6, Leaflet 1.9.4)
- **Files Modified:**
  - `api/src/routes/dto/route-response.dto.ts`
  - `api/src/routes/routes.service.ts`
  - `api/src/routes/routes.service.spec.ts`
  - `web/src/lib/types.ts`
  - `web/src/app/admin/routes/[id]/page.tsx`
  - `web/src/components/admin/routes/route-map.tsx`
  - `mobile/utils/polyline.ts` *(Mới)*
  - `mobile/app/parent/route-detail.tsx`

---

## 2. Original Request
Product Owner phát hiện 3 vấn đề thực tế trong phân hệ Route Management:
1. **BUG-01:** Polyline trong chi tiết học sinh không đồng bộ giữa Web và Mobile.
2. **BUG-02:** Marker bãi xe trong chi tiết học sinh vẫn hiển thị tọa độ cũ, không nhất quán với dữ liệu bãi xe hiện tại hoặc dữ liệu phương án tuyến.
3. **BUG-03:** Bản đồ chi tiết tuyến chưa hiển thị marker riêng biệt cho trường học và bãi xe.

---

## 3. Approved Scope
- **BUG-01:** Khắc phục triệt để lỗi phân mảnh / hỏng polyline trên Mobile Parent Route Detail so với Web Student Detail; đảm bảo 100% tọa độ hình học đường bộ thực tế sau giải mã trên Web và Mobile trùng khớp toán học.
- **BUG-02:** Thiết lập quy tắc Snapshot-first cho vị trí Bãi xe trung tâm. Tuyến đang xem lấy đúng snapshot tọa độ bãi xe đã lưu trong `RouteStop` (`PARKING_START` hoặc `PARKING_END`), loại bỏ triệt để fallback hardcoded cũ và lỗi truy vấn lowercase `parking_lot`.
- **BUG-03:** Bổ sung marker riêng biệt cho Trường học (`🏫`) và Bãi xe (`P`) trên bản đồ chi tiết tuyến (`/admin/routes/[id]`), tự động lấy tọa độ từ RouteStop snapshot; bổ sung tính năng click điểm dừng trên timeline để focus camera bản đồ.

---

## 4. Root Cause Analysis

### BUG-01 — Vì sao polyline Web/Mobile khác nhau?
1. **Lỗi Backslash Escape khi tiêm chuỗi Polyline vào JavaScript `<script>` trên Mobile:**
   - Trên Web (`web/src/lib/polyline.ts`), chuỗi `polylineGeometry` được lưu trong bộ nhớ JavaScript và truyền trực tiếp vào hàm `decodePolyline(str)`.
   - Trên Mobile (`mobile/app/parent/route-detail.tsx`), chuỗi `polylineGeometry` được nội suy trực tiếp vào mẫu HTML của WebView: `var polylineStr = '${polylineEncoded}';`.
   - Trong thuật toán mã hóa Google Polyline (VietMap sử dụng), ký tự ASCII 92 (`\`) xuất hiện thường xuyên khi chunk 5-bit có giá trị 29 (`92 - 63 = 29`). Khi trình duyệt trong WebView biên dịch thẻ `<script>`, mọi dấu `\` bị coi là escape sequence (`\n` biến thành newline gây lỗi cú pháp `Unterminated string literal`, `\t`, `\r`, `\\`,...). Điều này làm sai lệch toàn bộ mã ASCII của chuỗi polyline, khiến hàm `decode` trong Leaflet bị đứt đoạn, nhảy tọa độ hoặc crash hoàn toàn.
2. **Lỗi WebView không reload khi chuyển chiều di chuyển (Stale State):**
   - `<WebView>` trong React Native không có prop `key` thay đổi theo `activeDirection` và `routeId`. Khi phụ huynh chuyển "Chiều đi" ↔ "Chiều về", WebView giữ nguyên trang cũ hoặc không kích hoạt lại script Leaflet, tạo cảm giác polyline không cập nhật hoặc thiếu dữ liệu.

### BUG-02 — Vì sao Student Detail lấy bãi xe cũ?
1. **Lỗi truy vấn sai Key trong SystemSetting:**
   - Trong `routes.service.ts` hàm `getStudentRoutingDetail`, mã nguồn truy vấn `findUnique({ where: { key: 'parking_lot' } })` (viết thường). Trong khi cơ sở dữ liệu lưu trữ key là `'PARKING_LOT'` (viết hoa). Truy vấn luôn trả về `null`, kích hoạt fallback về `this.defaultParking` (tọa độ cũ `10.8498, 106.7725`).
2. **Vi phạm nguyên tắc Snapshot-First của Phương án tuyến:**
   - API `getStudentRoutingDetail` tự ý đọc vị trí bãi xe từ Settings hiện hành thay vì đọc snapshot điểm dừng bãi xe (`PARKING_START` / `PARKING_END`) đã được ghi nhận trong `RouteStop` của chính tuyến đó khi lập kế hoạch.

### BUG-03 — Vì sao Route Detail thiếu School & Parking markers?
1. **Bộ lọc Frontend loại bỏ các điểm dừng không phải học sinh:**
   - Trong `web/src/app/admin/routes/[id]/page.tsx`, `mapPoints` chỉ lọc `s.stopType === 'PICKUP' || s.stopType === 'DROPOFF'`.
   - Trang chi tiết không truyền `schoolLocation` và `parkingLocation` vào component `<RouteMap>`.
   - Do đó, `<RouteMap>` nhận `schoolLocation: undefined` và `parkingLocation: undefined`, chỉ vẽ marker các điểm đón/trả học sinh.

---

## 5. Data Source Verification & Architecture
- **Geometry Source of Truth:** `Route.polylineGeometry` lưu trong Database (được sinh ra từ VietMap VRP v1.1 hoặc Route v4).
- **Parking Coordinates Source:** Snapshot từ `RouteStop` thuộc tuyến đang xét (`stopType === PARKING_START` với TO_SCHOOL, `stopType === PARKING_END` với TO_PARKING). Nếu dữ liệu lịch sử thiếu, fallback an toàn sang `getParkingLotConfig()` (`SystemSetting` key `PARKING_LOT`).
- **School Coordinates Source:** Snapshot từ `RouteStop` (`SCHOOL_ARRIVAL` với TO_SCHOOL, `SCHOOL_DEPARTURE` với TO_PARKING), fallback sang tọa độ `School.latitude` / `School.longitude`.
- **Decoding Mechanism:**
  - Web: `decodePolyline(encoded)` trong `web/src/lib/polyline.ts` trả về `[longitude, latitude]` cho MapLibre GL.
  - Mobile: `decodePolyline(encoded)` trong `mobile/utils/polyline.ts` chạy trực tiếp trong React Native runtime, trả về `[latitude, longitude]` cho Leaflet, sau đó serialize sang JSON an toàn `var coords = ${JSON.stringify(decodedCoords)};` truyền vào WebView.

---

## 6. Implementation Details

### A. Backend (`api`)
1. **`api/src/routes/dto/route-response.dto.ts`:**
   - Bổ sung trường `parkingLocation?` (`latitude`, `longitude`, `addressText`) và `schoolLocation?` (`latitude`, `longitude`, `name`) vào `RouteResponseDto`.
2. **`api/src/routes/routes.service.ts`:**
   - Cập nhật `getRouteDetail`: Trích xuất snapshot `parkingStop` và `schoolStop` từ `route.stops`; bổ sung `latitude`, `longitude` vào Prisma `school` select.
   - Cập nhật `getRoutePlanDetail`: Trích xuất snapshot `parkingStop` và `schoolStop` cho từng tuyến trong phương án.
   - Cập nhật `getStudentRoutingDetail`:
     - Thêm `stops: true` vào quan hệ `route` trong truy vấn `studentStops`.
     - Sử dụng hàm `resolveParkingLocation` và `resolveSchoolLocation` ưu tiên snapshot của tuyến, fallback sang `getParkingLotConfig()`.
     - Loại bỏ hoàn toàn truy vấn lowercase `'parking_lot'` và hardcoded fallback.

### B. Web Frontend (`web`)
1. **`web/src/lib/types.ts`:**
   - Bổ sung `parkingLocation?` và `schoolLocation?` vào interface `RouteItem`.
2. **`web/src/app/admin/routes/[id]/page.tsx`:**
   - Tính toán `parkingLocation` và `schoolLocation` từ `route.parkingLocation` / `route.schoolLocation` hoặc từ danh sách `route.stops`.
   - Truyền `schoolLocation`, `parkingLocation` và `focusPoint` vào component `<RouteMap>`.
   - Bổ sung sự kiện click vào từng điểm dừng trên danh sách lộ trình để tự động định vị camera bản đồ (`setFocusPoint`).
3. **`web/src/components/admin/routes/route-map.tsx`:**
   - Bổ sung sự kiện click vào marker Bãi xe (`P`) và Trường học (`🏫`) để focus camera tới tọa độ tương ứng.
   - Đảm bảo tính toán bounds cho nút "Xem toàn cảnh" (Fit All) bao gồm cả Bãi xe, Trường học, Học sinh và Polyline.

### C. Mobile Frontend (`mobile`)
1. **`mobile/utils/polyline.ts`:**
   - Tạo mới tiện ích giải mã Google / VietMap Encoded Polyline 5-decimal chuẩn xác, trả về mảng `[latitude, longitude]`.
2. **`mobile/app/parent/route-detail.tsx`:**
   - Giải mã polyline trực tiếp trong React Native TypeScript trước khi dựng HTML.
   - Truyền mảng tọa độ đã giải mã qua JSON an toàn: `var coords = ${JSON.stringify(decodedCoords)};`.
   - Xử lý an toàn chuỗi văn bản tooltip tránh injection hoặc lỗi escape: `JSON.stringify(...)`.
   - Bổ sung `key={`${activeDirection}-${currentRoute?.id || 'none'}`}` vào `<WebView>` đảm bảo khởi tạo lại bản đồ mượt mà khi đổi chiều tuyến.
   - Hiển thị tooltip rõ ràng theo chiều: "Bãi xe (Điểm xuất phát)" vs "Bãi xe (Điểm kết thúc)", "Trường học (Điểm đến)" vs "Trường học (Điểm xuất phát)".

---

## 7. Database Schema & Migration
- Không thay đổi schema Database (`RouteStop`, `Route`, `SystemSetting` đã có đầy đủ cấu trúc cần thiết).
- Không chạy bất kỳ migration phá hủy nào.

---

## 8. Security & Privacy
- **Parent Data Isolation:** Trên Mobile và Web Student Detail, bản đồ chỉ hiển thị duy nhất 3 đối tượng: Bãi xe trung tâm, Trường học và Vị trí học sinh hiện tại.
- Toàn bộ danh sách, vị trí và thông tin cá nhân (PII) của các học sinh khác trên cùng tuyến được bảo vệ tuyệt đối và không xuất hiện trong payload API gửi cho phụ huynh.

---

## 9. Verification & Automated Tests

### A. Vitest Test Suite (Backend)
- Chạy `npm test` trong thư mục `api`:
  - **Kết quả:** **22/22 test files passed, 216/216 tests passed** (100% pass).
  - Bổ sung 2 test cases mới:
    - `should use route stops snapshot for parking lot location rather than current settings`: PASS.
    - `should include parkingLocation and schoolLocation from stops snapshot`: PASS.

### B. Web Test Suite & Typecheck
- Chạy `npm test` trong thư mục `web`:
  - **Kết quả:** **59/59 tests passed** (100% pass).
- Chạy `npx tsc --noEmit` trong thư mục `web`:
  - **Kết quả:** **0 errors**.

### C. Mobile Typecheck
- Chạy `npx tsc --noEmit` trong thư mục `mobile`:
  - **Kết quả:** **0 errors**.

### D. Live API & Mathematical Coordinate Equivalence Check
Kiểm tra thực tế với NestJS Server đang chạy tại `http://localhost:3000`:
- **Đăng nhập Admin:** Thành công.
- **`GET /api/v1/routes/:id`:**
  - Trả về `parkingLocation`: `{ latitude: 10.84708868567725, longitude: 106.8397763380153, addressText: 'Phường Long Bình, Thành phố Hồ Chí Minh' }`.
  - Trả về `schoolLocation`: `{ latitude: 10.87523743600008, longitude: 106.7999190620001, name: 'Tiểu Học FPT' }`.
- **`GET /api/v1/routes/students/:studentId/routing`:**
  - Chiều đi và Chiều về trả về đúng snapshot Bãi xe và Trường học.
  - Polyline độ dài 494 ký tự.
- **So sánh giải mã Web (`decodeWeb`) vs Mobile (`decodeMobile`):**
  - Số lượng điểm Web: **157 điểm**.
  - Số lượng điểm Mobile: **157 điểm**.
  - Điểm đầu: Web `[106.83979, 10.84769]`, Mobile `[10.84769, 106.83979]`.
  - Điểm cuối: Web `[106.79988, 10.87524]`, Mobile `[10.87524, 106.79988]`.
  - **Đồng nhất toán học 100% (Mathematical Coordinate Equivalence):** `TRUE`.

---

## 10. UI/UX Verification Summary
- **Web Route Detail (`/admin/routes/[id]`):**
  - Marker Bãi xe (`P`, màu xanh dương) và Trường học (`🏫`, màu vàng) xuất hiện rõ ràng trên bản đồ.
  - Hover hiển thị tooltip; click marker focus camera bản đồ; click điểm dừng trên danh sách timeline focus camera tới điểm dừng đó.
  - Nút "Xem toàn cảnh" (Fit All) bao quát toàn bộ Bãi xe, Trường học, Học sinh và Polyline đường bộ.
- **Web Student Detail (`/admin/students/[id]`):**
  - Giữ nguyên bảo mật riêng tư: chỉ hiện Bãi xe snapshot, Trường học snapshot và Marker của học sinh.
- **Mobile Parent Route Detail (`/parent/route-detail`):**
  - Polyline hiển thị trọn vẹn, không bị đứt đoạn hay lỗi ký tự escape.
  - Chuyển tab Chiều đi / Chiều về kích hoạt reload WebView mượt mà, không bị stale map.

---

## 11. Results Summary

| Mã Bug | Mô tả lỗi | Trạng thái | Ghi chú nghiệm thu |
|---|---|:---:|---|
| **BUG-01** | Polyline trong chi tiết học sinh không đồng bộ giữa Web và Mobile | **FIXED** | Giải mã polyline trực tiếp trong React Native TypeScript; loại bỏ lỗi backslash escape trong script inline; 157/157 điểm trùng khớp 100% |
| **BUG-02** | Marker bãi xe hiển thị tọa độ cũ, không nhất quán | **FIXED** | Áp dụng cơ chế Snapshot-first từ `RouteStop`; loại bỏ truy vấn sai lowercase `parking_lot` và hardcode fallback |
| **BUG-03** | Bản đồ chi tiết tuyến chưa hiển thị marker riêng biệt cho trường học và bãi xe | **FIXED** | Bổ sung `schoolLocation` và `parkingLocation` từ snapshot vào `RouteMap`; hỗ trợ click marker và click timeline để focus camera |

---

## 12. Remaining Risks & Edge Cases
- **Phương án tuyến cũ (Legacy RoutePlans):** Nếu có phương án tuyến được tạo trong giai đoạn thử nghiệm trước đây chưa lưu `RouteStop` loại `PARKING_START`, hệ thống sẽ tự động fallback về cấu hình `SystemSetting` key `PARKING_LOT` hiện hành để bảo đảm bản đồ không bị lỗi.

---

## 13. Recommended Next Step
Kính đề nghị Product Owner tiến hành **User Acceptance Testing (UAT)** trên giao diện Web và Mobile:
1. Mở trang chi tiết tuyến trên Web (`http://localhost:5173/admin/routes/b7428f5c-ef66-4f38-a1e6-b9b008d51b3d`) để kiểm tra marker Bãi xe (`P`), Trường học (`🏫`), danh sách đón/trả và nút "Xem toàn cảnh".
2. Mở ứng dụng Mobile Parent màn hình Tuyến đường đưa đón của con để kiểm tra hình dạng tuyến đường và độ mượt khi chuyển tab Chiều đi ↔ Chiều về.
