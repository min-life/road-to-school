# RoadToSchool — AI Review Report
# Phân hệ: School Management — Stage B: Implementation
# Task 4: Cloudinary Image Storage & Create School API

> **Thời gian báo cáo**: 22/10/2026 23:05  
> **Người thực hiện**: Senior NestJS Backend Engineer  
> **Trạng thái**: Hoàn thành Task 4 — Chờ Product Owner xét duyệt  
> **Diff Task-scoped**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)

---

## A. Task Information
- **Task ID**: `TASK 4`
- **Tên Task**: `CLOUDINARY IMAGE STORAGE & CREATE SCHOOL API`
- **Phạm vi (Strict Scope)**:
  - Triển khai duy nhất một endpoint: `POST /api/v1/schools` tiếp nhận dữ liệu `multipart/form-data`.
  - Phân quyền nghiêm ngặt chỉ vai trò `SYSTEM_ADMIN` được phép tạo trường học.
  - Tích hợp `CloudinaryService` phục vụ upload ảnh cổng trường tùy chọn (stream upload server-side, folder `roadtoschool/schools/`, tối đa 5 MB, định dạng JPEG/PNG/WebP, kiểm tra magic bytes).
  - Áp dụng quyết định chính thức của Product Owner: **Chấp nhận ảnh mồ côi nếu DB insert thất bại, tuyệt đối không triển khai rollback destroy bắt buộc**.
  - Cho phép tạo trường học bình thường khi không gửi ảnh, không yêu cầu Cloudinary credentials nếu không có ảnh.
  - Validate toàn bộ các trường thông tin: `name`, `addressText`, `latitude`, `longitude`, `contractStartDate`, `contractEndDate`, và `weeklySchedule` (PostgreSQL JSONB).
  - Viết bộ test tự động đầy đủ (Unit Tests, DTO Validation Tests, Schedule Validator Tests, Cloudinary Tests, và Live API Integration Tests).
  - Đồng bộ Swagger/OpenAPI tiếng Việt đầy đủ tại `http://localhost:3000/api/docs`.
  - **Giới hạn nghiêm ngặt**:
    - KHÔNG thay đổi Prisma Schema, không tạo Migration mới.
    - KHÔNG tạo bảng School Image hay bảng School Schedule riêng.
    - KHÔNG tạo General Media Module hay Message Queue/Retry Job.
    - KHÔNG sửa Web UI hay Mobile.
    - KHÔNG triển khai Task 5 (quản lý nhân viên trường học).
- **Trạng thái**: `COMPLETED (ALL QUALITY GATES PASSED)`

---

## B. Approved Context Baseline
1. **Task 1 Database Baseline**: Bảng `schools` (13 cột, PostgreSQL JSONB `weekly_schedule`, Date columns `@db.Date`) và trường `users.school_id` nullable với khóa ngoại `onDelete: Restrict`.
2. **Task 2 School APIs**: 3 APIs đã hoàn thành (`GET /schools`, `GET /schools/:id`, `PATCH /schools/:id/status`) hoạt động ổn định và giữ nguyên hành vi.
3. **Task 3 VietMap Integration**: Kiến trúc Browser-First Direct Integration đã được tích hợp trên Frontend (`web/src/lib/vietmap/`), Backend không tạo proxy trung gian.
4. **Final Cloudinary Policy (PO Approved)**:
   - Ảnh trường học là **tùy chọn (Optional)**.
   - Khi không gửi ảnh: Không gọi Cloudinary, không yêu cầu cấu hình Cloudinary credentials, `imageUrl = null`, `imagePublicId = null`.
   - Khi có ảnh: Upload stream server-side lên Cloudinary. Nếu Cloudinary upload thành công nhưng sau đó Prisma insert thất bại, chấp nhận khả năng tồn tại ảnh mồ côi, không gọi `cloudinary.uploader.destroy()` rollback để giữ mã nguồn đơn giản.

---

## C. Implementation Details

### 1. Dependency & Module Registration
- Được Product Owner phê duyệt cài đặt:
  - `cloudinary` (`^2.5.1`): Official Cloudinary Node.js SDK v2.
  - `@types/multer` (`^1.4.12` devDependency): Type definitions cho `Express.Multer.File`.
- Bổ sung `"multer"` vào `"types"` trong `api/tsconfig.json` để đồng bộ namespace `Express.Multer.File`.
- Đăng ký `CloudinaryService` vào `SchoolsModule` (`providers` và `exports`).

