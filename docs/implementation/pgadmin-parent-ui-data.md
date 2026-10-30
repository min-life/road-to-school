# Chuẩn bị tuyến và liên kết phụ huynh để test UI local

29/10/2026. SQL soạn theo Prisma schema/migrations và services hiện tại. **Agent chưa chạy bất kỳ SQL nào vào database.** Không thay application code hoặc Prisma schema. Đây là ngoại lệ do PO yêu cầu soạn script dữ liệu test để **PO tự chạy**, không phải quyền để agent seed hoặc thay dữ liệu.

## Database chưa có trường/xe/học sinh hoặc không biết ID — dùng bản bootstrap

Dùng một file [bootstrap-parent-ui.sql](sql/bootstrap-parent-ui.sql), không phải tìm/điền các ID. Bản này bổ sung sau khi PO báo các ID của file trước chưa có. Database mặc định đã đặt **roadtoschool** theo cấu hình PO cung cấp; kết nối pgAdmin đúng localhost/port5433 như backend. Không đưa DATABASE_URL/password database vào SQL.

1. Nếu Query Tool đang báo transaction aborted, chạy riêng `ROLLBACK;`.
2. Mở/copy **toàn bộ bootstrap-parent-ui.sql** vào Query Tool của database local.
3. Trong bản copy ở Query Tool, thay `<DAT_MAT_KHAU_TEST>` tại biến `v_test_password` bằng mật khẩu cho **các tài khoản test mới**, ít nhất8 ký tự/tối đa72 byte. Không ghi mật khẩu thật vào file được Git quản lý. Giữ các ID tự động bên dưới.
4. Nếu có đúng một PARENT active/verified, script tự dùng tài khoản đó, không thay mật khẩu/email/phone/hồ sơ. Nếu có nhiều PARENT, chỉ điền `v_parent_identifier` bằng email/phone của tài khoản mobile cần test. Nếu chưa có PARENT, script có thể tạo parent test; cần điền `v_guardian_phone` bằng số của PO. Biến này mặc định tự lấy phone từ parent cũ; chỉ phải điền khi không có phone hợp lệ.
5. **Ctrl+A → F5** chạy toàn bộ file. Xem Messages/Data Output: có ID tự tạo, email các tài khoản test và ID phương án. Mật khẩu không được in; tài khoản cũ vẫn dùng mật khẩu cũ, tài khoản test mới dùng mật khẩu vừa chọn.

Bản bootstrap tạo mới1 trường `[UI TEST]` (hợp đồng từ ngày chạy đến90 ngày sau, lịch thứ2–6,07:30–16:30),1 xe minh họa16 chỗ,2 học sinh AVAILABLE,4 tài khoản nhân sự test,1 phương án DRAFT/2 tuyến/8 stops/2 links. Xe/tài xế/phụ xe được gán sẵn cho cả hai chiều. Nếu chưa có parent và PO cấp phone thì thêm parent test. `PARKING_LOT` hợp lệ có sẵn được giữ; nếu chỉ có key legacy `parking_lot`, tạo uppercase với cùng giá trị; nếu không có cả hai, thêm bãi xe mô phỏng. Không UPDATE/DELETE dữ liệu cũ. Cùng tag/tài khoản/biển số đã tồn tại thì dừng, không ghi đè hoặc khôi phục hồ sơ cũ.

Email mặc định với tag ui-bootstrap-01:

| Role | Email đăng nhập test |
| --- | --- |
| SYSTEM_ADMIN | ui-system-admin@ui-bootstrap-01.example.invalid |
| SCHOOL_ADMIN | ui-school-admin@ui-bootstrap-01.example.invalid |
| DRIVER | ui-driver@ui-bootstrap-01.example.invalid |
| BUS_ATTENDANT | ui-bus-attendant@ui-bootstrap-01.example.invalid |
| PARENT (chỉ tạo khi chưa có parent) | ui-parent@ui-bootstrap-01.example.invalid |

Đây là địa chỉ test `.invalid`, không phải hộp thư nhận OTP/email. Phone giám hộ lấy từ parent hoặc do PO tự cung cấp; script không gửi SMS/email. Tên/địa chỉ có nhãn `[UI TEST]`; tọa độ trường/nhà mô phỏng quanh bãi xe, geometry nối thẳng và ETA tham khảo, không dùng làm bằng chứng routing/VRP/GPS hoặc vận hành thật.

