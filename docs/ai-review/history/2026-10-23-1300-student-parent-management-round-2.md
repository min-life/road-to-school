# RoadToSchool — AI Review Report
# Phạm vi: Student Management, Bus Attendant (Giáo viên), Driver & Parent-Student Linking
# Giai đoạn: Round 2/3 — Complete Database & Backend Implementation

> **Thời gian báo cáo**: 23/10/2026 13:00  
> **Người thực hiện**: Senior Backend Engineer, Database Architect & Security Engineer  
> **Trạng thái**: Hoàn thành Triển khai Backend & Cơ sở dữ liệu (Round 2 Done — Ready for Round 3 PO Approval)  
> **Bản vá đính kèm**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)  
> **Tài liệu tham chiếu**: [student-parent-management-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/architecture/student-parent-management-plan.md), [BUSINESS_CONTEXT.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/BUSINESS_CONTEXT.md), [WORKING_RULES.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/WORKING_RULES.md)

---

### A. Executive Summary

- Thực hiện hoàn tất toàn bộ phạm vi Round 2 trong **một đợt triển khai duy nhất** theo phê duyệt chính thức của Product Owner.
- Hoàn thành toàn diện 4 miền nghiệp vụ cốt lõi ở tầng Database & Backend REST API:
  1. **Student Management (`/api/v1/schools/:schoolId/students`)**: Tạo học sinh mới (chỉ SCHOOL_ADMIN), sinh mã duy nhất chuẩn STU + 8 ký tự alphanumeric, upload avatar qua Cloudinary (Stream Buffer, 5MB limit, Magic Bytes check), cập nhật trạng thái AVAILABLE/DISABLED, lấy chi tiết học sinh (QR payload là Student Code), truy vấn danh sách học sinh với 2 bộ lọc độc lập (`status` và `hasAddress`) cùng phân trang và tìm kiếm hoàn toàn ở tầng PostgreSQL/Prisma trước khi phân trang.
  2. **Tái sử dụng School Employee API (`/api/v1/schools/:id/employees`)**: SYSTEM_ADMIN tạo SCHOOL_ADMIN như cũ; SCHOOL_ADMIN chỉ tạo và xem Giáo viên (`BUS_ATTENDANT`) của trường mình; bổ sung endpoint xem chi tiết nhân viên an toàn cô lập theo trường học.
  3. **Driver Management (`/api/v1/drivers`)**: Dành riêng cho SYSTEM_ADMIN, quản lý tài xế thuộc biên chế Nhà xe (`role = DRIVER`, `schoolId = null`). Cho phép tạo tài xế chỉ cần Email hoặc Số điện thoại (không bắt buộc cả hai).
  4. **Parent-Student Linking (`/api/v1/parents`)**: Xem danh sách học sinh đã liên kết, xem chi tiết học sinh đã liên kết (hỗ trợ 2 section giao diện Round 3), yêu cầu gửi OTP liên kết gắn chặt ngữ cảnh phụ huynh/học sinh/số điện thoại người giám hộ, xác thực OTP atomic và chống race condition/replay attack/duplicate links, và hủy liên kết học sinh (Swipe-to-Unlink & Detail Unlink).
- **100% Automated Tests Đạt Chuẩn**: 17 files test với **166/166 tests passed** (không có bất kỳ test nào fail hay skip).
- **TypeScript Clean Build**: Lệnh `npm run build` biên dịch thành công với 0 lỗi.
- **Swagger Đồng Bộ Hoàn Hảo**: 25 endpoint được tài liệu hóa đầy đủ bằng tiếng Việt tại `http://localhost:3000/api/docs`.
- **Tuyệt đối tuân thủ phạm vi**: Không sửa đổi mã nguồn `web/` hay `mobile/`. Không thực hiện Git Commit/Push. Sẵn sàng cho Round 3.

---

### B. Approved Product Owner Decisions

