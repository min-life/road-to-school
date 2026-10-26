# Báo cáo AI Review: Khắc phục Route Validation & Bổ sung Controlled Retry trên Trip Đang chạy

## 1. Thông tin chung
- **Thời gian hoàn thành**: 2026-10-26T01:52:00+07:00
- **Tác vụ**: ROADTOSCHOOL — FIX ROUTE VALIDATION & CONTROLLED RETRY: Khôi phục định tuyến trên Trip đã IN_PROGRESS
- **Trạng thái**: COMPLETED (Sẵn sàng nghiệm thu runtime bởi PO)
- **Chế độ thực hiện**: IMPLEMENTATION (Theo phê duyệt trực tiếp của Product Owner)
- **Bảo vệ uncommitted work**: Bảo toàn toàn bộ uncommitted changes của PO và các tiến trình nền (`api`, `web`, `mobile`).

---

## 2. Mục tiêu & Phạm vi
1. **Mục tiêu cốt lõi**:
   - Khắc phục lỗi `ROUTING_UNAVAILABLE` do Backend loại bỏ dữ liệu hợp lệ từ VietMap.
   - Khôi phục định tuyến ngay trên chuyến xe thực tế đang `IN_PROGRESS` (chuyến `"Tuyến Về 01 (36B52942)"`) **mà không bắt đầu lại chuyến, không tạo chuyến mới, không reset trạng thái nghiệp vụ**.
   - Thiết lập cơ chế **Controlled Retry** có điều phối tập trung (chỉ 1 timer chờ, exponential backoff, hủy retry ngay khi thành công, không tạo bão request).
   - Hỗ trợ nút **"Thử lại"** rõ ràng cho Driver trên màn hình chi tiết chuyến khi việc lấy tuyến gặp sự cố.
   - Áp dụng nguyên tắc **Origin động**: yêu cầu lấy tuyến luôn đọc vị trí xe tức thời từ GPS/mô phỏng, không đóng băng điểm xuất phát kế hoạch sau khi xe đã di chuyển.

2. **Phạm vi file tác động**:
   - `api/src/trips/vietmap-navigation.service.ts`: Nới lỏng ràng buộc validation của VietMap Directions response.
   - `api/src/trips/trip-navigation.spec.ts`: Bổ sung 3 test cases xác minh validation (geometry 149 điểm - instruction cuối ở 135, rỗng instructions, snap > 100m).
   - `mobile/hooks/use-trip-navigation.ts`: Điều phối controlled retry, dynamic origin dispatch, xóa retry khi thành công, hồi phục route trên Trip `IN_PROGRESS` mà không kích hoạt chuyển động ngoài ý muốn.
   - `mobile/components/trip-navigation-controls.tsx`: Hiển thị lỗi thân thiện (ánh xạ `ROUTING_UNAVAILABLE` thành `"Chưa thể tải tuyến đường"`), bổ sung nút `[Thử lại]`.
   - `mobile/app/trip/[id].tsx`: Kết nối hành động `retry` và cờ `canRetry` vào cụm điều khiển giao diện Driver.
   - `mobile/scripts/trip-navigation.test.ts`: Bổ sung test suite xác minh controlled retry, dynamic origin, stale response isolation, và bảo vệ milestone arrival.

---

## 3. Thay đổi chi tiết theo tầng kiến trúc

### A. Backend API (`api/`)
1. **`VietMapNavigationService.validateDirections`** ([vietmap-navigation.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/vietmap-navigation.service.ts)):
   - **Bỏ điều kiện bắt buộc `previousEnd === coords.length - 1`**: Thừa nhận thực tế dịch vụ VietMap chỉ sinh instructions tại các điểm rẽ quan trọng; đoạn đường thẳng cuối cùng dẫn vào ngõ/điểm dừng thường không có turn instruction và kết thúc trước index cuối của geometry (như trường hợp index 135/148).
   - **Bỏ điều kiện bắt buộc `instructions[0].interval[0] === 0`**: Cho phép instructions bắt đầu linh hoạt, chỉ cần các index tăng dần và nằm trong phạm vi tọa độ hợp lệ.
   - **Cho phép instructions rỗng**: Nếu VietMap trả về mảng instructions rỗng nhưng geometry hợp lệ và khoảng cách/thời gian hợp lệ, route vẫn được chấp nhận vẽ lên bản đồ.
   - **Chuyển Snap Distance > 100m thành Warning log**: Thay vì ném lỗi `BadGatewayException('ROUTING_UNAVAILABLE')`, hệ thống chỉ ghi nhận log cảnh báo độ lệch tọa độ snap (`[route] Snap threshold exceeded...`) và tiếp tục trả về geometry thực tế của provider.
