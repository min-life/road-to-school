# RoadToSchool — AI Review Report

## 1. Task Information
- **Task Name**: Phase 1 — Authentication & Account Access: Stage A — Business Logic Analysis
- **Date**: 2026-10-22
- **Project Scope**: API / Web / Mobile / Architecture
- **Task Type**: Business & Technical Analysis
- **Status**: WAITING_APPROVAL

## 2. Original Request
Phân tích và thiết kế sơ bộ hệ thống Authentication hoàn chỉnh cho RoadToSchool (Phase 1).
Phạm vi bao gồm:
- JWT Authentication & Multi-device Login & Session Management.
- Login, Logout, Forgot Password, Reset Password.
- Parent Registration (Email hoặc Số điện thoại) & OTP Verification.
- OTP Delivery: Email Console/SMTP Delivery, SMS Console Delivery.
- Role-Based Platform Access: Web (System Admin, School Admin), Mobile (Driver, Bus Attendant, Parent).
- Web Auth UI & Mobile Auth UI.
- Mobile Application Splash (Logo-only) & Role Splash.
- Session Restoration khi mở lại ứng dụng.
- Initial System Admin Account: `admin@r2s.com` / `Pass@123` (Web only, bootstrap an toàn, idempotent).
- **Yêu cầu bắt buộc**: Lần thực thi hiện tại chỉ dành cho phân tích và thiết kế sơ bộ (Stage A), tuyệt đối không viết code, không sửa Database Schema, không chạy migration, không tạo UI khi chưa được duyệt.

## 3. Approved Scope
- **Phạm vi được duyệt**: Phân tích Business Logic, đề xuất Authentication Flows, kiến trúc JWT/Session/OTP, thiết kế sơ bộ Initial System Admin bootstrap và danh mục màn hình Web/Mobile.
- **Trạng thái phê duyệt**: `NOT APPROVED` cho việc viết mã nguồn hoặc thay đổi Database. Đang chờ người dùng và AI Reviewer độc lập thẩm định tài liệu phân tích.
- **Giới hạn phạm vi**: Không sửa application code, không cài đặt dependencies, không chạy database migration, không tạo tài khoản thật trong DB.

## 4. Analysis & Decisions

### 4.1. Đánh giá hiện trạng Codebase (Phase 0 Foundation)
- **Backend (`api/`)**: Đã có NestJS v12, Prisma v6.19.3 kết nối PostgreSQL `roadtoschool` local. Health module, Swagger trên `/api/docs`, network binding `0.0.0.0:3000`, CORS hỗ trợ `http://localhost:5173`. Chưa có bảng tài khoản/phiên, chưa có `AuthModule`.
- **Web (`web/`)**: Next.js v16 App Router, Tailwind CSS v4, bộ màu RoadToSchool (`#FFCB56`, `#FFFDF6`, `#1E293B`, `#FFFFFF`) trong `globals.css`. Chưa có màn hình xác thực và session cookies.
- **Mobile (`mobile/`)**: Expo SDK 58, Expo Router, 3 tabs (Home, Explore, Settings). Đã có cơ chế tự động phân giải API base URL qua runtime host của Metro. Chưa có SecureStore và các màn hình xác thực.

### 4.2. Đề xuất các luồng xác thực (Authentication Flows)
1. **Web Login Flow (Chỉ dành cho `SYSTEM_ADMIN` & `SCHOOL_ADMIN`)**:
   - Truy cập Web -> kiểm tra session cookie hiện có -> nếu chưa có, hiển thị form Login.
   - Nhập Email/SĐT + Password -> gọi `POST /api/v1/auth/login`.
   - Backend xác thực credentials bằng bcrypt.
   - **Platform Rule Check**: Nếu Role là `DRIVER`, `BUS_ATTENDANT`, hoặc `PARENT` -> Trả về lỗi `403 Forbidden` (*"Tài khoản không được phép đăng nhập trên nền tảng Web"*).
   - Nếu hợp lệ: Tạo bản ghi `Session` mới trong PostgreSQL, cấp Access Token (JWT 15 phút) và Refresh Token (7 ngày, HttpOnly cookie) -> Hiển thị Web Role Splash (1-1.5s) -> Điều hướng vào khu vực quản trị tương ứng.
