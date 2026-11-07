# Cập nhật 07/11/2026 — Đồng bộ tài liệu FE theo API

- PO yêu cầu tài liệu FE khớp API hiện hành, các bug API còn lại triển khai sau.
- Đã sửa sai lệch tài liệu R04/R05 và bổ sung contract Mobile/báo nghỉ, cấu hình local cùng giới hạn kiểm chứng trong FE_INTEGRATION_GUIDE.
- R01/R02/R07/R08/R09 vẫn chờ sửa. Mục 13 của hướng dẫn FE ghi hành vi hiện tại và ảnh hưởng tích hợp, chưa đánh dấu các bug này hoàn thành.
- Master plan AA19 lưu quyết định phạm vi. LATEST lưu báo cáo cập nhật tài liệu, báo cáo audit chi tiết trước đó ở history/2026-11-07-before-fe-guide-alignment.md.

# Cập nhật 07/11/2026 — Bản vá F01–F10 đã hoàn tất source

- PO chốt F04-A và F08-A. Reopen dựng dữ liệu chuyến theo tuyến/lịch hiện hành và ghi audit. Trip đã Ready giữ giờ khi ngày đó còn dịch vụ.
- Typecheck, build, lint các file mới sửa và Swagger đạt. Nghiệm thu nghiệp vụ vẫn chờ dữ liệu được cấp.
- Xem master plan AA15, FE guide mục 12 và LATEST. DB local ở mốc 19 migrations đã xác minh trước đó.

# Cập nhật 06/11/2026 — Đã migrate địa giới local

- PO duyệt migrate, đã apply20261106010000_school_student_geography vào roadtoschool/public localhost:5432.19migrations up to date.
- SELECT metadata xác nhận province_id/ward_id/ward của schools và students đều TEXT nullable, migration finished/không rollback. Không backfill/seed/reset hoặc gọi provider.
- API typecheck đạt. Không chạy script test/cron/nghiệp vụ để thử. Dữ liệu cũ chưa có ID vẫn hiện khi bỏ filter, dropdown có thể rỗng.
- Các ghi chú pending địa giới bên dưới là lịch sử trước phê duyệt này. Xem docs/ai-review/LATEST.md và FE guide mục11; runtime/UAT vẫn chưa nghiệm thu.

# Cập nhật 06/11/2026 — Source bộ lọc địa giới, DDL mới chưa apply

- PO đã duyệt provinceId/wardId/ward nullable trên School/Student và query optional cho school/student/preparation. Chỉ áp filter người dùng chọn; eligibility độc lập, không tự dùng tỉnh/phường của trường/bãi.
- Hai GET location-options theo scope đã duyệt, đọc dữ liệu có sẵn, không backfill hoặc gọi VietMap khi GET. Tạo/đổi tọa độ dùng địa giới mới Reverse v4; giữ addressText/payload cũ.
- Migration20261106010000_school_student_geography chỉ tạo DDL, **chưa apply**. Audit migration trước vẫn đã apply18migrations local; source mới cần6cột geography trước runtime.
- Typecheck/build/Prisma validate/generate đạt; SwaggerHTTP200 kiểm2API mới/optional query/response fields, không init DB/scheduler. Không chạy script test/provider/mutation, không sửa env/FE.
- Xem master plan Z7, FE guide mục11, LATEST. Chưa UAT runtime; chưa commit/push.

# Cập nhật 06/11/2026 — Đã apply migration audit local

- Theo phê duyệt mới của PO, đã apply 20261106000000_operation_and_parent_link_audit vào PostgreSQL roadtoschool/public tại localhost:5432.
- 18 migrations up to date; metadata xác nhận trips.operation_audit và students.parent_link_audit đều JSONB nullable. Không reset/seed/backfill hay sửa dữ liệu nghiệp vụ để thử.
- Typecheck API đạt. Không chạy test scripts hoặc khởi động scheduler/API nghiệp vụ. Source client đã generate từ bước trước, schema không đổi trong lượt migrate.
- Các ghi chú migration pending bên dưới là lịch sử trước lần duyệt này. Runtime/FE/UAT vẫn chưa nghiệm thu. Báo cáo: docs/ai-review/LATEST.md.

# Cập nhật 06/11/2026 — Đồng bộ 3.1–3.18, phần độc lập

- Đã cập nhật source API: SĐT+email khi tạo nhân sự, OTP transaction, khóa writer chung, đồng bộ Trip đúng mốc/giữ override, khả dụng nguồn lực, bãi theo ngày/cấu hình bắt buộc, thu hồi Parent link, correction/cancel-all-absent/reopen, GPS/late-risk/close incident, masking Parent và dashboard.
- Schema thêm hai field JSON nullable Trip.operationAudit, Student.parentLinkAudit; migration 20261106000000_operation_and_parent_link_audit **chỉ tạo DDL, chưa apply**. Prisma client đã generate. Không sửa env, không test scripts/seed/provider/mutation để thử.
- Typecheck/build/Prisma validate đạt; Swagger UI/OpenAPI kiểm HTTP không init DB/scheduler. Chưa UAT runtime/đồng thời/cron/FE, không tái sử dụng kết quả193 tests lịch sử để xác nhận code mới.
- Workflow thay plan cùng nhóm học sinh được PO tách chốt riêng; không đánh dấu hoàn tất toàn bộ master plan.
- Plan chung: docs/ai-review/business-improvement-master-plan-3.4-3.18.md mục Z. Contract FE: docs/FE_INTEGRATION_GUIDE.md. Báo cáo: docs/ai-review/LATEST.md.
- Các mốc hoàn tất bên dưới là lịch sử, xem trạng thái và giới hạn cập nhật này trước.

# RoadToSchool — Theo dõi hoàn thiện nghiệp vụ

> Ngày lập: 29/10/2026 (Asia/Saigon).
> Nguồn: phân tích source và trao đổi với PO trong chat ngày 29/10/2026.
> Mục đích: giữ một baseline để theo dõi vấn đề nào đã được chốt, triển khai và nghiệm thu.
> Đây là tài liệu phân tích và đề xuất, không phải phê duyệt triển khai hoặc mở rộng scope.

## Kế hoạch đang dùng cho giai đoạn tiếp theo

Từ 03/11/2026, phân tích/quyết định/contract/gói triển khai **3.4–3.18 được quản lý chung tại [business-improvement-master-plan-3.4-3.18.md](ai-review/business-improvement-master-plan-3.4-3.18.md)**. Các phản hồi PO sau này cập nhật trực tiếp vào file đó, không tách plan từng mục. 3.3 đã có commit d0b4063; giữ source/báo cáo làm baseline, không tự coi mọi luồng đã nghiệm thu runtime.

## 1. Cách cập nhật tiến độ

- Giữ nguyên ID vấn đề để đối chiếu giữa các phiên làm việc.
- Phân biệt lỗi thấy trong source, khoảng trống yêu cầu và tính năng đề xuất.
- Không đánh dấu hoàn tất chỉ vì code đã viết hoặc TypeScript đã đạt.
- Mỗi lần cập nhật cần ghi ngày, quyết định PO, file/commit/báo cáo và bằng chứng kiểm chứng.
- Chỉ đổi sang `VERIFIED` khi tiêu chí nghiệp vụ đã được xác minh; nếu chưa chạy thực tế, ghi rõ giới hạn.
- Không tạo dữ liệu hoặc gọi API làm thay đổi dữ liệu để nghiệm thu nếu chưa được PO cho phép theo Test Data Policy.

| Trạng thái | Ý nghĩa |
|---|---|
| `OPEN` | Đã ghi nhận, chưa có thay đổi được xác nhận |
| `NEEDS_DECISION` | Cần PO chốt quy tắc hoặc phạm vi |
| `APPROVED` | Đã có quyết định PO cho giải pháp cụ thể |
| `IN_PROGRESS` | Đang triển khai theo scope đã duyệt |
| `IMPLEMENTED` | Có thay đổi source, chưa đủ bằng chứng nghiệm thu |
| `VERIFIED` | Đã kiểm chứng tiêu chí nghiệp vụ, có bằng chứng và giới hạn rõ |
| `DEFERRED` | PO quyết định để giai đoạn sau |
| `OUT_OF_SCOPE` | PO xác nhận nằm ngoài phạm vi |

**Baseline:** mọi trạng thái bên dưới phản ánh phân tích trong chat, chưa đánh dấu bất kỳ cải thiện mới nào đã được triển khai. Source có thể thay đổi sau baseline; cần đọc lại trước khi thực hiện.

### 1.1. Nguyên tắc cải thiện API được PO xác nhận — 29/10/2026

**Trạng thái: đã ghi nhận nguyên tắc; chưa cho phép triển khai code.** Áp dụng khi lập kế hoạch và triển khai các cải thiện nghiệp vụ từ tracker này sau khi được duyệt.

