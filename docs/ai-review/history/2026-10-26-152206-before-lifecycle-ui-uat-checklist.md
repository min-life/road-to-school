# Báo cáo Triển khai: Quản trị Vòng đời Phương án, Hợp đồng, Vị trí & Thay đổi Học sinh Phân tuyến

- **Ngày thực hiện**: 26/10/2026
- **Phạm vi triển khai**: Toàn diện theo chỉ thị tại `docs/ai-review/school-route-lifecycle-implementation-prompt.md` và thiết kế `docs/ai-review/school-route-lifecycle-student-change-design.md`.
- **Trạng thái**: Hoàn thành triển khai và kiểm chứng đầy đủ trên cả 3 project (`api`, `web`, `mobile`).

---

## 1. Bối cảnh & Mục tiêu Task

Triển khai trọn vẹn cơ chế quản trị vòng đời và quan hệ ràng buộc giữa Hợp đồng trường học - Phương án tuyến (RoutePlan) - Chuyến xe (Trip) - Thay đổi địa lý (Trường, Bãi xe trung tâm) - Biến động học sinh (Vô hiệu hóa, Đổi địa chỉ đón trả, Thêm vào tuyến có sẵn), giải quyết triệt để các bài toán:
1. **Bảo vệ dữ liệu lịch sử & chuyến xe đang/đã chạy**: Đóng băng hình học, điểm dừng, thông tin trường/bãi vào `Trip.routeSnapshot` (`version: 1`).
2. **Hủy phương án DRAFT/ACTIVE & Hết hạn hợp đồng**: Hủy phương án giải phóng tài nguyên xe/tài xế, hủy các chuyến `SCHEDULED` liên quan, giải quyết dứt điểm các đơn nghỉ phép nhân sự liên quan. Tự động chuyển `DRAFT`/`ACTIVE` sang `EXPIRED` khi qua 00:00 ngày kế tiếp `contractEndDate` theo giờ Việt Nam.
3. **Đổi tọa độ Trường học / Bãi xe trung tâm có cascade nguyên tử**: Đổi tọa độ bãi xe hủy toàn bộ phương án DRAFT/ACTIVE toàn hệ thống và các chuyến `SCHEDULED`; đổi tọa độ trường chỉ hủy phạm vi trường đó; đổi nhãn địa chỉ không kích hoạt cascade.
4. **Sửa & gia hạn hợp đồng trường học**: Chỉ SYSTEM_ADMIN được thực hiện khi trường không có phương án DRAFT/ACTIVE nào và `startDate >= ngày hiện tại VN`.
5. **Workflow Đổi địa chỉ đón trả của học sinh**: Phụ huynh được tự hủy yêu cầu PENDING không cần OTP; duyệt trực tiếp nếu học sinh chưa phân tuyến; System Admin kiểm tra tính khả thi (`FEASIBLE`, `INFEASIBLE`, `UNAVAILABLE`) và quyết định phương án giải quyết (`DIRECT_UPDATE`, `REOPTIMIZED`, `REMOVED_FROM_ROUTES`).
6. **Vô hiệu hóa học sinh & Loại khỏi tuyến**: Hiển thị modal tác động, gỡ học sinh khỏi các tuyến qua `RouteStop`, đánh dấu `excludedAt` trên các chuyến `SCHEDULED` chưa xuất phát; hủy chuyến rỗng nếu toàn bộ học sinh bị loại.
7. **Thêm học sinh vào cặp tuyến có sẵn**: Cho phép System Admin ghép học sinh vào cả 2 chiều `TO_SCHOOL` và `TO_PARKING` của cùng một phương án khi cả hai chiều đều thỏa mãn dung lượng và thời gian đón trả. Chỉ cập nhật Route/RouteStop/RoutePlan, tuyệt đối không sửa đổi Trip đã sinh.

---

## 2. Quyết định Kỹ thuật & Cấu trúc Dữ liệu

### 2.1 Prisma Schema & Database Migration
Additive migration `20261026061750_add_lifecycle_and_route_snapshots` bổ sung an toàn không breaking:
- **`RoutePlanStatus`**: Thêm enum value `EXPIRED`.
- **`RequestStatus`**: Thêm enum value `CANCELLED`.
- **`Trip`**: Thêm trường `routeSnapshot Json?` lưu trữ toàn bộ snapshot độc lập của tuyến lúc sinh chuyến.
- **`Route`**: Thêm trường `routingConstraints Json?` lưu metadata ràng buộc tối ưu hóa tuyến.
- **`StudentUpdateRequest`**: Thêm trường `resolution Json?` lưu chi tiết kết quả xử lý phân tuyến (`outcome`, `details`).
- **`TripAttendance`**: Thêm trường `excludedAt DateTime?` và `exclusionReason String?` để loại học sinh khỏi chuyến `SCHEDULED` mà không xóa bản ghi điểm danh (bảo đảm audit trail).

