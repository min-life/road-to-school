# RoadToSchool — Shared Admin Layout & School Management
# Technical Design & UI/UX Wireframes (Stage A — Final Approved Design)

> **Phân hệ**: Shared Admin Layout & System Admin School Management  
> **Giai đoạn**: Stage A — Business Analysis, Technical Design & Wireframes  
> **Trạng thái**: ĐÃ ĐƯỢC PRODUCT OWNER PHÊ DUYỆT CHÍNH THỨC (OFFICIALLY APPROVED WITH DECISIONS A–F)  
> **Quyết định PO**: Triển khai theo từng Task độc lập (Task 1: Database Schema & Migration).


---

## 1. Business Requirements & Role Permissions

### 1.1. Bối cảnh Nghiệp vụ (Business Context)
Hệ thống RoadToSchool vận hành theo mô hình đơn vị vận tải tập trung (1 nhà xe duy nhất hợp tác với nhiều trường học). Giai đoạn này tập trung vào việc quản lý thông tin các trường học đối tác và nhân sự quản lý trường học cấp cao nhất:
- **Nhà xe (SYSTEM_ADMIN)**: Là đơn vị sở hữu phương tiện, quản trị toàn hệ thống. Cần quản lý danh sách trường đối tác, địa điểm chính xác (kinh độ, vĩ độ) để làm cơ sở tính toán lộ trình đưa đón xe buýt, thời gian hợp đồng và khung giờ học tập trong tuần của từng trường.
- **Nhà trường (SCHOOL_ADMIN)**: Là đại diện ban giám hiệu/quản trị trường học. Cần đăng nhập vào Cổng Quản trị để theo dõi học sinh và giáo viên giám sát xe (Bus Attendant) của trường mình.

### 1.2. Ma trận Phân quyền (Role-Based Permissions)
Cả hai vai trò đều sử dụng chung một cấu trúc **Shared Admin Layout** trên nền tảng Web, nhưng phân quyền nội dung nghiêm ngặt:

| Tính năng / Màn hình | SYSTEM_ADMIN (Nhà xe) | SCHOOL_ADMIN (Trường học) | Ghi chú bảo mật |
|---|:---:|:---:|---|
| **Tổng quan (Overview)** | Xem (Nội dung trống) | Xem (Nội dung trống) | Layout chung, Main Content để trống ở giai đoạn này |
| **Danh sách Trường học** | Toàn quyền (Xem, Thêm, Chi tiết, Đổi trạng thái) | **CẤM TRUY CẬP** | Backend chặn 403 Forbidden |
| **Thêm trường học mới** | Toàn quyền (Form Modal) | **CẤM TRUY CẬP** | Backend chặn 403 Forbidden |
| **Xem chi tiết trường học** | Xem mọi trường trong hệ thống | **CẤM TRUY CẬP** | Giai đoạn này School Admin chưa xem trang quản lý trường |
| **Ngừng hoạt động trường** | Cho phép chuyển đổi `isActive` | **CẤM TRUY CẬP** | Backend chặn 403 Forbidden |
| **Xem nhân viên trường** | Xem danh sách nhân viên mọi trường | **CẤM TRUY CẬP** | Tab trong School Detail |
| **Tạo School Admin** | Cho phép tạo tài khoản quản trị trường | **CẤM TRUY CẬP** | Backend chặn 403 Forbidden |
| **Cài đặt & Đăng xuất** | Cho phép | Cho phép | Xem thông tin cá nhân & Đăng xuất phiên |

---

## 2. Database Schema Design (Prisma Specification)

Để đáp ứng tối giản, hiệu quả và kế thừa 100% cấu trúc Phase 1:
1. Tạo duy nhất **1 bảng mới**: `School` (`schools`).
2. Bổ sung trường `schoolId String?` vào bảng `User` (`users`) hiện có.
3. Không tạo bảng riêng cho Lịch học (dùng PostgreSQL `JSONB`).
4. Không tạo bảng riêng cho Ảnh trường (lưu trữ metadata Cloudinary trực tiếp trên `School`).

```prisma
// ==========================================
// MODELS PROPOSAL FOR STAGE A
// ==========================================

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

  // Quan hệ: 1 Trường có nhiều Người dùng (Nhân viên)
  users             User[]

  @@index([name])
  @@index([isActive])
  @@map("schools")
}

/// Cập nhật bảng User hiện có: bổ sung schoolId
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

  // Foreign Key liên kết trường học (Nullable)
  schoolId     String?   @map("school_id")
  school       School?   @relation(fields: [schoolId], references: [id], onDelete: Restrict)

  // Relationships Phase 1
  sessions      Session[]
  otpChallenges OtpChallenge[]

  @@index([schoolId])
  @@map("users")
}
```

### 2.1. Phân tích Ràng buộc & Toàn vẹn Dữ liệu (Integrity & Constraints)
- **`User.schoolId` (Nullable)**:
  - Chỉ áp dụng cho các vai trò trực thuộc trường: `SCHOOL_ADMIN` và `BUS_ATTENDANT`.
  - Các vai trò khác (`SYSTEM_ADMIN`, `DRIVER`, `PARENT`) luôn có `schoolId = null`.
  - Một nhân viên chỉ thuộc **tối đa 1 trường học** tại một thời điểm (`School 1 — N User`).
- **`onDelete: Restrict`**:
  - Quy tắc nghiệp vụ cấm xóa cứng (Hard Delete) trường học và chỉ cho phép chuyển trạng thái hoạt động (`isActive = false`).
  - Đặt `onDelete: Restrict` ở cấp cơ sở dữ liệu nhằm bảo vệ tính toàn vẹn quan hệ, ngăn chặn bất kỳ thao tác xóa trực tiếp nào ngoài ứng dụng nếu School vẫn còn Users liên kết. Không tạo API xóa trường.
- **Trường ngày tháng Hợp đồng (`@db.Date`)**:
  - Lưu trữ dưới dạng Date thuần túy (`YYYY-MM-DD`), không chứa thông tin giờ/phút/giây, tránh sai lệch múi giờ (Timezone Drift).
  - Ràng buộc ứng dụng: `contractEndDate >= contractStartDate`.
