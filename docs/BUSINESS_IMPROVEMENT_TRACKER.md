# RoadToSchool — Theo dõi hoàn thiện nghiệp vụ

> Ngày lập: 29/10/2026 (Asia/Saigon).
> Nguồn: phân tích source và trao đổi với PO trong chat ngày 29/10/2026.
> Mục đích: giữ một baseline để theo dõi vấn đề nào đã được chốt, triển khai và nghiệm thu.
> Đây là tài liệu phân tích và đề xuất, không phải phê duyệt triển khai hoặc mở rộng scope.

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

Phân tích chi tiết: [3.1 — Tài khoản và đăng nhập](ai-review/auth-business-flow-detail.md), gồm AUTH-01..08 ở trạng thái NEEDS_DECISION; chưa duyệt triển khai.

Cập nhật 30/10/2026: quyết định mới tại mục 12 tài liệu chi tiết được ưu tiên: eSMS format test + console dev; nhân sự bắt buộc email và chỉ gửi mật khẩu email; giữ tài khoản riêng từng role; mất số liên hệ trường sửa thông tin học sinh. AUTH-04 chuyển WF-03/WF-08; AUTH-06 chuyển WF-02/WF-16. AUTH-07/08 đang được giải thích, chưa chốt thay đổi. Chưa triển khai code; trạng thái NEEDS_DECISION ban đầu không còn áp dụng đồng loạt.

- Actor: 5 role; phụ huynh tự đăng ký.
- Màn hình: đăng nhập Web/Mobile; đăng ký → OTP; quên/đổi mật khẩu; hồ sơ.
- API: POST `/auth/web/login`, `/auth/mobile/login`, `/auth/register/request-otp`, `/auth/register/verify`, `/auth/forgot-password/request-otp`, `/auth/reset-password`, `/auth/me/change-password`; GET `/auth/me`.
- Khoảng trống: nhân sự nghỉ việc còn chuyến được gán; đổi/mất số người giám hộ; tài khoản hoạt động không đồng nghĩa đủ điều kiện làm việc. Xem P-07, P-10.

### WF-02 — Trường và dịch vụ

- Actor: nhà xe quản lý; nhà trường xem cấu hình trường mình.
- Thao tác: thêm trường, hợp đồng, tọa độ, lịch tuần; xem tác động trước thay đổi.
- API: POST/GET `/schools`; GET `/schools/:id`; PATCH `/schools/:id/contract`, `/schedule`, `/location`, `/status`; GET `/schools/:id/location-impact`.
- Hiện có: chặn sửa hợp đồng khi còn plan DRAFT/ACTIVE; đổi lịch xử lý các chuyến SCHEDULED.
- Vấn đề: lịch ngoại lệ, đổi lịch sau Ready, snapshot giờ chạy, gia hạn không gián đoạn. Xem B-05, P-01, P-05.

### WF-03 — Nguồn lực và bãi

- Actor: nhà xe quản lý xe/tài xế/bãi; trường quản lý giáo viên.
- Thao tác: thêm và xem xe, tài xế, nhân sự trường; chỉnh bãi sau xem tác động.
- API: POST/GET `/vehicles`, `/drivers`; POST `/schools/:id/employees`; GET `/system-settings/parking-lot/impact`; PUT `/system-settings/parking-lot`.
- Vấn đề: xe bảo dưỡng, giấy phép nhân sự, định nghĩa số chỗ và ngày hiệu lực đổi bãi. Xem B-12, P-05, P-07.

### WF-04 — Học sinh và phụ huynh

- Actor: SCHOOL_ADMIN tạo học sinh; PARENT liên kết.
- Thao tác: thêm học sinh; phụ huynh nhập mã → OTP số giám hộ → xác nhận; xem/hủy liên kết.
- API: POST `/schools/:schoolId/students`; POST `/parents/link-requests`, `/parents/verify-link`; GET `/parents/students`, `/parents/students/:id`; DELETE `/parents/students/:id`.
- Hiện có: kiểm tra học sinh/trường hoạt động khi liên kết mới.
- Vấn đề: nhiều người giám hộ mâu thuẫn, đổi số, chuyển trường/năm học, khác biệt giữa liên kết ứng dụng và quyền giám hộ. Xem P-10, P-12.

