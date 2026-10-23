# RoadToSchool — AI Review Report
# Phân hệ: School Management — Stage B: Implementation
# Task 2: Backend School Management APIs

> **Thời gian báo cáo**: 22/10/2026 22:05  
> **Người thực hiện**: Senior NestJS Backend Engineer  
> **Trạng thái**: Hoàn thành Task 2 — Chờ Product Owner xét duyệt  
> **Diff Task-scoped**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)

---

## A. Task Information
- **Task ID**: `TASK 2`
- **Tên Task**: `BACKEND SCHOOL MANAGEMENT APIs`
- **Phạm vi (Strict Scope)**:
  - Triển khai chính xác 3 endpoints quản lý trường học:
    1. `GET /api/v1/schools` — Danh sách trường học (phân trang, tìm kiếm, lọc trạng thái).
    2. `GET /api/v1/schools/:id` — Chi tiết trường học (lịch học JSONB, ngày hợp đồng).
    3. `PATCH /api/v1/schools/:id/status` — Cập nhật trạng thái hoạt động (`isActive`).
  - Xây dựng `SchoolsModule` (`schools.module.ts`, `schools.controller.ts`, `schools.service.ts`).
  - Bổ sung `RolesGuard` và decorator `@Roles(...)` để phân quyền nghiêm ngặt vai trò `SYSTEM_ADMIN`.
  - Chuẩn hóa DTOs và Response DTOs với tài liệu Swagger tiếng Việt.
  - Tuân thủ quy định: **KHÔNG triển khai `POST /schools` trong Task 2** (hoãn đến Task 4 khi có Cloudinary).
  - Viết Unit Tests Vitest và chạy kiểm thử tích hợp HTTP live API.
- **Trạng thái**: `COMPLETED (ALL QUALITY GATES PASSED)`

---

## B. Stage A / Task 1 Baseline
- **Database Schema**: Bảng `schools` (13 cột, PostgreSQL JSONB `weekly_schedule`, Date columns `@db.Date`) và trường `users.school_id` nullable với khóa ngoại `onDelete: Restrict`.
- **Migration Status**: 3 migrations đã áp dụng (`20261022044934_init`, `20261022091920_init_auth_tables`, `20261022143540_add_schools_table`), database schema đồng bộ 100%.
- **Dữ liệu hiện có**: Bảo toàn nguyên vẹn 4 Users (1 `SYSTEM_ADMIN`, 3 `PARENT`), 13 Sessions, 8 OtpChallenges.

---

## C. API Implementation
### 1. Phân quyền Vai trò (Role-Based Authorization)
- Áp dụng `@UseGuards(AuthGuard, RolesGuard)` và `@Roles(Role.SYSTEM_ADMIN)` tại cấp Controller.
- Không có Access Token hoặc Token hết hạn/không hợp lệ: Trả về **`401 Unauthorized`**.
- Tài khoản đăng nhập không phải `SYSTEM_ADMIN` (ví dụ `PARENT`, `SCHOOL_ADMIN`, `DRIVER`, `BUS_ATTENDANT`): Trả về **`403 Forbidden`** với thông báo tiếng Việt: *"Bạn không có quyền thực hiện thao tác này"*.
- Chỉ `SYSTEM_ADMIN` có Token và Session hợp lệ mới được truy cập 3 endpoints.

### 2. Chi tiết 3 Endpoints

#### `GET /api/v1/schools`
- **Mục đích**: Lấy danh sách trường học đối tác có phân trang, tìm kiếm theo tên và lọc theo trạng thái.
- **Query Params**: `ListSchoolsQueryDto`:
  - `page`: Số nguyên >= 1 (mặc định 1).
  - `limit`: Số nguyên từ 1 đến 50 (mặc định 10).
  - `search`: Chuỗi tìm kiếm theo tên trường, loại bỏ khoảng trắng thừa, tìm kiếm không phân biệt hoa thường (`mode: 'insensitive'`).
  - `status`: Enum `'ACTIVE' | 'INACTIVE'`, lọc tương ứng `isActive: true` hoặc `isActive: false`. Bỏ trống sẽ lấy toàn bộ.
