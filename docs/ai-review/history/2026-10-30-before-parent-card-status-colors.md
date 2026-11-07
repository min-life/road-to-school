# AI Review — Đồng bộ tag xuống xe chiều về

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: Implementation. Status: COMPLETED for return alighting tags and full behavior inventory.

## 2. Original Request
Implement tag chưa xuống xe/đã xuống xe chiều về giống chiều đi, sau đó liệt kê tất cả các trường hợp chiều về: tag và vị trí icon bus.

## 3. Approved Scope
PO mới nhất cho phép mở lại phần tag chiều về. Chỉ sửa frontend mapping và truyền direction từ card, tái sử dụng chữ/icon/tone hiện có; giữ vị trí bus và TH2 fallback, không tự thêm event xe đến điểm trả, API/backend/schema/DB/GPS/dependency hoặc commit/push. Đây là đồng bộ tag trong bố cục đã có, không màn hình/refactor bố cục mới, không cần wireframe mới; đã nêu cách hiển thị trước sửa.

## 4. Analysis & Decisions
studentJourneyBadge thêm direction? ở tham số5, optional để giữ backward compatibility. Sau nhánh ABSENT/UNMARKED/alighted, schoolArrived hoặc TO_PARKING dùng Chưa xuống xe/purple/log-out-outline. Với PRESENT đã alighted dùng Đã xuống xe/success/checkmark-circle-outline như chiều đi. Default/TO_SCHOOL không đổi. Header card đã có trình bày semantic màu/icon/chữ nên không thêm component/hex/text lặp. Dùng ui-ux-pro-max, focused ux search status color distinction: kết quả Color Only phù hợp, tái sử dụng cả text/icon/color thay vì chỉ đổi màu.
Chiều về PRESENT + chưa xác nhận xuống dùng tím kể cả chờ xuất phát hoặc đang chạy, vì tag phản ánh alighting, không khẳng định xe đã đến điểm trả. Vị trí bus giữ nguyên, không suy ra arrival độc lập từ isAlighted=false. UI lookup per-child và nguồn dữ liệu API giữ nguyên.
Bảng hiện hành:
| Trường hợp | Tag con | Bus khi card còn được chọn |
| --- | --- | --- |
| SCHEDULED+UNMARKED | Chưa điểm danh, amber | Mốc trường0 |
| SCHEDULED+PRESENT chưa xuống | Chưa xuống xe, tím | Mốc trường0 |
| IN_PROGRESS+UNMARKED (TH2) | Chưa điểm danh, amber | Mốc trường0 dự phòng, vẫn hiện |
| IN_PROGRESS+PRESENT chưa xuống (TH1) | Chưa xuống xe, tím | 2/3 trường->điểm trả |
| Xe đã đến điểm trả nhưng con chưa xuống (TH4) | Chưa xuống xe, tím nếu PRESENT | Vẫn2/3, chưa có event xác định đến điểm trả độc lập |
| PRESENT+đã xác nhận xuống (TH3) | Đã xuống xe, xanh lá | Đích1, bus thay nhà |
| ABSENT+có báo nghỉ | Đã báo nghỉ, đỏ | Không vẽ bus |
| ABSENT+không báo nghỉ | Vắng mặt, đỏ | Không vẽ bus |
| CANCELLED | Tag chuyến Đã hủy; tag con theo dữ liệu | Không bus; Home không lấy card hủy |
| COMPLETED | Tag con theo attendance/alighting nếu card còn tạm | Home không lấy card hoàn thành; helper1 chỉ khi PRESENT+đã xuống, thiếu xác nhận trảnull |
Home vẫn một trip ưu tiên/con và filter scheduled_end_at; card mất khỏi Home khác bus ẩn bên trong. Incident cấp chuyến là tag riêng, không đổi alighting hoặc vị trí.

## 5. Implementation Details
Sửa5 files:
- mobile/utils/parent-journey-stage.ts: badge thêm optional direction, tái sử dụng tag Chưa xuống xe cho TO_PARKING PRESENT chưa xuống. journeyStagePosition không đổi.
- mobile/app/(tabs)/index.tsx: chỉ truyền card.direction vào studentJourneyBadge; không đổi các phần khác.
- mobile/scripts/parent-journey-stage.test.ts: thêm1 test hồi quy so sánh full object tag giữa2chiều; kiểm UNMARKED/ABSENT/chiều đi và vị trí return giữ nguyên.
- docs/architecture/mobile-parent-student-journey.md: mapping đầy đủ chiều về, giới hạn arrival, contract optional direction và verification hiện hành.
- docs/architecture/mobile-parent-home-ui.md: ghi nhận tag chiều về mới và link bảng.
LATEST.md/LATEST.diff cập nhật task-only5files; review trước lưu history/2026-10-30-before-return-alighting-tags.md/.diff. Các pending work khác giữ nguyên.