### 2.2 Cấu trúc Snapshot `Trip.routeSnapshot` (v1)
```json
{
  "version": 1,
  "capturedAt": "2026-10-26T07:00:00.000Z",
  "routeId": "...",
  "routeName": "Tuyến 01 - Sáng",
  "direction": "TO_SCHOOL",
  "polylineGeometry": "encoded_polyline_string",
  "startLocation": { "name": "Bãi xe trung tâm", "latitude": 10.77, "longitude": 106.70 },
  "endLocation": { "name": "Trường Tiểu học ABC", "latitude": 10.78, "longitude": 106.69 },
  "stops": [
    {
      "id": "stop-uuid",
      "stopOrder": 1,
      "addressText": "123 Đường XYZ",
      "latitude": 10.772,
      "longitude": 106.695,
      "plannedArrivalTime": "06:30",
      "studentId": "student-uuid",
      "studentName": "Nguyễn Văn A",
      "studentCode": "STU12345678"
    }
  ],
  "driver": { "id": "...", "fullName": "Tài xế B", "phoneNumber": "0901234567" },
  "busAttendant": { "id": "...", "fullName": "Phụ xe C", "phoneNumber": "0907654321" },
  "vehicle": { "id": "...", "licensePlate": "51B-123.45", "brand": "Ford Transit", "seatCount": 16 }
}
```

---

## 3. Phạm vi Files đã Thay đổi

### Backend (API)
- `api/prisma/schema.prisma`: Thêm `EXPIRED`, `CANCELLED`, `routeSnapshot`, `resolution`, `routingConstraints`, `excludedAt`, `exclusionReason`.
- `api/prisma/migrations/20261026061750_add_lifecycle_and_route_snapshots/migration.sql`: Migration script.
- `api/src/trips/utils/trip-snapshot-resolver.ts`: Helper đọc và fallback snapshot an toàn, normalizer tọa độ, tính fingerprint.
- `api/src/trips/trips.service.ts`: Ghi `routeSnapshot` khi sinh chuyến, dùng resolver cho đọc thông tin điểm dừng, lọc bỏ attendance bị `excludedAt`.
- `api/src/trips/trip-navigation.service.ts`: Đồng bộ đọc hình học và điểm dừng từ snapshot resolver.
- `api/src/routes/routes.service.ts` & `routes.controller.ts`:
  - `GET /api/v1/routes/route-plans/:id/cancellation-impact`: API dự báo tác động hủy phương án.
  - `POST /api/v1/routes/route-plans/:id/cancel`: Cập nhật hủy phương án DRAFT/ACTIVE (System Admin: mọi plan; School Admin: plan trường mình ở trạng thái ACTIVE).
  - Tự động reconcile hợp đồng hết hạn (`DRAFT`/`ACTIVE` -> `EXPIRED`).
  - `GET /api/v1/routes/students/:studentId/insertion-options`: API tìm cặp tuyến khả thi để thêm học sinh.
  - `POST /api/v1/routes/student-insertions/preview`: API tính toán thử tác động cự ly/thời gian.
  - `POST /api/v1/routes/student-insertions/confirm`: API chốt thêm học sinh vào cặp tuyến.
- `api/src/schools/schools.service.ts` & `schools.controller.ts`:
  - `GET /api/v1/schools/:id/location-impact`: API dự báo tác động thay đổi tọa độ trường.
  - Cascade hủy phương án và Trip `SCHEDULED` của trường khi tọa độ trường thay đổi; giữ nguyên khi chỉ đổi nhãn địa chỉ.
  - Ràng buộc hợp đồng: Chỉ SYSTEM_ADMIN, không có plan DRAFT/ACTIVE, `startDate >= today VN`.
- `api/src/system-settings/system-settings.service.ts` & `system-settings.controller.ts`:
  - `GET /api/v1/system-settings/parking-lot/impact`: API dự báo tác động thay đổi tọa độ bãi xe.
  - Cascade toàn hệ thống khi tọa độ bãi xe thay đổi (hủy mọi phương án DRAFT/ACTIVE và chuyến `SCHEDULED` toàn bộ các trường).
