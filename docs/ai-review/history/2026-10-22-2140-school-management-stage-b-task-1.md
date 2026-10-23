# RoadToSchool — AI Review Report
# Phân hệ: School Management — Stage B: Implementation
# Task 1: School Database Schema & Migration

> **Thời gian báo cáo**: 22/10/2026 21:40  
> **Người thực hiện**: Senior Backend Engineer & Database Architect  
> **Trạng thái**: Hoàn thành Task 1 — Chờ Product Owner xét duyệt  
> **Diff Task-scoped**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)

---

## A. Task Information
- **Task ID**: `TASK 1`
- **Tên Task**: `SCHOOL DATABASE SCHEMA & MIGRATION`
- **Phạm vi (Scope)**:
  - Khởi tạo bảng `schools` và mô hình Prisma `School`.
  - Cập nhật trường `school_id` (`User.schoolId`) vào bảng `users` hiện tại với ràng buộc khóa ngoại `onDelete: Restrict`.
  - Lưu trữ lịch học theo tuần (`weekly_schedule`) bằng kiểu dữ liệu PostgreSQL `JSONB`.
  - Lưu trữ thời hạn hợp đồng bằng kiểu dữ liệu PostgreSQL `@db.Date`.
  - Thiết lập các chỉ mục tối giản: `schools(name)`, `schools(is_active)`, `users(school_id)`.
  - Khởi tạo và áp dụng Prisma Migration an toàn: không reset DB, không mất dữ liệu, không ảnh hưởng các bảng Authentication Phase 1.
  - Đồng bộ tài liệu thiết kế kiến trúc Stage A theo các quyết định cuối cùng của Product Owner.
- **Trạng thái**: `COMPLETED (100% QUALITY GATES PASSED)`

---

## B. Approved Decisions Adherence
Hệ thống tuân thủ 100% các quyết định chính thức đã được Product Owner phê duyệt:
1. **VietMap v4 (Decision A)**: Quy chuẩn sử dụng VietMap API v4 cho Autocomplete, Place Details và Reverse Geocoding. Phân biệt rõ ràng Services API Key (Backend Proxy) và Tilemap Key (Web MapLibre).
2. **Cloudinary Simple Upload Flow (Decision B)**: Áp dụng luồng Multipart School Creation đơn giản.
3. **No Mandatory Orphan Cleanup (Decision B)**: Loại bỏ các cơ chế cleanup phức tạp (Worker/Retry Queue/Rollback Destroy). Chấp nhận khả năng ảnh mồ côi nếu DB insert thất bại nhằm giữ code đơn giản.
4. **Soft Deactivation Only (Decision C)**: Không có API Hard Delete cho trường. Quản lý trạng thái duy nhất qua `School.isActive`. Ràng buộc DB sử dụng `onDelete: Restrict`.
5. **Active Users for Inactive Schools (Decision C)**: Người dùng thuộc trường inactive vẫn giữ nguyên trạng thái tài khoản `User.isActive`, vẫn đăng nhập được bình thường, nhưng bị chặn phát sinh nghiệp vụ mới.
6. **Simple Random Temporary Password (Decision D)**: Sinh chuỗi ngẫu nhiên bằng `node:crypto` (`randomBytes`), băm bằng `bcryptjs`, in console trong Development. Không có ô nhập mật khẩu trên UI, không trả plaintext trong API response.
7. **Weekly Schedule Terminology (Decision E)**: Sử dụng chuẩn "Giờ bắt đầu học" (`start`) và "Giờ kết thúc học" (`end`). Người dùng tự chọn các ngày học trong tuần; không tự ý gán mặc định Thứ 2–Thứ 7. Lưu bằng PostgreSQL JSONB.
8. **Block Admin Creation for Inactive School (Decision F1 - Approved)**: Nghiệp vụ chặn tạo `SCHOOL_ADMIN` mới khi `School.isActive = false`.
9. **School Reactivation (Decision F2 - Approved)**: Cho phép System Admin chuyển trường từ INACTIVE sang ACTIVE nếu hợp đồng còn hiệu lực.
10. **No VietMap Mock Mode (Decision F3 - Approved)**: Không tạo chế độ giả lập tọa độ cố định. Nếu thiếu API Key, thông báo rõ dịch vụ chưa khả dụng và hỗ trợ nhập tọa độ hợp lệ thủ công.

---

