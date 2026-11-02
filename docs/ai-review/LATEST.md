# AI Review — Nút vàng dùng chung với Home

## 1. Task Information
02/11/2026 Asia/Saigon. IMPLEMENTATION. Source hoàn tất; native NOT_VERIFIED. Bảo toàn pending work, không commit/push.

## 2. Original Request
PO không muốn nút khác màu vàng; yêu cầu dùng chung kiểu/màu nút Home, ảnh đối chiếu nút Hoàn thành và Xem chi tiết & Vận hành.

## 3. Approved Scope
Nút thao tác Staff trong Trip và modal liên quan: vận hành, điểm danh, QR, báo/xác nhận sự cố và nút phụ. Giữ Parent/Home reference, quyền/disabled/handlers.

## 4. Analysis & Decisions
Reuse parentHomeStyles.primaryBtn/Text cho nút vận hành, kế thừa cho confirm/report/QR. Nút phụ dùng secondaryBtn/Text vàng nhạt. Nút gọn giữ layout nhỏ với palette vàng và chữ tối, radius24. Không thiết kế lại badge/trạng thái/thanh tiến độ.

## 5. Implementation Details
Chỉ mobile/app/trip/[id].tsx: import shared Home styles; primaryActionBtn/Text trỏ trực tiếp tới Home. Bỏ bgReady/bgStart/bgArrive/bgComplete và metadata confirmBg/inline overrides. Đồng bộ modal/QR/attendance/report/giải trình; icon/text/spinner tối trên vàng. Retry lỗi chỉ override Staff để giữ Parent. Không sửa shared Home hoặc StaffTripCard. Review/diff task-only, archive trước tại history/2026-11-02-before-yellow-trip-buttons.md/.diff và architecture addendum.

## 6. Database Changes
None. Không dữ liệu giả, seed hoặc mutation.

## 7. API & Swagger Changes
None. Không đổi API, engine, quyền hoặc gọi API test.

## 8. UI/UX Changes
Nút chính vàng#FFCB56, chữ/icon tối, bo tròn như Home; nút phụ vàng nhạt. Disabled giữ opacity0.5 và cùng điều kiện. Badges/progress/camera overlay giữ màu ngữ nghĩa hiện có. Parent reference không đổi.

## 9. Verification & Testing
PASS TypeScript app --noEmit exit0 trên source cuối.
PASS AST parity: tất cả onPress/disabled expressions giữ nguyên; toàn bộ handle* initializers giống baseline sau chỉ loại property confirmBg. Callback/mutation nghiệp vụ không đổi.
PASS đánh giá chính StyleSheet source với palette/Home styles thật và StyleSheet identity stub: primaryActionBtn/Text cùng object với Home, background#FFCB56/radius24; các action/report/modal/QR primary dùng colors.primary, secondary dùng navigationHighlight; disabled opacity0.5.
PASS git diff --check. Không thêm test mirror style, không chạy lại navigation tests/export vì chỉ đổi trình bày; không lấy checks task trước làm kết quả mới. Không tạo business fixtures/API responses. Browser/native/font-scale/modal visual acceptance NOT_VERIFIED.

## 10. Issues & Risks
Một số nút modal mới dùng minHeight48/padding như Home nên cần xem màn hẹp/chữ lớn. Không dependencies mới hoặc commit/push.

## 11. Reviewer Focus
Nút INFO thực sự reuse shared style; không còn operation color overrides. Chữ/icon/spinner tương phản với vàng. Giữ nguyên quyền, disabled và callbacks.

## 12. Suggested Next Step
PO reload app và nghiệm thu nút hoàn thành cùng popup xác nhận trên thiết bị.

## 13. Approval Status
PO yêu cầu trực tiếp; source hoàn tất và checks an toàn PASS, chờ native acceptance.
