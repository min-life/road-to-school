# AI Review — Wireframe map chung theo Parent

## 1. Task Information
Date 01/11/2026 Asia/Saigon. Scope Mobile UI Design. Status WAITING_APPROVAL.

## 2. Original Request
PO đồng ý hướng chuẩn hóa map giống Parent, giữ chức năng riêng từng vai trò, yêu cầu xem wireframe trước.

## 3. Approved Scope
Chỉ tạo bản xem trước tương tác, chưa sửa map/application. Không đổi API/DB/quyền hoặc dữ liệu thật.

## 4. Analysis & Decisions
Một bố cục chung với selector Parent/Driver/Bus Attendant, state chờ/đang chạy và bảng mở/thu gọn. Chọn dùng sơ đồ không địa danh, ghi rõ không phải bản đồ hoặc vị trí thật để tập trung marker/panel; không giả một tuyến GPS thật.

Marker cùng silhouette pin/size/anchor: P xanh bãi, trường vàng icon outline, điểm đón teal; Parent có chữ C đại diện con, staff có thứ tự2,3. Xe vàng có bus icon ổn định, không dùng emoji. Giữ phân biệt nội dung marker theo dữ liệu/quyền. School/vehicle icons dùng Lucide có sẵn trong preview runtime, không tải lib mới.

Panel theo Parent: header tuyến/chiều/giờ-trường-status, tabs và cards thông tin nền trắng; nội dung lấy từ screenshot PO. Footer là phần nối liền panel, không tách bằng offset cố định. Parent không có footer; Driver có footer thao tác; Attendant chỉ có footer sẵn sàng ở trạng thái chờ, không dành khoảng trống khi đang chạy. Preview dùng ví dụ chiều đi chưa ready/chưa điểm danh theo ảnh, không mô phỏng đầy đủ mọi capability.

Driver đang chạy có controls TEST_AUTO/TEST_JOYSTICK theo mẫu screenshot đang ở test mode và nút Tham chiếu; đây không phải đề xuất mở test controls cho mọi môi trường. Parent/Attendant chỉ có controls quan sát khi có vị trí. Tab Điểm danh chỉ staff; QR chỉ attendant đang chạy với mẫu chiều đi. Khi triển khai phải giữ canPublish/capabilities/canScanQr/role/data thực, không dùng state preview thay quyền server.

## 5. Implementation Details
Preview: C:/Users/toila/.codex/visualizations/2026/11/01/01a1977c-ba51-7e80-8b97-84400724d696/trip-map-shared-wireframe.html.
No application code changes. Chỉ report; bảo toàn report/diff trước ở history/2026-11-01-before-map-shared-wireframe.md/.diff.

## 6. Database Changes
None. Không tạo/query/mutate records; số liệu hiển thị lấy từ screenshot để minh họa thiết kế, không fake API.

## 7. API & Swagger Changes
None. Preview offline. Nút gọi/ready/start/follow/center chỉ mô tả UI, không thực hiện nghiệp vụ hoặc cuộc gọi.

## 8. UI/UX Changes
Một thiết kế với role/state variants, không phải các alternative designs. Marker chung style nhưng giữ nội dung riêng; panel open/compact, footer liền và chỉ có khi có nội dung; labels nhỏ wrap ở320. Có alt mô tả schematic và chú thích ngoài điện thoại. Không đưa explanatory implementation copy vào product.

## 9. Verification & Testing
PASS Node vm syntax check, không fetch, dưới1MB, đọc lại fragment; render.py wrapper tạo thành công. Khi đổi default preview, lần overwrite wrapper cần --force và đã chạy lại thành công.
PASS Chromium IAB: Parent collapsed/expanded, Driver expanded/compact, Attendant running/waiting; 420px và320px. Chuyển role/state/tabs/expand có cập nhật đúng; các icon hiển thị.
PASS DOM checks320px cho6tổhợp3roles×2states ở expanded: không overflow ngang; footer Parent false cả2states, Driver true cả2states, Attendant false khi chạy/true khi chờ. Khi footer có mặt, footer.top-details.bottom=0px; panel sát đáy phone, chỉ chênh1px viền khung. QR absent khi waiting, visible khi Attendant running.
PASS final school-marker clearance320px/Driver compact:24px dưới control banner, không overlap (đã chỉnh tọa độ schematic và endpoint để không che marker). Đây là kiểm tra wireframe, không phải app fitBounds/GPS thật.
Đã đóng tab/reset viewport và dừng server51617; không start/stop Metro/API.
NOT_VERIFIED UI native production, GPS/navigation, gesture drag thật, font scale/screen reader, states ready/arrived/completed/cancelled khác và quyền thực. Không dùng QA wireframe để khẳng định app đã được sửa.

## 10. Issues & Risks
Chờ duyệt bố cục trước code. Nội dung trạng thái chỉ các ví dụ; không được giản lược capability/action conditions theo wireframe. Cần giữ privacy Parent và readiness/boarding/alighting staff khi implement. Schematic không phải bản đồ địa lý nên không xác nhận vị trí/route/ETA.

## 11. Reviewer Focus
Marker nhất quán, giữ own-child identity; footer liền panel và không khoảng chừa rỗng; thao tác riêng đúng role; state/data/publisher không bị đổi khi thực thi về sau.

## 12. Suggested Next Step
PO duyệt hoặc chỉnh wireframe map chung trước triển khai.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL. Chỉ hướng thiết kế đã được đồng ý, chưa triển khai map application.
