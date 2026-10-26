# RoadToSchool — Báo nghỉ học sinh, tài xế và giáo viên phụ xe

> Bản thiết kế ngày 26/10/2026. PO đã đồng ý các lựa chọn còn lại và thiết kế DB/API/wireframe trong hội thoại, yêu cầu tạo prompt để Antigravity thực thi. File này ghi nhận phê duyệt của PO, không phải agent tự cấp approval. Codex mới cập nhật tài liệu/prompt; chưa implement, migrate, gửi OTP hoặc mutate dữ liệu.

### Cập nhật UI/UX sau implementation — 26/10/2026

PO yêu cầu sửa UI/UX qua prompt `docs/ai-review/leave-notice-ui-ux-fix-prompt.md`. Bản này ưu tiên hơn các nhãn/bố cục cũ ở dưới: Web đồng bộ bảng và dropdown filters; lịch sử Parent từ Tiện ích bỏ bộ chọn học sinh (Student Detail vẫn phạm vi cố định); student notice chỉ Đã nhận/Đã hủy, không dùng trạng thái nhân sự; form chọn học sinh dropdown, ngày bằng datepicker; thêm Báo nghỉ vào `mobile/app/parent/schedule.tsx`; card Trip dùng confirm alert → gửi OTP với selection gắn sẵn → OTP, không đi qua form. Giữ OTP bắt buộc, DB enum và các guard nghiệp vụ. Đây là chỉ thị sửa gửi Antigravity; Codex chỉ soạn tài liệu, chưa áp dụng các sửa UI này.

### Cập nhật điều kiện từ PO — 26/10/2026

- **Đã chốt:** chiều về `TO_PARKING` không được tạo báo nghỉ khi giáo viên đã Ready (`attendantReadyAt != null`). Áp dụng lúc lấy options, gửi OTP và kiểm tra lại khi confirm dưới Trip lock. Không ghi đè PRESENT bằng ABSENT.
- **Đã chốt lại:** chặn lịch **Dự kiến (VIRTUAL) chưa sinh Trip**; vẫn cho báo nghỉ Trip thật **SCHEDULED (Lập lịch)** chưa bắt đầu, nếu đáp ứng các guard còn lại. Quyết định này thay thế quyết định trước cho phép lịch chưa sinh Trip.
- Luồng báo nghỉ không tự sinh Trip. `LeaveNotice.tripId` và lựa chọn gửi OTP phải tham chiếu Trip thật đã tồn tại; bỏ phương án materialize khi confirm OTP.
- Quyết định Ready mới nói về tạo báo nghỉ; chưa tự mở rộng sang chặn hủy báo nghỉ của Parent/Driver sau Ready. Guard hủy riêng Attendant và sau bố trí người thay giữ theo quy tắc đã có.
- **PO duyệt tiếp:** giữ lifecycle SCHEDULED, tính assignmentStatus riêng; Parent còn liên kết cùng học sinh đều xem được nhưng chỉ người tạo được hủy; SMS tạm qua console; Driver/Attendant nhận OTP theo contact đã đăng ký, có cả email và SĐT thì gửi cả hai; hủy Trip bắt buộc lý do. Các đề xuất DB/API/wireframe bên dưới đã được PO đồng ý trong phạm vi module này.

## 1. Quyết định PO đã xác nhận