- **Phân trang & Sắp xếp**: Phân trang tại Database qua Prisma `skip` và `take`. Sắp xếp xác định (deterministic ordering): `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`.
- **Employee Count**: Sử dụng Prisma `_count: { select: { users: true } }` tính toán trực tiếp trong câu truy vấn, không gây N+1.
- **Empty State**: Khi không có dữ liệu, trả về `{ items: [], meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } }` với status `200 OK` (không trả 404).

#### `GET /api/v1/schools/:id`
- **Mục đích**: Lấy thông tin chi tiết của 1 trường học theo UUID.
- **Validation**: Kiểm tra UUID v4 bằng `ParseUUIDPipe`. Nếu sai định dạng trả `400 Bad Request` ("Mã trường học không đúng định dạng UUID").
- **Dữ liệu trả về**: Đầy đủ các trường `id`, `name`, `addressText`, `latitude`, `longitude`, `imageUrl`, `imagePublicId`, `contractStartDate`, `contractEndDate`, `weeklySchedule`, `isActive`, `createdAt`, `updatedAt`, `employeeCount`.
- **Serialization**: `weeklySchedule` trả về dạng JSON Object. `contractStartDate` và `contractEndDate` serialize dạng `YYYY-MM-DD`.
- **Trường Inactive**: `SYSTEM_ADMIN` xem được chi tiết trường ở cả 2 trạng thái `ACTIVE` và `INACTIVE`. Không tìm thấy trường trả về `404 Not Found` ("Không tìm thấy trường học").

#### `PATCH /api/v1/schools/:id/status`
- **Mục đích**: Thay đổi trạng thái hoạt động của trường học (`isActive`).
- **Body**: `UpdateSchoolStatusDto`: `{ isActive: boolean }`. Validate bắt buộc boolean qua `@IsBoolean()`.
- **Deactivation (`isActive = false`)**:
  - Cập nhật `School.isActive = false`.
  - Không xóa trường, không xóa người dùng, không xóa session, không revoke token, không ảnh hưởng `User.isActive`.
  - Không cần kiểm tra ngày hợp đồng khi ngừng hoạt động.
- **Reactivation (`isActive = true`)**:
  - Kiểm tra điều kiện hiệu lực hợp đồng theo ngày hiện tại Việt Nam (múi giờ `Asia/Ho_Chi_Minh`): `contractStartDate <= currentDate <= contractEndDate`.
  - So sánh chuỗi ngày thuần túy `YYYY-MM-DD`, tránh sai lệch múi giờ UTC.
  - Nếu hợp đồng chưa bắt đầu hoặc đã hết hạn: Trả về **`400 Bad Request`** ("Không thể kích hoạt trường vì hợp đồng chưa có hiệu lực hoặc đã hết hạn") và không thay đổi trạng thái trong DB.
- **Idempotency**: Nếu trạng thái gửi lên giống hệt trạng thái hiện tại trong DB, trả về kết quả thành công ngay lập tức mà không thực hiện thao tác UPDATE trên Database.

---

## D. Business Rules & Account Independence
- **Độc lập giữa School và User**: Trạng thái `School.isActive` hoàn toàn độc lập với `User.isActive`. Khi trường bị vô hiệu hóa (`isActive = false`), các tài khoản nhân viên của trường vẫn giữ nguyên trạng thái `User.isActive`, vẫn có thể đăng nhập nếu đáp ứng Authentication Rules.
- **Chặn phát sinh nghiệp vụ**: Các nghiệp vụ tạo mới liên quan trường inactive sẽ được chặn ở các task tương ứng (ví dụ Task 5 chặn tạo School Admin khi trường inactive).

---

## E. Database Query Strategy & Efficiency
- **Truy vấn tối thiểu**:
  - `findAll`: 1 lần `findMany` + 1 lần `count` chạy song song qua `Promise.all`. Sử dụng `_count: { select: { users: true } }` nhóm đếm tại DB, loại bỏ hoàn toàn nguy cơ N+1.
  - `findOne`: 1 câu lệnh `findUnique` kèm `_count.users`.
  - `updateStatus`: 1 câu lệnh `findUnique` kiểm tra trạng thái và ngày hợp đồng; nếu trạng thái thay đổi mới chạy thêm 1 câu lệnh `update`.
