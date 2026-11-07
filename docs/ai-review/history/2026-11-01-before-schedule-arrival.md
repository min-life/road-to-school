# AI Review — Timeline dọc tab Điểm đón

## 1. Task Information
Task: Chuyển danh sách điểm đón trong Theo dõi lộ trình thành timeline dọc. Date:01/11/2026, Asia/Saigon. Scope: Mobile / Documentation. Type: UI implementation. Status: COMPLETED source/static/build/presentation; native/auth acceptance NOT_VERIFIED.

## 2. Original Request
PO: từ Trang chủ → Theo dõi lộ trình → tab Điểm đón, chuyển giao diện thành timeline theo chiều dọc, giữ màu thiết kế và thông tin.

## 3. Approved Scope
Chỉ STOPS presentation và style liên quan trong mobile/app/trip/[id].tsx. Bố cục đã thông báo trước code: rail số thứ tự/đường nối trái, card tên/giờ/địa chỉ/tag phải. Theo yêu cầu layout trực tiếp PO, không mở thêm màn hình/luồng. Tab vốn dùng chung cho các vai trò có quyền xem chuyến, giữ các điều kiện PARENT/myChild. Không thay API/backend/DB/dependency, map/GPS/navigation, các tab/handlers khác hoặc commit/push. Bảo toàn toàn bộ pending work trước task.

## 4. Analysis & Decisions
Danh sách cũ là card rời với vòng số nằm trong card; có tên/time/address và tag riêng con phụ huynh. Giữ mapping visibleStops từ detail/operational children, đưa vòng số ra rail riêng và nối bằng border xám. Không dùng màu rail để bịa vị trí bus/GPS/tiến độ hoặc đảo thứ tự chiều về. Card tăng chiều cao theo text, line stretch theo row. Bỏ truncation tên/địa chỉ, wrap time/tag để giữ thông tin khi cột card hẹp hơn.

## 5. Implementation Details
- mobile/app/trip/[id].tsx: mỗi stop thành stopTimelineRow/rail/orderCircle/card; connector chỉ khi chưa là điểm cuối. Row gap16; rail26/top12, line top42/bottom-24/width2 theo geometry node/gap, không cố định chiều cao card. stopCard flex1/minWidth0 giữ nền/viền/bo/padding.
- Giữ nguyên Text values, plannedArrivalTime condition, parking/school/student classification và JSX tag attendance. Chỉ bỏ numberOfLines1/2 ở tên/địa chỉ, thêm flex wrap/gap/lineHeight, maxWidth time/tag và text co để nội dung dài không bị cắt/tràn.
- docs/architecture/mobile-trip-stop-timeline.md (mới): route/wireframe/styles/mapping/privacy/scroll/cách mở rộng/verification limits.
- docs/architecture/mobile-ui-implementation-status.md: cập nhật trạng thái timeline.
- Archive review trước tại history/2026-11-01-before-trip-stop-timeline.md/.diff. LATEST.diff chỉ3file theo baseline task, không gom pending forms/OTP/FAB/search/env.

## 6. Database Changes
None về writes/schema/migration. Chỉ SELECT read-only4route stops từ chuyến đã có của phụ huynh trong session, cùng school/attendance/alighting cần cho presentation; chỉ lấy bãi/trường/con linked, không lấy PII học sinh khác. psql -X/--no-password, env từ localhost backend, PGOPTIONS default_transaction_read_only=on/statement_timeout8000/connect_timeout3. Không in credentials/URL. Snapshot TEMP/rts-stop-timeline-readonly.json ngoài repo. Không tạo/sửa/delete records, seed hoặc API mutations.

## 7. API & Swagger Changes
None. API client/contracts/privacy masking, visibleStops mapping/operational polling và navigation nguyên vẹn. No new endpoint/GET/POST on production app. SQL snapshot chỉ phục vụ isolated presentation, không làm fake API response cho ứng dụng.

