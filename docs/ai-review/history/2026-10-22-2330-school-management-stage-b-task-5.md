# RoadToSchool — AI Review Report
# Phân hệ: School Management — Stage B: Implementation
# Task 5: School Employees & Create School Admin APIs

> **Thời gian báo cáo**: 22/10/2026 23:30  
> **Người thực hiện**: Senior NestJS Backend Engineer  
> **Trạng thái**: Hoàn thành Task 5 — Chờ Product Owner xét duyệt  
> **Diff Task-scoped**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)

---

## A. Task Information
- **Task ID**: `TASK 5`
- **Tên Task**: `SCHOOL EMPLOYEES & CREATE SCHOOL ADMIN APIs`
- **Phạm vi (Strict Scope)**:
  1. `GET /api/v1/schools/:id/employees`: Lấy danh sách nhân viên của một trường học với tìm kiếm, lọc theo vai trò, lọc trạng thái hoạt động và phân trang.
  2. `POST /api/v1/schools/:id/employees`: Tạo tài khoản Quản trị trường học (`SCHOOL_ADMIN`) liên kết với trường học.
  3. Đồng bộ thống nhất chỉ số `employeeCount` trong các API trường học (`GET /schools` và `GET /schools/:id`).
  4. Đảm bảo tài khoản mới tương thích tuyệt đối với Authentication Phase 1.
  5. Bảo đảm kiểm soát quyền truy cập nghiêm ngặt (`SYSTEM_ADMIN` only qua `AuthGuard` và `RolesGuard`).
  6. Đồng bộ Swagger/OpenAPI tiếng Việt đầy đủ tại `http://localhost:3000/api/docs`.
  7. **Giới hạn nghiêm ngặt**:
     - KHÔNG thay đổi Prisma Schema, KHÔNG tạo Migration.
     - KHÔNG tạo bảng Employee / SchoolEmployee / AccountCredentials mới.
     - KHÔNG sửa Web Frontend / Mobile App.
     - KHÔNG refactor Authentication Phase 1, không đổi JWT claims.
     - KHÔNG cài đặt SMTP, SendGrid, Twilio, SMS provider.
     - KHÔNG triển khai tạo `BUS_ATTENDANT`, không tạo Update/Delete/Disable Employee APIs.
     - KHÔNG tự ý chuyển sang Task 6.
- **Trạng thái**: `COMPLETED (ALL QUALITY GATES PASSED)`

---

