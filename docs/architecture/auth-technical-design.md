# RoadToSchool — Phase 1: Authentication Technical Design & Wireframes (Stage B Final Adjustments)

> **Giai đoạn**: Phase 1 — Authentication & Account Access: Stage B Final Adjustments (Technical Design & Wireframes)  
> **Trạng thái**: Chờ phê duyệt (WAITING FOR APPROVAL) — Tuyệt đối chưa viết code application, chưa sửa schema thực tế, chưa chạy migration hay seed.

---

## 1. Database Schema Design (Prisma Specification)

Sử dụng **một bảng `User` duy nhất cho cả 5 Roles**, kết hợp bảng `Session` quản lý phiên đa thiết bị (hỗ trợ cập nhật nguyên tử có điều kiện - Atomic Conditional Update & Xoay vòng toàn bộ Token Pair) và bảng `OtpChallenge` tinh giản (không giới hạn số lần nhập sai, cấp lại chỉ dựa trên thời hạn `expiresAt`).

```prisma
// ==========================================
// ENUMS
// ==========================================

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

// ==========================================
// MODELS
// ==========================================

/// Bảng người dùng dùng chung cho toàn bộ 5 Roles
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

  // Relationships
  sessions      Session[]
  otpChallenges OtpChallenge[]

  @@map("users")
}

/// Bảng quản lý phiên đăng nhập đa thiết bị, thu hồi tức thì và xoay vòng toàn bộ Token Pair
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

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@index([revokedAt])
  @@map("sessions")
}

/// Bảng quản lý thử thách OTP trực tiếp (Không Reset Token, Không giới hạn lần thử sai, Resend chỉ dựa trên expiresAt)
model OtpChallenge {
  id         String          @id @default(uuid())
  userId     String?         @map("user_id") // Nullable: Khi đăng ký, User chưa tồn tại trong DB
  identifier String          // Email hoặc số điện thoại chuẩn hóa
  channel    DeliveryChannel
  purpose    OtpPurpose
  otpHash    String          @map("otp_hash")
  expiresAt  DateTime        @map("expires_at")
  consumedAt DateTime?       @map("consumed_at")
  createdAt  DateTime        @default(now()) @map("created_at")
  updatedAt  DateTime        @updatedAt @map("updated_at")

  // Relations
  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([identifier, purpose])
  @@index([expiresAt])
  @@map("otp_challenges")
}
```

### Chi tiết các trường và Ràng buộc (Constraints)

1. **Ràng buộc `email` & `phone`**:
   - `email` và `phone` đều là `nullable` và có ràng buộc `UNIQUE`.
   - Ràng buộc bắt buộc ở tầng Application & Database CHECK: `(email IS NOT NULL OR phone IS NOT NULL)`.
   - Chuẩn hóa: `email` luôn được `trim().toLowerCase()`. `phone` loại bỏ khoảng trắng và ký tự đặc biệt, chuẩn hóa về chuỗi số nguyên chuẩn.
2. **Quy tắc tạo User và `isVerified`**:
   - **Chưa xác minh OTP thì tuyệt đối chưa tạo User**. Khi Phụ huynh gửi Form đăng ký, hệ thống chỉ phát OTP chứ không ghi bản ghi User rác vào DB.
   - Khi OTP được xác thực thành công tại `POST /auth/register/verify`, User mới được tạo với `role = PARENT` và `isVerified = true`.
   - Thuộc tính `isVerified` được giữ lại để phục vụ các tài khoản nhân viên do Quản trị viên khởi tạo trong tương lai (khi cần kích hoạt tài khoản ban đầu), không còn dùng cho trạng thái chờ đăng ký Phụ huynh.
3. **Thuộc tính `avatarUrl`**:
   - Nullable, mặc định là `null`. Không upload trong Auth Phase; Frontend dùng Placeholder.
