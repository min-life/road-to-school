# ROADTOSCHOOL V2.0 — KẾ HOẠCH KIẾN TRÚC & PHÂN TÍCH NGHIỆP VỤ VẬN HÀNH CHUYẾN XE (TRIP OPERATION V2)
# BOARDING · SCHOOL ARRIVAL · ALIGHTING · COMPLETION
# DATABASE IMPACT MINIMIZATION FIRST

> **Phân hệ**: Quản lý Vận hành Chuyến xe (Trip Operation Management V2)  
> **Phiên bản tài liệu**: 2.1.0 (Nâng cấp luồng Vận hành 4 chặng: Lên xe → Đến trường → Xuống xe → Hoàn thành)  
> **Ngày cập nhật**: 25/10/2026  
> **Trạng thái**: IMPLEMENTATION IN PROGRESS (Đã tối ưu hóa tác động Database tối thiểu)

---

## 1. TỔNG QUAN YÊU CẦU & BỐI CẢNH NÂNG CẤP

RoadToSchool v2.0 đã hoàn thiện nền tảng vận hành chuyến xe cơ bản:
- Sinh chuyến xe (`Trip Generation`) kèm danh sách học sinh theo chuyến (`TripAttendance` roster).
- Xác nhận sẵn sàng của Giáo viên giám sát (`attendantReadyAt`).
- Bắt đầu chuyến xe của Tài xế (`actualStartTime`).
- Điểm danh lên xe 3 trạng thái (`UNMARKED`, `PRESENT`, `ABSENT`).
- Chế độ vận hành `TEST` / `LIVE` linh hoạt.
- Smart Polling 5 giây không reload WebView bản đồ.
- Bảo vệ quyền riêng tư PII cho Phụ huynh.

Product Owner yêu cầu nâng cấp toàn diện luồng vận hành để phân biệt rõ rệt 4 giai đoạn nghiệp vụ:
1. **Điểm danh lên xe (Boarding)**
2. **Xác nhận đến trường (School Arrival — chỉ áp dụng cho chiều `TO_SCHOOL`)**
3. **Xác nhận học sinh xuống xe (Alighting — áp dụng cho học sinh `PRESENT`)**
4. **Hoàn thành chuyến xe (Completion — khóa toàn bộ thao tác)**

---

## 2. DATABASE IMPACT OPTIMIZATION REPORT (BÁO CÁO TỐI ƯU HÓA DATABASE)

### 2.1. Nguyên tắc tối cao (Guiding Principle)
**MỤC TIÊU KỸ THUẬT ƯU TIÊN CAO NHẤT LÀ GIẢM TÁC ĐỘNG ĐẾN DATABASE TỐI ĐA.**  
Không tự ý tạo thêm bảng mới, không thêm enum mới, không nhân bản các trường có thể suy luận (derived), không dùng JSON tùy tiện để trốn tránh migration.

### 2.2. Ma trận So sánh 4 Phương án Kiến trúc (Mandatory Comparison Matrix)

| Tiêu chí đánh giá | Option A: Zero Schema Changes | Option B: Exactly One Field (JSON on Trip) | Option C: Minimal Extension (Trip.arrivedAtSchoolAt + TripAttendance.alightedAt) [CHỌN] | Option D: New Tables (TripMilestone / AlightingTable) |
|---|---|---|---|---|
| **Số bảng mới** | 0 | 0 | **0 (Không tạo bảng mới)** | 1 – 2 bảng mới |
| **Số fields mới** | 0 | 1 (`Trip.operationMeta Json?`) | **2 (`Trip.arrivedAtSchoolAt DateTime?`, `TripAttendance.alightedAt DateTime?`)** | Nhiều cột + Foreign Keys |
| **Số enums mới** | 0 | 0 | **0 (Không tạo enum mới)** | 1 – 2 enums |
| **Migration** | Không có | ALTER TABLE 1 cột JSON | **ALTER TABLE 2 cột nullable (Non-blocking)** | CREATE TABLE + DDL + Indexes |
| **Tính toàn vẹn & Concurrency** | Không đạt: Không thể phân biệt School Arrival và Alighting sau restart app | Rất kém: Xung đột ghi đồng thời (race condition) giữa Driver và Attendant trên cùng JSON blob của `Trip` | **Tuyệt đối: Tách biệt hoàn toàn trách nhiệm giữa Driver (`Trip`) và Attendant (`TripAttendance`)** | Tốt nhưng quá phức tạp |
| **Hiệu năng truy vấn** | N/A | Kém: Luôn phải đọc/ghi toàn bộ JSON lớn cho thao tác nhỏ | **Tối ưu: Chỉ ghi 1 timestamp của đúng 1 bản ghi** | Tốn joins |
| **Truy vấn Phụ huynh** | N/A | Khó khăn, phải parse JSON để tìm trạng thái con | **Cực nhanh: Đọc trực tiếp `alightedAt` trên `TripAttendance`** | Cần join bảng mới |
| **Độ phức tạp mã nguồn** | Không khả thi | Cao: Code phải parse, merge, validate JSON | **Rất thấp: Native Prisma Client strongly-typed** | Cao: Cần repositories/services mới |
| **Khả năng khôi phục sau Restart** | Thất bại nếu lưu RAM | Đạt | **Đạt 100% (Dữ liệu đã persist bền vững)** | Đạt 100% |
| **Tác động dữ liệu lịch sử** | Không | Không | **100% an toàn: Các dòng cũ nhận giá trị `null`** | Cần migrate |
| **Yêu cầu Backfill script** | Không | Không | **Không cần backfill dữ liệu giả** | Cần backfill |