### 2. DTO & Validation Pipeline (`CreateSchoolDto`)
- Tệp: `api/src/schools/dto/create-school.dto.ts`
- Sử dụng `@Transform` và `class-validator` xử lý dữ liệu multipart:
  - `name`: `@Transform(trim)`, `@IsNotEmpty`, `@IsString`, `@MinLength(2)`.
  - `addressText`: `@Transform(trim)`, `@IsNotEmpty`, `@IsString`, `@MinLength(5)`.
  - `latitude`: `@Transform` xử lý chuỗi rỗng thành `NaN`, `@IsNumber`, `@Min(-90)`, `@Max(90)`.
  - `longitude`: `@Transform` xử lý chuỗi rỗng thành `NaN`, `@IsNumber`, `@Min(-180)`, `@Max(180)`.
  - `contractStartDate` & `contractEndDate`: Custom decorator `@IsCalendarDate` kiểm tra định dạng `YYYY-MM-DD` và ngày thực tế (loại bỏ `2026-02-30`).
  - `weeklySchedule`: `@IsNotEmpty`.
  - `image`: `@IsOptional` cho phép Swagger hiển thị trường nhị phân mà không bị `ValidationPipe` (chế độ `forbidNonWhitelisted: true`) chặn.

### 3. Controller (`SchoolsController.create`)
- Tệp: `api/src/schools/schools.controller.ts`
- Route: `@Post()` trên đường dẫn chung `/api/v1/schools`.
- `@UseInterceptors(FileInterceptor('image'))`: Tiếp nhận file ảnh từ trường `image`.
- `@ApiConsumes('multipart/form-data')`: Khai báo OpenAPI chuẩn cho form multipart.
- `@ApiBody(...)`: Mô tả chi tiết từng thuộc tính văn bản và file nhị phân bằng tiếng Việt.
- `@UseGuards(AuthGuard, RolesGuard)` và `@Roles(Role.SYSTEM_ADMIN)`: Kế thừa từ cấp Controller, bảo vệ tuyệt đối route tạo trường.

### 4. Service (`SchoolsService.create`)
- Tệp: `api/src/schools/schools.service.ts`
- Quy trình thực thi:
  1. Kiểm tra thứ tự ngày hợp đồng: `contractEndDate >= contractStartDate`. Nếu sai, ném `BadRequestException`.
  2. Xác thực và parse cấu trúc lịch học tuần qua `validateWeeklySchedule`.
  3. Xử lý ảnh:
     - Nếu có file: Kiểm tra kích thước `<= 5 MB`, MIME type (`image/jpeg`, `image/png`, `image/webp`), và magic bytes (`validateImageMagicBytes`). Gọi `cloudinaryService.uploadSchoolImage` lấy `secureUrl` và `publicId`.
     - Nếu không có file: `imageUrl = null`, `imagePublicId = null`.
  4. Thực hiện lệnh `prisma.school.create`: Lưu toàn bộ thông tin với `isActive = true`.
  5. Trả về kết quả định dạng `SchoolDetailResponseDto` với ngày hợp đồng định dạng `YYYY-MM-DD`, `employeeCount = 0`.

---

## D. Business Validation Matrix

| Trường dữ liệu | Quy tắc kiểm tra | Kết quả vi phạm |
|---|---|---|
| **name** | Chuỗi ký tự, trim khoảng trắng, tối thiểu 2 ký tự, không nhận rỗng | `400 Bad Request` ("Tên trường học phải có ít nhất 2 ký tự") |
| **addressText** | Chuỗi ký tự, trim khoảng trắng, tối thiểu 5 ký tự, không nhận rỗng | `400 Bad Request` ("Địa chỉ trường học phải có ít nhất 5 ký tự") |
| **latitude** | Chuyển đổi thành số, giới hạn trong khoảng `[-90, 90]`, không nhận NaN/chuỗi rỗng | `400 Bad Request` ("Vĩ độ (latitude) phải nằm trong khoảng từ -90 đến 90") |
| **longitude** | Chuyển đổi thành số, giới hạn trong khoảng `[-180, 180]`, không nhận NaN/chuỗi rỗng | `400 Bad Request` ("Kinh độ (longitude) phải nằm trong khoảng từ -180 đến 180") |
| **contractStartDate** | Định dạng `YYYY-MM-DD`, ngày lịch có thật (không nhận 2026-02-30) | `400 Bad Request` ("Ngày bắt đầu hợp đồng không hợp lệ hoặc sai định dạng YYYY-MM-DD") |
| **contractEndDate** | Định dạng `YYYY-MM-DD`, ngày lịch có thật, `>= contractStartDate` | `400 Bad Request` ("Ngày kết thúc hợp đồng phải lớn hơn hoặc bằng ngày bắt đầu") |
| **weeklySchedule** | Chuỗi JSON Object hợp lệ, ít nhất 1 ngày, chỉ chứa khóa `monday..sunday`, mỗi ngày có `start` và `end` 24h (`HH:mm`), `start < end` | `400 Bad Request` ("Giờ kết thúc học phải lớn hơn giờ bắt đầu học" hoặc lỗi tương ứng) |
| **image** | Tùy chọn, tối đa 5 MB, MIME JPEG/PNG/WebP, kiểm tra magic bytes thực tế | `400 Bad Request` ("Kích thước ảnh vượt quá giới hạn" / "Định dạng ảnh không được hỗ trợ" / "Nội dung tệp ảnh không đúng với định dạng") |

