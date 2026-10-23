# BÁO CÁO AI REVIEW: QUẢN LÝ TRƯỜNG HỌC — STAGE A
## THIẾT KẾ NGHIỆP VỤ, KIẾN TRÚC KỸ THUẬT & WIREFRAMES (SHARED ADMIN LAYOUT & SYSTEM ADMIN SCHOOL MANAGEMENT)

---

## 1. Thông tin Task (Task Information)
- **Mã Task**: STAGE A — BUSINESS ANALYSIS, TECHNICAL DESIGN & WIREFRAMES.
- **Phân hệ Nghiệp vụ**: Shared Admin Layout & System Admin School Management.
- **Phạm vi (Scope)**:
  - Phân tích yêu cầu và thiết kế kiến trúc kỹ thuật toàn diện cho phân hệ Quản lý Trường học và Giao diện Quản trị Dùng chung (Shared Admin Layout).
  - Thiết kế Schema cơ sở dữ liệu tối giản: Tạo bảng mới `School`, bổ sung `schoolId` vào bảng `User`, lưu trữ lịch học qua `JSONB`.
  - Thiết kế tích hợp dịch vụ bản đồ số VietMap (Autocomplete, Place Details, Reverse Geocoding, Map Picker) qua mô hình Backend Proxy.
  - Thiết kế kiến trúc lưu trữ ảnh trường học Cloudinary an toàn qua Backend-controlled Multipart upload, cơ chế xóa ảnh mồ côi (Orphan Cleanup) và cấu hình Remote Image Host.
  - Thiết kế quy trình sinh mật khẩu ngẫu nhiên an toàn (Cryptographically Secure) và bàn giao qua Console Backend trong Development khi tạo tài khoản `SCHOOL_ADMIN`.
  - Thiết kế chi tiết 8 Wireframes (W1–W8) tuân thủ bảng màu RoadToSchool và nguyên tắc Minimal UI Copy.
  - Lập Implementation Plan gồm 8 tasks tuần tự kèm các Approval Gates.
  - **Giới hạn nghiêm ngặt**: Giai đoạn Stage A là thiết kế thuần túy (Design-only). Tuyệt đối KHÔNG viết mã nguồn application, không chạy migration, không sửa Prisma schema thực tế, không cài đặt dependencies.
- **Trạng thái Task (Task Status)**: **HOÀN THÀNH THIẾT KẾ (WAITING FOR PRODUCT OWNER APPROVAL)**.

---

## 2. Tài liệu đã Đối chiếu (Documents Reviewed)
- [docs/BUSINESS_CONTEXT.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/BUSINESS_CONTEXT.md): Mô hình 1 nhà xe tập trung hợp tác nhiều trường học, trách nhiệm của `SYSTEM_ADMIN` và `SCHOOL_ADMIN`, danh mục 15 miền nghiệp vụ.
- [docs/WORKING_RULES.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/WORKING_RULES.md): Quy trình 3 chế độ (Discussion, Planning, Implementation), nguyên tắc Stop-After-Task, quy trình 12 bước phê duyệt API, chuẩn báo cáo AI Review 13–15 mục.
- [docs/architecture/auth-technical-design.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/architecture/auth-technical-design.md): Kế thừa mô hình User 5 Roles, AuthGuard tra cứu DB, cấu trúc JWT Session.
- [docs/ai-review/LATEST.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.md): Kết quả nghiệm thu Phase 1 (Task C6).
- Mã nguồn thực tế: `api/prisma/schema.prisma`, `api/src/auth/`, `web/src/app/admin/`, `web/package.json`, `api/package.json`.

---

## 3. Tóm tắt Thiết kế Nghiệp vụ (Business Design Summary)
- **Shared Admin Layout**:
  - `SYSTEM_ADMIN` và `SCHOOL_ADMIN` dùng chung cấu trúc Layout (Header + Sidebar).
  - Header: Logo RoadToSchool, Avatar, Họ tên, Huy hiệu vai trò.
  - Sidebar:
    - `SYSTEM_ADMIN`: Tổng quan, Trường học, Cài đặt, Đăng xuất.
    - `SCHOOL_ADMIN`: Tổng quan, Cài đặt, Đăng xuất (chưa được cấp quyền quản lý trường).
