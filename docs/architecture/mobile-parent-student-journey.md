# Parent Home — thanh hành trình theo nghiệp vụ đi/về

Cập nhật **01/11/2026**, local, chưa commit/push. Đây là spec hiện hành của **Chuyến xe của con** trong [HomeScreen](<../../mobile/app/(tabs)/index.tsx>), thay thế mapping ngày30/10 (nhịp điểm danh1600ms, chiều về hai mốc và bong bóng đếm phút theo lịch).

## Nguồn nghiệp vụ và phạm vi

Theo quyết định mới nhất của PO:

- Chiều đi: chờ khởi hành → giáo viên sẵn sàng → đang di chuyển → đã điểm danh lên → đến trường → đã điểm danh xuống → kết thúc chuyến.
- Chiều về: chờ khởi hành → giáo viên sẵn sàng → điểm danh lên trước xuất phát → đang di chuyển → xuống xe riêng từng con → kết thúc chuyến.

Chỉ sửa trình bày frontend và khai báo hai field detail API đã có. Không tạo enum, endpoint, sự kiện đến điểm đón, xác nhận điểm danh hoặc bản ghi mới. Trạng thái chuyến, sẵn sàng và điểm danh là các dữ kiện độc lập; không gộp cả chuyến để suy ra trạng thái của một con. Các nhánh nhân sự, API permissions và toàn bộ thao tác V2 được giữ.

## API và dữ liệu thực có

| Dữ kiện | Nguồn có sẵn | Cách dùng/giới hạn |
| --- | --- | --- |
| Con, avatar, trường, trip/route/direction, serviceDate, lịch, attendance/markedAt, xuống xe, báo nghỉ/canReportLeave | GET /trips/mobile/parent/home-cards | Một card ưu tiên mỗi con; kiểm tra đúng studentId |
| Trạng thái mới nhất, actualStartTime/actualEndTime, isSchoolArrived/arrivedAtSchoolAt, children[] | GET /trips/:id/operational-state | Projection PARENT có thời điểm vận hành và chỉ con được phép xem; **không trả readiness** |
| isAttendantReady, attendantReadyAt | GET /trips/mobile/:id | Đã có trong backend/Swagger; thêm optional type tương ứng trong MobileTripDetail, không đổi contract |
| Giờ điểm đón/trả, trường, bãi, scheduledStartTime/scheduledEndTime | Cùng MobileTripDetail/stops | Chọn đúng stop/studentId/isMyChild; giờ về bãi khác giờ trả con |
| Sự cố cấp chuyến | GET /trips/:id/incidents | Giữ privacy masking; không suy ra sự cố thuộc một con cụ thể |
| Sự kiện riêng xe đến/rời điểm đón; GPS ETA mới | Chưa có trong các response trên | Không tạo trạng thái/giờ hoặc tính ETA giả |
| Card đã kết thúc/hủy | getParentHomeCards lọc SCHEDULED/IN_PROGRESS | Không tự giữ lịch sử hoặc mở rộng backend trong task này |

Bằng chứng: [TripsService](../../api/src/trips/trips.service.ts), [response DTO/Swagger](../../api/src/trips/dto/trip-response.dto.ts), [mobile types/client](../../mobile/services/api-client.ts), [schema](../../api/prisma/schema.prisma), [IncidentsService](../../api/src/incidents/incidents.service.ts).

Enum thực: TripStatus = SCHEDULED / IN_PROGRESS / COMPLETED / CANCELLED; AttendanceStatus = UNMARKED / PRESENT / ABSENT. Các nhãn “Giáo viên sẵn sàng”, “Đã đến trường”, “Chưa xuống xe” là trình bày từ field có sẵn, không phải enum mới.

**Giới hạn kết thúc chuyến:** Home refresh8s loại card hoàn thành theo API hiện tại; operational refresh5s có thể cập nhật COMPLETED trong thời gian card còn được chọn. Mapping COMPLETED được xử lý đúng nhưng không đảm bảo có card lịch sử sau refresh/reload. Muốn luôn xem chuyến đã kết thúc cần thay nguồn/chính sách chọn chuyến riêng, ngoài phạm vi frontend này.

## Bố cục và thông tin được giữ

