# Phân tích chi tiết 3.1 — Tài khoản và đăng nhập

> Cập nhật triển khai 30/10/2026: AUTH-01/02 đã có code API, chưa nghiệm thu gửi thật. Quy tắc mới đã chốt: resend giữ phiên và cho phép Trip đang chạy; lưu password trước gửi; dùng AUTH_EMAIL_MODE/AUTH_SMS_MODE cũ; response create/resend thêm SENT/FAILED/CONSOLE. PO yêu cầu không chạy script test, đã cho phép bổ sung biến eSMS còn thiếu ở `.env` thật. Nội dung source baseline bên dưới giữ làm lịch sử; xem auth-technical-design.md và LATEST.md cho hiện trạng mới.

Ngày: 29/10/2026. Mode DISCUSSION. Chỉ phân tích; chưa duyệt contract, field hoặc implementation. Phạm vi nghiệp vụ, không audit bảo mật/hiệu năng.

## 1. Ý nghĩa nghiệp vụ

Tài khoản xác định người dùng, nền tảng và vai trò. Đăng ký PARENT không tạo quyền theo dõi một học sinh; quyền đó đến từ ParentStudentLink qua luồng liên kết riêng. Đăng nhập nhân sự không chứng minh nhận ca hay có mặt trên xe; phân công Trip và xác nhận sẵn sàng là nghiệp vụ riêng.

## 2. Ai tạo tài khoản?

| Tài khoản | Nguồn tạo hiện tại |
|---|---|
| PARENT | Tự đăng ký Mobile qua OTP |
| DRIVER | SYSTEM_ADMIN qua POST /api/v1/drivers |
| SCHOOL_ADMIN | SYSTEM_ADMIN qua POST /api/v1/schools/:id/employees |
| BUS_ATTENDANT | SCHOOL_ADMIN qua cùng endpoint employees của trường mình |
| SYSTEM_ADMIN | Không có luồng tự đăng ký công khai trong AuthController đã đọc; cấp ban đầu thuộc quy trình quản trị riêng |

User lưu một role, email/phone duy nhất trên toàn bảng. Vì vậy cùng định danh đã dùng cho DRIVER/BUS_ATTENDANT không thể tự đăng ký thêm PARENT; hiện chưa có chuyển vai trò hay mô hình đa vai trò cho một User. Đây là giới hạn cần PO chốt, không tự thêm role/bảng.

## 3. Đăng ký phụ huynh

1. Mobile nhập họ tên, chọn SMS hoặc EMAIL, nhập identifier, password, confirmPassword.
2. POST /api/v1/auth/register/request-otp với identifier. Kiểm tra chưa trùng User; OTP cũ còn hiệu lực thì chưa cấp lại. Chưa tạo User.
3. Màn hình OTP gọi POST /api/v1/auth/register/verify với identifier, otp, fullName, password, confirmPassword.
4. API kiểm tra mật khẩu khớp, OTP, định danh; tạo User role PARENT, isActive/isVerified true; tiêu thụ OTP và tạo Session. Trả accessToken, refreshToken, user; tự đăng nhập.
5. Phụ huynh chưa có con liên kết thực hiện luồng liên kết riêng. Email đăng ký khác số giám hộ của học sinh là hai dữ liệu khác nhau.

SMS trong dispatchNotification hiện chỉ ghi console. EMAIL hỗ trợ SMTP nếu cấu hình AUTH_EMAIL_MODE=smtp; mặc định console. API trả message thành công không chứng minh người dùng thực tế đã nhận SMS. Đây là giới hạn khả dụng nghiệp vụ khi bàn giao.

## 4. Đăng nhập và phiên

- Web: POST /api/v1/auth/web/login, request identifier/password, chỉ SYSTEM_ADMIN/SCHOOL_ADMIN.
- Mobile: POST /api/v1/auth/mobile/login, cùng request, DRIVER/BUS_ATTENDANT/PARENT.
- Kiểm tra định danh/mật khẩu và isActive; thành công tạo Session và trả accessToken, refreshToken, user.
- AuthResponse user hiện có id, fullName, email, phone, avatarUrl, role, schoolId. Không coi các giá trị nullable là field có thể bỏ khỏi response.
- GET /api/v1/auth/me trả hồ sơ hiện tại.
- POST /api/v1/auth/refresh nhận refreshToken, đổi cặp token trong Session; phản hồi chỉ accessToken/refreshToken, không có user.
- POST /api/v1/auth/logout thu hồi Session hiện tại và xóa pushToken của Session; không kết thúc Trip, không hủy phân công và không đánh dấu học sinh xuống xe.
- Nhiều Session có thể tồn tại. Thời hạn thực tế lấy từ cấu hình; tài liệu mô tả Access 15 phút, Refresh 7 ngày. Không tự đổi thời hạn trong task này.