## C. Prisma Schema Changes
### 1. Model `School` (`schools`)
```prisma
/// Bảng quản lý thông tin trường học đối tác
model School {
  id                String    @id @default(uuid())
  name              String
  addressText       String    @map("address_text")
  latitude          Float
  longitude         Float
  imageUrl          String?   @map("image_url")
  imagePublicId     String?   @map("image_public_id")
  contractStartDate DateTime  @map("contract_start_date") @db.Date
  contractEndDate   DateTime  @map("contract_end_date") @db.Date
  weeklySchedule    Json      @map("weekly_schedule")
  isActive          Boolean   @default(true) @map("is_active")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  // Quan hệ: 1 Trường có nhiều Người dùng (Nhân viên / Quản trị viên)
  users             User[]

  @@index([name])
  @@index([isActive])
  @@map("schools")
}
```

### 2. Cập nhật Model `User` (`users`)
```prisma
  // School association
  schoolId      String?        @map("school_id")
  school        School?        @relation(fields: [schoolId], references: [id], onDelete: Restrict)

  @@index([schoolId])
```

---

## D. Safe Migration Analysis
- **Migration Folder**: `api/prisma/migrations/20261022143540_add_schools_table/`
- **Migration SQL File**: `migration.sql`
- **Chi tiết các câu lệnh SQL đã thực thi**:
  1. `ALTER TABLE "users" ADD COLUMN "school_id" TEXT;` (Thêm cột nullable, không phá vỡ dữ liệu cũ).
  2. `CREATE TABLE "schools" (...);` (Tạo bảng mới duy nhất).
  3. `CREATE INDEX "schools_name_idx" ON "schools"("name");`
  4. `CREATE INDEX "schools_is_active_idx" ON "schools"("is_active");`
  5. `CREATE INDEX "users_school_id_idx" ON "users"("school_id");`
  6. `ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`
- **Đánh giá an toàn (Safety Evaluation)**:
  - KHÔNG có lệnh `DROP TABLE`.
  - KHÔNG có lệnh `DROP COLUMN`.
  - KHÔNG có lệnh `TRUNCATE` hoặc `DELETE`.
  - Cơ sở dữ liệu KHÔNG bị reset.
  - Áp dụng migration bằng `npx prisma migrate dev` diễn ra tức thì, an toàn tuyệt đối.

---

## E. Existing Data Integrity Verification
Toàn bộ dữ liệu nghiệp vụ của Phase 1: Authentication & Account Access được bảo toàn nguyên vẹn 100%:
- **Bảng `users`**:
  - Số lượng bản ghi trước và sau migration: `4/4` bản ghi (1 `SYSTEM_ADMIN` admin@r2s.com, 3 `PARENT`).
  - Tất cả 4 tài khoản có `school_id = NULL`.
  - Toàn bộ `password_hash`, `email`, `phone`, `role`, `is_active`, `is_verified` giữ nguyên trạng thái.
- **Bảng `sessions`**:
  - Số lượng bản ghi: `13/13` phiên hoạt động được giữ nguyên vẹn.
- **Bảng `otp_challenges`**:
  - Số lượng bản ghi: `8/8` thử thách OTP được giữ nguyên vẹn.
- **Bảng `system_health`**: Giữ nguyên.

---

## F. Quality Gates & Verification Matrix

| Hạng mục kiểm thử | Lệnh / Thao tác | Kết quả | Trạng thái |
|---|---|---|:---:|
| **Prisma Validate** | `npx prisma validate` | The schema at prisma\schema.prisma is valid 🚀 | **PASS** |
| **Prisma Migrate Status** | `npx prisma migrate status` | 3 migrations found. Database schema is up to date! | **PASS** |
| **Prisma Client Generate** | `npx prisma generate` | Generated Prisma Client (v6.19.3) in 73ms | **PASS** |
| **Backend TypeScript Build** | `npm run build` (NestJS) | Found 0 errors, build completed | **PASS** |
| **Regression Unit Tests** | `npm test` (Vitest) | 2 test files passed, 5/5 tests passed (1.14s) | **PASS** |
| **Database Schema Inspection** | Query `information_schema.columns` | `schools` có đủ 13 cột; `weekly_schedule` là `jsonb`, 2 ngày hợp đồng là `date` | **PASS** |
| **Index Verification** | Query `pg_indexes` | Đủ 3 indexes: `schools_name_idx`, `schools_is_active_idx`, `users_school_id_idx` | **PASS** |
| **Foreign Key Constraint** | Query `referential_constraints` | `users_school_id_fkey` trỏ tới `schools(id)` với `delete_rule = RESTRICT` | **PASS** |
| **JSONB Insert & Read Test** | Script Prisma test insert School | `weeklySchedule` dạng JSON object được lưu và đọc chính xác | **PASS** |
| **Date Field Test** | Script Prisma test insert School | `contractStartDate`, `contractEndDate` serialize dạng Date chuẩn | **PASS** |
| **onDelete: Restrict Test** | Thử xóa School khi có User liên kết | Postgres Error `23001` (violates RESTRICT setting) được kích hoạt và chặn xóa thành công | **PASS** |
| **Backend Health Endpoint** | `GET /api/v1/health/db` | `{"status":"ok","database":"connected"}` (200 OK) | **PASS** |

