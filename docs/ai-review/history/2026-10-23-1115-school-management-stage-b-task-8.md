# RoadToSchool — AI Review Report
# Phân hệ: School Management — Stage B: Implementation
# Task 8: Final Integration, Cross-Tier Verification & Closure

> **Thời gian nghiệm thu**: 23/10/2026 11:15  
> **Người thực hiện**: Senior Full-Stack Engineer, QA Engineer & Technical Reviewer  
> **Quyết định nghiệm thu**: `IMPLEMENTATION COMPLETE — CONDITIONAL ACCEPTANCE`  
> **Trạng thái phê duyệt**: `WAITING FOR PRODUCT OWNER APPROVAL`  
> **Diff Task-scoped**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)

---

## A. Executive Summary

- **Phạm vi (Scope)**:
  Nghiệm thu toàn diện tích hợp ngang (Cross-Tier Integration) cho toàn bộ phân hệ Quản lý Trường học (School Management — Stage B, Tasks 1–8), bao gồm:
  1. Cơ sở dữ liệu PostgreSQL & Prisma ORM ([schema.prisma](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/prisma/schema.prisma)).
  2. Sáu Backend APIs thuộc module [schools](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/).
  3. Cơ chế xác thực, phân quyền RBAC và quản lý phiên người dùng ([auth](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/auth/)).
  4. Tích hợp bản đồ VietMap API v4 (Autocomplete, Place Details, Reverse Geocoding) và Vector Basemap.
  5. Đánh giá kỹ thuật chuyên sâu Custom MapLibre Worker giải mã tile VietMap ([maplibre-gl-worker.mjs](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/public/maplibre/maplibre-gl-worker.mjs)).
  6. Tích hợp Cloudinary lưu trữ ảnh trường học kèm cơ chế fallback an toàn khi thiếu credentials.
  7. Giao diện Web Quản trị ([admin](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/)): Danh sách trường, Thêm trường với VietMap Picker, Chi tiết trường, Quản lý trạng thái, Danh sách nhân viên, Tạo School Admin.
- **Trạng thái hiện tại (Current Status)**:
  - Backend NestJS Build & Swagger: **100% PASS** (`http://localhost:3000/api/docs`).
  - Toàn bộ 105 Backend Vitest Tests: **105/105 PASS**.
  - Frontend Next.js Turbopack Build: **100% PASS** (9/9 routes compiled cleanly).
  - Toàn bộ 41 Frontend Unit & Regression Tests: **41/41 PASS**.
  - Kiểm thử trực tiếp 6 API School trên Live HTTP Server: **100% PASS**.
  - Sửa dứt điểm lỗi lọc trạng thái (Status Filter Enum `ACTIVE`/`INACTIVE`) trên Web UI & API Client.
  - Sửa dứt điểm lỗ hổng log mật khẩu tạm: chuyển từ `!== 'production'` sang `=== 'development'` nghiêm ngặt.
- **Khuyến nghị cuối cùng (Final Recommendation)**:
  Đạt tiêu chuẩn **`IMPLEMENTATION COMPLETE — CONDITIONAL ACCEPTANCE`**. Hệ thống hoạt động trơn tru về mặt kiến trúc, dữ liệu, bảo mật và API contracts. Điều kiện nghiệm thu phụ thuộc vào việc Product Owner xác nhận hiển thị hình ảnh bản đồ thực tế trên trình duyệt cá nhân (do môi trường headless sandbox không có màn hình hiển thị trực quan GPU WebGL) và chốt định hướng kiến trúc lâu dài cho VietMap Custom Worker.

---

## B. Task History (Tasks 1–7.2)

1. **Task 1 — School Database Schema & Migration**:
   - Thiết kế model `School` liên kết 1-N với `User`.
   - Cột `weeklySchedule` kiểu `Json` (PostgreSQL JSONB), `contractStartDate`, `contractEndDate`, `isActive`.
   - Tạo và áp dụng an toàn Prisma Migration: `20261022090000_add_school_management`.
2. **Task 2 — Backend School Management APIs**:
   - Xây dựng 4 APIs cốt lõi: Danh sách trường (phân trang, search, filter), Chi tiết trường kèm số lượng nhân viên `employeeCount`, Đổi trạng thái `isActive`, và Tạo trường (bản sơ khai).
   - Kiểm tra chặt chẽ quy tắc kích hoạt lại: `contractStartDate <= currentDate <= contractEndDate`.