- **Chính sách Độc lập của `School.isActive`**:
  - Khi một trường bị chuyển thành `isActive = false`:
    - Dữ liệu trường giữ nguyên 100%.
    - Tài khoản `User` liên kết và các phiên đăng nhập `Session` **KHÔNG** bị xóa hoặc tự động chuyển thành inactive.
    - Chặn hành động tạo thêm nhân viên mới (`SCHOOL_ADMIN`) cho trường đang ngừng hoạt động.

---

## 3. Weekly Schedule Specification (PostgreSQL JSONB)

### 3.1. Cấu trúc Dữ liệu JSONB
Thay vì tạo bảng `SchoolSchedule` gây phức tạp hóa truy vấn (JOIN table), lịch học tuần được lưu trực tiếp dưới dạng JSONB trong cột `weekly_schedule`:

```json
{
  "monday": {
    "start": "07:00",
    "end": "17:30"
  },
  "tuesday": {
    "start": "07:00",
    "end": "17:30"
  },
  "wednesday": {
    "start": "07:00",
    "end": "17:30"
  },
  "thursday": {
    "start": "07:00",
    "end": "17:30"
  },
  "friday": {
    "start": "07:00",
    "end": "17:30"
  },
  "saturday": {
    "start": "07:30",
    "end": "11:30"
  }
}
```

### 3.2. Quy tắc Xác thực (Validation Rules)
1. **Khóa thứ trong tuần (Day Keys)**: Chỉ chấp nhận tập con của 7 ngày: `["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]`.
2. **Ngày nghỉ**: Ngày không có lịch học được loại bỏ hoàn toàn khỏi object (không lưu `{ "sunday": null }` hay `{ "sunday": {} }`).
3. **Số ngày tối thiểu**: Phải có **ít nhất 1 ngày học** trong tuần.
4. **Định dạng giờ**: `start` và `end` bắt buộc tuân theo định dạng 24 giờ `HH:mm` (Regex: `^([01]\d|2[0-3]):[0-5]\d$`).
5. **Ràng buộc thời gian**: `end` phải luôn lớn hơn `start` (ví dụ: `17:30` > `07:00`). Không hỗ trợ lịch học qua đêm (Overnight Schedule).
6. **Thuật ngữ nghiệp vụ chuẩn xác**: Bắt buộc sử dụng thuật ngữ **"Giờ bắt đầu học"** (`start`) và **"Giờ kết thúc học"** (`end`). Tuyệt đối không dùng các thuật ngữ vận tải như "Giờ xe xuất phát", "Giờ đón sáng", "Giờ đưa đón", "Giờ trả học sinh" vì đây chỉ là khung thời gian học tập của trường.
7. **Lựa chọn ngày học**: Người dùng phải tự chọn các ngày học thực tế của trường. Không tự ý cấu hình bật mặc định Thứ 2–Thứ 7 để lưu dữ liệu giả lập vào cơ sở dữ liệu.

---

## 4. VietMap Integration Technical Design (Browser-First Direct Architecture)

### 4.1. Kiến trúc Tích hợp: Browser-First Direct Integration
Theo quyết định phê duyệt mới nhất của Product Owner, đối với các API đơn giản phục vụ trực tiếp trải nghiệm bản đồ (UI/UX), hệ thống ưu tiên mô hình **Browser-First Direct Integration** (Web Frontend gọi trực tiếp VietMap API) thay vì bắt buộc đi qua NestJS Backend Proxy:

```
[ Frontend Browser ] ──(NEXT_PUBLIC_VIETMAP_SERVICES_KEY)──> [ VietMap Services v4 ]
        │ (Autocomplete v4, Place v4, Reverse v4)
        │
        └──────────(NEXT_PUBLIC_VIETMAP_TILEMAP_KEY)────────> [ VietMap Vector Tiles ]
```

- **Lý do ưu tiên Gọi trực tiếp (Direct Calls)**:
  - **Giảm chặng mạng trung gian**: Loại bỏ 1 chặng request (Browser → Backend → VietMap → Backend → Browser), giảm tải CPU và băng thông mạng cho NestJS Backend.
  - **Tăng độ phản hồi bản đồ (Responsiveness)**: Trải nghiệm tìm kiếm địa chỉ dạng Autocomplete cần phản hồi mượt mà theo từng thao tác gõ phím của người dùng.
  - **Tối giản mã nguồn**: Giảm bớt số lượng API proxy trung gian phải xây dựng và bảo trì ở Backend khi bản thân VietMap API đã hỗ trợ CORS đầy đủ.
- **Phân định Trách nhiệm (Separation of Concerns)**:
  - **Web Frontend**: Quản lý tương tác UI bản đồ, tìm kiếm Autocomplete v4, lấy tọa độ Place v4, tra cứu địa chỉ Reverse v4 và render Map Tiles.
  - **NestJS Backend**: Quản lý toàn bộ nghiệp vụ cốt lõi: Xác thực (Auth), Phân quyền (Roles), Quản lý trường học (School CRUD & Status), Quản lý nhân viên (Employees), Lưu trữ ảnh Cloudinary và toàn vẹn cơ sở dữ liệu PostgreSQL. Backend không lưu cache tìm kiếm tạm thời.
  - **Nguyên tắc Thẩm định Tọa độ**: Backend luôn thẩm định độc lập dữ liệu đầu vào (`latitude`, `longitude`, `addressText`) khi tạo trường; không tin tưởng mặc định tọa độ chỉ vì chúng đến từ client.

