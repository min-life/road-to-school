# AI Review — Vehicle Navigation & Simulation Implementation

## 1. Task Information

- Date: 25/10/2026. Scope: API / Database / Mobile / Web / Documentation. Type: Implementation.
- Status: **PARTIAL** — implementation và safe verification hoàn tất; runtime acceptance chưa có phạm vi UAT được cấp.
- Final readiness: **READY_WITH_LIMITATIONS**. Không phải READY_FOR_PRODUCTION.
- Repository đã có nhiều staged/modified/untracked files trước task. Bảo vệ baseline riêng, không commit/push/reset/discard. Diff này so với snapshot trước task, không so với HEAD để tránh trộn công việc cũ.

## 2. Original Request

PO phê duyệt triển khai thống nhất kế hoạch Vehicle Navigation & Simulation: TBT VietMap theo chặng hiện tại, reroute P→B, foreground GPS/automatic resume, hai mode TEST riêng, tracking năm role, lưu hành trình và xem lại Trip COMPLETED. Không dừng sau planning hoặc xin duyệt lại từng phase. Hoàn tất phần có thể kiểm chứng an toàn; runtime chưa đủ điều kiện phải báo trung thực.

Nguồn phê duyệt: yêu cầu đính kèm `3815b964-17f4-46e8-8b6c-4225159410af`, thay thế giới hạn planning-only của nhiệm vụ trước. Giữ D1/D2/D3 mới nhất; không diễn giải yêu cầu triển khai thành quyền tạo dữ liệu UAT.

## 3. Approved Scope

**Approved Decisions (B):**

- D1: geometry và instructions cùng response VietMap Route v4; geometry được khác planned polyline; chỉ current-leg route/reroute, giữ stop order/RoutePlan/roster/assignment.
- D2: đúng một bảng TripLocationPoint 6 cột, một Trip.navigationState nullable JSON; latest persisted position làm nguồn dùng chung. Migration additive và Prisma generation được phê duyệt.
- D3: foreground-only, tự resume cùng Session/Trip/target hợp lệ khi foreground/reopen; không background tracking hoặc history giả khi app tắt.
- Mobile Leaflet/WebView và Web MapLibre hiện có; REST polling; wireframes được duyệt; hai nút TEST độc lập.
- Chỉ thêm `expo-location ~58.0.19` qua lệnh Expo đã được PO cho phép. Không package/native SDK/Redis/WebSocket mới khác.
- Không tự Attendance/Arrival/Complete, không stop notifications; không sửa logic TripOperation/approval/roster, không backfill/seed/business-data test mutations.

Không còn quyết định nghiệp vụ/schema/UI/dependency thiếu trong scope này. Chưa có phạm vi ghi UAT hoặc quyền/quota gọi Route API thực tế để test.

## 4. Analysis & Decisions

**Scope Completed (A), Backend (D):**