- **Màn hình Tổng quan (Empty Overview)**:
  - Sau khi đăng nhập, cả 2 vai trò vào trang Tổng quan.
  - Phần nội dung chính (Main Content) được **để trống hoàn toàn**, không hiển thị biểu đồ, widget, thẻ chào mừng hay dữ liệu giả lập.
- **Quản lý Trường học (Dành riêng cho SYSTEM_ADMIN)**:
  - Danh sách trường học dạng Data Table với phân trang Backend, tìm kiếm theo tên, lọc trạng thái `ACTIVE` / `INACTIVE`.
  - Form Thêm trường (Modal) với 5 nhóm thông tin: Tên trường, Địa chỉ/Tọa độ VietMap, Ảnh trường Cloudinary, Thời hạn hợp đồng, Lịch học tuần JSONB.
  - Trang Chi tiết trường học với thông tin tổng quan và hệ thống tab ngang (Horizontal Tabs), hiện có duy nhất tab "Nhân viên trường".
  - Tab "Nhân viên trường": Hiển thị `SCHOOL_ADMIN` và `BUS_ATTENDANT` trực thuộc trường, tìm kiếm, lọc vai trò, lọc trạng thái và nút "Tạo quản lý".
- **Chính sách Trạng thái Trường (`isActive`)**:
  - `School.isActive` độc lập với `User.isActive`. Ngừng hoạt động trường không xóa trường, không xóa nhân viên, không thu hồi phiên của nhân viên, bảo toàn 100% dữ liệu lịch sử.

---

## 4. Đề xuất Kiến trúc Kỹ thuật (Architecture Proposal)
- Xem tài liệu thiết kế chi tiết tại: [docs/architecture/school-management-design.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/architecture/school-management-design.md).
- **Phân lớp Backend (NestJS)**:
  - `SchoolsModule`: Quản lý các tài nguyên trường học và nhân viên trường.
  - `VietmapModule`: Dịch vụ Proxy tương tác với VietMap API, giấu API Key phía server.
  - `CloudinaryModule`: Quản lý upload stream ảnh trường học và dọn dẹp ảnh mồ côi.
  - `AuthGuard` & `RolesGuard`: Tái sử dụng kiểm tra phiên từ PostgreSQL và phân quyền nghiêm ngặt theo vai trò (`@Roles(Role.SYSTEM_ADMIN)`).
- **Phân lớp Frontend (Next.js 16 App Router)**:
  - Cấu trúc layout lồng nhau: `web/src/app/admin/layout.tsx` cho Shared Layout.
  - Route `/admin`: Overview trống.
  - Route `/admin/schools`: Danh sách trường học.
  - Route `/admin/schools/[id]`: Chi tiết trường học và tab nhân viên.
  - Route `/admin/settings`: Cài đặt cá nhân & Đăng xuất.

---

## 5. Tác động Cơ sở Dữ liệu (Database Impact)
- **Bảng Tạo mới**: Duy nhất `School` (`schools`) gồm:
  - `id`: UUID Primary Key.
  - `name`: Tên trường học.
  - `address_text`: Địa chỉ hiển thị.
  - `latitude`, `longitude`: Tọa độ địa lý (Float).
  - `image_url`: Đường dẫn ảnh Cloudinary (Nullable).
  - `image_public_id`: Khóa quản lý ảnh trên Cloudinary (Nullable).
  - `contract_start_date`, `contract_end_date`: Ngày bắt đầu/kết thúc hợp đồng (`@db.Date`).
  - `weekly_schedule`: Lịch học trong tuần dạng `JSONB`.
  - `is_active`: Trạng thái hoạt động (Boolean, default `true`).
  - `created_at`, `updated_at`: Timestamp.
  - Indexes: `name`, `is_active`.
