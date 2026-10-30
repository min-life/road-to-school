# Parent Home — tiến trình theo mốc nghiệp vụ

30/10/2026, local, chưa commit/push. Mục “Con của bạn” PO đề cập là **Chuyến xe của con** trên [HomeScreen](<../../mobile/app/(tabs)/index.tsx>). Đây là spec hiện hành, thay thế thiết kế GPS-only và bus pin nổi ở các task trước; báo cáo cũ vẫn lưu trong ai-review/history.

## Quyết định mới nhất của PO

PO yêu cầu icon bus nằm trên rail, nhảy cóc theo xuất phát/điểm danh/đến trường/xuống xe, dùng vị trí minh họa2/3 từng chặng. Đây là thay đổi đã được PO chỉ định, thay thế quy tắc cũ bắt buộc progress GPS. Không sửa enum, record hoặc luồng vận hành backend. Bản đồ ở nút Theo dõi lộ trình vẫn dùng cơ chế định vị hiện có; Home rail là **Minh họa theo trạng thái**, không phải vị trí địa lý.

## Kiểm tra API trước triển khai

| Thông tin cần | Nguồn thực tế | Kết quả |
| --- | --- | --- |
| Học sinh, avatar, trường, trip/route/direction, serviceDate, lịch tuyến, attendance, markedAt, alighting, notice/canReportLeave | GET /trips/mobile/parent/home-cards; ParentHomeCardItem | Có, theo từng studentId; không dùng aggregate của chuyến làm trạng thái con |
| Giờ điểm đón/trả dự kiến, trường, geometry, dấu isMyChild | GET /trips/mobile/:id; MobileTripDetail/stops | Có; điểm riêng trùng studentId + isMyChild; giữ Privacy Masking |
| Giờ xuất phát thực tế | GET /trips/:id/operational-state, actualStartTime | Có trong projection PARENT hiện có |
| Xe đến trường, giờ đến trường | Cùng operational-state, isSchoolArrived/arrivedAtSchoolAt | Có; độc lập với việc từng con đã xuống xe |
| Điểm danh/giờ điểm danh, xuống xe/giờ xuống của từng con | Cùng operational-state, children[] | Có; chọn bằng studentId, không children[0] hoặc tổng PRESENT/alighted |
| Sự cố loại/trạng thái/thời điểm | GET /trips/:id/incidents; getTripIncidents hiện có | Có cấp chuyến; PARENT bị ẩn context/description/người báo/người xử lý, không suy ra LATE_STOP thuộc con nào |
| ETA cập nhật theo vận hành/quãng đường còn lại | Các response viewer đã kiểm tra | **Chưa có**; bubble chỉ đếm đến lịch công bố và ghi “theo lịch”, không ETA trực tiếp |
| Sự kiện độc lập xe đến/rời điểm đón, pickupArrivedAt/pickupDepartedAt | Các response đã kiểm tra | **Chưa có**; chỉ có markedAt. Không tự tạo sự kiện đó |
| Danh sách card lịch sử COMPLETED/CANCELLED trên Home | getParentHomeCards server filter | Hiện chỉ SCHEDULED/IN_PROGRESS theo roster/time window; task không thay filter hoặc tự giữ card lịch sử |

Bằng chứng: [TripsService](../../api/src/trips/trips.service.ts), [IncidentsService.listByTrip](../../api/src/incidents/incidents.service.ts), [mobile client/types](../../mobile/services/api-client.ts), [Prisma enums](../../api/prisma/schema.prisma). Không đổi backend/API contract hoặc gọi publisher/segment để lấy ETA.

TripStatus thực: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED. AttendanceStatus: UNMARKED, PRESENT, ABSENT. Incident types: ATTENDANT_MISSING, DRIVER_MISSING, OFF_ROUTE, LATE_STOP; incident statuses thực: WAITING_ASSIGNMENT, WAITING_CONFIRMATION, RESOLVED, CONFIRMED, CLOSED. Không tạo enum nghiệp vụ mới.

## Wireframe và thông tin được chuyển vị trí

Bố cục đã trình bày trước code theo yêu cầu triển khai trực tiếp của PO, không có lượt duyệt wireframe riêng hoặc nghiệm thu thành phẩm.

