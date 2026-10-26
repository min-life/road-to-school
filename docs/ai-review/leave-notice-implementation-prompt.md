# ROADTOSCHOOL V2.0 — IMPLEMENT BÁO NGHỈ

Bạn là Antigravity, triển khai module Báo nghỉ học sinh, tài xế và giáo viên phụ xe trên repository RoadToSchool v2.0.

## 1. Chỉ thị và phạm vi đã được Product Owner đồng ý

PO đã duyệt thiết kế DB/API/wireframe tại `docs/ai-review/leave-notice-business-architecture-plan.md` và các quyết định cuối trong prompt này. Chuyển sang IMPLEMENTATION: thực hiện Backend/Database/Web/Mobile/Documentation, không dừng lại sau planning hoặc xin duyệt lại từng phase đã có trong scope. Prompt này cập nhật giới hạn planning-only của các yêu cầu trước đối với module Báo nghỉ.

Đọc theo thứ tự: AGENTS.md → docs/WORKING_RULES.md → docs/BUSINESS_CONTEXT.md → docs/ai-handoff/CODEX_HANDOFF.md → docs/ai-handoff/CURRENT_STATE.md → docs/ai-review/LATEST.md → docs/ai-review/leave-notice-business-architecture-plan.md. Quyết định PO mới nhất trong prompt này được ưu tiên khi tài liệu cũ mâu thuẫn. Đối chiếu source/schema thật trước khi sửa; không coi báo cáo cũ là bằng chứng đã implement.

Kiểm tra git status, lưu baseline riêng cho task để bảo vệ staged/modified/untracked work có sẵn. Không commit/push/rebase/reset/discard/clean. Task diff phải tách được khỏi công việc trước.

## 2. Nghiệp vụ bắt buộc

- Đây là **báo nghỉ**, không phải xin phép. OTP đúng thì notice có hiệu lực ngay. Không thêm trạng thái duyệt/từ chối phép; admin chỉ bố trí người thay hoặc hủy chuyến.
- Ba đối tượng: học sinh do Parent báo; DRIVER tự báo; BUS_ATTENDANT tự báo. Không thêm role TEACHER.
- Chỉ Trip thật đã tồn tại, status SCHEDULED, actualStartTime chưa có và đủ điều kiện mới được báo nghỉ. Chặn VIRTUAL mang nhãn Dự kiến. Không sinh Trip/roster từ options, gửi OTP hoặc confirm. Không sửa cron/generation để hỗ trợ báo lịch dự kiến.
- Chọn ngày, chiều và **một Trip cụ thể** đúng đối tượng; nhiều chuyến cùng ngày/chiều không được tự áp dụng hàng loạt.
- TO_SCHOOL: học sinh/Driver báo trước Start; Attendant báo trước Ready và trước Start.
- TO_PARKING: **mọi đối tượng không được tạo báo nghỉ sau Attendant Ready**. Kiểm tra ở options, gửi OTP và confirm; confirm phải revalidate dưới Trip lock.
- Không ghi đè học sinh đã lên/xuống xe, kể cả ca Ready bị reset do đổi giáo viên.
- Hủy báo nghỉ không cần OTP. Chỉ người tạo notice còn quyền được hủy; các Parent khác còn liên kết cùng học sinh đều xem được nhưng không được hủy thay.
- Học sinh/Driver hủy trước Start; Attendant hủy trước Ready và trước Start. Không tự áp guard Ready chiều về của việc **tạo** sang hủy của Parent/Driver. Chặn hủy trên Trip terminal.
- Driver/Attendant đã được bố trí người thay thì không thể hủy notice, kể cả assignment sau đó về lại người cũ. Giữ dấu lịch sử REPLACED, không chỉ so assigned ID hiện tại.

## 3. OTP — quyết định cuối của PO