### 4.2. Cổng Đánh giá Khả thi & An toàn (Security & CORS Feasibility Gate)
Kiểm chứng thực tế kỹ thuật đối với VietMap API v4:
1. **Kiểm tra CORS**: **ĐÃ XÁC MINH (PASS)**. Cả 3 endpoints Autocomplete v4, Place v4 và Reverse v4 đều phản hồi HTTP preflight `OPTIONS` với header `Access-Control-Allow-Origin: *` và `Access-Control-Allow-Headers: *`. Trình duyệt web có thể gọi trực tiếp hoàn toàn hợp lệ mà không bị chặn CORS.
2. **Cơ chế Bảo vệ API Key trong VietMap Console**:
   - VietMap Console (`https://maps.vietmap.vn/console-v2/`) cung cấp tính năng bảo mật độc lập cho từng API Key:
     - **Giới hạn Domain (Domain Restrictions / HTTP Referer)**: Chỉ cho phép các request xuất phát từ domain được chỉ định (ví dụ: `*.roadtoschool.vn`, `http://localhost:5173`).
     - **Giới hạn Tính năng (API Feature Restriction)**: Chỉ bật tính năng `Autocomplete`, `Place` và `Reverse`; tắt bỏ toàn bộ các API nặng khác như `Routing`, `Matrix`, `TSP`.
     - **Giới hạn Hạn ngạch (Quota / Rate Limiting)**: Thiết lập ngưỡng số lượt request tối đa trên mỗi key hoặc mỗi IP để ngăn chặn nguy cơ lạm dụng.
3. **Phân tách Khóa Truy cập (Credentials)**:
   - **`NEXT_PUBLIC_VIETMAP_SERVICES_KEY`**: Dùng cho Web Frontend thực hiện Autocomplete, Place Details, Reverse Geocoding. Khóa này BẮT BUỘC được cấu hình Domain Restriction và Feature Restriction trong VietMap Console.
   - **`NEXT_PUBLIC_VIETMAP_TILEMAP_KEY`**: Dùng cho Web Frontend tải Map Tiles vector. Khóa này cấu hình Domain Restriction tương ứng.
   - **Lưu ý bảo mật quan trọng**: Biến `NEXT_PUBLIC_` trên trình duyệt không được coi là tuyệt mật vì luôn có thể quan sát qua Network Panel. Do đó, các biện pháp giới hạn Domain và Hạn ngạch trong VietMap Console là chốt chặn bảo mật bắt buộc. Nếu chính sách bảo mật doanh nghiệp yêu cầu bảo mật 100% key khỏi tầm nhìn người dùng, hệ thống có thể chuyển sang Backend Proxy sau khi Product Owner phê duyệt.
4. **Chính sách Không Mock Dữ liệu**: Tuyệt đối **KHÔNG** tạo dữ liệu tọa độ hoặc địa chỉ giả lập. Nếu thiếu `NEXT_PUBLIC_VIETMAP_SERVICES_KEY`, client service ném lỗi rõ ràng (`MISSING_API_KEY`) để thông báo cho người dùng và cho phép nhập tọa độ hợp lệ thủ công.

### 4.3. Quy trình Xử lý VietMap ref_id (Ref ID Flow)
- **Định nghĩa `ref_id`**: Là chuỗi định danh tham chiếu opaque duy nhất do VietMap tạo ra cho từng địa điểm (bắt đầu bằng `auto:` hoặc `geocode:`).
- **Quy tắc bất biến**:
  - `ref_id` KHÔNG phải là ID trường học, không phải UUID của RoadToSchool.
  - Frontend nhận `ref_id` từ kết quả Autocomplete v4 và giữ nguyên vẹn 100% (không cắt bỏ prefix `auto:`, không decode, không tự sinh).
  - Truyền `ref_id` vào tham số `refid` của Place v4 để lấy tọa độ `lat`, `lng` và chuỗi địa chỉ định dạng đầy đủ.
  - `ref_id` KHÔNG lưu vào Database PostgreSQL. Bảng `schools` chỉ lưu `addressText`, `latitude`, `longitude`.

### 4.4. Các Dịch vụ VietMap API v4 Sử dụng Trực tiếp
1. **VietMap Autocomplete v4**:
   - Endpoint: `https://maps.vietmap.vn/api/autocomplete/v4?apikey={KEY}&text={QUERY}&display_type=5`
   - Gọi khi người dùng nhập địa chỉ vào ô tìm kiếm (sau khoảng debounce 300ms, độ dài text >= 2 ký tự). Hỗ trợ `focus=lat,lng` để ưu tiên kết quả gần vị trí hiện tại.
2. **VietMap Place Details v4**:
   - Endpoint: `https://maps.vietmap.vn/api/place/v4?apikey={KEY}&refid={REF_ID}`
   - Gọi ngay khi người dùng bấm chọn một gợi ý trong danh sách. Trả về tọa độ `lat`, `lng` chính xác để cập nhật ghim (Marker) và form nhập liệu.
3. **VietMap Reverse Geocoding v4**:
   - Endpoint: `https://maps.vietmap.vn/api/reverse/v4?apikey={KEY}&lat={LAT}&lng={LNG}&display_type=5`
   - Gọi khi người dùng click vào vị trí bất kỳ trên bản đồ hoặc di chuyển Marker. Trả về chuỗi địa chỉ gợi ý tương ứng mà vẫn bảo toàn tọa độ gốc do người dùng đã chọn.
4. **Hiển thị Bản đồ (Map Tiles)**:
   - Tải trực tiếp vector tiles từ VietMap thông qua `NEXT_PUBLIC_VIETMAP_TILEMAP_KEY` kết hợp thư viện hiển thị bản đồ trên Web.

### 4.5. Biến Môi trường Frontend (Web)
```env
NEXT_PUBLIC_VIETMAP_SERVICES_KEY=vietmap_browser_services_key_with_domain_restriction
NEXT_PUBLIC_VIETMAP_TILEMAP_KEY=vietmap_browser_tilemap_key_with_domain_restriction
```

---

## 5. Cloudinary School Image Storage Design

### 5.1. So sánh Kiến trúc Upload: Multipart Atomic vs Dedicated Upload
Product Owner yêu cầu phân tích lựa chọn giữa **Upload Endpoint riêng** và **Multipart Creation Endpoint**:

| Tiêu chí so sánh | Phương án 1: Multipart School Creation | Phương án 2: Dedicated Upload Endpoint |
|---|---|---|
| **Số lượng Request** | **1 Request duy nhất** (Gửi cả data form + file ảnh) | **2 Request** (1 request upload ảnh lấy URL, 1 request tạo trường) |
| **Rủi ro Ảnh mồ côi (Orphan Images)** | **Rất thấp**: Backend validate toàn bộ dữ liệu form trước; chỉ khi form hợp lệ mới upload lên Cloudinary. Nếu DB insert lỗi, hệ thống chấp nhận khả năng tồn tại ảnh mồ côi để giữ mã nguồn đơn giản, không triển khai rollback destroy bắt buộc. | **Cao**: Người dùng upload ảnh xong nhưng không bấm "Lưu", tắt trình duyệt hoặc form bị lỗi validation thì ảnh đã tồn tại vĩnh viễn trên Cloudinary. |
| **Độ phức tạp Frontend** | Đơn giản: Form lưu file object trong state, khi submit đóng gói vào `FormData`. | Phức tạp: Phải quản lý state upload ảnh riêng, state tạo trường riêng, rollback khi người dùng hủy. |
| **Trải nghiệm Người dùng** | Bấm 1 nút "Tạo trường", hiển thị spinner tiến trình cho cả thao tác. | Hiển thị 2 tiến trình tải riêng biệt. |
| **Đề xuất Kiến trúc** | **(ĐỀ XUẤT CHÍNH THỨC)**: Phù hợp nhất cho trường học. | Không cần thiết ở quy mô này. |

**Quyết định Kiến trúc**:
- Sử dụng phương án **Backend-controlled Multipart Creation** (`multipart/form-data`) cho `POST /api/v1/schools`.
- Khi người dùng chọn ảnh, Frontend chỉ đọc file vào bộ nhớ và tạo URL xem trước tạm thời (`URL.createObjectURL(file)`). Không gửi file lên server cho đến khi người dùng nhấn "Lưu trường học".

### 5.2. Luồng Xử lý Dữ liệu & Xử lý Ngoại lệ (Simple Upload Flow)
Quyết định chính thức của Product Owner: **Không cần xây dựng cơ chế dọn dẹp ảnh mồ côi phức tạp (No Mandatory Complex Cleanup)** để giữ mã nguồn đơn giản, dễ bảo trì:
```
[ Client Submit FormData ] 
          │ (name, address, lat, lng, dates, schedule JSON, file ảnh)
          ▼
[ Backend Auth & DTO Validation ] ── (Nếu dữ liệu sai) ──> Trả 400 Bad Request ngay (Chưa gọi Cloudinary)
          │
          ▼ (Dữ liệu hợp lệ)
[ Cloudinary Upload Stream ] ── (Nếu Cloudinary lỗi) ──> Trả 502/500 Lỗi tải ảnh, DB không bị tác động
          │
          ▼ (Nhận secure_url và public_id)
[ PostgreSQL Prisma Create School ]
          │
          ├── (Thành công) ──> Trả 201 Created kèm dữ liệu School
          │
          └── (Thất bại) ─────> Trả 500 Lỗi lưu cơ sở dữ liệu. Chấp nhận khả năng tồn tại ảnh mồ côi trên Cloudinary.
                                (Không xây dựng Cleanup Worker, Background Job, Retry Queue hay Distributed Transaction).
```

### 5.3. Tiêu chuẩn Kỹ thuật File Ảnh
- **Định dạng cho phép (MIME Types)**: `image/jpeg`, `image/png`, `image/webp`.
- **Dung lượng tối đa**: `5 MB` (5 * 1024 * 1024 bytes). Đủ sắc nét cho ảnh cổng trường hoặc khuôn viên, tránh quá tải băng thông.
- **Thư mục lưu trữ trên Cloudinary**: `roadtoschool/schools/`
- **Quy tắc đặt tên Public ID**: `school_${Date.now()}_${randomHex}` (tránh trùng lặp tên file gốc).
- **Biến môi trường Backend**:
  ```env
  CLOUDINARY_CLOUD_NAME=roadtoschool_cloud
  CLOUDINARY_API_KEY=cloudinary_api_key_here
  CLOUDINARY_API_SECRET=cloudinary_secret_key_here
  ```

---

## 6. Temporary Password Generation & Delivery

### 6.1. Quy trình Sinh Mật khẩu Tạm Đơn giản & An toàn
Khi `SYSTEM_ADMIN` tạo tài khoản `SCHOOL_ADMIN`:
1. Form trên giao diện **không có ô nhập mật khẩu**.
2. Backend tự động sinh chuỗi ký tự ngẫu nhiên an toàn bằng `node:crypto` (ví dụ: `crypto.randomBytes(9).toString('base64url')` hoặc 12 ký tự ngẫu nhiên). Không dùng `Math.random()`. Không cần xây dựng engine tổ hợp ký tự hay tính toán entropy phức tạp.
3. Backend băm mật khẩu bằng `bcrypt.hash(tempPassword, 10)`.
4. Lưu bản ghi `User` với `role: Role.SCHOOL_ADMIN`, `schoolId: school.id`, `passwordHash: hash`, `isActive: true`, `isVerified: true`.
5. Ràng buộc: Nếu trường học đang ngừng hoạt động (`School.isActive = false`), **CHẶN** hoàn toàn việc tạo mới `SCHOOL_ADMIN` (Trả lỗi 400 tiếng Việt).

### 6.2. Kênh Bàn giao Mật khẩu (Console Delivery in Development)
- **Trong môi trường Development**: Mật khẩu tạm được xuất duy nhất ra **Terminal Console Log** của Backend theo định dạng:
  ```
  [AUTH_DEV_CONSOLE] Đã khởi tạo tài khoản SCHOOL_ADMIN thành công:
    - Họ và tên:    Trần Văn Quản Lý
    - Định danh:    admin.thpt@school.edu.vn
    - Mật khẩu tạm: K8#mP2$xL9!v
    - Trường học:   Trường THPT Chuyên Hà Nội - Amsterdam (ID: uuid)
  ```
- **Quy tắc An toàn Nghiêm ngặt**:
  - Tuyệt đối **KHÔNG** trả mật khẩu tạm trong API Response body.
  - Tuyệt đối **KHÔNG** hiển thị mật khẩu tạm trên giao diện Web Frontend.
  - Tuyệt đối **KHÔNG** lưu mật khẩu tạm dạng plaintext trong Database.
  - Tuyệt đối **KHÔNG** đưa mật khẩu tạm vào các báo cáo AI Review hay Git commit diff.
  - Trong môi trường Production (sau này), log console này sẽ bị ngắt và thay thế bằng kênh Email/SMS đã cấu hình.

