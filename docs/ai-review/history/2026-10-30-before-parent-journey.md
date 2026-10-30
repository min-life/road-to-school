# AI Review — Nhận diện vai trò RoadToSchool

## 1. Task Information
29/10/2026, Asia/Saigon. Scope: Web / Mobile / Documentation. Type: Analysis / Design. Mode: DISCUSSION. Status: COMPLETED (analysis only).

## 2. Original Request
Đọc source tại C:/dongnnp/study-work/code/road-to-school/road-to-school và đề xuất cách phù hợp nhất trong 5 ý tưởng nhận diện vai trò đã trao đổi.

## 3. Approved Scope
Đọc và phân tích mã nguồn, đưa ra khuyến nghị. UI implementation NOT APPROVED; không sửa application code.

## 4. Analysis & Decisions
Đề xuất cách 1 (nhãn vai trò thường trực) kết hợp cách 4 (biểu tượng). Giữ màu thương hiệu hiện tại; màu vai trò chỉ là hỗ trợ tùy chọn. Không cần thêm câu chào dài hoặc thay theme toàn app. Role lấy từ user.role của phiên đăng nhập; User hiện có một trường role, chưa có căn cứ đề xuất bộ chuyển nhiều vai trò.

Bằng chứng source:
- web/src/components/admin/admin-header.tsx: có formatRoleLabel(user.role) dưới tên người dùng nhưng hidden sm:flex; brand subtitle vẫn là Cổng Quản trị Viên cho cả hai role.
- web/src/components/admin/admin-nav.config.ts: lọc menu theo role; nhãn quản trị hệ thống/trường học đã có sẵn.
- mobile/app/(tabs)/_layout.tsx: DRIVER và BUS_ATTENDANT chung nhóm tab; AppHeader chưa nhận thông tin role. PARENT index dùng header riêng, tracking và schedule cũng ẩn header mặc định.
- mobile/components/navigation/app-header.tsx: có title/subtitle nhưng chưa có vùng nhãn role riêng.
- mobile/components/parent/home-scroll-view.tsx: greeting mờ đi khi cuộn; nhóm tiện ích chiếm hàng compact. Nhãn role mới phải được bố trí trong vùng còn hiển thị, không gắn vào greeting đang fade; cần wireframe để tránh chồng nút.
- mobile/app/(tabs)/settings.tsx: có roleBadge nhưng chỉ thấy khi vào Cá nhân.
- mobile/components/RoleSplash.tsx và mobile/context/auth-context.tsx: splash mặc định1200ms sau đăng nhập thủ công; PARENT dùng splash riêng. Không thể dùng splash làm dấu hiệu thường trực.
- BUS_ATTENDANT đang được gọi khác nhau: Giáo viên, Giáo viên giám sát, Nhân viên phụ trách xe. Đề xuất thống nhất Giáo viên phụ trách xe; không tạo role TEACHER.

Nhãn đề xuất: SYSTEM_ADMIN = Quản trị nhà xe; SCHOOL_ADMIN = Quản trị trường học; DRIVER = Tài xế; BUS_ATTENDANT = Giáo viên phụ trách xe; PARENT = Phụ huynh.
Web: nhãn rõ ở header, vẫn hiện khi màn hình hẹp. Mobile: icon + nhãn ở header dùng chung và các header tự dựng; không thay tiêu đề màn nghiệp vụ. Ưu tiên chữ đầy đủ, cho phép bố trí hai hàng khi cần; không ép nhãn dài vào khoảng hẹp hoặc chỉ dùng màu/icon. Giữ nhãn trong header phụ huynh khi compact, cần cân đối lại wireframe hàng tiện ích.

## 5. Implementation Details
No application code changes. Chỉ cập nhật LATEST.md và LATEST.diff theo quy định repo. Báo cáo/diff trước được sao lưu trong history/2026-10-29-before-role-identification-analysis.*.

## 6. Database Changes
None.

## 7. API & Swagger Changes
None.

## 8. UI/UX Changes
Chỉ khuyến nghị, chưa thay UI. Wireframe chưa trình duyệt. Dùng nhãn ngắn và icon, giữ nền kem/vàng thương hiệu, không thêm banner cao hoặc câu giải thích thường trực.

## 9. Verification & Testing
PASS: đọc AGENTS.md, web/AGENTS.md, working rules, business context, handoffs, review trước và các component liên quan; git status --short cho thấy nhiều thay đổi local có sẵn, không discard.
PASS: đối chiếu nhãn role, điều kiện tab/header và hành vi compact trong source.
NOT_VERIFIED: runtime Web/Expo/native, font scale và nhãn ở header compact trên máy thật. Không chạy build/typecheck vì task không thay application code; không tạo test data hoặc gọi API.

## 10. Issues & Risks
Nhãn dài BUS_ATTENDANT có nguy cơ tràn hàng trên320px. Header PARENT compact đang dành không gian cho tiện ích; cần bố trí trước khi code. Các màn dùng custom header cần được rà soát đầy đủ khi triển khai để tránh nhãn chỉ xuất hiện tại Trang chủ.

## 11. Reviewer Focus
Độ đúng của mapping5 roles, nhãn BUS_ATTENDANT thống nhất, sự hiện diện ở header nhỏ/compact/custom, không chiếm chỗ nút nghiệp vụ hoặc dùng màu trạng thái chuyến cho role.

## 12. Suggested Next Step
Lập một wireframe nhận diện vai trò cho Web và Mobile, gồm trạng thái header phụ huynh thu gọn.

## 13. Approval Status
Analysis delivered. UI recommendation WAITING FOR USER REVIEW / APPROVAL; chưa triển khai.