## B. Baseline
- **School Model**: Bảng `schools` trong PostgreSQL với các trường `id`, `name`, `address_text`, `latitude`, `longitude`, `contract_start_date`, `contract_end_date`, `weekly_schedule` (JSONB), `is_active`, `created_at`, `updated_at`.
- **User Model**: Tái sử dụng bảng `users` hiện tại, trường `school_id` nullable liên kết khóa ngoại với `School.id` (`onDelete: Restrict`).
- **Role Enum**: Sử dụng `@prisma/client` `Role` enum hiện có: `SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `BUS_ATTENDANT`, `DRIVER`, `PARENT`. Nhân viên trường học chỉ gồm hai vai trò: `SCHOOL_ADMIN` và `BUS_ATTENDANT`.
- **Existing Authentication Baseline**:
  - `AuthGuard` và `RolesGuard` với metadata `@Roles(Role.SYSTEM_ADMIN)`.
  - Mật khẩu mã hóa bằng `bcryptjs` (cost factor 10).
  - Chuẩn hóa định danh đăng nhập qua `OtpService.normalizeIdentifier` (email chữ thường, số điện thoại chuẩn hóa format di động Việt Nam `09xx`).
  - Hợp đồng đăng nhập Web `POST /api/v1/auth/web/login` hỗ trợ cả `SYSTEM_ADMIN` và `SCHOOL_ADMIN` thông qua Email hoặc Số điện thoại.

---

## C. Implemented APIs

| Method | Endpoint | Authorization | Mục đích |
|---|---|---|---|
| `GET` | `/api/v1/schools/:id/employees` | Bearer JWT (`SYSTEM_ADMIN`) | Lấy danh sách nhân viên của một trường học (hỗ trợ search, filter role/status, pagination) |
| `POST` | `/api/v1/schools/:id/employees` | Bearer JWT (`SYSTEM_ADMIN`) | Khởi tạo tài khoản `SCHOOL_ADMIN` cho trường học |

### DTOs & Response Models
- [list-school-employees.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/dto/list-school-employees.dto.ts): `ListSchoolEmployeesQueryDto`, `SchoolEmployeeRoleFilter`, `SchoolEmployeeStatusFilter`.
- [create-school-admin.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/dto/create-school-admin.dto.ts): `CreateSchoolAdminDto` với custom decorator `@AtLeastOneIdentifier` và bộ lọc khoảng trắng/kí tự phân tách cho số điện thoại.
- [school-employee-response.dto.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/dto/school-employee-response.dto.ts): `SchoolEmployeeItemDto`, `SchoolEmployeeListResponseDto`, `CreateSchoolAdminResponseDto`.

---

## D. Employee List (`GET /api/v1/schools/:id/employees`)
1. **Phạm vi vai trò**: Chỉ trả về các tài khoản người dùng có vai trò `SCHOOL_ADMIN` hoặc `BUS_ATTENDANT` liên kết với trường học qua `User.schoolId`. Các vai trò ngoài phạm vi (`SYSTEM_ADMIN`, `PARENT`, `DRIVER`) bị loại trừ hoàn toàn khỏi kết quả.
2. **Tìm kiếm (Search)**: Tìm kiếm đồng thời trên `fullName`, `email`, và `phone` không phân biệt hoa thường (`mode: 'insensitive'`), hỗ trợ tiếng Việt có dấu và xử lý an toàn khi `email` hoặc `phone` mang giá trị `null`.
3. **Bộ lọc vai trò (Role Filter)**:
   - Mặc định (không truyền): Lấy cả `SCHOOL_ADMIN` và `BUS_ATTENDANT`.
   - `SCHOOL_ADMIN`: Chỉ lấy Quản trị viên trường học.
   - `BUS_ATTENDANT`: Chỉ lấy Phụ xe trường học.
4. **Bộ lọc trạng thái (Status Filter)**:
   - `ACTIVE`: `User.isActive = true`.
   - `INACTIVE`: `User.isActive = false`.
   - Mặc định: Lấy toàn bộ trạng thái.
5. **Trường Inactive**: SYSTEM_ADMIN vẫn có thể xem danh sách nhân viên của một trường học đang ở trạng thái `INACTIVE` (`School.isActive = false`).
6. **Phân trang & Sắp xếp**: Phân trang cấp cơ sở dữ liệu qua `skip` và `take` (`take: 10`, tối đa `50`). Thứ tự ổn định xác định (`orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`).
7. **Bảo mật dữ liệu**: Tuyệt đối không trả về `passwordHash`, session token, OTP hay authentication secrets trong danh sách.

---

## E. Create School Admin (`POST /api/v1/schools/:id/employees`)
1. **Kiểm tra School ID & Trạng thái**:
   - Nếu School không tồn tại: Trả về `404 Not Found`.
   - Nếu School đang ở trạng thái `isActive = false`: Bắt buộc từ chối với `400 Bad Request` và thông báo `"Không thể tạo tài khoản quản trị cho trường học đang ngừng hoạt động."`.
2. **Định danh linh hoạt (At Least One Identifier)**:
   - Bắt buộc cung cấp ít nhất `email` HOẶC `phone`.
   - Cho phép: Chỉ Email (`phone = null`), Chỉ Số điện thoại (`email = null`), hoặc Cả hai (`email` và `phone`).
3. **Chuẩn hóa dữ liệu**:
   - `fullName`: Bắt buộc, chuỗi ký tự trim khoảng trắng, tối thiểu 2 ký tự.
   - `email`: Trim khoảng trắng, chuẩn hóa chữ thường (`toLowerCase()`).
   - `phone`: Loại bỏ khoảng trắng, dấu gạch nối, chuẩn hóa tiền tố `+84` hoặc `84` thành `0` chuẩn di động Việt Nam.
4. **Xử lý trùng lặp & Race Condition**:
   - Kiểm tra trùng lặp pre-check qua `findFirst` trên `email` và `phone`.
   - Bắt lỗi đồng thời (Concurrency) qua mã lỗi Prisma `P2002` (Unique Constraint Violation) và ném `409 Conflict`.
5. **Trạng thái mặc định**:
   - `role = Role.SCHOOL_ADMIN`.
   - `schoolId = :id`.
   - `isActive = true`.
   - `isVerified = true`.
   - `avatarUrl = null`.
   - Không tự động đăng nhập hay sinh Session Token.

---

## F. Temporary Password Delivery
1. **Sinh mật khẩu**: Sử dụng `node:crypto` với `crypto.randomBytes(9).toString('base64url')` sinh chuỗi mật khẩu ngẫu nhiên an toàn 12 ký tự, tương thích với chính sách mật khẩu Web Login (tối thiểu 6 ký tự).
2. **Mã hóa lưu trữ**: Băm mật khẩu bằng `bcryptjs` (salt rounds = 10). Cơ sở dữ liệu chỉ lưu `passwordHash`, tuyệt đối không lưu Plaintext Password.
3. **Bàn giao qua Console trong Development**:
   - Kênh bàn giao đã được Product Owner phê duyệt chính thức.
   - Chỉ xuất mật khẩu tạm ra Logger trong môi trường Development (`process.env.NODE_ENV !== 'production'`) sau khi bản ghi User đã được tạo thành công trong PostgreSQL.
   - Không xuất mật khẩu khi request bị từ chối hoặc thất bại.
4. **Không lộ thông tin nhạy cảm**:
   - Response HTTP `201 Created` không chứa `password`, `temporaryPassword` hay `passwordHash`.
   - AI Review Report và Git Diff không chứa mật khẩu hay token.

---

## G. Authentication Integration
- **Đăng nhập Web (`POST /api/v1/auth/web/login`)**:
  - Đã kiểm chứng tài khoản `SCHOOL_ADMIN` mới tạo đăng nhập thành công cả bằng Email lẫn bằng Số điện thoại.
  - Phản hồi trả về `accessToken` JWT và `refreshToken`.
- **Endpoint `/api/v1/auth/me`**: Trả về đúng thông tin tài khoản với `role: "SCHOOL_ADMIN"`.
- **Refresh Token & Logout**: `POST /auth/refresh` và `POST /auth/logout` hoạt động bình thường với tài khoản `SCHOOL_ADMIN`.
- **Tính độc lập giữa School.isActive và User.isActive**: Khi trường chuyển sang `INACTIVE`, tài khoản `SCHOOL_ADMIN` hiện có vẫn có thể đăng nhập bình thường nếu tài khoản cá nhân vẫn `isActive = true`.
- **Ghi nhận tương thích (Compatibility Note)**: Trong Authentication Phase 1, hàm `sanitizeUser` trả về `{ id, fullName, email, phone, avatarUrl, role }`. Trường `schoolId` được lưu trữ toàn vẹn trong PostgreSQL `User.schoolId`, nhưng chưa được bổ sung vào JWT payload hay `UserResponseDto` của Phase 1 Auth. Điều này hoàn toàn tuân thủ quy tắc không tự ý sửa đổi hợp đồng Auth Phase 1 trong Task 5.

---

## H. Database Query Efficiency
1. **Bảng truy cập**: Chỉ truy vấn bảng `schools` và bảng `users`. Tuyệt đối không tạo bảng mới hay migration.
2. **Đồng bộ chỉ số `employeeCount`**:
   - Trước Task 5: `_count: { select: { users: true } }` đếm tất cả người dùng liên kết với trường (bao gồm cả các vai trò không phải nhân viên nếu có).
   - Đã điều chỉnh trong Task 5: `_count: { select: { users: { where: { role: { in: [Role.SCHOOL_ADMIN, Role.BUS_ATTENDANT] } } } } }`.
   - Đảm bảo `employeeCount` trong `GET /schools` và `GET /schools/:id` luôn thống nhất chính xác với danh sách trả về từ `GET /schools/:id/employees`.
3. **Truy vấn danh sách nhân viên**: Thực hiện song song `findMany` và `count` với bộ lọc PostgreSQL Index, không load toàn bộ dữ liệu vào memory.

---

## I. Testing

### Test Suite Execution
- **Lệnh chạy**: `npm test` trong thư mục `api/` (Vitest v4.1.12).
- **Kết quả**: **10 / 10 test files PASSED, 105 / 105 tests PASSED (100%)**.

```
 Test Files  10 passed (10)
      Tests  105 passed (105)
   Duration  2.31s
