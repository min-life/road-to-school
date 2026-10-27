# AI Review — Thiết kế nghiệp vụ sự cố vận hành

## 1. Task Information
Ngày27/10/2026, Asia/Saigon. Scope Documentation; source analysis API/Mobile/Web. Type Discussion / Design. Status WAITING_APPROVAL cho thiết kế; chưa implementation.

## 2. Original Request
PO yêu cầu cùng phân tích nghiệp vụ sự cố cần xử lý/cần xác nhận, DB/API/UI; tiện ích Driver/Giáo viên, nút báo tại Trip Detail, tab chỉ xem3roles, báo thiếu nhân sự trước chuyến, admin phân công/hủy, chặn Start quá giờ, popup Giáo viên cho lệch tuyến và đón/trả trễ. Chưa yêu cầu prompt.

## 3. Approved Scope
Được phân tích/lưu thiết kế, không sửa code/schema/DB. PO đã trả lời: admin có thể xác nhận người cũ đã đến hoặc thay người; so lệch với snapshot polyline; ngưỡng100m/30s và trễ5phút/30s; mỗi sự cố tự động chỉ1lần. Công bố cách hiểu tối đa1OFF_ROUTE và1LATE_STOP mỗi Trip. PO đã chốt thêm: TEST miễn rào giờ Start, popup được để sau, Parent không xem lý do nội bộ. Bảng mới, API/UI/JSON extension vẫn là đề xuất, chưa quyền tạo/migrate.

## 4. Analysis & Decisions
Tài liệu đầy đủ tại operational-incidents-business-architecture-plan.md. Thiết kế4loại, vòng đời xử lý/xác nhận; shared leave+incident blocker, giữ TripStatus hiện có. Detector server từ vị trí đã persist với dữ liệu liên tục; độc lập với ngưỡng client reroute40m/3s. Unique dedupe per auto type/Trip, không reset khi reroute/reopen. ETA cần current-leg timing/progress, không suy từ tổng duration hoặc chia đều số stops. Tái dùng navigationState JSON cho context routing tối thiểu nếu cần, không lặp GPS/history. Không gọi provider mỗi GPS tick/GET, không detector phụ thuộc người xem.

## 5. Implementation Details
No application code changes.
- Mới: docs/ai-review/operational-incidents-business-architecture-plan.md.
- Archive báo cáo/diff Antigravity: history/2026-10-27-002029-before-operational-incidents-design.md và .diff.
- Cập nhật LATEST.md/LATEST.diff documentation only.

## 6. Database Changes
None thực tế. Đề xuất1bảng TripIncident (13fields, type/status enums, idempotency/dedupe unique,2indexes listing), không có bảng alert/history/queue mới. Cân nhắc mở rộng JSON navigationState server-owned thay vì thêm cột mới. Không connection/DDL/DML/migration.

## 7. API & Swagger Changes
None thực tế. Đề xuất options/list/Trip-view/create/detail/candidates/resolve/cancel-trip/confirm, reuse envelope/auth/Trip scope/CAS. Create client chỉ2loại thiếu người;2loại tự động do server. GET không có side effects. Swagger cần đồng bộ khi được triển khai.

## 8. UI/UX Changes
Chưa sửa UI. Có wireframes Trang chủ staff, danh sách/form tiện ích, Trip Detail top-right/tab read-only3roles, popup Giáo viên và Web Admin list/modal. Không Trip-card button, không utility Parent; pending confirmation action ngoài tab để giữ read-only. Wireframe đang chờ review, không tự coi đã duyệt.

## 9. Verification & Testing
Đã đọc LATEST Antigravity mới, kiểm git status (278entries), đọc/rà Prisma model names, TripsService access/start/ready/assignment/nextTrip/operational state, LeaveNotices candidates/replacement, navigation DTO/checkpoint/publisher và client offroute thresholds, Mobile Trip tabs/list leave. Source xác nhận chưa có Incident model, Start chưa có upper bound scheduledEndAt, ETA server chưa có đầy đủ current-leg context.
Không chạy compiler/tests/build vì docs-only; không tái nhận các kết quả374tests trong báo cáo Antigravity làm evidence task này. Không DB writes/API mutations/provider/OTP/device tests. Tính đúng runtime detector/ETA/UI NOT_VERIFIED; test có ghi chưa được cấp scope, BLOCKED_BY_TEST_DATA_POLICY.

## 10. Issues & Risks
Đã chốt TEST miễn Start deadline, popup để sau và Parent không xem lý do nội bộ qua phản hồi async; không còn chờ ba lựa chọn này. Theo dõi next stop và lựa chọn cụ thể của thiết kế chờ PO review. GPS thiếu/stale ngừng đánh giá; app foreground-only không có bằng chứng trong khoảng GPS gap. Lệch snapshot có thể là reroute hợp lý theo PO, không đồng nghĩa Driver vi phạm; cần lý do. Không hứa ETA chính xác tuyệt đối. Guard expired ở nextTrip hiện lọc cả running không được reuse mù. Tái dùng leave validator nhưng không copy nhánh quyền SystemAdmin thay Giáo viên vào incident trái quyết định mới.

## 11. Reviewer Focus
Pre-start vs in-progress windows,15phút và server time; incident vs navigation thresholds/baselines; one/type/Trip durable; delayed target/ETA correctness; shared blockers và lock order/report-start race; reset Ready đúng loại; Parent masking/free-text; new table minimal; current-leg JSON không lặp GPS; pending terminal closure không bịa confirmed.

## 12. Suggested Next Step
PO review thiết kế DB/API/wireframes trước khi tạo prompt triển khai; các lựa chọn đã trả lời không cần hỏi lại.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL đối với thiết kế. Những lựa chọn PO vừa trả lời đã ghi nhận, không tự cấp approval cho schema/API/UI. Không tạo prompt thực thi hoặc implement. STOP AFTER DESIGN.