---

## 7. RESTful API Contracts Specification

### 7.1. Danh sách Trường học: `GET /api/v1/schools`
- **Mô tả**: Lấy danh sách các trường học đối tác có phân trang, hỗ trợ tìm kiếm theo tên và lọc theo trạng thái.
- **Quyền truy cập**: Bắt buộc `SYSTEM_ADMIN`.
- **Query Params**:
  - `page`: Số trang (mặc định: `1`, tối thiểu: `1`).
  - `limit`: Số bản ghi mỗi trang (mặc định: `10`, tối đa: `50`).
  - `search`: Từ khóa tìm kiếm theo tên trường (tùy chọn, chuỗi không phân biệt hoa thường).
  - `status`: Lọc theo trạng thái `ACTIVE` | `INACTIVE` (tùy chọn).
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "c1f8a847-75c1-4b36-a3d5-22e3914a8721",
        "name": "Trường Tiểu học Lê Quý Đôn",
        "addressText": "Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội",
        "latitude": 21.028511,
        "longitude": 105.772341,
        "imageUrl": "https://res.cloudinary.com/.../school_1.webp",
        "contractStartDate": "2026-09-01",
        "contractEndDate": "2027-08-31",
        "isActive": true,
        "createdAt": "2026-10-22T08:00:00.000Z",
        "employeeCount": 5
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "totalItems": 18,
      "totalPages": 2
    }
  }
  ```

### 7.2. Tạo Trường học mới: `POST /api/v1/schools`
- **Mô tả**: Tạo trường học mới kèm thông tin vị trí VietMap, thời hạn hợp đồng, lịch học JSONB và ảnh trường tùy chọn.
- **Quyền truy cập**: Bắt buộc `SYSTEM_ADMIN`.
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `name`: Tên trường (String, min 2 ký tự, required).
  - `addressText`: Địa chỉ chi tiết (String, min 5 ký tự, required).
  - `latitude`: Tọa độ vĩ độ (Float, -90 đến 90, required).
  - `longitude`: Tọa độ kinh độ (Float, -180 đến 180, required).
  - `contractStartDate`: Ngày bắt đầu hợp đồng (String `YYYY-MM-DD`, required).
  - `contractEndDate`: Ngày kết thúc hợp đồng (String `YYYY-MM-DD`, required, >= startDate).
  - `weeklySchedule`: Chuỗi JSON hợp lệ của Lịch học tuần (String JSON, required).
  - `image`: Tệp ảnh trường (File binary, optional, tối đa 5MB, JPEG/PNG/WebP).
- **Response `201 Created`**:
  ```json
  {
    "id": "c1f8a847-75c1-4b36-a3d5-22e3914a8721",
    "name": "Trường Tiểu học Lê Quý Đôn",
    "addressText": "Số 14 đường Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội",
    "latitude": 21.028511,
    "longitude": 105.772341,
    "imageUrl": "https://res.cloudinary.com/.../school_1.webp",
    "imagePublicId": "roadtoschool/schools/school_1730000_abc",
    "contractStartDate": "2026-09-01",
    "contractEndDate": "2027-08-31",
    "weeklySchedule": {
      "monday": { "start": "07:00", "end": "17:30" },
      "tuesday": { "start": "07:00", "end": "17:30" }
    },
    "isActive": true,
    "createdAt": "2026-10-22T08:00:00.000Z",
    "updatedAt": "2026-10-22T08:00:00.000Z"
  }
  ```
- **Error Cases**:
  - `400 Bad Request`: Thiếu trường bắt buộc, định dạng ngày sai, `endDate < startDate`, lịch học JSON không hợp lệ, ảnh quá 5MB hoặc sai định dạng.
  - `401 Unauthorized`: Chưa đăng nhập.
  - `403 Forbidden`: Không phải `SYSTEM_ADMIN`.

### 7.3. Xem Chi tiết Trường học: `GET /api/v1/schools/:id`
- **Mô tả**: Lấy đầy đủ thông tin chi tiết của 1 trường học theo ID.
- **Quyền truy cập**: Bắt buộc `SYSTEM_ADMIN`.
- **Response `200 OK`**: Trả về chi tiết trường kèm `weeklySchedule`, thông tin hợp đồng và thống kê số lượng nhân viên.
- **Error Cases**: `404 Not Found` nếu không tìm thấy trường.

### 7.4. Cập nhật Trạng thái Hoạt động Trường: `PATCH /api/v1/schools/:id/status`
- **Mô tả**: Bật hoặc tắt trạng thái hoạt động của trường (`isActive`).
- **Quyền truy cập**: Bắt buộc `SYSTEM_ADMIN`.
- **Request Body**:
  ```json
  {
    "isActive": false
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "id": "c1f8a847-75c1-4b36-a3d5-22e3914a8721",
    "isActive": false,
    "message": "Cập nhật trạng thái trường học thành công"
  }
  ```

### 7.5. Danh sách Nhân viên của Trường: `GET /api/v1/schools/:id/employees`
- **Mô tả**: Lấy danh sách nhân viên (`SCHOOL_ADMIN` và `BUS_ATTENDANT`) liên kết với trường học này.
- **Quyền truy cập**: Bắt buộc `SYSTEM_ADMIN`.
- **Query Params**:
  - `page`: Số trang (mặc định 1).
  - `limit`: Số bản ghi mỗi trang (mặc định 10).
  - `search`: Tìm theo họ tên, email hoặc số điện thoại.
  - `role`: Lọc theo vai trò (`SCHOOL_ADMIN` | `BUS_ATTENDANT`).
  - `status`: Lọc theo trạng thái tài khoản (`ACTIVE` | `INACTIVE`).
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "user-uuid-1",
        "fullName": "Trần Thị Lan",
        "email": "lan.tt@school.edu.vn",
        "phone": "0987654321",
        "role": "SCHOOL_ADMIN",
        "isActive": true,
        "createdAt": "2026-10-22T09:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "totalItems": 3,
      "totalPages": 1
    }
  }
  ```

