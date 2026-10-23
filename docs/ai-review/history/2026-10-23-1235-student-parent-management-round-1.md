# RoadToSchool — AI Review Report
# Phân hệ: Quản lý Học sinh, Giáo viên (Bus Attendant), Tài xế & Liên kết Phụ huynh
# Task: Round 1/3 — Business Analysis & Master Implementation Plan

> **Thời gian báo cáo**: 23/10/2026 12:35  
> **Người thực hiện**: Senior Software Architect, Business Analyst & Technical Lead  
> **Trạng thái**: Hoàn thành Phân tích & Kế hoạch Tổng thể Round 1 — Chờ Product Owner xét duyệt  
> **Kế hoạch chi tiết**: [docs/architecture/student-parent-management-plan.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/architecture/student-parent-management-plan.md)  
> **Diff Task-scoped**: [docs/ai-review/LATEST.diff](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.diff)

---

## 1. Files Read & Context Baseline
- [docs/BUSINESS_CONTEXT.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/BUSINESS_CONTEXT.md): Đọc và đối chiếu mục 3 (Actors & Responsibilities), mục 4 (Business Domains: Student Management, Bus Attendant, Driver, Parent-Student Linking).
- [docs/WORKING_RULES.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/WORKING_RULES.md): Tuân thủ nghiêm ngặt quy trình Planning Mode, không tự ý viết code khi chưa duyệt, lưu AI Review và Stop-After-Task.
- [docs/architecture/auth-technical-design.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/architecture/auth-technical-design.md) & [school-management-design.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/architecture/school-management-design.md): Tái sử dụng cơ chế JWT HttpOnly, OTP challenge, RBAC Guards, Cloudinary upload stream và Single Address Input UX với VietMap.
- [api/prisma/schema.prisma](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/prisma/schema.prisma): Kiểm tra cấu trúc hiện tại của `User`, `Role`, `School`, `OtpChallenge`, `Session`.
- `mobile/package.json` & `mobile/app/(tabs)/`: Kiểm tra hệ thống định tuyến Expo Router, Theme tokens và thư viện có sẵn.

---

