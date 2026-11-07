# AI Review — Giữ icon bus chiều về khi chưa điểm danh (TH2)

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Fix / Implementation. Status: COMPLETED for TH2.

## 2. Original Request
Xử lý chiều về đang di chuyển nhưng chưa điểm danh để bus không biến mất, giữ tag Chưa điểm danh. PO yêu cầu chưa xử lý TH4 đến điểm trả nhưng chưa xuống xe.

## 3. Approved Scope
PO trực tiếp yêu cầu fix TH2 sau audit. Chỉ frontend mapping/pure regression/spec; TH4 giữ nguyên, không thêm event/backend/API/DB/GPS/dependency, không commit/push. Đây là chỉnh điều kiện render nhỏ trong sơ đồ hiện có, không màn hình mới hoặc refactor bố cục. Đã nêu phương án fallback mốc trường trước khi sửa; không có vòng duyệt wireframe mới.

## 4. Analysis & Decisions
Bug do IN_PROGRESS+TO_PARKING+UNMARKED trả position=null và diagram render bus chỉ khi position!==null. Đổi thành0: icon vẫn nằm trên rail tại mốc đầu, đường xám, không minh họa con đang trên xe khi chưa được xác nhận. Đây là vị trí dự phòng khi thiếu thông tin, không khẳng định xe thực tế đang ở trường; global tag vẫn Đang di chuyển, own tag Chưa điểm danh/amber giữ nguyên. Không có bubble đếm phút ở0. Khi PRESENT dùng2/3 như cũ, khi đã xuống dùng1; không sửa TH4 hoặc xác nhận con đã lên/xuống từ trạng thái chuyến. Trường hợp UNMARKED nhưng cờ down/schoolArrived bất nhất cũng không tự suy ra confirmed return arrival.

## 5. Implementation Details
Sửa3 files:
- mobile/utils/parent-journey-stage.ts: TO_PARKING sau guard CANCELLED/ABSENT/confirmed alighting/SCHEDULED/COMPLETED dùng PRESENT?2/3:0, thêm comment ý nghĩa fallback.
- mobile/scripts/parent-journey-stage.test.ts: thêm1 regression test primitive, kiểm tra bus visible0, tag Chưa điểm danh/warning, guard ABSENT/CANCELLED/COMPLETED và inconsistent flags.
- docs/architecture/mobile-parent-student-journey.md: mapping TH2 hiện hành, ý nghĩa mốc0/fallback, transitions và TH4 deferred theo PO.
Cập nhật LATEST.md/LATEST.diff chỉ3 files so với task baseline; lưu review trước tại history/2026-10-30-before-return-unmarked-bus-fix.md/.diff. Giữ các pending changes khác.

## 6. Database Changes
None. Không truy cập/ghi DB, seed, tạo records, fixture nghiệp vụ hoặc fake API response.

## 7. API & Swagger Changes
None. Backend và API clients giữ nguyên; Swagger N/A. Không thay enum/domain hoặc cơ chế xác thực, quyền, OTP.

## 8. UI/UX Changes
Bus không biến mất ở TH2, tại đầu rail thay icon trường theo cơ chế node replacement sẵn có. Header tag Chưa điểm danh vẫn vàng/alert, trạng thái chuyến độc lập. Không thêm câu chữ hoặc thay layout, safe area, keyboard, animation/reduced motion. TH1/TH3 và TH4 hiện hành giữ nguyên. Chưa xác nhận xe đã đến điểm trả khi chỉ dựa lịch.

## 9. Verification & Testing
PASS: mobile npx --no-install tsc --noEmit exit0.
PASS:25 node:test/5 suites (14 geometry/clock/label tests trước và11 stage/time tests gồm1 regression mới), exit0. Chạy bằng TypeScript dependency đã có, transpile import graph sang TEMP CommonJS, node --test; không business DTO/records/mock responses/DB.
PASS: so sánh trước/sau bằng đúng2 hàm stage/badge trích TypeScript AST,192 tổ hợp enums/booleans. Chỉ8 tổ hợp IN_PROGRESS+TO_PARKING+UNMARKED (các flags) đổi null->0; toàn bộ badge mappings và các trường hợp khác không đổi. Bao gồm TH4 PRESENT/chưa xuống vẫn2/3 và label Đã điểm danh.
PASS: SHA2566 files bảo vệ giữ nguyên so với baseline: Home index, student-journey presenter, trip-card, parent-journey utils, API client và14-test source cũ. Không đổi actions/permissions/TH4/API.
PASS: source diagram điều kiện bus stagePosition!==null nên giá trị0 vẫn render; node start thay bởi bus theo onStart===0. Kiểm tra task diff/whitespace bằng git diff --check.
NOT_VERIFIED: native Expo Go iPhone/Android và API event runtime thực. Không chạy lại export vì chỉ thay pure mapping, không đổi component/import/dependencies; Mobile không có script/config lint riêng, không cài mới. Không tự tạo dữ liệu để UAT.

## 10. Issues & Risks
Mốc trường0 là fallback trình bày, không GPS hoặc xác nhận xe chưa chạy. TH4 vẫn thiếu event arrival điểm trả và chưa xử lý theo chỉ thị PO. Home vẫn có filter thời gian/priority/completed như trước; fix không giúp card đã bị API bỏ xuất hiện lại. Backend start chiều về bình thường chặn UNMARKED; frontend vẫn chịu được dữ liệu thiếu/xuất hiện từ sửa local hoặc lệch polling mà không giả lập attendance.

## 11. Reviewer Focus
Chỉ TH2 đổi; không sửa badge/domain, không dùng alighted=true thiếu PRESENT để xác nhận con xuống. Giá trị0 được diagram render chứ không bị falsy guard. Không tạo ETA, GPS hoặc trường hợp arrival mới cho TH4.

## 12. Suggested Next Step
Kiểm tra TH2 trên Expo Go iPhone với chuyến local đang chạy và con còn Chưa điểm danh.

## 13. Approval Status
Triển khai TH2 theo chỉ thị PO. TH4 DEFERRED BY PO, không tự xử lý. WAITING FOR USER REVIEW / APPROVAL đối với kết quả. Chưa commit/push.