```text
Chuyến xe của con                                 DD/MM/YYYY
[Avatar] Tên con                               [Tag chuyến]
         Trường học                                   [˅]
         [Tag điểm danh của con] [Readiness khi chờ] [Sự cố]
──────────── mở rộng ──────────────────────────────────────
Tên tuyến đầy đủ · Chiều đi/về
[Khởi hành]            [Đón/Điểm danh lên]       [Đến trường]
[Giờ thực/dự kiến]     [Giờ thực/dự kiến]        [Giờ thực/dự kiến]
      │                         │                     │
Xuất phát ───────────────── Điểm đón ────────────── Trường học

Chiều về:
[Khởi hành]            [Trả con/Xuống xe]       [Kết thúc chuyến]
      │                         │                     │
Trường học ─────────────── Điểm trả của con ───────── Bãi xe

[So sánh sớm/trễ nếu có actual và lịch cùng mốc]
[Giờ điểm danh/xuống xe/lý do vắng V2 nếu có]
[Biển số · Tài xế]
[Theo dõi lộ trình]
[Báo nghỉ chuyến này — giữ canReportLeave và busy guard]
```

Không lặp tag điểm danh dưới rail; không thêm dòng trạng thái hoặc “Minh họa theo trạng thái” trong thanh hành trình. Tên tuyến vẫn wrap đầy đủ ở đầu panel, ngày từ serviceDate ngang heading; nhiều ngày có thêm ngày riêng từng route. Không loại bỏ giờ điểm danh chiều về: vẫn nằm trong phần chi tiết V2 bên dưới rail.

## Mapping chiều đi

Mốc0 = xuất phát,0.5 = điểm đón,1 = trường. Phân số là vị trí bố cục theo nghiệp vụ PO, không phần trăm quãng đường/GPS.

| Bước | Field thực | Tag chuyến / tag con | Bus |
| --- | --- | --- | --- |
| Chờ khởi hành | SCHEDULED, UNMARKED, ready=false | Chờ khởi hành / Chưa điểm danh lên; Chờ giáo viên |0 |
| Giáo viên sẵn sàng | SCHEDULED, ready=true | Chờ khởi hành / Chưa điểm danh lên; Giáo viên sẵn sàng |0 |
| Đang đi đón | IN_PROGRESS, UNMARKED | Đang di chuyển / Chưa điểm danh lên |1/3 =2/3 chặng xuất phát→điểm đón |
| Đã điểm danh lên | IN_PROGRESS, PRESENT, chưa đến trường/chưa xuống | Đang di chuyển / Đã điểm danh lên |5/6 =2/3 chặng điểm đón→trường |
| Đến trường | IN_PROGRESS, isSchoolArrived, PRESENT, chưa xuống | Đã đến trường / Chưa xuống xe |1 |
| Đã điểm danh xuống | IN_PROGRESS, PRESENT, isAlighted | Đã đến trường nếu school arrival đã có / Đã xuống xe |1 |
| Kết thúc | COMPLETED | Kết thúc chuyến / vẫn theo điểm danh riêng |1; giờ actualEndTime riêng dưới rail |

Không còn tự tạo nhịp1600ms đặt bus tại điểm đón rồi tự chuyển đi. API chưa có sự kiện đến/rời pickup độc lập; PRESENT đang di chuyển thể hiện chặng sau boarding, không xác nhận GPS tại nhà. Xác nhận đến trường không tự xác nhận từng con đã xuống.

## Mapping chiều về

Mốc0 = trường,0.5 = điểm trả của con,1 = kết thúc tuyến/bãi. Điểm trả không còn là điểm kết thúc chung của chuyến.

