# AI Review — Thanh hành trình Trang chủ theo nghiệp vụ đi/về

## 1. Task Information
Task: Sửa rail Parent Home theo luồng đi/về PO chốt. Date:01/11/2026, Asia/Saigon. Branch: dongnnp/mobile/refactor-ui. Scope: Mobile / Documentation. Implementation: COMPLETED frontend mapping; lịch sử COMPLETED còn giới hạn API, native/auth acceptance NOT_VERIFIED. Local, chưa commit/push.

## 2. Original Request
Chiều đi: chờ → giáo viên sẵn sàng → chạy → điểm danh lên → đến trường → điểm danh xuống → kết thúc. Chiều về: chờ → giáo viên sẵn sàng → điểm danh trước start → chạy → xuống riêng từng học sinh → kết thúc. Bổ sung thiếu, bỏ phần không cần của thanh hành trình Home, không đổi nghiệp vụ backend.

## 3. Approved Scope
Triển khai theo yêu cầu trực tiếp PO và luồng mới nhất, kế thừa các yêu cầu giữ API/actions/permissions và dữ liệu V2. Đã trình bày bố cục/mapping trước code trong commentary; không có lượt duyệt wireframe riêng hay nghiệm thu thiết bị. Chỉ frontend/types/docs; không backend/schema/migration/DB/dependency/Git writes. Không tự tạo dữ liệu test, gọi API mutation hoặc giả business/API DTO để test.

## 4. Analysis & Decisions

Đối chiếu bổ sung01/11/2026 theo câu hỏi PO “Mô tả chi tiết UI sẽ thay đổi như thế nào ở từng TH”: chế độ DISCUSSION, đọc lại source helper/card/time/rail và tokens. Mô tả13bước đi/về gồm tag chuyến, tag con, readiness, màu viền/header, bus/đường vàng, clocks và ngoại lệ. Không chỉnh application code, backend hoặc dữ liệu; không chạy lại tests/build vì implementation không đổi. LATEST.diff vẫn là diff triển khai của task ngay trước, không có code changes trong lượt giải thích này.
Source TripStatus chỉ SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED; attendance UNMARKED/PRESENT/ABSENT, ready/school-arrived/alighted là field độc lập. Backend TO_PARKING boarding trước start, TO_SCHOOL boarding sau start; arrival-school và từng con xuống độc lập. PARENT operational trả actualStartTime/actualEndTime/school-arrival/children nhưng omits readiness; GET mobile detail đã trả isAttendantReady/attendantReadyAt và Swagger đã mô tả. Home service chỉ chọn SCHEDULED/IN_PROGRESS theo roster/time window; COMPLETED có thể đến qua telemetry nhưng card bị bỏ sau Home refresh8s. Giữ nguồn chọn chuyến, không tự giữ lịch sử. Không có event xe đến/rời pickup hoặc live ETA; bỏ timer1600ms và bubble đếm phút theo lịch, không tạo trạng thái mới.

## 5. Implementation Details
- mobile/utils/parent-journey-stage.ts: readiness/trip labels, per-child badge/status, stage mapping hai chiều, completed riêng với alighting. SCHEDULED return PRESENT = Đã điểm danh lên; IN_PROGRESS return PRESENT chưa xuống = Chưa xuống xe; UNMARKED return giữ bus ở0.
- mobile/utils/parent-journey.ts: journeyEventTime và studentJourneyTimes tách departure/child pickup-arrival/route completion; confirmed thiếu actual không dùng planned làm actual. child drop-off không dùng parking end.
- mobile/components/parent/student-journey.tsx: ba mốc cả hai chiều; chiều về midpoint trả con/end bãi, clocks tương ứng; outbound completion footer actualEndTime; bỏ boarding timer và countdown UI; giữ variance/incidents/error/reduced-motion.
- mobile/components/parent/trip-card.tsx: optional readiness chip và accessibility label, không đổi expand/collapse/actions/tone theo con.
- mobile/app/(tabs)/index.tsx: ghép operation/child/id/direction, chọn readiness từ detail khi operation projection thiếu, truyền labels/readiness. Body/actions/nhánh staff giữ nguyên.
- mobile/hooks/use-parent-journey-telemetry.ts: detail5s khi SCHEDULED để đọc readiness,20s khi chạy; existing dedup/5s operation/incidents/focus/active/scope/permission guards giữ nguyên.
- mobile/services/api-client.ts: chỉ optional MobileTripDetail fields isAttendantReady/attendantReadyAt đã tồn tại trên server; runtime client không đổi.
- mobile/scripts/parent-journey-stage.test.ts: bảng bước nghiệp vụ và ngoại lệ,96 tổ hợp scalar, readiness và actual/planned/missing clocks; không business fixtures.
- Docs: thay spec mobile-parent-student-journey.md, cập nhật mobile-parent-home-ui.md, mobile-ui-implementation-status.md, CODEX_HANDOFF.md, CURRENT_STATE.md. Mô tả30/10 được đánh dấu lịch sử/thay thế.
- Review trước lưu history/2026-11-01-before-parent-home-workflow.md/.diff. LATEST.diff chỉ13files so với baseline đầu task trong TEMP, không gom pending schedule/timeline/FAB/OTP/search/env.

## 6. Database Changes
None. Không sửa record, tạo User/Student/Trip, seed hoặc mutation để test. Preview chỉ đọc identity snapshot đã có từ task trước, không sửa dữ liệu hoặc tạo API result giả. Không thay schema/migrations hay backend service. Các kiểm thử DB event transitions cần dữ liệu/truy cập được PO cấp: NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY.