### 2.3. Biện luận Lựa chọn Phương án Tối ưu: **OPTION C**
1. **Tại sao Option A bị loại?**
   - Database hiện tại không có trường nào đại diện cho thời điểm đến trường hoặc học sinh xuống xe. Nếu dùng biến bộ nhớ tạm thời hoặc local storage thì khi app mobile reload hoặc backend restart, dữ liệu sẽ biến mất, gây mất an toàn học sinh. Nếu tái sử dụng `status` hay `cancellationReason` sẽ làm sai lệch nghiêm trọng ngữ nghĩa nghiệp vụ.
2. **Tại sao Option B (1 field JSON) bị loại?**
   - Nếu gom trạng thái xuống xe của 30 học sinh vào 1 trường JSON trên bảng `Trip`, mỗi lần giáo viên bấm xuống xe cho 1 học sinh, backend phải đọc toàn bộ JSON, cập nhật và ghi đè lại bảng `Trip`. Điều này gây nghẽn cổ chai và xung đột tranh chấp ghi (lock contention) trực tiếp với tài xế khi tài xế thao tác trên `Trip`.
3. **Tại sao Option C là phương án tối giản tuyệt đối và an toàn nhất?**
   - Chỉ thêm đúng **2 trường nullable `DateTime?`** trên 2 bảng nghiệp vụ hiện có:
     - `Trip.arrivedAtSchoolAt DateTime?`: Biểu thị mốc thời gian xe đến cổng trường (Driver thao tác trên `Trip`).
     - `TripAttendance.alightedAt DateTime?`: Biểu thị mốc thời gian học sinh bước xuống xe (Attendant thao tác trên `TripAttendance`).
   - `null` = chưa diễn ra; `has value` = đã diễn ra kèm thời điểm chính xác.
   - Không sinh thêm bất kỳ bảng mới nào (`0 new tables`).
   - Không sinh thêm bất kỳ enum mới nào (`0 new enums`).
   - Hoàn toàn tương thích ngược (`100% backward compatible`), không cần backfill dữ liệu giả.

---

## 3. QUY TRÌNH NGHIỆP VỤ CHI TIẾT THEO CHIỀU TUYẾN

### 3.1. Luồng TO_SCHOOL (Đưa học sinh đến trường)
```
[SCHEDULED]
   │
   ├─► Attendant: Xác nhận Sẵn sàng (attendantReadyAt)
   │
   ├─► Driver: Bắt đầu chuyến xe (actualStartTime)
   │     └── Không bắt buộc điểm danh đủ trước khi bắt đầu. Nút chuyển sang "Đến trường" (bị disabled).
   │
[IN_PROGRESS] (Xe đang chạy trên lộ trình đón học sinh)
   │
   ├─► Attendant: Điểm danh lên xe (UNMARKED -> PRESENT / ABSENT)
   │     └── Cho phép sửa, hoàn tác về UNMARKED, nhập lý do vắng, quét QR.
   │
   ├─► Roster: Khi 100% học sinh đã được đánh dấu (0 UNMARKED, mọi ABSENT có lý do)
   │     └── Nút "Đến trường" của Tài xế SÁNG LÊN (Enabled).
   │
   ├─► Driver: Xác nhận "Đến trường" (arrivedAtSchoolAt)
   │     └── Khóa không cho chuyển về UNMARKED. Nút Tài xế chuyển thành "Hoàn thành chuyến" (bị disabled).
   │
[IN_PROGRESS - ARRIVED AT SCHOOL] (Xe đã đỗ tại sân trường)
   │
   ├─► Attendant: Xác nhận học sinh xuống xe (Alighting)
   │     └── Chỉ áp dụng cho học sinh PRESENT (chưa xuống -> đã xuống). Cho phép hoàn tác trước khi Complete.
   │
   ├─► Roster: Khi 100% học sinh PRESENT đã được xác nhận xuống xe (alightedAt != null)
   │     └── Nút "Hoàn thành chuyến" của Tài xế SÁNG LÊN (Enabled).
   │
[COMPLETED] (Chuyến xe kết thúc an toàn)
         └── actualEndTime = now. Khóa toàn bộ thao tác điểm danh và xuống xe.
```

