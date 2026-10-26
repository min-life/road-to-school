# Báo cáo AI Review: Định tuyến Hoàn chỉnh Toàn tuyến, Đồng bộ Hai màu cho Observer & Tinh chỉnh Điều khiển Test

## 1. Thông tin chung
- **Thời gian hoàn thành**: 2026-10-26T02:29:00+07:00
- **Tác vụ**: ROADTOSCHOOL — FULL MULTI-STOP ROUTING, OBSERVER TWO-TONE SYNC & NO-STOP TEST CONTROLS
- **Trạng thái**: COMPLETED (Sẵn sàng nghiệm thu runtime bởi PO)
- **Chế độ thực hiện**: IMPLEMENTATION (Theo phê duyệt rõ ràng của Product Owner: *"đồng ý và triển khai 4 giai đoạn trên"*)
- **Bảo vệ uncommitted work**: Bảo toàn toàn bộ uncommitted changes của PO và các tiến trình nền (`api`, `web`, `mobile`).

---

## 2. Mục tiêu & Phạm vi
Triển khai trọn vẹn 4 giai đoạn kỹ thuật đã được PO duyệt để giải quyết dứt điểm 3 điểm chưa hài lòng của PO:
1. **Hiển thị lộ trình hoàn chỉnh toàn tuyến (A $\rightarrow$ B $\rightarrow$ C $\rightarrow$ D)**: Thay vì chỉ hiển thị chặng đơn lẻ A $\rightarrow$ B và ẩn phần còn lại, tuyến đường điều hướng thực tế từ VietMap nay bao phủ trọn vẹn từ vị trí xe qua trạm tiếp theo và tất cả các trạm sau đó cho đến đích cuối của chuyến đi.
2. **Đồng bộ hiển thị thực tế hai màu cho Giáo viên & Phụ huynh (Observer View)**: Giáo viên phụ xe và Phụ huynh khi theo dõi chuyến xe đang chạy (`IN_PROGRESS`) nhìn thấy vệt đường thực tế hai màu (đoạn xe đã đi màu **xám**, đoạn còn lại màu **xanh dương**) đồng bộ chính xác theo tọa độ xe theo thời gian thực như Tài xế.
3. **Loại bỏ nút "Dừng" trong môi trường TEST & Bảo toàn vệt xám đã đi**: Loại bỏ hoàn toàn nút "Dừng" trong chế độ TEST; chỉ giữ 2 nút **[Tự động di chuyển]** và **[Lái thủ công]**. Trong chế độ Lái thủ công, xe tự đứng yên khi không đẩy cần lái (tốc độ = 0), không gọi lệnh hủy session, không xóa geometry, và bảo toàn 100% vệt xám lịch sử.

---

## 3. Thay đổi chi tiết theo tầng kiến trúc

### A. Backend API (`api/`)
1. **`VietMapNavigationService.route`** ([vietmap-navigation.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/vietmap-navigation.service.ts)):
   - Bổ sung tham số `waypoints: { latitude: number; longitude: number }[] = []`.
   - Nối toàn bộ các điểm dừng tiếp theo vào query params của VietMap Route v4 (`point=lat,lng`).
   - Cập nhật kiểm tra snap distance ở điểm cuối `dLast` đối chiếu với trạm dừng cuối cùng (`finalDest`).
2. **`TripNavigationService.segment`** ([trip-navigation.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trip-navigation.service.ts)):
   - Trích xuất danh sách các trạm dừng tiếp theo sau trạm đích hiện tại: `subsequentStops = trip.route.stops.slice(targetIndex + 1)`.
   - Truyền `subsequentStops` vào `this.directions.route(dto.position, request.target, request.subsequentStops)`.
   - Kết quả: Tuyến đường VietMap trả về là một polyline duy nhất, liền mạch từ vị trí xe xuyên suốt toàn bộ các trạm còn lại đến điểm kết thúc của chuyến.
3. **`trip-navigation.spec.ts`** ([trip-navigation.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trip-navigation.spec.ts)):
   - Cập nhật assertion xác minh `routes.route` nhận đúng danh sách waypoints kế tiếp. Toàn bộ 94/94 tests đều đạt.

### B. Mobile Client (`mobile/`)
1. **`TripNavigationControls`** ([trip-navigation-controls.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/components/trip-navigation-controls.tsx)):
   - **Loại bỏ nút "Dừng" khi `testMode === true`**: Cụm điều khiển TEST chỉ hiển thị 2 nút chuyển đổi: **[Tự động di chuyển]** (`TEST_AUTO`) và **[Lái thủ công]** (`TEST_JOYSTICK`).
   - Chỉ hiển thị nút "Dừng" trong môi trường LIVE (`!p.testMode && !!p.mode`) để tài xế có thể ngắt xuất bản GPS thực tế nếu cần.
