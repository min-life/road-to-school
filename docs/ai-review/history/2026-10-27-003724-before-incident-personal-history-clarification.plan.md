# Sự cố vận hành — Phân tích nghiệp vụ, DB, API và wireframe

Ngày: 27/10/2026, Asia/Saigon. Chế độ DISCUSSION / DESIGN. Chưa tạo prompt triển khai, chưa sửa code/schema/DB. Các mục ghi “đề xuất” chưa phải phê duyệt implementation.

## 1. Yêu cầu và các quyết định PO đã chốt

Hai nhóm: sự cố cần xử lý và sự cố cần xác nhận.

- Driver/Giáo viên có tiện ích Sự cố ở Trang chủ, bố cục như Báo nghỉ. Không thêm nút lên Trip card.
- Trip Detail có nút Báo sự cố góc trên phải dành cho Driver/Giáo viên được phân công. Action sheet có tab Sự cố chỉ xem; Driver/Giáo viên/Parent có quyền xem theo Trip.
- LIVE: chỉ báo cho chuyến gần nhất, từ15phút trước giờ bắt đầu dự kiến. TEST: bỏ rào thời gian báo sự cố; giữ phân quyền, Trip thật và ràng buộc trạng thái phù hợp loại sự cố.
- Driver báo Giáo viên chưa đến → School Admin phân công; Giáo viên báo Driver chưa đến → System Admin phân công. Không bố trí được có thể hủy chuyến, không khôi phục.
- Không xây dựng sự cố riêng cho xuất phát trễ. Chưa Start mà đã vượt giờ kết thúc dự kiến thì chặn Start.
- Khi người bị báo chưa đến đã tới, đúng Admin có thể xác nhận người cũ đã đến thay vì bắt buộc đổi người. Đây là lựa chọn PO đã xác nhận.
- Lệch tuyến so với polyline trong **snapshot Trip**, không phải geometry vừa reroute. Trên100m liên tục30giây.
- ETA đón/trả trễ trên5phút liên tục30giây.
- Mỗi loại sự cố tự động chỉ báo1lần. Cách hiểu công bố với PO: mỗi Trip tối đa1 OFF_ROUTE và1 LATE_STOP, không phải1lần mỗi điểm dừng. Reroute/resume/mở lại ứng dụng không reset hạn mức.
- Giáo viên phụ xe nhận popup điền lý do và Xác nhận; không tự Attendance/Arrival/Complete.

## 2. Source hiện có và khoảng trống

- Prisma hiện có17models, chưa có Incident. Đề xuất bảng mới ở phần DB, chưa tạo.
- `TripsService.startTrip` khóa Trip, kiểm assigned Driver, SCHEDULED, pending staff leave, Ready, roster và điểm danh chiều về; chỉ kiểm mở sớm5phút ở LIVE. Chưa có chặn now>scheduledEndAt ngay trong Start.
- `confirmReady` mở trước15phút ở LIVE. Không suy từ Ready/GPS rằng một người chắc chắn có mặt.
- `getNextTrip` hiện loại theo scheduledEndAt cả IN_PROGRESS; không được sao chép điều kiện này cho sự cố khi đang chạy. Trip chạy quá giờ dự kiến vẫn phải được theo dõi.
- `assertTripAccess` tái dùng được cho5roles, Parent qua liên kết/roster; projection lý do/identity phải riêng theo quyền.
- Có logic chọn người thay thế, kiểm role/trường/trùng lịch và reset Ready khi đổi Giáo viên trong leave/assignment. Tái sử dụng quy tắc kiểm tra; không tạo LeaveNotice/OTP giả để đi qua luồng báo nghỉ. Leave source hiện có nhánh cho System Admin thay Giáo viên, khác phân quyền PO mới cho sự cố: incident phải tuân School Admin trường mình.
- Navigation hiện reroute khi gap>40m khoảng3giây ở client. Đây là ngưỡng navigation, độc lập ngưỡng sự cố100m/30giây và baseline snapshot.
- DB có location history cadence5giây; navigationState checkpoint hiện không cung cấp server-owned current-leg timing đầy đủ cho ETA mọi role. Không coi total duration hay UI guidance là ETA engine đã có.

## 3. Bốn loại và vòng đời

