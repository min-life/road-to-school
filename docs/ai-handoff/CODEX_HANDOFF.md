# ROADTOSCHOOL V2.0 — CODEX MASTER HANDOFF DOCUMENT
# COMPREHENSIVE ARCHITECTURE · DOMAIN MODEL · APPROVED DECISIONS · TECHNICAL CONVENTIONS

> **Mục tiêu tài liệu**: Tài liệu bàn giao dài hạn (Long-term Context Handoff) dành cho OpenAI Codex khi tiếp quản dự án RoadToSchool v2.0 từ Google DeepMind Antigravity.  
> **Nguyên tắc**: Đọc tài liệu này để hiểu toàn diện ngữ cảnh dự án mà không cần đọc lại toàn bộ mã nguồn hoặc lịch sử chat.  
> **Phiên bản tài liệu**: 2.0.0  
> **Ngày lập**: 25/10/2026 (GMT+7)

---

Bộ tài liệu hệ thống theo source (28/10/2026): [implementation/README.md](../implementation/README.md), gồm local runbook, feature map, backend route catalog, schema và environment references. Chưa commit/push phần docs mới.

## Cập nhật 28/10/2026 — Giao diện Mobile theo V1

Nguồn implementation hiện tại của đợt UI là commit `db02de6` trên `dongnnp/mobile/refactor-ui`, sau các commit `113c249`, `579ccaf`, `d228c1d`. Đã có onboarding 4 trang, restyle Login/Quên mật khẩu/Đăng ký phụ huynh và `KeyboardScrollView` native/Web. API/auth context/validation/OTP và nghiệp vụ V2 giữ nguyên; không thêm dependencies, schema hoặc dữ liệu.