Script chứa `CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public` trong transaction để hash mật khẩu bcrypt bf/cost10; không cài npm/package hay sửa backend. Cần PostgreSQL có pgcrypto/OpenSSL và quyền tạo extension (thường là CREATE trên database); nếu extension đã ở schema khác public thì dừng, không tự di chuyển. [Tài liệu PostgreSQL18 pgcrypto](https://www.postgresql.org/docs/18/pgcrypto.html). Temp table chứa ID tự động bị drop khi commit; mọi lỗi rollback cả transaction, gồm extension mới nếu vừa tạo. Hash không được trả về, không sao chép hash của parent cũ. Syntax/runtime PostgreSQL chưa được thực thi để xác minh; kiểm tra tĩnh không thay runtime test.

Tuyến vẫn DRAFT, không tạo Trip hoặc giả mạo phê duyệt. Muốn có thẻ Home: đăng nhập Web bằng SCHOOL_ADMIN test để duyệt phương án, sau đó SYSTEM_ADMIN test sinh chuyến vào ngày học sau ngày kích hoạt. Các bước ở mục cuối tiếp tục áp dụng; không cần gán tài xế/phụ xe thêm vì bootstrap đã gán sẵn.

## Database đã có tài nguyên và muốn tự chọn từng ID — bản thủ công

1. [parent-ui-preflight.sql](sql/parent-ui-preflight.sql): chỉ SELECT để lấy database name, ID tài khoản/trường/xe/học sinh và cấu hình bãi xe.
2. [create-parent-ui-routes.sql](sql/create-parent-ui-routes.sql): tạo phương án DRAFT, hai chiều đón/trả, stops và liên kết với phụ huynh.
3. [verify-parent-ui-data.sql](sql/verify-parent-ui-data.sql): kiểm tra liên kết, phân công/duyệt và điều kiện hiển thị thẻ chuyến ở Home.

Riêng bản thủ công dùng **User, School, Vehicle, Student có sẵn**, không tự tạo học sinh, tài khoản hoặc trường. Nếu chưa có các bản ghi này, dùng bản bootstrap phía trên. Học sinh phải cùng trường, AVAILABLE, có địa chỉ/tọa độ và chưa nằm trong phương án DRAFT/ACTIVE. Script giữ nguyên các học sinh khác và các liên kết cũ. Các bước/điều kiện ngay dưới đây mô tả bản thủ công; bootstrap đã tự điền ID và tài nguyên.

## Cách chạy trong pgAdmin

1. Chọn đúng database PostgreSQL local → Query Tool → mở và chạy file preflight.
2. Mở file create, điền khối cấu hình ở đầu: expected_database, parent_id, creator_id (SYSTEM_ADMIN), school_id, vehicle_id, student_ids theo thứ tự đón. Các trường ID là TEXT đúng theo schema; lấy nguyên giá trị từ preflight, không cần tự tạo UUID.
3. Giữ tag riêng, ví dụ parent-ui-01; nếu chạy lại cùng tag, script báo đã tồn tại và không ghi đè. Đừng đổi tag chỉ để vượt lỗi xe/học sinh đã được giữ chỗ.
4. Chạy **toàn bộ file create**, gồm BEGIN/DO/COMMIT. SQL có ghi dữ liệu khi PO chạy; đây không phải dry run. Nếu lỗi, transaction rollback; nếu Query Tool còn báo transaction aborted, chạy riêng `ROLLBACK;` trước khi sửa cấu hình và chạy lại.
5. Xem Messages lấy ID phương án và tổng số; kết quả cuối kiểm tra các phương án mang prefix UI-TEST-ROUTE-. Trong file verify, thay mọi `<PARENT_ID>` bằng đúng ID rồi chạy SELECT.

Với N học sinh: thêm **1 RoutePlan DRAFT, 2 Route, 2×(N+2) RouteStop** và tối đa N ParentStudentLink mới. Mỗi học sinh có đúng một PICKUP và một DROPOFF. Liên kết đã tồn tại được giữ bằng ON CONFLICT DO NOTHING. Không UPDATE/DELETE hồ sơ hoặc phân công cũ; tất cả INSERT trong một giao dịch serializable, có khóa theo tag và kiểm tra giữ chỗ.

## Điều kiện và giới hạn

- Parent phải PARENT active/verified; creator phải SYSTEM_ADMIN active/verified. Script không ghi approved_by_id/activated_at hoặc giả lập quyết định của SCHOOL_ADMIN.
- Xe đủ số ghế và không được phương án DRAFT/ACTIVE khác giữ trong hợp đồng chồng lấn. Học sinh không được gắn chồng phương án.
- Trường hoạt động, hợp đồng còn ngày học tương lai, weekly_schedule dùng khóa monday…sunday và start/end HH:mm. `sample_date=NULL` chọn ngày học gần nhất từ ngày mai (tìm tối đa15 ngày từ mốc bắt đầu hợp đồng hợp lệ); đây chỉ là ngày tham khảo lấy giờ, không tạo Trip hay giới hạn ngày áp dụng riêng cho tuyến.
- Bãi xe phải có `system_settings.key='PARKING_LOT'` và tọa độ hợp lệ. Source mới ưu tiên key này; script không dùng tọa độ fallback hoặc key central_parking_yard từ tài liệu lịch sử.
- ID mới dùng gen_random_uuid()::text (PostgreSQL18 có sẵn); timestamps ghi UTC, updated_at điền rõ vì @updatedAt do Prisma client quản lý, không phải mặc định SQL.
- Polyline precision5 nối trực tiếp các tọa độ thật theo thứ tự chọn, chiều trả đảo ngược. Quãng đường là khoảng cách đường chim bay; thời lượng/ETA chia đều chỉ để dựng UI. **Không phải kết quả VietMap VRP, không dùng để nghiệm thu tối ưu, dẫn đường hoặc vận hành thật.** Không sinh GPS/điểm danh/báo nghỉ/OTP/notification.
- Liên kết SQL bỏ qua OTP của luồng ứng dụng theo mục đích local test do PO yêu cầu; không dùng script cho dữ liệu vận hành hoặc đánh giá tính đúng đắn luồng xác minh.

## Muốn có thẻ chuyến ở Trang chủ phụ huynh

Chỉ liên kết học sinh sẽ hiện ở tab Theo dõi và bộ chọn Đổi điểm. Source [getParentHomeCards](../../api/src/trips/trips.service.ts) đòi Trip SCHEDULED/IN_PROGRESS, có roster TripAttendance chưa excluded, và scheduled_end_at còn tương lai hoặc NULL. Vì vậy file create chưa làm thẻ chuyến xuất hiện.

Sau khi chạy SQL:

1. Trên Web, gán tài xế DRIVER và phụ xe BUS_ATTENDANT đúng trường cho cả hai chiều của phương án mới; chọn tài nguyên khả dụng. Xe đề xuất đã được script điền.
2. Đăng nhập SCHOOL_ADMIN của trường để duyệt DRAFT → ACTIVE theo luồng đã có. Nếu có blocker, xử lý trên Web, không UPDATE status trực tiếp để bỏ qua kiểm tra.
3. Đăng nhập SYSTEM_ADMIN → Chuyến xe → Sinh chuyến thủ công, chọn trường và khoảng ngày học **sau ngày kích hoạt theo giờ Việt Nam**, nằm trong hợp đồng. Backend tạo snapshot và roster đầy đủ, kiểm tra xung đột tài nguyên; cron cũng có thể sinh chuyến hợp lệ trước thao tác thủ công, backend sẽ bỏ qua chuyến đã tồn tại.
4. Chạy verify query3 rồi mở/Làm mới Trang chủ mobile của đúng parent_id. Chuyến ngày mai có thể hiện ở Home vì API chọn chuyến phù hợp trong tương lai, không chỉ hôm nay. Mỗi con chỉ có một thẻ được API ưu tiên; query3 liệt kê tất cả chuyến thỏa điều kiện, không mô phỏng thuật toán chọn thẻ.

Không tự backdate approval, đổi trạng thái chuyến hoặc tạo điểm GPS giả. Script không có phần cleanup DELETE; giữ ID trong Messages để tra cứu/quản lý các phương án qua luồng Web hiện có.

## Kiểm chứng

Đã đối chiếu tables/columns, enum, bắt buộc updated_at và quan hệ theo [schema](../../api/prisma/schema.prisma), [route service](../../api/src/routes/routes.service.ts), [resource availability](../../api/src/routes/resource-availability.service.ts), [trip generation/home cards](../../api/src/trips/trips.service.ts), [parent links](../../api/src/parents/parents.service.ts).

Chỉ kiểm tra tĩnh/schema, không kết nối hoặc ghi DB, không chạy SQL kể cả trong rollback transaction. Syntax/runtime PostgreSQL, dữ liệu hiện có, quyền SQL, điều kiện duyệt/sinh chuyến và UI sau chạy đều **NOT_VERIFIED**. Không cài SQL parser, dependency hoặc tạo dữ liệu để chứng minh PASS.