```

### Chi tiết các tệp kiểm thử mới & cập nhật:
1. [create-school-admin.dto.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/create-school-admin.dto.spec.ts): 9 tests kiểm tra decorator `@AtLeastOneIdentifier`, regex số điện thoại, trim họ tên, chuẩn hóa email.
2. [list-school-employees.dto.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/list-school-employees.dto.spec.ts): 6 tests kiểm tra phân trang (min/max), enum role và status.
3. [schools.controller.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/schools.controller.spec.ts): 6 tests kiểm tra delegation của controller đến service cho cả hai endpoint mới.
4. [schools.service.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/schools/schools.service.spec.ts): 44 tests kiểm tra toàn diện:
   - 404 khi trường không tồn tại.
   - 400 khi tạo admin cho trường đang ngừng hoạt động (`isActive = false`).
   - Tạo admin với chỉ email, chỉ số điện thoại, hoặc cả hai.
   - 409 khi trùng email hoặc số điện thoại (pre-check và Prisma P2002).
   - Lọc vai trò `SCHOOL_ADMIN` và `BUS_ATTENDANT`.
   - Lọc trạng thái `ACTIVE` và `INACTIVE`.
   - Tìm kiếm không phân biệt hoa thường theo họ tên, email, số điện thoại.
   - Bàn giao mật khẩu tạm qua Logger trong Development.
   - Không rò rỉ passwordHash ra response.

### Live HTTP Integration Test
Đã thực thi kịch bản kiểm thử trực tiếp trên backend server `http://localhost:3000/api/v1` với database PostgreSQL:
- Kiểm tra Authorization: 401 khi không có token (GET và POST).
- Kiểm tra Inactive School: 400 Bad Request khi tạo admin cho trường inactive.
- Kiểm tra Thiếu Định danh: 400 Bad Request khi thiếu cả email lẫn số điện thoại.
- Kiểm tra Tạo Admin Thành công: 201 Created với dữ liệu hợp lệ.
- Kiểm tra Chống Trùng lặp: 409 Conflict cho email trùng và số điện thoại trùng.
- Kiểm tra Danh sách Nhân viên: 200 OK trả về đúng tài khoản mới tạo.
- Kiểm tra `employeeCount`: Tăng và hiển thị chính xác trong `GET /schools/:id`.
- Kiểm tra Đăng nhập Web: Thành công cả bằng Email và Số điện thoại.
- Kiểm tra `/auth/me`, `/auth/refresh`, `/auth/logout`: Hoạt động hoàn hảo.
- Dọn dẹp dữ liệu test an toàn, không ảnh hưởng dữ liệu người dùng thật.

