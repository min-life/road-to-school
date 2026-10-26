# AI Review — Trip State Synchronization Implementation

## 1. Task Information
- Task Name: Approved Trip State Synchronization Implementation.
- Date: 25/10/2026 (Asia/Saigon).
- Project Scope: API / Web / Mobile / Documentation.
- Task Type: Implementation / Fix / Verification.
- Status: COMPLETED ở mức implementation; READY_WITH_LIMITATIONS về nghiệm thu runtime.

## 2. Original Request
PO phê duyệt sửa 11 phát hiện AUD-01…11, áp dụng object-level authorization và concurrency tối giản; tối ưu plan hiện có rồi triển khai liên tục Backend/Mobile/Web, tests, Swagger và AI Review. Không dừng chờ approval từng phase. Không migration, dependency mới, redesign, mutate business DB để test, commit/push.

## 3. Approved Scope
Implementation đã được PO phê duyệt trong chỉ thị hiện tại, bao gồm hai quyết định P0, Parent persisted membership theo roster, child state keyed studentId, lifecycle/request guards, silent refresh và map stability. Phạm vi này không cấp phép thao tác Start/Complete/Attendance/assignment thật để kiểm thử. Acceptance/runtime UAT chưa được tự đánh dấu APPROVED.

## 4. Analysis & Decisions
### A. Approved Decisions
- Decision 01 đã áp dụng: một helper assertTripAccess trong TripsService cho object-level scope. SYSTEM_ADMIN theo quyền hệ thống, SCHOOL_ADMIN đúng schoolId hợp lệ, DRIVER/BUS_ATTENDANT đúng assigned ID, PARENT có linked student thuộc TripAttendance. List của School Admin không có schoolId bị từ chối. Parent không nhận roster/PII/counts/action flags của học sinh khác.
- Decision 02 đã áp dụng: bảy mutation assignment/ready/start/arrival/boarding/alighting/complete khóa cùng hàng Trip bằng parameterized SELECT FOR UPDATE trong Prisma transaction ReadCommitted, sau đó đọc lại preconditions và ghi bằng tx. Không Serializable toàn service, distributed lock, bảng mới hoặc retry framework.
- Không tuyên bố concurrency PostgreSQL đã PASS: tests chỉ xác minh cấu trúc lock-await/recheck và guards bằng in-memory mocks; runtime concurrent transactions chưa kiểm chứng.

### B. Optimized Plan
- Tái sử dụng endpoints hiện có; không tạo sync API/WebSocket/global store/shared-package.
- Một refresh loop mỗi active screen: operational detail 5s; metadata 20s hoặc focus/mutation; Home 8s; schedules 12s; Web 15s. Không interval riêng cho metadata.
- Single-flight + generation guards + coalesced refresh, invalidation quanh mutation/scope/lifecycle. Terminal/403/404 ngừng polling detail; Home empty vẫn polling để nhận chuyến kế tiếp. Web Trip GET có timeout 15s, Mobile dùng timeout sẵn có.
- Parent persisted schedule theo TripAttendance; virtual giữ RoutePlan. children array thay common scalar.
- Form assignment giữ draft, chỉ gửi fields đổi và snapshot expected IDs; backend trả 409 khi snapshot stale. Không tự ghi đè assignment của Admin khác trên Web mới.
- Cập nhật plan tại [trip-state-synchronization-audit-plan.md](trip-state-synchronization-audit-plan.md); baseline audit A–N được giữ để đối chiếu, phần quyết định/kết quả mới ở đầu tài liệu ưu tiên.

## 5. Implementation Details
### C. Backend Changes
- Scope helper áp dụng detail/mobile detail/operational-state/attendance; deny missing school scope trên list. Request sau reassignment kiểm tra assigned IDs mới.
- Parent children theo từng studentId, attendance/reason/markedAt/alightedAt/isAlighted riêng; bỏ legacy scalar gây gộp trạng thái và không trả global counts/action flags cho Parent. Staff action flags đúng role.
- getMobileTripDetail chỉ đánh dấu con thuộc roster là own child; masking các stop khác giữ behavior bản đồ hiện có. Parent studentCount giới hạn con thuộc roster có quyền.
- Persisted Parent schedule dùng attendance membership, không RouteStop; virtual schedule không đổi.
- withTripLock phối hợp Trip và roster writers; giữ các business validations hiện có, không tin UI disabled state. Driver Start lần hai, Start sau Ready reset, terminal undo, Arrival/Complete preconditions bị kiểm tra lại sau lock.
- Assignment DTO bổ sung optional expectedVehicleId/expectedDriverId/expectedBusAttendantId; check sau lock, conflict 409. Trường optional để tương thích client cũ; optimistic conflict protection của Web mới gửi đủ snapshot.

