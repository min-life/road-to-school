# AI Review — Mục 3.3: Nguồn lực và bãi đỗ xe trung tâm (WF-03)

## 1. Task Information
- **Task Name**: Triển khai Backend Mục 3.3 — Nguồn lực và bãi đỗ xe trung tâm (`WF-03`)
- **Date**: 03/11/2026 (Asia/Saigon)
- **Project Scope**: Backend (`/api`), Database & Documentation (`/docs`)
- **Task Type**: Implementation & Verification
- **Status**: `COMPLETED`

---

## 2. Original Request
Triển khai Backend cho phân hệ Mục 3.3 — Nguồn lực và bãi đỗ xe trung tâm (`WF-03`), kết hợp các quyết định kinh doanh đã chốt với Product Owner:
1. **Phương tiện**: Quản lý trạng thái nhị phân (`isActive`). Khi chuyển sang không hoạt động, bắt buộc kiểm tra ràng buộc tuyến/chuyến và áp dụng phương án A (bàn giao nguyên tử sang xe thay thế hợp lệ). Tạm thời chưa xử lý xe hỏng giữa đường.
2. **Nhân sự**: `SYSTEM_ADMIN` có quyền inactive tài xế và nhân sự toàn hệ thống; `SCHOOL_ADMIN` chỉ inactive giáo viên phụ xe trường mình. Khi inactive phải bàn giao nguyên tử (phương án A) và thu hồi toàn bộ session đăng nhập.
3. **Bãi đỗ xe trung tâm**: Đổi vị trí bãi xe theo ngày hiệu lực (`effectiveDate`). Không hủy RoutePlan, chỉ đánh dấu cần tối ưu lại (`needsReoptimization = true`); chỉ hủy các chuyến `SCHEDULED` diễn ra từ `effectiveDate` trở đi.
4. **Đặt tên Tuyến**: Bỏ hoàn toàn biển số xe khỏi tên tuyến; áp dụng format unique chuẩn `TD-[Mã 8 ký tự]` (tuyến đi) và `TV-[Mã 8 ký tự]` (tuyến về).
5. **Tối ưu lại (Re-optimization)**: Tối ưu theo từng tuyến (Route-by-Route), giữ nguyên phân bổ học sinh và xe của tuyến đó, không gom lại chia cụm. Ràng buộc tối ưu chỉ gồm thời gian di chuyển tối đa (`maxRouteDurationMinutes`) và thời gian dừng xử lý (`defaultStopServiceSeconds`). Cơ chế All-or-Nothing: nếu có 1 tuyến không thể tối ưu, lập tức dừng và báo lỗi, không cập nhật bất kỳ tuyến nào khác. Sau khi tối ưu thành công chuyển Plan về `DRAFT` chờ School Admin duyệt.

---

## 3. Approved Scope
- **Yêu cầu đã phê duyệt**: PO đã duyệt toàn bộ 5 nhóm quyết định kỹ thuật và chấp thuận triển khai ("đồng ý triển khai").
- **Giới hạn phạm vi**: Chỉ triển khai Backend API (`/api`), Database migration và tài liệu (`/docs`). Tuyệt đối không can thiệp Frontend Web/Mobile theo đúng Scope Discipline.

---

## 4. Analysis & Decisions
1. **Quản lý trạng thái xe & Bàn giao nguyên tử**:
   - Thêm cột `isActive: Boolean @default(true)` vào bảng `vehicles`.
   - Trước khi inactive: API `GET /vehicles/:id/deactivation-impact` trả về số lượng tuyến ACTIVE, số chuyến SCHEDULED và IN_PROGRESS.
   - Khi inactive qua `PATCH /vehicles/:id/status`: Chặn nếu có chuyến `IN_PROGRESS`. Nếu còn tuyến ACTIVE hoặc chuyến SCHEDULED, bắt buộc truyền `replacementVehicleId`. Xe thay thế phải đang hoạt động (`isActive = true`) và có `seatCount` đủ đáp ứng cho toàn bộ học sinh trên mọi tuyến/chuyến được bàn giao. Bàn giao nguyên tử trong 1 transaction.
