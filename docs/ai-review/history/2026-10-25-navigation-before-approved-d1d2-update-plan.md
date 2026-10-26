# RoadToSchool v2.0 — Vehicle Navigation & Simulation Architecture Plan

Ngày kiểm tra: 25/10/2026, Asia/Saigon. **PLANNING ONLY — chưa triển khai.**

Nghiệp vụ trong chỉ thị PO đã duyệt; kiến trúc, dependency, wireframe và các đánh đổi dưới đây đang chờ duyệt. Không thay code/DB, không cài package/SDK, không build native, không gọi Route API tính phí hay publish tọa độ.

## 1. Executive Summary

Khuyến nghị chính: **giữ Leaflet/WebView hiện có cho Mobile, MapLibre cho Web; expo-location cho foreground LIVE; hai nguồn virtual position độc lập cho TEST; Backend REST + polling và last-known state tạm thời cho một instance**. Không dùng Navigation SDK làm dependency bắt buộc của cả hai simulator.

Khả thi về thiết kế cho marker, GPS, Auto/Joystick, reroute P→B và các role quan sát xuyên thiết bị. Tuy nhiên **chưa có simulator hoặc GPS/rerouting runtime được thử trong repo**: `TECHNICALLY_FEASIBLE_BUT_UNTESTED`, không gắn PASS.

Hai giới hạn có tác động quyết định:

1. DB chỉ lưu geometry toàn tuyến, không directions. Có thể giữ chính xác geometry đã lưu để dẫn theo bản đồ/điểm kế tiếp; **không thể khẳng định có đầy đủ chỉ dẫn rẽ chính xác trên mọi chặng cũ**. Routing lại A→B để lấy instructions có thể sinh đường khác. Không được thay geometry cũ âm thầm hoặc tự dựng navigation engine để che thiếu sót này.
2. RAM trên Backend chia sẻ được cho nhiều thiết bị cùng instance, nhưng mất state sau restart và không nhất quán nếu nhiều instances. Chỉ chọn zero migration khi PO chấp nhận rõ hai giới hạn đó; không đánh đồng với persistence production.

Ba câu hỏi đã gửi PO: chính sách chỉ dẫn rẽ trên tuyến cũ; single-instance/RAM và resume sau restart; dependency expo-location + foreground-only. Trong khi chờ trả lời, đây là **một phương án đề xuất có điều kiện**, không phải các quyết định PO đã đồng ý.

## 2. Verified Current Codebase

### 2.1. Context và nguồn sự thật

Đã đọc AGENTS.md, WORKING_RULES, BUSINESS_CONTEXT, CODEX_HANDOFF, CURRENT_STATE, LATEST theo thứ tự; đối chiếu kế hoạch route VRP, Trip Operation V2 và Trip State Synchronization. Giữ mô hình 1 nhà xe/1 bãi xe/5 roles, 3 project npm độc lập. Quyết định hiện tại của PO ưu tiên hơn tài liệu handoff.

| Hạng mục | Bằng chứng source | Kết luận |
|---|---|---|
| Full route polyline | `api/prisma/schema.prisma:351–384`, Route.polylineGeometry | VERIFIED_BY_SOURCE: có geometry toàn tuyến |
| Ordered stops | `schema.prisma:386–406`; `trips.service.ts:603` orderBy stopOrder | Có lat/lng, stop type/order, student reference, ETA kế hoạch |
| Segments/instructions | Route/RouteStop/Trip schema; Trip detail DTO | Không có per-leg geometry, turn instructions hoặc persisted navigation target |
| Trip snapshot | `schema.prisma:409–444` | Gán xe/người và milestones riêng; route là relation, không snapshot geometry độc lập trong Trip |
| VietMap integration | `api/src/routes/vietmap-vrp.service.ts:174–204` | Route v4 lấy geometry/distance/time, **bỏ instructions**; vehicle=car, encoded points |
| Fallback hiện tại | `vietmap-vrp.service.ts:152–168`, `:407–420` | solveTSP có fallback đường thẳng qua stops; không dùng fallback này làm đường dẫn xe LIVE |
| Mobile map thực tế | `mobile/app/trip/[id].tsx:244–308`, `:609`; `mobile/utils/polyline.ts` | **Leaflet 1.9.4 trong WebView**, VietMap raster tiles, decode polyline5 thành [lat,lng] |
| Web map | `web/src/components/admin/routes/route-map.tsx:100`, `:193`, `:338` | MapLibre instance/ref, GeoJSON polyline; chưa có live vehicle marker |
| GPS/navigation publishing | rg trong api/src, mobile app/hooks/utils/services, web/src; schema/package | Không tìm thấy GPS watcher, location API/store, websocket/SSE, vehicle-position subscription hoặc navigator đang dùng |
| Mobile polling | `mobile/hooks/use-active-refresh.ts`, `trip/[id].tsx:199–227` | State/roster 5s, metadata 20s/focus/mutation, generation guard; terminal dừng |
| Web polling | `web/src/hooks/use-visible-refresh.ts`, Trip Detail | 15s visible/focus/online; sẽ không đáp ứng vị trí ≤15s nếu giữ nguyên cả publish và poll cadence này |
| Authorization | `trips.service.ts:81–99`, detail/state/roster callers | assertTripAccess đúng system/school/assignment/linked roster; helper private, cần reuse qua method service công khai nhỏ |
| JWT sessions | `api/src/auth/decorators/auth-user.decorator.ts`, AuthGuard | Có CurrentSessionId, request.session; tái sử dụng để ràng buộc publisher |
| TEST/LIVE | `trips.service.ts:1286–1289` | Server config/env; chỉ TEST khi giá trị uppercase=TEST, còn lại LIVE; hiện chỉ nới time gates, chưa có simulator |

**Drift cần tránh:** handoff gọi Mobile map là MapLibre, nhưng source Trip Detail đang dùng Leaflet. Không cài SDK theo tên trong handoff. Parent route-detail riêng và Trip Detail là hai view khác nhau; không mở rộng privacy của view này bằng cách suy từ view kia.

### 2.2. Phiên bản kiểm tra từ manifest, lock và installed packages

- Expo **58.0.19**, RN **0.88.0**, React **19.3.0**, Expo Router **~58.0.26**, WebView **14.0.1**, Reanimated **4.7.1**. Các phiên bản Expo/RN/WebView còn được đối chiếu package.json trong node_modules, không chỉ đọc tài liệu.
- Web MapLibre **6.15.0**; Backend Nest/Prisma theo source hiện tại, chưa có location infrastructure.
- Chưa khai báo expo-location, VietMap Navigation SDK hoặc VietMap native map SDK trong Mobile dependencies/lock. app.json chưa cấu hình location permissions/plugin. Không thấy project-owned Android/iOS build config/EAS/deployment scale config qua tìm kiếm files; topology production, Hermes/Fabric thực tế trên thiết bị **NOT_VERIFIED**. Không suy ra native SDK tương thích chỉ từ semver.
- Manifest bundledNativeModules của Expo 58 trong máy chỉ ra expo-location **~58.0.19**, expo-dev-client **~58.0.15**. Đây là bằng chứng tương thích version dự kiến, chưa phải kết quả build module.

## 3. VietMap Feasibility

### 3.1. Official sources đã đọc