4. **Mô hình Session & Xoay vòng toàn bộ Token Pair (`tokenVersion`)**:
   - `Session.tokenVersion`: Bắt đầu từ `1`. Khi refresh token thành công, `tokenVersion` tăng lên 1 đơn vị.
   - Access Token JWT chứa claim `ver: session.tokenVersion`.
   - Khi refresh token, cả Access Token cũ (vì `ver` trong token cũ lệch với DB) và Refresh Token cũ (vì DB đổi `refreshTokenHash`) đều **bị vô hiệu hóa lập tức**.
5. **Bảng `OtpChallenge` tinh giản**:
   - **Loại bỏ hoàn toàn**: `attempts`, `maxAttempts`, `resendCount`, `maxResends`, `cooldownUntil`, `resetTokenHash`.
   - Trường `userId` là **Nullable**: Khi đăng ký `userId = null` (User chưa tồn tại); khi quên mật khẩu `userId` liên kết với User.

---

## 2. Token Architecture & Atomic Conditional Refresh Rotation

### 2.1. Phân định Token & Phương thức Phân phối (Response Body)

| Loại Token | Thời hạn (TTL) | Lưu trữ Client | Phương thức phân phối | Mục đích & Đặc tính |
|---|---|---|---|---|
| **Access Token** | 15 phút (`900s`) | Web: `localStorage`<br>Mobile: `Expo SecureStore` | **Response Body** | JWT chứa `{ sub: userId, role, sid: sessionId, ver: tokenVersion }`. Dùng để truy cập protected APIs. |
| **Refresh Token** | 7 ngày (`604800s`) | Web: `localStorage`<br>Mobile: `Expo SecureStore` | **Response Body** | Chuỗi ngẫu nhiên 64-hex, trong DB chỉ lưu SHA-256 hash. Dùng để xoay vòng cặp token mới. |

> **Quyết định đã duyệt về Storage**: Cả Web và Mobile đều nhận Tokens qua HTTP Response Body. Web lưu trữ tập trung tại `localStorage` (không dùng Cookie trong Phase này). Mobile lưu trữ tại `Expo SecureStore` (không dùng AsyncStorage cho tokens).

### 2.2. Cơ chế Xoay vòng Nguyên tử có điều kiện (Atomic Conditional Update)

Khi client gọi `POST /api/v1/auth/refresh`:
1. Client gửi `{ refreshToken: "..." }` trong Request Body.
2. Backend băm SHA-256 refresh token, tìm bản ghi `Session` khớp hash.
3. Kiểm tra điều kiện hiệu lực cơ bản:
   - `Session` tồn tại.
   - `revokedAt IS NULL`.
   - `expiresAt > NOW()`.
   - Tài khoản `User` liên kết vẫn `isActive == true`.
4. **Thực hiện Atomic Conditional Update qua Prisma `updateMany`**:
   ```ts
   const newRefreshToken = crypto.randomBytes(32).toString('hex');
   const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
   const refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 ngày

   const result = await prisma.session.updateMany({
     where: {
       id: session.id,
       refreshTokenHash: currentRefreshTokenHash,
       tokenVersion: session.tokenVersion,
       revokedAt: null,
       expiresAt: { gt: new Date() },
     },
     data: {
       refreshTokenHash: newRefreshTokenHash,
       tokenVersion: { increment: 1 },
       expiresAt: new Date(Date.now() + refreshTokenTtlMs),
     },
   });

   if (result.count === 0) {
     // Xung đột đồng thời hoặc session đã bị thu hồi/cập nhật bởi request khác
     throw new UnauthorizedException('Phiên làm việc không hợp lệ hoặc đã được làm mới');
   }
   ```
5. **Cấp Cặp Token mới**:
   - Access Token mới mang `ver: session.tokenVersion + 1`.
   - Refresh Token mới trả về cho client.
6. **Vô hiệu hóa tức thì**:
   - Refresh Token cũ: Hash trong DB đã đổi -> Không thể tái sử dụng.
   - Access Token cũ: `ver` cũ lệch với `session.tokenVersion` mới -> `AuthGuard` từ chối `401 Unauthorized` ngay lập tức.