```text
Chuyến xe của con                              DD/MM/YYYY
[Avatar] Tên học sinh                          [Tag chuyến]
         Trường học                                  [˅]
         [Tag điểm danh] [Chuyến có sự cố nếu có]
──────────── khi mở rộng ─────────────────────────────────
Tên tuyến đầy đủ
Chiều đi/về (ngày riêng nếu các card có nhiều serviceDate)
[Khởi hành]             [Đón con/Điểm danh]     [Đến trường]
[Giờ thực/dự kiến]      [Giờ thực/dự kiến]      [Giờ thực/dự kiến]
[Lịch cũ nếu đã có giờ thực tế]
     │                        │                      │
 Xuất phát ───────────────── Nhà ───────────────── Trường
              Bus ở vị trí mốc được PO chỉ định
                         [Np / theo lịch] trên bus khi phù hợp
[Sớm/Trễ N phút nếu đủ giờ]
[Giờ điểm danh / giờ xuống xe / lý do vắng V2 nếu có]
[Biển số] [Tài xế]
[Theo dõi lộ trình]
[Báo nghỉ chuyến này — đúng canReportLeave/busy cũ]
```

Đã bỏ khối card cũ chứa routeName/scheduledTime/serviceDate. RouteName chuyển thành dòng riêng ở đầu panel, đầy đủ/wrap; direction có chữ. Ngày lấy từ **serviceDate API**, DD/MM/YYYY, ngang tiêu đề; nhiều ngày thì hiển thị đủ ở header và gắn thêm ngày cho từng route để không nhầm. Không thay ngày API bằng hôm nay.

Theo yêu cầu PO, bỏ dòng chữ hiển thị “Minh họa theo trạng thái”. Footer chỉ xuất hiện khi có thông tin sớm/trễ, không giữ khoảng trống cho caption. Cách xác định vị trí bus theo mốc và mô tả accessibility giữ nguyên.

Tag điểm danh chỉ hiển thị ở header card, bỏ nhãn và icon trạng thái lặp bên dưới thanh hành trình/dòng kết thúc tuyến theo lịch. Phần mở rộng giữ giờ điểm danh, giờ xuống xe và lý do vắng nếu có; không render hộp chi tiết rỗng khi thiếu cả ba thông tin. Logic xác định trạng thái và hành vi các nút giữ nguyên.

Giờ tuyến cũ không bị mất: giờ khởi hành dự kiến ở time badge (hoặc dòng Lịch khi đã có actualStartTime); giờ đến trường dự kiến ở destination badge; chiều về giờ kết thúc tuyến ở bãi được giữ thành dòng “Kết thúc tuyến theo lịch HH:mm”, tách khỏi giờ trả con.

## Vị trí minh họa và icon trên rail

Chiều đi có mốc0 xuất phát,0.5 điểm đón,1 trường. Chiều về có mốc0 trường,1 điểm trả của con. Khoảng cách là layout, không km hoặc phần trăm hành trình thực.

| Dữ liệu | Vị trí bus trên sơ đồ |
| --- | --- |
| SCHEDULED | 0; bus thay icon xuất phát, đường xám |
| IN_PROGRESS + UNMARKED chiều đi | 1/3 rail =2/3 chặng0→0.5; vẫn có icon xe tại xuất phát |
| Mới quan sát UNMARKED→PRESENT trên card đang mở, chiều đi đang chạy | 0.5 trong1600ms để ghi nhận điểm danh; bus thay nhà |
| IN_PROGRESS + PRESENT, chưa đến trường/chưa xuống | 5/6 rail =2/3 chặng0.5→1 |
| Xe đã đến trường, con chưa xuống | 1, bus thay trường; tag con vẫn Chưa xuống xe nếu PRESENT |
| PRESENT + đã xuống | 1, tag Đã xuống xe |
| Chiều về PRESENT trước start | 0 tại trường, chưa minh họa đã chạy |
| Chiều về IN_PROGRESS + PRESENT | 2/3 chặng trường→điểm trả |
| Chiều về đã xuống | 1, bus thay nhà |
| ABSENT hoặc CANCELLED | Không đặt bus cho hành trình con không tham gia/hủy |
| COMPLETED thiếu mốc đến/xuống xác nhận | Trung tính, không tự xác nhận đã trả con |
| UNMARKED chiều về đang chạy nhưng chưa có boarding (TH2) | Bus vẫn hiện tại mốc trường0, đường xám; tag Chưa điểm danh giữ nguyên. Vị trí dự phòng, không xác nhận vị trí xe thực hoặc con đã lên xe |

