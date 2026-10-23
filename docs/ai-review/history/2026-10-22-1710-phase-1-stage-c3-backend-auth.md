# RoadToSchool — AI Review Report: Phase 1 — Task C3 Implementation

## A. Task Information
- **Task**: TASK C3 — Backend Authentication & Swagger Implementation
- **Phase**: Phase 1 — Authentication & Account Access (Stage C — Implementation)
- **Scope**: Backend API (`api/src/auth/*`, `api/src/main.ts`, `api/src/app.module.ts`, `api/package.json`)
- **Status**: COMPLETED — WAITING FOR REVIEW (Dừng lại sau Task C3, tuyệt đối không tự ý chuyển sang Task C4 hay sửa Web/Mobile)

---

## B. Implementation Summary
- **Auth Architecture**:
  - Module NestJS tinh gọn nằm tại `api/src/auth/` với các thành phần:
    - [auth.module.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/auth/auth.module.ts): Đăng ký `JwtModule`, `PrismaModule`, `ConfigModule`, export `AuthService` và `AuthGuard`.
    - [auth.controller.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/auth/auth.controller.ts): Cung cấp 9 REST API endpoints với Swagger decorators hoàn chỉnh bằng tiếng Việt.
    - [auth.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/auth/auth.service.ts): Nghiệp vụ xác thực tập trung, login phân luồng theo role/platform, quản lý phiên đa thiết bị, xoay vòng token nguyên tử, đăng ký phụ huynh kèm OTP, đặt lại mật khẩu bằng OTP.
    - [otp.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/auth/otp.service.ts): Quản lý vòng đời mã OTP, sinh OTP ngẫu nhiên dạng chuỗi (cho phép bắt đầu bằng số 0), băm SHA-256, kiểm tra thời hạn `expiresAt`, gửi OTP qua Email (Console/SMTP) hoặc SMS (Console) bằng tiếng Việt.
    - [auth.guard.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/auth/auth.guard.ts): Can thiệp kiểm tra từng request có Bearer token; xác thực chữ ký JWT, tra cứu trạng thái session trong cơ sở dữ liệu (`revokedAt`, `expiresAt`), kiểm tra `tokenVersion` và trạng thái người dùng (`isActive`, `isVerified`).
    - [auth.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/auth/dto/auth.dto.ts): DTOs cho 9 endpoints với các ràng buộc `class-validator` có thông báo lỗi hoàn toàn bằng tiếng Việt.
    - [auth-user.decorator.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/auth/decorators/auth-user.decorator.ts): Custom decorators `@CurrentUser()` và `@CurrentSessionId()`.
- **JWT & Session Management**:
  - Access Token chứa claims: `sub`, `role`, `sid`, `ver`, `iat`, `exp`. TTL đọc từ `AUTH_ACCESS_TOKEN_TTL_SECONDS`.
  - Refresh Token dạng chuỗi ngẫu nhiên cryptographically secure (64 bytes hex), chỉ lưu băm SHA-256 vào trường `refreshTokenHash` trong DB.
  - Multi-device Sessions: Mỗi lần đăng nhập tạo một bản ghi `Session` riêng biệt trong bảng `sessions`.
  - Full Token Pair Rotation: Cập nhật điều kiện nguyên tử bằng `prisma.session.updateMany` dựa trên `id`, `refreshTokenHash`, `tokenVersion`, `revokedAt = null`, `expiresAt > now`. Ngăn chặn hoàn toàn việc tái sử dụng refresh token cũ và race condition. Tăng `tokenVersion` thêm 1, vô hiệu hóa ngay lập tức Access Token cũ.
  - Immediate Access Token Revocation: AuthGuard kiểm tra cơ sở dữ liệu trên từng request (không bỏ qua Database Session). Logout vô hiệu hóa session hiện tại; Reset Password vô hiệu hóa toàn bộ sessions của người dùng.