---

## E. Cloudinary Storage Implementation
- **Cấu hình**: Khởi tạo an toàn qua `ConfigService`. Nếu thiếu `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, hệ thống ghi log cảnh báo và đánh dấu `isConfigured = false`. Hệ thống **không bị crash** khi chạy local thiếu credentials nếu người dùng chỉ tạo trường không ảnh.
- **Upload Flow**: Sử dụng `upload_stream` với buffer từ Multer qua `Readable.from(buffer)` (chuẩn Node.js Stream, không dùng thư viện ngoài).
- **Public ID**: Định dạng `school_${Date.now()}_${randomHex}` trong thư mục `roadtoschool/schools`.
- **Xử lý thiếu cấu hình**: Nếu người dùng gửi ảnh nhưng Cloudinary chưa cấu hình, trả về `503 Service Unavailable` ("Dịch vụ lưu trữ ảnh Cloudinary chưa được cấu hình trên hệ thống").
- **Chính sách ảnh mồ côi (Accepted Orphan Images)**: Đúng theo chỉ thị của Product Owner, không có bất kỳ lệnh gọi `cloudinary.uploader.destroy()` hay hàng đợi dọn dẹp nào được thêm vào codebase. Giữ code tối giản tuyệt đối.

---

## F. API Contract Specification

### `POST /api/v1/schools`
- **Content-Type**: `multipart/form-data`
- **Authorization**: Bearer JWT (`SYSTEM_ADMIN` only)
- **Form Fields**:
  - `name`: string (bắt buộc)
  - `addressText`: string (bắt buộc)
  - `latitude`: string dạng số (bắt buộc)
  - `longitude`: string dạng số (bắt buộc)
  - `contractStartDate`: string `YYYY-MM-DD` (bắt buộc)
  - `contractEndDate`: string `YYYY-MM-DD` (bắt buộc)
  - `weeklySchedule`: string JSON Object (bắt buộc)
  - `image`: binary file (tùy chọn)
- **Response `201 Created`**:
  ```json
  {
    "id": "006b31a0-c809-4dac-934b-eb8634e1ca52",
    "name": "Trường Tiểu học Thực Nghiệm",
    "addressText": "Số 50 Phố Liễu Giai, Cống Vị, Ba Đình, Hà Nội",
    "latitude": 21.037562,
    "longitude": 105.814231,
    "imageUrl": null,
    "imagePublicId": null,
    "contractStartDate": "2026-09-01",
    "contractEndDate": "2027-08-31",
    "weeklySchedule": {
      "monday": { "start": "07:15", "end": "17:00" },
      "tuesday": { "start": "07:15", "end": "17:00" }
    },
    "isActive": true,
    "createdAt": "2026-10-22T15:58:47.000Z",
    "updatedAt": "2026-10-22T15:58:47.000Z",
    "employeeCount": 0
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Dữ liệu validation không hợp lệ.
  - `401 Unauthorized`: Thiếu token, token sai hoặc phiên bị thu hồi.
  - `403 Forbidden`: Người dùng không có vai trò `SYSTEM_ADMIN`.
  - `502 Bad Gateway`: Lỗi kết nối hoặc upload thất bại từ Cloudinary.
  - `503 Service Unavailable`: Dịch vụ Cloudinary chưa cấu hình khi có request upload ảnh.

---

## G. Database Queries & Efficiency
- **Thao tác tạo trường**: Chính xác **1 câu lệnh SQL duy nhất** (`INSERT INTO "schools" ...`) thông qua `prisma.school.create`.
- **Không truy vấn phụ**: Không kiểm tra trùng tên trường (theo yêu cầu PO không tạo School Code hay Unique Constraint theo tên), không sinh thêm giao dịch phức tạp.
- **Bảng truy cập**: Bảng `schools`.
- **Tương thích Schema**: 100% khớp với cấu trúc bảng `schools` đã tạo ở Task 1. Không phát sinh migration hay sửa đổi schema.

---

## H. Testing & Quality Gates

| Hạng mục kiểm thử | Công cụ / Phương thức | Kết quả | Trạng thái |
|---|---|---|:---:|
| **TypeScript Compilation** | `npm run build` trong `api/` | 0 errors | **PASS** |
| **All Automated Tests** | `npm test` trong `api/` (Vitest) | 8 test files, 69/69 tests passed (2.80s) | **PASS** |
| **ScheduleValidator Tests** | Vitest (`schedule.validator.spec.ts`) | 13/13 tests passed (ngày nhuận, 30/2, 24h regex, start>=end) | **PASS** |
| **CreateSchoolDto Tests** | Vitest (`create-school.dto.spec.ts`) | 9/9 tests passed (trim tên, tọa độ number, ngày lịch) | **PASS** |
| **CloudinaryService Tests** | Vitest (`cloudinary.service.spec.ts`) | 6/6 tests passed (missing config, stream upload, 502, timeout) | **PASS** |
| **SchoolsService.create Tests** | Vitest (`schools.service.spec.ts`) | 11/11 tests passed (no image, JPEG/PNG/WebP, magic bytes, 5MB limit, orphan policy) | **PASS** |
| **SchoolsController.create Tests** | Vitest (`schools.controller.spec.ts`) | 1/1 test passed (ủy quyền service chính xác) | **PASS** |
| **Live API: 401 Unauthorized** | HTTP POST `/schools` không có token | Trả về đúng 401 Unauthorized | **PASS** |
| **Live API: 403 Forbidden** | HTTP POST `/schools` với token `PARENT` | Trả về đúng 403 Forbidden | **PASS** |
| **Live API: 400 Invalid Date** | HTTP POST `/schools` với ngày 2026-02-30 | Bị chặn `400 Bad Request` chính xác | **PASS** |
| **Live API: 400 End < Start** | HTTP POST `/schools` với ngày kết thúc < bắt đầu | Bị chặn `400 Bad Request` chính xác | **PASS** |
| **Live API: 201 Created (No Image)** | HTTP POST `/schools` multipart form hợp lệ | Tạo thành công trường học, `imageUrl: null`, `isActive: true` | **PASS** |
| **Live API: Verification & Detail** | HTTP GET `/schools/:id` và GET `/schools?search=...` | Đọc lại dữ liệu đúng 100%, tìm thấy trong danh sách | **PASS** |
| **Live API: Database Cleanup** | Xóa trường test sau kiểm thử | Cơ sở dữ liệu sạch sẽ, không để lại rác | **PASS** |
| **Live Cloudinary Upload with Real Key**| HTTP multipart upload ảnh thật | Chưa cấu hình Cloudinary credentials thật trong môi trường dev | **NOT VERIFIED (No Live Cloudinary Key)** |
| **Swagger Synchronization** | HTTP GET `/api/docs-json` | Đầy đủ route `POST /schools`, `multipart/form-data`, responses 201, 400, 401, 403, 502, 503 | **PASS** |

---

## I. Existing System Regression
- **Web Frontend**: Chạy `npm test` trong `web/`: 14/14 tests pass, không bị ảnh hưởng.
- **Mobile App**: Không thay đổi bất kỳ tệp tin nào trong `mobile/`.
- **Authentication**: Các test đăng nhập và OTP challenges trong `api/` tiếp tục pass 100%.
- **Task 2 School APIs**: `GET /schools`, `GET /schools/:id`, `PATCH /schools/:id/status` giữ nguyên 100% logic và pass toàn bộ tests.
- **VietMap Integration**: Toàn bộ module `web/src/lib/vietmap/` giữ nguyên vẹn.

---

## J. Files Changed in Task 4

### Added
- `api/src/schools/cloudinary.service.ts`: Service upload ảnh server-side qua Cloudinary SDK với `upload_stream`.
- `api/src/schools/cloudinary.service.spec.ts`: 6 unit tests kiểm thử trạng thái cấu hình và ngoại lệ Cloudinary.
- `api/src/schools/schedule.validator.ts`: Hàm kiểm tra ngày lịch thực tế và chuẩn hóa lịch học tuần JSONB.
- `api/src/schools/schedule.validator.spec.ts`: 13 unit tests kiểm thử lịch học và ngày tháng.
- `api/src/schools/dto/create-school.dto.ts`: DTO tiếp nhận form tạo trường multipart kèm decorator `@IsCalendarDate`.
- `api/src/schools/create-school.dto.spec.ts`: 9 unit tests xác thực dữ liệu đầu vào.

### Modified
- `api/package.json`: Bổ sung dependency `cloudinary` (`^2.5.1`) và devDependency `@types/multer` (`^1.4.12`).
- `api/package-lock.json`: Cập nhật khóa dependencies.
- `api/tsconfig.json`: Bổ sung `"multer"` vào danh sách `"types"`.
- `api/src/schools/schools.controller.ts`: Bổ sung endpoint `POST /api/v1/schools` hỗ trợ multipart form và Swagger.
- `api/src/schools/schools.controller.spec.ts`: Bổ sung test kiểm thử `controller.create`.
- `api/src/schools/schools.service.ts`: Mở rộng phương thức `create` xử lý ngày hợp đồng, validate file ảnh (kích thước, MIME, magic bytes), tích hợp Cloudinary và lưu PostgreSQL.
- `api/src/schools/schools.service.spec.ts`: Bổ sung 11 unit tests kiểm thử toàn diện `create()`.
- `api/src/schools/schools.module.ts`: Đăng ký `CloudinaryService`.
- `api/src/schools/dto/index.ts`: Export `create-school.dto.js`.
- `docs/architecture/school-management-design.md`: Đồng bộ Mục 5.1 và Mục 9 (xóa yêu cầu rollback destroy, ghi nhận chấp nhận ảnh mồ côi).
- `docs/ai-review/LATEST.diff`: Task-scoped diff cho Task 4.
- `docs/ai-review/LATEST.md`: Báo cáo nghiệm thu Task 4.

---

## K. Issues, Limitations & Risk Analysis
1. **Thiếu Cloudinary Credentials thực tế**:
   - Hiện tại file `.env` chưa có `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
   - Hành vi thiếu cấu hình đã được xử lý an toàn: Tạo trường không ảnh vẫn hoạt động 100% bình thường; nếu người dùng cố gửi ảnh khi chưa có cấu hình, hệ thống trả về lỗi thân thiện `503 Service Unavailable` thay vì gây crash ứng dụng.
2. **Chấp nhận Ảnh mồ côi (Accepted Orphan Images)**:
   - Nếu Cloudinary upload thành công nhưng câu lệnh `prisma.school.create` sau đó gặp sự cố (ví dụ mất kết nối PostgreSQL), ảnh vẫn tồn tại trên Cloudinary. Đây là rủi ro đã được Product Owner phê duyệt chấp nhận để giữ mã nguồn tối giản.
3. **Giới hạn dung lượng**:
   - Dung lượng ảnh được giới hạn chặt chẽ ở mức 5 MB, kiểm tra định dạng và magic bytes trực tiếp trên RAM Buffer, bảo đảm an toàn cho tài nguyên server.

---

## L. Reviewer Focus Areas
Kính đề nghị Product Owner kiểm tra kỹ các điểm trọng tâm sau:
1. **Tạo trường không ảnh độc lập hoàn toàn với Cloudinary**: Đã kiểm chứng live thành công trên endpoint thật.
2. **Xác thực dữ liệu chặt chẽ**: Chặn ngày không có thật (2026-02-30), chặn ngày kết thúc nhỏ hơn ngày bắt đầu, chặn lịch học qua đêm (`start >= end`), chặn tệp giả mạo định dạng ảnh.
3. **Bảo mật tuyệt đối**: Không có Cloudinary Secrets nào bị lộ ra client, Swagger hay log response.
4. **Phân quyền Role**: Chặn 401 khi thiếu token, chặn 403 khi tài khoản `PARENT` truy cập.
5. **Đơn giản hóa mã nguồn**: Không xây dựng rollback framework, không sửa DB schema, không vi phạm phạm vi sang Task 5.

---

## M. Next Step Proposal
Theo đúng Implementation Plan đã được phê duyệt, đề xuất duy nhất một bước tiếp theo:

> **TASK 5 — SCHOOL EMPLOYEES & CREATE SCHOOL ADMIN APIs**  
> Xây dựng các API quản lý nhân sự trường học: `GET /api/v1/schools/:id/employees` (danh sách nhân viên kèm phân trang, tìm kiếm) và `POST /api/v1/schools/:id/employees` (khởi tạo tài khoản Quản trị trường `SCHOOL_ADMIN` với mật khẩu ngẫu nhiên an toàn, kiểm tra trường đang hoạt động).

*(Tuyệt đối dừng lại và không tự ý thực hiện Task 5 cho đến khi có sự phê duyệt chính thức từ Product Owner).*

---

## N. Approval Status
**`WAITING FOR PRODUCT OWNER APPROVAL`**
