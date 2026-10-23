# RoadToSchool — AI Review Report: Phase 1 — Stage B Final Adjustments

## 1. Task Information
- **Task Name**: Phase 1 — Authentication & Account Access: Stage B Final Adjustments
- **Date**: 2026-10-22
- **Project Scope**: Architecture, Database Schema, API Contracts, UI/UX Wireframes
- **Task Type**: Technical Design Final Adjustments & Risk Classification
- **Status**: WAITING_APPROVAL (Tuyệt đối KHÔNG viết mã nguồn, KHÔNG sửa Schema thực tế, KHÔNG chạy Migration, KHÔNG seed dữ liệu)

---

## 2. Approved Changes Summary
Các quyết định điều chỉnh chính thức từ Product Owner đã được ghi nhận và đưa vào thiết kế:

1. **OTP Hashing — APPROVED AS IS**: Giữ nguyên sinh OTP bằng secure random, hash SHA-256, chỉ lưu hash trong DB, không trả OTP trong response, single-use, gắn với identifier & purpose. Ghi nhận giới hạn bảo mật của SHA-256 đối với mã 6 số nhưng chấp nhận trong giai đoạn hiện tại.
2. **OTP Resend — Dựa hoàn toàn vào `expiresAt`**: Chỉ được cấp OTP mới khi `now >= expiresAt`. Không giới hạn số lần yêu cầu lại mã.
3. **OTP Verification — Cho phép nhập sai không giới hạn (Unlimited Invalid Attempts)**: Người dùng được phép nhập sai OTP nhiều lần. Nhập sai không khóa hay hủy OTP. Không đếm số lần nhập sai. Chỉ từ chối khi OTP sai hoặc hết hạn. Khi OTP đúng mới hoàn tất nghiệp vụ và consume.
4. **OTP Schema — Loại bỏ `attempts` / `maxAttempts`**: Bảng `OtpChallenge` chỉ giữ các trường tối cần thiết (`id`, `userId`, `identifier`, `channel`, `purpose`, `otpHash`, `expiresAt`, `consumedAt`, `createdAt`, `updatedAt`). Loại bỏ hoàn toàn `attempts`, `maxAttempts`, `resendCount`, `maxResends`, `cooldownUntil`, `resetTokenHash`.
5. **Forgot Password — Phản hồi đồng nhất (Uniform Response)**: `POST /api/v1/auth/forgot-password/request-otp` luôn trả về JSON trung tính duy nhất `{ "message": "Nếu tài khoản tồn tại và đủ điều kiện, mã xác minh sẽ được gửi." }`. Không trả `remainingSeconds` khác nhau nhằm chống User Enumeration.
6. **OTP Concurrency — Tạm hoãn (DEFERRED)**: Không dùng Distributed Locks hay Redis. Rủi ro concurrency được xếp loại `ACCEPTED FOR CURRENT DEVELOPMENT STAGE — NOT FULLY MITIGATED`.
7. **Refresh Rotation — Atomic Conditional Update**: Triển khai xoay vòng Token Pair nguyên tử bằng Prisma `updateMany` kiểm tra đồng thời `id`, `refreshTokenHash`, `tokenVersion`, `revokedAt = null`, `expiresAt > now`. Ngăn chặn hoàn toàn race condition tạo ra hai cặp token hợp lệ từ cùng một refresh token.

---

## 3. OTP Hashing — APPROVED AS IS
- **Phương pháp**: Băm mã 6 chữ số bằng hàm băm SHA-256 tiêu chuẩn (`crypto.createHash('sha256').update(otp).digest('hex')`).
- **Lưu trữ**: Chỉ lưu `otpHash` trong bảng `OtpChallenge`. Tuyệt đối không lưu plain-text OTP và không trả OTP trong bất kỳ API response nào.
- **Ràng buộc**: Mã chỉ có hiệu lực cho duy nhất một lần sử dụng thành công (`consumedAt IS NULL`). Gắn chặt với cặp `(identifier, purpose)`.
- **Đánh giá rủi ro**: Vì không gian mẫu của mã 6 số tương đối nhỏ ($10^6$ khả năng) và không dùng HMAC/Salt, trên lý thuyết kẻ tấn công có quyền đọc DB có thể tra cứu mã. Tuy nhiên, giới hạn này được **chấp thuận (Approved as is)** cho giai đoạn phát triển hiện tại của đồ án sinh viên để giữ cấu trúc đơn giản, dễ bảo trì.

---