---

## J. Existing System Regression
- **Schools Module**:
  - `GET /api/v1/schools`: Hoạt động ổn định, `employeeCount` lọc chuẩn vai trò.
  - `GET /api/v1/schools/:id`: Hoạt động ổn định, `employeeCount` lọc chuẩn vai trò.
  - `PATCH /api/v1/schools/:id/status`: Hoạt động bình thường.
  - `POST /api/v1/schools`: Hoạt động bình thường.
- **VietMap & Cloudinary**: Giữ nguyên toàn vẹn, không có bất kỳ thay đổi nào ảnh hưởng đến tích hợp trước đó.
- **Authentication APIs**: Đăng nhập, refresh token, thu hồi phiên của hệ thống Authentication Phase 1 không bị ảnh hưởng.
- **NestJS Build**: `npm run build` thực thi thành công, 0 cảnh báo, 0 lỗi TypeScript.

---

## K. Files Changed

### Files Added
- `api/src/schools/dto/list-school-employees.dto.ts`
- `api/src/schools/dto/create-school-admin.dto.ts`
- `api/src/schools/dto/school-employee-response.dto.ts`
- `api/src/schools/create-school-admin.dto.spec.ts`
- `api/src/schools/list-school-employees.dto.spec.ts`

### Files Modified
- `api/src/schools/dto/index.ts`: Export các DTOs nhân viên mới.
- `api/src/schools/schools.controller.ts`: Thêm 2 endpoints mới và Swagger decorators.
- `api/src/schools/schools.service.ts`: Thêm `findEmployees`, `createSchoolAdmin` và điều chỉnh lọc vai trò trong `_count`.
- `api/src/schools/schools.controller.spec.ts`: Bổ sung controller unit tests.
- `api/src/schools/schools.service.spec.ts`: Bổ sung service unit tests.
- `docs/ai-review/LATEST.diff`: Lưu git diff dành riêng cho Task 5.
- `docs/ai-review/LATEST.md`: Cập nhật báo cáo AI Review Task 5.
- `docs/ai-review/history/2026-10-22-2330-school-management-stage-b-task-5.md`: Lưu lịch sử báo cáo.