7. **Phòng tránh Race Condition trên Frontend (Single-Flight Refresh)**:
   - Client triển khai hàng đợi mutex/promise: khi token hết hạn, chỉ có đúng 1 request refresh được gửi lên; các request khác đợi token mới để retry.

---

## 3. OTP-Only Authorization & Updated Rules

### 3.1. OTP Hashing (Approved as is)
- Sinh OTP 6 số bằng hàm ngẫu nhiên an toàn (`crypto.randomInt(100000, 999999)`).
- Hash OTP bằng thuật toán **SHA-256**.
- Chỉ lưu `otpHash` vào Database, tuyệt đối không trả OTP trong Response API.
- OTP chỉ dùng 1 lần thành công, gắn chặt với đúng `identifier` và `purpose`.
- **Ghi nhận rủi ro bảo mật (Accepted Risk)**: SHA-256 đối với mã 6 số có không gian mẫu nhỏ ($10^6$) và không dùng salt/HMAC. Giới hạn này được chấp thuận cho quy mô phát triển hiện tại của đồ án sinh viên.

### 3.2. Quy tắc Cấp lại OTP (Resend Based Only on `expiresAt`)
- **Chỉ cấp OTP mới khi OTP gần nhất của cùng identifier & purpose đã hết hạn**:
  - `now < expiresAt`: **Không cấp OTP mới**. Backend từ chối với `400 Bad Request`.
  - `now >= expiresAt`: **Cho phép cấp OTP mới**.
- Quy tắc này độc lập với việc OTP đã được xác minh, consumed hay nhập sai.
- Không giới hạn tổng số lần yêu cầu OTP mới theo các chu kỳ hết hạn. Không dùng Resend Count hay Resend Limit.

### 3.3. Cho phép Nhập sai OTP Không giới hạn (Unlimited Invalid OTP Attempts)
- **Quyết định mới**: Người dùng được phép nhập sai OTP nhiều lần; nhập sai **không** làm OTP bị khóa.
- Không đếm số lần nhập sai, không có cột `attempts`/`maxAttempts` trong DB.
- Khi người dùng nhập sai: Trả về `400 Bad Request` (*"Mã xác thực không chính xác"*), OTP vẫn giữ nguyên hiệu lực cho tới khi hết hạn `expiresAt`.
- Khi OTP hết hạn (`now >= expiresAt`): Từ chối xác thực (*"Mã xác thực đã hết hạn"*), yêu cầu người dùng xin mã mới.
- Khi OTP đúng: Thực hiện nghiệp vụ trong Transaction, đánh dấu `consumedAt = NOW()`, không cho phép tái sử dụng.

### 3.4. Rủi ro Xử lý Đồng thời OTP (OTP Concurrency — Deferred)
- **Trạng thái**: `ACCEPTED FOR CURRENT DEVELOPMENT STAGE — NOT FULLY MITIGATED`.
- Hệ thống chưa triển khai Distributed Lock (Redis) hay khóa bi quan phức tạp. Dựa vào Prisma Interactive Transaction và kiểm tra `consumedAt IS NULL`. Rủi ro 2 request đồng thời cùng verify 1 OTP thành công trong cùng mili-giây được chấp nhận trong giai đoạn hiện tại.

---

## 4. Detailed API Contracts (9 Endpoints Chuẩn hóa)

### 4.1. Web Login: `POST /api/v1/auth/web/login`
- **Mục tiêu**: Đăng nhập dành riêng cho Quản trị viên trên Web.
- **Actors cho phép**: `SYSTEM_ADMIN`, `SCHOOL_ADMIN`.
- **Request Body**:
  ```json
  {
    "identifier": "admin@r2s.com",
    "password": "Pass@123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "random-64-hex-string",
    "user": {
      "id": "uuid-v4",
      "fullName": "System Administrator",
      "email": "admin@r2s.com",
      "phone": null,
      "avatarUrl": null,
      "role": "SYSTEM_ADMIN"
    }
  }
  ```

