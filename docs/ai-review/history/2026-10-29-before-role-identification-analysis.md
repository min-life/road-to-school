# AI Review — Chống tràn thẻ Lịch học & Xe đưa đón

## 1. Task Information
29/10/2026, Asia/Saigon. IMPLEMENTATION Mobile PARENT layout fix. Hoàn thành local; chưa commit/push.

## 2. Original Request
PO báo biển số dài có thể đẩy Báo nghỉ và Xem lộ trình khỏi card. Yêu cầu bố cục cân đối, giữ đầy đủ thông tin V2.

## 3. Approved Scope
Chỉ layout của parent/schedule.tsx và docs liên quan. Giữ toàn bộ nội dung, callback, điều kiện, dữ liệu/nghiệp vụ/API và các thay đổi local trước task. Không backend/DB/schema/env/package hoặc lịch nhân sự.

## 4. Analysis & Decisions
Đọc quy tắc, business context, handoffs/review hiện tại và source màn Lịch học & Xe đưa đón. Footer cũ đặt vehicleInfo và actions trên cùng row nhưng text không được co, dẫn tới tràn. Header cũng có nhóm badge cố định một hàng. Đã trình bày cách bố trí trước code: biển số/hãng xe riêng hàng, thao tác hàng dưới; các nhóm tự wrap thay vì giấu nội dung.

Áp dụng ui-ux-pro-max: kết quả Compact Label Overflow phù hợp cho việc để nhóm badge chuyển hàng như một khối khi có thể. Với yêu cầu giữ thông tin của PO, cho phép text wrap khi không đủ chỗ; không dùng ellipsis/tooltip hoặc giả dữ liệu để báo thành công.

## 5. Implementation Details
- [parent/schedule.tsx](../../mobile/app/parent/schedule.tsx): thay hai inline wrapper styles bằng headerBadges/footerActions, chuẩn hóa flexWrap/minWidth/maxWidth/flexShrink; footer cột, vehicle text flex1; CTA canh phải và minHeight48.
- [UI implementation status](../architecture/mobile-ui-implementation-status.md): thêm wireframe, field preservation, style keys, kết quả/giới hạn kiểm chứng.
- [Diff riêng](LATEST.diff) lấy snapshot đầu task, chỉ gồm file màn hình và docs cập nhật hiện tại.
- Báo cáo trước lưu [history](history/2026-10-29-before-parent-schedule-overflow.md).

## 6. Database Changes
Không có. Không đọc/ghi DB, chạy seed/SQL hoặc tạo dữ liệu test.

## 7. API & Swagger Changes
Không có. API client và status helper giữ nguyên. Giữ getParentStudentSchedule, params/date range/identity guard, polling12000ms, handlers và payload/route. Không cần thay Swagger.

## 8. UI/UX Changes
Footer hai hàng: biển số/hãng xe đầy đủ ở trên, Báo nghỉ/Xem lộ trình hoặc Chưa tạo chuyến bên dưới. Nhóm actions tự wrap khi hẹp; header giờ/chiều/trạng thái cũng co giãn và xuống hàng phù hợp. Card tăng chiều cao tự nhiên, không giấu overflow hoặc thêm giới hạn số dòng.

Giữ giờ bắt đầu/kết thúc, chiều, nhãn trạng thái, tuyến, trường, biển số/hãng xe và fallback. Không đổi isVirtual/isClickable, canReportLeave, isRequesting, disabled/spinner, stopPropagation hoặc bất cứ nội dung/nút nào. Chọn tuần/ngày, Hôm nay, loading/error/empty, safe area và refresh không đổi.

## 9. Verification & Testing
- PASS `npx --no-install tsc --noEmit` tại mobile, exit0 sau khi xóa preview tạm.
- PASS `npx --no-install expo export --platform all`, exit0, iOS/Android/Web/server; output trong TEMP ngoài repo. Chỉ warning NO_COLOR/FORCE_COLOR. Mobile không có script lint; không cài thêm CLI.
- PASS đối chiếu toàn bộ source trước StyleSheet với snapshot, sau khi thay ngược đúng hai tham chiếu style wrapper: render, copy, state, effects, điều kiện và callbacks identical sau chuẩn hóa CRLF/LF.
- PASS API client, trip-status-label helper và lịch nhân sự byte-identical.
- PASS Chromium IAB preview16 bố cục:4 kiểu ×240/320/390/1440px; nhãn UI dài có khoảng trắng và liền mạch, hai thao tác, một thao tác, nhãn pending. Đo page không tràn ngang, text không có scrollWidth lớn hơn clientWidth, controls nằm trong card và dưới vehicle text. Tại240px hai thao tác tự sang hàng, vẫn trong card.
- Preview dùng stylesheet thật và nhãn trình bày, không DTO/IDs/business fixtures/API/auth; không kiểm chứng trạng thái nghiệp vụ bằng dữ liệu giả. Script đã xóa, server/tab đóng, viewport reset.
- PASS diff/whitespace và liên kết tài liệu.
- NOT_VERIFIED: Expo Go iPhone/Android, Safari iOS/Chrome Android, font scale/Dynamic Type, phiên PARENT và điều hướng/Báo nghỉ/OTP thực tế. Không tạo records hoặc gọi mutation chỉ để test layout.

## 10. Issues & Risks
Không còn lỗi TypeScript/export ghi nhận. Browser kiểm chứng hình học không thay native UAT hoặc nghiệm thu các trạng thái bằng dữ liệu thật. Nhãn/style/màu nghiệp vụ hiện có được giữ; task không restyle toàn bộ màn hoặc sửa các phần ngoài card.

## 11. Reviewer Focus
Xem footerActions và vehicleText, xác nhận biển số/hãng xe không bị cắt; kiểm tra headerBadges wrap và nút/nhãn đúng các điều kiện cũ. Diff không chứa thay đổi API/logic hoặc các task UI trước. Chỉ bố cục card thay đổi theo chỉ thị sửa cụ thể của PO, không thêm màn hình/wireframe nghiệp vụ mới.

## 12. Suggested Next Step
PO kiểm tra lại thẻ có biển số/hãng xe dài trên Expo Go iPhone, gồm Báo nghỉ và Xem lộ trình.

## 13. Approval Status
IMPLEMENTED — WAITING FOR USER REVIEW. Chưa commit/push; dừng sau task.