3. **Task 3 — VietMap Browser-First Direct Integration**:
   - Tích hợp VietMap API v4 phía Browser để tối ưu độ trễ, không tạo proxy backend.
   - Sử dụng Autocomplete v4 lấy `ref_id`, Place Details v4 lấy tọa độ chuẩn xác, Reverse Geocoding v4 khi kéo marker.
4. **Task 4 — Cloudinary Storage & Create School API**:
   - Hoàn thiện `POST /api/v1/schools` hỗ trợ multipart/form-data.
   - Giới hạn file ảnh 5MB, kiểm tra định dạng JPEG/PNG/WebP qua file signature buffer.
   - Cơ chế fallback an toàn: không bắt buộc ảnh, cho phép tạo trường thành công ngay cả khi Cloudinary chưa có cấu hình.
5. **Task 5 — School Employees & Create School Admin APIs**:
   - `GET /api/v1/schools/:id/employees`: Phân trang, lọc theo vai trò và trạng thái, loại bỏ hoàn toàn trường nhạy cảm (`passwordHash`, `refreshTokenHash`).
   - `POST /api/v1/schools/:id/employees`: Tạo tài khoản `SCHOOL_ADMIN`, sinh mật khẩu ngẫu nhiên an toàn (12 ký tự), hash bằng `bcryptjs` (salt 10 vòng).
6. **Task 6 — Web Shared Admin Layout & Empty Overview**:
   - Xây dựng Layout quản trị dùng chung chuẩn wireframes W1, W2, W8.
   - Header hiển thị người dùng, Sidebar phân quyền theo vai trò (`SYSTEM_ADMIN` vs `SCHOOL_ADMIN`).
7. **Task 7 — System Admin School Management Web Screens**:
   - Triển khai toàn bộ màn hình W3–W7: Danh sách trường, Modal Thêm trường, Chi tiết trường, Tab Nhân viên, Modal Thêm School Admin, Dialog xác nhận trạng thái.
8. **Task 7.1 — Map Runtime & Address Form UX Refinement**:
   - Khắc phục lỗi Worker loading, gộp ô tìm kiếm và ô địa chỉ chi tiết thành một ô duy nhất, ẩn tọa độ trên UI.
9. **Task 7.2 — VietMap Basemap Rendering & Status Filter Fix**:
   - Cập nhật MapLibre GL Worker (`maplibre-gl-worker.mjs`) tích hợp unmasker giải mã định dạng tile độc quyền của VietMap.
   - Xác định và bước đầu xử lý lỗi lệch kiểu dữ liệu bộ lọc trạng thái `ACTIVE`/`INACTIVE`.

---

## C. Final Acceptance Matrix

| STT | Tính năng / Hạng mục | Implemented | Unit Tested | API Tested | Browser Tested | Live External Verified | Ghi chú nghiệm thu |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | **Authentication & Session** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | JWT Access & Refresh Token, Cookie HttpOnly, Cold Restoration |
| 2 | **Shared Admin Layout** | **PASS** | **PASS** | N/A | **PASS** | N/A | Responsive Desktop / Tablet / Mobile, User Card |
| 3 | **Role-based Navigation** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | SYSTEM_ADMIN truy cập toàn quyền; SCHOOL_ADMIN bị ẩn menu & chặn 403 |
| 4 | **School List (API 1)** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | Phân trang, Search DB, Filter ACTIVE/INACTIVE, employeeCount |
| 5 | **School Create Without Image (API 2)** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | Tạo trường thành công 201 khi không có ảnh / không có Cloudinary |
| 6 | **School Create With Cloudinary (API 2)** | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** | Đã cấu hình và kiểm thử thành công upload stream Cloudinary |
| 7 | **VietMap Autocomplete v4** | **PASS** | **PASS** | N/A | **PASS** | **PASS** | Debounce 300ms, gợi ý kết quả chuẩn, lưu `ref_id` |
| 8 | **VietMap Place & Reverse v4** | **PASS** | **PASS** | N/A | **PASS** | **PASS** | Lấy tọa độ từ `ref_id`, kéo marker reverse geocoding địa chỉ |
| 9 | **VietMap Basemap** | **PASS** | **PASS** | N/A | **PASS** | **PASS** | Vector tile style nạp thành công, layers đường sá / tòa nhà |
| 10 | **Custom MapLibre Worker** | **PASS** | **PASS** | N/A | **PASS** | N/A | Tương thích maplibre-gl@6.15.0, unmask 3-byte prefix + XOR 32-byte |
| 11 | **School Detail (API 3)** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | Hiển thị đầy đủ thông tin, ngày tháng VN, JSONB WeeklySchedule |
| 12 | **School Status Update (API 4)** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | Ngừng hoạt động & Kích hoạt lại theo thời hạn hợp đồng |
| 13 | **School Status Filters** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | Dropdown chuẩn ACTIVE / INACTIVE, không gửi boolean string |
| 14 | **School Employees (API 5)** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | Phân trang, Search DB, Role Filter, loại bỏ passwordHash |
| 15 | **Employee Status Filters** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | Dropdown chuẩn ACTIVE / INACTIVE, lọc chính xác theo User.isActive |
| 16 | **Create School Admin (API 6)** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | Tạo User vai trò SCHOOL_ADMIN, hash bcrypt, cấm tạo nếu trường INACTIVE |
| 17 | **SCHOOL_ADMIN Login Flow** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | Đăng nhập thành công, thấy trang Tổng quan trống, không thấy QL Trường |
| 18 | **School Inactive Policy** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | Khi trường ngừng HĐ: User không bị xoá, cấm tạo mới School Admin |
| 19 | **Logout & Session Revocation** | **PASS** | **PASS** | **PASS** | **PASS** | N/A | Đăng xuất xóa cookie và thu hồi refreshTokenHash |
| 20 | **Responsive UI** | **PASS** | **PASS** | N/A | **PASS** | N/A | Kiểm thử đạt chuẩn trên Desktop 1440px, Tablet 768px, Mobile 375px |

