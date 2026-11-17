# RoadToSchool — Đọc và lập bản đồ API hiện có

## 1. Task Information

- Task: Đọc toàn bộ API của hệ thống.
- Ngày: 16/11/2026, giờ Việt Nam.
- Checkout: `D:/project/app-dua-don-ver2/road-to-school`.
- Branch / HEAD: `kietdm/mobile/refactor-ui` / `61d809c`.
- Project Scope: API / Documentation.
- Task Type: Analysis.
- Status: `COMPLETED` đối với việc đọc và lập danh mục API từ source.

## 2. Original Request

“Đọc toàn bộ api của hệ thông đi”.

## 3. Approved Scope

Đọc API hiện có, xác định endpoint, input/output, validation, quyền, domain và luồng nghiệp vụ. Không có yêu cầu triển khai tính năng, sửa bug, gọi mutation, thay đổi cấu hình hoặc vận hành DB.

Cập nhật báo cáo này và marker diff theo `AGENTS.md` và `docs/WORKING_RULES.md` mục 5. Giữ báo cáo trước trong history.

## 4. Analysis & Decisions

### 4.1. Nguồn và phương pháp đọc

- Thư mục chat OneDrive chỉ có metadata Git; mã nguồn được xác nhận tồn tại tại checkout ở trên, theo vị trí đã dùng trước đây rồi kiểm tra lại trực tiếp.
- Đọc quy tắc repo, Business Context, handoff, Current State, báo cáo trước; đối chiếu hướng dẫn FE và IoT/RFID với source.
- Đọc toàn bộ khai báo endpoint trong 27 file controller / 30 controller class: method, path, alias, role, guard, tham số, request/response DTO, annotation Swagger và phần chuyển giao tới service.
- Đọc định nghĩa và validation trong 91 file DTO. Rà cấu trúc phương thức, nhánh điều kiện, ngoại lệ, lời gọi DB/helper của service và helper tương ứng; đọc trực tiếp phần xử lý trọng tâm của quyền Trip, privacy Parent, operational-state, boarding/alighting, navigation, receipt RFID và đối soát hai DB.
- Đọc bootstrap, module wiring liên quan, Prisma schema và Mongo IoT schemas. Không coi số migration trong tài liệu lịch sử là trạng thái DB hiện tại.
- Đây là bản đồ API theo source, chưa phải kiểm thử runtime hoặc kiểm toán bảo mật toàn hệ thống.

### 4.2. Quy mô hiện tại

Có **185 hàm xử lý HTTP**, **191 cặp method/path duy nhất** nếu mở rộng 6 alias, trong **27 file controller**. Trong đó có **25 endpoint thuộc source IoT**, gồm cả RFID dưới prefix trips. Các endpoint IoT chỉ được đăng ký khi bật `IOT_ENABLED=true`; phần core còn lại là 166 đường dẫn theo cấu hình AppModule đầy đủ. Chưa kiểm chứng tập route đang chạy thực tế.

| Thư mục domain | Nội dung | Số method/path |
| --- | --- | ---: |
| `auth` | Xác thực và tài khoản | 12 |
| `drivers` | Tài xế | 6 |
| `health` | Health | 2 |
| `incidents` | Sự cố | 11 |
| `iot` | IoT, RFID, gán thiết bị | 25 |
| `leave-notices` | Báo nghỉ | 9 |
| `notifications` | Thông báo và push | 7 |
| `overview` | Tổng quan quản trị | 1 |
| `parents` | Phụ huynh và liên kết học sinh | 5 |
| `routes` | Tuyến, RoutePlan, tối ưu/chèn học sinh | 23 |
| `schools` | Trường, nhân sự, lịch và vòng đời | 24 |
| `student-requests` | Yêu cầu đổi thông tin/địa chỉ | 16 |
| `students` | Học sinh | 7 |
| `system-settings` | Bãi xe trung tâm | 5 |
| `trips` | Chuyến xe, điểm danh và điều hướng | 33 |
| `vehicles` | Phương tiện | 5 |
| **Tổng** | **Bao gồm alias, IoT có điều kiện** | **191** |

Ngoài HTTP có Socket.IO namespace `/iot`, event `new_rfid_scan`, dành cho SYSTEM_ADMIN đã xác thực. Event chỉ phát khi insert lượt quẹt raw mới thành công; retry không phát lại. Không tính event này vào 191 HTTP endpoints.

### 4.3. Kiến trúc và hợp đồng chung

- Backend NestJS; global prefix `/api/v1`. Port mặc định 3000; Swagger cấu hình tại `/api/docs` và OpenAPI tại `/api/docs-json`. Đây là cấu hình source, chưa xác nhận server đang chạy.
- DTO qua ValidationPipe với transform, whitelist và forbidNonWhitelisted; lỗi validation định dạng tiếng Việt, có code VALIDATION_ERROR.
- Dữ liệu nghiệp vụ PostgreSQL/Prisma; schema có 22 models, source có 22 thư mục migration. Chưa truy vấn DB hay kiểm tra migrations đã apply trong lượt này.
- MongoDB IoT dùng named connection `iot`: devices, device_wifi_configs, rfid_scans, rfid_enrollment_sessions. Mapping xe/thiết bị và receipt điểm danh nằm trong PostgreSQL.
- Bearer access JWT đi cùng Session DB: kiểm sid/sub/ver, hết hạn, revokedAt, user active và chính sách trường. Refresh xoay token pair; logout thu hồi phiên; đổi mật khẩu giữ phiên hiện tại và thu hồi các phiên khác.
- Role ở method ghi đè role ở class qua RolesGuard. Service tiếp tục kiểm trường, người được phân công, liên kết Parent và roster; không suy quyền chỉ từ tên route.
- Năm role: SYSTEM_ADMIN, SCHOOL_ADMIN, DRIVER, BUS_ATTENDANT, PARENT.
- OTP auth và OTP nghiệp vụ có cách kiểm khác nhau: nghiệp vụ có challenge/purpose/payload binding và tối đa 5 lần sai. Auth verifyOtp hiện chưa tăng attempts; không áp mặc định giới hạn 5 lần cho mọi endpoint.
- Upload ảnh kiểm MIME, size và magic bytes theo service; Cloudinary, SMTP/eSMS, VietMap, Expo Push là các tích hợp riêng cần cấu hình và nghiệm thu riêng.

### 4.4. Các luồng đã nắm

