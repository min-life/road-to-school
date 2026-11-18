# ROADTOSCHOOL V2.0 — TÀI LIỆU CHÍNH SÁCH NGHIỆP VỤ TOÀN DIỆN
### (COMPREHENSIVE BUSINESS POLICIES & OPERATIONAL SPECIFICATIONS)

> **Dự án**: RoadToSchool v2.0 — Hệ thống Quản lý Đưa đón Học sinh bằng Xe buýt  
> **Phiên bản tài liệu**: 2.0.0 — Ban hành Toàn diện  
> **Phạm vi áp dụng**: Toàn bộ hệ thống Backend (`/api`), Web Admin (`/web`), Mobile App (`/mobile`) và Database PostgreSQL.

---

## MỤC LỤC
1. [Nguyên tắc Vận hành Cốt lõi](#1-nguyên-tắc-vận-hành-cốt-lõi)
2. [Ma trận Phân quyền 5 Vai trò (RBAC)](#2-ma-trận-phân-quyền-5-vai-trò-rbac)
3. [Chính sách Quản lý Tuyến & 8 Điều kiện Kích hoạt RoutePlan](#3-chính-sách-quản-lý-tuyến--8-điều-kiện-kích-hoạt-routeplan)
4. [Chính sách Sinh chuyến xe (Trip Generation)](#4-chính-sách-sinh-chuyến-xe-trip-generation)
5. [Chính sách Vận hành Chuyến xe 4 Chặng (Trip Operation V2)](#5-chính-sách-vận-hành-chuyến-xe-4-chặng-trip-operation-v2)
6. [Chính sách Điểm danh & Xuống xe (Attendance & Alighting)](#6-chính-sách-điểm-danh--xuống-xe-attendance--alighting)
7. [Chính sách Đơn Báo nghỉ & Điều phối Thay thế (Leave Notices)](#7-chính-sách-đơn-báo-nghỉ--điều-phối-thay-thế-leave-notices)
8. [Chính sách Quản lý & Tự động Phát hiện Sự cố (Incident Management)](#8-chính-sách-quản-lý--tự-động-phát-hiện-sự-cố-incident-management)
9. [Chính sách Bảo mật Quyền riêng tư & Cô lập Dữ liệu (Privacy & Tenant Isolation)](#9-chính-sách-bảo-mật-quyền-riêng-tư--cô-lập-dữ-liệu-privacy--tenant-isolation)
10. [Chính sách Kỹ thuật, Khóa đồng thời & Kiểm thử (Concurrency & Data Policy)](#10-chính-sách-kỹ-thuật-khóa-đồng-thời--kiểm-thử-concurrency--data-policy)

---

## 1. NGUYÊN TẮC VẬN HÀNH CỐT LÕI

- **Mô hình Vận hành Tập trung**:
  - Hệ thống vận hành với **duy nhất 1 Nhà xe tập trung** và **duy nhất 1 Bãi đỗ xe trung tâm** (`PARKING`).
  - Phục vụ đưa đón học sinh cho **nhiều Trường học đối tác** (`Schools`).
  - Tuyệt đối không thiết kế hệ thống hỗ trợ đa nhà xe (không multi-tenant cho nhà xe).
- **Phân tách Trách nhiệm (Separation of Concerns)**:
  - **Nhà xe**: Sở hữu và quản lý phương tiện (Xe), tài xế, tối ưu hóa lộ trình xe chạy (VRP).
  - **Nhà trường**: Quản lý học sinh của trường mình, quản lý giáo viên phụ xe (`BUS_ATTENDANT`), kiểm soát an toàn và duyệt tuyến đưa đón học sinh của trường.
- **Nền tảng Tương tác**:
  - **Web Admin Next.js**: Dành cho Quản trị viên (`SYSTEM_ADMIN`, `SCHOOL_ADMIN`).
  - **Mobile App Expo**: Dành cho Người dùng thực địa (`DRIVER`, `BUS_ATTENDANT`, `PARENT`).

---

## 2. MA TRẬN PHÂN QUYỀN 5 VAI TRÒ (RBAC)

Hệ thống thiết lập cố định 5 vai trò (Roles) trong toàn bộ chu trình:

| Tính năng / Nghiệp vụ | SYSTEM_ADMIN (Nhà xe - Web) | SCHOOL_ADMIN (Trường học - Web) | DRIVER (Tài xế - Mobile) | BUS_ATTENDANT (Phụ xe - Mobile) | PARENT (Phụ huynh - Mobile) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Quản lý Trường học / Xe / Tài xế** | **Toàn quyền** | Không | Không | Không | Không |
| **Quản lý Học sinh trường mình** | Xem | **Toàn quyền** | Không | Xem danh sách xe | Xem thông tin con |
| **Tạo Tuyến VRP (`RoutePlan`)** | **Có quyền** | Không | Không | Không | Không |
| **Gán Xe / Tài xế mặc định** | **Có quyền** | Không | Không | Không | Không |
| **Gán Giáo viên phụ xe mặc định** | Không | **Có quyền** | Không | Không | Không |
| **Duyệt RoutePlan DRAFT $\rightarrow$ ACTIVE** | **BỊ CẤM (403)** | **DUY NHẤT CÓ QUYỀN** | Không | Không | Không |
| **Sinh Chuyến xe thủ công** | **Có quyền** | Không | Không | Không | Không |
| **Đổi Xe/Tài xế trên Chuyến cụ thể** | **Có quyền** | Không | Không | Không | Không |
| **Đổi Phụ xe trên Chuyến cụ thể** | Không | **Có quyền** | Không | Không | Không |
| **Xác nhận Sẵn sàng (`attendantReadyAt`)** | Không | Không | Không | **Có quyền** | Không |
| **Bắt đầu Chuyến (`startTrip`)** | Không | Không | **Có quyền** | Không | Không |
| **Điểm danh Lên xe (`Boarding`)** | Không | Không | Không | **Có quyền** | Xem trạng thái con |
| **Xác nhận Đến trường (`arriveAtSchool`)** | Không | Không | **Có quyền** | Không | Xem mốc giờ |
| **Xác nhận Xuống xe (`Alighting`)** | Không | Không | Không | **Có quyền** | Xem mốc giờ |
| **Hoàn thành Chuyến (`completeTrip`)** | Không | Không | **Có quyền** | Không | Xem trạng thái |
| **Nộp Đơn Báo nghỉ** | Không | Không | Báo nghỉ ca | Báo nghỉ ca | **Báo nghỉ cho con** |
| **Báo cáo Sự cố khẩn cấp** | Xử lý | Theo dõi | **Gửi báo cáo** | **Gửi báo cáo** | Nhận thông báo |

---

## 3. CHÍNH SÁCH QUẢN LÝ TUYẾN & 8 ĐIỀU KIỆN KÍCH HOẠT ROUTEPLAN

### 3.1. Vòng đời RoutePlan (Kế hoạch Tuyến)
- Trạng thái RoutePlan: `DRAFT` $\rightarrow$ `ACTIVE` $\rightarrow$ `CANCELLED` / `EXPIRED`.
- Aggregate Root là `RoutePlan`. Các `Route` thành phần không có vòng đời độc lập.
- Khi tạo RoutePlan ở trạng thái `DRAFT`, phương tiện (`Vehicle`) lập tức được giữ chỗ tạm thời (Hold).
- Xe đang nằm trong một RoutePlan chưa bị `CANCELLED` **không được phép gán vào RoutePlan khác có khoảng thời gian hợp đồng chồng lấn (Overlapping Contract Period)**, bất kể cùng trường hay khác trường.

### 3.2. 8 Điều kiện Tiên quyết Bắt buộc để Kích hoạt (DRAFT $\rightarrow$ ACTIVE)
Chỉ `SCHOOL_ADMIN` của đúng trường (`schoolId`) mới có quyền bấm phê duyệt. Hệ thống kiểm tra nghiêm ngặt 8 điều kiện sau trước khi chuyển trạng thái:

1. **BR-ACT-01 (Trạng thái hợp lệ)**: RoutePlan phải đang ở trạng thái `DRAFT`.
2. **BR-ACT-02 (Cấu trúc hai chiều)**: Bắt buộc phải có ít nhất 1 tuyến đón sáng (`TO_SCHOOL`) VÀ ít nhất 1 tuyến trả chiều (`TO_PARKING`).
3. **BR-ACT-03 (Quy tắc Zero-Null)**: Toàn bộ các tuyến con (`Route`) phải được gán đủ 3 thành phần: `proposedVehicleId`, `defaultDriverId`, `defaultBusAttendantId` (không được để trống bất kỳ trường nào).
4. **BR-ACT-04 (Sức chứa xe - Capacity)**: Số lượng học sinh trên từng tuyến không được vượt quá số ghế của xe: `vehicle.seatCount >= route.studentCount`.
5. **BR-ACT-05 (Tính khả dụng của Xe)**: Xe phải đang kích hoạt (`isActive === true`) và không bị trùng lịch với bất kỳ RoutePlan `ACTIVE` nào khác trong cùng thời hạn hợp đồng.
6. **BR-ACT-06 (Quy tắc Tài xế Đơn trường)**: Tài xế không được trùng lịch với RoutePlan `ACTIVE` của một trường học khác trong cùng khung thời gian hợp đồng.
7. **BR-ACT-07 (Phụ xe đúng trường)**: Giáo viên phụ xe phải có vai trò `BUS_ATTENDANT`, đang hoạt động (`isActive === true`) và phải thuộc đúng trường quản lý tuyến (`user.schoolId === routePlan.schoolId`).
8. **BR-ACT-08 (Nhất quán Nhóm Ghép Xe - Group Pairing)**: Các tuyến con dùng chung một xe trong cùng một RoutePlan bắt buộc phải có cùng Tài xế và cùng Giáo viên phụ xe.

---

## 4. CHÍNH SÁCH SINH CHUYẾN XE (TRIP GENERATION)

- **Chiến lược Sinh theo Cửa sổ Cuộn (Rolling Window Lazy Generation)**:
  - Cron Job tự động chạy lúc **00:00 hàng ngày (Giờ Việt Nam - GMT+7)**.
  - Sinh trước chuyến cho **7 ngày tiếp theo** (cấu hình qua tham số `TRIP_GENERATION_LOOKAHEAD_DAYS`).
- **Quy tắc Ngày học Tiếp theo (Next-School-Day Rule)**:
  - Tuyệt đối không sinh chuyến xe cho chính ngày mà RoutePlan được kích hoạt: `serviceDate > activationLocalDate`. Chuyến xe chỉ bắt đầu được sinh từ ngày học kế tiếp.
- **Tính Bất biến của Chuyến đã sinh (Non-Overwrite Rule)**:
  - Mỗi `Trip` lưu trữ một **Snapshot tài nguyên độc lập** tại thời điểm sinh: `assignedVehicleId`, `assignedDriverId`, `assignedBusAttendantId` và `routeSnapshot`.
  - Việc thay đổi xe/tài xế mặc định trên RoutePlan sau này **không làm ghi đè** lên các chuyến xe đã được sinh ra trước đó.
- **Chống Trùng lặp Tuyệt đối (Idempotency)**:
  - Khóa duy nhất tại DB: `@@unique([routeId, serviceDate])`.
  - Quá trình chạy lặp lại nếu thấy chuyến đã tồn tại sẽ bỏ qua an toàn, không báo lỗi, không sinh trùng.

---

## 5. CHÍNH SÁCH VẬN HÀNH CHUYẾN XE 4 CHẶNG (TRIP OPERATION V2)

Quy trình vận hành chuyến xe chia làm 2 chiều với các bước tuần tự và điều kiện khóa nghiêm ngặt:

### 5.1. Chiều Đi Sáng (`TO_SCHOOL`: Bãi xe $\rightarrow$ Điểm đón $\rightarrow$ Trường)

```
[SCHEDULED]
   │
   ├─ 1. Phụ xe xác nhận Sẵn sàng (attendantReadyAt != null)
   ├─ 2. Tài xế bấm "Bắt đầu chuyến" (actualStartTime != null)
   │     └ Chuyến chuyển sang: [IN_PROGRESS]
   ▼
[IN_PROGRESS - Đang di chuyển đón học sinh]
   │
   ├─ 3. Phụ xe điểm danh đón học sinh dọc đường (Boarding: UNMARKED → PRESENT / ABSENT)
   │     └ Cho phép sửa đổi/hoàn tác trước khi xe đến trường.
   ├─ 4. Điều kiện mở khóa Đến trường:
   │     └ 100% học sinh đã được điểm danh (0 học sinh UNMARKED).
   │     └ Tất cả học sinh ABSENT bắt buộc phải có lý do vắng mặt.
   ▼
[IN_PROGRESS - Xác nhận Đến trường]
   │
   ├─ 5. Tài xế bấm "Xác nhận Đến trường" (arrivedAtSchoolAt != null)
   │     └ KHÓA CHẶT: Cấm hoàn tác bất kỳ học sinh nào về trạng thái UNMARKED.
   ▼
[IN_PROGRESS - Xuống xe tại trường]
   │
   ├─ 6. Phụ xe xác nhận học sinh Xuống xe an toàn (Alighting: alightedAt != null)
   │     └ Chỉ áp dụng cho các học sinh đã lên xe (PRESENT).
   ├─ 7. Điều kiện mở khóa Hoàn thành:
   │     └ 100% học sinh PRESENT đã có dấu thời gian xuống xe (alightedAt != null).
   ▼
[COMPLETED]
   └ 8. Tài xế bấm "Hoàn thành chuyến" (actualEndTime != null). Khóa toàn bộ dữ liệu.
```

### 5.2. Chiều Về Chiều (`TO_PARKING`: Trường $\rightarrow$ Điểm trả $\rightarrow$ Bãi xe)

```
[SCHEDULED - Xe đang đỗ tại sân trường]
   │
   ├─ 1. Phụ xe xác nhận Sẵn sàng (attendantReadyAt != null)
   ├─ 2. Phụ xe điểm danh học sinh Lên xe ngay tại sân trường (trong khi xe vẫn SCHEDULED)
   │     └ 100% học sinh được điểm danh (0 UNMARKED, ABSENT có đủ lý do).
   ├─ 3. Điều kiện mở khóa Bắt đầu chuyến:
   │     └ Đã điểm danh đầy đủ 100% học sinh tại trường.
   ▼
[IN_PROGRESS - Xe xuất phát rời trường trả học sinh]
   │
   ├─ 4. Tài xế bấm "Bắt đầu chuyến" (actualStartTime != null)
   │     └ Chuyến chuyển sang: [IN_PROGRESS]. Khóa hoàn tác về UNMARKED.
   ├─ 5. Phụ xe xác nhận học sinh Xuống xe tại từng điểm trả dọc đường (Alighting: alightedAt != null)
   ├─ 6. Điều kiện mở khóa Hoàn thành:
   │     └ 100% học sinh PRESENT đã xuống xe an toàn tại điểm trả.
   ▼
[COMPLETED]
   └ 7. Xe về đến bãi đỗ trung tâm. Tài xế bấm "Hoàn thành chuyến". Khóa toàn bộ dữ liệu.
```

### 5.3. Chế độ Vận hành `LIVE` và `TEST`
- **Chế độ LIVE (Môi trường Thật)**:
  - Phụ xe chỉ được bấm Sẵn sàng **tối đa 15 phút** trước giờ xuất phát dự kiến.
  - Tài xế chỉ được bấm Bắt đầu chuyến **tối đa 5 phút** trước giờ xuất phát dự kiến.
- **Chế độ TEST (Kiểm thử / Trình diễn)**:
  - Bỏ qua cổng giới hạn thời gian (15 phút / 5 phút) để kiểm thử luồng bất kỳ lúc nào.
  - **Tuyệt đối không bỏ qua** các quy tắc kiểm soát vai trò (RBAC) và tuần tự 4 chặng vận hành.

---

## 6. CHÍNH SÁCH ĐIỂM DANH & XUỐNG XE (ATTENDANCE & ALIGHTING)

- **Trạng thái Điểm danh (`AttendanceStatus`)**:
  - `UNMARKED`: Chưa điểm danh (trạng thái khởi tạo).
  - `PRESENT`: Học sinh đã lên xe.
  - `ABSENT`: Học sinh không lên xe (bắt buộc phải có `absenceReason`).
- **Quy tắc Xuống xe (`Alighting`)**:
  - Học sinh có trạng thái `ABSENT` **tuyệt đối không được kích hoạt xuống xe**.
  - Học sinh `PRESENT` bắt buộc phải có mốc thời gian xuống xe `alightedAt` trước khi chuyến xe có thể kết thúc.
- **Phương thức Điểm danh Hỗ trợ**:
  - **Thủ công trên App**: Phụ xe bấm trực tiếp vào danh sách học sinh trên màn hình mobile.
  - **Quét mã QR**: Phụ xe quét mã QR trên thẻ học sinh bằng camera điện thoại.
  - **Quẹt thẻ RFID IoT**: Đầu đọc RFID lắp trên xe đẩy dữ liệu scan về API; hệ thống tự động đối soát UID thẻ và ghi nhận điểm danh.

---

## 7. CHÍNH SÁCH ĐƠN BÁO NGHỈ & ĐIỀU PHỐI THAY THẾ (LEAVE NOTICES)

Hệ thống quản lý đơn báo nghỉ cho 3 đối tượng (`LeaveNoticeKind`): `STUDENT`, `DRIVER`, `BUS_ATTENDANT`.

### 7.1. Báo nghỉ Học sinh (`STUDENT`)
- Phụ huynh gửi đơn báo nghỉ thông qua Mobile App.
- **Bắt buộc xác thực OTP** gửi qua SMS/Email của người giám hộ đã liên kết.
- Khi gửi thành công, đơn có trạng thái `RECORDED`.
- Hệ thống tự động cập nhật bản ghi điểm danh `TripAttendance` của học sinh trong các chuyến xe tương ứng sang trạng thái `ABSENT` kèm lý do phụ huynh đã nhập.

### 7.2. Báo nghỉ Tài xế (`DRIVER`) & Giáo viên phụ xe (`BUS_ATTENDANT`)
- Nhân sự nộp đơn xin nghỉ ca trên Mobile App.
- Chuyến xe liên quan được đánh dấu trạng thái chờ phân công: `PENDING_REPLACEMENT`.
- **Quy trình Điều phối Thay thế**:
  - Đối với Tài xế: `SYSTEM_ADMIN` (Nhà xe) chỉ định tài xế thay thế $\rightarrow$ Trạng thái chuyển sang `REPLACED`.
  - Đối với Phụ xe: `SCHOOL_ADMIN` (Nhà trường) chỉ định phụ xe thay thế $\rightarrow$ Trạng thái chuyển sang `REPLACED`.
- **Hủy chuyến do thiếu nhân sự**: Nếu sát giờ chạy mà không tìm được nhân sự thay thế, Admin có quyền chọn hành động Hủy chuyến $\rightarrow$ Đơn chuyển sang `TRIP_CANCELLED`, chuyến xe chuyển sang `CANCELLED`, hệ thống tự động thông báo khẩn cho phụ huynh.

---

## 8. CHÍNH SÁCH QUẢN LÝ & TỰ ĐỘNG PHÁT HIỆN SỰ CỐ (INCIDENT MANAGEMENT)

Dịch vụ nền **`IncidentsDetectorService`** quét tự động mỗi 30 giây để bảo vệ an toàn hành trình:

### 8.1. Các Loại Sự cố & Ngưỡng Kích hoạt Tự động
1. **Lệch Lộ trình Tuyến (`OFF_ROUTE`)**:
   - Tự động kích hoạt khi tọa độ GPS của xe cách đường đa tuyến (Polyline) của tuyến đường được duyệt **vượt quá 200 mét** trong 2 mẫu dữ liệu liên tiếp.
2. **Mất Tín hiệu Định vị (`GPS_SIGNAL_LOST`)**:
   - Tự động kích hoạt khi chuyến xe đang ở trạng thái `IN_PROGRESS` nhưng **không nhận được bất kỳ tọa độ GPS nào trong hơn 3 phút (180 giây)**.
3. **Nguy cơ Chuyến sau Chạy Trễ (`LATE_RUNNING_TRIP_RISK`)**:
   - Tự động kích hoạt trước giờ khởi hành 15 phút nếu xe hoặc tài xế vẫn đang bận thực hiện một chuyến xe trước đó chưa hoàn thành.
4. **Dự báo Trễ Trạm (`LATE_STOP`)**:
   - Kích hoạt khi tính toán tốc độ thực tế dự báo thời gian đến trạm đón kế tiếp trễ hơn 15 phút so với thời khóa biểu.
5. **Không có Người đón tại Điểm trả (`NO_GUARDIAN_AT_STOP`)**:
   - Phụ xe báo cáo thủ công khi đưa học sinh về đến điểm trả chiều về nhưng không có phụ huynh/người giám hộ ra đón.
6. **Vắng mặt Nhân sự Khởi hành (`DRIVER_MISSING` / `ATTENDANT_MISSING`)**:
   - Tự động kích hoạt khi đã quá giờ khởi hành dự kiến (`scheduledStartAt`) mà chuyến xe vẫn chưa được bấm Bắt đầu.

### 8.2. Quy trình Xử lý Sự cố
- Sự cố khởi tạo ở trạng thái `WAITING_ASSIGNMENT`.
- Bắn thông báo đẩy (Push Notification) khẩn cấp lập tức đến Admin Nhà xe, Admin Trường học và Phụ huynh bị ảnh hưởng.
- Admin điều xe cứu trợ hoặc chỉ định tài xế dự phòng $\rightarrow$ Chuyển trạng thái sang `RESOLVED` $\rightarrow$ `CLOSED`.

---

## 9. CHÍNH SÁCH BẢO MẬT QUYỀN RIÊNG TƯ & CÔ LẬP DỮ LIỆU (PRIVACY & TENANT ISOLATION)

### 9.1. Ẩn danh Thông tin Học sinh cho Phụ huynh (Parent Privacy Masking)
- Phụ huynh chỉ được phép xem thông tin đầy đủ của **con em mình** (dựa trên bảng liên kết `ParentStudentLink` đã được xác thực).
- Đối với tất cả học sinh khác trên cùng chuyến xe:
  - Họ và tên $\rightarrow$ Hiển thị ẩn danh: `"Học sinh khác"`.
  - Số điện thoại người giám hộ $\rightarrow$ `null` (hoàn toàn không trả về).
  - Tọa độ nhà riêng (`latitude`, `longitude`) $\rightarrow$ Bị loại bỏ khỏi API response.
  - Địa chỉ $\rightarrow$ Chỉ hiển thị tên đường/phường hoặc chữ `"Điểm đón học sinh"`.

### 9.2. Cô lập Dữ liệu Trường học (School Tenant Isolation)
- Tài khoản `SCHOOL_ADMIN` bị ràng buộc cứng ở tầng truy vấn cơ sở dữ liệu: Luôn tự động gắn điều kiện `where: { schoolId: currentUser.schoolId }`.
- Ngăn chặn triệt để lỗ hổng IDOR: Dù cố tình thay đổi tham số `schoolId` trên URL hay request body, hệ thống luôn lấy `schoolId` từ JWT Token đã ký số.

### 9.3. Quản lý Phiên & An toàn Xác thực
- **Thời hạn Token**: Access Token = 15 phút (ngắn hạn, stateless), Refresh Token = 7 ngày.
- **Thu hồi phiên khi Đổi Mật khẩu**: Khi người dùng đổi mật khẩu, hệ thống thu hồi (`revokedAt`) toàn bộ các phiên đăng nhập khác trên các thiết bị cũ, chỉ duy trì phiên hiện tại.

---

## 10. CHÍNH SÁCH KỸ THUẬT, KHÓA ĐỒNG THỜI & KIỂM THỬ (CONCURRENCY & DATA POLICY)

### 10.1. Chống Xung đột Đồng thời (Database Concurrency Protection)
- **Khóa Dòng Bi quan (Pessimistic Row Lock)**:
  - Mọi thao tác ghi thay đổi trạng thái chuyến xe (`startTrip`, `arriveAtSchool`, `updateAttendance`, `updateAlighting`, `completeTrip`) bắt buộc phải bọc trong transaction với câu lệnh khóa:
    ```sql
    SELECT id FROM trips WHERE id = $1 FOR UPDATE;
    ```
  - Chống tình trạng 2 thiết bị bấm đồng thời dẫn đến việc ghi đè trạng thái hoặc bắt đầu chuyến xe 2 lần.
- **Khóa Điều phối Hoạt động (Advisory Lock)**:
  - Sử dụng `pg_advisory_xact_lock(3202032)` để đồng bộ hóa tiến trình sinh chuyến tự động, đảm bảo không có 2 worker nào chạy trùng lặp tác vụ.

### 10.2. Chính sách Bảo vệ Dữ liệu Thật (TEST DATA POLICY — BẮT BUỘC)
- **TUYỆT ĐỐI KHÔNG**:
  - Không tự ý thêm records dữ liệu giả vào Database môi trường thật.
  - Không tự chạy script seed, không chỉnh sửa bản ghi thật của người dùng khi chưa có sự đồng ý của Product Owner.
  - Không gọi các API có side-effect (POST/PUT/DELETE) để test khi chưa được chỉ định.
- **Phương pháp Kiểm thử Hợp lệ**:
  - Kiểm thử tĩnh: `npx tsc --noEmit` (đảm bảo 0 lỗi TypeScript).
  - Chạy Unit Test / Integration Test độc lập có Mock Database (`npx vitest run`).
  - Sử dụng các truy vấn đọc an toàn (Read-only GET queries).

---

*Tài liệu này là Nguồn Sự Thật (Source of Truth) chuẩn mực cho toàn bộ quy trình vận hành và mã nguồn của hệ thống RoadToSchool v2.0.*