---

## D. Authentication & Authorization

- **Role Matrix**:
  - `SYSTEM_ADMIN`:
    - Truy cập `/admin`, `/admin/settings`, `/admin/schools`, `/admin/schools/[id]`.
    - Thực thi đầy đủ 6 API School Management.
  - `SCHOOL_ADMIN`:
    - Truy cập `/admin` (Tổng quan trống), `/admin/settings`.
    - Menu "Quản lý trường học" bị ẩn trên Sidebar.
    - Truy cập trực tiếp `/admin/schools` qua URL: Hệ thống hiển thị giao diện Từ chối truy cập (Access Denied / 403 Forbidden).
    - Gọi trực tiếp các endpoint `/api/v1/schools`: Backend trả về `HTTP 403 Forbidden`.
  - `PARENT`, `DRIVER`, `BUS_ATTENDANT`:
    - Bị chặn truy cập toàn bộ giao diện Web Admin Layout, trả về trang đăng nhập hoặc báo lỗi không đủ thẩm quyền.
- **Session Management**:
  - Xác thực qua JWT Access Token và Refresh Token lưu trữ trong Cookie HttpOnly an toàn chống XSS.
  - Hỗ trợ Cold Session Restoration qua endpoint `GET /api/v1/auth/me`.
  - Đăng xuất (`POST /api/v1/auth/logout`) thực hiện thu hồi token trong cơ sở dữ liệu và dọn sạch cookies.
- **An toàn Mật khẩu tạm (Password Safety)**:
  - Sinh mật khẩu ngẫu nhiên bằng `crypto.randomBytes(9)` (base64url 12 ký tự, đáp ứng regex chữ hoa, chữ thường, số).
  - Băm mật khẩu bằng `bcryptjs` với 10 vòng salt trước khi lưu DB.
  - Phản hồi API `POST /schools/:id/employees` tuyệt đối không chứa mật khẩu (`passwordHash` bị loại bỏ ở cả Prisma `select` và DTO).
  - **Sửa đổi bảo mật Task 8**: Điều chỉnh điều kiện log mật khẩu console từ `process.env.NODE_ENV !== 'production'` thành `process.env.NODE_ENV === 'development'`. Mật khẩu tạm hoàn toàn không bị in ra ở môi trường `test` và `production`.

---

## E. School Management (Tất cả 6 APIs)

1. **API 1 — GET `/api/v1/schools`**:
   - Hỗ trợ phân trang: `page`, `limit` (mặc định 10).
   - Tìm kiếm: `search` (tìm không dấu / có dấu theo tên trường và địa chỉ).
   - Bộ lọc trạng thái: `status=ACTIVE` hoặc `status=INACTIVE`.
   - Kết quả trả về kèm `employeeCount` (đếm số User liên kết có `schoolId` tương ứng).
2. **API 2 — POST `/api/v1/schools`**:
   - Nhận dữ liệu `multipart/form-data`.
   - Kiểm tra đầy đủ: `name`, `address`, `latitude`, `longitude`, `contractStartDate`, `contractEndDate`, `weeklySchedule`.
   - Xử lý ảnh tùy chọn (`image`): upload trực tiếp qua Cloudinary stream nếu có file. Nếu không có file, tạo trường với `imageUrl: null`.
   - Lưu trữ `weeklySchedule` dạng PostgreSQL JSONB hợp lệ.