1. **Tuyến và nguồn lực:** SYSTEM_ADMIN chuẩn bị học sinh/xe, tối ưu hai chiều, preview rồi xác nhận DRAFT; phân công xe/tài xế, SCHOOL_ADMIN gán phụ xe và duyệt ACTIVE. Kiểm hợp đồng, chỗ ngồi, học sinh thuộc phương án khác, giữ chỗ và nguồn lực. Chỉ sinh chuyến từ ngày phục vụ đủ điều kiện sau activation.
2. **Chuyến thực và lịch dự kiến:** admin/Parent có thể nhận PERSISTED và VIRTUAL; VIRTUAL không thay cho Trip thực để thao tác. Sinh chuyến lưu snapshot tuyến/phân công và TripAttendance riêng.
3. **Chiều TO_SCHOOL:** phụ xe Ready → tài xế Start → điểm danh dọc đường → tài xế xác nhận đến trường → phụ xe xác nhận xuống → tài xế Complete. Không còn UNMARKED, ABSENT phải có lý do, PRESENT phải xuống hết trước Complete.
4. **Chiều TO_PARKING:** phụ xe Ready và điểm danh tại trường trước Start; tất cả phải được đánh dấu, có ít nhất một PRESENT. Khi chạy xác nhận xuống từng trẻ; đủ điều kiện mới Complete. Toàn vắng có workflow cancel-all-absent riêng.
5. **Đính chính và mở lại:** correction chỉ phụ xe đúng phân công, sau arrival chiều đi/trước Complete, chưa alighted, có expectedStatus và lý do. Reopen dành cho SYSTEM_ADMIN, kiểm ngày/giờ/nguồn lực và dựng snapshot/roster theo nguồn hiện hành, giữ audit.
6. **Báo nghỉ:** options → OTP → confirm. Parent báo cho con, nhân sự báo cho mình. Parent/BUS_ATTENDANT bị chặn sau Ready cả hai chiều; DRIVER chiều đi có ngoại lệ khi còn SCHEDULED. Người quản trị xử lý thay thế hoặc hủy chuyến theo phạm vi.
7. **Cập nhật học sinh/địa chỉ:** Parent OTP với payload hash → request PENDING → admin duyệt/từ chối. Địa chỉ đang thuộc tuyến cần SYSTEM_ADMIN xử lý định tuyến; REOPTIMIZED cần previewToken + expectedFingerprint. Đồng bộ chuyến tương lai chưa frozen, giữ snapshot lịch sử và chuyến đã vận hành.
8. **Vòng đời trường/bãi:** effectiveDate cho thay đổi tương lai, lịch nghỉ/học bù, gia hạn hợp đồng và admin-finalization cho chuyến ngoại lệ. Ready/điểm danh/đang chạy ảnh hưởng frozen policy. Các cron đối soát và scheduler là tiến trình ghi dữ liệu, không được khởi chạy chỉ để đọc tài liệu.
9. **Theo dõi:** driver quản lý navigation session/run, publish position có sequence và giới hạn 5 giây, segment tới target hiện tại, history theo cursor. Navigation cursor không tự điểm danh, đến trường hoặc Complete. Parent được scope theo con; detail ẩn điểm trẻ khác/bãi và polyline đầy đủ.
10. **Sự cố:** báo thiếu nhân sự, không người đón, giao thông, mất GPS; xử lý ARRIVED/REPLACED/close theo loại. Detector có OFF_ROUTE >50m duy trì ít nhất15s, LATE_STOP >3 phút duy trì ít nhất15s; cảnh báo GPS im hơn3 phút. Chưa chạy detector trong lượt này.
11. **Thông báo:** inbox theo người, summary, read/read-all, target resolver kiểm quyền hiện hành; Expo push đăng ký vào Session và có delivery/retry policy khi được bật.
12. **IoT/RFID:** quản trị provision/register, Wi-Fi mã hóa, firmware, gán xe; ESP dùng device key. Enrollment REGISTER/REPLACE có phiên và xác nhận riêng. RFID attendance capture chỉ tạo candidate/rejection, không tự ghi điểm danh. BUS_ATTENDANT đúng Trip confirm/dismiss; confirm có thể trả202 pending và phải đối soát receipt, không ghi lặp. Không đưa root/device key vào Mobile.

### 4.5. Những giới hạn source cần nhớ khi dùng API

Các giới hạn R01/R02/R07/R08/R09 đã được ghi trong `docs/FE_INTEGRATION_GUIDE.md` mục 13; lượt này tiếp tục đối chiếu với source, chưa sửa:

- **R01:** canReportLeave khác nhau giữa Home/detail/schedule và options; mutation OTP/confirm kiểm lại theo role/chiều/Ready.
- **R02:** operational-state chưa kiểm nguồn lực đang IN_PROGRESS ở Trip khác; Start kiểm và có thể trả409 dù flag trước đó cho phép.
- **R07:** getOperationalState tính counters và children trên toàn bộ attendances chưa lọc excludedAt, trong khi roster và Start/Arrive/Complete dùng active attendances.
- **R08:** writeBoarding/writeAlighting dùng cho manual kiểm attendance tồn tại nhưng chưa chặn excludedAt; correction và RFID đã có kiểm active roster.
- **R09:** lịch phụ xe chưa áp effectiveTripTiming như lịch tài xế/Home/detail.

Ghi chú bổ sung từ source:
- Complete chiều về chưa có điều kiện GPS chứng minh xe đã tới PARKING_END; không coi thành công API Complete là bằng chứng vật lý về bãi.
- VietMap VRP có nhánh fallback nội bộ khi thiếu VIETMAP_SERVICES_KEY; không coi mọi preview là kết quả provider thực.
- Các preview được giữ trong Map tại process, có TTL theo luồng (RoutePlan30 phút; insertion/address10 phút), nên restart và nhiều instance cần được xét khi tích hợp.
- PostgreSQL và MongoDB không có transaction chung;202/pending và receipt là một phần của hợp đồng, không được báo thành công từ202 hoặc retry một action khác để bù.
- `docs/implementation/api-catalog.md` ghi mốc28/10, chưa bao quát các endpoint lifecycle/IoT/RFID và phần bổ sung mới. Danh mục bên dưới lấy từ source HEAD hiện tại.

### 4.6. Danh mục HTTP đầy đủ theo controller

Các path dưới đây đã gồm `/api/v1`. JWT nghĩa mọi tài khoản qua AuthGuard nếu method không có Roles riêng; service có thể thu hẹp tiếp. DEVICE_KEY là IotDeviceGuard. PUBLIC nghĩa controller/method không gắn guard, không suy ra được bỏ validation/nghiệp vụ. Vai trò trong bảng là gate tại controller, không thay object-level checks trong service.


#### AuthController