| Loại | Tạo bởi | Điều kiện | Người xử lý | Kết quả |
|---|---|---|---|---|
| ATTENDANT_MISSING | Driver được phân công | Trip SCHEDULED chưa Start, đúng cửa sổ | School Admin trường | Người cũ đã đến / thay Giáo viên / hủy Trip |
| DRIVER_MISSING | Giáo viên được phân công | Trip SCHEDULED chưa Start, đúng cửa sổ | System Admin | Người cũ đã đến / thay Driver / hủy Trip |
| OFF_ROUTE | Server từ vị trí hợp lệ | IN_PROGRESS, lệch snapshot>100m liên tục30s | Giáo viên hiện được phân công | Nhập lý do, xác nhận |
| LATE_STOP | Server từ ETA hợp lệ | IN_PROGRESS, điểm đón/trả tiếp theo chưa phục vụ, trễ>5m liên tục30s | Giáo viên hiện được phân công | Nhập lý do, xác nhận |

Đề xuất trạng thái: WAITING_ASSIGNMENT, WAITING_CONFIRMATION, RESOLVED, CONFIRMED, CLOSED. Type quyết định trạng thái đầu, không cần cột category lặp nghĩa.

- Báo thiếu nhân sự tạo WAITING_ASSIGNMENT, Trip vẫn SCHEDULED với assignmentStatus tính ra WAITING_ASSIGNMENT; chặn Start ở backend/UI.
- Chỉ gỡ blocker nhân sự sau transaction xử lý thành công. Nếu vẫn còn LeaveNotice hoặc Incident thiếu nhân sự khác thì tiếp tục chặn.
- Đổi Driver giữ Ready của Giáo viên. Đổi Giáo viên reset Ready; giữ lịch sử điểm danh và người đánh dấu, không tự reset attendance. Giáo viên mới cần Ready theo quyền của mình.
- Xác nhận người cũ đã đến không đồng nghĩa tự Ready/Start; người có quyền thực hiện thao tác riêng.
- Từ chối cùng role báo chính mình chưa đến. Không cho Parent/Admin tạo báo thiếu nhân sự thay staff trong version đầu.
- Staff báo thiếu người đã có incident đang mở: trả hồ sơ hiện tại hoặc409, không tạo trùng. Nhân sự đã thay thì so expected assignee để báo cũ không áp vào người mới.
- Đề xuất không cho Driver báo Giáo viên chưa đến nếu đã Ready, vì dữ liệu mâu thuẫn; nếu cần tình huống đã Ready rồi rời xe phải bổ sung loại/rule sau, không tự suy diễn.
- Không có generic “sự cố khác”, SOS, ảnh/video, OTP hay workflow duyệt lý do trong version đầu.

## 4. Giới hạn giờ và chuyến gần nhất

Đề xuất LIVE cho hai báo thiếu người:

`scheduledStartAt - 15 phút <= serverNow <= scheduledEndAt`, Trip thật SCHEDULED, assigned đúng người báo. Chọn chuyến chưa hết giờ gần nhất theo scheduledStartAt của người báo, không phải gần nhất theo khoảng cách GPS. Không mở báo cho các chuyến xa hơn chỉ vì đã vào được Trip Detail. Chuyến đang chạy không được báo thiếu người trước Start.

Sự cố OFF_ROUTE/LATE_STOP được đánh giá suốt IN_PROGRESS, kể cả sau scheduledEndAt; hoàn tất/hủy thì ngừng tạo.

- Start có guard serverNow>scheduledEndAt ngay dưới lock, dùng datetime có serviceDate/timezone. Không so chuỗi HH:mm hoặc giờ điện thoại.
- Chỉ chặn Start, không tự đổi CANCELLED/COMPLETED, không kéo dài giờ kế hoạch. UI có thể hiển thị Quá giờ xuất phát (computed, không thêm TripStatus).
- Đã chốt: TEST bỏ rào đồng hồ cho báo sự cố và Start quá scheduledEndAt; role/status/blocker luôn áp dụng. LIVE giữ giới hạn giờ.
- Legacy Trip thiếu scheduledStartAt/endAt: không đoán cửa sổ LIVE; trả thiếu lịch và chặn báo/Start cần lịch, trình bày hướng bổ sung dữ liệu riêng. Không backfill tự động.