---

### 4.2. Mobile Login: `POST /api/v1/auth/mobile/login`
- **Mục tiêu**: Đăng nhập dành riêng cho người dùng di động.
- **Actors cho phép**: `DRIVER`, `BUS_ATTENDANT`, `PARENT`.
- **Request Body**:
  ```json
  {
    "identifier": "0912345678",
    "password": "UserPass@123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "random-64-hex-string",
    "user": {
      "id": "uuid-v4",
      "fullName": "Nguyễn Văn A",
      "email": null,
      "phone": "0912345678",
      "avatarUrl": null,
      "role": "PARENT"
    }
  }
  ```

---

### 4.3. Parent Registration — Request OTP: `POST /api/v1/auth/register/request-otp`
- **Mục tiêu**: Yêu cầu mã OTP để bắt đầu luồng đăng ký Phụ huynh.
- **Request Body**:
  ```json
  {
    "identifier": "parent@example.com"
  }
  ```
- **Logic xử lý**:
  1. Kiểm tra bảng `User`: Nếu identifier đã tồn tại -> `409 Conflict` (*"Email hoặc số điện thoại đã được đăng ký"*).
  2. Kiểm tra `OtpChallenge`: Nếu đang có OTP cùng identifier & purpose mà `now < expiresAt` -> `400 Bad Request` kèm thông báo còn hạn.
  3. Tạo `OtpChallenge` mới (`userId = null`, `expiresAt = NOW() + 300s`).
  4. Gửi OTP qua Console (Email/SMS) hoặc SMTP (Email).
- **Response `200 OK`**:
  ```json
  {
    "message": "Mã xác nhận đã được gửi thành công",
    "expiresInSeconds": 300
  }
  ```

---

### 4.4. Parent Registration — Verify & Create User: `POST /api/v1/auth/register/verify`
- **Mục tiêu**: Xác thực OTP, tạo tài khoản Phụ huynh và tự động đăng nhập (Auto Login).
- **Request Body**:
  ```json
  {
    "identifier": "parent@example.com",
    "otp": "123456",
    "fullName": "Trần Thị B",
    "password": "SecurePassword@123",
    "confirmPassword": "SecurePassword@123"
  }
  ```
- **Logic xử lý (Transaction)**:
  1. Tìm `OtpChallenge` (`identifier`, `purpose = PARENT_REGISTRATION`, `consumedAt IS NULL`).
  2. Nếu không tìm thấy hoặc `now >= expiresAt` -> `400 Bad Request` (*"Mã xác nhận không tồn tại hoặc đã hết hạn"*).
  3. So khớp `otpHash`:
     - Nếu sai: Trả về `400 Bad Request` (*"Mã xác thực không chính xác"*). **Không đếm số lần sai, không khóa OTP**. Cho phép nhập lại.
     - Nếu đúng: Đánh dấu `consumedAt = NOW()`.
  4. Kiểm tra User uniqueness lần hai.
  5. Băm mật khẩu, tạo User (`role = PARENT`, `isVerified = true`).
  6. Tạo Session (`tokenVersion = 1`), sinh cặp Access/Refresh Token.
  7. Trả Token Pair và thông tin User (Auto Login).
