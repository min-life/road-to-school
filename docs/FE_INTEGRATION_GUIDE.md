# RoadToSchool v2.0 — Hướng dẫn Tích hợp API Backend cho Frontend Developers (Web & Mobile)

> **Dành cho**: Đội ngũ Frontend (Web Admin Next.js & Mobile App React Native Expo).
> **Mục tiêu**: Cung cấp tài liệu tra cứu đầy đủ về các thay đổi API, luồng nghiệp vụ mới, DTO payload, mã lỗi HTTP và cách xử lý tương ứng trên giao diện người dùng sau đợt nâng cấp Master Business Improvement Plan (Mục 3.4 - 3.18).

---

## 1. Tổng quan Kiến trúc & Nguyên tắc cốt lõi

### 1.1. Ma trận 5 Roles cố định
1. **`SYSTEM_ADMIN` (Web Admin)**: Quản trị nhà xe. Quản lý toàn bộ trường học, xe, tài xế; lập kế hoạch phân tuyến (VRP); gán xe/tài xế mặc định cho tuyến; kích hoạt sinh chuyến thủ công; duyệt các yêu cầu thay đổi địa chỉ cần tối ưu lại tuyến (`REOPTIMIZED`). *Không duyệt RoutePlan DRAFT -> ACTIVE.*
2. **`SCHOOL_ADMIN` (Web Admin)**: Quản trị trường học. Quản lý học sinh và giáo viên phụ xe (`BUS_ATTENDANT`) của trường mình; gán giáo viên phụ xe mặc định; **duy nhất có quyền duyệt RoutePlan DRAFT -> ACTIVE**; duyệt yêu cầu cập nhật thông tin học sinh (`INFORMATION_UPDATE`); duyệt đổi địa chỉ trực tiếp hoặc gỡ học sinh khỏi tuyến (`DIRECT_UPDATE` / `REMOVED_FROM_ROUTES`). *Không tạo RoutePlan, không sinh chuyến thủ công.*
3. **`DRIVER` (Mobile App)**: Xem lịch trình tuần; xem lộ trình trên bản đồ; Bắt đầu chuyến (`startTrip`); Xác nhận đến trường (`confirmArrivalSchool` - chiều `TO_SCHOOL`); Hoàn thành chuyến (`completeTrip`).
4. **`BUS_ATTENDANT` (Mobile App)**: Xác nhận sẵn sàng đón (`confirmReady`); Điểm danh học sinh đón (`BOARDED`) và trả (`ALIGHTED`); Báo vắng mặt (`ABSENT`); Quét QR học sinh; Báo cáo sự cố khi đang trên xe.
5. **`PARENT` (Mobile App)**: Theo dõi lộ trình chuyến xe thực tế của con; Xem lịch sử chuyến; Tạo yêu cầu cập nhật thông tin/địa chỉ; Tạo đơn xin nghỉ học (`LeaveNotice`). *Quyền riêng tư (Privacy Masking): Chỉ thấy thông tin con mình, thông tin học sinh khác bị ẩn danh.*

---

## 2. Các quy tắc vận hành quan trọng cần lưu ý trên FE

### 2.1. Quy tắc Chuyến xe Đóng băng (Frozen Trip Policy - Rule G-02)
- **Định nghĩa**: Một chuyến xe được coi là "đóng băng" (`isTripFrozen`) ngay khi:
  1. `trip.actualStartTime !== null` (Tài xế đã bấm Bắt đầu chuyến), **HOẶC**
  2. `trip.attendantReadyAt !== null` (Giáo viên phụ xe đã bấm Sẵn sàng đón).
- **Hệ quả trên API**:
  - Không được dùng API đổi nhân sự thông thường (`PATCH /api/trips/:id/assignments`) -> BE sẽ trả về `409 Conflict: Chuyến xe đã đóng băng do tài xế đã bắt đầu hoặc phụ xe đã sẵn sàng`.
  - Không được rút đơn xin nghỉ (`PATCH /api/leave-notices/:id/cancel`) nếu phụ xe đã sẵn sàng -> BE sẽ trả về `400 Bad Request`.
  - Khi Hủy phương án tuyến (`POST /api/routes/plans/:id/cancel`), chỉ các chuyến **chưa đóng băng** mới bị hủy; các chuyến đã bắt đầu/sẵn sàng sẽ tiếp tục vận hành an toàn.