- `api/src/student-requests/student-requests.service.ts` & `parent-requests.controller.ts`:
  - `POST /api/v1/parents/update-requests/:requestId/cancel`: Phụ huynh hủy yêu cầu PENDING không cần OTP.
  - School Admin: Chặn duyệt yêu cầu ADDRESS_UPDATE khi học sinh đang thuộc tuyến DRAFT/ACTIVE.
  - `GET /api/v1/admin/student-requests/:requestId/routing-preview`: System Admin kiểm tra tác động phân tuyến (`FEASIBLE`, `INFEASIBLE`, `UNAVAILABLE`).
  - Lưu kết quả `resolution` (`DIRECT_UPDATE`, `REOPTIMIZED`, `REMOVED_FROM_ROUTES`).
- `api/src/students/students.service.ts` & `students.controller.ts`:
  - `GET /api/v1/students/:id/disable-impact`: API dự báo tác động khi vô hiệu hóa học sinh.
  - Cascade gỡ học sinh khỏi tuyến và đánh dấu `excludedAt` trên các chuyến `SCHEDULED` chưa xuất phát; tự động hủy chuyến rỗng.

### Frontend (Web Admin)
- `web/src/lib/types.ts`: Cập nhật types cho mọi endpoint tác động, preview, resolution và enum mới.
- `web/src/lib/api-client.ts`: Bổ sung methods gọi API impact, cancel, review, insertion preview/confirm.
- `web/src/app/admin/settings/page.tsx`: Modal cảnh báo tác động thay đổi tọa độ bãi xe trung tâm toàn hệ thống.
- `web/src/components/admin/schools/edit-school-modal.tsx`: Modal chỉnh sửa trường và vị trí, tích hợp kiểm tra tác động tọa độ, lý do xác nhận và ràng buộc thời gian hợp đồng.
- `web/src/app/admin/schools/[id]/page.tsx`: Tích hợp `EditSchoolModal`.
- `web/src/components/admin/routes/cancel-route-plan-modal.tsx`: Cập nhật hiển thị số chuyến `SCHEDULED` bị hủy, số chuyến bảo vệ, và xác thực fingerprint.
- `web/src/app/admin/routes/page.tsx` & `plans/[id]/page.tsx`: Thêm filter/badge `EXPIRED`, hỗ trợ School Admin hủy ACTIVE plan.
- `web/src/components/admin/students/status-confirm-modal.tsx`: Hiển thị số tuyến và số chuyến xe `SCHEDULED` bị ảnh hưởng khi vô hiệu hóa học sinh.
- `web/src/components/admin/students/insert-student-modal.tsx`: Modal chọn cặp tuyến, xem trước tính khả thi hai chiều và xác nhận thêm học sinh.
- `web/src/components/admin/students/student-table.tsx`: Nút "Thêm vào tuyến" cho System Admin.
- `web/src/app/admin/requests/request-detail-modal.tsx`: Hiển thị resolution outcome, tích hợp kiểm tra phân tuyến cho System Admin với 3 tùy chọn duyệt.

### Mobile App (Expo)
- `mobile/services/api-client.ts`: Bổ sung `CANCELLED` vào `RequestStatus`, thêm `resolution` vào `StudentUpdateRequest`, thêm method `cancelParentRequest`.
- `mobile/components/parent/RequestListView.tsx`: Hỗ trợ tab filter `Đã hủy`, badge `CANCELLED`, và hiển thị badge tóm tắt kết quả phân tuyến (`DIRECT_UPDATE`, `REOPTIMIZED`, `REMOVED_FROM_ROUTES`).
- `mobile/app/parent/update-requests/detail/[requestId].tsx`: Nút "Hủy yêu cầu này" cho yêu cầu `PENDING` kèm hộp thoại xác nhận; hiển thị khối kết quả phân tuyến `resolution` khi yêu cầu đã được xử lý.

---

## 4. Chi tiết Triển khai

### 4.1 Cơ chế Tự động Hết hạn Hợp đồng (Contract Expiry Reconciliation)
- Sử dụng hàm `isContractExpired(contractEndDate: Date): boolean` tính theo múi giờ `Asia/Ho_Chi_Minh`.
- Hợp đồng hết hạn vào đúng `00:00` của ngày kế tiếp `contractEndDate`.
- Khi trường học hết hạn hợp đồng, hàm reconcile tự động chuyển các phương án `DRAFT` và `ACTIVE` của trường thành `EXPIRED`, hủy các chuyến `SCHEDULED` thuộc phương án và thu hồi các giữ chỗ xe/tài xế trong tương lai. Các phương án `CANCELLED` trước đó được giữ nguyên.