## 4. OTP Resend — BASED ON `expiresAt`
- **Quy tắc cấp lại**:
  - `now < expiresAt`: Hệ thống từ chối cấp OTP mới (`400 Bad Request`).
  - `now >= expiresAt`: Hệ thống cho phép sinh và cấp OTP mới nếu thỏa mãn các điều kiện nghiệp vụ khác.
- **Tính độc lập**: Quy tắc này áp dụng nhất quán, không phụ thuộc vào việc mã trước đó đã bị nhập sai bao nhiêu lần hay đã hết hạn bao lâu.
- **Không giới hạn lượt**: Không áp dụng bất kỳ biến đếm tổng lượt gửi lại nào (`resendCount` hay `maxResends`).
- **Thời hạn TTL**: Được lấy từ cấu hình môi trường `AUTH_OTP_TTL_SECONDS=300` (mặc định 5 phút).

---

## 5. OTP Verification — UNLIMITED INVALID ATTEMPTS
- **Quyết định mới**: Bãi bỏ cơ chế khóa mã khi nhập sai quá 5 lần.
- **Quy trình xử lý**:
  1. Người dùng nhập sai mã: API trả về `400 Bad Request` (*"Mã xác thực không chính xác"*). Mã OTP trong DB **không** bị thay đổi trạng thái, **không** bị đánh dấu consumed, **không** bị khóa.
  2. Người dùng có thể tiếp tục nhập lại mã khác ngay lập tức.
  3. Nếu mã đã hết hạn (`now >= expiresAt`): API từ chối với `400 Bad Request` (*"Mã xác thực đã hết hạn"*). Lúc này người dùng phải yêu cầu gửi mã mới.
  4. Nếu người dùng nhập đúng mã: Hệ thống thực hiện nghiệp vụ (tạo User hoặc đổi Password) và đánh dấu `consumedAt = NOW()` trong cùng một Transaction để đảm bảo tính dùng một lần.

---

## 6. OTP Schema — REMOVED `attempts` / `maxAttempts`
Bảng `OtpChallenge` trong đề xuất Prisma Schema đã được tinh giản tối đa:
- **Đã loại bỏ**: `attempts`, `maxAttempts`, `resendCount`, `maxResends`, `cooldownUntil`, `resetTokenHash`.
- **Cấu trúc trường còn lại**:
  - `id`: UUID khóa chính.
  - `userId`: Nullable (null khi đăng ký vì User chưa tạo; có giá trị khi quên mật khẩu).
  - `identifier`: Email hoặc số điện thoại đã chuẩn hóa.
  - `channel`: Enum `DeliveryChannel` (`EMAIL`, `SMS`).
  - `purpose`: Enum `OtpPurpose` (`PARENT_REGISTRATION`, `PASSWORD_RESET`).
  - `otpHash`: Chuỗi SHA-256 hash của mã OTP.
  - `expiresAt`: Mốc thời gian hết hạn của mã (định nghĩa cả cửa sổ nhập và cửa sổ cấp lại).
  - `consumedAt`: Nullable, đánh dấu thời điểm mã được sử dụng thành công.
  - `createdAt`, `updatedAt`: Timestamps tự động.

---

## 7. Forgot Password — UNIFORM RESPONSE
- **Endpoint**: `POST /api/v1/auth/forgot-password/request-otp`.
- **Bảo vệ Anti-Enumeration tuyệt đối**:
  - Đối với mọi request có định dạng hợp lệ (Email/SĐT đúng chuẩn), Backend luôn trả về mã phản hồi `200 OK` với body duy nhất:
    ```json
    {
      "message": "Nếu tài khoản tồn tại và đủ điều kiện, mã xác minh sẽ được gửi."
    }
    ```
  - Tuyệt đối **không trả về** thông tin tài khoản tồn tại hay không, không báo tài khoản bị khóa hay không, và không trả `remainingSeconds` khác nhau giữa tài khoản có thật và không có thật.
  - Frontend sẽ chạy đồng hồ đếm ngược nội bộ (client timer) dựa trên `AUTH_OTP_TTL_SECONDS` của flow mà không làm rò rỉ dữ liệu từ server.

---

## 8. OTP Concurrency — DEFERRED
- **Hiện trạng kỹ thuật**: Hệ thống sử dụng Prisma Transaction bọc việc kiểm tra `consumedAt IS NULL` và cập nhật `consumedAt = NOW()`.
- **Rủi ro**: Nếu hai request xác minh cùng một OTP tới server đúng cùng một thời điểm microsecond, có khả năng cả hai đều vượt qua điều kiện kiểm tra trước khi một trong hai kịp commit (Race Condition).
- **Phân loại rủi ro**: `ACCEPTED FOR CURRENT DEVELOPMENT STAGE — NOT FULLY MITIGATED`.
- Không bổ sung Redis Distributed Lock hay cơ chế khóa hàng chờ phức tạp trong Phase này nhằm giữ đúng tiêu chí Project Sinh viên.

