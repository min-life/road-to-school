# RoadToSchool v2.0 — Audit và kế hoạch đồng bộ trạng thái Trip

Ngày: 25/10/2026 (Asia/Saigon). Implementation đã được PO phê duyệt và triển khai. Trạng thái: READY_WITH_LIMITATIONS; runtime UAT chưa xác minh. Các mục A–N phía dưới giữ baseline audit trước triển khai; kết quả mới nhất ở phần này thay thế các trạng thái chờ duyệt/đề xuất cũ.

## Quyết định triển khai mới nhất — PO phê duyệt 25/10/2026

Phần này thay thế các approval gates và phương án kỹ thuật đề xuất cũ bên dưới. Triển khai liên tục API/Mobile/Web, không chờ duyệt từng phase; không thay DB/dependency/wireframe.

- Decision 01: một helper kiểm tra scope Trip theo system/school/assignment/linked roster; deny school scope rỗng; clear data và ngừng polling khi 403/404.
- Decision 02: dùng transaction với **khóa hàng Trip `SELECT ... FOR UPDATE`** chung cho bảy mutation assignment/ready/start/arrival/boarding/alighting/complete. Tất cả kiểm tra và ghi trong cùng tx sau lock; không Serializable toàn service, không retry framework. Khóa cùng hàng cha phối hợp Trip và roster trong các luồng đã nêu. Runtime PostgreSQL concurrency vẫn phải UAT; mock không chứng minh isolation.
- Cadence: detail state/roster 5s; metadata detail 20s hoặc focus/mutation; Mobile Home 8s; schedules 12s; Web list/detail 15s. Một vòng refresh theo lifecycle/screen, không interval metadata riêng.
- Parent persisted schedule dùng TripAttendance membership; virtual giữ nguồn RoutePlan hiện tại. Parent operational payload có children keyed studentId, không global counts/action flags.
- Nâng ưu tiên map stability: silent mutation refresh, ổn định geometry/source và giữ WebView trong tree; không redesign.
- Assignment form giữ draft; gửi các trường thực sự thay đổi và kiểm tra snapshot assignment để báo conflict thay vì overwrite thay đổi admin khác.
- Các mục AUD-01…11 và ma trận UAT dưới đây giữ làm baseline; cập nhật kết quả implementation/verification sau khi hoàn tất.

## Kết quả implementation — 25/10/2026

### Follow-up: nhãn trạng thái lịch Mobile — xác nhận thiếu sót 25/10/2026

**Cập nhật sau chỉ thị PO “triển khai khắc phục”: đã sửa ở mức implementation.** Hai màn hình lịch dùng chung `mobile/utils/trip-status-label.ts`, đọc trip.status thay vì literal “Lập lịch”; giữ nguyên layout, màu badge, polling, API và DB. Thêm `mobile/scripts/trip-status-label.test.ts` với 7 ca mapping/virtual/unknown/transition. Mobile typecheck PASS; chạy cùng regression sync/map suite đạt 14/14 PASS. Native UI của chuyến cụ thể vẫn NOT_VERIFIED; không mutate DB để test. AUD-04 đã bổ sung phần status binding còn thiếu. Phần phân tích dưới đây là nguyên nhân trước bản sửa.

PO báo chuyến hoàn thành vẫn hiện “Lập lịch” trên Mobile. Đọc source xác nhận `mobile/app/(tabs)/schedule.tsx:244` (Driver/Attendant) và `mobile/app/parent/schedule.tsx:238` (Parent) ghi literal “Lập lịch” cho mọi `!trip.isVirtual`, không đọc `trip.status`. Backend schedule serialize status DB (`trips.service.ts:945`, `:1019`, `:1117`); Mobile API client không chuyển status thành nhãn. Do đó ngay cả payload COMPLETED mới cũng render “Lập lịch”. Không cần giả định polling hoặc DB lỗi để giải thích hiện tượng này. Chưa đọc authenticated payload của chuyến PO đang xem, nên chưa kết luận status DB của Trip cụ thể.

Đính chính AUD-04: auto-refresh đã triển khai, nhưng **status badge trên lịch vẫn PARTIAL / chưa sửa**. Bảng kết quả cũ bên dưới chỉ chứng minh cơ chế refresh, không chứng minh status mapping UI đúng. Tests coordinator/map không kiểm tra nhãn lịch; typecheck không phát hiện literal sai nghiệp vụ. Đây là thiếu sót của lần implementation trước.

Phương án tối thiểu đề xuất: giữ nguyên vị trí badge, dùng cùng một helper Mobile để ánh xạ virtual → “Dự kiến”, SCHEDULED → “Lập lịch”, IN_PROGRESS → “Đang chạy”, COMPLETED → “Đã hoàn thành”, CANCELLED → “Đã hủy”; không coi status không nhận diện là SCHEDULED. Áp dụng hai màn hình và test mapping từng status, kể cả persisted COMPLETED và virtual NOT_CREATED. Không đổi Backend/DB/polling/dependencies; không redesign. Vòng follow-up này chỉ phân tích, chưa sửa code; chờ PO yêu cầu triển khai.

### Quyết định và tối ưu đã áp dụng

- Đã áp dụng Decision 01 bằng `assertTripAccess` chung: system / đúng school / đúng assignment / Parent có con trong TripAttendance. Chặn cả list khi School Admin thiếu schoolId. Không tạo module/quyền/bảng mới.
- Đã áp dụng Decision 02 bằng `withTripLock`: transaction ReadCommitted, parameterized SELECT Trip FOR UPDATE, sau đó đọc lại và validate bằng tx cho bảy mutation. Không Serializable toàn service, không retry framework. Các tests xác minh chờ lock trước khi đọc và kiểm tra lại state; **không xác minh khóa PostgreSQL thực tế bằng mocks**.
- Parent persisted schedule lọc theo TripAttendance; virtual schedule giữ RoutePlan. Response operational-state Parent chỉ có `children` theo studentId và milestones/status của Trip, không scalar chung/counts/action flags học sinh khác.
- Form assignment gửi snapshot ba assigned IDs qua các trường optional `expectedVehicleId`, `expectedDriverId`, `expectedBusAttendantId`; backend kiểm tra trong lock và trả 409 nếu stale. Form giữ draft và chỉ gửi fields thực sự đổi. Client cũ không gửi snapshot vẫn dùng validation/lock cũ; bảo vệ optimistic conflict trên Web mới yêu cầu snapshot.
- Metadata 20s/focus/mutation, operational state+roster 5s cùng một refresh loop; Home 8s, schedule 12s, Web 15s. Loop single-flight, generation guards cho cả success/error, clear 403/404, terminal stop và immediate focus/foreground/visible/online. Web Trip GET có timeout 15s để fetch treo không chặn recovery vô hạn; Mobile giữ timeout có sẵn.
- Silent mutation refresh, stable geometry snapshot và memoized WebView source; không đổi Bottom Sheet hay layout. Dòng thông tin có thêm nhãn status ngắn để Parent/nhân sự thấy TripStatus từ backend; không tạo screen hoặc wireframe mới.

### Trạng thái từng issue

| Issue | Implementation | Evidence kiểm chứng thực tế / giới hạn |
|---|---|---|
| AUD-01 P0 | DONE: helper scope reads và list school guard, clear client denied data | Unit tests scope positive/negative và revoked assignment PASS; authenticated runtime NOT_VERIFIED |
| AUD-02 P0 | DONE: row lock chung, re-read/validate trong tx | Tests lock await/terminal guards/second Start PASS; PostgreSQL concurrent transactions NOT_VERIFIED |
| AUD-03 P1 | DONE: Home 8s kể cả empty, focus/foreground; server expiration filter giữ nguyên | Coordinator empty/retry/lifecycle PASS; qua giờ trên thiết bị thật NOT_VERIFIED |
| AUD-04 P1 | DONE: staff/Parent schedules 12s, identity theo user/role/child/week | Guards/cleanup tests PASS; mounted screen UAT NOT_VERIFIED |
| AUD-05 P1 | DONE: Web list/detail 15s, visible/focus/online, total/page clamp; generation không remount bảng | Typecheck/lint Web PASS; multi-tab/form interaction UAT NOT_VERIFIED |
| AUD-06 P1 | DONE: metadata cadence riêng trong cùng cycle, child stop state từ latest children | Contract tests/typecheck PASS; actual Parent observer NOT_VERIFIED |
| AUD-07 P1 | DONE: child array, per-student lookup, no common scalar | Multiple-child privacy/independent alight unit test PASS |
| AUD-08 P1 | DONE: terminal alight/undo/QR khóa, stale confirmations đóng, assignment chỉ SCHEDULED | Backend guards tests PASS; native control interaction NOT_VERIFIED |
| AUD-09 P2 | DONE: single-flight/generation, invalidate quanh mutation/query/lifecycle change | Deferred old-response/mutation/disposal tests PASS |
| AUD-10 P2 | DONE: focus/foreground tức thì, background/hidden stop; final terminal refresh rồi dừng | Pure coordinator tests PASS; RN/browser lifecycle wiring UAT NOT_VERIFIED |
| AUD-11 P2 | DONE: initial-only full loading, map geometry/source stable khi dynamic updates | Map snapshot invariance test PASS; WebView native load count NOT_VERIFIED |