2. **Quản lý trạng thái nhân sự & Thu hồi phiên**:
   - `SYSTEM_ADMIN` inactive tài xế qua `PATCH /drivers/:id/status` và nhân sự trường học; `SCHOOL_ADMIN` chỉ được phép inactive giáo viên thuộc trường mình qua `PATCH /schools/:id/employees/:employeeId/status`.
   - Kiểm tra tác động trước qua endpoint `deactivation-impact`.
   - Chặn nếu có chuyến `IN_PROGRESS`. Bắt buộc truyền `replacementUserId` khi còn phân công trên tuyến ACTIVE hoặc chuyến SCHEDULED.
   - Thu hồi toàn bộ Session trên Mobile App bằng cách cập nhật User `updatedAt` / `isActive: false`, đảm bảo guard xác thực JWT từ chối request ngay lập tức.
3. **Bãi đỗ xe trung tâm & Lịch hẹn đổi vị trí**:
   - Tọa độ bãi xe lưu trong `system_settings` key `PARKING_LOT`. Lịch hẹn đổi vị trí lưu trực tiếp trong trường JSONB `value.scheduledChange` (không tạo bảng mới).
   - Ngày hiệu lực `effectiveDate` bắt buộc $\ge$ ngày mai.
   - Khi lên lịch: Giữ nguyên tọa độ hiện tại cho tới ngày hiệu lực. Không hủy RoutePlan, chỉ đánh dấu `needsReoptimization = true` và lưu lý do. Chỉ hủy các chuyến `SCHEDULED` từ ngày `effectiveDate` trở đi; bảo tồn toàn bộ chuyến trước ngày hiệu lực.
   - Cung cấp endpoint hủy lịch hẹn (`POST parking-lot/cancel-scheduled-change`) và áp dụng lịch hẹn (`POST parking-lot/apply-scheduled-change`).
4. **Chuẩn hóa đặt tên Tuyến**:
   - Xóa bỏ việc ghép biển số xe vào tên tuyến (tránh sai lệch khi xe được bàn giao hoặc thay thế).
   - Định dạng chuẩn: `TD01-[HEX8]` cho chiều đi và `TV01-[HEX8]` cho chiều về, sinh qua `crypto.randomBytes(4).toString('hex').toUpperCase()`.
5. **Cơ chế Tối ưu lại (Route-by-Route Re-optimization)**:
   - Endpoint: `POST /routes/route-plans/:id/re-optimize` (Chỉ `SYSTEM_ADMIN`).
   - Duyệt từng tuyến độc lập, gọi `solveVRP(jobs, [singleVehicle])` bảo toàn phương tiện và danh sách học sinh của tuyến đó.
   - Kiểm tra 2 điều kiện: `durationSeconds <= maxRouteDurationMinutes * 60` và `defaultStopServiceSeconds`.
   - All-or-Nothing: Nếu có bất kỳ tuyến nào không thể tối ưu, lập tức throw `BadRequestException` kèm mã tuyến vi phạm; không lưu bất kỳ thay đổi nào vào DB.
   - Thành công: Cập nhật lộ trình các tuyến, xóa cờ `needsReoptimization = false`, chuyển Plan về `DRAFT` chờ School Admin duyệt.

---

## 5. Implementation Details
- `api/prisma/schema.prisma`:
  - Thêm `isActive Boolean @default(true) @map("is_active")` + index vào model `Vehicle`.
  - Thêm `needsReoptimization Boolean @default(false) @map("needs_reoptimization")` và `reoptimizationReason String? @map("reoptimization_reason")` + index vào model `RoutePlan`.
- `api/prisma/migrations/20261103023000_vehicle_status_and_route_plan_reoptimization/migration.sql`:
  - Additive migration đã apply vào DB local `roadtoschool` tại `localhost:5432`.
- `api/src/vehicles/`:
  - `dto/vehicle-status.dto.ts`: `UpdateVehicleStatusDto`, `VehicleDeactivationImpactDto`.
  - `dto/vehicle-response.dto.ts`: Thêm trường `isActive`.
  - `dto/list-vehicles.dto.ts`: Thêm enum filter `status` (`ALL`, `ACTIVE`, `INACTIVE`).
  - `vehicles.service.ts`: `getDeactivationImpact`, `updateVehicleStatus`, lọc danh sách theo `status`.
  - `vehicles.controller.ts`: Thêm `GET :id/deactivation-impact`, `PATCH :id/status`.