**Sửa TH2 theo yêu cầu PO:** trước đây trường hợp này trả position=null nên icon bus bị ẩn. Hiện trả0 để giữ icon trên rail tại mốc đầu trong lúc thiếu xác nhận lên xe của con; không có bubble số phút vì chưa minh họa chặng con đang trên xe. Khi attendance thành PRESENT, dùng mốc2/3 như cũ; khi xuống xe được xác nhận, dùng mốc1. Đây chỉ là fallback trình bày, không thay status chuyến, attendance, tọa độ GPS hoặc timestamps. Tag header vẫn Chưa điểm danh màu amber cho UNMARKED. Vị trí TH1/TH3/chiều đi và ABSENT/CANCELLED/COMPLETED giữ nguyên.

**Đồng bộ tag xuống xe chiều về theo yêu cầu PO mới nhất:** PRESENT + chưa có xác nhận xuống xe dùng tag Chưa xuống xe màu tím, cùng icon/tone như chiều đi đã đến trường nhưng chưa xuống. PRESENT + đã xác nhận xuống xe dùng tag Đã xuống xe màu xanh lá như chiều đi. Tag chưa xuống xe không khẳng định xe đã đến điểm trả; mốc arrival độc lập vẫn chưa có. Chỉ mở lại phần tag của TH4, không thêm event hoặc sửa vị trí bus.

| Trường hợp chiều về | Tag của con ở header | Bus trên rail khi card còn được chọn |
| --- | --- | --- |
| SCHEDULED + UNMARKED | Chưa điểm danh, amber | Mốc trường0 |
| SCHEDULED + PRESENT, chưa xuống | Chưa xuống xe, tím | Mốc trường0, chưa minh họa đã chạy |
| IN_PROGRESS + UNMARKED (TH2) | Chưa điểm danh, amber | Mốc trường0 dự phòng, không ẩn bus |
| IN_PROGRESS + PRESENT, chưa xuống (TH1) | Chưa xuống xe, tím | 2/3 chặng trường→điểm trả |
| Xe đã đến điểm trả nhưng chưa xuống (TH4) | Chưa xuống xe, tím nếu PRESENT | Vẫn2/3 vì chưa có event xác nhận đến điểm trả độc lập; không tự suy ra đến đích |
| PRESENT + đã xác nhận xuống (TH3) | Đã xuống xe, xanh lá | Mốc điểm trả1, bus thay nhà |
| ABSENT + báo nghỉ còn hiệu lực | Đã báo nghỉ, đỏ | Không vẽ bus cho hành trình con |
| ABSENT không báo nghỉ | Vắng mặt, đỏ | Không vẽ bus cho hành trình con |
| CANCELLED | Tag chuyến Đã hủy; tag con vẫn theo attendance | Helper không vẽ bus; Home không lấy chuyến hủy |
| COMPLETED | Tag con vẫn theo attendance/alighting nếu còn card tạm | Home không lấy chuyến hoàn thành; helper chỉ tới1 khi PRESENT + đã xuống, thiếu mốc xác nhận trả null |

Các trường hợp có alighting xác nhận ở trên giả định dữ liệu hợp lệ, không tự xác nhận con đã xuống khi attendance còn UNMARKED/ABSENT. Home vẫn chỉ chọn một chuyến ưu tiên cho mỗi con, loại chuyến quá scheduled_end_at; việc cả card không còn được chọn khác với icon bus bị ẩn trong card. Học sinh PRESENT chờ khởi hành đã lên xe nhưng chưa xuống nên cũng dùng tag tím; status chuyến Chờ khởi hành giữ nguyên.

Nhịp1600ms là **hiệu ứng UI sau sự kiện điểm danh thực được quan sát**, không field/sự kiện mới “đã rời điểm đón”. Mở một card đã PRESENT từ trước sẽ đi thẳng chặng kế tiếp, không phát lại điểm danh giả. Cần endpoint/event riêng nếu sau này phải giữ bus ở pickup cho đến khi tài xế thực sự rời điểm đó.

