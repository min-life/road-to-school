# AI Review — Script pgAdmin tạo tuyến và liên kết để PO tự test UI

## 1. Task Information
28/10/2026, Asia/Saigon. SQL preparation/Documentation. COMPLETED script preparation; SQL runtime NOT_VERIFIED. Chưa commit/push.

## 2. Original Request
Soạn SQL tạo tuyến, gắn học sinh vào tuyến rồi liên kết với phụ huynh để có data test UI; PO tự chạy trong pgAdmin.

## 3. Approved Scope
Soạn artifact SQL và hướng dẫn theo schema/source v2. PO cho phép chuẩn bị script test data, KHÔNG yêu cầu agent thực thi. Không kết nối/ghi DB, seed, tạo bản ghi tạm rồi rollback, chạy mutation hoặc sửa application/schema/migration/dependency. V1 không liên quan; giữ pending UI changes cũ.

## 4. Analysis & Decisions
Đọc quy tắc/business/handoffs/LATEST, Prisma/migrations, route create/resource checks, parent links, trip generation/snapshot/time và parent home cards. RoutePlan/Route khác Trip; chỉ tuyến/link chưa có Home cards nếu thiếu TripAttendance. Chọn reuse tài khoản/trường/xe/học sinh do PO chọn, không tạo user/student/vehicle/trường hoặc tự đoán ID/coordinates.

Tạo đúng hai chiều trong DRAFT. Giữ duy nhất SCHOOL_ADMIN duyệt ACTIVE bằng Web; không fake approved_by/activated_at. Web gán tài xế/phụ xe và SYSTEM_ADMIN sinh chuyến tạo snapshot/roster theo backend. Geometry nối các tọa độ thật + ETA giả lập thời lượng để test UI, được ghi rõ không phải VietMap VRP hoặc đường lái xe thực tế. Key parking thực tế là PARKING_LOT, không dùng central_parking_yard từ handoff lịch sử hoặc fallback coordinates.

## 5. Implementation Details
- [parent-ui-preflight.sql](../implementation/sql/parent-ui-preflight.sql): chỉ SELECT database, user IDs/roles, trường/lịch, xe/giữ chỗ, học sinh/địa chỉ/plan/link và PARKING_LOT; không chọn password/session/token.
- [create-parent-ui-routes.sql](../implementation/sql/create-parent-ui-routes.sql): khối cấu hình database/IDs/tag/duration/sample day; giao dịch serializable, lock tag, kiểm tra role/active/verified, trường, học sinh AVAILABLE/cùng trường/có coordinates, assignment/vehicle reservation/capacity và ngày học/hợp đồng/parking. INSERT RoutePlan DRAFT, 2 routes và stop theo thứ tự, polyline precision5/đường chim bay, ETA tham khảo; thêm links ON CONFLICT DO NOTHING. Không UPDATE/DELETE, không kích hoạt hoặc Trip.
- [verify-parent-ui-data.sql](../implementation/sql/verify-parent-ui-data.sql): SELECT links/plan/assignment/trips và các chuyến thỏa filter Home; không mô phỏng ưu tiên một thẻ mỗi con.
- [Hướng dẫn](../implementation/pgadmin-parent-ui-data.md): cách chạy pgAdmin, expected counts, điều kiện, limits và Web approve/generate để Home có dữ liệu. Thêm link README và hai handoffs.
- Review trước archive history/2026-10-28-before-pgadmin-parent-ui-sql.md/.diff. Task diff gồm SQL/docs chuẩn bị, không chứa .env hoặc pending app changes.

## 6. Database Changes
ACTUAL: None; không có kết nối/thực thi DB trong task.

Khi PO chạy file create: với N học sinh hiện có, thêm1 route_plans DRAFT,2 routes,2*(N+2) route_stops và tối đaN parent_student_links mới. UUID tạo phía PostgreSQL và updated_at được điền rõ. Bản ghi cũ/links cũ giữ nguyên; cùng tag báo tồn tại thay vì ghi đè. Transaction lỗi rollback toàn bộ. Không có migration/DDL/cleanup hoặc extension mới.

## 7. API & Swagger Changes
None. Không sửa/call API. Script link cố ý bỏ qua OTP chỉ cho local test do PO tự chạy; không chứng nhận luồng OTP. Phân công/duyệt/sinh chuyến tiếp tục qua nghiệp vụ Web hiện có, không thay quyền role.

## 8. UI/UX Changes
No UI changes. Link giúp Theo dõi và chọn học sinh Đổi điểm có dữ liệu. Home cards yêu cầu Trip SCHEDULED/IN_PROGRESS, roster chưa excluded và scheduled_end_at còn hạn hoặc NULL; hướng dẫn có bước Web sau SQL, không khẳng định DRAFT đủ hiển thị thẻ chuyến. Không tạo GPS/điểm danh/notification/OTP giả.

## 9. Verification & Testing
PASS kiểm tra tĩnh INSERT tables/columns và mọi required field theo Prisma.dmmf đã generated: route_plans12 cột, routes14, route_stops11, parent_student_links4. Có id/updated_at theo yêu cầu, enum/schema đối chiếu source. PASS delimiter parentheses, chỉ4 bảng đích, transaction/ON CONFLICT và không destructive DML. PASS git diff --check và task whitespace. API tsc --noEmit PASS, không chạy app/test/migrations; typecheck không xác nhận cú pháp SQL.

NOT_VERIFIED PostgreSQL syntax/PLpgSQL runtime, quyền role SQL, dữ liệu/đủ resources trong DB, kết quả chạy/approve/generate/UI. Không có SQL parser cài sẵn; không cài package, không chạy SQL kể cả rollback hoặc dựng fake DB. Kiểm tra tĩnh không được ghi nhận là parser/runtime PASS. Test Data Policy áp dụng: PO tự chọn dữ liệu và thực thi theo yêu cầu, agent không tạo/đổi records.

## 10. Issues & Risks
Script cần School/Vehicle/Student/User có sẵn; thiếu thì fail, hướng dẫn tạo/chọn qua Web trước. DRAFT giữ chỗ xe/học sinh; không đổi tag để né conflict. Hình học/ETA chỉ test trình bày, không nghiệm thu routing/VRP/live navigation. Không có Trip cho đến khi luồng Web xử lý hợp lệ; serviceDate phải sau ngày ACTIVE, trong hợp đồng/ngày học. SQL do PO chạy không đi qua application audit/OTP/notifications nên chỉ dùng local test. Chưa xác nhận khả năng chạy trên DB hiện tại.

## 11. Reviewer Focus
Kiểm tra mapped table/column/enum, required timestamps; hai chiều/stop order/cùng tập học sinh, JSON schedule và precision5. Tách rõ SQL viết ra với execution; không self-seed, không sửa records/schema, không fake approval hoặc roster. Guard role/resources/contract/reservation, duplicate tag và preserved links; xác minh điều kiện thật của Home và giới hạn synthetic route shape/time.

## 12. Suggested Next Step
PO chạy preflight trong pgAdmin local để lấy ID và điền khối cấu hình của file create trước khi chạy toàn bộ transaction.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL. Artifact đã soạn theo yêu cầu; agent chưa chạy DB. PO tự thực thi. Không commit/push và dừng sau task.
