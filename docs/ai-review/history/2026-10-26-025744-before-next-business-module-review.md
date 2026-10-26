# Báo cáo AI Review: Chuyển Trạm Điều hướng Tự động khi Đi qua Điểm dừng trong 100m

## 1. Thông tin chung
- **Thời gian hoàn thành**: 2026-10-26T02:51:30+07:00
- **Tác vụ**: ROADTOSCHOOL — 100M STOP PASSING DETECTION & SEAMLESS WAYPOINT ADVANCE
- **Trạng thái**: COMPLETED (Sẵn sàng nghiệm thu runtime bởi PO)
- **Chế độ thực hiện**: IMPLEMENTATION (Theo phê duyệt trực tiếp của Product Owner qua lựa chọn khuyến nghị: *"Tự động chuyển ngay khi xe đi qua điểm dừng trong phạm vi 100m, không bắt dừng xe 2.5s, nâng ngưỡng API lên 100m"*)
- **Bảo vệ uncommitted work**: Bảo toàn toàn bộ uncommitted changes của PO và các tiến trình nền (`api`, `web`, `mobile`).

---

## 2. Mục tiêu & Phạm vi
Khắc phục triệt để tình trạng xe buýt đã di chuyển vượt qua trạm dừng nhưng thanh chỉ dẫn và hệ thống vẫn giữ nguyên trạm cũ:
1. **Phát hiện xe đi qua trạm**: Khi xe đã đi qua trạm dừng (`progress >= targetStopProgress`) và khoảng cách tới trạm $\le 100\text{m}$, hoặc xe đã đến trạm ($\le 30\text{m}$), hoặc xe đã vượt qua trạm và đang tiến gần về trạm kế tiếp hơn, hệ thống tự động gọi `ADVANCE` sang trạm tiếp theo.
2. **Loại bỏ bộ đếm dừng xe 2.5s**: Không bắt buộc xe phải đứng yên 2.5 giây mới chuyển điểm. Xe đang chạy ở tốc độ 30 - 120 km/h sẽ chuyển trạm mượt mà như Google Maps / VietMap khi lướt qua điểm dừng.
3. **Nâng ngưỡng xác thực Backend**: Mở rộng dung sai khoảng cách của API `POST /trips/:id/navigation/segment` (`action: ADVANCE`) từ 30m lên 100m, đồng thời chấp nhận lệnh nếu xe đã vượt qua trạm hiện tại và đang tiến gần về trạm tiếp theo.

---

## 3. Thay đổi chi tiết theo tầng kiến trúc

### A. Mobile Client (`mobile/`)
1. **`useTripNavigation`** ([use-trip-navigation.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts)):
   - Khắc phục lỗi đo khoảng cách `distanceRemaining`: Trước đây kiểm tra `(current.cumulative.at(-1) ?? 0) - current.progress <= 25`. Khi chuyển sang đa chặng (multi-stop route), giá trị này là khoảng cách đến tận trạm cuối cùng (cách 7km), khiến điều kiện đến trạm intermediate không bao giờ thỏa mãn.
   - Thay thế bằng việc chiếu tọa độ trạm dừng hiện tại lên hình học tuyến đường (`projectProgress(coords, cumulative, targetCoord)`).
   - Kiểm tra logic đi qua:
     ```typescript
     const targetCoord = coordinate(target);
     const distToTarget = distance(p, targetCoord);
     const targetProg = projectProgress(current.coords, current.cumulative, targetCoord, 0, Infinity).progress;
     const passed = current.progress >= targetProg;
     const nextTarget = stopsRef.current.find((s, i) => {
       const currIdx = stopsRef.current.findIndex(x => x.id === target.id);
       return i > currIdx && distance(coordinate(s), targetCoord) > 1;
     });
     const closerToNext = nextTarget ? distance(p, coordinate(nextTarget)) < distToTarget : false;
     if ((distToTarget <= 100 && (passed || distToTarget <= 30)) || (passed && (distToTarget <= 150 || closerToNext))) {
       shouldAdvance = true;
     }
     ```
   - Khi `shouldAdvance` đạt điều kiện, gọi `route('ADVANCE', token)` tức thì mà không cần qua bộ đếm thời gian dừng 2.5s.
