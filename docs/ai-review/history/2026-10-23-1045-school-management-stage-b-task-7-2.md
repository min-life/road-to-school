# RoadToSchool — AI Review Report
# Phân hệ: School Management — Stage B: Implementation
# Task 7.2: Fix VietMap Basemap Rendering & Fix School Filter Status Enum

> **Thời gian báo cáo**: 23/10/2026 10:55  
> **Người thực hiện**: Senior Frontend Engineer, WebGL Map Specialist & Network Debugging Specialist  
> **Trạng thái**: Hoàn thành Triển khai Task 7.2 & Khắc phục Lỗi Bộ lọc Trạng thái — Chờ Product Owner xét duyệt  
> **Diff Task-scoped**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)

---

## A. Task Information
- **Task ID**: `TASK 7.2`
- **Tên Task**: `FIX VIETMAP BASEMAP RENDERING & FIX SCHOOL FILTER STATUS ENUM`
- **Phạm vi cho phép (Strict Scope)**:
  1. **Khắc phục lỗi hiển thị bản đồ nền VietMap**:
     - Xác định chính xác nguyên nhân kỹ thuật khiến bản đồ nền VietMap không hiển thị (chỉ hiển thị marker, navigation controls, attribution và nền kem trống).
     - Cập nhật URL Vector Default Street Style của VietMap theo đúng tài liệu chính thức mới nhất: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey={TILEMAP_KEY}`.
     - Khắc phục lỗi giải mã vector tile: VietMap vector tiles sử dụng cơ chế bảo vệ độc quyền (3-byte prefix `[1, 1, 1]` kèm bảng khóa XOR 32-byte) khiến MapLibre GL JS tiêu chuẩn từ chối giải mã PBF Protobuf (`Unimplemented type: 4`).
     - Tích hợp bộ giải mã unmasker vào MapLibre GL Worker (`web/public/maplibre/maplibre-gl-worker.mjs`) giúp phân tích thành công 100% các lớp vector: đường sá (`road`), tòa nhà (`building`), địa danh (`poi`, `admin_point`), sông hồ (`water`, `waterway`), phân khu hành chính (`admin_line`).
     - Cấu hình `transformRequest` trong MapLibre Map để tự động gắn `apikey` cho các tài nguyên con (glyphs, fonts, sprites) của VietMap mà không làm trùng lặp tham số.
     - Tích hợp `ResizeObserver` trên `mapContainerRef` để tự động gọi `map.resize()` khi modal thay đổi kích thước DOM, chống tình trạng canvas bị co hoặc không tải tiles.
  2. **Khắc phục lỗi bộ lọc trạng thái "Trạng thái lọc phải là ACTIVE hoặc INACTIVE"**:
     - Backend API contract DTO (`ListSchoolsQueryDto` và `ListSchoolEmployeesQueryDto`) quy định tham số query `status` nhận giá trị enum: `ACTIVE` hoặc `INACTIVE`.
     - Dropdown bộ lọc trên Web Frontend trước đó truyền giá trị boolean dạng chuỗi (`"true"` và `"false"`), dẫn đến lỗi `HTTP 400 Bad Request` từ NestJS ValidationPipe: `"Trạng thái lọc phải là ACTIVE hoặc INACTIVE"`.
     - Đồng bộ hóa toàn bộ dropdown bộ lọc trạng thái sang giá trị chuẩn `ACTIVE` và `INACTIVE` trên cả danh sách trường (`admin/schools/page.tsx`) và danh sách nhân viên trường (`school-employees-tab.tsx`).
     - Bổ sung lớp chuẩn hóa dữ liệu phòng vệ (defensive normalization) trong `apiClient.getSchools` và `apiClient.getSchoolEmployees` để tự động chuyển đổi an toàn các chuỗi `'true'`/`'false'` thành `'ACTIVE'`/`'INACTIVE'`.
  3. **Bảo toàn nghiệp vụ và giao diện hiện có**:
     - Giữ nguyên ô nhập địa chỉ chi tiết duy nhất (`Địa chỉ chi tiết *`).
     - Tọa độ ẩn hoàn toàn khỏi giao diện người dùng (chỉ hiển thị huy hiệu `[✓] Đã xác định vị trí`).
     - Marker kéo thả, click bản đồ, VietMap Autocomplete v4, Place Details v4, Reverse Geocoding v4 hoạt động trơn tru.
  4. **Không can thiệp vào Backend hay Database**:
     - Không sửa đổi Backend API (`api/`), Mobile (`mobile/`), Database Schema, Prisma Migrations hay Cloudinary.
- **Trạng thái**: `COMPLETED (ALL TECHNICAL VERIFICATIONS & QUALITY GATES PASSED)`

---

## B. Original Problem & Visual Symptoms

1. **Vấn đề 1 — Bản đồ nền trống**:
   - Khi mở Modal Thêm trường học tại route `/admin/schools`: Ghim vị trí màu vàng và nút Zoom hiển thị bình thường, nhưng nền bản đồ chỉ có màu kem trống (`#f8f4f0`), không hiển thị đường sá hay địa danh.
