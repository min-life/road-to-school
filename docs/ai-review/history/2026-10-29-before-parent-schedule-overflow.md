# AI Review — Thẻ Chuyến xe của con thu gọn/mở rộng

## 1. Task Information
29/10/2026, Asia/Saigon. IMPLEMENTATION Mobile PARENT UI + docs. Hoàn thành local; chưa commit/push. Nghiệm thu native/runtime còn NOT_VERIFIED.

## 2. Original Request
PO yêu cầu avatar, tên học sinh, trường và trạng thái chuyến; trạng thái nằm ngang hàng với tên. Nhấn thẻ để mở rộng các thông tin còn lại, không lược bỏ bất kỳ nội dung V2 đang hiển thị.

## 3. Approved Scope
Bố cục thẻ trong Chuyến xe của con ở Trang chủ PARENT, giữ đủ dữ liệu/action/điều kiện V2. Dùng studentAvatar đã có của API. Không sửa backend/DB/schema/API/env/dependencies hoặc nhánh nhân sự. Giữ các thay đổi local trước task, gồm OTP và bỏ nút Làm mới.

## 4. Analysis & Decisions
Đọc quy tắc, business context, handoffs, review trước và tài liệu Parent Home; kiểm tra git status/source. Trình bày wireframe đúng cấu trúc PO nêu trong commentary trước code, triển khai theo chỉ thị thiết kế cụ thể hiện tại; không có lượt duyệt wireframe riêng.

ParentHomeCardItem đã có studentAvatar và backend trả student.avatarUrl nên không cần API mới. Component riêng giữ state expanded thay vì hook trong map. Key studentId:tripId giữ state cho cùng thẻ khi polling/rerender, reset tự nhiên khi đổi chuyến. Chỉ header toggle để CTA trong panel không làm thẻ đóng.

Tra cứu ui-ux-pro-max không có match xác thực phù hợp cho expanded semantics sau một lần thu hẹp query; không dùng kết quả Navigation/Deep Linking ngoài phạm vi. Dùng cách triển khai Pressable/accessibility tiêu chuẩn và kiểm tra trên runtime hiện có.

## 5. Implementation Details
- [ParentTripCard](../../mobile/components/parent/trip-card.tsx) mới: tóm tắt, ảnh UserAvatar48, tên/status chung row, trường/chevron, panel children, state mở độc lập, role/hint/expanded và aria-expanded.
- [HomeScreen](../../mobile/app/(tabs)/index.tsx): truyền studentName/studentAvatar/schoolName/status, dùng key studentId:tripId và giữ nguyên toàn bộ subtree chi tiết/action V2 làm children.
- [Parent Home UI](../architecture/mobile-parent-home-ui.md): wireframe, field map, props/cách dùng, state, responsive, accessibility, checks/giới hạn.
- Cập nhật UI implementation status, CODEX_HANDOFF, CURRENT_STATE, implementation/source-map. [Diff task](LATEST.diff) gồm hai source và năm docs, so với snapshot đầu task; không gộp thay đổi cũ.
- Báo cáo trước đã lưu [history](history/2026-10-29-before-parent-trip-disclosure.md).

## 6. Database Changes
Không có. Không truy vấn/ghi database, seed, tạo records hoặc fixtures nghiệp vụ. Không thực hiện SQL/bootstrap của các task trước.

## 7. API & Swagger Changes
Không có. API client/contract không đổi; status mapping, fetch, polling8000ms, identity/stale-response guards và quick-leave/router callbacks giữ nguyên. Không cần thay Swagger. Nhấn mở/đóng chỉ cập nhật state UI.

## 8. UI/UX Changes
Mặc định thu gọn. Avatar lấy studentAvatar, thiếu/lỗi dùng fallback chữ đầu của UserAvatar. Tên/status cùng hàng; trường bên dưới, không ellipsis. Panel giữ đầy đủ chiều/tuyến, giờ/ngày, điểm danh/đã xuống xe an toàn, giờ đánh dấu, lý do vắng, biển số/tài xế, Theo dõi lộ trình và Báo nghỉ theo canReportLeave/isRequesting.

