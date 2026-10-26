# Báo cáo AI Review: Bộ Điều chỉnh Tốc độ Mô phỏng (Option B: Nút − / +)

## 1. Thông tin chung
- **Thời gian hoàn thành**: 2026-10-26T02:35:45+07:00
- **Tác vụ**: ROADTOSCHOOL — IMPLEMENT SIMULATION SPEED ADJUSTMENT (OPTION B: STEPPER CONTROLS)
- **Trạng thái**: COMPLETED (Sẵn sàng nghiệm thu runtime bởi PO)
- **Chế độ thực hiện**: IMPLEMENTATION (Theo phê duyệt rõ ràng của Product Owner: *"tôi muốn triển khai phương án b"*)
- **Bảo vệ uncommitted work**: Bảo toàn toàn bộ uncommitted changes của PO và các tiến trình nền (`api`, `web`, `mobile`).

---

## 2. Mục tiêu & Phạm vi
Triển khai bộ điều chỉnh tốc độ mô phỏng cho Tài xế theo Phương án B (Bộ nút tăng giảm `[−]` `[+]`):
1. **Dải tốc độ linh hoạt**: Từ `10 km/h` đến `120 km/h`, mặc định là `30 km/h`. Mỗi lần bấm tăng/giảm thay đổi `10 km/h`.
2. **Tác động đồng bộ**: Tốc độ được áp dụng tỷ lệ thuận cho cả **Tự động di chuyển** (`TEST_AUTO`) và **Lái thủ công** (`TEST_JOYSTICK`), giúp PO có thể đẩy nhanh tiến độ kiểm thử toàn tuyến 10km chỉ trong vài phút hoặc hạ chậm để soi kỹ từng ngã rẽ.
3. **Chỉ áp dụng trong môi trường TEST**: Môi trường LIVE thực tế ngoài đời tiếp tục dùng tốc độ thực từ cảm biến GPS điện thoại (`Location.watchPositionAsync`), không bị ảnh hưởng.

---

## 3. Thay đổi chi tiết theo tầng kiến trúc

### A. Mobile Client (`mobile/`)
1. **`useTripNavigation`** ([use-trip-navigation.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts)):
   - Thêm state `speedKmh` và ref `speedKmhRef` với giá trị ban đầu là `30`.
   - Thêm 2 hàm callback:
     - `increaseSpeed`: Tăng thêm 10 km/h, giới hạn tối đa `120 km/h`.
     - `decreaseSpeed`: Giảm đi 10 km/h, giới hạn tối thiểu `10 km/h`.
   - Chuyển đổi vận tốc `speedMps = speedKmhRef.current / 3.6`:
     - Trong vòng lặp `setInterval` của `TEST_AUTO`: Quãng đường tăng thêm mỗi tick là `seconds * speedMps`.
     - Trong điều khiển `TEST_JOYSTICK`: Vận tốc đẩy xe di chuyển là `speedMps`.
   - Xuất khẩu `speedKmh`, `increaseSpeed`, `decreaseSpeed` trong return object của hook.
2. **`TripNavigationControls`** ([trip-navigation-controls.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/components/trip-navigation-controls.tsx)):
   - Bổ sung Props: `speedKmh?: number; onIncreaseSpeed?: () => void; onDecreaseSpeed?: () => void;`.
   - Khi `testMode === true` và xe đang có chế độ di chuyển (`!!p.mode`): Hiển thị thanh điều chỉnh tốc độ gọn gàng:
     - Nút giảm `[−]`: Tự động mờ khi tốc độ $\le 10$ km/h (`speedBtnDisabled`).
     - Nhãn hiển thị: `30 km/h`.
     - Nút tăng `[+]`: Tự động mờ khi tốc độ $\ge 120$ km/h (`speedBtnDisabled`).
   - Sử dụng đúng bảng màu thương hiệu: Primary `#FFCB56`, Card `#FFFFFF`, Border `#E2E8F0`, Text `#1E293B`.
3. **`MobileTripDetailScreen`** ([app/trip/[id].tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/trip/[id].tsx)):
   - Kết nối `speedKmh={engine.speedKmh}`, `onIncreaseSpeed={engine.increaseSpeed}`, `onDecreaseSpeed={engine.decreaseSpeed}` vào component `TripNavigationControls`.
4. **`trip-navigation.test.ts`** ([trip-navigation.test.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/scripts/trip-navigation.test.ts)):
   - Bổ sung bài kiểm tra đơn vị: Xác minh tốc độ khởi tạo 30 km/h, giới hạn kẹp [10 km/h, 120 km/h], bước nhảy 10 km/h và tỷ lệ co giãn quãng đường di chuyển chuẩn xác.

---