2. **`useTripNavigation`** ([use-trip-navigation.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts)):
   - Bổ sung ref `accumulatedTraveled` để lưu trữ các tọa độ đường đã đi qua các chặng (`ADVANCE`).
   - Khi chuyển chặng qua trạm mới (`ADVANCE`), các điểm đã đi trong chặng vừa qua được chuyển vào `accumulatedTraveled`. Vệt đường xám trên bản đồ luôn được nối dài liên tục từ điểm xuất phát ban đầu.
   - Khi chuyển đổi giữa Auto $\leftrightarrow$ Manual, session không bị `STOP`, không gọi routing lại và không làm mất vệt xám đã đi.
3. **`MobileTripDetailScreen`** ([app/trip/[id].tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/trip/[id].tsx)):
   - Bổ sung `observerSplit`: Khi Giáo viên hoặc Phụ huynh xem chuyến xe đang chạy (`IN_PROGRESS`), hệ thống tự động chiếu tọa độ xe tức thời (`navigation.latestPosition`) lên polyline lộ trình đầy đủ (`trip.polylineGeometry`) với `maxForward = Infinity`.
   - Áp dụng `splitSegment` chia lộ trình thành 2 dải màu: **Xám (đoạn đã đi)** và **Xanh dương (đoạn còn lại)**.
   - Ẩn đường planned thô (`hidePlanned = true`) để hiển thị đường điều hướng thực tế hai màu đồng bộ cho cả Giáo viên và Phụ huynh.
4. **`trip-navigation.test.ts`** ([trip-navigation.test.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/scripts/trip-navigation.test.ts)):
   - Bổ sung 4 bài kiểm tra trong test suite `Full trip routing, observer real-time sync, and no-stop test controls`:
     1. Observer tính toán chính xác hai dải màu xám/xanh từ vị trí xe thực tế.
     2. Cơ chế tích lũy `accumulatedTraveled` bảo toàn đường đi cũ khi chuyển chặng (`ADVANCE`).
     3. Giao diện test chỉ hiển thị Auto và Manual, không có nút Dừng.
     4. Chuyển đổi Auto sang Manual giữ nguyên tiến trình và không làm mất vệt xám.

---

## 4. Phân tích nguyên nhân gốc & Quyết định kỹ thuật

### A. Tuyến đường thực tế hoàn chỉnh toàn tuyến (A $\rightarrow$ B $\rightarrow$ C $\rightarrow$ D)
- **Trước đây**: Backend chỉ gửi `dto.position` và `targetStop` (ví dụ từ A đến B). VietMap chỉ trả về chặng 7.21km đó. Leaflet map ẩn đường tổng thể và chỉ vẽ chặng A $\rightarrow$ B, khiến đường từ B $\rightarrow$ C và C $\rightarrow$ D biến mất.
- **Giải pháp**: Gửi toàn bộ các trạm dừng còn lại của chuyến xe (`origin`, `target`, `...subsequentStops`) vào VietMap Route v4. VietMap trả về 1 polyline thực tế 10.3km bao trọn toàn bộ hành trình. Đồng thời, mobile duy trì `accumulatedTraveled` để đoạn đường phía sau xe luôn luôn được giữ màu xám cho đến hết chuyến.

### B. Đồng bộ hiển thị hai màu cho Giáo viên & Phụ huynh
- **Trước đây**: Cơ chế chia dải màu `splitSegment` chỉ chạy trong RAM của Driver hook. Giáo viên và Phụ huynh chỉ nhận tọa độ xe, còn mảng `traveled` rỗng nên chỉ thấy đường polyline đơn sắc mặc định.
- **Giải pháp**: Màn hình chi tiết chuyến xe sử dụng cùng thuật toán hình học `projectProgress(..., 0, Infinity)` và `splitSegment` để tính toán dải màu trực tiếp từ `trip.polylineGeometry` và tọa độ xe `navigation.latestPosition`. Khi xe di chuyển, vệt xám tự động kéo dài theo sau xe trên màn hình của Giáo viên và Phụ huynh.

### C. Loại bỏ nút "Dừng" trong môi trường TEST
- **Trước đây**: Bấm "Dừng" làm session bị hủy (`STOP`). Khi bấm chạy lại, hệ thống phải routing lại từ đầu và reset tiến trình `travelled = 0`, làm mất toàn bộ vệt xám lịch sử.
- **Giải pháp**: Trong môi trường TEST, chế độ **Lái thủ công** có tốc độ bằng 0 khi tài xế không đẩy joystick. Do đó Lái thủ công chính là trạng thái "Dừng/Tạm dừng" an toàn nhất. Bỏ nút "Dừng" giúp tài xế chỉ cần bấm chuyển sang [Lái thủ công] để xe đứng yên mà không làm gián đoạn chuyến đi hay mất vệt xám.

---

## 5. Bảo vệ baseline & Chống hồi quy
- **Bảo vệ Lái thủ công**: Cần điều khiển 8 hướng của Lái thủ công hoạt động độc lập và ổn định; buông tay khỏi joystick xe dừng lại ngay lập tức.
- **Bảo vệ Nghiệp vụ Điểm danh & Tiến trình**: Việc hiển thị toàn tuyến không ảnh hưởng đến logic điểm danh lên xe (Boarding), xác nhận đến trường (Arrival), điểm danh xuống xe (Alighting) hay hoàn thành chuyến.
- **Bảo vệ Chế độ LIVE**: Nút "Dừng" vẫn được giữ lại cho chế độ LIVE khi tài xế cần ngắt GPS tracking thật.