- Học sinh: SMS gửi tới **Student.guardianPhone**. Không dùng SĐT tài khoản Parent thay thế, không tự chuyển sang email.
- SMS hiện tại **tạm gửi qua console**, chưa tích hợp nhà cung cấp SMS thật.
- Driver/Attendant: account có email thì gửi email; có SĐT thì gửi SMS console; **có cả email và SĐT thì gửi cả hai**. Dựa trên contact account, không dựa riêng phương thức đăng nhập của phiên hiện tại. Client không được chọn bỏ một kênh hoặc nhập đích khác.
- Một mã/challenge cho cùng lần xác nhận, gửi cùng mã tới các kênh tương ứng; không bắt nhập hai mã. Tái sử dụng OtpChallenge/hash/expiry/attempt cap/rate limit, thêm purpose LEAVE_NOTICE. Không cần bảng giao vận hay enum BOTH.
- Email dùng hạ tầng và config hiện có. SMS console phải dùng chế độ console/development được phép; không âm thầm log mã trong production thông thường, không tự đổi env/secrets.
- Bind actor, subject, tripId, tập contact và selection/assignment/roster cần thiết; revalidate khi confirm. Contact đổi hoặc mất quyền thì challenge cũ không được tiếp tục tạo notice.
- Không trả OTP qua API, Swagger example, UI, LATEST hoặc diff. UI chỉ hiển thị đích đã mask và trạng thái kênh; phân biệt SMS console với SMS thật. Không báo cả hai kênh đã gửi thành công nếu một kênh thất bại; xử lý partial failure/resend tường minh, không resend vô hạn hoặc tạo nhiều challenge còn hiệu lực mâu thuẫn.
- Sai OTP phải lưu attempts thật; tránh increment rồi throw làm rollback attempts. Consume OTP và tạo notice/tác động nghiệp vụ phải nguyên tử, chống replay. Retry sau mất response trả kết quả đã commit đúng actor/payload, không tạo đơn thứ hai hoặc kích hoạt lại notice đã hủy.
- Không gọi SMTP/SMS/network trong transaction khóa Trip kéo dài. Gửi OTP chưa làm phát sinh notice có hiệu lực hoặc thay attendance/assignment.
- Chỉ thay hành vi OTP cần cho module này, bảo vệ các purpose/flow auth khác.

## 4. Điểm danh, phân công và hủy chuyến

**Học sinh:** notice có hiệu lực cập nhật ABSENT, absenceReason đúng chuỗi **“Phụ huynh xin nghỉ”**. Giữ roster/stops/RoutePlan/geometry. Lưu snapshot tối thiểu để hủy khôi phục trạng thái trước tác động; không mặc định reset UNMARKED, không ghi đè thay đổi hợp lệ mới hơn. Các đường điểm danh thủ công/QR phải bảo vệ notice còn hiệu lực. Không tự hủy Trip khi tất cả học sinh nghỉ.

**Nhân sự:** Driver nghỉ → SYSTEM_ADMIN xử lý; Attendant nghỉ → SCHOOL_ADMIN đúng trường xử lý. Gán người thay qua modal trong tab Báo nghỉ, không bắt chuyển sang Trip Detail. Kiểm tra role, active, trường, điều kiện phân công và lịch xung đột thực tế/lịch mặc định còn hiệu lực. Notice chỉ áp dụng một Trip; không suy ra người đó nghỉ cả ngày/chiều.

Giữ Trip.status=SCHEDULED; tính `assignmentStatus=WAITING_ASSIGNMENT|ASSIGNED` từ staff notices pending, **không thêm TripStatus hoặc cột duplicate**. Có pending thì UI hiện Chờ phân công và server chặn Start. Giữ assigned IDs cũ đang bắt buộc trong schema nhưng không coi nhân sự nghỉ là khả dụng. Attendant có notice nghỉ không được Ready.

Gán người thay + cập nhật notice REPLACED phải atomic/CAS. Đổi Attendant reset Ready; chỉ đổi Driver giữ Ready theo logic hiện tại. Hai notice Driver/Attendant pending: xử lý một chưa đủ cho Start. Bảo vệ mọi đường chỉnh assignment cũ để không bỏ qua notice. Khóa Trip đồng bộ với Start/Ready/attendance/cancel; xử lý resource race để hai Trip không đồng thời nhận cùng người thay trùng giờ.

