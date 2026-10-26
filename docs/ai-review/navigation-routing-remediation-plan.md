# KẾ HOẠCH KHẮC PHỤC TRIỆT ĐỂ MOBILE NAVIGATION & ROUTING
## ROADTOSCHOOL V2.0 — NAVIGATION & ROUTING REMEDIATION PLAN

> **Trạng thái**: IMPLEMENTED & VERIFIED (Đã hoàn tất triển khai và kiểm chứng an toàn theo phê duyệt và hiệu chỉnh của Product Owner tại phiên 2026-10-26).  
> **Cam kết**: Tuyệt đối tuân thủ Test Data Policy (không tạo dữ liệu giả, không chạm DB nghiệp vụ, không seed), không thay đổi Prisma schema/migration, bảo vệ thuật toán Manual.

---

## 1. Bối cảnh & Mục tiêu

Sau khi xem xét thực tế vận hành trên Mobile trong môi trường TEST, Product Owner (PO) ghi nhận 5 vấn đề trải nghiệm người dùng cốt lõi (P1–P5). 

Nhiệm vụ của kế hoạch này là:
1. Đối chiếu nguồn sự thật trong source code thực tế để xác định chính xác các điểm nghẽn, race condition và lỗi logic gây ra 5 vấn đề trên.
2. Lập kế hoạch khắc phục tối thiểu, đúng trọng tâm kỹ thuật, bảo vệ thuật toán Manual đã hoạt động ổn định và tuân thủ tuyệt đối các nguyên tắc an toàn dữ liệu và kiến trúc của repository.

---

## 2. Ma trận Yêu cầu (P1 — P5)

