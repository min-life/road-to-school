# Đối chiếu FE Integration Guide với code API

Ngày kiểm tra: **05/11/2026**. Phạm vi: các điểm lệch đã xác nhận khi tích hợp Web sau đợt cập nhật API. Đây là bản đối chiếu source, không phải kết quả kiểm thử API đang chạy và không phải kiểm toán toàn bộ tài liệu.

## 1. Nguyên tắc sử dụng

- [FE_INTEGRATION_GUIDE.md](../FE_INTEGRATION_GUIDE.md) dùng để hiểu mục đích và luồng nghiệp vụ.
- Controller xác định endpoint và quyền; DTO/schema xác định cấu trúc, enum; service xác định điều kiện xử lý thực tế.
- Nếu mâu thuẫn, dùng **code API thực tế**, không sửa backend cho giống ví dụ trong docs.
- Các đường dẫn bên dưới là đường dẫn controller, không tự thêm tiền tố triển khai `/api` nếu ứng dụng không cấu hình tiền tố đó.
- Payload minh họa dùng ký hiệu giữ chỗ, không dùng để tự tạo dữ liệu hoặc gọi mutation trên DB.

## 2. Tóm tắt điểm lệch đã xác nhận

| Phần trong guide | Docs đang ghi | Code API thực tế |
| --- | --- | --- |
| 3.1 — Đổi phân công | `assignedDriverId`, `assignedVehicleId`, `assignedBusAttendantId` | `driverId`, `vehicleId`, `busAttendantId` |
| 3.1 — Điểm danh | `PATCH /trips/:id/attendance`; `BOARDED`, `ALIGHTED`, `ABSENT` | `PUT /trips/:id/attendance/:studentId`; `UNMARKED`, `PRESENT`, `ABSENT`; xuống xe có endpoint riêng |
| 3.2 — Tạo sự cố | `POST /incidents`; `incidentType`; Web Admin được tạo | `POST /trips/:id/incidents`; `type`; chỉ DRIVER/BUS_ATTENDANT |
| 3.2 — Xử lý sự cố | `resolution`, `replacementDriverId`, `replacementBusAttendantId`, `replacementVehicleId`, `notes` | `action`, `replacementUserId`, `reason`, `expectedStatus`; ARRIVED/REPLACED cho sự cố thiếu nhân sự |
| 3.4 — Hủy phương án | `/routes/plans/:id/...`; response có `fingerprint`, `frozenTripsCount`, `activeLeaveNoticesCount` | `/routes/route-plans/:id/...`; response có `expectedFingerprint`, không có hai bộ đếm vừa nêu |
| 2.1 — Chuyến đóng băng | Chỉ nêu thời điểm bắt đầu và phụ xe sẵn sàng | Còn xét IN_PROGRESS/COMPLETED và đã ghi điểm danh PRESENT/ABSENT |

## 3. Đổi phân công chuyến

**Docs:** mục 3.1 dùng các trường có tiền tố `assigned`.

**Contract thực tế:** controller nhận `PATCH /trips/:id/assignments` và các alias `PATCH /trips/:id`, `PATCH /trips/:id/assignment`.

```json
{
  "expectedVehicleId": "<xe-khi-mo-form>",
  "expectedDriverId": "<tai-xe-khi-mo-form>",
  "expectedBusAttendantId": "<phu-xe-khi-mo-form>",
  "vehicleId": "<xe-moi>",
  "driverId": "<tai-xe-moi>",
  "reason": "Điều chỉnh phân công"
}
```

Các trường DTO đều optional; client chỉ gửi trường phù hợp thao tác/quyền. SYSTEM_ADMIN đổi xe/tài xế, SCHOOL_ADMIN đổi `busAttendantId` trong trường mình. Các trường `expected*` bảo vệ trường hợp phân công đã thay đổi từ lúc mở form; không được thay bằng ID mới.

Nguồn: [trips.controller.ts](../../api/src/trips/trips.controller.ts), [update-trip-assignment.dto.ts](../../api/src/trips/dto/update-trip-assignment.dto.ts), [trips.service.ts](../../api/src/trips/trips.service.ts).

**Web đã dùng:** `vehicleId/driverId/busAttendantId`, giữ baseline `expected*`; không gửi các trường `assigned*` theo ví dụ guide.

## 4. Điểm danh lên xe và xuống xe