- **Response `201 Created`**:
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "random-64-hex-string",
    "user": {
      "id": "uuid-v4",
      "fullName": "Trần Thị B",
      "email": "parent@example.com",
      "phone": null,
      "avatarUrl": null,
      "role": "PARENT"
    }
  }
  ```

---

### 4.5. Forgot Password — Request OTP (Uniform Neutral Response): `POST /api/v1/auth/forgot-password/request-otp`
- **Mục tiêu**: Yêu cầu mã OTP quên mật khẩu với phản hồi đồng nhất, chống User Enumeration.
- **Request Body**:
  ```json
  {
    "identifier": "user@example.com"
  }
  ```
- **Logic xử lý**:
  1. Chuẩn hóa identifier.
  2. Tìm User trong DB.
  3. Nếu tìm thấy User VÀ không có OTP `PASSWORD_RESET` nào đang còn hiệu lực (`now >= expiresAt`):
     - Tạo `OtpChallenge` mới (`userId = user.id`, `purpose = PASSWORD_RESET`, `expiresAt = NOW() + 300s`).
     - Gửi mã OTP.
  4. **Phản hồi đồng nhất (Uniform Response)**: Luôn trả về cùng một JSON thành công, không tiết lộ user có tồn tại hay không, không trả `remainingSeconds` khác nhau.
- **Response `200 OK`**:
  ```json
  {
    "message": "Nếu tài khoản tồn tại và đủ điều kiện, mã xác minh sẽ được gửi."
  }
  ```

---

### 4.6. Reset Password (OTP Direct): `POST /api/v1/auth/reset-password`
- **Mục tiêu**: Đặt lại mật khẩu trực tiếp bằng OTP mà không cần Reset Token trung gian.
- **Request Body**:
  ```json
  {
    "identifier": "user@example.com",
    "otp": "654321",
    "newPassword": "NewSecurePassword@123",
    "confirmPassword": "NewSecurePassword@123"
  }
  ```
- **Logic xử lý (Transaction)**:
  1. Tìm User trong DB. Nếu không có -> `400 Bad Request`.
  2. Tìm `OtpChallenge` (`identifier`, `purpose = PASSWORD_RESET`, `consumedAt IS NULL`).
  3. Nếu không có hoặc `now >= expiresAt` -> `400 Bad Request` (*"Mã xác nhận đã hết hạn"*).
  4. So khớp `otpHash`:
     - Nếu sai: Trả về `400 Bad Request` (*"Mã xác thực không chính xác"*). Không khóa OTP, cho phép nhập lại.
     - Nếu đúng: Đánh dấu `consumedAt = NOW()`.
  5. Cập nhật `User.passwordHash = bcrypt.hash(newPassword)`.
  6. **Thu hồi toàn bộ phiên (Immediate Revocation)**:
     `UPDATE sessions SET revokedAt = NOW() WHERE userId = user.id AND revokedAt IS NULL`.
- **Response `200 OK`**:
  ```json
  {
    "message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại trên tất cả thiết bị."
  }
  ```

---

### 4.7. Refresh Token Pair (Atomic Conditional Update): `POST /api/v1/auth/refresh`
- **Mục tiêu**: Cấp cặp Token mới và xoay vòng toàn bộ bằng Atomic Conditional Update.
- **Request Body**:
  ```json
  {
    "refreshToken": "current-64-hex-refresh-token"
  }
  ```
- **Logic xử lý**:
  1. Băm `refreshToken`, tìm Session.
  2. Thực hiện `prisma.session.updateMany` có điều kiện nguyên tử (kiểm tra `id`, `refreshTokenHash`, `tokenVersion`, `revokedAt = null`, `expiresAt > now`).
  3. Nếu `result.count === 0` -> Trả về `401 Unauthorized`.
  4. Nếu `result.count === 1` -> Cấp Access Token mới (mang `ver: tokenVersion + 1`) và Refresh Token mới.
- **Response `200 OK`**:
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "new-64-hex-refresh-token"
  }
  ```

---

### 4.8. Current User: `GET /api/v1/auth/me`
- **Headers**: `Authorization: Bearer <accessToken>`.
- **Logic**: Kiểm tra chữ ký, hạn dùng, trạng thái session (`revokedAt IS NULL`, `expiresAt > NOW()`), và `session.tokenVersion === jwt.ver`.
- **Response `200 OK`**:
  ```json
  {
    "id": "uuid-v4",
    "fullName": "Trần Thị B",
    "email": "parent@example.com",
    "phone": null,
    "avatarUrl": null,
    "role": "PARENT"
  }
  ```