| Bước | Field thực | Tag chuyến / tag con | Bus |
| --- | --- | --- | --- |
| Chờ khởi hành | SCHEDULED, UNMARKED, ready=false | Chờ khởi hành / Chưa điểm danh lên; Chờ giáo viên |0 |
| Giáo viên sẵn sàng | SCHEDULED, ready=true | Chờ khởi hành / Chưa điểm danh lên; Giáo viên sẵn sàng |0 |
| Đã điểm danh trước xuất phát | SCHEDULED, PRESENT, chưa xuống | Chờ khởi hành / **Đã điểm danh lên**; readiness giữ riêng |0 tại trường |
| Đang di chuyển | IN_PROGRESS, PRESENT, chưa xuống | Đang di chuyển / Chưa xuống xe |1/3 =2/3 chặng trường→điểm trả |
| Con đã xuống xe, chuyến vẫn chạy | IN_PROGRESS, PRESENT, isAlighted | Đang di chuyển / Đã xuống xe |0.5 tại điểm trả, bus thay nhà; chưa tô hết tuyến |
| Kết thúc chuyến | COMPLETED | Kết thúc chuyến / theo xác nhận của con |1 tại bãi; actualEndTime ở mốc cuối |

Việc từng con xuống xe không kết thúc cả chuyến và không xác nhận các con khác đã xuống. Khi còn PRESENT chưa xuống, không khẳng định xe đã đến điểm trả vì không có event arrival độc lập.

## Thiếu dữ liệu, ngoại lệ và màu

- IN_PROGRESS + UNMARKED chiều về: giữ bus tại trường0 (fallback), đường xám, tag **Chưa điểm danh lên**; không ẩn bus, không tự đánh dấu boarding.
- UNMARKED vẫn giữ warning ngay cả khi chuyến đã đến/kết thúc. PRESENT chưa xuống khi COMPLETED vẫn **Chưa xuống xe**; hoàn thành chuyến chỉ đặt bus ở điểm cuối, không đổi xác nhận của con. Phù hợp cả dữ liệu bị sửa tay không nhất quán.
- ABSENT + notice hiệu lực: Đã báo nghỉ; ABSENT khác: Vắng mặt. Không vẽ bus cho hành trình con không tham gia. CANCELLED: tag Đã hủy, không bus.
- Readiness chỉ hiện lúc SCHEDULED: false→Chờ giáo viên; true→Giáo viên sẵn sàng (kèm giờ nếu hợp lệ); thiếu field→Chưa cập nhật GV. Không coi thiếu API là false/đã sẵn sàng. Readiness hết vai trò hiển thị khi chuyến đã chạy.
- Viền card/nền header dùng journeyTones theo **tag của con**: warning vàng, info xanh dương, purple tím, success xanh lá, danger đỏ. Readiness xanh không ghi đè tone của điểm danh. Trạng thái chuyến/sự cố giữ tag riêng; chi tiết nền trắng.
- Lỗi operational: không dùng operation lỗi để suy luận trạng thái mới; fallback home card, có nhãn stale. Detail readiness lỗi→unknown; thời gian/metadata cũ còn giữ có cảnh báo chưa cập nhật đầy đủ.403/404/401 xóa dữ liệu telemetry khỏi scope. Không tự retry mutation hoặc đổi selection.

## Giờ, animation và responsive

[journeyEventTime](../../mobile/utils/parent-journey.ts) tách confirmed/planned/actual: chưa xác nhận dùng lịch; đã xác nhận nhưng thiếu actual hiện —:— / Chưa có giờ, có dòng Lịch riêng nếu biết. Không lấy giờ dự kiến giả làm giờ thực.

- Khởi hành: actualStartTime khi IN_PROGRESS/COMPLETED, trước đó scheduled departure.
- Chiều đi midpoint: planned PICKUP của con hoặc markedAt khi đã điểm danh; đích: arrivedAtSchoolAt, fallback childAlightedAt nếu có xác nhận xuống, giữ ý nghĩa nhãn tương ứng.
- Chiều về midpoint: planned DROPOFF riêng con, sau xác nhận là childAlightedAt. Đích: scheduledEndTime hoặc actualEndTime khi COMPLETED. Giờ boarding ở trường vẫn có ở chi tiết điểm danh cũ.
- Sớm/trễ chỉ tính từ actual arrival của **cùng mốc** so với lịch, không từ thời gian hiện tại. Không có ETA động; bỏ bong bóng countdown theo lịch để tránh nhầm tiến độ thực.