Nguồn: [api/src/auth/auth.controller.ts](../../api/src/auth/auth.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/auth/web/login` | PUBLIC | `@Body() dto: LoginDto` | `webLogin` → `Promise<AuthResponseDto>` (api/src/auth/auth.controller.ts:72) |
| POST `/api/v1/auth/mobile/login` | PUBLIC | `@Body() dto: LoginDto` | `mobileLogin` → `Promise<AuthResponseDto>` (api/src/auth/auth.controller.ts:101) |
| POST `/api/v1/auth/register/request-otp` | PUBLIC | `@Body() dto: RegisterRequestOtpDto` | `registerRequestOtp` → `Promise<MessageResponseDto>` (api/src/auth/auth.controller.ts:131) |
| POST `/api/v1/auth/register/verify` | PUBLIC | `@Body() dto: RegisterVerifyDto` | `registerVerify` → `Promise<AuthResponseDto>` (api/src/auth/auth.controller.ts:157) |
| POST `/api/v1/auth/forgot-password/request-otp` | PUBLIC | `@Body() dto: ForgotPasswordRequestOtpDto` | `forgotPasswordRequestOtp` → `Promise<MessageResponseDto>` (api/src/auth/auth.controller.ts:179) |
| POST `/api/v1/auth/reset-password` | PUBLIC | `@Body() dto: ResetPasswordDto` | `resetPassword` → `Promise<MessageResponseDto>` (api/src/auth/auth.controller.ts:201) |
| POST `/api/v1/auth/refresh` | PUBLIC | `@Body() dto: RefreshTokenDto` | `refresh` → `Promise<TokenPairResponseDto>` (api/src/auth/auth.controller.ts:223) |
| GET `/api/v1/auth/me` | JWT | `Path/session theo signature` | `getMe` → `Promise<UserResponseDto>` (api/src/auth/auth.controller.ts:246) |
| POST `/api/v1/auth/logout` | JWT | `Path/session theo signature` | `logout` → `Promise<MessageResponseDto>` (api/src/auth/auth.controller.ts:268) |
| POST `/api/v1/auth/me/change-password` | JWT | `@Body() dto: ChangePasswordDto` | `changePassword` → `Promise<MessageResponseDto>` (api/src/auth/auth.controller.ts:296) |
| POST `/api/v1/auth/me/avatar` | JWT | `@UploadedFile() file?: Express.Multer.File` | `updateAvatar` → `Promise<AvatarResponseDto>` (api/src/auth/auth.controller.ts:335) |
| PATCH `/api/v1/auth/me/name` | PARENT | `@Body() dto: UpdateParentNameDto` | `updateParentName` → `Promise<UserResponseDto>` (api/src/auth/auth.controller.ts:360) |

#### DriversController

Nguồn: [api/src/drivers/drivers.controller.ts](../../api/src/drivers/drivers.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/drivers` | SYSTEM_ADMIN | `@Query() query: ListDriversQueryDto` | `listDrivers` → `Promise<DriverListResponseDto>` (api/src/drivers/drivers.controller.ts:75) |
| POST `/api/v1/drivers` | SYSTEM_ADMIN | `@Body() dto: CreateDriverDto` | `createDriver` → `Promise<CreateDriverResponseDto>` (api/src/drivers/drivers.controller.ts:109) |
| POST `/api/v1/drivers/:id/credentials/resend` | SYSTEM_ADMIN | `Path/session theo signature` | `resendCredentials` → `Promise<CredentialDeliveryResultDto>` (api/src/drivers/drivers.controller.ts:126) |
| GET `/api/v1/drivers/:id/deactivation-impact` | SYSTEM_ADMIN | `Path/session theo signature` | `getDeactivationImpact` → `Promise<DriverDeactivationImpactDto>` (api/src/drivers/drivers.controller.ts:147) |
| PATCH `/api/v1/drivers/:id/status` | SYSTEM_ADMIN | `@Body() dto: UpdateDriverStatusDto` | `updateDriverStatus` → `Promise<DriverItemDto>` (api/src/drivers/drivers.controller.ts:173) |
| GET `/api/v1/drivers/:id` | SYSTEM_ADMIN | `Path/session theo signature` | `getDriver` → `Promise<DriverItemDto>` (api/src/drivers/drivers.controller.ts:212) |

#### HealthController

Nguồn: [api/src/health/health.controller.ts](../../api/src/health/health.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/health` | PUBLIC | `Path/session theo signature` | `getHealth` → `Response suy ra từ service` (api/src/health/health.controller.ts:13) |
| GET `/api/v1/health/db` | PUBLIC | `Path/session theo signature` | `getDbHealth` → `Response suy ra từ service` (api/src/health/health.controller.ts:20) |

#### IncidentsController

Nguồn: [api/src/incidents/incidents.controller.ts](../../api/src/incidents/incidents.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/incidents/:id/close` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Body() dto: CloseIncidentDto` | `close` → `TripIncidentResponseDto` (api/src/incidents/incidents.controller.ts:63) |
| GET `/api/v1/trips/:id/incident-options` | DRIVER, BUS_ATTENDANT, SCHOOL_ADMIN, SYSTEM_ADMIN | `Path/session theo signature` | `getIncidentOptions` → `Promise<IncidentOptionsResponseDto>` (api/src/incidents/incidents.controller.ts:77) |
| POST `/api/v1/trips/:id/incidents` | DRIVER, BUS_ATTENDANT | `@Body() dto: CreateIncidentDto` | `createManualIncident` → `Promise<TripIncidentResponseDto>` (api/src/incidents/incidents.controller.ts:97) |
| GET `/api/v1/trips/:id/incidents` | DRIVER, BUS_ATTENDANT, PARENT, SCHOOL_ADMIN, SYSTEM_ADMIN | `Path/session theo signature` | `listByTrip` → `Promise<TripIncidentsTabResponseDto>` (api/src/incidents/incidents.controller.ts:114) |
| GET `/api/v1/incidents/mine` | DRIVER, BUS_ATTENDANT, SCHOOL_ADMIN, SYSTEM_ADMIN | `@Query() query: ListMineIncidentsQueryDto` | `listMine` → `Promise<PaginatedIncidentsResponseDto>` (api/src/incidents/incidents.controller.ts:129) |
| GET `/api/v1/incidents` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Query() query: ListIncidentsQueryDto` | `listAdmin` → `Promise<PaginatedIncidentsResponseDto>` (api/src/incidents/incidents.controller.ts:144) |
| GET `/api/v1/incidents/:id/replacement-candidates` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `getReplacementCandidates` → `Promise<ReplacementCandidatesResponseDto>` (api/src/incidents/incidents.controller.ts:160) |
| GET `/api/v1/incidents/:id` | DRIVER, BUS_ATTENDANT, PARENT, SCHOOL_ADMIN, SYSTEM_ADMIN | `Path/session theo signature` | `getDetail` → `Promise<TripIncidentResponseDto>` (api/src/incidents/incidents.controller.ts:175) |
| POST `/api/v1/incidents/:id/resolve` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Body() dto: ResolveIncidentDto` | `resolveIncident` → `Promise<TripIncidentResponseDto>` (api/src/incidents/incidents.controller.ts:195) |
| POST `/api/v1/incidents/:id/cancel-trip` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Body() dto: CancelTripIncidentDto` | `cancelTripFromIncident` → `Promise<TripIncidentResponseDto>` (api/src/incidents/incidents.controller.ts:216) |
| POST `/api/v1/incidents/:id/confirm` | BUS_ATTENDANT | `@Body() dto: ConfirmIncidentDto` | `confirmAutoIncident` → `Promise<TripIncidentResponseDto>` (api/src/incidents/incidents.controller.ts:237) |

#### IotAssignmentsController

Nguồn: [api/src/iot/assignments/iot-assignments.controller.ts](../../api/src/iot/assignments/iot-assignments.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/iot/devices/:deviceId/vehicle-assignment` | SYSTEM_ADMIN | `Path/session theo signature` | `current` → `IotAssignmentStateDto ` (api/src/iot/assignments/iot-assignments.controller.ts:49) |
| GET `/api/v1/iot/devices/:deviceId/vehicle-assignments` | SYSTEM_ADMIN | `@Query() query: ListIotQueryDto` | `history` → `IotAssignmentHistoryDto ` (api/src/iot/assignments/iot-assignments.controller.ts:59) |
| PUT `/api/v1/iot/devices/:deviceId/vehicle-assignment` | SYSTEM_ADMIN | `@Body() dto: AssignIotVehicleDto` | `change` → `IotAssignmentStateDto ` (api/src/iot/assignments/iot-assignments.controller.ts:75) |
| DELETE `/api/v1/iot/devices/:deviceId/vehicle-assignment` | SYSTEM_ADMIN | `@Body() dto: ReleaseIotVehicleDto` | `release` → `IotAssignmentStateDto ` (api/src/iot/assignments/iot-assignments.controller.ts:89) |

#### IotRuntimeController

Nguồn: [api/src/iot/assignments/iot-runtime.controller.ts](../../api/src/iot/assignments/iot-runtime.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/iot/devices/:deviceId/runtime-config` | DEVICE_KEY | `Path/session theo signature` | `config` → `IotRuntimeConfigDto ` (api/src/iot/assignments/iot-runtime.controller.ts:46) |
| POST `/api/v1/iot/devices/:deviceId/heartbeat` | DEVICE_KEY | `@Body() dto: IotHeartbeatDto` | `heartbeat` → `IotHeartbeatResponseDto ` (api/src/iot/assignments/iot-runtime.controller.ts:58) |

#### AttendanceDeviceController

Nguồn: [api/src/iot/attendance/attendance.controller.ts](../../api/src/iot/attendance/attendance.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/iot/devices/:deviceId/attendance-scans` | DEVICE_KEY | `@Body() dto: AttendanceScanDto` | `capture` → `AttendanceCaptureAckDto ` (api/src/iot/attendance/attendance.controller.ts:60) |

#### AttendanceTripController

Nguồn: [api/src/iot/attendance/attendance.controller.ts](../../api/src/iot/attendance/attendance.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/trips/:tripId/rfid-scans` | BUS_ATTENDANT | `@Query() q: AttendanceListQueryDto` | `list` → `AttendanceListDto ` (api/src/iot/attendance/attendance.controller.ts:80) |
| POST `/api/v1/trips/:tripId/rfid-scans/:scanId/confirm` | BUS_ATTENDANT | `@Body() body: AttendanceActionDto` | `confirm` → `AttendanceEventDto , AttendanceEventDto ` (api/src/iot/attendance/attendance.controller.ts:106) |
| POST `/api/v1/trips/:tripId/rfid-scans/:scanId/dismiss` | BUS_ATTENDANT | `@Body() body: AttendanceActionDto` | `dismiss` → `AttendanceEventDto ` (api/src/iot/attendance/attendance.controller.ts:128) |

#### IotDevicesController

Nguồn: [api/src/iot/devices/iot-devices.controller.ts](../../api/src/iot/devices/iot-devices.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/iot/devices/provision` | SYSTEM_ADMIN | `@Body() dto: RegisterIotDeviceDto` | `provision` → `ProvisionedIotDeviceResponseDto ` (api/src/iot/devices/iot-devices.controller.ts:26) |
| POST `/api/v1/iot/devices/register` | SYSTEM_ADMIN | `@Body() dto: RegisterIotDeviceDto` | `register` → `RegisteredIotDeviceResponseDto ` (api/src/iot/devices/iot-devices.controller.ts:33) |
| GET `/api/v1/iot/devices` | SYSTEM_ADMIN | `@Query() query: ListIotQueryDto` | `list` → `IotDevicesResponseDto ` (api/src/iot/devices/iot-devices.controller.ts:40) |

#### EnrollmentController

Nguồn: [api/src/iot/enrollment/enrollment.controller.ts](../../api/src/iot/enrollment/enrollment.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/iot/enrollment-sessions` | SYSTEM_ADMIN | `@Body() dto: StartEnrollmentDto` | `start` → `EnrollmentResponseDto , EnrollmentResponseDto` (api/src/iot/enrollment/enrollment.controller.ts:66) |
| GET `/api/v1/iot/enrollment-sessions` | SYSTEM_ADMIN | `@Query() q: EnrollmentQueryDto` | `list` → `EnrollmentListDto ` (api/src/iot/enrollment/enrollment.controller.ts:80) |
| GET `/api/v1/iot/enrollment-sessions/:sessionId` | SYSTEM_ADMIN | `Path/session theo signature` | `get` → `EnrollmentResponseDto ` (api/src/iot/enrollment/enrollment.controller.ts:92) |
| POST `/api/v1/iot/enrollment-sessions/:sessionId/confirm` | SYSTEM_ADMIN | `@Body() dto: ConfirmEnrollmentDto` | `confirm` → `EnrollmentResponseDto , EnrollmentResponseDto` (api/src/iot/enrollment/enrollment.controller.ts:110) |
| POST `/api/v1/iot/enrollment-sessions/:sessionId/reconcile` | SYSTEM_ADMIN | `Path/session theo signature` | `reconcile` → `EnrollmentResponseDto , EnrollmentResponseDto ` (api/src/iot/enrollment/enrollment.controller.ts:135) |
| DELETE `/api/v1/iot/enrollment-sessions/:sessionId` | SYSTEM_ADMIN | `Path/session theo signature` | `cancel` → `EnrollmentResponseDto ` (api/src/iot/enrollment/enrollment.controller.ts:152) |

#### StudentRfidController

Nguồn: [api/src/iot/enrollment/enrollment.controller.ts](../../api/src/iot/enrollment/enrollment.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| DELETE `/api/v1/iot/students/:studentId/rfid-card` | SYSTEM_ADMIN | `@Body() dto: RevokeStudentRfidDto` | `revoke` → `StudentRfidBindingDto` (api/src/iot/enrollment/enrollment.controller.ts:177) |

#### EnrollmentDeviceController

Nguồn: [api/src/iot/enrollment/enrollment.controller.ts](../../api/src/iot/enrollment/enrollment.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/iot/devices/:deviceId/enrollment-scans` | DEVICE_KEY | `@Body() dto: EnrollmentScanDto` | `capture` → `EnrollmentCaptureAckDto ` (api/src/iot/enrollment/enrollment.controller.ts:197) |

#### IotFirmwareController

Nguồn: [api/src/iot/firmware/iot-firmware.controller.ts](../../api/src/iot/firmware/iot-firmware.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/iot/firmware/latest.bin` | SYSTEM_ADMIN | `Path/session theo signature` | `latest` → `Promise<StreamableFile>` (api/src/iot/firmware/iot-firmware.controller.ts:26) |

#### IotScansController

Nguồn: [api/src/iot/scans/iot-scans.controller.ts](../../api/src/iot/scans/iot-scans.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/iot/scans` | DEVICE_KEY | `@Body() dto: ReceiveIotScanDto` | `receive` → `ReceivedIotScanResponseDto ` (api/src/iot/scans/iot-scans.controller.ts:26) |
| GET `/api/v1/iot/scans` | SYSTEM_ADMIN | `@Query() query: ListIotScansQueryDto` | `list` → `IotScansResponseDto ` (api/src/iot/scans/iot-scans.controller.ts:36) |

#### IotWifiController

Nguồn: [api/src/iot/wifi/iot-wifi.controller.ts](../../api/src/iot/wifi/iot-wifi.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/iot/wifi/save` | SYSTEM_ADMIN | `@Body() dto: SaveIotWifiDto` | `save` → `IotWifiResponseDto ` (api/src/iot/wifi/iot-wifi.controller.ts:26) |

#### LeaveNoticesController

Nguồn: [api/src/leave-notices/leave-notices.controller.ts](../../api/src/leave-notices/leave-notices.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/leave-notices/options` | PARENT, DRIVER, BUS_ATTENDANT | `@Query() query: LeaveNoticeOptionsQueryDto` | `getOptions` → `Promise<LeaveNoticeOptionsResponseDto>` (api/src/leave-notices/leave-notices.controller.ts:59) |
| POST `/api/v1/leave-notices/otp` | PARENT, DRIVER, BUS_ATTENDANT | `@Body() dto: RequestLeaveNoticeOtpDto` | `requestOtp` → `Promise<LeaveNoticeOtpResponseDto>` (api/src/leave-notices/leave-notices.controller.ts:78) |
| POST `/api/v1/leave-notices/confirm` | PARENT, DRIVER, BUS_ATTENDANT | `@Body() dto: ConfirmLeaveNoticeDto` | `confirmNotice` → `Promise<LeaveNoticeResponseDto>` (api/src/leave-notices/leave-notices.controller.ts:95) |
| GET `/api/v1/leave-notices` | SYSTEM_ADMIN, SCHOOL_ADMIN, DRIVER, BUS_ATTENDANT, PARENT | `@Query() query: ListLeaveNoticesQueryDto` | `listNotices` → `Promise<LeaveNoticeListResponseDto>` (api/src/leave-notices/leave-notices.controller.ts:109) |
| GET `/api/v1/leave-notices/:id` | SYSTEM_ADMIN, SCHOOL_ADMIN, DRIVER, BUS_ATTENDANT, PARENT | `Path/session theo signature` | `getNoticeDetail` → `Promise<LeaveNoticeResponseDto>` (api/src/leave-notices/leave-notices.controller.ts:124) |
| POST `/api/v1/leave-notices/:id/cancel` | PARENT, DRIVER, BUS_ATTENDANT | `Path/session theo signature` | `cancelNotice` → `Promise<LeaveNoticeResponseDto>` (api/src/leave-notices/leave-notices.controller.ts:142) |
| GET `/api/v1/leave-notices/:id/replacement-candidates` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `getReplacementCandidates` → `Promise<ReplacementCandidatesResponseDto>` (api/src/leave-notices/leave-notices.controller.ts:159) |
| POST `/api/v1/leave-notices/:id/assign-replacement` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Body() dto: AssignReplacementDto` | `assignReplacement` → `Promise<LeaveNoticeResponseDto>` (api/src/leave-notices/leave-notices.controller.ts:176) |
| POST `/api/v1/leave-notices/:id/cancel-trip` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Body() dto: CancelTripFromNoticeDto` | `cancelTripFromNotice` → `Promise<LeaveNoticeResponseDto>` (api/src/leave-notices/leave-notices.controller.ts:194) |

#### NotificationsController

Nguồn: [api/src/notifications/notifications.controller.ts](../../api/src/notifications/notifications.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/notifications` | JWT | `@Query() query: NotificationsQueryDto` | `list` → `NotificationListDto ` (api/src/notifications/notifications.controller.ts:24) |
| GET `/api/v1/notifications/summary` | JWT | `Path/session theo signature` | `summary` → `NotificationSummaryDto ` (api/src/notifications/notifications.controller.ts:26) |
| PUT `/api/v1/notifications/read-all` | JWT | `Path/session theo signature` | `readAll` → `NotificationResultDto ` (api/src/notifications/notifications.controller.ts:28) |
| PUT `/api/v1/notifications/device` | DRIVER, BUS_ATTENDANT, PARENT | `@Body() body: PushRegistrationDto` | `register` → `NotificationResultDto ` (api/src/notifications/notifications.controller.ts:30) |
| DELETE `/api/v1/notifications/device` | DRIVER, BUS_ATTENDANT, PARENT | `Path/session theo signature` | `unregister` → `NotificationResultDto ` (api/src/notifications/notifications.controller.ts:35) |
| GET `/api/v1/notifications/:id/target` | JWT | `Path/session theo signature` | `target` → `NotificationTargetDto ` (api/src/notifications/notifications.controller.ts:37) |
| PUT `/api/v1/notifications/:id/read` | JWT | `Path/session theo signature` | `read` → `NotificationResultDto ` (api/src/notifications/notifications.controller.ts:39) |

#### OverviewController

Nguồn: [api/src/overview/overview.controller.ts](../../api/src/overview/overview.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/admin/overview` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Query() query: OverviewQueryDto` | `get` → `Promise<OverviewResponseDto>` (api/src/overview/overview.controller.ts:26) |

#### ParentsController

Nguồn: [api/src/parents/parents.controller.ts](../../api/src/parents/parents.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/parents/students` | PARENT | `Path/session theo signature` | `getLinkedStudents` → `Promise<ParentLinkedStudentItemDto[]>` (api/src/parents/parents.controller.ts:62) |
| GET `/api/v1/parents/students/:id` | PARENT | `Path/session theo signature` | `getLinkedStudentDetail` → `Promise<ParentLinkedStudentDetailResponseDto>` (api/src/parents/parents.controller.ts:100) |
| POST `/api/v1/parents/link-requests` | PARENT | `@Body() dto: RequestLinkOtpDto` | `requestLinkOtp` → `Promise<RequestLinkOtpResponseDto>` (api/src/parents/parents.controller.ts:148) |
| POST `/api/v1/parents/verify-link` | PARENT | `@Body() dto: VerifyLinkOtpDto` | `verifyLinkOtp` → `Promise<VerifyLinkOtpResponseDto>` (api/src/parents/parents.controller.ts:187) |
| DELETE `/api/v1/parents/students/:id` | PARENT | `Path/session theo signature` | `unlinkStudent` → `Promise<{ message: string }>` (api/src/parents/parents.controller.ts:225) |

#### RoutesController

Nguồn: [api/src/routes/routes.controller.ts](../../api/src/routes/routes.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/routes/preparation/:schoolId` | SYSTEM_ADMIN | `@Query() query: GeographyQueryDto` | `getPreparationData` → `Promise<RoutePreparationDto>` (api/src/routes/routes.controller.ts:82) |
| POST `/api/v1/routes/optimize-preview` | SYSTEM_ADMIN | `@Body() dto: OptimizeRouteDto` | `optimizePreview` → `Promise<RoutePreviewResponseDto>` (api/src/routes/routes.controller.ts:103) |
| POST `/api/v1/routes/preview/cancel-return` | SYSTEM_ADMIN | `@Body() dto: CancelReturnRouteDto` | `cancelReturnRoute` → `Promise<RoutePreviewResponseDto>` (api/src/routes/routes.controller.ts:123) |
| POST `/api/v1/routes/confirm-plan` | SYSTEM_ADMIN | `@Body() dto: ConfirmRoutePlanDto` | `confirmPlan` → `Promise<RoutePlanResponseDto>` (api/src/routes/routes.controller.ts:144) |
| GET `/api/v1/routes/route-plans` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Query() query: ListRoutePlansQueryDto` | `listRoutePlans` → `Response suy ra từ service` (api/src/routes/routes.controller.ts:162) |
| GET `/api/v1/routes/route-plans/:id` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `getRoutePlanDetail` → `Promise<RoutePlanResponseDto>` (api/src/routes/routes.controller.ts:181) |
| GET `/api/v1/routes/route-plans/:id/cancellation-impact` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `getCancellationImpact` → `Promise<RoutePlanCancellationImpactDto>` (api/src/routes/routes.controller.ts:201) |
| POST `/api/v1/routes/route-plans/:id/cancel` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Body() dto: CancelRoutePlanDto` | `cancelRoutePlan` → `Promise<{ message: string }>` (api/src/routes/routes.controller.ts:223) |
| GET `/api/v1/routes/route-plans/:id/approval-readiness` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `getApprovalReadiness` → `Promise<ApprovalReadinessResponseDto>` (api/src/routes/routes.controller.ts:244) |
| POST `/api/v1/routes/route-plans/:id/re-optimize` | SYSTEM_ADMIN | `Path/session theo signature` | `reoptimizeRoutePlan` → `Promise<RoutePlanResponseDto>` (api/src/routes/routes.controller.ts:269) |
| POST `/api/v1/routes/route-plans/:id/approve` | SCHOOL_ADMIN | `Path/session theo signature` | `approveRoutePlan` → `Promise<RoutePlanResponseDto>` (api/src/routes/routes.controller.ts:291) |
| GET `/api/v1/routes/route-plans/:id/candidate-vehicles` | SYSTEM_ADMIN | `@Query('currentVehicleId') currentVehicleId?: string` | `getCandidateVehicles` → `Promise<CandidateVehiclesResponseDto>` (api/src/routes/routes.controller.ts:313) |
| GET `/api/v1/routes/route-plans/:id/candidate-drivers` | SYSTEM_ADMIN | `@Query('vehicleId') vehicleId?: string` | `getCandidateDrivers` → `Promise<CandidateDriversResponseDto>` (api/src/routes/routes.controller.ts:335) |
| GET `/api/v1/routes/route-plans/:id/candidate-bus-attendants` | SCHOOL_ADMIN | `@Query('vehicleId') vehicleId?: string` | `getCandidateBusAttendants` → `Promise<CandidateBusAttendantsResponseDto>` (api/src/routes/routes.controller.ts:357) |
| PATCH `/api/v1/routes/route-plans/:id/assignments/vehicle` | SYSTEM_ADMIN | `@Body() dto: AssignVehicleGroupDto` | `replaceVehicleGroup` → `Promise<RoutePlanResponseDto>` (api/src/routes/routes.controller.ts:379) |
| PATCH `/api/v1/routes/route-plans/:id/assignments/driver` | SYSTEM_ADMIN | `@Body() dto: AssignDriverGroupDto` | `assignDriverGroup` → `Promise<RoutePlanResponseDto>` (api/src/routes/routes.controller.ts:401) |
| PATCH `/api/v1/routes/route-plans/:id/assignments/bus-attendant` | SCHOOL_ADMIN | `@Body() dto: AssignBusAttendantGroupDto` | `assignBusAttendantGroup` → `Promise<RoutePlanResponseDto>` (api/src/routes/routes.controller.ts:423) |
| GET `/api/v1/routes` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Query('schoolId') schoolId?: string; @Query('direction') direction?: RouteDirection; @Query('status') status?: RoutePlanStatus; @Query('search') search?: string; @Query('page') page?: string; @Query('limit') limit?: string` | `listRoutes` → `Response suy ra từ service` (api/src/routes/routes.controller.ts:458) |
| GET `/api/v1/routes/:id` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `getRouteDetail` → `Promise<RouteResponseDto>` (api/src/routes/routes.controller.ts:493) |
| GET `/api/v1/routes/students/:studentId/routing` | SYSTEM_ADMIN, SCHOOL_ADMIN, PARENT | `Path/session theo signature` | `getStudentRoutingDetail` → `Promise<StudentRoutingDetailDto>` (api/src/routes/routes.controller.ts:513) |
| GET `/api/v1/routes/students/:studentId/insertion-options` | SYSTEM_ADMIN | `Path/session theo signature` | `getStudentInsertionOptions` → `Promise<StudentInsertionOptionsResponseDto>` (api/src/routes/routes.controller.ts:533) |
| POST `/api/v1/routes/student-insertions/preview` | SYSTEM_ADMIN | `@Body() dto: PreviewStudentInsertionDto` | `previewStudentInsertion` → `Promise<PreviewStudentInsertionResponseDto>` (api/src/routes/routes.controller.ts:553) |
| POST `/api/v1/routes/student-insertions/confirm` | SYSTEM_ADMIN | `@Body() dto: ConfirmStudentInsertionDto` | `confirmStudentInsertion` → `Promise<{ success: boolean; message: string; outboundRouteId?: string; returnRouteId?: string }>` (api/src/routes/routes.controller.ts:573) |

#### SchoolLifecycleController

Nguồn: [api/src/schools/school-lifecycle.controller.ts](../../api/src/schools/school-lifecycle.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/schools/:schoolId/scheduled-changes` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `listChanges` → `ScheduledChangeResponseDto` (api/src/schools/school-lifecycle.controller.ts:78) |
| POST `/api/v1/schools/:schoolId/scheduled-changes/:id/cancel` | SYSTEM_ADMIN | `Path/session theo signature` | `cancelChange` → `ScheduledChangeResponseDto` (api/src/schools/school-lifecycle.controller.ts:96) |
| GET `/api/v1/service-calendar` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Query('schoolId') schoolId?: string` | `listCalendar` → `CalendarEntryResponseDto` (api/src/schools/school-lifecycle.controller.ts:117) |
| POST `/api/v1/service-calendar` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Body() dto: CreateCalendarEntryDto` | `createCalendar` → `CalendarEntryResponseDto` (api/src/schools/school-lifecycle.controller.ts:136) |
| POST `/api/v1/service-calendar/:id/decision` | SYSTEM_ADMIN | `@Body() dto: CalendarDecisionDto` | `decideCalendar` → `CalendarEntryResponseDto` (api/src/schools/school-lifecycle.controller.ts:153) |
| POST `/api/v1/service-calendar/:id/cancel` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `cancelCalendar` → `CalendarEntryResponseDto` (api/src/schools/school-lifecycle.controller.ts:174) |
| GET `/api/v1/trips/admin-finalizations` | SYSTEM_ADMIN | `@Query('schoolId') schoolId?: string` | `pending` → `AdminTripResponseDto` (api/src/schools/school-lifecycle.controller.ts:194) |
| POST `/api/v1/trips/:id/admin-finalization` | SYSTEM_ADMIN | `@Body() dto: FinalizeTripDto` | `finalize` → `AdminTripResponseDto` (api/src/schools/school-lifecycle.controller.ts:213) |

#### SchoolsController

Nguồn: [api/src/schools/schools.controller.ts](../../api/src/schools/schools.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/schools` | SYSTEM_ADMIN | `@Body() dto: CreateSchoolDto; @UploadedFile() file?: Express.Multer.File` | `create` → `Promise<SchoolDetailResponseDto>` (api/src/schools/schools.controller.ts:171) |
| GET `/api/v1/schools/location-options` | SYSTEM_ADMIN | `@Query() query: LocationOptionsQueryDto` | `locationOptions` → `Promise<LocationOptionsDto>` (api/src/schools/schools.controller.ts:184) |
| GET `/api/v1/schools` | SYSTEM_ADMIN | `@Query() query: ListSchoolsQueryDto` | `findAll` → `Promise<SchoolListResponseDto>` (api/src/schools/schools.controller.ts:212) |
| GET `/api/v1/schools/:id` | SYSTEM_ADMIN | `Path/session theo signature` | `findOne` → `Promise<SchoolDetailResponseDto>` (api/src/schools/schools.controller.ts:251) |
| PATCH `/api/v1/schools/:id/status` | SYSTEM_ADMIN | `@Body() dto: UpdateSchoolStatusDto` | `updateStatus` → `Promise<UpdateSchoolStatusResponseDto>` (api/src/schools/schools.controller.ts:299) |
| GET `/api/v1/schools/:id/employees` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Query() query: ListSchoolEmployeesQueryDto` | `findEmployees` → `Promise<SchoolEmployeeListResponseDto>` (api/src/schools/schools.controller.ts:349) |
| GET `/api/v1/schools/:id/employees/:employeeId` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `findEmployeeDetail` → `Promise<SchoolEmployeeDetailResponseDto>` (api/src/schools/schools.controller.ts:401) |
| POST `/api/v1/schools/:id/employees` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Body() dto: CreateSchoolAdminDto` | `createSchoolAdmin` → `Promise<CreateSchoolAdminResponseDto>` (api/src/schools/schools.controller.ts:464) |
| POST `/api/v1/schools/:id/employees/:employeeId/credentials/resend` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `resendEmployeeCredentials` → `Promise<CredentialDeliveryResultDto>` (api/src/schools/schools.controller.ts:495) |
| GET `/api/v1/schools/:id/employees/:employeeId/deactivation-impact` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `getEmployeeDeactivationImpact` → `Promise<EmployeeDeactivationImpactDto>` (api/src/schools/schools.controller.ts:519) |
| PATCH `/api/v1/schools/:id/employees/:employeeId/status` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Body() dto: UpdateEmployeeStatusDto` | `updateEmployeeStatus` → `Promise<SchoolEmployeeDetailResponseDto>` (api/src/schools/schools.controller.ts:544) |
| GET `/api/v1/schools/:id/settings` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `getSettings` → `Response suy ra từ service` (api/src/schools/schools.controller.ts:562) |
| GET `/api/v1/schools/:id/location-impact` | SYSTEM_ADMIN | `@Query('latitude') latitude?: string; @Query('longitude') longitude?: string` | `getLocationImpact` → `Promise<SchoolLocationImpactDto>` (api/src/schools/schools.controller.ts:578) |
| PATCH `/api/v1/schools/:id/location` | SYSTEM_ADMIN | `@Body() dto: UpdateSchoolLocationDto` | `updateLocation` → `ScheduledLocationResponseDto ` (api/src/schools/schools.controller.ts:601) |
| PATCH `/api/v1/schools/:id/contract` | SYSTEM_ADMIN | `@Body() dto: UpdateSchoolContractDto` | `updateContract` → `Response suy ra từ service` (api/src/schools/schools.controller.ts:618) |
| PATCH `/api/v1/schools/:id/schedule` | SYSTEM_ADMIN | `@Body() dto: UpdateSchoolScheduleDto` | `updateSchedule` → `Promise<UpdateSchoolScheduleResponseDto>` (api/src/schools/schools.controller.ts:639) |

#### ParentRequestsController

Nguồn: [api/src/student-requests/parent-requests.controller.ts](../../api/src/student-requests/parent-requests.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/parents/students/:id/update-requests/otp` | PARENT | `@Body() dto: CreateRequestOtpDto` | `requestOtp` → `Promise<RequestOtpResponseDto>` (api/src/student-requests/parent-requests.controller.ts:74) |
| POST `/api/v1/parents/students/:id/update-requests/verify` | PARENT | `@Body() dto: VerifyRequestOtpDto` | `verifyOtpAndCreate` → `Promise<StudentUpdateRequestDto>` (api/src/student-requests/parent-requests.controller.ts:111) |
| GET `/api/v1/parents/students/:id/update-requests` | PARENT | `@Query() query: ListRequestsQueryDto` | `listRequests` → `Promise<StudentUpdateRequestListResponseDto>` (api/src/student-requests/parent-requests.controller.ts:139) |
| GET `/api/v1/parents/update-requests/:requestId` | PARENT | `Path/session theo signature` | `getRequestDetail` → `Promise<StudentUpdateRequestDto>` (api/src/student-requests/parent-requests.controller.ts:175) |
| POST `/api/v1/parents/update-requests/:requestId/cancel` | PARENT | `Path/session theo signature` | `cancelRequest` → `Promise<StudentUpdateRequestDto>` (api/src/student-requests/parent-requests.controller.ts:201) |

#### SchoolRequestsController

Nguồn: [api/src/student-requests/school-requests.controller.ts](../../api/src/student-requests/school-requests.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/schools/:schoolId/update-requests` | SCHOOL_ADMIN | `@Query() query: ListRequestsQueryDto` | `listRequests` → `Promise<StudentUpdateRequestListResponseDto>` (api/src/student-requests/school-requests.controller.ts:70) |
| GET `/api/v1/schools/:schoolId/students/:id/update-requests` | SCHOOL_ADMIN | `@Query() query: ListRequestsQueryDto` | `listStudentRequestHistory` → `Promise<StudentUpdateRequestListResponseDto>` (api/src/student-requests/school-requests.controller.ts:100) |
| GET `/api/v1/schools/:schoolId/update-requests/:requestId` | SCHOOL_ADMIN | `Path/session theo signature` | `getRequestDetail` → `Promise<StudentUpdateRequestDetailDto>` (api/src/student-requests/school-requests.controller.ts:133) |
| POST `/api/v1/schools/:schoolId/update-requests/:requestId/approve` | SCHOOL_ADMIN | `Path/session theo signature` | `approveRequest` → `Promise<StudentUpdateRequestDto>` (api/src/student-requests/school-requests.controller.ts:171) |
| POST `/api/v1/schools/:schoolId/update-requests/:requestId/reject` | SCHOOL_ADMIN | `@Body() dto: ReviewRequestDto` | `rejectRequest` → `Promise<StudentUpdateRequestDto>` (api/src/student-requests/school-requests.controller.ts:209) |
| PATCH `/api/v1/schools/:schoolId/students/:id/address` | SCHOOL_ADMIN | `@Body() dto: UpdateStudentAddressDto` | `directUpdateAddress` → `Response suy ra từ service` (api/src/student-requests/school-requests.controller.ts:247) |

#### SystemRequestsController

Nguồn: [api/src/student-requests/system-requests.controller.ts](../../api/src/student-requests/system-requests.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/system-admin/update-requests` | SYSTEM_ADMIN | `@Query() query: ListRequestsQueryDto` | `listAddressRequests` → `Promise<StudentUpdateRequestListResponseDto>` (api/src/student-requests/system-requests.controller.ts:57) |
| GET `/api/v1/system-admin/update-requests/:requestId` | SYSTEM_ADMIN | `Path/session theo signature` | `getAddressRequestDetail` → `Promise<StudentUpdateRequestDetailDto>` (api/src/student-requests/system-requests.controller.ts:87) |
| POST `/api/v1/system-admin/update-requests/:requestId/routing-preview` | SYSTEM_ADMIN | `@Body() dto: StudentAddressRoutingPreviewDto` | `previewRouting` → `Promise<StudentAddressRoutingPreviewResponseDto>` (api/src/student-requests/system-requests.controller.ts:111) |
| POST `/api/v1/system-admin/update-requests/:requestId/approve` | SYSTEM_ADMIN | `@Body() dto?: ApproveAddressRequestDto` | `approveAddressRequest` → `Promise<StudentUpdateRequestDto>` (api/src/student-requests/system-requests.controller.ts:149) |
| POST `/api/v1/system-admin/update-requests/:requestId/reject` | SYSTEM_ADMIN | `@Body() dto: ReviewRequestDto` | `rejectAddressRequest` → `Promise<StudentUpdateRequestDto>` (api/src/student-requests/system-requests.controller.ts:187) |

#### StudentsController

Nguồn: [api/src/students/students.controller.ts](../../api/src/students/students.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/schools/:schoolId/students/:studentId/parent-links/:parentId/revoke` | SCHOOL_ADMIN | `@Body() dto: TripReasonDto` | `revokeLink` → `TripActionMessageDto` (api/src/students/students.controller.ts:65) |
| GET `/api/v1/schools/:schoolId/students/location-options` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Query() query: LocationOptionsQueryDto` | `locationOptions` → `Promise<LocationOptionsDto>` (api/src/students/students.controller.ts:76) |
| GET `/api/v1/schools/:schoolId/students` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Query() query: ListStudentsQueryDto` | `listStudents` → `Promise<StudentListResponseDto>` (api/src/students/students.controller.ts:114) |
| POST `/api/v1/schools/:schoolId/students` | SCHOOL_ADMIN | `@Body() dto: CreateStudentDto; @UploadedFile() file: Express.Multer.File &#124; undefined` | `createStudent` → `Promise<StudentItemDto>` (api/src/students/students.controller.ts:209) |
| GET `/api/v1/schools/:schoolId/students/:id` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `getStudent` → `Promise<StudentDetailResponseDto>` (api/src/students/students.controller.ts:264) |
| GET `/api/v1/schools/:schoolId/students/:id/disable-impact` | SCHOOL_ADMIN, SYSTEM_ADMIN | `Path/session theo signature` | `getDisableImpact` → `Promise<StudentDisableImpactDto>` (api/src/students/students.controller.ts:310) |
| PATCH `/api/v1/schools/:schoolId/students/:id/status` | SCHOOL_ADMIN | `@Body() dto: UpdateStudentStatusDto` | `updateStatus` → `Promise<StudentItemDto>` (api/src/students/students.controller.ts:372) |

#### SystemSettingsController

Nguồn: [api/src/system-settings/system-settings.controller.ts](../../api/src/system-settings/system-settings.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/system-settings/parking-lot` | JWT | `Path/session theo signature` | `getParkingLot` → `Promise<ParkingLotResponseDto &#124; null>` (api/src/system-settings/system-settings.controller.ts:49) |
| GET `/api/v1/system-settings/parking-lot/impact` | SYSTEM_ADMIN | `@Query('latitude') latitude?: string; @Query('longitude') longitude?: string; @Query('effectiveDate') effectiveDate?: string` | `getParkingLotImpact` → `Promise<ParkingLotImpactDto>` (api/src/system-settings/system-settings.controller.ts:70) |
| POST `/api/v1/system-settings/parking-lot/cancel-scheduled-change` | SYSTEM_ADMIN | `Path/session theo signature` | `cancelScheduledParkingLotChange` → `Promise<ParkingLotResponseDto>` (api/src/system-settings/system-settings.controller.ts:98) |
| POST `/api/v1/system-settings/parking-lot/apply-scheduled-change` | SYSTEM_ADMIN | `Path/session theo signature` | `applyScheduledParkingLotChange` → `Promise<{ applied: boolean; effectiveDate?: string }>` (api/src/system-settings/system-settings.controller.ts:117) |
| PUT `/api/v1/system-settings/parking-lot` | SYSTEM_ADMIN | `@Body() dto: UpdateParkingLotDto` | `updateParkingLot` → `Promise<ParkingLotResponseDto>` (api/src/system-settings/system-settings.controller.ts:144) |

#### TripNavigationController

Nguồn: [api/src/trips/trip-navigation.controller.ts](../../api/src/trips/trip-navigation.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/trips/:id/navigation` | JWT | `Path/session theo signature` | `state` → `NavigationStateDto ` (api/src/trips/trip-navigation.controller.ts:29) |
| PUT `/api/v1/trips/:id/navigation/session` | DRIVER | `@Body() dto: NavigationSessionDto` | `session` → `NavigationStateDto ` (api/src/trips/trip-navigation.controller.ts:37) |
| PUT `/api/v1/trips/:id/navigation/position` | DRIVER | `@Body() dto: PublishPositionDto` | `position` → `PositionAckDto ` (api/src/trips/trip-navigation.controller.ts:45) |
| POST `/api/v1/trips/:id/navigation/segment` | DRIVER | `@Body() dto: NavigationSegmentDto` | `segment` → `NavigationRouteDto ` (api/src/trips/trip-navigation.controller.ts:55) |
| GET `/api/v1/trips/:id/location-history` | JWT | `@Query() dto: LocationHistoryQueryDto` | `history` → `LocationHistoryDto ` (api/src/trips/trip-navigation.controller.ts:65) |

#### TripsController

Nguồn: [api/src/trips/trips.controller.ts](../../api/src/trips/trips.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| POST `/api/v1/trips/:id/attendance/:studentId/correction` | BUS_ATTENDANT | `@Body() dto: AttendanceCorrectionDto` | `correctAttendance` → `AttendanceCorrectionResponseDto` (api/src/trips/trips.controller.ts:78) |
| POST `/api/v1/trips/:id/cancel-all-absent` | BUS_ATTENDANT, SCHOOL_ADMIN, SYSTEM_ADMIN | `@Body() dto: TripReasonDto` | `cancelAllAbsent` → `TripActionMessageDto` (api/src/trips/trips.controller.ts:90) |
| POST `/api/v1/trips/:id/reopen` | SYSTEM_ADMIN | `@Body() dto: ReopenTripDto` | `reopenTrip` → `ReopenTripResponseDto` (api/src/trips/trips.controller.ts:101) |
| POST `/api/v1/trips/generate` | SYSTEM_ADMIN | `@Body() dto: GenerateTripsDto` | `generateTrips` → `Promise<GenerateTripsResponseDto>` (api/src/trips/trips.controller.ts:118) |
| GET `/api/v1/trips` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Query() query: ListTripsQueryDto` | `listTrips` → `Promise<TripListResponseDto>` (api/src/trips/trips.controller.ts:137) |
| GET `/api/v1/trips/mobile/driver-schedule`<br>`/api/v1/trips/mobile/driver/schedule` | DRIVER | `@Query('date') date?: string; @Query('fromDate') fromDate?: string; @Query('toDate') toDate?: string` | `getDriverSchedule` → `Promise<{ items: MobileTripItemDto[] }>` (api/src/trips/trips.controller.ts:162) |
| GET `/api/v1/trips/mobile/bus-attendant-schedule`<br>`/api/v1/trips/mobile/bus-attendant/schedule` | BUS_ATTENDANT | `@Query('date') date?: string; @Query('fromDate') fromDate?: string; @Query('toDate') toDate?: string` | `getBusAttendantSchedule` → `Promise<{ items: MobileTripItemDto[] }>` (api/src/trips/trips.controller.ts:186) |
| GET `/api/v1/trips/mobile/parent/student/:studentId/schedule`<br>`/api/v1/trips/mobile/parent/students/:studentId/schedule` | PARENT | `@Query('date') date?: string; @Query('fromDate') fromDate?: string; @Query('toDate') toDate?: string` | `getParentStudentSchedule` → `Promise<MobileParentScheduleResponseDto>` (api/src/trips/trips.controller.ts:215) |
| GET `/api/v1/trips/mobile/home-trip` | DRIVER, BUS_ATTENDANT | `Path/session theo signature` | `getHomeTrip` → `Promise<HomeTripResponseDto>` (api/src/trips/trips.controller.ts:237) |
| GET `/api/v1/trips/mobile/parent/home-cards` | PARENT | `Path/session theo signature` | `getParentHomeCards` → `Promise<ParentHomeCardsResponseDto>` (api/src/trips/trips.controller.ts:255) |
| GET `/api/v1/trips/mobile/:id`<br>`/api/v1/trips/mobile/:id/detail` | DRIVER, BUS_ATTENDANT, PARENT, SCHOOL_ADMIN, SYSTEM_ADMIN | `Path/session theo signature` | `getMobileTripDetail` → `Promise<TripDetailResponseDto>` (api/src/trips/trips.controller.ts:274) |
| GET `/api/v1/trips/:id` | SYSTEM_ADMIN, SCHOOL_ADMIN | `Path/session theo signature` | `getTripDetail` → `Promise<TripDetailResponseDto>` (api/src/trips/trips.controller.ts:298) |
| PATCH `/api/v1/trips/:id`<br>`/api/v1/trips/:id/assignment`<br>`/api/v1/trips/:id/assignments` | SYSTEM_ADMIN, SCHOOL_ADMIN | `@Body() dto: UpdateTripAssignmentDto` | `updateTripAssignment` → `Promise<any>` (api/src/trips/trips.controller.ts:319) |
| POST `/api/v1/trips/:id/attendant-ready` | BUS_ATTENDANT | `Path/session theo signature` | `markAttendantReady` → `Response suy ra từ service` (api/src/trips/trips.controller.ts:347) |
| POST `/api/v1/trips/:id/start` | DRIVER | `Path/session theo signature` | `startTrip` → `Response suy ra từ service` (api/src/trips/trips.controller.ts:365) |
| POST `/api/v1/trips/:id/arrive-at-school` | DRIVER | `Path/session theo signature` | `arriveAtSchool` → `Promise<ArriveAtSchoolResponseDto>` (api/src/trips/trips.controller.ts:387) |
| GET `/api/v1/trips/:id/operational-state` | DRIVER, BUS_ATTENDANT, PARENT, SCHOOL_ADMIN, SYSTEM_ADMIN | `Path/session theo signature` | `getOperationalState` → `Promise<OperationalStateResponseDto>` (api/src/trips/trips.controller.ts:407) |
| GET `/api/v1/trips/:id/attendance` | BUS_ATTENDANT, DRIVER, SCHOOL_ADMIN, SYSTEM_ADMIN | `Path/session theo signature` | `getTripAttendance` → `Promise<TripAttendanceListResponseDto>` (api/src/trips/trips.controller.ts:427) |
| PUT `/api/v1/trips/:id/attendance/:studentId` | BUS_ATTENDANT | `@Body() dto: MarkAttendanceDto` | `updateAttendance` → `Response suy ra từ service` (api/src/trips/trips.controller.ts:445) |
| PUT `/api/v1/trips/:id/attendance/:studentId/alighting` | BUS_ATTENDANT | `@Body() dto: UpdateAlightingDto` | `updateAlighting` → `Promise<UpdateAlightingResponseDto>` (api/src/trips/trips.controller.ts:469) |
| POST `/api/v1/trips/:id/attendance/verify-qr` | BUS_ATTENDANT | `@Body() dto: VerifyQrDto` | `verifyQrAttendance` → `Promise<VerifyQrResponseDto>` (api/src/trips/trips.controller.ts:493) |
| POST `/api/v1/trips/:id/complete` | DRIVER | `Path/session theo signature` | `completeTrip` → `Response suy ra từ service` (api/src/trips/trips.controller.ts:513) |

#### VehiclesController

Nguồn: [api/src/vehicles/vehicles.controller.ts](../../api/src/vehicles/vehicles.controller.ts).

| Method / path | Gate controller | Input | Handler / output |
| --- | --- | --- | --- |
| GET `/api/v1/vehicles/:id` | SYSTEM_ADMIN | `Path/session theo signature` | `detail` → `VehicleResponseDto ` (api/src/vehicles/vehicles.controller.ts:52) |
| GET `/api/v1/vehicles` | SYSTEM_ADMIN | `@Query() query: ListVehiclesQueryDto` | `listVehicles` → `Promise<VehicleListResponseDto>` (api/src/vehicles/vehicles.controller.ts:69) |
| GET `/api/v1/vehicles/:id/deactivation-impact` | SYSTEM_ADMIN | `Path/session theo signature` | `getDeactivationImpact` → `Promise<VehicleDeactivationImpactDto>` (api/src/vehicles/vehicles.controller.ts:91) |
| PATCH `/api/v1/vehicles/:id/status` | SYSTEM_ADMIN | `@Body() dto: UpdateVehicleStatusDto` | `updateVehicleStatus` → `Promise<VehicleResponseDto>` (api/src/vehicles/vehicles.controller.ts:117) |
| POST `/api/v1/vehicles` | SYSTEM_ADMIN | `@Body() dto: CreateVehicleDto` | `createVehicle` → `Promise<VehicleResponseDto>` (api/src/vehicles/vehicles.controller.ts:144) |

## 5. Implementation Details

No application code changes.

- Cập nhật `docs/ai-review/LATEST.md`: báo cáo đọc API và danh mục theo controller.
- Cập nhật `docs/ai-review/LATEST.diff`: marker không có code changes.
- Lưu bản trước tại `docs/ai-review/history/2026-11-16-1322-before-api-reading.md` và `.diff`.
- Không sửa API/Web/Mobile/firmware/schema/migration/config/dependencies; không commit/push.

## 6. Database Changes

None. Không kết nối DB để xác minh trạng thái runtime; không migration/seed/backfill/mutation.

## 7. API & Swagger Changes

None. Đã đọc decorators/contracts và bootstrap Swagger từ source. `NOT_VERIFIED`: Swagger/OpenAPI HTTP runtime và trạng thái route đang được đăng ký trên server thực tế.

## 8. UI/UX Changes

None.

## 9. Verification & Testing

- `PASS`: Kiểm tra checkout, branch, HEAD và trạng thái Git ban đầu; không có tracked diff trước khi cập nhật báo cáo.
- `PASS`: TypeScript AST parse cho controller/DTO và source logic đã rà; trích xuất 185 handler /191 cặp method-path, tự kiểm không trùng cặp method/path.
- `PASS`: `api/node_modules/.bin/tsc.cmd --noEmit --incremental false` chạy tại `api/`, exit0.
- `PASS`: Kiểm tra số model/migration trong source (22/22), không gán kết quả này cho database đã deploy.
- Không chạy unit/E2E/business scripts, không build, không khởi động backend/cron/provider hay gọi API mutation.
- `NOT_VERIFIED`: HTTP/runtime, JWT đa role thực, provider/email/SMS/push, DB applied migrations, RFID/ESP32 và end-to-end Web/Mobile. Đó là phạm vi chưa thực hiện; không gán nhãn PASS từ việc đọc code.

## 10. Issues & Risks

Các giới hạn đã nêu ở4.5. Đây là kết quả đọc source; không kết luận mọi endpoint đang hoạt động hoặc đã nghiệm thu. Giữ nguyên bug hiện có để xử lý theo yêu cầu riêng.

## 11. Reviewer Focus

Kiểm số endpoint/alias và conditional IoT; đối chiếu method-level Roles với scope service; Parent masking; frozen/active roster; flags so với mutation; navigation session/sequence; RFID pending/receipt khi lỗi giữa PostgreSQL/MongoDB.

## 12. Suggested Next Step

Dùng bản đồ này để đối chiếu luồng Mobile Driver/BUS_ATTENDANT với API khi người dùng giao yêu cầu tiếp theo.

## 13. Approval Status

Đã thực hiện yêu cầu đọc API. Không có phê duyệt triển khai sửa bug hoặc chạy nghiệm thu có ghi dữ liệu trong task này.
