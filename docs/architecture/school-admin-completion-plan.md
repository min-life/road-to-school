# Kế hoạch hoàn thiện Web School Admin

Ngày: 07/11/2026. Trạng thái: **IMPLEMENTED A/B + SA-03 — chờ nghiệm thu thao tác ghi**.
Nguồn: source API/controller/service/DTO hiện hành, working tree P0–P2 và kiểm tra bằng tài khoản SCHOOL_ADMIN có sẵn. PO quản lý cả hai nhánh Web; không thay đổi ma trận phân quyền.

## 1. Mục tiêu và phạm vi
Hoàn thiện chức năng School Admin đã có API, sửa cách gọi API và thông tin sai trên UI, giữ bố cục map/phân công hiện tại. Không xây lại router, không chuyển component hàng loạt, không đổi package hoặc schema. Phần thiếu GET liên kết phụ huynh tách thành contract backend cần duyệt riêng.
Không đưa tạo tuyến/sinh chuyến/đổi xe-tài xế/mở lại chuyến/chốt hành chính/duyệt học bù của nhà xe vào School Admin.

## 2. Đã kiểm tra được gì
### 2.1. Màn hình
Đăng nhập SCHOOL_ADMIN có sẵn và mở 11 đường dẫn trên desktop rồi mobile 390×844: Tổng quan, Học sinh, Giáo viên, Phương án, Chuyến, Báo nghỉ, Sự cố, Yêu cầu, Lịch vận hành, Cài đặt, Thông báo.
- Tất cả tải được nội dung. Danh sách chính không báo API error trong khối alert.
- Chuyến xe phát sinh GET `/schools/:id` 403 bị catch ngầm; không coi trang tải được là contract đúng.
- Mobile Tổng quan scrollWidth 732 > viewport390; các trang danh sách còn lại trong lần đo không tràn document.
- Mở hồ sơ học sinh: GET routing409 vì chưa cấu hình bãi, nhưng UI ghi “chưa được phân tuyến” — sai phân loại lỗi.
- Mở phương án readiness=true, thấy Duyệt phương án; mở xác nhận rồi Escape, không duyệt.
- Tab phân công chỉ có đổi giáo viên, ứng viên tải được, tài khoản không hoạt động disabled; không có đổi xe/tài xế.
- Mở form tạo giáo viên; 3 trường bắt buộc và Hủy/Tạo hiển thị trên mobile. Không tạo.
- Mở chi tiết yêu cầu và form thay thế báo nghỉ phụ xe; không quyết định yêu cầu hoặc phân công.
- Mở form ngày nghỉ/học bù; footer trong viewport, không lưu. School Admin không thấy nút duyệt học bù/hủy thay đổi trường của nhà xe.
- Truy cập `/admin/schools` bị redirect về Tổng quan. Tạo tuyến truy cập trực tiếp vẫn gọi API rồi hiển thị không có quyền; nên guard trước fetch.

### 2.2. API GET thực tế và quyền
200: school settings, students location-options, employees, students, scheduled-changes, service-calendar, approval-readiness, candidate-bus-attendants, attendance, navigation.
403 đúng dự kiến: students của trường khác, trip của trường khác, parents/students bằng token School Admin, admin-finalizations của nhà xe. Không thử bypass bằng token khác, không in token hoặc mật khẩu.
Options geography hiện rỗng do dữ liệu cũ chưa có IDs; không tự tạo options/backfill.

### 2.3. Kiểm tra kỹ thuật
- TypeScript `npm.cmd exec -- tsc --noEmit`: PASS.
- 16 tests hiện có về role/date/lock/selection/audit/link: PASS, không DB.
- Build production P0–P2 đã PASS trong cùng phiên trước lượt lập kế hoạch; không coi đây là kiểm chứng mutation School Admin.
- Không chạy business mutation, migration, seed, mail/provider/cron hoặc ghi GPS. Đăng nhập chỉ phục vụ phiên kiểm tra.
- Những nhánh thành công/xung đột khi ghi và case không có dữ liệu được đánh dấu NOT_VERIFIED, không tuyên bố đã test mọi case.

## 3. Danh mục vấn đề và cách xử lý
SA-01–04 giữ mã từ kiểm toán trước, các mục sau được bổ sung sau kiểm tra sâu.

