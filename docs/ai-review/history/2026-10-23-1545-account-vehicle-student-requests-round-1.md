# RoadToSchool — AI Review Report
# Phạm vi: Account Settings, Vehicle Management & Student Update Requests
# Giai đoạn: Round 1/3 — Business Analysis & Master Implementation Plan

> **Thời gian báo cáo**: 23/10/2026 15:45  
> **Người thực hiện**: Senior Software Architect, Business Analyst, Database Architect & Technical Lead  
> **Trạng thái**: Hoàn thành Phân tích & Kế hoạch Tổng thể (Round 1/3 Done — Ready for PO Approval)  
> **Bản vá đính kèm**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)  
> **Tài liệu kiến trúc chính**: [account-vehicle-student-requests-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/architecture/account-vehicle-student-requests-plan.md)  
> **Tài liệu tham chiếu**: [BUSINESS_CONTEXT.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/BUSINESS_CONTEXT.md), [WORKING_RULES.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/WORKING_RULES.md)

---

### 1. Round 1 Summary

- Thực hiện toàn bộ công tác phân tích nghiệp vụ, đánh giá kiến trúc hiện tại, thiết kế Data Model, thiết kế luồng xác thực OTP khóa chặt payload, ma trận 19 REST APIs, ma trận phân quyền RBAC và phân tích 14 quyết định mở trong **Round 1/3**.
- **Tuân thủ tuyệt đối quy định Planning Only**: Không viết mã nguồn ứng dụng, không sửa đổi Prisma Schema hay tạo Migration, không cài đặt dependencies mới và không thực hiện Git Commit/Push.
- Hệ thống đã sẵn sàng cho Product Owner đánh giá và phê duyệt chuyển sang **Round 2/3 (Database & Backend Implementation)**.

---

### 2. Existing Codebase Inspection