- **Bảng Chỉnh sửa**: `User` (`users`) bổ sung:
  - `school_id`: Foreign Key liên kết `School.id` (Nullable, `onDelete: SetNull`).
  - Index: `school_id`.
- **Tương thích Dữ liệu Cũ**:
  - Toàn bộ dữ liệu User hiện có (như System Admin `admin@r2s.com`, Phụ huynh) giữ nguyên với `school_id = null`.
  - Không phát sinh breaking change đối với các API Authentication Phase 1.

---

## 6. Đề xuất Danh mục API (API Proposal)

| STT | Phương thức | Đường dẫn API | Quyền hạn | Mục đích nghiệp vụ |
|---|---|---|---|---|
| 1 | `GET` | `/api/v1/schools` | `SYSTEM_ADMIN` | Lấy danh sách trường có phân trang, tìm kiếm, lọc trạng thái |
| 2 | `POST` | `/api/v1/schools` | `SYSTEM_ADMIN` | Tạo trường mới (Multipart: form data + file ảnh tùy chọn) |
| 3 | `GET` | `/api/v1/schools/:id` | `SYSTEM_ADMIN` | Lấy thông tin chi tiết trường học |
| 4 | `PATCH` | `/api/v1/schools/:id/status` | `SYSTEM_ADMIN` | Bật/tắt trạng thái hoạt động của trường (`isActive`) |
| 5 | `GET` | `/api/v1/schools/:id/employees` | `SYSTEM_ADMIN` | Danh sách nhân viên (`SCHOOL_ADMIN`, `BUS_ATTENDANT`) của trường |
| 6 | `POST` | `/api/v1/schools/:id/employees` | `SYSTEM_ADMIN` | Tạo tài khoản `SCHOOL_ADMIN`, sinh mật khẩu ngẫu nhiên |
| 7 | `GET` | `/api/v1/vietmap/autocomplete` | Authenticated | Proxy gợi ý địa chỉ VietMap Autocomplete |
| 8 | `GET` | `/api/v1/vietmap/place` | Authenticated | Proxy lấy chi tiết tọa độ và địa chỉ từ refId |
| 9 | `GET` | `/api/v1/vietmap/reverse` | Authenticated | Proxy giải mã tọa độ bản đồ sang chuỗi địa chỉ |

---

## 7. Thiết kế Tích hợp VietMap (VietMap Integration)
- **Kiến trúc Proxy**: Frontend không gọi trực tiếp tới VietMap server; toàn bộ request tìm kiếm địa chỉ đi qua Backend API Proxy để bảo vệ tuyệt đối `VIETMAP_API_KEY`.
- **Luồng Tìm kiếm Địa chỉ**:
  1. Người dùng nhập tên đường/địa điểm -> Hiển thị dropdown gợi ý (Autocomplete).
  2. Chọn kết quả -> Lấy `lat`, `lng` và ghim Marker lên bản đồ thu nhỏ.
  3. Cho phép người dùng click hoặc kéo Marker trên bản đồ để tinh chỉnh vị trí; hệ thống gọi Reverse Geocoding để cập nhật lại gợi ý `addressText`.
- **Xử lý Ngoại lệ**: Có timeout và bắt lỗi mạng thân thiện; không chặn form nếu VietMap tạm thời quá tải hoặc mất mạng (cho phép nhập địa chỉ và tọa độ thủ công).

---

## 8. Thiết kế Lưu trữ Ảnh Trường Cloudinary (Cloudinary Storage Design)
- **Kiến trúc Đề xuất**: **Backend-controlled Multipart Creation** (`POST /api/v1/schools`).
  - Đóng gói dữ liệu trường học và tệp ảnh trong cùng 1 request `multipart/form-data`.
  - Giảm thiểu số lượng API calls (từ 2 còn 1), tối ưu trải nghiệm người dùng.