1. **Phạm vi triển khai dự kiến chỉ API.** Không tự sửa Web/Mobile để thích ứng với thay đổi API.
2. **Ưu tiên tương thích ngược với frontend đang dùng API cũ.** Hạn chế thay đổi request/response payload hiện có; ưu tiên thêm field, không bớt field.
3. Bảo toàn tên, kiểu, ý nghĩa và cấu trúc field cũ trong khả năng đáp ứng nghiệp vụ; không tự đổi field hoặc biến field tùy chọn thành bắt buộc khiến request cũ bị lỗi. Field đầu vào bổ sung nên tùy chọn khi cần giữ tương thích. Nếu không thể bảo toàn, phải trình bày tác động và hỏi PO trước khi quyết định.
4. **Field hoặc quy tắc còn phân vân phải hỏi PO**, nêu phương án và ảnh hưởng tới client cũ; không tự chọn tên/kiểu/tính bắt buộc/giá trị mặc định hay ý nghĩa nghiệp vụ chưa được chốt.
5. **Ưu tiên tạo API mới cho nghiệp vụ mới khi phù hợp**, để client hiện tại tiếp tục dùng API cũ. Contract và luồng mới vẫn cần được PO duyệt trước triển khai theo WORKING_RULES.
6. Khi đề xuất thay đổi, ghi rõ API cũ bị ảnh hưởng, request/response trước–sau, field thêm mới, thay đổi validation/status/error và hành vi. Giữ nguyên payload không đủ bảo đảm tương thích nếu hành vi hoặc điều kiện gọi API thay đổi.
7. Mục tiêu đầu ra là **giảm tối đa lỗi frontend khi dùng API cũ**. Nếu sửa lỗi nghiệp vụ bắt buộc phải thay hành vi cũ, cần nêu rõ trường hợp ảnh hưởng, lựa chọn API mới/cách chuyển tiếp và xin quyết định PO; không tự giữ một hành vi sai chỉ để tuyên bố tương thích.
8. Không cam kết frontend không lỗi chỉ từ typecheck hoặc việc thêm field; bằng chứng tương thích và giới hạn kiểm chứng phải được báo cáo trung thực, tuân thủ Test Data Policy và đồng bộ Swagger khi thực sự sửa API.

Các nguyên tắc trên không chuyển trạng thái bất kỳ B-xx/P-xx nào sang APPROVED, IN_PROGRESS hoặc IMPLEMENTED, và không phê duyệt thêm bảng/field database.

## 2. Mô hình và đối tượng sử dụng

Một nhà xe, một bãi xe trung tâm, phục vụ nhiều trường. Chưa mở rộng thành nhiều nhà xe hoặc nhiều bãi.

| Vai trò | Nền tảng | Trách nhiệm |
|---|---|---|
| SYSTEM_ADMIN | Web | Trường, hợp đồng, lịch, xe, tài xế, bãi; tạo phương án, gán xe/tài xế, sinh chuyến và điều phối |
| SCHOOL_ADMIN | Web | Học sinh, giáo viên phụ xe, gán giáo viên, duyệt phương án và giám sát trường mình |
| DRIVER | Mobile | Lịch, bắt đầu, đến trường, hoàn thành, dẫn đường và vị trí |
| BUS_ATTENDANT | Mobile | Sẵn sàng, điểm danh lên/xuống, QR, báo và xác nhận sự cố |
| PARENT | Mobile | Liên kết con, lịch, theo dõi, báo nghỉ, yêu cầu thay đổi |

Chỉ SCHOOL_ADMIN duyệt DRAFT → ACTIVE. BUS_ATTENDANT chính là giáo viên phụ xe, không có role TEACHER riêng. Tác nhân tự động gồm sinh chuyến, phát hiện sự cố theo vị trí và xử lý thông báo.

## 3. Bảng và quan hệ tại baseline

Schema được phân tích có 19 model, bao gồm SystemHealth. Handoff cũ ghi 15 model đã không còn đầy đủ tại thời điểm phân tích.

| Model / bảng | Vai trò và quan hệ |
|---|---|
| User / users | Chung 5 role; có thể thuộc School; có Session, Notification và các quan hệ người thực hiện nghiệp vụ |
| Session / sessions | N:1 User; phiên và thiết bị |
| OtpChallenge / otp_challenges | OTP; có thể gắn User/Student; LeaveNotice tham chiếu OTP duy nhất |
| School / schools | Hợp đồng, lịch tuần, tọa độ; 1:N User, Student, RoutePlan, Route, Trip |
| Student / students | N:1 School; hồ sơ, người giám hộ, địa chỉ; có điểm dừng, điểm danh, báo nghỉ và yêu cầu thay đổi |
| ParentStudentLink / parent_student_links | Nối N:N User phụ huynh–Student |
| Vehicle / vehicles | Xe, số chỗ; 1:N Route đề xuất và Trip được gán |
| SystemSetting / system_settings | Cấu hình bãi xe JSON; updatedById không khai báo quan hệ Prisma tới User |
| StudentUpdateRequest / student_update_requests | Gắn Student, School, phụ huynh và người duyệt; lưu dữ liệu trước/đề xuất/kết quả |
| RoutePlan / route_plans | Phương án của School; 1:N Route; người tạo/duyệt/hủy |
| Route / routes | Tuyến một chiều của RoutePlan; xe/người mặc định; 1:N RouteStop, Trip |
| RouteStop / route_stops | Điểm dừng có thứ tự; có thể gắn Student hoặc là trường/bãi |
| Trip / trips | Route theo ngày; gắn School, xe, tài xế, giáo viên; có snapshot lộ trình |
| TripAttendance / trip_attendances | Nối Trip–Student; trạng thái, lý do vắng, người/thời điểm điểm danh, xuống xe, loại khỏi roster |
| TripLocationPoint / trip_location_points | N:1 Trip; vị trí theo sequence/runId |
| LeaveNotice / leave_notices | Trip, OTP, người báo; có thể gắn Student, người thay/xử lý/hủy |
| TripIncident / trip_incidents | N:1 Trip; người báo/xử lý, trạng thái và kết quả |
| Notification / notifications | N:1 User; đích nghiệp vụ qua loại/ID, không phải FK tới mọi bảng đích |
| SystemHealth / system_health | Hạ tầng, không thuộc nghiệp vụ đưa đón |

Phân biệt bắt buộc: RoutePlan là phương án; Route là tuyến một chiều; Trip là lần chạy theo ngày. Student thuộc tuyến qua RouteStop, không gắn thẳng Vehicle. TripAttendance là roster thực tế riêng của chuyến. PRESENT nghĩa đã lên xe; alightedAt mới thể hiện đã xuống xe.

## 4. Các luồng nghiệp vụ và API

Tất cả đường dẫn API có tiền tố `/api/v1`. Đây là ánh xạ từ phân tích source trong chat, không phải biên bản chạy thực tế.

### WF-01 — Tài khoản

**Quyết định bổ sung 06/11/2026:** nhân sự DRIVER/SCHOOL_ADMIN/BUS_ATTENDANT bắt buộc có cả email và số điện thoại khi tạo. Bàn giao mật khẩu vẫn chỉ qua email. Quyết định BUSINESS_APPROVED, chưa triển khai phone required vào API. Client tạo nhân sự phải chuẩn bị cả hai field; chính sách tài khoản cũ thiếu phone còn chờ chốt. Xem auth-api-improvement-plan.md và Master Plan mục Y3.

**Hiện hành:** 3.1 đã IMPLEMENTED theo nhật ký cuối file; các mô tả “chưa triển khai” dưới đây là lịch sử. Chưa VERIFIED gửi thật/runtime.

Phân tích chi tiết: [3.1 — Tài khoản và đăng nhập](ai-review/auth-business-flow-detail.md), gồm AUTH-01..08 ở trạng thái NEEDS_DECISION; chưa duyệt triển khai.

Cập nhật 30/10/2026: quyết định mới tại mục 12 tài liệu chi tiết được ưu tiên: eSMS format test + console dev; nhân sự bắt buộc email và chỉ gửi mật khẩu email; giữ tài khoản riêng từng role; mất số liên hệ trường sửa thông tin học sinh. AUTH-04 chuyển WF-03/WF-08; AUTH-06 chuyển WF-02/WF-16. AUTH-07/08 đang được giải thích, chưa chốt thay đổi. Chưa triển khai code; trạng thái NEEDS_DECISION ban đầu không còn áp dụng đồng loạt.

- Actor: 5 role; phụ huynh tự đăng ký.
- Màn hình: đăng nhập Web/Mobile; đăng ký → OTP; quên/đổi mật khẩu; hồ sơ.
- API: POST `/auth/web/login`, `/auth/mobile/login`, `/auth/register/request-otp`, `/auth/register/verify`, `/auth/forgot-password/request-otp`, `/auth/reset-password`, `/auth/me/change-password`; GET `/auth/me`.
- Khoảng trống: nhân sự nghỉ việc còn chuyến được gán; đổi/mất số người giám hộ; tài khoản hoạt động không đồng nghĩa đủ điều kiện làm việc. Xem P-07, P-10.

### WF-02 — Trường và dịch vụ