1. **User & Authentication**:
   - Bảng `users` dùng chung cho 5 roles (`SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `DRIVER`, `BUS_ATTENDANT`, `PARENT`).
   - Mật khẩu mã hóa `bcryptjs` salt rounds 10.
   - Bảng `sessions` theo dõi phiên đa thiết bị, hỗ trợ thu hồi tức thì qua `revokedAt`.
   - `User` đã có trường `avatarUrl`, đề xuất bổ sung `avatarPublicId` để dọn dẹp Cloudinary.
2. **Cloudinary Service**:
   - Service `CloudinaryService` đang hoạt động ổn định cho trường học và học sinh. Tái sử dụng để upload avatar người dùng lên thư mục `roadtoschool/avatars`.
3. **School & Student Management**:
   - Model `Student` liên kết 1-N với `School`.
   - Trạng thái học sinh: `AVAILABLE` và `DISABLED`.
   - Bảng liên kết phụ huynh: `parent_student_links` (N-N).
4. **OTP System**:
   - Model `otp_challenges` lưu trữ hash SHA-256 của mã OTP.
   - Enum `OtpPurpose` sẵn sàng mở rộng thêm mục đích `STUDENT_UPDATE_REQUEST`.
5. **VietMap Integration**:
   - Module chuẩn hóa `web/src/lib/vietmap/` (Autocomplete v4, Place Details v4, Reverse Geocoding v4, unmasking worker). Sẵn sàng tái sử dụng cho bãi xe và cập nhật địa chỉ học sinh.

---

### 3. Confirmed Requirements (Đã thống nhất)

- Tất cả vai trò được đổi mật khẩu và đổi avatar của chính mình.
- Chỉ vai trò `PARENT` được đổi tên hiển thị tài khoản của mình.
- System Admin cấu hình vị trí bãi đỗ xe trung tâm duy nhất qua VietMap.
- System Admin quản lý phương tiện: Hãng, Số chỗ ngồi, Biển số xe duy nhất toàn hệ thống, Màu sắc.
- Mọi yêu cầu cập nhật học sinh từ phụ huynh BẮT BUỘC xác thực OTP gửi về số điện thoại người giám hộ HIỆN TẠI của học sinh.
- Hai loại yêu cầu: `INFORMATION_UPDATE` (Họ tên, SĐT) và `ADDRESS_UPDATE` (Địa chỉ, Tọa độ).
- Ba trạng thái yêu cầu chính thức: `PENDING`, `APPROVED`, `REJECTED`.
- School Admin duyệt cả 2 loại yêu cầu cho học sinh trường mình; System Admin chỉ duyệt `ADDRESS_UPDATE`.
- School Admin được sửa trực tiếp địa chỉ học sinh trường mình khi học sinh `AVAILABLE`.
- Chi tiết học sinh của School Admin có thêm section hiển thị lịch sử yêu cầu của học sinh đó.

---

### 4. Proposed Request Workflow & Lifecycle

```
[Phụ huynh nhập đề xuất] 
       ↓
[Gửi OTP tới SĐT giám hộ hiện tại & Khóa hash payload]
       ↓
[Phụ huynh xác thực OTP] 
       ↓
[Tạo StudentUpdateRequest (PENDING) + Snapshot BeforeData]
       ↓
[Admin duyệt/từ chối]
 ┌─────┴────────────────────────────────┐
 ↓                                      ↓
[APPROVED]                           [REJECTED]
- Cập nhật Student (Atomic Tx)       - Giữ nguyên Student
- Request = APPROVED                 - Request = REJECTED
- Kết thúc                           - Kết thúc
```

---

### 5. Role & Permission Matrix (RBAC)

| Chức năng nghiệp vụ | SYSTEM_ADMIN | SCHOOL_ADMIN | DRIVER | BUS_ATTENDANT | PARENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Đổi mật khẩu tài khoản | YES | YES | YES | YES | YES |
| Cập nhật Avatar tài khoản | YES | YES | YES | YES | YES |
| Cập nhật Họ tên tài khoản | NO | NO | NO | NO | **YES** |
| Xem vị trí bãi xe trung tâm | YES | YES | YES | YES | YES |
| Cập nhật vị trí bãi xe trung tâm | **YES** | NO | NO | NO | NO |
| Xem danh sách phương tiện | **YES** | NO | NO | NO | NO |
| Thêm phương tiện mới | **YES** | NO | NO | NO | NO |
| Tạo yêu cầu đổi thông tin (OTP) | NO | NO | NO | NO | **YES** |
| Tạo yêu cầu đổi địa chỉ (OTP) | NO | NO | NO | NO | **YES** |
| Xem yêu cầu của học sinh mình | NO | NO | NO | NO | **YES** |
| Duyệt yêu cầu INFORMATION_UPDATE | NO | **YES (Trường mình)** | NO | NO | NO |
| Duyệt yêu cầu ADDRESS_UPDATE | **YES (Toàn hệ thống)** | **YES (Trường mình)** | NO | NO | NO |
| Từ chối yêu cầu cập nhật | **YES (Địa chỉ)** | **YES (Cả hai)** | NO | NO | NO |
| Sửa trực tiếp địa chỉ học sinh | NO | **YES (Trường mình)** | NO | NO | NO |
| Xem lịch sử yêu cầu của học sinh | NO | **YES (Trường mình)** | NO | NO | NO |

---

### 6. Proposed Minimal Database Schema

1. **Enum mới**: `RequestType` (`INFORMATION_UPDATE`, `ADDRESS_UPDATE`), `RequestStatus` (`PENDING`, `APPROVED`, `REJECTED`).
2. **Bảng `vehicles`**: `id`, `brand`, `seat_count`, `license_plate` (unique), `normalized_plate` (unique), `color`, `is_active`, `created_at`, `updated_at`.
3. **Bảng `system_settings`**: `id = 'default'`, `key = 'PARKING_LOT'`, `value = Json`, `updated_at`.
4. **Bảng `student_update_requests`**: `id`, `student_id`, `parent_id`, `school_id`, `type`, `status`, `before_data`, `proposed_data`, `rejection_reason`, `reviewed_by_id`, `reviewed_at`, `created_at`, `updated_at`.
5. **Điều chỉnh nhỏ**: Bổ sung `avatarPublicId` vào `User`; bổ sung `payloadHash` vào `OtpChallenge`.

---

### 7. Proposed API Matrix (19 REST Endpoints)

- **Account**:
  - `POST /auth/me/change-password` (ALL)
  - `POST /auth/me/avatar` (ALL)
  - `PATCH /auth/me/name` (PARENT only)
- **Parking Lot**:
  - `GET /system-settings/parking-lot` (ALL)
  - `PUT /system-settings/parking-lot` (SYSTEM_ADMIN)
- **Vehicles**:
  - `GET /vehicles` (SYSTEM_ADMIN)
  - `POST /vehicles` (SYSTEM_ADMIN)
- **Parent Requests**:
  - `POST /parents/students/:id/update-requests/otp` (PARENT)
  - `POST /parents/students/:id/update-requests/verify` (PARENT)
  - `GET /parents/students/:id/update-requests` (PARENT)
  - `GET /parents/update-requests/:requestId` (PARENT)
- **School Admin Requests**:
  - `GET /schools/:schoolId/update-requests` (SCHOOL_ADMIN)
  - `GET /schools/:schoolId/students/:id/update-requests` (SCHOOL_ADMIN)
  - `PATCH /schools/:schoolId/update-requests/:id/approve` (SCHOOL_ADMIN)
  - `PATCH /schools/:schoolId/update-requests/:id/reject` (SCHOOL_ADMIN)
  - `PATCH /schools/:schoolId/students/:id/address` (SCHOOL_ADMIN)
- **System Admin Requests**:
  - `GET /system-admin/update-requests` (SYSTEM_ADMIN)
  - `PATCH /system-admin/update-requests/:id/approve` (SYSTEM_ADMIN)
  - `PATCH /system-admin/update-requests/:id/reject` (SYSTEM_ADMIN)

---

### 8. OTP Security & Payload Hash Binding

- Khi phụ huynh xin OTP: Backend sinh chuỗi băm SHA-256 từ canonical JSON của `{ type, proposedData }` và lưu vào `OtpChallenge.payloadHash`.
- Khi phụ huynh verify: Đối chiếu hash dữ liệu gửi lên với `payloadHash`. Ngăn chặn hoàn toàn việc đổi nội dung đề xuất sau khi đã nhận OTP.
- Mã OTP chỉ gửi tới số điện thoại người giám hộ hiện tại lưu trong hồ sơ học sinh, không gửi tới số mới đề xuất.

---

### 9. Approval Concurrency & Stale Detection

- **Nguyên tắc One Valid Approval Is Sufficient**: Chỉ cần School Admin hoặc System Admin duyệt trước, yêu cầu chuyển `APPROVED` và cập nhật học sinh. Người thứ hai bị từ chối với lỗi 409 Conflict.
- **Phát hiện dữ liệu cũ (Stale Detection)**: Khi Admin mở modal so sánh, hệ thống tự động đối chiếu `beforeData` với dữ liệu hiện tại của `Student`. Nếu đã bị sửa trực tiếp trước đó, cảnh báo rõ ràng cho Admin quyết định.

---

### 10. Vehicle & Parking Proposal

- **Bãi xe**: Duy nhất 1 bãi xe trung tâm do System Admin quản lý theo đúng `BUSINESS_CONTEXT.md`.
- **Phương tiện**: `seatCount` là tổng số ghế của xe (bao gồm cả tài xế), biển số xe chuẩn hóa và duy nhất toàn hệ thống.

---

### 11. Screen Inventory (Round 3 Target)

- **Web Admin**: Cài đặt (Đổi mật khẩu, Avatar, Bãi xe), Quản lý Phương tiện, Quản lý Yêu cầu (School Admin & System Admin), Sửa địa chỉ trực tiếp, Lịch sử yêu cầu học sinh.
- **Mobile**: Cá nhân (Đổi mật khẩu, Avatar, Đổi tên phụ huynh), Thao tác học sinh (3 nút), Danh sách yêu cầu học sinh, Form tạo yêu cầu, Xác thực OTP, Chi tiết yêu cầu so sánh.

---

### 12. Round 2 Implementation Plan (Database & Backend)

1. Schema & Migration (`vehicles`, `system_settings`, `student_update_requests`).
2. Module Vehicles (DTOs, Service, Controller).
3. Module System Settings (Parking Lot).
4. Mở rộng Auth Module (Change password, Avatar, Parent name).
5. Module Student Update Requests (OTP binding, Parent APIs, Admin APIs, Atomic approvals, Stale check).
6. Automated Tests (Unit, RBAC, Concurrency, Regression).
7. Đồng bộ Swagger tại `http://localhost:3000/api/docs`.

---

### 13. Round 3 Implementation Plan (Web & Mobile UI)

1. Thiết kế Wireframe-first tất cả màn hình.
2. Web Admin: Cài đặt, Phương tiện, Yêu cầu, Chi tiết học sinh.
3. Mobile: Cá nhân, Chi tiết học sinh, Danh sách & Chi tiết yêu cầu, Tạo yêu cầu & OTP.
4. Tích hợp API thực tế & Kiểm thử E2E toàn diện.

---

### 14. 14 Outstanding PO Decisions (Tóm tắt đề xuất)

1. **Một bãi xe trung tâm**: Khuyến nghị 1 bãi xe trung tâm duy nhất theo đúng `BUSINESS_CONTEXT.md`.
2. **Số lượng chỗ ngồi**: Tổng số ghế của xe (bao gồm 1 ghế tài xế).
3. **Cơ chế duyệt `ADDRESS_UPDATE`**: Một bên duyệt hợp lệ là hoàn tất (One Valid Approval Is Sufficient).
4. **Một bên từ chối**: Request kết thúc ngay lập tức ở trạng thái `REJECTED`.
5. **Nhiều Pending Request cùng loại**: Chặn tạo mới nếu đang có 1 yêu cầu cùng loại PENDING (One Pending Per Type).
6. **Student bị DISABLED khi PENDING**: Giữ nguyên PENDING, khóa nút Approve; Admin có thể Reject.
7. **School Admin sửa địa chỉ trực tiếp**: Phát hiện Stale Data và cảnh báo nổi bật cho Admin khi duyệt yêu cầu.
8. **Student data thay đổi khi chờ duyệt**: Hiển thị bảng so sánh 3 cột (Lúc gửi / Hiện tại / Đề xuất).
9. **Parent đã hủy liên kết**: Không được xem lại lịch sử yêu cầu của học sinh đó.
10. **Khóa chặt OTP**: Lưu SHA-256 hash của proposed payload vào `OtpChallenge`.
11. **SMS Provider Production**: Ghi nhận trạng thái Production Readiness là CONDITIONAL đến khi có SMS Gateway thật.
12. **Map trên Mobile**: VietMap REST API Autocomplete/Details kết hợp Static Map Preview / WebView nhẹ.
13. **Đổi mật khẩu**: Thu hồi toàn bộ session trên các thiết bị khác, duy trì session hiện tại.
14. **Dọn dẹp Avatar Cloudinary**: Bổ sung `avatarPublicId` vào `User` và xóa ảnh cũ khi upload ảnh mới.

---

### 15. Risks & Mitigation

- **Risk: Xung đột duyệt đồng thời giữa 2 Admin**: Xử lý bằng Prisma Transaction và điều kiện `status === 'PENDING'`.
- **Risk: Phụ huynh tráo đổi địa chỉ sau khi xin OTP**: Xử lý bằng cơ chế Payload Hash Binding.
- **Risk: Nhầm lẫn ghế tài xế và ghế học sinh**: Đặt nhãn rõ ràng "Tổng số chỗ ngồi (bao gồm tài xế)".

---

### 16. Approval Status

`WAITING FOR PRODUCT OWNER APPROVAL`