### Verification và files

- API: `npx --no-install tsc --noEmit --incremental false` PASS; Web và Mobile cùng lệnh PASS.
- API: `npx --no-install vitest run src/trips/trips.service.spec.ts src/trips/trip-synchronization.spec.ts src/trips/utils/trip-time.util.spec.ts` → **57/57 PASS**, chỉ in-memory mocks, không app.init/Prisma connection/cron.
- Mobile: `node --test --experimental-strip-types scripts/trip-state-synchronization.test.ts` → **7/7 PASS** (scheduler + map data invariance).
- Web: `node --test --experimental-strip-types src/lib/refresh-loop.test.ts` → **6/6 PASS**.
- Lint targeted Web screens/hooks/helpers PASS; API oxlint exit 0, có warnings unused imports ở source/tests có sẵn. Không thay package/config để xử lý advisory Node module-type hoặc vite-tsconfig-paths.
- GET `/api/docs` và `/api/docs-json` HTTP 200; runtime schema có child array/fields, scope errors, expected assignment snapshot và 409. Không gọi authenticated business endpoints/mutations để test.
- Danh sách 25 source/test files và task-only diff tại [LATEST.md](LATEST.md), [LATEST.diff](LATEST.diff). Diff tính từ working files trước task, không gộp changes chưa commit từ Antigravity. Không chứa .env/secrets hoặc generated artifacts.
- Database: **0 bảng, 0 field, 0 enum, 0 migration**. Không install, seed, reset, commit/push hoặc mutate business data thật.
- Runtime cross-role/multi-device, map load events và PostgreSQL isolation: `NOT_VERIFIED`; các ca cần mutation thật là `BLOCKED_BY_TEST_DATA_POLICY` đến khi PO cấp phạm vi môi trường/dữ liệu. Ma trận M2 tiếp tục là UAT checklist, không chuyển thành PASS bằng suy luận.

## A. Executive Summary

**Phát hiện ưu tiên cao nhất:** các API đọc chi tiết Mobile, operational-state và roster chưa áp dụng đầy đủ kiểm tra quyền trên từng chuyến/trường. Ngoài ra, các mutation chưa có cơ chế phối hợp đồng thời đủ rõ để bảo đảm các điều kiện vừa đọc vẫn đúng lúc ghi. Không thực hiện khai thác hoặc mutation trên dữ liệu thật.

Có khoảng trống đồng bộ trong implementation thực tế: Home và lịch Mobile, danh sách và chi tiết Trip Web không có refresh tự động khi giữ nguyên màn hình. Trip Detail Mobile có polling 5 giây nhưng chỉ cập nhật operational-state và roster, không cập nhật snapshot thông tin xe/người hoặc attendance trên các stop của Parent. Vì vậy, không thể kết luận hệ thống đã đáp ứng yêu cầu “không cần refresh thủ công”.

Tổng cộng **11 phát hiện tĩnh: 2 P0, 6 P1, 3 P2**. Đây là mức ưu tiên khắc phục dựa trên source; **0 lỗi được tái hiện bằng luồng nhiều người dùng trên runtime**. Tất cả phát hiện mang nhãn `POTENTIAL_ISSUE — STATIC_EVIDENCE_ONLY`; những thiếu sót logic nêu dưới đây có đường dẫn/dòng source cụ thể, nhưng không được báo là runtime FAIL/PASS.

Kiểm chứng đã chạy: typecheck API/Web/Mobile PASS; 27 tests có sẵn của TripsService và TripTimeUtil PASS; GET Swagger JSON thành công và có các endpoint Trip. Không chạy migration, seed, login, mutation, E2E khởi động AppModule, hoặc tự tạo dữ liệu.

Giải pháp đề xuất: sửa quyền đọc và bảo vệ mutation đồng thời; dùng API hiện có với polling khi screen active, refresh khi focus/foreground và sau mutation; chặn response cũ ghi đè; bổ sung dữ liệu trạng thái riêng cho từng con. Không cần DB migration, dependency mới hoặc realtime infrastructure.

## B. Verified Implementation Architecture

### B1. Nguồn sự thật và phân loại state

| Dữ liệu | Nguồn thực tế | Ý nghĩa |
|---|---|---|
| Persisted TripStatus | `Trip.status` | SCHEDULED / IN_PROGRESS / COMPLETED / CANCELLED; không suy ra từ đồng hồ client |
| Readiness | `Trip.attendantReadyAt` | Giáo viên đã xác nhận, độc lập TripStatus |
| Boarding | `TripAttendance.status`, `absenceReason`, `markedAt` | UNMARKED/PRESENT/ABSENT theo roster từng chuyến |
| School Arrival | `Trip.arrivedAtSchoolAt` | Milestone chỉ TO_SCHOOL; vẫn IN_PROGRESS |
| Alighting | `TripAttendance.alightedAt` | Theo từng học sinh PRESENT |
| Derived phase / action availability | `getOperationalState`, service dòng 2105–2286 | Counts, canStart/Arrive/Complete, disabledReasons; chưa có enum phase persist riêng |
| Expiration trên Home | server `new Date()` so với `scheduledEndAt` | Lọc hiển thị, không tự Complete/Cancel |
| Virtual schedule | RoutePlan ACTIVE + weeklySchedule | Chưa phải Trip persist; không có quyền thao tác vận hành |

Schema: `api/prisma/schema.prisma:409` và `:449`. Có updatedAt trên cả Trip và attendance, nhưng Trip.updatedAt không tự đại diện mọi thay đổi attendance. Không dùng riêng timestamp này làm version cho toàn aggregate.

### B2. Backend reads

Các GET gọi Prisma trực tiếp, không thấy Trip response cache, CacheInterceptor, SSE/WebSocket trong luồng đang audit. Snapshot assignment là quyết định nghiệp vụ để tách Trip khỏi defaults RoutePlan, không phải cache lỗi thời.

| GET (prefix `/api/v1`) | Nguồn / scope | Evidence `api/src/trips/trips.service.ts` |
|---|---|---|
| `/trips` | Persisted trips + virtual; SCHOOL_ADMIN khóa schoolId khi có schoolId | 325–547 |
| `/trips/:id` | Trip, assignment, route/stops và attendance; có kiểm tra trường SCHOOL_ADMIN | 553–667 |
| `/trips/mobile/:id` (+ `/detail`) | Reuse detail, Parent masking; thiếu guard phạm vi chuyến | 1191–1235 |
| `/trips/mobile/home-trip` | DRIVER/ATTENDANT theo assigned ID; loại completed/cancelled/quá hạn; ưu tiên running rồi scheduled | 1255–1344 |
| `/trips/mobile/parent/home-cards` | Theo link và roster của từng con; loại completed/cancelled/quá hạn | 1350–1443 |
| `/trips/mobile/driver-schedule` (+ `/driver/schedule`) | Persisted, assignedDriverId, ngày/tuần, status DB | 838–907 |
| `/trips/mobile/bus-attendant-schedule` (+ `/bus-attendant/schedule`) | Persisted, assignedBusAttendantId | 913–981 |
| `/trips/mobile/parent/student/:studentId/schedule` (+ `/students/…`) | Kiểm tra link; membership Trip theo RouteStop, thêm virtual từ defaults | 988–1188 |
| `/trips/:id/operational-state` | DB Trip + roster; scalar child state lấy con đầu tiên phù hợp; thiếu guard scope | 2105–2286 |
| `/trips/:id/attendance` | Roster thực, kiểm tra assigned ID Driver/Attendant, cấm Parent; thiếu school scope | 1650–1734 |

Controller: `api/src/trips/trips.controller.ts`; AuthGuard xác thực session/user hiện tại, RolesGuard chỉ kiểm tra role, không kiểm tra assignment/school/parent membership (`api/src/auth/auth.guard.ts`, `roles.guard.ts`). Vì vậy các check thiếu trong service không được guard hiện tại bù lại.

### B3. Client infrastructure

- Web dùng React state/useEffect/useCallback và fetch wrapper (`web/src/lib/api-client.ts:123`). Không có QueryClient/SWR/global Trip cache hoặc cross-tab invalidation trong các entrypoint đã kiểm tra. Không có polling/focus/online listener trên Trip views.
- Mobile wrapper dùng AbortController cho timeout (`mobile/services/api-client.ts:233`), không phải sequence guard hoặc hủy request theo screen lifecycle; wrapper gán signal riêng tại dòng 251. Có auth refresh retry, không có Trip invalidation chung.
- Trip Detail: initial detail → operational-state → roster tuần tự, `mobile/app/trip/[id].tsx:187`. Polling operational-state → roster mỗi 5s, dòng 214–246. Focus cleanup clearInterval và chặn apply sau blur; AppState chỉ đổi cờ, không refetch ngay foreground. Lỗi polling bị bỏ qua.
- API read nhiều truy vấn không phải snapshot xuyên endpoint; có thể thấy state/roster ở hai thời điểm khác nhau. Không khẳng định mọi payload là atomic aggregate snapshot.
- Home filter dựa server clock. Response Home chưa chứa serverNow/scheduledEndAt; client không có timer expiration. Polling Home có thể đáp ứng độ trễ hợp lý bằng server clock, chưa cần thêm endpoint/clock sync.