### 7.6. Tạo School Admin: `POST /api/v1/schools/:id/employees`
- **Mô tả**: Khởi tạo tài khoản Quản trị viên trường học (`SCHOOL_ADMIN`) gắn với trường học chỉ định.
- **Quyền truy cập**: Bắt buộc `SYSTEM_ADMIN`.
- **Ràng buộc nghiệp vụ**:
  - Trường học phải đang ở trạng thái hoạt động (`isActive = true`). Nếu trường đang `INACTIVE`, trả về `400 Bad Request` ("Không thể tạo nhân viên cho trường học đang ngừng hoạt động").
  - Phải có ít nhất Email hoặc Số điện thoại.
  - Email/Số điện thoại chưa từng tồn tại trên hệ thống (kiểm tra unique).
- **Request Body**:
  ```json
  {
    "fullName": "Nguyễn Văn Hùng",
    "email": "hung.nv@school.edu.vn",
    "phone": "0912345678"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": "new-user-uuid",
    "fullName": "Nguyễn Văn Hùng",
    "email": "hung.nv@school.edu.vn",
    "phone": "0912345678",
    "role": "SCHOOL_ADMIN",
    "schoolId": "c1f8a847-75c1-4b36-a3d5-22e3914a8721",
    "isActive": true,
    "isVerified": true,
    "createdAt": "2026-10-22T10:00:00.000Z",
    "message": "Tạo tài khoản quản trị trường học thành công"
  }
  ```

### 7.7. VietMap Integration APIs (Browser-First Architecture)
Theo quyết định của Product Owner tại Task 3, các API bản đồ UI/UX đơn giản được gọi trực tiếp từ Web Frontend đến VietMap API v4 để giảm tải Backend và tăng tốc độ phản hồi:
1. `GET https://maps.vietmap.vn/api/autocomplete/v4?text={query}&display_type=5&apikey={SERVICES_KEY}`: Web Frontend gọi trực tiếp để lấy danh sách gợi ý kèm `ref_id`.
2. `GET https://maps.vietmap.vn/api/place/v4?refid={ref_id}&apikey={SERVICES_KEY}`: Web Frontend gọi trực tiếp với `refid` chính xác từ Autocomplete để lấy tọa độ `lat`, `lng` và địa chỉ chi tiết.
3. `GET https://maps.vietmap.vn/api/reverse/v4?lat={lat}&lng={lng}&display_type=5&apikey={SERVICES_KEY}`: Web Frontend gọi trực tiếp để lấy gợi ý địa chỉ khi kéo ghim / click bản đồ.
*(Lưu ý: Không tạo API Proxy trung gian qua NestJS trừ khi có yêu cầu bảo mật đặc biệt từ Product Owner. Backend chỉ nhận và validate tọa độ cuối cùng khi `SYSTEM_ADMIN` gửi form `POST /schools`)*.

---

## 8. UI/UX Wireframes Specification (W1–W8)

Tuân thủ triệt để nguyên tắc **Minimal UI Copy**: Không thêm các đoạn văn mô tả thừa thãi; sử dụng phân cấp trực quan, biểu tượng và bảng màu chuẩn RoadToSchool (`#FFCB56`, `#FFFDF6`, `#1E293B`, `#FFFFFF`).

### W1 — Shared Admin Layout
- **Vị trí**: Bao bọc toàn bộ các trang quản trị (`web/src/app/admin/layout.tsx`).
- **Thành phần**:
  - **Top Header**: Logo xe buýt RoadToSchool, tên hệ thống, Avatar người dùng với chữ cái đầu, Họ tên, Huy hiệu Vai trò (`Quản trị hệ thống` / `Quản trị trường học`), Nút Đăng xuất có xác nhận.
  - **Left Sidebar**:
    - Mục chung: `Tổng quan` (Icon Dashboard).
    - Mục chỉ dành cho `SYSTEM_ADMIN`: `Trường học` (Icon School).
    - Mục chân trang: `Cài đặt` (Icon Cog), `Đăng xuất` (Icon Logout).
  - **Main Content**: Khung vực hiển thị các route con, có thanh cuộn độc lập, độ rộng tối đa chuẩn dashboard, responsive trên mobile/tablet.

### W2 — Empty Overview (Màn hình Tổng quan)
- **Vị trí**: Route `/admin` hoặc `/admin/overview`.
- **Trạng thái**:
  - Header và Sidebar hiển thị đầy đủ thông tin tài khoản.
  - Khu vực Main Content để **hoàn toàn trống** (không có biểu đồ, không có widget, không có thống kê giả lập, không có welcome card chào mừng).
  - Chỉ có tiêu đề nhỏ tối giản: "Tổng quan".

### W3 — School List (Danh sách Trường học)
- **Vị trí**: Route `/admin/schools`.
- **Thành phần**:
  - Thanh tiêu đề trang: Tiêu đề "Danh sách Trường học", nút Primary vàng `#FFCB56`: `+ Thêm trường`.
  - Thanh công cụ lọc: Ô tìm kiếm tên trường (input search có icon kính lúp), bộ lọc trạng thái (Tất cả, Đang hoạt động, Ngừng hoạt động).
  - Bảng dữ liệu (Data Table):
    - Cột 1: **Tên trường** (kèm ảnh thumbnail nhỏ hoặc placeholder).
    - Cột 2: **Địa chỉ** (chuỗi địa chỉ có giới hạn độ dài, tooltip).
    - Cột 3: **Thời gian hợp đồng** (định dạng `DD/MM/YYYY - DD/MM/YYYY`).
    - Cột 4: **Trạng thái** (Huy hiệu màu xanh `Hoạt động` hoặc màu xám `Ngừng hoạt động`).
    - Cột 5: **Thao tác** (Nút xem chi tiết, nút gạt/đổi trạng thái).
  - Chân bảng: Phân trang (Trang trước, Trang sau, hiển thị "Trang X / Y", tổng số trường).
  - Trạng thái rỗng (Empty State): Khi chưa có trường hoặc tìm kiếm không khớp: Biểu tượng trường học xám + dòng chữ ngắn: "Chưa có trường học nào".