## 5. Phát hiện tự động và chống lặp

### Lệch tuyến

- Dùng planned polyline của routeSnapshot tại Trip, không lấy Route mới sau thay đổi, không lấy geometry reroute.
- Đo khoảng cách điểm GPS tới các đoạn polyline, không đo tới vertex gần nhất.
- Dùng các điểm đã được backend chấp nhận: Session/Driver/run đúng, LIVE accuracy đủ tốt, timestamp fresh. TEST dùng vị trí xe do Auto/Joystick publish, không lấy GPS của Giáo viên và không biến planned line thành vị trí thực tế.
- Cần dữ liệu liên tục phủ30giây (cadence5s thường ít nhất7mẫu), mọi mẫu đủ điều kiện; mất sequence/run đổi/gap quá giới hạn thì reset streak, không tính thời gian app tắt thành thời gian lệch.
- Không có snapshot/polyline hợp lệ thì không phát hiện bằng Route fallback âm thầm; ghi không đủ dữ liệu. Không suy ra không có sự cố.
- Reroute vẫn hoạt động ở ngưỡng riêng. Có thể reroute đúng mà vẫn xa tuyến dự kiến: đó là điều PO muốn Giáo viên giải thích, không được dùng reroute để xóa sự cố.

### Đón/trả trễ

- Version đầu đề xuất theo dõi **điểm PICKUP/DROPOFF tiếp theo còn cần phục vụ**, không đồng loạt bật popup cho tất cả điểm tương lai. Attendance/Alighting và navigation target là nguồn phân biệt phục vụ; reroute/đổi target không tự điểm danh.
- So `estimatedArrivalAt - scheduledStopArrivalAt > 5 phút` liên tục30giây. scheduledStopArrivalAt lấy từ snapshot + serviceDate, giữ mốc gốc; không thay baseline bằng ETA mới.
- Đã qua giờ kế hoạch và điểm vẫn chưa phục vụ thì trễ có thể tồn tại ngay cả khi xe đang đứng; không chỉ phát hiện lúc xe có tốc độ.
- ETA là ước tính có chất lượng dữ liệu, không cam kết chính xác tuyệt đối. Cần timing đoạn đường còn lại hợp lệ, progress đúng chặng, thời gian dừng/chờ còn cần; không chia tổng duration đều theo số stops hoặc lấy giờ kế hoạch cộng trễ một cách giả định.
- Nếu routing/timing/GPS thiếu, stale hoặc target không chắc thì ngừng đánh giá/reset streak; không ghi LATE_STOP giả từ dữ liệu không đủ tin cậy. Target đổi giữa30s thì reset streak cho target mới.

### Nguồn và cách chạy

- Server là nơi tạo/dedupe sự cố; không phụ thuộc Giáo viên có mở màn hình mới có bản ghi. App Giáo viên chỉ poll/hiển thị/xác nhận.
- Ưu tiên xử lý sau khi persist vị trí thành công, bên ngoài transaction telemetry/TripOperation; lỗi detector không rollback GPS hay chặn Attendance/Start/Complete. Không thêm Redis/queue/WebSocket/background location.
- Tính streak bằng cửa sổ nhỏ location points đã ghi, thêm sampling/evaluation cadence5–10s hợp lý, không đọc toàn hành trình mỗi tick. Việc tạo incident dùng transaction ngắn khóa Trip trước, tái kiểm IN_PROGRESS/sequence/reference.
- Chỉ index độc nhất dedupe của auto incident bảo đảm một bản ghi/type/Trip qua restart/retry/multi-instance. Chưa xác nhận, đã xác nhận hoặc CLOSED đều không được tạo lại cùng type cho Trip đó. Không có reset nút Stop/Resume, không reset khi chạy TEST.
- Poll gộp loop Trip Detail hiện có. App reopen lấy pending của server; nếu lý do chưa gửi thành công thì không tự đánh confirmed.
- Đề xuất “một lần” là một **hồ sơ** bền vững; pending có thể được nhắc tiếp bằng cùng hồ sơ tới khi xử lý. Không tạo hồ sơ/popup khác vì mỗi GPS sample. Cách nhắc lại popup hay chỉ banner khi reopen cần PO xem wireframe.