1. **Quyết định vai trò Giáo viên**: Database và Backend sử dụng duy nhất `Role.BUS_ATTENDANT`. Giao diện hiển thị nhãn "Giáo viên". Không tạo bảng riêng, không tạo Role `TEACHER`.
2. **Quyết định Tài xế (Decision A)**: Tài xế thuộc biên chế Nhà xe dùng `User.role = DRIVER`, mặc định `schoolId = null`. Tạo tài xế yêu cầu `fullName` và tối thiểu một trong hai: `email` hoặc `phone`. Không bắt buộc số điện thoại nếu đã có email hợp lệ. Không tạo bảng `drivers`.
3. **Quyết định Tái sử dụng Employee APIs (Decision B)**: Tái sử dụng `GET/POST /api/v1/schools/:id/employees`. Quyền tạo/xem do Authenticated Role quyết định: SYSTEM_ADMIN tạo SCHOOL_ADMIN, SCHOOL_ADMIN tạo BUS_ATTENDANT trường mình. Không mở endpoint `/bus-attendants` riêng.
4. **Quyết định Bảo mật OTP Challenge (Decision C)**: OTP liên kết phụ huynh ràng buộc đồng thời 8 yếu tố: Authenticated Parent ID, Student ID, Student Code, Guardian Phone, Challenge ID, Purpose `PARENT_STUDENT_LINKING`, TTL 5 phút, và trạng thái tiêu thụ One-time Atomic Consumption.
5. **Quyết định Chuyển trạng thái Học sinh (Decision D1)**: School Admin được phép đổi trạng thái qua lại giữa `AVAILABLE` và `DISABLED`. Không triển khai Student Update CRUD toàn diện ở Round 2.
6. **Quyết định Chặn liên kết học sinh DISABLED (Decision D2)**: Khi học sinh `DISABLED`, chặn khởi tạo liên kết mới và chặn gửi OTP liên kết mới.
7. **Quyết định Giữ nguyên liên kết cũ (Decision D3)**: Học sinh chuyển sang `DISABLED` thì các `ParentStudentLink` đã tồn tại vẫn giữ nguyên, phụ huynh vẫn xem được và vẫn được phép hủy liên kết.
8. **Quyết định Trường học Inactive (Decision D4)**: Trường học `isActive = false` thì chặn tạo học sinh mới, chặn tạo BUS_ATTENDANT mới, chặn gửi OTP liên kết mới.
9. **Quyết định Giao thức OTP (Decision D6)**: Trong môi trường development, phát OTP qua Logger Console. Tuyệt đối không trả OTP trong HTTP response. Môi trường production đánh dấu `NOT CONFIGURED` nếu chưa gắn SMS Provider bên thứ ba.
10. **Quyết định QR Payload (Decision D7)**: QR Code chỉ chứa duy nhất `Student.code`. Không chứa token, PII hay ID nội bộ.

---

### C. Database Schema & Migration

1. **Enum StudentStatus**:
   ```prisma
   enum StudentStatus {
     AVAILABLE
     DISABLED
   }
   ```
2. **OtpPurpose Enum Extension**:
   - Bổ sung giá trị `PARENT_STUDENT_LINKING` vào enum `OtpPurpose`. Giữ nguyên các giá trị cũ (`REGISTRATION`, `PASSWORD_RESET`, `LOGIN_2FA`).
3. **Model OtpChallenge**:
   - Bổ sung trường `studentId String?` (Foreign Key trỏ về `Student.id` với `onDelete: Cascade`).
   - Bổ sung trường `attempts Int @default(0)` để quản lý giới hạn nhập sai OTP tối đa 5 lần.
4. **Model Student**:
   - `id`: UUID Primary Key (`@default(uuid())`).
   - `code`: `String @unique` (định danh toàn hệ thống).
   - `schoolId`: `String` (Foreign Key trỏ về `School.id` với `onDelete: Restrict`).
   - `fullName`: `String`.
   - `guardianPhone`: `String`.
   - `avatarUrl`: `String?`, `avatarPublicId`: `String?`.
   - `addressText`: `String?`, `latitude`: `Float?`, `longitude`: `Float?`.
   - `status`: `StudentStatus @default(AVAILABLE)`.
   - `createdAt`: `DateTime @default(now())`, `updatedAt`: `DateTime @updatedAt`.
   - Index: `@@index([schoolId])`, `@@index([status])`.