**Docs:** mục 3.1 mô tả `PATCH /trips/:id/attendance` và dùng `BOARDED/ALIGHTED` như trạng thái điểm danh.

**Code API:**

- Đọc roster: `GET /trips/:id/attendance`.
- Ghi điểm danh: `PUT /trips/:id/attendance/:studentId`.
- Xác nhận xuống xe: `PUT /trips/:id/attendance/:studentId/alighting`.
- `AttendanceStatus` trong Prisma là `UNMARKED`, `PRESENT`, `ABSENT`.

`ALIGHTED` không phải một giá trị của AttendanceStatus. Thông tin xuống xe được theo dõi riêng, không thay trạng thái PRESENT bằng ALIGHTED trên Web.

Nguồn: [trips.controller.ts](../../api/src/trips/trips.controller.ts), [schema.prisma](../../api/prisma/schema.prisma).

**Web đã dùng:** roster chỉ đọc, trạng thái UNMARKED/PRESENT/ABSENT cùng dữ liệu xuống xe. Không mở quyền điểm danh cho Admin dựa trên ví dụ dành cho Mobile.

## 5. Tạo sự cố

**Docs:** mục 3.2 ghi `POST /incidents`, body có `tripId`, `incidentType`, và nói Web Admin có thể tạo.

**Code API:** `POST /trips/:id/incidents`, trip ID nằm trên URL; DTO dùng `type`. Controller chỉ cho DRIVER và BUS_ATTENDANT gọi endpoint tạo.

```json
{
  "type": "TRAFFIC_DELAY",
  "description": "Xe di chuyển chậm do ùn tắc",
  "latitude": 10.77653,
  "longitude": 106.70098
}
```

DTO còn có các trường tùy chọn `idempotencyKey`, `expectedAssigneeId`, `studentId`. Service vẫn kiểm tra loại sự cố, nhân sự và trạng thái chuyến; không phải mọi giá trị enum đều được mọi người tạo trong mọi trạng thái. Không coi các ví dụ BREAKDOWN/ACCIDENT/OTHER trong guide là loại đã được hỗ trợ nếu schema/service không có.

Nguồn: [incidents.controller.ts](../../api/src/incidents/incidents.controller.ts), [create-incident.dto.ts](../../api/src/incidents/dto/create-incident.dto.ts), [incidents.service.ts](../../api/src/incidents/incidents.service.ts), [schema.prisma](../../api/prisma/schema.prisma).

**Web đã dùng:** xem/lọc sự cố mới và xem tọa độ khi hợp lệ. Không thêm nút tạo sự cố cho Admin.

## 6. Xử lý sự cố

Đường dẫn `POST /incidents/:id/resolve` trong guide đúng với controller, nhưng **payload và phạm vi hành động không khớp**.

```json
{
  "action": "REPLACED",
  "replacementUserId": "<nhan-su-thay-the>",
  "reason": "Bố trí nhân sự dự phòng",
  "expectedStatus": "WAITING_ASSIGNMENT"
}
```

- `action` chỉ có `ARRIVED` hoặc `REPLACED`.
- `replacementUserId` dùng khi thay nhân sự; không có `replacementVehicleId` trong ResolveIncidentDto.
- Ghi chú là `reason`, không phải `notes`.
- Controller dành cho SYSTEM_ADMIN/SCHOOL_ADMIN; service kiểm tra đúng loại nhân sự và school scope.
- Endpoint này không phải API điều phối tổng quát cho cả tai nạn, mất GPS, giao thông hoặc đổi xe khẩn cấp như ví dụ guide có thể khiến người đọc hiểu.

Nguồn: [resolve-incident.dto.ts](../../api/src/incidents/dto/resolve-incident.dto.ts), [incidents.controller.ts](../../api/src/incidents/incidents.controller.ts), [incidents.service.ts](../../api/src/incidents/incidents.service.ts).

**Web đã dùng:** giữ luồng ARRIVED/REPLACED cho sự cố nhân sự theo quyền, không tự thêm các hành động RESOLVED/DISMISSED/CANCELLED_TRIP.

## 7. Hủy phương án tuyến

**Controller thực tế:**

```text
GET  /routes/route-plans/:id/cancellation-impact
POST /routes/route-plans/:id/cancel
```

Khác với `/routes/plans/:id/...` trong guide.

**CancellationImpact DTO thực tế:**

