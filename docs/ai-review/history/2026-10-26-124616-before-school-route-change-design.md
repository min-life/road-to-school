# AI Review — Danh sách đầu việc còn lại sau Báo nghỉ

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope: Documentation / Business Inventory. Mode: DISCUSSION. Status: COMPLETED. Không xếp ưu tiên.

## 2. Original Request
PO yêu cầu liệt kê danh sách các đầu việc còn lại sau khi đã dùng thử Báo nghỉ tương đối ổn.

## 3. Approved Scope
Đối chiếu context, inventory trước và source có mục tiêu; lưu danh mục. Không implementation, prompt triển khai hoặc tự quyết định toàn bộ danh mục là scope MVP bắt buộc.

## 4. Analysis & Decisions
Danh mục 16 đầu việc trong remaining-work-after-leave-notices.md, chia: nghiệp vụ chưa thấy triển khai (sự cố, dashboard/báo cáo, yêu cầu sửa cấu hình trường); mở rộng/deferred (cứu hộ IN_PROGRESS, hủy ACTIVE, ETA động, thông báo cần chốt); hoàn thiện Báo nghỉ (duplicate alert/OTP, actor eligibility, tests/diff, filter Mobile); nghiệm thu/vận hành (5 roles/QR, LIVE navigation, leave/concurrency, SMS thật khi cần production, phát hành/hạ tầng).

Báo nghỉ/vận hành đã có, không đưa lại thành module chưa triển khai. Hủy RoutePlan DRAFT đã có, ACTIVE còn bị chặn. school-requests.controller xử lý StudentUpdateRequest, không phải đề nghị sửa trường. ETA hiện thấy plannedArrivalTime; dynamic ETA hoàn chỉnh cần audit/đặc tả riêng. Thông báo chưa chốt requirement, không tự thêm stop notifications.

## 5. Implementation Details
No application code changes. Tạo remaining-work-after-leave-notices.md; cập nhật LATEST.md/LATEST.diff. Archive trước task: history/2026-10-26-113106-before-post-leave-remaining-inventory.md/.diff. Giữ nguyên mọi source/uncommitted work.

## 6. Database Changes
None. Đọc model inventory, không query/mutate DB, không thêm model hoặc migration.

## 7. API & Swagger Changes
None. Đọc source/controller/DTO, không gọi API mutation hoặc thay Swagger.

## 8. UI/UX Changes
None. Chỉ liệt kê module/screens và phần cần nghiệm thu; không tạo wireframe mới hoặc sửa UI.

## 9. Verification & Testing
Đã đọc LATEST, file inventory trước Báo nghỉ, file list/module/model inventory, trường plannedArrivalTime, school-requests.controller đúng thư mục student-requests, hook quick leave và !hasPendingStaff tại schedule. Git status: 214 entries trước task. Một search glob Windows và đường dẫn controller ban đầu không đúng, đã chạy lại với thư mục/đường dẫn thật; không dùng kết quả lỗi làm bằng chứng thiếu chức năng. Không chạy tests/tsc/build do chỉ thay docs. Hạ tầng/device/end-to-end: NOT_VERIFIED; UAT có side effects cần scope Test Data Policy.

## 10. Issues & Risks
Context chứa định hướng chưa phê duyệt chi tiết và snapshot cũ; không tự biến thành yêu cầu mới. PO thử tương đối ổn chưa đóng findings review hoặc toàn bộ runtime gates. SMS console là lựa chọn tạm đã duyệt, provider thật chỉ là đầu việc khi chuyển sang môi trường cần SMS thật. Chưa audit deploy/backup nên không khẳng định chưa tồn tại.

## 11. Reviewer Focus
Độ đầy đủ danh mục, phân biệt chưa có/deferred/cần hoàn thiện/cần xác minh. Giữ DRAFT vs ACTIVE, planned vs dynamic ETA, student-update vs school-config requests. Không thêm đa nhà xe, background GPS, thanh toán hoặc import chỉ vì chưa thấy source.

## 12. Suggested Next Step
PO chọn một đầu việc trong danh mục để tiếp tục phân tích phạm vi.

## 13. Approval Status
Inventory hoàn tất để PO xem xét; không có approval triển khai module mới. STOP-AFTER-TASK.
