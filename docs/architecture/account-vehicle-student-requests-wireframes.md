# RoadToSchool — Wireframe Design Specification
# Scope: Account Settings, Vehicle Management & Student Update Requests
# Phase: Round 3/3 — Complete Web & Mobile Implementation

> **Tài liệu Wireframes Thiết kế UI/UX Chi Tiết**  
> **Áp dụng cho**: Web Admin (System Admin, School Admin) & Mobile App (Parent, Driver, Bus Attendant)  
> **Nguyên tắc cốt lõi**: Wireframe First, Minimal UI Copy, RoadToSchool Design Tokens (#FFCB56, #FFFDF6, #1E293B, #FFFFFF).

---

## 1. HỆ THỐNG THIẾT KẾ & NGUYÊN TẮC GIAO DIỆN (DESIGN SYSTEM)

- **Bảng màu chủ đạo**:
  - `Primary`: `#FFCB56` (Vàng ấm thương hiệu RoadToSchool)
  - `Background`: `#FFFDF6` (Trắng kem dịu mắt)
  - `Foreground`: `#1E293B` (Xanh đen than đá đậm đà, tương phản cao WCAG AAA)
  - `Surface`: `#FFFFFF` (Trắng tinh khiết cho Card, Modal, Dropdown)
  - `Border`: `#E2E8F0` (Viền xám mảnh tinh tế)
  - `Success`: `#10B981` (Xanh ngọc lục bảo)
  - `Warning`: `#F59E0B` (Hổ phách)
  - `Error / Danger`: `#EF4444` (Đỏ san hô)
- **Typography**: Inter / System Sans-serif, phân cấp chữ rõ ràng (Heading 24px/20px/18px, Body 14px/15px, Caption 12px/11px).
- **Nguyên tắc Minimal UI Copy**: *"Show what users need to know and do, not paragraphs explaining what the interface does"*. Không hiển thị các đoạn văn bản hướng dẫn dài dòng; sử dụng nhãn rõ ràng, badge trạng thái, icon trực quan và tooltip ngữ cảnh.

---

## 2. SYSTEM ADMIN — WEB SCREENS & WIREFRAMES

### 2.1. Cài đặt tài khoản (`/admin/settings` — Tab "Tài khoản")
- **Mục đích**: Quản trị viên hệ thống quản lý mật khẩu cá nhân và cập nhật ảnh đại diện tài khoản.
- **Bố cục (Desktop & Tablet)**:
  ```
  +-----------------------------------------------------------------------------------+
  | Header: [Logo RoadToSchool]                           [Avatar] [Tên Admin] [Role] |
  +-----------------------------------------------------------------------------------+
  | Sidebar    | Cài đặt hệ thống & Tài khoản                                         |
  |            | [Tab: Tài khoản (Active)]   [Tab: Vị trí bãi xe]                     |
  | - Tổng quan+---------------------------------------------------------------------+
  | - Trường   | 1. Ảnh đại diện                                                     |
  | - Tài xế   | [Avatar Lớn 80px]  [Chọn ảnh mới]  [Lưu ảnh]                         |
  | - Xe       | (Chấp nhận JPEG, PNG, WebP tối đa 5MB)                              |
  | - Yêu cầu  +---------------------------------------------------------------------+
  | - Cài đặt* | 2. Đổi mật khẩu                                                     |
  |            | Mật khẩu hiện tại:    [ **********                     ] [Hiện/Ẩn]  |
  |            | Mật khẩu mới:         [ **********                     ] [Hiện/Ẩn]  |
  |            | Xác nhận mật khẩu mới:[ **********                     ] [Hiện/Ẩn]  |
  |            |                                        [Nút: Cập nhật mật khẩu]     |
  |            +---------------------------------------------------------------------+
  |            | 3. Phiên làm việc                                                   |
  |            | [Icon Khóa] Đang đăng nhập an toàn            [Nút Đỏ: Đăng xuất]   |
  +------------+---------------------------------------------------------------------+
  ```

### 2.2. Vị trí bãi xe trung tâm (`/admin/settings` — Tab "Vị trí bãi xe")
- **Mục đích**: System Admin cấu hình địa chỉ và tọa độ đón trả trung tâm duy nhất của nhà xe.
- **Bố cục**:
  ```
  +-----------------------------------------------------------------------------------+
  | Cài đặt / Vị trí bãi xe trung tâm                                                 |
  | [Tab: Tài khoản]   [Tab: Vị trí bãi xe (Active)]                                  |
  +-----------------------------------------------------------------------------------+
  | Địa chỉ bãi xe: [ 123 Đường Vận Tải, Phường Linh Trung, Thủ Đức...  ] [Tìm kiếm]   |
  | (Gợi ý thả xuống tự động từ VietMap Autocomplete v4 khi gõ)                       |
  +-----------------------------------------------------------------------------------+
  | Khung bản đồ VietMap (MapLibre GL):                                              |
  | +-------------------------------------------------------------------------------+ |
  | |                                       [+] [-]                                 | |
  | |                                                                               | |
  | |                            [Marker Bãi Xe 📍]                                 | |
  | |                                                                               | |
  | +-------------------------------------------------------------------------------+ |
  | Ghi chú: Kéo thả marker hoặc nhấp bản đồ để điều chỉnh vị trí chính xác.          |
  |                                                          [Nút Vàng: Lưu cấu hình] |
  +-----------------------------------------------------------------------------------+
  ```

### 2.3. Danh sách phương tiện (`/admin/vehicles`)
- **Mục đích**: Quản lý các phương tiện vận tải với định nghĩa `seatCount` là số ghế khả dụng chở học sinh.
- **Bố cục**:
  ```
  +-----------------------------------------------------------------------------------+
  | Phương tiện vận tải                                         [+ Thêm phương tiện]  |
  | Quản lý danh sách phương tiện đưa đón học sinh                                     |
  +-----------------------------------------------------------------------------------+
  | [🔍 Tìm theo hãng xe, biển số...]                             [Tổng: 18 xe]       |
  +-----------------------------------------------------------------------------------+
  | HÃNG XE         | BIỂN SỐ       | SỐ GHẾ HỌC SINH ℹ️ | MÀU SẮC  | NGÀY TẠO         |
  +-----------------+---------------+--------------------+----------+------------------+
  | Hyundai Solati  | 51B-123.45    | 14 chỗ             | Trắng    | 23/10/2026       |
  | Ford Transit    | 51B-999.88    | 14 chỗ             | Bạc      | 22/10/2026       |
  | Toyota HiAce    | 50A-555.66    | 10 chỗ             | Xanh tím | 21/10/2026       |
  +-----------------------------------------------------------------------------------+
  | Trang [1] / 2                                            [< Trước]  [Tiếp >]      |
  +-----------------------------------------------------------------------------------+
  ```

### 2.4. Hộp thoại thêm phương tiện (Modal `AddVehicleModal`)
- **Bố cục Modal**:
  ```
  +-------------------------------------------------------------+
  | Thêm phương tiện mới                                    [X] |
  +-------------------------------------------------------------+
  | Hãng xe: *                                                  |
  | [ Hyundai Solati                                          ] |
  |                                                             |
  | Số ghế dành cho học sinh: * ℹ️                              |
  | [ 14                                                      ] |
  | ℹ️ Tooltip: "Số ghế thực tế chở học sinh, không gồm ghế    |
  | tài xế và nhân sự/giám sát viên."                           |
  |                                                             |
  | Biển số xe: *                                               |
  | [ 51B-123.45                                              ] |
  | (Hệ thống tự động chuẩn hóa và kiểm tra trùng lặp)          |
  |                                                             |
  | Màu sắc: *                                                  |
  | [ Trắng sứ                                                ] |
  +-------------------------------------------------------------+
  | [Hủy bỏ]                             [Nút Vàng: Thêm xe mới]|
  +-------------------------------------------------------------+
  ```

### 2.5. Tab Yêu cầu cập nhật địa chỉ (`/admin/requests` — System Admin View)
- **Mục đích**: System Admin theo dõi và xét duyệt các yêu cầu `ADDRESS_UPDATE`. Tuyệt đối không hiển thị `INFORMATION_UPDATE`.
- **Bố cục**:
  ```
  +-----------------------------------------------------------------------------------+
  | Yêu cầu cập nhật địa chỉ học sinh                                                 |
  | Tiếp nhận và xử lý thay đổi địa chỉ đón trả trên toàn hệ thống                    |
  +-----------------------------------------------------------------------------------+
  | [🔍 Tìm tên, mã học sinh, tên trường...]  [Trạng thái: Tất cả ▼]   [Thời gian ▼]  |
  +-----------------------------------------------------------------------------------+
  | HỌC SINH         | TRƯỜNG HỌC     | LOẠI YÊU CẦU | TRẠNG THÁI | NGÀY GỬI  | THAO TÁC|
  +------------------+----------------+--------------+------------+-----------+---------+
  | Nguyễn Văn An    | TH Chu Văn An  | Đổi địa chỉ  | [Chờ duyệt]| 23/10     | [Xem]   |
  | Trần Bảo Ngọc    | TH FPT         | Đổi địa chỉ  | [Đã duyệt] | 22/10     | [Xem]   |
  +-----------------------------------------------------------------------------------+
  | Trang 1/1                                                                         |
  +-----------------------------------------------------------------------------------+
  ```

---

## 3. SCHOOL ADMIN — WEB SCREENS & WIREFRAMES

### 3.1. Tab Yêu cầu cập nhật (`/admin/requests` — School Admin View)
- **Mục đích**: School Admin xem và xét duyệt cả `INFORMATION_UPDATE` và `ADDRESS_UPDATE` của trường mình.
- **Bố cục**:
  ```
  +-----------------------------------------------------------------------------------+
  | Yêu cầu cập nhật thông tin học sinh                                               |
  | Xét duyệt các yêu cầu điều chỉnh thông tin và địa chỉ từ phụ huynh                |
  +-----------------------------------------------------------------------------------+
  | [🔍 Tìm kiếm...]   [Loại: Tất cả ▼]   [Trạng thái: Tất cả ▼]      [Mới nhất ▼]   |
  +-----------------------------------------------------------------------------------+
  | HỌC SINH         | PHỤ HUYNH      | LOẠI YÊU CẦU | TRẠNG THÁI | NGÀY GỬI  | THAO TÁC|
  +------------------+----------------+--------------+------------+-----------+---------+
  | Lê Minh Khang    | Lê Văn Ba      | Đổi thông tin| [Chờ duyệt]| 23/10     | [Chi tiết]|
  | Hoàng Gia Huy    | Hoàng Thị Hoa  | Đổi địa chỉ  | [Chờ duyệt]| 23/10     | [Chi tiết]|
  | Vũ Thu Trang     | Vũ Đức Hùng    | Đổi địa chỉ  | [Đã từ chối| 22/10     | [Chi tiết]|
  +-----------------------------------------------------------------------------------+
  ```

### 3.2. Modal Chi tiết yêu cầu & So sánh Stale Data (`RequestDetailModal`)
- **Trường hợp A: Dữ liệu bình thường (isStale = false)**
  ```
  +-----------------------------------------------------------------------------+
  | Chi tiết yêu cầu cập nhật #REQ-12345                                    [X] |
  +-----------------------------------------------------------------------------+
  | Học sinh: Lê Minh Khang (Mã: STU987654)            Trạng thái: [Chờ duyệt]  |
  | Phụ huynh: Lê Văn Ba                               Ngày gửi: 23/10/2026     |
  +-----------------------------------------------------------------------------+
  | SO SÁNH DỮ LIỆU:                                                            |
  | TRƯỜNG THÔNG TIN        | LÚC GỬI YÊU CẦU            | ĐỀ XUẤT MỚI (OTP)   |
  +-------------------------+----------------------------+---------------------+
  | Họ tên học sinh         | Lê Minh Khang              | Lê Minh Khang (Mới) |
  | SĐT người giám hộ       | 0912345678                 | 0987654321          |
  +-----------------------------------------------------------------------------+
  |                                   [Nút Đỏ: Từ chối]   [Nút Vàng: Phê duyệt] |
  +-----------------------------------------------------------------------------+
  ```

- **Trường hợp B: Phát hiện xung đột dữ liệu cũ (isStale = true)**
  ```
  +-----------------------------------------------------------------------------+
  | Chi tiết yêu cầu cập nhật #REQ-12345                                    [X] |
  +-----------------------------------------------------------------------------+
  | ⚠️ CẢNH BÁO XUNG ĐỘT (STALE DATA):                                          |
  | Dữ liệu gốc của học sinh đã bị thay đổi trực tiếp sau khi phụ huynh tạo     |
  | yêu cầu. Không thể phê duyệt để tránh ghi đè dữ liệu. Vui lòng từ chối.     |
  +-----------------------------------------------------------------------------+
  | SO SÁNH 3 CỘT:                                                              |
  | TRƯỜNG THÔNG TIN | LÚC GỬI (BEFORE)   | HIỆN TẠI (CURRENT) | ĐỀ XUẤT (PROPOSED)|
  | Địa chỉ          | 123 Đường Cũ       | 456 Đường Sửa Admin| 999 Đường Mới OTP |
  +-----------------------------------------------------------------------------+
  |                                   [Nút Đỏ: Từ chối yêu cầu]  [Duyệt (Disabled)]|
  +-----------------------------------------------------------------------------+
  ```

### 3.3. Hộp thoại Xác nhận Phê duyệt & Từ chối
- **Approve Confirm**: Xác nhận cập nhật thông tin học sinh ngay lập tức.
- **Reject Confirm**: Có ô nhập lý do từ chối (Textarea, tùy chọn, tối đa 500 ký tự).

### 3.4. Cập nhật trực tiếp địa chỉ học sinh (`/admin/students/[id]`)
- **Vị trí**: Nằm trong thẻ thông tin địa chỉ tại trang Chi tiết học sinh của School Admin.
- **Bố cục**:
  ```
  +-----------------------------------------------------------------------------+
  | ĐỊA CHỈ ĐÓN TRẢ HỌC SINH                         [Nút: Sửa trực tiếp ✏️]    |
  +-----------------------------------------------------------------------------+
  | Địa chỉ: 123 Điện Biên Phủ, Phường 15, Bình Thạnh, TP.HCM                   |
  | Tọa độ: 10.798123, 106.701456                                               |
  +-----------------------------------------------------------------------------+
  | [Khi nhấn Sửa trực tiếp]:                                                   |
  | Nhập địa chỉ: [ 456 Nguyễn Thị Minh Khai...                  ]              |
  | [Khung bản đồ VietMap kéo thả Marker]                                       |
  | [Hủy]                                                    [Nút Vàng: Lưu địa chỉ] |
  +-----------------------------------------------------------------------------+
  ```

### 3.5. Lịch sử yêu cầu trong Chi tiết học sinh
- Thêm Section `Danh sách yêu cầu` phía dưới trang Chi tiết học sinh, hiển thị toàn bộ các yêu cầu của học sinh này (Lọc Type, Status, Modal chi tiết).

---

## 4. PARENT & MOBILE SCREENS & WIREFRAMES

### 4.1. Màn hình Cài đặt tài khoản Mobile (`(tabs)/settings.tsx`)
- **Mục đích**: Tất cả các vai trò Mobile đổi mật khẩu, đổi Avatar; riêng Phụ huynh có quyền đổi tên tài khoản.
- **Bố cục**:
  ```
  +-----------------------------------------------------------+
  |                      Cá nhân                              |
  +-----------------------------------------------------------+
  | [Avatar Tròn 72px] [Icon Camera 📷]                       |
  | Nguyễn Văn Phụ Huynh                                      |
  | [Badge: Phụ huynh học sinh]                               |
  | 0912345678                                                |
  +-----------------------------------------------------------+
  | TÀI KHOẢN                                                 |
  | 👤 Đổi tên hiển thị (Chỉ hiện cho PARENT)             >   |
  | 🔒 Đổi mật khẩu                                       >   |
  | 🖼️ Đổi ảnh đại diện                                   >   |
  +-----------------------------------------------------------+
  | THÔNG TIN ỨNG DỤNG                                        |
  | 🎨 Giao diện: RoadToSchool (#FFCB56)                      |
  | 🛡️ Bảo mật: Expo SecureStore                              |
  | ℹ️ Phiên bản: 1.0.0                                       |
  +-----------------------------------------------------------+
  | [🚪 Đăng xuất tài khoản]                                  |
  +-----------------------------------------------------------+
  ```

### 4.2. Màn hình Chi tiết học sinh Phụ huynh (`parent/student-detail/[id].tsx`)
- **Mục đích**: Duy trì đúng 2 Sections, bổ sung 2 nút thao tác mới.
- **Bố cục**:
  ```
  +-----------------------------------------------------------+
  | [<]                     Hồ sơ học sinh                    |
  +-----------------------------------------------------------+
  | SECTION 1 — THÔNG TIN HỌC SINH                            |
  | [Avatar]  Nguyễn Văn Em Bé                                |
  |           Mã HS: STU83726194 | Lớp 3A                     |
  |           Trạng thái: [Đang học / AVAILABLE]              |
  | 🏫 Trường: Tiểu học Chu Văn An                             |
  | 📍 Địa chỉ: 123 Đường Số 1, Quận 1, TP.HCM                 |
  +-----------------------------------------------------------+
  | SECTION 2 — THAO TÁC VỚI HỌC SINH                         |
  | [ 📝 Cập nhật thông tin học sinh                     > ]  |
  | [ 📍 Cập nhật địa chỉ đón trả                        > ]  |
  | [ 🗑️ Hủy liên kết học sinh                           > ]  |
  +-----------------------------------------------------------+
  ```

### 4.3. Màn hình Danh sách yêu cầu học sinh (`parent/update-requests/[studentId].tsx`)
- **Mục đích**: Danh sách dọc 1 cột các yêu cầu của học sinh kèm bộ lọc và nút thêm mới.
- **Bố cục**:
  ```
  +-----------------------------------------------------------+
  | [<]                Yêu cầu cập nhật        [+ Tạo yêu cầu]|
  | Học sinh: Nguyễn Văn Em Bé                                |
  +-----------------------------------------------------------+
  | [Lọc Loại: Tất cả ▼]            [Trạng thái: Tất cả ▼]    |
  +-----------------------------------------------------------+
  | +-------------------------------------------------------+ |
  | | [Icon 📍] CẬP NHẬT ĐỊA CHỈ            [Chờ duyệt]     | |
  | | Ngày gửi: 23/10/2026 14:30                            | |
  | | Đề xuất: 456 Đường Nguyễn Văn Cừ, Quận 5              | |
  | | Nhấn để xem chi tiết                                > | |
  | +-------------------------------------------------------+ |
  | +-------------------------------------------------------+ |
  | | [Icon 📝] CẬP NHẬT THÔNG TIN          [Đã duyệt]      | |
  | | Ngày gửi: 20/10/2026 09:15                            | |
  | | Đề xuất: Đổi tên & SĐT người giám hộ                  | |
  | | Nhấn để xem chi tiết                                > | |
  | +-------------------------------------------------------+ |
  +-----------------------------------------------------------+
  ```

### 4.4. Màn hình Tạo yêu cầu cập nhật thông tin (`parent/create-request/information.tsx`)
- **Bố cục**:
  ```
  +-----------------------------------------------------------+
  | [<]             Cập nhật thông tin học sinh               |
  +-----------------------------------------------------------+
  | Họ tên học sinh hiện tại:                                 |
  | Nguyễn Văn Em Bé                                          |
  |                                                           |
  | Họ tên mới đề xuất:                                       |
  | [ Nguyễn Văn Em Bé (Đã đổi)                             ] |
  |                                                           |
  | Số điện thoại người giám hộ mới:                          |
  | [ 0987654321                                            ] |
  |                                                           |
  | ℹ️ Mã xác thực OTP sẽ được gửi đến SĐT người giám hộ      |
  | HIỆN TẠI (090****003) để bảo đảm an toàn.                 |
  +-----------------------------------------------------------+
  |                                    [Nút Vàng: Tiếp tục]   |
  +-----------------------------------------------------------+
  ```

### 4.5. Màn hình Tạo yêu cầu cập nhật địa chỉ (`parent/create-request/address.tsx`)
- **Bố cục**:
  ```
  +-----------------------------------------------------------+
  | [<]              Cập nhật địa chỉ đón trả                 |
  +-----------------------------------------------------------+
  | Địa chỉ hiện tại:                                         |
  | 123 Đường Số 1, Phường Bến Nghé, Quận 1                   |
  |                                                           |
  | Tìm kiếm địa chỉ mới:                                     |
  | [ 456 Nguyễn Thị Minh Khai...                         🔍 ]|
  |                                                           |
  | Danh sách gợi ý VietMap:                                  |
  | 📍 456 Nguyễn Thị Minh Khai, Phường 5, Quận 3             |
  | 📍 456/12 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1     |
  |                                                           |
  | Địa chỉ đã chọn:                                          |
  | [ 456 Nguyễn Thị Minh Khai, Phường 5, Quận 3            ] |
  +-----------------------------------------------------------+
  |                                    [Nút Vàng: Tiếp tục]   |
  +-----------------------------------------------------------+
  ```

### 4.6. Màn hình Xác thực OTP (`parent/create-request/verify-otp.tsx`)
- **Bố cục**:
  ```
  +-----------------------------------------------------------+
  | [<]                 Xác thực mã OTP                       |
  +-----------------------------------------------------------+
  | Mã xác thực 6 số đã được gửi tới số điện thoại:           |
  | [Icon Điện thoại 📱] 090****003                           |
  |                                                           |
  | Nhập mã OTP:                                              |
  | [ _ ]  [ _ ]  [ _ ]  [ _ ]  [ _ ]  [ _ ]                 |
  |                                                           |
  | Hiệu lực còn: 04:59                                       |
  | Bạn không nhận được mã? Gửi lại sau (58s)                 |
  +-----------------------------------------------------------+
  |                                 [Nút Vàng: Xác nhận gửi]  |
  +-----------------------------------------------------------+
  ```

### 4.7. Màn hình Chi tiết yêu cầu phía Phụ huynh (`parent/request-detail/[id].tsx`)
- Hiển thị loại yêu cầu, badge trạng thái, mốc thời gian, bảng so sánh Dữ liệu ban đầu vs Dữ liệu đề xuất. Nếu trạng thái là `REJECTED`, hiển thị hộp thông báo màu đỏ ghi rõ lý do từ chối từ nhà trường.

---

## 5. MAPPING API ENDPOINTS & FLOWS

| Giao diện | Thao tác người dùng | REST Endpoint | Phương thức |
| :--- | :--- | :--- | :--- |
| **Web Admin Settings** | Đổi mật khẩu | `/api/v1/auth/me/change-password` | POST |
| **Web Admin Settings** | Đổi Avatar | `/api/v1/auth/me/avatar` | POST (multipart) |
| **Web SysAdmin Settings**| Cập nhật Bãi xe | `/api/v1/system-settings/parking-lot` | PUT |
| **Web SysAdmin Settings**| Đọc vị trí Bãi xe | `/api/v1/system-settings/parking-lot` | GET |
| **Web Vehicles** | Danh sách xe | `/api/v1/vehicles` | GET |
| **Web Vehicles** | Thêm xe mới | `/api/v1/vehicles` | POST |
| **Web Requests** | Danh sách yêu cầu (School)| `/api/v1/schools/:schoolId/update-requests` | GET |
| **Web Requests** | Danh sách yêu cầu (System)| `/api/v1/system-admin/update-requests` | GET |
| **Web Requests** | Chi tiết yêu cầu (School) | `/api/v1/schools/:schoolId/update-requests/:id` | GET |
| **Web Requests** | Chi tiết yêu cầu (System) | `/api/v1/system-admin/update-requests/:id` | GET |
| **Web Requests** | Phê duyệt (School) | `/api/v1/schools/:schoolId/update-requests/:id/approve` | POST |
| **Web Requests** | Từ chối (School) | `/api/v1/schools/:schoolId/update-requests/:id/reject` | POST |
| **Web Requests** | Phê duyệt (System) | `/api/v1/system-admin/update-requests/:id/approve` | POST |
| **Web Requests** | Từ chối (System) | `/api/v1/system-admin/update-requests/:id/reject` | POST |
| **Web Student Detail** | Sửa địa chỉ trực tiếp | `/api/v1/schools/:schoolId/students/:id/address` | PATCH |
| **Web Student Detail** | Lịch sử yêu cầu HS | `/api/v1/schools/:schoolId/students/:id/update-requests` | GET |
| **Mobile Profile** | Phụ huynh đổi tên | `/api/v1/auth/me/name` | PATCH |
| **Mobile Profile** | Đổi mật khẩu | `/api/v1/auth/me/change-password` | POST |
| **Mobile Profile** | Đổi Avatar | `/api/v1/auth/me/avatar` | POST (multipart) |
| **Mobile Parent Requests**| Yêu cầu mã OTP | `/api/v1/parents/students/:id/update-requests/otp` | POST |
| **Mobile Parent Requests**| Xác thực OTP & Tạo | `/api/v1/parents/students/:id/update-requests/verify` | POST |
| **Mobile Parent Requests**| Danh sách yêu cầu | `/api/v1/parents/students/:id/update-requests` | GET |
| **Mobile Parent Requests**| Chi tiết yêu cầu | `/api/v1/parents/update-requests/:requestId` | GET |

---
**Tài liệu Wireframes đã hoàn tất và sẵn sàng cho việc lập trình Web & Mobile UI.**