- **Cơ chế Triệt tiêu Ảnh Mồ côi (Orphan Cleanup)**:
  - Backend validate toàn bộ dữ liệu form trường học trước.
  - Chỉ khi dữ liệu hợp lệ mới upload stream lên Cloudinary thư mục `roadtoschool/schools/`.
  - Nếu bước lưu trường vào PostgreSQL thất bại, `catch block` lập tức gọi `cloudinary.uploader.destroy(publicId)` để dọn sạch ảnh trên Cloudinary.
- **Ràng buộc Tệp**: Chỉ chấp nhận `image/jpeg`, `image/png`, `image/webp`; dung lượng tối đa `5 MB`.
- **Lưu trữ DB**: Bảng `School` chỉ lưu 2 trường text HTTPS URL (`imageUrl`) và khóa định danh (`imagePublicId`).

---

## 9. Thiết kế Wireframes UI/UX (W1–W8)
- **W1 — Shared Admin Layout**: Thanh Header (Logo, User info, Logout), Sidebar phân quyền (Tổng quan, Trường học, Cài đặt, Đăng xuất), Main Content responsive.
- **W2 — Empty Overview**: Khung vực nội dung chính để trống hoàn toàn theo chỉ thị PO.
- **W3 — School List**: Bảng danh sách trường, cột Tên, Địa chỉ, Hợp đồng, Trạng thái pill, Nút Xem chi tiết và Ngừng hoạt động; thanh tìm kiếm và nút "+ Thêm trường".
- **W4 — Add School Modal**: Form thêm trường chia 5 nhóm rõ ràng: Thông tin chung, Địa chỉ & Map picker VietMap, Tải ảnh Cloudinary kèm xem trước, Ngày hợp đồng, Bảng chọn lịch học tuần.
- **W5 — School Detail**: Card tóm tắt trường học (ảnh, tên, địa chỉ, trạng thái, hợp đồng, lịch học) và thanh điều hướng Horizontal Tabs (tab hiện tại: "Nhân viên trường").
- **W6 — School Employees**: Bảng nhân viên trực thuộc trường, tìm kiếm, lọc vai trò, lọc trạng thái, nút "+ Tạo quản trị trường".
- **W7 — Create School Admin Modal**: Form nhập Họ tên, Email, SĐT; không có trường mật khẩu; ghi chú bàn giao mật khẩu bảo mật.
- **W8 — Shared Settings & Logout**: Trang cài đặt cá nhân, xem thông tin tài khoản và nút Đăng xuất an toàn.

---

## 10. Các Quyết định Đã được Phê duyệt (Approved Decisions)
- Shared Layout dùng chung cho `SYSTEM_ADMIN` và `SCHOOL_ADMIN`.
- Trang Tổng quan hiện tại để trống phần nội dung chính.
- `SYSTEM_ADMIN` có tab "Trường học"; `SCHOOL_ADMIN` chỉ có Tổng quan, Cài đặt, Đăng xuất.
- Bảng trường học có phân trang Backend và chuyển trạng thái `isActive`.
- Quản lý vị trí qua VietMap (Search + Map picker).
- **Cloudinary là dịch vụ chính thức lưu trữ ảnh trường học** (thư mục `roadtoschool/schools/`).
- Ảnh trường học là tùy chọn (Optional).
- Lịch học tuần lưu trữ bằng PostgreSQL `JSONB`.
- Tab nhân viên trường học chỉ gồm `SCHOOL_ADMIN` và `BUS_ATTENDANT`.
- Mật khẩu tạm của `SCHOOL_ADMIN` sinh ngẫu nhiên an toàn bằng `crypto`, không trả trong API/UI, xuất qua Console log Backend trong môi trường Development.
- Toàn bộ giao diện và thông báo tuân thủ tiếng Việt 100%.

---