2. **Mobile Login Flow (Chỉ dành cho `DRIVER`, `BUS_ATTENDANT`, `PARENT`)**:
   - Khởi động app: Hiển thị Application Splash (Logo RoadToSchool, tối giản, không text thừa) và tự động khôi phục session từ SecureStore. Nếu session hợp lệ -> chuyển thẳng vào màn hình chính theo Role.
   - Nếu chưa có session: Hiển thị Form Login. Có liên kết "Đăng ký Phụ huynh" và "Quên mật khẩu".
   - Gọi `POST /api/v1/auth/login`.
   - **Platform Rule Check**: Nếu Role là `SYSTEM_ADMIN` hoặc `SCHOOL_ADMIN` -> Trả về lỗi `403 Forbidden` (*"Tài khoản quản trị chỉ có thể đăng nhập trên Web"*).
   - Nếu hợp lệ: Tạo bản ghi `Session` mới, trả về `{ accessToken, refreshToken, account }`. Client lưu an toàn vào `Expo SecureStore` -> Hiển thị Mobile Role Splash (1-1.5s) -> Điều hướng vào giao diện chính tương ứng.
3. **Parent Registration Flow (Mobile Only, Role `PARENT`)**:
   - Chỉ phụ huynh được phép tự đăng ký; các role khác không có public registration.
   - Form nhập: Họ và tên, tùy chọn Email hoặc Số điện thoại, Mật khẩu & Xác nhận mật khẩu.
   - Gọi `POST /api/v1/auth/register/parent`. Backend kiểm tra tính duy nhất (uniqueness).
   - Tạo bản ghi `Account` với trạng thái `isVerified = false`, tạo thử thách `OtpChallenge` (OTP 6 số ngẫu nhiên, hạn 5 phút).
   - Gửi mã OTP qua Console (SMS mode hoặc Email console) hoặc gửi Email SMTP thật.
   - Phụ huynh nhập 6 số trên màn hình OTP -> gọi `POST /api/v1/auth/register/verify-otp`.
   - Backend kiểm tra hợp lệ -> kích hoạt `isVerified = true`, tự động cấp Session & JWT (Auto Login) -> Hiển thị Parent Role Splash -> Vào ứng dụng.
4. **Email & Phone OTP Delivery Flow**:
   - **Email Mode**:
     - `console`: Dành cho development/testing. Ghi log rõ ràng: `[AUTH_OTP_CONSOLE] To: email@domain.com | Purpose: REGISTRATION | OTP: 123456`. Không trả OTP trong API response.
     - `smtp`: Gửi email thật qua giao thức SMTP tiêu chuẩn (`nodemailer`), template tối giản, bảo vệ credentials bằng biến môi trường.
   - **SMS Mode**: Trong Phase 1, chỉ chạy chế độ `console` mode (in mã ra terminal Backend), không tích hợp gateway trả phí bên thứ ba.
   - **Chống lạm dụng**: Cooldown 60s giữa các lần gửi lại; tối đa 5 lần nhập sai; hủy mã ngay sau khi sử dụng (`consumedAt = NOW()`).
5. **Forgot Password & Reset Password Flow (Hỗ trợ cả 5 Roles)**:
   - Nhập Email/SĐT -> gọi `POST /api/v1/auth/forgot-password`.
   - **Chống rò rỉ thông tin (User Enumeration)**: Luôn trả về phản hồi thành công trung tính: *"Nếu tài khoản tồn tại trong hệ thống, mã xác minh đã được gửi."*
   - Xác thực OTP -> Backend cấp `resetToken` ngắn hạn (10 phút, dùng một lần).
   - Đặt lại mật khẩu mới kèm `resetToken` -> Hash mật khẩu mới, cập nhật vào DB, đồng thời **thu hồi (revoke) toàn bộ session** trên tất cả các thiết bị để đảm bảo an toàn.
