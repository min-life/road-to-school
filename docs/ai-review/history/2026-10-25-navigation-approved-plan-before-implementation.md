# RoadToSchool — Vehicle Navigation & Simulation Architecture Plan

> Cập nhật 25/10/2026: thay D1/D2 cũ, giữ D3. PLANNING ONLY. Chưa triển khai.

## 1. Executive Summary

| Quyết định PO đã duyệt | Hệ quả thiết kế đề xuất |
|---|---|
| D1: ưu tiên TBT VietMap, geometry/instructions cùng response; được khác planned line | Chỉ route chặng hiện tại P→B; không cần ép khớp polyline cũ |
| D2: lưu hành trình, cho phép đề xuất bảng nhỏ | Một TripLocationPoint; observers đọc last persisted point; bỏ RAM location store |
| D3: foreground GPS, tự resume khi quay lại/mở lại app nếu phiên hợp lệ | Checkpoint nhỏ lưu bền vững; watcher và GPS mới, không bù dữ liệu khoảng tắt app |
| Giữ hai nút TEST, chỉ một mode; năm role xem theo quyền Trip | Hai movement providers độc lập, chung controller và publisher; observer tự polling |

Chọn **WebView + VietMap Route v4 theo từng chặng** làm phương án đề xuất. Giữ Mobile Leaflet và Web MapLibre hiện có. Một bảng history 6 cột và một field JSON nullable trên Trip cho checkpoint; không Redis/WebSocket/native navigation SDK, không duplicate last position trong RAM/Trip.

Plan đủ cụ thể để review implementation, **chưa chứng minh TBT/GPS hoạt động trên thiết bị**. Schema, API, wireframes và dependency bên dưới đang chờ phê duyệt chi tiết; việc PO cho phép bảng mới không đồng nghĩa cho phép migrate trong nhiệm vụ này.

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

### 3.1. Bằng chứng chính thức