## 4. Phân tích nguyên nhân gốc & Quyết định kỹ thuật
- **Nhu cầu thực tế**: Tuyến đường đưa đón học sinh dài 7 đến 10km. Ở tốc độ thực tế trong phố (~25-30 km/h), tài xế/PO mất hơn 20 phút để xe mô phỏng chạy hết chuyến. Việc có nút tăng tốc lên 60, 80, 100 hay 120 km/h giúp hoàn tất việc kiểm thử toàn bộ các trạm dừng và điểm danh chỉ trong 2-4 phút.
- **Tại sao chọn Stepper `[−]` `[+]` (Phương án B)**:
  - Dễ thao tác bằng một ngón tay cái mà không chiếm diện tích màn hình bản đồ.
  - Người dùng có thể chỉnh nhuyễn từ chậm (10-20 km/h để xem xe vào cua ngõ hẹp) đến nhanh (60-120 km/h khi chạy đường lộ dài).
  - Tránh các thanh trượt (slider) dễ gây giật lag hoặc vô tình quẹt trúng bản đồ Leaflet bên dưới.

---

## 5. Bảo vệ baseline & Chống hồi quy
- **Bảo vệ chế độ LIVE**: Môi trường LIVE hoàn toàn không hiển thị thanh chỉnh tốc độ ảo; tốc độ xe được ghi nhận trung thực từ GPS thiết bị.
- **Bảo vệ Lái thủ công (Joystick)**: Khi tốc độ mô phỏng tăng lên, joystick cũng lướt nhanh hơn tương ứng; khi buông tay khỏi joystick, tốc độ lập tức về 0 và xe dừng tại chỗ an toàn.
- **Bảo vệ vệt đường hai màu**: Việc tăng tốc độ không làm đứt đoạn hay mất vệt đường xám đã đi.

---

## 6. Tuân thủ Test Data Policy (Test Data Policy Compliance)
- Toàn bộ tính năng là logic client simulation trong môi trường TEST.
- Tuyệt đối không can thiệp schema, không ghi dữ liệu giả vào cơ sở dữ liệu production.

---

## 7. Đồng bộ Swagger & DTO
- Không có thay đổi ở tầng Backend API / DTOs.
- Hợp đồng API giữ nguyên vẹn 100%.

---

## 8. Kết quả kiểm chứng (Verification Results)

### A. Kiểm tra Unit Test
- **API Module (`vitest run --run src/trips`)**: **94/94 tests PASS**.
- **Mobile Module (`node --test`)**: **46/46 tests PASS** (gồm test mới về bộ điều chỉnh tốc độ).

### B. Kiểm tra Typecheck (Read-only)
- `mobile`: `npx tsc --noEmit` $\rightarrow$ **PASS (0 errors)**.
- `api`: `npx tsc --noEmit` $\rightarrow$ **PASS (0 errors)**.
- `web`: `npx tsc --noEmit` $\rightarrow$ **PASS (0 errors)**.

---

## 9. Ma trận phân quyền & Bảo mật
- Bộ điều khiển tốc độ chỉ hiển thị cho tài xế (`DRIVER`) trong môi trường `TEST`.
- Giáo viên và Phụ huynh theo dõi tiến trình di chuyển mượt mà thông qua telemetry được cập nhật với tốc độ mới.

---

## 10. Tác động Database
- **Schema**: 0 thay đổi.
- **Migrations**: 0 migrations.
- **Database Records**: Không can thiệp DB.

---

## 11. Rủi ro & Biện pháp giảm thiểu
- **Rủi ro**: Tốc độ quá cao (>150 km/h) có thể khiến xe nhảy cóc qua trạm dừng trong 1 tick.
  - **Biện pháp giảm thiểu**: Giới hạn trần tối đa ở mức an toàn `120 km/h`. Thuật toán `autoPosition` tính toán tọa độ nội suy liên tục dọc theo từng mét của polyline nên không bị mất mát điểm dừng.

---

## 12. Handoff & Trạng thái Runtime
- Mã nguồn đã được hot reload tự động trên ứng dụng Mobile đang chạy.
- Trên màn hình chi tiết chuyến xe của Tài xế: Khi bấm **[Tự động di chuyển]** hoặc **[Lái thủ công]**, hàng điều chỉnh `Tốc độ mô phỏng: [−] 30 km/h [+]` sẽ xuất hiện ngay phía dưới.

---

## 13. Đề xuất bước tiếp theo duy nhất
**Product Owner mở màn hình chuyến xe `Tuyến Về 01 (36B52942)` trên ứng dụng Mobile:**
> Bấm **[Tự động di chuyển]** và chạm vào nút **`[+]`** để tăng tốc độ lên 60, 80 hoặc 100 km/h, quan sát xe buýt di chuyển nhanh hơn dọc theo tuyến đường và vệt xám kéo dài mượt mà theo sau xe.
