# RoadToSchool — AI Review Report
# Phân hệ: School Management — Stage B: Implementation
# Task 7.1: Map Bug Fix & Address Form UX Refinement

> **Thời gian báo cáo**: 23/10/2026 10:25  
> **Người thực hiện**: Senior Frontend Engineer, UI/UX Designer & Next.js Runtime Debugging Specialist  
> **Trạng thái**: Hoàn thành Triển khai Task 7.1 — Chờ Product Owner xét duyệt  
> **Diff Task-scoped**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)

---

## A. Task Information
- **Task ID**: `TASK 7.1`
- **Tên Task**: `MAP BUG FIX & ADDRESS FORM UX REFINEMENT`
- **Phạm vi cho phép (Strict Scope)**:
  1. Khắc phục dứt điểm lỗi `Worker failed to load. Check that the worker URL is correct.` của MapLibre GL v6 trong môi trường Next.js 16 và Turbopack.
  2. Khắc phục tình trạng bản đồ VietMap loading vô hạn (Infinite Spinner) và chuyển sang quản lý trạng thái Lifecycle rõ ràng: `INITIALIZING`, `LOADING`, `READY`, `ERROR` kèm nút Thử lại (Retry).
  3. Xử lý triệt để cảnh báo Next.js Instant Navigation tại route `/admin/schools` và segment `admin/schools/layout.tsx`.
  4. Tái cấu trúc UX biểu mẫu địa chỉ: Gộp hai ô nhập riêng biệt thành **MỘT ô duy nhất** mang nhãn `Địa chỉ chi tiết *`, vừa đóng vai trò tìm kiếm VietMap Autocomplete v4 vừa là giá trị `addressText` khi tạo trường.
  5. Ẩn hoàn toàn trường `Latitude` và `Longitude` khỏi giao diện người dùng. Tọa độ được quản lý trong State nội bộ và gửi lên Backend trong `FormData` của `POST /api/v1/schools`.
  6. Áp dụng quy tắc Tooltip mới của Product Owner: Chuyển toàn bộ các đoạn văn bản hướng dẫn/giải thích cố định sang component `Tooltip` tinh gọn với icon thông tin, hỗ trợ hover, focus và touch.
  7. Phòng ngừa stale coordinates: Tự động vô hiệu hóa tọa độ đã chọn khi người dùng tự tay sửa văn bản địa chỉ cho đến khi chọn lại gợi ý hoặc xác nhận lại trên bản đồ.
  8. Bảo đảm nguyên vẹn 100% API Contracts, Database Schema, và không can thiệp vào `api/` hay `mobile/`.
- **Trạng thái**: `COMPLETED (ALL VERIFICATIONS & QUALITY GATES PASSED)`

---

## B. Original Bugs & Issues

1. **Bug A — MapLibre Worker Failed to Load**:
   - Console trình duyệt xuất hiện lỗi: `Worker failed to load. Check that the worker URL is correct.`
   - Bản đồ chỉ hiển thị nền xám, các nút zoom và spinner "Đang tải bản đồ VietMap..." xoay vô tận mà không bao giờ chuyển sang trạng thái sẵn sàng.
2. **Bug B — Infinite Map Loading**:
   - Vòng lặp loading không có timeout safeguard, không có cơ chế bắt lỗi style loading/mạng để hiển thị thông báo thân thiện và nút Thử lại.
   - Khi modal mở ra với hiệu ứng animation, container bản đồ có thể chưa có kích thước viewport thực tế khiến canvas không trigger render tiles.
3. **Issue C — Next.js Instant Navigation Warning**:
   - Segment `admin/schools/layout.tsx` bị cảnh báo: `Next.js could not validate that a segment in your UI has instant navigation. Status: dropped from rendering.`
4. **Issue D — Duplicate Address Inputs**:
   - Tồn tại hai ô nhập riêng biệt: "Tìm kiếm vị trí trên VietMap" và "Địa chỉ chi tiết", gây trùng lặp và phân mảnh trải nghiệm người dùng.
5. **Issue E — Exposed Coordinate Inputs**:
   - Hiển thị hai ô nhập kỹ thuật Vĩ độ (Latitude) và Kinh độ (Longitude) không cần thiết, làm rối bố cục và tăng nguy cơ người dùng nhập tọa độ sai.
6. **Issue F — Excessive Helper Text**:
   - Xuất hiện các dòng văn bản giải thích chiếm diện tích cố định trên layout ("Click hoặc kéo thả ghim màu vàng...").

---

## C. Root Cause Analysis

