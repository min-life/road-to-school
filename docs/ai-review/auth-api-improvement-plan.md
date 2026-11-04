# Kế hoạch cải thiện API — Mục 3.1

> Cập nhật 30/10/2026: PO đã yêu cầu triển khai và chốt các câu hỏi nhạy cảm trong task implementation. Hợp đồng hiệu lực: email required trên API cũ; status SENT/FAILED/CONSOLE cho create/resend; resend cả khi đang có chuyến; lưu mật khẩu trước gửi, email lỗi giữ hash mới; giữ toàn bộ Session/push token. Dùng chung AUTH_EMAIL_MODE/AUTH_SMS_MODE hiện có, không thêm PERSONNEL_EMAIL_MODE. `.env` thật được PO cho phép sửa, chỉ thêm key eSMS còn thiếu để trống. Không chạy script test. Chi tiết source/bằng chứng/giới hạn ở LATEST.md và docs/architecture/auth-technical-design.md. Các đoạn WAITING_APPROVAL/đề xuất ngược phía dưới là lịch sử kế hoạch, không phải trạng thái implementation mới nhất.

Ngày: 30/10/2026, Asia/Saigon. Mode: PLANNING. Trạng thái: WAITING_APPROVAL.
Chỉ lập kế hoạch, chưa triển khai application code. Quyết định nghiệp vụ đã chốt không tự thay thế phê duyệt contract/implementation.

## 1. Phạm vi và quyết định đã chốt

| Nội dung | Quyết định PO |
|---|---|
| SMS OTP | eSMS, mẫu test gửi SMS thật với Brandname thử nghiệm của nền tảng; không đăng ký Brandname riêng |
| Development | Giữ mode console để không phát sinh chi phí gửi |
| Tạo nhân sự | Email bắt buộc ngay trên hai API cũ; PO chấp nhận request chỉ có phone bị từ chối |
| Bàn giao nhân sự | Mật khẩu gửi chỉ qua email; không gửi SMS |
| Email lỗi sau tạo | Giữ User, có thao tác gửi mật khẩu mới qua email |
| Vai trò | Một role/User, tài khoản riêng; không thay unique email/phone |
| Auth/session | Không hủy Trip khi logout/hết phiên; giữ cách hiểu verified tách liên kết con/phân công/Ready |
| Ngoài mục này | Nghỉ việc/phân công sang nhân sự/điều phối; trạng thái trường/hợp đồng sang quản lý trường; mất số giám hộ xử lý qua trường |

Chỉ sửa API và tài liệu cấu hình. Không sửa Web/Mobile, không migrate/backfill tài khoản cũ, không thêm package. Nodemailer đã có; HTTP eSMS dùng khả năng có sẵn của Node.

## 2. Nguồn eSMS đã kiểm tra