- Tách adapter VietMap trong TripsModule để không tái sử dụng VRP/TSP fallback đường thẳng. Mỗi call chỉ origin và target; validate polyline5, bounds, distance/time, instruction intervals liên tục trên cùng geometry và endpoint snap≤100m. Invalid route không thành guidance hợp lệ.
- Navigation target tách khỏi business milestones. Target mới sau origin PARKING_START/SCHOOL_DEPARTURE; nhóm waypoint liền kề đồng vị trí≤1m chỉ về navigation. Nếu toàn bộ đồng vị trí vẫn giữ target đầu để xác minh arrival. Không xóa/đổi stops hoặc roster; START/RESUME giữ target cũ hợp lệ.
- Server bind Session, CAS run/version/target, source gate TEST/LIVE. Assigned Driver là publisher; reuse assertTripAccess cho viewer năm role, Parent qua roster. Không trả ownerSessionId. controlRunId chỉ Driver để explicit START, không phải credential thay quyền.
- Khác Session không tự takeover. START chủ động chỉ được claim khi lease cũ hết60s; RESUME không chiếm phiên khác. ManualSTOP lưu disabled và không tự bật lại.
- Current geometry/instructions ở client dùng transient để guidance. Vị trí dùng chung chỉ đọc DB; JSON không lưu lat/lng/history/counter. Không RAM store authoritative thứ hai.
- Position append riêng, cadence5s/Trip qua mọi run, sequence tăng toàn Trip, same-key/same-payload idempotent. P2002 cạnh tranh được rollback rồi revalidate/ack; payload khác409. Validate capturedAt≤15s cũ/+5s tương lai, LIVE accuracy≤50m.
- Telemetry transaction ReadCommitted, Trip FOR SHARE, lock_timeout1500ms, timeout3500ms/maxWait2000ms; đọc lại status/assignment/session/checkpoint trước insert. Không update Trip mỗi GPS point. Control/cursor dùng FOR UPDATE ngắn; network VietMap ở ngoài transaction, revalidate sau response.
- Route cooldown20s giữ budget qua resume/switch, trả retryAfterMs; timeout provider10s. ADVANCE có thể lưu target trước upstream failure; client refetch/reconcile, không retry target cũ để skip thêm.
- Khoảng trống history được chia theo runId, gap>15s hoặc mất sequence. Single point là marker, không suy ra cả tuyến. Zero history mới fallback planned; recorded/planned được xem riêng.

Đây là lựa chọn triển khai trong scope được duyệt. Ngưỡng GPS/arrival/loop continuity là giá trị khởi đầu cần UAT, chưa có bằng chứng navigation đạt độ tin cậy thiết bị thực tế.

## 5. Implementation Details

28 source/test/schema/package files thuộc task:17 mới,11 sửa. 323 source files có trong baseline ngoài phạm vi sửa giữ nguyên bytes. Không xóa source files.

| File | Loại / thay đổi |
|---|---|
| api/prisma/schema.prisma | Sửa: bảng history, nullable checkpoint và inverse relation |
| api/prisma/migrations/20261025130000_add_trip_navigation_history/migration.sql | Mới: additive DDL |
| api/src/trips/dto/trip-navigation.dto.ts | Mới: request/response/validation/Swagger |
| api/src/trips/trip-navigation.controller.ts | Mới:5 endpoints có guards |
| api/src/trips/trip-navigation.service.ts | Mới: quyền, persisted control, append/latest/history, route coordinator |
| api/src/trips/vietmap-navigation.service.ts | Mới: Route v4 adapter và strict validation |
| api/src/trips/utils/navigation-state.ts | Mới: checkpoint parser, fingerprint và khoảng cách |
| api/src/trips/trip-navigation.spec.ts | Mới:31 tests với mocks/pure helpers |
| api/src/trips/trips.module.ts | Sửa: đăng ký controller/services mới |
| api/src/trips/trips.service.ts | Sửa: public assertTripAccess để reuse, không sửa TripOperation |
| mobile/app.json | Sửa: Expo Location plugin foreground permissions |
| mobile/app/_layout.tsx | Sửa: hook mở lại Trip có navigation hợp lệ |
| mobile/app/trip/[id].tsx | Sửa: nối refresh/navigation/controls/history vào Trip Detail và WebView bridge |
| mobile/components/trip-navigation-controls.tsx | Mới: guidance,2 nút TEST, joystick, stop |
| mobile/hooks/use-trip-navigation.ts | Mới: một engine foreground, GPS/Auto/Joystick, route/publish/resume |
| mobile/hooks/use-navigation-reopen.ts | Mới: kiểm server trước tự mở lại Trip Detail |
| mobile/services/navigation-resume-storage.ts | Mới: SecureStore chỉ Trip ID gợi ý theo user |
| mobile/services/trip-navigation.ts | Mới: typed API và history cursor pagination |
| mobile/services/api-client.ts | Sửa: bảo toàn retryAfterMs từ API error |
| mobile/utils/trip-navigation.ts | Mới: geometry/progress/instructions, hai movement algorithms, history parts |
| mobile/scripts/trip-navigation.test.ts | Mới:9 pure tests navigation/movement/history |
| mobile/package.json | Sửa: expo-location ~58.0.19 |
| mobile/package-lock.json | Sửa: chỉ thêm expo-location; không nâng/xóa package khác |
| web/src/app/admin/trips/[id]/page.tsx | Sửa: location poll5s, metadata15s, lazy terminal history |
| web/src/components/admin/routes/route-map.tsx | Sửa: marker/layers/history/follow, giữ map instance |
| web/src/lib/trip-location.ts | Mới: API latest/history với pagination |
| web/src/lib/trip-location-history.ts | Mới: tách parts/gaps/single points |
| web/src/lib/trip-location-history.test.ts | Mới:3 pure history tests |

