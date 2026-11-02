# AI Review — Wireframe card staff theo style Parent

## 1. Task Information
Date 01/11/2026 Asia/Saigon. Scope Mobile UI Design. Status WAITING_APPROVAL.

## 2. Original Request
PO yêu cầu dựng wireframe bố cục card vừa đề xuất: giữ đủ thông tin staff, đồng bộ style Parent.

## 3. Approved Scope
Bản xem trước card mở đầy đủ cho Driver/Bus Attendant; chưa triển khai card application. Giữ các source changes Home từ task trước.

## 4. Analysis & Decisions
Một layout, hai vai trò bằng selector bên ngoài card. Summary nền kem, icon bus vòng tròn vàng, tên tuyến/status/trường, tags chiều/giờ. Thân trắng với các hàng phương tiện, tài xế, phụ xe; tên không bị truncate. Điểm danh giữ đủ marked/total/present/absent và CTA vàng luôn hiện. Ngày ở section header; biển số ở hàng Phương tiện thay vì lặp trong tên tuyến. Không thêm disclosure hoặc che thao tác.

Nội dung minh họa lấy từ screenshot PO: Tuyến Đi01, 51B-289-2.34, trường/nhân sự/giờ/ngày/số chỗ/số HS/số điểm danh hiện có; không phải API snapshot mới. Role selector đổi vị trí nhãn Bạn và CTA Xem chi tiết & Vận hành / Vào điểm danh & Vận hành. Không suy đoán quyền báo nghỉ ở chuyến đang chạy; mẫu hiện tại giống screenshot không có nút báo nghỉ trong card. Khi triển khai phải giữ nhánh canReportLeave và readiness hiện có, cần đối chiếu thêm các trạng thái khác.

## 5. Implementation Details
Preview: C:/Users/toila/.codex/visualizations/2026/11/01/01a1977c-ba51-7e80-8b97-84400724d696/staff-trip-card-wireframe.html.
No application code changes. Lưu report này; bảo toàn report/diff trước task ở history/2026-11-01-before-staff-card-wireframe.md/.diff. Không sửa memory hoặc dependency.

## 6. Database Changes
None. Không business records, fake API responses, queries hoặc mutations.

## 7. API & Swagger Changes
None. Preview offline, không gọi API. Nút vận hành minh họa bố cục, không thao tác ứng dụng thật.

## 8. UI/UX Changes
Đề xuất trình bày cùng palette/theme Parent, viền nhấn trái/bo20/shadow nhẹ, giảm nền lồng nhau. Card mở đầy đủ. Selector Driver/Bus attendant nằm ngoài UI sản phẩm. Tên/role/xe rõ; không tạo enum/status mới.

## 9. Verification & Testing
PASS Node vm/assert: selector Driver/Attendant đổi đúng CTA, nhãn Bạn, aria-pressed và trở về Driver; không fetch.
PASS đọc lại fragment và render.py tạo wrapper kiểm tra. Chromium IAB quan sát Driver390×844 và Bus Attendant320×800: card và nút hiển thị đầy đủ, tên không bị cắt, không tràn ngang; click đổi vai trò phản ánh đúng. Icon Lucide từ runtime có hiển thị.
Đã đóng tab/reset viewport và dừng server task51616. Không khởi động app/API, không test business flow.
NOT_VERIFIED native React Native, trạng thái chờ/hoàn thành/hủy và canReportLeave theo dữ liệu thật; đây là wireframe trạng thái IN_PROGRESS theo ảnh.

## 10. Issues & Risks
Chờ PO duyệt trước code. Số liệu/nhân sự trên ảnh chỉ dùng minh họa bố cục. Readiness, permissions, loading và báo nghỉ có điều kiện cần bảo toàn khi triển khai; không coi mẫu đang chạy là đủ cho tất cả state.

## 11. Reviewer Focus
Giữ đủ thông tin screenshot; style Parent; không truncate nhân sự; CTA rõ; hai roles cùng layout nhưng text/action ngữ nghĩa đúng.

## 12. Suggested Next Step
PO duyệt hoặc điều chỉnh wireframe card trước triển khai.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL. Chưa được yêu cầu sửa StaffTripCard.
