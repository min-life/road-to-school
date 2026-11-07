# AI Review — Parent Home: tiến trình theo mốc nghiệp vụ

## 1. Task Information
Task: thay rail phụ thuộc GPS bằng mốc nghiệp vụ và tinh chỉnh card phụ huynh. Date:30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Analysis / Implementation. Status: COMPLETED cho phần API hỗ trợ; ETA động/event pickup/history là giới hạn đã liệt kê, không triển khai backend.

## 2. Original Request
Bus nằm trên thanh, nhảy2/3 từng chặng theo xuất phát/điểm danh/đến trường/xuống xe; thay icon node tại mốc. Ngày ngang Chuyến xe của con; trạng thái điểm danh rõ khi collapsed; tag nhiều màu; route/time/date chuyển khỏi khối cũ. Hiển thị actual departure/attendance/arrival, số phút dự kiến và sớm hơn lịch. Kiểm tra API trước code; thiếu thì liệt kê và làm phần đủ.

## 3. Approved Scope
PO trực tiếp chỉ định mốc2/3 và cho phép implement phần có dữ liệu, thay thế quy tắc GPS-only trước đó. Trước code đã báo nguồn API có/thiếu và wireframe gồm heading/date, summary tags, route header, times tại node trong commentary. Không có vòng duyệt wireframe riêng hoặc PO nghiệm thu thành phẩm. Chỉ frontend/docs, không backend/API contract/schema/DB/env/dependencies, không commit/push. Không tạo business test data/fake API hoặc gọi mutation để test.

## 4. Analysis & Decisions
Đọc AGENTS/WORKING_RULES/BUSINESS_CONTEXT/handoffs/review/module spec và áp dụng ui-ux-pro-max Color Only: thông tin dùng cả chữ/icon/màu.
API audit: Home có per-student attendance/alighting/leave flag/lịch; detail có own stops/plannedArrivalTime. Operational-state projection PARENT thực sự trả actualStartTime, arrivedAtSchoolAt/isSchoolArrived và children theo studentId. Incidents projection PARENT có type/status/time, context/description/actors bị ẩn. Dùng GET có sẵn, không đổi API clients.
Thiếu ETA động và event độc lập đến/rời pickup. Nhịp bus ở pickup1600ms chỉ là UI acknowledgment sau UNMARKED→PRESENT quan sát thật, rồi minh họa chặng kế tiếp; không khẳng định vừa rời stop. Bubble chỉ số phút tới lịch đã công bố, caption theo lịch. Home chỉ list SCHEDULED/IN_PROGRESS, không tự tạo history cache khi completed/cancelled biến mất.
Trip enums thực4 trạng thái, attendance3; incidents5 trạng thái, chỉ WAITING_ASSIGNMENT/WAITING_CONFIRMATION tạo cảnh báo active. Mỗi con dùng children.find(studentId), không aggregate/children[0] hoặc status của sibling.

## 5. Implementation Details
Sửa6 application files hiện có:
- mobile/app/(tabs)/index.tsx: ngày cùng heading, normalize trạng thái per-child qua operational-state, summary tags, bỏ old route/time/date box, giữ đầy đủ attendance/absence/xe/tài xế/actions. Timestamp cùng timezone Việt Nam.
- mobile/components/parent/student-journey.tsx: route header, rail3/2 mốc, bus trên rail/thay node, nhịp boarding, clocks actual/planned, bubble theo lịch, sớm/trễ và incidents cấp chuyến. Export presenter để tái dùng/kiểm tra không domain fixture.
- mobile/components/parent/trip-card.tsx: optional studentStatus/hasIncident/attention/stale; tag visible khi collapsed, amber emphasis, cố định bề rộng border trái để không dịch layout khi đổi trạng thái.
- mobile/components/parent/home-styles.ts: sectionHeader/sectionDate, tái sử dụng danger tone.
- mobile/hooks/use-parent-journey-telemetry.ts: readonly operational-state + incidents5s/trip, detail20s/focus, dedup/cache/isCurrent/partial error; loại bỏ navigation/GPS polling của rail.
- mobile/utils/parent-journey.ts: actualStartTime/school arrival theo operation, per-child alighting/markedAt, giữ lịch cũ khi có actual, không dùng giờ về bãi làm giờ trả con.
Thêm3 application files:
- mobile/constants/parent-journey.ts: semantic tones dùng chung.
- mobile/utils/parent-journey-stage.ts: pure per-child projection, badge/stage/incident/date/time arithmetic.
- mobile/scripts/parent-journey-stage.test.ts:10 pure tests mới, không business records/API mock.
Docs sửa5 files: architecture/mobile-parent-student-journey.md (spec hiện hành/API audit), mobile-parent-home-ui.md, mobile-ui-implementation-status.md, ai-handoff/CURRENT_STATE.md và CODEX_HANDOFF.md. Trước task lưu history/2026-10-30-before-stage-journey.md/.diff. LATEST.diff chỉ14 files code/docs của task so với snapshot trước task, không toàn bộ pending work cũ.

## 6. Database Changes
None. Không kết nối/ghi DB, seed, migration, dữ liệu giả hoặc GPS publish.

## 7. API & Swagger Changes
None. API clients byte-identical, backend/API contracts không sửa; Swagger N/A.
Dùng GET /trips/mobile/parent/home-cards (controller8s cũ), /trips/:id/operational-state + /trips/:id/incidents (5s/trip), /trips/mobile/:id (20s/focus). Không gọi navigation, session, position, history, segment hoặc mutations để test.