## C. State Synchronization Inventory

Mã profile trong bảng này được dùng cho ma trận E. “Tĩnh” nghĩa là đã kiểm tra code, runtime nhiều thiết bị `NOT_VERIFIED`.

| Profile / screen / roles | Dữ liệu hiển thị | Fetch và trigger hiện có | Lifecycle / cache / kết luận tĩnh | Fix |
|---|---|---|---|---|
| H — `mobile/app/(tabs)/index.tsx:36` — Driver, Attendant | Chuyến ưu tiên, status, readiness, boarding counts, xe/người | mount/user change, pull/button refresh; GET home-trip | Không focus/AppState/timer; giữ state cũ khi người khác thao tác hoặc qua giờ | AUD-03; polling 5s + focus/foreground |
| PH — cùng Home — Parent | Card theo con, tripStatus, attendance, alighting | mount/user change, refresh; GET parent/home-cards | Không auto-refresh/expiration | AUD-03; polling 5s |
| S — `mobile/app/(tabs)/schedule.tsx:56` — Driver, Attendant | Status, giờ, xe, nhân sự, số HS theo ngày/tuần | mount, đổi tuần/role booleans, pull | Không focus/foreground/poll; identity cùng role không nằm trực tiếp trong dependencies | AUD-04; polling 10s, key userId+role+week |
| PS — `mobile/app/parent/schedule.tsx:52` — Parent | Lịch con, status, xe/người, virtual/persisted | mount, studentId/week, pull | Không focus/foreground/poll | AUD-04; polling 10s |
| D — `mobile/app/trip/[id].tsx:187` — Driver | Action Ready/Start/Arrival/Complete, counts; Info xe/người; stops | initial full load; 5s state+roster; mutation reload | Action state được poll; Info snapshot không poll; có cleanup khi blur | AUD-06/09/10/11 |
| A — cùng detail — Attendant | Ready, boarding/alighting roster, QR, action availability, Info | Như D; QR verify không mutate; confirm gọi attendance rồi reload | Roster được poll; terminal controls còn thiếu điều kiện | AUD-06/08/09/10/11 |
| P — cùng detail — Parent | Info xe/người; status attendance trên stop con, scalar alighting | Initial full load; 5s chỉ operational-state | `stop.attendanceStatus` cũ vẫn điều khiển label; nhiều con dùng chung childIsAlighted | AUD-06/07/09/10 |
| WL — `/admin/trips`, `TripsTable` — hai admin | Rows status, assignment, studentCount, pagination total/pages | effect khi query đổi; manual generate success remount bằng refreshKey | Không polling/focus/online; total là số rows theo filter, không phải operational counts | AUD-05 |
| WS — `/admin/schools/[id]` tab chuyến — hai admin có quyền trường | Reuse TripsTable với fixedSchoolId | tab mount, query đổi, manual generate success remount | Không auto-refresh khi tab đang mở; tab unmount sẽ tải lại khi vào | AUD-05 |
| WD — `/admin/trips/[id]` — hai admin theo quyền | Status, xe/tài xế/giáo viên, lịch, stops/map | mount/tripId, assignment onUpdated reload | Không polling/focus/online | AUD-05/08 |

Evidence Web: `web/src/components/admin/trips/trips-table.tsx:82` và `:104`; `web/src/app/admin/trips/[id]/page.tsx:46` và `:375`; `web/src/app/admin/trips/page.tsx:43`; `web/src/components/admin/schools/school-trips-tab.tsx:32`.

Các nơi đã kiểm tra và **không phải Trip state screen**:

- `web/src/app/admin/page.tsx`: dashboard để trống theo PO; không Trip widget/chart. Không tạo task đồng bộ dashboard giả định.
- Web routes/route-plans và tab routes: dữ liệu RoutePlan/default assignment, không hiển thị Trip vận hành. Không đánh đồng RoutePlanStatus với TripStatus.
- `mobile/app/(tabs)/tracking.tsx`: danh sách học sinh liên kết; `components/StudentCard.tsx`, `parent/student-detail/[id].tsx`, `parent/route-detail.tsx`: hồ sơ/routing và navigation sang lịch; không live Trip status. Không thêm polling vận hành cho các trang này.
- Không tìm thấy màn hình Web attendance/readiness/arrival/alighting progress riêng; payload có readiness không đồng nghĩa UI đã render. Không gọi thiếu UI ngoài scope là bug đồng bộ.
- Layout/providers đã kiểm tra không cung cấp Trip subscription ngầm; tabs hiện không thay thế các cơ chế refresh còn thiếu.

## D. State Mutation Inventory

| Mutation / actor | DB effect / validation / response / client success | Evidence |
|---|---|---|
| Cron 02:00 VN và POST `/trips/generate` / SYSTEM_ADMIN | ACTIVE/contract/school-day; tạo Trip SCHEDULED + attendance UNMARKED cùng transaction; unique route/date, bỏ qua P2002; không ghi đè Trip có sẵn. Web callback refresh bảng hiện tại | service 74–80, 126–305; `web/src/app/admin/trips/page.tsx:53`, school-trips-tab:45 |
| PATCH `/trips/:id/assignment` (+ `/:id`, `/assignments`) / hai admin | Chỉ SCHEDULED; field RBAC, availability/conflicts; đổi attendant reset readyAt; ghi snapshot; return fresh detail | service 673–828; modal:102–104; WD:375 |
| POST `/:id/attendant-ready` / assigned Attendant | SCHEDULED, LIVE 15m, idempotent nếu đã ready; timestamp response | service 1449–1497; Mobile:344–346 |
| POST `/:id/start` / assigned Driver | SCHEDULED + Ready + roster; TO_PARKING hết UNMARKED và absence reason; LIVE 5m; status IN_PROGRESS và actualStartTime | 1503–1571; Mobile:363–365 |
| PUT `/:id/attendance/:studentId` / assigned Attendant | Transaction; roster membership, hướng/trạng thái, reason; khóa reset sau arrival/start; cập nhật attendance, markedAt; reset UNMARKED xóa alightedAt | 1740–1851; Mobile:423–425, 447–455, 470–472 |
| POST `/:id/attendance/verify-qr` / assigned Attendant | Xác minh student code/roster; không tự điểm danh, không ghi state; confirm sau đó dùng PUT attendance | 1857–1935; Mobile:502–521 |
| POST `/:id/arrive-at-school` / assigned Driver | TO_SCHOOL, IN_PROGRESS, roster đủ, absence reason; arrivedAtSchoolAt, idempotent | 1579–1644; Mobile:382–384 |
| PUT `/:id/attendance/:studentId/alighting` / assigned Attendant | Transaction; IN_PROGRESS + PRESENT; TO_SCHOOL phải arrival; true timestamp / false null | 1940–2016; Mobile:491–493 |
| POST `/:id/complete` / assigned Driver | Transaction; IN_PROGRESS, roster đủ, valid absent reasons, arrival TO_SCHOOL, mọi PRESENT alighted; COMPLETED và actualEndTime | 2023–2099; Mobile:404–406 |

Không tìm thấy Trip cancellation endpoint hoặc code ghi Trip.status=CANCELLED trong `api/src`. RoutePlan cancellation là domain khác và không cascade status Trip trong source đã đọc. SYNC-07: `NOT_IMPLEMENTED`; không triển khai cancellation mới. Các UI đã có badge/nhánh terminal CANCELLED không chứng minh có workflow hủy.

Sau tất cả mutation Mobile thành công đều gọi `loadTripDetail()`; thất bại hiển thị lỗi, không có optimistic status giả PASS. Đây là refresh riêng màn hình thao tác, không invalidation màn hình khác/thiết bị khác. Các mutation read-check-write chưa chứng minh an toàn khi chạy đồng thời (AUD-02).

## E. Cross-Role Synchronization Matrix

Mỗi ô chỉ rõ profile màn hình ở C, dữ liệu cần đổi, cơ chế thực tế, issue và fix. Kết quả tất cả ô có UI là **POTENTIAL_ISSUE / STATIC_EVIDENCE_ONLY; runtime NOT_VERIFIED**, trừ nhãn N/A/NOT_IMPLEMENTED. Profile C cung cấp vị trí code, initial fetch/lifecycle; fix tại F/G/K. D/A poll có đường cập nhật đúng cho operational-state/roster, không được coi là runtime PASS.

Quy ước: `mount` = không auto refresh khi giữ nguyên màn hình; `poll` = interval 5s; `local` = mutation success full reload. `→` trỏ issue và kế hoạch sửa.