6. **Multi-Device Sessions & Session Restoration**:
   - Bảng `Session` quản lý phiên đa thiết bị độc lập: `(id, accountId, refreshTokenHash, deviceInfo, ipAddress, expiresAt, revokedAt)`.
   - Đăng nhập trên thiết bị mới không làm ngắt kết nối thiết bị cũ.
   - Khi mở lại app, nếu Access Token hết hạn, client tự động gọi `POST /api/v1/auth/refresh` bằng Refresh Token trong SecureStore/Cookie để nhận Access Token mới mà không bắt người dùng đăng nhập lại.
7. **Logout Flow**:
   - Gọi `POST /api/v1/auth/logout`. Backend chỉ đánh dấu `revokedAt = NOW()` cho phiên của thiết bị hiện tại. Các thiết bị khác vẫn duy trì đăng nhập.
8. **Application Splash & Role Splash**:
   - Application Splash: Logo-only RoadToSchool trên nền `#FFFDF6`, hiển thị trong lúc nạp app và khôi phục session.
   - Role Splash: Hiển thị 1 - 1.5s ngay sau khi người dùng bấm Đăng nhập thành công từ form (Manual Login) để xác nhận ngữ cảnh làm việc trước khi vào khu vực chính. Không hiển thị khi chỉ khôi phục session hằng ngày.

### 4.3. Initial System Admin Account Proposal
- **Tài khoản cam kết**:
  - Email: `admin@r2s.com`
  - Password: `Pass@123`
  - Role: `SYSTEM_ADMIN`
  - Nền tảng: **Web Only**