2. **Bộ Unit Tests** ([trip-navigation.test.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/scripts/trip-navigation.test.ts)):
   - Bổ sung test suite xác thực:
     - Xe cách trạm 200m: không kích hoạt advance sớm.
     - Xe đến trạm ($\le 30\text{m}$): kích hoạt advance.
     - Xe đi qua trạm 50m (trong ngưỡng 100m): kích hoạt advance ngay lập tức.
     - Xe đi qua trạm và hướng về trạm kế tiếp: kích hoạt advance.

### B. Backend API (`api/`)
1. **`TripNavigationService`** ([trip-navigation.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trip-navigation.service.ts)):
   - Trong phương thức `segment()` với `dto.action === 'ADVANCE'`:
     - Nâng ngưỡng xác thực `distToCurrent` từ `30m` lên `100m`.
     - Cho phép chấp nhận lệnh `ADVANCE` nếu xe đã vượt qua trạm hiện tại và đang ở gần trạm kế tiếp hơn (`closerToNext`).
     ```typescript
     const reached = trip.route.stops[index];
     const nextTarget = trip.route.stops.find((stop, i) => i > index && metresBetween(reached, stop) > 1);
     const distToCurrent = metresBetween(dto.position, reached);
     const closerToNext = nextTarget ? metresBetween(dto.position, nextTarget) < distToCurrent : false;
     if (distToCurrent > 100 && !closerToNext) throw new ConflictException('Chưa đến điểm tiếp theo');
     state.targetStopId = nextTarget?.id ?? null;
     ```
2. **Bộ Unit Tests** ([trip-navigation.spec.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trip-navigation.spec.ts)):
   - Bổ sung test case xác thực API `segment` với action `ADVANCE` chấp nhận vị trí xe cách trạm 77m (trong ngưỡng 100m) và cập nhật `targetStopId` sang trạm tiếp theo thành công.

### C. Web Admin (`web/`)
- Không có thay đổi, giữ nguyên tính đồng bộ của bản đồ giám sát và không phát sinh regression.

---

## 4. Phân tích nguyên nhân gốc rễ (Root Cause Analysis)
1. **Xung đột giữa Multi-stop Route và phép đo cũ**:
   - Khi nâng cấp vẽ trọn vẹn tuyến đường A $\rightarrow$ B $\rightarrow$ C $\rightarrow$ D, `cumulative.at(-1)` là tổng độ dài đến điểm kết thúc cuối cùng (hơn 10km).
   - Đoạn mã cũ dùng `(current.cumulative.at(-1) - current.progress) <= 25m` để kiểm tra đến trạm. Do đó, tại trạm 2 (cách điểm cuối ~7km), điều kiện này **vĩnh viễn trả về false**.
2. **Bộ đếm dừng 2.5s ngăn cản xe đang chạy**:
   - `arrivedSince >= 2500ms` yêu cầu xe phải ở trong bán kính 30m liên tục 2.5 giây.
   - Khi xe chạy ở tốc độ 50 km/h (~14 m/s), xe lướt qua vùng 30m trong chưa đầy 2 giây nên không bao giờ tích lũy đủ 2.5s.
3. **Ngưỡng chặn Backend quá hẹp (30m)**:
   - Backend ném lỗi 409 Conflict nếu khoảng cách $> 30\text{m}$. Nếu client thử gọi ADVANCE khi xe vừa lướt qua 40m, server sẽ từ chối.

---

## 5. Xử lý ca biên & kiểm soát rủi ro
1. **Xe chạy tốc độ cao (100 - 120 km/h)**: Với cơ chế `passed && (distToTarget <= 150 || closerToNext)`, ngay cả khi một tick nhảy xa 20-30m, hệ thống vẫn nhận diện được xe đã qua trạm và chuyển tiếp trơn tru.
2. **Khôi phục chuyến đang chạy hiện tại của PO**: Chuyến đi PO đang test hiện tại (xe đã đi qua trạm 2 và đang hướng tới trạm 3) sẽ tự động nhận diện `closerToNext = true` và chuyển sang trạm 3 ngay khi ứng dụng cập nhật mà không bị kẹt ở lỗi 409.
3. **Tránh nhảy cóc trạm sớm**: Khi xe ở khoảng cách xa (>100m) và chưa đi qua trạm (`passed = false`), cờ `shouldAdvance` không bao giờ bật, đảm bảo chỉ dẫn dẫn đường tới đúng trạm đó.

---