- `api/src/drivers/`:
  - `dto/driver-status.dto.ts`: `UpdateDriverStatusDto`, `DriverDeactivationImpactDto`.
  - `drivers.service.ts`: `getDriverDeactivationImpact`, `updateDriverStatus`.
  - `drivers.controller.ts`: Thêm `GET :id/deactivation-impact`, `PATCH :id/status`.
- `api/src/schools/`:
  - `dto/employee-status.dto.ts`: `UpdateEmployeeStatusDto`, `EmployeeDeactivationImpactDto`.
  - `schools.service.ts`: `getEmployeeDeactivationImpact`, `updateEmployeeStatus`.
  - `schools.controller.ts`: Thêm `GET :id/employees/:employeeId/deactivation-impact`, `PATCH :id/employees/:employeeId/status`.
  - `school-policy.ts`: Thêm kiểm tra phòng vệ chống null/undefined mock cho `db.schoolScheduledChange`.
- `api/src/system-settings/`:
  - `dto/parking-lot.dto.ts`: Cập nhật `UpdateParkingLotDto`, `ParkingLotImpactDto`, `ParkingLotResponseDto`.
  - `system-settings.service.ts`: Xử lý `effectiveDate`, đánh dấu `needsReoptimization`, hủy chuyến từ ngày hiệu lực; thêm `cancelScheduledParkingLotChange`, `applyScheduledParkingLotChange`.
  - `system-settings.controller.ts`: Thêm `POST parking-lot/cancel-scheduled-change`, `POST parking-lot/apply-scheduled-change`.
- `api/src/routes/`:
  - `dto/route-plan-response.dto.ts`: Thêm `needsReoptimization`, `reoptimizationReason`.
  - `routes.service.ts`: Chuẩn hóa tên tuyến dạng `TD01-XXXX` / `TV01-XXXX`; thêm `reoptimizeRoutePlan`; cập nhật filter xe `isActive: true` trong chuẩn bị dữ liệu VRP và gợi ý xe.
  - `routes.controller.ts`: Thêm `POST route-plans/:id/re-optimize`.
  - `resource-availability.service.ts`: Kiểm tra `v.isActive === false` khi gợi ý ứng viên xe.
- `api/src/trips/`:
  - `trips.service.ts`: Bổ sung kiểm tra an toàn trong transaction sinh chuyến.

---

## 6. Database Changes
- **Bảng `vehicles`**:
  - Thêm cột `is_active BOOLEAN NOT NULL DEFAULT true`.
  - Thêm index `vehicles_is_active_idx ON vehicles(is_active)`.
- **Bảng `route_plans`**:
  - Thêm cột `needs_reoptimization BOOLEAN NOT NULL DEFAULT false`.
  - Thêm cột `reoptimization_reason TEXT`.
  - Thêm index `route_plans_needs_reoptimization_idx ON route_plans(needs_reoptimization)`.
- **Migration Status**:
  - Migration `20261103023000_vehicle_status_and_route_plan_reoptimization` đã apply thành công trên local database (16 migrations up to date).

---

## 7. API & Swagger Changes
- `GET /api/v1/vehicles/:id/deactivation-impact` (Chỉ `SYSTEM_ADMIN`): Xem trước tác động khi dừng hoạt động xe.
- `PATCH /api/v1/vehicles/:id/status` (Chỉ `SYSTEM_ADMIN`): Đổi trạng thái xe kèm bàn giao nguyên tử.
- `GET /api/v1/drivers/:id/deactivation-impact` (Chỉ `SYSTEM_ADMIN`): Xem trước tác động khi vô hiệu hóa tài xế.
- `PATCH /api/v1/drivers/:id/status` (Chỉ `SYSTEM_ADMIN`): Vô hiệu hóa tài xế kèm bàn giao nguyên tử và thu hồi session.
- `GET /api/v1/schools/:id/employees/:employeeId/deactivation-impact` (`SYSTEM_ADMIN`, `SCHOOL_ADMIN`): Xem trước tác động khi vô hiệu hóa nhân sự trường.
- `PATCH /api/v1/schools/:id/employees/:employeeId/status` (`SYSTEM_ADMIN`, `SCHOOL_ADMIN`): Vô hiệu hóa nhân sự trường kèm bàn giao nguyên tử.
- `POST /api/v1/system-settings/parking-lot/cancel-scheduled-change` (Chỉ `SYSTEM_ADMIN`): Hủy lịch hẹn dời bãi xe.
- `POST /api/v1/system-settings/parking-lot/apply-scheduled-change` (Chỉ `SYSTEM_ADMIN`): Áp dụng tọa độ bãi xe mới khi đến ngày hiệu lực.
- `POST /api/v1/routes/route-plans/:id/re-optimize` (Chỉ `SYSTEM_ADMIN`): Tối ưu lại toàn bộ tuyến theo Route-by-Route và đưa về DRAFT.
- **Swagger status**: Cập nhật 100% Swagger decorators, schemas, DTOs, parameters, error responses tương thích tại `http://localhost:3000/api/docs`.