### WF-05 — Tạo phương án

- Actor: SYSTEM_ADMIN.
- Thao tác: chọn trường, học sinh, xe/ràng buộc → tối ưu → xem bản đồ → xác nhận DRAFT.
- API: GET `/routes/preparation/:schoolId`; POST `/routes/optimize-preview`, `/routes/preview/cancel-return`, `/routes/confirm-plan`.
- Hiện có: preview tạm; DRAFT giữ xe theo quy tắc khoảng hợp đồng.
- Vấn đề: học sinh chưa được phân tuyến; điểm dừng an toàn; thời gian toàn tuyến so với thời gian ngồi xe mỗi em; giữ xe cả hợp đồng. Xem P-08, P-13.

### WF-06 — Gán nguồn lực và duyệt

- Actor: nhà xe gán xe/tài xế; trường gán giáo viên và duyệt.
- Thao tác: mở phương án → ứng viên → lưu phân công → xem readiness → trường duyệt.
- API: GET `/routes/route-plans/:id`, `/approval-readiness`; PATCH `/routes/route-plans/:id/assignments/vehicle`, `/driver`, `/bus-attendant`; POST `/routes/route-plans/:id/approve`.
- Vấn đề: thay đổi ACTIVE có cần duyệt lại; chấp nhận nhiệm vụ; hiệu lực thay mặc định đối với Trip đã sinh. Xem P-05, P-14.

### WF-07 — Sinh chuyến và lịch

- Actor: nhà xe/tự động sinh; nhân sự và phụ huynh xem.
- Thao tác: chọn trường/khoảng ngày, sinh; xem lịch Web hoặc Mobile.
- API: POST `/trips/generate`; GET `/trips`, `/trips/:id`, `/trips/mobile/driver/schedule`, `/trips/mobile/bus-attendant/schedule`, `/trips/mobile/parent/student/:studentId/schedule`.
- Baseline: cron 02:00, mặc định nhìn trước 7 ngày; ACTIVE, lịch tuần, trong hợp đồng; ngày chạy sau ngày kích hoạt; một Route–ngày tối đa một Trip; snapshot và roster riêng.
- Vấn đề: phân biệt lịch dự kiến/Trip đã lưu; chuyến đã hủy không được tự tái tạo bằng sinh lại; thêm con sau sinh trước; không phục vụ ngay ngày duyệt. Xem B-04, P-05, P-15.

### WF-08 — Đổi phân công Trip

- Actor: nhà xe đổi xe/tài xế; trường đổi giáo viên.
- Thao tác: chi tiết chuyến → phân công → chọn và lưu.
- API: PATCH `/trips/:id/assignment`.
- Hiện có: kiểm tra số chỗ, người hợp lệ và trùng lịch; giới hạn theo trạng thái.
- Vấn đề: thời gian di chuyển giữa chuyến, chuyến trước trễ, reset Ready khi thay giáo viên, bàn giao giữa chuyến. Xem B-03, P-02, P-09, P-14.

### WF-09 — Chiều đến trường

- Actor: giáo viên và tài xế; phụ huynh theo dõi.
- Bước: Ready → Start → điểm danh dọc đường → đến trường → xuống xe → Complete.
- API: POST `/trips/:id/attendant-ready`, `/start`; PUT `/trips/:id/attendance/:studentId`; POST `/trips/:id/attendance/verify-qr`, `/arrive-at-school`; PUT `/trips/:id/attendance/:studentId/alighting`; POST `/trips/:id/complete`.
- Hiện có: trước đến trường phải hết UNMARKED; vắng có lý do; hoàn thành sau khi mọi PRESENT đã xuống.
- Vấn đề: chờ/no-show; thao tác đến trường không chứng minh vị trí; sửa điểm danh sau đến trường khác QR; bàn giao cho trường. Xem B-09, B-10, P-03, P-04.

### WF-10 — Chiều về bãi