5. **Model ParentStudentLink**:
   - `id`: UUID Primary Key.
   - `parentId`: Foreign Key trỏ về `User.id` (`onDelete: Restrict`).
   - `studentId`: Foreign Key trỏ về `Student.id` (`onDelete: Restrict`).
   - `linkedAt`: `DateTime @default(now())`.
   - Ràng buộc độc nhất: `@@unique([parentId, studentId])`.
   - Indexes: `@@index([parentId])`, `@@index([studentId])`.
6. **Migration**:
   - File: `api/prisma/migrations/20261023053710_add_students_and_parent_links/migration.sql`.
   - Đã áp dụng an toàn vào PostgreSQL cơ sở dữ liệu thực tế. Không xảy ra reset DB hay mất mát dữ liệu hiện có của School, User hay Session.

---

### D. StudentStatus & Address Logic

1. **StudentStatus**:
   - Chỉ có hai trạng thái hợp lệ: `AVAILABLE` (học sinh đang theo học) và `DISABLED` (học sinh nghỉ học/tạm khóa).
   - Mặc định khi tạo mới luôn là `AVAILABLE`.
2. **Address Data Invariant**:
   - Có đúng 2 trạng thái dữ liệu hợp lệ:
     - **Không có địa chỉ**: `addressText = null`, `latitude = null`, `longitude = null`.
     - **Có đầy đủ địa chỉ**: `addressText` không rỗng, `latitude` thuộc `[-90, 90]`, `longitude` thuộc `[-180, 180]`.
   - Bất kỳ trạng thái địa chỉ nửa vời nào (thiếu 1 trong 3 trường hoặc tọa độ ngoài phạm vi) đều bị từ chối ngay bằng `400 Bad Request`.
3. **Trường dẫn xuất hasAddress**:
   - Không lưu cột thừa `hasAddress` trong cơ sở dữ liệu.
   - Được tính toán động: `hasAddress = Boolean(addressText && latitude !== null && longitude !== null)`.

---

### E. Student Code — STU + 8 Characters

1. **Quy chuẩn định dạng**:
   - Tiền tố cố định: `STU`.
   - Phần ngẫu nhiên: Đúng 8 ký tự alphanumeric (`[A-Z0-9]`), bắt buộc chứa ít nhất 1 chữ cái và ít nhất 1 chữ số.
   - Tổng chiều dài: Đúng 11 ký tự.
   - Regex kiểm thực: `^STU(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{8}$`.
2. **Cơ chế sinh mã ngẫu nhiên**:
   - Sử dụng thư viện chuẩn `node:crypto` (`crypto.randomInt`), tuyệt đối không dùng `Math.random()`.
   - Không phụ thuộc Student ID hay bất kỳ thông tin nhạy cảm nào.
3. **Tính độc nhất toàn hệ thống (Global Uniqueness)**:
   - Ràng buộc `code @unique` trên bảng `Student`.
   - Xử lý xung đột (Collision Retry): Khi xảy ra lỗi Prisma `P2002` trên trường `code`, hệ thống tự động bắt lỗi và thực hiện sinh mã mới tối đa 5 lần lặp.
4. **Tính bất biến (Immutability)**:
   - Mã học sinh không thể cập nhật sau khi tạo. Không cung cấp API sửa mã học sinh.

---

### F. Student API Contracts