## 6. Database Changes
None. Không kết nối hoặc ghi DB/seed, không tạo bản ghi nghiệp vụ hoặc API responses giả.

## 7. API & Swagger Changes
None. Không sửa API client/backend/contracts/permissions. Swagger N/A. Chỉ dùng direction, attendance và alighting có sẵn, không domain enum hoặc endpoint mới.

## 8. UI/UX Changes
Header chiều về chưa xuống dùng đúng cùng label/tone/icon của chiều đi đến trường chưa xuống; đã xuống dùng đúng tag xanh như cũ. Tag vẫn thấy khi card thu gọn, cùng accessibilityLabel hiện có. UNMARKED amber và ABSENT đỏ không bị thay thế. Không thêm tag lặp vào body. Bus positions/layout/animation/reduced motion/safe area/keyboard không đổi. TH4 chỉ triển khai nhãn, phần nhận biết xe đến điểm trả độc lập vẫn chưa làm.

## 9. Verification & Testing
PASS: mobile npx --no-install tsc --noEmit exit0.
PASS:26 node:test/5 suites exit0, transpile import graph bằng TypeScript hiện có sang TEMP rồi node --test. Inputs primitive enum/boolean/date/geometry, không business records/DTO fixtures/API mock hoặc DB. Regression so sánh deepEqual text/icon/tone giữa chiều về và chiều đi.
PASS:192 tổ hợp journeyStagePosition trước/sau hoàn toàn giữ nguyên.72 badge combinations trước/sau chỉ2 biến thể TO_PARKING+PRESENT+chưa alighted+chưa schoolArrived (hai cờ notice) đổi Đã điểm danh/info -> Chưa xuống xe/purple; default/chiều đi/UNMARKED/ABSENT/đã xuống giữ nguyên.
PASS: TypeScript AST xác nhận Home gọi đúng5 tham số, thứ5 là card.direction. Source parity Home chỉ khác đúng tham số này. SHA2569 files bảo vệ: presenter/rail, card, palette, time utils, API client, telemetry,14-test source cũ, backend service và Prisma schema giữ nguyên.
PASS: task-only diff5 files, whitespace/git diff --check.
NOT_VERIFIED: native Expo Go iPhone/Android và authenticated event runtime. Không chạy lại export cho thay đổi mapping/argument không thêm import/dependency; export all trước đây chỉ là kết quả task cũ, không coi native runtime đã nghiệm thu. Mobile không có lint script/config riêng, không cài thêm.

## 10. Issues & Risks
Chưa xuống xe là chưa có xác nhận trong hệ thống, không khẳng định vị trí xe hay thực tế con còn trên xe. TH4 không có event arrival điểm trả riêng nên bus vẫn2/3 khi chưa xuống; không tự đặt tại đích. Polling và Home completed/time/priority filters giữ nguyên. PRESENT chờ xuất phát đã lên xe vẫn dùng tag tím theo quy tắc mới; global Chờ khởi hành không đổi. Không đổi hành vi báo nghỉ hoặc theo dõi.

## 11. Reviewer Focus
Kiểm direction lấy từ card hiện tại; thứ tự ABSENT/UNMARKED trước alighted; reuse đúng full tag object. Không dùng isSchoolArrived cho TO_PARKING. journeyStagePosition/TH2 fallback không đổi; không tạo timestamp/arrival từ tag, không sửa API/DB.

## 12. Suggested Next Step
Kiểm tra tag chiều về trên Expo Go iPhone khi con chưa điểm danh, đã lên chưa xuống và đã được xác nhận xuống xe.

## 13. Approval Status
Triển khai theo chỉ thị PO mới nhất cho phần tag chiều về. WAITING FOR USER REVIEW / APPROVAL kết quả; chưa implement arrival event hoặc thay vị trí TH4. Chưa commit/push.