### W4 — Add School Modal (Form Thêm trường)
- **Vị trí**: Modal bật nổi phía trên màn hình W3 khi bấm `+ Thêm trường`.
- **Các nhóm thông tin (Form Sections)**:
  1. **Thông tin chung**:
     - Tên trường học (*Bắt buộc, placeholder: "Nhập tên trường học..."*).
     - Ảnh trường học (*Tùy chọn*): Khung kéo thả hoặc chọn file ảnh, hỗ trợ xem trước (Preview Thumbnail) tỷ lệ 16:9, nút "Đổi ảnh" hoặc "Xóa ảnh".
  2. **Địa chỉ & Vị trí VietMap**:
     - Ô tìm kiếm địa chỉ: Gõ text hiển thị danh sách dropdown gợi ý từ VietMap Autocomplete.
     - Ô hiển thị địa chỉ chi tiết (`addressText`): Cho phép người dùng chỉnh sửa nếu cần.
     - Bản đồ VietMap thu nhỏ (Map Picker): Hiển thị ghim đỏ (Marker) tại vị trí đã chọn; cho phép click hoặc kéo ghim để cập nhật lại tọa độ kinh độ/vĩ độ.
     - Hiển thị tọa độ dạng nhãn phụ: `Tọa độ: 21.028511, 105.772341`.
  3. **Thời gian hợp đồng**:
     - Hàng 2 cột: `Ngày bắt đầu` và `Ngày kết thúc` (Input Date HTML5 chuẩn).
  4. **Lịch học theo tuần (Weekly Schedule Builder)**:
     - Danh sách 7 ngày trong tuần với checkbox bật/tắt (Người dùng tự chọn các ngày học thực tế của trường, không tự động chọn sẵn dữ liệu mặc định).
     - Với mỗi ngày bật: 2 ô chọn giờ **`Giờ bắt đầu học`** (ví dụ: `07:00`) và **`Giờ kết thúc học`** (ví dụ: `17:30`).
  5. **Nút điều khiển**: Nút `Hủy` (phụ) và nút `Tạo trường học` (Primary vàng `#FFCB56`, có spinner khi đang gửi dữ liệu).

### W5 — School Detail (Chi tiết Trường học)
- **Vị trí**: Route `/admin/schools/[id]`.
- **Cấu trúc màn hình**:
  - **Khối phía trên (Top Section)**:
    - Nút "Quay lại danh sách" (mũi tên).
    - Ảnh đại diện trường lớn (hoặc placeholder tiêu chuẩn), Tên trường học (Heading lớn), Địa chỉ trường học.
    - Huy hiệu trạng thái (`Đang hoạt động` / `Ngừng hoạt động`) kèm nút chuyển trạng thái.
    - Thẻ tóm tắt thông tin: Thời hạn hợp đồng, Khung giờ học các ngày trong tuần.
  - **Khối phía dưới (Bottom Section)**:
    - Thanh điều hướng Tab ngang (Horizontal Tabs): Hiện tại có duy nhất tab `Nhân viên trường` (sẵn sàng mở rộng thêm các tab sau này).
    - Nội dung của tab: Render màn hình W6.

### W6 — School Employees (Tab Nhân viên trường)
- **Vị trí**: Nằm bên trong màn hình W5.
- **Thành phần**:
  - Thanh công cụ:
    - Ô tìm kiếm nhân viên (tìm theo tên, email, SĐT).
    - Bộ lọc vai trò (`Tất cả`, `Quản trị trường - SCHOOL_ADMIN`, `Giám sát xe - BUS_ATTENDANT`).
    - Nút Primary vàng `#FFCB56`: `+ Tạo quản trị trường`.
  - Bảng nhân viên:
    - Cột 1: **Họ và tên** (kèm avatar ký tự).
    - Cột 2: **Email**.
    - Cột 3: **Số điện thoại**.
    - Cột 4: **Vai trò** (Huy hiệu xanh dương `Quản trị trường` hoặc vàng cam `Giám sát xe`).
    - Cột 5: **Trạng thái tài khoản** (Huy hiệu xanh `Hoạt động` hoặc đỏ `Vô hiệu`).
  - Phân trang chuẩn.

### W7 — Create School Admin Modal (Tạo Quản trị trường)
- **Vị trí**: Modal bật nổi khi bấm `+ Tạo quản trị trường` tại W6.
- **Thành phần Form**:
  - Tiêu đề: "Tạo tài khoản Quản trị trường học".
  - Họ và tên (*Bắt buộc*).
  - Email (*Tùy chọn nếu đã có SĐT*).
  - Số điện thoại (*Tùy chọn nếu đã có Email*).
  - Ghi chú bảo mật nhỏ màu xám nhạt: *"Mật khẩu ngẫu nhiên an toàn sẽ được hệ thống khởi tạo và bàn giao qua kênh quản trị an toàn."* (Tuyệt đối không có ô nhập mật khẩu).
  - Nút `Hủy` và nút `Khởi tạo tài khoản` (Primary vàng).

### W8 — Shared Settings & Logout (Cài đặt & Tài khoản)
- **Vị trí**: Route `/admin/settings`.
- **Thành phần**:
  - Thẻ thông tin cá nhân: Họ tên, Email, Số điện thoại, Vai trò đang đăng nhập.
  - Thông tin phiên: Thời gian đăng nhập, Mã phiên làm việc.
  - Thao tác: Nút Đăng xuất lớn với hộp thoại xác nhận an toàn.

---

## 9. Implementation Plan & Approval Gates

Sau khi Stage A được Product Owner phê duyệt, kế hoạch triển khai được tổ chức thành **8 Tasks kế tiếp nhau**, mỗi task đều tuân thủ nguyên tắc Stop-After-Task:

```
[ Stage A: Design Approved ]
          │
          ▼
┌─────────────────────────┐
│ Task 1: Database Schema │ ──> Approval Gate 1
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ Task 2: Backend Schools │ ──> Approval Gate 2
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ Task 3: VietMap Service │ ──> Approval Gate 3
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ Task 4: Cloudinary Svc  │ ──> Approval Gate 4
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ Task 5: School Admins   │ ──> Approval Gate 5
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ Task 6: Shared Layout   │ ──> Approval Gate 6
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ Task 7: School Web UI   │ ──> Approval Gate 7
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ Task 8: Final Review C6 │ ──> PO Final Acceptance
└─────────────────────────┘
```