| ID | Nguồn chính thức | Kết quả được phép kết luận |
|---|---|---|
| V1 | [Route v4](https://maps.vietmap.vn/docs/map-api/route-version/route-v4/) | VERIFIED_BY_OFFICIAL_DOCS: route giữa từ 2 điểm; geometry polyline5 và instructions; không phải API khôi phục directions cho arbitrary polyline có sẵn |
| V2 | [Navigation README](https://github.com/vietmap-company/vietmap-react-native-navigation) | Có TBT/voice, shouldSimulateRoute, off-route/progress/arrival callbacks; docs thử RN đến 0.85.2, không xác nhận RN 0.88 |
| V3 | [Navigation package.json](https://raw.githubusercontent.com/vietmap-company/vietmap-react-native-navigation/main/package.json) | Version nguồn 3.0.0, peer RN>=0.72, React>=18 <20; peer range không phải test Expo 58 |
| V4 | [JS controller](https://raw.githubusercontent.com/vietmap-company/vietmap-react-native-navigation/main/src/controller.ts) | buildRoute(coordinates, profile); chưa thấy public API import saved geometry/instructions hoặc inject custom GPS stream vào navigation engine |
| V5 | [Navigation changelog](https://raw.githubusercontent.com/vietmap-company/vietmap-react-native-navigation/main/CHANGELOG.md) | 3.0.0 yêu cầu New Architecture; có ghi custom puck native entry point, **không đủ chứng minh joystick điều khiển toàn navigation engine** |
| V6 | [Android implementation](https://raw.githubusercontent.com/vietmap-company/vietmap-react-native-navigation/main/android/src/main/java/vn/vietmap/vietmapnavigation/VietMapNavigationView.kt) | VERIFIED_BY_OFFICIAL_DOCS/source upstream: nhánh simulation dùng ReplayRouteLocationEngine |
| V7 | [iOS implementation](https://raw.githubusercontent.com/vietmap-company/vietmap-react-native-navigation/main/ios/VietMapNavigationView.swift) | SimulatedLocationManager cho simulation; có proactive rerouting, cần kiểm soát nếu chọn SDK |
| V8 | [VietMap native map](https://maps.vietmap.vn/docs/sdk-mobile/react-native/map/), [Expo map guide](https://maps.vietmap.vn/docs/sdk-mobile/react-native/expo-map/) | Map SDK/Expo map integration có tài liệu; **không lấy guide map làm bằng chứng navigation SDK chạy Expo 58** |
| V9 | [VietMap Leaflet integration](https://maps.vietmap.vn/docs/map-api/tilemap-leaflet/) | Tích hợp base map trong Leaflet có hướng dẫn; không biến Leaflet thành TBT SDK |
| V10 | [Transaction rules](https://vietmap.vn/noi-dung-xac-dinh-transaction), [bảng giá](https://maps.vietmap.vn/web) | Request/transaction khác nhau; routing phụ thuộc số điểm, tiles quy đổi riêng; chưa biết giá hợp đồng/key thực tế |
| V11 | [Navigation wrapper license](https://raw.githubusercontent.com/vietmap-company/vietmap-react-native-navigation/main/LICENSE) | Wrapper có điều kiện redistribution/notice; không suy ra quyền API/navigation service miễn phí |
| E1 | [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/) | Tài liệu hiển thị ~58.0.19, foreground watchPositionAsync và permissions; included in Expo Go theo docs, chưa test thiết bị repo |
| E2 | [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/) | Native libraries ngoài Expo Go cần binary/build phù hợp; không thể thêm SDK bằng JS reload |

Ngày 25/10/2026 đã đọc metadata registry npm bằng GET, không install: `@vietmap/vietmap-react-native-navigation` **3.0.0**, `@vietmap/vietmap-gl-react-native` **3.0.0**. [Navigation registry metadata](https://registry.npmjs.org/@vietmap%2Fvietmap-react-native-navigation/latest), [Map registry metadata](https://registry.npmjs.org/@vietmap%2Fvietmap-gl-react-native/latest). Truy cập registry bằng web tool lỗi, đã kiểm tra lại bằng HTTP read-only; không lấy lỗi fetch làm bằng chứng package không tồn tại.

Lưu ý format: chỉ đề xuất `points_encoded=true` và decoder polyline5 hiện có. Doc v4 có mô tả thứ tự coordinate non-encoded chưa nhất quán; không dùng non-encoded trước khi contract-test. Instructions interval chỉ áp dụng trên geometry trả cùng response, không áp vào index của polyline cũ khác hình dạng.

### 3.2. Ma trận bắt buộc

Ký hiệu: DOC=VERIFIED_BY_OFFICIAL_DOCS về capability của nhà cung cấp; FEASIBLE=TECHNICALLY_FEASIBLE_BUT_UNTESTED trong repo; UV=NOT_VERIFIED; NO=NOT_SUPPORTED bởi implementation hiện có.

| Tiêu chí | A — WebView + Route API | B — Native SDK | C — Hybrid |
|---|---|---|---|
| LIVE navigation | FEASIBLE theo saved line/next stop; TBT nguyên tuyến có điều kiện | DOC TBT; import đúng tuyến đã lưu UV | Khả năng native như B, thêm bridge với observer |
| Segment rerouting | FEASIBLE: server chỉ P→B, suffix bất biến | Dự kiến chỉ build 2-point current leg; default full-route/proactive refresh không tự chứng minh đúng yêu cầu | Cần reconcile geometry/target hai renderer |
| TEST Auto | FEASIBLE nội suy saved polyline, không phụ thuộc SDK/Route API trên đường gốc | DOC simulation, chưa build RN0.88 | Có thể native Auto hoặc pure TS fallback |
| TEST Joystick | FEASIBLE virtual position tự điều khiển | Custom GPS→engine UV; custom marker/puck không đủ | Joystick WebView riêng, không giả vờ native engine nhận GPS |
| Observer tracking | FEASIBLE qua Backend REST, không tự có từ map | Vẫn cần Backend, SDK không tự chia sẻ cross-role | Vẫn cần cùng Backend |
| Expo compatibility | Giữ WebView đang có; thêm GPS module phù hợp Expo | Expo58/RN0.88 build UV; không chạy trong stock Expo Go | Mang giới hạn native của B |
| DB impact | Theo sharing store, không do renderer | Như A | Như A |
| Dependencies | Đề xuất 1: expo-location | VietMap nav/native build; có thể dev-client/config additions | Ít nhất như B, có thể thêm GPS provider |
| Code complexity | Thấp cho markers/simulation; vừa cho leg controller; TBT đầy đủ có giới hạn | Ít code guidance khi build được, nhưng phải chặn routing toàn tuyến/validate saved route | Cao nhất: hai lifecycle/renderers/nguồn vị trí |
| Maintenance | Giữ stack; pure controller + bridge nhỏ | Phụ thuộc version và native compatibility | Đồng bộ cả hai stack |
| Cost | Routing khi cần + tiles; server publish/poll không phải VietMap calls | SDK/navigation license/usage UV, không dùng giá Route API để suy ra | Bao gồm cả hai, khó dự báo hơn |

**Không chọn B/C làm đường triển khai mặc định** vì chưa giải quyết saved geometry import, RN0.88 và joystick engine injection. Nếu PO bắt buộc full TBT trên mọi chặng, A chưa đủ bằng chứng để cam kết; cần vendor confirmation/PoC được duyệt, không tự giảm yêu cầu đó xuống chỉ marker.

## 4. Segment Navigation Architecture

Chỉ một navigation controller phía Mobile cho ba nguồn vị trí. State nhỏ: mode IDLE/LIVE/AUTO/JOYSTICK; ordered stop groups; targetStopId/index; current saved segment; current detour geometry nếu có; progress; routeVersion; generation; publish lease. Không tạo DB enum hoặc business state machine mới.

```text
Real GPS / Auto position / Joystick position (chỉ 1 nguồn)
              ↓ normalized sample
Current-leg controller ─→ stable map bridge + guidance panel
              ↓ throttled publish
Backend authorized last-known state ─→ polling observers
```

**Chuẩn hóa sample:** latitude, longitude, headingDeg|null, speedMps|null, accuracyMeters|null, capturedAt, source. Một API boundary adapter duy nhất chuyển [lat,lng] (Leaflet) ↔ [lng,lat] (MapLibre). Không nhầm km/h với m/s, độ với radian hoặc milliseconds với seconds.

Khởi tạo từ metadata Trip đã có, không gọi VRP/TSP khi mở detail. Decode polyline một lần theo routeVersion; map ordered stop coordinates lên polyline theo hướng tăng dần của arc length để tách [A,B], [B,C]…; chèn điểm chiếu vào segment nếu cần. Không nearest-neighbor độc lập trên toàn polyline vì tuyến vòng, giao cắt hoặc lặp điểm có thể chọn nhầm nhánh.

Validation: lat/lng finite/bounds; polyline không rỗng/hỏng; mọi điểm dừng map được trong sai số cấu hình; stopOrder ổn định; start/end phù hợp chiều. Điểm đồng vị trí được nhóm làm cùng navigation waypoint nhưng **không xóa/merge RouteStop hoặc roster**. Nếu mapping mơ hồ/geometry đường thẳng fallback không đáng tin, navigation báo unavailable; giữ Trip Operation và map quan sát, không tự coi đường thẳng là đường xe chạy. Chưa thể xác minh provenance geometry lịch sử vì schema không lưu nguồn; cần kiểm tra tuyến PO cung cấp trước LIVE acceptance.

Bất biến A→B→C→D: suffix [B,C] và [C,D] giữ nguyên buffers/hash; reroute chỉ thay current overlay P→B. Khi tới B, bỏ overlay P→B, chuyển sang saved [B,C]; không gọi optimize/ghi RoutePlan/đổi thứ tự/chèn-xóa stops/đổi roster. `currentStop` là mốc navigation đã qua, không phải trạng thái attendance.

Instructions trên saved segment: có thể request **chỉ segment hiện tại** để lấy directions, cache theo routeVersion+target. Chỉ dùng khi geometry trả về đã được đối chiếu khớp saved segment; mismatch → không dùng instructions đó, không thay đường cũ. Chưa có ngưỡng equivalence được nghiệm thu. Không routing lại full route mỗi entry/focus; không gọi directions cho mọi stop trong mỗi poll. TBT đầy đủ bất kể mismatch là quyết định D1 ở mục 20.

## 5. Off-route Rerouting

Quy trình chung cho LIVE, AUTO và JOYSTICK:

1. Bỏ sample sai/accuracy kém/nhảy vị trí bất hợp lý; heading không tin khi speed thấp. Không nhận diện off-route chỉ từ 1 GPS sample hoặc heading ngược.
2. Tính khoảng cách vuông góc tới **current segment hoặc active detour**, kết hợp continuity/progress và consecutive samples/hysteresis. Không so với toàn tuyến vì đường về có thể nằm cạnh đường đi.
3. Chỉ reroute khi lệch ổn định, có mạng, chưa in-flight và qua cooldown. Request mang routeVersion/generation/target/version vị trí; server kiểm tra publisher và target từ stored ordered stops.
4. Backend gọi **Route v4 P→B** bằng key server; không gọi VRP/solveTSP fallback, không tính P→D. Chỉ hai endpoints current position/next target cho reroute ban đầu.
5. Response hợp lệ và cùng epoch/target → thay current detour, reset progress của detour; suffix từ B không đổi. Response target cũ đến muộn bỏ qua. Invalid/empty/timeout/over-quota → giữ saved route/last valid detour và trạng thái chưa có đường mới; không fabricate geometry/ETA.

Không chốt hardcoded thresholds trong planning. Đề xuất **cấu hình thử nghiệm** để PO/QA hiệu chỉnh: off-route distance khoảng 30–50m khi accuracy tốt, ≥3 mẫu liên tiếp; cooldown khoảng 20–30s; arrival radius khoảng 15–30m với dwell/hysteresis. Đây **không phải các giá trị đã được kiểm chứng hoặc yêu cầu nghiệp vụ**. Cần thử đường song song, U-turn, urban canyon, stationary jitter và tốc độ mô phỏng trước khi chốt. Config rate cap theo Trip/publisher (ví dụ thử ≤3 reroutes/phút), cache và một request đang chạy; không route request trên mỗi GPS tick.

Segment transition: dựa proximity tới B + progress theo current geometry + mẫu liên tiếp; không chỉ nearest distance tại giao cắt. Âm thầm advance sang nhóm stop tiếp theo theo đúng thứ tự; server chỉ chấp nhận target kế tiếp hợp lệ và vị trí gần mốc cũ, không chấp nhận client tùy ý gửi target ngoài Trip. Không tự đánh dấu ABSENT nếu đi qua điểm, không chờ/đổi attendance bằng GPS.

## 6. LIVE GPS Integration

Đề xuất expo-location ~58.0.19, `watchPositionAsync` + foreground permissions, subscription cleanup. Sampling mục tiêu khoảng 1Hz/best effort, cấu hình accuracy/distance/time theo OS và benchmark pin; không giả định Android/iOS phát callback cùng cadence. Không dùng WebView geolocation làm nguồn GPS chính vì permission/secure-origin/WebView behavior chưa kiểm chứng.

Driver thấy vị trí thiết bị ngay trên map. Sample hợp lệ được publisher gửi Backend khoảng 3s/lần (đề xuất), observer nhìn **last position Backend đã nhận**, không nhìn trực tiếp GPS điện thoại. Trong LIVE server chỉ nhận source GPS; không tự fallback sang simulated position khi GPS denied/lost.

Permission denied, accuracy không đạt, GPS timeout: navigation giữ route, báo badge ngắn “Chưa có GPS”/“GPS yếu”, dừng reroute dựa sample không tin được; không phá Trip Operation. Foreground-only: blur/background/khóa màn hình dừng producer/publisher, observer chuyển stale theo timestamp. Resume lấy sample mới rồi tiếp tục; không replay backlog cũ. Không giữ GPS chạy ngầm, không notification/foreground service bổ sung. Giới hạn này cần PO chấp nhận, đặc biệt khi tài xế chuyển app.

Điều kiện lifecycle đề xuất: publish/control khi Trip IN_PROGRESS và driver hiện tại được phân công; SCHEDULED chỉ route preview, terminal khóa nguồn. Đây là policy proposal để duyệt cùng plan, không phải behavior đã có. LIVE bắt đầu navigation sau thao tác Start Trip hợp lệ, không navigation tự Start.

## 7. TEST Automatic Simulation

Nút độc lập đúng tên **“Tự động di chuyển”**. Provider AUTO nội suy theo arc-length của saved current segment, rồi segments còn lại; dùng monotonic elapsed time thay vì cộng từng tick để tránh drift. Cùng navigation controller nhận normalized sample; heading lấy tangent đường, speed theo preset mô phỏng có cấu hình, source TEST_AUTO và timestamp mới.

Một movement clock (ví dụ 100ms cho UI, đề xuất để benchmark), publish throttle khoảng 3s; khi background/blur/dừng thì cancel clock và không catch-up đoạn đường đã tạm dừng. Đến target chuyển ngầm; cuối tuyến dừng movement, **Trip vẫn IN_PROGRESS** đến khi Driver tự Complete theo boarding/arrival/alighting gates.

Auto không cần GPS permission và không cần Route API để chạy theo geometry đã lưu hợp lệ. Không gắn sự tồn tại Auto vào build Native SDK. Đường detour nếu có được controller dùng cho phần current segment; no-op nếu mạng route lỗi, không hủy cả vị trí giả lập.

Đây là `TECHNICALLY_FEASIBLE_BUT_UNTESTED`. Chưa viết engine, tạo vị trí hay chạy demo trong phiên này. SDK Auto chỉ là lựa chọn thay thế có official evidence, không là dependency của fallback A.

## 8. TEST Joystick Simulation

Nút độc lập **“Lái thủ công”**. Dùng PanResponder/Reanimated đã có, joystick 2D đơn giản: góc vector xác định heading, độ lớn xác định speed; kéo xuống/lên cho di chuyển các hướng, không cần hộp số/vật lý xe. Thả tay → speed=0 và giữ vị trí. Có thể đi lệch đường để controller nhận off-route; không road-snap marker làm che bài test lệch tuyến.

Provider JOYSTICK biến vận tốc phẳng nhỏ theo dt thành delta lat/lng có tính vĩ độ; emit cùng sample shape, source TEST_JOYSTICK, **không dùng GPS thật**. Không phụ thuộc custom GPS injection vào VietMap Native SDK. Reroute qua cùng P→B backend adapter; nếu network route lỗi, vẫn điều khiển marker và báo chưa có đường mới, không tạo đường giả như đã reroute thành công.

Auto clock và Joystick clock dùng chung một active scheduler nhưng khác position algorithm. Không giữ hai position producers; joystick loop chỉ hoạt động khi mode JOYSTICK. Không new game/physics/3D/collision library. Khả thi thiết kế nhưng touch/device/bridge performance và off-route runtime **NOT_VERIFIED**.

## 9. Simulation Fallback Strategy

| Hỏng thành phần | Auto A | Joystick A | Hành vi trung thực |
|---|---|---|---|
| Native SDK không build/chưa cài | Không phụ thuộc | Không phụ thuộc | Cả hai vẫn có đường triển khai bằng JS/WebView |
| Không GPS hoặc bị từ chối | Không dùng GPS | Không dùng GPS | TEST vẫn hoạt động, LIVE không giả thành GPS |
| Route API mất mạng/quota | Chạy saved geometry hợp lệ | Vẫn chạy virtual marker | Reroute/TBT unavailable; không báo route PASS |
| Saved polyline không hợp lệ | Không thể Auto theo tuyến | Có thể free-drive từ stop hợp lệ nếu có | Không coi free-drive là đạt saved-route navigation; cần sửa/xác minh dữ liệu hợp lệ trước nghiệm thu |
| Joystick gestures lỗi trên thiết bị | Auto không cần joystick | Chưa đạt | Auto phải qua smoke gate độc lập trước khi triển khai joystick |
| WebView/map renderer không load | Không nhìn được marker | Không nhìn được marker | Shared prerequisite bị lỗi; không tuyên bố một mode đã hoạt động chỉ vì toán tọa độ chạy |

Để đáp ứng yêu cầu **ít nhất một mode phải chạy được**, implementation phải có gate sớm: Auto trên một Trip/route hợp lệ do PO cấp → marker chuyển động không GPS → Backend nhận source TEST_AUTO → một observer khác tự thấy. Nếu gate chưa đạt, không báo feature hoàn thành, không vẽ hai nút cùng “hoạt động” trên giấy. Pure tests không thay gate device này. Đây là fallback thiết kế thực tế, **chưa VERIFIED_BY_TEST**.

Start/switch/stop: pause producer/publisher cũ → đổi epoch server → giữ last valid coordinate và target → bật đúng provider mới → publish sample mới. Auto→Joystick giữ current coordinate. Joystick→Auto chỉ tiếp tục khi projection lên **current segment** hợp lệ; nếu đang off-route, cần detour P→B hợp lệ trước khi Auto chạy, nếu chưa có giữ Joystick/IDLE và báo unavailable, không teleport về tuyến. STOP không tự Complete. In-flight epoch cũ bị reject/discard cả server và client.

## 10. Cross-role Location Sharing

```text
Driver foreground sample → PUT authorized position (≈3s)
                         → one last-known entry / Trip in Backend RAM
Observers detail active → GET navigation (≈5s) → update marker only
```

Một Nest provider `TripNavigationService` trong TripsModule giữ Map keyed tripId: assignment/route fingerprint, mode, epoch, publisher JWT sessionId, opaque lease, sequence, target index, last sample, server receivedAt, expiry. Không global event bus/location history. Reuse CurrentSessionId, không tạo account/permission model.

Hai điện thoại cùng Driver: publisher đầu đang còn lease giữ quyền; điện thoại thứ hai xem vị trí được nhưng acquire/position write nhận 409 cho đến stop/lease hết hạn hoặc takeover được xác nhận rõ. Không silently steal/last-write-wins giữa hai nguồn. Đề xuất lease khoảng 20–30s để thử nghiệm, không production constant đã duyệt. Khi đổi assignedDriverId, fingerprint đổi và revoke entry/lease; driver cũ bị DB authorization từ chối trên request tiếp theo.

Chống vị trí cũ: chỉ nhận epoch hiện tại, JWT session chủ lease, sequence tăng; capturedAt/accuracy/coordinate hợp lệ, không nhận backlog cũ sau offline. Dùng server receivedAt/serverNow tính tuổi hiển thị; capturedAt và sai lệch đồng hồ là kiểm tra riêng, heartbeat không làm GPS sample cũ thành “mới”. Không tin client source/LIVE flag để gắn nhãn: server xác định từ operation mode và session source được phép.

Observer cadence 5s; Mobile reuse loop 5s hiện tại, thêm lightweight navigation read trong cùng cycle. Web đổi base cycle location thành 5s, metadata vẫn 15s qua elapsed check trong cùng task; không poll full detail 5s hoặc mở interval thứ hai. Generation/403/404 cleanup hiện tại giữ nguyên. Không poll Home/Schedule chỉ để vẽ xe.

Status đề xuất: NONE (position=null), FRESH (sample mới), STALE (last known quá freshness budget), ENDED (terminal Trip). Freshness budget trial ~15s, TTL lưu cuối khoảng 10 phút và cap số entries; cần PO/QA chốt. Có thể nhận GET read-only sau complete để xem snapshot cuối khi còn TTL, không nghĩa xe còn LIVE. Khi người xem chưa mở app, server vẫn nhận vị trí Driver; người vào muộn lấy last-known, không cần Driver/observer cùng React state.

Driver mất mạng/đóng app/background: không giả nội suy vô hạn trên observer. Hiển thị marker cũ xám + tuổi dữ liệu, không giả xe vẫn chạy. Một interpolation ngắn giữa hai received samples để mượt được phép về UI nhưng không dùng dự đoán đó cho business actions; không extrapolate đường xe ngoài samples tin cậy.

## 11. Authorization & Privacy

| Role | GET vị trí | Publish/session/target/reroute |
|---|---|---|
| SYSTEM_ADMIN | Theo quyền Trip hệ thống | Cấm |
| SCHOOL_ADMIN | Chỉ Trip trường mình, deny thiếu schoolId | Cấm |
| DRIVER | Chỉ Trip assigned hiện tại | Chỉ assigned Driver và publisher session hợp lệ, mode/status phù hợp |
| BUS_ATTENDANT | Chỉ Trip assigned hiện tại | Cấm |
| PARENT | Chỉ Trip roster có linked child | Cấm |

Mọi endpoint check AuthGuard + RolesGuard + object scope; GET navigation reuse assertTripAccess qua một public context method nhỏ trong TripsService, không nhân bản 5-role rules. PUT/POST không chỉ check lease: luôn recheck assignment/status/mode trong DB. Đối với write cần serialize session generation với Trip assignment/Complete bằng cùng Trip row lock hiện có; chỉ commit ephemeral state sau khi validation transaction thành công, không giữ DB lock trong khi gọi VietMap/network. Reroute response phải revalidate epoch/target/status/assignment sau await trước apply.

Observer payload chung chỉ vehicle position/source/freshness và TripStatus, không lease/session/user identifiers, roster hoặc stop/student IDs/target PII. Driver mới nhận target và segment data. Parent không nhận tên/địa chỉ/attendance học sinh khác hoặc danh sách next stops từ API mới. Giữ policy masking hiện hành, không lấy việc Parent có quyền một Trip làm quyền quan sát mọi Trip.

Nhận 403/404: xóa remote marker/position/control/modal và dừng polling; không giữ cached coordinates ngoài quyền. API trả simulation label rõ: TEST_AUTO/TEST_JOYSTICK, không đổi thành GPS qua client property. GPS source label là khai báo nguồn được xác thực theo mode, không phải chứng nhận chống GPS spoofing của thiết bị; anti-spoof platform ngoài scope.

## 12. Minimal Database Impact

| Option | Bảng/field/migration | Restart và multi-instance | Chi phí / retention / privacy |
|---|---|---|---|
| DB-A reuse schema/infrastructure | 0/0/không | Không có store vị trí nào để reuse; tọa độ RouteStop không phải vị trí xe | Không dùng SystemSetting JSON làm GPS bucket hoặc cancellationReason làm state |
| **DB-B ephemeral Map — đề xuất có điều kiện** | **0/0/không** | Cross-device cùng instance được; restart mất position/lease/target; nhiều instances không nhất quán | GET/PUT auth đọc DB, position ghi RAM; một last point + target/lease, không history; TTL và cap để hạn chế giữ dữ liệu |
| DB-C last-known trên Trip nếu yêu cầu durability | 0 bảng, đề xuất tối thiểu 1 nullable JSON field cho navigation snapshot; **cần migration/phê duyệt riêng** | Có thể giữ last point/target qua restart; CAS/version cần thiết cho multi-publisher | Khoảng 1 UPDATE/publish/Trip; chứa last sample + epoch/seq/target chứ không lịch sử. Durability không tự giải quyết distributed lease/cache/reroute coordination |
| DB-D Redis/external store hoặc bảng riêng | New infrastructure hoặc table; chưa đề xuất | Giải quyết shared store nếu thiết kế atomic expiry/CAS đúng | Thêm dependency/ops/retention review; không cần cho một-instance proposal |

Không chọn DB-C/D chỉ vì “có nhiều thiết bị”: nhiều clients vẫn đọc chung Backend Map qua REST. **Topology backend**, persistence sau restart và recovery target mới quyết định nhu cầu shared persistent store. Không dùng sticky sessions như lời giải mặc định cho multi-instance vì Driver và observer có thể rơi vào process khác.

Với DB-B, restart trả position=null/needsResume, không dựng lại vị trí giả. Driver cần xác nhận điểm tiếp tục từ ordered stops hoặc khôi phục target từ session còn sống; không tự chọn nearest toàn tuyến và bỏ qua điểm đã lên kế hoạch. Nếu PO yêu cầu giữ state qua restart/chạy nhiều replicas, **DB-B không đáp ứng**: quay lại duyệt DB-C/D trước implementation, không lách bằng ghi file JSON lên disk.

TTL cleanup lazy trên read/write hoặc timer nhỏ đã quản lý ở provider, không cron job nghiệp vụ/queue. Trip terminal/reassignment không cho publish nữa; snapshot cuối stale/ended, prune theo retention. Không logs raw tracks, không historic GPS audit table.

## 13. API Contracts — đề xuất, chưa được triển khai

Prefix `/api/v1/trips/:id`. Không sửa DTO operation hiện tại để nhét toàn metadata navigation vào mọi poll/Home.

| Endpoint | Actor / mục đích | Input chính | Output / lỗi |
|---|---|---|---|
| GET `/navigation` | 5 roles theo object scope; lightweight viewer | Trip ID | mode policy, tripStatus, serverNow, freshness, receivedAt, position|null; Driver thêm own publisher/target capabilities. 401/403/404 |
| PUT `/navigation/session` | Assigned Driver; acquire/switch/stop/resume một publisher | action START/SWITCH/STOP/RESUME, source theo mode; expectedEpoch; resume target chỉ khi needsResume và được xác nhận | epoch/lease cho đúng owner, ordered target/routeVersion, active mode; 400/401/403/404/409/422 |
| PUT `/navigation/position` | Assigned Driver + active lease | lease/epoch, increasing sequence, lat/lng, heading/speed/accuracy, capturedAt, target progress đề nghị nếu tới mốc | accepted server timestamp + authoritative target/sequence; 400/401/403/404/409/422/429 |
| POST `/navigation/segment` | Assigned Driver; current segment guidance hoặc off-route detour | lease/epoch, routeVersion, targetStopId/positionSequence, purpose GUIDANCE/OFF_ROUTE | current segment geometry, normalized instructions nếu khớp, duration/distance, geometry/provenance status; 400/401/403/404/409/422/429/503 |

**Vì sao API mới cần thiết:** repo chưa có location write/read/session; existing Trip Detail trả geometry/roster không phải shared vehicle state. Operational-state dùng cho readiness/actions/child progress; gắn marker/session/reroute payload vào đó làm tăng tải và rối quyền cho mọi role/Home. GET navigation cố ý nhỏ; metadata/stops vẫn lấy existing detail, không nhân bản full route vào mỗi position response. Bốn resources trong cùng TripsModule, không location platform riêng.

Các quy tắc contract cần duyệt:

- Latitude[-90,90], longitude[-180,180], finite numbers; nullable heading/speed khi device không cung cấp, không đổi unknown thành 0 giả; source server-derived, strict body validation; sequence/epoch không cho cũ ghi đè mới.
- GET authorized nhưng chưa position → 200 với position=null/freshness=NONE; không dùng 404 cho “chưa có GPS”. TargetId không được xem là tùy chọn sửa route/roster.
- Session STOP chỉ dừng navigation/simulation/publish, không Complete Trip. Đề xuất chỉ control/publish IN_PROGRESS; SCHEDULED/terminal chỉ xem route/last known. PO duyệt policy này cùng plan.
- Runtime target advance chỉ adjacent ordered group; reject arbitrary jump. RESUME sau restart là thao tác điều hướng riêng, chưa được coi là business milestone.
- OFF_ROUTE lấy P từ latest accepted sample, B từ server target; không nhận arbitrary destination để biến endpoint thành public routing proxy. GUIDANCE chỉ current saved leg. Route v4 fail → 503/no new route, tuyệt đối không fallback đường chim bay.
- Device clock skew/sample age/rate limit/cooldown/TTL được cấu hình và test trước khi chốt. No unbounded replay/offline buffer; last sample only, timeout và cancel thế hệ cũ.
- Swagger đầy đủ role/scope, TEST/LIVE accepted sources, error cases và source/freshness schema. Không đưa key/lease vào OpenAPI examples thực tế hoặc logs.

## 14. Mobile UI Wireframes — chờ PO duyệt

Không đổi Bottom Sheet 2-state/Fixed Bottom Action, không che boarding/alighting. Navigation panel nhỏ trong Trip Detail; không tạo screen mới ở phương án A.

```text
Driver LIVE
┌─────────────────────────────────┐
│ ‹             [GPS • cập nhật]   │
│ [Rẽ… / Điểm tiếp theo • 250 m]   │  Chỉ có chỉ dẫn rẽ khi dữ liệu khớp
│                                 │
│       Bản đồ tuyến đã lưu        │
│     🚌 vị trí / current segment  │
│                                 │
│ [Bắt đầu / Dừng điều hướng]      │  Tách khỏi Start/Complete nghiệp vụ
├──────── Existing Bottom Sheet ──┤
│ INFO / ĐIỂM ĐÓN / ĐIỂM DANH      │
├──────── Fixed Operation Action ─┤
│ [Bắt đầu / Đến trường / Hoàn tất]│  Workflow hiện tại giữ nguyên
└─────────────────────────────────┘

Driver TEST
┌─────────────────────────────────┐
│ ‹                   [MÔ PHỎNG] │
│       Bản đồ + marker xe        │
│ [Tự động di chuyển] [Lái thủ công]│  Hai nút riêng, không toggle gộp
│ [Dừng mô phỏng]                 │  Chỉ khi đang chạy
│           (joystick)            │  Chỉ JOYSTICK, phía trên sheet/action
├──────── Existing Bottom Sheet ──┤
│ ...                             │
├──────── Fixed Operation Action ─┤
│ [Hành động Trip hiện tại]       │
└─────────────────────────────────┘
```

Trạng thái: IDLE cả hai nút sẵn sàng nếu Trip/mode cho phép; AUTO highlight Auto, Joystick vẫn là nút chuyển riêng; JOYSTICK highlight manual; switching disable cả hai ngắn hạn, không bật provider mới trước cleanup/epoch; unavailable disable mode lỗi với badge ngắn, không giả GPS; Stop về IDLE. Nếu source lỗi, mode khác chỉ bắt đầu sau cleanup đúng quy trình.

Observer Attendant/Parent: map + marker + `[GPS/MÔ PHỎNG] [Cập nhật 5 giây trước/Vị trí cũ/Chưa có vị trí]`, tuyến được phép hiện tại. Không joystick/start navigation/simulator/target controls. Attendant vẫn dùng boarding/alighting như cũ; Parent chỉ child data được phép. Resume sau mất state đề xuất picker target cho Driver cần PO duyệt, không âm thầm chọn/skip.

Không popup/push/SMS/voice thông báo đến stop. Nếu sau này bật TBT voice, bỏ/suppress destination-arrival announcement riêng; chỉ hướng dẫn rẽ, không business notification. Voice chưa nằm trong minimal dependency proposal A.

## 15. Web Viewer Wireframes — chờ PO duyệt

```text
Trip Detail — System Admin / School Admin đúng scope
┌──────────────────────────────────────────────┐
│ Tên Trip • Status              [GPS/MÔ PHỎNG]│
│ Metadata phân công như hiện tại              │
├────────────────────────┬─────────────────────┤
│ MapLibre map           │ Điểm dừng / Info    │
│ route + 🚌 marker      │ theo quyền hiện tại │
│ Cập nhật ... / Vị trí cũ│                     │
└────────────────────────┴─────────────────────┘
```

Không dashboard đội xe mới, không điều khiển xe/target, không reset camera/zoom hoặc remount map khi polling marker. Marker layer/ref tách khỏi static points, update setLngLat/setData thay vì rebuild route source/fitBounds. Nếu mất quyền, bỏ marker và data cùng detail hiện có.

## 16. Performance & VietMap Cost

Các con số dưới là **ước lượng thiết kế**, không benchmark/SLA. GPS best-effort ~1Hz; movement virtual ~10Hz; publisher ~3s; viewer poll ~5s. Độ trễ bảo thủ = chờ publish≤3s + chờ poll≤5s + mạng/processing (giả sử 1–2s) ≈9–10s khi bình thường, phù hợp mục tiêu 5–15s. Nếu giữ Web poll 15s thì có thể >18s, nên phải đổi **chỉ cycle vị trí**.

Tải ví dụ 50 Trip đang chạy, 10 observers mỗi Trip: publish≈16.7 req/s; read≈100 req/s; tổng≈116.7 req/s chưa kể existing state/roster polls và auth-session DB queries. Một Trip/10 observers là khoảng 8,400 telemetry HTTP requests/giờ (1,200 publish + 7,200 read). Đây không phải VietMap transactions. GET phải lightweight/select đúng fields, không include toàn roster/geometry; Parent scope check vẫn phải thật, không auth cache tùy tiện để giảm tải.

VietMap: routing gọi khi current-leg instructions cần lấy và off-route đã qua filter, không mỗi sample; query cache theo routeVersion/target, detour theo generation và origin phù hợp, không reuse sai origin. Tiles phát sinh theo khu vực/zoom/pan, không theo mọi `setLatLng`.

Ví dụ chi phí giả định: 60 Trip/ngày, 10 current-leg guidance requests + 2 reroutes/Trip =720 routing calls. Với hai points/call và quy đổi hiện công bố, khoảng720 transactions; bảng giá công khai tier đầu nêu50 VNĐ/trans → khoảng36,000 VNĐ/ngày **chỉ phần ví dụ routing**, chưa tiles/SDK/thuế/ưu đãi/hợp đồng. [Quy đổi](https://vietmap.vn/noi-dung-xac-dinh-transaction), [giá](https://maps.vietmap.vn/web). Guidance thêm anchors/nhiều points sẽ đổi hệ số; không áp giá này cho native navigation sessions. Actual entitlement/quota/giá key dự án NOT_VERIFIED.

Pin/network: dừng nguồn khi blur/background/terminal, không chạy GPS trong TEST; cap dt để không nhảy sauresume, không queue GPS history. Throttle publish single-flight/latest-wins local pending sample, không backlog. Khi idle GPS ít mẫu vẫn cần phân biệt sample cũ và publisher còn sống; heartbeat không tự tạo mẫu GPS mới. Benchmark accuracy/frequency trên Android/iOS trước chốt; không ép1Hz bằng busy loop.

## 17. Dependencies & Compatibility

| Dependency | Version dự kiến / nguồn | Cần để làm gì | Không cài mới có được không? | Approval |
|---|---|---|---|---|
| **expo-location** | **~58.0.19**, Expo58 bundled manifest và E1 | LIVE native foreground GPS/permissions | TEST/observers không cần; WebView geolocation LIVE chưa chứng minh đủ, không chọn làm default | PO phải duyệt trước install; hiện đã hỏi, chưa giả định có câu trả lời |
| expo-dev-client | Expo manifest ~58.0.15 | Chỉ nếu cần dev build cho Native SDK alternative | A không bắt buộc cài chỉ cho simulator | Không cài trong A hiện tại |
| @vietmap/vietmap-react-native-navigation | registry/source 3.0.0 | B/C, native TBT/Auto | A tránh cài; exact saved route + custom GPS engine + Expo58 build UV | Không đề xuất install mặc định |
| @vietmap/vietmap-gl-react-native | registry 3.0.0 | Native map alternative | Existing Leaflet/WebView đủ render marker/line; không cần thay map chỉ vì tracking | Không đề xuất install |
| Speech/NetInfo/joystick/game/geometry/state libraries | Không đề xuất version | Không cần cho minimal A | Dùng existing RN gestures, fetch, pure small geometry helpers, polling hồi mạng | 0 packages loại này |

E1 xác nhận expo-location foreground watch và docs version phù hợp local manifest; thiết bị thực vẫn cần thử. Native SDK semver peer tương thích không đủ kết luận RN0.88 build/Hermes/New Architecture/CocoaPods/Gradle đã chạy. Không thay npm thành yarn theo sample vendor. Wrapper license V11 không thay hợp đồng API key/billing; key routing chỉ ở server, không copy key hiện có vào tài liệu hoặc client navigation commands.

## 18. Implementation Plan — exact scope dự kiến

Không tạo implementation trong task này. Sau khi PO duyệt plan/decisions/wireframes/dependency, triển khai liên tục, chỉ quay lại hỏi khi phát sinh quyết định ngoài scope.

### 18.1. Backend — cùng TripsModule, không platform mới

- Sửa `api/src/trips/trips.service.ts`: public authorized Trip context method dùng lại private assertTripAccess và `withTripLock` theo scope cần thiết; không đổi operation gates hoặc status.
- Mới `api/src/trips/trip-navigation.service.ts`: ephemeral session/last-known store, source/lease/sequence/TTL validation, current target/routeVersion, endpoint orchestration. Không history/provider framework.
- Mới `api/src/trips/trip-navigation.controller.ts`: bốn resources mục13 với guards/DTO/Swagger; reuse CurrentSessionId.
- Mới `api/src/trips/dto/trip-navigation.dto.ts`: input/output role-shaped schemas, freshness/source/session errors; không Prisma enums.
- Mới `api/src/trips/utils/navigation-geometry.util.ts`: saved segment slicing/projection/current-leg geometry checks; reuse `api/src/routes/utils/polyline.util.ts` decoder nếu đáp ứng, không gọi straight-line fallback.
- Sửa `api/src/routes/vietmap-vrp.service.ts`: thêm small directions-capable method với timeout, không phá return shape các callers đang dùng; Route v4 typed parse, không log key. Export provider từ `routes.module.ts`, import RoutesModule ở TripsModule nếu dependency graph vẫn không circular.
- Sửa `api/src/trips/trips.module.ts`: đăng ký controller/service/providers; không module permissions mới.
- Mới tests `api/src/trips/trip-navigation.spec.ts`, `api/src/trips/utils/navigation-geometry.util.spec.ts`; existing Trip operation/sync tests giữ regression.

Exit: scopes/source/status/lease/seq/cooldown tests đúng; suffix geometry bất biến; routing failure không fabricate geometry; Swagger đồng bộ tại `/api/docs`. Concurrency DB/RAM edge cần runtime riêng, không tuyên bố atomic cross-resource transaction chỉ vì Map ở cùng process. Complexity medium; DB/Prisma schema **không đổi nếu D2 chọn DB-B**.

### 18.2. Mobile — foreground sources, shared controller, stable map

- Sửa `mobile/package.json`, package-lock và app.json **chỉ sau PO duyệt expo-location**: version Expo-compatible, permission copy/plugin foreground; không background modes.
- Sửa `mobile/services/api-client.ts`: bốn navigation methods/types, no new state manager.
- Mới `mobile/utils/navigation.ts`: normalized sample, arc-length progress/joystick step/off-route/projection logic, no I/O; không cả navigation framework.
- Mới `mobile/hooks/use-trip-navigation.ts`: điều phối một source, permission/watch cleanup, session epochs, throttle publish, reroute generations, active lifecycle. Reuse useActiveRefresh cho viewer; không sửa toàn bộ polling architecture.
- Mới `mobile/components/trip-navigation-controls.tsx`: hai nút TEST riêng/stop/joystick, LIVE control/status, observers read-only; dùng theme và gestures sẵn.
- Mới `mobile/components/trip-map.tsx` hoặc extraction tối thiểu từ `mobile/app/trip/[id].tsx`: stable HTML, marker/current-leg overlay refs, typed `injectJavaScript` updates + map-ready handshake; không replace source mỗi tick. Không cần đổi các parent routing preview maps không liên quan.
- Sửa `mobile/app/trip/[id].tsx`: integrate controller/observer response; Bottom Sheet/operations nguyên trạng; derive controls từ backend mode/status/current assignment, xóa data khi scope revoked.
- Sửa `mobile/utils/trip-map-data.ts` nếu cần hỗ trợ static geometry + explicit overlays, giữ invariant không encode position vào HTML source key.
- Mới `mobile/scripts/vehicle-navigation.test.ts`: pure data/controller tests; cập nhật existing sync/map tests nếu đổi renderer contract. Không cài test libraries tự động.

Exit: Auto smoke trước, Joystick độc lập, switch/cleanup không hai producers/publishers; map marker update không remount; Parent/Attendant không control; LIVE denied GPS không biến thành TEST. Device UX/permissions/bridge mới đạt sau UAT. Complexity medium, native SDK PoC không nằm mặc định.

### 18.3. Web — chỉ viewer trong Trip Detail

- Sửa `web/src/lib/api-client.ts`, `web/src/lib/types.ts`: navigation GET/type, không publisher methods cho admin UI.
- Sửa `web/src/app/admin/trips/[id]/page.tsx`: dùng base5s navigation read, metadata15s elapsed check; terminal/no access cleanup; không extra independent loop và không poll list/dashboard fleet mới.
- Sửa `web/src/components/admin/routes/route-map.tsx`: optional vehicle position/source/freshness và current overlay nếu được phép; marker riêng không nằm trong static markers rebuild; update position trực tiếp, không fitBounds mỗi sample; behavior cũ mặc định khi prop vắng.
- Existing use-visible-refresh hook reuse; chỉ sửa helper nếu contract thật sự thiếu, không replace library.
- Tests pure/map data và role-shaped payload trong infrastructure hiện có; browser lifecycle/actual map vẫn UAT.

Exit: System Admin/School Admin đúng school scope thấy latest marker/source/age trong target latency, không control/publish, no manual refresh/map reset. Complexity low–medium; không redesign Web.

### 18.4. Trình tự nghiệm thu

1. PO quyết định D1–D3/wireframes và mode gate, xác nhận dữ liệu route để dùng; không cài gì trước khi duyệt.
2. Implement/test geometry + **Auto WebView độc lập** bằng in-memory/pure tests và device smoke được phép; nếu Auto không chạy, sửa gate trước khi hoàn thiện tính năng.
3. Backend sharing/authorization/session/source validation; authorized observer thấy Auto từ thiết bị khác bằng môi trường PO cấp.
4. Joystick và segment reroute, suffix invariant/network failure; LIVE expo-location và permission/foreground behavior sau install approval.
5. Integrate Web viewer và Mobile observer cadence, performance/last-known/privacy checks.
6. Regression operation + Swagger/static checks + UAT matrix; report không có sample data nào được tự tạo vào business DB.

## 19. Test / UAT Scenarios

Planning session: chỉ đọc source/docs/registry và chạy tsc 3 projects PASS. Không simulator/SDK build/route API/GPS/telemetry test nào đã chạy; mọi chức năng mới runtime **NOT_VERIFIED**. Những ca dưới là **planned**, không kết quả PASS.

| ID | Scenario / assertion | Phương pháp / điều kiện |
|---|---|---|
| N01 | Split saved A→B→C→D, loop/giao cắt, repeated/co-located stops, coordinate order | Pure geometry tests trong implementation được duyệt; no route/roster mutation |
| N02 | Đi lệch A→B tại P, chỉ request P→B; hash B→C/C→D không đổi | Mock provider request + UAT route hợp lệ PO cấp |
| N03 | GPS noise/heading low speed/invalid NaN/accuracy quá kém | Pure controller sample tests; không fake “LIVE GPS verified” |
| N04 | Off-route cooldown/consecutive samples/rate limit/out-of-order route responses | Fake clocks/deferred promises, target change rejects old response |
| N05 | Arrival navigation B→C âm thầm; không attendance/arrive-school/complete API | Assert không có business mutation calls; UAT hai chiều |
| N06 | Route timeout/zero results/quota/mismatch instructions | 503/unavailable, không đường thẳng fallback/TBT sai geometry |
| N07 | LIVE permission deny/lost GPS/clock skew/background/resume | Thiết bị Android/iOS thật; foreground-only gap hiển thị đúng |
| A01 | Auto không GPS chạy saved line qua nhiều segments, stop tại cuối route nhưng Trip không Complete | Pure clock + device smoke, gate “ít nhất một mode” |
| A02 | SDK không có và Route API offline: Auto vẫn chạy route hợp lệ | Device/in-memory path; tiles/cache/network prerequisites báo riêng |
| J01 | Joystick tự điều khiển hướng/speed, thả dừng, đi lệch tuyến | Native gesture UAT, không road-snap che off-route |
| J02 | Auto↔Joystick switch ở on-route/off-route, old epoch/pending publish | Một source/clock/lease; không teleport, không publisher cũ ghi đè |
| T01 | Driver publish LIVE/AUTO/JOYSTICK đúng server mode | API tests role/source matrix; TEST không gắn nhãn GPS thật |
| T02 | Attendant/Parent/System Admin/School Admin đúng scope quan sát vị trí cùng Trip | Multi-device/browser UAT; mục tiêu5–15s, đo end-to-end timestamps |
| T03 | Sai schoolId/assignment/Parent link/Trip ID; observer cố PUT/session/segment | 403/404 không data; no observer control; scopes test mới + existing sync regression |
| T04 | Hai devices cùng Driver; stale lease/old epoch/sequence/reassignment | 409/revoke theo scope; recheck sau routing await; không client-only guard |
| T05 | Driver offline/foreground-only stop/late observer/backend restart/TTL | FRESH→STALE/NONE/ENDED chính xác; no fake moving marker; needsResume rõ |
| T06 | RAM store nhiều replicas | DB-B phải bị đánh dấu không phù hợp, không nghiệm thu bằng sticky session demo |
| M01 | Marker100+ updates, detour overlay, zoom/pan/Bottom Sheet/Fixed Action | Đếm actual WebView load/map init; không remount hoặc fitBounds mỗi tick |
| R01 | Ready/Start/Board/Arrival/Alight/Complete, Home chọn tiếp, schedule status labels | Existing unit tests + UAT, milestones vẫn manual |
| R02 | Terminal/403/404/screen blur/user-trip change | Stop producers/timers/poll; xóa private position, không late apply/cross-trip contamination |
| P01 | Publish/observe/query costs + pin/CPU/battery/tile requests | Benchmark môi trường PO cấp, không suy ra từ tsc/pure test |

Không tạo fixtures/seed/records vào business DB. Pure/in-memory test infrastructure đã có được dùng đúng phạm vi đã duyệt ở implementation; chạy device/API mutations chỉ khi PO cấp rõ environment và records/quyền, hoặc PO tự thao tác. GET route provider cũng có thể tính phí nên cần test budget/key permission riêng, không thử ngầm trong planning.

## 20. Risks & Open Decisions

| ID | Quyết định cần PO | Khuyến nghị / đánh đổi | Trạng thái |
|---|---|---|---|
| **D1** | Full TBT mọi chặng hay saved-line guidance với TBT chỉ khi geometry khớp? | Chọn A giữ nguyên tuyến; thiếu instructions thì hiển thị next target, không chỉ dẫn rẽ sai. Nếu full TBT bắt buộc: cần xác minh vendor/SDK import saved route hoặc nguồn directions trước; A chưa đủ | Đã hỏi, chưa có câu trả lời tại thời điểm soạn |
| **D2** | Chấp nhận 1 backend/RAM/restart mất state và xác nhận điểm resume? | DB-B giảm DB impact, vẫn cross-device; nếu durability/multi-instance bắt buộc, duyệt lại DB-C/D và migration/infrastructure cần thiết | Đã hỏi, không mặc định production một instance |
| **D3** | expo-location ~58.0.19 và foreground-only khi Driver mở detail? | A cần module này cho LIVE; khóa máy/chuyển app gây stale. Nếu cần background, đó là scope/permission/build khác cần thiết kế riêng | Đã hỏi, chưa install |
| D4 | Duyệt wireframes, chỉ publish/control khi IN_PROGRESS và flow resume | Giữ operation workflow, simulation không tự Start; restart không tự chọn nearest bỏ qua stops. Hai nút TEST riêng đã được duyệt về yêu cầu, chưa duyệt layout/flow chi tiết | Chờ review plan |
| D5 | GPS/off-route/arrival/stale/lease thresholds, routing profile xe và key/quota | Giá trị trong plan là trial configs; Route v4 hiện car, không tự coi truck/bus enum tương đương fleet school bus. Nếu vehicle-specific restrictions bắt buộc phải chốt profile/account support | Chờ calibration/entitlement xác nhận |

Rủi ro chưa loại trừ: route lịch sử có straight-line fallback; mapping stops vào loop geometry; instructions index mismatch; multi-instance deployment; SDK coordinate/custom-puck API mâu thuẫn changelog vs public controller; native build0.88; permissions/pin/bridge gestures; proprietary service entitlement. Không đặt mọi mục thành “supported” chỉ vì có README.

Không liên hệ VietMap hoặc gửi dữ liệu/nhắn người khác trong task. Việc lấy xác nhận commercial/SDK nếu cần là bước PO thực hiện hoặc ủy quyền riêng, không tool tự gửi thông tin dự án.

## 21. Readiness & Recommendation

**READY_FOR_ARCHITECTURE_REVIEW — NOT_READY_FOR_IMPLEMENTATION_APPROVAL ở các quyết định D1–D3 chưa chốt.** Source hiện tại và official capabilities đã được audit; cả hai simulator A là `TECHNICALLY_FEASIBLE_BUT_UNTESTED`, không có `VERIFIED_BY_TEST` cho chức năng mới. “Ít nhất một mode hoạt động” là gate nghiệm thu phải chạy trong implementation/UAT, chưa được đạt trong planning.

Phương án cuối cùng được khuyến nghị là A với một navigation controller nhỏ, hai virtual sources độc lập, foreground GPS và shared Backend REST last-known location, cùng điều kiện D1/D2/D3 được chấp nhận. Không chuyển sang native/hybrid nếu chưa có bằng chứng lợi ích đáp ứng exact saved route/compatibility và PO duyệt.

Một bước tiếp theo: **PO review tài liệu và trả lời các quyết định D1–D3 đã gửi, đồng thời duyệt wireframe/policy trong plan**. Dừng sau planning; không tự triển khai/cài SDK/migration/publish GPS khi chưa phê duyệt giải pháp.