## 2. Existing Architecture & Reusability
- **User & Roles**: Đã có sẵn 5 Roles trong Prisma (`SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `DRIVER`, `BUS_ATTENDANT`, `PARENT`). Trường `User.schoolId` đã được liên kết với `School`.
- **OTP Service**: `OtpService` đã có sẵn logic sinh mã ngẫu nhiên an toàn, mã hóa SHA-256, kiểm tra thời gian hết hạn (TTL 300s), rate-limiting và console delivery cho development.
- **Cloudinary Service**: `CloudinaryService` đã hoàn chỉnh cho upload ảnh buffer (giới hạn 5MB, magic bytes validation) -> Tái sử dụng cho ảnh đại diện học sinh.
- **VietMap Integration**: Đã có sẵn Map Picker và Single Address Input UX -> Tái sử dụng trọn vẹn cho Modal Thêm học sinh.

---

## 3. Confirmed Business Rules
1. **Teacher = BUS_ATTENDANT**: UI dùng nhãn "Giáo viên", Database & Backend dùng vai trò nội bộ `BUS_ATTENDANT`. Tuyệt đối không tạo `Role.TEACHER` hay bảng `teachers`.
2. **StudentStatus persisted Enum**: Lưu trong Database với đúng 2 giá trị chính thức `AVAILABLE` và `DISABLED`. Mặc định khi tạo mới là `AVAILABLE`. Không chứa các trạng thái địa chỉ.
3. **Tình trạng địa chỉ là trạng thái dẫn xuất (Derived State)**: Suy ra từ 3 trường `addressText`, `latitude`, `longitude`. `hasAddress = true` khi cả 3 có giá trị; `false` khi cả 3 là null. Không lưu cột `hasAddress` trong DB.
4. **Hai bộ lọc độc lập trên Danh sách học sinh**: Bộ lọc 1 (Trạng thái học sinh `status`) và Bộ lọc 2 (Tình trạng địa chỉ `hasAddress`). Hai bộ lọc kết hợp được với nhau và bắt buộc thực thi ở tầng Database trước khi phân trang (Server-side filtering).
5. **Mã học sinh duy nhất & QR Code**: `code` tự sinh ngẫu nhiên an toàn, duy nhất toàn hệ thống (`@unique`). QR Code chứa chuỗi `code` thuần túy, sinh động phía Client, không lưu ảnh tĩnh vào Cloudinary hay Database.
6. **Liên kết Phụ huynh - Học sinh qua Mã/QR + OTP**: Quét QR / nhập Code -> Gửi OTP đến `guardianPhone` của học sinh -> Nhập OTP xác thực -> Tạo bản ghi `ParentStudentLink`.
7. **Hủy liên kết**: Hỗ trợ 2 đường dẫn (Swipe-to-Unlink trên thẻ và nút Hủy trong màn hình Chi tiết học sinh), cùng gọi một API `DELETE`.

---

## 4. Minimal Database Proposal (Cho Round 2)
```prisma
enum StudentStatus {
  AVAILABLE
  DISABLED
}

// Mở rộng OtpPurpose
enum OtpPurpose {
  PARENT_REGISTRATION
  PASSWORD_RESET
  PARENT_STUDENT_LINKING
}

model Student {
  id              String         @id @default(uuid())
  code            String         @unique
  schoolId        String         @map("school_id")
  fullName        String         @map("full_name")
  guardianPhone   String         @map("guardian_phone")
  avatarUrl       String?        @map("avatar_url")
  avatarPublicId  String?        @map("avatar_public_id")
  addressText     String?        @map("address_text")
  latitude        Float?
  longitude       Float?
  status          StudentStatus  @default(AVAILABLE)
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  school          School         @relation(fields: [schoolId], references: [id], onDelete: Restrict)
  parentLinks     ParentStudentLink[]

  @@index([schoolId])
  @@index([status])
  @@map("students")
}

model ParentStudentLink {
  id         String    @id @default(uuid())
  parentId   String    @map("parent_id")
  studentId  String    @map("student_id")
  linkedAt   DateTime  @default(now()) @map("linked_at")

  parent     User      @relation(fields: [parentId], references: [id], onDelete: Cascade)
  student    Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([parentId, studentId])
  @@index([parentId])
  @@index([studentId])
  @@map("parent_student_links")
}
```

---

## 5. API Matrix (15 APIs cho Round 2)
1. `GET /api/v1/schools/:schoolId/students`: Danh sách học sinh kèm search, lọc kép `status` & `hasAddress`, phân trang (School Admin & System Admin).
2. `POST /api/v1/schools/:schoolId/students`: Tạo học sinh mới kèm avatar tùy chọn (Chỉ School Admin, System Admin trả về 403).
3. `GET /api/v1/schools/:schoolId/students/:id`: Chi tiết học sinh kèm QR data.
4. `PATCH /api/v1/schools/:schoolId/students/:id/status`: Bật/tắt trạng thái `AVAILABLE`/`DISABLED`.
5. `GET /api/v1/schools/:schoolId/bus-attendants`: Danh sách Giáo viên (`role = BUS_ATTENDANT`).
6. `POST /api/v1/schools/:schoolId/bus-attendants`: Tạo tài khoản Giáo viên mới.
7. `GET /api/v1/schools/:schoolId/bus-attendants/:id`: Chi tiết Giáo viên.
8. `GET /api/v1/drivers`: Danh sách Tài xế toàn hệ thống do Nhà xe quản lý (Chỉ System Admin).
9. `POST /api/v1/drivers`: Tạo tài khoản Tài xế mới (Chỉ System Admin).
10. `GET /api/v1/drivers/:id`: Chi tiết Tài xế (Chỉ System Admin).
11. `GET /api/v1/parents/students`: Danh sách học sinh đã liên kết của Phụ huynh hiện tại.
12. `GET /api/v1/parents/students/:id`: Chi tiết học sinh đã liên kết của Phụ huynh.
13. `POST /api/v1/parents/link-requests`: Khởi tạo yêu cầu liên kết qua Student Code, gửi OTP đến `guardianPhone`.
14. `POST /api/v1/parents/verify-link`: Xác thực mã OTP và hoàn tất liên kết phụ huynh.
15. `DELETE /api/v1/parents/students/:id`: Hủy liên kết phụ huynh với học sinh.

---

## 6. Role & Permission Matrix
- **SYSTEM_ADMIN**: Quản lý toàn diện Tài xế (list/create/detail). Xem danh sách và chi tiết học sinh của từng trường học tại Tab "Học sinh" (Read-only, cấm tạo học sinh).
- **SCHOOL_ADMIN**: Toàn quyền quản lý Học sinh và Giáo viên (`BUS_ATTENDANT`) trực thuộc trường mình (List, Search, 2 Bộ lọc, Create, Detail, QR). Tuyệt đối không can thiệp trường khác.
- **PARENT**: Xem danh sách con em đã liên kết tại Tab "Theo dõi" trên Mobile, khởi tạo liên kết qua Mã/QR + OTP, hủy liên kết (Swipe-to-Unlink & Detail Unlink).
- **DRIVER & BUS_ATTENDANT**: Giao diện Mobile 3 Tabs chuẩn (Trang chủ, Lịch, Cá nhân).

---

## 7. Master Implementation Plan

### Round 2 Plan (Database & Backend Implementation):
- Thực hiện trọn gói toàn bộ Database Schema, Prisma Migration, 15 Backend APIs, DTO Validation, Swagger Decorators và Unit/Integration Tests trong 1 đợt duy nhất.
- Đạt 100% Quality Gates: Vitest Suite PASS, Swagger đồng bộ, Migration Up-to-date.

### Round 3 Plan (Web & Mobile UI Implementation):
- Triển khai trọn gói giao diện Web (School Admin, System Admin) và Mobile App (Parent, Driver, Bus Attendant).
- Tích hợp QR generation/scanner, OTP dialog, 2 bộ lọc độc lập, VietMap Map Picker và kiểm thử E2E liên kết hoàn chỉnh.

---

## 8. Open Decisions for PO Approval
1. **API đổi trạng thái Student (`AVAILABLE`/`DISABLED`)**: Khuyến nghị triển khai `PATCH /schools/:schoolId/students/:id/status` cho School Admin.
2. **Chính sách học sinh `DISABLED` khi liên kết mới**: Khuyến nghị chặn (`400 Bad Request: "Học sinh hiện đang bị vô hiệu hóa"`).
3. **Phụ huynh cũ khi học sinh bị `DISABLED`**: Khuyến nghị giữ liên kết kèm huy hiệu cảnh báo trên Mobile.
4. **Trường ngừng hoạt động (`isActive = false`)**: Khuyến nghị chặn tạo mới Học sinh và Giáo viên.
5. **Đổi số điện thoại giám hộ**: Khuyến nghị giữ nguyên các liên kết cũ, số mới chỉ áp dụng cho lượt liên kết phát sinh sau.
6. **SMS OTP Provider**: Khuyến nghị duy trì `AUTH_SMS_MODE=console` cho Development, sẵn sàng interface adapter cho Production.
7. **Định dạng QR Payload**: Khuyến nghị dùng chuỗi Student Code thuần túy (`STUxxxxxx`) để quét nhanh và an toàn.

---

## 9. Final Approval Gate & Stop Rule
- **Trạng thái**: `WAITING FOR PRODUCT OWNER APPROVAL`.
- **Quy tắc dừng**: Toàn bộ nội dung phân tích nghiệp vụ và kế hoạch tổng thể đã hoàn tất. Kỹ sư phụ trách **DỪNG LẠI**, không tự ý viết code, không tạo Migration hay can thiệp vào mã nguồn trước khi có sự phê duyệt chính thức từ Product Owner.