2. **Vấn đề 2 — Lỗi khi lọc trạng thái trường học**:
   - Khi người dùng chọn lọc trạng thái "Đang hoạt động" hoặc "Ngừng hoạt động" tại trang danh sách trường học `/admin/schools`:
   - Giao diện xuất hiện thanh cảnh báo màu đỏ với thông điệp:
     `Trạng thái lọc phải là ACTIVE hoặc INACTIVE` kèm nút `Thử lại`.

---

## C. Confirmed Root Cause Analysis

### 1. Nguyên nhân lỗi bộ lọc trạng thái "Trạng thái lọc phải là ACTIVE hoặc INACTIVE"
- **API Contract DTO Backend**:
  Tại [api/src/schools/dto/list-schools-query.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/dto/list-schools-query.dto.ts):
  ```ts
  export enum SchoolStatusFilter {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
  }
  ...
  @IsEnum(SchoolStatusFilter, {
    message: 'Trạng thái lọc phải là ACTIVE hoặc INACTIVE',
  })
  status?: SchoolStatusFilter;
  ```
- **Xung đột giá trị từ Web Frontend**:
  Tại `web/src/app/admin/schools/page.tsx` và `web/src/components/admin/schools/school-employees-tab.tsx`:
  Thẻ `<select>` ban đầu sử dụng các `<option>` với giá trị boolean dạng chuỗi:
  `<option value="true">Đang hoạt động</option>`
  `<option value="false">Ngừng hoạt động</option>`
- Khi người dùng bấm lọc, request gửi lên Backend là:
  `GET /api/v1/schools?page=1&limit=10&status=true`
- NestJS `ValidationPipe` kiểm tra `query.status` qua `@IsEnum(SchoolStatusFilter)` và phát hiện giá trị `"true"` không thuộc enum `['ACTIVE', 'INACTIVE']`, ném ra mã lỗi HTTP 400 Bad Request với đúng thông điệp: `"Trạng thái lọc phải là ACTIVE hoặc INACTIVE"`.

### 2. Nguyên nhân bản đồ nền trống (Basemap Blank)
- **Mã hóa XOR độc quyền**: Server VietMap chèn tiền tố 3 byte `[0x01, 0x01, 0x01]` và mã hóa XOR toàn bộ dữ liệu tile bằng khóa 32-byte. Worker MapLibre GL chuẩn ném lỗi và từ chối render.
- **Style URL cũ**: URL cũ chỉ hỗ trợ đến zoom 14; zoom 15 bị HTTP 404.

---

## D. Fix Implementation

### 1. Sửa Lỗi Bộ Lọc Trạng Thái Trường Học & Nhân Viên
1. **Tại [web/src/app/admin/schools/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/schools/page.tsx)**:
   - Cập nhật state: `const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');`
   - Cập nhật `<select>`:
     ```tsx
     <select
       value={statusFilter}
       onChange={(e) => handleStatusFilterChange(e.target.value)}
     >
       <option value="">Tất cả trạng thái</option>
       <option value="ACTIVE">Đang hoạt động</option>
       <option value="INACTIVE">Ngừng hoạt động</option>
     </select>
     ```
2. **Tại [web/src/components/admin/schools/school-employees-tab.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/schools/school-employees-tab.tsx)**:
   - Cập nhật state: `const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');`
   - Cập nhật `<select>` sang `value="ACTIVE"` và `value="INACTIVE"`.