- Đây là **báo nghỉ**, không phải xin phép/duyệt nghỉ. OTP xác nhận xong thì báo nghỉ có hiệu lực; admin chỉ xử lý nguồn lực thay thế.
- Áp dụng học sinh (Parent thực hiện), Driver và BUS_ATTENDANT; không tạo role TEACHER.
- Gửi OTP khi báo nghỉ. Học sinh gửi SMS tới **Student.guardianPhone** trong hồ sơ; SMS tạm qua console. Driver/Attendant: có email thì gửi email, có SĐT thì gửi SMS console, có cả hai thì gửi cả hai; server tự xác định từ account, không cho client bỏ bớt kênh hoặc nhập contact tùy ý.
- Parent còn liên kết học sinh đều được xem lịch sử con; chỉ người tạo notice được hủy, đồng thời phải còn quyền liên kết và đáp ứng guard.
- Chỉ cho báo nghỉ Trip thật đã sinh, status SCHEDULED và chưa bắt đầu; chặn lịch Dự kiến chưa có Trip. Không tạo Trip từ luồng báo nghỉ.
- Chọn ngày, chiều TO_SCHOOL/TO_PARKING và **một chuyến cụ thể** nếu có nhiều chuyến cùng ngày/chiều. Không tự báo nghỉ tất cả các chuyến.
- Học sinh/Driver báo hoặc hủy báo nghỉ trước khi Trip bắt đầu. Attendant chỉ trước khi Ready (đồng thời Trip chưa bắt đầu). **Bổ sung với tạo báo nghỉ chiều về:** tất cả đối tượng bị chặn khi Attendant đã Ready; chưa tự đổi quy tắc hủy của Parent/Driver.
- Hủy báo nghỉ không cần OTP. Driver/Attendant đã được bố trí người thay thì không được hủy báo nghỉ, kể cả sau này assignment thay đổi trở lại.
- Học sinh báo nghỉ cập nhật ABSENT với lý do chính xác PO yêu cầu: **“Phụ huynh xin nghỉ”**. Hủy phải khôi phục điểm danh đúng nguồn/trạng thái trước đó.
- Driver nghỉ: SYSTEM_ADMIN phân công Driver thay thế trên modal tại tab Báo nghỉ. Attendant nghỉ: SCHOOL_ADMIN của trường phân công tương tự. Không dùng approve/reject đơn nghỉ.
- Còn báo nghỉ nhân sự chưa xử lý thì Trip phải thể hiện Chờ phân công và không thể Start. Có thể hủy Trip nếu không bố trí được người thay; Trip CANCELLED không thể khôi phục.
- Mobile Home thay greeting bằng Tiện ích, icon trên/tên dưới, căn giữa. Các card Home/Lịch có hành động Báo nghỉ. Parent Student Detail có mục Báo nghỉ cố định học sinh. Hai admin có tab Báo nghỉ.

## 2. Bằng chứng source và phần tái sử dụng

- `api/prisma/schema.prisma`: User có email/phone/role/schoolId; Student.guardianPhone; ParentStudentLink N-N; OtpChallenge có userId/studentId/payloadHash/purpose/consumedAt; Trip có unique(routeId,serviceDate), status, assigned users, attendantReadyAt, cancellationReason; TripAttendance có status/reason/marker/timestamps/alightedAt.
- `TripsService.generateTripsInternal`: ACTIVE plan, service date sau ngày activate, hợp đồng, weeklySchedule, đủ phân công, roster, unique occurrence. Mobile schedule có PERSISTED/VIRTUAL; VIRTUAL chưa có tripId.
- `TripsService.updateTripAssignment`: role-field scope, account active, Attendant đúng trường, kiểm tra trùng giờ; đổi Attendant reset Ready. Route-level candidate rules khác Trip-specific rules nên không dùng nguyên API phân công nhóm tuyến để thay một ca.
- `TripsService.startTrip/markAttendantReady/updateAttendance`: khóa Trip hiện có; cần tích hợp báo nghỉ vào cùng các guard/transaction.
- `OtpService`: email có SMTP/console, **SMS hiện chỉ console development**, chưa có giao vận SMS thật. Không coi SMS đã sẵn sàng production. Chưa chọn nhà cung cấp/gói/dependency.
- OTP hiện có payloadHash nhưng một số flow consume OTP trước mutation nghiệp vụ; phương án mới phải đảm bảo một lần consume đi cùng tạo notice/điểm danh/chặn phân công. Cần kiểm tra nhánh sai OTP ghi attempts không bị rollback do throw trong cùng transaction.

## 3. Quy trình và trạng thái

### 3.1. Báo nghỉ

