# AI Review — Đổi điểm đón/trả: chưa có học sinh liên kết

## 1. Task Information
28/10/2026, Asia/Saigon. Mobile UI/Documentation. IMPLEMENTATION. COMPLETED local; chờ nghiệm thu thiết bị. Chưa commit/push.

## 2. Original Request
Áp dụng tương tự trạng thái chưa có học sinh của Theo dõi cho Đổi điểm đón/trả khi chưa có học sinh liên kết; kế thừa phong cách V1 và giữ nghiệp vụ V2.

## 3. Approved Scope
Chỉ nhánh empty của màn Đổi điểm, khả năng dùng chung component trình bày và docs. Tái sử dụng mẫu/ảnh đã triển khai theo yêu cầu tương tự của PO. Không thay source V1/backend/API/DB/schema/OTP, không seed/dependency/Git writes; giữ pending work trước task.

## 4. Analysis & Decisions
Đọc AGENTS/WORKING_RULES/BUSINESS_CONTEXT/handoffs/LATEST/tài liệu UI và code hiện có; đối chiếu EmptyState V1. Dùng lại TrackingEmptyState để tránh hai bản UI bị lệch. Thêm props copy tùy chọn, không chuyển quyền sở hữu data/router vào component. Đổi điểm giữ title cũ và không có mô tả; Theo dõi giữ copy mặc định. Bố cục được trình bày trước code; PO đã yêu cầu dùng tương tự mẫu ngay trước đó, không đổi cấu trúc/luồng mới.

## 5. Implementation Details
- [change-stop.tsx](../../mobile/app/parent/change-stop.tsx): thêm import và thay duy nhất ListEmptyComponent bằng thẻ dùng chung; giữ onLink router.push cũ.
- [tracking-empty-state.tsx](../../mobile/components/parent/tracking-empty-state.tsx): thêm title/description tùy chọn; description null không render mô tả, CTA thêm marginTop20; mặc định giữ nguyên giao diện Theo dõi.
- [UI status](../architecture/mobile-ui-implementation-status.md): contract props, tích hợp, responsive, actions/checks/limits; cập nhật CURRENT_STATE và CODEX_HANDOFF.
- Review/diff trước lưu history/2026-10-28-before-change-stop-empty-ui.md và .diff. LATEST.diff so với snapshot hai file đầu task, không gom các thay đổi trước task dù change-stop/shared component đang untracked.

## 6. Database Changes
None. Không truy cập/thay đổi DB hoặc tạo records để kiểm tra.

## 7. API & Swagger Changes
None. GET linked students, retry, back, link route, guard AVAILABLE và route address-request không đổi; không thêm endpoint/payload/permission.

## 8. UI/UX Changes
Ảnh gốc V1 đã có, card trắng bo20/viền nhẹ, title20/27 và nút vàng dạng viên thuốc min48 như Theo dõi. Đổi điểm giữ Chưa có học sinh liên kết và Liên kết học sinh; không thêm mô tả/FAB/refresh. FlatList giữ cuộn, maxWidth560/padding16 và bottom padding24 + inset; AppHeader/back và safe area không đổi. Không có input/keyboard mới. Loading/error/retry và các thẻ có học sinh không đổi.

## 9. Verification & Testing
PASS npx --no-install tsc --noEmit (mobile), npx --no-install expo export --platform all (iOS/Android/Web/server). Không có lint script trong mobile/package.json; không cài lint tooling mới.

PASS đối chiếu AST/source: chỉ import/ListEmptyComponent của change-stop thay đổi; toàn bộ source còn lại và các API/router/setAttempt calls giữ nguyên. PASS git diff --check theo repository settings và kiểm tra whitespace cho task diff.

Chromium IAB isolated preview dùng component/AppHeader thật với FlatList trình bày, không auth/API responses: 320x568, 390x844, 1440x900 không tràn ngang, title đầy đủ, ảnh natural560x560, CTA cao48px. Callback Liên kết/Quay lại đếm cục bộ2, không đổi route thật/dữ liệu. Component mặc định Theo dõi ở320px vẫn có title/mô tả/CTA như trước. Entry/server/tab/viewport override tạm đã dọn.

NOT_VERIFIED iPhone Expo Go/Android, Safari iOS/Chrome Android, Dynamic Type/VoiceOver, native scroll/safe area và auth navigation/liên kết thật. Luồng có dữ liệu cần tài khoản PARENT với học sinh liên kết hợp lệ (AVAILABLE để chọn); không tạo fixture/records hoặc gọi mutation: BLOCKED_BY_TEST_DATA_POLICY nếu cần tạo dữ liệu mới.

## 10. Issues & Risks
Không có lỗi build/typecheck được phát hiện. Preview không chứng nhận native rendering, router/auth integration hoặc quy trình liên kết/đổi điểm thực tế. Hai màn tiếp tục sở hữu điều kiện hiển thị riêng; shared component chỉ là presentation.

## 11. Reviewer Focus
Chỉ empty sau loading/error dùng thẻ mới; title và nút liên kết giữ nguyên. description null phải không tạo mô tả ở Đổi điểm; defaults giữ Theo dõi. Kiểm tra thẻ/danh sách khi có học sinh, disabled guard, safe-area padding và route callbacks không bị thay đổi. Không lẫn các pending changes cũ vào task này.

## 12. Suggested Next Step
PO mở Đổi điểm đón/trả trên iPhone bằng tài khoản chưa có học sinh liên kết để nghiệm thu.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL. Đã triển khai local theo yêu cầu tương tự mẫu trước; chưa commit/push. Dừng sau task.
