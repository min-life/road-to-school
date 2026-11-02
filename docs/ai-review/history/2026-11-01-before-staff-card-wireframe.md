# AI Review — Đề xuất style card staff đồng bộ Parent

## 1. Task Information
Date 01/11/2026 Asia/Saigon. Scope Mobile UI. Type Design discussion. Status WAITING_APPROVAL.

## 2. Original Request
Người dùng hỏi cách giữ các thông tin trên card Driver/Bus Attendant nhưng đồng bộ style với Parent, kèm screenshot card hiện tại.

## 3. Approved Scope
Đọc/đề xuất; chưa có yêu cầu sửa card application. Giữ các source changes Home đã có từ task trước.

## 4. Analysis & Decisions
Đã đối chiếu ParentTripCard và StaffTripCard. Đề xuất dùng cùng visual shell: bo góc20, viền/mép trái màu nhấn, bóng nhẹ, phần tóm tắt tone kem/vàng theo theme và bố cục icon tròn/tên tuyến/status/trường. Màu trạng thái phải dựa dữ liệu chuyến/readiness của staff, không lấy trạng thái một học sinh áp cho cả chuyến.

Giữ đầy đủ thông tin hiện có: chiều/trạng thái/tuyến/trường/giờ/ngày/biển số/số chỗ/số HS/tài xế/giáo viên/tình trạng sẵn sàng hoặc số liệu điểm danh/CTA vận hành và báo nghỉ khi được phép. Ngày đã có trên heading section nên có thể bỏ bản lặp trong card mà không mất thông tin.

Đề xuất trình bày: đầu card giống Parent (icon bus trong vòng tròn vàng thay avatar học sinh); tags chiều và giờ; thân trắng với hàng thông tin xe và nhân sự thay các ô xanh xám lồng nhau; nhãn sẵn sàng/điểm danh theo state; CTA vàng luôn dễ thấy. Tên nhân sự xuống dòng khi cần để không mất thông tin như screenshot. Giai đoạn đầu giữ card mở đầy đủ, không tự thêm cơ chế thu gọn làm ẩn action vận hành. Nếu muốn disclosure như Parent cần duyệt riêng nội dung thu gọn và giữ CTA truy cập được.

Khi triển khai có thể dùng chung shell/visual primitives với Parent; không ép StaffTripCard nhận student-specific props hoặc sửa các mapping nghiệp vụ Parent. Chưa chọn chi tiết API component vì chưa duyệt wireframe.

## 5. Implementation Details
No application code changes. Chỉ lưu đề xuất; bảo toàn LATEST trước tại history/2026-11-01-before-staff-card-design.md/.diff.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None.

## 8. UI/UX Changes
Đề xuất, chưa implement. Tái sử dụng theme và ngôn ngữ card Parent, giữ đủ dữ liệu staff và thao tác. Chưa có wireframe card mới được PO duyệt.

## 9. Verification & Testing
Đã đọc source ParentTripCard/StaffTripCard và ảnh người dùng. Không chạy build/tests vì task chỉ thảo luận và không sửa source. Runtime/visual/native NOT_VERIFIED cho thiết kế đề xuất.

## 10. Issues & Risks
Không dùng student badge/attendance cá nhân để tạo màu trạng thái staff toàn chuyến. Cần kiểm tra tên tuyến/nhân sự dài, font scale, trạng thái SCHEDULED/IN_PROGRESS và điều kiện canReportLeave nếu triển khai. Không tự ẩn CTA chính sau disclosure chưa duyệt.

## 11. Reviewer Focus
Bảo toàn thông tin và callbacks; giảm khối nền lồng nhau; giống Parent ở visual hierarchy nhưng đúng ngữ nghĩa chuyến staff.

## 12. Suggested Next Step
Dựng wireframe card staff theo bố cục đề xuất để PO duyệt trước code.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL. Chưa sửa card application.