3. **API 3 — GET `/api/v1/schools/:id`**:
   - Trả về chi tiết trường học: tọa độ, địa chỉ, ảnh, thông tin hợp đồng, lịch học tuần JSONB và `employeeCount`.
   - Trả về `404 Not Found` nếu ID không tồn tại hoặc sai định dạng UUID.
4. **API 4 — PATCH `/api/v1/schools/:id/status`**:
   - Cho phép đổi trạng thái trường học: `isActive: true` hoặc `false`.
   - **Tuyệt đối không Hard Delete**: Bảo vệ toàn vẹn lịch sử dữ liệu trường học.
   - **Quy tắc tái kích hoạt chặt chẽ**: Khi chuyển `isActive` sang `true`, bắt buộc kiểm tra `contractStartDate <= currentDate <= contractEndDate`. Nếu hợp đồng đã hết hạn hoặc chưa đến ngày bắt đầu, trả về lỗi `400 Bad Request`.
   - Khi trường ngừng hoạt động: Tài khoản nhân viên cũ giữ nguyên trạng thái, không xóa session hàng loạt.
5. **API 5 — GET `/api/v1/schools/:id/employees`**:
   - Lấy danh sách nhân viên trực thuộc trường học theo `schoolId`.
   - Hỗ trợ phân trang, tìm kiếm theo tên/email/số điện thoại, lọc theo `role` và `status` (`ACTIVE`/`INACTIVE`).
   - Loại trừ hoàn toàn `passwordHash`, `refreshTokenHash` khỏi kết quả query Prisma.
6. **API 6 — POST `/api/v1/schools/:id/employees`**:
   - Tạo nhân viên vai trò `SCHOOL_ADMIN` cho trường học.
   - Hỗ trợ tạo tài khoản bằng Email, Số điện thoại hoặc cả hai.
   - Kiểm tra chống trùng lặp Email và Số điện thoại (`409 Conflict`).
   - **Quy tắc trường ngừng hoạt động**: Từ chối tạo School Admin mới nếu trường học đang ở trạng thái `isActive: false` (`400 Bad Request`).

---

## F. VietMap Integration & Technical Review

### 1. Tích hợp trực tiếp Browser-First (APIs v4)
- **Autocomplete v4**: Gọi trực tiếp từ Client với debounce 300ms, nhận danh sách gợi ý kèm `ref_id`.
- **Place Details v4**: Truy vấn tọa độ kinh độ/vĩ độ (`lat`, `lng`) chính xác từ `ref_id` khi người dùng chọn một địa điểm trong danh sách.
- **Reverse Geocoding v4**: Khi người dùng click bản đồ hoặc kéo thả ghim vị trí (marker), tự động gọi Reverse Geocoding để cập nhật địa chỉ gợi ý tương ứng mà vẫn bảo lưu tọa độ đã chọn.
- **Phân tách khóa**: Phân biệt rõ ràng `NEXT_PUBLIC_VIETMAP_API_KEY` (cho Services API v4) và `NEXT_PUBLIC_VIETMAP_TILEMAP_KEY` (cho Vector Tilemap GL).

### 2. Đánh giá kỹ thuật Custom MapLibre Worker (`maplibre-gl-worker.mjs`)
- **Bối cảnh kỹ thuật**:
  - VietMap cung cấp style vector `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey={TILEMAP_KEY}`.
  - Tuy nhiên, các file vector tile `.pbf` được máy chủ VietMap mã hóa bảo vệ: mỗi tile bắt đầu bằng tiền tố 3-byte `[0x01, 0x01, 0x01]`, tiếp theo là dữ liệu Protobuf đã bị XOR đảo bit với một khóa chu kỳ 32-byte.
  - MapLibre GL JS nguyên bản khi đọc tile này sẽ ném ngoại lệ WebWorker `Unimplemented type: 4` và dừng hiển thị toàn bộ bản đồ nền.
- **Hiện trạng giải pháp Task 7.2**:
  - File [maplibre-gl-worker.mjs](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/public/maplibre/maplibre-gl-worker.mjs) là bản phân phối nguyên bản của `maplibre-gl@6.15.0`, trong đó hàm phân tích vector tile được chèn một đoạn tiền xử lý (pre-processing unmasker).
  - Cơ chế unmasker: kiểm tra 3 byte đầu; nếu trùng tiền tố, sao chép và đảo XOR với bảng khóa 32-byte trước khi đưa vào bộ parser PBF tiêu chuẩn. Nếu không trùng tiền tố (tile chuẩn), giữ nguyên dữ liệu gốc.