## 6. Database đề xuất — một bảng mới

Chưa có phê duyệt tạo bảng; đây là định hướng để PO review.

`TripIncident` → `trip_incidents`:

| Field | Vai trò |
|---|---|
| id | Định danh UUID |
| tripId | FK Trip, onDelete Restrict, bảo vệ sự cố vận hành |
| type | Enum4loại |
| status | Enum5trạng thái |
| reportedById? | Staff báo thủ công; null cho detector server |
| description? | Nội dung bổ sung của người báo thiếu nhân sự, không bắt nhập lại loại |
| context? Json | Bằng chứng tại phát hiện: assignee bị báo/sequence/time/route reference hoặc target/ETA/lateness; không copy history/roster |
| dedupeKey | Unique: auto=`TripId:type`; manual=request idempotency key được namespaced server theo Trip/actor/type |
| processedById? | Admin xử lý hoặc Giáo viên xác nhận |
| processedAt? | Thời điểm xử lý/xác nhận |
| resolution? Json | action ARRIVED/REPLACED/TRIP_CANCELLED/ACKNOWLEDGED/CLOSED_WITHOUT_CONFIRMATION, lý do, người cũ/mới khi có |
| createdAt | Thời điểm ghi nhận |
| updatedAt | Thời điểm đổi trạng thái |

Index dự kiến tối thiểu: unique(dedupeKey); (tripId,createdAt); (status,createdAt) cho hàng đợi admin. Chỉ thêm index school nếu EXPLAIN/dữ liệu cho thấy join Trip cần; không lặp schoolId chỉ để dự phòng.

Không tạo bảng IncidentCategory/AssignmentHistory/IncidentLocation/AlertQueue, không trộn vào LeaveNotice/OtpChallenge. Không thêm TripStatus; assignmentStatus là computed từ leave+incident mở.

Để tính ETA server, có thể cần mở rộng **JSON navigationState hiện có** bằng nhánh server-owned current-leg geometry/timing/target/version, chỉ cập nhật khi có kết quả routing mới; không lặp lat/lng/history/sequence, không lưu toàn bộ route responses. Hiện đây là đề xuất cần rà parser/version/permissions; không thêm cột mới chỉ để cache timer. Nếu engine có dữ liệu authoritative tương đương thì reuse thay vì duplicate. Planned snapshot đã đủ baseline lệch tuyến nên không lưu thêm bản polyline baseline.

Dữ liệu context/resolution không trả thẳng toàn bộ cho Parent. Không coi JSON nullable là cách bỏ validation; DTO phải có shape/version, bounds và giới hạn độ dài.

## 7. API đề xuất

Prefix chung `/api/v1`. Chưa phải API đã triển khai.

| Method/path | Mục đích / request |
|---|---|
| GET /incidents/options | Trip gần nhất và loại được báo, canReport/disabledReason/serverNow/reportAvailableAt |
| GET /incidents | Lịch sử staff hoặc danh sách admin có pagination; type/status/date/school theo scope server |
| GET /trips/:id/incidents | Tab view: danh sách/badge count và quyền xem theo Trip; Parent projection riêng |
| POST /trips/:id/incidents | Staff báo thiếu người: type, description?, idempotencyKey, expectedAssigneeId; không cho client tự tạo OFF_ROUTE/LATE_STOP |
| GET /incidents/:id | Chi tiết scoped, không leak khi gọi bằng ID |
| GET /incidents/:id/replacement-candidates | Chỉ đúng admin; nguồn đủ tiêu chí hiện có, loại người đang có leave/incident chưa xử lý phù hợp |
| POST /incidents/:id/resolve | Admin: ARRIVED hoặc REPLACED, replacementUserId khi cần, expectedStatus/expectedAssigneeId; lý do xử lý ngắn nếu có |
| POST /incidents/:id/cancel-trip | Admin đúng nhóm, reason bắt buộc; transaction hủy Trip và đóng các leave/incident liên quan |
| POST /incidents/:id/confirm | Chỉ Giáo viên đang assigned; reason bắt buộc trim/giới hạn độ dài, expectedStatus |