2. **`TripNavigationSpec`** ([trip-navigation.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trip-navigation.spec.ts)):
   - Thêm 3 test cases bao phủ đầy đủ các kịch bản nới lỏng validation trên. Toàn bộ 94/94 tests đều đạt.

### B. Mobile Client (`mobile/`)
1. **`useTripNavigation`** ([use-trip-navigation.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts)):
   - **Controlled Retry Coordination**:
     - `retryTimer`: Đảm bảo chỉ tồn tại tối đa một bộ đếm thời gian retry tại một thời điểm.
     - `retryCount`: Thực hiện exponential backoff (bắt đầu từ 3s, nhân lũy thừa 1.5, tối đa 30s).
     - `cancelRetry()`: Hủy ngay timer chờ và đặt lại `retryCount = 0` khi route thành công, khi người dùng chuyển tab, unmount, hoặc hoàn thành chuyến.
     - `scheduleControlledRetry()`: Chỉ lập lịch khi có lỗi định tuyến và phiên di chuyển đang hợp lệ (`stopsRef >= 2` và `checkpoint.enabled`).
   - **Dynamic Origin**:
     - Thay vì đóng băng `start: coordinate(stopsRef.current[0])`, hàm `route()` và `prepare()` đọc tọa độ thực tế tức thời: ưu tiên `sample.current` (GPS/virtual simulation), tiếp đến `view.position`, và cuối cùng mới là điểm xuất phát nếu xe chưa từng di chuyển.
   - **Trip IN_PROGRESS Recovery**:
     - Trong hook `observe()`, khi phát hiện chuyến xe đang `IN_PROGRESS` mà client chưa có route (`!leg.current`), hệ thống lập tức kích hoạt lấy lại tuyến đường hiện tại mà **không gọi Start Trip lần nữa**.
     - Khi mở lại ứng dụng (reload/reopen), route được nạp ở trạng thái sẵn sàng (prepared) nhưng **không tự động bật chuyển động (Auto timer)** trừ khi phiên trước đó đã ghi nhận di chuyển trong bộ nhớ lưu trữ.
   - **Bảo vệ chống Stale Response**:
     - Sử dụng `activeRouteId` đơn điệu. Phản hồi lỗi từ một request cũ tới muộn không bao giờ kích hoạt retry hay ghi đè lỗi lên một route đã lấy thành công ở thế hệ mới.
2. **`TripNavigationControls` & `[id].tsx`** ([trip-navigation-controls.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/components/trip-navigation-controls.tsx), [app/trip/[id].tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/trip/[id].tsx)):
   - Ánh xạ mã kỹ thuật `ROUTING_UNAVAILABLE` thành câu thông báo thân thiện: `"Chưa thể tải tuyến đường"`.
   - Bổ sung nút **`[Thử lại]`** cạnh thông báo lỗi, cho phép Driver chủ động kích hoạt lấy lại tuyến đường ngay lập tức mà không cần bấm Bắt đầu chuyến lại.
3. **`trip-navigation.test.ts`** ([trip-navigation.test.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/scripts/trip-navigation.test.ts)):
   - Bổ sung 7 bài kiểm tra độc lập (pure in-memory unit tests) xác thực toàn bộ các quy tắc điều phối retry, dynamic origin, phân lập generation cũ, và phòng chống kích hoạt arrival milestone ảo khi hết geometry sớm.

---

## 4. Phân tích nguyên nhân gốc & Quyết định kỹ thuật