| ID | Mức ưu tiên | Bằng chứng / vấn đề | Cách hoàn thiện |
|---|---|---|---|
| SA-01 | P1 | Có POST `/schools/:id/employees/:employeeId/credentials/resend`, Web chưa gọi | Nút Cấp lại mật khẩu ở giáo viên active cùng trường, xác nhận, SENT/FAILED/CONSOLE; không hiển thị password |
| SA-02 | P1 | add-teacher-modal bỏ response, teachers/page luôn toast success | Truyền credentialDeliveryStatus ra callback, phân biệt đã tạo với đã gửi mail; không tạo lại khi mail thất bại |
| SA-03 | P2 | GET detail có parentLinkAudit, Web chưa đọc | Type unknown, parse an toàn, lịch sử thu hồi readonly thu gọn; không suy danh tính từ ID |
| SA-04 | P3/Backend | POST revoke có, thiếu GET link hiện hành cho admin | Duyệt contract GET trước; không suy parentId từ guardianPhone/audit |
| SA-05 | P0 | TripsTable.getSchoolDetail nhận403 bằng tài khoản trường | Dùng GET `/schools/:id/settings` cho SCHOOL_ADMIN; SYSTEM_ADMIN giữ nguồn hiện tại; không catch lỗi thành không có contract. Guard tạo tuyến trước fetch, không mở role backend |
| SA-06 | P0 | StudentRoutingSection catch chỉ console; detailnull thành “chưa phân tuyến”, tái hiện409 | Tách loading/error/empty/data, có Thử lại GET; không mất dữ liệu cũ/scope. Request history lỗi cũng hiện error/retry, không hiện như lịch sử trống |
| SA-07 | P0 | Student detail edit dùng fallback tọa độ TP.HCM; kiểm `!lat/!lng`; gõ địa chỉ vẫn giữ tọa độ cũ | Không dùng map center làm data; null khi thiếu, kiểm finite/range cho phép0; gắn vị trí đã xác nhận với địa chỉ; reload detail sau update để nhận geography chuẩn. Không sửa khi DISABLED/đang thuộc tuyến theo quy tắc API |
| SA-08 | P1 | CreateStudentDto chấp nhận `0` hoặc `+84`; Web chỉ 10–11 digits, lại cho số không bắt đầu0 | Chuẩn hóa/validate sát DTO hiện hành, text nhập phù hợp. Không đổi backend regex hoặc biến phone thành parentId |
| SA-09 | P0 | StatusConfirmModal nuốt lỗi disable-impact; nút confirm chỉ khóa loading, không khóa thiếu impact | Error+retry, reset impact khi đổi học sinh, chống late response, không cho xác nhận ngừng khi chưa tải được tác động. Backend vẫn kiểm cuối |
| SA-10 | P1 | TripAssignmentModal chỉ GET employees `limit:50`, không phân trang/tìm server | Tìm/phân trang nguồn lực bằng API đã có, giữ selection qua trang, không tăng limit vô hạn; không bảo đảm availability bằng list đơn thuần |
| SA-11 | P1 | ReplacementModal/ResolveIncidentModal giữ ứng viên/selection cũ sau lỗi mutation, thiếu reload nhất quán | Với400/409 tải lại detail/candidates, xóa lựa chọn lỗi thời, giữ lý do nếu có, không tự gửi lại; phân biệt lỗi tải với danh sách rỗng |
| SA-12 | P1 | Tổng quan mobile document732px trên390px; ảnh và bảng vượt bounds | Sửa min-width/grid/container và vùng scroll bảng, giữ overflow nội bộ thay document; không cắt nội dung hoặc làm banner che tác vụ |
| SA-13 | P1 | RequestDetailModal luôn cho School Admin approve ADDRESS_UPDATE PENDING/notstale; API cấm nếu đang thuộc DRAFT/ACTIVE | Đọc ngữ cảnh routing/membership từ API đã được phép, không cho approve khi chưa xác minh hoặc cần nhà xe. Thông báo “Chờ nhà xe xử lý lộ trình”. Không tự forward/create request. Nếu contract hiện tại không đủ, đề xuất GET detail trả capability có reason và xin duyệt backend riêng |