| Trigger | Driver Mobile | Attendant Mobile | Parent Mobile | System Admin Web | School Admin Web |
|---|---|---|---|---|---|
| SYNC-01 Ready | H ready/count mount →03; D canStart poll →09/10 | H mount →03; A ready local/poll →11 | N/A readiness chưa có UI riêng | N/A chưa hiển thị readiness | N/A chưa hiển thị readiness |
| SYNC-02 Start | H/S status mount →03/04; D local/poll →09/11 | H/S status mount →03/04; A boarding/actions poll →09/10 | PH status mount →03; PS status mount →04; P chưa có badge TripStatus riêng, stop state →06 | WL/WS/WD status mount →05 | WL/WS/WD trong trường, status mount →05 |
| SYNC-03 Boarding | H count mount →03; D count/canStart/canArrive poll →09 | H count mount →03; A roster local/poll →09/11 | PH attendance mount →03; P stop attendance snapshot dù state poll →06; nhiều con →07 | N/A attendance progress chưa có UI | N/A attendance progress chưa có UI |
| SYNC-04 Arrival | D canComplete/arrival local/poll →09/11 | A alighting mở/reset khóa poll →09/10 | N/A arrival badge chưa có; P child boarding/alighting chỉ theo con →06/07 | N/A milestone chưa render | N/A milestone chưa render |
| SYNC-05 Alighting | D pending/canComplete poll →09 | A roster local/poll →08/09/11 | PH child alighting mount →03; P scalar poll + stop snapshot →06/07 | N/A alighting UI chưa có | N/A alighting UI chưa có |
| SYNC-06 Complete | H loại/chọn chuyến kế mount →03; S status mount →04; D bottom hidden local/poll →09 | H/S mount →03/04; A bottom hidden poll nhưng undo vẫn còn →08 | PH loại/chọn card mount →03; PS status mount →04; P child state →06/07, không có TripStatus badge riêng | WL/WS/WD status/filtered total mount →05; edit availability →08 | Như System Admin, giới hạn trường →05/08 |
| SYNC-07 Cancel | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| SYNC-08 Assignment | H/S thêm/bớt Trip mount →03/04; D Info snapshot/quyền đọc →01/06 | H/S thêm/bớt Trip mount →03/04; A ready reset poll, Info/quyền →01/06 | PH/PS xe/người mount →03/04; P Info snapshot →06 | WD người thao tác local; các WL/WS/WD khác mount →05 | WD đổi attendant local; các WL/WS/WD khác mount →05 |
| SYNC-09 Qua scheduledEndAt | H phải ẩn/chọn tiếp, mount →03; D không auto Complete (đúng rule) | H phải ẩn/chọn tiếp, mount →03; A không auto Complete | PH phải ẩn/chọn tiếp, mount →03; PS giữ lịch/history theo DB, không xóa do quá giờ | N/A Home expiration; lịch vẫn giữ Trip | N/A Home expiration; lịch vẫn giữ Trip |
| SYNC-10 Nhiều thiết bị/tabs | H/S không tự đổi →03/04; D poll →09/10 | H/S không tự đổi →03/04; A poll →08/09/10 | PH/PS mount →03/04; P thiếu stop refresh →06/07 | Tabs độc lập mount →05 | Tabs độc lập mount →05 |

Sửa proposed theo profiles: H/PH 5s; S/PS 10s; D/A/P 5s; WL/WS/WD 15s + immediate focus/foreground/online; single-flight và generation guard. N/A không có nghĩa backend đã kiểm chứng quyền đầy đủ.

## F. Verified Issues — Bằng chứng implementation xác định được

Không có lỗi runtime nhiều actor được tái hiện trong phiên này. Các mục dưới xác định thiếu sót trực tiếp từ code nhưng đều mang nhãn **POTENTIAL_ISSUE — STATIC_EVIDENCE_ONLY** theo yêu cầu; expected/actual là đối chiếu implementation, không giả lập kết quả chạy UI.

### AUD-01 — P0 — Thiếu authorization theo từng Trip/trường ở API đọc

- Platform/roles/screens: API; Driver/Attendant không được phân công, Parent không có con trên Trip, School Admin khác trường; các client gọi detail/state/roster.
- Trigger: GET một Trip ID ngoài phạm vi, hoặc giữ detail sau khi bị gỡ assignment.
- Expected: 403 (hoặc 404 theo contract được duyệt), không trả Trip/PII/counts ngoài scope; Parent chỉ child state của con.
- Actual static/evidence: `getMobileTripDetail` gọi `getTripDetail` (1191–1192); detail chỉ chặn SCHOOL_ADMIN khác school (580–582), không kiểm tra assigned Driver/Attendant hoặc Parent roster membership. Parent masking chỉ che học sinh khác, không từ chối Trip không có con. `getOperationalState` (2105–2286) không có kiểm tra assignment/school hoặc bắt buộc childAtt; trả mọi aggregate counts/action flags. `getTripAttendance` (1675–1685) có check Driver/Attendant nhưng không check schoolId của SCHOOL_ADMIN. AuthGuard/RoleGuard không bù object scope.
- Repro đề xuất, chưa chạy: dùng tài khoản hợp lệ và Trip được PO chỉ định ngoài scope; GET ba API tương ứng; so sánh status và payload. Không login/tìm token trong phiên audit.
- Root cause: reuse admin detail cho mobile và kiểm tra role thay cho quyền truy cập object; masking bị coi như authorization; operational-state không dùng guard scope chung.
- Fix: helper quyền đọc dùng lại trong detail/mobile/state/roster; Admin hệ thống toàn quyền, Admin trường đúng schoolId, Driver/Attendant đúng assigned ID, Parent có link tới student thuộc TripAttendance. Parent DTO chỉ dữ liệu con; role-specific action flags, không trả các counts học sinh khác cho Parent. Deny thiếu schoolId ở role trường. Xử lý client 403/404 xóa dữ liệu và dừng action/polling cũ.
- DB impact: none. API: siết 403/scope + role-specific DTO, Swagger. UI: clear inaccessible data. Regression: Parent nhiều con/legacy roster; không cấp quyền bằng RouteStop nếu roster không có con. Verify: unit mock positive/negative cho từng endpoint/role, UAT read-only đúng scope; không test access bằng dữ liệu ngoài danh sách PO cấp.

### AUD-03 — P1 — Home không tự đổi trạng thái, assignment hoặc hết hạn

- Platform/roles/screens: Mobile H/PH, cả ba mobile roles.
- Trigger: actor khác Ready/Start/Board/Alight/Complete, đổi assignment, cron sinh Trip, hoặc đồng hồ qua scheduledEndAt.
- Expected: status/con/counts cập nhật; card completed/quá hạn biến mất; người mới được phân công thấy chuyến kể cả Home hiện đang rỗng.
- Actual/evidence: `index.tsx:36–63` chỉ mount/user callback/manual refresh, không timer/focus/foreground; server filter đúng lúc GET (`service:1260–1307`, `1372–1417`). Backend lọc không làm React tự refetch.
- Repro chưa chạy: giữ Home từ 09:00 tới 10:01 với chuyến hết 10:00, hoặc PO Complete trên máy khác; quan sát không refresh.
- Root cause: local component snapshot không có subscription/refetch tự động; không có timer server expiration.
- Fix: full Home endpoint polling 5s khi focus+active, kể cả empty result; focus/foreground refresh ngay; dùng server filter, không tự Complete; giữ dữ liệu khi lỗi mạng và retry tự động. Server polling cho độ trễ vài giây, không cần tự suy đoán thời gian local.
- DB/API: none. UI: refresh behavior, không bố cục mới. Risk: poll query cost; cần silent refresh không nhấp nháy. Verify: fake-clock scheduler/in-memory đã có hạ tầng API và UAT 09:59→10:01, empty→assigned, completed→next; runtime `NOT_VERIFIED`.

### AUD-04 — P1 — Lịch Mobile không nhận thay đổi khi đang mở hoặc quay lại

- Platform/roles/screens: Mobile S/PS; Driver/Attendant/Parent.
- Trigger: Start/Complete/assignment/generation trên thiết bị khác, quay lại từ detail, đổi identity cùng role.
- Expected: status/membership/xe-người và virtual→persisted đúng tuần/con/user hiện tại.
- Actual/evidence: `schedule.tsx:56–85` và `parent/schedule.tsx:52–74` effect theo tuần/role hoặc studentId, không focus/foreground/poll; staff dependencies dùng role booleans không userId.
- Repro chưa chạy: mở lịch rồi PO đổi assignment/Complete từ máy khác; quay lại tab đã mount; không đổi tuần hoặc pull.
- Root cause: coi initial fetch là đủ; không invalidation giữa màn hình; query identity chưa đầy đủ.
- Fix: 10s focused/active + immediate focus/foreground, key userId/role/week/studentId; clear state khi identity/scope đổi; refetch toàn danh sách, không chỉ Trip đang thấy. Giữ nguyên tuần và ngày đang chọn.
- DB/API: none. UI: behavior. Risk: response tuần cũ, loading blank; cần AUD-09. Verify: week-switch nhanh, user cùng role, reassignment cũ/mới, generation và completion; không coi backend mutation tests là UI sync tests.

### AUD-05 — P1 — Web lists/detail giữ status và assignment cũ