---

## G. Files Changed in Task 1
### Added
- `api/prisma/migrations/20261022143540_add_schools_table/migration.sql`

### Modified
- `api/prisma/schema.prisma` (Bổ sung model `School`, thêm `User.schoolId`, quan hệ Restrict và index)
- `docs/architecture/school-management-design.md` (Cập nhật tiêu đề, trạng thái duyệt và chuẩn hóa các quyết định A–F)
- `docs/ai-review/LATEST.diff` (Chứa diff scoped của Task 1)
- `docs/ai-review/LATEST.md` (Báo cáo nghiệm thu Task 1)

### Deleted / Cleaned Up
- `api/verify_db_task1.mjs` (Script kiểm thử tạm thời đã được dọn sạch hoàn toàn sau khi chạy kiểm thử)

---

## H. Issues & Limitations
- **Giới hạn đã chấp thuận (Accepted Limitations)**:
  - Trường `image_url` và `image_public_id` là nullable. Nếu quá trình tạo trường học gặp sự cố sau bước tải ảnh lên Cloudinary, ảnh mồ côi có thể tồn tại trên Cloudinary (không có worker dọn dẹp theo Quyết định B của PO).
  - Khóa ngoại `onDelete: Restrict` bảo vệ an toàn toàn vẹn dữ liệu, chặn việc xóa trường học khi có người dùng gắn với trường.
  - Logic xác thực nghiệp vụ JSONB (giờ `start < end`, thứ trong tuần hợp lệ) và kiểm tra logic ngày hợp đồng (`contractEndDate >= contractStartDate`) sẽ được cài đặt chặt chẽ ở tầng Backend DTO Pipes trong Task 2.

---

## I. Reviewer Focus Areas
Kính đề nghị Product Owner kiểm tra kỹ các điểm mấu chốt sau:
1. **Tính tương thích ngược**: 100% logic và dữ liệu Authentication Phase 1 không bị ảnh hưởng.
2. **Định dạng dữ liệu**: `weekly_schedule` trong PostgreSQL là `JSONB`, thời hạn hợp đồng là kiểu `DATE`.
3. **An toàn Migration**: Migration chỉ bao gồm các thay đổi thêm mới (additive), không phá hủy dữ liệu.
4. **Ràng buộc Restrict**: Ràng buộc khóa ngoại `onDelete: Restrict` giữa `users` và `schools` đã được kiểm chứng bằng thực nghiệm.

---

## J. Next Step Proposal
Đề xuất duy nhất một bước tiếp theo:

**TASK 2 — BACKEND SCHOOL MANAGEMENT APIs**
- Xây dựng `SchoolsModule`, Controller và Service.
- Triển khai các API:
  - `GET /api/v1/schools` (Danh sách trường, tìm kiếm, phân trang, lọc `status`).
  - `POST /api/v1/schools` (Tạo trường học, validate DTO lịch học JSONB và ngày hợp đồng).
  - `GET /api/v1/schools/:id` (Chi tiết trường học).
  - `PATCH /api/v1/schools/:id/status` (Bật/tắt trạng thái hoạt động `isActive`).
- Bảo vệ API bằng `AuthGuard` và kiểm tra quyền `SYSTEM_ADMIN`.
- Cập nhật đầy đủ Swagger decorators và DTOs tại `http://localhost:3000/api/docs`.

*(Tuyệt đối không tự ý thực hiện Task 2 cho đến khi có sự phê duyệt chính thức từ Product Owner).*

---

## K. Approval Status
**`WAITING FOR PRODUCT OWNER APPROVAL`**