1. GET options theo actor, học sinh (Parent), ngày và chiều; chỉ trả Trip thật đã tồn tại, đúng quyền và điều kiện báo nghỉ. Không trả VIRTUAL làm lựa chọn báo nghỉ; không sinh Trip hoặc gửi OTP trong GET.
2. Nếu nhiều chuyến, chọn **một**. Nếu một chuyến thì tự chọn. Card Trip thật đã xác định chuyến nên điền sẵn, không bắt chọn lại.
3. Confirm thông tin -> gửi OTP -> trang OTP. Trước OTP thành công chưa có notice có hiệu lực, chưa thay điểm danh/phân công.
4. OTP bind actor + kind + subject + tripId bắt buộc + expected assignment/roster + contact đăng ký. Ngày/chiều lấy từ Trip; đổi lựa chọn cần OTP mới.
5. Xác nhận OTP: kiểm tra lại Trip thật còn SCHEDULED, quyền/điều kiện/thời điểm/assignment; consume và tạo notice trong transaction an toàn, không sinh Trip. Nếu Trip đã Start, hoặc Attendant đã Ready với báo nghỉ giáo viên/báo nghỉ chiều về thì từ chối; không lách bằng điều kiện khi gửi OTP.
6. Học sinh -> RECORDED; Driver/Attendant -> PENDING_REPLACEMENT ngay, không có trạng thái chờ duyệt phép.

### 3.2. Một notice cho một Trip

```text
Học sinh: OTP -> Đã báo nghỉ -> Đã hủy báo nghỉ (khi còn hợp lệ)
Nhân sự:  OTP -> Chờ phân công -> Đã bố trí người thay
                          \-> Đã hủy báo nghỉ (chưa bố trí người thay)
                          \-> Chuyến đã hủy (admin có quyền)
```

Không tự sửa notice thành không tồn tại sau khi chuyến chạy. Lịch sử giữ thời gian/người tạo, xử lý hoặc hủy. Một Trip có thể có hai notice nhân sự pending; xử lý một chưa đủ mở Start nếu notice kia vẫn pending.

### 3.3. Chờ phân công — phương án PO đã đồng ý

**Không thêm enum TripStatus** ở bản đầu:
- lifecycle vẫn SCHEDULED trước Start;
- API thêm `assignmentStatus=WAITING_ASSIGNMENT|ASSIGNED`, tính từ pending staff notices;
- UI ưu tiên badge Chờ phân công; `canStartTrip=false` và disabledReason cụ thể, server thực sự chặn Start;
- giữ assigned IDs cũ để lưu dấu người nghỉ, không đặt null; assignment cũ không được coi là nhân sự khả dụng;
- sau khi hết pending mới quay về Lập lịch và các điều kiện Ready/boarding/time gates thông thường.

PO đã đồng ý phương án trạng thái phân công tính riêng này; không thêm WAITING_ASSIGNMENT vào TripStatus hoặc lưu thêm cột chỉ để duplicate pending notices.

### 3.4. Chỉ báo nghỉ Trip thật đã sinh

- Lịch VIRTUAL mang nhãn “Dự kiến”, chưa có tripId thật: không được gửi OTP hoặc tạo báo nghỉ. Card có thể ẩn/disable Báo nghỉ với lý do ngắn “Chuyến chưa được tạo”.
- Form chỉ chọn Trip thật SCHEDULED đúng actor/học sinh và ngày/chiều; không có nút tự sinh Trip. Nếu chưa có chuyến phù hợp, hiển thị trạng thái trống.
- Server bắt buộc tìm Trip bằng tripId thật và kiểm tra quyền, status, roster/assignment, Ready ở cả send và confirm; không chấp nhận ID tổng hợp VIRTUAL hoặc dùng routeId/ngày để tự tạo Trip.
- Cron/manual generation giữ quy trình hiện có, nằm ngoài luồng báo nghỉ. Chỉ khi Trip đã được sinh hợp lệ thì người dùng mới có thể chọn báo nghỉ.
- Trip CANCELLED không được báo nghỉ, khôi phục hoặc tái tạo qua luồng này. Không đổi RoutePlan, default assignment hay roster để tạo điều kiện báo nghỉ.

## 4. Điểm danh và phân công

### 4.1. Học sinh