SA-07/08/09/10/11/13 được xác minh bằng source contract/handler, chưa gửi mutation để cố tái hiện lỗi DB. SA-05/06/12 có bằng chứng browser thực tế.

## 4. Thứ tự triển khai
### Giai đoạn A — P0: độ đúng trước
1. SA-05: loại GET sai quyền; fail-closed khi scope chưa sẵn sàng, guard route nhà xe.
2. SA-06: error khác empty; trả về đúng trạng thái routing/history.
3. SA-07 + SA-09: tọa độ không giả, preflight disable không bị bỏ qua.
Điều kiện xong: không có GET403 ngoài các kiểm tra chặn có chủ ý; thiếu bãi/lỗi mạng không bị hiểu là không có tuyến; confirm status bị khóa khi impact chưa có; không lưu tọa độ fallback.

### Giai đoạn B — P1: thao tác School Admin đầy đủ
1. SA-01 + SA-02: hoàn chỉnh bàn giao tài khoản giáo viên.
2. SA-08 + SA-10 + SA-11: validation hợp contract, danh sách lớn và khôi phục sau xung đột.
3. SA-12 + SA-13: responsive và quyền duyệt yêu cầu theo ngữ cảnh.
Điều kiện xong: không bỏ giáo viên sau trang50; không báo email thành công khi FAILED; không bấm approve sai ngữ cảnh chỉ để chờ server từ chối.

### Giai đoạn C — P2/P3: phụ huynh và nghiệm thu
1. SA-03 readonly dùng GET sẵn có.
2. SA-04 riêng: chốt GET scoped -> triển khai backend/Swagger nếu PO duyệt -> gắn danh sách và revoke chỉ SCHOOL_ADMIN.
3. Nghiệm thu từng nhóm bằng dữ liệu và hành động PO cho phép, kiểm regression System Admin vì có component chung.
Không để SA-04 chặn hoàn thiện A/B hoặc sửa lỗi sẵn có.

## 5. Wireframe đã được PO duyệt
### 5.1. Giáo viên
```text
Giáo viên                               [+ Thêm giáo viên]
Tên · Email · SĐT · Trạng thái             [Chi tiết] [⋯]
                                            Cấp lại mật khẩu

[Cấp lại mật khẩu giáo viên?]
Tên giáo viên · email
Mật khẩu hiện tại sẽ được thay thế.
                         [Quay lại] [Cấp lại mật khẩu]
```
Dùng action chung và LifecycleDialog. Chỉ hiện đúng role/active/scope. FAILED: tài khoản/mật khẩu đã thay đổi nhưng email chưa bàn giao; không toast thành công chung, cho thử cấp lại có xác nhận mới. Không log password ở Web.

### 5.2. Hồ sơ học sinh / lỗi truy vấn
```text
Tuyến đường đưa đón
[!] Chưa tải được thông tin tuyến                 [Thử lại]

Địa chỉ đón/trả
[Ô địa chỉ] [Bản đồ/vị trí đã xác nhận]
                                     [Hủy] [Lưu thay đổi]

[› Lịch sử liên kết phụ huynh]
    Thu hồi · thời điểm · lý do
```
Không thêm đoạn hướng dẫn thường trực; error chỉ hiển thị lúc có lỗi. Audit không thay danh sách link hiện hành.

### 5.3. Chọn giáo viên / yêu cầu
```text
Đổi giáo viên phụ xe
[Tìm tên/email/SĐT…]
[Danh sách theo trang, giữ người đã chọn]
                   [Trước] 1/N [Sau]
                            [Quay lại] [Lưu]

Yêu cầu đổi địa chỉ
[Dữ liệu cũ / mới] [Trạng thái xử lý]
Nếu học sinh đang có tuyến: Chờ nhà xe xử lý lộ trình
                              [Đóng] [Từ chối nếu được phép]
```
Không đổi panel/map hoặc tự thêm bước vào nghiệp vụ. Mọi quyền cuối do API kiểm.