Tái sử dụng màu/font/card/CTA V1 đã áp dụng tại V2, cột nội dung560px. Header padding16, avatar48, status tối đa48% identity, tên flex/minWidth0, text wrap. Chiều cao tự nhiên; header là vùng bấm riêng, không bao các nút hành động. Panel đóng không mount nên không còn nút ẩn nhận focus. Giữ shell safe area/cuộn và tiện ích Báo nghỉ/Đổi điểm, không thêm keyboard offset/thư viện/animation.

## 9. Verification & Testing
- PASS `npx --no-install tsc --noEmit` tại mobile, exit0 sau khi xóa preview tạm.
- PASS `npx --no-install expo export --platform all`: iOS, Android, Web/server, exit0; artifacts ngoài repo. Chỉ có warning NO_COLOR/FORCE_COLOR, không lỗi build. Mobile không có lint script; không cài CLI.
- PASS so sánh snapshot: toàn bộ subtree chi tiết identical sau chuẩn hóa CRLF/LF; AST tất cả state/effects/fetch/polling/helper trong HomeScreen không đổi; nhánh nhân sự không đổi.
- PASS parentHomeStyles, API client, UserAvatar, ParentHomeScrollView byte-identical. Mapping tên/trường/trạng thái vẫn từ card và helper cũ; avatar dùng field sẵn có.
- PASS Chromium IAB component preview với nhãn UI tĩnh, không DTO/auth/API/business records: panel ban đầu không mount, click mở/đóng, hai thẻ độc lập, inner action không collapse, parent rerender giữ state, Enter/Space, aria-expanded false/true.
- PASS nhãn dài ở320×568,390×844,1440×900: không tràn ngang; tên/status cùng y132 trong preview, cách nhau8px; trường xuống dòng đầy đủ bên dưới. Không dùng placeholder để chứng nhận dữ liệu/nghiệp vụ thật.
- PASS kiểm tra diff/whitespace và liên kết tài liệu. Script preview đã xóa, tab/server tạm đã đóng, viewport đã reset.
- NOT_VERIFIED: phiên PARENT và card dữ liệu thật, polling theo thời gian, các điều kiện attendance/busy/leave qua backend, ảnh học sinh thật, điều hướng/OTP. Không fake API hoặc gọi mutation/tạo dữ liệu thay thế để kiểm chứng.
- NOT_VERIFIED: Expo Go iPhone/Android, Safari iOS/Chrome Android, VoiceOver/Dynamic Type thật; không có thiết bị/phiên tương ứng kết nối. Expo export không thay native UAT.

## 10. Issues & Risks
Đã phát hiện React Native Web không công bố expanded khi chỉ dùng accessibilityState trong preview; bổ sung aria-expanded và xác minh lại được false/true/Expand/Collapse. Không còn lỗi typecheck/export được ghi nhận. Kiểm tra source bảo toàn field/handler không thay cho kiểm thử tích hợp bằng dữ liệu thật. Card có chuyến mới sẽ thu gọn vì key thay đổi, theo contract trình bày đã mô tả.

## 11. Reviewer Focus
Kiểm tra [field map và component contract](../architecture/mobile-parent-home-ui.md), photo binding studentAvatar, status cùng hàng với tên, cả hai CTA trong panel, điều kiện giờ đánh dấu/lý do vắng/đã xuống xe/busy và key theo student/trip. So sánh subtree chi tiết trong diff; không có field/action cũ bị xóa. Các DTO fields trước đây không render không được tự suy diễn thành nghiệp vụ mới.

## 12. Suggested Next Step
PO nghiệm thu Trang chủ trên Expo Go iPhone bằng các thẻ hiện có: mở/đóng, nhiều học sinh, trạng thái tự cập nhật và cuộn tới nút cuối panel.

## 13. Approval Status
IMPLEMENTED — WAITING FOR USER REVIEW. Chưa commit/push; dừng sau task và chờ phản hồi PO.
