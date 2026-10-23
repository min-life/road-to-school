# RoadToSchool — AI Review Report: Phase 1 — Task C1 Implementation

## A. Task Information
- **Task**: TASK C1 — Database Schema & Prisma Migration
- **Phase**: Phase 1 — Authentication & Account Access (Stage C — Implementation)
- **Scope**: Backend API (`api/prisma/`, PostgreSQL database `roadtoschool`)
- **Status**: COMPLETED — WAITING FOR REVIEW (Dừng lại sau Task C1 theo đúng quy định, tuyệt đối chưa chuyển sang Task C2/C3)

---

## B. Approved Requirements
1. **Phạm vi triển khai**:
   - Khởi tạo 3 bảng Authentication chính thức: `User` (`users`), `Session` (`sessions`), `OtpChallenge` (`otp_challenges`).
   - Khởi tạo 3 Enums: `Role` (5 roles: `SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `DRIVER`, `BUS_ATTENDANT`, `PARENT`), `OtpPurpose` (`PARENT_REGISTRATION`, `PASSWORD_RESET`), `DeliveryChannel` (`EMAIL`, `SMS`).
   - Thiết lập ràng buộc PostgreSQL CHECK constraint: `email IS NOT NULL OR phone IS NOT NULL` trên bảng `users`.
   - Thiết lập `Session.tokenVersion` mặc định là `1` phục vụ xoay vòng toàn bộ Token Pair.
   - Bảng `OtpChallenge` tinh giản: Không có `attempts`, `maxAttempts`, `resendCount`, `maxResends`, `cooldownUntil`, `resetTokenHash`.
   - Thiết lập các Indexes và Foreign Key cascades.
2. **Giới hạn phạm vi**:
   - Tuyệt đối KHÔNG viết `AuthModule`, Service hay Controller trong Task C1.
   - Tuyệt đối KHÔNG tạo script seed hay tạo user trong Task C1.
   - Tuyệt đối KHÔNG sửa code `web/` hay `mobile/`.

---

## C. Implementation Summary
- **Prisma Schema Update**: Đã bổ sung 3 models và 3 enums vào `api/prisma/schema.prisma` khớp 100% tài liệu kiến trúc Stage B Final.
- **Migration SQL Generation & Custom Constraint**:
  - Đã chạy `npx prisma migrate dev --name init_auth_tables --create-only` để sinh file migration.
  - Đã chèn thêm câu lệnh SQL bổ sung CHECK constraint:
    `ALTER TABLE "users" ADD CONSTRAINT "user_has_identifier_check" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);`
- **Migration Execution**: Đã chạy `npx prisma migrate dev` áp dụng thành công migration `20261022091920_init_auth_tables` lên database PostgreSQL local `roadtoschool`.
- **Prisma Client Generation**: Đã chạy `npx prisma generate` sinh Prisma Client v6.19.3 tương thích TypeScript.
- **Testing & Verification**: Đã viết script kiểm thử tự động xác thực:
  - CHECK constraint từ chối chèn User khi cả `email` và `phone` đều là `null` (PostgreSQL error `23514`).
  - Cho phép tạo User chỉ có `email`.
  - Cho phép tạo User chỉ có `phone`.
  - Unique constraint từ chối email trùng lặp (`P2002`).
  - Tạo `Session` với `tokenVersion = 1` liên kết User.
  - Tạo `OtpChallenge` liên kết User hoặc không liên kết User (`userId = null`).
  - Cascade delete xóa User đồng thời dọn dẹp sạch sẽ `Session` và `OtpChallenge`.

---

## D. Files Changed
- **Files Modified**:
  - `api/prisma/schema.prisma` (+93 lines): Thêm 3 Enums (`Role`, `OtpPurpose`, `DeliveryChannel`) và 3 Models (`User`, `Session`, `OtpChallenge`).
- **Files Created**:
  - `api/prisma/migrations/20261022091920_init_auth_tables/migration.sql` (88 lines): Migration SQL tạo types, tables, indexes, foreign keys và check constraint.
  - `docs/ai-review/LATEST.diff`: Lưu git diff chuẩn của Task C1.
- **Files Deleted**: Không có file bị xóa.

---

## E. Database Changes
1. **Types / Enums**:
   - `Role`: `SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `DRIVER`, `BUS_ATTENDANT`, `PARENT`
   - `OtpPurpose`: `PARENT_REGISTRATION`, `PASSWORD_RESET`
   - `DeliveryChannel`: `EMAIL`, `SMS`
2. **Tables**:
   - `users`: `id` (TEXT PK), `email` (TEXT UNIQUE NULL), `phone` (TEXT UNIQUE NULL), `full_name` (TEXT), `password_hash` (TEXT), `role` (`Role`), `avatar_url` (TEXT NULL), `is_verified` (BOOLEAN DEFAULT true), `is_active` (BOOLEAN DEFAULT true), `created_at`, `updated_at`.
   - `sessions`: `id` (TEXT PK), `user_id` (TEXT FK users CASCADE), `refresh_token_hash` (TEXT), `token_version` (INTEGER DEFAULT 1), `device_info` (TEXT NULL), `ip_address` (TEXT NULL), `expires_at` (TIMESTAMP), `revoked_at` (TIMESTAMP NULL), `created_at`, `updated_at`.
   - `otp_challenges`: `id` (TEXT PK), `user_id` (TEXT NULL FK users CASCADE), `identifier` (TEXT), `channel` (`DeliveryChannel`), `purpose` (`OtpPurpose`), `otp_hash` (TEXT), `expires_at` (TIMESTAMP), `consumed_at` (TIMESTAMP NULL), `created_at`, `updated_at`.