### A. Tại sao VietMap trả HTTP 200 mà Backend lại báo `ROUTING_UNAVAILABLE`?
- **Nguyên nhân kỹ thuật**:
  - Dữ liệu VietMap v4 Route trả về cho chặng trường học đến điểm dừng đầu tiên của chuyến `Tuyến Về 01 (36B52942)` gồm 149 điểm tọa độ (index từ 0 đến 148).
  - VietMap cung cấp 14 turn instructions. Instruction thứ 14 (cuối cùng) là chỉ dẫn `"Kết thúc!"` với khoảng `interval: [135, 135]`. Đoạn 13 tọa độ còn lại (135 đến 148) là đoạn đường thẳng đi vào hẻm/khu vực nhà học sinh nên VietMap không phát sinh thêm chỉ dẫn rẽ.
  - Bộ kiểm tra cũ trong `VietMapNavigationService.validateDirections` áp đặt quy tắc cứng nhắc: `previousEnd === coords.length - 1`. Do `135 !== 148`, service đã ném ngoại lệ `BadGatewayException('ROUTING_UNAVAILABLE')` và vứt bỏ toàn bộ 7.21km đường đi hợp lệ.
  - Ngoài ra, việc snap distance từ điểm dừng đến đường xe chạy vượt 100m cũng từng bị chặn lỗi cứng thay vì chấp nhận vị trí snap tối ưu của nhà cung cấp bản đồ.
- **Quyết định đã duyệt & triển khai**:
  - Giữ lại các kiểm tra an toàn: tính toàn vẹn của tọa độ (finite number, bounds Việt Nam), khoảng cách/thời gian hợp lệ, interval chỉ dẫn không vượt ngoài mảng tọa độ và không đảo ngược thứ tự.
  - Loại bỏ hoàn toàn điều kiện ép instruction cuối phải chạm đúng điểm cuối `coords.length - 1`.
  - Chuyển ngưỡng snap 100m thành log cảnh báo để chẩn đoán, không dùng làm điều kiện loại bỏ tuyến đường.

### B. Cơ chế khôi phục định tuyến trên Trip đã IN_PROGRESS
- **Trạng thái thực tế**:
  - Chuyến xe đã được PO bấm Bắt đầu chuyến, DB đã ghi nhận `status: 'IN_PROGRESS'`.
  - Session điều hướng của Driver đã được cấp `ownerSessionId` và `runId`.
- **Giải pháp**:
  - Tuyệt đối không yêu cầu người dùng bấm lại Bắt đầu chuyến (gọi lại API start trip sẽ bị từ chối hoặc tạo xung đột nghiệp vụ).
  - Màn hình Mobile khi focus hoặc khi Driver bấm **"Thử lại"** sẽ giữ nguyên session hiện tại, kiểm tra `targetStopId` hiện hành của chặng đường và gọi thẳng `navigationApi.route(...)` với origin đọc tức thời từ xe.
  - Ngay khi nhận được route hợp lệ, Mobile hook nạp geometry vào `leg.current`, chuyển trạng thái hiển thị sang polyline xanh dương/xám, và giải phóng thông báo lỗi.

---

## 5. Bảo vệ baseline & Chống hồi quy
- **Bảo vệ Lái thủ công (Manual Joystick)**:
  - Giữ nguyên toàn bộ logic tính toán vector di chuyển theo góc quay và tốc độ độc lập của joystick trong `utils/trip-navigation.ts` và `use-trip-navigation.ts`.
  - Khi xe đang ở chế độ Manual, việc tải hoặc retry tuyến đường diễn ra ngầm; không làm gián đoạn hay đóng băng vị trí xe đang điều khiển.
- **Bảo vệ nghiệp vụ Điểm danh & Tiến trình chuyến (Attendance & Operation)**:
  - Việc chấp nhận route có instructions kết thúc sớm không đồng nghĩa với việc xác nhận đã đến điểm dừng.
  - Tiêu chí kích hoạt "Đã đến nơi" (Arrival Milestone) tiếp tục phụ thuộc vào khoảng cách thực tế giữa xe và tọa độ trạm dừng (`distance <= 30m` duy trì $\ge 2.5s$), hoàn toàn không dựa vào việc hết geometry hay gặp instruction cuối.
  - Giữ nguyên luồng Điểm danh lên xe (Boarding), Xác nhận đến trường (Arrival), Học sinh xuống xe (Alighting) và Hoàn thành chuyến.

---

## 6. Tuân thủ Test Data Policy (Test Data Policy Compliance)
- **Tuyệt đối không vi phạm**:
  - Không tạo học sinh giả, xe giả, tài xế giả hoặc chuyến đi mẫu trong database.
  - Không gọi mutation API có tác dụng phụ để test ghi đè dữ liệu.
  - Toàn bộ các kịch bản kiểm thử được thiết kế dưới dạng **Pure In-memory Unit Tests** sử dụng mock provider và fixture dữ liệu độc lập.

---