Nếu không bố trí được người thay, admin đúng loại notice/phạm vi trường được **hủy Trip trước Start**, bắt buộc lý do và xác nhận không thể khôi phục. Danh sách có candidate không ngăn admin ghi nhận không thể bố trí ngoài thực tế. Atomic chuyển Trip CANCELLED, audit, đóng staff notices pending liên quan. Không xóa lịch sử/roster, không có khôi phục, không cho generation tái tạo occurrence cancelled. Không mở rộng thành chức năng hủy RoutePlan.

## 5. Database và API

Được triển khai schema đã duyệt: **một bảng LeaveNotice**, tripId thật bắt buộc, kind, reportedById, studentId nullable cho học sinh, otpChallengeId unique, status/timestamps, replacementUserId/processedById/processedAt nullable, attendanceBefore JSON nullable tối thiểu. Status theo plan: RECORDED, PENDING_REPLACEMENT, REPLACED, WITHDRAWN, TRIP_CANCELLED. Ngày/chiều/trường lấy từ Trip, không duplicate không cần thiết.

Thêm OtpPurpose.LEAVE_NOTICE; Trip.cancelledAt/cancelledById nullable; tái sử dụng cancellationReason. Tối thiểu indexes/FKs/constraints cần cho query thực tế, chống active notice trùng đối tượng/Trip nhưng cho phép lưu WITHDRAWN rồi báo lại bằng OTP mới. Không thêm bảng phụ hoặc mở rộng schema ngoài plan.

Được tạo/apply additive migration DDL và Prisma generation cần thiết vào DB local development đang cấu hình, sau khi kiểm tra target/status/drift và SQL. Không tự đổi connection sang môi trường khác. Không reset DB, seed, backfill, DML hoặc chạy data scripts. Nếu có drift hoặc migration cần chuyển dữ liệu thì báo rõ và tiếp tục phần an toàn, không dùng lệnh phá dữ liệu.

Triển khai nhóm API dưới `/api/v1`, DTO/validation/guards/envelope theo conventions:

- GET `/leave-notices/options`: filter học sinh/ngày/chiều, chỉ Trip thật đúng quyền/guard, masked contacts và action flags.
- POST `/leave-notices/otp`: tripId, studentId khi Parent; server quyết định toàn bộ kênh, trả challenge và kết quả kênh đã mask; chưa tạo notice.
- POST `/leave-notices/confirm`: challengeId, otp, selection đã bind; atomic consume/create/apply.
- GET `/leave-notices` và GET `/leave-notices/:id`: history/inbox/detail theo scope, filters/pagination.
- POST `/leave-notices/:id/cancel`: chỉ creator còn quyền, không OTP.
- GET `/leave-notices/:id/replacement-candidates`.
- POST `/leave-notices/:id/assign-replacement`: candidate và CAS expected state.
- POST `/leave-notices/:id/cancel-trip`: reason bắt buộc và expected state.

Bổ sung assignmentStatus/action flags/disabledReason vào các DTO Trip/card/schedule/operational-state cần thiết; quyền server là quyết định cuối. Không leak học sinh khác, contact đầy đủ hoặc dữ liệu ngoài trường. Người nghỉ bị thay vẫn xem được notice của mình mà không cần quyền Trip Detail hiện tại.

Đồng bộ Swagger đầy đủ params/body/response/security/errors, gồm 400/401/403/404/409/429/503 theo hành vi. Kiểm tra thực tế `/api/docs` và `/api/docs-json`; không gọi mutation để chứng minh Swagger.

## 6. Web/Mobile — wireframe đã được PO đồng ý

Triển khai cấu trúc mục 6–7 trong plan, không xin duyệt lại wireframe đã có:

- Home của Parent/Driver/Attendant: thay greeting bằng Tiện ích, utility Báo nghỉ căn giữa, icon trên/tên dưới.
- Card chuyến Home và Lịch: thêm Báo nghỉ theo action flags. Card Parent nhiều con phải xác định từng con, không báo hàng loạt; click nút không kích hoạt mở Trip Detail.
- Utility mở lịch sử/trạng thái và nút thêm. Form Parent chọn học sinh → ngày → chiều → một Trip; staff chọn ngày → chiều → một Trip. Chỉ chọn Trip thật phù hợp.
- Parent Student Detail/Thao tác: Báo nghỉ, cố định và lọc theo học sinh.
- Card đã có dữ liệu: prefill subject/ngày/chiều/Trip → confirm → OTP; không yêu cầu nhập lại và không bỏ OTP.
- Cùng con: Parent khác được xem nhưng không có quyền Hủy. Lịch sử còn sau khi staff bị thay.
- SYSTEM_ADMIN và SCHOOL_ADMIN có tab Báo nghỉ, bảng/bộ lọc/trạng thái theo scope. Modal chọn người thay hoặc hủy Trip có lý do, không có approve/reject phép.
- Refetch sau mutation và tận dụng refresh/focus/poll hiện có để các role thấy attendance/assignment/Chờ phân công; giữ filter/form draft, không tạo polling trùng hoặc reload map mỗi tick.
- Minimal UI Copy, tokens thương hiệu hiện có; loading/empty/error/stale/double-submit rõ ràng; không thêm thư viện UI.

## 7. Kiểm chứng và giới hạn quyền

Hoàn tất implementation trong scope rồi chạy kiểm chứng an toàn: tsc api/web/mobile, Prisma validate/generate/migrate status và kiểm tra DDL, lint/build phù hợp, unit tests pure/in-memory đã kiểm tra không kết nối/ghi DB hay gọi giao vận thật, GET/Swagger read-only. Không cài package mới qua npx nếu chưa có dependency local.

Tests cần kiểm tra eligibility từng role/chiều/Ready/Start, reject VIRTUAL, creator-only cancel, OTP contact fan-out email-only/phone-only/both, SMS console, sai/hết hạn/replay/rate limit/partial failure, attendance snapshot/restore, pending blockers, candidate scope/conflict, races/idempotency/cancelled không phục hồi. Không dùng mocks như bằng chứng giao vận/SMS/UAT thật.

Quyền implementation/migration **không phải quyền tạo dữ liệu test**. Không tự seed/tạo User/Trip/notice/OTP challenge để test, không sửa records thật, không gọi POST/PUT/PATCH/DELETE hoặc click form gửi OTP/thay assignment/hủy Trip để nghiệm thu khi chưa có phạm vi UAT rõ. Không gọi dịch vụ trả phí. Nếu thiếu dữ liệu/quyền runtime: ghi NOT_VERIFIED và BLOCKED_BY_TEST_DATA_POLICY, liệt kê điều kiện cần; vẫn hoàn tất code và kiểm chứng an toàn có thể làm. Không cài dependency mới, không sửa env/secrets.

## 8. Bàn giao và dừng

Archive LATEST.md/LATEST.diff trước khi thay; cập nhật plan theo implementation thật, CURRENT_STATE và LATEST đủ 13 mục. LATEST.diff chỉ gồm task changes so baseline, không gộp diff cũ, secrets hoặc outputs generated.

Báo cáo phần đã implement, files, migration/Swagger/wireframe status, lệnh đã chạy và kết quả thực, phần runtime chưa kiểm chứng. Không tuyên bố READY_FOR_PRODUCTION khi mới static/mocked tests. Không để TODO/stub giả thành chức năng hoàn tất. Chỉ hỏi PO nếu xuất hiện quyết định mới thực sự ngoài scope đã duyệt.

Sau báo cáo chỉ đề xuất một bước tiếp theo phù hợp. **STOP AFTER TASK. Không commit/push, tự chạy UAT ghi dữ liệu hoặc mở module mới.**