## 5. Quên và đổi mật khẩu

Quên mật khẩu: POST /api/v1/auth/forgot-password/request-otp với identifier. Chỉ gửi khi User tồn tại/active/đủ điều kiện; vẫn trả message trung tính. POST /api/v1/auth/reset-password với identifier, otp, newPassword, confirmPassword: đổi mật khẩu, tiêu thụ OTP, thu hồi tất cả Session, xóa pushToken tương ứng; phải đăng nhập lại.

Đổi khi đang đăng nhập: POST /api/v1/auth/me/change-password với currentPassword, newPassword. Kiểm tra mật khẩu cũ, mật khẩu mới khác cũ; đổi và thu hồi Session khác, giữ Session hiện tại. Request hiện không yêu cầu confirmPassword.

Tác động vận hành: người đang lái hoặc giáo viên có thể phải đăng nhập lại trên thiết bị khác sau đổi/đặt lại mật khẩu; Trip vẫn giữ trạng thái. Cần quy trình tiếp tục nhiệm vụ, không tự hoàn thành/hủy chuyến vì hết phiên.

## 6. Hồ sơ

- POST /api/v1/auth/me/avatar cập nhật ảnh, trả avatarUrl/message.
- PATCH /api/v1/auth/me/name nhận fullName, chỉ PARENT tự đổi tên, trả UserResponse.
- Chưa thấy API auth đổi email/phone hoặc người giám hộ. Không dùng đổi tên làm cập nhật hồ sơ học sinh.
- Tạo tài xế/nhân sự sinh mật khẩu tạm; delivery hiện quan sát được là console trong development. Chưa có quy trình mời/nhận tài khoản production đầy đủ tại các phương thức đã đọc. Có thể khôi phục bằng OTP nếu có kênh thật phù hợp; không coi điều đó thay cho quy trình bàn giao đã chốt.

## 7. Các bảng thay đổi

| Thao tác | Dữ liệu |
|---|---|
| Xin OTP | OtpChallenge |
| Hoàn tất đăng ký | User, OtpChallenge, Session |
| Đăng nhập | Session |
| Refresh/logout | Session |
| Đặt lại mật khẩu | User, OtpChallenge, các Session |
| Đổi mật khẩu | User, các Session khác |
| Sửa tên/ảnh | User |

Các thao tác auth trên không tự tạo/sửa Student, ParentStudentLink hoặc Trip.

## 8. Vấn đề và tiêu chí đề xuất — chưa triển khai

| ID | Tình huống | Hướng xử lý cần PO quyết định |
|---|---|---|
| AUTH-01 | SMS chỉ console, email phụ thuộc cấu hình | Chốt kênh bàn giao thực tế và phạm vi demo/production; chỉ nghiệm thu khi nhận được mã thật trên kênh được duyệt |
| AUTH-02 | Tạo nhân sự nhưng chưa có bàn giao tài khoản đầy đủ | Luồng mời/kích hoạt riêng; giữ payload API tạo cũ; chưa chốt field/path |
| AUTH-03 | Giáo viên/tài xế đồng thời là phụ huynh | Giữ một role/tài khoản với định danh khác hoặc mở rộng đa vai trò; không tự đổi mô hình |
| AUTH-04 | Nghỉ việc/ngừng công tác nhưng còn Trip được gán | Impact preview, người quyết định, thay/hủy các chuyến chưa chạy; Trip đang chạy cần bàn giao; không chỉ bật isActive=false |
| AUTH-05 | Mất số/email hoặc đổi người giám hộ | Tách đổi định danh User khỏi đổi guardianPhone Student; xác minh/thẩm quyền/ảnh hưởng liên kết cần chốt |
| AUTH-06 | Trường ngừng hoạt động/hết hợp đồng | Chốt vẫn cho đăng nhập xem lịch sử hay chặn; hạn chế tạo nghiệp vụ mới riêng; không tự đồng nhất trạng thái trường với tài khoản |
| AUTH-07 | Đổi/reset/logout giữa chuyến | Giữ Trip, cho tiếp tục sau đăng nhập; dự phòng liên lạc khi mất thiết bị/không nhận OTP |
| AUTH-08 | Tài khoản verified bị hiểu là phụ huynh hợp lệ/nhân sự đủ điều kiện | Làm rõ nghĩa isVerified; đăng ký chưa liên kết con; đăng nhập chưa nhận ca; không tự đổi field |

Trạng thái ban đầu AUTH-01..08: NEEDS_DECISION. Quyết định mới hơn tại mục 12 bên dưới được ưu tiên; chưa triển khai code.

