# Mobile — đối chiếu backend chuongtv/update-be ngày 05/11/2026

## Mốc source đã kiểm tra

| Nguồn | Commit | Kết quả |
| --- | --- | --- |
| origin/chuongtv/update-be sau git fetch | 41cf3b072cf1430f0f0071add4b131a1bc0fe6d0, 04/11/2026 16:34:32+07:00 | Backend mới nhất trên remote tại thời điểm rà soát |
| Nhánh mobile dongnnp/mobile/refactor-ui | f075db4 | Đã chứa commit backend trên và có 19 commit riêng phía mobile |
| Merge-base hai nhánh | 41cf3b0 | Backend là ancestor của nhánh mobile |
| git diff HEAD origin/chuongtv/update-be -- api | Rỗng | Hai cây api giống nhau |
| Commit backend mới nhất so với cha | 17 files trong api, 791 dòng thêm/178 dòng xóa | Các mục 3.4–3.18, schema/migration/tests/helpers |

Lượt này đối chiếu source và viết tài liệu chuẩn bị sửa mobile. Các trạng thái bên dưới phân biệt phần đang có trong source mobile và công việc cần triển khai tiếp. Backend được ghim theo commit để tra cứu lại. [41cf3b0](https://github.com/min-life/road-to-school/commit/41cf3b072cf1430f0f0071add4b131a1bc0fe6d0)

## Các đợt cập nhật backend liên quan

| Commit | Nội dung trong source | Ảnh hưởng mobile |
| --- | --- | --- |
| fefe0e6, 30/10 | Email delivery/eSMS, OTP delivery có kết quả chắc chắn hoặc chưa rõ, lỗi 503, gửi credentials nhân sự | Giữ draft khi lỗi gửi OTP và xử lý thông báo chờ khi kết quả gửi chưa rõ |
| de2e301, 03/11 | School lifecycle, thay đổi có ngày hiệu lực, hợp đồng, lịch nghỉ/học bù, admin finalization, effective trip timing, school account guard | Lịch/chuyến có thể đổi giờ hoặc bị khóa thao tác, BUS_ATTENDANT có thể bị thu hồi phiên theo trường |
| d0b4063, 03/11 | Lifecycle tài xế/phụ xe/xe, availability, bãi xe trung tâm, reoptimization flags | Tải lại thông tin nhân sự/xe khi điều phối, xử lý thay đổi quyền publish navigation |
| 41cf3b0, 04/11 | Frozen policy, sync chuyến chưa đóng băng, giữ chuyến đang chạy trên Home, chặn start khi trùng tài nguyên hoặc chiều về 100% vắng, thêm sự cố/GPS | Types, incident UI, thông báo khóa chuyến và đồng bộ dữ liệu cần đối chiếu theo các mục dưới |

Các đợt 3.2/3.3 có nhiều endpoint dành cho Web Admin. Mobile tiếp nhận kết quả lịch/tuyến/phân công qua API mobile đang dùng. Nguồn bối cảnh gồm school policy và kế hoạch nghiệp vụ đã chốt. [School policy](../../api/src/schools/school-policy.ts), [Master plan 3.4–3.18](../ai-review/business-improvement-master-plan-3.4-3.18.md)

## Thay đổi nghiệp vụ và tác động mobile

| Nhóm | Backend thực tế | Tác động cần xử lý |
| --- | --- | --- |
| WF-04 học sinh/phụ huynh | Link/update kiểm tra trường writable, trạng thái hồ sơ và quyền liên kết | Giữ dữ liệu form, hiện lỗi nghiệp vụ khi trường/hồ sơ bị khóa |
| WF-05 tạo phương án | Loại học sinh khác tỉnh nếu cả hai province có giá trị, loại điểm quá 50km từ bãi | Hiện routingStatus theo API, cần nguồn dữ liệu tỉnh từ BE trước khi thêm trường nhập mobile |
| WF-06 gán nguồn lực | Availability kiểm tra lịch/đơn nghỉ/sự cố, default assignment lan xuống chuyến unfrozen | Refresh tên/điện thoại tài xế/phụ xe, xe và trạng thái phân công |
| WF-07 lịch/sinh chuyến | serviceDay/effectiveTripTiming xử lý ngày hiệu lực, holiday/makeup và giờ mới | Lịch tuần/lịch con và giờ điểm trả lấy theo ngày từ server |
| WF-08 đổi phân công | Chỉ SCHEDULED chưa frozen được đổi thường lệ, 409 khi frozen | Hiện xung đột và refresh detail/operational state sau điều phối |
| WF-09 chiều đi | Điểm danh hai giai đoạn, tới trường và xuống xe là xác nhận riêng | Duy trì mapping từng con và hai endpoint boarding/alighting |
| WF-10 chiều về | Start yêu cầu ít nhất một PRESENT, active roster được đánh dấu đầy đủ, vắng có lý do | Bổ sung trạng thái chặn 100% vắng và xử lý 409 từ start |
| WF-11 Home/theo dõi | IN_PROGRESS tiếp tục xuất hiện dù qua scheduledEndAt, SCHEDULED vẫn lọc giờ kết thúc | Cập nhật giả định thời gian trong docs/UAT, giữ trạng thái riêng từng con |
| WF-12/13 báo nghỉ | cancelNotice chặn mọi kind khi đã có attendantReadyAt, kiểm tra availability nhân sự thay thế | Nút hủy/refresh lỗi cần theo điều kiện mới và gap canCancelLeave bên dưới |
| WF-14 đổi thông tin/địa chỉ | Admin REOPTIMIZED cần previewToken/expectedFingerprint, sync chuyến unfrozen sau duyệt | Parent gửi OTP/request theo endpoint hiện có, refresh routing/schedule sau kết quả duyệt |
| WF-15 chèn/ngừng phục vụ | Sync snapshot/roster chuyến unfrozen, loại roster qua excludedAt | Invalidate con/stop cũ khi snapshot đổi, giữ privacy theo roster thật |
| WF-16 hủy phương án | Chỉ hủy chuyến unfrozen, giữ frozen, có fingerprint chống xung đột | Đọc status mới khi focus, cập nhật cancelled/empty và quyền thao tác |
| WF-17 sự cố | Thêm ba type, optional coordinates/studentId, detector đổi ngưỡng | Sửa types/labels/filters/report payload và chốt các gap BE |
| WF-18 thông báo | Sự kiện nghiệp vụ có thể đổi quyền/phân công/dữ liệu đang xem | Dùng refresh/deep link hiện có, xử lý 403/404/409 khi dữ liệu đã đổi |

Bảng này mô tả tác động từ source, đi kèm các giới hạn BE ở mục bên dưới. Trạng thái COMPLETED trong tracker backend được đối chiếu riêng với mức tích hợp frontend.

## Frozen policy và đồng bộ snapshot

isTripFrozen/frozenTripWhere hiện lấy OR của các điều kiện sau.

- status là IN_PROGRESS hoặc COMPLETED.
- actualStartTime có giá trị.
- attendantReadyAt có giá trị.
- Có attendance PRESENT hoặc ABSENT, kể cả chuyến còn SCHEDULED.

FE_INTEGRATION_GUIDE mới mô tả hai timestamps. Predicate thực tế còn xét status/attendance. syncUnfrozenTripsForRoute chỉ xử lý SCHEDULED và NOT frozenTripWhere, đồng bộ assignment/snapshot/roster theo tùy chọn. Học sinh mới được thêm UNMARKED, học sinh rời tuyến được gắn excludedAt cùng lý do ROSTER_SYNC_REMOVED. Chuyến frozen giữ snapshot đang vận hành. [Frozen predicate](../../api/src/overview/operations-policy.ts), [Trip sync](../../api/src/trips/utils/trip-sync.helper.ts)

Home cards, roster và detail đã có các đường đọc lọc excludedAt. getOperationalState vẫn tính counter từ trip.attendances thô. Cần đối chiếu counter/capabilities với active roster sau sync trong UAT backend. Mobile ưu tiên capability server và xử lý lỗi mutation khi trạng thái đổi. [TripsService](../../api/src/trips/trips.service.ts)

## Contract chính xác cho mobile

Base URL hiện tại kết thúc bằng `/api/v1`. Các path trong bảng là phần sau base URL. mobile/services/api.ts đã sinh prefix này cho host mặc định. [API bootstrap](../../api/src/main.ts), [Mobile base URL](../../mobile/services/api.ts)

| Thao tác | Method/path | Dữ liệu và điều kiện |
| --- | --- | --- |
| Home nhân sự | GET /trips/mobile/home-trip | Ưu tiên IN_PROGRESS trước SCHEDULED |
| Home phụ huynh | GET /trips/mobile/parent/home-cards | Một chuyến ưu tiên/con, active roster, giữ IN_PROGRESS qua giờ kết thúc |
| Chi tiết mobile | GET /trips/mobile/:id | TripDetailResponseDto có adminFinalization/readiness và snapshot-derived stops |
| Operational state | GET /trips/:id/operational-state | can*/disabledReasons/timestamps, PARENT trả children riêng và bỏ readiness |
| Bắt đầu | POST /trips/:id/start | 409 khi tài xế/xe chạy chuyến khác hoặc chiều về 0 PRESENT |
| Điểm danh | PUT /trips/:id/attendance/:studentId | `{ status, absenceReason }`, status là UNMARKED/PRESENT/ABSENT |
| Xuống xe | PUT /trips/:id/attendance/:studentId/alighting | `{ isAlighted }` |
| Đến trường | POST /trips/:id/arrive-at-school | Xác nhận cấp chuyến, tách xác nhận xuống từng con |
| Kết thúc | POST /trips/:id/complete | actualEndTime kết thúc vận hành, adminFinalization là audit riêng |
| Điều kiện sự cố | GET /trips/:id/incident-options | canReport/availableTypes/disabledReason còn thiên về thiếu nhân sự |
| Báo sự cố | POST /trips/:id/incidents | `{ type, description?, idempotencyKey?, expectedAssigneeId?, latitude?, longitude?, studentId? }` |
| Xem sự cố chuyến | GET /trips/:id/incidents | items/counts, parent description/context/PII được mask |
| Hủy báo nghỉ | POST /leave-notices/:id/cancel | canCancelLeave/disabledReason ở list/detail, cần bắt 400/409 do thay đổi trạng thái |
| Yêu cầu cập nhật con | POST /parents/students/:id/update-requests/otp và /verify | type/proposedData và challenge/OTP theo DTO |

Các contract trên đã đối chiếu controller/DTO và mobile client. [Trips controller](../../api/src/trips/trips.controller.ts), [Operation DTO](../../api/src/trips/dto/trip-operation.dto.ts), [Incident controller](../../api/src/incidents/incidents.controller.ts), [CreateIncidentDto](../../api/src/incidents/dto/create-incident.dto.ts), [Leave controller](../../api/src/leave-notices/leave-notices.controller.ts), [Parent requests controller](../../api/src/student-requests/parent-requests.controller.ts), [Mobile client](../../mobile/services/api-client.ts)

### Điểm danh và hoàn tác theo chiều

- ABSENT bắt buộc absenceReason, giới hạn 500 ký tự và có kiểm tra trim trong service.
- Chiều đi chỉ điểm danh khi IN_PROGRESS. Service cho phép hoàn tác UNMARKED trước khi có arrivedAtSchoolAt.
- Chiều về điểm danh khi SCHEDULED sau readiness hoặc khi IN_PROGRESS. UNMARKED bị chặn sau start.
- Con đã xuống xe thì chuyển ABSENT bị chặn. Alighting áp dụng PRESENT với điều kiện chiều/trạng thái trong service.

Mobile đang gửi đúng status/absenceReason, dùng alighting API riêng và canReset theo hai chiều. Các phần này là nền tích hợp hiện có. [TripsService](../../api/src/trips/trips.service.ts), [Trip screen](../../mobile/app/trip/[id].tsx)

### Bảy loại sự cố thực tế

| Type | Nguồn tạo/điều kiện source | Mobile hiện tại |
| --- | --- | --- |
| ATTENDANT_MISSING | Driver báo trước xuất phát theo options và thời gian | Có |
| DRIVER_MISSING | Phụ xe báo trước xuất phát | Có |
| OFF_ROUTE | Detector, lệch >=50m, ít nhất 4 mẫu liên tiếp kéo dài >=15s, gap <=15s | Có labels/xác nhận tự động |
| LATE_STOP | Detector, trễ >180s, ít nhất 4 mẫu kéo dài >=15s, gap <=15s | Có labels/xác nhận tự động |
| NO_GUARDIAN_AT_STOP | Phụ xe được phân công báo, trip chưa kết thúc/hủy | Thiếu union/labels/selector/studentId |
| TRAFFIC_DELAY | Driver/phụ xe được phân công báo, trip chưa kết thúc/hủy | Thiếu union/labels/selector/GPS payload |
| GPS_SIGNAL_LOST | Driver/phụ xe được phân công báo, trip chưa kết thúc/hủy | Thiếu union/labels/selector/GPS payload |

Ba type mới tạo WAITING_ASSIGNMENT qua createManualIncident. GPS_SIGNAL_LOST là loại báo thủ công ở nhánh này. Detector được sửa trong commit mới vẫn có hai luồng OFF_ROUTE/LATE_STOP. Parent nhận type/status/time với context và dữ liệu cá nhân được mask. Latitude/longitude là optional IsNumber, frontend cần kiểm tra giá trị và nguồn tọa độ khi triển khai gửi. [Schema enums](../../api/prisma/schema.prisma), [Incident service](../../api/src/incidents/incidents.service.ts), [Detector](../../api/src/incidents/incidents-detector.service.ts)

## Các điểm cần BE chốt trước khi tích hợp đầy đủ

| ID | Đối chiếu source | Ảnh hưởng và việc cần chốt |
| --- | --- | --- |
| BE-01 options/report | createManualIncident nhận ba type mới khi đang chạy, getIncidentOptions vẫn trả một type thiếu nhân sự và TRIP_NOT_SCHEDULED/ATTENDANT_ALREADY_READY | Mobile disable theo options và chọn availableTypes[0]. BE cần trả capabilities theo từng loại trước khi mở luồng ghi mới |
| BE-02 hủy báo nghỉ | cancelNotice chặn mọi kind khi ready, mapToResponseDto chỉ chặn canCancelLeave cho BUS_ATTENDANT | Parent/Driver có thể thấy nút bật rồi submit bị 400. Cần đồng bộ flag/reason với service |
| BE-03 start/counter | startTrip chặn 0 PRESENT và tài nguyên đang chạy, getOperationalState chưa tính các điều kiện này trong canDriverStart | Nút có thể bật rồi nhận 409. Cần capability/reason nhất quán, kiểm thử counter trên active roster |
| BE-04 vòng đời sự cố mới | Ba type tạo WAITING_ASSIGNMENT, resolveIncident chỉ nhận hai type thiếu nhân sự, confirmAutoIncident chỉ OFF_ROUTE/LATE_STOP | Cần luồng xử lý/đóng chuyên biệt và quyền liên quan. Labels đọc có thể làm trước |
| BE-05 province đầu vào | Schema có hai field nullable, tìm trong api/src chỉ thấy phần đọc lọc tại routes.service | Cần xác định nguồn ghi/nhập tỉnh trước khi thêm trường nhập mobile |
| BE-06 guide/Swagger | Guide chung và summary incident controller còn khác với service/DTO | FE dùng contract trong tài liệu này, BE đồng bộ guide/Swagger ở task riêng |

Đây là các độ lệch xác định từ source commit 41cf3b0. Kiểm thử runtime database và Swagger đang chạy còn cần thực hiện với môi trường phù hợp.

## Đính chính khi dùng FE_INTEGRATION_GUIDE

| Nội dung trong guide chung | Source hiện hành |
| --- | --- |
| Prefix /api | NestJS dùng api/v1 |
| PATCH attendance với BOARDED/ALIGHTED/reason | PUT attendance/:studentId với PRESENT/ABSENT/UNMARKED/absenceReason, PUT alighting riêng |
| POST /incidents, incidentType | POST /trips/:id/incidents, field type, tripId ở path |
| BREAKDOWN/ACCIDENT/MEDICAL_EMERGENCY/STUDENT_MISSING/OTHER | Các giá trị này vắng trong enum schema đang kiểm tra |
| completedAt | Field vận hành actualEndTime, audit có adminFinalization.finalizedAt |
| PATCH /leave-notices/:id/cancel | Controller khai báo POST |
| Parent /student-requests/otp và /verify-and-create | Parent dùng /parents/students/:id/update-requests/otp và /verify |
| Frozen chỉ hai timestamps, undo chặn sau start mọi chiều | Predicate có status/attendance, undo chiều đi cho tới school-arrival |
| Resolve dùng resolution và replacementDriverId/... | ResolveIncidentDto dùng action/replacementUserId/reason và phục vụ thiếu nhân sự |

Guide chung là tài liệu đầu vào từ BE. Đợt cập nhật docs mobile bổ sung đường tra cứu theo source để FE đối chiếu các khác biệt này. [FE guide chung](../FE_INTEGRATION_GUIDE.md), [Resolve DTO](../../api/src/incidents/dto/resolve-incident.dto.ts)

## Gap mobile và thứ tự triển khai

| ID | Mức | Nguồn mobile hiện có | Công việc cần làm | Phụ thuộc |
| --- | --- | --- | --- | --- |
| M-01 | P0 | TripIncidentType có 4 giá trị, TripIncidentStatus có thêm 2 alias ngoài schema, Home label chỉ 4 case | Thêm 3 type/labels/icons/filters ở trip/incidents/Home, fallback type tương lai. Xử lý nullable description/context và rà status aliases theo response | Enum/response đã có |
| M-02 | P0 | Trip đọc can*/disabledReasons, copy chỉ có một số lý do | Map SCHOOL_INACTIVE/CONTRACT_EXPIRED/LOCATION_CHANGED/HOLIDAY/ADMIN_FINALIZATION_PENDING, refresh khi 400/409 | Policy/capability hiện có |
| M-03 | P0, cần BE chốt | createManualIncident chỉ nhận tripId/type/note, screen chọn availableTypes[0] | Selector đúng role/state, GPS optional thực/studentId active roster, giữ draft, idempotencyKey ổn định và expectedAssigneeId cho staff missing | BE-01/BE-04 |
| M-04 | P1 | MobileTripDetail chưa khai báo adminFinalization, PARENT operational vẫn bỏ readiness | Thêm type/audit UI, phân biệt chốt hành chính và xác nhận con xuống, tiếp tục đọc readiness từ detail | DTO đã có, UAT cần dữ liệu |
| M-05 | P1 | List/detail Báo nghỉ dùng canCancelLeave, catch hiện message | Refresh notice/detail/operation khi cancel bị 400/409, cập nhật reason theo BE | BE-02 |
| M-06 | P1 | Home8s, telemetry5s, detail5s khi chờ/20s khi chạy, navigation có canPublish/routeVersion | Kiểm thử/invalidate metadata sau sync đổi stop/roster/xe/người, privacy và số điện thoại mới, cleanup 403/404 | Sync/fingerprint |
| M-07 | P1 | Lịch theo serviceDate, ScheduleArrivalTime đọc dropoff thật | Xác minh holiday/makeup/ngày hiệu lực, virtual và giờ trả sau đổi lịch, refresh theo ngày/focus | School calendar |
| M-08 | P1 | Single-flight401 refresh, session-expiry popup và scope identity đã có | UAT BUS_ATTENDANT bị khóa trường/phiên cũ sau reactivation, cải thiện lý do khi contract hỗ trợ | School account guard |
| M-09 | P2 | OTP đã giữ lỗi, client chỉ retry401, tạo Báo nghỉ có cooldown/retryAfterMs | Xử lý 503 chưa rõ kết quả, giữ draft và dùng deadline server nếu có. Cần stable code/expiry trước khi thêm countdown503 | DeliveryError hiện thiếu structured expiry/uncertain code |
| M-10 | UAT | Home/API attendance/navigation đã có | Chuyến đang chạy quá giờ vẫn có card, start409, privacy, undo/down đúng chiều | Dữ liệu/role do PO cấp |

P0/P1/P2 là thứ tự đề xuất dựa vào ảnh hưởng. Các gap M-01 đến M-09 chưa được triển khai trong lượt rà soát này. Các cơ chế đã có trong cột nguồn được dùng làm nền tích hợp.

## Files liên quan khi sửa mobile

### Đối chiếu với màn hình đã triển khai

Bản đồ bổ sung kiểm kê 40 entry files, gồm 33 entry nghiệp vụ và 7 entry hỗ trợ/mẫu, kèm đường vào/ra, form/popup, data/refresh hiện tại và acceptance từng flow. Các mã màn trong bảng dưới được định nghĩa trong tài liệu đó. [Màn hình và luồng nghiệp vụ mobile](mobile-screen-business-flows.md)

| Backlog | Màn/entry cần sửa hoặc nghiệm thu |
| --- | --- |
| M-01 | H-01 Home, T-01 Trip, I-01/I-02 sự cố |
| M-02 | T-01, H-01, S-01 lịch staff, P-06 lịch con |
| M-03 | T-01 report modal, I-01/I-02 hiển thị kết quả, phụ thuộc BE-01/BE-04 |
| M-04 | H-01/T-01 và P-05/P-06 khi thể hiện route/trip/admin finalization |
| M-05 | L-01–L-04 và lối quick leave từ H-01/S-01/P-06 |
| M-06 | H-01/T-01, P-01/P-04/P-05/P-07–P-15, S-01/P-06 và dữ liệu notification target |
| M-07 | S-01, P-06 và các option ngày/chiều trong L-02 |
| M-08 | G-01 root, A-02 login, C-01 profile và role/session cleanup |
| M-09 | A-03–A-06, P-02/P-03/P-08–P-11, L-02/L-03 |
| M-10 | Toàn bộ entry theo role, form/popup U-01–U-13 và các ca SF-01–SF-07 |

Những flow đã có cần được đưa vào scope kiểm tra gồm quick leave đi thẳng OTP, lịch sử tổng các con/lịch sử theo con, fixed-student form, redirect chọn con cũ và tab riêng staff/parent. Danh sách đợt sửa trong tài liệu màn hình là đề xuất triển khai để PO giao việc.

- Client và lỗi trong services/api-client.ts, services/api.ts, context/auth-context.tsx.
- Trip/report/attendance trong app/trip/[id].tsx và app/incidents/index.tsx, [id].tsx.
- Parent rail/card trong utils/parent-journey-stage.ts, components/parent/student-journey.tsx, hooks/use-parent-journey-telemetry.ts.
- Báo nghỉ trong app/leave-notices/index.tsx, [id].tsx, create.tsx, otp.tsx và hooks/use-quick-leave-notice.ts.
- Lịch/đổi điểm trong app/parent/schedule.tsx, components/parent/schedule-arrival-time.tsx, create-address-request-view.tsx và parent/create-request/verify-otp.tsx.
- Map/location trong hooks/use-trip-navigation.ts, services/trip-navigation.ts, utils/trip-map-data.ts.

Đường dẫn tính từ mobile/. Các source chính mở trực tiếp ở đây. [API client](../../mobile/services/api-client.ts), [Trip](../../mobile/app/trip/[id].tsx), [Incident list](../../mobile/app/incidents/index.tsx), [Incident detail](../../mobile/app/incidents/[id].tsx), [Parent stage](../../mobile/utils/parent-journey-stage.ts), [Telemetry](../../mobile/hooks/use-parent-journey-telemetry.ts), [Navigation](../../mobile/hooks/use-trip-navigation.ts), [Parent schedule](../../mobile/app/parent/schedule.tsx)

## Migrations cần đối chiếu ở môi trường local

| Migration trong source | Schema |
| --- | --- |
| 20261103010000_school_lifecycle_calendar | Trip.adminFinalization, school_scheduled_changes, service_calendar_entries và FK/index |
| 20261103023000_vehicle_status_and_route_plan_reoptimization | Vehicle.isActive, RoutePlan.needsReoptimization/reoptimizationReason và index |
| 20261104081535_add_province_and_incident_types | School/Student.province nullable, ba enum incident mới |

Trạng thái áp dụng trên database local của PO chưa được xác minh ở lượt này. Các file migration được đọc để lập tài liệu. Khi nghiệm thu cần đối chiếu schema và API của môi trường chạy app. [Migrations](../../api/prisma/migrations)

## Kịch bản nghiệm thu sau khi sửa

| Nhóm | Kịch bản | Kết quả mong đợi |
| --- | --- | --- |
| Home | IN_PROGRESS quá giờ dự kiến và có SCHEDULED khác cùng con | Giữ card đang chạy và trạng thái riêng con |
| Frozen | SCHEDULED có ready/PRESENT/ABSENT, admin cập nhật tuyến | Trip frozen giữ snapshot, mobile refresh theo từng trip |
| Sync | Chèn/rời tuyến/đổi điểm trên chuyến unfrozen đã có | Roster/stop/giờ/xe cập nhật và privacy đúng roster |
| Start | Chiều về100%ABSENT, tài xế hoặc xe đang chạy chuyến khác | Capability/reason và409 nhất quán sau BE sửa |
| Undo | Đi trước/sau school arrival, về trước/sau start | Đúng updateAttendance service từng chiều |
| Leave | Các kind hủy sau ready, race ready khi confirm đang mở | Hiện lỗi và refresh quyền thao tác |
| Incident read | Ba type mới, parent masked context, type chưa biết | Labels/fallback và privacy đúng |
| Incident write | Role/state/GPS có-thiếu-stale/studentId active roster | Theo capability đã chốt và idempotency cùng thao tác |
| School/calendar | INACTIVE/reactivate, contract expired, location change, holiday/makeup | Session/flags/lịch/giờ đúng |
| Finalization | Admin chốt trip khi con còn PRESENT chưa alighted | Dữ liệu con tách biệt audit hành chính |
| OTP | Delivery503 lỗi chắc chắn/chưa rõ kết quả | Giữ draft, hướng dẫn theo kết quả/expiry BE cung cấp |

Dữ liệu và thao tác UAT cần PO cấp/ủy quyền theo WORKING_RULES. Lượt này đọc source, fetch Git và cập nhật docs. Mobile typecheck baseline PASS. Kiểm thử contract/runtime được thực hiện khi triển khai các gap với môi trường và dữ liệu phù hợp.