- Giữ học sinh trong roster; không xóa stop, đổi RoutePlan/geometry hoặc tự tối ưu tuyến.
- Notice có hiệu lực ghi ABSENT, absenceReason=Phụ huynh xin nghỉ, markedBy/markedAt đúng actor/thời gian.
- Lưu snapshot nhỏ của điểm danh trước tác động để hủy khôi phục đúng. UNMARKED trở lại UNMARKED; ABSENT lý do khác không bị mất khi đã được ghi trước đó.
- Cần ngăn thao tác điểm danh ghi đè notice đang hiệu lực hoặc có quy trình xử lý rõ; không hủy mù về UNMARKED nếu đã có dữ liệu mới hơn.
- Guard Ready chiều về đã được PO chốt. Vẫn phải kiểm tra học sinh đã lên/xuống xe, kể cả ca Ready bị reset sau thay Attendant: không tự biến PRESENT thành ABSENT hoặc “đưa xuống xe” bằng API báo nghỉ.
- Không tự hủy chuyến khi toàn bộ học sinh nghỉ; đây không phải yêu cầu đã chốt.

### 4.2. Nhân sự

- Hành động báo nghỉ có hiệu lực ngay; chuyến pending không thể Start. Người Attendant đang nghỉ không thể Ready.
- Candidate phải đúng role, active, Attendant cùng trường, thỏa các quy tắc phân công đang có; không bị báo nghỉ trên occurrence tương ứng; không trùng giờ với cả Trip thật và lịch mặc định còn hiệu lực chưa sinh Trip.
- Không coi một notice cho một Trip là nghỉ cả ngày/chiều; nếu người đó còn chuyến khác, phải báo riêng theo quyết định PO. Ràng buộc báo nghỉ khi chọn làm người thay đánh giá đúng occurrence và thời gian, không tự mở rộng phạm vi nghỉ.
- Chọn người thay trong modal, submit kiểm tra lại eligibility/CAS dưới lock. Chỉ đổi assignment Trip cụ thể, không đổi Route default hoặc toàn bộ RoutePlan.
- Transaction đồng thời: gán người thay + notice REPLACED + handledBy/time. Cùng candidate cho hai Trip trùng giờ cần bảo vệ ở mức nguồn lực, không chỉ khóa hai Trip riêng biệt.
- Đổi Attendant reset Ready; đổi Driver giữ Ready nếu Attendant không đổi theo source hiện tại. Chưa tự điều chỉnh nguyên tắc này.
- Existing assignment edit không được bỏ qua pending notice; hoặc chặn và hướng sang tab Báo nghỉ, hoặc đồng bộ xử lý nguyên tử cùng service chung. UI xử lý notice đặt tại tab Báo nghỉ, không điều hướng sang chi tiết Trip.
- Hủy pending notice giữ assignment cũ, bỏ đúng blocker; REPLACED không được hủy dù assignment về lại người ban đầu.

### 4.3. Hủy chuyến

- SYSTEM_ADMIN hủy từ notice Driver thuộc quyền; SCHOOL_ADMIN từ notice Attendant của trường mình; trạng thái trước Start và có pending tương ứng.
- Modal có lý do hủy và xác nhận “Không thể khôi phục”. Không có nút Khôi phục.
- Transaction đặt Trip CANCELLED, ghi reason/audit, đóng các pending notices liên quan thành TRIP_CANCELLED. Không xóa roster, điểm danh hoặc lịch sử.
- Các API Start/Ready/assignment/attendance/navigation từ chối Trip CANCELLED. Cron không tạo lại occurrence đã CANCELLED; hủy notice không hồi sinh Trip.
- PO đồng ý reason bắt buộc khi hủy. Có ứng viên trong danh sách không đồng nghĩa bố trí được ngoài thực tế; admin có quyền vẫn được hủy trong phạm vi notice pending với lý do và xác nhận không thể khôi phục.

## 5. OTP