Không có public endpoint tự phát hiện hay detector data do observer tùy ý gửi. Nếu cần endpoint nội bộ, chỉ service method, không mở route không xác thực. GET không tạo/update sự cố hoặc đánh đã xem.

Response thống nhất envelope hiện có, DTO chứa id/type/status, times, mô tả an toàn và capabilities. Error400 input/timing thiếu,401session,403role/scope,404not found theo convention,409state/CAS/time window/expiredTrip,429rate limit. Document từng disabledReason và lỗi cụ thể, Swagger sync bắt buộc khi triển khai.

TripOperation/assignment phải dùng chung checker pending staff blockers từ LeaveNotice+TripIncident. Không cho endpoint đổi assignment cũ bypass đóng incident; xử lý đúng admin và incident trong cùng giao dịch. Đề xuất source service dùng common validator/candidates, không gọi HTTP nội bộ hoặc giả tạo LeaveNotice.

## 8. Wireframe đề xuất

### Mobile Trang chủ (Driver/Giáo viên)

```text
TIỆN ÍCH
       [icon lịch]        [icon cảnh báo]
         Báo nghỉ              Sự cố
```

Không có tiện ích Sự cố cho Parent. Parent vẫn có tab xem trong Trip Detail.

### Mobile tiện ích Sự cố

```text
← Sự cố                                      [+]
[Trạng thái ▾] [Loại ▾]
-----------------------------------------------
Giáo viên chưa đến               Chờ xử lý
Tuyến Đi 01 · 27/10 · 06:30

Lệch tuyến                       Chờ xác nhận
Tuyến Đi 01 · 27/10 · 06:52
```

Danh sách của staff đề xuất gồm sự cố các Trip được phân công hiện tại và sự cố chính họ đã báo/xác nhận trước đó với projection an toàn; không tự cấp lại quyền xem toàn bộ Trip cũ khi đã bị thay. Có thể giữ lịch sử tối giản chỉ read-only nếu PO muốn audit, nhưng quyền Trip Detail vẫn kiểm theo assignment hiện tại.

Nút+ mở form có Trip gần nhất sẵn, loại phù hợp role sẵn; nếu không đủ điều kiện thì hiển thị lý do. TEST có thể chọn Trip thật được phân công khác chưa vận hành, theo diễn giải “bất cứ khi nào” chỉ miễn giờ, không miễn quyền/status. Không tạo VIRTUAL Trip để báo.

```text
← Báo sự cố
Chuyến: Tuyến Đi 01 · 06:30
Loại: Giáo viên chưa đến         (Driver)
Ghi chú (tùy chọn) [                          ]
                              [Gửi báo sự cố]
```

### Trip Detail

```text
[←]                             [Báo sự cố ⚠]
                BẢN ĐỒ
...
-----------------------------------------------
Thông tin | Điểm dừng | Điểm danh | Sự cố (2)
-----------------------------------------------
Lệch tuyến                       Đã xác nhận
06:52 · Lý do theo quyền xem
```

Nút báo chỉ Driver/Giáo viên, đúng role/type/window. Parent không thấy nút báo. Tab Sự cố read-only cho cả3roles, không đặt nút xử lý/xác nhận trong tab.

### Popup Giáo viên (hai cảnh báo chung hàng đợi)

```text
Lệch tuyến / Đón trả chậm
Tuyến Đi 01 · 06:52
Lý do *
[                                             ]
                                  [Xác nhận]
```

Nếu hai sự cố xuất hiện cùng lúc, queue từng popup, không chồng modal. Không đặt popup trên màn hình Driver. Không tự xác nhận khi đóng, background hoặc lỗi mạng. Đề xuất cho để sau bằng điều khiển đóng/modal, giữ banner “Có sự cố cần xác nhận” ngoài tab để không khóa điểm danh thao tác an toàn; khi quay lại là cùng incident, không bản mới. PO đã chốt được để sau; giữ nguyên hồ sơ chờ xác nhận và khả năng thao tác điểm danh.

### Web Admin

Đề xuất cả hai admin có menu Sự cố tương tự Báo nghỉ, không gộp nhãn nghiệp vụ. System Admin xử lý DRIVER_MISSING; School Admin trường xử lý ATTENDANT_MISSING. Hai admin có thể xem sự cố tự động trong phạm vi nhưng không xác nhận thay Giáo viên ở version đầu.