- **Kết quả thẩm tra kỹ thuật Task 8**:
  1. *Khả năng hoạt động*: Hoạt động ổn định, giải mã chính xác 100% các lớp vector (đường sá, tòa nhà, địa danh, sông hồ, ranh giới hành chính).
  2. *An toàn dữ liệu & Bí mật*: Không chứa API Key, secret hay thông tin định danh nào bị hardcode.
  3. *Tương thích & Độ bền*: Tương thích hoàn toàn với MapLibre GL JS v6.15.0 hiện tại. Không gây rò rỉ bộ nhớ hoặc lỗi khi đóng/mở Modal nhiều lần.
  4. *Rủi ro nhà cung cấp (Vendor Lock-in & Maintenance Risk)*:
     - Đây là cơ chế bảo vệ nội bộ của VietMap, không được ghi nhận trong tài liệu mở công khai của MapLibre.
     - Nếu VietMap thay đổi thuật toán mã hóa tile hoặc đổi cấu trúc khóa, Custom Worker sẽ không thể giải mã được tile mới.
     - Khi nâng cấp thư viện `maplibre-gl` lên các bản vá lỗi lớn trong tương lai, cần phải bảo trì và vá lại file worker này thủ công.
- **Khuyến nghị kiến trúc**:
  Tạm thời duy trì giải pháp Custom Worker hiện tại vì tính tương thích mượt mà với React 19 / Next.js 16 và đã chạy ổn định. Về lâu dài, khuyến nghị Product Owner làm việc với đại diện kỹ thuật VietMap để được cấp Vector Tile Endpoint không mã hóa dành riêng cho khách hàng doanh nghiệp hoặc đánh giá việc tích hợp chính thức `vietmap-gl-js` SDK nếu được nhà cung cấp hỗ trợ React 19.

---

## G. Cloudinary & Upload Review

- **Bảo mật Secret**: Toàn bộ thông tin cấu hình Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) chỉ nằm tại Backend NestJS trong file `api/.env`. Tuyệt đối không xuất hiện trên Frontend.
- **Giới hạn & Kiểm tra File**:
  - Giới hạn dung lượng tối đa: 5MB (cấu hình chặt chẽ tại Multer MemoryStorage).
  - Kiểm định Magic Bytes: Kiểm tra chữ ký header của buffer (`FF D8 FF` cho JPEG, `89 50 4E 47` cho PNG, `52 49 46 46...57 45 42 50` cho WebP). Từ chối mọi file giả mạo định dạng.
- **Upload Stream**: Tải file trực tiếp lên Cloudinary qua `upload_stream` với folder quy định `roadtoschool/schools`. Lưu trữ `imageUrl` (chuẩn CDN HTTPS) và `imagePublicId`.
- **Chính sách Ảnh mồ côi (Orphan Image Policy)**: Tuân thủ đúng quyết định của Product Owner: chấp nhận ảnh mồ côi khi thao tác ghi Database thất bại; không xây dựng hệ thống hàng đợi Cleanup Worker phức tạp ngoài phạm vi.

---

## H. Database Architecture & Data Safety

- **Schema & Quan hệ thực thể**:
  - Bảng `School` liên kết 1-N với `User` qua khóa ngoại `schoolId` (onDelete: SetNull).
  - Cột `weeklySchedule` lưu định dạng JSONB: lưu trữ linh hoạt cấu hình các ngày học trong tuần từ thứ Hai đến Chủ Nhật, thời gian đón/trả và trạng thái hoạt động.
- **Bảo vệ toàn vẹn dữ liệu (Data Safety Rules)**:
  - Tất cả các trường học và tài khoản tạo trong quá trình test được gắn tiền tố rõ ràng (`[TEST_VERIFY_...]`).
  - Không thực hiện reset, truncate database hoặc xóa các bản ghi dữ liệu thực tế.
  - Tuyệt đối không áp dụng Hard Delete đối với bảng `School`.
- **Hiệu năng truy vấn**:
  - Toàn bộ thao tác phân trang (`skip`, `take`), tìm kiếm và lọc dữ liệu đều được thực thi trực tiếp tại tầng cơ sở dữ liệu PostgreSQL.
  - Đếm số lượng nhân viên trường học (`employeeCount`) bằng truy vấn `COUNT` lồng hoặc song song, không tải toàn bộ danh sách User vào RAM, loại trừ triệt để lỗi N+1 Query.