- **OTP & Parent Registration**:
  - Không tạo tài khoản trước khi xác minh OTP.
  - Phụ huynh xác minh OTP thành công (`/auth/register/verify`) sẽ tạo tài khoản `Role.PARENT`, `isVerified = true`, `isActive = true`, đánh dấu consume OTP, tạo session và tự động đăng nhập (trả token pair).
  - Không giới hạn số lần nhập sai OTP (sai OTP chỉ báo lỗi tiếng Việt, không khóa).
  - Chỉ cho phép gửi lại mã khi OTP gần nhất đã hết hạn `expiresAt`.
- **Password Reset**:
  - Phản hồi trung tính Anti-Enumeration: `/auth/forgot-password/request-otp` trả về cùng một thông báo tiếng Việt dù tài khoản có tồn tại hay không.
  - Đặt lại mật khẩu trực tiếp qua OTP (`/auth/reset-password`), không cấp Reset Token trung gian, hủy toàn bộ session sau khi cập nhật mật khẩu thành công.

---

## C. API Contracts & Swagger Status

Tất cả 9 endpoints đã được triển khai, kiểm thử thực tế và đồng bộ lên Swagger tại `http://localhost:3000/api/docs`:

| Method | Endpoint | Summary (Tiếng Việt) | Quyền truy cập | Status Codes | Swagger Status |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/web/login` | Đăng nhập dành cho Web (Quản trị viên) | Public (Chỉ SYSTEM_ADMIN, SCHOOL_ADMIN) | 200, 400, 401 | **SYNCHRONIZED** |
| POST | `/api/v1/auth/mobile/login` | Đăng nhập dành cho Mobile (Tài xế, Phụ xe, Phụ huynh) | Public (Chỉ DRIVER, BUS_ATTENDANT, PARENT) | 200, 400, 401 | **SYNCHRONIZED** |
| POST | `/api/v1/auth/register/request-otp` | Yêu cầu mã OTP đăng ký tài khoản Phụ huynh | Public | 200, 400, 409 | **SYNCHRONIZED** |
| POST | `/api/v1/auth/register/verify` | Xác thực OTP và hoàn tất đăng ký Phụ huynh | Public | 201, 400, 409 | **SYNCHRONIZED** |
| POST | `/api/v1/auth/forgot-password/request-otp` | Yêu cầu mã OTP đặt lại mật khẩu (Anti-Enumeration) | Public | 200, 400 | **SYNCHRONIZED** |
| POST | `/api/v1/auth/reset-password` | Đặt lại mật khẩu bằng mã OTP | Public | 200, 400 | **SYNCHRONIZED** |
| POST | `/api/v1/auth/refresh` | Làm mới cặp mã xác thực (Token Pair Rotation) | Public | 200, 400, 401 | **SYNCHRONIZED** |
| GET | `/api/v1/auth/me` | Lấy thông tin tài khoản hiện tại | Bearer Token (All Roles) | 200, 401 | **SYNCHRONIZED** |
| POST | `/api/v1/auth/logout` | Đăng xuất và thu hồi phiên đăng nhập hiện tại | Bearer Token (All Roles) | 200, 401 | **SYNCHRONIZED** |

---

## D. Vietnamese Language Compliance

Đã tuân thủ nghiêm ngặt Chính sách Ưu tiên Tiếng Việt (Vietnamese-First):
- **User-Facing API Messages**: Mọi trường `message` trả về client đều sử dụng tiếng Việt tự nhiên, đúng dấu chính tả:
  - Đăng nhập: `"Đăng nhập thành công"`, `"Thông tin đăng nhập không chính xác"`, `"Tài khoản đã bị vô hiệu hóa"`, `"Tài khoản chưa được xác thực"`.
  - Phân quyền theo ứng dụng: `"Tài khoản không có quyền truy cập vào cổng quản trị web"`, `"Tài khoản không có quyền truy cập vào ứng dụng di động"`.
  - Phiên làm việc: `"Phiên đăng nhập không tồn tại hoặc đã bị thu hồi"`, `"Phiên đăng nhập đã hết hạn"`, `"Mã làm mới không hợp lệ hoặc đã bị vô hiệu hóa"`, `"Đăng xuất thành công"`.
  - OTP & Đăng ký: `"Mã xác thực đã được gửi"`, `"Mã xác thực không chính xác"`, `"Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới"`, `"Mã xác thực trước đó vẫn còn hiệu lực. Vui lòng thử lại sau {X} giây"`, `"Email hoặc số điện thoại này đã được đăng ký"`, `"Đăng ký tài khoản thành công"`.
  - Quên mật khẩu: `"Nếu tài khoản tồn tại và đủ điều kiện, mã xác minh sẽ được gửi."` (Phản hồi trung tính), `"Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới"`.
- **Validation Messages**: Cấu hình `exceptionFactory` trong `ValidationPipe` tại `main.ts` chuyển đổi toàn bộ lỗi validation sang tiếng Việt, loại bỏ hoàn toàn các thông báo lỗi tiếng Anh mặc định của thư viện `class-validator`.
- **OTP Notifications**:
  - Email Subject: `"Mã xác thực đăng ký tài khoản RoadToSchool"`, `"Mã xác thực đặt lại mật khẩu RoadToSchool"`.
  - Email & SMS Content: `"Mã xác thực {mục đích} RoadToSchool của bạn là: {otp}. Mã có hiệu lực trong {minutes} phút. Vui lòng không chia sẻ mã này với bất kỳ ai."`
- **Swagger Documentation**:
  - `DocumentBuilder`: Tiêu đề và mô tả hệ thống hoàn toàn bằng tiếng Việt.
  - Operation Summary: 100% bằng tiếng Việt ngắn gọn.
  - Operation Description: 100% bằng tiếng Việt chi tiết.
  - BearerAuth Description: Tiếng Việt (`"Nhập Access Token JWT"`).
- **Phần giữ nguyên định danh kỹ thuật tiếng Anh (theo đúng quy định)**:
  - Error Code kỹ thuật: `"VALIDATION_ERROR"`, `"INVALID_CREDENTIALS"`, `"UNAUTHORIZED"`, `"TOKEN_EXPIRED"`, v.v.
  - Role Enums: `SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `DRIVER`, `BUS_ATTENDANT`, `PARENT`.
  - JSON keys: `accessToken`, `refreshToken`, `user`, `statusCode`, `message`, `code`, v.v.