- Actor: giáo viên và tài xế; phụ huynh theo dõi.
- Bước: Ready → điểm danh tại trường khi SCHEDULED → Start khi hết UNMARKED → xuống tại từng điểm → Complete. Dùng API WF-09, không có arrive-at-school.
- Vấn đề: tất cả ABSENT vẫn có thể Start; phụ huynh tự đón; không người nhận; chưa chứng minh về bãi. Xem B-08, B-10, P-04.

### WF-11 — Theo dõi và lịch sử

- Actor: tài xế phát vị trí; các bên xem theo quyền.
- Thao tác: mở bản đồ/dẫn đường, theo xe, xem hành trình.
- API: GET `/trips/:id/navigation`, `/location-history`, `/operational-state`; PUT `/trips/:id/navigation/session`, `/navigation/position`; POST `/trips/:id/navigation/segment`.
- Vấn đề: chuyến trễ mất home card; GPS cũ/mất dữ liệu; ETA chỉ ước tính; phạm vi xem trước/sau con lên xuống. Xem B-01, P-06.

### WF-12 — Học sinh báo nghỉ

- Actor: PARENT.
- Thao tác: chọn con/ngày/chiều/Trip → OTP → xác nhận → xem hoặc rút đơn.
- API: GET `/leave-notices/options`, `/leave-notices`, `/leave-notices/:id`; POST `/leave-notices/otp`, `/confirm`, `/:id/cancel`.
- Hiện có: dựa trên Trip đã lưu; ràng buộc trạng thái/điểm danh; chiều về khóa sau Ready.
- Vấn đề: nghỉ cả ngày/dài ngày, báo muộn, quyền rút đơn giữa phụ huynh; nghỉ xe không có nghĩa nghỉ học. Xem P-03, P-10, P-11.

### WF-13 — Nhân sự báo nghỉ

- Actor: DRIVER/BUS_ATTENDANT báo OTP; quản trị viên bố trí.
- Thao tác: chọn chuyến, báo → quản trị viên xem ứng viên → thay hoặc hủy chuyến.
- API: luồng OTP WF-12; GET `/leave-notices/:id/replacement-candidates`; POST `/leave-notices/:id/assign-replacement`, `/:id/cancel-trip`.
- Hiện có: còn chờ thay nhân sự thì không Start.
- Vấn đề: nghỉ theo kỳ; người thay nhận việc; người cũ quay lại; đồng thời thiếu cả hai người. Xem P-14.

### WF-14 — Yêu cầu sửa thông tin/địa chỉ

- Actor: phụ huynh gửi; trường duyệt thông tin; nhà xe xử lý địa chỉ có tuyến.
- Thao tác: chi tiết con → yêu cầu → OTP; quản trị viên xem, preview nếu ảnh hưởng tuyến, duyệt/từ chối.
- API: POST `/parents/students/:id/update-requests/otp`, `/verify`; nhóm `/schools/:schoolId/update-requests`; POST `/system-admin/update-requests/:requestId/routing-preview`, `/approve`, `/reject`.
- Hiện có: trường không tự duyệt địa chỉ khi học sinh thuộc plan DRAFT/ACTIVE.
- Vấn đề: duyệt không bắt buộc preview khả thi còn hạn/fingerprint; đồng bộ giờ điểm và snapshot; ngày hiệu lực và phương án tiếp tục phục vụ. Xem B-02, P-05.

### WF-15 — Chèn học sinh và ngừng phục vụ

- Actor: nhà xe chèn; nhà trường đổi trạng thái học sinh.
- Thao tác: xem tuyến → chọn cặp tuyến → preview → xác nhận; disable xem tác động trước lưu.
- API: GET `/routes/students/:studentId/routing`, `/insertion-options`; POST `/routes/student-insertions/preview`, `/confirm`; GET `/schools/:schoolId/students/:id/disable-impact`; PATCH `/schools/:schoolId/students/:id/status`.
- Vấn đề: Route thay nhưng Trip cũ giữ roster; bật lại không đồng nghĩa xếp tuyến; disable khác tạm ngừng dịch vụ/thôi học. Xem B-04, P-12.

### WF-16 — Hủy phương án/hết hợp đồng