Bus thay icon của node khi ở đúng node, không vẽ hai icon chồng nhau. Chiều đi: tại node có3 icon; giữa chặng có4 (xuất phát, nhà, trường, bus). Tâm bus và tâm node cùng y với rail. Marker co theo bề ngang rail ở máy nhỏ để không đè node bên cạnh. Vị trí nhảy ngay; chỉ fade opacity180ms, không chạy liên tục hoặc giả lập GPS. Giữ reduced motion và dừng khi blur/background.

## Tag và trạng thái con ở card thu gọn

Tag chuyến là trạng thái chung, tag con dựa attendance/alighting **của chính studentId**:

| Con | Tag/tone |
| --- | --- |
| UNMARKED | Chưa điểm danh, amber đậm + alert icon, nền summary vàng nhạt và viền nhấn |
| Chiều đi PRESENT chưa đến trường/chưa xuống | Đã điểm danh, xanh dương + check icon |
| Xe đến trường + PRESENT chưa xuống | Chưa xuống xe, tím + icon xuống xe |
| Chiều về PRESENT chưa xuống (kể cả đang chờ xuất phát) | Chưa xuống xe, tím + icon xuống xe; không suy ra xe đã đến điểm trả |
| PRESENT + isAlighted | Đã xuống xe, xanh lá |
| ABSENT + hasLeaveNotice | Đã báo nghỉ, đỏ |
| ABSENT không notice | Vắng mặt, đỏ |
| Có incident WAITING_ASSIGNMENT/WAITING_CONFIRMATION | Chuyến có sự cố, tag đỏ riêng, không biến attendance của con thành “sự cố” |

Dùng cả chữ/icon/màu, không dựa màu đơn thuần. Viền trái giữ độ rộng4px ở mọi trạng thái để đổi màu không làm thay đổi bề ngang. Tag wrap, không ellipsis tên/trường/tuyến. Sự cố RESOLVED/CONFIRMED/CLOSED không tạo cảnh báo đang mở; panel chỉ trình bày loại/thời điểm cấp chuyến được backend cho phép, không context hoặc tên học sinh khác.

### Màu card đồng bộ với tag học sinh

[ParentTripCard](../../mobile/components/parent/trip-card.tsx) lấy `journeyTones[studentStatus.tone]` làm nguồn chung với tag: `border` cho viền card (kể cả viền trái4px), `bg` cho nền header. Áp dụng cả khi thu gọn và mở rộng; màu vàng mặc định khi mở không ghi đè màu trạng thái. Phần chi tiết giữ nền trắng, chữ/icon/nhãn và các nút giữ nguyên.

| Tag học sinh | Viền và nền header |
| --- | --- |
| Chưa điểm danh | Vàng/amber |
| Đã điểm danh | Xanh dương/info |
| Chưa xuống xe | Tím/purple |
| Đã xuống xe | Xanh lá/success |
| Đã báo nghỉ hoặc Vắng mặt | Đỏ/danger |

Màu theo trạng thái của riêng con, không theo tag trạng thái chung của chuyến hoặc tag sự cố. Các tag đó vẫn giữ màu và ý nghĩa riêng. Nếu không truyền studentStatus, giữ tương thích attention=true dùng warning; không có cả hai thì dùng màu mặc định trước đây. Không sửa mapping trạng thái, vị trí bus, API hoặc nghiệp vụ. Font/spacing/border width/animation giữ nguyên nên đổi trạng thái không làm nhảy bố cục.

## Nguồn và ý nghĩa thời gian

[studentJourneyTimes](../../mobile/utils/parent-journey.ts) nhận thêm operation tùy chọn, không thay DTO API:

- Khởi hành: actualStartTime hợp lệ thì Thực tế + giữ dòng Lịch; chưa có thì lịch từ scheduledTime/detail.scheduledStartTime, không đoán thời gian xuất phát từ lúc frontend tải.
- Điểm đón: PRESENT dùng markedAt và nhãn Điểm danh; ABSENT dùng markedAt với Báo nghỉ/Báo vắng tương ứng; đây là thời điểm ghi nhận, không thời điểm bus đến pickup. UNMARKED dùng plannedArrivalTime của PICKUP riêng con nếu có.
- Đến trường: arrivedAtSchoolAt từ operational-state, independent với alighting. Nếu chỉ biết đã xuống qua Home và chưa có giờ xe tới trường, dùng mốc đó với nhãn Xuống xe, không tính sớm/trễ như thể đó là giờ xe tới.
- Chiều về: plannedArrivalTime của DROPOFF đúng studentId/isMyChild; thực tế là alightedAt của chính con. Không dùng actualEndTime/giờ xe về bãi thay thế.
- Nếu đã đến nhưng timestamp chưa có thì —:—/Chưa có giờ + giữ lịch; không gán timestamp thời điểm render.
- Các timestamp thực format Asia/Ho_Chi_Minh; serviceDate + giờ lịch có offset+07:00.
- Sớm/trễ = lịch đích trừ timestamp đích đã xác nhận, làm tròn phút. Không đủ một trong hai mốc thì không tính chênh lệch.
- Bubble tính số phút còn đến **lịch đã công bố** theo clock thiết bị, ceil phút; caption theo lịch. Không hiện0/âm hoặc tự cộng giờ trễ để tạo ETA mới. Trên60phút hiển thị giờ lịch, không số lớn hoặc ETA giả.

Time badges ở trên rail với đường nối xuống từng mốc; giờ thực nổi vàng nhạt, lịch nền trắng, giờ cũ nhỏ vẫn đọc được. MinHeight94 (không fixed height), số giờ auto-fit đủ5 ký tự, nhãn/phụ chú tự wrap. Sớm/trễ nằm ở footer diagram để các badge cân đối. Không thêm text trạng thái chuyến lặp trong diagram.

## Component, hook, quyền và mở rộng

- [ParentTripCard](../../mobile/components/parent/trip-card.tsx): giữ studentName/avatarUrl/schoolName/status/children/journey(active). Optional studentStatus vừa hiển thị tag vừa chọn tone viền/nền header; hasIncident/stale giữ tag riêng, attention là fallback warning khi thiếu studentStatus. Chỉ giữ disclosure; không gọi API hoặc đổi permissions. accessibilityLabel gồm status con/sự cố và aria-expanded. CTA là sibling của summary, không đóng card.
- [ParentStudentJourney](../../mobile/components/parent/student-journey.tsx): nhận card thực đã chuẩn hóa, telemetry, active, showServiceDate?. Derive time/stage, nhịp boarding sau event thật, panel sự cố. Không mutation hoặc engine định vị.
- StudentJourneyRouteHeader: routeName, outbound, serviceDate?; presentation thuần.
- StudentJourneyDiagram: stagePosition:number|null, outbound, active, departure/arrival/pickup:JourneyTime, pickupTitle, arrivalTitle; optional arrivalNote/late/bubble. Caller phải dùng mốc đúng quy tắc được PO duyệt; không truyền tọa độ GPS vào stagePosition.
- JourneyTime: value:string|null, kind:scheduled|actual, scheduledValue? để giữ lịch khi actual đã có.
- [parent-journey-stage](../../mobile/utils/parent-journey-stage.ts): helpers pure normalize riêng child qua children.find(studentId), position, badge, incident active/label, service date, timestamp lịch và arithmetic. Tone/position là trạng thái trình bày, không enum nghiệp vụ.
- studentJourneyBadge(attendance, alighted, schoolArrived, hasLeaveNotice, direction?): direction lấy từ card hiện tại để chiều về PRESENT chưa xuống dùng tag tím; bỏ qua hoặc TO_SCHOOL giữ quy tắc chiều đi cũ. Luôn xét ABSENT/UNMARKED trước alighting để không gán xuống xe từ dữ liệu chưa xác nhận lên xe.
- [journeyTones](../../mobile/constants/parent-journey.ts): màu cảnh báo/info/success/danger/purple/neutral dùng chung, tái sử dụng theme. Không cài package/font.
- [useParentJourneyTelemetry](../../mobile/hooks/use-parent-journey-telemetry.ts): một GET operational-state + incidents mỗi5s cho mỗi tripId, metadata detail tối đa mỗi20s và khi focus. Dedup nhiều con cùng chuyến; useActiveRefresh giữ no-overlap/isCurrent/focus/AppState. **Không gọi navigation/state/history/segment/session/position, không GPS watcher.** Home vẫn fetch8s như cũ.
- Cache theo account identity và tập tripId, giữ trips không đổi khi sibling đổi.401/403/404 xóa operation/incidents/detail của trip; lỗi từng nguồn giữ dữ liệu trước đó và có nhãn chưa cập nhật, mutable attendance fallback Home khi operational-state đọc lỗi. Không để cached account khác xuất hiện.
- [HomeScreen](<../../mobile/app/(tabs)/index.tsx>) chọn từng child, giữ nguyên auth/router/quick-leave payload/canReportLeave/busy; nhánh staff không đổi. getAttendanceBadge và getStatusBadge cũ không sửa. Giờ trong panel điểm danh chuyển cùng timezone Việt Nam.