## 9. Tương thích API cũ

- Giữ identifier/password và các payload đăng ký, reset, change-password hiện tại.
- Giữ accessToken/refreshToken/user cho đăng nhập/đăng ký; refresh giữ token pair; endpoint message giữ message.
- Không thêm field bắt buộc vào request cũ hoặc đổi nghĩa role/schoolId/email/phone.
- Nghiệp vụ mới như mời tài khoản, đổi định danh, khóa nhân sự có kiểm tra ảnh hưởng nên xem xét endpoint mới; chưa chốt path/field/default nếu chưa có PO quyết định.
- Thay quy tắc cho phép đăng nhập hoặc các lỗi/status cũng có thể làm FE cũ lỗi dù giữ payload. Phải nêu tác động trước phê duyệt.

## 10. Câu hỏi hội đồng

| Câu hỏi | Trả lời theo hiện trạng |
|---|---|
| Có tài khoản thì xem con được ngay? | Chưa, phải liên kết qua số giám hộ trong hồ sơ học sinh |
| Nhân sự tự đăng ký được không? | Không qua đăng ký PARENT; nhà xe/trường cấp theo thẩm quyền |
| Một người vừa giáo viên vừa phụ huynh? | Mô hình hiện tại một role/User và định danh unique; chưa hỗ trợ đa vai trò trên cùng tài khoản |
| Đăng xuất có hủy chuyến không? | Không; Session và Trip độc lập |
| Đổi và quên mật khẩu khác nhau? | Đổi giữ Session hiện tại, thu hồi các Session khác; reset thu hồi toàn bộ |
| verified nghĩa đã kiểm chứng quan hệ giám hộ? | Không; ParentStudentLink và xác minh liên kết là luồng riêng |
| SMS đã chạy thật? | Source đã đọc chỉ có console; cần provider/quy trình bàn giao được duyệt |

## 11. Bằng chứng và giới hạn

Đọc auth.service.ts, auth.controller.ts, auth.dto.ts, otp.service.ts; register/verify-otp Mobile; createDriver và createSchoolAdmin. Không gọi API, DB, OTP/provider; không sửa code. Runtime NOT_VERIFIED. Chưa kiểm chứng mọi nhánh trên thiết bị; không chạy typecheck/tests cho thay đổi Markdown. Các tên giải pháp/endpoint tương lai chỉ là mô tả khái niệm.

## 12. Quyết định PO ngày 30/10/2026 và phần cần giải thích

Các quyết định này chốt hướng nghiệp vụ, chưa phê duyệt code, API contract, schema hoặc field mới.

| ID | Quyết định / xử lý | Trạng thái hiện tại |
|---|---|---|
| AUTH-01 | Dùng eSMS gửi OTP với đúng format test của nền tảng eSMS, không dùng Brandname riêng. Vẫn giữ mode log console để tiết kiệm chi phí development. Chưa tra cứu/chốt template, tham số, cấu hình hoặc gọi provider trong task này. | Đã chốt hướng; chưa triển khai |
| AUTH-02 | PO mô tả luồng hiện tại gửi mật khẩu qua SMS hoặc email; luồng mới bắt buộc email và chỉ gửi mật khẩu qua email. Giữ ghi chú source baseline: cách bàn giao quan sát được trước đó là console development, chưa coi là đã xác minh delivery thực tế. Không tự chuyển sang cơ chế link kích hoạt khác yêu cầu PO. Email bắt buộc có thể ảnh hưởng request tạo nhân sự cũ chỉ có phone; cần trình contract/chuyển tiếp trước khi code, chưa tự chọn cách xử lý. | Đã chốt nghiệp vụ mới; contract tương thích cần làm rõ |
| AUTH-03 | Không mở rộng đa vai trò; giữ tài khoản riêng cho từng role. Không suy diễn yêu cầu kiểm tra một người ngoài đời có nhiều tài khoản; định danh unique hiện tại vẫn là baseline, chưa duyệt đổi constraint. | Đã chốt giữ mô hình |
| AUTH-04 | Chuyển nghỉ việc và xử lý phân công còn tồn tại sang WF-03/WF-08, nhóm nhân sự/điều phối; giữ ID để truy vết. | Chuyển nhóm; quy tắc chi tiết chưa chốt |
| AUTH-05 | Khi mất số, phụ huynh liên hệ trực tiếp trường để trường sửa thông tin học sinh/số giám hộ. Đây chưa phải quyết định tự đổi phone/email đăng nhập của User, chuyển ParentStudentLink hoặc cấp API mới. | Đã chốt hướng xử lý thủ công qua trường; chưa triển khai |
| AUTH-06 | Chuyển trạng thái trường/hợp đồng sang WF-02/WF-16; không ép quyết định trong luồng Auth. | Chuyển nhóm; quy tắc chi tiết chưa chốt |
| AUTH-07 | PO chưa hiểu tình huống; cần giải thích: phiên hết/đăng xuất khi đang làm nhiệm vụ không đổi trạng thái Trip. Đăng nhập lại tiếp tục nếu vẫn được phân công. Mất thiết bị/chuyển người là điều phối khác. | Chờ hiểu rõ; chưa có quyết định mới |
| AUTH-08 | PO chưa hiểu tình huống; cần giải thích: isVerified không phải bằng chứng đã liên kết con hoặc nhận ca. ParentStudentLink, phân công Trip và attendantReadyAt là các mốc riêng. Chưa đề xuất thêm field hoặc chặn đăng nhập. | Chờ hiểu rõ; chưa có quyết định mới |