---

### 4.9. Logout: `POST /api/v1/auth/logout`
- **Headers**: `Authorization: Bearer <accessToken>`.
- **Logic**: `UPDATE sessions SET revokedAt = NOW() WHERE id = sid`.
- **Response `200 OK`**:
  ```json
  {
    "message": "Đăng xuất thành công"
  }
  ```

---

## 5. UI/UX Wireframes Revision (Minimal UI Copy)

Áp dụng bảng màu RoadToSchool: Primary `#FFCB56`, Background `#FFFDF6`, Foreground `#1E293B`, Surface `#FFFFFF`.

### 5.1. Web Wireframes
- **Screen W1 (Đăng nhập Quản trị)**: Form đăng nhập tối giản (Email/SĐT, Mật khẩu, Nút Primary `#FFCB56`).
- **Screen W2 (Quên mật khẩu & Đặt lại mật khẩu — OTP Direct)**:
  - Bước 1: Nhập Email/SĐT -> Nút "Gửi mã" (Nhận phản hồi đồng nhất).
  - Bước 2: Nhập Mã xác nhận (Đồng hồ đếm ngược 05:00 dựa trên client timer), Mật khẩu mới, Xác nhận mật khẩu -> Nút "Hoàn tất".
- **Screen W3 (Web Role Splash Screens)**: 1.2s sau khi submit login form thành công (`SYSTEM_ADMIN`, `SCHOOL_ADMIN`).

### 5.2. Mobile Wireframes (Minimal UI Copy)
*Trạng thái: M1–M8 APPROVED BY PRODUCT OWNER WITH MINOR ADJUSTMENTS*

Áp dụng bảng màu chính thức RoadToSchool: Primary `#FFCB56`, Background `#FFFDF6`, Foreground `#1E293B`, Surface `#FFFFFF`.

#### Screen M1: Application Splash
- **Mục tiêu**: Màn hình khởi động ứng dụng (Cold start), kiểm tra session trong SecureStore. Không thêm delay cố định thừa thãi.
- **Bố cục**: Căn giữa toàn màn hình, nền `#FFFDF6`, icon xe buýt RoadToSchool, tên ứng dụng và spinner nhẹ (chỉ hiện khi đang khôi phục phiên).
- **ASCII Wireframe**:
```text
+---------------------------+
|                           |
|                           |
|            (🚌)           |
|        RoadToSchool       |
|                           |
|          [ • • • ]        |
|                           |
+---------------------------+
```
- **Navigation Flow**:
  - Nếu khôi phục session thành công -> Vào khu vực Role tương ứng (không hiện Role Splash).
  - Nếu chưa đăng nhập hoặc session hết hạn -> Chuyển sang Screen M2 (Mobile Login).

---

#### Screen M2: Mobile Login
- **Mục tiêu**: Đăng nhập dành riêng cho người dùng di động (`DRIVER`, `BUS_ATTENDANT`, `PARENT`). Chặn `SYSTEM_ADMIN` và `SCHOOL_ADMIN`.
- **ASCII Wireframe**:
```text
+---------------------------+
| 9:41                   📶 |
+---------------------------+
|            (🚌)           |
|        RoadToSchool       |
|                           |
|   Email hoặc Số điện thoại|
|   [ 0912345678          ] |
|                           |
|   Mật khẩu                |
|   [ ••••••••          👁️ ]|
|                           |
|            Quên mật khẩu? |
|                           |
|   +-------------------+   |
|   |     ĐĂNG NHẬP     |   |  (Nút Primary #FFCB56)
|   +-------------------+   |
|                           |
|   [ Đăng ký Phụ huynh ]   |  (Nút phụ dạng link)
+---------------------------+
```
- **Xử lý lỗi**: Banner đỏ thông báo tiếng Việt: *"Thông tin đăng nhập không chính xác"* hoặc *"Tài khoản không có quyền truy cập vào ứng dụng di động"*.
- **Bàn phím**: Tự động cuộn tránh che khuất nút Đăng nhập (`KeyboardAvoidingView`).