### 1. MapLibre GL v6 Worker Loading Trong Next.js Turbopack
- **Bản chất kỹ thuật**: MapLibre GL phiên bản 6.x chuyển đổi hoàn toàn sang kiến trúc ES Modules (`maplibre-gl.mjs`, `maplibre-gl-worker.mjs`, `maplibre-gl-shared.mjs`).
- **Cơ chế mặc định**: Khi không được cấu hình `WORKER_URL`, MapLibre tự động suy ra worker URL bằng cách lấy `new URL('./maplibre-gl-worker.mjs', import.meta.url)`.
- **Xung đột với Bundler**: Trong môi trường Next.js 16 và Turbopack, file `maplibre-gl.mjs` được bundle thành các dynamic chunk đặt tại `/_next/static/chunks/...`. Khi đó, đường dẫn tương đối dẫn tới `maplibre-gl-worker.mjs` trỏ vào một đường dẫn không tồn tại trên máy chủ Next.js. Trình duyệt gửi request và nhận về phản hồi HTTP 404 (chứa nội dung HTML của trang 404 Next.js với header `Content-Type: text/html`).
- **Hệ quả**: Trình duyệt ném lỗi `Worker failed to load. Check that the worker URL is correct.` Do worker không thể khởi tạo, `WorkerPool.acquire()` bị treo vô hạn, Dispatcher không thể giải mã vector tiles và event `'load'` của bản đồ không bao giờ được phát ra.

### 2. Next.js Instant Navigation Dropped Segment
- **Bản chất**: Layout cha `/admin/layout.tsx` được khai báo là Client Component (`'use client'`). Trong khi đó, layout con `/admin/schools/layout.tsx` ban đầu không có directive `'use client'`, khiến Next.js coi đây là Server Component layout lồng bên trong một Client Component layout mà không có server boundaries hợp lệ khi Partial Prerendering (PPR) xác thực instant navigation.

---

## D. Implemented Fixes

### 1. Phục Vụ Worker Tĩnh & Thiết Lập `setWorkerUrl()`
- Sao chép các tệp worker chính thức của MapLibre GL v6 (`maplibre-gl-worker.mjs`, `maplibre-gl-shared.mjs`, và bản dev) vào thư mục static assets của Next.js: `web/public/maplibre/`.
- Kiểm chứng thực tế: Máy chủ Next.js phản hồi `HTTP 200 OK` với đúng `Content-Type: application/javascript; charset=UTF-8`.
- Cấu hình tường minh tại [vietmap-picker.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/schools/vietmap-picker.tsx):
  ```ts
  if (typeof maplibregl.setWorkerUrl === 'function') {
    maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
  }
  ```
- Kết quả: Web Worker được khởi tạo thành công 100% trong thread riêng biệt, tải và giải mã vector tiles VietMap trơn tru.

### 2. Tái Cấu Trúc Quản Lý Vòng Đời Bản Đồ (Map Lifecycle & Retry)
- Quản lý trạng thái bản đồ qua state machine: `INITIALIZING` → `LOADING` → `READY` hoặc `ERROR`.
- Kích hoạt `map.resize()` khi event `'load'` phát ra và khi tọa độ thay đổi để đảm bảo canvas luôn phủ kín container trong modal.
- Bổ sung timeout safeguard (12 giây) và bắt lỗi `map.on('error')` để hiển thị hộp thoại lỗi thân thiện đi kèm nút **"Thử lại" (Retry)** thay vì để spinner quay vô hạn.
- Dọn dẹp an toàn (`map.remove()`, dọn marker, hủy timer) khi unmount hoặc chuyển modal.

### 3. Gộp Ô Nhập Địa Chỉ Duy Nhất (Single Address Input)
- Tại [add-school-modal.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/schools/add-school-modal.tsx), loại bỏ hoàn toàn ô tìm kiếm VietMap thứ hai.
- Trường `Địa chỉ chi tiết *` duy nhất đảm nhận:
  - Hiển thị giá trị `addressText`.
  - Debounce 300ms gọi VietMap Autocomplete v4 và hiển thị dropdown danh sách gợi ý.
  - Khi chọn gợi ý: lấy `ref_id`, gọi Place v4, cập nhật tọa độ nội bộ, bay bản đồ đến vị trí và di chuyển marker.
  - Cho phép người dùng chỉnh sửa văn bản thủ công bất kỳ lúc nào.
- **Phòng chống Stale Coordinates**: Khi người dùng tự tay sửa văn bản sau khi đã chọn địa điểm, hệ thống tự động reset tọa độ (`latitude = null`, `longitude = null`) và yêu cầu xác nhận lại vị trí trên bản đồ hoặc từ danh sách gợi ý để tránh lưu tọa độ cũ không khớp với địa chỉ mới.