| Method | Endpoint | Allowed Role | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/schools/:schoolId/students` | `SYSTEM_ADMIN`, `SCHOOL_ADMIN` | Lấy danh sách học sinh. Lọc theo `status`, `hasAddress`, tìm kiếm theo `fullName`/`code`, phân trang. |
| `POST` | `/api/v1/schools/:schoolId/students` | `SCHOOL_ADMIN` | Tạo học sinh mới (Multipart: `fullName`, `guardianPhone`, `avatar`, `addressText`, `latitude`, `longitude`). |
| `GET` | `/api/v1/schools/:schoolId/students/:id` | `SYSTEM_ADMIN`, `SCHOOL_ADMIN` | Xem chi tiết học sinh, tên trường học, tình trạng địa chỉ và QR Payload (`qrData = code`). |
| `PATCH` | `/api/v1/schools/:schoolId/students/:id/status` | `SCHOOL_ADMIN` | Cập nhật trạng thái học sinh giữa `AVAILABLE` và `DISABLED`. |

- **Hai bộ lọc độc lập ở tầng Database**:
  - `status`: `AVAILABLE` hoặc `DISABLED` hoặc bỏ qua (lấy tất cả).
  - `hasAddress`: `true` (`addressText`, `latitude`, `longitude` đều `not: null`) hoặc `false` (`OR` một trong các trường là `null`) hoặc bỏ qua (lấy tất cả).
  - Lọc và đếm trực tiếp trên PostgreSQL trước khi phân trang (`skip`/`take`). Không load bộ nhớ Node.js.

---

### G. Employee API Reuse

1. **`GET /api/v1/schools/:id/employees`**:
   - `SYSTEM_ADMIN`: Xem tất cả nhân viên (bao gồm `SCHOOL_ADMIN` và `BUS_ATTENDANT`).
   - `SCHOOL_ADMIN`: Chỉ xem danh sách Giáo viên (`BUS_ATTENDANT`) của chính trường mình (`currentUser.schoolId === schoolId`). Nếu cố tình truyền tham số `role=SCHOOL_ADMIN`, hệ thống tự động ghi đè ép buộc chỉ truy vấn `BUS_ATTENDANT`.
2. **`POST /api/v1/schools/:id/employees`**:
   - Vai trò tài khoản tạo được quyết định hoàn toàn bởi Backend:
     - Khi `SYSTEM_ADMIN` gọi: Khởi tạo tài khoản `SCHOOL_ADMIN`.
     - Khi `SCHOOL_ADMIN` gọi: Khởi tạo tài khoản `BUS_ATTENDANT` cho trường mình.
   - Kiểm tra trường học phải đang hoạt động (`isActive = true`).
3. **`GET /api/v1/schools/:id/employees/:employeeId`**:
   - Endpoint xem chi tiết nhân viên, cô lập chặt chẽ: `SCHOOL_ADMIN` không thể xem nhân viên trường khác hoặc nhân viên quản trị.

---

### H. Driver API Contracts

- **Quyền truy cập**: Dành riêng cho `SYSTEM_ADMIN`.
- **Tài khoản**: Lưu trong bảng `users` với `role = DRIVER`, `schoolId = null`.
- **Định danh**: Yêu cầu `fullName` và ít nhất một trong hai: `email` hoặc `phone`.

| Method | Endpoint | Allowed Role | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/drivers` | `SYSTEM_ADMIN` | Danh sách tài xế Nhà xe, lọc theo trạng thái (`ACTIVE`/`INACTIVE`), tìm kiếm họ tên/email/sđt, phân trang. |
| `POST` | `/api/v1/drivers` | `SYSTEM_ADMIN` | Tạo tài xế mới. Tự động sinh mật khẩu ngẫu nhiên băm bcryptjs, giao qua console ở development. |
| `GET` | `/api/v1/drivers/:id` | `SYSTEM_ADMIN` | Xem chi tiết tài khoản tài xế. |

---

### I. Parent OTP Linking

1. **`GET /api/v1/parents/students`**:
   - Lấy danh sách học sinh phụ huynh hiện tại đã liên kết thành công.
   - Vẫn hiển thị học sinh dù học sinh đó chuyển sang `DISABLED` (kèm cờ `status: "DISABLED"` để UI Round 3 hiển thị huy hiệu cảnh báo).
2. **`GET /api/v1/parents/students/:id`**:
   - Xem chi tiết học sinh đã liên kết. Chỉ cho phép khi tồn tại bản ghi `ParentStudentLink` giữa phụ huynh và học sinh.
3. **`POST /api/v1/parents/link-requests`**:
   - Nhận `studentCode`, chuẩn hóa (trim + uppercase), kiểm tra định dạng.
   - Kiểm tra học sinh tồn tại, học sinh `AVAILABLE`, trường học của học sinh `isActive = true`.
   - Kiểm tra phụ huynh chưa từng liên kết với học sinh này.
   - Tạo `OtpChallenge` với purpose `PARENT_STUDENT_LINKING`, gắn `studentId` và `userId` (Parent ID).
   - Trả về `challengeId`, `maskedPhone` (ví dụ `098****655`), `expiresInSeconds: 300`.