- Platform/roles/screens: Web WL/WS/WD; hai admin theo scope.
- Trigger: mutation Mobile hoặc admin ở tab/thiết bị khác, generation cron.
- Expected: status, assignment, membership bộ lọc và total/pages tự cập nhật trong khoảng 15s khi visible.
- Actual/evidence: `trips-table.tsx:82–106`, `trips/[id]/page.tsx:46–61` không interval/focus/online. Local assignment onUpdated có reload detail (:375), local generation có refreshKey; không tác động tab khác.
- Repro chưa chạy: mở WL/WD hai browser tabs, PO thao tác Trip trên thiết bị khác, giữ nguyên filter và tab.
- Root cause: state per mounted component, không shared query infrastructure hay observer event.
- Fix: reuse apiClient; hook visible/focus/online 15s, refresh query hiện tại, update state không router reload; filtered total/pages và clamp page khi số trang giảm; WS chỉ poll khi tab component mount. Không polling dashboard rỗng.
- DB/API: none. UI: behavior. Risk: modal assignment bị reset do prop trip mới mỗi poll (`trip-assignment-modal.tsx:40–72`), pagination/filter races. Freeze form draft từ lúc mở, chỉ reset theo tripId/open; đóng modal khi Trip không còn SCHEDULED hoặc mất quyền; background refresh không thay nội dung người đang nhập. Verify: multi-tab, filters, modal draft, page cuối giảm, blur/resume, online.

### AUD-06 — P1 — Detail có polling nhưng dữ liệu Parent/assignment vẫn là snapshot

- Platform/roles/screens: Mobile D/A/P; Parent stop attendance, Info xe/người của mọi role.
- Trigger: boarding/absence từ thiết bị khác; admin đổi assignment SCHEDULED.
- Expected: thông tin con và xe/người mới tự phản ánh; đọc cùng nguồn latest data.
- Actual/evidence: initial `setTrip(data)` ở :192–193; poll :223–232 chỉ setOperationalState/setAttendanceRoster. Info đọc `trip.vehiclePlate/driverName/busAttendantName` (:781–817); Parent label đọc `stop.attendanceStatus/absenceReason` (:860–897), không dùng childAttendanceStatus mới. Nếu mở trước boarding, stop vẫn UNMARKED dù operational-state đã PRESENT; nếu scalar childIsAlighted mới true nhưng stop còn UNMARKED, label vẫn “Chưa điểm danh”.
- Repro chưa chạy: Parent mở Trip trước khi điểm danh; PO đánh PRESENT rồi xuống xe; giữ tab Điểm đón. Hoặc đổi xe/attendant khi detail vẫn mở.
- Root cause: hai state store trong cùng screen, polling chỉ refresh một store; mapping UI đọc nguồn cũ.
- Fix: một refresh cycle lấy detail+state (+roster staff) từ existing APIs; merge/apply có guard, Parent stop state theo studentId (AUD-07), assignment refresh. Tách map geometry khỏi dynamic state; không để poll làm WebView đổi source/remount. Không dùng scalar cho mọi child.
- DB: none. API: reuse existing detail; child map additive theo AUD-07. UI: data binding. Risk: full detail payload và map lifecycle; ổn định geometry/source, không `setLoading(true)` khi background refresh. Verify: 0 map reload khi poll/attendance/assignment metadata; Parent thay đổi status/reason và per-child alight đúng.

### AUD-07 — P1 — Parent có nhiều con cùng Trip chỉ nhận scalar của một con

- Platform/roles/screens: Backend operational-state và Mobile P; PH trả theo từng con nên không mắc lỗi scalar này.
- Trigger: Parent liên kết hai con trong cùng Trip, hai con xuống xe khác thời điểm.
- Expected: mỗi stop con có trạng thái boarding/alighting độc lập.
- Actual/evidence: `service:2233` dùng `.find` để lấy childAtt đầu tiên; response :2281–2285 là scalar. UI :891–896 áp cùng `operationalState.childIsAlighted` cho mọi stop con PRESENT. Có thể gắn nhãn đã xuống xe cho con chưa xuống hoặc ngược lại.
- Repro chưa chạy: hai con PRESENT trên cùng Trip, chỉ một con alighted; Parent mở hai điểm con.
- Root cause: contract giả định một child/Trip trong khi domain cho phép Parent nhiều con; không có studentId trên scalar response.
- Fix: thêm `children` chỉ các con trong roster (studentId, attendanceStatus, absenceReason, markedAt, alightedAt/isAlighted); giữ scalar cũ để tương thích tạm, client mới lookup studentId; hoặc bổ sung equivalent fields trên child stops, nhưng chọn một contract chính `children` để tránh nhân bản rules. Không trả roster học sinh khác.
- DB: none. API: additive child array, Swagger và types. UI: lookup theo id, áp dụng trong polling cycle. Risk: ambiguity legacy fields, Parent nhiều con khác Trip; verify in-memory hai con trạng thái trái nhau, UAT theo dữ liệu PO cấp, kiểm tra absence/privacy.

### AUD-08 — P1 — Controls chưa khóa đầy đủ sau state transition

- Platform/roles/screens: Mobile Attendant A alighting; Web WD assignment.
- Trigger: Driver Complete khi Attendant giữ tab xuống xe; Trip chuyển IN_PROGRESS khi admin đang mở detail.
- Expected: mọi mutation controls khóa ở terminal; assignment chỉ SCHEDULED.
- Actual/evidence: Mobile :1224–1226 TO_SCHOOL canAlight chỉ dựa arrival, không status; undo :1274–1277 luôn clickable với mọi hướng khi isAlighted. Bottom action ẩn ở COMPLETED (:572–575) không ẩn các roster buttons. Web :63–68 canEditAssignment chỉ loại COMPLETED/CANCELLED, vẫn true ở IN_PROGRESS. Backend đã chặn alight khi không IN_PROGRESS (:1970) và assignment khi không SCHEDULED (:721).
- Repro chưa chạy: Complete từ máy khác, đợi state poll rồi bấm undo; mở WD chuyến IN_PROGRESS và kiểm tra edit button.
- Root cause: UI predicate thiếu status; các vùng controls dùng điều kiện khác nhau. Không phải bằng chứng backend cho phép mutation tuần tự sai.
- Fix: canAlight/undo = đúng assigned role + IN_PROGRESS + direction milestone; assignment edit chỉ SCHEDULED; đóng confirmation/modal cũ khi mất điều kiện; backend tiếp tục validate.
- DB/API: none cho fix UI này. UI: action availability, không thêm màn hình. Risk: lỡ khóa undo hợp lệ IN_PROGRESS; verify terminal/both directions/reassignment và stale open confirmation. Runtime `NOT_VERIFIED`.

### AUD-10 — P2 — Lifecycle polling chưa refresh ngay và tiếp tục poll terminal

- Platform/roles/screens: Mobile D/A/P.
- Trigger: focus lại, foreground, completed/cancelled, lỗi polling tạm thời.
- Expected: refresh ngay focus/foreground, không loop không cần thiết sau terminal; background không gọi API mới.
- Actual/evidence: :217 khởi tạo isAppActive=true thay vì AppState.currentState; listener :219 chỉ gán cờ; lần đầu setInterval chờ 5s (:239), không poll ngay focus. Interval không xét status terminal; errors catch rỗng (:234–235). Cleanup blur/unmount có thực hiện (:241–244), background skips ticks nhưng không hủy in-flight.
- Repro chưa chạy: foreground ngay sau missed update hoặc giữ completed detail, đếm request; init trong background.
- Root cause: interval đơn giản, chưa có scheduler theo lifecycle/data state.
- Fix: currentState + immediate refresh on focus/active; không phát request khi background/blur; retry poll network lỗi, trạng thái unavailable rõ khi 403/404; stop terminal sau final refresh, chỉ refetch khi focus lại nếu cần. Không stop polling Home vì empty/terminal của Trip cũ.
- DB/API: none. UI: behavior; risk: dừng sớm và bỏ lỡ final roster, duplicate foreground calls. Verify fake timers + lifecycle traces; mobile reconnect lấy lại ở tick kế tiếp khi active, không cài NetInfo chỉ cho việc này.

### AUD-11 — P2 — Mutation refresh unmount bản đồ và nạp lại dữ liệu tĩnh

- Platform/roles/screens: Mobile D/A; các action Ready/Start/Board/Arrival/Alight/Complete/QR confirm.
- Trigger: mutation success.
- Expected: refresh state ngay, giữ map/scroll/sheet, không map remount.
- Actual/evidence: mọi success gọi loadTripDetail (:344–521); loader setLoading(true) (:190), rendering loading return (:539–546) loại WebView khỏi tree; map memo phụ thuộc toàn trip (:332), WebView source object inline (:630). Poll thường không setTrip nên giữ mapHtml theo source, nhưng chưa runtime verify WebView reload count.
- Repro chưa chạy: quan sát WebView mount/load events khi PO cập nhật một học sinh.
- Root cause: dùng chung initial loader và silent data refresh; memoization HTML không bảo vệ tree khi early return loading.
- Fix: chỉ full-screen loading trước initial data; success await silent refresh; stable geometry/source component, không key theo state/counts. Không dùng add dependency mới.
- DB/API: none. UI: render lifecycle. Risk: error handling sau mutation success/refetch fail; phải phân biệt ghi thành công nhưng đang chờ đồng bộ, không yêu cầu lặp mutation. Verify mount/load counters trên thiết bị và giữ viewport/scroll qua nhiều action.