- **Cách xử lý trên FE**:
  - **Web Admin**: Kiểm tra nếu `trip.actualStartTime` hoặc `trip.attendantReadyAt` có giá trị thì Disable nút "Đổi tài xế / xe / phụ xe" trên bảng phân công chuyến. Hiển thị badge `Đang vận hành (Đóng băng)`. Nếu cần đổi nhân sự khẩn cấp, hướng dẫn Admin dùng tính năng **Xử lý sự cố (Incident Dispatch) -> Điều xe/tài xế thay thế**.

### 2.2. Kiểm tra xung đột Nhân sự & Phương tiện (Conflict & Availability)
- **Đơn trường (Single-School Driver)**: Một tài xế chỉ được phân công cho 1 trường học trong khoảng thời gian hiệu lực hợp đồng.
- **Không chồng lấn ca chạy**: Một tài xế hoặc phương tiện đang trong chuyến `IN_PROGRESS` sẽ không thể bắt đầu một chuyến xe khác (`409 Conflict`).
- **Nghỉ phép / Sự cố**: Tài xế/Phụ xe đang có đơn nghỉ phép hoặc sự cố chưa giải quyết sẽ bị BE chặn khi gán vào chuyến xe.

### 2.3. Quy tắc Điểm danh 2 giai đoạn & Lý do vắng mặt
- **Điểm danh Vắng mặt (`ABSENT`)**: Bắt buộc phải có `reason` trong request body. FE Mobile cần hiển thị popup/dialog chọn lý do (ví dụ: "Phụ huynh báo nghỉ", "Không có mặt tại điểm đón", "Lý do khác...").
- **Không hoàn tác về `UNMARKED`**: Khi chuyến xe đã bắt đầu hoặc xe đã đến trường, không được phép chuyển trạng thái điểm danh trở lại `UNMARKED` (`400 Bad Request`).
- **Chặn xuất bến khi toàn bộ học sinh vắng mặt (Chiều TO_PARKING)**: Nếu tất cả học sinh trong chuyến về đều có trạng thái `ABSENT`, tài xế bấm bắt đầu chuyến sẽ bị BE chặn (`409 Conflict: Không thể bắt đầu chuyến về trường/bãi khi toàn bộ học sinh đều vắng mặt`). Mobile App nên hiển thị thông báo rõ ràng cho tài xế và gợi ý xác nhận hủy chuyến hoặc liên hệ điều hành.

---

## 3. Chi tiết API Endpoints & Hướng dẫn Tích hợp

### 3.1. Phân hệ Quản lý Chuyến xe (`/api/trips`)