Documentation: cập nhật architecture plan21mục, CURRENT_STATE dated addendum, LATEST13mục và LATEST.diff. Lưu3 bản trước implementation tại `history/2026-10-25-navigation-approved-{plan,review}-before-implementation.*`. Giữ các archive cũ. Generated build/export/client outputs không đưa vào task diff.

**Dependencies (G):** `npx expo install expo-location` đã chạy trong mobile, version~58.0.19. Lock comparison: thêm duy nhất `node_modules/expo-location`, không remove/change version package hiện có. Không thay API/Web dependencies. Không cài native navigation SDK/dev-client.

## 6. Database Changes

**Database (C):**

- Model mới TripLocationPoint: tripId, sequence, latitude, longitude, recordedAt(defaultnow), runId. Mapping table `trip_location_points`.
- PK(tripId,sequence) là index duy nhất. FK Trip onDeleteRestrict/onUpdateCascade. Không UUID id/source/speed/heading/audit/session table.
- `Trip.navigationState Json?` → nullable JSONB `navigation_state`. Shape version1 server-owned; inverse `locationPoints` không tạo cột khác.
- Trước thay đổi:9 migrations đã apply, schema→DB không drift. Migration mới `20261025130000_add_trip_navigation_history` chỉ ADD COLUMN, CREATE TABLE+PK, ADD FK.
- Đã apply bằng `npx --no-install prisma migrate deploy`; nay10 migrations current. `prisma validate`, generation và post-migration drift check PASS (diff rỗng).
- Generation lần đầu bị Windows EPERM do API worker giữ Prisma DLL. Đã xác minh và dừng đúng worker API đó, giữ Nest watch, generate lại thành công; watch phục hồi API, Swagger200. Không tạo dev server trùng port.
- Read-only check cuối:0 points,0 navigation checkpoint khác null; PK index duy nhất đúng schema. Không seed/backfill hoặc đổi lịch sử Trip. Trip cũ checkpoint null tiếp tục dùng planned fallback.
- Không benchmark contention DB thật. Mock lock assertions không thay race test Complete/reassign/Stop/Switch/duplicate sequence trên DB.

## 7. API & Swagger Changes

**Backend contracts (D)** — prefix thật `/api/v1/trips/{id}`. Envelope/authentication hiện có được giữ.

| Method/path | Request | Response / quyền |
|---|---|---|
| GET /navigation | Trip ID | NavigationStateDto: status/routeVersion/latestPosition/freshness/serverNow/canPublish/testMode/checkpoint/nextSequence/controlRunId/publishIntervalMs; viewer đúng Trip scope |
| PUT /navigation/session | NavigationSessionDto: START/STOP/SWITCH/RESUME, source khi cần, expectedRunId | NavigationStateDto; assigned Driver IN_PROGRESS/Session hợp lệ |
| PUT /navigation/position | PublishPositionDto: runId,sequence,latitude,longitude,capturedAt,accuracyMeters | PositionAckDto: sequence,nextSequence,recordedAt; owner/run/source hợp lệ |
| POST /navigation/segment | NavigationSegmentDto: CURRENT/ADVANCE,runId,routeVersion,expectedTargetStopId,position | NavigationRouteDto: segmentVersion,targetStopId,routeVersion,geometry,instructions,distanceMeters,durationSeconds,finished; current-leg only |
| GET /location-history | afterSequence,limit(default500,max1000),snapshotMaxSequence | LocationHistoryDto: points,nextCursor,snapshotMaxSequence,hasMore; viewer đúng Trip scope |