```text
planId, planName, status, schoolId, schoolName
scheduledTripsCount, inProgressTripsCount, completedTripsCount
routesCount
assignedVehiclesCount, assignedDriversCount, assignedBusAttendantsCount
expectedFingerprint
```

- Token response là `expectedFingerprint`, không phải `fingerprint`.
- Không có `frozenTripsCount` và `activeLeaveNoticesCount` trong DTO/response thực tế đã đối chiếu.
- Payload hủy `{ reason, expectedFingerprint }` trong guide phù hợp; lỗi nằm ở ví dụ response và đường dẫn.
- Service tính số chuyến SCHEDULED sẽ hủy theo điều kiện chưa đóng băng. Không tự tính tổng frozen bằng `inProgressTripsCount`: SCHEDULED đã sẵn sàng/điểm danh cũng có thể đã đóng băng.

Nguồn: [routes.controller.ts](../../api/src/routes/routes.controller.ts), [route-plan-cancellation-impact.dto.ts](../../api/src/routes/dto/route-plan-cancellation-impact.dto.ts), [routes.service.ts](../../api/src/routes/routes.service.ts).

**Web đã dùng:** gửi đúng expectedFingerprint, chỉ hiển thị bộ đếm API có thật. Không nhầm `frozenTripsCount` của response preview đổi địa chỉ với response cancellation-impact — hai endpoint có contract khác nhau.

## 8. Điều kiện chuyến đóng băng

Guide mục 2.1 nêu hai trường thời gian, nhưng helper thực tế xét:

1. Status là IN_PROGRESS hoặc COMPLETED; hoặc
2. Có `actualStartTime`; hoặc
3. Có `attendantReadyAt`; hoặc
4. Có attendance PRESENT hoặc ABSENT.

Nguồn: [operations-policy.ts](../../api/src/overview/operations-policy.ts), hàm `isTripFrozen` và `frozenTripWhere`.

**Web đã dùng:** kiểm tra trạng thái/bắt đầu/sẵn sàng cùng roster trước đổi phân công. Thiếu dữ liệu không mặc định là được phép sửa; backend vẫn là nơi quyết định cuối cùng. Không áp dụng suy đoán này cho mọi endpoint: từng service phải thực sự dùng helper hoặc điều kiện tương đương.

## 9. Dời bãi: giới hạn xác minh, không gộp thành mâu thuẫn đã chứng minh

Tìm references trong `api/src` hiện thấy `applyScheduledParkingLotChange` ở service và controller gọi endpoint, chưa thấy cron gọi hàm này.

- **Đã xác nhận:** có `POST /system-settings/parking-lot/apply-scheduled-change`; service chỉ áp dụng khi đến ngày hiệu lực.
- **Chưa xác nhận:** một cơ chế scheduler bên ngoài source đang kiểm tra có tự gọi endpoint hay không.
- **Không kết luận:** chỉ vì chưa thấy cron mà khẳng định mọi môi trường triển khai đều không có tự động hóa.
- **Web hiện tại:** dùng nút áp dụng có xác nhận khi đến hạn, không hứa tự động.

Re-optimize hiện đọc bãi đang áp dụng, không đọc scheduledChange. Web chờ lịch dời bãi được áp dụng trước khi tối ưu theo bãi mới. Hủy lịch dời bãi không được diễn đạt là tự phục hồi mọi chuyến đã hủy.

Nguồn: [system-settings.controller.ts](../../api/src/system-settings/system-settings.controller.ts), [system-settings.service.ts](../../api/src/system-settings/system-settings.service.ts), [routes.service.ts](../../api/src/routes/routes.service.ts).

## 10. Cách dùng bản đối chiếu

Khi sửa [FE_INTEGRATION_GUIDE.md](../FE_INTEGRATION_GUIDE.md), cập nhật các mục đã xác nhận ở trên theo source API. Không thay đổi backend để hợp thức hóa ví dụ cũ; không mở thêm quyền cho Web từ mô tả chưa có trong controller/service.

Hướng dẫn thao tác Web: [business-improvements-usage.md](../../web/docs/business-improvements-usage.md).
Kế hoạch tích hợp: [web-api-business-improvements-integration-plan.md](web-api-business-improvements-integration-plan.md).

Bản ghi này chỉ đọc source; chưa kiểm chứng bằng mutation live, không sửa API/DB hay chạy seed. Khi backend thay đổi, phải đối chiếu lại các mục liên quan.