4. **`POST /api/v1/parents/verify-link`**:
   - Nhận `challengeId` và `otp`.
   - Xác thực và tiêu thụ mã OTP trong transaction atomic.
   - Kiểm tra lại trạng thái học sinh và tạo bản ghi `ParentStudentLink`.
5. **`DELETE /api/v1/parents/students/:id`**:
   - Phụ huynh hủy liên kết với học sinh. Chỉ xóa bản ghi `ParentStudentLink` của chính phụ huynh đó. Không xóa học sinh hay ảnh hưởng phụ huynh khác.

---

### J. OTP Security & Concurrency

1. **Mã hóa an toàn**: OTP được sinh ngẫu nhiên 6 chữ số qua `node:crypto`, băm bằng SHA-256 (`otpHash`) trước khi lưu cơ sở dữ liệu.
2. **Chống Replay Attack & Double Submit**:
   - Xác thực và cập nhật `consumedAt = now()` được thực hiện trong một Prisma Transaction duy nhất (`prisma.$transaction`).
   - Nếu `consumedAt !== null`, lập tức từ chối `Mã xác thực đã được sử dụng trước đó`.
3. **Giới hạn số lần thử (Max Attempts)**:
   - Quản lý cột `attempts`. Mỗi lần nhập sai OTP tăng `attempts` lên 1. Khi đạt 5 lần sai, mã bị khóa và buộc phải yêu cầu thử thách mới.
4. **Rate Limiting chống spam**:
   - Khi phụ huynh yêu cầu gửi lại OTP cho cùng một học sinh trong khi mã cũ chưa hết hạn (TTL 300s), hệ thống trả lỗi thông báo số giây còn lại cần chờ.
5. **Chống trùng lặp liên kết**:
   - Ràng buộc `@@unique([parentId, studentId])` trên PostgreSQL bảo đảm tuyệt đối không thể có 2 liên kết trùng lặp ngay cả khi có request đồng thời.

---

### K. Authorization Matrix

| Miền nghiệp vụ / Endpoint | SYSTEM_ADMIN | SCHOOL_ADMIN | PARENT | DRIVER / BUS_ATTENDANT |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/v1/schools/:id/employees` | ✅ Toàn quyền | ✅ Chỉ trường mình, chỉ BUS_ATTENDANT | ❌ 403 | ❌ 403 |
| `POST /api/v1/schools/:id/employees` | ✅ Tạo SCHOOL_ADMIN | ✅ Tạo BUS_ATTENDANT trường mình | ❌ 403 | ❌ 403 |
| `GET /api/v1/schools/:schoolId/students` | ✅ Xem theo trường | ✅ Xem trường mình | ❌ 403 | ❌ 403 |
| `POST /api/v1/schools/:schoolId/students` | ❌ 403 | ✅ Tạo học sinh trường mình | ❌ 403 | ❌ 403 |
| `PATCH /api/v1/schools/:schoolId/students/:id/status` | ❌ 403 | ✅ Đổi trạng thái trường mình | ❌ 403 | ❌ 403 |
| `GET /api/v1/drivers` & `POST /api/v1/drivers` | ✅ Toàn quyền | ❌ 403 | ❌ 403 | ❌ 403 |
| `GET /api/v1/parents/students` | ❌ 403 | ❌ 403 | ✅ Xem học sinh của mình | ❌ 403 |
| `POST /api/v1/parents/link-requests` | ❌ 403 | ❌ 403 | ✅ Gửi OTP liên kết | ❌ 403 |
| `POST /api/v1/parents/verify-link` | ❌ 403 | ❌ 403 | ✅ Xác thực liên kết | ❌ 403 |
| `DELETE /api/v1/parents/students/:id` | ❌ 403 | ❌ 403 | ✅ Hủy liên kết của mình | ❌ 403 |

---

### L. Database Query Efficiency

1. **Lọc dữ liệu trước Pagination**: Toàn bộ các bộ lọc (`schoolId`, `status`, `hasAddress`, `search`, `role`) đều được chuyển hóa thành Prisma `where` clause chạy trực tiếp trên PostgreSQL, không tải danh sách toàn bộ vào bộ nhớ Node.js.
2. **Loại bỏ N+1 Query**:
   - Sử dụng Prisma `include` / `select` cụ thể: ví dụ `ParentStudentLink` include `student` và `school` trong một câu truy vấn duy nhất.
3. **Indexes hỗ trợ tối ưu**:
   - `Student`: Index trên `schoolId`, index trên `status`, index unique trên `code`.
   - `ParentStudentLink`: Index unique cặp `[parentId, studentId]`, index trên `parentId`, index trên `studentId`.

---

### M. Swagger

- Đã cấu hình và kiểm chứng live tại `http://localhost:3000/api/docs`.
- Toàn bộ 25 endpoints trong hệ thống đều được tài liệu hóa với mô tả chi tiết bằng tiếng Việt, bao gồm đầy đủ `@ApiTags`, `@ApiOperation`, `@ApiParam`, `@ApiQuery`, `@ApiBody`, `@ApiResponse` (200, 201, 400, 401, 403, 404, 409).
- Không để lộ mã OTP thật hay mật khẩu tạm trong tài liệu Swagger.