### D. Mobile Changes
- Home Driver/Attendant/Parent và staff/Parent schedules tự refresh theo active lifecycle; giữ selected week/day/search và không blank screen trên polling.
- Trip Detail refresh state/roster/metadata có guard. Parent stop labels dùng latest child state theo ID, bao gồm absence reason và alighting; không common scalar.
- Mutation invalidates outstanding reads, pause polling, resume/refetch sau success hoặc failure; không báo mutation thất bại chỉ vì refetch tạm lỗi. Chặn thao tác mutation trùng trên cùng screen.
- Confirmation cũ đóng khi operational availability đổi; terminal khóa alight/undo/QR. QR responses có scope/generation guard để không apply kết quả cũ sau state/scope change.
- Initial-only full loading; WebView source được memoize từ geometry/stops snapshot không chứa attendance/status/assignment. Không đổi Bottom Sheet hoặc tạo screen mới. Nhãn TripStatus ngắn thêm trên dòng thông tin hiện có để phản ánh backend status.
- 403/404 clear Trip/roster/child/modal data và stop loop. Temporary network failures giữ valid data, retry cadence.

### E. Web Changes
- Trip list và tab chuyến của trường dùng visible/focus/online auto-refresh 15s, giữ filters/page, cập nhật totals/pages, clamp page nếu hết trang. Generation success không remount table.
- Detail silent refresh, assignment chỉ SCHEDULED; đóng modal khi mất eligibility hoặc access. 403/404 clear private data và ngừng loop; error/network responses cũ không overwrite scope mới.
- Form assignment chụp baseline khi mở, không reset draft theo trip object mới ở polling; disable Save khi stale, gửi fields đổi + expected IDs. Success/conflict refetch metadata.
- Auth identity lấy từ context hiện tại, không giữ role/school snapshot localStorage lâu dài. Không router reload toàn trang hoặc redesign.

### G. Files Changed
25 source/test files trong task; các files này đã có uncommitted work trước task thì sửa tiếp đúng phần liên quan, không discard changes của PO. Danh sách chính xác:

- api/src/trips/trips.service.ts api/src/trips/trips.controller.ts api/src/trips/dto/trip-operation.dto.ts api/src/trips/trips.service.spec.ts mobile/services/api-client.ts mobile/app/(tabs)/index.tsx mobile/app/(tabs)/schedule.tsx mobile/app/parent/schedule.tsx mobile/app/trip/[id].tsx web/src/components/admin/trips/trips-table.tsx web/src/app/admin/trips/[id]/page.tsx web/src/components/admin/trips/trip-assignment-modal.tsx web/src/app/admin/trips/page.tsx web/src/components/admin/schools/school-trips-tab.tsx api/src/trips/dto/update-trip-assignment.dto.ts web/src/lib/types.ts web/src/lib/api-client.ts api/src/trips/trip-synchronization.spec.ts mobile/hooks/use-active-refresh.ts mobile/utils/refresh-loop.ts mobile/utils/trip-map-data.ts mobile/scripts/trip-state-synchronization.test.ts web/src/hooks/use-visible-refresh.ts web/src/lib/refresh-loop.ts web/src/lib/refresh-loop.test.ts

Lý do theo nhóm: API service/controller/DTO cho scope/locking/contract/Swagger; API tests cho guards và read-after-lock; Mobile screens/client/hook/utils/tests cho lifecycle/child binding/map; Web table/detail/modal/wrappers/client/types/hook/utils/tests cho visible refresh, timeout và optimistic assignment conflict.