## G. Potential Issues — Rủi ro đồng thời chưa tái hiện

### AUD-02 — P0 — Mutation đọc rồi ghi có cửa sổ race

- Nhãn: `POTENTIAL_ISSUE — STATIC_EVIDENCE_ONLY`. API, Driver/Attendant/admin, nhiều thiết bị; không khẳng định lỗi đã xảy ra trong DB.
- Trigger/repro dự kiến: A=complete đọc mọi PRESENT đã alighted; B=undo alight đọc Trip còn IN_PROGRESS; B ghi alightedAt=null; A ghi COMPLETED. Hoặc Start đọc attendant cũ Ready rồi admin thay attendant/reset Ready, Start vẫn ghi IN_PROGRESS. Các interleaving tương tự ở arrival/reset boarding, reassignment/ready và hai Driver device start cùng lúc.
- Expected: mỗi transition có preconditions hợp lệ tại commit; sau COMPLETED roster bất biến; nhân sự không còn assignment không ghi được.
- Evidence: assignment/readiness/start/arrival đọc trước rồi update `where:{id}` (:678/822, :1454/1488, :1508/1559, :1584/1635); attendance/alight/complete có callback transaction nhưng không chỉ định isolation hoặc common Trip lock (:1750, :1950, :2028); cập nhật TripAttendance không khóa chung Trip. PrismaService không cấu hình isolation riêng. Chưa kiểm tra isolation DB thực tế, nên đây là rủi ro có điều kiện, không kết luận transaction hiện tại luôn sai.
- Root cause: transaction không tự là aggregate lock; precondition read và write của các method không được serialize cùng nhau.
- Recommended fix: đưa cả 7 mutation assignment/ready/start/arrival/boarding/alight/complete vào transaction nhất quán với `Prisma.TransactionIsolationLevel.Serializable`, tất cả reads/preconditions/writes dùng tx, retry giới hạn tối đa 2 lần khi P2034, sau đó trả conflict 409. Re-read trên mỗi retry; không retry lỗi nghiệp vụ. Generation giữ unique/idempotent hiện có. Không chỉ thêm transaction cho một endpoint hoặc chỉ CAS status ở complete vì không bảo vệ roster. Đối chiếu query conflicts và kiểm chứng thực tế isolation trước khi tuyên bố xử lý xong.
- DB: none về schema/migration; thay đổi transaction behavior. API: thêm documented 409 ở contention sau retry; UI: refetch conflict, không báo success giả. Risk: retries/latency/conflicts; complexity medium. Verify: barrier-controlled in-memory tests chỉ chứng minh luồng điều khiển retry, không chứng minh PostgreSQL isolation; concurrency UAT/integration trong môi trường PO phê duyệt mới chứng minh invariant. `NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY` cho mutation DB thật.

### AUD-09 — P2 — Response cũ có thể ghi đè state mới

- Nhãn: `POTENTIAL_ISSUE — STATIC_EVIDENCE_ONLY`. Mobile H/S/PS/D/A/P và Web WL/WS/WD, mọi role tương ứng.
- Trigger/repro dự kiến: poll A chậm, mutation success/refresh B trả state mới, A trả sau và setState state cũ; đổi tuần/filter/tripId rồi response cũ trả về. Không có trace network chứng minh đã xảy ra.
- Expected: chỉ response thuộc query identity/lifecycle generation hiện tại được apply, không rollback UI do request cũ.
- Evidence: interval :239 không await tick trước; poll setters :228/232 không request sequence; initial/mutation loader :187–207 chạy song song với poll; Web table :94–96/detail :51 và Mobile schedules setters không sequence guard. Mobile timeout AbortController chỉ giới hạn request, không quyết định response nào được apply.
- Root cause: nhiều fetch path cùng ghi local state, không single-flight, generation hoặc latest-request guard; await state rồi roster không tạo snapshot atomic.
- Fix: một refresh coordinator/screen; single-flight, queued immediate rerun khi mutation xảy ra trong fetch; bump generation trước mutation để invalidate poll đang bay; suspend read-apply trong mutation, refetch success hoặc conflict, kiểm tra identity/generation sau mỗi await. Invalidate khi blur/unmount/user/trip/query đổi. Không chỉ dùng mounted boolean.
- DB/API: none. UI: async orchestration. Risk: bỏ fetch mới khi dùng single-flight naïve; response errors cũng phải guard; verification: deterministic deferred promises A/B, filter/week/trip switch, blur/resume, mutation success/fail, no duplicate intervals. Existing test suite chưa có các tests này.

## H. Working Correctly — Phần có bằng chứng tốt

Không dùng tiêu đề này để gán runtime sync PASS:

- **PASS qua tests đã chạy:** TripsService/TripTimeUtil 27/27; gồm quy tắc generation/idempotency, field-level assignment RBAC, masking tên/địa chỉ trong test, TEST/LIVE, TO_SCHOOL Start không cần hết boarding, arrival/alight/complete preconditions và khóa reset. Tests dùng mock Prisma, không chứng minh authorization mọi endpoint hoặc transaction isolation.
- **Đúng theo static audit:** D/A polling có nhận counts/ready/arrival/canStart/canComplete và roster; dừng apply sau blur của poll; AppState skip request mới khi background; mutation local success refetch, error hiển thị alert. Chưa kiểm chứng latency/device.
- Server Home dùng thời gian server để loại quá hạn/terminal và chọn ứng viên; không tự Complete Trip quá hạn. Việc client không refetch là lỗi coverage, không phải cần enum mới.
- Staff Home/Schedule scoped theo assigned ID; Parent Home scoped theo linked child roster; parent schedule có link check. Masking detail che tên/địa chỉ/attendance học sinh khác; không đánh đồng masking với quyền đọc Trip (AUD-01).
- Generation snapshot xe/người/roster độc lập và không overwrite assignment Trip có sẵn là hành vi đúng; RoutePlan default change không được tự đồng bộ vào Trip đã persist.
- Swagger runtime GET `/api/docs-json` thành công, liệt kê các routes Start/Arrival/Alighting/Operational-state/Complete. Đây chỉ chứng minh endpoint được đăng ký trong OpenAPI, không chứng minh toàn contract/error docs đúng. Source Complete summary chưa nêu đủ arrival/alighting, nhiều action chỉ có ApiResponse 200; cần đồng bộ khi sửa API.

## I. Optimization Alternatives

| Option | Đánh giá theo code hiện tại | Quyết định |
|---|---|---|
| A — mở rộng existing polling | Đã có ở detail, không cover Home/lịch/Web; interval thiếu concurrency protection | Tái sử dụng cách gọi APIs; sửa scheduler, không copy interval rời rạc |
| B — focus/foreground/mutation refresh | Cần thiết để quay lại đúng ngay; không giải quyết screen giữ mở có actor khác mutate | Bắt buộc kết hợp polling |
| C — shared hook/query infrastructure | Chưa có QueryClient/SWR; các screens dùng local state tương tự | Hook nhỏ riêng mobile và web trong từng project; không shared-package/global store mới |
| D — SSE/WebSocket | Không có bằng chứng polling đúng lifecycle không đáp ứng yêu cầu vài giây | Không đề xuất triển khai |

Không thêm endpoint lightweight lúc này: existing Home/list/detail/state/roster đủ để refresh. Chi phí query cần đo trước khi tối ưu sâu; child array và quyền đọc cần sửa contract hiện có, không tạo API sync mới.

## J. Recommended Minimal Architecture

1. DB Trip/TripAttendance là source of truth; backend giữ rules, role scope và mutation preconditions. Không client tự đổi TripStatus do quá giờ.
2. Mobile hook `mobile/hooks/use-active-refresh.ts` (đề xuất mới): focus + AppState.currentState, generation/single-flight coordinator, cleanup, interval 5s Home/detail và 10s schedules; immediate focus/foreground, auto retry tick sau network lỗi. Không subscription background.
3. Web hook `web/src/hooks/use-visible-refresh.ts` (đề xuất mới): mount/visibilitychange visible/window focus/online, interval 15s visible; dedup events, generation guard; cleanup event handlers/timer. Không polling unmounted school tab.
4. Data identity đầy đủ: userId+role+schoolId/tripId/week/studentId/filter/page. Scope change clear old sensitive data; 403/404 detail clear controls/data, stop old loop. Role-only boolean không đủ.
5. Chỉ một request batch đang chạy trên mỗi screen; success refresh tức thì, ưu tiên mutation refetch hơn old poll. Cùng screen giữ state, không full-page reload. Không cần cross-device event bus vì mỗi active screen tự fetch server.
6. Parent render trạng thái mỗi con từ `children` keyed studentId. Info assignment dùng detail mới; không gộp scalar child vào mọi stop. Counts chỉ dùng cho role có quyền.
7. Map geometry/source reference ổn định; dynamic state thay đổi không unmount WebView. So sánh geometry/stops map trước khi thay source, không phụ thuộc toàn trip object. Full detail polling là bước đầu, đo payload; không tự thêm lightweight API.
8. Terminal detail: final refresh roster/child/status rồi ngừng interval; focus lại có thể refresh read-only. Home luôn tiếp tục poll để chọn Trip khác, kể cả không có Trip. Lịch vẫn hiển thị terminal history.
9. UI availability phản ánh role/status/milestone mới nhất, backend là lớp quyết định cuối. Không cần thêm status hoặc bảng sync.