## 6. Files dự kiến
- `web/src/components/admin/trips/trips-table.tsx`; `web/src/app/admin/routes/create/page.tsx`: scope/API trường.
- `web/src/components/admin/students/student-routing-section.tsx`; `web/src/app/admin/students/[id]/page.tsx`; `status-confirm-modal.tsx`; add-student-modal: lỗi/readiness/địa chỉ/phone.
- `web/src/lib/api-client.ts`, `types.ts`: resend response/client; parentLinkAudit, query nếu cần, không bịa field API.
- `web/src/app/admin/teachers/page.tsx`, `teachers/[id]/page.tsx`, `_components/add-teacher-modal.tsx`; shared confirmation nhỏ nếu nhiều caller.
- `trips/[id]/_components/trip-assignment-modal.tsx`; reuse paged resource pattern hiện có trước khi tạo helper mới.
- `leave-notices/_components/replacement-modal.tsx`, `incidents/_components/resolve-incident-modal.tsx`: recovery.
- `components/admin/requests/request-detail-modal.tsx`: capability/error states.
- `app/admin/page.tsx`, `_components/overview-trips.tsx`, CSS liên quan: overflow.
- ParentLink GET backend chỉ sau duyệt: StudentsController/Service/response DTO/Swagger, không schema mới nếu dùng được ParentStudentLink hiện có.
- Docs chuẩn/cách dùng và kiểm thử độc lập phạm vi hẹp cho guard/query/parser mới; không mock response nghiệp vụ để ép PASS.

## 7. Contract backend cần duyệt riêng
Đề xuất GET `/api/v1/schools/:schoolId/students/:studentId/parent-links`, SCHOOL_ADMIN đúng trường, kiểm student thuộc trường. Trả `{items:[{parentId,fullName,phone,email,linkedAt}]}` với trường contact nullable và chỉ dữ liệu cần thiết được PO duyệt. Có phân trang nếu số lượng link cần; không quyết định tự thêm query khi chưa có nhu cầu.
401/403/404 rõ ràng; GET không mutation, không trả password/token; Swagger đồng bộ. POST revoke hiện hành giữ body `{reason}` và quyền. Không cấp quyền System Admin mới chỉ vì cùng frontend.
SA-13: ưu tiên API hiện có đọc membership. Không dùng GET routing làm điều kiện cho phép nếu API đó lỗi. Chỉ bổ sung capability detail khi được PO duyệt rõ; không tự sửa contract trong scope UI.

## 8. Checklist nghiệm thu
- Đúng trường: không thể đọc danh sách/detail/modify trường khác; URL schoolId không ghi đè scope user.
- Đúng role: School Admin phân phụ xe/duyệt plan, không tạo tuyến/sinh chuyến/phân tài xế/đổi xe/chốt hành chính.
- Học sinh: phone0/+84 hợp DTO, missing coordinates/null/0, missing address vs failed GET, disable impact error/load/race/refresh, assigned/unassigned/disabled.
- Giáo viên: create email/phone bắt buộc, SENT/FAILED/CONSOLE, resend busy/success/fail/concurrent, active/inactive/outside scope.
- Phương án: đủ/thiếu xe-tài xế-phụ xe, readiness false/error, needsReoptimization/EXPIRED/CANCELLED, đổi nhóm không mất ngữ cảnh, approve race không optimistic success.
- Chuyến: SCHEDULED editable/Ready/marked/IN_PROGRESS/COMPLETED/CANCELLED; phụ xe phân trang; API kiểm trùng lịch; GPS stale/noGPS; audit readonly; toàn vắng chỉ hiện khi đủ guard.
- Báo nghỉ/sự cố: pending/processed/cancelled trip, ứng viên khả dụng/bận/ngừng, reason/status CAS, retry không tự mutation.
- Yêu cầu: INFO_UPDATE/ADDRESS_UPDATE, có tuyến/không tuyến, stale, studentDisabled, concurrent decision, scope. Không hiện approve nhà trường nếu backend chỉ nhà xe xử lý.
- Lịch: ngày nghỉ/học bù, solar/lunar/annual/leap, past/effective, clash bãi/nhà xe, chỉ system quyết định học bù.
- Thông báo: read-only list/target, read/read-all là mutation không được click để test khi chưa cấp phép.
- UI: 1440×900, 768×1024,390×844, viewport thấp; keyboard/Escape/focus/footer; phân trang/table scroll không document overflow.
- Regression System Admin: dùng chung component nhưng giữ quyền/handler/payload.