---

## 9. Refresh Rotation — ATOMIC CONDITIONAL UPDATE
- **Kỹ thuật thực hiện**:
  Khi nhận yêu cầu tại `POST /api/v1/auth/refresh`, Backend sử dụng phương thức `updateMany` của Prisma với điều kiện ràng buộc nguyên tử ở tầng SQL:
  ```ts
  const result = await prisma.session.updateMany({
    where: {
      id: sessionId,
      refreshTokenHash: currentRefreshTokenHash,
      tokenVersion: currentTokenVersion,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      tokenVersion: { increment: 1 },
      expiresAt: new Date(Date.now() + refreshTokenTtlMs),
    },
  });
  ```
- **Xử lý kết quả**:
  - Nếu `result.count === 1`: Cập nhật thành công duy nhất. Cấp Access Token mới (mang `ver: currentTokenVersion + 1`) và Refresh Token mới.
  - Nếu `result.count === 0`: Cập nhật thất bại (do Refresh Token đã bị sử dụng bởi request khác, hoặc session đã bị thu hồi/hết hạn). Ngay lập tức từ chối với `401 Unauthorized`.
- **Hiệu quả**: Loại bỏ hoàn toàn tình trạng hai request đồng thời cùng refresh thành công và tạo ra hai phiên bản token hợp lệ song song.

---

## 10. Updated API Contracts Summary (9 Endpoints)

| # | Phương thức | Endpoint | Actor | Thay đổi cốt lõi trong lần điều chỉnh này |
|---|---|---|---|---|
| 1 | `POST` | `/api/v1/auth/web/login` | `SYSTEM_ADMIN`, `SCHOOL_ADMIN` | Giữ nguyên. Cấp Token Pair qua Response Body (`tokenVersion = 1`). |
| 2 | `POST` | `/api/v1/auth/mobile/login` | `DRIVER`, `BUS_ATTENDANT`, `PARENT` | Giữ nguyên. Trả Token Pair trong Response Body. |
| 3 | `POST` | `/api/v1/auth/register/request-otp` | Public | Cấp lại chỉ khi `now >= expiresAt`. Không tạo User rác. |
| 4 | `POST` | `/api/v1/auth/register/verify` | Public | Không đếm số lần sai. Nhập sai báo lỗi cho nhập lại, không khóa OTP. |
| 5 | `POST` | `/api/v1/auth/forgot-password/request-otp` | Public | **Phản hồi đồng nhất 100%**, không trả `remainingSeconds` rò rỉ. |
| 6 | `POST` | `/api/v1/auth/reset-password` | Public | Không đếm số lần sai. Nhập đúng -> đổi pass + thu hồi toàn bộ sessions. |
| 7 | `POST` | `/api/v1/auth/refresh` | Public / Session | **Atomic Conditional Update** qua `updateMany`, xoay vòng toàn bộ token pair. |
| 8 | `GET` | `/api/v1/auth/me` | Authenticated | Kiểm tra `tokenVersion` khớp DB Session, session chưa revoked/expired. |
| 9 | `POST` | `/api/v1/auth/logout` | Authenticated | Thu hồi session hiện tại (`revokedAt = NOW()`). |