- Position DTO dùng latitude/longitude, time ISO, accuracy mét, geometry polyline5. LIVE yêu cầu accuracy≤50m; TEST source bị từ chối ở LIVE và GPS không dùng trong TEST.
- Checkpoint chỉ trả owner hiện tại với routeVersion hợp lệ; Session ID không xuất hiện trong response. History không trả source, học sinh hoặc roster. canPublish không thay quyền server.
- DTO validations gồm nested sample bắt buộc, coordinate bounds, enum/sequence/cursor limits. Errors400/401/403/404/409/429/500; segment thêm502invalid route và503unavailable/quota/network;429 có retryAfterMs.
- Runtime verification: GET `http://localhost:3000/api/docs`200, `/api/docs-json`200, đủ5 paths với bearer security,11 response/body schemas được tham chiếu (query DTO thể hiện qua query params), error codes đúng. Hai GET mới không credentials trả401.
- Không gửi PUT/POST hoặc Route API thực tế để kiểm chứng. Runtime authorized writes vẫn NOT_VERIFIED.

## 8. UI/UX Changes

Wireframes: **được PO duyệt trong yêu cầu implementation**; tái sử dụng Trip Detail/Bottom Sheet/Fixed Bottom Action. Không tạo fleet dashboard hoặc thay cấu trúc map SDK.

**Mobile (E):**

- Foreground expo-location watcher; raw sample LIVE không snap thành GPS giả. Client bỏ GPS kém/cũ/nhảy bất hợp lý, stale watchdog ngưng guidance. Không đăng ký background task/service/notification.
- Cumulative arc distance và projection liên tục (lùi25m/tiến150m) giữ progress monotonic. Guidance dùng interval bắt đầu instruction từ response hiện tại, text/sign/street provider và khoảng cách dọc geometry. Không bịa rẽ từ heading; khi không có route hiển thị ngắn “Chưa có chỉ dẫn”.
- Off-route>40m qua3mẫu; arrival còn≤25m dọc geometry và radius≤30m qua3mẫu. Chỉ current-leg request, cooldown20s, generation guards bỏ response cũ. Hết target không Complete Trip.
- Hai nút “Tự động di chuyển”/“Lái thủ công”. Auto arc-length theo current route8m/s, pause khi route không hợp lệ. Joystick bearing/displacement8m/s, delta≤2s, release0, không phụ thuộc thuật toán Auto. Chỉ một watcher/provider/publisher active.
- Blur/background dừng producer và clear geometry/sample; giữ checkpoint. Foreground/reopen tái kiểm server và RESUME run mới; root hint chỉ Trip ID. ManualSTOP disabled không tự restart, logout/revoke/reassignment mất quyền. Không catch-up samples khi app tắt.
- Location được gộp vào loop Trip Detail5s hiện có, metadata20s; không tạo poll thứ hai. Terminal lazy history500 points/page. Failure không phá TripOperation; denial xóa dữ liệu viewer, network failure đánh stale.
- WebView bridge cập nhật marker/current-leg/history trên HTML memoized, không remount map mỗi GPS tick. Panel phía trên sheet thu gọn/dưới sheet mở, giữ Attendance/actions. “Theo xe” và toggle recorded/planned; singlepoint marker, gap label, không TEST/LIVE badge trên history.

**Web (F):**

- Trip Detail location visible poll5s; metadata15s hoặc force khi status đổi; terminal history lazy pagination. Không yêu cầu refresh tay.
- MapLibre giữ instance, vehicle Marker.setLngLat/GeoJSON sources cập nhật; không fitBounds lại theo mỗi location tick. Nút “Theo xe”, freshness/thời điểm cuối, recorded/planned toggle và gap parts.
- COMPLETED mặc định recorded nếu có points, zero history planned, một điểm chỉ marker. Không lấy planned line điền khoảng GPS thiếu. Admin chỉ observer theo object scope.