---

### N. Testing Evidence

Chạy lệnh kiểm thử toàn diện: `npm test` trong thư mục `api/`:

```text
 RUN  v4.1.12 C:/Users/chuon/Documents/work/road-to-school-v2/api

 ✓ src/students/utils/student-code.generator.spec.ts (5 tests) 25ms
 ✓ src/schools/schedule.validator.spec.ts (13 tests) 15ms
 ✓ src/auth/otp.service.spec.ts (3 tests) 13ms
 ✓ src/schools/cloudinary.service.spec.ts (6 tests) 25ms
 ✓ src/students/students.service.spec.ts (16 tests) 32ms
 ✓ src/parents/parents.service.spec.ts (14 tests) 23ms
 ✓ src/auth/roles.guard.spec.ts (7 tests) 15ms
 ✓ src/schools/list-school-employees.dto.spec.ts (6 tests) 13ms
 ✓ src/schools/create-school-admin.dto.spec.ts (9 tests) 19ms
 ✓ src/schools/create-school.dto.spec.ts (9 tests) 17ms
 ✓ src/drivers/drivers.service.spec.ts (9 tests) 244ms
 ✓ src/health/health.controller.spec.ts (2 tests) 6ms
 ✓ src/drivers/drivers.controller.spec.ts (3 tests) 9ms
 ✓ src/schools/schools.service.spec.ts (48 tests) 708ms
 ✓ src/parents/parents.controller.spec.ts (5 tests) 9ms
 ✓ src/students/students.controller.spec.ts (4 tests) 8ms
 ✓ src/schools/schools.controller.spec.ts (7 tests) 10ms

 Test Files  17 passed (17)
      Tests  166 passed (166)
   Duration  4.02s
```

---

### O. Existing System Regression

- **Authentication Module**: Tất cả các API đăng nhập (`/auth/web/login`, `/auth/mobile/login`), đăng ký (`/auth/register`), quên mật khẩu, refresh token, và lấy thông tin cá nhân (`/auth/me`) hoạt động bình thường, không suy giảm hồi quy.
- **School Management Module**: Các API quản lý trường học (`GET/POST/PATCH /schools`, upload ảnh trường qua Cloudinary) giữ nguyên tính toàn vẹn 100%.

---

### P. Files Changed

1. **Cơ sở dữ liệu & Migration**:
   - [api/prisma/schema.prisma](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/prisma/schema.prisma)
   - [api/prisma/migrations/20261023053710_add_students_and_parent_links/migration.sql](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/prisma/migrations/20261023053710_add_students_and_parent_links/migration.sql)
2. **Student Module**:
   - `api/src/students/utils/student-code.generator.ts` & `.spec.ts`
   - `api/src/students/dto/create-student.dto.ts`
   - `api/src/students/dto/list-students-query.dto.ts`
   - `api/src/students/dto/update-student-status.dto.ts`
   - `api/src/students/dto/student-response.dto.ts`
   - `api/src/students/dto/index.ts`
   - `api/src/students/students.service.ts` & `.spec.ts`
   - `api/src/students/students.controller.ts` & `.spec.ts`
   - `api/src/students/students.module.ts`