**Cập nhật hiện hành 03/11/2026: IMPLEMENTED; migration đã apply DB local; code đã commit/push de2e301; chưa VERIFIED nghiệp vụ/runtime.** Các đoạn quyết định cũ phía dưới là lịch sử. Checklist P1–P6 và phần còn chờ tại [kế hoạch mục 17](ai-review/school-api-improvement-plan.md#17-triển-khai-sau-phê-duyệt--03112026); [note FE/PR](ai-review/school-3.2-fe-pr-notes.md). Đã duyệt field/schema/lịch âm và package; migration local đã apply theo cập nhật cuối file. Không chạy script test.

Chốt 03/11/2026: D3 trước mốc đổi địa điểm plan cũ tiếp tục, đến ngày hủy plan cũ rồi tạo mới; D7 đồng ý hủy đến ngày cho fixed/nonfixed, rút trước ngày giữ Trip gốc và nghỉ nhà xe chặn học bù đã duyệt; D8 đồng ý bảng phân loại + R1 giữ bận tài nguyên Trip ngoại lệ tới khi admin chốt. Xem school-api-improvement-plan.md mục 15. Field/schema cụ thể và một số quy tắc ngày/âm lịch còn chờ; chưa IMPLEMENTED.

Phản hồi plan 02/11/2026: PO đồng ý hai model mới ở mức hướng thiết kế; D1 admin finalization; D2 cấm học bù trùng mọi ngày nghỉ nhà xe; D4 thêm ngày vào API cũ; D5 Parent không cần unlink và hết contract không khóa account; D6 đồng ý hướng đề xuất. D3/mục 8, D7, D8 cần giải thích/chọn tiếp, schema/field/default chưa duyệt và chưa triển khai. Xem school-api-improvement-plan.md mục 14.

Kế hoạch API 3.2: [school-api-improvement-plan.md](ai-review/school-api-improvement-plan.md), lập 02/11/2026; sáu phần P1–P6, contract/schema và tám nhóm quyết định còn mở. WAITING_APPROVAL; chưa triển khai, chưa duyệt bảng/field/migration mới; tiếp tục cấm script test.

PO chốt thêm 02/11/2026: chuyến ngoại lệ chưa hoàn thành giữ trạng thái, admin chốt trạng thái cuối, không tự complete/cancel vì qua ngày. Admin role, trạng thái cuối, dữ liệu điểm danh, giới hạn thao tác trong lúc chờ và ranh giới Trip cần chốt khi thiết kế; không tự mở rộng thành giữ mọi SCHEDULED tương lai. Xem school-business-flow-detail.md mục 17. Chưa triển khai.

PO điều chỉnh 02/11/2026: hết hợp đồng coi như hủy các phương án cũ và giải phóng nguồn lực, thay thế ý kiến trước giữ nguyên trạng thái plan. Giữ lịch sử Trip hoàn thành; ngoại lệ Trip còn IN_PROGRESS qua ngày và quyền hoàn tất của nhân sự vẫn chưa chốt. Xem school-business-flow-detail.md mục 16.

Quyết định mới nhất 02/11/2026 (ưu tiên cập nhật cũ): hết hợp đồng chỉ giải phóng nguồn lực, giữ nguyên thông tin/phân công/lộ trình và không tự chuyển trạng thái phương án; đổi địa chỉ vẫn hủy toàn bộ phương án; giữ Trip COMPLETED, IN_PROGRESS và chiều về đã điểm danh còn chờ PO chốt. Học bù không vượt ngày nghỉ hệ thống cố định, được vượt ngày nghỉ trường sau quy trình duyệt đã chốt. Xem school-business-flow-detail.md mục 15; chưa triển khai.

Cập nhật quyết định PO 30/10/2026: xem mục 13–14 của school-business-flow-detail.md. Đã có phản hồi SCH-01..11: inactive theo ngày từ mai tới hết hợp đồng, hạn chế tài khoản/phụ huynh, gia hạn có kiểm tra nguồn lực, lịch nghỉ âm/dương hệ thống/trường và học bù duyệt, lịch mới không ảnh hưởng hôm nay, giữ giờ/địa chỉ cũ, hết hạn giải phóng và về DRAFT, lưu riêng/liên hệ trực tiếp, đổi địa điểm khi không DRAFT/ACTIVE và có lịch hiệu lực. Chưa IMPLEMENTED; cần giải quyết DRAFT sau hết hạn với giữ nguồn lực/đổi địa điểm và phạm vi hủy lịch sử trước plan API.

Phân tích chi tiết 3.2: [school-business-flow-detail.md](ai-review/school-business-flow-detail.md), gồm SCH-01..11 để PO chốt; chỉ phân tích, chưa triển khai. AUTH-06 được tiếp nhận tại nhóm này.

- Actor: nhà xe quản lý; nhà trường xem cấu hình trường mình.
- Thao tác: thêm trường, hợp đồng, tọa độ, lịch tuần; xem tác động trước thay đổi.
- API: POST/GET `/schools`; GET `/schools/:id`; PATCH `/schools/:id/contract`, `/schedule`, `/location`, `/status`; GET `/schools/:id/location-impact`.
- Hiện có: chặn sửa hợp đồng khi còn plan DRAFT/ACTIVE; đổi lịch xử lý các chuyến SCHEDULED.
- Vấn đề: lịch ngoại lệ, đổi lịch sau Ready, snapshot giờ chạy, gia hạn không gián đoạn. Xem B-05, P-01, P-05.

### WF-03 — Nguồn lực và bãi

**Hiện hành 03/11/2026:** PO xác nhận đã làm 3.3; source tại commit d0b4063 có inactive/bàn giao xe/nhân sự, đổi bãi theo ngày và re-optimize từng tuyến. Các khoảng trống trong baseline dưới đây cần đối chiếu source mới, không coi là toàn bộ chưa triển khai. (Status: IMPLEMENTED — 03/11/2026)

- Actor: SYSTEM_ADMIN (nhà xe quản lý xe/tài xế/bãi/nhân sự toàn hệ thống); SCHOOL_ADMIN (quản lý giáo viên phụ xe trường mình).
- Thao tác:
  - Phương tiện: Quản lý trạng thái nhị phân (`isActive`). Chặn vô hiệu hóa khi có chuyến `IN_PROGRESS`. Bắt buộc truyền xe thay thế hợp lệ (`replacementVehicleId`) để bàn giao nguyên tử toàn bộ tuyến `ACTIVE` và chuyến `SCHEDULED`.
  - Nhân sự: `SYSTEM_ADMIN` inactive tài xế/nhân sự toàn hệ thống; `SCHOOL_ADMIN` inactive giáo viên trường mình. Bắt buộc truyền nhân sự thay thế hợp lệ (`replacementUserId`) để bàn giao nguyên tử và thu hồi toàn bộ session đăng nhập.
  - Bãi đỗ xe trung tâm: Đổi vị trí bãi xe theo lịch hẹn ngày hiệu lực (`effectiveDate` >= ngày mai). Không hủy RoutePlan, chỉ đánh dấu `needsReoptimization = true` kèm lý do; chỉ hủy các chuyến `SCHEDULED` từ ngày hiệu lực trở đi.
  - Đặt tên Tuyến: Bỏ hoàn toàn biển số xe khỏi tên tuyến; áp dụng format unique chuẩn `TD01-[Mã 8 ký tự]` (chiều đi) và `TV01-[Mã 8 ký tự]` (chiều về).
  - Tối ưu lại RoutePlan (`POST /routes/route-plans/:id/re-optimize`): Tối ưu theo từng tuyến (Route-by-Route), bảo toàn xe và học sinh của tuyến, chỉ ràng buộc thời gian di chuyển tối đa và thời gian dừng. Cơ chế All-or-Nothing: nếu có 1 tuyến không thể tối ưu thì dừng và báo lỗi, không cập nhật DB. Thành công đưa phương án về `DRAFT` chờ School Admin duyệt.
- API:
  - `GET /vehicles/:id/deactivation-impact`, `PATCH /vehicles/:id/status`
  - `GET /drivers/:id/deactivation-impact`, `PATCH /drivers/:id/status`
  - `GET /schools/:id/employees/:employeeId/deactivation-impact`, `PATCH /schools/:id/employees/:employeeId/status`
  - `GET /system-settings/parking-lot/impact`, `PUT /system-settings/parking-lot`, `POST /system-settings/parking-lot/cancel-scheduled-change`, `POST /system-settings/parking-lot/apply-scheduled-change`
  - `POST /routes/route-plans/:id/re-optimize`
- Database:
  - Migration `20261103023000_vehicle_status_and_route_plan_reoptimization`: thêm `isActive` vào `Vehicle`; thêm `needsReoptimization` và `reoptimizationReason` vào `RoutePlan`. Lưu lịch hẹn dời bãi trong `system_settings.value.scheduledChange` (JSONB).

### WF-04 — Học sinh và phụ huynh (Status: DECIDED — 04/11/2026)

- Actor: SCHOOL_ADMIN tạo học sinh; PARENT liên kết.
- Thao tác: thêm học sinh; phụ huynh nhập mã → OTP số giám hộ → xác nhận; xem/hủy liên kết.
- API: POST `/schools/:schoolId/students`; POST `/parents/link-requests`, `/parents/verify-link`; GET `/parents/students`, `/parents/students/:id`; DELETE `/parents/students/:id`.
- Quyết định PO đã chốt (04/11/2026):
  + **D34-01**: Đổi số `guardianPhone` giữ nguyên liên kết phụ huynh hiện có; School Admin có thao tác riêng thu hồi liên kết sai sau khi xác minh ngoại tuyến kèm lý do audit; không tự động unlink hàng loạt khi đổi số.
  + **D34-02**: Không hỗ trợ chuyển trường trong đợt này (giữ quản lý học sinh trong phạm vi một trường duy nhất, không thêm schema chuyển trường).
  + **Phân quyền Phụ huynh**: Không phân cấp phụ huynh chính / phụ; mọi tài khoản phụ huynh liên kết đều có quyền hạn bình đẳng trong theo dõi, nhận thông báo và nộp đơn.

### WF-05 — Tạo phương án (Status: DECIDED — 04/11/2026)

- Actor: SYSTEM_ADMIN.
- Thao tác: chọn trường, học sinh, xe/ràng buộc → tối ưu → xem bản đồ → xác nhận DRAFT.
- API: GET `/routes/preparation/:schoolId`; POST `/routes/optimize-preview`, `/routes/preview/cancel-return`, `/routes/confirm-plan`.
- Quyết định PO đã chốt (04/11/2026):
  + **D35-01**: Cho phép tạo DRAFT cho các học sinh đã xếp tuyến thành công; công bố rõ danh sách các em chưa có tuyến để điều phối riêng, không đưa vào roster/coverage đã phục vụ.
  + **D35-02**: Theo Đề xuất A cả 2 phần (Khảo sát thực địa an toàn điểm đón là nghiệp vụ offline giữa trường và nhà xe; quản lý thời gian bằng tổng thời gian toàn tuyến `maxRouteDurationMinutes`, không đưa quy trình duyệt an toàn điểm đón hay trần thời gian ngồi xe riêng của từng em vào app).
  + **Tính năng mở rộng 1 (Lọc Tỉnh/Thành phố)**: Thêm trường `province` cho `School` và `Student`, tự động bóc tách từ Vietmap Reverse Geocoding API (`city`/`province`) khi lưu địa chỉ/tọa độ để filter tức thời trên DB.
  + **Tính năng mở rộng 2 (Bán kính bãi xe)**: Thêm cấu hình `maxOperatingRadiusKm` vào cài đặt bãi xe (`system_settings.value.maxOperatingRadiusKm`). Tự động tính khoảng cách Haversine từ điểm đón đến bãi xe, cảnh báo đỏ và chặn duyệt nếu vượt bán kính hoạt động.

### WF-06 — Gán nguồn lực và duyệt

- Actor: nhà xe gán xe/tài xế; trường gán giáo viên và duyệt.
- Thao tác: mở phương án → ứng viên → lưu phân công → xem readiness → trường duyệt.
- API: GET `/routes/route-plans/:id`, `/approval-readiness`; PATCH `/routes/route-plans/:id/assignments/vehicle`, `/driver`, `/bus-attendant`; POST `/routes/route-plans/:id/approve`.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D36-01 (Phương án A)**: Đổi xe/tài xế trên ACTIVE mà không đổi lộ trình/giờ/học sinh thì KHÔNG cần School Admin duyệt lại.
  + **D36-02 (Có hiệu lực ngay lập tức)**: Đổi nguồn lực mặc định sẽ tự động cập nhật ngay lập tức sang các Trip chưa frozen (status `SCHEDULED`, chưa Ready, chưa điểm danh theo G-02) từ hôm nay trở đi; không cần chờ đến ngày mai hay nhập ngày chỉ định.
  + **Ràng buộc cấm lặp lại nguồn lực**: Trong cùng một RoutePlan, 1 nguồn lực (Xe, Tài xế, Phụ xe) chỉ được phân công cho DUY NHẤT 1 nhóm tuyến. Chặn tại candidate APIs (`isEligible: false`) và validate assignment APIs (400 Bad Request).

### WF-07 — Sinh chuyến và lịch (Status: DECIDED — 04/11/2026)

- Actor: nhà xe/tự động sinh; nhân sự và phụ huynh xem.
- Thao tác: chọn trường/khoảng ngày, sinh; xem lịch Web hoặc Mobile.
- API: POST `/trips/generate`; GET `/trips`, `/trips/:id`, `/trips/mobile/driver/schedule`, `/trips/mobile/bus-attendant/schedule`, `/trips/mobile/parent/student/:studentId/schedule`.
- Baseline: cron 02:00, mặc định nhìn trước 7 ngày; ACTIVE, lịch tuần, trong hợp đồng; ngày chạy sau ngày kích hoạt; một Route–ngày tối đa một Trip; snapshot và roster riêng.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D37-01 (Phương án B - Khôi phục CANCELLED → SCHEDULED)**: Cho phép mở lại chuyến xe đã hủy bằng `POST /trips/:id/reopen` tuân thủ 5 điều kiện kiểm soát (trước giờ khởi hành `scheduledStartAt`, xe/tài xế/phụ xe rảnh & active, RoutePlan ACTIVE, reset roster UNMARKED bảo lưu đơn nghỉ đã duyệt, SYSTEM_ADMIN nhập lý do và bắn push/inbox ngay lập tức).
  + **D37-02 (Đề xuất A - firstServiceDate)**: Thêm metadata `firstServiceDate` (tự động tính ngày phục vụ hợp lệ đầu tiên sau kích hoạt) trả về cho API để Web/Mobile hiển thị rõ ràng ngày đầu tiên xe lăn bánh đón học sinh.

### WF-08 — Đổi phân công Trip (Status: DECIDED — 04/11/2026)

- Actor: nhà xe đổi xe/tài xế; trường đổi giáo viên.
- Thao tác: chi tiết chuyến → phân công → chọn và lưu.
- API: PATCH `/trips/:id/assignment`.
- Hiện có: kiểm tra số chỗ, người hợp lệ và trùng lịch; giới hạn theo trạng thái.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D38-01 (Đề xuất A)**: Chặn tuyệt đối việc bấm Start chuyến tiếp theo nếu chuyến trước của tài xế/xe vẫn đang `IN_PROGRESS`. Ghi nhận cảnh báo sự cố cần Admin phân công lại nếu chuyến trước không hoàn tất trước giờ chạy chuyến sau một khoảng đệm an toàn.
  + **D38-02 (Đề xuất A - Rule G-02)**: Khóa cứng nút đổi phân công thông thường khi chuyến đã Ready hoặc đã điểm danh (`isFrozen = true`). Mọi thay đổi trong trường hợp này bắt buộc xử lý qua quy trình Báo sự cố khẩn cấp (Mục 3.17).

### WF-09 — Chiều đến trường (Status: DECIDED — 04/11/2026)

- Actor: giáo viên và tài xế; phụ huynh theo dõi.
- Bước: Ready → Start → điểm danh dọc đường → đến trường → xuống xe → Complete.
- API: POST `/trips/:id/attendant-ready`, `/start`; PUT `/trips/:id/attendance/:studentId`; POST `/trips/:id/attendance/verify-qr`, `/arrive-at-school`; PUT `/trips/:id/attendance/:studentId/alighting`; POST `/trips/:id/complete`.
- Hiện có: trước đến trường phải hết UNMARKED; vắng có lý do; hoàn thành sau khi mọi PRESENT đã xuống.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D39-01 (Đề xuất A)**: Không dùng timer cứng máy móc; giáo viên gọi phụ huynh, sau thời gian chờ thực tế (2-3 phút) không liên lạc được thì tự tay chọn `ABSENT` và nhập lý do.
  + **D39-02 (Đề xuất A & Cơ chế sửa điểm danh)**:
    - *Khi chưa đến trường*: Giáo viên được sửa trực tiếp trạng thái trên app (`ABSENT ↔ PRESENT` kèm lý do, hoặc hoàn tác `UNMARKED`), hệ thống gửi thông báo đính chính chuẩn xác cho phụ huynh.
    - *Khi đã đến trường*: Khóa hoàn tác `UNMARKED` và khóa quét QR đón mới; cho phép thao tác Điều chỉnh (Correction) có lý do audit trước khi kết thúc chuyến, không phát thông báo `BOARDING` giả.

### WF-10 — Chiều về bãi (Status: DECIDED — 04/11/2026)

- Actor: giáo viên và tài xế; phụ huynh theo dõi.
- Bước: Ready → điểm danh tại trường khi SCHEDULED → Start khi hết UNMARKED (và có ít nhất 1 PRESENT) → xuống tại từng điểm → Complete. Dùng API WF-09, không có arrive-at-school.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D310-01 (Đề xuất A)**: Chặn Start chuyến đưa đón khi 100% học sinh vắng mặt. Giáo viên phụ xe (`BUS_ATTENDANT`) trực tiếp bấm nút xác nhận hủy chuyến đưa đón trên app Mobile (Admin trên Web có quyền hủy dự phòng). Không phát event lộ trình cho phụ huynh, xe chạy về bãi theo điều chuyển nội bộ.
  + **D310-02 (Đề xuất A)**: Khi không có người đón tại trạm, giáo viên giữ trẻ an toàn trên xe, tuyệt đối không bấm xuống xe (`alightedAt = null`), ghi nhận sự cố `NO_GUARDIAN_AT_STOP` đưa bé về lại trường/nhà xe. Chưa áp dụng mã OTP/QR nhận trẻ.

### WF-11 — Theo dõi và lịch sử (Status: DECIDED — 04/11/2026)

- Actor: tài xế phát vị trí; các bên xem theo quyền.
- Thao tác: mở bản đồ/dẫn đường, theo xe, xem hành trình.
- API: GET `/trips/:id/navigation`, `/location-history`, `/operational-state`; PUT `/trips/:id/navigation/session`, `/navigation/position`; POST `/trips/:id/navigation/segment`.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D311-01 (Đề xuất A — Sửa dứt điểm bug B-01)**: Chuyến `IN_PROGRESS` luôn giữ ưu tiên hiển thị số 1 trên Trang chủ của Tài xế, Phụ xe và Phụ huynh cho đến khi thực sự `COMPLETED`/`CANCELLED`. Không loại bỏ khỏi câu query khi đã quá `scheduledEndAt`.
  + **D311-02 (Đề xuất A)**: Phụ huynh được xem bản đồ theo dõi xe trực tiếp xuyên suốt thời gian chuyến `IN_PROGRESS` (được bảo vệ quyền riêng tư bằng Privacy Masking: chỉ thấy xe buýt, điểm đón con mình và trường học).

### WF-12 — Học sinh báo nghỉ (Status: DECIDED — 04/11/2026)

- Actor: PARENT.
- Thao tác: chọn con/ngày/chiều/Trip → OTP → xác nhận → xem hoặc rút đơn.
- API: GET `/leave-notices/options`, `/leave-notices`, `/leave-notices/:id`; POST `/leave-notices/otp`, `/confirm`, `/:id/cancel`.
- Hiện có: dựa trên Trip đã lưu; ràng buộc trạng thái/điểm danh; chiều về khóa sau Ready.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D312-01 (Đề xuất A)**: Chỉ người tạo đơn mới có quyền rút đơn (`reportedById === currentUser.id`) để tránh xung đột gia đình và đảm bảo tính nhất quán trách nhiệm.
  + **D312-02 (Đề xuất A)**: Giữ quy tắc mỗi đơn báo nghỉ độc lập theo từng chuyến/chiều. Không làm bulk OTP nhiều ngày trong đợt này. Báo muộn sau khi xe đã Start/Ready thì liên hệ trực tiếp ngoài app.

### WF-13 — Nhân sự báo nghỉ (Status: DECIDED — 04/11/2026)

- Actor: DRIVER/BUS_ATTENDANT báo OTP; quản trị viên bố trí.
- Thao tác: chọn chuyến, báo → quản trị viên xem ứng viên → thay hoặc hủy chuyến.
- API: luồng OTP WF-12; GET `/leave-notices/:id/replacement-candidates`; POST `/leave-notices/:id/assign-replacement`, `/:id/cancel-trip`.
- Hiện có: còn chờ thay nhân sự thì không Start.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D313-01 (Đề xuất A)**: Đơn đã có người thay (`REPLACED`) thì khóa cứng, người cũ không được tự ý rút đơn trên app. Người thay nhận việc ngay qua push/inbox theo G-03.
  + **D313-02 (Đề xuất A)**: Nghỉ đột xuất dùng `LeaveNotice` WF-13; nghỉ dài ngày (ốm/thai sản/chuyển công tác) xử lý bằng tính năng đổi nhân sự mặc định của tuyến (Mục 3.6), có hiệu lực ngay và đồng bộ toàn bộ Trip theo D36-02. Không phát triển thêm module nghỉ dài ngày trên mobile.

### WF-14 — Yêu cầu sửa thông tin/địa chỉ (Status: DECIDED — 04/11/2026)

- Actor: phụ huynh gửi; trường duyệt thông tin; nhà xe xử lý địa chỉ có tuyến.
- Thao tác: chi tiết con → yêu cầu → OTP; quản trị viên xem, preview nếu ảnh hưởng tuyến, duyệt/từ chối.
- API: POST `/parents/students/:id/update-requests/otp`, `/verify`; nhóm `/schools/:schoolId/update-requests`; POST `/system-admin/update-requests/:requestId/routing-preview`, `/approve`, `/reject`.
- Hiện có: trường không tự duyệt địa chỉ khi học sinh thuộc plan DRAFT/ACTIVE.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D314-01 (Đề xuất A — Sửa dứt điểm Bug B-02)**: Khi duyệt `REOPTIMIZED`, bắt buộc `previewToken` và `expectedFingerprint` phải hợp lệ, còn hạn (TTL 10 phút) và mô phỏng phải là `FEASIBLE` (100% khả thi). Nếu stale hoặc không khả thi thì trả lỗi 409/400. Tuyệt đối không cho phép "Force Approve". Nếu tuyến không thể đón địa chỉ mới, Admin từ chối hoặc chọn `REMOVED_FROM_ROUTES`.
  + **D314-02 (Đề xuất A — Đồng bộ ngay khi phê duyệt)**: Khi phê duyệt đổi địa chỉ, hệ thống thực hiện đồng bộ ngay lập tức vào tất cả các chuyến xe `SCHEDULED` chưa bị đóng băng (chưa `attendantReadyAt`, chưa `actualStartTime`, không phải `IN_PROGRESS`/`COMPLETED` theo quy tắc G-02), không đợi đến ngày mai hay đợi cronjob đêm. Các chuyến đã đóng băng (đã Ready/đang chạy) được giữ nguyên dữ liệu cũ. Snapshot điểm dừng của các chuyến chưa frozen được làm mới ngay.

### WF-15 — Chèn học sinh và ngừng phục vụ (Status: DECIDED — 04/11/2026)

- Actor: nhà xe chèn; nhà trường đổi trạng thái học sinh.
- Thao tác: xem tuyến → chọn cặp tuyến → preview → xác nhận; disable xem tác động trước lưu.
- API: GET `/routes/students/:studentId/routing`, `/insertion-options`; POST `/routes/student-insertions/preview`, `/confirm`; GET `/schools/:schoolId/students/:id/disable-impact`; PATCH `/schools/:schoolId/students/:id/status`.
- Hiện có: preview và confirm chèn học sinh; cascade nguyên tử khi disable học sinh.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D315-01 (Đề xuất A — Sửa dứt điểm Bug B-04)**: Khi System Admin xác nhận chèn học sinh (`confirmStudentInsertion`), hệ thống đồng bộ tức thì vào toàn bộ các chuyến `SCHEDULED` chưa bị đóng băng (chưa `attendantReadyAt`, chưa `actualStartTime`, không phải `IN_PROGRESS`/`COMPLETED` theo G-02): tự động tạo bản ghi `TripAttendance` và cập nhật lại `routeSnapshot` (điểm dừng, thứ tự đón, giờ đón dự kiến). Các chuyến đã đóng băng được bảo toàn nguyên trạng.
  + **D315-02 (Đề xuất A)**: Áp dụng vô hiệu hóa học sinh (`DISABLED`) tức thì cho các chuyến `SCHEDULED` chưa frozen (loại học sinh khỏi danh sách điểm danh, cập nhật snapshot chuyến, tự động hủy chuyến nếu không còn học sinh). Giữ nguyên dữ liệu các chuyến đã đóng băng. Khi kích hoạt lại (`AVAILABLE`), học sinh trở về danh sách Chưa phân tuyến, tuyệt đối không tự động gán lại tuyến cũ.

### WF-16 — Hủy phương án/hết hợp đồng (Status: DECIDED — 04/11/2026)

- Actor: quản trị viên theo phạm vi.
- Thao tác: xem tác động → nhập lý do → hủy; đối soát hợp đồng hết hạn.
- API: GET `/routes/route-plans/:id/cancellation-impact`; POST `/routes/route-plans/:id/cancel`.
- Hiện có: xem tác động; cascade hủy chuyến SCHEDULED; giữ chuyến IN_PROGRESS/COMPLETED.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D316-01 (Đề xuất A — Sửa dứt điểm Bug B-06)**: Khi hủy thủ công, bắt buộc kiểm tra `expectedFingerprint` (409 nếu stale). Chỉ hủy các chuyến `SCHEDULED` chưa vận hành (chưa Ready, chưa Start, chưa có điểm danh). Bảo toàn tuyệt đối các chuyến đang chạy hoặc chiều về đã Ready/đã đón trẻ để đưa học sinh về an toàn. Tài nguyên chỉ giải phóng sau khi chuyến xe cuối cùng hoàn tất.
  + **D316-02 (Định hướng PO)**: Một trường học có thể có nhiều phương án `ACTIVE` đồng thời, phục vụ các nhóm học sinh hoàn toàn tách biệt nhau (Disjoint Groups). Nếu plan mới được tạo để thay thế một plan cũ (cùng nhóm học sinh), plan cũ sẽ bị chuyển sang `SUPERSEDED`/`CANCELLED` và thay thế lịch chuyến từ ngày mai theo G-01 & G-02.

### WF-17 — Sự cố (Status: DECIDED — 04/11/2026)

- Actor: tài xế/giáo viên báo; quản trị viên xử lý; giáo viên xác nhận tự động.
- Thao tác: báo người còn lại chưa đến → ứng viên → người cũ đến/thay/hủy; xem cảnh báo lệch tuyến/trễ điểm.
- API: GET `/trips/:id/incident-options`; POST `/trips/:id/incidents`; GET `/incidents`, `/incidents/:id/replacement-candidates`; POST `/incidents/:id/resolve`, `/cancel-trip`, `/confirm`.
- Hiện có: báo thiếu người, cảnh báo OFF_ROUTE/LATE_STOP tự động.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D317-01 (Đề xuất A — Sửa dứt điểm Bug B-03)**: Khi resolve `REPLACED`, bắt buộc recheck khả dụng tại mutation: kiểm tra không trùng lịch chạy xe, không có `LeaveNotice`, tài khoản hoạt động/verified. Trả lỗi 409 Conflict nếu bận. Tuyệt đối không có ngoại lệ force-assign.
  + **D317-02 (Đề xuất A kèm điều chỉnh của PO)**:
    - Giảm ngưỡng Telemetry: `OFF_ROUTE` giảm còn `> 50m` trong `≥ 15s`; `LATE_STOP` giảm còn `> 3 phút` trong `≥ 15s`.
    - Bổ sung 3 loại sự cố mới: `NO_GUARDIAN_AT_STOP` (không có người đón học sinh chiều về), `TRAFFIC_DELAY` (kẹt xe/ngập lụt/đường cấm thông báo phụ huynh 1 chạm), `GPS_SIGNAL_LOST` (mất định vị > 3 phút).
    - **Bắt buộc lưu tọa độ GPS**: Mọi sự cố phát sinh (thủ công hoặc tự động) bắt buộc lưu tọa độ thực tế (`latitude`, `longitude`) nơi xảy ra sự cố vào trường `context` để hiển thị trên bản đồ điều hành.

### WF-18 — Tổng quan và thông báo (Status: DECIDED — 04/11/2026)

- Actor: quản trị viên xem tổng quan; các vai trò xem inbox.
- Thao tác: Tổng quan → chuông → mở đích → đánh dấu đọc.
- API: GET `/admin/overview`, `/notifications/summary`, `/notifications`, `/notifications/:id/target`; PUT `/notifications/:id/read`, `/notifications/read-all`.
- Hiện có: thống kê chuyến xe, 4 nhóm việc cần làm (INCIDENT, LEAVE, REQUEST, PLAN), chuông thông báo cá nhân.
- Vấn đề & Quyết định đã chốt (04/11/2026):
  + **D318-01 (Đề xuất A)**: Mở rộng mảng `tasks` trên `/admin/overview` bổ sung đếm và liên kết xem nhanh cho: (1) `ADMIN_FINALIZATION` (chuyến xe bất thường qua ngày chờ chốt hành chính từ 3.2); (2) `REOPTIMIZATION` (phương án tuyến cần tối ưu lại lộ trình do đổi bãi/trường từ 3.2 & 3.3).
  + **D318-02 (Đề xuất A — Tuân thủ G-03)**: `readAt` chỉ mang ý nghĩa đã xem thông báo; bấm `read-all` tuyệt đối không làm giảm số lượng nhiệm vụ tồn đọng. Nhiệm vụ chỉ hoàn tất khi trạng thái nghiệp vụ thực tế đạt kết quả cuối (`RESOLVED`, `REPLACED`, `APPROVED`, `REJECTED`). Không làm cơ chế Claim / Timeout / SLA phức tạp.

## 5. Danh sách bất cập từ phân tích source

Các dòng dưới là phát hiện tĩnh tại baseline; chưa có tái hiện runtime trong task phân tích. Ưu tiên là đề xuất.

| ID | Ưu tiên | Vấn đề và bằng chứng baseline | Trạng thái | Tiêu chí hoàn tất đề xuất |
|---|---|---|---|---|
| B-01 | Rất cao | trips.service.ts: getHomeTrip/getParentHomeCards lọc scheduledEndAt cả với IN_PROGRESS, chuyến trễ mất thẻ | OPEN | Chuyến đang chạy vẫn hiện sau giờ dự kiến; chuyển terminal đúng |
| B-02 | Rất cao | student-requests.service.ts: approveRequest không bắt buộc preview hợp lệ/khả thi/còn hạn và fingerprint; thiếu đồng bộ giờ/snapshot | DECIDED | Bắt buộc previewToken/expectedFingerprint khả thi và còn hạn; đồng bộ ngay lập tức các chuyến SCHEDULED chưa frozen; giữ nguyên chuyến đã đóng băng |
| B-03 | Rất cao | incidents.service.ts: resolveIncident REPLACED thiếu kiểm tra overlap tại mutation, khác phân công Trip thông thường | DECIDED | Recheck khả dụng (không trùng lịch, không có LeaveNotice) tại mutation; ném 409 Conflict nếu bận |
| B-04 | Cao | routes.service.ts: confirmStudentInsertion giữ Trip đã sinh; con có thể chưa có trong chuyến sắp tới | DECIDED | Đồng bộ tức thì: tạo TripAttendance và cập nhật routeSnapshot trên toàn bộ chuyến SCHEDULED chưa frozen |
| B-05 | Cao | schools.service.ts: updateSchedule quét SCHEDULED kể cả Ready; dùng duration Route; phần quan sát chỉ sửa snapshot departureTime | OPEN | Quy tắc frozen rõ; giờ Trip/điểm/snapshot nhất quán; xác nhận lại nếu cần |
| B-06 | Rất cao | routes.service.ts: cancelRoutePlan đọc SCHEDULED rồi ghi theo ID; expectedFingerprint chưa dùng | DECIDED | Bắt buộc kiểm tra expectedFingerprint; loại trừ chuyến đã Ready/có điểm danh khỏi lệnh hủy; bảo toàn chuyến đang vận hành |
| B-07 | Cao | Có reconcileExpiredContracts nhưng tìm source chưa thấy caller/scheduler | OPEN | Đối soát được kích hoạt rõ; hết hạn chuyển trạng thái/giải phóng đúng; giữ chuyến đang chạy |
| B-08 | Cao | startTrip kiểm tra roster không rỗng, không bắt buộc PRESENT chiều về | NEEDS_DECISION | Chốt hủy hay điều chuyển nếu mọi em ABSENT; thực thi nhất quán |
| B-09 | Cao | updateAttendance cho sửa PRESENT/ABSENT sau đến trường; verifyQrAttendance chặn đón lúc đó | NEEDS_DECISION | Phân biệt sửa sai và đón mới; lý do/quyền/thông báo nhất quán |
| B-10 | Cao | arriveAtSchool/completeTrip dựa xác nhận; alighting chưa ghi người tiếp nhận | NEEDS_DECISION | Chốt mức cam kết vị trí/bàn giao; không diễn giải xuống xe thành đã bàn giao |
| B-11 | Trung bình | Detector một lần mỗi loại/Trip, phụ thuộc telemetry; Complete đóng cảnh báo chưa xác nhận | NEEDS_DECISION | Chốt tái diễn, mất vị trí và đóng cảnh báo; báo cáo không hiểu nhầm |
| B-12 | Cao | Vehicle thiếu serviceability/kiểm định; Driver là User; ý nghĩa seatCount cần chốt | NEEDS_DECISION | Chốt số chỗ học sinh và điều kiện phân công; mở rộng hồ sơ nếu PO duyệt |

## 6. Khoảng trống yêu cầu và phạm vi đề xuất

Toàn bộ trạng thái ban đầu là NEEDS_DECISION; chưa tự coi là in scope/out scope đã duyệt.

| ID | Tình huống | Hướng xử lý đề xuất / ranh giới | Trạng thái |
|---|---|---|---|
| P-01 | Lễ, bão, học bù, đóng cửa đột xuất | Lịch ngoại lệ theo ngày; ảnh hưởng Trip chưa chạy và thông báo | NEEDS_DECISION |
| P-02 | Xe hỏng, tài xế không tiếp tục được giữa chuyến | Quy trình vận hành ngoài app trước; cứu hộ/chuyển roster đề xuất giai đoạn sau | NEEDS_DECISION |
| P-03 | No-show, báo muộn, không liên lạc được | Thời gian chờ, người liên hệ, lý do và người quyết định | NEEDS_DECISION |
| P-04 | Tự đón, người nhận ủy quyền, không có người nhận | Chốt trách nhiệm và điểm đưa về; xác thực người nhận nâng cao đề xuất sau | NEEDS_DECISION |
| P-05 | Ngày hiệu lực, đổi lịch/địa chỉ/bãi/hợp đồng/phương án | In-scope đề xuất: nhất quán Route–Trip, chuyến frozen, ngày bắt đầu phục vụ | NEEDS_DECISION |
| P-06 | GPS cũ/mất mạng, phạm vi theo dõi, ETA | Hiển thị độ mới/thiếu dữ liệu; offline đầy đủ đề xuất giai đoạn sau | NEEDS_DECISION |
| P-07 | Bảo dưỡng xe, giấy phép và trạng thái nhân sự | Chốt điều kiện tối thiểu; quản trị tuân thủ đội xe đầy đủ đề xuất sau | NEEDS_DECISION |
| P-08 | Tối ưu và an toàn điểm dừng | Không cam kết tối ưu toàn cục; rà soát thực địa; công bố học sinh chưa phục vụ | NEEDS_DECISION |
| P-09 | Buffer và chuyến trước chạy trễ | Kiểm tra khả thi liên tiếp, không chỉ giao nhau khung giờ dự kiến | NEEDS_DECISION |
| P-10 | Mâu thuẫn phụ huynh, đổi số người giám hộ | Thẩm quyền gửi/rút, quy trình xác minh và xử lý thay đổi | NEEDS_DECISION |
| P-11 | Đăng ký một chiều, nghỉ dài ngày | Khoảng hiệu lực và ý nghĩa nghỉ xe; không đồng nhất nghỉ học | NEEDS_DECISION |
| P-12 | Chuyển trường/năm học, disable/enable | Tách hồ sơ khỏi dịch vụ; phục hồi không tự coi là đã xếp tuyến | NEEDS_DECISION |
| P-13 | Giữ xe cả hợp đồng hay chia ca | Giữ quy tắc hiện tại đến khi PO duyệt thay đổi điều phối | NEEDS_DECISION |
| P-14 | Nhận nhiệm vụ, nghỉ kỳ, hai nhân sự cùng thiếu | Trách nhiệm nhận việc, người cũ quay lại, reset Ready, chặn Start | NEEDS_DECISION |
| P-15 | Tái phục vụ sau hủy Trip | Không tự sinh đè lịch sử; chốt cách khôi phục/chuyến thay thế | NEEDS_DECISION |
| P-16 | Sự cố tái diễn, leo thang và báo cáo | Phân biệt đọc/xử lý; người chịu trách nhiệm, thời hạn, thống kê | NEEDS_DECISION |
| P-17 | Thu phí, hoàn phí | Đề xuất ngoài scope hiện tại; xử lý theo hợp đồng ngoài hệ thống | NEEDS_DECISION |
| P-18 | Nhiều nhà xe/bãi, chuyến qua đêm | Đề xuất ngoài scope mô hình hiện tại | NEEDS_DECISION |

## 7. Câu hỏi hội đồng và hướng trả lời

| ID | Câu hỏi | Trả lời và hướng giải quyết / scope đề xuất |
|---|---|---|
| Q-01 | Vì sao cần Plan/Route/Trip? | Phương án được chấp thuận, tuyến một chiều và thực thi ngày có phân công/roster riêng. Cốt lõi hiện tại. |
| Q-02 | Ai chịu trách nhiệm tuyến? | Nhà xe lập tính khả thi; trường duyệt nhu cầu phục vụ; điểm dừng cần kiểm tra thực địa. |
| Q-03 | Có tối ưu nhất không? | Không cam kết toàn cục; tối ưu theo đầu vào/ràng buộc, có kiểm tra và duyệt. Bảo đảm giao thông tuyệt đối ngoài scope. |
| Q-04 | Vì sao xe không phục vụ hai trường khác giờ? | Baseline giữ theo khoảng hợp đồng. Chia ca cần thay quy tắc được duyệt. |
| Q-05 | Làm sao không bỏ quên trẻ? | Chặn Complete nếu PRESENT chưa xuống; vẫn cần kiểm tra khoang xe thực tế, không cam kết phần mềm tuyệt đối. |
| Q-06 | QR chứng minh lên xe? | Xác định hồ sơ, giáo viên đối soát và xác nhận; QR không tự chứng minh hiện diện vật lý. |
| Q-07 | Vắng không báo trước? | Liên hệ, chờ theo chính sách, ghi vắng có lý do; thời gian/quy trình cần chốt. |
| Q-08 | Sáng nghỉ, chiều đi được? | Trip hai chiều độc lập; không suy diễn nghỉ cả ngày từ một chiều. |
| Q-09 | Phụ huynh tự đón ở trường? | Cần lý do không dùng chuyến về và bàn giao; chỉ ghi ABSENT chưa mô tả đủ. |
| Q-10 | Không người nhận ở nhà? | Giữ trẻ có giám sát, liên hệ, đưa về điểm đã thống nhất. OTP/QR người nhận có thể giai đoạn sau. |
| Q-11 | Tài xế nghỉ đột xuất? | Trước Start thay/hủy qua báo nghỉ/sự cố, còn chờ thì chặn Start; giữa chuyến cần bàn giao riêng. |
| Q-12 | Xe hỏng giữa đường? | Chưa có rescue/transfer đầy đủ. Điều phối ngoài app; không coi gán xe thông thường là đã xử lý cứu hộ. |
| Q-13 | Đổi địa chỉ hôm nay, mai đón đâu? | Theo ngày hiệu lực của Trip, phải nhất quán snapshot/điểm; cần hoàn thiện trong chức năng hiện có. |
| Q-14 | Thêm tuyến sao lịch chưa có? | Trip đã sinh có roster cũ; cần ngày bắt đầu dịch vụ, không hứa hiệu lực ngay. |
| Q-15 | Xe trễ thì sao? | Giữ IN_PROGRESS hiển thị và theo dõi; B-01 cần sửa trước nghiệm thu. |
| Q-16 | Bão/đổi giờ trong ngày? | Lịch ngoại lệ và xử lý Trip chưa chạy; đang chạy điều phối riêng. |
| Q-17 | Hai quản trị viên cùng thao tác? | Một quyết định hợp lệ; giữ trạng thái mới nhất, không hủy chuyến đã chạy. Tính đúng nghiệp vụ in-scope đề xuất. |
| Q-18 | Tất cả học sinh nghỉ vẫn chạy? | Chốt hủy chuyến đưa đón hay nhiệm vụ điều chuyển riêng; baseline chưa chặn đầy đủ. |
| Q-19 | Mất GPS có biết trẻ an toàn? | Vị trí gần nhất không chứng minh an toàn; điểm danh/liên lạc dự phòng; công bố GPS cũ. |
| Q-20 | Xuống xe là bàn giao an toàn? | Chưa; cần người nhận/quyền nhận/xác nhận để chứng minh. Công bố giới hạn hiện tại. |
| Q-21 | Thanh toán/hoàn phí? | Chưa có miền thanh toán; đề xuất out scope, quản lý theo hợp đồng bên ngoài. |
| Q-22 | Nhiều nhà xe/bãi, qua đêm? | Đề xuất out scope; giữ mô hình một nhà xe/một bãi, vận hành học đường ban ngày. |

## 8. Thứ tự xử lý đề xuất

1. B-02: đổi địa chỉ đúng preview, đồng bộ và ngày hiệu lực.
2. B-01: không mất chuyến trễ trên trang chủ.
3. B-03: khả dụng người thay qua sự cố.
4. B-06/B-05: giữ chuyến đã bắt đầu/đóng băng khi hủy hoặc đổi lịch.
5. B-04: ngày bắt đầu phục vụ sau chèn học sinh.
6. B-08/B-09/B-10 và P-03/P-04: toàn bộ vắng, sửa sai, no-show và bàn giao.

Đây là thứ tự đề xuất, chưa phải kế hoạch implementation được duyệt.

## 9. Bằng chứng baseline và giới hạn

- Các nguồn chính: `api/prisma/schema.prisma`; service/controller trong `trips`, `routes`, `schools`, `student-requests`, `leave-notices`, `incidents`, `notifications`; màn hình và API client Web/Mobile.
- Tài liệu đã đối chiếu: WORKING_RULES, BUSINESS_CONTEXT, CODEX_HANDOFF, CURRENT_STATE và các thiết kế/review liên quan.
- Task phân tích trước đã chạy TypeScript API/Web/Mobile thành công; không dùng kết quả này thay bằng chứng nghiệp vụ.
- Không sửa application code, migration hoặc dữ liệu trong task phân tích/lưu tracking.
- Runtime/thiết bị/provider thực tế: NOT_VERIFIED. Nghiệm thu có ghi dữ liệu khi chưa được cấp phép: BLOCKED_BY_TEST_DATA_POLICY.
- Task lưu tài liệu này không chạy lại kiểm tra application vì chỉ thay Markdown.

## 10. Nhật ký quyết định và cải thiện

| Ngày | ID | Nội dung | Quyết định PO | Bằng chứng | Trạng thái sau cập nhật |
|---|---|---|---|---|---|
| 2026-10-29 | Baseline | Lưu phân tích trong chat thành tracker; chưa triển khai cải thiện | PO yêu cầu lưu để tracking; chưa duyệt giải pháp | Tài liệu này và báo cáo task lưu tài liệu | OPEN / NEEDS_DECISION theo từng ID |
| 2026-10-29 | API compatibility | Ghi nhận phạm vi API, ưu tiên thêm field và API mới, hỏi PO khi phân vân, giảm ảnh hưởng FE cũ | PO xác nhận nguyên tắc và yêu cầu chưa triển khai code | Mục 1.1; yêu cầu trong chat | Giữ nguyên trạng thái từng vấn đề |
| 2026-10-30 | AUTH-01..08 | Ghi quyết định 1–6 và giải thích 7–8; chuyển nghỉ việc/trạng thái trường sang nhóm phù hợp | Chốt hướng nghiệp vụ, chưa duyệt implementation/contract | auth-business-flow-detail.md mục 12 | Theo từng dòng quyết định; chưa IMPLEMENTED/VERIFIED |
| 2026-10-30 | AUTH-07/08 | PO đồng ý tiếp tục nhiệm vụ sau đăng nhập lại và cách hiểu isVerified tách khỏi liên kết con/phân công/Ready | Đã thống nhất giải thích, không yêu cầu thêm tính năng Auth cho hai mục này | auth-business-flow-detail.md mục xác nhận bổ sung | Đã làm rõ nghiệp vụ; chưa có implementation/verification mới |
| 2026-10-30 | AUTH-01/02 plan | Email required ngay API cũ; mẫu eSMS gửi thật; giữ User khi mail lỗi và gửi mật khẩu mới qua thao tác riêng | PO chốt ba lựa chọn; field trạng thái/phạm vi resend/mode email nhân sự còn chờ | auth-api-improvement-plan.md | PLANNING / WAITING_APPROVAL; chưa triển khai |
| 2026-10-30 | AUTH-02 contract | Chốt credentialDeliveryStatus SENT/FAILED/CONSOLE; console development; resend cả tài khoản đã dùng | PO xác nhận; chính sách Session/Trip đang chạy còn chờ | auth-api-improvement-plan.md mục 12 | PLANNING / WAITING_APPROVAL; chưa triển khai |
| 2026-10-30 | AUTH-02 Session | Quản trị cấp lại mật khẩu nhân sự giữ Session/tokenVersion/pushToken; chỉ đổi mật khẩu cho đăng nhập mới | PO từ chối đề xuất thu hồi phiên; guard Trip đang chạy chưa chốt | auth-api-improvement-plan.md mục 12.2 | PLANNING / WAITING_APPROVAL; chưa triển khai |
| 2026-10-30 | AUTH-01/02 implementation | Code eSMS/console, email required/email-only, status create/resend, hai API resend; cho Trip đang chạy, lưu password trước gửi và giữ phiên. Bổ sung key eSMS còn thiếu để trống trong .env thật | PO duyệt implementation, chốt câu hỏi nhạy cảm, cho sửa .env thật; cấm chạy script test | api/src/auth/*delivery*, esms-sms.service.ts, personnel-credentials.service.ts; auth-technical-design.md; LATEST.md | IMPLEMENTED — chưa VERIFIED gửi thật/runtime; không chạy test |

Mẫu cho lần cập nhật tiếp: `Ngày | B-xx/P-xx | Thay đổi cụ thể | Link/quyết định PO | File/commit/report + kiểm chứng thực tế | Trạng thái`.

### Cập nhật 03/11/2026 — Migration 3.2

PO cho phép migrate; 20261103010000_school_lifecycle_calendar đã apply vào DB local roadtoschool/public tại localhost:5432. Xác nhận hai bảng mới và trips.admin_finalization JSONB nullable tồn tại, tổng 15 migrations up to date. Chỉ migration verification PASS; nghiệp vụ vẫn IMPLEMENTED/chưa VERIFIED, không test scripts hoặc seed. Xem LATEST.md; báo cáo implementation trước được archive.

### Cập nhật 03/11/2026 — Những phần còn lại sau 3.2

Đối chiếu 16 nhóm WF-03..WF-18, phân biệt module nền tảng đã có với nghiệp vụ chưa cải thiện; WF-16 đã có phần lifecycle trong 3.2. Danh sách chi tiết và phần tồn đọng 3.1–3.2: [business-improvement-remaining-after-3.2.md](ai-review/business-improvement-remaining-after-3.2.md). B-07/P-01/phần trường của P-05 không còn được xem là hoàn toàn chưa triển khai. Không cập nhật hàng loạt lỗi baseline thành VERIFIED khi chưa nghiệm thu. Bước tiếp theo duy nhất: phân tích chi tiết 3.3.

### Cập nhật 03/11/2026 — Plan tổng thể 3.4–3.18

Theo yêu cầu PO, tạo một file plan làm nơi cập nhật xuyên các lượt: [business-improvement-master-plan-3.4-3.18.md](ai-review/business-improvement-master-plan-3.4-3.18.md). Có 15 mục, bốn quyết định dùng chung, 30 quyết định theo mục, registry API/field/schema, phụ thuộc/gói triển khai và tiêu chí nghiệm thu. Trạng thái ANALYZED / NEEDS_DECISION, không tự duyệt proposal/field, không triển khai code mới. Bản remaining-after-3.2 chỉ còn là inventory ở mốc cũ, master plan là nơi quản lý quyết định tiếp theo.

### Cập nhật 04/11/2026 — Triển khai hoàn tất Master Business Improvement Plan (Mục 3.4 – 3.18)

Theo lệnh `/goal` của Product Owner:
1. **Phê duyệt toàn diện**: PO đã duyệt toàn bộ các đề xuất A từ Mục 3.4 đến 3.18 kèm các tinh chỉnh D317-02 (giảm ngưỡng cảnh báo đi lệch/trễ, bổ sung 3 sự cố có tọa độ GPS), D310-01 (chặn xe về khi toàn bộ học sinh vắng), D316-02 (phương án tuyến độc lập theo nhóm học sinh).
2. **Database & Migration**: Bổ sung `province` (nullable) cho School/Student và 3 incident types (`NO_GUARDIAN_AT_STOP`, `TRAFFIC_DELAY`, `GPS_SIGNAL_LOST`) vào enum `TripIncidentType`. Migration `20261104081535_add_province_and_incident_types` đã được áp dụng an toàn vào PostgreSQL.
3. **Triển khai 5 Gói (Packages 1–5)**:
   - **Gói 1**: Quy tắc đóng băng chuyến (`frozenTripWhere`, `isTripFrozen` - G-02); helper kiểm tra xung đột nhân sự (`assertStaffAvailableForTrip`); helper đồng bộ chuyến chưa đóng băng (`syncUnfrozenTripsForRoute`); sửa lỗi Bug B-01 trong Home Trip queries.
   - **Gói 2**: Chặn tài xế/xe chạy đồng thời 2 chuyến; cấm đổi phân công trước chuyến khi chuyến đã đóng băng; chặn rút đơn nghỉ khi phụ xe đã sẵn sàng; mở rộng tọa độ GPS và phân loại sự cố; sửa lỗi Bug B-03 trong Incident Dispatch.
   - **Gói 3**: Chặn xuất bến chuyến về khi 100% học sinh vắng mặt; quy tắc điểm danh 2 giai đoạn và bắt buộc lý do vắng mặt.
   - **Gói 4**: Lọc chuẩn bị phân tuyến theo bán kính 50km và tỉnh thành; lan truyền phân công mặc định xuống các chuyến unfrozen; đồng bộ tức thì khi chèn học sinh giữa kỳ (Bug B-04); hủy phương án chỉ áp dụng cho chuyến unfrozen (Bug B-06); duyệt đổi địa chỉ REOPTIMIZED yêu cầu previewToken và expectedFingerprint kèm đồng bộ chuyến (Bug B-02).
   - **Gói 5**: Overview Dashboard & Tổng kiểm chứng toàn diện.
4. **Kiểm chứng (Verification)**:
   - `npx tsc --noEmit`: 0 lỗi typecheck.
   - 11 file unit tests liên quan (193 tests) thuộc `routes`, `trips`, `incidents`, `leave-notices`, `student-requests`, `overview` đều PASS 100%.
   - Tuân thủ tuyệt đối Test Data Policy (không seed, không tạo fake data vào DB).
5. **Tài liệu bàn giao**:
   - Đã biên soạn tài liệu hướng dẫn tích hợp chi tiết cho Frontend: [docs/FE_INTEGRATION_GUIDE.md](FE_INTEGRATION_GUIDE.md).
   - Trạng thái: `IMPLEMENTED & VERIFIED (STATIC & UNIT TESTS)`.

