# AI Review — Wireframe trang chủ Driver đồng bộ Parent

## 1. Task Information
Date: 01/11/2026 Asia/Saigon. Scope: Mobile UI Design. Status: WAITING_APPROVAL. Không triển khai application code.

## 2. Original Request
Thiết kế lại Home Driver theo Home Parent, tái sử dụng component khi triển khai; hai tiện ích Báo nghỉ và Sự cố; đồng bộ nền, header và trạng thái cuộn thu gọn. Người dùng yêu cầu xem wireframe trước.

## 3. Approved Scope
Tạo bản xem trước ngoài repo application, dựa trên ba ảnh người dùng cung cấp và source ParentHomeScrollView/StaffTripCard. Chưa được duyệt triển khai React Native; bus attendant nằm ở giai đoạn sau.

## 4. Analysis & Decisions
Hiểu các chỗ lặp từ driver trong yêu cầu là muốn đồng bộ phần vỏ Home theo parent, giữ tên/vai trò driver. Expanded: avatar/tên/vai trò-trường/chuông trên nền kem, thẻ tiện ích trắng bo góc gồm calendar-days Báo nghỉ và triangle-alert Sự cố. Compact: avatar nhỏ, hai icon giữa, chuông phải; ẩn tên/subtitle/nhãn tiện ích, bỏ nền thẻ trắng; theo cơ chế hai trạng thái của ParentHomeScrollView hiện có. Bản xem trước dùng nút đổi trạng thái cuộn, chưa chạy native scrolling.

Thẻ chuyến vẫn giữ thông tin screenshot driver: chiều, trạng thái, tuyến, trường, giờ/ngày, xe, nhân sự, điểm danh và CTA vận hành. Nội dung minh họa lấy từ screenshot người dùng, không tạo bản ghi hay fake API response. PO đã đính chính: tiện ích đầu tiên là Báo nghỉ, không phải Lịch. Wireframe đã sửa nhãn/aria-label ở cả trạng thái mở và thu gọn; icon calendar-days giữ nguyên. Tab Lịch phía dưới giữ nguyên.

Khi được duyệt, dự kiến cho phép shell Home dùng chung nhận cấu hình tên/subtitle và danh sách 2 action để Parent/Driver dùng chung layout và cơ chế thu gọn; không sao chép thêm một shell hoặc mở rộng nghiệp vụ. Cần xác định phạm vi staff component để chưa làm thay đổi bus attendant ngoài yêu cầu.

## 5. Implementation Details
Preview only: C:/Users/toila/.codex/visualizations/2026/11/01/01a1977c-ba51-7e80-8b97-84400724d696/driver-home-wireframe.html.
No application code changes. Cập nhật báo cáo và bảo toàn LATEST trước task tại history/2026-11-01-before-driver-home-wireframe.md/.diff. Không dependencies, env, backend hoặc memory changes.

## 6. Database Changes
None. Không query, seed hoặc mutation.

## 7. API & Swagger Changes
None. Bản xem trước offline không gọi API. Các nút điều hướng trong điện thoại chỉ minh họa bố cục.

## 8. UI/UX Changes
Đề xuất header Driver và nền giống Parent; 2 trạng thái expanded/compact, hai shortcut Báo nghỉ/Sự cố, tab Home/Lịch/Cá nhân. Wireframe giữ phong cách màu #FFFDF6/#FFCB56 và khoảng cách tương tự ảnh tham chiếu. Không mang chữ giải thích kỹ thuật vào app. Header actions là nút có aria-label; trạng thái preview đổi bằng hai nút bên ngoài màn hình. Đây là một bố cục với hai trạng thái, không phải hai thiết kế khác nhau.

## 9. Verification & Testing
PASS: đọc lại fragment sau khi lưu; script Node vm/assert kiểm tra trạng thái đầu expanded, chuyển compact, aria-pressed và trở lại expanded; kiểm tra không fetch. File khoảng 12 KB.
NOT_VERIFIED: browser visual render, native Android/iOS, real scrolling, route navigation và backend. Không cài Playwright vì không có ở cwd. Không chạy typecheck application vì application code không đổi; kết quả typecheck task trước không được coi là kiểm thử task mới.

## 10. Issues & Risks
Cần PO duyệt bố cục trước code theo AGENTS.md. Wireframe minh họa việc thu gọn, chưa chứng minh native scroll/animation. Dữ liệu trên ảnh không phải snapshot API hiện tại. Tên/trường dài và font scale cần kiểm chứng ở bước triển khai; không thay quy tắc vận hành, capabilities hoặc quyền.

## 11. Reviewer Focus
Header expanded/compact có đúng Parent reference; shortcuts Báo nghỉ/Sự cố và giữ chuông; bảo toàn thẻ chuyến/actions; shared component không ảnh hưởng Parent hoặc Bus Attendant ngoài scope.

## 12. Suggested Next Step
PO duyệt hoặc chỉnh wireframe trước khi triển khai Home Driver.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL. Chưa được phê duyệt sửa UI production.

