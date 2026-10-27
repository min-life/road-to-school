# AI Review — Làm rõ tiện ích lịch sử và điểm mở báo sự cố

## 1. Task Information
Ngày27/10/2026, Asia/Saigon. Scope Documentation. Type Design clarification. Status COMPLETED đối với cập nhật; thiết kế tổng thể chưa triển khai.

## 2. Original Request
Tiện ích Sự cố chỉ liệt kê các sự cố do người dùng báo hoặc xác nhận; chỉ cho báo thủ công từ nút Báo sự cố trong Trip Detail hợp lệ.

## 3. Approved Scope
Hai yêu cầu là quyết định mới của PO, thay đề xuất danh sách theo Trip được phân công và nút+ trong tiện ích. Chỉ sửa tài liệu; không có quyền implementation/schema/migration trong lượt này.

## 4. Analysis & Decisions
Tách lịch sử hành động cá nhân khỏi tab sự cố theo Trip. History server lọc reportedById=currentUser OR auto type CONFIRMED với processedById=currentUser. Chờ xác nhận không tự vào history nếu chưa ai xác nhận, vẫn có popup/banner/tab Trip. Không có nút tạo/empty-state CTA ngoài Trip Detail. Form gắn Trip cố định. POST kiểm server-side điều kiện, không tin referrer/route UI. Lịch sử cá nhân tối giản giữ được khi nhân sự bị thay nhưng không cấp lại quyền Trip.

## 5. Implementation Details
No application code changes.
- Sửa operational-incidents-business-architecture-plan.md: quyết định, API/options/mine, wireframes, quyền xem và kiểm chứng.
- Archive LATEST.md/.diff và plan trước thay đổi: history/2026-10-27-003724-before-incident-personal-history-clarification.*.
- Cập nhật LATEST.md/LATEST.diff docs-only.

## 6. Database Changes
None. Không cần thêm bảng/cột so với thiết kế trước; tái dùng reportedById/processedById/type/status cho history. Bảng TripIncident trước đó vẫn là đề xuất chưa tạo.

## 7. API & Swagger Changes
None thực tế. Thiết kế dùng GET /incidents/mine, GET /trips/:id/incident-options, tách GET /incidents cho admin; giữ POST /trips/:id/incidents nhưng revalidate server dưới lock. Không gọi API runtime.

## 8. UI/UX Changes
Chỉ wireframe tài liệu: tiện ích bỏ+, chỉ history; empty state không tạo mới. Form chỉ mở tại Trip Detail hợp lệ, không chọn Trip khác. Tab Trip chỉ xem mọi sự cố trong scope. Chưa sửa UI.

## 9. Verification & Testing
Đã đọc plan/LATEST hiện hành và kiểm git status (6entries đầu task), archive trước chỉnh sửa, rà phần API/wireframe để loại entry tạo cũ. Không chạy typecheck/tests/build do docs-only. Không DB/API mutations, không provider/OTP. Runtime NOT_VERIFIED; không phát sinh runtime task được cấp.

## 10. Issues & Risks
Hạn chế điểm mở UI không thay authorization. Pending auto chưa có người xác nhận không hiện trong mine nên phải giữ nguồn Trip popup/banner riêng. History projection không được leak Trip khi người báo bị thay. Thiết kế tổng thể tiếp tục chờ review, chưa prompt/implementation.

## 11. Reviewer Focus
Mine OR đúng actor/action; auto status CONFIRMED; không dùng current assignment làm điều kiện lọc cá nhân; không cho query actor tùy ý; no create elsewhere; fixed Trip; POST stale-state revalidation; historical self-view vs live Trip access.

## 12. Suggested Next Step
PO tiếp tục review thiết kế tổng thể trước khi yêu cầu tạo prompt thực thi.

## 13. Approval Status
Đã ghi nhận quyết định mới của PO; WAITING FOR USER REVIEW / APPROVAL đối với thiết kế tổng thể. Không tự cấp quyền tạo bảng/API/UI hoặc triển khai. STOP AFTER TASK.