---

#### Screen M3: Parent Registration (Đăng ký Phụ huynh)
- **Mục tiêu**: Thu thập thông tin đăng ký của Phụ huynh mà **chưa tạo tài khoản trong DB**.
- **ASCII Wireframe**:
```text
+---------------------------+
| < Đăng ký Phụ huynh       |
+---------------------------+
|   Họ và tên               |
|   [ Nguyễn Văn A        ] |
|                           |
|   Hình thức nhận mã:      |
|   (o) SĐT     ( ) Email   |
|                           |
|   Số điện thoại / Email   |
|   [ 0987654321          ] |
|                           |
|   Mật khẩu (>= 6 ký tự)   |
|   [ ••••••••          👁️ ]|
|                           |
|   Xác nhận mật khẩu       |
|   [ ••••••••          👁️ ]|
|                           |
|   +-------------------+   |
|   |      TIẾP TỤC     |   |  (Gửi OTP, lưu form vào memory)
|   +-------------------+   |
|   Đã có tài khoản? Đăng nhập
+---------------------------+
```
- **Hành động**: Gọi `POST /api/v1/auth/register/request-otp` với `identifier`. Form state được lưu tạm trong memory flow, chuyển tiếp sang Screen M4.

---

#### Screen M4: Registration OTP Verification (Xác thực OTP Đăng ký)
- **Mục tiêu**: Nhập mã OTP 6 số để kích hoạt tài khoản và tự động đăng nhập (Auto Login).
- **ASCII Wireframe**:
```text
+---------------------------+
| < Xác thực mã OTP         |
+---------------------------+
|   Mã xác thực 6 số gửi đến|
|   0987654321              |
|                           |
|   [ 1 ] [ 2 ] [ 3 ]       |
|   [ 4 ] [ 5 ] [ 6 ]       |
|                           |
|   Hiệu lực: 04:59         |
|   Gửi lại mã              |  (Chỉ bấm được khi về 00:00)
|                           |
|   +-------------------+   |
|   | XÁC NHẬN & ĐĂNG KÝ|   |  (Primary #FFCB56)
|   +-------------------+   |
+---------------------------+
```
- **Quy tắc nhập sai**: Cho phép nhập sai không giới hạn, không khóa mã. Sai OTP báo đỏ *"Mã xác thực không chính xác"*.
- **Khi đúng**: Backend tạo User `PARENT`, trả Token Pair, lưu SecureStore, tự động vào ứng dụng (không hiện Role Splash).

---

#### Screen M5: Mobile Role Splashes (1.2 giây sau Manual Login)
- **Mục tiêu**: Định vị vai trò người dùng trong 1.2s sau khi **đăng nhập thủ công thành công**.
- **ASCII Wireframe**:
```text
   [ DRIVER Splash ]            [ ATTENDANT Splash ]           [ PARENT Splash ]
+---------------------+        +---------------------+       +---------------------+
|                     |        |                     |       |                     |
|        (🚗)         |        |        (📋)         |       |        (👨‍👩‍👧)        |
|       Tài xế        |        | Nhân viên phụ trách |       |  Phụ huynh học sinh |
|                     |        |                     |       |                     |
|     [ • • • ]       |        |     [ • • • ]       |       |     [ • • • ]       |
+---------------------+        +---------------------+       +---------------------+
```
- **Lưu ý**: Không hiển thị khi khởi động app, khôi phục session, refresh token, hoặc sau đăng ký phụ huynh.

---