- **Chỉ mục sử dụng**: Tận dụng tối đa các indexes đã thiết lập ở Task 1: `schools_name_idx`, `schools_is_active_idx`, `users_school_id_idx`.
- **Không dư thừa**: Không tạo Repository Layer, không dùng transaction thừa, không tải các cột dữ liệu không cần thiết vào bộ nhớ.

---

## F. Swagger / OpenAPI Synchronization
- **Endpoint Swagger UI**: `http://localhost:3000/api/docs` (HTTP 200 Verified).
- **Tag mới**: `Schools` — *"Các API quản lý thông tin và trạng thái hoạt động của trường học đối tác"*.
- **Chi tiết đồng bộ**:
  - 3 routes đều có `@ApiBearerAuth('JWT-auth')`.
  - Mô tả tiếng Việt đầy đủ cho Summary, Description, Query Parameters, Path Parameters, Request Body và Responses (200, 400, 401, 403, 404).
  - Đầy đủ Response DTO Schemas trong Swagger Components: `SchoolListItemDto`, `PaginationMetaDto`, `SchoolListResponseDto`, `SchoolDetailResponseDto`, `UpdateSchoolStatusDto`, `UpdateSchoolStatusResponseDto`.

---

## G. Testing & Quality Gates

| Hạng mục kiểm thử | Công cụ / Phương thức | Kết quả | Trạng thái |
|---|---|---|:---:|
| **TypeScript Build** | `npm run build` | 0 errors, build completed | **PASS** |
| **All Unit Tests** | `npm test` (Vitest) | 5 test files, 29/29 tests passed (1.93s) | **PASS** |
| **SchoolsService Tests** | Vitest (`schools.service.spec.ts`) | 14/14 tests passed (findAll, findOne, updateStatus) | **PASS** |
| **SchoolsController Tests** | Vitest (`schools.controller.spec.ts`) | 3/3 tests passed | **PASS** |
| **RolesGuard Tests** | Vitest (`roles.guard.spec.ts`) | 7/7 tests passed (chặn 403 cho non-SYSTEM_ADMIN) | **PASS** |
| **Regression Auth Tests** | Vitest (`otp.service.spec.ts`, `health`) | 5/5 tests passed | **PASS** |
| **Live API: 401 Unauthorized** | HTTP Fetch (Không token, Token sai) | Trả về đúng 401 Unauthorized | **PASS** |
| **Live API: 403 Forbidden** | HTTP Fetch (Token role PARENT) | Trả về đúng 403 Forbidden | **PASS** |
| **Live API: Empty List** | HTTP Fetch `GET /schools` | Trả về `{ items: [], meta: { ... totalItems: 0 } }` | **PASS** |
| **Live API: Pagination & Search** | HTTP Fetch `GET /schools?search=...` | Tìm kiếm không phân biệt hoa thường hoạt động chính xác | **PASS** |
| **Live API: Filter Status** | HTTP Fetch `GET /schools?status=...` | Lọc ACTIVE / INACTIVE hoạt động chính xác | **PASS** |
| **Live API: Detail Formats** | HTTP Fetch `GET /schools/:id` | JSON Object `weeklySchedule`, Dates `YYYY-MM-DD` | **PASS** |
| **Live API: Soft Deactivation** | HTTP Fetch `PATCH /schools/:id/status` | `isActive = false`, xem lại qua GET vẫn bình thường | **PASS** |
| **Live API: Idempotency** | HTTP Fetch `PATCH` cùng trạng thái | Trả về kết quả thành công ngay không ghi DB | **PASS** |
| **Live API: Contract Validation** | HTTP Fetch `PATCH` kích hoạt khi hết hạn | Bị từ chối `400 Bad Request` chính xác | **PASS** |
| **Live API: Swagger JSON** | HTTP Fetch `/api/docs-json` | Đầy đủ 3 routes và 6 DTO schemas | **PASS** |
| **Live API: Swagger HTML** | HTTP curl `/api/docs/` | Trả về HTTP 200 OK | **PASS** |
| **Swagger UI Headless Browser** | Browser Subagent | Playwright binary download failed on system CDN | **NOT VERIFIED (Browser only)** |