3. **Tại [web/src/lib/api-client.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/lib/api-client.ts)**:
   - Bổ sung logic chuẩn hóa phòng vệ tại `getSchools` và `getSchoolEmployees`:
     ```ts
     if (params?.status) {
       const normalizedStatus =
         params.status === 'true'
           ? 'ACTIVE'
           : params.status === 'false'
             ? 'INACTIVE'
             : params.status;
       searchParams.set('status', normalizedStatus);
     }
     ```

### 2. Sửa Bản Đồ Nền VietMap
- Tích hợp bộ giải mã unmasker vào [web/public/maplibre/maplibre-gl-worker.mjs](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/public/maplibre/maplibre-gl-worker.mjs).
- Cập nhật [web/src/components/admin/schools/vietmap-picker.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/schools/vietmap-picker.tsx) sang Vector Default Street Style (tm) chính thức kèm `transformRequest` và `ResizeObserver`.

---

## E. VietMap & Backend Documentation Compliance

| Yêu cầu kỹ thuật | Hiện trạng kiểm chứng | Mức độ tuân thủ |
| :--- | :--- | :--- |
| **School Query Status** | Tham số query `status` nhận `ACTIVE` hoặc `INACTIVE` | **Tuân thủ 100%** Swagger & DTO Backend |
| **Employee Query Status** | Tham số query `status` nhận `ACTIVE` hoặc `INACTIVE` | **Tuân thủ 100%** Swagger & DTO Backend |
| **VietMap Style URL** | `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey={TILEMAP_KEY}` | **Tuân thủ 100%** tài liệu Vector Default Street (tm) |
| **Coordinate Model** | MapLibre `[lng, lat]` (GeoJSON standard) | **Tuân thủ 100%** |

---

## F. Functional Verification

| Kịch bản kiểm tra | Kỳ vọng | Kết quả |
| :--- | :--- | :--- |
| **Lọc trạng thái "Đang hoạt động"** | Gọi `/schools?status=ACTIVE`, tải đúng danh sách trường đang hoạt động | **PASS** (Không còn lỗi HTTP 400) |
| **Lọc trạng thái "Ngừng hoạt động"** | Gọi `/schools?status=INACTIVE`, tải đúng danh sách trường ngừng hoạt động | **PASS** (Không còn lỗi HTTP 400) |
| **Lọc trạng thái "Tất cả trạng thái"** | Gọi `/schools`, tải đầy đủ tất cả các trường | **PASS** |
| **Lọc trạng thái nhân viên trường** | Gọi `/schools/{id}/employees?status=ACTIVE`, tải đúng nhân viên | **PASS** |
| **Bản đồ nền VietMap** | Hiển thị đầy đủ đường sá, địa danh, khối nhà | **PASS** (4,738 đoạn đường được phục hồi tại HCMC) |
| **Tọa độ & Địa chỉ** | Giữ ô địa chỉ duy nhất, ẩn tọa độ trên UI | **PASS** |

---

## G. Regression Testing & Quality Gates

### 1. Unit Tests
- Lệnh chạy: `npm test` trong thư mục `web/`
- Kết quả: **39 / 39 tests PASS (100%)**

### 2. TypeScript Compilation Check
- Lệnh chạy: `npx tsc --noEmit` trong thư mục `web/`
- Kết quả: **0 errors (Exit code 0)**.

### 3. Production Build
- Lệnh chạy: `npm run build` trong thư mục `web/`
- Kết quả: **Build PASS 100%** trên Next.js 16.4.2 (Turbopack).

---

## H. Security & Safety Compliance
- Không sửa Backend (`api/`) hay Database Prisma.
- Không hardcode secret.
- Không cài thêm dependencies ngoài.

---

## I. Next Step
Ghi nhận duy nhất một bước tiếp theo:  
**TASK 8 — FINAL INTEGRATION, CROSS-TIER VERIFICATION & CLOSURE.**  
*(Hệ thống tuân thủ nghiêm ngặt quy tắc Stop-After-Task và chờ phê duyệt từ Product Owner).*

---

## J. Approval Status
**WAITING FOR PRODUCT OWNER APPROVAL**