- Tái sử dụng OtpChallenge và hashing/expiry/rate-limit; thêm purpose riêng `LEAVE_NOTICE`, không dùng purpose cập nhật thông tin học sinh.
- Parent phải còn liên kết đúng học sinh ở cả send và verify; SMS tới guardianPhone hiện tại. Thay guardianPhone làm challenge cũ không còn hợp lệ.
- Driver/Attendant nhận OTP tự động theo các contact hiện có trong account: email-only gửi email; phone-only gửi SMS console; có cả hai gửi cả hai. Không đưa lựa chọn channel để client bỏ một kênh; mask các đích hiển thị.
- Dùng một mã/challenge cho một lần xác nhận, gửi cùng mã tới các kênh bắt buộc; verify/consume một lần, không yêu cầu nhập hai OTP. Bind tập contact và payload; kiểm tra lại khi confirm. Không cần bảng giao vận mới hoặc thêm enum BOTH chỉ để fan-out.
- SMS console chỉ là cơ chế mô phỏng được PO chấp thuận tạm thời, không gọi nhà cung cấp SMS; giới hạn logging OTP trong chế độ development/console cho phép, không log mã trong luồng production thông thường. Email dùng hạ tầng/config hiện có, không tự đổi môi trường hoặc credential. Trả trạng thái kênh thật/console/thất bại rõ ràng; không báo đã gửi SMS vật lý. Nếu một kênh thất bại, không giả báo cả hai thành công và không resend vô hạn hoặc tạo challenge chồng chéo.
- OTP sai phải ghi nhận số lần thử thật; resend/expiry/attempt cap dùng policy hiện có. Chỉ đúng OTP mới có tác động nghiệp vụ.
- Consume một lần nguyên tử với notice/tác động, idempotency theo challenge. Mất response sau commit trả lại kết quả đã tạo khi đúng actor/payload; không tạo notice thứ hai hoặc kích hoạt lại notice đã hủy.
- Không gọi nhà cung cấp OTP bên trong transaction nghiệp vụ kéo dài.
- SMS thật nằm ngoài scope hiện tại theo quyết định PO dùng console. Không tự chuyển OTP học sinh sang email, chọn provider hoặc cài package. Chưa có contact hợp lệ thì từ chối gửi và trả lỗi rõ ràng; không tự tạo contact.

## 6. Wireframe Mobile (cấu trúc đã được PO đồng ý)

### 6.1. Home / Card / Student Detail

```text
Trang chủ
┌──────────── Tiện ích ────────────┐
│                [icon]           │
│                Báo nghỉ         │
└─────────────────────────────────┘
Chuyến đi
┌ Tuyến đi 01       [Lập lịch] ────┐
│ 06:15–07:00 · Thứ 3             │
│             [Báo nghỉ]          │
└─────────────────────────────────┘

Chi tiết học sinh / Thao tác
[Cập nhật thông tin] [Địa chỉ]
[Tuyến đưa đón]      [Lịch]
[Báo nghỉ                     >]
```

Tiện ích duy nhất căn giữa, icon trên/tên dưới. Giữ pull-to-refresh/chức năng refresh phù hợp khi thay greeting, không mất nhánh tải chuyến. Card Home/Lịch có action button không kích hoạt onPress mở Trip Detail. Card nhiều con: đặt action tại từng dòng con để subject đã rõ; không tự báo nghỉ tất cả con. VIRTUAL, chuyến đã Start/terminal, hoặc Ready chặn đúng đối tượng/chiều: disabled/ẩn action phù hợp, kèm lý do ngắn theo DTO. Ready chặn giáo viên ở cả hai chiều, chặn tạo báo nghỉ của mọi đối tượng ở chiều về.

### 6.2. Lịch sử / Thêm / OTP

```text
< Báo nghỉ                    [+]
[Học sinh: Tất cả v]   [Trạng thái v]
┌ An · Chiều đi · 27/10 ──────────┐
│ Tuyến đi 01     [Đã báo nghỉ]   │
│                   [Hủy báo nghỉ]│
└─────────────────────────────────┘
┌ Tuyến về 02 · 28/10 ────────────┐
│ 17:00           [Chờ phân công] │
│                   [Hủy báo nghỉ]│
└─────────────────────────────────┘

< Thêm báo nghỉ
Học sinh     [An v]     (chỉ Parent)
Ngày         [27/10/2026]
Chiều        [Chiều đi] [Chiều về]
Chuyến       [Tuyến đi 01 · 06:15 v]
                         [Tiếp tục]

Xác nhận báo nghỉ
An · 27/10 · Chiều đi · Tuyến đi 01
                          [Gửi OTP]

< Xác nhận OTP
OTP · 09•••••123 (SMS console)
[ _ _ _ _ _ _ ]
[Gửi lại sau …]          [Xác nhận]
```