### 3.2. Luồng TO_PARKING (Đưa học sinh từ trường về nhà)
```
[SCHEDULED] (Xe đang đỗ tại sân trường đón học sinh)
   │
   ├─► Attendant: Xác nhận Sẵn sàng (attendantReadyAt)
   │
   ├─► Attendant: Điểm danh lên xe NGAY TẠI TRƯỜNG KHI CHUYẾN CÒN SCHEDULED
   │     └── Học sinh lên xe trước khi xe lăn bánh. Cho phép sửa, quét QR, nhập lý do vắng.
   │
   ├─► Roster: Khi 100% học sinh đã được điểm danh (0 UNMARKED, mọi ABSENT có lý do)
   │     └── Nút "Bắt đầu chuyến xe" của Tài xế SÁNG LÊN (Enabled).
   │
   ├─► Driver: Bắt đầu chuyến xe (actualStartTime)
   │     └── Chuyến chuyển IN_PROGRESS. Khóa không cho chuyển về UNMARKED.
   │     └── Nút Tài xế chuyển TRỰC TIẾP thành "Hoàn thành chuyến" (TO_PARKING không có nút Đến trường).
   │
[IN_PROGRESS] (Xe chạy dọc lộ trình trả từng học sinh)
   │
   ├─► Attendant: Xác nhận học sinh xuống xe tại các điểm dừng (Alighting)
   │     └── Học sinh PRESENT xuống xe tại điểm đón/nhà -> Attendant bấm "Đã xuống xe".
   │
   ├─► Roster: Khi 100% học sinh PRESENT đã được xác nhận xuống xe
   │     └── Nút "Hoàn thành chuyến" của Tài xế SÁNG LÊN (Enabled).
   │
[COMPLETED] (Chuyến xe kết thúc an toàn tại bãi đỗ)
         └── actualEndTime = now. Khóa toàn bộ dữ liệu.
```

---

## 4. MA TRẬN TRẠNG THÁI & HÀNH VI (STATE MACHINE MATRIX)