*Chi tiết toàn bộ Contract, DTOs và Swagger plan tại [docs/architecture/auth-technical-design.md:L187-L450](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/architecture/auth-technical-design.md#L187-L450).*

---

## 11. Updated Database Schema Proposal (Prisma Specification)

```prisma
enum Role {
  SYSTEM_ADMIN
  SCHOOL_ADMIN
  DRIVER
  BUS_ATTENDANT
  PARENT
}

enum OtpPurpose {
  PARENT_REGISTRATION
  PASSWORD_RESET
}

enum DeliveryChannel {
  EMAIL
  SMS
}

model User {
  id           String    @id @default(uuid())
  email        String?   @unique
  phone        String?   @unique
  fullName     String    @map("full_name")
  passwordHash String    @map("password_hash")
  role         Role
  avatarUrl    String?   @map("avatar_url")
  isVerified   Boolean   @default(true) @map("is_verified")
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  sessions      Session[]
  otpChallenges OtpChallenge[]

  @@map("users")
}

model Session {
  id               String    @id @default(uuid())
  userId           String    @map("user_id")
  refreshTokenHash String    @map("refresh_token_hash")
  tokenVersion     Int       @default(1) @map("token_version")
  deviceInfo       String?   @map("device_info")
  ipAddress        String?   @map("ip_address")
  expiresAt        DateTime  @map("expires_at")
  revokedAt        DateTime? @map("revoked_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@index([revokedAt])
  @@map("sessions")
}

model OtpChallenge {
  id         String          @id @default(uuid())
  userId     String?         @map("user_id")
  identifier String
  channel    DeliveryChannel
  purpose    OtpPurpose
  otpHash    String          @map("otp_hash")
  expiresAt  DateTime        @map("expires_at")
  consumedAt DateTime?       @map("consumed_at")
  createdAt  DateTime        @default(now()) @map("created_at")
  updatedAt  DateTime        @updatedAt @map("updated_at")

  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([identifier, purpose])
  @@index([expiresAt])
  @@map("otp_challenges")
}
```

---

## 12. Remaining Security Risks & Classification

| Rủi ro an ninh | Phân loại trạng thái | Ghi chú và Biện pháp chấp thuận |
|---|---|---|
| **Không giới hạn số lần nhập sai OTP (Brute-force window)** | `ACCEPTED FOR CURRENT STAGE` | Mã OTP 6 số ($10^6$ khả năng) trong thời hạn 300 giây. Không có khóa sau 5 lần thử. Chấp nhận cho môi trường local/sinh viên theo quyết định PO. |
| **Xử lý đồng thời OTP (Race condition on verify)** | `ACCEPTED — NOT FULLY MITIGATED` | Bọc trong Transaction nhưng chưa có Distributed Lock (Redis). Chấp nhận trong giai đoạn hiện tại. |
| **SHA-256 không salt trên OTP 6 số** | `ACCEPTED AS IS` | Giữ nguyên theo quyết định PO, không đổi sang HMAC. |
| **Token lưu trong Web `localStorage` (XSS Risk)** | `ACCEPTED WITH MITIGATION` | Giảm thiểu bằng React JSX encoding và Content Security Policy (CSP). |

---

## 13. AI Reviewer Focus Checklist

AI Reviewer độc lập cần kiểm tra các điểm cốt lõi sau:
- [ ] Bảng `OtpChallenge` đã loại bỏ hoàn toàn các trường `attempts`, `maxAttempts`, `resendCount`, `maxResends`, `cooldownUntil` chưa?
- [ ] Logic xác thực OTP đã loại bỏ bước kiểm tra/tăng số lần sai, đảm bảo người dùng được phép nhập sai không giới hạn chưa?
- [ ] Endpoint `POST /api/v1/auth/forgot-password/request-otp` đã bảo đảm phản hồi đồng nhất (Uniform Response) 100% chưa?
- [ ] Logic `POST /api/v1/auth/refresh` đã áp dụng kỹ thuật **Atomic Conditional Update** (`updateMany` với `tokenVersion` và `refreshTokenHash`) chưa?
- [ ] Danh sách rủi ro còn lại có được phân loại trung thực là `ACCEPTED — NOT FULLY MITIGATED` thay vì tự đánh dấu PASS không?
- [ ] Toàn bộ tài liệu có tuân thủ quy tắc KHÔNG sửa mã nguồn application trong Stage B không?

---

## 14. Proposed Implementation Plan (Stage C Sẵn sàng)

Sau khi có quyết định phê duyệt chính thức cho Stage B:
1. **Bước 1**: Cập nhật `api/prisma/schema.prisma` và chạy `npx prisma migrate dev --name init_auth_tables`.
2. **Bước 2**: Viết script seed admin độc lập tại `api/scripts/seed-admin.ts` và thêm `"db:seed:admin"` vào `package.json`.
3. **Bước 3**: Triển khai `AuthModule` trong NestJS: `AuthService`, `AuthController`, `AuthGuard`, `OtpService`, DTOs và đồng bộ Swagger trên `/api/docs`.
4. **Bước 4**: Triển khai Web Auth UI (Next.js) với `localStorage` token storage và Role Splash.
5. **Bước 5**: Triển khai Mobile Auth UI (Expo) với `Expo SecureStore` và Role Splash.

---

## 15. Git Diff Notice
```text
# No application code changes for Stage B Final Adjustments.
# Scope: Architecture, Prisma Schema Proposal, API Contract Specification, UI Wireframes Revision.
# Application code in api/, web/, and mobile/ remains clean and untouched.
```
- **TRẠNG THÁI HIỆN TẠI**: DỪNG LẠI VÀ CHỜ PHÊ DUYỆT STAGE C.