### Chi tiết Từng Task Triển khai:

#### TASK 1 — DATABASE SCHEMA & MIGRATION
- **Phạm vi**: Khởi tạo bảng `schools` và thêm cột `school_id` trong `users` qua Prisma Migration.
- **Sản phẩm**: Migration SQL file, updated `schema.prisma`.
- **Kiểm thử**: `npx prisma migrate dev`, kiểm tra quan hệ và indexes trên PostgreSQL.

#### TASK 2 — BACKEND SCHOOL CRUD APIS
- **Phạm vi**: Xây dựng `SchoolsModule`, Controller, Service với các APIs: `GET /schools`, `GET /schools/:id`, `PATCH /schools/:id/status`.
- **Sản phẩm**: DTOs, NestJS controllers, services, Swagger decorators.
- **Kiểm thử**: Unit test Vitest, kiểm tra phân quyền `SYSTEM_ADMIN` và pagination.

#### TASK 3 — VIETMAP DIRECT INTEGRATION (BROWSER-FIRST)
- **Phạm vi**: Triển khai `VietmapService` trên Web Frontend tích hợp trực tiếp VietMap v4 (Autocomplete, Place Details, Reverse Geocoding). Kiểm chứng CORS, Domain restriction, quản lý `ref_id`, Debounce 300ms, AbortController và typed error handling tiếng Việt.
- **Sản phẩm**: `web/src/lib/vietmap/` (`types.ts`, `debounce.ts`, `vietmap.service.ts`, `index.ts`), unit tests.
- **Kiểm thử**: Unit tests `node --test`, kiểm tra CORS preflight từ VietMap, build Next.js.

#### TASK 4 — CLOUDINARY IMAGE STORAGE & CREATE SCHOOL API
- **Phạm vi**: Triển khai `CloudinaryService` hỗ trợ upload stream ảnh cổng trường (chấp nhận ảnh mồ côi nếu DB insert sau đó thất bại, không rollback destroy bắt buộc). Hoàn thiện API `POST /api/v1/schools` multipart/form-data lưu PostgreSQL.
- **Sản phẩm**: `CloudinaryService`, `CreateSchoolDto`, `schedule.validator.ts`, unit tests, Swagger multipart.
- **Kiểm thử**: Unit test Vitest (69 tests), kiểm tra kích thước tối đa 5MB, MIME types, magic bytes, live API HTTP tests.

#### TASK 5 — BACKEND SCHOOL ADMIN CREATION & EMPLOYEES LISTING
- **Phạm vi**: Xây dựng APIs: `GET /schools/:id/employees` và `POST /schools/:id/employees`. Sinh mật khẩu ngẫu nhiên an toàn và ghi log console.
- **Sản phẩm**: DTOs, logic sinh mật khẩu, kiểm tra ràng buộc trường active, Console logger.
- **Kiểm thử**: Test tạo admin, kiểm tra không trả mật khẩu trong response, kiểm tra log console.

#### TASK 6 — WEB SHARED ADMIN LAYOUT & OVERVIEW
- **Phạm vi**: Triển khai Shared Layout cho `SYSTEM_ADMIN` và `SCHOOL_ADMIN` (Header, Sidebar, User info, Logout) và màn hình Tổng quan trống.
- **Sản phẩm**: `web/src/app/admin/layout.tsx`, `web/src/app/admin/page.tsx`, component Sidebar và Header.
- **Kiểm thử**: Next.js build, kiểm tra hiển thị phân quyền menu sidebar giữa 2 vai trò.

#### TASK 7 — WEB SYSTEM ADMIN SCHOOL SCREENS
- **Phạm vi**: Triển khai các màn hình W3, W4, W5, W6, W7, W8: Danh sách trường, Modal thêm trường (tích hợp VietMap & Cloudinary Preview), Chi tiết trường và Tab nhân viên.
- **Sản phẩm**: Các page và component trong `web/src/app/admin/schools/`.
- **Kiểm thử**: TypeScript strict type-check, Next.js build, ESLint, kiểm tra tương tác modal và form validation.

#### TASK 8 — FINAL INTEGRATION, VERIFICATION & CLOSURE
- **Phạm vi**: Kiểm thử tích hợp toàn bộ luồng tạo trường học, tìm kiếm địa chỉ, tải ảnh, phân quyền, kiểm tra Swagger đồng bộ.
- **Sản phẩm**: AI Review Report nghiệm thu, Task Git Diff, bàn giao cho Product Owner.

---

## 10. Approved Final Decisions (Decided by Product Owner)

Các quyết định chính thức của Product Owner đã được giải quyết và chốt phương án:

1. **Khởi tạo School Admin khi Trường đang Ngừng Hoạt động (Inactive School)**:
   - **QUYẾT ĐỊNH: APPROVED: BLOCK.**
   - Chặn hoàn toàn việc tạo mới `SCHOOL_ADMIN` khi `School.isActive = false`. Trả về lỗi nghiệp vụ tiếng Việt: *"Không thể tạo tài khoản quản trị cho trường học đang ngừng hoạt động"*.
2. **Kích hoạt lại Trường học (Re-activate School)**:
   - **QUYẾT ĐỊNH: APPROVED: ALLOW.**
   - `SYSTEM_ADMIN` có thể kích hoạt lại trạng thái trường học từ `INACTIVE` sang `ACTIVE` bất kỳ lúc nào nếu hợp đồng trường còn hiệu lực. Thao tác kích hoạt phải do `SYSTEM_ADMIN` chủ động thực hiện, không tự động chuyển trạng thái theo ngày tháng hợp đồng.
3. **Chế độ Mock VietMap trong Development**:
   - **QUYẾT ĐỊNH: NOT APPROVED.**
   - Không tạo chức năng giả lập tọa độ cố định giả (Hà Nội). Nếu VietMap API chưa được cấu hình, báo rõ dịch vụ tìm kiếm bản đồ chưa khả dụng và cho phép nhập tọa độ thủ công hợp lệ.