3. **Driver Module**:
   - `api/src/drivers/dto/create-driver.dto.ts`
   - `api/src/drivers/dto/list-drivers-query.dto.ts`
   - `api/src/drivers/dto/driver-response.dto.ts`
   - `api/src/drivers/dto/index.ts`
   - `api/src/drivers/drivers.service.ts` & `.spec.ts`
   - `api/src/drivers/drivers.controller.ts` & `.spec.ts`
   - `api/src/drivers/drivers.module.ts`
4. **Parent-Student Linking Module**:
   - `api/src/parents/dto/parent-linking.dto.ts`
   - `api/src/parents/dto/index.ts`
   - `api/src/parents/parents.service.ts` & `.spec.ts`
   - `api/src/parents/parents.controller.ts` & `.spec.ts`
   - `api/src/parents/parents.module.ts`
5. **Cải tiến Auth & School Modules**:
   - [api/src/auth/otp.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/auth/otp.service.ts)
   - [api/src/schools/cloudinary.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/cloudinary.service.ts)
   - [api/src/schools/schools.controller.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/schools.controller.ts) & `.spec.ts`
   - [api/src/schools/schools.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/schools.service.ts) & `.spec.ts`
   - [api/src/app.module.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/app.module.ts)
   - [api/src/main.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/main.ts)
6. **Tài liệu**:
   - [docs/architecture/student-parent-management-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/architecture/student-parent-management-plan.md)
   - [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)
   - [docs/ai-review/LATEST.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.md)

---

### Q. Confirmed Bugs & Limitations

1. **SMS Production Delivery**: Chưa cấu hình nhà cung cấp dịch vụ SMS thực tế (Twilio/eSMS/SpeedSMS). Môi trường Development sử dụng Logger Console Delivery an toàn. Môi trường Production sẽ báo lỗi nghiệp vụ rõ ràng nếu chưa cấu hình nhà mạng.
2. **Không có API sửa học sinh**: Theo quyết định PO Round 1 & 2, chỉ có API đổi trạng thái (`AVAILABLE` <-> `DISABLED`). Không xây dựng Student Update CRUD đầy đủ.
3. **Mã học sinh bất biến**: Không hỗ trợ đổi mã học sinh sau khi đã tạo thành công.

---

### R. Round 3 API Readiness

Toàn bộ các hợp đồng API Backend phục vụ Round 3 (Web UI & Mobile UI) đã sẵn sàng 100%:
1. Giao diện Web School Admin: Danh sách học sinh (2 filters, pagination, search), Thêm học sinh (Multipart avatar + VietMap address), Đổi trạng thái, Danh sách Giáo viên (`BUS_ATTENDANT`), Thêm Giáo viên.
2. Giao diện Web System Admin: Danh sách tài xế, Thêm tài xế mới.
3. Giao diện Mobile Phụ huynh: Danh sách học sinh đã liên kết, Nhập mã / Quét QR học sinh (`POST /link-requests`), Hộp thoại xác thực OTP (`POST /verify-link`), Chi tiết học sinh và thao tác hủy liên kết (`DELETE /parents/students/:id`).

---

### S. Next Round

Đề xuất duy nhất cho bước tiếp theo:
- **ROUND 3/3**: Triển khai toàn bộ Giao diện Web (School Admin, System Admin) và Mobile App (Parent, Driver, Bus Attendant), tích hợp QR Scanner, OTP Dialogs, VietMap Address Input và kiểm thử E2E giao diện người dùng.

---

### T. Approval Status

- **Database Schema & Migration**: **READY FOR APPROVAL**.
- **Backend Modules & APIs**: **READY FOR APPROVAL**.
- **Automated Tests**: **166/166 PASSED**.
- **Swagger Documentation**: **SYNCHRONIZED & READY**.
- **Stop-After-Task Rule**: Agent DỪNG LẠI tại đây, chờ phản hồi và phê duyệt chính thức từ Product Owner trước khi chuyển sang Round 3.