### 4. Ẩn Hoàn Toàn Tọa Độ Khỏi UI
- Loại bỏ toàn bộ các input `Latitude`, `Longitude`, nhãn "Vĩ độ", "Kinh độ" và các dòng text hiển thị số tọa độ.
- Tọa độ được lưu giữ hoàn toàn trong State nội bộ (`latitude: number | null`, `longitude: number | null`).
- Thay thế bằng huy hiệu trạng thái trực quan:
  - Đã chọn: `[✓] Đã xác định vị trí` (màu xanh lá trang nhã).
  - Chưa chọn: `Chưa chọn vị trí` (chữ nghiêng xám).
- Validation chặt chẽ: Trước khi submit, nếu tọa độ là `null` hoặc không hợp lệ, hệ thống từ chối submit và thông báo lỗi: *"Vui lòng chọn vị trí trường trên bản đồ hoặc từ danh sách gợi ý địa chỉ."*

### 5. Áp Dụng Quy Tắc Tooltip Cho Nội Dung Hướng Dẫn
- Xây dựng component [tooltip.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/schools/tooltip.tsx) chuẩn Accessibility (`role="tooltip"`), hỗ trợ hover, focus bàn phím, click/chạm di động và phím Escape.
- Thay thế đoạn văn bản giải thích cố định bên dưới bản đồ bằng icon thông tin cạnh nhãn "Vị trí trên bản đồ" với nội dung: *"Nhấp vào bản đồ hoặc kéo ghim để chọn vị trí trường học chính xác."*
- Bổ sung Tooltip cho phần chọn ảnh đại diện và địa chỉ chi tiết.

### 6. Khắc Phục Cảnh Báo Instant Navigation
- Bổ sung directive `'use client';` tại [layout.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/schools/layout.tsx) để đồng bộ boundary Client Component với layout cha.
- Tạo tệp [loading.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/schools/loading.tsx) cho phân đoạn `/admin/schools` để Next.js 16 Partial Prerendering có fallback tức thì khi điều hướng.

---

## E. Before & After UI Comparison

| Tiêu chí | Trước (Task 7) | Sau khi Refactor (Task 7.1) |
|---|---|---|
| **Ô nhập địa chỉ** | 2 ô: "Tìm kiếm vị trí trên VietMap" + "Địa chỉ chi tiết" | **1 ô duy nhất**: "Địa chỉ chi tiết *" kiêm tìm kiếm và hiển thị |
| **Hiển thị tọa độ** | 2 ô số Latitude & Longitude + text hiển thị số thập phân | **Ẩn hoàn toàn**, thay bằng badge trạng thái `[✓] Đã xác định vị trí` |
| **Văn bản hướng dẫn** | Dòng chữ cố định bên dưới khung bản đồ | Icon `InfoIcon` đi kèm **Tooltip** bật nổi khi tương tác |
| **Bản đồ VietMap** | Bị kẹt spinner vô hạn do lỗi Worker load | **Hiển thị ngay lập tức**, ghim tương tác mượt mà, có nút Thử lại |
| **Xử lý stale data** | Có thể bị lệch tọa độ cũ khi sửa địa chỉ | Tự động vô hiệu hóa tọa độ cũ khi gõ sửa địa chỉ |
| **Next.js segment** | Bị warning dropped from rendering | **0 warning, 0 dropped segment**, build thành công 100% |

---

## F. Data Flow (Refactored)

```
[Người dùng gõ địa chỉ] ───(Debounce 300ms)───> [VietMap Autocomplete v4]
         │                                               │
(Reset tọa độ cũ nếu có)                        (Danh sách gợi ý)
         │                                               │
         ▼                                               ▼
[Nhập văn bản thủ công]                          [Chọn gợi ý địa điểm]
         │                                               │
         │ (Người dùng click/kéo ghim)                   ▼
         │ <─────────────────────────────── [VietMap Place v4 (ref_id)]
         ▼                                               │
[VietMap Reverse v4]                                     ▼
         │                                   [Lưu Latitude & Longitude]
         ▼                                   [Bay bản đồ & ghim Marker]
[Cập nhật địa chỉ & Tọa độ]                              │
         │                                               │
         └───────────────────────┬───────────────────────┘
                                 │
                                 ▼
                    [State nội bộ đã xác nhận]
                                 │
                     (Bấm "Tạo trường học")
                                 │
                                 ▼
                     [FormData multipart/form-data]
                     - name
                     - addressText
                     - latitude (ẩn trên UI, gửi số thực)
                     - longitude (ẩn trên UI, gửi số thực)
                     - contractStartDate / contractEndDate
                     - weeklySchedule (JSON)
                     - image (File tùy chọn)
                                 │
                                 ▼
                    [POST /api/v1/schools]
```

---

## G. Testing & Quality Gates

### 1. Test Suite Commands
- **Unit & Business Logic Tests**: `npm test` trong thư mục `web/`.
- **TypeScript Static Check**: `npx tsc --noEmit` trong thư mục `web/`.
- **Production Build (Next.js 16 + Turbopack)**: `npm run build` trong thư mục `web/`.