Safe area/header/tab/keyboard của shell và các form được điều hướng đến giữ nguyên. Home không có input; không cộng offset bàn phím. MaxWidth560, responsive, không truncation. Card studentId:tripId giữ expanded qua polling; chiều cao panel đo lại khi metadata/status/font/width đổi. Body display:none khi đóng; button ẩn không vào tab order. Các helper GPS cũ còn trong parent-journey.ts để tương thích/tests, không còn được Home rail gọi.

## Kiểm chứng

- PASS Mobile tsc --noEmit sau cập nhật tag chiều về. Expo export all iOS/Android/Web/server đã chạy ở task mốc nghiệp vụ trước đó, không chạy lại cho thay đổi tag; outputs ngoài repo, không cài mới.
- PASS26 pure node:test checks:14 cũ +12 stage/time checks gồm hồi quy TH2 và tag chiều về, enums/booleans/clock/geometry only, không records/DTO giả/API mock hoặc DB. Đối chiếu192 vị trí bus giữ nguyên;72 mapping tag chỉ đổi PRESENT/chưa xuống chiều về từ Đã điểm danh sang Chưa xuống xe khi chưa có school-arrival.
- PASS source parity: controller Home, API clients, staff JSX và router/quick-leave callback payload giữ nguyên. Khối lịch cũ chỉ chuyển trình bày; dữ liệu lịch đầy đủ còn ở các vị trí mới.
- PASS Chromium IAB presentation-only:8 trạng thái tại320px, bus cùng y rail, node không chồng,3 icon tại xuất phát/pickup/đích và4 giữa chặng; các tag hiện ngay khi collapsed. Header/date cùng hàng320/390/844/1440, tên/trường/tuyến dài đủ và không tràn. Chiều về320/390, bubble theo lịch, CTA local không đóng card, Enter collapse hoạt động. Dùng primitive presentation selectors/nhãn kiểu chữ, không Trip/Student DTO hoặc fake API.
- NOT_VERIFIED lint: Mobile không có script/config riêng, không thêm dependency.
- NOT_VERIFIED Expo Go iPhone/Android, Safari iOS/Chrome Android, VoiceOver, Dynamic Type và settings reduced motion thực; thời gian1600ms từ sự kiện API thật, polling/error/permissions và API mutations end-to-end. BLOCKED_BY_TEST_DATA_POLICY cho phần cần phiên/dữ liệu vận hành chưa sẵn; không tự tạo records/phát vị trí hoặc gọi mutations để test.

## Phần thiếu / giới hạn

ETA vận hành và sự kiện xe đến/rời pickup không có trong response hiện dùng; chỉ triển khai lịch và mốc điểm danh có thật. Parent incident bị privacy mask nên chỉ có cảnh báo cấp chuyến. Home không trả lịch sử completed/cancelled; khi backend bỏ chuyến khỏi Home, card có thể chuyển sang chuyến ưu tiên tiếp theo hoặc rỗng, không có history cache do agent tự tạo. PARENT cùng chuyến có thể thấy rail khác nhau theo trạng thái từng con: đây là tiến trình minh họa, không hai vị trí GPS khác nhau của một xe.

Bước tiếp theo duy nhất: nghiệm thu trên Expo Go iPhone với dữ liệu chuyến/điểm danh hợp lệ do PO chuẩn bị.