---

## E. Files Changed
- **Files Added**:
  - `api/src/auth/auth.module.ts`: Khai báo module xác thực.
  - `api/src/auth/auth.controller.ts`: Controller 9 endpoints và Swagger decorators.
  - `api/src/auth/auth.service.ts`: Service nghiệp vụ xác thực chính.
  - `api/src/auth/auth.guard.ts`: Guard xác thực JWT và kiểm tra Database Session.
  - `api/src/auth/otp.service.ts`: Service tạo, băm, gửi và xác thực OTP.
  - `api/src/auth/otp.service.spec.ts`: Unit test kiểm thử OTP service bằng Vitest.
  - `api/src/auth/dto/auth.dto.ts`: Định nghĩa DTO và validation messages tiếng Việt.
  - `api/src/auth/dto/index.ts`: Re-export DTOs.
  - `api/src/auth/decorators/auth-user.decorator.ts`: Parameter decorators lấy User và SessionId.
- **Files Modified**:
  - `api/package.json`: Bổ sung `@nestjs/jwt`, `nodemailer`, `@types/nodemailer`.
  - `api/package-lock.json`: Khóa phiên bản các package mới cài đặt.
  - `api/src/app.module.ts`: Import `AuthModule`.
  - `api/src/main.ts`: Đăng ký Swagger BearerAuth và custom exceptionFactory cho `ValidationPipe` hỗ trợ tiếng Việt.
- **Files Deleted**: Không có file mã nguồn nào bị xóa (file script kiểm thử tạm thời `test-auth-suite.js` đã được dọn dẹp sau khi kiểm thử xong).