## 6. Quyết định kỹ thuật & đánh đổi
- **Chiếu tọa độ điểm dừng lên tuyến đường thay vì chỉ đo khoảng cách Euclidean**:
  - Đo khoảng cách Euclidean tròn 100m có thể gây chuyển sớm nếu đường đi vòng vèo gần trạm khi chưa tới. Bằng việc kết hợp `current.progress >= targetProg`, hệ thống biết chính xác xe đã vượt qua vị trí trạm trên mặt đường hay chưa.
- **Giữ cờ `routeBusy.current` để chống gọi trùng lặp**:
  - Không dùng dwell timer nhưng vẫn được bảo vệ chống spam API nhờ cờ `routeBusy` và cơ chế token generation.

---

## 7. Đánh giá tính khả thi kiểm thử tự động
- Đã bổ sung unit tests độc lập tại cả `mobile` và `api`:
  - `mobile/scripts/trip-navigation.test.ts`: Kiểm tra toàn bộ 4 trường hợp (cách xa 200m, đến gần 30m, lướt qua 50m, lướt qua hướng tới trạm sau).
  - `api/src/trips/trip-navigation.spec.ts`: Kiểm tra API chấp nhận vị trí 77m.
- Không cần database seeding giả mạo, tuân thủ 100% Test Data Policy.

---

## 8. Kết quả kiểm chứng an toàn (Safe Verification Results)
- **Mobile Client**:
  - `node --test scripts/trip-navigation.test.ts`: **33/33 tests PASS**
  - `npx tsc --noEmit`: **PASS (0 errors)**
- **Backend API**:
  - `npm test -- --run src/trips`: **95/95 tests PASS**
  - `npx tsc --noEmit`: **PASS (0 errors)**
- **Web Admin**:
  - `npx tsc --noEmit`: **PASS (0 errors)**

---

## 9. Trạng thái Runtime & Giới hạn môi trường
- Cả 3 tiến trình dev server (`api: 3000`, `web: 3001`, `mobile Expo`) đang chạy ổn định và đã hot-reload mã mới.
- Thiết bị thử nghiệm của PO có thể tiếp tục thao tác trên màn hình Driver mà không cần khởi động lại app.

---

## 10. Tuân thủ Quy tắc & Chính sách
- **Test Data Policy**: Tuyệt đối không sinh dữ liệu test giả trong DB.
- **Git Discipline**: Không thực hiện git commit, git push hay git reset.
- **Swagger Documentation**: Các DTOs và Swagger endpoints không thay đổi chữ ký, tương thích hoàn toàn.
- **STOP-AFTER-TASK Rule**: Dừng lại sau khi nộp báo cáo và chờ PO kiểm thử.

---

## 11. Trạng thái Handoff & Tích hợp
- File diff chi tiết nhiệm vụ: [docs/ai-review/LATEST.diff](docs/ai-review/LATEST.diff).
- File snapshot báo cáo trước đó: [docs/ai-review/history/2026-10-26-0240-simulation-speed-adjustment.md](docs/ai-review/history/2026-10-26-0240-simulation-speed-adjustment.md).

---

## 12. Hướng dẫn kiểm thử cho Product Owner
1. **Kiểm tra trên màn hình Tài xế (Driver)**:
   - Mở màn hình chuyến đi đang chạy (`IN_PROGRESS`).
   - Bấm **Lái thủ công** hoặc **Tự động di chuyển**.
   - Quan sát khi xe di chuyển đến gần hoặc vượt qua trạm dừng (ví dụ Trạm 2):
     - Ngay khi xe lướt qua trạm dừng trong phạm vi 100m, ô thông tin trên cùng chuyển từ *"Điểm tiếp theo: Phạm Nhật Lung Linh"* sang trạm tiếp theo (*"Origami - S6 Vinhome Grand Park"*).
     - Chỉ dẫn rẽ (TBT guidance) cập nhật theo chặng đường mới.
     - Vệt đường đã đi tiếp tục nối dài màu xám, đoạn còn lại giữ màu xanh dương.
2. **Kiểm tra ở các mức tốc độ khác nhau**:
   - Bấm nút `[+]` tăng tốc lên 50 - 80 km/h: xác nhận xe lướt qua trạm vẫn tự động chuyển điểm mượt mà, không bị kẹt.

---

## 13. Đề xuất một bước tiếp theo duy nhất
Kính mời Product Owner kiểm thử trực tiếp hành vi chuyển trạm tự động trên ứng dụng Mobile và phản hồi trải nghiệm thực tế.
