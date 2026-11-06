# AI Review — Bootstrap dữ liệu UI khi chưa có ID/tài nguyên

## 1. Task Information
29/10/2026, Asia/Saigon. SQL preparation/Documentation. COMPLETED artifact; SQL/runtime/UI NOT_VERIFIED. Chưa commit/push.

## 2. Original Request
PO không có parent/system-admin/school/vehicle/student ID để điền script trước; tiếp tục yêu cầu soạn dữ liệu test để PO tự chạy pgAdmin.

## 3. Approved Scope
Bổ sung bootstrap script để tự tạo/ghép tài nguyên cần thiết, không bắt PO tìm ID. Chỉ soạn SQL và docs, không thực thi hoặc kết nối database. Không application/backend logic/Prisma/migration/API/dependency/env/Git writes. Các test records là nội dung SQL PO chủ động chạy, không phải dữ liệu agent tự seed để test.

## 4. Analysis & Decisions
Script trước giả định có resources và ID, chưa phù hợp trường hợp PO nêu. Cung cấp một file kết hợp bootstrap resources + route/link transaction, giữ bản thủ công cho trường hợp có dữ liệu. Default database roadtoschool theo thông tin PO, không lưu DATABASE_URL/database password. Reuse PARENT active/verified duy nhất, không tự chọn ngẫu nhiên khi nhiều parent; có thể chọn bằng email/phone. Không có parent thì tạo test parent khi PO cấp guardian phone.

Tạo staff riêng với email namespace .example.invalid, không sao chép password hash của parent hoặc dùng hash không tương thích. PO đặt mật khẩu mới trong Query Tool; SQL crypt/gen_salt bf cost10 tạo bcrypt tương thích backend bcryptjs. Dùng pgcrypto có điều kiện, cần quyền extension; không agent cài extension hoặc npm. Nguồn [PostgreSQL18 pgcrypto](https://www.postgresql.org/docs/18/pgcrypto.html), schema và auth.service.ts local. Giữ tuyến DRAFT, không giả phê duyệt của SCHOOL_ADMIN hoặc tạo Trip; Web xử lý approve/generate đúng flow.

## 5. Implementation Details
- [bootstrap-parent-ui.sql](../implementation/sql/bootstrap-parent-ui.sql) mới, một transaction serializable: DB guard, pgcrypto nếu thiếu, temp config IDs, bootstrap resources, route/link reuse pattern từ file cũ, result metadata, COMMIT. Chỉ PO chạy, không cần ID placeholder.
- Bootstrap tạo mới School1/Vehicle1/Student2/User staff4, tùy chọn Parent1, PARKING_LOT nếu thiếu. Giữ mọi dữ liệu cũ; cùng tag/name/email/code/plate bị chặn. Sinh UUID và student code đúng STU +8 alphanumeric/có chữ/số. New SCHOOL_ADMIN/BUS_ATTENDANT thuộc trường mới; DRIVER/SYSTEM_ADMIN không gắn trường.
- UserAvatar/Login/SQL bản thủ công và source app không sửa. Đã gán default_driver/default_bus_attendant cho hai tuyến mới; 1 DRAFT/2 routes/8 stops/2 links như trước.
- [Hướng dẫn](../implementation/pgadmin-parent-ui-data.md) thêm mode bootstrap/password/parent selection/role emails/extension/limitations, giữ mode ID thủ công. Cập nhật handoffs; archive review trước history/2026-10-28-before-parent-ui-bootstrap.md và .diff (bắt đầu task ngày28, hoàn tất29).
- Không giữ fragment build tạm trong repository; LATEST.diff chỉ artifacts/docs của task, không pending source trước.

## 6. Database Changes
ACTUAL None: agent không connect/execute database hoặc seed.

PROPOSED WHEN PO RUNS: resources test nêu trên + route/link rows mới; CREATE EXTENSION pgcrypto nếu chưa có, temp ID table ON COMMIT DROP. Không ALTER app schema/migrations, UPDATE/DELETE/overwrite dữ liệu cũ hoặc hash/credentials của parent. Uppercase PARKING_LOT hiện có được giữ; legacy value được copy khi cần hoặc bãi demo mới khi trống. All-or-nothing transaction. Nếu extension không ở public, fail không tự di chuyển.

## 7. API & Swagger Changes
None. Không gọi mutation/auth/OTP/notification/GPS. Bypass OTP linking chỉ cho dataset SQL local PO yêu cầu. Không thay quyền app; staff test để PO đăng nhập thực hiện phê duyệt/sinh chuyến sau đó.

## 8. UI/UX Changes
No application UI changes. Dataset minh họa có nhãn UI TEST; coordinates quanh parking/ETA/line shape chỉ để test trình bày, không chứng minh VRP hoặc vị trí thực. Link giúp Theo dõi/Đổi điểm có data; Home cần bước Web approve/generate TripAttendance. File hoàn chỉnh giảm thao tác từ tìm nhiều ID xuống chọn một mật khẩu test, và email/phone chỉ khi cần chọn parent hoặc thiếu phone.

## 9. Verification & Testing
PASS static Prisma DMMF insert-column/required-field checks cho users/schools/system_settings/vehicles/students/route_plans/routes/route_stops/parent_student_links. Routes16 columns gồm default staff; IDs không còn placeholder. PASS parentheses/transaction/no destructive DML/source whitespace và git diff --check. API npx --no-install tsc --noEmit PASS.

PASS pure bcryptjs check với chuỗi ngẫu nhiên trong bộ nhớ: chấp nhận variant2a theo thuật toán bf của pgcrypto. Không in/lưu chuỗi/hash và không tạo User/Session; không chứng nhận PostgreSQL crypt runtime. Không parser PostgreSQL cài thêm, không chạy SQL kể cả rollback/fake DB hoặc fixtures nghiệp vụ để lấy PASS.

NOT_VERIFIED SQL/PLpgSQL runtime/extension privilege/OpenSSL, parent/resources thật đang có, login test accounts, approve/generate và UI sau chạy. Chưa có record nào được agent tạo. Mật khẩu placeholder không phải credential thật; không lưu secret hoặc PII thật trong file/diff.

## 10. Issues & Risks
Script chứa CREATE EXTENSION và tạo account test có quyền admin khi PO chạy; chỉ local dataset theo mục đích được yêu cầu, không phải thay tài khoản thật. PO chọn mật khẩu trong bản copy Query Tool, không commit password vào repo. Nhiều parent cần email/phone; thiếu parent phone cần guardian_phone để dữ liệu học sinh đúng DTO, không bịa số điện thoại. Email .invalid không nhận mail/OTP. Không giả tọa độ là dữ liệu vận hành. Thiếu quyền pgcrypto thì transaction dừng, không có dữ liệu dở dang. Native/API/DB runtime chưa nghiệm thu.

## 11. Reviewer Focus
Một transaction đầy đủ, config auto IDs/temp table, giữ existing parent và password, không reuse hash. Role/school binding và initial staff assignments, code format, required timestamps và no upsert overwrite. DRAFT/approval separation, dataset rõ nhãn demo, guards chống chạy trùng và không lẫn SQL preparation với actual execution.

## 12. Suggested Next Step
PO chạy ROLLBACK nếu transaction cũ lỗi, mở bootstrap-parent-ui.sql, đặt v_test_password trong Query Tool rồi Ctrl+A/F5 trên roadtoschool local.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL. Artifact soạn theo yêu cầu để PO tự thực thi; agent chưa chạm DB. Không commit/push, dừng sau task.