---

## F. Database Impact
- **Bảng được đọc/ghi**:
  - `users`: Tìm kiếm theo email/phone khi đăng nhập, tạo mới khi verify OTP đăng ký, cập nhật `passwordHash` khi reset password.
  - `sessions`: Tạo bản ghi phiên mới khi đăng nhập hoặc đăng ký thành công, cập nhật xoay vòng token nguyên tử khi refresh, cập nhật `revokedAt = now()` khi logout hoặc reset password.
  - `otp_challenges`: Tạo bản ghi OTP khi yêu cầu, tra cứu mã mới nhất khi verify, cập nhật `consumedAt = now()` khi xác thực thành công.
- **Migration**: Không có migration mới nào được tạo hoặc chạy. Giữ nguyên 100% Schema đã duyệt từ Task C1.

---

## G. Configuration
- **Các biến môi trường được hỗ trợ**:
  - `AUTH_JWT_ACCESS_SECRET`: Chuỗi bí mật ký JWT (được lưu trong `api/.env` đã git ignore).
  - `AUTH_ACCESS_TOKEN_TTL_SECONDS`: Thời hạn sống của Access Token (giây), mặc định `900` (15 phút).
  - `AUTH_REFRESH_TOKEN_TTL_SECONDS`: Thời hạn sống của Refresh Token (giây), mặc định `604800` (7 ngày).
  - `AUTH_OTP_LENGTH`: Độ dài mã số OTP, mặc định `6`.
  - `AUTH_OTP_TTL_SECONDS`: Thời hạn sống của mã OTP (giây), mặc định `300` (5 phút).
  - `AUTH_EMAIL_MODE`: Kênh gửi email (`console` hoặc `smtp`).
  - `AUTH_SMS_MODE`: Kênh gửi SMS (`console`).
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: Cấu hình gửi mail qua SMTP nếu bật chế độ `smtp`.
- **An toàn bí mật**: Không hardcode secret hoặc password trong mã nguồn; `LATEST.diff` không chứa bất kỳ secret nào.

---

## H. Tests & Verification

| Hạng mục kiểm thử | Lệnh / Kịch bản thực thi | Kết quả | Chi tiết kiểm chứng |
|---|---|---|---|
| NestJS Compilation | `npm run build` | **PASS** | `nest build` thành công, không lỗi TypeScript |
| Unit Tests | `npm test` (Vitest) | **PASS** | 5/5 tests passed (bao gồm `OtpService` và `HealthController`) |
| Web Login (System Admin) | POST `/auth/web/login` với tài khoản seed C2 | **PASS** | Trả về 200, JWT Access Token, Refresh Token, User Role SYSTEM_ADMIN |
| Mobile Restriction | POST `/auth/mobile/login` với System Admin | **PASS** | Bị từ chối với 401 và thông báo tiếng Việt |
| Password Validation | POST `/auth/web/login` sai mật khẩu | **PASS** | Trả về 401 với thông báo tiếng Việt |
| Validation Errors in Vietnamese | Gửi body rỗng lên login / register / reset | **PASS** | Trả về 400, format tiếng Việt đầy đủ |
| Protected API & AuthGuard | GET `/auth/me` với Bearer Token | **PASS** | Trả về thông tin user; nếu thiếu token trả 401 tiếng Việt |
| Parent Registration OTP Request | POST `/auth/register/request-otp` | **PASS** | Không tạo User trước khi verify; lưu challenge vào DB |
| OTP Resend Throttling | Request OTP lần 2 khi chưa hết 300s | **PASS** | Bị chặn, trả thông báo đếm ngược giây bằng tiếng Việt |
| Parent Register Verify & Auto-Login | POST `/auth/register/verify` đúng OTP | **PASS** | Tạo User PARENT, consume OTP, cấp token pair, auto-login |
| Parent Platform Restriction | Parent cố đăng nhập Web | **PASS** | Bị từ chối với 401 tiếng Việt; đăng nhập Mobile thành công |
| Duplicate Registration Block | Đăng ký lại identifier đã tồn tại | **PASS** | Trả 409 Conflict bằng tiếng Việt |
| Full Token Pair Rotation | POST `/auth/refresh` | **PASS** | Trả Token Pair mới; vô hiệu hóa ngay Access Token cũ; tái sử dụng Refresh Token cũ bị từ chối 401 |
| Uniform Forgot Password | POST `/auth/forgot-password/request-otp` | **PASS** | Trả cùng 1 thông báo trung tính cho cả user tồn tại và không tồn tại (Anti-Enumeration) |
| Reset Password Flow | POST `/auth/reset-password` | **PASS** | Cập nhật mật khẩu mới, thu hồi toàn bộ phiên cũ, đăng nhập lại bằng mật khẩu mới thành công |
| Immediate Session Revocation | POST `/auth/logout` | **PASS** | Cập nhật `revokedAt`, Access Token bị từ chối ngay lập tức |
| Swagger OpenAPI Docs | Kiểm tra `http://localhost:3000/api/docs` | **PASS** | Hiển thị đầy đủ 9 APIs, tag Authentication, JWT BearerAuth, summaries và descriptions tiếng Việt |