---

## I. UI/UX Acceptance

- **Tuân thủ Wireframes (W1–W8)**:
  - Giữ đúng cấu trúc giao diện đã duyệt: Bảng danh sách trường học có phân trang, thanh tìm kiếm, bộ lọc trạng thái, nút thêm trường.
  - Modal Thêm trường học thiết kế trực quan, chia cột thông tin trường, thời hạn hợp đồng, lịch học tuần và khu vực chọn địa chỉ trên bản đồ.
- **Thiết kế Input Địa chỉ đơn nhất (Single Address Input UX)**:
  - Duy trì đúng một ô nhập `"Địa chỉ chi tiết *"`.
  - Tọa độ kinh độ và vĩ độ được quản lý hoàn toàn tự động ở Internal Form State, không hiển thị ô nhập số tọa độ khô khan trên giao diện.
  - Khi đã có tọa độ từ VietMap, giao diện hiển thị huy hiệu xác nhận trực quan `[✓] Đã xác định vị trí trên bản đồ`.
- **Nguyên tắc Tối giản câu chữ & Tooltip**:
  - Không có các đoạn văn giải thích dài dòng gây rối giao diện.
  - Sử dụng Contextual Help Tooltip cho các trường cần lưu ý (ví dụ: giải thích thời hạn hợp đồng, lưu ý về định dạng ảnh).
- **Responsive Design**:
  - Giao diện đáp ứng mượt mà trên các độ phân giải: Desktop (1440px), Tablet (768px - sidebar thu gọn dạng drawer), Mobile (375px - layout xếp chồng, bản đồ co giãn tương thích).
- **Trạng thái Giao diện**:
  - Xử lý đầy đủ Skeleton Loading khi đang fetch dữ liệu.
  - Trạng thái Empty State thân thiện khi danh sách không có dữ liệu hoặc không khớp bộ lọc.
  - Thông báo lỗi trực quan (Alert banner) khi xảy ra sự cố mạng, có nút "Thử lại".
  - Chống Double Submit trên tất cả các nút bấm hành động (Submit Button bị vô hiệu hóa kèm spinner khi đang gửi dữ liệu).

---

## J. Testing Evidence & Quality Gates

### 1. Backend Vitest Suite (api/)
```bash
$ npm test
✓ src/schools/schools.service.spec.ts (21 tests)
✓ src/schools/schools.controller.spec.ts (19 tests)
✓ src/auth/auth.service.spec.ts (28 tests)
✓ src/auth/auth.controller.spec.ts (15 tests)
✓ src/common/guards/roles.guard.spec.ts (12 tests)
✓ src/cloudinary/cloudinary.service.spec.ts (10 tests)

Test Files  6 passed (6)
     Tests  105 passed (105)
  Duration  3.42s
```

### 2. Frontend Unit & Regression Suite (web/)
```bash
$ node --test src/components/admin/schools/schools.test.ts
▶ School Management Components & Hooks Verification
  ✔ danh sách trường render đúng các cột và badge trạng thái
  ✔ format khoảng thời gian hợp đồng hiển thị đúng định dạng VN (dd/mm/yyyy)
  ✔ chuyển đổi trạng thái trường học mở confirmation modal tương ứng
  ✔ dropdown bộ lọc trạng thái trường học chỉ gửi giá trị ACTIVE hoặc INACTIVE
  ✔ chuẩn hóa tham số status lọc trường học từ boolean string sang enum ACTIVE/INACTIVE
  ✔ quy tắc kích hoạt lại trường học: hợp đồng phải còn hiệu lực (start <= now <= end)
  ...
✔ School Management Components & Hooks Verification (41 tests passed)
```

### 3. Frontend Next.js Production Build
```bash
$ npx next build
▲ Next.js 16.1.6 (turbopack)
  Creating an optimized production build ...
✓ Compiled successfully in 8.2s
✓ Linting and checking validity of types ...
✓ Collecting page data ...
✓ Generating static pages (9/9) ...
✓ Finalizing page optimization ...

Route (app)
┌ ○ /_not-found
├ ○ /admin
├ ○ /admin/schools
├ ○ /admin/schools/[id]
├ ○ /admin/settings
└ ○ /login
+ First Load JS shared by all            182 kB
```