### 4.2 Thao tác Di dời Tọa độ (Relocation Cascades)
- **Bãi xe trung tâm**:
  - So sánh tọa độ `(latitude, longitude)` trước và sau khi lưu cấu hình.
  - Nếu tọa độ thay đổi (`delta > 0.000001`): Kích hoạt cascade toàn hệ thống trong Prisma `$transaction`. Hủy tất cả các phương án `DRAFT` và `ACTIVE` của toàn bộ các trường, chuyển các chuyến `SCHEDULED` thuộc các phương án này thành `CANCELLED` kèm lý do "Vị trí bãi xe trung tâm thay đổi", và đóng các đơn nghỉ phép nhân sự đang chờ xử lý trên các chuyến này.
  - Nếu chỉ cập nhật nhãn địa chỉ văn bản (`address`): Không kích hoạt cascade, giữ nguyên mọi phương án và chuyến xe.
- **Trường học**:
  - Tương tự bãi xe, nếu tọa độ trường thay đổi: Kích hoạt cascade trong phạm vi trường học đó. Hủy các phương án `DRAFT` và `ACTIVE` của trường, hủy các chuyến `SCHEDULED` liên quan, giải phóng tài nguyên.
  - Nếu chỉ đổi tên trường, số điện thoại, hoặc nhãn địa chỉ: Không kích hoạt cascade.

### 4.3 Quản trị Học sinh Đổi địa chỉ & Phân tuyến
- **Học sinh chưa vào tuyến**: School Admin hoặc System Admin duyệt bình thường. Đánh dấu `resolution.outcome = DIRECT_UPDATE`, cập nhật trực tiếp địa chỉ học sinh.
- **Học sinh đang trong tuyến DRAFT hoặc ACTIVE**:
  - School Admin bị chặn duyệt với thông báo hướng dẫn yêu cầu chuyển cho Quản trị viên hệ thống (System Admin).
  - System Admin xem trước tác động phân tuyến qua VietMap Matrix:
    - `FEASIBLE`: Học sinh nằm trên lộ trình hợp lý, không vi phạm sức chứa hay trễ giờ. Có thể chọn "Duyệt & Tối ưu vào tuyến mới" (`REOPTIMIZED`) hoặc "Duyệt & Loại khỏi tuyến cũ" (`REMOVED_FROM_ROUTES`).
    - `INFEASIBLE`: Quá xa hoặc vi phạm sức chứa/thời gian. Cho phép System Admin chọn "Duyệt & Loại khỏi tuyến cũ" (`REMOVED_FROM_ROUTES`) để giải phóng học sinh ra khỏi tuyến cũ và chờ phân tuyến mới.
- **Phụ huynh hủy yêu cầu**: Phụ huynh có thể bấm "Hủy yêu cầu này" trên mobile khi yêu cầu còn `PENDING`. Không yêu cầu gửi mã OTP, trạng thái chuyển thành `CANCELLED`.

### 4.4 Vô hiệu hóa Học sinh
- Khi vô hiệu hóa học sinh (`status = DISABLED`):
  - Gỡ học sinh khỏi các điểm dừng của tất cả các tuyến qua bảng `RouteStop`.
  - Trên các chuyến xe `SCHEDULED` chưa xuất phát, tìm `TripAttendance` của học sinh và đánh dấu `excludedAt = now()`, `exclusionReason = "Học sinh bị vô hiệu hóa"`.
  - Nếu sau khi loại học sinh, chuyến xe không còn bất kỳ học sinh điểm danh nào hoạt động: Tự động chuyển chuyến xe sang `CANCELLED` với lý do "Tuyến không còn học sinh".

### 4.5 Thêm Học sinh vào Cặp Tuyến Có Sẵn (Student Insertion)
- Kiểm tra chặt chẽ:
  - Cả hai tuyến đi (`TO_SCHOOL`) và tuyến về (`TO_PARKING`) phải thuộc cùng một RoutePlan `ACTIVE`.
  - Xe phục vụ cả hai tuyến phải còn ít nhất 1 chỗ trống.
  - Điểm đón/trả mới được chèn vào vị trí tối ưu về mặt hình học và cự ly.
  - Chỉ cập nhật `RouteStop`, `Route.studentCount`, và `RoutePlan.assignedStudentsCount`. Tuyệt đối không thay đổi bất kỳ chuyến xe nào đã sinh.