## 7. Đồng bộ Swagger & DTO
- Contract API của `/api/trips/:id/navigation/route` và `/api/trips/:id/navigation/session` được giữ nguyên vẹn (DTO đầu vào và đầu ra không thay đổi trường).
- Thay đổi nằm ở tầng logic kiểm duyệt dữ liệu trả về từ VietMap upstream bên trong `VietMapNavigationService`.
- Swagger decorators tại `api/src/trips/trip-navigation.controller.ts` vẫn đồng bộ 100%.

---

## 8. Kết quả kiểm chứng (Verification Results)

### A. Kiểm tra Unit Test
1. **API Module (`vitest run --run src/trips`)**:
   - `src/trips/trip-navigation.spec.ts`: **37/37 tests PASS** (gồm 3 tests mới về VietMap validation).
   - `src/trips/trip-synchronization.spec.ts`: **30/30 tests PASS**.
   - `src/trips/trips.service.spec.ts`: **17/17 tests PASS**.
   - `src/trips/utils/trip-time.util.spec.ts`: **10/10 tests PASS**.
   - **Tổng cộng API**: **94/94 tests PASS** (4 test files).
2. **Mobile Module (`node --test`)**:
   - `scripts/trip-navigation.test.ts`: **27/27 tests PASS** (gồm 7 tests mới về controlled retry, dynamic origin, recovery).
   - `scripts/trip-state-synchronization.test.ts`: **7/7 tests PASS**.
   - `scripts/trip-status-label.test.ts`: **7/7 tests PASS**.
   - **Tổng cộng Mobile**: **41/41 tests PASS** (3 test files).

### B. Kiểm tra Typecheck (Read-only)
- `mobile`: `npx tsc --noEmit` -> **Exit Code 0 (0 errors)**.
- `api`: `npx tsc --noEmit` -> **Exit Code 0 (0 errors)**.
- `web`: `npx tsc --noEmit` -> **Exit Code 0 (0 errors)**.

---

## 9. Ma trận phân quyền & Bảo mật
- Quyền truy cập API điều hướng và lấy tuyến đường được kiểm tra chặt chẽ bởi `TripRoleGuard`:
  - `DRIVER`: Được gán cho chuyến xe mới có quyền tạo session, lấy tuyến đường điều hướng, và gửi tọa độ xe.
  - `PARENT` / `SCHOOL_ADMIN`: Chỉ có quyền đọc vị trí xe và trạng thái chuyến xe (read-only).
- Không có bất kỳ sự nới lỏng nào về bảo mật hay phân quyền trong bản vá này.

---

## 10. Tác động Database
- **Schema**: Không có thay đổi trong `prisma/schema.prisma`.
- **Migrations**: Không phát sinh migration mới.
- **Records**: Không ghi đè hay thay đổi cấu trúc dữ liệu trong database.

---

## 11. Rủi ro & Biện pháp giảm thiểu
- **Rủi ro**: Nếu nhà mạng hoặc VietMap bị gián đoạn kéo dài, client có thể gọi retry liên tục làm cạn kiệt pin hoặc quota.
  - **Biện pháp giảm thiểu**: Cơ chế Controlled Retry áp dụng exponential backoff với mức trần 30s và chỉ kích hoạt khi màn hình đang active. Đồng thời, nút "Thử lại" giúp tài xế chủ động kích hoạt khi có mạng trở lại mà không tạo request ngầm vô tận.

---

## 12. Handoff & Trạng thái Runtime
- Bản vá đã được cập nhật trực tiếp vào mã nguồn và các tiến trình dev server (`api` và `mobile`) đã tự động nạp mã mới (hot reload).
- Chuyến xe `Tuyến Về 01 (36B52942)` đang ở trạng thái `IN_PROGRESS` trên thiết bị/trình giả lập của PO sẽ lập tức nhận được tuyến đường ngay khi màn hình chi tiết chuyến được focus lại hoặc khi PO chạm vào nút **"Thử lại"**.

---

## 13. Đề xuất bước tiếp theo duy nhất
**Product Owner kiểm tra trực tiếp màn hình chuyến xe `Tuyến Về 01 (36B52942)` trên ứng dụng Mobile:**
- Nhấn nút **"Thử lại"** (hoặc vuốt nhẹ / quay lại màn hình chi tiết chuyến) để ứng dụng tải lại tuyến đường VietMap 7.21km và xác nhận đường polyline màu xanh dương hiển thị đầy đủ trên bản đồ mà không cần bắt đầu lại chuyến đi.