## 11. Các Quyết định Chờ Product Owner Xác nhận (Pending Decisions)
1. **Chặn tạo School Admin khi Trường đang Ngừng Hoạt động (`isActive = false`)**:
   - *Đề xuất*: Chặn hoàn toàn và trả về lỗi `400 Bad Request` ("Không thể tạo nhân viên cho trường học đang ngừng hoạt động").
2. **Kích hoạt lại Trường học (Re-activate)**:
   - *Đề xuất*: Cho phép `SYSTEM_ADMIN` chuyển ngược trạng thái từ `INACTIVE` sang `ACTIVE` nếu hợp đồng trường còn hạn.
3. **Chế độ Mock VietMap trong Development**:
   - *Đề xuất*: Nếu môi trường local chưa có API Key VietMap hợp lệ, hệ thống cho phép bật chế độ mock tọa độ (Hà Nội) để không chặn việc kiểm thử luồng tạo trường.

---

## 12. Rủi ro & Giới hạn (Risks & Limitations)
- **Hạn ngạch VietMap API**: Cần theo dõi quota gọi Autocomplete; giải pháp Backend Proxy kết hợp debounce 300ms phía client giúp giảm tối đa request thừa.
- **Bàn giao Mật khẩu qua Console**: Chỉ áp dụng cho Development. Khi lên Production bắt buộc cấu hình SMTP/SMS thật để gửi mật khẩu tới email/SĐT của quản trị viên trường.
- **Độc lập Trạng thái**: Khi trường ngừng hoạt động, các tài khoản `SCHOOL_ADMIN` của trường đó chưa tự động bị vô hiệu hóa (theo đúng quyết định giữ nguyên người dùng).

---

## 13. Kế hoạch Triển khai (Implementation Plan)
Sau khi Stage A được duyệt, quá trình triển khai sẽ được chia thành **8 Tasks kế tiếp nhau**:
- **Task 1**: Database Migration (Tạo bảng `School`, cập nhật `User.schoolId`).
- **Task 2**: Backend School Management API (`GET /schools`, `GET /schools/:id`, `PATCH /schools/:id/status`).
- **Task 3**: VietMap Integration Backend Service (Proxy endpoints cho Autocomplete, Place, Reverse).
- **Task 4**: Cloudinary Image Storage Service & Multipart `POST /schools`.
- **Task 5**: Backend School Admin Creation & Employee Listing.
- **Task 6**: Web Shared Admin Layout & Empty Overview.
- **Task 7**: Web System Admin School Screens (List, Create Modal, Detail, Employees, Create Admin Modal).
- **Task 8**: Final Integration, Cross-tier Verification & Phase Closure.

---

## 14. Trọng tâm Đánh giá của Reviewer (Reviewer Focus)
- Tính đầy đủ và chặt chẽ của tài liệu thiết kế: [docs/architecture/school-management-design.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/architecture/school-management-design.md).
- Tính tối giản của Database Schema: Chỉ 1 bảng mới `School` và 1 foreign key `schoolId` trên `User`.
- Cấu trúc `weeklySchedule JSONB`: Định dạng, quy tắc xác thực, tính tương thích.
- Tính an toàn của luồng tải ảnh Cloudinary (xóa ảnh mồ côi nếu DB insert thất bại) và luồng sinh mật khẩu tạm của `SCHOOL_ADMIN`.
- Sự phù hợp của 8 Wireframes W1–W8 với nguyên tắc thiết kế tối giản câu chữ.

---

## 15. Trạng thái Hoàn thành & Chỉ thị Dừng lại (Final Status & Stop Rule)
- **Trạng thái**: **STAGE A COMPLETE — WAITING FOR PRODUCT OWNER APPROVAL**.
- **Chỉ thị Dừng lại Tuyệt đối**: AI Agent đã hoàn thành toàn bộ tài liệu thiết kế, wireframes và kế hoạch triển khai, lưu báo cáo và git diff đầy đủ, và **DỪNG LẠI** tại đây. Tuyệt đối không tự ý bắt đầu viết code hoặc chuyển sang Task 1 khi chưa có phê duyệt chính thức từ Product Owner.
