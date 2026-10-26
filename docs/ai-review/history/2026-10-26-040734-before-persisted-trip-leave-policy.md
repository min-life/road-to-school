# AI Review — Cập nhật điều kiện báo nghỉ và làm rõ nhãn Lập lịch

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope: Documentation / Business Design. Status: WAITING_APPROVAL / cần làm rõ phạm vi status. Không implementation.

## 2. Original Request
PO bổ sung: chiều về không cho báo nghỉ khi giáo viên Ready; chặn báo nghỉ chuyến ở trạng thái Lập lịch để phù hợp thiết kế DB.

## 3. Approved Scope
Chỉ cập nhật thiết kế. Đã xác nhận guard tạo báo nghỉ TO_PARKING khi attendantReadyAt khác null. Phạm vi “Lập lịch” cần làm rõ do nhãn source tương ứng SCHEDULED, không phải VIRTUAL.

## 4. Analysis & Decisions
Source getScheduleStatusLabel: VIRTUAL -> Dự kiến, SCHEDULED -> Lập lịch. Source TripStatus hiện chỉ SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED. Nếu cấm SCHEDULED đồng thời chỉ cho báo trước Start thì không còn lifecycle hợp lệ để báo nghỉ. Đã hỏi PO chặn VIRTUAL chưa sinh Trip hay cả SCHEDULED thật; không suy diễn câu trả lời.

Đã cập nhật [leave-notice-business-architecture-plan.md](leave-notice-business-architecture-plan.md): guard Ready chiều về ở options/send/confirm, không ghi đè PRESENT; đánh dấu hỗ trợ/materialize VIRTUAL tạm chưa chốt theo quyết định mới. Chưa tự mở rộng lệnh cấm tạo báo nghỉ sang hủy của Parent/Driver sau Ready.

## 5. Implementation Details
No application code changes. Chỉ cập nhật plan, LATEST.md/LATEST.diff; báo cáo trước đã archive với hậu tố before-leave-eligibility-clarification.

## 6. Database Changes
None. Chưa đổi thiết kế FK Trip hoặc schema/migration trước khi chốt loại chuyến được báo nghỉ.

## 7. API & Swagger Changes
None implemented. Guard đề xuất phải áp dụng server-side ở options, gửi OTP và confirm dưới Trip lock; không chỉ disable nút.

## 8. UI/UX Changes
Chưa sửa UI. Cần thống nhất Dự kiến/Lập lịch trước khi định nghĩa disabledReason trên card và form.

## 9. Verification & Testing
PASS: đọc getScheduleStatusLabel và đối chiếu plan hiện tại/AGENTS. Không chạy tests/typecheck do chỉ đổi docs, không gửi OTP hoặc mutation dữ liệu. Runtime chưa implement: NOT_VERIFIED.

## 10. Issues & Risks
Chặn nhầm SCHEDULED có thể làm mất toàn bộ cửa sổ báo nghỉ. Ready reset khi thay Attendant có thể tồn tại attendance PRESENT; guard không được ghi đè trạng thái lên/xuống xe.

## 11. Reviewer Focus
Phạm vi trạng thái được phép, cách gọi UI so với enum; phân biệt tạo/hủy báo nghỉ; recheck Ready ở confirm OTP và race Start/Ready.

## 12. Suggested Next Step
PO xác nhận “Lập lịch” muốn chặn là VIRTUAL chưa sinh Trip hay cả SCHEDULED đã sinh Trip. Không triển khai phần phụ thuộc trước khi có trả lời.

## 13. Approval Status
WAITING FOR USER CLARIFICATION. Không có approval implementation. STOP-AFTER-TASK.