- [Tin nhắn SMS OTP/CSKH](https://developers.esms.vn/esms-api/ham-gui-tin/tin-nhan-sms-otp-cskh).
- [Môi trường Sandbox](https://developers.esms.vn/esms-api/moi-truong-test-sandbox).

Theo tài liệu chính thức đã mở: POST `https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/`. Mẫu `Content`: `CODE la ma xac minh dang ky Baotrixemay cua ban`; `Brandname=Baotrixemay`, `SmsType=2`, `IsUnicode=0`. Chỉ thay CODE, không tự thêm tên RoadToSchool, mục đích hoặc thời hạn vào mẫu SMS. Mã được phép tối đa 8 ký tự; API OTP hiện dùng 6 ký tự nên giữ tương thích. Không đổi template theo purpose nếu dùng mẫu thử này.

PO chọn gửi thật: không bật Sandbox=1. Sandbox=1 không về máy và không tính phí; console là nhánh riêng không gọi provider. Brandname thử nghiệm vẫn phải được tài khoản eSMS cho phép; mẫu tài liệu không chứng minh quyền gửi của tài khoản cụ thể. CodeResult=100 nghĩa provider chấp nhận request, không chứng minh máy nhận tin. Cần số nhận/credentials/quyền gửi và giới hạn chi phí được cấp khi nghiệm thu; không gửi tin trong task planning.

## 3. Contract cũ và thay đổi có chủ đích

### 3.1. Auth và OTP

Giữ nguyên request/response và status thành công của đăng ký, đăng nhập Web/Mobile, forgot/reset/change-password, refresh, me, avatar, name, logout. Giữ cả field nullable; không thêm field bắt buộc vào request OTP.

Tích hợp eSMS tại điểm dispatch dùng chung trong OtpService, nên ảnh hưởng mọi OTP SMS đang có: đăng ký, reset, liên kết con, yêu cầu cập nhật học sinh và báo nghỉ. Chỉ thay cách vận chuyển, không đổi điều kiện báo nghỉ, liên kết hoặc duyệt yêu cầu.

Các field `isConsole` đang được gán cứng trong LeaveNoticesService phải phản ánh mode thực tế; giữ tên/kiểu field để Mobile không hiển thị SMS console khi gửi thật. Email-only ở bàn giao mật khẩu nhân sự không đổi lựa chọn kênh của OTP báo nghỉ.

### 3.2. POST /api/v1/drivers

- Actor: SYSTEM_ADMIN; vai trò tạo ra DRIVER.
- Request giữ `fullName`, `email`, `phone`; email chuyển từ optional sang required; phone vẫn optional và giữ validation hiện có phù hợp.
- Email thiếu/rỗng/sai trả 400 trước khi tạo User. Trùng email/phone trả 409 như cũ. 401/403 giữ theo đăng nhập/vai trò.
- Thành công tạo User một lần, gửi mật khẩu tới email và trả 201 với toàn bộ field CreateDriverResponseDto hiện có, không trả mật khẩu trong HTTP.
- Nếu User đã tạo nhưng mail lỗi: vẫn coi tạo User thành công theo quyết định PO; response phải cho biết chưa bàn giao được. Không trả một lỗi tạo chung khiến FE tưởng chưa tạo và gửi POST tạo lại.

### 3.3. POST /api/v1/schools/:id/employees

- SYSTEM_ADMIN tạo SCHOOL_ADMIN; SCHOOL_ADMIN tạo BUS_ATTENDANT của trường mình. Không cho client chọn role mới.
- Request giữ `fullName`, `email`, `phone`; email required, phone optional.
- Kiểm tra trường, quyền, trạng thái hoạt động hiện có; trùng định danh 409; input thiếu email 400 trước ghi.
- Response thành công giữ 201 và các field cũ. Quy tắc mail lỗi giống tạo tài xế.

### 3.4. Field response đang hỏi PO — D-01

Đề xuất additive `credentialDeliveryStatus: 'SENT' | 'FAILED'` cho response tạo nhân sự; giữ `message` và mọi field cũ. SENT chỉ SMTP accepted, không cam kết đã tới inbox. Trong development console, không gán SENT nếu chỉ log. Cần chốt console của email nhân sự có được dùng và nếu có phải có giá trị phản ánh rõ (ví dụ CONSOLE); chưa tự thêm enum chưa được duyệt.

Không có field persistence mới theo kế hoạch hiện tại. Trạng thái trên là kết quả lần gọi, không phải lịch sử bàn giao đáng tin cậy về sau. Nếu PO không chọn field mới, message phải mô tả mail lỗi nhưng FE khó phân biệt bằng máy; ghi nhận giới hạn.

### 3.5. API mới gửi mật khẩu nhân sự — contract đề xuất

Đường dẫn dự kiến, cần duyệt trước code:

| Method/path | Actor | Mục tiêu |
|---|---|---|
| POST /api/v1/drivers/:id/credentials/resend | SYSTEM_ADMIN | Gửi mật khẩu mới tới email tài xế đã lưu |
| POST /api/v1/schools/:schoolId/employees/:employeeId/credentials/resend | SYSTEM_ADMIN đối với SCHOOL_ADMIN; SCHOOL_ADMIN đối với BUS_ATTENDANT cùng trường | Gửi mật khẩu mới tới email nhân sự đã lưu |

- Không yêu cầu body mới; không nhận email đích tùy ý hoặc mật khẩu từ client. Đối tượng phải tồn tại, đúng role/phạm vi, còn hoạt động và có email hợp lệ.
- Response đề xuất HTTP 200 dùng MessageResponseDto cũ. 400: thiếu email/không đủ điều kiện; 401/403: quyền; 404: không có nhân sự; 409: trạng thái không còn phù hợp/thao tác đồng thời; lỗi SMTP/cấu hình/provider: thống nhất error contract mới trước code (đề xuất 503 cho dịch vụ gửi không khả dụng).
- Gửi là mật khẩu mới vì DB chỉ có hash, không lấy lại mật khẩu cũ được.
- D-02 đang hỏi PO: chỉ tài khoản chưa từng đăng nhập hay cả tài khoản đã sử dụng? Nếu chọn trường hợp sau, bắt buộc chốt tác động password/session trước triển khai.
- Nếu giới hạn chưa từng đăng nhập: tận dụng Session hiện có để kiểm tra trong phạm vi lịch sử còn giữ; không tuyên bố đây là bằng chứng vĩnh viễn nếu Session có thể bị xóa. Không tự thêm firstLoginAt/activation status vào schema; cần hỏi nếu bằng chứng hiện có không đủ.
- Phải bảo vệ thao tác đồng thời để hai lần gửi không khiến email chứa mật khẩu không còn hiệu lực; chỉ xử lý theo User mục tiêu, không giữ transaction DB dài chờ SMTP.

## 4. Luồng xử lý và tính nhất quán

### 4.1. Gửi OTP

1. Kiểm tra điều kiện xin OTP như hiện tại; resolve mode/kênh và cấu hình bắt buộc trước khi tạo challenge.
2. Tạo mã/challenge theo purpose và payload binding hiện tại. Không thay mã OTP bằng mã do eSMS tự sinh vì API verify đang kiểm tra hash do hệ thống tạo.
3. Console: chỉ ghi theo mode development; tuyệt đối không gọi eSMS/SMTP ở nhánh này.
4. eSMS: dựng đúng mẫu thử, POST qua HTTPS, có timeout; RequestId ổn định theo challenge và đích nếu dùng để chống gửi trùng. Không tự lặp lại bằng ID mới khi timeout không biết kết quả.
5. Phân biệt HTTP 200 với CodeResult; sai key, template, Brandname, thiếu số dư, timeout và response hỏng không được báo gửi thành công giả.
6. Nếu gửi chắc chắn thất bại: cần cho phép xin lại hợp lệ, không để OTP chưa gửi chặn người dùng cả thời hạn. Đề xuất vô hiệu hóa challenge thất bại bằng field hiện có, không thêm bảng delivery.
7. Fan-out báo nghỉ có thể gửi nhiều kênh: nếu một kênh đã được chấp nhận thì không vô hiệu hóa OTP đã phát; timeout là trạng thái không chắc chắn. Chính sách một kênh thành công/timeout và response lỗi cần chốt trước sửa nhánh liên quan; không tự thay payload/ý nghĩa thành công.

### 4.2. Tạo nhân sự và email

1. Validate email required, quyền, trường/role và trùng định danh.
2. Sinh mật khẩu tạm theo cơ chế hiện có, lưu hash cùng User.
3. Sau commit User, gửi email tới địa chỉ đã xác nhận trong request; nội dung gồm định danh và mật khẩu tạm, không gửi SMS.
4. SMTP accepted: trả creation response cũ + trạng thái additive nếu duyệt. SMTP thất bại: giữ User và trả creation response mô tả mail chưa gửi; sử dụng API resend theo quy tắc đã duyệt.
5. Không backfill hay gửi mật khẩu hàng loạt cho tài khoản có sẵn. Không thêm force-change-password hoặc activation state khi chưa có yêu cầu.

### 4.3. Gửi lại mật khẩu

DB và SMTP không có transaction chung; không thể cam kết atomic tuyệt đối bằng một API.

Đề xuất luồng kỹ thuật để PO/reviewer duyệt: kiểm tra điều kiện và phiên bản hash; sinh mật khẩu mới; gửi email; khi SMTP accepted mới cập nhật hash có điều kiện để giảm việc làm mất mật khẩu cũ khi SMTP lỗi. Nếu hash/trạng thái đã đổi đồng thời hoặc ghi DB thất bại sau khi email accepted, phải báo rõ chưa hoàn tất, không báo thành công; cần cơ chế tuần tự hóa cùng User và hướng dẫn dùng lần gửi thành công cuối. Nếu muốn bảo đảm retry bền vững/quy trình kích hoạt khác, cần thiết kế bổ sung và duyệt riêng; chưa đề xuất bảng mới.

Không tự quyết định thu hồi Session ở nhánh resend. Chờ D-02 và duyệt tác động; quy tắc reset/change-password hiện tại giữ nguyên.

## 5. Cấu trúc triển khai dự kiến

- Giữ NestJS Controller → Service → Prisma; không thêm queue, kiến trúc phức tạp hoặc package.
- Một service vận chuyển SMS eSMS; tái sử dụng bộ gửi email Nodemailer cho OTP và email bàn giao, tách nội dung OTP khỏi nội dung mật khẩu.
- OtpService giữ sinh/verify/challenge; sender chỉ vận chuyển, không sửa nghiệp vụ Trip/Student.
- Tái sử dụng AUTH_SMS_MODE hiện có (console/esms đề xuất), AUTH_EMAIL_MODE và SMTP hiện có. Các tên cấu hình eSMS/key/secret/timeout, mode email bàn giao và enum trạng thái sẽ được liệt kê trong contract/cấu hình được duyệt, không tự sửa .env thật.
- Không lưu plaintext mật khẩu; không ghi key/secret vào report hoặc Swagger. Email nhân sự có thể dùng SMTP thật khi được cấu hình; giữ email OTP console hiện tại. D-03: cần PO chốt email bàn giao có được console ở dev hay luôn SMTP.

## 6. Files dự kiến ảnh hưởng

| Files | Nội dung |
|---|---|
| api/src/auth/otp.service.ts | SMS dispatcher, xử lý lỗi challenge, mô tả mode |
| api/src/auth/auth.module.ts | Đăng ký/export sender dùng chung |
| api/src/auth/esms-sms.service.ts (mới, tên dự kiến) | HTTP POST eSMS, mẫu thử, kết quả/timeout |
| api/src/auth/email-delivery.service.ts (mới, tên dự kiến) | Dùng Nodemailer, OTP và mật khẩu email |
| api/src/drivers/dto/create-driver.dto.ts | Email required; giữ field cũ |
| api/src/drivers/dto/*response* | Field delivery nếu PO duyệt |
| api/src/drivers/drivers.service.ts, drivers.controller.ts | Gửi email sau create; API resend và Swagger |
| api/src/schools/dto/create-school-admin.dto.ts, *response* | Email required và trạng thái nếu duyệt |
| api/src/schools/schools.service.ts, schools.controller.ts | Tạo và gửi email đúng role; resend |
| api/src/leave-notices/leave-notices.service.ts | isConsole đúng mode, xử lý fan-out liên quan transport; không đổi nghiệp vụ nghỉ |
| api/src/auth/otp.service.spec.ts, personnel service/controller/DTO specs và sender specs | Kiểm chứng độc lập được phép theo policy, không DB/provider thật |
| api/.env.example, docs/architecture/auth-technical-design.md | Cấu hình mẫu, contract và giới hạn gửi |
| Tracker, báo cáo review | Tiến độ, quyết định, verification |

DriversModule/SchoolsModule đã import AuthModule; chỉ đổi wiring khi cần. File cụ thể sẽ được đối chiếu lại trước edit. Không sửa Prisma schema/migrations/Web/Mobile trong kế hoạch cơ sở.

## 7. Tác động frontend

| Client hiện tại | Kết quả dự kiến |
|---|---|
| Login/register/reset/refresh hiện có | Giữ contract cũ |
| Tạo nhân sự có email hợp lệ | Giữ field response và status cũ, email delivery thật |
| Tạo nhân sự chỉ phone | 400 — breaking validation PO đã chấp nhận ngày 30/10/2026 |
| FE chưa biết field mới | Field cũ vẫn đủ đọc; chưa tự có UI resend/trạng thái |
| Email lỗi, FE chỉ biết creation thành công | Có User, tránh tạo lại; FE có thể chưa thể hiện đầy đủ tình trạng gửi nếu không đọc field/message |
| Mobile báo nghỉ | isConsole đúng mode, không đổi shape |

Không cam kết zero-break: form hiện vẫn cho phone-only; PO chấp nhận thay đổi đó. API mới không tự tạo nút UI; sử dụng qua Swagger/client tích hợp sau, mọi mutation nghiệm thu cần được cho phép.

## 8. Trình tự triển khai sau khi duyệt

1. Chốt D-01/D-02/D-03 và chính sách lỗi OTP/fan-out/resend; đóng băng contract và cấu hình. Chưa được phép tự điền phần chưa duyệt.
2. Thêm sender và cấu hình console/eSMS/email; giữ default console cho OTP; kiểm chứng không có outbound trong console.
3. Nối OtpService và metadata kênh, xử lý failure/cooldown/timeout.
4. Email required trên hai API cũ, email-only bàn giao, kết quả gửi và resend đúng phạm vi.
5. Cập nhật Swagger: required email, response additive, failure cases, role và resend; kiểm tra live /api/docs và /api/docs-json khi triển khai.
6. Kiểm tra diff/typecheck API/lint phù hợp, kiểm chứng contract cũ, cập nhật tracker/report rồi dừng.

## 9. Tiêu chí nghiệm thu

- Console: không eSMS/SMTP call, flow OTP cũ dùng được, metadata đúng.
- eSMS: đúng template/Brandname thử, chỉ thay CODE; không Sandbox=1 nếu gửi thật; không báo delivered khi chỉ accepted.
- Đăng ký/reset/liên kết/update/báo nghỉ giữ request/response cũ; OTP lỗi không tạo kết quả nghiệp vụ giả.
- Tạo cả DRIVER/SCHOOL_ADMIN/BUS_ATTENDANT bắt buộc email, phone optional; đúng quyền, unique và response cũ.
- Email không thành công vẫn đúng một User; trả tình trạng rõ; resend không tạo User mới và dùng email đã lưu.
- Resend tuân thủ đối tượng đã chốt, không làm hai lần gửi đồng thời báo thành công cho mật khẩu không hiệu lực; báo cáo giới hạn SMTP/DB.
- Không tác động Trip, ParentStudentLink, role, school lifecycle hay reset/change-password/session ngoài scope được duyệt.
- Không migration, backfill, package hoặc sửa FE.

## 10. Verification và Test Data Policy

Task planning chỉ đọc source/docs, tra cứu tài liệu chính thức, ghi Markdown; chưa chạy test/typecheck hoặc gọi provider/API mutation.

Khi triển khai: npx --no-install tsc --noEmit --incremental false trong api; lint và kiểm tra diff. Chỉ chạy unit tests đã xác minh độc lập DB/provider và được phép theo policy. Không tự tạo fixtures nghiệp vụ mới chỉ để ép PASS; ca đòi dữ liệu chưa được cấp thì NOT_VERIFIED/BLOCKED_BY_TEST_DATA_POLICY. Dùng pure tests cho format template, parser response, mode và contract validation; không thay bằng tuyên bố đã gửi thật.

Nghiệm thu thật cần PO cấp tài khoản nhân sự/email/số nhận được phép dùng, phạm vi thao tác ghi và giới hạn chi phí. Chỉ test sau khi có quyền rõ; không tạo nhân sự/OTP/chuyến giả hoặc gửi SMS/email tự ý. Sandbox success không thay bằng chứng nhận SMS thật. Swagger UI/JSON được kiểm tra read-only; mutation qua Swagger vẫn cần quyền dữ liệu.

## 11. Điểm cần duyệt trước code

- D-01: có thêm credentialDeliveryStatus SENT/FAILED không? Nếu email nhân sự được console thì cần chốt giá trị phản ánh console, chưa tự thêm.
- D-02: resend chỉ nhân sự chưa từng đăng nhập hay cả tài khoản đã dùng? Tác động session nếu cho tài khoản đã dùng.
- D-03: email bàn giao nhân sự luôn SMTP, hay cho console trong development? Tách rõ khỏi quyết định giữ console cho OTP.
- Chính sách SMTP accepted nhưng DB update lỗi; definitive OTP failure so với timeout/fan-out một kênh thành công.
- Duyệt tên API resend, status/errors và các cấu hình mới trước implementation.

Không có bằng chứng triển khai hoặc nghiệm thu mới. Kế hoạch chờ PO review/approval; không tự chuyển implementation.

## 12. Quyết định bổ sung của PO — 30/10/2026

Mục này thay thế các lựa chọn còn chờ ở D-01/D-02/D-03 phía trên; phần trước giữ để truy vết đề xuất ban đầu.

- **D-01 đã chốt:** thêm `credentialDeliveryStatus` vào response tạo nhân sự, giữ mọi field cũ. Giá trị `SENT` nghĩa SMTP accepted, `FAILED` nghĩa gửi email thất bại.
- **D-03 đã chốt:** cho console ở development; thêm giá trị `CONSOLE` vào cùng field, không gán SENT cho log console. Enum dự kiến theo quyết định PO: `SENT | FAILED | CONSOLE`.
- **D-02 đã chốt phạm vi:** API gửi lại mật khẩu dùng cho cả nhân sự đã đăng nhập. Bỏ giới hạn chưa từng đăng nhập; không cần thêm firstLoginAt hay dùng Session history để xét điều kiện này.
- Chưa triển khai code. Cho phép gửi lại không tự phê duyệt chính sách thu hồi Session hoặc gián đoạn chuyến đang chạy.

### 12.1. Phương án tác động mật khẩu và Session đề xuất — chờ PO duyệt

1. Đúng quyền quản trị theo role/trường; target active và có email hợp lệ. Không cho gửi tới địa chỉ khác từ request.
2. Sinh mật khẩu mới; khi hoàn tất đổi mật khẩu thành công, mật khẩu cũ hết hiệu lực.
3. **Đề xuất thu hồi toàn bộ Session của tài khoản mục tiêu và xóa pushToken gắn các Session đó** cùng transaction ghi password hash mới, như luồng quên mật khẩu. Session của quản trị viên thực hiện không bị ảnh hưởng nếu là tài khoản khác. Nhân sự phải đăng nhập lại bằng mật khẩu mới và đăng ký lại nhận push theo flow hiện có.
4. **Đề xuất chặn resend khi target đang là tài xế hoặc giáo viên của bất kỳ Trip IN_PROGRESS nào**, trả 409 cho API mới, không đổi mật khẩu/Session và không gửi email trong trường hợp này. Không chặn chỉ vì có Trip tương lai SCHEDULED. Quy trình đổi người/mất thiết bị giữa chuyến thuộc điều phối đã chuyển nhóm.
5. Nếu thao tác hợp lệ và thành công, không sửa Trip, roster, attendance, assignment hoặc Ready. Trường hợp cần dùng resend khẩn cấp giữa chuyến phải có PO quyết định riêng, không tự tạo override.
6. SMTP chắc chắn lỗi trước commit password: đề xuất giữ hash/Session cũ và báo gửi lại chưa hoàn tất. Timeout, SMTP accepted nhưng DB lỗi và thao tác đồng thời vẫn cần thiết kế nhất quán ở mục 4.3 trước approval implementation; không hứa atomic giữa SMTP và DB.
7. Console development: không gửi SMTP; log mật khẩu theo mode được duyệt, đổi password và thu hồi Session chỉ sau khi các điều kiện thao tác được đáp ứng. Nhãn CONSOLE phân biệt với gửi email thật.

Hai chính sách ở bước 3 và 4 đang xin PO xác nhận, chưa phải quyết định đã chốt. Response API resend có cần thêm credentialDeliveryStatus ngoài MessageResponseDto hay không sẽ được trình riêng; phê duyệt field ở response tạo không tự mở rộng sang mọi endpoint.

### 12.2. Quyết định mới nhất — giữ phiên nhân sự

PO xác nhận: **không cần thu hồi phiên khi đổi/cấp lại mật khẩu nhân sự** trong luồng quản trị đang thiết kế.

- Thay thế đề xuất thu hồi Session tại mục 12.1 bước 3: API cấp lại mật khẩu không thu hồi Session hiện có, không đổi tokenVersion, không xóa pushToken. Các thiết bị đã đăng nhập tiếp tục hoạt động theo thời hạn/trạng thái phiên hiện tại.
- Mật khẩu mới dùng cho những lần đăng nhập tiếp theo; mật khẩu cũ không còn dùng để đăng nhập mới sau khi password hash mới đã được lưu thành công. Phiên đã tồn tại không tự đăng xuất do thao tác này.
- Không thay đổi Trip, roster, điểm danh, phân công hoặc Ready.
- Quyết định trong ngữ cảnh này áp dụng cho luồng quản trị cấp lại mật khẩu nhân sự. Không tự mở rộng sang API tự đổi mật khẩu `/auth/me/change-password` hoặc quên mật khẩu `/auth/reset-password`; các API đó giữ quy tắc hiện tại đến khi PO yêu cầu riêng.
- Chặn cấp lại khi target có Trip IN_PROGRESS tại mục 12.1 bước 4 vẫn **chưa được PO quyết định**. Không suy diễn quyết định giữ Session thành đồng ý hoặc từ chối guard này. Do phiên được giữ, cần xem xét lại sự cần thiết của guard trước khi chốt contract.
- Chưa triển khai code hoặc phê duyệt toàn bộ kế hoạch.