#### `GET /api/trips/:id`
- Trả về thông tin chi tiết chuyến, bao gồm:
  - `status`: `SCHEDULED` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`
  - `actualStartTime`, `attendantReadyAt`, `arrivedAtSchoolAt`, `completedAt`
  - `routeSnapshot`: Snapshot đóng băng danh sách học sinh và điểm dừng tại thời điểm vận hành.
  - `driver`, `busAttendant`, `vehicle`

#### `PATCH /api/trips/:id/assignments`
- **Mục đích**: Phân công hoặc đổi xe / tài xế / phụ xe trước chuyến (Web Admin).
- **Body**:
  ```json
  {
    "assignedDriverId": "uuid-driver",
    "assignedBusAttendantId": "uuid-attendant",
    "assignedVehicleId": "uuid-vehicle"
  }
  ```
- **Lưu ý FE**: Nếu chuyến đã đóng băng, API trả về `409 Conflict`. Cần bắt lỗi và hiển thị toast: `"Chuyến xe đang vận hành hoặc phụ xe đã sẵn sàng, không thể đổi nhân sự trực tiếp."`

#### `POST /api/trips/:id/start`
- **Mục đích**: Tài xế bấm bắt đầu chuyến (Mobile Driver).
- **Lỗi có thể trả về**:
  - `409 Conflict`: Tài xế hoặc phương tiện đang thực hiện một chuyến xe khác.
  - `409 Conflict`: Toàn bộ học sinh đều vắng mặt (chiều `TO_PARKING`).

#### `PATCH /api/trips/:id/attendance`
- **Mục đích**: Giáo viên phụ xe điểm danh (Mobile Attendant).
- **Body**:
  ```json
  {
    "studentId": "uuid-student",
    "status": "BOARDED", // "BOARDED" | "ALIGHTED" | "ABSENT"
    "reason": "Phụ huynh xin nghỉ qua điện thoại" // Bắt buộc nếu status = "ABSENT"
  }
  ```

---

### 3.2. Phân hệ Xử lý Sự cố (`/api/incidents`)

#### `POST /api/incidents`
- **Mục đích**: Báo cáo sự cố từ Mobile (Tài xế / Phụ xe) hoặc Web Admin.
- **Body mở rộng mới**:
  ```json
  {
    "tripId": "uuid-trip",
    "incidentType": "NO_GUARDIAN_AT_STOP", // Thêm mới: NO_GUARDIAN_AT_STOP | TRAFFIC_DELAY | GPS_SIGNAL_LOST | BREAKDOWN | ACCIDENT | MEDICAL_EMERGENCY | STUDENT_MISSING | OFF_ROUTE | LATE_STOP | OTHER
    "description": "Không có người đón học sinh tại điểm dừng số 3",
    "latitude": 10.77653,     // Tọa độ xảy ra sự cố (Tự động lấy từ GPS thiết bị)
    "longitude": 106.70098,   // Tọa độ xảy ra sự cố
    "studentId": "uuid-student" // Tùy chọn: Học sinh liên quan trực tiếp đến sự cố
  }
  ```
- **Lưu ý FE**: Trên Mobile App, khi người dùng bấm gửi báo cáo sự cố, ứng dụng cần đính kèm tọa độ GPS hiện tại (`latitude`, `longitude`) để Web Admin hiển thị chính xác vị trí sự cố trên bản đồ giám sát.

#### `POST /api/incidents/:id/resolve`
- **Mục đích**: Web Admin điều phối và xử lý sự cố.
- **Body**:
  ```json
  {
    "resolution": "REPLACED", // "REPLACED" | "RESOLVED" | "DISMISSED" | "CANCELLED_TRIP"
    "replacementDriverId": "uuid-new-driver",         // Nếu thay tài xế
    "replacementBusAttendantId": "uuid-new-attendant", // Nếu thay phụ xe
    "replacementVehicleId": "uuid-new-vehicle",       // Nếu thay xe
    "notes": "Đã điều xe và tài xế dự phòng thay thế"
  }
  ```

---

### 3.3. Phân hệ Yêu cầu Cập nhật Học sinh (`/api/student-requests`)

#### Luồng Đổi Địa chỉ Học sinh (Parent -> School Admin -> System Admin):
1. **Phụ huynh gửi yêu cầu** (`POST /api/student-requests/otp` -> `POST /api/student-requests/verify-and-create`).
2. **School Admin kiểm tra**:
   - Nếu học sinh **chưa vào tuyến**: School Admin có thể duyệt trực tiếp (`outcome = 'DIRECT_UPDATE'`).
   - Nếu học sinh **đã vào tuyến**: Bắt buộc chuyển lên System Admin để đánh giá lộ trình.
3. **System Admin Xem trước Tối ưu Tuyến (`POST /api/student-requests/:id/routing-preview`)**:
   - Response trả về:
     ```json
     {
       "previewToken": "prev_req-123_1730000000",
       "allFeasible": true,
       "overallFeasibility": "FEASIBLE", // "FEASIBLE" | "INFEASIBLE" | "UNAVAILABLE"
       "routes": [
         {
           "routeId": "uuid-route",
           "routeName": "Tuyến 01 - Sáng",
           "status": "FEASIBLE",
           "newDistanceMeters": 14200,
           "newDurationSeconds": 2100,
           "deltaMinutes": 3
         }
       ],
       "scheduledTripsToRefreshCount": 5, // Số chuyến unfrozen sẽ được cập nhật lộ trình mới
       "frozenTripsCount": 1,             // Số chuyến đã đóng băng sẽ giữ nguyên không làm xáo trộn vận hành
       "expectedFingerprint": "a1b2c3d4e5f6g7h8"
     }
     ```
4. **System Admin Phê duyệt (`POST /api/student-requests/:id/approve`)**:
   - Body khi chọn phương án tối ưu lại tuyến:
     ```json
     {
       "decision": "REOPTIMIZED",
       "previewToken": "prev_req-123_1730000000", // Bắt buộc
       "expectedFingerprint": "a1b2c3d4e5f6g7h8"  // Bắt buộc
     }
     ```
   - **Xử lý lỗi trên FE**: Nếu nhận mã lỗi `409 Conflict`, thông báo người dùng: `"Phiên xem trước đã hết hạn hoặc phương án tuyến đã có thay đổi. Vui lòng tải lại và xem trước lộ trình mới."`

---

### 3.4. Phân hệ Phương án Tuyến (`/api/routes`)

#### `GET /api/routes/plans/:id/cancellation-impact`
- **Mục đích**: Web Admin xem trước tác động trước khi bấm Hủy phương án tuyến (`RoutePlan`).
- **Response**:
  ```json
  {
    "planId": "uuid-plan",
    "status": "ACTIVE",
    "routesCount": 4,
    "scheduledTripsCount": 12, // Chỉ đếm các chuyến unfrozen sẽ bị hủy
    "frozenTripsCount": 2,     // Các chuyến đang vận hành/sẵn sàng sẽ KHÔNG bị hủy
    "inProgressTripsCount": 1,
    "completedTripsCount": 20,
    "activeLeaveNoticesCount": 3,
    "fingerprint": "f1e2d3c4"
  }
  ```
- **FE Web Admin**: Hiển thị modal xác nhận kèm cảnh báo rõ:
  - *"Sẽ hủy `scheduledTripsCount` chuyến xe chưa bắt đầu."*
  - *"Giữ nguyên `frozenTripsCount` chuyến xe đang diễn ra hoặc đã sẵn sàng."*

#### `POST /api/routes/plans/:id/cancel`
- **Body**:
  ```json
  {
    "reason": "Điều chỉnh kế hoạch học kỳ mới",
    "expectedFingerprint": "f1e2d3c4" // Nhận từ cancellation-impact để chống xung đột thao tác đồng thời
  }
  ```

---

## 4. Bảng mã lỗi HTTP & Hướng dẫn UI tương ứng

| HTTP Status | Trường hợp lỗi từ BE | Hướng dẫn xử lý UI (Frontend) |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Thiếu `reason` khi điểm danh `ABSENT` | Hiển thị validate form: *"Vui lòng nhập/chọn lý do học sinh vắng mặt."* |
| **`400 Bad Request`** | Rút đơn xin nghỉ khi xe đã sẵn sàng | Toast cảnh báo: *"Không thể rút đơn xin nghỉ do giáo viên phụ xe đã chuẩn bị đón."* |
| **`400 Bad Request`** | Điểm danh đảo ngược về `UNMARKED` sau khi xuất bến | Disable nút hủy điểm danh khi chuyến xe đã ở trạng thái `IN_PROGRESS`. |
| **`409 Conflict`** | Sửa phân công chuyến xe đã đóng băng (`isTripFrozen`) | Toast lỗi: *"Chuyến xe đã bắt đầu hoặc phụ xe đã sẵn sàng. Vui lòng vào Điều phối sự cố để đổi nhân sự."* |
| **`409 Conflict`** | Tài xế/Xe đang có chuyến chạy dở | Toast lỗi: *"Tài xế hoặc phương tiện hiện đang trong một chuyến xe khác chưa hoàn thành."* |
| **`409 Conflict`** | Xuất bến chiều về khi 100% học sinh vắng mặt | Alert Modal: *"Tất cả học sinh trong chuyến xe đều vắng mặt. Không thể xuất bến."* |
| **`409 Conflict`** | `previewToken` hoặc `expectedFingerprint` không khớp | Toast lỗi: *"Dữ liệu tuyến đã thay đổi trong khi xem trước. Vui lòng bấm Xem trước lại."* |
| **`403 Forbidden`** | School Admin thao tác dữ liệu trường khác | Hiển thị màn hình 403 hoặc Toast: *"Bạn không có quyền thực hiện trên dữ liệu của trường khác."* |

---

## 5. Hướng dẫn kiểm thử & Xác nhận kết nối (Health Check)
- **Swagger Documentation**: Mở trình duyệt tại `http://localhost:3000/api/docs` để kiểm tra toàn bộ schemas, request body mẫu và response attributes.
- **Kiểm tra phân quyền**: Đảm bảo Header luôn có `Authorization: Bearer <token>` ứng với role chính xác (`SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `DRIVER`, `BUS_ATTENDANT`, `PARENT`).