| Mã | PO quan sát thực tế | Hành vi PO mong muốn | Hiện trạng trong Source Code | Khoảng cách cần khắc phục | Tiêu chí nghiệm thu (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P1** | Sau khi Bắt đầu chuyến, vẫn hiển thị planned polyline; không thấy tuyến điều hướng VietMap. | Ẩn planned polyline khỏi bản đồ điều hướng chính sau khi Start Trip thành công. Chỉ hiển thị geometry điều hướng hợp lệ từ VietMap. Khi chưa có route, hiển thị trạng thái chờ, không dùng planned line thế mạng. | `mobile/app/trip/[id].tsx:372` tính `hidePlanned = hasActiveRoute && !showPlanned`. Khi route chưa kịp nạp (`hasActiveRoute = false`), planned polyline `#2563EB` tiếp tục xuất hiện trên map. `handleStartTrip` gọi `prepare()` nhưng bị `remote.current?.canPublish` chặn do race condition. | Tách trạng thái `isInActiveTrip` (`status === 'IN_PROGRESS'`) để ẩn planned polyline ngay lập tức sau khi Start Trip thành công (trừ khi bật "Tham chiếu"). Sửa triệt để race condition khi khởi tạo navigation. | 1. Khi Start Trip thành công, planned polyline biến mất ngay khỏi bản đồ điều hướng mặc định.<br>2. Bản đồ hiển thị rõ trạng thái đang tải tuyến đường nếu VietMap chưa trả lời.<br>3. Tuyến VietMap mới là polyline duy nhất điều hướng xe.<br>4. Planned line chỉ xuất hiện khi bấm nút "Tham chiếu". |
| **P2** | Không thấy phân biệt hai màu đoạn đã đi và đoạn chưa đi. | Đoạn đã đi: màu xám (`#94A3B8`). Đoạn còn lại: màu xanh dương (`#2563EB`). Tiếp giáp liền mạch tại projected progress của xe. Không tô xám đường chưa đi. Giữ progress khi chuyển chặng/reroute. | `mobile/utils/trip-navigation.ts:46` đã có `splitSegment()`. Tuy nhiên do P1 bị nghẽn (route VietMap chưa bao giờ nạp thành công vào Leaflet WebView), `engine.traveled` và `engine.remaining` luôn rỗng `[]`, khiến map chỉ vẽ planned polyline đơn sắc cũ. | Khi VietMap route được nạp thành công: WebView vẽ `traveledLine` (xám) và `remainingLine` (xanh dương). Khi xe di chuyển, tọa độ chia cập nhật theo tiến độ thực tế của xe. | 1. Xe vừa xuất phát: toàn bộ tuyến màu xanh dương (0m xám).<br>2. Xe di chuyển: vết sau đuôi xe biến thành màu xám, đoạn trước mũi xe giữ màu xanh dương.<br>3. Hai đoạn chạm nhau chính xác tại tọa độ xe (không có khe hở, không đè lấn).<br>4. Khi reroute hoặc chuyển chặng: tuyến mới bắt đầu 100% màu xanh, không tô xám nhầm đường mới. |
| **P3** | Bấm "Tự động di chuyển" trong TEST nhưng xe không tự di chuyển. | Auto tự động lăn bánh dọc theo geometry VietMap thật, cập nhật marker, progress, guidance và vết chia màu. Đến điểm dừng chuyển chặng đúng thứ tự. Chưa có route thì dừng chờ, không chạy đường thẳng. | `mobile/hooks/use-trip-navigation.ts:249` kiểm tra `if (current && !routeBusy.current)`. Khi `leg.current` rỗng (do race condition khởi tạo hoặc lỗi 429), hoặc khi `routeBusy.current` bị kẹt ở `true` (do generation race trong `finally`), Auto bị đóng băng hoàn toàn. Đồng thời `current.travelled` bị lệch khi chuyển từ Manual sang Auto. | 1. Đảm bảo `prepare()` nạp được `leg.current` ban đầu.<br>2. Giải phóng `routeBusy` đúng vòng đời.<br>3. Đồng bộ `travelled` bằng `progress` thực tế của xe khi chuyển từ Manual sang Auto. | 1. Bấm "Tự động di chuyển", xe di chuyển mượt mà dọc theo các khúc cua của tuyến đường thật với tốc độ ~8m/s (hoặc cấu hình).<br>2. Marker xe tiến dần đến stop tiếp theo.<br>3. Vết đường phía sau đổi sang màu xám theo thời gian thực.<br>4. Đến gần điểm dừng ($\le 25\text{m}$), hệ thống ADVANCE sang điểm dừng tiếp theo. |
| **P4** | Manual lái được, lưu được hành trình nhưng khi đi lệch đường không thấy reroute. | Giữ Manual đang hoạt động ổn định. Khi xe lệch current route $> 40\text{m}$ duy trì $\ge 3\text{s}$, kích hoạt request VietMap từ vị trí xe hiện tại $P \rightarrow$ target hiện tại. Nạp geometry và chỉ dẫn mới đồng bộ. Không đổi thứ tự stops. | `use-trip-navigation.ts:166` phát hiện `gap > 40` sau 3s gọi `route('CURRENT', token)`. Tuy nhiên: (1) `routeBusy.current` có thể bị kẹt `true` do generation switch; (2) Server Backend kiểm tra `lastRouteRequestedAt` dính 429; (3) Backend line 183 ném 409 `ConflictException('Chỉ dẫn đã thay đổi')` do concurrency check; (4) Mobile bắt lỗi gom thành "Chưa có chỉ dẫn" mà không cập nhật UI. | 1. Cho phép Manual di chuyển tự do khi reroute đang chạy ngầm.<br>2. Request $P \rightarrow \text{target}$ độc lập, response mới thay thế đồng bộ geometry và instructions.<br>3. Reset `travelled` và `progress` về 0 trên route mới.<br>4. Phân biệt rõ lỗi mạng/quota để retry có kiểm soát thay vì nuốt lỗi. | 1. Lái xe rẽ sang đường khác cách tuyến cũ $> 40\text{m}$ trong $\ge 3\text{s}$.<br>2. Thông báo chuyển sang "Đang lệch tuyến" $\rightarrow$ "Đang cập nhật chỉ dẫn".<br>3. Bản đồ vẽ tuyến đường mới xuất phát từ vị trí xe hiện tại đến điểm dừng kế tiếp.<br>4. Toàn bộ tuyến mới hiển thị màu xanh dương, chỉ dẫn TBT cập nhật theo đường mới. |
| **P5** | Chỉ dẫn (Guidance) gần như không hoạt động. PO nghi ngờ thiếu GPS điện thoại vì đang TEST. | TEST dùng tọa độ mô phỏng làm vị trí đầu vào cho navigation. Cùng một tọa độ điều khiển marker, progress, off-route, reroute và publish. Không đòi hỏi GPS vật lý trong TEST. LIVE tiếp tục dùng GPS thật. | Trong TEST, code đã dùng tọa độ ảo trong `tick()` đưa vào `accept()`. Tuy nhiên do `leg.current` bị null (P1/P3), `accept()` line 147 không bao giờ tính guidance (`guidance` luôn null). Thêm vào đó, nhãn `TripNavigationControls` trước đây phụ thuộc vào server freshness nên nhầm lẫn giữa GPS thật và tọa độ ảo. | 1. Xác lập rõ ràng: TEST mode hoàn toàn độc lập với phần cứng GPS thiết bị.<br>2. Đảm bảo `leg.current` tồn tại để `nextGuidance` sinh chỉ dẫn rẽ/khoảng cách chính xác từ tọa độ mô phỏng.<br>3. Hiển thị card chỉ dẫn rõ ràng trên UI. | 1. Trong TEST (cả Auto lẫn Manual), bảng điều hướng hiển thị rõ hành động tiếp theo: Biểu tượng/chữ (Rẽ trái, Rẽ phải, Đi thẳng) + khoảng cách (mét) + tên đường.<br>2. Khoảng cách đếm lùi chính xác khi xe tiến lại gần ngã rẽ.<br>3. Không bao giờ yêu cầu quyền GPS hay báo lỗi GPS khi đang ở chế độ TEST. |

---

## 3. Phân tích Nguyên nhân Gốc rễ (RCA) với Bằng chứng Source Code

### 3.1. Race Condition giữa `mutate()` và `engine.prepare()` khi Bắt đầu Chuyến
- **Vị trí**: [mobile/app/trip/[id].tsx:411–428](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/trip/[id].tsx#L411-L428) và [mobile/hooks/use-trip-navigation.ts:297–308](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L297-L308)
- **Chuỗi sự kiện gây lỗi**:
  1. Tài xế bấm "Bắt đầu chuyến", modal xác nhận gọi `await mutate(() => mobileApiClient.startTrip(tripId))`.
  2. `mutate` trong [mobile/hooks/use-active-refresh.ts:38](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-active-refresh.ts#L38) gọi `loop.resume()`, khởi chạy fetch ngầm bất đồng bộ (`void execute(true)`).
  3. Ngay sau dòng `await mutate(...)`, code Mobile lập tức gọi `void engine.prepare()`.
  4. Trong `use-trip-navigation.ts:298`:
     ```typescript
     async function prepare() {
       if (busy.current || !remote.current?.canPublish || !foreground.current) return;
       ...
     ```
  5. Tại thời điểm này, `remote.current` vẫn chứa snapshot từ TRƯỚC KHI BẮT ĐẦU CHUYẾN (khi chuyến còn là `SCHEDULED`, `canPublish === false`).
  6. `prepare()` gặp điều kiện `!remote.current?.canPublish` nên **LẬP TỨC RETURN THẦM LẶNG (SILENT EXIT)**!
  7. Không có bất kỳ cơ chế retry nào được kích hoạt. `leg.current` rỗng, `engine.segment` rỗng, `hasActiveRoute` là `false`.
  8. Hệ quả: Bản đồ tiếp tục vẽ planned polyline (P1), không có hai màu (P2), Auto không có dữ liệu chặng để chạy (P3), Guidance không có instructions để hiển thị (P5).
- **Phân loại**: `CONFIRMED_BY_SOURCE` (Bằng chứng 100% rõ ràng từ source code).

---

### 3.2. Rò rỉ trạng thái `routeBusy.current` khiến Routing bị Khóa Vĩnh Viễn
- **Vị trí**: [mobile/hooks/use-trip-navigation.ts:109](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L109) và [mobile/hooks/use-trip-navigation.ts:353](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L353)
- **Chuỗi sự kiện gây lỗi**:
  1. Khi một request định tuyến `route('CURRENT', token)` đang được thực thi trên mạng, người dùng bấm đổi chế độ (ví dụ từ Joystick sang Auto hoặc ngược lại).
  2. Hàm `change()` tại dòng 353 thực hiện `generation.current++`.
  3. Khi request định tuyến cũ hoàn thành và nhảy vào khối `finally`:
     ```typescript
     finally { if (token === generation.current) routeBusy.current = false; }
     ```
  4. Do `token !== generation.current`, lệnh `routeBusy.current = false` **BỊ BỎ QUA HOÀN TOÀN**!
  5. `routeBusy.current` bị kẹt ở giá trị `true` vĩnh viễn!
  6. Tại mọi lần gọi `route()` tiếp theo (dòng 62): `if (routeBusy.current) return;` $\rightarrow$ Tất cả các request định tuyến mới (kể cả reroute khi đi sai đường) đều bị chặn ngay lập tức.
  7. Tại vòng lặp Auto (dòng 249): `if (current && !routeBusy.current)` $\rightarrow$ Auto bị tê liệt, không thể di chuyển.
- **Phân loại**: `CONFIRMED_BY_SOURCE`.

---

### 3.3. Nhảy Tọa độ và Sai lệch Tiến độ khi Chuyển từ Manual sang Auto
- **Vị trí**: [mobile/hooks/use-trip-navigation.ts:172](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L172), [mobile/hooks/use-trip-navigation.ts:232–238](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L232-L238), [mobile/hooks/use-trip-navigation.ts:250](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L250)
- **Chuỗi sự kiện gây lỗi**:
  1. Khi tài xế lái bằng Joystick, xe di chuyển đến tọa độ $P_{local}$, hàm `accept()` tính `current.progress = projection.progress` (ví dụ xe đã đi được 350m dọc tuyến).
  2. Tuy nhiên, biến `current.travelled` (biến dùng riêng cho bộ nội suy Auto tại dòng 250) **KHÔNG ĐƯỢC CẬP NHẬT TRONG MANUAL** và vẫn giữ giá trị cũ (ví dụ 0m).
  3. Khi tài xế bấm nút "Tự động di chuyển", hàm `change('TEST_AUTO')` gọi `activate(state, token)`.
  4. Trong `activate` (dòng 232):
     ```typescript
     const origin = state.latestPosition ?? stopsRef.current[0];
     let p = coordinate(origin);
     setView(v => ({ ...v, position: p }));
     ```
     Biến `origin` đọc từ `state.latestPosition` — tức là **vị trí ghi nhận trên database từ lần publish trước (5–10 giây trước)**, thay vì vị trí thực tế hiện tại của xe trên màn hình! Xe bị "giật lùi" về tọa độ cũ trên server.
  5. Đồng thời, khi vòng lặp Auto bắt đầu chạy (dòng 250): `current.travelled` bắt đầu tăng từ 0m $\rightarrow$ xe bị nhảy giật ngược về điểm xuất phát của chặng!
- **Phân loại**: `CONFIRMED_BY_SOURCE`.

---

### 3.4. Session / Checkpoint: Lỗi Mất Target khi `RESUME` trên Backend
- **Vị trí**: [api/src/trips/trip-navigation.service.ts:104–108](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trip-navigation.service.ts#L104-L108)
- **Chuỗi sự kiện gây lỗi**:
  1. Xem xét logic xác định `targetStopId` trong `TripNavigationService.session()`:
     ```typescript
     const preserve = dto.action === 'SWITCH' && previous?.routeVersion === version && !!previous?.targetStopId;
     const first = trip.route.stops[0];
     const initial = first && ['PARKING_START', 'SCHOOL_DEPARTURE'].includes(first.stopType)
       ? trip.route.stops.find((stop, index) => index > 0 && metresBetween(first, stop) > 1) ?? first : first;
     const targetStopId = preserve ? previous.targetStopId : initial?.id ?? null;
     ```
  2. Nhận thấy: Biến `preserve` CHỈ ĐƯỢC BẬT KHI `dto.action === 'SWITCH'`.
  3. Khi người dùng mở lại app hoặc xoay màn hình, client gửi `dto.action === 'RESUME'`.
  4. Lúc này `preserve === false` $\rightarrow$ `targetStopId` bị reset ngược về `initial?.id` (điểm dừng số 1 của tuyến), ngay cả khi xe đã hoàn thành 5/10 điểm dừng!
  5. Điều này phá vỡ hoàn toàn tính toàn vẹn của phiên điều hướng khi resume.
- **Phân loại**: `CONFIRMED_BY_SOURCE`.

---

### 3.5. Cơ chế Reroute trong Manual bị Nuốt Lỗi hoặc Kẹt Cooldown
- **Vị trí**: [mobile/hooks/use-trip-navigation.ts:161–170](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L161-L170), [mobile/hooks/use-trip-navigation.ts:90–108](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts#L90-L108), và [api/src/trips/trip-navigation.service.ts:183](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trip-navigation.service.ts#L183)
- **Chuỗi sự kiện gây lỗi**:
  1. Trong Manual, khi xe lệch $> 40\text{m}$ duy trì $\ge 3\text{s}$, client gọi `route('CURRENT', token)`.
  2. Tại Backend, hàm `segment()` kiểm tra `state.lastRouteRequestedAt`. Nếu chưa đủ cooldown (3s TEST hoặc 10s LIVE), server trả về 429.
  3. Hoặc tại dòng 183:
     ```typescript
     if (state.targetStopId !== base.targetStopId || state.lastRouteRequestedAt !== request.state.lastRouteRequestedAt)
       throw new ConflictException('Chỉ dẫn đã thay đổi');
     ```
     Nếu có request song song hoặc refresh chạy chen ngang làm thay đổi checkpoint, Backend ném `409 ConflictException`.
  4. Khi Mobile nhận 409 hoặc lỗi upstream từ VietMap, dòng 107 chỉ đơn giản gán `message: 'Chưa có chỉ dẫn'`, KHÔNG cập nhật lại `leg.current`, KHÔNG thông báo rõ lỗi cho người dùng và KHÔNG giải phóng trạng thái `routeBusy` nếu token đã bị lệch.
  5. Người dùng tiếp tục lái xe mà không thấy geometry mới xuất hiện.
- **Phân loại**: `CONFIRMED_BY_SOURCE`.

---

### 3.6. Điều kiện Ẩn Tuyến Dự kiến (`hidePlanned`) chưa Đáp ứng Trạng thái Khởi động
- **Vị trí**: [mobile/app/trip/[id].tsx:372–376](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/trip/[id].tsx#L372-L376)
- **Chuỗi sự kiện gây lỗi**:
  ```typescript
  const hasActiveRoute = !terminal && ((engine.traveled.length > 0) || (engine.remaining.length > 0) || (engine.segment.length > 0));
  const hidePlanned = hasActiveRoute && !showPlanned;
  ```
  - Khi chuyến xe đã bắt đầu (`IN_PROGRESS`), nhưng do bất kỳ lý do nào (đang tải, mạng chậm, lỗi tạm thời) mà `engine.segment` chưa có tọa độ $\rightarrow$ `hasActiveRoute` là `false` $\rightarrow$ `hidePlanned` là `false` $\rightarrow$ Leaflet WebView tự động bật hiển thị planned polyline!
  - Người dùng lầm tưởng đây là tuyến đường điều hướng đang chạy, trong khi thực tế đó là tuyến dự kiến tĩnh ban đầu.
- **Phân loại**: `CONFIRMED_BY_SOURCE`.

---

## 4. Kế hoạch Khắc phục Tối thiểu (Remediation Plan)

### 4.1. Nguyên tắc Bất biến (Design Invariants)
1. **Bảo vệ Manual (Joystick)**: Giữ nguyên 100% thuật toán tính xung chạm ngắn ($\ge 0.8\text{m}$), tính bearing, delta-time và logic di chuyển độc lập của Joystick.
2. **Không gọi VRP/TSP hoặc fallback đường thẳng**: Navigation chỉ gọi $P \rightarrow \text{target}$ kế tiếp; thất bại thì dừng chờ và báo lỗi, không tự nối đường thẳng giả mạo.
3. **Phân tách TEST và LIVE**: TEST dùng tọa độ mô phỏng làm nguồn duy nhất cho vị trí, marker, progress, reroute và publish. Không đòi hỏi quyền hay tín hiệu GPS vật lý trong TEST. LIVE giữ nguyên foreground GPS.
4. **Không side-effects nghiệp vụ tự động**: Điều hướng không bao giờ tự động điểm danh, tự động xác nhận đến trường, hay tự động hoàn thành chuyến xe.
5. **Tối thiểu hóa tác động Database**: Không đổi Prisma schema, không tạo migration, không thêm bảng mới.

---

### 4.2. Trách nhiệm & Chi tiết Files dự kiến Sửa đổi

```text
[Backend API]
  api/src/trips/trip-navigation.service.ts
    ├── Fix 1: Cho phép RESUME bảo toàn targetStopId (preserve = SWITCH || RESUME)
    └── Fix 2: Tinh chỉnh rate limit & xử lý lỗi 409/429 nhất quán

[Mobile Core & Hooks]
  mobile/hooks/use-trip-navigation.ts
    ├── Fix 3: Tháo gỡ race condition trong prepare(): không bị chặn bởi canPublish cũ
    ├── Fix 4: Sửa triệt để rò rỉ routeBusy trong finally (luôn reset khi request kết thúc)
    ├── Fix 5: Đồng bộ current.travelled = current.progress khi chuyển Manual -> Auto
    ├── Fix 6: Không ghi đè position hiện tại bằng position cũ từ DB khi chuyển mode
    └── Fix 7: Xử lý phân loại lỗi routing (400, 401, 403, 409, 429, 502, 503, Timeout)

[Mobile UI & Map Bridge]
  mobile/app/trip/[id].tsx
    ├── Fix 8: Ẩn planned polyline ngay khi status === 'IN_PROGRESS' (kể cả khi route đang tải)
    ├── Fix 9: Thêm state/banner rõ ràng khi route đang tải hoặc gặp lỗi kết nối
    └── Fix 10: Nối Start Trip thành công -> kích hoạt prepare() có retry/guard an toàn

  mobile/components/trip-navigation-controls.tsx
    └── Fix 11: Hiển thị trạng thái định vị chuẩn xác theo TEST (Vị trí mô phỏng) và LIVE (GPS trực tiếp)
```

---

### 4.3. Thứ tự Triển khai (Implementation Phases)

#### Giai đoạn 1: Sửa Backend Session & Target Preservation
1. File: [api/src/trips/trip-navigation.service.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/api/src/trips/trip-navigation.service.ts)
2. Sửa điều kiện `preserve`:
   ```typescript
   const preserve = (dto.action === 'SWITCH' || dto.action === 'RESUME') 
     && previous?.routeVersion === version 
     && !!previous?.targetStopId;
   ```
3. Đảm bảo khi app mở lại hoặc refresh, `targetStopId` đang chạy dở dang của chuyến được giữ nguyên vẹn, không bị đẩy ngược về điểm dừng đầu tiên.

#### Giai đoạn 2: Sửa Navigation Engine Lifecycle & Request Concurrency
1. File: [mobile/hooks/use-trip-navigation.ts](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/hooks/use-trip-navigation.ts)
2. **Khắc phục `prepare()` Race Condition**:
   - `prepare()` không phụ thuộc vào `remote.current?.canPublish` (vốn có thể bị trễ do polling). Thay vào đó, kiểm tra quyền tài xế trực tiếp hoặc cho phép `prepare()` gọi Backend `START` session một cách an toàn.
   - Thêm cờ guard tránh gọi lặp lại nhưng đảm bảo thực thi đúng một lần sau khi Start Trip thành công.
3. **Khắc phục kẹt `routeBusy`**:
   - Trong khối `finally` của `route()`: luôn giải phóng `routeBusy.current = false` để không khóa các request tương lai kể cả khi `generation` đã đổi.
   - Khi `generation` tăng (đổi mode), hủy bỏ (abort) kết quả của request cũ để không ghi đè vào state mới.
4. **Đồng bộ Manual $\rightarrow$ Auto**:
   - Trong `accept()`: Khi xe di chuyển trong Manual, cập nhật `current.travelled = current.progress`.
   - Trong `activate()`: Nếu đã có `leg.current` và vị trí hiện tại trên màn hình, KHÔNG ghi đè tọa độ xe bằng `latestPosition` cũ từ database; chỉ dùng `latestPosition` khi khởi động phiên lần đầu.

#### Giai đoạn 3: UX Bản đồ, Hai Màu Tuyến & Ẩn Tuyến Dự kiến
1. File: [mobile/app/trip/[id].tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/app/trip/[id].tsx)
2. **Cập nhật quy tắc ẩn Planned Polyline**:
   ```typescript
   const isNavigating = !terminal && operationalState?.status === 'IN_PROGRESS';
   const hidePlanned = isNavigating && !showPlanned;
   ```
   Ngay khi chuyến xe `IN_PROGRESS`, planned polyline sẽ ẩn đi. Nếu chặng VietMap đang được tải, hiển thị spinner hoặc dòng chữ "Đang tải tuyến điều hướng...", tuyệt đối không để planned line gây hiểu lầm.
3. **Hai màu tuyến liền mạch**:
   - Duy trì `traveledLine` (xám `#94A3B8`) và `remainingLine` (xanh dương `#2563EB`) qua `splitSegment()`.
   - Khi có reroute mới: reset `progress = 0`, toàn bộ tuyến mới bắt đầu bằng màu xanh dương; xe chạy đến đâu vết xám xuất hiện đến đó.
4. **Nút "Tham chiếu"**:
   - Giữ nút toggle "Tham chiếu" cạnh "Căn giữa" và "Theo xe" để người dùng chủ động xem tuyến kế hoạch khi cần đối chiếu.

#### Giai đoạn 4: Trạng thái & Phân loại Lỗi Routing
1. File: [mobile/components/trip-navigation-controls.tsx](file:///c:/Users/chuon/Documents/work/road-to-school-v2/mobile/components/trip-navigation-controls.tsx)
2. Phân biệt rõ các thông báo:
   - Đang lấy đường: *"Đang cập nhật chỉ dẫn..."*
   - Quá tần suất (429): *"Đang chờ cập nhật chỉ dẫn (thử lại sau Xs)"*
   - Đi lệch đường: *"Đang lệch tuyến — Đang tìm đường mới..."*
   - Lỗi kết nối / Upstream (502, 503, Timeout): *"Chưa thể kết nối VietMap — Đang thử lại..."*
   - Đã đến nơi: *"Đến điểm dừng: [Tên học sinh / Điểm trường]"*

---

## 5. Wireframes Trải nghiệm Người dùng (Dạng Chữ)

### Wireframe 1: Khi Chuyến Xe Vừa Bắt đầu — Đang Tải Tuyến VietMap (Chờ Route)
```text
+-------------------------------------------------------------------+
| [<] Chi tiết chuyến xe                                            |
|                                     [ Tham chiếu ] [ Căn giữa xe ]|
|-------------------------------------------------------------------|
|                                                                   |
|                         [ Marker Điểm đón ]                       |
|                                                                   |
|             (Planned polyline ĐÃ ẨN HOÀN TOÀN)                    |
|                                                                   |
|                         [ Marker Xe Buýt ]                        |
|                                                                   |
+-------------------------------------------------------------------+
| [!] Đang tải tuyến điều hướng từ VietMap...                       |
|     Vị trí xe: Sẵn sàng xuất phát                                 |
| Điểm tiếp theo: Em Nguyễn Văn A (Điểm đón #1)                     |
|-------------------------------------------------------------------|
| [ Tự động di chuyển (Auto) ]   [ Lái thủ công (Manual) ]          |
+-------------------------------------------------------------------+
| === VUỐT LÊN: DANH SÁCH HỌC SINH & ĐIỂM DANH (BOTTOM SHEET) ===  |
+-------------------------------------------------------------------+
```

---

### Wireframe 2: Navigation Hoạt động Bình thường — Hai Màu Tuyến & Chỉ dẫn Rẽ (TBT)
```text
+-------------------------------------------------------------------+
| [<] Chi tiết chuyến xe                                            |
|                                     [ Tham chiếu ] [ Đang bám xe ]|
|-------------------------------------------------------------------|
|                                                                   |
|                       === Tuyến Xanh Dương ===> [ Điểm đón #1 ]   |
|                                   ^                               |
|                         [ Marker Xe Buýt 🚌 ]                     |
|                                   ^                               |
|                       === Tuyến Xám (Đã đi) ===                   |
|                                                                   |
+-------------------------------------------------------------------+
| [ ↱ Rẽ phải vào đường Nguyễn Huệ · 150 m ]                       |
| Vị trí xe · Tốc độ 28 km/h                                        |
| Điểm tiếp theo: Em Nguyễn Văn A (Còn 450 m)                       |
|-------------------------------------------------------------------|
| [ Tự động di chuyển (Đang chạy) ]   [ Lái thủ công ]   [ Dừng ]   |
+-------------------------------------------------------------------+
| === VUỐT LÊN: DANH SÁCH HỌC SINH & ĐIỂM DANH (BOTTOM SHEET) ===  |
+-------------------------------------------------------------------+
```

---

### Wireframe 3: Xe Lệch Tuyến trong Manual — Reroute Thời gian Thực
```text
+-------------------------------------------------------------------+
| [<] Chi tiết chuyến xe                                            |
|                                     [ Tham chiếu ] [ Căn giữa xe ]|
|-------------------------------------------------------------------|
|                                                                   |
|      [ Đường cũ ]                 [ Tuyến Mới Màu Xanh Dương ]    |
|           :                                   ^                   |
|           : (Đã hủy)             [ Marker Xe 🚌 ]                 |
|                                                                   |
+-------------------------------------------------------------------+
| [!] Đang lệch tuyến — Đang nạp lộ trình mới đến điểm đón #1...   |
| Vị trí xe: Lái thủ công                                           |
| Điểm tiếp theo: Em Nguyễn Văn A                                   |
|-------------------------------------------------------------------|
| [ Tự động di chuyển ]   [ Lái thủ công (Active) ]      [ Dừng ]   |
|                   [ ↑ ]                                           |
|             [ ← ] [ ↓ ] [ → ]                                     |
+-------------------------------------------------------------------+
| === VUỐT LÊN: DANH SÁCH HỌC SINH & ĐIỂM DANH (BOTTOM SHEET) ===  |
+-------------------------------------------------------------------+
```

---

## 6. Kế hoạch Kiểm chứng Kỹ thuật (Verification Strategy)

Tuân thủ nghiêm ngặt **TEST DATA POLICY**: Chỉ sử dụng phương pháp kiểm chứng Read-Only, Static Typecheck và Pure Unit Tests độc lập không chạm cơ sở dữ liệu.

### 6.1. Unit Tests Cần Bổ sung / Mở rộng
1. **Kiểm tra Session Target Preservation trên API**:
   - Gọi `TripNavigationService.session()` với `action: 'RESUME'` khi đã có `targetStopId` dở dang.
   - Khẳng định: `targetStopId` giữ nguyên, không bị reset về `initial.id`.
2. **Kiểm tra Race Condition trong `prepare()` trên Mobile**:
   - Giả lập trường hợp `remote.current.canPublish === false` tại thời điểm gọi `prepare()`.
   - Khẳng định: `prepare()` không thoát thầm lặng mà xử lý đúng trạng thái chuyển giao từ `startTrip`.
3. **Kiểm tra Giải phóng `routeBusy` khi Đổi Mode**:
   - Giả lập request `route()` đang pending thì `generation` tăng lên.
   - Khi request hoàn tất hoặc bị reject: khẳng định `routeBusy` được đưa về `false`, không khóa các request tiếp theo.
4. **Kiểm tra Chuyển đổi Manual $\rightarrow$ Auto không Giật lùi**:
   - Cho xe di chuyển trong Manual đến 200m dọc tuyến.
   - Chuyển sang Auto: khẳng định tọa độ bắt đầu của Auto là 200m, `travelled === 200`, không nhảy về 0m hoặc vị trí cũ từ DB.
5. **Kiểm tra Ẩn Planned Polyline**:
   - Khẳng định `hidePlanned === true` ngay khi `operationalState.status === 'IN_PROGRESS'` kể cả khi `engine.segment` đang rỗng (đang tải).

### 6.2. Kiểm tra An toàn & Static Checks
- `npx tsc --noEmit` trên cả 3 project (`/api`, `/web`, `/mobile`) phải đạt 0 lỗi.
- Toàn bộ 118+ unit tests hiện có phải tiếp tục PASS 100%.

---

## 7. Trạng thái Triển khai
 
Đã triển khai đầy đủ các hiệu chỉnh kỹ thuật theo chỉ thị của Product Owner và hoàn thành 100% các bài kiểm tra typecheck và unit test an toàn. Báo cáo chi tiết và kết quả nghiệm thu được ghi nhận tại [docs/ai-review/LATEST.md](file:///c:/Users/chuon/Documents/work/road-to-school-v2/docs/ai-review/LATEST.md).