Không thay bố cục/màn hình trong kế hoạch. Nếu implementation cần thêm badge/luồng mới, trình wireframe PO duyệt trước; thay refresh/data binding giữ UI copy tối giản.

## K. Detailed Implementation Plan

Toàn bộ phần K là **PROPOSED / WAITING APPROVAL**, chưa viết code. Các đường dẫn không ghi “mới” là file đã có. Không đổi package manager/dependencies hoặc sửa ngoài scope.

### Phase A — Backend quyền đọc và contract/state integrity (ưu tiên P0)

Files:

- `api/src/trips/trips.service.ts`: helper scope read; siết authorization các method AUD-01; child array + action flags theo role; bảo vệ transaction/retry AUD-02, tái sử dụng validation trong service.
- `api/src/trips/dto/trip-operation.dto.ts`: DTO children chỉ con có quyền, role-specific optional counts/action flags nếu cần; scalar legacy optional để tương thích. Không bắt client đoán counts bị thiếu là số 0 và enable action.
- `api/src/trips/trips.controller.ts`: Swagger 403/404/409 và success response DTO của state/mutations; Complete mô tả arrival/alighting; vẫn dùng endpoints hiện tại, không tạo cancellation.
- `api/src/trips/trips.service.spec.ts`: mở rộng existing in-memory Prisma mock để kiểm tra object scope, child array, role-shaped output, stale assignment mutation, terminal validation, P2034 retry. Không dùng app.init(), cron hay DB thật.
- `mobile/services/api-client.ts`: types children và optional role-shaped fields đồng bộ backend; không thay generic HTTP transport trừ khi thực sự cần signal handling.

Thứ tự: authorization → children contract → transaction protection. Phụ thuộc: PO duyệt contract 403/409/privacy và kế hoạch transaction; không cần migration/new table. Compatibility: scalar fields tạm giữ, client cũ không được tiếp tục lộ ngoài scope; cập nhật consumers không trông đợi Parent global counts.

Tests/exit: authorization matrix cho 5 roles, Parent nhiều con chỉ own ids; negative reads không trả data; mutation sequential guards vẫn đúng; retry bounded và lỗi nghiệp vụ không retry; API typecheck; Swagger thực tế `/api/docs` và `/api/docs-json` đối chiếu DTO/errors. Isolation runtime chỉ được hoàn thành sau môi trường concurrency test được PO cấp; không báo PASS bằng mocks. Risk/complexity: medium, bảo mật và rollback/retry cần review kỹ.

### Phase B — Mobile coverage và lifecycle (P1 trước P2)

Files:

- Mới `mobile/hooks/use-active-refresh.ts`: coordinator ở J, dùng React/Expo Router/RN AppState sẵn có; reusable per screen, không global state manager.
- `mobile/app/(tabs)/index.tsx`: H/PH silent refresh 5s + focus/foreground, kể cả empty; error recovery; server expiration; preserve card UI.
- `mobile/app/(tabs)/schedule.tsx`: S refresh 10s, user identity key, giữ selectedDate/week.
- `mobile/app/parent/schedule.tsx`: PS refresh 10s, user/child/week key, virtual→persisted.
- `mobile/app/trip/[id].tsx`: thay interval cũ bằng coordinator; refresh detail/state/roster an toàn; children mapping; mutate success await silent refetch; clear inaccessible data; terminal action guards/QR confirmation; stable map source/geometry và initial-only loading. Không chạy hai interval cũ+mới.
- `mobile/services/api-client.ts`: types theo Phase A; reuse methods sẵn, không cài thư viện.
- Mới `mobile/scripts/trip-state-synchronization.test.ts`: test coordinator pure timers/deferred promises bằng `node:test` sẵn có; chỉ nếu helper có thể import độc lập RN, tách coordinator pure vào `mobile/utils/active-refresh.ts` (mới) nếu cần để test behavior thật. Không test bằng bản sao implementation hoặc chỉ hardcode expected states. Không thêm React test library.

Phụ thuộc: Phase A child contract và permissions; scheduler không cần API mới. Exit: active H/D/A/P trong 5–10s; S/PS tối đa 10s + network latency; focus/foreground gọi ngay; no hidden/background requests, no stale applies after scope change, no duplicate intervals; mutation instant refresh và conflict recovery; no WebView remount; completion xóa Home/chọn tiếp nhưng giữ schedule history. “Trong khoảng” là mục tiêu khi network bình thường, không SLA vô điều kiện. Risk: medium do component detail lớn; không refactor bố cục ngoài task.

### Phase C — Web auto refresh (P1)

Files:

- Mới `web/src/hooks/use-visible-refresh.ts`: per component coordinator visible/focus/online 15s, sequence/generation, single-flight, cleanup.
- `web/src/components/admin/trips/trips-table.tsx`: silent list refetch, total/pages/query guards, clamp page, giữ filter; không set full loading mỗi tick.
- `web/src/app/admin/trips/[id]/page.tsx`: silent detail refresh, assignment only SCHEDULED, close stale modal, clear unauthorized/404; giữ map viewport.
- `web/src/components/admin/trips/trip-assignment-modal.tsx`: giữ draft không reset theo mỗi trip object mới, revalidate latest assignment/status lúc save, success refresh current screen; backend conflict hiển thị rõ rồi refetch.
- `web/src/app/admin/trips/page.tsx`, `web/src/components/admin/schools/school-trips-tab.tsx`: thay refreshKey remount sau generation bằng refresh callback/key signal cho TripsTable nếu cần, không mất filter/page; không thêm independent polling ở wrapper.
- Mới `web/src/lib/active-refresh.ts` và `web/src/lib/active-refresh.test.ts` nếu cần pure scheduler để dùng `node:test` hiện có; hook sử dụng helper này, không nhân bản logic trong test. Không bắt buộc package mới.

Phụ thuộc: API hiện có, Phase A siết scope/errors. Trước code đọc guide Next.js local theo `web/AGENTS.md`. Không đổi server-render/cache architecture vì hiện là client fetch.

Exit: WL/WS/WD status và assignment phản ánh mutation máy khác tối đa 15s + network latency khi visible; focus/online gọi ngay; 0 poll hidden/unmounted; modal draft không bị poll reset; no full reload/map reset; user school scope đúng, filter/pagination và total nhất quán. Risk: low–medium, modal và page giảm là regression chính.

### Phase D — Cross-platform QA và acceptance

Files: cập nhật `docs/ai-review/trip-state-synchronization-audit-plan.md` kết quả thực tế, `LATEST.md` đủ 13 mục và `LATEST.diff` chỉ code của task implementation; không thu gom uncommitted changes khác. Các test files Phase A/B/C theo phạm vi duyệt.

Dependencies: PO cấp account/session và records hợp lệ; mọi mutation UAT do PO thực hiện hoặc cho phép rõ phạm vi/môi trường. Không tự tạo DB fixtures/seed/reset. Không chạy E2E import AppModule có scheduler để tránh side effects generation ngoài scope.

Exit: ma trận M đủ bằng chứng timings/network logs đã ẩn thông tin nhạy cảm; không còn NOT_VERIFIED ở tiêu chí cần nghiệm thu; static checks PASS; Swagger sync; không dữ liệu học sinh khác. Nếu thiếu môi trường cho concurrency hoặc thiết bị, giữ NOT_VERIFIED và không tuyên bố đồng bộ hoàn tất. Complexity medium, không có schema/dependency change.

## L. Database/API/UI Impact

| Tầng | Đã làm trong audit | Đề xuất sau duyệt |
|---|---|---|
| Database | Không truy vấn business data, không mutation/migration | 0 schema/field/enum/table/migration; transaction isolation/retry thay đổi trong service |
| API | Chỉ GET Swagger JSON, không login hoặc mutate Trip | Siết object authorization; children array/Parent privacy; Swagger 403/404/409; không endpoint mới |
| Mobile | Không sửa implementation | 4 screens + API types + small lifecycle hook; action guards; stable map; không bố cục mới |
| Web | Không sửa implementation | table/detail/modal + wrappers/hook, giữ query/form/map |
| Dependencies | Không cài | Không thêm |
| Docs | Tạo plan, cập nhật LATEST; archive bản trước | Cập nhật kết quả nghiệm thu ở task implementation |

N+1/load ghi nhận: Parent Home có 1 links query rồi 1 trip query mỗi con (`service:1369–1392`); staff Home lấy mọi candidates và attendances rồi state query lần nữa (`1276`, `1310`); `/trips` lấy range đầy đủ, tạo virtual/filter/paginate trong memory (`349–547`). Detail load staff là 3 HTTP requests/cycle; với 5s khoảng 36 request/phút cho một focused screen, chưa gồm auth query/Prisma statements. Parent detail 2/cycle khoảng 24/phút; Web list 15s khoảng 4/phút. Đây là ước lượng từ số call, **không phải benchmark**, không có evidence quá tải hiện tại. Đo query count/latency trên dữ liệu PO cấp trước khi batch/select/limit hoặc đề xuất lightweight endpoint; không mở rộng optimization DB trong task sync.