Driver/Attendant không chọn subject; Parent chọn một con. Student Detail mở đúng lịch sử con, form fix student, không bắt chọn lại. Date/direction chỉ hiển thị Trip thật phù hợp, không cho chọn Dự kiến và không tự sinh Trip. Card dùng cùng OTP flow nhưng prefill/khóa subject/date/direction/Trip, không bắt nhập lại. Không bỏ OTP vì “chỉ confirm”.

Lịch sử vẫn xem được sau khi người nghỉ đã bị thay và không còn quyền xem Trip Detail. Auth notice dựa actor/linked student/admin scope, không chỉ dựa assignment hiện tại của Trip.

Parent cùng liên kết đều xem được; nút Hủy chỉ hiện cho người tạo còn quyền và đủ guard. Với staff có cả hai contact, OTP screen hiển thị hai đích đã mask cùng kết quả gửi tương ứng; nhãn console chỉ xuất hiện khi thực sự dùng console, không trả mã OTP cho client.

## 7. Wireframe Web (cấu trúc đã được PO đồng ý)

```text
Sidebar: … / Chuyến xe / Báo nghỉ / …

Báo nghỉ                         [Ngày v] [Chiều v]
[Tài xế] [Học sinh] [Giáo viên]  (tab theo quyền)
[Chờ phân công] [Đã xử lý] [Đã hủy]
Người nghỉ | Chuyến | Ngày/Chiều | Trạng thái | Thao tác
Minh       | Về 01  | 27/10 Về   | Chờ PC    | [Xử lý]

┌ Xử lý báo nghỉ tài xế ──────────────────┐
│ Người nghỉ: Minh                       │
│ Tuyến về 01 · 27/10 · 17:00–17:40      │
│ Tài xế thay thế [Chọn tài xế v]         │
│ Khả dụng / lý do không đủ điều kiện    │
│ [Hủy chuyến] [Đóng] [Xác nhận phân công]│
└────────────────────────────────────────┘
```

SYSTEM_ADMIN xử lý Driver; SCHOOL_ADMIN xử lý Attendant đúng trường. Student notices là đã ghi nhận, không có Duyệt/Từ chối. Quyền đọc tab khác cần giữ scope trường/global phù hợp, không cấp quyền sửa chéo nhân sự. Nếu cả hai người nghỉ, UI hiển thị còn blocker của phía kia sau xử lý một người.

## 8. Định hướng DB — chưa sửa schema

Ưu tiên **một bảng LeaveNotice**, mỗi record gắn một Trip thật đã tồn tại; `tripId` bắt buộc:

| Nhóm | Fields dự kiến | Mục đích |
|---|---|---|
| Định danh/quan hệ | id, tripId, kind, reportedById, studentId? | kind STUDENT/DRIVER/BUS_ATTENDANT; staff tự báo nên subject là reportedBy; studentId chỉ STUDENT |
| Xác thực | otpChallengeId unique | bind kết quả confirm/idempotency, dùng OtpChallenge sẵn có |
| Vòng đời | status, createdAt, updatedAt, withdrawnAt? | RECORDED/PENDING_REPLACEMENT/REPLACED/WITHDRAWN/TRIP_CANCELLED |
| Xử lý nhân sự | replacementUserId?, processedById?, processedAt? | ai đã bố trí ai, khi nào; không phải phê duyệt phép |
| Khôi phục điểm danh | attendanceBefore Json? | snapshot nhỏ status/reason/markedBy/time/alightedAt cần thiết trước tác động; student-only |

Date/direction/school/route lấy từ Trip, không duplicate vào notice khi Trip làm nguồn bất biến. OTP payload bắt buộc bind tripId thật; không dùng string virtual ID làm FK hoặc routeId+serviceDate để thay Trip. Không cần mô hình đơn cho lịch chưa sinh Trip.