---

## 6. Tuân thủ Test Data Policy (Test Data Policy Compliance)
- Tuyệt đối không sinh bản ghi giả, không seed DB, không thay đổi dữ liệu thật.
- Kiểm chứng an toàn hoàn toàn bằng unit tests và typecheck độc lập.

---

## 7. Đồng bộ Swagger & DTO
- Giữ nguyên hợp đồng API của `/api/trips/:id/navigation/segment` và `/api/trips/:id/navigation/session`.
- Không phát sinh thay đổi Swagger schema.

---

## 8. Kết quả kiểm chứng (Verification Results)

### A. Kiểm tra Unit Test
1. **API Module (`vitest run --run src/trips`)**:
   - `src/trips/trip-navigation.spec.ts`: **37/37 tests PASS**.
   - `src/trips/trip-synchronization.spec.ts`: **30/30 tests PASS**.
   - `src/trips/trips.service.spec.ts`: **17/17 tests PASS**.
   - `src/trips/utils/trip-time.util.spec.ts`: **10/10 tests PASS**.
   - **Tổng cộng API**: **94/94 tests PASS**.
2. **Mobile Module (`node --test`)**:
   - `scripts/trip-navigation.test.ts`: **31/31 tests PASS** (gồm 4 tests mới về toàn tuyến, observer sync, và no-stop test controls).
   - `scripts/trip-state-synchronization.test.ts`: **7/7 tests PASS**.
   - `scripts/trip-status-label.test.ts`: **7/7 tests PASS**.
   - **Tổng cộng Mobile**: **45/45 tests PASS**.

### B. Kiểm tra Typecheck (Read-only)
- `mobile`: `npx tsc --noEmit` $\rightarrow$ **PASS (0 errors)**.
- `api`: `npx tsc --noEmit` $\rightarrow$ **PASS (0 errors)**.
- `web`: `npx tsc --noEmit` $\rightarrow$ **PASS (0 errors)**.

---

## 9. Ma trận phân quyền & Bảo mật
- Quyền điều khiển xe và gửi tọa độ tiếp tục chỉ thuộc về tài xế được phân công (`DRIVER`).
- Giáo viên (`BUS_ATTENDANT`) và Phụ huynh (`PARENT`) chỉ có quyền xem tuyến đường thực tế và vị trí xe (Read-only).
- Thông tin học sinh khác vẫn được bảo mật (Privacy Masking cho phụ huynh).

---

## 10. Tác động Database
- **Schema**: 0 thay đổi trong `prisma/schema.prisma`.
- **Migrations**: 0 migration mới.
- **Records**: Không sửa đổi dữ liệu DB.

---

## 11. Rủi ro & Biện pháp giảm thiểu
- **Rủi ro**: Lộ trình có quá nhiều điểm dừng có thể làm URL gọi VietMap vượt giới hạn ký tự.
  - **Biện pháp giảm thiểu**: Mỗi chuyến xe đưa đón học sinh thường có từ 5-15 điểm dừng, URL chỉ dài khoảng 400-800 ký tự (rất xa so với giới hạn 4096 ký tự của HTTP GET).

---

## 12. Handoff & Trạng thái Runtime
- Toàn bộ mã nguồn đã được cập nhật và dev server đã tự động nạp mã mới (hot reload).
- Chuyến xe `Tuyến Về 01 (36B52942)` đang chạy:
  - Trên màn hình Tài xế: Chỉ còn 2 nút **[Tự động di chuyển]** và **[Lái thủ công]**. Tuyến đường thực tế hiển thị trọn vẹn xuyên suốt toàn bộ các trạm. Chuyển sang Lái thủ công xe dừng lại và vệt xám không bị mất.
  - Trên màn hình Giáo viên & Phụ huynh: Hiển thị trọn vẹn tuyến đường thực tế với vệt **xám** cho đoạn xe đã đi qua và vệt **xanh dương** cho đoạn đường còn lại theo thời gian thực.

---

## 13. Đề xuất bước tiếp theo duy nhất
**Product Owner kiểm tra trực tiếp trải nghiệm trên Mobile:**
- Xem màn hình Tài xế: Xác nhận tuyến đường hiển thị đầy đủ toàn tuyến (không còn cụt ở trạm 1), nút "Dừng" đã biến mất (chỉ còn Auto/Manual), và chuyển sang Lái thủ công để xác nhận xe đứng yên mà vệt xám không bị mất.
- Đăng nhập bằng tài khoản Giáo viên hoặc Phụ huynh vào chuyến xe: Xác nhận nhìn thấy tuyến đường thực tế hai màu (xám đã đi / xanh còn lại) đồng bộ với chuyển động của xe buýt.
