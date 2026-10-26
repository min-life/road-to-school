# AI Review — Đề xuất nghiệp vụ tiếp theo sau vận hành chuyến

## 1. Task Information
- Date: 26/10/2026, Asia/Saigon.
- Scope: Documentation / Business Analysis. Mode: DISCUSSION. Status: COMPLETED.
- Không triển khai tính năng hoặc tự đánh dấu vận hành chuyến đã nghiệm thu hoàn toàn.

## 2. Original Request
PO cho biết vận hành chuyến đã tương đối hoàn tất và hỏi nên làm gì tiếp theo dựa trên context dự án.

## 3. Approved Scope
Đọc tài liệu và source để đề xuất ưu tiên. Không có approval triển khai nghiệp vụ mới, schema/API/UI, migration, dependency hoặc UAT mutation.

## 4. Analysis & Decisions
Đề xuất duy nhất một nhiệm vụ tiếp theo: phân tích và chốt nghiệp vụ Báo nghỉ học sinh (Student Leave Requests), bắt đầu với phụ huynh gửi đơn theo ngày/chiều chuyến.

Lý do: BUSINESS_CONTEXT mục1,3.5,4 và6.4 đã định hướng phụ huynh báo nghỉ, nhưng source chưa có quy trình đơn báo nghỉ tương ứng. Source có StudentUpdateRequest cho INFORMATION_UPDATE/ADDRESS_UPDATE và TripAttendance ghi nhận vắng; hai phần này chưa phải quy trình nộp/xử lý đơn báo nghỉ trước chuyến.

Phạm vi ban đầu nên hẹp: học sinh báo nghỉ; chưa gộp tài xế/giáo viên xin nghỉ hoặc cứu hộ trong chuyến. Cần PO chốt: thời hạn gửi, ngày/chiều áp dụng, tự xác nhận hay duyệt và ai duyệt, hủy/đổi đơn, xử lý sau khi Trip bắt đầu, ảnh hưởng roster và điểm danh. Không mặc định hủy stop hoặc tối ưu lại RoutePlan vì học sinh nghỉ.

Incident Management và Reporting cũng có trong context nhưng chưa có module tương ứng qua tìm kiếm source. Đây là backlog, không giao triển khai cùng nhiệm vụ đề xuất.

## 5. Implementation Details
No application code changes. Chỉ cập nhật LATEST.md/LATEST.diff cho lần phân tích này. Báo cáo và diff trước được sao lưu với tên có timestamp trong history, hậu tố before-next-business-module-review.

## 6. Database Changes
None. Đọc schema xác nhận StudentUpdateRequest/RequestType hiện dành cho cập nhật hồ sơ và địa chỉ. Không tạo LeaveRequest model hoặc tái sử dụng bảng nghiệp vụ khác khi chưa phân tích/duyệt.

## 7. API & Swagger Changes
None. Chưa thiết kế/duyệt contract hoặc thay runtime API.

## 8. UI/UX Changes
None. Tính năng được đề xuất cần wireframe riêng sau khi chốt nghiệp vụ. Không tự thêm nút Xin nghỉ hoặc màn hình mới.

## 9. Verification & Testing
- PASS: Đã đọc AGENTS, WORKING_RULES, BUSINESS_CONTEXT, CODEX_HANDOFF, CURRENT_STATE và báo cáo mới nhất.
- PASS: rg source/schema/file inventory không tìm thấy triển khai leave-request/incident module; có attendance absence reasons và StudentUpdateRequest INFORMATION_UPDATE/ADDRESS_UPDATE.
- PASS: Kiểm tra trạng thái Git bằng read-only command; bảo vệ uncommitted work.
- NOT_VERIFIED: Chưa audit toàn bộ runtime năm role, QR thiết bị, hai chiều chuyến và LIVE GPS trong task này.
- Không chạy typecheck/build/test vì không đổi application code; không lấy test counts trong báo cáo cũ làm kết quả mới.
- Không gọi API mutation, dịch vụ trả phí, seed hoặc tạo bản ghi test.

## 10. Issues & Risks
Vận hành chuyến tương đối xong theo PO nhưng báo cáo gần nhất vẫn đề nghị UAT hành vi chuyển trạm100m. Cần giữ acceptance checklist cho hai chiều, quyền năm role, retry/resume, nhiều điểm dừng và lịch sử. Đặc biệt kiểm tra không nhầm việc đi qua waypoint điều hướng với boarding/alighting hoặc business milestones.

CURRENT_STATE có nhiều lớp snapshot lịch sử; phần roadmap/hủy RoutePlan có thể không phản ánh đầy đủ source mới. Không dựa riêng snapshot cũ để tự triển khai chức năng deferred.

## 11. Reviewer Focus
- Báo nghỉ trước chuyến khác với điểm danh ABSENT khi vận hành.
- Ai có quyền gửi/duyệt/hủy; liên kết Parent-Student và phạm vi trường.
- Đơn trùng, hai phụ huynh cùng con, TO_SCHOOL/TO_PARKING, hạn gửi và chuyến đã bắt đầu.
- Ảnh hưởng tới roster generation, attendance và route stop order; không sửa lịch sử hoàn tất.
- Không mở rộng thành thay thế nhân sự/xe khẩn cấp khi chưa được PO duyệt.

## 12. Suggested Next Step
Lập kế hoạch nghiệp vụ Báo nghỉ học sinh với PO: chốt luồng/quyền/hạn gửi/ảnh hưởng chuyến, rồi trình schema tối thiểu, contracts, wireframes và test plan để duyệt trước implementation.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL đối với đề xuất bước tiếp theo. Không có approval implementation mới. STOP-AFTER-TASK.