- Chống hai notice còn hiệu lực cho cùng học sinh/Trip hoặc cùng nhân sự/vai trò/Trip; kiểm dưới lock và ràng buộc DB phù hợp. Cho phép lưu lịch sử WITHDRAWN rồi báo lại bằng OTP mới.
- Index chỉ cho truy vấn lịch sử theo actor/subject, liên kết Trip và danh sách cần xử lý; chốt cụ thể sau query contract, không thêm đại trà.
- Thêm OtpPurpose.LEAVE_NOTICE. Không tái sử dụng StudentUpdateRequest/APPROVED/REJECTED.
- Trip.status=CANCELLED và cancellationReason đã có. PO đã đồng ý thêm nullable cancelledAt/cancelledById cho audit hủy Trip không thể khôi phục, cùng bảng LeaveNotice và purpose OTP. Migration chỉ additive DDL, không backfill/seed.
- Không nhất thiết thêm field vào TripAttendance nếu service dùng active notice + snapshot và khóa Trip để chống ghi đè. Nếu cần FK source riêng để bảo toàn tốt hơn phải giải thích trước khi duyệt.
- Không bỏ nullable các assigned IDs chỉ vì người đang nghỉ. Không tạo bảng event log, nhóm ngày hoặc tracking khác khi mỗi lần chỉ chọn một Trip.

## 9. API đã được PO đồng ý — prefix /api/v1, chưa được implement

| Method/path | Actor | Request/hành vi |
|---|---|---|
| GET /leave-notices/options | Parent/Driver/Attendant | studentId khi Parent, serviceDate, direction; chỉ trả Trip thật đúng quyền/điều kiện, masked contacts, canReport/disabledReason; không trả VIRTUAL làm lựa chọn; pure read |
| POST /leave-notices/otp | Ba role Mobile | tripId bắt buộc, studentId nếu Parent; server derive ngày/chiều và toàn bộ kênh account/guardian; validate + send OTP, trả challengeId và kết quả kênh đã mask, chưa hiệu lực nghỉ; không tạo Trip |
| POST /leave-notices/confirm | Ba role Mobile | challengeId, otp, selection canonical gắn Trip thật; revalidate/consume/create notice/apply trong tx; không sinh Trip; trả LeaveNoticeDto |
| GET /leave-notices | Mobile/admin scope | filter student/kind/serviceDate/direction/status/page; history và inbox dùng scope server |
| GET /leave-notices/:id | Owner/linked Parent/admin scope | notice/trip info phù hợp, timeline nhỏ và action flags |
| POST /leave-notices/:id/cancel | Chỉ người tạo còn quyền | hủy báo nghỉ không OTP; Parent khác cùng con bị từ chối; guard Trip/Ready/REPLACED; restore attendance đúng nguồn |
| GET /leave-notices/:id/replacement-candidates | Admin đúng loại/trường | ứng viên và eligibility/reason theo Trip thật, không nhóm route mặc định |
| POST /leave-notices/:id/assign-replacement | Admin đúng loại/trường | replacementUserId, expected current assignment/version; atomic assignment+notice xử lý |
| POST /leave-notices/:id/cancel-trip | Admin xử lý notice đó | reason + expected state; Trip CANCELLED và đóng pending liên quan, không restore |

DTO: notice có subject/Trip/date/direction/status, masked OTP channel; `canReportLeave`, `canCancelLeave`, `canAssignReplacement`, `canCancelTrip`, disabledReason. Card/schedule/operationalState bổ sung action flags và assignmentStatus để frontend không tự suy luật.

Errors: 400 input/OTP/candidate sai;401 auth;403 scope;404 entity;409 duplicate hoặc Trip/Ready/assignment/roster đã đổi, notice đã xử lý hoặc Trip cancelled;429 OTP rate limit;503 không gửi được OTP. Không expose mã OTP trong response hoặc secrets. Swagger phải đồng bộ hành vi/DTO/validation/errors trong implementation đã được PO đồng ý.