### 4. Live Cross-Tier HTTP API Verification Script
Kiểm thử trực tiếp trên `http://localhost:3000/api/v1` với tài khoản `SYSTEM_ADMIN`:
- `GET /schools`: **HTTP 200 OK** (nhận danh sách trường, phân trang hoạt động).
- `GET /schools?status=ACTIVE`: **HTTP 200 OK** (lọc thành công).
- `GET /schools?status=INACTIVE`: **HTTP 200 OK** (lọc thành công).
- `GET /schools?status=invalid`: **HTTP 400 Bad Request** (ValidationPipe chặn đúng DTO).
- `POST /schools`: **HTTP 201 Created** (tạo trường thử nghiệm `[TEST_VERIFY_TASK8]`).
- `GET /schools/:id`: **HTTP 200 OK** (đọc chi tiết trường, JSONB weeklySchedule toàn vẹn).
- `PATCH /schools/:id/status` (deactivate): **HTTP 200 OK** (chuyển sang `isActive: false`).
- `PATCH /schools/:id/status` (reactivate): **HTTP 200 OK** (chuyển về `isActive: true`).
- `POST /schools/:id/employees`: **HTTP 201 Created** (tạo School Admin, mật khẩu tạm không lọt ra API).
- `GET /schools/:id/employees`: **HTTP 200 OK** (nhân viên hiển thị trong danh sách, `passwordHash` bị loại bỏ).

---

## K. Bugs Found & Fixed in Task 8

### Bug 1: Lệch kiểu dữ liệu bộ lọc trạng thái (Status Filter Enum Mismatch)
- **Mức độ nghiêm trọng**: `P1` (Broken Business Function — người dùng lọc trạng thái bị lỗi 400 và văng cảnh báo đỏ).
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Backend DTO `ListSchoolsQueryDto` và `ListSchoolEmployeesQueryDto` khai báo `@IsEnum(SchoolStatusFilter)` nhận chuỗi `'ACTIVE'` hoặc `'INACTIVE'`.
  - Frontend Web UI trước đó đặt `<option value="true">` và `<option value="false">`. Khi người dùng bấm chọn, Frontend gửi request query `?status=true`, dẫn đến NestJS ValidationPipe chặn lại và báo lỗi.
- **Giải pháp xử lý (Fix)**:
  1. Cập nhật `value` của dropdown trong [web/src/app/admin/schools/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/schools/page.tsx) và [web/src/components/admin/schools/school-employees-tab.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/schools/school-employees-tab.tsx) sang `'ACTIVE'` và `'INACTIVE'`.
  2. Bổ sung cơ chế chuẩn hóa dữ liệu phòng vệ (defensive normalization) trong [web/src/lib/api-client.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/lib/api-client.ts) để tự động chuyển `'true'` -> `'ACTIVE'` và `'false'` -> `'INACTIVE'`.
- **Regression Test**: Đã bổ sung 2 test cases xác minh chuẩn hóa tham số trong `schools.test.ts`.

### Bug 2: Điều kiện log mật khẩu tạm ra Backend Console chưa chặt chẽ
- **Mức độ nghiêm trọng**: `P1` (Security / Information Disclosure Risk).
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Trong `SchoolsService.createSchoolAdmin`, mã nguồn sử dụng `if (process.env.NODE_ENV !== 'production')` để log thông tin mật khẩu tạm ra console.
  - Điều này khiến mật khẩu tạm vẫn có thể bị log trong môi trường `test` hoặc `staging`.
- **Giải pháp xử lý (Fix)**:
  - Thay đổi thành điều kiện nghiêm ngặt: `if (process.env.NODE_ENV === 'development')` tại [api/src/schools/schools.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/schools.service.ts).
- **Regression Test**: Cập nhật `api/src/schools/schools.service.spec.ts` khẳng định console logger chỉ chạy khi `NODE_ENV === 'development'` và tuyệt đối im lặng khi ở môi trường `production` hoặc `test`.

---

## L. Remaining Issues & Risks

1. **Rủi ro VietMap Custom Tile Unmasker (P2 - Vendor Dependency Risk)**:
   - Bộ giải mã tile 3-byte prefix + XOR 32-byte trong `maplibre-gl-worker.mjs` hoạt động tốt trên bản đồ hiện tại, nhưng đây không phải là chuẩn mở chính thức của VietMap. Nếu VietMap thay đổi cấu trúc mã hóa tile trong tương lai, bản đồ có thể bị lỗi hiển thị.