Khác biệt contract cần lưu ý, chưa tính thành bug mới: Parent schedule membership và studentCount trên list/detail dựa RouteStop trong khi Home/operation dựa TripAttendance. Roster độc lập và defaults RoutePlan không tự overwrite persisted Trip. Chưa có evidence route stops được thay đổi sau generation làm lệch membership thực tế; nếu future route editing được duyệt phải kiểm tra thêm, không sửa domain rule trong audit này.

## M. Test & UAT Matrix

### M1. Đã thực hiện

| Check | Lệnh/hành động thực tế | Kết quả / giới hạn |
|---|---|---|
| Git | `git status --short` | main, có nhiều changes/intent-to-add/untracked từ trước; giữ nguyên business work |
| Typecheck API | `npx --no-install tsc --noEmit --incremental false` tại api | PASS, exit 0 |
| Typecheck Web | cùng lệnh tại web | PASS, exit 0 |
| Typecheck Mobile | cùng lệnh tại mobile | PASS, exit 0 |
| Existing unit tests | `npx --no-install vitest run src/trips/trips.service.spec.ts src/trips/utils/trip-time.util.spec.ts` tại api | PASS, 27/27, 2 files; đã đọc test/config/PrismaService, mock-only, không DB client khởi tạo |
| Runtime OpenAPI | GET `http://localhost:3000/api/docs-json` | PASS về endpoint discovery; không phải full Swagger behavior verification |
| Source trace | rg + đọc loaders/hooks/controller/service/schema/guards/test files | Đã thực hiện, evidence dòng trong B–G; runtime sync NOT_VERIFIED |

Không chạy toàn bộ unit suite hoặc E2E vì không cần chứng minh thêm bằng tests ngoài scope chưa audit side effects. `api/test/app.e2e-spec.ts` bootstrap AppModule có Prisma/scheduler; không dùng như test đồng bộ. Web `routes.test.ts` thiên về contracts/in-memory rules, Mobile `scripts/mobile.test.ts` kiểm tra code/navigation; không mount screen hoặc kiểm tra cross-role synchronization. Không có test timer/lifecycle/out-of-order Trip client hiện hữu được tìm thấy. Cảnh báo Vitest về vite-tsconfig-paths là advisory, tests exit 0; không sửa config/dependency ngoài scope.

### M2. Acceptance sau sửa — chưa thực hiện

Mỗi UAT mutation dưới đây hiện `NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY` khi cần thay đổi DB thật. PO cấp dữ liệu hợp lệ và thực hiện/duyệt mutation đúng môi trường. Không suy diễn quyền từ yêu cầu audit. Tests pure scheduler/in-memory không chạm DB có thể thêm trong implementation đã duyệt; không tạo fixture nhằm ép PASS.

| ID | Actor thao tác → observer / điều kiện | Assertion / dữ liệu tối thiểu |
|---|---|---|
| U01 Ready | Attendant → Driver H/D; 2 devices | Ready và canStart tự đổi, không refresh; SCHEDULED hợp lệ, assigned roles |
| U02 Start | Driver → A/PH/PS/WL/WD | Status/boarding actions đúng hướng trong target latency; đo GET request timestamps |
| U03 Boarding | Attendant → Driver counts/P từng con | PRESENT/ABSENT có reason/UNMARKED trước gate; UI update và backend reject reset sau gate |
| U04 Arrival | Driver TO_SCHOOL → A/D | Arrival persisted, mở alight, khóa reset, Driver Complete chỉ enable đủ điều kiện |
| U05 Alighting | Attendant → Driver/P | Counts/canComplete và child status, bao gồm Parent hai con khác trạng thái |
| U06 Complete | Driver → mọi mobile/Web views | Terminal controls khóa; H/PH chọn chuyến tiếp hoặc empty; S/PS giữ completed history |
| U07 Cancellation | N/A | NOT_IMPLEMENTED, không tạo workflow để test |
| U08 Assignment | Admin → old/new Driver/Attendant/P | Old/new Home/Schedule membership đổi; ready reset; old actor GET detail/state/roster bị từ chối và UI clear |
| U09 Expiration | Không mutation, Home mở liên tục qua giờ | Trip end 10:00: 10:01 không còn H/PH, IN_PROGRESS quá giờ vẫn giữ DB status; có chuyến kế để test lựa chọn |
| U10 Multiple devices | Cùng Driver/Attendant/Parent 2 máy, admin nhiều tabs | Các observer không cần pull/reload; form/modal draft không bị tick reset |
| U11 Lifecycle | blur/unmount/background/foreground/browser hidden→visible | Không API mới background/hidden; immediate resume; 1 scheduler/screen; no late apply after blur |
| U12 Network | offline→online, slow requests | Tự recovery, retry có giới hạn cadence; không apply response cũ, không báo ghi thất bại sau success chỉ vì refetch lỗi |
| U13 Response races | Deferred promises A/B, mutation khi poll đang bay, query/identity đổi | Old A không overwrite B; queued refresh chạy sau mutation, errors cũng không làm scope mới lỗi |
| U14 Map | Giữ map viewport, PO mutation/poll | 0 WebView reload/remount do data refresh, scroll/sheet không reset; geometry thực thay đổi là case riêng |
| U15 Read authorization/privacy | 5 roles, đúng/sai assignment/school/link | GET 403/404 ngoài scope; Parent payload không có child ids/names/status khác; nhiều con được map đúng |
| U16 Concurrent transitions | PO-approved isolated DB environment | Start vs reassign/reset, Ready vs reassign, Arrival vs reset, Complete vs undo/attendance, Start hai máy; invariant tại commit, conflict/retry đúng |
| U17 Generation/virtual | PO sinh chuyến hoặc môi trường có lịch cron hợp lệ | virtual row thành persisted, H empty→trip; defaults đổi không overwrite snapshot cũ |
| U18 Web query/modal | Filters/page cuối/draft assignment khi người khác Start | Table total/pages cập nhật, không hàng ngoài filter; form không reset; save stale bị chặn, UI refetch |

Đo latency từ mutation API success tới state hiển thị ở observer active, kèm roundtrip; không đánh đồng interval với guaranteed SLA. Không cần refresh thủ công trong mọi UAT; không dùng reload để “chữa” ca test. Runtime no-write lifecycle/expiration cần thiết bị/session/data hợp lệ; phiên này chưa có quan sát UI xác thực nên NOT_VERIFIED, không gắn PASS.

## N. Risks & Limitations

- Audit kết luận từ source hiện tại, repository chưa commit; số dòng có thể đổi nếu PO/agent khác sửa. Handoff và review cũ là context, không bằng chứng tests/session này.
- Runtime duy nhất được đọc là Swagger JSON; không có authenticated business GET, không kiểm tra màn hình thật, latency mạng, thiết bị camera, PostgreSQL isolation thực tế hoặc concurrency. Không truy cập secrets/tokens để vượt giới hạn này.
- 27 tests PASS không bao phủ đủ scope guards, Home expiration, multiple children, stale responses, focus/foreground, map lifecycle hoặc multi-device. Không báo tổng 270 tests của phiên trước là kết quả phiên này.
- Không thấy Trip cancellation implementation; không coi deferred feature là lỗi sync.
- Backend computed eligibility có logic tương tự mutation validation nhưng không phải authorization, có thể lệch trên legacy data (ví dụ absent reason/null schedule). DTO nullable hiện tại và dữ liệu thực chưa được kiểm tra; chưa tính thêm bug không có evidence chạy. Mutation phải luôn validate lại.
- Home đọc candidate rồi đọc operational-state lần nữa có thể thấy hai thời điểm trong một response; polling kế tiếp khắc phục transient inconsistency, chưa có proof phải tạo aggregate version/new endpoint.
- Hook pure tests có thể dùng toolchain hiện có; RN/DOM lifecycle và WebView vẫn cần device/browser UAT. Không tự cài test libraries.
- Plan chỉ sửa behavior/state binding, chưa duyệt UI mới. Nếu muốn thêm badge operational phase trên Web/Parent detail cần wireframe và contract riêng; không lén thêm vào sync implementation.
- Phiên audit chỉ ghi tài liệu AI Review và archive; không business code/schema/package changes, không migration/seed/commit/push. Bản LATEST trước và diff được lưu riêng để bảo vệ lịch sử.

## O. Implementation Readiness

**READY_WITH_LIMITATIONS — IMPLEMENTATION DONE; WAITING FOR USER UAT / REVIEW.**

Implementation đã thực hiện theo quyết định mới ở đầu tài liệu. Rủi ro transaction/concurrency và UI đa thiết bị vẫn cần runtime evidence; không tuyên bố xử lý hoàn toàn chỉ bằng mock tests.

Một bước tiếp theo: Product Owner thực hiện UAT ma trận M2 trên dữ liệu hợp lệ hoặc cấp rõ phạm vi môi trường/dữ liệu cho các ca cần mutation. Dừng sau task; không tự mutate Trip thật để nghiệm thu.