Minimal UI Copy: dùng nút/badge/guidance ngắn và brand tokens; không đưa thuật ngữ checkpoint/sequence vào UI. Touch layout, permission prompts, camera behavior và responsive trên thiết bị thật chưa nghiệm thu.

## 9. Verification & Testing

Chỉ chạy tests đã rà soát là pure/in-memory mocks; không `app.init`, real Prisma connection hoặc API mutation trong các suites này. Log nghiệp vụ trong mock test không phải bằng chứng ghi DB. Không chạy API E2E suite.

| Check thực tế | Kết quả |
|---|---|
| api/web/mobile: `npx --no-install tsc --noEmit --incremental false` | **PASS** cả3 projects |
| API: `npx --no-install vitest run src/trips src/routes src/auth src/parents src/schools src/students src/drivers src/vehicles src/system-settings src/student-requests src/health` (final run dùng JSON reporter) | **PASS331/331**,28 files, gồm31navigation tests mới |
| Mobile: `node --test --experimental-strip-types scripts/trip-navigation.test.ts scripts/trip-state-synchronization.test.ts scripts/trip-status-label.test.ts` | **PASS23/23**, gồm9mới |
| Web: `node --test --experimental-strip-types src/lib/trip-location-history.test.ts src/lib/refresh-loop.test.ts` | **PASS9/9**, gồm3mới |
| api và web: `npm run build` | **PASS**, Web25 routes |
| Mobile: `npx expo export --platform android --output-dir <temp>/mobile-export-final` | **PASS**,1677 modules / 47 assets/Hermes bundle; không phải native/device test |
| Prisma: validate, generate, migrate deploy, migrate status; migrate diff datasource→datamodel | **PASS**,10 migrations current/diff rỗng |
| Read-only DB counts/index/nullable checks | **PASS**,0 points/0 non-null checkpoints,PK-only,nullable checkpoint |
| Swagger UI/JSON và unauthenticated GET | **PASS**,200/200,5 paths,GET401 |
| Oxlint6 Backend files mới; ESLint Web page/helpers/test | **PASS** |
| Strict ESLint existing route-map.tsx | **FAIL có sẵn**:11no-explicit-any errors +1exhaustive-deps warning; so baseline/current cùng counts/rules, không phát sinh mới |
| Task-only diff/scope/dependency review | **PASS**:28files đúng scope,323files baseline ngoài scope giữ nguyên; `git apply --check --whitespace=error-all` trên baseline PASS; không có env/generated outputs hoặc secret values được tìm thấy trong diff |
| Actual Route v4 contract/quota/profile và GPS TBT trên thiết bị | **NOT_VERIFIED**; chưa gọi dịch vụ trả phí để test |
| Auto hoặc Joystick chạy trên app + observer khác nhận điểm | **NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY** |
| Native foreground/reopen/denied-GPS/device lifecycle & map interactions | **NOT_VERIFIED** |
| DB concurrency/lock latency, authorized end-to-end five-role tracking/history | **NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY** |

Tests mới kiểm scope5roles/Parent membership, wrong publisher/session/reassignment, mode gates, checkpoint lifecycle/run invalidation, rate budget, origin/co-located stops, position validation/cadence/idempotency/P2002 conflict/transaction shape, cursor ADVANCE/provider failure, strict route geometry/instructions, history pagination/parts/gaps, movement/progress math. Các tests này không chứng minh sensor, native module, WebView bridge hoặc real PostgreSQL contention hoạt động trên thiết bị.

## 10. Issues & Risks

**Remaining Issues (I), Final Readiness (J): READY_WITH_LIMITATIONS.**