Bus đặt trên rail, thay icon node khi ở0/0.5/1; các mốc khác vẫn hiện. Đường vàng đến mốc nghiệp vụ, phần còn lại xám. Không xe chạy qua lại, không GPS watcher; vị trí đổi trực tiếp, fade180ms khi active. Reduced motion/blur/background ngừng animation như component cũ. Marker scale theo rail measured width; ba time badge flex, title wrap, clock co vừa vùng, không fixed spacer theo thiết bị. Giữ component expand/collapse/keyboard/safe-area hiện có; không thêm input hoặc đổi navigation.

## Component, dữ liệu và mở rộng

| File | Trách nhiệm |
| --- | --- |
| [index.tsx](<../../mobile/app/(tabs)/index.tsx>) | Ghép operation đúng tripId/direction/studentId; chọn readiness từ operation nếu có, nếu không dùng detail; truyền label/status/readiness; giữ nguyên body/actions và nhánh staff |
| [trip-card.tsx](../../mobile/components/parent/trip-card.tsx) | Optional readiness?: StudentJourneyBadge; chip và accessibility label ở header, tone theo studentStatus; giữ expand/collapse |
| [student-journey.tsx](../../mobile/components/parent/student-journey.tsx) | ParentStudentJourney nhận card/telemetry/active/showServiceDate; rail ba mốc, clocks/variance/incidents, không timer boarding |
| [parent-journey-stage.ts](../../mobile/utils/parent-journey-stage.ts) | Pure badge/trip label/readiness/stage helpers; không enum/API mutation |
| [parent-journey.ts](../../mobile/utils/parent-journey.ts) | Parse clock/timezone, actual-vs-planned, time selection theo con; legacy geometry helpers không được dùng để suy ra vị trí rail mới |
| [use-parent-journey-telemetry.ts](../../mobile/hooks/use-parent-journey-telemetry.ts) | Dedup theo tripId, existing GET operation/incidents5s; detail5s khi SCHEDULED để cập nhật readiness,20s khi đã chạy; focus immediate, scope/permission/active guards cũ |
| [api-client.ts](../../mobile/services/api-client.ts) | Optional detail readiness fields đã có trên server; runtime client giữ nguyên |
| [parent-journey-stage.test.ts](../../mobile/scripts/parent-journey-stage.test.ts) | Bảng trạng thái, exception, thời gian và96 tổ hợp scalar; không business fixtures |

Khi mở rộng, thêm mapping vào pure helpers từ field đã tồn tại; phân biệt trạng thái chuyến/ready/boarding/down của đúng con. Cần sự kiện, ETA hoặc lịch sử mới phải kiểm tra contract và duyệt phạm vi riêng. Không dùng timers/GPS giả để lấp dữ liệu thiếu.

## Kiểm chứng01/11/2026

- PASS: Mobile npx --no-install tsc --noEmit; Expo export --platform all ra TEMP (web/iOS/Android bundles, không native build/runtime).
- PASS:31 pure tests trong hai scripts journey/stage, gồm7bước chiều đi,6bước chiều về, readinessmissing, return UNMARKED fallback, completed không suy ra xuống,96 tổ hợp enum/boolean, clock planned/actual/missing. Chỉ scalar/geometry, không records giả hay fake API responses.
- PASS: Preview JSX/styles thực của header/rail, ma trận13bước tại320×568 và390×844, desktop1440×900: bus hiện đủ các bước thông thường, không overflow ngang. Dùng identity đã có từ snapshot read-only và giờ để trống; không mount API/data hook/auth giả.
- PASS: Kiểm tra source body/actions của ParentTripCard và các nhánh Home ngoài parent mapping giữ nguyên; runtime API client không đổi;11hashes backend/schema/các phần pending khác/dependencies/env giữ nguyên.
- NOT_VERIFIED: native Expo iPhone/Android, Safari/Chrome mobile, VoiceOver/font scale lớn, thao tác/authenticated refresh/race và chuyển nghiệp vụ đầu-cuối trên DB. Không thay records để tạo các bước test: BLOCKED_BY_TEST_DATA_POLICY đối với kiểm thử cần mutation/dữ liệu mới. Preview không thay nghiệm thu runtime.

[Xem báo cáo và diff riêng task](../ai-review/LATEST.md). Các quyết định cũ được lưu trong lịch sử review; spec này ưu tiên luồng PO ngày01/11.