## 7. API & Swagger Changes
Không endpoint/payload/contract/Swagger changes. Existing GET /trips/mobile/:id trả readiness (backend getTripDetail và dto trip-response đã có); bổ sung khai báo optional frontend để đọc được. Existing GET operational/incidents giữ nguyên. Chỉ đổi tần suất detail khi chờ sang5s trên cùng loop/dedup hiện có; không thêm timer/request GPS publisher. API runtime source được kiểm tra byte-equivalent sau bỏ đúng hai declarations/comment mới.

## 8. UI/UX Changes
Chiều đi: origin0 → đi đón1/3 → sau boarding5/6 → trường1 khi đến → giữ1 sau xuống/kết thúc. Chiều về: trường0 cả chờ/ready/đãboarding → di chuyển1/3 → con xuống0.5 tại nhà → kết thúc1 tại bãi. Readiness chỉ khi chờ, missing=Chưa cập nhật GV; không false-positive. Chưa/đã điểm danh lên vàng/xanh dương, chưa xuống tím/đã xuống xanh lá; viền/nền header cùng tone của con. Cancelled/ABSENT không bus, return UNMARKED đang chạy fallback0. Trip complete không tự xác nhận boarding/down. Bus trên rail thay node, giữ fade180/reduced motion; bỏ1600ms giả chuyển bước và scheduled countdown bubble. Giờ planned/actual gắn đúng mốc; thiếu actual để trống+Lịch, không ETA giả. Giữ tên tuyến/ngày/attendance clocks/reasons/vehicle/driver/tracking/leave navigation và guards.

## 9. Verification & Testing
PASS: Mobile npx --no-install tsc --noEmit exit0 sau app edits cuối.
PASS: Expo export --platform all; final log kết thúc Exported tại TEMP/rts-parent-workflow-final-export-238608854053415c89eba566768390d6 (web/iOS/Android JS bundles; không native runtime). First export cùng task cũng exit0.
PASS:31tests/7suites trong parent-journey-stage.test.ts + parent-journey.test.ts, gồm96 tổ hợp enum/boolean,7bước đi/6bước về/readiness/confirmed clocks. Runner TEMP dùng TypeScript đã cài để resolve extensionless imports; không install tool hoặc fake business records.
PASS source parity: ParentTripCard JSX children/actions giống baseline; ngoài parentCards.map và helper import, toàn Home giống baseline; runtime API client giống baseline sau loại đúng declarations mới.11protected hashes (backend/schema/schedule/prior timeline/pickers/OTP/FAB/package/lock/env) giữ nguyên. Scoped git diff --check đạt; chỉ warning Git LF/CRLF, không whitespace errors.
PASS Chromium IAB presentation preview từ header/rail JSX/styles thực và helpers scalar:13bước tại320×568,390×844; desktop1440×900. Không overflow ngang, bus hiện đủ7/6bước; vị trí DOM390 lần lượt đi0/0/1⁄3/5⁄6/1/1/1, về0/0/0/1⁄3/0.5/1. Identity lấy snapshot read-only đã có, clocks để trống, không mount auth/API hook hoặc DTO fixtures. SSR width/reduced-motion adapter chỉ phục vụ preview, không thay runtime. Screenshot TEMP/rts-parent-workflow-preview.png, minh họa child drop-off giữa rail trong khi chuyến còn chạy. Tab closed, viewport reset, riêng preview server51614 dừng; Metro8081 của PO giữ nguyên.
NOT_VERIFIED: native Expo iPhone/Android, Safari iOS/Chrome Android, VoiceOver/largest font scale, tương tác expand/navigate/authenticated refresh/races/readiness transitions và end-to-end nghiệp vụ DB. Source review/static export/SSR preview không chứng nhận các mục này. Mobile không có lint script; không cài package/linter mới.

## 10. Issues & Risks
COMPLETED bị Home API lọc khỏi danh sách sau refresh; frontend mapping đúng không bảo đảm card kết thúc tồn tại lâu/reload. Cần phạm vi nguồn dữ liệu/chọn lịch sử riêng nếu PO muốn luôn hiển thị. Readiness có tối đa độ trễ polling/detail GET; thiếu/lỗi hiển thị unknown thay vì suy đoán. Không có pickup-arrival event/live ETA nên rail theo trạng thái, không GPS thực. Manual DB inconsistent vẫn giữ tag con riêng (UNMARKED hoặc Chưa xuống xe), dù route complete. Return down bus ở điểm trả cho biết mốc của con, không khẳng định GPS hiện tại khi bus tiếp tục đi trả con khác. Các thay đổi local trước task được bảo toàn.

## 11. Reviewer Focus
Đối chiếu7bước đi/6bước về và childId isolation; scheduled return PRESENT phải xanh Đã điểm danh lên, chưa purple trước start. Kiểm tra return con xuống ở midpoint và route finish tại bãi, actualEndTime khác childAlightedAt. Verify readiness từ detail, unknown/error/permission handling, detail5s waiting/20s running, completed filter limitation. Không mất leave/tracking actions hoặc nhánh staff; không dùng timer hoặc scheduled clock suy ra boarding/ETA/actual time.

## 12. Suggested Next Step
Kiểm tra trên Expo Go iPhone với các chuyến hiện có, đối chiếu từng bước đi/về và vị trí bus theo bảng trong spec.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp PO; WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push. Không tự mở rộng API, tạo dữ liệu test hoặc khẳng định nghiệm thu native/auth.