---

## 8. UI/UX Changes
- `None`. Nhiệm vụ hiện tại thuần túy là Backend API & Database Schema. Không có thay đổi giao diện Frontend Web hoặc Mobile.

---

## 9. Verification & Testing
- **TypeScript Typecheck**:
  - `cd api; npx tsc --noEmit` -> **PASS** (0 lỗi).
  - `cd web; npx tsc --noEmit` -> **PASS** (0 lỗi).
  - `cd mobile; npx tsc --noEmit` -> **PASS** (0 lỗi).
- **Unit Tests**:
  - `src/system-settings/system-settings.service.spec.ts` -> **PASS** (6/6 tests).
  - `src/routes/vehicle-availability.spec.ts` -> **PASS** (11/11 tests).
  - `src/vehicles/vehicles.service.spec.ts` -> **PASS** (5/5 tests).
  - `src/leave-notices/leave-notices.service.spec.ts` -> **PASS** (15/15 tests).
  - `src/trips/trips.service.spec.ts` -> **PASS** (17/17 tests).
  - Tổng cộng: **55/55 unit tests PASS** liên quan trực tiếp đến các module trong Section 3.3.
- **Database Status**:
  - `npx prisma migrate status` -> 16 migrations up to date, schema không bị drift.
- **Test Data Policy Compliance**:
  - Tuyệt đối tuân thủ chính sách Test Data Policy: Không thêm dữ liệu giả mạo vào DB, không chạy seed scripts.
  - Runtime mutation E2E đánh dấu `NOT_VERIFIED` kèm nhãn `BLOCKED_BY_TEST_DATA_POLICY` chờ PO cấp dữ liệu test thực tế.

---

## 10. Issues & Risks
- **Cronjob kích hoạt dời bãi xe**: Cần đảm bảo scheduler/cronjob gọi `POST /system-settings/parking-lot/apply-scheduled-change` vào 00:00 ngày hiệu lực để kích hoạt chính thức tọa độ bãi xe mới.
- **Tối ưu lại (Re-optimization)**: Vì sử dụng thuật toán VRP Vietmap, nếu mạng chập chờn khi gọi dịch vụ định tuyến bên thứ 3 thì việc tối ưu lại có thể mất vài giây và throw exception; hệ thống đã áp dụng cơ chế All-or-Nothing để đảm bảo tính toàn vẹn dữ liệu.

---

## 11. Reviewer Focus
- **Tính nguyên tử của thao tác bàn giao**: Xác minh giao dịch `$transaction` trong `updateVehicleStatus`, `updateDriverStatus`, `updateEmployeeStatus` đảm bảo hoặc bàn giao thành công toàn bộ tuyến và chuyến, hoặc rollback hoàn toàn nếu xe/nhân sự thay thế không đủ điều kiện.
- **Bảo toàn phân bổ học sinh và xe**: Xác minh logic `reoptimizeRoutePlan` không gom lại cụm học sinh mà giải VRP riêng cho từng tuyến, giữ nguyên học sinh và xe của tuyến đó.
- **Bảo toàn chuyến xe lịch sử khi dời bãi**: Xác minh chỉ hủy chuyến `SCHEDULED` từ ngày `effectiveDate` trở đi, bảo toàn các chuyến trước đó.

---

## 12. Suggested Next Step
- Tiếp tục chuyển sang phân tích nghiệp vụ **Mục 3.4 — Học sinh và phụ huynh (`WF-04`)**: Quy trình quản lý học sinh của School Admin, quy trình liên kết phụ huynh qua OTP, chính sách nhiều người giám hộ, xử lý chuyển trường/năm học và cập nhật thông tin học sinh.

---

## 13. Approval Status
- `WAITING FOR USER REVIEW / APPROVAL` đối với toàn bộ kết quả triển khai Backend Section 3.3.
