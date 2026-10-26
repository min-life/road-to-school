# AI Review — Prompt sửa UI/UX Báo nghỉ

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope: Documentation / Source Review. Type: Fix Prompt Handoff. Status: COMPLETED (soạn prompt); chưa thực thi sửa UI.

## 2. Original Request
PO yêu cầu prompt cho Antigravity: đồng bộ bảng Web và dropdown filters; bỏ filter học sinh ở lịch sử Parent; student notice chỉ Đã nhận/Đã hủy; form dùng dropdown học sinh và datepicker; thêm nút Báo nghỉ trong lịch học con; nút trên card mở confirm alert với thông tin gắn sẵn, không đi form.

## 3. Approved Scope
Chuẩn bị prompt sửa Web/Mobile và API/DTO tối thiểu nếu thiếu dữ liệu liên quan trực tiếp. Codex phiên này chỉ đọc source và sửa tài liệu. Không application code, DB/migration, cài dependency, OTP hoặc data mutation.

## 4. Analysis & Decisions
Source xác nhận Parent history dùng student chips và status list chung nhân sự; form dùng student chips và chỉ ba ngày. Lịch dùng chung có nút nhưng mobile/app/parent/schedule.tsx chưa có. Home/lịch chung route sang create form; form hiện mặc định hôm nay/TO_SCHOOL dù nhận tripId, có nguy cơ chọn sai ngày/chiều.

Giữ OTP đã duyệt: card → alert → request OTP → OTP hợp lệ mới tạo notice; Đóng alert không request. Student RECORDED/WITHDRAWN đổi nhãn Đã nhận/Đã hủy, không sửa enum hoặc biến Trip cancellation thành notice withdrawal. Parent history từ utility không filter học sinh, entry Student Detail vẫn scope cố định theo yêu cầu trước. Staff giữ trạng thái riêng.

## 5. Implementation Details
No application code changes. Tạo leave-notice-ui-ux-fix-prompt.md; thêm addendum vào leave-notice-business-architecture-plan.md; cập nhật LATEST.md/LATEST.diff. Archive báo cáo implementation vừa đọc tại history/2026-10-26-052928-before-leave-ui-ux-fix-prompt.md và .diff. Không dùng báo cáo này thay bằng chứng runtime.

## 6. Database Changes
None. Prompt cấm migration/schema/enum changes cho task UI này; giữ state nghiệp vụ hiện có.

## 7. API & Swagger Changes
None implemented. Prompt cho phép tối thiểu DTO/action flags nếu lịch Parent thiếu eligibility theo studentId, yêu cầu Swagger sync khi có sửa API. Dùng API OTP/confirm hiện có; bind tripId/studentId thật và metadata của card, không ngày/chiều mặc định.

## 8. UI/UX Changes
Prompt có bố cục cụ thể Web table/dropdown, Parent history, form dropdown/date calendar và alert quick action. So sánh conventions bảng/filter trang Học sinh/Chuyến xe. Không có datepicker package trong mobile/package.json đã đọc; đề nghị primitives/calendar modal hoặc component sẵn, không cài mới. Không thêm student selector vào history chung; vẫn giữ tên con trên card.

## 9. Verification & Testing
Đã đọc LATEST implementation, các màn history/create/OTP/Web leave, các đoạn card Home/lịch chung, Parent schedule, schedule DTO/leave status service, student filter reference và mobile dependencies. Kiểm tra git status (204 entries trước task). Rà soát prompt bao phủ yêu cầu và báo cáo đủ 13 mục. Không chạy typecheck/build/tests hoặc nghiệm thu UI vì chỉ soạn docs. Runtime sửa mới: NOT_VERIFIED; hành vi OTP/notice có side effects cần scope UAT theo Test Data Policy.

## 10. Issues & Risks
Report implementation trước ghi lịch có nút nhưng bỏ sót màn lịch riêng của Parent. Quick action dễ bind sai con/ngày/chiều nếu tái dùng default form; nested press/double tap có thể tạo hai điều hướng hoặc gửi OTP trùng. Bỏ student filter UI không được giữ filter ngầm; đổi kind Web cần reset status không hợp lệ. Không coi nhãn student hai trạng thái là quyền sửa dữ liệu staff/Trip.

## 11. Reviewer Focus
Parent-specific schedule thật sự có action; alert không bypass OTP; payload và action flags scoped từng con/Trip; creator-only cancellation và Ready guards không regress. Datepicker xử lý đúng ngày VN, ngày ngoài ba ngày, stale options. Bảng/dropdown đồng bộ style hiện có, không thêm dependency/framework.

## 12. Suggested Next Step
PO chuyển prompt leave-notice-ui-ux-fix-prompt.md cho Antigravity thực thi.

## 13. Approval Status
Yêu cầu sửa UI/UX do PO chỉ định trong hội thoại; Codex đã hoàn tất prompt, chưa gửi IDE hoặc triển khai source. Bản bàn giao chờ PO review. STOP-AFTER-TASK.