## 9. Giới hạn còn lại
Không được nói “đã kiểm thử hết mọi case” khi chưa chạy mutation được cấp phép. Chưa nghiệm thu mail/provider, cron, tranh chấp đồng thời, native/mobile GPS và mọi tình huống nguồn lực>50 vì chưa có dữ liệu phù hợp. Không tạo dữ liệu hoặc đổi bãi chỉ để test; đánh dấu NOT_VERIFIED/BLOCKED_BY_TEST_DATA_POLICY và xin dữ liệu cần thiết đúng tác vụ nếu tới bước đó.
PO đã duyệt triển khai Web trong hội thoại. Không thay backend, không commit/push.

## 10. Kết quả triển khai 07/11/2026

- **SA-01/02:** danh sách và hồ sơ Giáo viên có Cấp lại mật khẩu, dialog xác nhận; tạo/cấp lại phân biệt SENT/FAILED/CONSOLE. FAILED không tạo lại tài khoản, không báo email thành công.
- **SA-03:** hồ sơ Học sinh hiển thị lịch sử thu hồi liên kết từ parentLinkAudit hợp lệ, chỉ đọc. Không suy danh tính từ ID.
- **SA-04: HELD** — chưa có GET danh sách liên kết phụ huynh cho admin; không sửa API hoặc thêm thao tác thu hồi dựa trên dữ liệu suy đoán.
- **SA-05/06:** Chuyến dùng school settings đúng quyền; lỗi giới hạn hợp đồng có retry. Tạo tuyến guard SYSTEM_ADMIN trước fetch. Hồ sơ Học sinh tách lỗi routing/history khỏi rỗng.
- **SA-07/08/09:** bỏ tọa độ giả, xác minh tọa độ và hủy tọa độ khi đổi text/chọn gợi ý; chống response tìm địa chỉ cũ; phone sát DTO 0/+84. Ngừng học sinh cần impact tải thành công đúng đối tượng.
- **SA-10:** đổi phụ xe dùng tìm/phân trang API, giữ người chọn qua trang, không giới hạn danh sách ở 50.
- **SA-11:** báo nghỉ/sự cố tải lại trạng thái và ứng viên sau 400/409, xóa người chọn lỗi thời, không tự gửi lại.
- **SA-12:** sửa containment của bảng Tổng quan; ô sr-only tuyệt đối nằm trong wrapper relative, cuộn bảng nội bộ. Đo document không tràn 390px.
- **SA-13:** tái sử dụng GET disable-impact (hai count DRAFT/ACTIVE đều 0 mới được đổi trực tiếp). Không dùng routing lỗi để cho phép. Kiểm tra lại trước approve; backend quyết định cuối. Không cần endpoint mới cho kiểm tra này.

### Kiểm chứng sau triển khai

- Production build và TypeScript: PASS. 19 tests không DB: PASS.
- ESLint 22 file TS/TSX thay đổi trong lượt: 38 lỗi có sẵn ở baseline, 38 hiện tại, **0 lỗi mới**; không tuyên bố toàn repo sạch lint.
- School Admin: 11 trang desktop và mobile 390×844 tải được, không lỗi GET danh sách ngoài lỗi nghiệp vụ được hiển thị đúng. Trang Chuyến không còn GET trường 403. Mobile không tràn document.
- Yêu cầu địa chỉ có tuyến: thấy “Chờ nhà xe xử lý lộ trình”, Phê duyệt disabled. Routing409 hiện lỗi và Thử lại, không hiện chưa phân tuyến.
- Dialog cấp lại mật khẩu mở được trên mobile, footer trong viewport; không xác nhận gửi mail. Quyền dùng chung được kiểm bằng source và tests; chưa chạy browser đầy đủ bằng System Admin trong lượt này.
- **NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY:** mutation thành công/xung đột, provider email, >50 giáo viên thực tế, parentLinkAudit đủ biến thể; không seed, sửa DB hoặc gửi nghiệp vụ để test. Các case được kiểm chứng bằng source/pure tests không được tính là mutation E2E.