- Actor: quản trị viên theo phạm vi.
- Thao tác: xem tác động → nhập lý do → hủy; đối soát hợp đồng hết hạn.
- API: GET `/routes/route-plans/:id/cancellation-impact`; POST `/routes/route-plans/:id/cancel`.
- Vấn đề: bảo toàn chuyến vừa Start; chưa thấy nơi gọi đối soát EXPIRED; chuyển tiếp phương án cũ/mới. Xem B-06, B-07, P-05.

### WF-17 — Sự cố

- Actor: tài xế/giáo viên báo; quản trị viên xử lý; giáo viên xác nhận tự động.
- Thao tác: báo người còn lại chưa đến → ứng viên → người cũ đến/thay/hủy; xem cảnh báo lệch tuyến/trễ điểm.
- API: GET `/trips/:id/incident-options`; POST `/trips/:id/incidents`; GET `/incidents`, `/incidents/:id/replacement-candidates`; POST `/incidents/:id/resolve`, `/cancel-trip`, `/confirm`.
- Vấn đề: thay người thiếu kiểm tra lại trùng chuyến; ngoại lệ nhà xe xử lý thiếu giáo viên; cảnh báo mỗi loại một lần; tự đóng khi Complete không phải xác nhận sai; chưa có tai nạn/y tế/xe hỏng/cứu hộ. Xem B-03, B-11, P-02, P-16.

### WF-18 — Tổng quan và thông báo

- Actor: quản trị viên xem tổng quan; các vai trò xem inbox.
- Thao tác: Tổng quan → chuông → mở đích → đánh dấu đọc.
- API: GET `/admin/overview`, `/notifications/summary`, `/notifications`, `/notifications/:id/target`; PUT `/notifications/:id/read`, `/notifications/read-all`.
- Vấn đề: đọc khác giải quyết; inbox khác push đã nghiệm thu; cần người nhận trách nhiệm/thời hạn xử lý. Xem P-16.

## 5. Danh sách bất cập từ phân tích source

Các dòng dưới là phát hiện tĩnh tại baseline; chưa có tái hiện runtime trong task phân tích. Ưu tiên là đề xuất.

| ID | Ưu tiên | Vấn đề và bằng chứng baseline | Trạng thái | Tiêu chí hoàn tất đề xuất |
|---|---|---|---|---|
| B-01 | Rất cao | trips.service.ts: getHomeTrip/getParentHomeCards lọc scheduledEndAt cả với IN_PROGRESS, chuyến trễ mất thẻ | OPEN | Chuyến đang chạy vẫn hiện sau giờ dự kiến; chuyển terminal đúng |
| B-02 | Rất cao | student-requests.service.ts: approveRequest không bắt buộc preview hợp lệ/khả thi/còn hạn và fingerprint; thiếu đồng bộ giờ/snapshot | OPEN | Duyệt đúng preview hiện hành; đồng bộ tuyến/điểm/Trip theo ngày hiệu lực; giữ Trip đóng băng |
| B-03 | Rất cao | incidents.service.ts: resolveIncident REPLACED thiếu kiểm tra overlap tại mutation, khác phân công Trip thông thường | OPEN | Từ chối người vừa bận, sai khả dụng; không dựa riêng danh sách ứng viên cũ |
| B-04 | Cao | routes.service.ts: confirmStudentInsertion giữ Trip đã sinh; con có thể chưa có trong chuyến sắp tới | NEEDS_DECISION | Chốt ngày phục vụ; màn hình cho biết chính xác; Trip được cập nhật theo quy tắc duyệt |
| B-05 | Cao | schools.service.ts: updateSchedule quét SCHEDULED kể cả Ready; dùng duration Route; phần quan sát chỉ sửa snapshot departureTime | OPEN | Quy tắc frozen rõ; giờ Trip/điểm/snapshot nhất quán; xác nhận lại nếu cần |
| B-06 | Rất cao | routes.service.ts: cancelRoutePlan đọc SCHEDULED rồi ghi theo ID; expectedFingerprint chưa dùng | OPEN | Không hủy Trip đã Start trong lúc thao tác; tác động được kiểm tra lại |
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