---

## I. Security & Risks
- **Kiểm soát phiên**: AuthGuard xác thực mọi request thông qua truy vấn cơ sở dữ liệu để kiểm tra trạng thái `revokedAt`, `expiresAt`, và `tokenVersion`. Mọi hành động đăng xuất hoặc đổi mật khẩu đều có hiệu lực tức thì mà không cần chờ Access Token hết hạn.
- **Xoay vòng Token nguyên tử**: Xoay vòng Refresh Token bằng atomic conditional update ngăn chặn tấn công replay attack hoặc sử dụng đồng thời một token refresh.
- **Các rủi ro đã được phê duyệt chấp nhận trong Development**:
  1. OTP băm bằng SHA-256 không dùng HMAC key.
  2. Không giới hạn số lần nhập sai OTP (không khóa OTP, chấp nhận cho development).
  3. Rủi ro concurrency OTP trong môi trường phát triển chưa được xử lý bằng hàng đợi hay khóa phân tán.
  4. Kênh SMS sử dụng Console mode, chưa tích hợp nhà cung cấp viễn thông thực.
  5. Token sẽ được lưu trữ phía client ở Task C4/C5 (Web: localStorage, Mobile: Expo SecureStore).

---

## J. Reviewer Focus
- **Cơ chế Atomic Token Rotation**: Kiểm tra phương thức `rotateTokenPair` trong `api/src/auth/auth.service.ts` sử dụng `updateMany` với điều kiện `tokenVersion` và `refreshTokenHash`.
- **Chính sách Tiếng Việt**: Kiểm tra tính tự nhiên, chính xác và đồng bộ của các thông báo lỗi người dùng trong `auth.service.ts`, `dto/auth.dto.ts`, và `main.ts`.
- **AuthGuard Database Lookup**: Kiểm tra logic tra cứu session và đối chiếu `tokenVersion` trong `api/src/auth/auth.guard.ts`.
- **Anti-Enumeration**: Kiểm tra phản hồi trung tính trong endpoint `/auth/forgot-password/request-otp`.

---

## K. Next Step
- **TASK C4 — WEB AUTHENTICATION IMPLEMENTATION**: Xây dựng giao diện Web Login cho Quản trị viên, tích hợp API `/auth/web/login`, quản lý phiên, Auth Guard phía Next.js và tuân thủ ngôn ngữ tiếng Việt.

---

## L. Approval Status
- **Trạng thái**: WAITING FOR PRODUCT OWNER APPROVAL.
- AI Agent đã dừng lại sau khi hoàn thành Task C3. Tuyệt đối không tự ý thực hiện Task C4 khi chưa có phê duyệt chính thức.