## 10. Đồng thời và tính nhất quán

- Send OTP và verify đều kiểm tra quyền; verify là mốc quyết định hiệu lực. Không consume trước rồi mới tạo notice qua transaction khác.
- Trip lock bảo vệ confirm/cancel/replace/cancel-trip đối với Start/Ready/attendance. Hai admin xử lý đồng thời: một transaction thắng, bên kia409; không rollback business operation đã commit.
- Cùng người thay trên hai Trip trùng giờ cần resource lock/kiểm tra nguyên tử hoặc cơ chế isolation phù hợp; query “khả dụng” trên UI không thay kiểm tra khi submit.
- Guard active leave phải áp dụng cả Start/Ready và mọi lối đổi assignment; không bypass bằng màn hình cũ.
- Không gọi generation từ options/send/confirm; Trip thật phải tồn tại và còn hợp lệ tại confirm. Không auto sinh lại CANCELLED. Re-fetch schedule sau mutation nhưng giữ filter/ngày.
- Không gửi SMS/mail hoặc network request trong transaction Trip kéo dài. Thiết kế attempts/consume có ranh giới commit rõ.

## 11. Kế hoạch kiểm chứng — chưa chạy runtime

Pure/in-memory tests cho ba roles, phạm vi trường, contact/OTP binding và replay, thay selection, OTP hết hạn và attempts, confirm đồng thời Start/Ready/đổi assignment, cancel vs replace, double booking candidate, hai pending trên một Trip, snapshot attendance, cancelled không tái tạo, old assignee vẫn xem notice history. Bổ sung: options loại VIRTUAL; send/confirm từ chối ID tổng hợp, Trip không tồn tại hoặc đã chạy; không gọi Trip.create/generation trong luồng báo nghỉ; Trip thật SCHEDULED vẫn hợp lệ theo guard; chiều về Ready chặn mọi đối tượng ở options/send/confirm, kể cả Ready xảy ra trong lúc nhập OTP.

UAT cần PO cấp môi trường/Trip/actor/contact thật và quyền gửi OTP/ghi notice/attendance/assignment/cancellation. Không tự tạo dữ liệu test hoặc gửi OTP trong planning. Không dùng console OTP như bằng chứng đã gửi SMS thật.

## 12. Quyết định cuối và bước bàn giao

1. **Đã chốt, không hỏi lại:** chỉ Trip thật SCHEDULED chưa bắt đầu; chặn Dự kiến chưa sinh Trip; không tự sinh Trip khi báo nghỉ. Chiều về chặn tạo báo nghỉ khi Attendant Ready. Vẫn không ghi đè học sinh đã lên/xuống xe; kiểm tra ca Ready được reset khi đổi giáo viên.
2. **Chờ phân công đã đồng ý:** lifecycle SCHEDULED + assignmentStatus WAITING_ASSIGNMENT tính từ pending notices, server chặn Start.
3. **Nhiều Parent đã đồng ý:** Parent còn liên kết xem lịch sử con; chỉ người tạo được hủy và phải còn quyền/đủ guard.
4. **OTP đã đồng ý:** SMS console tạm thời; staff nhận qua mọi contact đã đăng ký, có cả hai thì gửi cả email/SMS console. Không cần chọn nhà cung cấp SMS trong task này.
5. **Hủy Trip đã đồng ý:** reason bắt buộc, xác nhận không thể khôi phục; audit nullable như mục 8.
6. PO đã đồng ý DB/API/wireframe và yêu cầu tạo prompt implementation cho Antigravity. Cho phép additive DDL/Prisma generation cần thiết trong scope thiết kế; không suy ra quyền seed/backfill, ghi dữ liệu UAT, gửi OTP thử tới người dùng hoặc cài dependency mới.

Không còn câu hỏi nghiệp vụ cần PO xác nhận lại trong phạm vi thiết kế này. Prompt bàn giao yêu cầu Antigravity triển khai scope đã đồng ý; thiếu dữ liệu/quyền UAT chỉ hạn chế kiểm chứng runtime, không cản thực hiện phần code và kiểm chứng an toàn.