---

## L. Issues & Limitations
1. **Console Delivery trong Production**: Hiện tại kênh bàn giao mật khẩu qua Console chỉ hoạt động trong môi trường Development (`NODE_ENV !== 'production'`). Khi triển khai lên Production, cần có giải pháp Notification chính thức (Email/SMS) theo lộ trình các Phase sau.
2. **schoolId trong Auth Response**: Như đã nêu trong Mục G, `AuthService.sanitizeUser` của Phase 1 Auth chưa trả về `schoolId` trong Web Login response body. Khi Web Admin UI phân quyền theo trường học, có thể cần cập nhật bổ sung trường này nếu Product Owner phê duyệt.

---

## M. Reviewer Focus
- Không có bất kỳ thay đổi nào đối với Prisma Schema và Migration.
- Quyền truy cập được khóa chặt chẽ chỉ cho `SYSTEM_ADMIN`.
- Đảm bảo trường học `INACTIVE` bị chặn tạo `SCHOOL_ADMIN` với mã lỗi `400 Bad Request`.
- Mật khẩu ngẫu nhiên được sinh an toàn bằng `node:crypto` và băm bằng `bcryptjs`.
- Không có mật khẩu thô trong HTTP response, cơ sở dữ liệu hay báo cáo review.
- Thống nhất cách đếm `employeeCount` loại bỏ các vai trò ngoài phạm vi.
- Toàn bộ 105 tests tự động đã PASS.

---

## N. Next Step
Đề xuất bước tiếp theo:
**TASK 6 — SHARED ADMIN LAYOUT & EMPTY OVERVIEW.**

> *(Theo Working Rules và chỉ thị của Product Owner: Dừng lại và chờ Product Owner review. Tuyệt đối không tự ý triển khai Task 6).*

---

## O. Approval Status
`WAITING FOR PRODUCT OWNER APPROVAL`