| Actor | Chiều tuyến | Trạng thái Chuyến | Điều kiện Ready | Tiến độ Lên xe (Boarding) | Mốc Đến trường (Arrival) | Tiến độ Xuống xe (Alighting) | Hành động khả dụng | Nhãn nút hành động | Lý do bị khóa (Disabled Reason) |
|---|---|---|---|---|---|---|---|---|---|
| **Attendant** | Cả hai | `SCHEDULED` | Chưa ready | N/A | N/A | N/A | Bấm Ready | Xác nhận sẵn sàng | Chưa đến giờ sẵn sàng (ở LIVE mode) |
| **Attendant** | `TO_SCHOOL` | `IN_PROGRESS` | Đã ready | Bất kỳ | Chưa đến trường | N/A | Điểm danh lên xe, quét QR, đổi PRESENT/ABSENT, hoàn tác UNMARKED | Các nút điểm danh | Chuyến chưa bắt đầu |
| **Attendant** | `TO_SCHOOL` | `IN_PROGRESS` | Đã ready | 100% | Đã đến trường | Chưa đủ 100% | Bấm Xuống xe cho từng HS PRESENT, sửa nhầm xuống xe | Đã xuống xe / Hoàn tác | Chỉ áp dụng cho học sinh PRESENT |
| **Attendant** | `TO_PARKING` | `SCHEDULED` | Đã ready | Đang điểm danh | N/A | N/A | Điểm danh lên xe tại trường, quét QR, sửa PRESENT/ABSENT | Các nút điểm danh | Giáo viên chưa xác nhận sẵn sàng |
| **Attendant** | `TO_PARKING` | `IN_PROGRESS` | Đã ready | 100% | N/A | Đang trả khách | Bấm Xuống xe cho từng HS PRESENT khi đến trạm | Đã xuống xe / Hoàn tác | Chỉ áp dụng cho học sinh PRESENT |
| **Driver** | `TO_SCHOOL` | `SCHEDULED` | Đã ready | N/A | N/A | N/A | Bắt đầu chuyến xe | Bắt đầu chuyến xe | Chờ giáo viên sẵn sàng / Chưa đến giờ |
| **Driver** | `TO_SCHOOL` | `IN_PROGRESS` | Đã ready | Chưa đủ 100% | Chưa đến trường | N/A | Bị khóa | Đến trường | Còn X học sinh chưa điểm danh lên xe |
| **Driver** | `TO_SCHOOL` | `IN_PROGRESS` | Đã ready | 100% | Chưa đến trường | N/A | Xác nhận Đến trường | Đến trường | Khả dụng |
| **Driver** | `TO_SCHOOL` | `IN_PROGRESS` | Đã ready | 100% | Đã đến trường | Chưa đủ 100% | Bị khóa | Hoàn thành chuyến | Còn X học sinh chưa xuống xe |
| **Driver** | `TO_SCHOOL` | `IN_PROGRESS` | Đã ready | 100% | Đã đến trường | 100% đã xuống | Hoàn thành chuyến xe | Hoàn thành chuyến xe | Khả dụng |
| **Driver** | `TO_PARKING` | `SCHEDULED` | Đã ready | Chưa đủ 100% | N/A | N/A | Bị khóa | Bắt đầu chuyến xe | Còn X học sinh chưa lên xe tại trường |
| **Driver** | `TO_PARKING` | `SCHEDULED` | Đã ready | 100% | N/A | N/A | Bắt đầu chuyến xe | Bắt đầu chuyến xe | Khả dụng |
| **Driver** | `TO_PARKING` | `IN_PROGRESS` | Đã ready | 100% | N/A | Chưa đủ 100% | Bị khóa | Hoàn thành chuyến | Còn X học sinh chưa xuống xe |
| **Driver** | `TO_PARKING` | `IN_PROGRESS` | Đã ready | 100% | N/A | 100% đã xuống | Hoàn thành chuyến xe | Hoàn thành chuyến xe | Khả dụng |
| **Parent** | Cả hai | Bất kỳ | N/A | Theo con | N/A | Theo con | Chỉ xem trạng thái của con mình | Thẻ trạng thái | N/A (Read-only) |

---

## 5. THIẾT KẾ BACKEND APIS & CONTRACTS

### 5.1. Bổ sung endpoint Đến trường: `POST /trips/:id/arrive-at-school`
- **Actor**: `DRIVER`
- **Validation**:
  - `trip.assignedDriverId === currentUser.id`
  - `trip.direction === RouteDirection.TO_SCHOOL`
  - `trip.status === TripStatus.IN_PROGRESS`
  - `trip.arrivedAtSchoolAt === null`
  - 100% học sinh đã được điểm danh: `unmarkedCount === 0`, mọi `ABSENT` có lý do hợp lệ.
- **Tác động DB**: Ghi nhận `arrivedAtSchoolAt = new Date()`.
- **Response**: `{ message: 'Xác nhận đến trường thành công', arrivedAtSchoolAt: string }`.

### 5.2. Bổ sung endpoint Xuống xe: `PUT /trips/:id/attendance/:studentId/alighting`
- **Actor**: `BUS_ATTENDANT`
- **Body**: `{ isAlighted: boolean }`
- **Validation**:
  - `trip.assignedBusAttendantId === currentUser.id`
  - `trip.status === TripStatus.IN_PROGRESS`
  - Học sinh thuộc roster của chuyến.
  - Học sinh có `status === AttendanceStatus.PRESENT` (chặn tuyệt đối nếu `ABSENT` hoặc `UNMARKED`).
  - Chiều `TO_SCHOOL`: Bắt buộc `trip.arrivedAtSchoolAt !== null` (xe phải đến trường mới được cho xuống).
  - Chiều `TO_PARKING`: Không cần kiểm tra `arrivedAtSchoolAt`.