### 2. Kết quả Kiểm thử
```
▶ Admin Navigation Configuration & Role Filtering (6/6 tests passed)
▶ School Management — Weekly Schedule Business Rules (5/5 tests passed)
▶ School Management — Role-Based Access Control (3/3 tests passed)
▶ School Management — Form Validation Rules (2/2 tests passed)
▶ School Management Task 7.1 — Map Worker & Location Validation (4/4 tests passed)
  ✔ tệp Worker MapLibre GL v6 phải tồn tại trong thư mục public/maplibre/ (4.93ms)
  ✔ xác thực bắt buộc phải có tọa độ hợp lệ (không chấp nhận null hoặc NaN) (0.25ms)
  ✔ xác thực bắt buộc địa chỉ chi tiết không được để trống hoặc chỉ chứa khoảng trắng (0.20ms)
  ✔ phòng ngừa stale coordinates: khi người dùng tự sửa địa chỉ, tọa độ phải được reset để yêu cầu xác nhận lại (0.20ms)
▶ VietmapService (14/14 tests passed)

Tổng cộng: 34/34 tests PASS (100%)
TypeScript Check: PASS (0 errors)
Next.js Production Build: PASS (0 errors, 0 warnings, 10/10 static/prerendered routes)
Dev Server Response (/admin/schools): HTTP 200 OK
MapLibre Worker Asset (/maplibre/maplibre-gl-worker.mjs): HTTP 200 OK (Content-Type: application/javascript)
VietMap Tilemap Style Endpoint: HTTP 200 OK (SEA Map Street)
```

---

## H. Files Changed

### Files Added:
1. `web/src/components/admin/schools/tooltip.tsx` — Component Tooltip hỗ trợ hover, focus, touch và phím Escape.
2. `web/src/app/admin/schools/loading.tsx` — Loading fallback cho phân đoạn `/admin/schools`.
3. `web/public/maplibre/maplibre-gl-worker.mjs` — MapLibre GL v6 Web Worker phục vụ tĩnh.
4. `web/public/maplibre/maplibre-gl-shared.mjs` — Sibling module phụ trợ cho Web Worker.
5. `web/public/maplibre/maplibre-gl-worker-dev.mjs` — Bản dev phục vụ debug.
6. `web/public/maplibre/maplibre-gl-shared-dev.mjs` — Sibling module bản dev.

### Files Modified:
1. `web/src/components/admin/schools/vietmap-picker.tsx` — Cấu hình `setWorkerUrl`, bổ sung `Tooltip`, gỡ bỏ hoàn toàn ô nhập kinh độ/vĩ độ, quản lý trạng thái loading/error/retry.
2. `web/src/components/admin/schools/add-school-modal.tsx` — Gộp ô tìm kiếm VietMap và địa chỉ thành một input duy nhất, quản lý tọa độ nội bộ, phòng ngừa stale coordinates.
3. `web/src/app/admin/schools/layout.tsx` — Bổ sung directive `'use client';` giải quyết cảnh báo instant navigation.
4. `web/src/components/icons.tsx` — Bổ sung vector icon `InfoIcon`.
5. `web/src/components/admin/schools/schools.test.ts` — Bổ sung 4 unit tests kiểm thử worker asset, tọa độ hợp lệ và stale coordinates.

---

## I. Reviewer Focus
- **Map Rendering**: Lỗi `Worker failed to load` đã được giải quyết triệt để. Bản đồ VietMap tải đúng Worker URL `/maplibre/maplibre-gl-worker.mjs`, không còn tình trạng loading vô hạn.
- **Single Input UX**: Chỉ còn 1 ô `Địa chỉ chi tiết *`. Mọi thao tác tìm kiếm, gõ tay và chọn gợi ý đều diễn ra mượt mà tại cùng một vị trí.
- **Hidden Coordinates**: Giao diện hoàn toàn không còn bất kỳ input hay nhãn hiển thị tọa độ nào; payload gửi lên Backend vẫn đầy đủ `latitude` và `longitude`.
- **Tooltip**: Văn bản hướng dẫn được thu gọn vào Tooltip tinh tế, giao diện sạch sẽ đúng phong cách RoadToSchool.
- **Scope Integrity**: Không thay đổi API Backend, không sửa Mobile, không tạo migration database.

---

## J. Next Step
Chỉ ghi nhận bước tiếp theo duy nhất:

**TASK 8 — FINAL INTEGRATION, CROSS-TIER VERIFICATION & CLOSURE.**

*(Dừng lại và chờ Product Owner phê duyệt trước khi bắt đầu Task 8).*

---

## K. Approval Status
**WAITING FOR PRODUCT OWNER APPROVAL.**