Tài liệu cập nhật: audit plan, LATEST.md, LATEST.diff và docs/ai-handoff/CURRENT_STATE.md. Báo cáo audit trước được lưu nguyên tại history/2026-10-25-trip-state-sync-audit-before-implementation.md; các history/handoff diff cũ được giữ nguyên.

LATEST.diff chỉ chứa code/test changes của task, được tính từ bản working files trước khi sửa; không gom toàn bộ uncommitted changes từ Antigravity. Dùng unified=0 để không kéo unchanged key literal của source cũ vào context diff. Không chứa .env, secrets, node_modules hoặc generated output.

## 6. Database Changes
### F. Database Impact
**0 bảng, 0 fields, 0 enums, 0 migrations mới.** Không sửa schema, không chạy migration/seed/reset/backfill hoặc mutate business data để test. Khóa hàng ReadCommitted là hành vi transaction trong code, không thay cấu trúc DB. Không thêm dependency/package manager/global state infrastructure.

## 7. API & Swagger Changes
- Existing GET /trips, /trips/:id, /trips/mobile/:id, /trips/:id/operational-state, /trips/:id/attendance: scope được siết, document 400/401/403/404/500.
- Existing GET Parent student schedule: persisted membership TripAttendance, virtual không đổi.
- Operational state: Parent children DTO theo từng ID; progress/action flags optional trong Swagger vì chỉ trả cho role phù hợp. Legacy scalar child fields đã bỏ khỏi operational payload/schema.
- PATCH /trips/:id/assignment và aliases: optional expected assigned IDs, stale snapshot 409; Swagger request fields và conflict response đã cập nhật.
- Complete document đủ arrival/alighting và 422 incomplete attendance. Không endpoint mới/cancellation workflow mới.
- Runtime verification: GET http://localhost:3000/api/docs và /api/docs-json đều HTTP 200. OpenAPI có children schema với studentId/attendanceStatus/absenceReason/markedAt/alightedAt/isAlighted; không legacy scalar; totalStudents không required cho Parent; state responses có 200/400/401/403/404/500; assignment snapshot fields và 409 hiện diện. Đây là xác minh docs contract, không authenticated business runtime acceptance.

## 8. UI/UX Changes
Giữ layout Web/Mobile, Fixed Bottom Action, Manual Attendance, QR và Bottom Sheet hiện có. Chỉ sửa fetch/state binding/eligibility, silent loading và status copy ngắn trên dòng thông tin. Không màn hình hoặc luồng wireframe mới; không yêu cầu/cài UI skill. Màu/theme không đổi.

## 9. Verification & Testing
### H. Tests
**PASS:**
- API: npx --no-install tsc --noEmit --incremental false.
- Web: cùng lệnh tại web.
- Mobile: cùng lệnh tại mobile. Mobile test đặt trong scripts đã được tsconfig hiện tại exclude; không thêm Node types hoặc sửa tsconfig.
- API: npx --no-install vitest run src/trips/trips.service.spec.ts src/trips/trip-synchronization.spec.ts src/trips/utils/trip-time.util.spec.ts → 57/57 tests, 3 files.
- Mobile: node --test --experimental-strip-types scripts/trip-state-synchronization.test.ts → 7/7.
- Web: node --test --experimental-strip-types src/lib/refresh-loop.test.ts → 6/6.
- Tổng relevant tests chạy thực tế: **70/70 PASS**, không dùng tổng 270 lịch sử.
- Targeted Web ESLint screens/hooks/helpers/tests: exit 0, không errors/warnings ở lần cuối.
- API oxlint src/trips/: exit 0; warnings unused imports có sẵn ở các DTO/tests. Không sửa unrelated files/config để làm đẹp lint.
- Swagger live contract checks nêu ở mục 7.
- Task-only diff reverse dry-run: git apply --check --reverse --unidiff-zero docs/ai-review/LATEST.diff → exit 0; không apply thật. Task-added whitespace scan và final git status được kiểm tra.

Tests kiểm tra positive/negative object scope, missing school, linked roster, nhiều con và privacy, revoked assignment, roster-based schedule query, wait-for-row-lock trước precondition read cho bảy mutation, terminal rejection, Ready reset, stale expected assignment conflict và second-device Start recheck. Client pure tests kiểm tra immediate fetch, cadence, active/inactive/dispose, coalescing, old-response invalidation, mutation pause/resume, retry/terminal stop, empty Home và map geometry invariance.