- **Tác động DB**:
  - Nếu `isAlighted === true`: `alightedAt = new Date()`.
  - Nếu `isAlighted === false` (hoàn tác): `alightedAt = null`.
- **Response**: `{ message: 'Cập nhật trạng thái xuống xe thành công', alightedAt: string | null, isAlighted: boolean }`.

### 5.3. Cập nhật endpoint Bắt đầu: `POST /trips/:id/start`
- Chiều `TO_SCHOOL`: Attendant Ready + time gate (không bắt buộc điểm danh đủ).
- Chiều `TO_PARKING`: Attendant Ready + time gate + **Bắt buộc 100% học sinh đã được điểm danh** (0 `UNMARKED`, mọi `ABSENT` có lý do).

### 5.4. Cập nhật endpoint Hoàn thành: `POST /trips/:id/complete`
- Cả hai chiều:
  - 100% học sinh đã điểm danh lên xe (0 `UNMARKED`, `ABSENT` có lý do).
  - **100% học sinh `PRESENT` đã được xác nhận xuống xe** (`pendingAlightCount === 0`).
- Chiều `TO_SCHOOL`: Bắt buộc đã xác nhận Đến trường (`arrivedAtSchoolAt !== null`).

### 5.5. Cập nhật endpoint Trạng thái Vận hành: `GET /trips/:id/operational-state`
Bổ sung các trường tính toán phục vụ Polling 5s:
- `arrivedAtSchoolAt?: string | null`
- `isSchoolArrived: boolean`
- `alightedCount: number`
- `pendingAlightCount: number`
- `isAllAlighted: boolean`
- `canArriveAtSchool: boolean`
- `disabledReasons`: `{ ready, start, arriveAtSchool, complete }`
- Parent fields: `childAttendanceStatus`, `childIsAlighted`, `childAlightedAt`, `childAbsenceReason`.

---

## 6. THIẾT KẾ MOBILE UI/UX (WIREFRAMES FIRST)

### 6.1. Driver Bottom Action Flow
1. **TO_SCHOOL**:
   - Chờ khởi hành: `[ Bắt đầu chuyến xe ]` (sáng khi Attendant Ready).
   - Trên đường đi: `[ Đến trường ]` (xám khi còn học sinh chưa điểm danh, sáng khi 100% lên xe).
   - Tại sân trường: `[ Hoàn thành chuyến xe ]` (xám khi còn học sinh trên xe, sáng khi 100% đã xuống xe).
2. **TO_PARKING**:
   - Chờ tại trường: `[ Bắt đầu chuyến xe ]` (xám khi còn học sinh chưa lên xe, sáng khi 100% đã điểm danh).
   - Trên đường trả học sinh: `[ Hoàn thành chuyến xe ]` (xám khi còn học sinh chưa xuống, sáng khi 100% đã xuống xe).

### 6.2. Attendant Attendance Screen
- Tab Điểm danh chia thành 2 phân đoạn trực quan (Segmented Tabs / Sub-sections):
  - **Lên xe (Boarding)**: Danh sách đầy đủ học sinh kèm trạng thái `Chưa điểm danh / Có mặt / Vắng mặt`, nút quét QR nhỏ phía trên.
  - **Xuống xe (Alighting)**: Chỉ hiển thị danh sách học sinh có mặt (`PRESENT`), kèm trạng thái `Chưa xuống / Đã xuống` và nút một chạm xác nhận / hoàn tác.
  - Với chiều `TO_SCHOOL`, nếu tài xế chưa bấm Đến trường, màn hình hiển thị badge nhẹ nhàng: *"Chờ xe đến trường để mở xác nhận xuống xe"*.

### 6.3. Parent Screen
- Hiển thị tiến trình trực quan theo thời gian thực của chính con:
  - `Chưa điểm danh` (Vàng)
  - `Đã lên xe` (Xanh lá nhạt)
  - `Đã xuống xe an toàn` (Xanh ngọc / Xanh dương kèm giờ cụ thể)
  - `Vắng mặt` (Đỏ kèm lý do vắng mặt)
- Không hiển thị bất kỳ thông tin nào của học sinh khác.

---

## 7. KẾT LUẬN & CAM KẾT TRIỂN KHAI
- Kiến trúc đảm bảo: **0 bảng mới, 0 enum mới, chỉ 2 trường timestamp nullable**.
- Không tạo dữ liệu giả trong DB.
- Tiến hành thực thi ngay lập tức.