| Nguồn | Kết luận sử dụng |
|---|---|
| [Route v4](https://maps.vietmap.vn/docs/map-api/route-version/route-v4/) | Geometry, instructions với intervals, distance/time cùng response; dùng points_encoded=true/polyline5 và hai điểm P→B |
| [Leaflet integration](https://maps.vietmap.vn/docs/map-api/tilemap-leaflet/) | Giữ renderer hiện có; Leaflet không tự cung cấp navigation engine |
| [Native navigation SDK](https://github.com/vietmap-company/vietmap-react-native-navigation), [controller](https://github.com/vietmap-company/vietmap-react-native-navigation/blob/main/src/controller.ts) | Có SDK TBT; RN0.88 và injection joystick GPS vào engine chưa được chứng minh trong repo |
| [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/), [development builds](https://docs.expo.dev/develop/development-builds/introduction/) | watchPositionAsync foreground; phải kiểm tra permission/binary thiết bị |
| [Transaction rules](https://vietmap.vn/noi-dung-xac-dinh-transaction), [bảng giá](https://maps.vietmap.vn/web) | Route/tile transactions khác nhau; chưa biết hợp đồng/quota thực tế |
| [Wrapper license](https://github.com/vietmap-company/vietmap-react-native-navigation/blob/main/LICENSE) | License wrapper không thay thế quyền sử dụng dịch vụ VietMap |

Audit trước đã đọc registry theo GET: Native Navigation 3.0.0, Map SDK 3.0.0. README thử native đến RN0.85.2 không chứng minh build RN0.88; peer range cũng không phải bằng chứng chạy được. Chi tiết audit nguồn cũ được giữ tại history/2026-10-25-navigation-before-approved-d1d2-update-plan.md.

### 3.2. Đánh giá lại

| Tiêu chí | A — WebView + Route API | B — Native SDK | C — Hybrid |
|---|---|---|---|
| TBT D1 mới | Khả thi: route/instructions cùng response; tự viết progress/step matching | SDK guidance, vẫn phải giới hạn current leg | Hai lifecycle/renderers |
| Off-route | P→B, không đưa C/D vào request | Cần kiểm soát default/proactive rerouting | Phải reconcile target hai phía |
| Auto | Nội suy current routed leg | Native simulation có docs, chưa build repo | Có thể dùng provider TS |
| Joystick | Dịch tọa độ độc lập, controller nhận sample | GPS injection NOT_VERIFIED | Bridge riêng, marker không phải engine GPS |
| Expo58/RN0.88 | Giữ WebView; thêm một module GPS | Native compatibility NOT_VERIFIED | Mang rủi ro B |
| Sharing/history | REST + DB | Vẫn cần REST + DB | Không có lợi thế dữ liệu |
| Độ phức tạp | Vừa, custom TBT từng chặng | Native/build risk cao hơn | Cao nhất |

**Đề xuất A.** D1 mới gỡ blocker geometry-mismatch của plan trước. Chưa cam kết ngang SDK hoàn chỉnh; voice/lane guidance/offline routing không nằm trong scope. TBT phải được kiểm chứng bằng GPS/progress thực tế; marker chạy không đủ nghiệm thu. Nếu không đạt, báo FAIL và đánh giá lại thay vì giảm yêu cầu đã duyệt.

Route v4 không công bố profile bus riêng. Không suy ra profile car/truck bảo đảm mọi hạn chế xe buýt; cần đối chiếu dữ liệu xe và khả năng provider trước LIVE acceptance. Dùng encoded geometry để tránh mâu thuẫn mô tả coordinate non-encoded trong docs.

## 4. Segment Navigation Architecture

```text
Một provider LIVE/AUTO/JOYSTICK → sample → current-leg controller
                                            ├→ progress/instructions → map
                                            └→ publisher → DB → observers
Ordered stops → target kế tiếp → Route v4(P,B) → geometry + instructions
```

- Ordered stops giữ nguyên ID/thứ tự từ Route. routeVersion fingerprint geometry/stops và assignment liên quan; không lưu geometry snapshot mới.
- Phiên đầu dùng waypoint đầu trong danh sách; resume dùng targetStopId đã lưu hợp lệ. Không chọn nearest stop toàn tuyến rồi tự bỏ stops. Stops đồng vị trí có thể nhóm waypoint điều hướng nhưng không merge/xóa RouteStop/roster.
- Chỉ request current position P→target B. Giữ geometry/instructions của cùng paths[0] thành một segment response có segmentVersion, routeVersion, target và epoch. Không trộn intervals của route khác.
- Validate finite/bounds, polyline đủ điểm, interval trong range, distance/time hợp lệ. Invalid response không thành active route.
- Sample chuẩn hóa lat/lng, capturedAt, accuracyMeters/headingDeg/speedMps nullable. Adapter xử lý [lat,lng] Leaflet, [lng,lat] MapLibre, units mét/giây/thời gian rõ ràng.
- Progress chiếu lên **current routed geometry** theo cửa sổ liên tục; instruction dựa interval và khoảng cách dọc chặng, heading đủ tin cậy, hysteresis. Không dùng khoảng cách thẳng đến stop làm chỉ dẫn rẽ hoặc nearest branch trên toàn tuyến.
- Tới B hợp lệ thì âm thầm chuyển target C và route từ vị trí mới→C. Không tính/reroute các chặng tương lai, không bảo toàn geometry cũ bằng suffix hashes; bất biến cần giữ là thứ tự stops.
- Đi qua waypoint không Attendance, School Arrival, thông báo hoặc Complete. Hết waypoints thì ngưng guidance; Trip vẫn IN_PROGRESS tới thao tác thủ công.
- Planned polyline là preview/tham chiếu riêng, không phải nguồn instructions và không phải điều kiện geometry mới phải khớp.

Raw GPS khác projected progress. Không publish vị trí snap/nội suy từ route như tọa độ LIVE đo được. Map update qua bridge, không remount HTML mỗi tick.

## 5. Off-route Rerouting

1. Loại sample lỗi/cũ/accuracy kém/nhảy bất hợp lý; GPS không tin cậy thì ngưng guidance thay vì đoán.
2. Lệch current geometry phải qua nhiều mẫu, continuity/hysteresis; không chỉ một heading ngược hoặc so với toàn planned route.
3. Single-flight/cooldown ở controller; server kiểm tra owner, routeVersion, target, rate budget. Client không được gửi destination tùy ý.
4. Backend gọi **P→B**, không C/D, không VRP/optimize/solveTSP có straight-line fallback.
5. Chỉ response đúng epoch/target/version được thay cả geometry và instructions. Response cũ bỏ qua; không ghi RoutePlan/RouteStop/roster.
6. Route lỗi/quota/timeout: “Chưa có chỉ dẫn”. Đường cũ chỉ là tham chiếu; guidance cũ chỉ còn dùng được nếu GPS vẫn khớp route đó và cùng target. Khi off-route phải ngưng hướng dẫn cũ đến khi có route hợp lệ.

Ngưỡng khởi đầu đề xuất để UAT: lệch30–50m với accuracy tốt, ≥3 mẫu; cooldown20–30s; arrival15–30m kèm progress/dwell. Chưa phải giá trị đã nghiệm thu. Rate budget server có thể lưu lastRouteRequestedAt trong checkpoint khi route request, không tạo location RAM store. Không route mỗi GPS tick/poll. Provider timeout hữu hạn, không await provider trong transaction DB.

Acceptance bắt buộc: đường song song, giao cắt, vòng lặp, U-turn, stationary jitter, stops đồng vị trí. Trường hợp mơ hồ giữ target và tạm ngưng tự chuyển, không âm thầm skip.

## 6. LIVE GPS Integration & Automatic Resume — D3

Đề xuất expo-location ~58.0.19, foreground permission + watchPositionAsync; **chưa install**. Sampling khoảng1Hz best effort; publish sample mới nhất đủ điều kiện khoảng5s/lần. Không dùng WebView geolocation làm nguồn chính.

Automatic resume khi quay lại/mở lại app:

1. Đọc Trip/Session/checkpoint Backend. Chỉ IN_PROGRESS, đúng assigned Driver, enabled=true, ownerSessionId đúng, target/routeVersion còn hợp lệ.
2. Đăng ký đúng một watcher foreground, lấy GPS mới; không dùng tọa độ cũ như sample mới.
3. Renew bằng runId mới, giữ target hợp lệ, lấy nextSequence từ DB; route GPS hiện tại→target với response mới. Không yêu cầu bấm Start Trip/Start GPS lại trong trường hợp hợp lệ.
4. Refresh access token cùng Session giữ khả năng resume. Logout/revoke/đổi Driver/terminal hoặc owner khác → không tự chiếm phiên.
5. Manual stop lưu enabled=false và không tự restart. Checkpoint sai target/version → trạng thái cần khôi phục, không đoán nearest-stop.

Background/khóa màn hình/mất focus điều hướng/unmount: cleanup watcher/timers/publisher và request cũ. Chỉ checkpoint được giữ; không background permission/task/service/notification. Permission denied: “Chưa có GPS”; accuracy kém: “GPS yếu”. Không tự fallback TEST.

Mạng mất không buffer/backfill toàn stream; chỉ newest sample còn hạn có thể gửi. Resume tạo runId mới khi producer gián đoạn; không elapsed catch-up hoặc history cho thời gian app tắt. GPS resume không Start/Complete/Arrival/Attendance.

## 7. TEST Automatic Simulation

Nút riêng **“Tự động di chuyển”**, chỉ TEST do Backend cho phép và assigned Driver đủ quyền. AUTO có provider riêng nội suy arc length của **current VietMap routed leg**, tangent heading, preset speed, monotonic elapsed time trong foreground.

Đến cuối chặng chờ route hợp lệ tới target sau; không sinh trước cả trajectory vào DB. Publisher runtime lưu thưa như nguồn khác. Không dùng planned line giả làm navigation thành công khi Route API lỗi. Nếu current route vẫn hợp lệ có thể tiếp tục; chưa có route hợp lệ thì Auto pause/unavailable.

Background → pause; resume reset clock, không cộng thời gian tắt app. Task này không thực thi mode hoặc ghi điểm để test. Sau implementation ít nhất một mode phải được kiểm chứng vận hành trong phạm vi PO cho phép.

## 8. TEST Joystick Simulation

Nút riêng **“Lái thủ công”**. JOYSTICK provider dịch lat/lng theo bearing/speed và foreground delta-time, không gọi thuật toán Auto. Nhả điều khiển → speed0; cleanup khi đổi mode/background.

Có thể điều khiển virtual point độc lập khi routing lỗi, nhưng lúc đó **không chỉ dẫn rẽ/ETA route giả** và không được coi là acceptance TBT. Off-route vẫn chỉ P→B. Heading/speed transient, không lưu mỗi history point. Phương án A không cần SDK GPS injection chưa được chứng minh.

## 9. Mode Exclusivity & Failure Strategy

Chỉ một provider/watcher/timer/publisher active. Switch dừng nguồn cũ, tăng generation, renew runId; server từ chối epoch cũ. LIVE deployment từ chối TEST tại server, không chỉ ẩn nút.

| Lỗi / lifecycle | Hành vi |
|---|---|
| Route không hợp lệ | Không TBT; planned line chỉ preview có nhãn |
| Một simulation mode lỗi | Người dùng chủ động chọn mode kia nếu khả dụng, không tự chuyển nguồn |
| GPS denied/lost | Không tự giả GPS hoặc chuyển TEST |
| Foreground lại | LIVE tự resume theo D3; TEST reset clock/speed nếu được restore, không catch-up |
| Terminal/revoke/reassign | Dừng publish/control, chuyển viewer; giữ history thật đã ghi |

Hai mode độc lập về movement algorithm dù dùng chung controller/publisher. Ít nhất một mode cần PASS trên app và cross-role observer; pure math test không thay smoke test. Mode chưa kiểm chứng phải ghi rõ NOT_VERIFIED/FAIL.

## 10. Cross-role Location Sharing — Persisted Position

**DB là nguồn vị trí dùng chung duy nhất.** Query point cuối theo (tripId, sequence DESC). Không lastLocation Map/RAM session store/Redis/event bus. Restart/multiple instances cùng đọc history/checkpoint.

- Năm role xem theo object scope Trip hiện có; assigned Driver publish.
- Mobile gộp location vào refresh5s hiện có khi IN_PROGRESS; Web nhánh location5s chỉ detail visible, giữ metadata/roster cadence riêng. Không buộc refresh thủ công.
- DTO latestPoint|null + serverNow/freshness. Chưa có point không đặt marker giả ở điểm đầu planned line; stale hiện “Mất cập nhật” và thời điểm cuối.
- Driver local thấy raw provider ngay; observer thấy persisted point có độ trễ. Animation marker không tạo history.
- Terminal dừng polling, lazy-load history phân trang; generation guard loại response Trip cũ. Không gửi toàn bộ history mỗi poll hoặc gọi VietMap qua GET refresh.

Không lưu lat/lng/lastSequence trong navigationState. Transient client controller chỉ phục vụ UI, không làm kho vị trí authoritative thứ hai.

## 11. Authorization & Privacy

Tái sử dụng assertTripAccess hiện có; expose helper có kiểm soát khi tách navigation service, không copy RBAC.

| Actor | Xem latest/history | Publish/control/active routing |
|---|---|---|
| SYSTEM_ADMIN | Quyền Trip hiện có | Không |
| SCHOOL_ADMIN | Đúng trường | Không |
| DRIVER | Trip được phân công | Đúng Driver + IN_PROGRESS + valid owner |
| BUS_ATTENDANT | Trip được phân công | Không |
| PARENT | Con thuộc roster, còn quyền liên kết | Không |

Mọi endpoint xác thực JWT/Session/object scope; tripId/runId không thay quyền. Parent giữ masking: không leak tên học sinh/stop người khác hoặc roster qua history. Không mở quyền Trip khác. OwnerSessionId lấy từ CurrentSessionId server-side, không body; không trả owner cho observer.

Session khác không auto takeover; trả409. Claim lease hết hạn phải rõ ràng, đúng assigned Driver và atomic DB control. Lease freshness từ point current-run gần nhất hoặc activatedAt khi chưa có point. Revoked session/assignment mới mất quyền tại request tiếp theo.

Server gate TEST/LIVE; activeSource chỉ cho control/resume, không lưu discriminator trong history hoặc badge TEST/LIVE viewer. Validate finite/bounds/capturedAt/body size/rate. Routing key ở Backend, tile key scope tile; không lộ key trong DTO/log.

## 12. Minimal Database Design — Proposal, Not Migrated

### 12.1. Một bảng, sáu cột

```prisma
model TripLocationPoint {
  tripId     String   @map("trip_id")
  sequence   Int
  latitude   Float
  longitude  Float
  recordedAt DateTime @default(now()) @map("recorded_at")
  runId      String   @map("run_id")
  trip       Trip     @relation(fields: [tripId], references: [id], onDelete: Restrict)

  @@id([tripId, sequence])
  @@map("trip_location_points")
}
```

Composite PK là index duy nhất, phục vụ latest/history/cursor/idempotency. Không thêm UUID id, timestamp index, FK User/Vehicle/Route/Session, source enum hoặc speed/heading/accuracy/raw payload. Trip inverse relation locationPoints không thêm cột vật lý. Restrict bảo vệ history, cần review delete paths khi triển khai.

sequence tăng toàn Trip, không reset khi renew run; Int tránh BigInt serialization. recordedAt là thời gian server chấp nhận/lưu, **không tuyên bố timestamp đo GPS chính xác**. capturedAt/accuracy dùng validation input, chưa cần cột riêng. runId đánh dấu khoảng thu thập liên tục, không phân biệt TEST/LIVE.

### 12.2. Một checkpoint nullable trên Trip

Đề xuất **Trip.navigationState Json?**, default null cho Trip cũ. Shape được validate/version server-side: ownerSessionId, runId, enabled, activeSource, targetStopId|null, routeVersion, activatedAt; lastRouteRequestedAt nếu dùng rate budget. Không geometry/instructions/coordinates/point arrays/lastSequence.

Field phục vụ owner trước điểm đầu, manual stop và resume đúng target ở tuyến vòng. Chỉ last point không đủ biểu diễn các trạng thái này; session table riêng dư cấu trúc, RAM-only không phục hồi sau restart. Đây là field đề xuất cần PO duyệt cùng plan, chưa sửa schema.

### 12.3. Write path và Trip Operations

- Nominal tối đa1point/5s/Trip, server kiểm theo latest point qua mọi run. Không INSERT lặp sample cũ hoặc backfill offline.
- PUT mang runId + next expected sequence. Retry cùng key/cùng tọa độ ack đã ghi; payload khác cùng key409. Auth/status/run phải kiểm trước ack retry; unique PK xử lý race. Không lưu counter thứ hai.
- Transaction telemetry riêng, ngắn: Trip **FOR SHARE**, đọc lại status/assignment/checkpoint, validate cadence/sequence/sample, INSERT, commit. Không update Trip mỗi point, không await VietMap trong lock.
- FOR SHARE phối hợp TripOperation FOR UPDATE hiện có: nếu Complete đã thắng thì publish bị từ chối; nếu insert giữ lock trước thì hoàn tất trước Complete. Không ghép telemetry vào transaction nghiệp vụ. Tham chiếu [PostgreSQL row locks](https://www.postgresql.org/docs/current/explicit-locking.html).
- Vẫn có contention ngắn, không hứa zero latency impact. Cần timeout hữu hạn, lookup theo index, benchmark; lỗi telemetry không rollback hoặc chặn thao tác nghiệp vụ ở client.
- START/RESUME/STOP/SWITCH/advance target update checkpoint hiếm bằng transaction riêng/lock/CAS. Không heartbeat Trip mỗi GPS tick. Không nested transaction hoặc refactor ranh giới TripOperation.
- VietMap call ngoài transaction; kiểm epoch/target lại sau response. Control state dùng chung DB cho nhiều instances, không RAM authoritative.

### 12.4. COMPLETED và gaps

| Dữ liệu | Hiển thị |
|---|---|
| Zero history | Stored planned polyline, “Tuyến dự kiến” |
| ≥2 điểm liên tục | Polyline từ điểm đã ghi, “Hành trình ghi nhận” |
| Đổi runId / khoảng thời gian lớn | Các polyline parts rời; “Có đoạn chưa ghi nhận” |
| Một point / isolated points | Marker ghi nhận, không bịa đoạn nối hoặc coi như zero history |

Gap threshold ban đầu15s (=3×cadence), phải UAT; runId đổi khi producer gián đoạn/resume/switch. Nối giữa samples chỉ xấp xỉ phần đã ghi, không bảo đảm bao phủ mọi mét đường. Không bridge gaps bằng planned line/Map Matching/Route API. Planned line chỉ xem riêng khi phù hợp, không pha vào recorded line.

Không backfill Trip cũ hoặc tạo actual coordinates từ planned line. Migration tương lai chỉ DDL bảng/PK/FK + nullable field, không seed/DML. Không tự retention-delete; theo dõi tăng trưởng, chính sách retention dài hạn để ngoài scope ban đầu.

## 13. API Contracts — đề xuất, chưa được triển khai

Trong TripsModule, controller mỏng, service gọi Prisma và adapter VietMap. Date ISO, lat/lng number, sequence Int, envelope hiện có; không generic repository mới.

| Method/path | Input/quyền | Output/hành vi |
|---|---|---|
| GET /trips/:id/navigation | Mọi viewer đúng scope | routeVersion, latestPosition|null {sequence,lat,lng,recordedAt,runId}, serverNow, freshness, canPublish; checkpoint cần resume chỉ cho Driver đủ quyền |
| PUT /trips/:id/navigation/session | Assigned Driver IN_PROGRESS; action START/RESUME/STOP/SWITCH, expectedRunId, source khi cần | Server bind Session/sinh runId, enabled/target, nextSequence, publishIntervalMs. STOP enabled=false; START waypoint đầu; RESUME giữ target. Không Start Trip |
| POST /trips/:id/navigation/segment | Owner; action CURRENT/ADVANCE, runId, routeVersion, expectedTargetStopId, current sample | CURRENT P→target; ADVANCE xác minh tới mốc, chỉ advance target kế tiếp, route tới đó. Trả segmentVersion, geometry/instructions cùng response, target/distance/time; hết stops trả trạng thái kết thúc navigation |
| PUT /trips/:id/navigation/position | Owner; runId, sequence, lat/lng, capturedAt, accuracyMeters nullable | Append point; ack sequence/recordedAt/nextSequence; retry idempotent, không sửa history |
| GET /trips/:id/location-history | Mọi viewer; afterSequence, limit default500/max1000, snapshotMaxSequence từ trang đầu cho trang tiếp | points [{sequence,lat,lng,recordedAt,runId}], nextCursor, hasMore, snapshotMaxSequence, serverNow |

Contract invariants:

- Không nhận destination/geometry/stop order tùy ý. ADVANCE lưu checkpoint trước provider call; retry expectedTarget cũ trả409/resync, không advance thêm lần nữa.
- Invalid/empty route/interval sai →502 ROUTING_UNAVAILABLE; quota/timeout503. Không success với fallback đường thẳng. Guidance lỗi không ngăn lưu GPS đủ quyền; Auto pause khi không có route để di chuyển.
- 400 malformed sample/cursor/enum;401 Session;403 quyền/source;404 Trip;409 terminal/owner/run/version/target/sequence;429 cadence/rate budget + retryAfterMs;500 sanitized error.
- History snapshot chốt maxSequence ở trang đầu; các trang không giả partial history là toàn hành trình. Terminal publish gate làm dữ liệu ổn định. Không trả roster/owner/source cho observer.
- canPublish hỗ trợ UI, không thay xác thực lại trên write. Swagger mô tả null/units/DTO/pagination/error/mode gate; phải kiểm /api/docs sau implementation. Task này không đổi API runtime.

## 14. Mobile UI Wireframes — chờ PO duyệt

Giữ Trip Detail hiện có; wireframe Driver:

```text
[‹] Chuyến sáng                         [Đang chạy]
┌───────────────────────────────────────────────┐
│ Bản đồ · xe · current routed leg             │
│                         [Theo xe] [Tuyến]     │
└───────────────────────────────────────────────┘
[↱ Rẽ phải · 120 m]                   [Điểm 3/8]
[Điểm tiếp theo · tên được phép hiển thị]
[Điều hướng] / [Dừng điều hướng]
TEST: [Tự động di chuyển] [Lái thủ công]
      mode đang chọn được tô; joystick khi chọn
[Các thao tác Trip hiện có]
```

- Phiên hợp lệ tự resume sau fresh GPS/route; không thêm xác nhận resume thường trực.
- Lỗi thay guidance bằng “Chưa có chỉ dẫn”/“Chưa có GPS”/“GPS yếu”/“Mất cập nhật”; không chỉ dẫn giả hoặc thông báo đi qua stop.
- Hai nút TEST riêng, một mode; không nhãn TEST/LIVE trên viewer/history. BUS_ATTENDANT/PARENT chỉ xem map/freshness, không control; giữ parent masking cả stop labels.
- COMPLETED: “Hành trình ghi nhận”, multipart và “Có đoạn chưa ghi nhận” nếu gap; zero history “Tuyến dự kiến”; một point là marker. Toggle planned chỉ tham chiếu, không trộn vào recorded.
- Màu token #FFCB56/#FFFDF6/#1E293B/#FFFFFF. Không text giải thích dài hoặc thuật ngữ epoch/JSON/cadence nội bộ. Đây là wireframe, chưa code.

## 15. Web Viewer Wireframes — chờ PO duyệt

```text
Chuyến xe                            [Đang chạy]
┌──────────────────────────────────────────────┐
│ MapLibre · vị trí xe               [Theo xe]│
└──────────────────────────────────────────────┘
[Cập nhật lúc HH:mm:ss] / [Mất cập nhật]
[Thông tin / phân công / roster hiện có]
COMPLETED: [Hành trình ghi nhận] [Tuyến dự kiến]
           [Có đoạn chưa ghi nhận] nếu cần
```

SYSTEM_ADMIN/SCHOOL_ADMIN theo scope hiện có, không controls Driver. Giữ map instance, setData marker/MultiLineString recorded parts; không fitBounds mỗi poll. Zero history mặc định planned; single point marker. Poll visible/cleanup khi đổi Trip; history lazy pagination/generation guard.

## 16. Performance & VietMap Cost

Thông số đề xuất chưa benchmark: GPS~1Hz, persist≤1point/5s/Trip, viewer poll5s visible. Observer có thể chờ5s persist +5s poll +network, ví dụ11–12s với network1–2s; không SLA realtime, mạng/OS yếu có thể lâu hơn.

- 720points/giờ. Ví dụ60Trip/ngày×2giờ =86.400points/ngày, 2.592.000/30ngày. Đây là phép tính, không load test; đo pg_total_relation_size thay vì đoán storage MB.
- 50xe active≈10INSERT/s;500observers≈100GET/s chưa tính auth. PK cho latest/history, select nhỏ, tránh N+1; đo latency/lock trước thêm index/cache.
- Không stream1Hz xuống DB, không Trip JSON update mỗi point, không embed history mỗi metadata poll.
- Routing calls≈chặng đã điều hướng +reroutes thực sự +resumes cần route mới. Không full future route, không route theo GPS tick/poll; single-flight/cooldown/provider timeout.
- Route hai điểm có transaction theo [quy tắc VietMap](https://vietmap.vn/noi-dung-xac-dinh-transaction); tiles riêng. Giá/quota tài khoản chưa xác minh, không coi plan là báo giá.
- Restart đọc DB/checkpoint; chưa thêm RAM location cache hoặc retention job.

## 17. Dependencies & Compatibility

| Thành phần | Trạng thái |
|---|---|
| Expo58.0.19/RN0.88.0/React19.3.0/WebView14.0.1 | Repo hiện có; native runtime chưa được test trong planning |
| expo-location ~58.0.19 | Dependency mới duy nhất đề xuất; Expo metadata/docs phù hợp; **chưa được phép install** |
| Native navigation SDK/dev-client | Không đưa vào phương án mặc định hoặc cài đặt |
| Mobile Leaflet1.9.4/Web MapLibre6.15.0 | Tái sử dụng layer/marker/bridge |
| Backend/Prisma | Không thêm package |

Review quyền/config iOS/Android khi triển khai, không background capability. Expo Go docs/peer ranges không chứng minh thiết bị repo PASS. Nếu cần binary/build tool mới, trình bày yêu cầu cụ thể trước khi thêm dependency khác.

## 18. Implementation Plan — sau phê duyệt

| Giai đoạn | Files dự kiến | Exit gate |
|---|---|---|
| DB/contracts | api/prisma/schema.prisma; một migration DDL mới; api/src/trips/dto/trip-navigation.dto.ts; trips.controller.ts/module.ts | Một bảng6cột + nullable JSON; validate/DDL review; không backfill |
| Service | api/src/trips/trip-navigation.service.ts; trips.service.ts helper quyền tối thiểu; routes/routes.module.ts; routes/vietmap-vrp.service.ts | Dedicated route không straight-line fallback; persisted control/points/latest/history, không refactor TripOperation |
| Mobile controller | mobile/utils/trip-navigation.ts; mobile/hooks/use-trip-navigation.ts; mobile/services/api-client.ts | Progress/instructions, exclusivity, publish/resume; không shared package |
| GPS/simulation/UI | mobile/package.json/lock nếu duyệt; mobile/app.json/config nếu cần; mobile/app/trip/[id].tsx; mobile/hooks/use-foreground-location.ts; movement providers liên quan | Wireframe duyệt; TBT GPS, hai mode, ít nhất một mode vận hành PASS |
| Observers | mobile/hooks/use-trip-detail-refresh.ts/helper liên quan; web/src/app/admin/trips/[id]/page.tsx; web/src/components/admin/routes/route-map.tsx; web/src/lib/api-client.ts/types.ts; refresh hook liên quan | Latest DB polling; multipart completed history; planned fallback đúng |
| Verify/report | api/src/trips/trip-navigation.spec.ts; pure scripts/tests Mobile/Web theo hạ tầng; docs/ai-review/LATEST.md/.diff | Safe checks, Swagger runtime, thiết bị/UAT đúng phạm vi dữ liệu |

File mới là dự kiến, tách khi có trách nhiệm rõ, không chia module máy móc. Không sửa route approval/attendance rules hoặc migrations hiện tại. Kiểm git status trước implementation, bảo vệ uncommitted work. Bảng được chấp nhận về chủ trương không tự cấp quyền migrate; phải có chỉ thị triển khai. Không đóng tính năng nếu chỉ marker chạy mà TBT/mode chưa kiểm chứng.

## 19. Test / UAT Scenarios

### 19.1. An toàn không chạm DB

tsc ba project; prisma validate khi schema được triển khai; DDL/Swagger review. Chỉ pure tests/in-memory mocks đã rà soát không side effects, không dựng fake API responses để trình diễn PASS. Cases interval boundaries/units/loops/late responses/mode cleanup/pagination/gaps; không suy ra device success từ unit tests.

### 19.2. Acceptance vận hành

| Case | Phải xác minh |
|---|---|
| D1 khác planned geometry | Geometry/instructions cùng response; planned không ghi đè |
| TBT thực tế | Rẽ/progress đúng GPS; ngưng guidance khi route/GPS không hợp lệ |
| Off-route P→B | Request không C/D; thứ tự/roster nguyên; quota lỗi không fallback giả |
| Loop/crossing/arrival | Không skip target do nhầm nhánh, không tự milestones/thông báo |
| D3 foreground/reopen | Một watcher mới, fresh sample, đúng owner/target, không auto Start/Complete |
| D3 stop/revoke/reassign | Stop không restart; owner cũ bị từ chối; không silent takeover |
| Auto/Joystick | Hai nút riêng/một nguồn; không catch-up; ≥1mode PASS app+observer |
| Restart/multi-instance | Persisted latest/history/checkpoint, idempotent sequence, không phụ thuộc RAM |
| Complete vs publish | Complete thắng thì không insert; telemetry không kéo dài operation bất hợp lý |
| COMPLETED history | Recorded parts, gap không bridge; một point marker; zero history planned |
| Năm role/privacy | Object scope và masking; không leak owner/roster |
| Performance | Cadence cap, GET/lock latency, pagination; route calls không tăng theo poll |

**Runtime/UAT hiện tại: NOT_VERIFIED**, nhiệm vụ chỉ cập nhật plan, chưa implementation. Cases phải phát sinh points/POST/PUT/start/complete mà chưa được cấp môi trường/dữ liệu/phạm vi ghi: **BLOCKED_BY_TEST_DATA_POLICY**. Không chạy để “verify plan”.

Điều kiện PO cần cấp cho UAT tương lai: Trip IN_PROGRESS hợp lệ, assigned Driver/Attendant, Parent có con roster, hai admin đúng scope, RouteStops có tọa độ đi được, key/quota, thiết bị foreground GPS và quyền ghi location đúng Trip trong môi trường chỉ định. Cần Trip COMPLETED không history và history/gaps do vận hành được cho phép. Không tự tạo users/students/trips/coordinates, seed hoặc backfill.

## 20. Changes, Risks & Open Decisions

| Plan trước | Plan cập nhật |
|---|---|
| Saved geometry phải khớp route/instructions mới | Current-leg response VietMap authoritative, được khác planned |
| Tách suffix saved segments/hashes | Chỉ bảo toàn stop order; route chặng tiếp khi cần |
| RAM-only position, restart mất | Một bảng points + checkpoint nullable; latest DB cho observer |
| COMPLETED chỉ planned | Recorded multipart ưu tiên; zero history mới fallback planned |
| Resume chưa chắc khi reopen | Auto foreground/reopen theo Session/target checkpoint |
| Publish~3s/source badges | Đề xuất5s giảm DB; không TEST/LIVE history labels |
| D1/D2/D3 còn câu hỏi | Đã ghi nhận PO; không hỏi lại |

Giới hạn: WebView custom step/progress/off-route cần prove trên thiết bị; foreground tạo gaps không thể phục hồi; sampled line chỉ xấp xỉ phần đã ghi; native GPS/pin/accuracy/binary chưa test; profile xe/quota/giá provider chưa xác minh. DB tăng trưởng và contention cần đo. Checkpoint JSON phải validate/version, không cho client ghi tùy ý.

**Không còn câu hỏi nghiệp vụ D1/D2/D3.** Còn chờ PO review schema/checkpoint/contracts/wireframes và giao triển khai. Dependency mới **expo-location ~58.0.19** chưa được cho phép install; cần duyệt rõ cùng implementation theo WORKING_RULES. UAT ghi dữ liệu cần môi trường/Trip/phạm vi cho phép riêng. Ngưỡng kỹ thuật để UAT không tạo thêm câu hỏi nghiệp vụ; retention dài hạn chỉ ghi rủi ro, chưa thêm tính năng dọn dữ liệu.

## 21. Readiness & Recommendation

**UPDATED PLAN COMPLETED — READY FOR IMPLEMENTATION REVIEW.** D1/D2 mới thay quyết định cũ, D3 đi vào lifecycle/API/checkpoint. Không còn blocker khớp geometry cũ và không RAM/DB last-position duplication.

**Chưa implementation approval.** Không sửa source/schema/lockfile, install/migrate/mutate trong task này. TBT thực tế/GPS resume/simulation cross-role vẫn NOT_VERIFIED; readiness của plan không phải tính năng đã PASS.

**Một bước tiếp theo:** PO review/phê duyệt plan cập nhật gồm DB/checkpoint, API, wireframes và dependency GPS đề xuất trước khi giao triển khai. STOP AFTER UPDATED PLAN.