## 8. UI/UX Changes
Timeline dọc: số xanh26/bo13/chữ trắng, line2px border xám, card phải nền F8FAFC/viền E2E8F0/bo12/padding12, tên navy/time xanh/address xám và tag green/red/amber như cũ. Đầu/cuối không thêm label giả; stop.stopOrder và key/id giữ nguyên. Bãi/trường/tên học sinh, giờ, địa chỉ và tag/lý do đầy đủ. Header time có thể wrap, không fixed card height. ScrollView/sheet owner cũ, không thêm input/keyboard/animation hoặc onPress vì row cũ không có action. isParent && stop.isMyChild và PRESENT/isAlighted/ABSENT/reason/default Chưa điểm danh giữ đúng JSX trước task. Empty giữ Không có điểm dừng. Không mất tính năng các tab khác.

## 9. Verification & Testing
PASS: Mobile npx --no-install tsc --noEmit exit0.
PASS: Expo export --platform all exit0, TEMP/rts-stop-timeline-export-26d19226f56a4abcaf472d0291658ac3, log cùng prefix+.log; no application edits sau checks.
PASS AST/source mask comparison: toàn bộ source ngoài STOPS JSX và styles declaration byte-equivalent sau LF normalization. JSX childAttendanceStatusBox giống nguyên văn. Mọi style không nằm trong danh sách stopTimeline*/stopCard/header/name/eta/address/childAttendanceBox/Text giữ nguyên. Không chỉnh business code/API/maps để ép checks.
PASS:11 protected SHA256 giữ API/map snapshot/pin/GPS/avatar/contact/OTP/package/lock/.env.example theo baseline; scoped diff/whitespace, module links và13sections.
PASS presentation-only Chromium IAB actual STOPS subtree/styles dùng readonly fields4stops:4markers/3connectors, cùng cột x28 ở390; line heights66/79/79 theo card heights.320×568/390×844/844×390/1440×900 không overflow ngang. Màn ngang có scroll client320/content372. Giờ, địa chỉ/tên multiline và Chưa điểm danh hiển thị; screenshot TEMP/rts-stop-timeline-preview.png crop390×480 gồm toàn bộ4điểm. Tab đóng, viewport reset, server51614 riêng dừng, không động Metro của PO.
LIMITATION: preview dùng raw SQL fields của route/attendance, không có full auth/API/resolved-route/sheet. Raw stop_order0..3 có thể khác backend getTripDetail đánh lại idx+1; production render vẫn dùng stop.stopOrder API nguyên trạng, không đổi numbering. Không tự tạo hoặc đổi event trạng thái cho preview. Snapshot có default/unmarked, không chứng nhận PRESENT/ABSENT/alighted/long absence runtime; conditional JSX parity là static evidence riêng.
NOT_VERIFIED: native Expo Go iPhone/Android sheet gestures/scroll, VoiceOver/largest Dynamic Type và full authenticated both-direction data flows. BLOCKED_BY_TEST_DATA_POLICY cho các trạng thái/long absence data chưa có phù hợp; không sửa records để test. Không unit tests mirror layout; Mobile không có lint script.

## 10. Issues & Risks
Timeline hiện là schematic stop list, line không biểu diễn phần hành trình hoàn thành. Nội dung dài làm card cao hơn và cần cuộn; rail không hardcode chiều cao card. Cần kiểm tra native sheet/font scale và dữ liệu hiếm. Scope dùng chung STOPS view nên staff cũng thấy cùng timeline nhưng không có thêm tag riêng của phụ huynh hoặc thay quyền. Dữ liệu SQL preview không thay thế contract/runtime authentication test.

## 11. Reviewer Focus
Giữ thứ tự/stopOrder/key và mọi field/condition, không thêm sort/filter hoặc đảo tuyến. Kiểm tra privacy/myChild/attendance/alighting/reason JSX giữ nguyên, không expose học sinh khác. Card/time/tag wrap, connector chỉ n-1 và không dính đuôi cuối; giữ palette. Ngoài STOPS/styles không có edits, map/contact/GPS/operational code và pending work không đổi. Kiểm tra raw snapshot limitation để không nhầm preview với API acceptance.

## 12. Suggested Next Step
Trên Expo Go iPhone, mở Theo dõi lộ trình của chuyến đi/về và kiểm tra tab Điểm đón, gồm cuộn toàn bộ timeline và nội dung dài.

## 13. Approval Status
Implementation theo yêu cầu trực tiếp PO; WAITING FOR USER REVIEW / APPROVAL. Chưa commit/push; không tự cấp quyền tạo test data hoặc chứng nhận native/auth acceptance.