- **Cơ chế Bootstrap**:
  - Cấu hình qua biến môi trường trong `api/.env`: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`.
  - Script thực thi: `npm run db:seed:admin`.
  - **Tính Idempotent**: Kiểm tra tài khoản trong PostgreSQL trước khi tạo. Nếu đã tồn tại -> bỏ qua (không ghi đè mật khẩu hay làm xáo trộn dữ liệu). Nếu chưa có -> hash mật khẩu bằng `bcrypt` (salt rounds = 10) và tạo tài khoản với `role: SYSTEM_ADMIN`, `isVerified: true`.
  - Tuyệt đối không tạo public API đăng ký Admin, không log plain-text password.

### 4.4. 5 Quyết định Nghiệp vụ cần Người dùng Phê duyệt:
1. **Mô hình Account Schema**: Sử dụng 1 bảng `Account` tập trung duy nhất cho cả 5 roles trong Phase 1 (khuyên dùng).
2. **Thời điểm tạo Account khi Phụ huynh đăng ký**: Tạo bản ghi `Account` với trạng thái `isVerified = false` ngay khi gửi form (khuyên dùng).
3. **Chính sách Session khi Đổi/Reset Mật khẩu**: Thu hồi (revoke) toàn bộ session trên tất cả các thiết bị để đảm bảo an toàn tối đa (khuyên dùng).
4. **Hiển thị Role Splash**: Chỉ hiển thị Role Splash sau khi bấm Login thành công từ form; khi mở lại app khôi phục session thì vào thẳng màn hình chính (khuyên dùng).
5. **Đăng ký bằng SĐT chưa có Email**: Cho phép linh hoạt `email` hoặc `phone` mang giá trị `NULL` tùy phương thức đăng ký ban đầu.

---

## 5. Implementation Details
- **Application Code Changes**: `No application code changes.` (Giai đoạn Stage A chỉ phân tích và đề xuất kiến trúc).
- **Files Created/Modified**:
  - `docs/ai-review/LATEST.md`: Cập nhật nội dung báo cáo phân tích Phase 1 Stage A.
  - `docs/ai-review/LATEST.diff`: Đánh dấu không có code changes.
  - `docs/ai-review/history/2026-10-22-1350-phase-1-stage-a-auth-analysis.md`: Lưu bản sao lịch sử báo cáo.

---

## 6. Database Changes
`None`  
*(Đề xuất kiến trúc Database gồm 3 bảng `Account`, `Session`, `OtpChallenge` sẽ được thiết kế chi tiết bằng Prisma Schema tại Stage B sau khi được phê duyệt).*

---

## 7. API & Swagger Changes
`None`  
*(Danh mục 9 endpoints dự kiến gồm login, register, verify-otp, forgot-password, reset-password, refresh, me, logout sẽ được đặc tả DTO và Swagger spec tại Stage B).*

---

## 8. UI/UX Changes
`None`  
*(Danh mục màn hình dự kiến gồm 6 màn hình Web và 8 màn hình Mobile đã được xác định; wireframes trực quan theo nguyên tắc Minimal UI Copy sẽ được dựng tại Stage B).*

---

## 9. Verification & Testing
- Đã kiểm tra tính toàn vẹn và phân tích sâu các yêu cầu nghiệp vụ: **PASS**.
- Đã đối chiếu với `docs/BUSINESS_CONTEXT.md` và `docs/WORKING_RULES.md`: **PASS**.
- Kiểm tra tính độc lập của 3 project (`api`, `web`, `mobile`): **PASS**.
- Testing code/endpoints: **NOT APPLICABLE** (Chưa viết code).

---

## 10. Issues & Risks
- **Rủi ro User Enumeration**: Tại API Quên mật khẩu, cần phản hồi thông điệp trung tính để tránh kẻ xấu dò quét danh sách email/sĐT của phụ huynh và nhân sự.
- **Rủi ro Phân quyền Nền tảng (Platform Spoofing)**: Không được dựa vào User-Agent hay Platform Header do client gửi lên; Backend RolesGuard phải truy vấn Role thực tế từ DB để quyết định quyền truy cập Web hay Mobile.
- **Rủi ro rò rỉ mã OTP**: Console log chỉ hiển thị trong môi trường development local; không bao giờ trả mã OTP trong API response.

---

## 11. Reviewer Focus (Trọng Điểm Cần AI Reviewer Độc Lập Rà Soát)
1. **Platform Restriction Logic**: Kiểm tra tính chặt chẽ của quy định Web chỉ cho phép `SYSTEM_ADMIN` & `SCHOOL_ADMIN`, Mobile chỉ cho phép `DRIVER`, `BUS_ATTENDANT`, `PARENT`.
2. **Multi-Device & Session Architecture**: Đánh giá tính khả thi và độ an toàn của giải pháp lưu hash Refresh Token trong PostgreSQL (không cần Redis), kết hợp HttpOnly Cookie trên Web và Expo SecureStore trên Mobile.
3. **OTP Security Workflow**: Đánh giá độ an toàn của chu trình phát mã OTP (thời hạn 5 phút, giới hạn 5 lần thử, cooldown 60s, hủy mã sau khi dùng).
4. **Initial System Admin Seeding**: Kiểm tra tính idempotent và bảo mật của luồng bootstrap `admin@r2s.com` / `Pass@123`.
5. **5 Business Decisions**: Xem xét tính hợp lý của các khuyến nghị đã đề xuất tại Mục 4.4.

---

## 12. Suggested Next Step
Chờ người dùng và AI Reviewer độc lập xem xét, phê duyệt kết quả phân tích Stage A này và cho ý kiến về 5 câu hỏi nghiệp vụ; sau đó chuyển sang thực hiện **Phase 1 — Stage B: Technical Design & Auth Wireframes** (Thiết kế chi tiết Prisma Schema, API Contracts kèm Swagger spec, và dựng Wireframes trực quan cho Web & Mobile).

---

## 13. Approval Status
`WAITING FOR USER REVIEW / APPROVAL`