#### Screen M6: Mobile Forgot Password (Quên mật khẩu)
- **Mục tiêu**: Yêu cầu mã OTP đặt lại mật khẩu với phản hồi trung tính chuẩn Anti-Enumeration.
- **ASCII Wireframe**:
```text
+---------------------------+
| < Quên mật khẩu           |
+---------------------------+
|   Nhập email hoặc số điện |
|   thoại để nhận mã OTP.   |
|                           |
|   Email hoặc Số điện thoại|
|   [ user@example.com    ] |
|                           |
|   +-------------------+   |
|   |      GỬI MÃ       |   |  (Primary #FFCB56)
|   +-------------------+   |
|                           |
|   < Quay lại đăng nhập    |
+---------------------------+
```
- **Phản hồi**: Luôn hiển thị thông báo trung tính: *"Nếu tài khoản tồn tại và đủ điều kiện, mã xác minh sẽ được gửi."* Chuyển sang Screen M7.

---

#### Screen M7: Mobile Reset Password (Đặt lại mật khẩu bằng OTP)
- **Mục tiêu**: Đặt lại mật khẩu trực tiếp qua OTP mà không cần Reset Token trung gian.
- **ASCII Wireframe**:
```text
+---------------------------+
| < Đặt lại mật khẩu        |
+---------------------------+
|   Mã gửi đến: user@...    |
|                           |
|   Mã xác thực OTP (6 số)  |
|   [ • • • • • •         ] |
|   Hiệu lực: 04:59         |
|                           |
|   Mật khẩu mới (>= 6 ký tự)
|   [ ••••••••          👁️ ]|
|                           |
|   Xác nhận mật khẩu       |
|   [ ••••••••          👁️ ]|
|                           |
|   +-------------------+   |
|   |      HOÀN TẤT     |   |  (Primary #FFCB56)
|   +-------------------+   |
|                           |
|   < Quay lại đăng nhập    |
+---------------------------+
```
- **Xử lý thành công**: Hiển thị thông báo xanh lá *"Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới"*, thu hồi tất cả phiên cũ, chuyển hướng về Screen M2 (không Auto Login).

---

#### Screen M8: Session Restoration & Expired State (Trạng thái Phiên)
- **Mục tiêu**: Phản hồi mượt mà khi phiên làm việc bị thu hồi hoặc hết hạn.
- **Bố cục**:
  - Khi token hết hạn và refresh thất bại: Hiển thị Dialog / Alert tiếng Việt: *"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."* và chuyển hướng về Screen M2.
  - Khi mất kết nối máy chủ: Hiển thị Toast / Banner màu cam trên cùng: *"Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền."* mà không xóa Token khỏi SecureStore.


---

## 6. Initial System Admin Bootstrap Design

- **Vị trí file script**: `api/scripts/seed-admin.ts` (Lệnh `npm run db:seed:admin`).
- **Cấu hình**: Bắt buộc đọc từ `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD`. Nếu thiếu một trong hai biến -> báo lỗi và dừng thực thi, không hardcode mật khẩu fallback.
- **Tính Idempotent**: Kiểm tra trước qua `prisma.user.findUnique`, nếu đã tồn tại thì bỏ qua, không ghi đè mật khẩu hay role.

---

## 7. Proposed Environment Configuration

```env
# ==========================================
# AUTHENTICATION TOKENS (TTL in seconds)
# ==========================================
AUTH_ACCESS_TOKEN_TTL_SECONDS=900
AUTH_REFRESH_TOKEN_TTL_SECONDS=604800

# ==========================================
# OTP CONFIGURATION
# ==========================================
AUTH_OTP_LENGTH=6
AUTH_OTP_TTL_SECONDS=300

# ==========================================
# NOTIFICATION DELIVERY CHANNELS
# ==========================================
AUTH_EMAIL_MODE=console
AUTH_SMS_MODE=console

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# ==========================================
# SYSTEM ADMIN BOOTSTRAP
# ==========================================
BOOTSTRAP_ADMIN_EMAIL=admin@r2s.com
BOOTSTRAP_ADMIN_PASSWORD=Pass@123
```
*(Đã loại bỏ hoàn toàn `AUTH_OTP_MAX_ATTEMPTS` theo quyết định cho phép nhập sai không giới hạn).*