Điểm cần hỏi khi thiết kế AUTH-02: request cũ chỉ có phone sẽ tiếp tục được chấp nhận, chuyển sang API mới bắt buộc email hay bị từ chối theo quy tắc mới? Không tự chọn phương án vì ảnh hưởng FE cũ. Yêu cầu bắt buộc email đã rõ; đây là câu hỏi về cách áp dụng/chuyển tiếp contract.

### Xác nhận bổ sung của PO — 30/10/2026

- **AUTH-07: đã thống nhất.** Đăng xuất/hết phiên không hủy Trip, không xóa điểm danh hoặc thay phân công. Người dùng đăng nhập lại tiếp tục nhiệm vụ nếu vẫn được phân công và trạng thái chuyến còn cho phép. Mất thiết bị hoặc chuyển người thuộc điều phối. Chưa yêu cầu thêm tính năng Auth mới.
- **AUTH-08: đã làm rõ và thống nhất.** isVerified thuộc xác minh tài khoản, không tự chứng minh quyền giám hộ, việc nhận ca hoặc sự sẵn sàng. Liên kết con qua ParentStudentLink, phân công Trip và attendantReadyAt là các mốc riêng. Không thêm field hoặc chức năng mới cho mục này.
- Hai dòng AUTH-07/08 trong bảng mục 12 ghi lại trạng thái trước giải thích; xác nhận bổ sung này thay thế trạng thái chờ hiểu rõ đó.
- Phần thảo luận 3.1 đã ghi nhận đủ phản hồi 1–8. Các chủ đề chuyển nhóm vẫn được theo dõi tại nhóm đích. Riêng contract/chuyển tiếp AUTH-02 và chi tiết tích hợp eSMS chưa được thiết kế/phê duyệt; chưa có code hoặc nghiệm thu mới.

### Chốt thêm khi lập kế hoạch — 30/10/2026

- PO chọn **bắt buộc email ngay trên API tạo nhân sự cũ**, chấp nhận request chỉ có phone bị từ chối. Câu hỏi chuyển tiếp AUTH-02 trước đó đã được trả lời; đây là ngoại lệ tương thích được PO chấp nhận.
- PO chọn **mẫu test gửi SMS thật bằng Brandname dùng thử eSMS**, không phải Sandbox không gửi tin.
- PO chọn **giữ tài khoản nếu email bàn giao lỗi, có thao tác gửi mật khẩu mới qua email**. Phạm vi đối tượng được gửi lại, field trạng thái gửi và console cho email nhân sự đang được hỏi riêng; chưa tự chốt.
- Kế hoạch chi tiết: [auth-api-improvement-plan.md](auth-api-improvement-plan.md). Chưa triển khai code.

### Chốt contract bổ sung — 30/10/2026

- PO đồng ý field credentialDeliveryStatus; cho console development và giá trị CONSOLE. Tập giá trị đã chốt: SENT/FAILED/CONSOLE, SENT chỉ là SMTP accepted.
- Gửi lại mật khẩu áp dụng cả nhân sự đã đăng nhập; không giới hạn tài khoản chưa dùng.
- Thiết kế tác động mật khẩu/Session được bổ sung tại kế hoạch mục 12.1; thu hồi Session và chặn trong chuyến đang chạy mới là đề xuất chờ duyệt. Chưa cho phép triển khai code.

Quyết định mới hơn: PO không yêu cầu thu hồi Session khi quản trị viên cấp lại mật khẩu nhân sự. Giữ phiên/tokenVersion/pushToken, mật khẩu mới áp dụng cho đăng nhập mới. Quyết định này thay thế đề xuất thu hồi trong kế hoạch; guard Trip IN_PROGRESS còn chưa chốt. Không tự sửa quy tắc API tự đổi/quên mật khẩu. Xem kế hoạch mục 12.2.