Đọc [hiện trạng UI](../architecture/mobile-ui-implementation-status.md) và [hiện trạng source](CURRENT_STATE.md) trước khi tiếp tục. Tài liệu UI ghi rõ asset, completion marker, manual focus, nhãn/placeholder cuối cùng và phạm vi chưa làm. Quy tắc bàn phím ở [WORKING_RULES mục 3.5](../WORKING_RULES.md#35-mobile-keyboard--focus-visibility), chi tiết tại [mobile-keyboard-behavior.md](../architecture/mobile-keyboard-behavior.md).

Đã push các commit source theo yêu cầu PO, chưa có bằng chứng merge main hoặc nghiệm thu thiết bị. Tsc/unit/bundle PASS không thay cho Expo iPhone/Android, Safari/Chrome mobile, VoiceOver hoặc OTP runtime; các phần đó còn NOT_VERIFIED trong đợt UI. Các snapshot, số lượng migration và trạng thái Git ở các mục lịch sử bên dưới chỉ áp dụng tại mốc ghi nhận, không được dùng để phủ nhận source/addendum mới.

## MỤC LỤC
1. [A. Project Overview (Tổng quan Dự án)](#a-project-overview)
2. [B. Repository Structure (Cấu trúc Repository)](#b-repository-structure)
3. [C. Tech Stack & Infrastructure (Công nghệ & Hạ tầng)](#c-tech-stack--infrastructure)
4. [D. Local Development Commands (Lệnh chạy thực tế)](#d-local-development-commands)
5. [E. Architecture & Module Overview (Kiến trúc Module)](#e-architecture--module-overview)
6. [F. Domain Model & Prisma Schema (Mô hình Dữ liệu)](#f-domain-model--prisma-schema)
7. [G. Roles & RBAC Matrix (Phân quyền 5 Actors)](#g-roles--rbac-matrix)
8. [H. Approved Business Decisions (Sổ Quyết định Nghiệp vụ đã duyệt)](#h-approved-business-decisions)
9. [I. Database Principles & Migrations (Nguyên tắc Cơ sở Dữ liệu)](#i-database-principles--migrations)
10. [J. Backend Engineering Conventions (Quy chuẩn Backend)](#j-backend-engineering-conventions)
11. [K. Web Engineering Conventions (Quy chuẩn Web Admin)](#k-web-engineering-conventions)
12. [L. Mobile Engineering Conventions (Quy chuẩn Mobile App)](#l-mobile-engineering-conventions)
13. [M. Product Owner Workflow & Approval Gates (Quy trình làm việc)](#m-product-owner-workflow--approval-gates)
14. [N. Safety Rules & Test Data Policy (Quy tắc An toàn & Bảo vệ Dữ liệu)](#n-safety-rules--test-data-policy)
15. [O. Documentation Map (Sơ đồ Tài liệu)](#o-documentation-map)
16. [P. Deferred Business Scope (Phạm vi Tạm hoãn)](#p-deferred-business-scope)
17. [Q. Known Architectural Risks (Rủi ro Kiến trúc & Biện pháp)](#q-known-architectural-risks)

---

## A. PROJECT OVERVIEW
RoadToSchool v2.0 là hệ thống quản lý dịch vụ đưa đón học sinh thông minh bằng xe buýt đưa đón học sinh theo hợp đồng:
- **Mô hình vận hành**:
  - **Duy nhất 1 đơn vị vận tải (nhà xe)** quản lý xe và tài xế.
  - **Duy nhất 1 bãi đỗ xe trung tâm (Central Parking Yard)** lưu trong bảng `SystemSetting` (`key: "central_parking_yard"`).
  - Phục vụ đưa đón học sinh cho **nhiều trường học đối tác (Schools)** có hợp đồng dịch vụ.
  - Mỗi trường học quản lý học sinh và giáo viên giám sát xe (Bus Attendants) của trường mình.
  - Phụ huynh (Parents) theo dõi hành trình xe thực tế của con và cập nhật điểm danh/báo vắng.
- **Không hỗ trợ**: Multi-tenant (đa nhà xe) hoặc đa bãi xe nếu chưa có yêu cầu chính thức từ Product Owner.

---

## B. REPOSITORY STRUCTURE
Repository chia thành 3 project độc lập tại root, không dùng monorepo tooling:

```text
road-to-school-v2/
├── AGENTS.md                  # Hướng dẫn hành động & reading order cho AI Agent / Codex
├── README.md                  # Giới thiệu tổng quan repository
├── api/                       # [BACKEND] NestJS 12 + Prisma ORM 6 + PostgreSQL
│   ├── prisma/
│   │   ├── schema.prisma      # Schema dữ liệu trung tâm (15 models, 9 migrations)
│   │   └── migrations/        # 9 migrations chính thức (chỉ DDL)
│   ├── src/                   # NestJS modules (Auth, Schools, Students, Routes, Trips, etc.)
│   ├── scripts/               # Scripts tiện ích & one-off backfill
│   └── package.json           # Dependencies và scripts backend (Port 3000)
├── web/                       # [WEB ADMIN] Next.js 16 (App Router) + Tailwind CSS + MapLibre GL
│   ├── src/
│   │   ├── app/admin/         # Các trang quản trị (schools, routes, trips, students, etc.)
│   │   ├── components/        # UI components & admin layout
│   │   └── lib/               # API client, types, polyline utils
│   └── package.json           # Scripts Web (Port 5173 via next dev -p 5173)
├── mobile/                    # [MOBILE APP] Expo 58 + React Native 0.88 + Expo Router
│   ├── app/                   # Expo router screens ((auth), (tabs), trip/[id], parent/)
│   ├── services/              # api-client.ts (MobileApiClient strongly-typed)
│   ├── utils/                 # Polyline decoding, date formatting
│   └── package.json           # Scripts Mobile (Port 8081 via Expo)
├── docs/                      # TÀI LIỆU TOÀN BỘ DỰ ÁN
│   ├── WORKING_RULES.md       # Quy tắc làm việc, Test Data Policy, AI Review rule
│   ├── BUSINESS_CONTEXT.md    # Ngữ cảnh nghiệp vụ nền tảng & 5 Actors
│   ├── ai-handoff/            # Tài liệu bàn giao Codex (CODEX_HANDOFF.md, CURRENT_STATE.md)
│   ├── ai-review/             # LATEST.md, LATEST.diff và 38 reports lịch sử
│   └── architecture/          # Bản thiết kế chi tiết các phân hệ
└── scratch/                   # Scripts kiểm tra tạm thời (Scratchpad)
```

---

## C. TECH STACK & INFRASTRUCTURE

| Tầng | Công nghệ chính | Chi tiết phiên bản & Ghi chú |
|---|---|---|
| **Backend API** | NestJS 12, Node.js (ESM) | Type: module, Express platform, `@nestjs/swagger` 12, `@nestjs/schedule` 12 |
| **ORM & Database**| Prisma 6.19.3, PostgreSQL | Port 5432, Database `roadtoschool`, connection qua `DATABASE_URL` |
| **Authentication** | JWT (Access 15m, Refresh 7d) | bcryptjs, multi-device Session rotation, OtpChallenge in-database |
| **Email & Media** | Nodemailer, Cloudinary SDK | Ethereal SMTP test / Cloudinary upload avatar & school images |
| **Web Frontend** | Next.js 16.4.2 (App Router) | React 19, Tailwind CSS v4, MapLibre GL 6.15 (VietMap Raster Tile) |
| **Mobile App** | Expo 58, React Native 0.88 | React 19, Expo Router, Reanimated 4, WebView (MapLibre), Expo Camera |
| **Bản đồ & Định tuyến** | VietMap VRP & Map Tile API | API key qua `VIETMAP_API_KEY` (Backend) và `EXPO_PUBLIC_VIETMAP_TILEMAP_KEY` (Mobile) |

---

## D. LOCAL DEVELOPMENT COMMANDS

Tất cả các lệnh dưới đây đã được xác minh chính xác từ `package.json` thực tế:

### 1. Backend (`/api`)
```bash
# Di chuyển vào thư mục api
cd api

# Cài đặt dependencies (chỉ dùng npm)
npm install

# Chạy dev server với hot-reload (Port 3000)
npm run dev

# Chạy build kiểm tra cú pháp và bundle
npm run build

# Chạy toàn bộ Unit Tests (Vitest)
npm test

# Chạy kiểm tra TypeScript tĩnh (Read-only, Zero side-effects)
npx tsc --noEmit

# Xem / chạy migration Prisma
npx prisma migrate status
npx prisma validate
npx prisma generate
```

### 2. Web Admin (`/web`)
```bash
# Di chuyển vào thư mục web
cd web

# Cài đặt dependencies
npm install

# Chạy dev server (Port 5173 theo script next dev -p 5173)
npm run dev

# Chạy build sản phẩm
npm run build

# Chạy Unit Tests
npm test

# Kiểm tra TypeScript tĩnh
npx tsc --noEmit
```

### 3. Mobile App (`/mobile`)
```bash
# Di chuyển vào thư mục mobile
cd mobile

# Cài đặt dependencies
npm install

# Khởi động Expo development server (Port 8081)
npx expo start

# Kiểm tra TypeScript tĩnh
npx tsc --noEmit
```

---

## E. ARCHITECTURE & MODULE OVERVIEW

Hệ thống Backend được tổ chức thành 12 module chuẩn mực NestJS, gọi Prisma Client trực tiếp (không dùng Generic Repository):

1. **`AuthModule`**: Đăng nhập, làm mới token, đăng xuất, thu hồi phiên đa thiết bị, đăng ký phụ huynh qua OTP, quên mật khẩu, cập nhật avatar.
2. **`SchoolsModule`**: CRUD trường học đối tác, hợp đồng ngày bắt đầu/kết thúc, lịch học tuần (`weeklySchedule`), quản lý School Admin và nhân sự.
3. **`StudentsModule`**: Quản lý hồ sơ học sinh, sinh mã `STUxxxxxxxx`, trạng thái `AVAILABLE`/`DISABLED`.
4. **`ParentsModule`**: Liên kết Phụ huynh - Học sinh qua mã và số điện thoại giám hộ.
5. **`DriversModule`**: Quản lý tài xế phía nhà xe, lịch công tác.
6. **`VehiclesModule`**: Quản lý phương tiện, biển số chuẩn hóa, số chỗ ngồi (14/16/29/45 chỗ).
7. **`SystemSettingsModule`**: Lưu tọa độ bãi xe trung tâm (`central_parking_yard`).
8. **`StudentRequestsModule`**: Quy trình Phụ huynh gửi yêu cầu đổi thông tin / địa chỉ đón trả -> School Admin duyệt/từ chối.
9. **`RoutesModule`**:
   - `RoutePlan-first`: Tạo phương án tuyến từ thuật toán VietMap VRP, tính toán `distinct` học sinh dự kiến.
   - Quản lý giữ chỗ phương tiện (`Vehicle Reservation`).
   - Phân công xe, tài xế mặc định, giáo viên mặc định.
   - School Admin phê duyệt phương án `DRAFT` $\rightarrow$ `ACTIVE`.
10. **`TripsModule`**:
    - Tự động sinh chuyến theo ngày dựa trên RoutePlan `ACTIVE` và `weeklySchedule` của trường học.
    - Điều chỉnh nhân sự/xe cho chuyến xe đơn lẻ.
    - Vận hành chuyến xe thời gian thực (Attendant Ready, Driver Start, Boarding, School Arrival, Alighting, Driver Complete).
    - Lịch trình di động cho Driver, Bus Attendant và Parent.
11. **`HealthModule`**: Kiểm tra trạng thái hệ thống và kết nối DB (`GET /api/v1/health`).
12. **`AppModule`**: Module gốc tích hợp ConfigModule, PrismaModule, ScheduleModule (Cron).

---

## F. DOMAIN MODEL & PRISMA SCHEMA

Prisma Schema hiện có **15 Models** và **9 Enums**:

### 1. Danh sách Enums
- `Role`: `SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `DRIVER`, `BUS_ATTENDANT`, `PARENT`
- `OtpPurpose`: `PARENT_REGISTRATION`, `PASSWORD_RESET`, `PARENT_STUDENT_LINKING`, `STUDENT_UPDATE_REQUEST`
- `StudentStatus`: `AVAILABLE`, `DISABLED`
- `DeliveryChannel`: `EMAIL`, `SMS`
- `RequestType`: `INFORMATION_UPDATE`, `ADDRESS_UPDATE`
- `RequestStatus`: `PENDING`, `APPROVED`, `REJECTED`
- `RoutePlanStatus`: `DRAFT`, `ACTIVE`, `CANCELLED`
- `TripStatus`: `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `RouteDirection`: `TO_SCHOOL`, `TO_PARKING`
- `RouteStopType`: `PARKING_START`, `PICKUP`, `SCHOOL_ARRIVAL`, `SCHOOL_DEPARTURE`, `DROPOFF`, `PARKING_END`
- `AttendanceStatus`: `UNMARKED`, `PRESENT`, `ABSENT`

### 2. Danh sách Models & Quan hệ cốt lõi
- **`User`**: Người dùng chung cho cả 5 roles. `schoolId` nullable (chỉ có giá trị với `SCHOOL_ADMIN` và `BUS_ATTENDANT`).
- **`Session`**: Quản lý phiên token pair đa thiết bị, `tokenVersion`, `revokedAt`.
- **`OtpChallenge`**: Thử thách mã OTP xác thực có giới hạn lượt thử (`attempts`) và thời gian hết hạn.
- **`School`**: Trường học, `contractStartDate`, `contractEndDate`, `weeklySchedule` (Json).
- **`Student`**: Học sinh, `code` duy nhất, tọa độ nhà đón/trả.
- **`ParentStudentLink`**: Bảng nối N-N giữa `User` (Parent) và `Student`.
- **`Vehicle`**: Xe vận chuyển, `licensePlate`, `seatCount`.
- **`SystemSetting`**: Cấu hình bãi xe trung tâm.
- **`StudentUpdateRequest`**: Đơn đổi thông tin/địa chỉ học sinh chờ School Admin duyệt.
- **`RoutePlan`**: Phương án tuyến tổng thể của trường (`status`: DRAFT, ACTIVE, CANCELLED).
- **`Route`**: Tuyến đường 1 chiều (`TO_SCHOOL` hoặc `TO_PARKING`), thuộc 1 `RoutePlan`. **Không có cột status riêng**.
- **`RouteStop`**: Trạm dừng trên tuyến, thứ tự `stopOrder`, gắn với `studentId` hoặc bãi xe/trường học.
- **`Trip`**: Chuyến xe thực tế theo ngày (`serviceDate`, `direction`, `status`, `attendantReadyAt`, `arrivedAtSchoolAt`, `actualStartTime`, `actualEndTime`, snapshot gán xe, tài xế, giáo viên).
- **`TripAttendance`**: Danh sách học sinh theo chuyến xe và trạng thái điểm danh (`status`, `absenceReason`, `markedAt`, `alightedAt`).

---

## G. ROLES & RBAC MATRIX

| Hành động nghiệp vụ | `SYSTEM_ADMIN` (Nhà xe) | `SCHOOL_ADMIN` (Nhà trường) | `DRIVER` (Tài xế) | `BUS_ATTENDANT` (Giáo viên phụ xe) | `PARENT` (Phụ huynh) |
|---|:---:|:---:|:---:|:---:|:---:|
| Giao diện sử dụng | **Web Admin** | **Web Admin** | **Mobile App** | **Mobile App** | **Mobile App** |
| Quản lý Trường học / Bãi xe | Toàn quyền | Xem trường mình | Không | Không | Không |
| Quản lý Xe & Tài xế | Toàn quyền | Không | Xem hồ sơ mình | Không | Không |
| Quản lý Học sinh & Giáo viên xe | Không | Toàn quyền trường mình | Không | Không | Xem con mình |
| Tạo RoutePlan (VRP Optimizer) | Có quyền | Không | Không | Không | Không |
| Phân công Xe & Tài xế mặc định | Có quyền | Không | Không | Không | Không |
| Phân công Giáo viên xe mặc định | Không | Có quyền | Không | Không | Không |
| **Phê duyệt RoutePlan (DRAFT $\rightarrow$ ACTIVE)** | **CẤM TUYỆT ĐỐI** | **DUY NHẤT CÓ QUYỀN** | Không | Không | Không |
| Sinh chuyến xe thủ công (Manual) | Có quyền | Không | Không | Không | Không |
| Tinh chỉnh nhân sự chuyến đơn lẻ | Gán Xe / Tài xế | Gán Giáo viên xe | Không | Không | Không |
| Xem lịch tuần đưa đón | Xem trên Web | Xem trên Web | Xem trên Mobile | Xem trên Mobile | Xem trên Mobile |
| Xác nhận sẵn sàng (`attendant-ready`) | Không | Không | Không | **Có quyền** | Không |
| Bắt đầu chuyến (`start`) | Không | Không | **Có quyền** | Không | Không |
| Điểm danh lên xe (`Boarding`) | Không | Không | Không | **Có quyền** | Xem trạng thái con |
| Xác nhận đến trường (`arrive-at-school`) | Không | Không | **Có quyền (TO_SCHOOL)** | Không | Không |
| Xác nhận xuống xe (`Alighting`) | Không | Không | Không | **Có quyền** | Xem trạng thái con |
| Hoàn thành chuyến (`complete`) | Không | Không | **Có quyền** | Không | Không |

---

## H. APPROVED BUSINESS DECISIONS

Các quyết định nghiệp vụ nền tảng đã được Product Owner phê duyệt chính thức:

### 1. Authentication & Security
- Xác thực Stateless qua Bearer JWT (Access Token 15 phút, Refresh Token 7 ngày).
- Quản lý phiên tập trung trong bảng `sessions`. Đổi mật khẩu thành công thu hồi tất cả các phiên khác và giữ lại phiên hiện tại.
- Phụ huynh đăng ký tài khoản tự do qua số điện thoại và xác thực mã OTP.

### 2. RoutePlan-First Management
- **Aggregate Root là `RoutePlan`**: Tuyến đường (`Route`) không có vòng đời độc lập.
- Số lượng học sinh của RoutePlan hiển thị là **Distinct Student Count** ("Học sinh dự kiến"), tránh đếm đúp học sinh đi 2 chiều.
- Preview tối ưu hóa tuyến là tạm thời (transient), quay lại là phải chạy tối ưu lại; không lưu preview vào DB.

### 3. Vehicle Reservation (Giữ chỗ Phương tiện)
- Một `RoutePlan` ở trạng thái `DRAFT` **giữ chỗ phương tiện ngay lập tức** khi tạo thành công.
- Xe đã được dùng trong một RoutePlan chưa bị `CANCELLED` thì **không được dùng cho RoutePlan khác nếu khoảng thời gian hợp đồng bị chồng lấn**, bất kể cùng trường hay khác trường.
- Cùng một phương tiện **được phép dùng hợp lệ cho cả 2 chiều tuyến (TO_SCHOOL và TO_PARKING)** trong cùng một RoutePlan.
- Chức năng Hủy RoutePlan (`POST /route-plans/:id/cancel`) để giải phóng xe hiện **tạm hoãn (Deferred)**.

### 4. Trip Generation (Sinh Chuyến Xe)
- Tự động sinh chuyến theo cơ chế **Lazy Generation**: Chạy cron hằng ngày sinh trước cho ngày học kế tiếp, hoặc System Admin kích hoạt thủ công.
- Chỉ sinh chuyến khi: RoutePlan ở trạng thái `ACTIVE`, ngày dịch vụ nằm trong hợp đồng của trường và nằm trong `weeklySchedule` của trường.
- Mỗi chuyến xe sinh ra phải sở hữu snapshot độc lập: `assignedVehicleId`, `assignedDriverId`, `assignedBusAttendantId`.
- **Roster độc lập theo chuyến**: Mỗi Trip sinh ra một tập bản ghi `TripAttendance` riêng biệt tương ứng với danh sách học sinh trên tuyến.

### 5. Trip Operation Flow V2 (Vận hành Chuyến xe 4 chặng)
- **Chiều đi (`TO_SCHOOL`)**:
  - Attendant Ready $\rightarrow$ Driver Start Trip (không cần chờ điểm danh xong).
  - Điểm danh lên xe diễn ra dọc đường đón học sinh.
  - Khi 100% học sinh đã được đánh dấu (không còn `UNMARKED`), Driver bấm **`[ Xác nhận đến trường ]`**.
  - Sau khi đến trường, khóa không cho hoàn tác về `UNMARKED`.
  - Attendant xác nhận **Xuống xe** cho từng học sinh `PRESENT`.
  - Driver chỉ được **`[ Hoàn thành chuyến xe ]`** khi xe đã đến trường và **100% học sinh PRESENT đã xuống xe**.
- **Chiều về (`TO_PARKING`)**:
  - Attendant Ready $\rightarrow$ Attendant điểm danh lên xe ngay tại sân trường khi chuyến còn `SCHEDULED`.
  - Bắt buộc **100% học sinh đã lên xe (0 UNMARKED)** thì Driver mới được bấm **`[ Bắt đầu chuyến xe ]`**.
  - Xe chạy dọc đường trả khách, Attendant bấm **Xuống xe** tại từng điểm dừng.
  - Sau khi xuất phát, khóa không cho hoàn tác về `UNMARKED`.
  - Driver bấm **`[ Hoàn thành chuyến xe ]`** khi xe về bãi và 100% học sinh PRESENT đã xuống xe.

### 6. Chế độ Vận hành `TEST` vs `LIVE`
- Biến môi trường: `TRIP_OPERATION_MODE=TEST|LIVE` trong `api/.env`.
- `LIVE`: Attendant chỉ được Ready trước giờ chạy tối đa 15 phút; Driver chỉ được Start trước giờ chạy tối đa 5 phút.
- `TEST`: Bỏ qua rào cản thời gian 15p/5p, sẵn sàng chạy tức thì mọi chuyến xe phục vụ nghiệm thu và kiểm thử. Không bỏ qua RBAC hay các chặng nghiệp vụ.

### 7. Bảo vệ Quyền Riêng tư Phụ huynh (Parent Privacy)
- Trên ứng dụng di động của Phụ huynh, hệ thống **bắt buộc ẩn danh (Masking)** thông tin của các học sinh khác trên chuyến:
  - Chỉ hiển thị tên, ảnh, trạng thái của con mình.
  - Các điểm đón khác chỉ hiển thị nhãn "Điểm đón học sinh", không hiển thị tên học sinh hay số điện thoại phụ huynh khác.

---

## I. DATABASE PRINCIPLES & MIGRATIONS

1. **Nguyên tắc giảm thiểu tác động Database (Minimal DB Impact)**:
   - Tuyệt đối không thêm bảng hay trường dữ liệu "dự phòng".
   - Luôn ưu tiên tái sử dụng các trường hiện có hoặc thêm trường nullable non-blocking.
   - Luồng Alighting V2 được triển khai tối ưu theo **Option C**: Chỉ thêm `Trip.arrivedAtSchoolAt DateTime?` và `TripAttendance.alightedAt DateTime?` mà không tạo bảng mới hay enum mới.
2. **Lịch sử 9 Migrations chính thức**:
   - `20261022044934_init`
   - `20261022091920_init_auth_tables`
   - `20261022143540_add_schools_table`
   - `20261023053710_add_students_and_parent_links`
   - `20261023105820_add_vehicles_settings_and_update_requests`
   - `20261023203124_add_routes_and_route_plans`
   - `20261024113252_add_trips_and_approval`
   - `20261025052642_add_trip_attendance_roster`
   - `20261025071759_add_trip_school_arrival_and_alighting`
3. **Chính sách Migration**:
   - Mọi migration phải là DDL thuần túy. Tuyệt đối không chứa câu lệnh chèn dữ liệu test hay dữ liệu giả.
   - Script `api/scripts/one-off/backfill-legacy-trip-roster.ts` chỉ dùng một lần trong quá khứ để đồng bộ chuyến cũ, không được tự ý chạy lại.

---

## J. BACKEND ENGINEERING CONVENTIONS

- **Mô hình chuẩn**: `Module` $\rightarrow$ `Controller` $\rightarrow$ `Service` $\rightarrow$ `PrismaClient`. Không bọc Generic Repository.
- **Validation**: Toàn bộ DTOs sử dụng `class-validator` và `class-transformer`. Kích hoạt `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- **Phân quyền**: Sử dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(Role.XYZ)`.
- **Đồng bộ Swagger bắt buộc**:
  - Mọi Controller phải có `@ApiTags()`.
  - Mọi Endpoint phải có `@ApiOperation()`, `@ApiResponse()` cho mã thành công và các mã lỗi (400, 401, 403, 404, 409).
  - Kiểm chứng OpenAPI docs tại `http://localhost:3000/api/docs`.

---

## K. WEB ENGINEERING CONVENTIONS

- **Next.js App Router**: Quản lý trang theo cấu trúc `web/src/app/admin/`.
- **Theme tokens nhất quán**:
  - Primary: `#FFCB56`
  - Background: `#FFFDF6`
  - Text: `#1E293B`
  - Surface/Card: `#FFFFFF`
- **Minimal UI Copy**: Không đặt đoạn văn giải thích dài. Dùng thẻ tóm tắt, bảng dữ liệu, huy hiệu trạng thái (Status Badges) và nút bấm hành động trực tiếp.
- **Bản đồ**: Tích hợp MapLibre GL với layer GeoJSON cho polyline lộ trình và markers điểm dừng.

---

## L. MOBILE ENGINEERING CONVENTIONS

- **Expo Router**: Cấu trúc tabs cho màn hình chính, dynamic routes cho chi tiết chuyến (`mobile/app/trip/[id].tsx`).
- **Draggable Bottom Sheet 2 trạng thái**:
  - Tự xây dựng trên `react-native-reanimated` và `PanResponder` (không cài thêm thư viện native nặng).
  - Trạng thái thu gọn (Collapsed: 140px): Hiển thị tên tuyến, chiều đi/về, giờ chạy, nút kéo mở rộng.
  - Trạng thái mở rộng (Expanded: 72% chiều cao màn hình): Hiển thị các Tab thông tin, điểm dừng, điểm danh.
  - Nút hành động cố định ở đáy (Fixed Bottom Action): Luôn hiển thị trên cùng, tôn trọng Safe Area, không che header của sheet.
- **Smart Polling 5 giây**:
  - Polling trạng thái vận hành (`operational-state`) mỗi 5 giây khi chuyến đang diễn ra.
  - Bản đồ nhúng trong `WebView` được memoize chặt chẽ, **tuyệt đối không reload HTML/WebView khi polling cập nhật dữ liệu**.
- **Điểm danh linh hoạt**:
  - Giao diện thủ công (Manual Attendance) là mặc định.
  - Nút quét mã QR thiết kế tinh gọn ở góc trên bên phải màn hình điểm danh.

---

## M. PRODUCT OWNER WORKFLOW & APPROVAL GATES

Codex phải tuân thủ nghiêm ngặt phong cách làm việc 3 vòng:

1. **ROUND 1 — BUSINESS ANALYSIS & PLANNING**:
   - Đọc kỹ nghiệp vụ và audit code hiện trạng.
   - Thiết kế giải pháp kỹ thuật, đánh giá tác động DB, thiết kế API contracts và Wireframes.
   - Dừng lại xin phê duyệt của Product Owner. **Không tự ý viết code khi chưa được duyệt.**
2. **ROUND 2 — DATABASE & BACKEND IMPLEMENTATION**:
   - Áp dụng migration tối thiểu (nếu có).
   - Implement Service, Controller, DTOs, Swagger, Unit tests.
   - Báo cáo kết quả kiểm thử và dừng lại.
3. **ROUND 3 — WEB/MOBILE UI & VERIFICATION**:
   - Thiết kế wireframe trước khi code UI.
   - Tối giản câu chữ, tích hợp API client, kiểm thử trải nghiệm.
   - Cập nhật báo cáo AI Review đầy đủ 13 mục vào `docs/ai-review/LATEST.md`.
   - **Stop-After-Task Rule**: Báo cáo súc tích, đề xuất 1 bước tiếp theo và **DỪNG LẠI** chờ phản hồi.

---

## N. SAFETY RULES & TEST DATA POLICY

> **CHÍNH SÁCH BẢO VỆ DỮ LIỆU TỐI CAO (WORKING_RULES.MD — SECTION 6):**  
> **AI AGENT TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP TỰ TẠO DỮ LIỆU ĐỂ KIỂM THỬ.**

- **Nghiêm cấm tuyệt đối**:
  - Tự `INSERT` vào Database để test.
  - Tự tạo User, Student, Trip, Route giả.
  - Tự chạy seed scripts hay data sync scripts.
  - Tự tạo mock fixtures ép test `PASS`.
  - Gọi API POST/PUT/DELETE làm thay đổi dữ liệu thật chỉ để thử nghiệm.
  - Reset, truncate hoặc xóa CSDL.
- **Phương pháp xác minh cho phép (Read-Only & Zero Side-Effects)**:
  - `npx tsc --noEmit` (Kiểm tra kiểu dữ liệu tĩnh).
  - `vitest run` (Chỉ các unit tests in-memory mock đã được xác minh không ghi DB).
  - `next build` / `nest build` (Kiểm tra build).
  - Tra cứu DB dạng Read-Only (`SELECT` / `findMany`).
- **An toàn Git**:
  - Không tự ý commit, push, rebase, hay clean untracked files.
  - Bảo vệ nguyên vẹn các uncommitted changes của Product Owner.

---

## O. DOCUMENTATION MAP

| Tài liệu | Đường dẫn | Mục đích sử dụng |
|---|---|---|
| **Agent Instructions** | [AGENTS.md](../../AGENTS.md) | Chỉ dẫn cốt lõi, reading order & operational protocol cho Agent tại root |
| **Working Rules** | [docs/WORKING_RULES.md](../WORKING_RULES.md) | Quy chuẩn kỹ thuật, Test Data Policy, AI Review 13 mục |
| **Business Context** | [docs/BUSINESS_CONTEXT.md](../BUSINESS_CONTEXT.md) | Ngữ cảnh nghiệp vụ nền tảng, 5 vai trò, mô hình nhà xe tập trung |
| **Codex Handoff** | [docs/ai-handoff/CODEX_HANDOFF.md](CODEX_HANDOFF.md) | *Tài liệu này*: Tổng hợp kiến trúc, domain model, approved decisions |
| **Current State** | [docs/ai-handoff/CURRENT_STATE.md](CURRENT_STATE.md) | Snapshot trạng thái code, migrations, tính năng đã/đang làm tại thời điểm bàn giao |
| **Latest AI Review** | [docs/ai-review/LATEST.md](../ai-review/LATEST.md) | Báo cáo chi tiết của task triển khai gần nhất (Trip Operation V2) |
| **Latest Diff** | [docs/ai-review/LATEST.diff](../ai-review/LATEST.diff) | Git diff của task triển khai gần nhất |
| **Trip Operation Plan** | [docs/ai-review/trip-operation-business-architecture-plan.md](../ai-review/trip-operation-business-architecture-plan.md) | Thiết kế chi tiết luồng vận hành chuyến xe 4 chặng V2 |
| **Trip Management Plan**| [docs/ai-review/trip-management-architecture-plan.md](../ai-review/trip-management-architecture-plan.md) | Thiết kế phê duyệt RoutePlan, sinh chuyến tự động, phân công nguồn lực |
| **RoutePlan-First Plan**| [docs/ai-review/routeplan-first-management-plan.md](../ai-review/routeplan-first-management-plan.md) | Thiết kế chuyển đổi Aggregate Root sang RoutePlan |

---

## P. DEFERRED BUSINESS SCOPE

Các nghiệp vụ đã được ghi nhận trong thiết kế nhưng **tạm hoãn triển khai (Deferred)** theo định hướng của Product Owner:
1. **Workflow Hủy RoutePlan & Giải phóng Xe**: Chưa tạo API và nút bấm hủy RoutePlan đang hoạt động để giải phóng holds phương tiện.
2. **Streaming GPS Thời Gian Thực qua WebSocket/SSE**: Hiện tại đáp ứng bằng cơ chế Smart Polling 5 giây; chưa triển khai WebSocket server.
3. **Quy trình Thay thế Tài xế/Xe khẩn cấp khi đang vận hành**: Khi chuyến đã `IN_PROGRESS`, hệ thống khóa phân công nguồn lực thông thường, chưa có luồng cứu hộ khẩn cấp.
4. **Hỗ trợ Đa nhà xe (Multi-tenant) hoặc Đa bãi xe**: Chưa triển khai, giữ vững mô hình 1 nhà xe, 1 bãi đỗ trung tâm.

---

## Q. KNOWN ARCHITECTURAL RISKS

1. **Tải Polling khi mở rộng quy mô lớn**:
   - Hiện tại: Polling 5s hoạt động rất tốt trên quy mô trường học thực tế hiện nay và không reload bản đồ.
   - Khuyến nghị tương lai: Khi số lượng xe hoạt động đồng thời vượt 50 xe, cân nhắc nâng cấp lên WebSocket đẩy vị trí xe.
2. **Phụ thuộc Network đối với Map Tiles**:
   - Bản đồ di động dùng MapLibre nạp raster tiles từ VietMap API. Thiết bị cần có kết nối mạng ổn định để tải các mảnh bản đồ.