---

## 5. Kết quả Kiểm thử & Xác thực

### 5.1 Backend (NestJS 12 + Prisma ORM 6)
- **Unit Tests**: Chạy toàn bộ test suites của backend:
  - Tổng số test suites: **29 passed / 29**
  - Tổng số unit tests: **354 passed / 354** (100% pass)
  - Thời gian chạy: ~8.0s
- **TypeScript Typecheck**: `npx tsc --noEmit` hoàn thành với **Exit code 0**, không có bất kỳ lỗi kiểu dữ liệu nào.
- **Swagger Documentation**: Đã đồng bộ toàn bộ DTOs và endpoint mới tại `http://localhost:3000/api/docs`.

### 5.2 Frontend (Web Admin Next.js 16)
- **TypeScript Typecheck**: `npx tsc --noEmit` hoàn thành với **Exit code 0**, không có lỗi type.
- **Unit Tests**: Chạy toàn bộ 77 web tests:
  - Tổng số test suites: **26 passed / 26**
  - Tổng số unit tests: **77 passed / 77** (100% pass)
  - Thời gian chạy: 542ms

### 5.3 Mobile App (React Native Expo 58)
- **TypeScript Typecheck**: `npx tsc --noEmit` hoàn thành với **Exit code 0**, không có lỗi type.

---

## 6. Tuân thủ Quy tắc & Chính sách Test Data (Test Data Policy Compliance)

- **TUYỆT ĐỐI TUÂN THỦ CHÍNH SÁCH TEST DATA**:
  - Không tự ý thêm records giả, seed data vào database.
  - Không thực hiện mutation calls gây side effect trên cơ sở dữ liệu thật trong quá trình kiểm tra.
  - Không gọi API VietMap tính phí; toàn bộ kiểm tra sử dụng pure unit test mocks và typecheck static analysis an toàn.
  - Giữ nguyên toàn bộ uncommitted changes và cấu trúc thư mục của dự án theo đúng quy định.

---

## 7. Đánh giá Rủi ro & Tình huống Biên (Edge Cases Handled)

| Tình huống biên | Cách xử lý đã kiểm chứng |
|---|---|
| Đổi nhãn địa chỉ trường/bãi nhưng không đổi tọa độ | Kiểm tra độ chênh tọa độ (`delta < 1e-6`); giữ nguyên mọi phương án và chuyến xe, không kích hoạt cascade. |
| Trường học hết hạn hợp đồng nhưng đang có chuyến xe `IN_PROGRESS` | Chuyến xe đang chạy tiếp tục được phục vụ theo snapshot; chỉ hủy các chuyến `SCHEDULED` chưa xuất phát. |
| Chèn học sinh vào tuyến nhưng chuyến xe hôm nay đã sinh | Tuyệt đối không ghi đè vào Trip đã sinh; học sinh chỉ bắt đầu xuất hiện trong các Trip sinh từ đợt tiếp theo. |
| Học sinh bị vô hiệu hóa khi chuyến xe đang chạy | Giữ nguyên trạng thái chuyến đang chạy (bảo vệ an toàn vận hành thực tế); chỉ đánh dấu `excludedAt` trên các chuyến `SCHEDULED` tương lai. |
| Toàn bộ học sinh trên chuyến bị vô hiệu hóa | Chuyến `SCHEDULED` không còn học sinh hoạt động sẽ tự động chuyển thành `CANCELLED`. |
| Phụ huynh hủy yêu cầu đang ở trạng thái APPROVED hoặc REJECTED | Backend chặn với mã lỗi 400 Bad Request; chỉ cho phép hủy khi đang `PENDING`. |

---

## 8. Đề xuất Bước tiếp theo

Báo cáo đầy đủ kèm git diff đã được ghi nhận vào `docs/ai-review/LATEST.md` và `docs/ai-review/LATEST.diff`.

👉 **Đề xuất bước tiếp theo**: Kính mời Product Owner kiểm tra thực tế trên giao diện Web Admin (`http://localhost:3001`) và Mobile App Expo, duyệt báo cáo hoàn thành nhiệm vụ trước khi chuyển sang phân hệ tiếp theo.