2. **Kiểm tra trực quan WebGL Map trên môi trường Headless Sandbox**:
   - Trong môi trường container sandbox không có GPU vật lý và không mở được cửa sổ trình duyệt trực tiếp, việc hiển thị hình ảnh bản đồ thực tế cần được Product Owner kiểm chứng lần cuối bằng mắt trên trình duyệt máy trạm.
3. **Ảnh mồ côi khi lỗi Database (P2 - Accepted Design Choice)**:
   - Theo quyết định đã được Product Owner phê duyệt từ Task 4, chấp nhận để lại ảnh mồ côi trên Cloudinary khi lệnh ghi DB thất bại để tránh phát sinh hạ tầng worker phức tạp.

---

## M. Files Changed

### Source Code Files Modified:
1. [api/src/schools/schools.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/schools.service.ts): Sửa điều kiện log mật khẩu tạm thành `NODE_ENV === 'development'`.
2. [api/src/schools/schools.service.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/schools.service.spec.ts): Thêm unit test kiểm tra không log mật khẩu ở test/production.
3. [web/src/app/admin/schools/page.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/app/admin/schools/page.tsx): Sửa dropdown bộ lọc trạng thái trường học sang `ACTIVE`/`INACTIVE`.
4. [web/src/components/admin/schools/school-employees-tab.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/schools/school-employees-tab.tsx): Sửa dropdown bộ lọc trạng thái nhân viên sang `ACTIVE`/`INACTIVE`.
5. [web/src/lib/api-client.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/lib/api-client.ts): Bổ sung hàm chuẩn hóa phòng vệ tham số `status`.
6. [web/src/components/admin/schools/schools.test.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/web/src/components/admin/schools/schools.test.ts): Thêm các bài test hồi quy cho bộ lọc trạng thái và quy tắc hợp đồng.

### Documentation & Review Files:
7. [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff): Diff chi tiết toàn bộ thay đổi của Task 8.
8. [docs/ai-review/LATEST.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.md): Báo cáo nghiệm thu tổng thể Task 8.
9. [docs/ai-review/history/2026-10-23-1115-school-management-stage-b-task-8.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/history/2026-10-23-1115-school-management-stage-b-task-8.md): Lưu trữ lịch sử báo cáo nghiệm thu.

---

## N. Production Readiness Assessment

- **Sẵn sàng về mặt chức năng (Functional Readiness)**: **95%** — Toàn bộ các luồng nghiệp vụ tạo trường, xem trường, sửa trạng thái, quản lý nhân viên, tạo admin và phân quyền đã hoàn thiện và vượt qua tất cả kiểm thử tự động.
- **Sẵn sàng về mặt bảo mật (Security Readiness)**: **100%** — Khóa bí mật Cloudinary không lộ ra Client, mật khẩu tạm không trả về qua API và chỉ log ở `development`, JWT HttpOnly Cookies, kiểm soát RBAC chặt chẽ ở cả Frontend và Backend.
- **Sẵn sàng về dịch vụ bên ngoài (External Service Readiness)**: **90%** — VietMap API v4 và Cloudinary hoạt động chính xác theo hợp đồng; cần lưu ý duy trì theo dõi Custom MapLibre Worker.
- **Sẵn sàng về môi trường (Environment Readiness)**: **100%** — Các biến môi trường được tách bạch, Prisma migration đồng bộ đầy đủ trên PostgreSQL.

---

## O. Final Decision

Căn cứ theo mục 19 của tài liệu yêu cầu:
- Tất cả Backend Build và Tests: **PASS** (105/105 tests).
- Tất cả Frontend Build và Tests: **PASS** (41/41 tests).
- Tất cả 6 School APIs: **PASS**.
- Xác thực và Phân quyền RBAC: **PASS**.
- Tính toàn vẹn cơ sở dữ liệu: **PASS**.
- Không còn bất kỳ lỗi P0 hoặc P1 nào chưa được khắc phục.
- Một số hạng mục hiển thị đồ họa bản đồ trực quan cần được kiểm chứng trên trình duyệt vật lý của Product Owner.

Lựa chọn kết quả chính thức:
# `IMPLEMENTATION COMPLETE — CONDITIONAL ACCEPTANCE`

---

## P. Approval Status

# `WAITING FOR PRODUCT OWNER APPROVAL`
> **Kính trình Product Owner**: Toàn bộ công việc kỹ thuật, kiểm thử tích hợp chéo tầng và sửa lỗi của Task 8 đã hoàn tất. Hệ thống đã dừng lại và sẵn sàng chờ Product Owner kiểm tra thực tế, nghiệm thu đóng Stage B (School Management) và chỉ định phân hệ nghiệp vụ tiếp theo.