**FAIL:** Không còn test/typecheck/lint failure trong bộ kiểm chứng cuối. Trong quá trình triển khai đã cập nhật existing unit fixtures thiếu assigned IDs/roster/lock mock cho contract authorization mới; không nới security hoặc giả lập runtime PASS để giữ tests cũ. Kiểm tra diff rộng từ git HEAD còn báo whitespace có sẵn trong file ngoài task; task-only diff không đưa các files đó vào.

**NOT_VERIFIED:** RN/browser lifecycle trên thiết bị thật, native WebView reload count/viewport, full form interaction, multi-role/multi-device/browser tabs, network latency và PostgreSQL concurrency/row-lock behavior thực tế. Pure scheduler/mock tests không chứng minh những phần này.

**BLOCKED_BY_TEST_DATA_POLICY:** Những ca UAT cần Start/Complete/Attendance/assignment/generation trên business DB thật chưa được tự thực hiện. PO cần cấp môi trường/dữ liệu/phạm vi mutation hoặc tự thao tác theo ma trận M2. Không login, tìm token, tạo mock records trong DB, khởi động app/cron/E2E để ép PASS.

Advisory Node MODULE_TYPELESS_PACKAGE_JSON và vite-tsconfig-paths không làm tests thất bại; không đổi package.json/dependencies ngoài scope.

## 10. Issues & Risks
### I. Remaining Risks
- Row lock code phối hợp bảy operation writers cùng Trip; chưa có runtime PostgreSQL concurrency evidence, không claim chống mọi tình huống cực đoan hoặc resource conflicts giữa nhiều Trip khác nhau.
- Native map source invariance có unit test và silent render path đã kiểm tra tĩnh; số lần WebView load/remount thực tế vẫn cần thiết bị.
- Metadata cadence 20s và Web 15s có độ trễ có chủ đích, cộng network latency; không phải realtime SLA. Mất mạng giữ dữ liệu hợp lệ và tự retry, không thể hiện dữ liệu mới khi offline.
- Existing Home/list queries chưa benchmark tải; không tạo endpoint/bảng mới. Chỉ poll screen active, metadata thưa hơn để giới hạn chi phí.
- Optimistic assignment snapshot là optional cho compatibility; client cũ không gửi expected IDs chưa có bảo vệ stale form như Web mới, nhưng backend vẫn kiểm tra lock/state/RBAC.
- End-to-end UI/authorization acceptance cần UAT. Không suy luận PASS từ typecheck/backend tests. Repository vẫn có nhiều uncommitted changes bàn giao ngoài task, không commit/reset/discard.

## 11. Reviewer Focus
- Helper scope đúng cho mọi read và schoolId rỗng; Parent linked roster membership và không leak counts/other-child data.
- Cả bảy operation writers lấy cùng Trip row lock trước mọi precondition/roster read; mọi write trong tx; no nested global Prisma reads để quyết định mutation.
- Parent nhiều con: per-ID state; persisted schedule membership; virtual unchanged.
- Client guards cho cả success/error, focus/foreground/visible cleanup, mutation invalidation và terminal/denied polling stop; Home empty vẫn poll.
- Metadata source/map stability, form baseline/draft/409, filtered totals/page clamp; no hidden/background loop duplication.
- Tests in-memory khác runtime PostgreSQL/device UAT; readiness không được nâng thành 100% acceptance khi chưa có evidence.

## 12. Suggested Next Step
Product Owner thực hiện UAT ma trận M2 trong audit plan trên dữ liệu hợp lệ, hoặc cấp rõ môi trường/dữ liệu/quyền mutation cho kiểm chứng runtime.

## 13. Approval Status
### J. Final Readiness
**READY_WITH_LIMITATIONS.** Implementation được PO phê duyệt và đã thực hiện liên tục; acceptance là WAITING FOR USER REVIEW / UAT. Không tự đánh dấu UAT APPROVED.

Dừng sau task. Không commit/push, không tự thao tác business records để nghiệm thu.