---

## H. Data Safety & Integrity
- **Kiểm thử trên Live API**: Sử dụng fixture trường học tạm thời trong quá trình chạy script kiểm thử và đã được xóa sạch hoàn toàn khỏi cơ sở dữ liệu sau khi hoàn thành.
- **Bảo toàn dữ liệu thật**: 4 Users (bao gồm tài khoản `SYSTEM_ADMIN` và các tài khoản `PARENT`), 13 Sessions, 8 OtpChallenges được bảo toàn nguyên vẹn 100%.

---

## I. Files Changed in Task 2
### Added
- `api/src/auth/decorators/roles.decorator.ts`
- `api/src/auth/roles.guard.ts`
- `api/src/auth/roles.guard.spec.ts`
- `api/src/schools/schools.module.ts`
- `api/src/schools/schools.controller.ts`
- `api/src/schools/schools.controller.spec.ts`
- `api/src/schools/schools.service.ts`
- `api/src/schools/schools.service.spec.ts`
- `api/src/schools/dto/index.ts`
- `api/src/schools/dto/list-schools-query.dto.ts`
- `api/src/schools/dto/update-school-status.dto.ts`
- `api/src/schools/dto/school-response.dto.ts`

### Modified
- `api/src/app.module.ts` (Import và đăng ký `SchoolsModule`)
- `api/src/auth/auth.module.ts` (Đăng ký và export `RolesGuard`)
- `api/src/main.ts` (Bổ sung tag `Schools` vào Swagger)
- `docs/ai-review/LATEST.diff` (Chứa diff scoped của Task 2)
- `docs/ai-review/LATEST.md` (Báo cáo nghiệm thu Task 2)

### Cleaned Up
- `api/verify_schools_live.mjs` (Script kiểm thử tích hợp HTTP tạm thời đã được dọn sạch hoàn toàn)

---

## J. Issues & Limitations
- **Không có Blocker**: Mọi nghiệp vụ trong phạm vi 3 API đều hoạt động ổn định và đáp ứng 100% tiêu chí chất lượng.
- **Hoãn triển khai đúng kế hoạch (Deferred Logic)**:
  - `POST /api/v1/schools` (Tạo trường học): Hoãn tới Task 4 để tích hợp trọn vẹn với Cloudinary Multipart Upload theo phân bổ kế hoạch của PO.
  - Tích hợp VietMap: Hoãn tới Task 3.
  - Quản lý nhân viên trường học (`GET/POST /schools/:id/employees`): Hoãn tới Task 5.

---

## K. Reviewer Focus Areas
Kính đề nghị Product Owner kiểm tra kỹ các điểm trọng yếu sau:
1. **Phân quyền Role**: Chặn 401 khi thiếu/sai token, chặn 403 khi role không phải `SYSTEM_ADMIN`.
2. **Hiệu năng truy vấn**: Sử dụng phân trang và đếm tại DB, tính `employeeCount` qua `_count` loại bỏ triệt để N+1 query.
3. **Kiểm tra thời hạn hợp đồng**: So sánh ngày theo chuỗi `YYYY-MM-DD` tại múi giờ Việt Nam, chặn tái kích hoạt trường khi hợp đồng đã hết hạn hoặc chưa bắt đầu.
4. **Phạm vi nghiêm ngặt**: Tuyệt đối không triển khai `POST /schools` trước hạn.

---

## L. Next Step Proposal
Đề xuất duy nhất một bước tiếp theo theo Implementation Plan đã phê duyệt:

> **TASK 3 — VIETMAP INTEGRATION BACKEND SERVICE**  
> Triển khai `VietmapService` và Controller Proxy (`/api/v1/vietmap/autocomplete`, `/api/v1/vietmap/place`, `/api/v1/vietmap/reverse`) sử dụng VietMap API v4, bảo mật `VIETMAP_API_KEY` phía backend, xử lý timeout và lỗi mất kết nối.

*(Tuyệt đối không tự ý thực hiện Task 3 cho đến khi có sự phê duyệt chính thức từ Product Owner).*

---

## M. Approval Status
**`WAITING FOR PRODUCT OWNER APPROVAL`**
