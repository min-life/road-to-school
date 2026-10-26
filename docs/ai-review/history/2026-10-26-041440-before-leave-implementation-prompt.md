# AI Review — Chốt báo nghỉ chỉ áp dụng Trip thật

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope: Documentation / Business Design. Mode: PLANNING ONLY. Status: UPDATED_PLAN / WAITING_FOR_REVIEW. Không implementation.

## 2. Original Request
PO xác nhận: chặn lịch Dự kiến chưa sinh Trip; vẫn cho báo nghỉ Trip thật chưa bắt đầu. Giữ quyết định chiều về không cho báo nghỉ khi giáo viên đã Ready và yêu cầu chưa soạn prompt triển khai.

## 3. Approved Scope
Chỉ cập nhật thiết kế. Quyết định mới thay thế phạm vi từng cho phép lịch chưa sinh Trip. Không sửa source/schema, migrate, cài dependency, gửi OTP, mutate dữ liệu hoặc commit/push.

## 4. Analysis & Decisions
Phân biệt VIRTUAL = Dự kiến, SCHEDULED = Lập lịch. Chỉ Trip thật SCHEDULED mới có cửa sổ báo nghỉ trước Start; vẫn phải kiểm tra quyền, roster/assignment và các guard khác. Không sinh Trip trong options/send/confirm. Chiều về chặn tạo báo nghỉ của mọi đối tượng khi attendantReadyAt khác null; Attendant ở cả hai chiều chỉ được báo trước Ready. Không tự mở rộng guard Ready mới sang hủy báo nghỉ của Parent/Driver.

Đã cập nhật toàn bộ luồng, wireframe draft, DB/API và test plan tại [leave-notice-business-architecture-plan.md](leave-notice-business-architecture-plan.md), bỏ phương án materialize khi confirm OTP.

## 5. Implementation Details
No application code changes. Chỉ cập nhật plan, LATEST.md/LATEST.diff; lưu báo cáo trước tại history/2026-10-26-040734-before-persisted-trip-leave-policy.md và .diff. Bảo vệ toàn bộ staged/modified/untracked work có sẵn.

## 6. Database Changes
None implemented. Đề xuất LeaveNotice.tripId bắt buộc tham chiếu Trip đã tồn tại; không cần mô hình báo nghỉ cho lịch dự kiến hoặc tự tạo Trip/roster. Một bảng mới, OTP purpose và nullable cancellation audit vẫn là đề xuất cần PO duyệt.

## 7. API & Swagger Changes
None implemented. Options chỉ lấy Trip thật đúng quyền/điều kiện. Gửi OTP bắt buộc tripId thật; ngày/chiều derive từ Trip. Send và confirm kiểm tra lại SCHEDULED/Ready/assignment/roster; confirm dưới Trip lock, consume OTP cùng notice/tác động. Không nhận route/date như phương án thay tripId để tự sinh chuyến. Swagger sync thực hiện khi API được duyệt triển khai.

## 8. UI/UX Changes
Chưa sửa UI. Draft giữ tiện ích, lịch sử, form và action trên card; lịch Dự kiến không thể báo nghỉ, có thể ẩn/disable action với lý do “Chuyến chưa được tạo”. Form chỉ chọn Trip thật, không có nút tự sinh Trip. Wireframe cuối cùng vẫn cần PO duyệt.

## 9. Verification & Testing
Đã kiểm tra git status và rà soát tài liệu sau cập nhật; không thay application code. Không chạy tests/typecheck vì chỉ thay docs. Test plan bổ sung reject VIRTUAL/ID tổng hợp, không gọi generation, cho SCHEDULED hợp lệ và race Ready trong lúc nhập OTP. Runtime: NOT_VERIFIED; kiểm chứng có side effects cần phạm vi UAT theo Test Data Policy.

## 10. Issues & Risks
Trip thật nhưng không còn SCHEDULED hoặc đổi quyền/assignment trong khi nhập OTP phải bị từ chối khi confirm. Ready reset sau thay Attendant có thể còn attendance PRESENT; không được ghi đè học sinh đã lên/xuống xe. SMS thật chưa có giao vận production. Đề xuất trạng thái Chờ phân công và quyền Parent khác hủy vẫn chưa được chốt.

## 11. Reviewer Focus
Không còn luồng tạo Trip từ báo nghỉ; FK/OTP bind tripId thật; phân biệt tạo/hủy và guard Ready đúng chiều/đối tượng. Bảo vệ tính nguyên tử OTP/attendance/notice, Start/Ready races và không tự mở rộng phạm vi nghỉ sang toàn ngày/chiều.

## 12. Suggested Next Step
PO duyệt bản thiết kế đã cập nhật, gồm wireframe, DB/API và các lựa chọn còn lại ở mục 12 của plan. Không hỏi lại các quyết định đã chốt.

## 13. Approval Status
Đã chốt phạm vi Trip thật và guard chiều về; WAITING FOR USER REVIEW / APPROVAL cho thiết kế tổng thể. Không có approval implementation. STOP-AFTER-TASK.