## 8. UI/UX Changes
Bus có tâm nằm cùng y với rail. Chiều đi:0 khi chờ,1/3 khi đã chạy/chưa đón (=2/3 chặng đầu),0.5 khi mới nhận điểm danh trong1600ms,5/6 khi PRESENT đang đến trường,1 khi đến trường/xuống. Return PRESENT chờ0, chạy2/3, xuống1. ABSENT/CANCELLED không vẽ hành trình con tham gia; COMPLETED thiếu mốc không suy ra trả con. Không tạo domain enum/event mới.
Tại node bus thay node, nên3 icon ở đầu/pickup/đích; giữa chặng4 icon giữ xuất phát/nhà/trường. Marker co theo rail nhỏ để không chồng, không thay touch target. Vị trí nhảy, chỉ opacity fade180ms, không fake live GPS. Reduced motion/focus/background giữ.
Summary có tag amber Chưa điểm danh (nổi nền/viền/icon), blue Đã điểm danh, purple Chưa xuống xe, green Đã xuống xe, red Vắng mặt/Đã báo nghỉ. Chuyến có sự cố là tag riêng, không biến incident của chuyến thành attendance cá nhân. Không cần expand mới biết đã điểm danh hay chưa.
Ngày API DD/MM/YYYY ngang heading; route đầy đủ đầu panel. Old info card được bỏ, lịch/actual di chuyển lên node; giờ về bãi vẫn có dòng riêng ở chiều về. Actual departure/boarding/school arrival/alighting là timestamps thật, giữ planned nhỏ để đối chiếu. Sớm/trễ làm tròn phút từ serviceDate+planned clock+actual; thiếu không tính. Bubble ghi theo lịch, không hiện ETA động giả.
Không đổi safe area/header/tab/keyboard hoặc nhánh staff. Không text trạng thái lặp trong graph ngoài tags; caption minh họa giải thích đúng ý nghĩa vị trí. Wireframe cụ thể hóa yêu cầu PO trước code; chưa nghiệm thu.

## 9. Verification & Testing
PASS: Mobile npx --no-install tsc --noEmit sau dọn preview,0 lỗi.
PASS: Expo export --platform all --output-dir <TEMP>/rts-stage-journey-final-export, iOS/Android/Web/server, exit0; log TEMP/rts-stage-journey-export.log. NO_COLOR/FORCE_COLOR warnings không chặn build.
PASS:24 node:test/5 suites (14 cũ +10 mới): stage fractions, boarding frame, đến trường khác xuống xe, return boarding trước start, absence/cancel/unknown completion, badge riêng, active incident enums, planned vs actual arithmetic/timezone/service date/countdown. Inputs primitives/toạ độ toán học; không DTO giả, fixture records hoặc API mock.
PASS: source AST parity fetchHomeData/onRefresh/getRoleLabel/getStatusBadge/getAttendanceBadge, staff JSX, router.push/triggerQuickLeaveNotice payload/callback; API clients và14 tests trước không đổi. Khối parentRouteBox không còn render; per-child match bằng ID; hook không navigationApi.
PASS: Chromium IAB presentation-only8 trạng thái ở320px: busOnRail=true, noIconOverlap=true, không tràn;3 icon ở node và4 giữa chặng, absent không bus. Date/heading cùng hàng320/390/844/1440; nhãn tên/trường/tuyến dài ở4 widths không tràn. Return320/390, bubble theo lịch, callback local tăng counter mà không đóng panel, Enter collapse. Preview dùng enum/boolean/typography inputs, không domain DTO/API/DB; không chứng nhận API runtime.
PASS: report13 sections, task diff14 files, whitespace/local links; preview entry xóa, tab đóng, server dừng, viewport reset. Exports/tests ở TEMP, không repo build outputs.
NOT_VERIFIED: lint vì Mobile không có script/config lint riêng; không cài tool.
NOT_VERIFIED: Expo Go iPhone/Android, Safari iOS/Chrome Android, VoiceOver/Dynamic Type/reduced motion thiết bị thật; mốc1600ms từ API event thật, polling/error/revocation và navigation/quick-leave end-to-end. BLOCKED_BY_TEST_DATA_POLICY cho runtime cần dữ liệu/phiên vận hành chưa sẵn; không tự tạo hoặc mutate records.

## 10. Issues & Risks
Chưa có ETA động/arrival-departure pickup events; số phút là lịch, clock thiết bị và không ngoại suy chậm trễ. PARENT incidents chỉ mức chuyến do privacy masking. Home không trả completed/cancelled history; card chuyển/rỗng theo API hiện có.
Hai con cùng trip có thể có rail minh họa khác nhau vì attendance khác nhau; không phải hai tọa độ thật của cùng xe. Có polling latency5s/8s và metadata20s; không hứa đồng bộ tức thời hoặc zero network lag. Home fallback khi operational source đọc lỗi; known timestamps không tạo lại bằng thời gian render.
Nhịp boarding là hiệu ứng UI sau dữ liệu thật, không xác nhận rời stop; các globals/presentation tones không là business enum. Backend/DB/permissions không đổi. Native acceptance còn thiếu, đã ghi rõ.

## 11. Reviewer Focus
Soát per-child lookup và alighting độc lập; school arrival không suy ra con đã xuống, return không lấy parking completion. Kiểm tra actual/planned timestamps/caption, minute arithmetic, absence time là ghi nhận chứ không pickup arrival. Soát replacement node/icon center, marker overlap, summary accessible tags, stale/identity/cache/isCurrent, không publisher hoặc fake production data. Callback/permissions V2 phải giữ nguyên.

## 12. Suggested Next Step
Nghiệm thu các mốc và tag trên Expo Go iPhone bằng chuyến/điểm danh hợp lệ do PO chuẩn bị.

## 13. Approval Status
Triển khai phần đủ dữ liệu theo chỉ thị trực tiếp PO; kết quả WAITING FOR USER REVIEW / APPROVAL. Không tự đánh dấu PO nghiệm thu. Chưa commit/push.