3. **Constraints**:
   - `users_pkey`: Khóa chính `id`
   - `users_email_key`: Unique constraint trên `email`
   - `users_phone_key`: Unique constraint trên `phone`
   - `user_has_identifier_check`: CHECK constraint `("email" IS NOT NULL OR "phone" IS NOT NULL)`
   - `sessions_user_id_fkey`: FK `user_id -> users(id)` ON DELETE CASCADE
   - `otp_challenges_user_id_fkey`: FK `user_id -> users(id)` ON DELETE CASCADE
4. **Indexes**:
   - `sessions_user_id_idx` trên `sessions(user_id)`
   - `sessions_expires_at_idx` trên `sessions(expires_at)`
   - `sessions_revoked_at_idx` trên `sessions(revoked_at)`
   - `otp_challenges_identifier_purpose_idx` trên `otp_challenges(identifier, purpose)`
   - `otp_challenges_expires_at_idx` trên `otp_challenges(expires_at)`
5. **Migration Status**:
   - Migration name: `20261022091920_init_auth_tables`
   - Execution status: `APPLIED (Database schema is up to date)`

---

## F. API Changes
- **Endpoints**: Không có thay đổi (chưa implement trong Task C1 theo đúng giới hạn scope).
- **Swagger Status**: Giữ nguyên Swagger hiện tại (`/api/docs`), sẵn sàng bổ sung Auth DTOs trong Task C3.

---

## G. UI Changes
- Không có thay đổi (Task C1 chỉ dành cho Database & Schema).

---

## H. Tests & Verification
| Kiểm thử | Lệnh thực thi | Kết quả | Ghi chú |
|---|---|---|---|
| Prisma Schema Validation | `npx prisma validate` | **PASS** | Schema hoàn toàn hợp lệ |
| Database Migration | `npx prisma migrate dev` | **PASS** | Migration áp dụng thành công 100% |
| Prisma Client Generation | `npx prisma generate` | **PASS** | Client v6.19.3 đã được tạo |
| API Build Verification | `nest build` | **PASS** | TypeScript compile thành công 0 lỗi |
| Database Health Endpoint | `GET /api/v1/health/db` | **PASS** | `{ status: "ok", database: "connected" }` |
| CHECK Constraint Verification | `test-schema.js` (User with null email & phone) | **PASS** | Bị PostgreSQL từ chối với lỗi `23514 user_has_identifier_check` |
| Email-only & Phone-only User | `test-schema.js` | **PASS** | Tạo thành công cả 2 dạng user |
| Unique Constraint Verification | `test-schema.js` (Duplicate email) | **PASS** | Bị từ chối với mã lỗi Prisma `P2002` |
| Session with tokenVersion | `test-schema.js` | **PASS** | Tạo session thành công, `tokenVersion = 1` |
| Cascade Delete Verification | `test-schema.js` | **PASS** | Xóa User tự động dọn sạch Session và OtpChallenge liên quan |

---

## I. Security & Risks
1. **Những rủi ro đã được PO phê duyệt chấp nhận**:
   - OTP Hashing SHA-256 không salt/HMAC: Được chấp nhận cho quy mô phát triển hiện tại.
   - Unlimited Invalid OTP Attempts: Cho phép người dùng nhập sai không giới hạn, không khóa mã.
   - OTP Concurrency Race Condition: Chưa có Distributed Lock, phụ thuộc Prisma Transaction.
2. **Những rủi ro mới phát sinh**: Không có.
3. **Giới hạn hiện tại**: Database mới chỉ có schema cấu trúc, chưa có tài khoản nào được seed (chờ Task C2).

---

## J. Reviewer Focus
AI Reviewer độc lập cần kiểm tra các điểm sau:
- [ ] Bảng `users` có đúng CHECK constraint `email IS NOT NULL OR phone IS NOT NULL` ở tầng PostgreSQL không?
- [ ] Bảng `sessions` có trường `token_version INTEGER DEFAULT 1` và các indexes `user_id`, `expires_at`, `revoked_at` không?
- [ ] Bảng `otp_challenges` đã loại bỏ hoàn toàn `attempts`, `maxAttempts`, `resendCount`, `maxResends`, `cooldownUntil` chưa?
- [ ] Toàn bộ migration có chạy thành công và không can thiệp vào application code ngoài phạm vi Task C1 không?

---

## K. Next Step
- **Task tiếp theo duy nhất**: **TASK C2 — INITIAL SYSTEM ADMIN BOOTSTRAP** (Triển khai script độc lập `api/scripts/seed-admin.ts`, thêm script npm `"db:seed:admin"`, cấu hình credentials an toàn từ `.env`, kiểm thử tính Idempotent).

---

## L. Approval Status
- **TRẠNG THÁI HIỆN TẠI**: `TASK C1 COMPLETED — WAITING FOR PRODUCT OWNER APPROVAL TO PROCEED TO TASK C2`.
- AI Agent đã dừng lại và chờ lệnh tiếp theo.