```text
Sự cố
[Trường ▾ (System)] [Loại ▾] [Trạng thái ▾] [Ngày]
Chuyến | Loại | Thời điểm | Người báo | Trạng thái | Thao tác
...                                               [Xử lý]
```

```text
Xử lý tài xế/giáo viên chưa đến
Chuyến · Ngày · Nhân sự hiện tại
(•) Người cũ đã đến
( ) Phân công thay thế [Chọn người phù hợp ▾]
[Hủy chuyến]                       [Xác nhận xử lý]
```

Hủy cần lý do và confirm riêng; không đặt hành động phá hủy như default. Không sửa defaultDriver/defaultAttendant của Route khi chỉ thay người cho một Trip.

## 9. Privacy, concurrency và kết thúc Trip

- Parent thấy loại/thời điểm/trạng thái phù hợp Trip của con, không raw GPS evidence, điện thoại/email hoặc danh sách học sinh khác. PO đã chốt Parent chỉ xem loại, thời điểm và trạng thái, không xem lý do nội bộ; response phải dùng projection riêng.
- Người bị thay mất quyền mutation ngay, nhưng audit reportedBy/processedBy không bị đổi sang người mới. Chỉ Giáo viên hiện assigned xác nhận auto incident, kể cả incident tạo trước khi họ tiếp nhận nếu nghiệp vụ cho đổi trước Start; IN_PROGRESS không mở tự thay người.
- Lock order Trip trước Incident trước update assignment/leave/terminal effects, dùng CAS status/assignee dưới lock; không giữ lock trong lúc gọi routing.
- Race Start/report: hoặc report tạo trước và Start bị block; hoặc Start thành công trước và báo thiếu nhân sự bị409. Không tồn tại Start xong mới chèn blocker pre-start.
- Complete/Cancel không bị bắt buộc chờ nhập lý do sự cố theo đề xuất version đầu. Chặn tạo mới khi terminal. Pending xác nhận chưa xử lý đề xuất CLOSED với action CLOSED_WITHOUT_CONFIRMATION, không bịa lý do hoặc đánh CONFIRMED; giữ nhãn “Kết thúc khi chưa xác nhận” để audit. Pending thiếu nhân sự đóng kèm hủy Trip; không tự coi người đã đến.
- Nhân sự đang có báo nghỉ: không cho ARRIVED để bypass LeaveNotice; cần xử lý đúng thông báo/báo nghỉ hiện hữu. Phân công hợp lệ có thể đóng cả blocker cùng người/role trong cùng giao dịch, không tạo hai modal phân công mâu thuẫn.

## 10. Kiểm chứng và phạm vi đề xuất

Các bài kiểm chứng tập trung: quyền4loại/Trip scope; cửa sổ15phút/Test; guard Start quá giờ; report-vs-Start và replacement-vs-cancel race; shared leave blockers; GPS stale/gaps reset30s; ngưỡng snapshot không đổi vì reroute; dedupe đúng1/type/Trip sau restart; target/ETA thiếu dữ liệu không tạo false event; pending popup/confirm idempotent và Parent masking.

Không tự test bằng DB mutations/seed/Route API tính phí. Test pure/in-memory phải dùng logic production, phân biệt unit evidence với GPS/provider/device runtime. Runtime ghi sự cố cần PO cấp scope. Chưa có implementation approval cho bảng/API/UI/JSON extension; không tạo migration trong giai đoạn này.

## 11. Lựa chọn bổ sung PO đã chốt và bước review còn lại

- LIVE chặn Start sau scheduledEndAt; TEST bỏ giới hạn giờ.
- Popup được để sau, vẫn giữ cùng hồ sơ chờ xác nhận; không khóa điểm danh.
- Parent chỉ xem loại/thời điểm/trạng thái, không nguyên văn lý do nội bộ.
- Theo dõi trễ ở điểm đón/trả tiếp theo, cấu trúc một bảng, API và wireframes là phương án đề xuất để PO review. Không còn câu hỏi ở ba lựa chọn trên; không xin lại cùng quyết định.

STOP AFTER DESIGN. Không chuyển implementation hoặc viết prompt cho Antigravity trước chỉ thị tiếp theo.