1. **Mandatory simulation gate chưa đạt evidence:** Definition of Done#12 cần ít nhất một mode trên thiết bị và observer khác. Chưa đánh PASS cho Auto/Joystick/TBT thực tế. Implementation hoàn tất phần khả thi nhưng acceptance tổng thể PARTIAL.
2. Cần PO chỉ định môi trường, Trip IN_PROGRESS hợp lệ/route có tọa độ/assigned Driver và viewer có quyền, thiết bị GPS và observer, quyền ghi location/checkpoint, cùng VietMap key/quota/giới hạn chi phí. Nếu test Complete/reassign/Attendance cần phạm vi mutation tương ứng riêng; không tự tạo dữ liệu thay thế.
3. Route v4 adapter chưa thử response dịch vụ thật. Profile car không chứng minh tuân thủ mọi giới hạn xe buýt; quota/giá thực tế chưa xác minh. Voice/lane/offline ngoài scope.
4. TBT là custom progress/arrival heuristic. Đường song song, loop/crossing/U-turn, stationary jitter, co-located stops cần UAT; thiếu thông tin tin cậy phải giữ target/ngưng guidance. Không xem unit math PASS là navigation acceptance.
5. Foreground-only tạo gaps có chủ đích. Permission/native binary/OS lifecycle chưa thử; Android export không chứng minh iOS hoặc native sensor chạy được. Resume phụ thuộc Session/checkpoint còn hợp lệ và fresh server state.
6. Cadence5s+poll5s+network có độ trễ, không realtime SLA. Lịch sử là sampled segments, không cam kết toàn hành trình. Storage tăng dần; không có retention deletion ngoài scope.
7. FOR SHARE/FOR UPDATE vẫn có thể contention trong giới hạn timeout; cần đo concurrent Complete/reassign/Stop/Switch và duplicate sequence trên PostgreSQL thật. Không hứa zero latency impact.
8. Existing MapLibre file strict lint chưa sạch (11 any+1warning có trước). Không mở rộng task để refactor phần không liên quan.

## 11. Reviewer Focus

- So task diff với baseline, đặc biệt trips.service chỉ expose assertTripAccess; không sửa business transaction/approval/roster/parent masking.
- SQL/JSON tối thiểu, index/FK/legacy compatibility; lock ordering và isolation với TripOperation thực tế, rate/idempotency across instances, race revoke/Complete/target advance.
- Session CAS/expired lease vs manual claim, source gates, error DTOs, thông tin observer không leak owner/student data.
- VietMap cùng-response geometry/instructions/interval units, malformed route reject, P→B only, stale response/rate budget khi switch/resume/upstream fail.
- Mobile lifecycle async generation guards/single producer, cold reopen hint và manualSTOP, instruction progression tại loops/crossings; GPS raw vs projected progress; không ghi fake backlog.
- UI controls không chặn Attendance, WebView bridge/MapLibre instance reuse, permission denial/focus/revoke cleanup, pagination snapshot và gaps/singlepoint/fallback.
- Phân biệt static/mocked verification với runtime evidence; giữ mandatory device+observer gate chưa PASS.

## 12. Suggested Next Step

**Một bước:** PO cấp phạm vi UAT cụ thể (môi trường, Trip/tài khoản/thiết bị được dùng, quyền ghi location/checkpoint và milestones nếu cần, VietMap quota/giới hạn chi phí) để nghiệm thu navigation và ít nhất một simulation mode trên app cùng observer khác.

Cần phạm vi này theo WORKING_RULES §6.1/6.3: “Không sửa đổi bản ghi thật hoặc gọi API có side effects để test khi chưa được PO cho phép rõ ràng”, và yêu cầu implementation §14–15 cấm ghi GPS vào Trip thật hoặc dùng Route API tính phí chưa được cấp quyền. Không xin lại quyền implementation đã được duyệt.

## 13. Approval Status

Implementation approval đã được PO cung cấp trong yêu cầu đính kèm; agent không tự cấp approval. **WAITING FOR USER REVIEW / APPROVAL** đối với kết quả và phạm vi UAT còn thiếu. **STOP-AFTER-TASK**: không tự ghi GPS/test data, gọi routing tính phí, mở phase mới hoặc commit/push sau báo cáo này.
