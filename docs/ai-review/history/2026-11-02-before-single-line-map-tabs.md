# AI Review — Trả nút vận hành ra ngoài tab

## 1. Task Information
02/11/2026 Asia/Saigon. IMPLEMENTATION follow-up. Source hoàn tất, native NOT_VERIFIED. Giữ pending Schedule/Home changes; không commit/push.

## 2. Original Request
PO đổi ý: đưa nút vận hành từ tab Thông tin ra ngoài như ban đầu.

## 3. Approved Scope
Di chuyển nguyên cụm hành động Staff về footer ghim đáy, giữ nút vàng hiện tại, quyền/trạng thái/handlers. Parent không thay giao diện.

## 4. Analysis & Decisions
Footer là sibling của bottom sheet, không phụ thuộc tab/isExpanded. Đo toàn bộ chiều cao footer bằng onLayout gồm safe-area padding và border; bottom sheet và joystick dùng offset đo được, không hardcode74px. Khi role/status không có action, offset0 và không render footer.

## 5. Implementation Details
Chỉ mobile/app/trip/[id].tsx: chuyển nội dung showTripAction ra khỏi INFO ScrollView, đặt sau sheet. Thêm bottomActionHeight/offset và fixedBottomActionContainer. Sheet bottom=offset, paddingBottom10 khi footer đã giữ safe area; Parent/no action dùng insets.bottom+10 như cũ. Joystick bottom=sheetHeightAnim+offset+16. Không đổi primaryActionBtn/Text alias Home hoặc content/guards. Task-only diff một source; archive trước history/2026-11-02-before-restore-trip-action-footer.md/.diff và architecture addendum.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None. Không API/DB calls, records hoặc mutations để test.

## 8. UI/UX Changes
Nút bắt đầu/đến trường/hoàn thành và readiness của Staff nằm ở đáy ngoài tabs, vẫn thấy khi thu gọn hoặc đổi tab. Kiểu vàng/disabled hiện tại giữ nguyên. Sheet/joystick nằm trên footer, không chồng vào nút. Role/status không có hành động không tạo khoảng rỗng.

## 9. Verification & Testing
PASS TypeScript --noEmit exit0. PASS4/4 role/status action-availability tests hiện hữu.
PASS AST self-check: toàn bộ action children/conditions/labels và onPress/disabled giống baseline; footer không còn ancestor activeTab INFO/isExpanded; primary style vàng còn nguyên; sheet/joystick và safe-area offset được nối theo footer.
PASS Expo export --platform web gồm web/server bundles exit0, output ngoài repo restored-trip-action-footer-export. PASS git diff --check.
Không tạo fake Trip/User/API data hoặc tests mirror layout. Full native safe-area/onLayout/touch/real Trip transitions NOT_VERIFIED; không coi source/build checks là nghiệm thu thiết bị.

## 10. Issues & Risks
Footer chiếm lại một phần chiều cao bản đồ khi đang có action, theo yêu cầu PO. Cần xem native safe area và nhãn dài/font scale. Không dependency mới hoặc commit/push.

## 11. Reviewer Focus
Footer độc lập tab/disclosure, có measured offset thay hardcoded height. Giữ nguyên guards và yellow shared style; Parent/no action không chừa footer rỗng. Pending Home/Schedule không bị sửa.

## 12. Suggested Next Step
PO reload app và thử thu gọn/đổi tab để nghiệm thu footer trên thiết bị.

## 13. Approval Status
PO yêu cầu trực tiếp thay vị trí trở lại; source/checks hoàn tất, chờ native acceptance.
