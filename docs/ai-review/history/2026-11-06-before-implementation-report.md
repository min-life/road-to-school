# Audit độc lập RoadToSchool 3.1–3.18

## 1. Tổng quan hiện trạng

Ngày 05/11/2026, Asia/Saigon. REVIEW ONLY. Phạm vi branch `chuongtv/update-be` tại HEAD `41cf3b072cf1430f0f0071add4b131a1bc0fe6d0`, đối chiếu diff từ `c14e059` qua `fefe0e6`, `de2e301`, `d0b4063`, `41cf3b0`.

**Kết quả review: COMPLETED. Trạng thái bàn giao FE: NEEDS_ATTENTION.** TypeScript đạt và 193/193 unit tests trong phạm vi yêu cầu đạt. Source triển khai một phần quan trọng của plan, gồm lọc Home, thao tác theo role, giữ lịch sử và ngưỡng telemetry. Các lỗi về duyệt preview, khóa đồng thời và lịch phục vụ có thể làm sai dữ liệu hoặc gián đoạn chuyến. Hướng dẫn FE hiện có ví dụ sai đường dẫn, method, payload và mã lỗi.

Trong bảng review, **PASS (source)** chỉ xác nhận cấu trúc hoặc logic được đọc đáp ứng phần nêu rõ. **PASS (chạy thực tế)** dành cho lệnh kiểm chứng ở mục 9. P1 là vấn đề cần sửa trước khi bàn giao luồng liên quan. P2 là sai lệch cần xử lý trong phạm vi nghiệp vụ đã chốt.

## 2. Yêu cầu gốc

Audit toàn bộ cải tiến từ 3.1 đến 3.18. Đối chiếu schema/migrations, G-01…G-04 và các quy tắc nguồn lực, B-01…B-06 theo checklist được gửi, sự cố/GPS và hợp đồng API với FE. Chạy typecheck và các unit suites độc lập đã chỉ định. Lập báo cáo có dẫn chứng, giới hạn kiểm chứng và kết luận bàn giao.

## 3. Phạm vi được phép và nguồn đối chiếu

Review source/diff, đọc AGENTS và Working Rules, Business Context, tracker, quyết định Master Plan, FE Guide, báo cáo trước và handoff. Dùng các hàng **CHỐT** trong plan làm yêu cầu. Với G-01, quyết định riêng mới hơn D36-02, D314-02 và D315-01 quy định đồng bộ ngay, đồng thời vẫn phải giữ các ràng buộc ngày và frozen tương ứng. Trong master plan, G-04 là all-or-nothing. Checklist bổ sung yêu cầu đơn trường, chống trùng chuyến và bán kính 50 km, nên audit cả hai nhóm.

Báo cáo này chỉ cập nhật tài liệu review. Các thay đổi nghiệp vụ hoặc API cần được PO duyệt trong task sửa riêng. [Master Plan](business-improvement-master-plan-3.4-3.18.md), [tracker](../BUSINESS_IMPROVEMENT_TRACKER.md), [FE Guide](../FE_INTEGRATION_GUIDE.md).

## 4. Đánh giá từng nhóm nghiệp vụ

| Mục | Yêu cầu và thực tế source | Kết quả |
|---|---|---|
| 3.1 Tài khoản/OTP | Có nhánh SMS console/eSMS, email bắt buộc và trạng thái giao mật khẩu. OTP liên kết, cập nhật và báo nghỉ có logic đếm lỗi nhưng ghi increment rồi throw trong transaction. Xem F09. | NEEDS_ATTENTION |
| 3.2 Trường/lịch dịch vụ | Có lịch thay đổi, calendar, chặn học bù trùng nghỉ nhà xe, phân biệt admin finalization với xuống xe. Khóa trong thao tác Trip đảo thứ tự so với cron/chốt hành chính. Xem F03. | NEEDS_ATTENTION |
| 3.3 Nguồn lực/bãi xe | Có trạng thái xe, bàn giao theo transaction, cờ reoptimization và route-by-route. Apply lịch dời bãi chỉ có caller từ controller. Generator/readiness thiếu gate theo cờ. Bàn giao có thể chạm Trip đã Ready. Xem F05/F06. | NEEDS_ATTENTION |
| 3.4 Học sinh/Parent | Thay guardianPhone giữ liên kết. Parent tự unlink có sẵn. Chưa có thao tác School Admin thu hồi liên kết sai có lý do/audit theo D34-01. Chuyển trường không thuộc phạm vi đã chốt. | NEEDS_ATTENTION |
| 3.5 Tạo phương án | Giữ tối ưu một phần và danh sách học sinh chưa xếp. Bán kính/tỉnh chỉ lọc ở preparation, input optimize/confirm chưa dùng chung policy. Xem F07. | NEEDS_ATTENTION |
| 3.6 Phân công và duyệt | SCHOOL_ADMIN vẫn là người duyệt DRAFT. Đổi default có đồng bộ ngay, nhưng helper chép cả ba nguồn lực và có thể ghi đè override từng Trip. Xem F02. | NEEDS_ATTENTION |
| 3.7 Sinh chuyến/lịch | Khóa duy nhất Route–ngày giúp tránh tạo trùng. D37-01 thiếu API reopen cùng kiểm tra/audit và D37-02 thiếu firstServiceDate. Hủy do dời bãi vì vậy có thể để lại ngày không sinh lại được. | NEEDS_ATTENTION |
| 3.8 Phân công chuyến | Có chặn thường lệ cho SCHEDULED đã Ready/có PRESENT/ABSENT và kiểm tra IN_PROGRESS đang dùng cùng xe/tài xế. Tính khả dụng chưa đồng nhất giữa writer, thiếu khóa theo nguồn lực dùng chung, thiếu cảnh báo LATE_RUNNING_TRIP_RISK đã chốt. Xem F03/F05. | NEEDS_ATTENTION |
| 3.9 Chiều đến trường | ABSENT bắt buộc absenceReason. Giữ hoàn tác trước arrival đúng D39-02. Sau arrival vẫn có thể đổi ABSENT → PRESENT và phát BOARDING, thiếu correction có lý do/audit. Xem F08. | NEEDS_ATTENTION |
| 3.10 Chiều về | Start chặn khi không có PRESENT. Operational state vẫn có thể bật Start. Chưa có thao tác attendant hủy chuyến toàn vắng. NO_GUARDIAN_AT_STOP chưa ràng buộc trẻ thuộc roster và chưa xuống. Xem F08/F10. | NEEDS_ATTENTION |
| 3.11 Theo dõi/lịch sử | Cả hai truy vấn Home giữ IN_PROGRESS quá giờ. Mobile masking xóa tên/địa chỉ nhưng giữ tọa độ điểm đón trẻ khác, cả điểm bãi cũng được trả. D311-02 chỉ cho thấy điểm con mình và trường. Xem F11. | NEEDS_ATTENTION |
| 3.12 Học sinh báo nghỉ | Giữ báo nghỉ từng Trip và chỉ người tạo được rút. Cancel chặn Ready/đã chạy, nhưng khôi phục snapshot không kiểm phiên bản điểm danh. API tạo/options vẫn cho một số ca chiều đi sau Ready, khác D312-02. Xem F04. | NEEDS_ATTENTION |
| 3.13 Nhân sự báo nghỉ | REPLACED không tự rút, đổi default là luồng xử lý dài ngày. Helper có recheck overlap nhưng chỉ lấy một leave/incident để so khung giờ và thiếu đơn trường ở nhánh Driver. Xem F05. | NEEDS_ATTENTION |
| 3.14 Đổi thông tin/địa chỉ | REOPTIMIZED bắt buộc token tồn tại. Fingerprint tùy chọn, thiếu kiểm hết hạn/đúng request và không tính lại theo phiên bản Route. Có thể áp geometry sai tuyến. Xem F01. | NEEDS_ATTENTION |
| 3.15 Chèn/ngừng phục vụ | Confirm insertion gọi sync roster/snapshot cả hai chiều. Sync thiếu khóa frozen khi ghi và giờ tuyệt đối. Disable lọc Start/Ready nhưng thiếu kiểm điểm danh. Xem F02/F04. | NEEDS_ATTENTION |
| 3.16 Hủy/chuyển tiếp | Hủy thủ công lọc frozen tại bước chọn. Fingerprint chỉ kiểm nếu gửi và ngoài transaction. Update chỉ theo ID. Nhiều plan khác nhóm có thể tồn tại, chưa thấy workflow thay thế cùng nhóm đã chốt. Xem F04. | NEEDS_ATTENTION |
| 3.17 Sự cố/điều phối | Có enum/DTO/context cho ba loại mới, telemetry có ngưỡng mới. Nhánh REPLACED gọi helper. Các loại mới lại được lưu WAITING_ASSIGNMENT mà resolve chỉ hỗ trợ thiếu người. Xem F05/F10. | NEEDS_ATTENTION |
| 3.18 Tổng quan/thông báo | Tasks tính từ trạng thái nghiệp vụ, readAt chỉ đổi Notification. D318-01 thiếu hai nhóm ADMIN_FINALIZATION và REOPTIMIZATION. Xem F12. | NEEDS_ATTENTION |

### Đối chiếu checklist Global Rules và B-01…B-06

| Hạng mục | Kết luận |
|---|---|
| G-01 | NEEDS_ATTENTION. Có call sites đổi default, insertion, reoptimized address. Đồng bộ thiếu date gate, recheck và scheduledStartAt/scheduledEndAt. |
| G-02 | PASS (source) với direct assignment và rút leave khi đã Start/Ready. NEEDS_ATTENTION với bảo vệ frozen xuyên các mutation, nhất là đồng bộ, disable/remove và hủy plan. |
| G-03 | PASS (source) cho tách readAt và số việc. D318-01 là thiếu phạm vi Dashboard riêng. |
| G-04 | NEEDS_ATTENTION. Transaction bao một số thay đổi nhưng vẫn có thể commit trạng thái sai khi nguồn đã đổi hoặc scope sync không đúng. Gán nguồn lực, start song song và radius chưa được chặn toàn diện. |
| B-01 | PASS (source). Nhánh IN_PROGRESS độc lập với điều kiện scheduledEndAt và được ưu tiên trong Home Driver/Attendant lẫn Parent. |
| B-02 | NEEDS_ATTENTION. Token được yêu cầu, fingerprint và binding/TTL/revalidation chưa đạt. |
| B-03 | NEEDS_ATTENTION. Có gọi assertStaffAvailableForTrip ở REPLACED nhưng helper chưa kiểm hết đơn và xung đột nguồn lực. |
| B-04 | NEEDS_ATTENTION. Có sync tức thì cho hai Route, chưa bảo đảm toàn vẹn snapshot/roster/giờ và giữ frozen dưới cạnh tranh. |
| B-05 | PASS (source) đối với absenceReason và chặn UNMARKED chiều về sau Start. NEEDS_ATTENTION với correction sau arrival. Rule D39-02 cho hoàn tác chiều đi trước arrival, vì vậy không áp câu “cấm sau Start” cho mọi chiều. |
| B-06 | NEEDS_ATTENTION. Chọn đúng subset trong trường hợp tuần tự. Thiếu fingerprint bắt buộc và điều kiện frozen/status khi ghi. |

## 5. Hồ sơ phát hiện và cách đối chiếu source

### F01 · P1 · Duyệt đổi địa chỉ có thể áp preview của yêu cầu khác

`approveRequest` kiểm token có trong Map rồi ghi geometry của toàn bộ routeIds lấy từ session đó. Nó không đối chiếu requestId, studentId, tọa độ, danh sách tuyến hoặc tuổi session. expectedFingerprint chỉ được so nếu client gửi và chỉ so với giá trị cache. Hash khi preview chỉ gồm request ID, tọa độ và IDs tuyến, thiếu phiên bản route/stops. Ví dụ cùng admin có token của A, approve B với token A và bỏ fingerprint hoặc gửi hash A. Geometry của A có thể bị ghi trong khi tọa độ và snapshot được xử lý cho B. Sửa đúng yêu cầu là bind preview vào request/scope/phiên bản và kiểm lại dữ liệu hiện hành khi commit. Kiểm tra một lần quyết định request đồng thời, vì đọc PENDING rồi update theo id chưa đảm bảo chỉ một writer chốt. [student-requests.service.ts:853, 1034, 1106, 1466](../../api/src/student-requests/student-requests.service.ts#L1034)

### F02 · P1 · Đồng bộ lại Trip có thể ghi đè phân công và tạo hai bộ giờ khác nhau

Helper chọn SCHEDULED chưa frozen rồi ghi roster/update Trip theo ID. Dữ liệu có thể đổi sang Ready hoặc có điểm danh giữa đọc và ghi. Assignment-only copy cả xe, tài xế, phụ xe. Đổi mặc định tài xế có thể xóa override xe/phụ xe đã bố trí qua sự cố hoặc báo nghỉ, và không kiểm lại khả dụng trên từng Trip. Insertion gọi mặc định cả assignment lẫn roster, dù nghiệp vụ chỉ chèn trẻ. Query thiếu mốc serviceDate nên có thể chạm SCHEDULED quá khứ. Cập nhật scheduledStartTime/scheduledEndTime nhưng không cập nhật scheduledStartAt/scheduledEndAt, trong khi Start và kiểm trùng lịch đọc giờ tuyệt đối. Snapshot cũng copy giờ từ Route thay vì dẫn xuất cho từng ngày học/học bù. Cần dùng cùng policy thời gian/roster, chỉ đổi field thuộc mutation, kiểm lại frozen và nguồn lực dưới khóa. [trip-sync.helper.ts:40, 66, 110, 151](../../api/src/trips/utils/trip-sync.helper.ts#L40), [routes.service.ts:2904, 3034](../../api/src/routes/routes.service.ts#L2904)

### F03 · P1 · Đảo thứ tự khóa School và Trip

`TripsService.withTripLock` khóa Trip trước, rồi School và gọi reconcile. Cron giữ School trước khi khóa các Trip, tương tự luồng chốt hành chính. Nếu cron giữ School và chờ Trip A, trong khi Start giữ Trip A và chờ School, PostgreSQL có thể hủy một transaction do deadlock. Hai thao tác ở hai Trip cùng trường cũng có thể cạnh tranh vì reconcile quét các Trip khác. Đây là đường dẫn suy ra từ source, chưa tái hiện bằng DB. Dùng một thứ tự khóa xuyên các writer và thu hẹp phạm vi đối soát trong giao dịch vận hành. [trips.service.ts:94](../../api/src/trips/trips.service.ts#L94), [contract-lifecycle.service.ts:145, 254](../../api/src/schools/contract-lifecycle.service.ts#L145), [trip-finalization.service.ts:59](../../api/src/schools/trip-finalization.service.ts#L59)

### F04 · P1 · Frozen chỉ được kiểm ở một số đường ghi

Hủy plan nhận fingerprint tùy chọn, kiểm trước transaction. Fingerprint dựa trên số lượng thay vì danh tính/trạng thái từng Trip, nên đổi danh sách mà giữ tổng có thể không bị phát hiện. Sau khi lấy IDs unfrozen, UPDATE thiếu status và predicate frozen. Trip vừa Start có thể bị đổi thành CANCELLED và báo hủy sai. Disable và REMOVED_FROM_ROUTES lọc actualStartTime/Ready nhưng thiếu kiểm dấu điểm danh và cùng giao thức khóa. Rút leave khóa Trip và chặn Ready/Start, nhưng phục hồi snapshot cũ có thể ghi đè một lần điểm danh mới trong ca chưa Ready. Cần phân biệt ABSENT do notice và do nhận trẻ. Dùng chung khóa hoặc compare-and-set và kiểm tác động ngay lúc ghi. Kiểm riêng bảo lưu hold cho chuyến frozen sau hủy thủ công. [routes.service.ts:1709, 1778, 1793](../../api/src/routes/routes.service.ts#L1778), [students.service.ts:708](../../api/src/students/students.service.ts#L708), [student-requests.service.ts:992](../../api/src/student-requests/student-requests.service.ts#L992), [leave-notices.service.ts:514, 545](../../api/src/leave-notices/leave-notices.service.ts#L514)

### F05 · P1 · Khả dụng nguồn lực chưa được đảm bảo ở mọi thao tác

Kiểm đơn trường có ở validateDriverForGroup, còn helper Trip chỉ kiểm trường của attendant và lịch trong ngày. Driver đang được giữ cho trường A có thể được chọn cho Trip B không trùng khung giờ. Helper lấy findFirst cho leave và incident rồi mới so giờ, nên bản ghi đầu không giao nhau có thể che bản ghi thứ hai đang xung đột. Kiểm IN_PROGRESS ở Start là đọc trước ghi, khóa riêng Trip/School không bảo vệ cùng xe/tài xế giữa hai trường. PATCH assignment kiểm xe tồn tại/sức chứa dựa trên RouteStop, thiếu check isActive và có thể khác roster Trip. Bàn giao inactive ở 3.3 kiểm chủ yếu IN_PROGRESS rồi chuyển các SCHEDULED, kể cả Ready hoặc đã điểm danh. Cần kiểm theo resource thực, dùng roster của Trip, và bao phủ default, Trip, leave, incident, bàn giao và Start. [staff-availability.helper.ts:58, 99, 131, 165](../../api/src/trips/utils/staff-availability.helper.ts#L58), [resource-availability.service.ts:322](../../api/src/routes/resource-availability.service.ts#L322), [trips.service.ts:925, 1830](../../api/src/trips/trips.service.ts#L925), [vehicles.service.ts:255, 318](../../api/src/vehicles/vehicles.service.ts#L255)

### F06 · P1 · Dời bãi chưa xuyên suốt từ lịch hẹn tới sinh chuyến

Lúc đặt lịch, API đã hủy Trip SCHEDULED từ ngày hiệu lực và đặt cờ reoptimization. Hủy lịch chỉ xóa scheduledChange, chưa giải quyết các Trip đã hủy và cờ đã đặt. Tới ngày, chỉ thấy apply được gọi qua endpoint thủ công. Generator vẫn dựa vào ACTIVE và ngày phục vụ, không kiểm cờ reoptimization. Ví dụ đặt lịch trước khi Trip ngày X được sinh, sau đó cron có thể sinh ngày X theo tuyến bãi cũ. Nếu đã hủy Trip ngày X, unique Route–ngày ngăn sinh lại và D37-01 chưa có reopen. Cần chốt và thực thi thời điểm áp, tác động khi hủy hẹn và gate dùng chung giữa preview, approve, generation và Start. [system-settings.service.ts:234, 350, 384](../../api/src/system-settings/system-settings.service.ts#L234), [system-settings.controller.ts:116](../../api/src/system-settings/system-settings.controller.ts#L116), [trips.service.ts:369](../../api/src/trips/trips.service.ts#L369), [schema.prisma:508](../../api/prisma/schema.prisma#L508)

### F07 · P2 · Bộ lọc 50 km và tỉnh/thành chỉ kiểm ở preparation

Nhánh preparation đo đường chim bay từ bãi đến học sinh và đối chiếu province khi cả hai có dữ liệu. Optimize nhận studentIds từ body và chỉ truy vấn cùng trường/AVAILABLE/có tọa độ ở bước lọc đầu vào. Confirm cũng chưa kiểm lại radius/province. province chưa được nối vào DTO và luồng ghi School/Student được rà, nên bản ghi nullable mặc định không tham gia so tỉnh. Cần thống nhất loại khoảng cách theo quyết định PO và áp cùng policy ở mọi cửa vào. [routes.service.ts:281, 433, 1172](../../api/src/routes/routes.service.ts#L281), [schema.prisma:237, 274](../../api/prisma/schema.prisma#L237)

### F08 · P1 · Chặn Start toàn vắng có, nhưng luồng kết thúc và correction còn thiếu

Chiều về 0 PRESENT trả 409 ở Start, trong khi getOperationalState vẫn có thể trả canStartTrip=true khi roster đã điểm đủ. Không thấy API BUS_ATTENDANT hủy vì toàn vắng theo D310-01. Kết quả có thể là Trip mắc ở SCHEDULED. Sau arrival chiều đi, đổi sang PRESENT vẫn đặt markedAt mới và phát BOARDING, trái D39-02. Cần phân biệt chỉnh sai và lên xe thật, giữ lý do và audit, đối chiếu QR/thủ công/cờ thao tác. [trips.service.ts:1903, 2147, 2197, 2217, 2591](../../api/src/trips/trips.service.ts#L1903), [trips.controller.ts:316](../../api/src/trips/trips.controller.ts#L316)

### F09 · P1 · Giới hạn thử OTP có thể không lưu sau lần nhập sai

Nhánh OTP liên kết và yêu cầu sửa Student gọi update increment rồi throw trong callback transaction. OTP báo nghỉ cũng throw sau update qua transaction caller. Exception làm rollback increment cùng giao dịch. Các nhánh còn kiểm consumedAt rồi update theo id, nên không có compare-and-set tại điểm tiêu thụ. OTP liên kết/đổi Student được consume trước khi mutation nghiệp vụ sau đó hoàn tất, có thể khiến retry cần mã mới khi mutation bị từ chối. Kết quả audit source, chưa chạy provider hay tái hiện DB. Cần bảo toàn số lần thử và định nghĩa consume một lần gắn với kết quả nghiệp vụ. [otp.service.ts:296, 330, 468, 515, 624, 660](../../api/src/auth/otp.service.ts#L330), [leave-notices.service.ts:352](../../api/src/leave-notices/leave-notices.service.ts#L352), [parents.service.ts:226](../../api/src/parents/parents.service.ts#L226)

### F10 · P1 · Ba loại sự cố mới tạo được nhưng chưa có vòng xử lý hoàn chỉnh

DTO nhận latitude/longitude/studentId dạng optional. Service ghi null khi thiếu và chưa kiểm cặp tọa độ/range, học sinh thuộc roster, chiều về và trạng thái chưa xuống đối với NO_GUARDIAN_AT_STOP. Tạo sự cố mới dùng WAITING_ASSIGNMENT, nhưng resolve chỉ nhận ATTENDANT_MISSING/DRIVER_MISSING, confirm chỉ dành cho OFF_ROUTE/LATE_STOP. notifyIncident dùng logic cũ, loại mới có thể gửi thông báo nhãn “Giáo viên chưa đến” tới SCHOOL_ADMIN ngoài trường vì điều kiện schoolId chỉ áp cho ATTENDANT_MISSING. Detector chỉ được đánh giá khi có telemetry, chưa thấy job tự phát hiện GPS im lặng quá ba phút hoặc LATE_RUNNING_TRIP_RISK. OFF_ROUTE dùng >=50 m thay vì >50 m đã chốt. Cả hai cảnh báo có lưu tọa độ và cần >=15 giây với ít nhất bốn mẫu, nên một streak đủ thời gian nhưng ít mẫu vẫn không phát. [create-incident.dto.ts:41](../../api/src/incidents/dto/create-incident.dto.ts#L41), [incidents.service.ts:265, 386, 849, 1182](../../api/src/incidents/incidents.service.ts#L386), [notification-events.ts](../../api/src/notifications/notification-events.ts), [incidents-detector.service.ts:239, 261, 362, 382](../../api/src/incidents/incidents-detector.service.ts#L239)

### F11 · P1 · Parent vẫn nhận tọa độ điểm đón của trẻ khác

getMobileTripDetail spread nguyên stop rồi bỏ studentId/tên/địa chỉ. latitude/longitude của stop vẫn còn, vì thế người dùng có thể suy ra vị trí điểm đón của trẻ khác dù tên đã ẩn. Điểm không có studentId gồm cả bãi được trả nguyên. Cần kiểm payload thật và UI theo phạm vi PO cho phép, gồm xe, điểm con mình và trường. [trips.service.ts:1429, 1444](../../api/src/trips/trips.service.ts#L1429)

### F12 · P2 · Thiếu API/metadata đã chốt, chưa thể nối FE

Chưa tìm thấy reopen CANCELLED → SCHEDULED, firstServiceDate, quyền trường thu hồi liên kết sai có lý do, workflow thay thế plan cùng nhóm hoặc hai nhóm tasks D318-01 trong source production. Dashboard hiện có INCIDENT/LEAVE/REQUEST/PLAN. Ngày đầu phục vụ, ngày từng bị hủy và việc cần tối ưu lại vì vậy vẫn cần FE suy diễn hoặc thao tác ngoài hướng dẫn. Tách rõ phần thiếu với phần đã có, ví dụ chốt hành chính và cờ reoptimization đều tồn tại riêng. [trips.controller.ts](../../api/src/trips/trips.controller.ts), [parents.controller.ts](../../api/src/parents/parents.controller.ts), [routes.service.ts:2939](../../api/src/routes/routes.service.ts#L2939), [overview.service.ts:64](../../api/src/overview/overview.service.ts#L64)

## 6. Database và Minimal DB Impact

| Commit | Thay đổi schema/migration thực tế | Kết quả |
|---|---|---|
| fefe0e6 | Không có migration trong commit. Dùng User/Session/OtpChallenge sẵn có. | PASS (source) |
| de2e301 | 20261103010000 thêm hai bảng school_scheduled_changes, service_calendar_entries và trips.admin_finalization nullable. Hai bảng thuộc phạm vi 3.2 đã duyệt. FK và indexes có trong migration. | PASS (source), additive theo scope |
| d0b4063 | 20261103023000 thêm vehicles.is_active NOT NULL DEFAULT true, route_plans.needs_reoptimization NOT NULL DEFAULT false, reoptimization_reason nullable và hai indexes. | PASS (source), có default cho bản ghi cũ |
| 41cf3b0 | 20261104081535 thêm School/Student province VARCHAR(100) nullable và ba enum values. Không thêm bảng, đổi uniqueness, xóa cột hoặc DML. | PASS (source) về minimal DDL. NEEDS_ATTENTION về sử dụng province và client enum. |

Không thể xác nhận câu “toàn bộ 3.1–3.18 chỉ thêm province” vì 3.2/3.3 có schema đã phê duyệt riêng. Cả ba migration trong phạm vi là additive qua kiểm SQL, không ghi dữ liệu nghiệp vụ. PostgreSQL 11 trở xuống có giới hạn được ghi ngay trong migration enum. Việc apply trên môi trường bàn giao, phiên bản server, drift và nâng cấp dữ liệu thực tế **NOT_VERIFIED** trong audit này. Backend sử dụng schema/client mới cần migration đúng thứ tự trước khi chạy. [Schema](../../api/prisma/schema.prisma), [migration 3.2](../../api/prisma/migrations/20261103010000_school_lifecycle_calendar/migration.sql), [migration 3.3](../../api/prisma/migrations/20261103023000_vehicle_status_and_route_plan_reoptimization/migration.sql), [migration 3.4–3.18](../../api/prisma/migrations/20261104081535_add_province_and_incident_types/migration.sql)

## 7. An toàn kiến trúc và hợp đồng FE

Backend giữ nhiều alias và field cũ, nhưng cấm field ngoài DTO bằng forbidNonWhitelisted. Copy ví dụ từ FE Guide có thể nhận 404/400 dù source API đã hoạt động. Prefix thực tế là **/api/v1**. Đối chiếu source để sửa hướng dẫn trước khi FE dùng làm contract. [main.ts:14](../../api/src/main.ts#L14), [FE Guide](../FE_INTEGRATION_GUIDE.md).

| Luồng | Guide đang mô tả | Contract thực tế cần FE dùng |
|---|---|---|
| Trip assignment | assignedDriverId/assignedVehicleId/assignedBusAttendantId | PATCH /api/v1/trips/:id/assignment hoặc alias /assignments. Body driverId, vehicleId, busAttendantId theo role, expected*Id tùy chọn. SCHEDULED frozen trả 409. IN_PROGRESS bị chặn ở check trạng thái trước và trả 400. |
| Attendance/alighting | PATCH /trips/:id/attendance, BOARDED/ALIGHTED, reason | PUT /api/v1/trips/:id/attendance/:studentId với UNMARKED/PRESENT/ABSENT, absenceReason. Alighting là PUT riêng /attendance/:studentId/alighting với isAlighted. |
| Chi tiết Trip | completedAt, routeSnapshot, driver/busAttendant/vehicle lồng | DTO đọc trả actualEndTime, stops, các trường xe/người tách riêng. routeSnapshot là dữ liệu lưu nội bộ dùng để dựng chi tiết, không dựa vào shape mô tả trong Guide. |
| Rút báo nghỉ | PATCH /leave-notices/:id/cancel | POST /api/v1/leave-notices/:id/cancel. Source vẫn giữ route này. |
| Tạo sự cố | POST /incidents với tripId, incidentType, cả enum ngoài scope | POST /api/v1/trips/:id/incidents, body type, description và trường tùy chọn. Chỉ Driver/Attendant được gán đúng role/sự cố. BREAKDOWN/ACCIDENT/MEDICAL_EMERGENCY/STUDENT_MISSING/OTHER trong Guide chưa có enum. |
| Xử lý sự cố | resolution, replacementDriverId/replacementBusAttendantId/replacementVehicleId, notes | POST /api/v1/incidents/:id/resolve với action ARRIVED/REPLACED, replacementUserId, reason, expectedStatus. Hủy là endpoint riêng; endpoint resolve chưa xử lý xe thay thế hoặc ba loại sự cố mới. |
| Đổi địa chỉ | /student-requests/... | Parent dùng /api/v1/parents/students/:id/update-requests/otp và /verify. Nhà xe dùng /api/v1/system-admin/update-requests/:requestId/routing-preview và /approve. Web hiện đã chuyển token/fingerprint từ preview, nhưng BE còn F01. |
| Hủy phương án | /routes/plans/:id, fingerprint trong response, frozenTripsCount | /api/v1/routes/route-plans/:id/cancellation-impact và /cancel. Dùng expectedFingerprint từ response, không giả định field frozenTripsCount trong Guide nếu DTO thực tế không có. |

Dẫn chứng controller/DTO. [Trips](../../api/src/trips/trips.controller.ts), [Assignment DTO](../../api/src/trips/dto/update-trip-assignment.dto.ts), [Attendance DTO](../../api/src/trips/dto/trip-operation.dto.ts), [Incidents](../../api/src/incidents/incidents.controller.ts), [Resolve DTO](../../api/src/incidents/dto/resolve-incident.dto.ts), [Leave Notices](../../api/src/leave-notices/leave-notices.controller.ts), [Student Requests](../../api/src/student-requests/system-requests.controller.ts), [Routes](../../api/src/routes/routes.controller.ts).

**Web/Mobile hiện hành.** So diff từ c14e059 tới HEAD cho thấy đợt này không thay Web/Mobile. Một số client cũ đã dùng route/payload thực, như Web gửi previewToken và expectedFingerprint, Mobile dùng absenceReason. Vì thế sai Guide chủ yếu gây lỗi cho tích hợp mới. Phần tương thích còn phải kiểm email bắt buộc khi tạo nhân sự, response credentialDeliveryStatus, enum Incident mở rộng, cờ canStart chưa nhất quán và UI chỉ có tập loại sự cố cũ. Các tham số tùy chọn có semantics thay đổi như expectedFingerprint phải được PO duyệt và ghi rõ nếu chuyển required. Swagger cần đối chiếu controller và DTO khi sửa. [Web request modal:139](../../web/src/app/admin/requests/request-detail-modal.tsx#L139), [Mobile API client:691](../../mobile/services/api-client.ts#L691), [Mobile incident types:872](../../mobile/services/api-client.ts#L872).

### Bổ sung ngày 05/11/2026 — Đối chiếu phản hồi của đội FE

Product Owner cung cấp `fe-integration-guide-api-discrepancies.md` để ghi nhận các điểm đội FE đã phát hiện. Đối chiếu tĩnh với branch `chuongtv/update-be`, HEAD `41cf3b0`. Nội dung trong tệp là bằng chứng và đề xuất của đội FE. Phạm vi lần này là review tài liệu và source, chưa có yêu cầu sửa Guide hoặc API.

| Ghi nhận FE | Kết quả đối chiếu và phân loại |
|---|---|
| Đổi phân công | Trùng audit. `PATCH /trips/:id/assignments` cùng hai alias `/:id` và `/:id/assignment` nhận `vehicleId`, `driverId`, `busAttendantId`. `expected*` là ID ở thời điểm mở form. Web trong checkout đã gửi các field này. |
| Điểm danh | Trùng audit. `GET /trips/:id/attendance` đọc roster. Ghi bằng `PUT /trips/:id/attendance/:studentId` với `UNMARKED/PRESENT/ABSENT`. Xuống xe có `PUT` riêng tại `/alighting`. |
| Tạo và xử lý sự cố | Hai mục trùng audit. Tạo tại `POST /trips/:id/incidents` bằng `type`, dành cho tài xế/phụ xe theo điều kiện service. Resolve dùng `action`, `replacementUserId`, `reason`, `expectedStatus` cho sự cố thiếu nhân sự. F10 theo dõi riêng vòng đời của ba loại sự cố mới. |
| Hủy phương án | Trùng audit về đường dẫn `route-plans` và `expectedFingerprint`. FE bổ sung xác nhận response thiếu cả `activeLeaveNoticesCount` và `frozenTripsCount`. `scheduledTripsCount` đếm chuyến chưa frozen. F04 theo dõi riêng lỗi kiểm tra rồi cập nhật khi có thao tác đồng thời. |
| Frozen Trip | FE xác nhận Guide còn thiếu `IN_PROGRESS/COMPLETED` và điểm danh `PRESENT/ABSENT`, bên cạnh `actualStartTime` và `attendantReadyAt`. Đây là mô tả của helper, hành vi từng endpoint vẫn phụ thuộc cách gọi và điều kiện riêng. |
| Dời bãi | Trong source đã đọc, hàm áp dụng lịch hẹn chỉ có lời gọi từ controller. Chưa xác minh scheduler bên ngoài. Checkout Web hiện có client đọc/ước tính tác động/cập nhật bãi, chưa thấy lời gọi `apply-scheduled-change`. Nút mà FE mô tả chưa được đối chiếu với commit Web của họ. |

Các path FE liệt kê là path tương đối. URL gửi trực tiếp tới NestJS local cần tiền tố `/api/v1`, cũng là tiền tố mặc định trong Web client của checkout. Audit còn ghi nhận sai lệch ở rút báo nghỉ, cập nhật địa chỉ học sinh và response chi tiết chuyến. [API bootstrap](../../api/src/main.ts#L14), [Web API client](../../web/src/lib/api-client.ts#L74), [Frozen policy](../../api/src/overview/operations-policy.ts#L64), [Cancellation DTO](../../api/src/routes/dto/route-plan-cancellation-impact.dto.ts), [Parking controller](../../api/src/system-settings/system-settings.controller.ts#L103).

Đối chiếu này không thay kết luận sẵn sàng bàn giao. Sửa Guide giải quyết sai khác tài liệu, còn F04, F06 và F10 vẫn được theo dõi ở backend. Chưa chạy lại test suites hoặc gọi API live trong lần đối chiếu này. Kết quả 193 tests ở mục 9 thuộc đợt audit trước.

### Nguyên nhân qua lịch sử Git và source

- Guide được thêm mới trong `41cf3b0`. So với commit cha, prefix `/api/v1`, DTO phân công, các route điểm danh, controller sự cố, DTO resolve và DTO cancellation-impact đã có trước đó. Các ví dụ lệch ở các phần này xuất hiện trong bản Guide đầu tiên, do không khớp với contract đã có. Lịch sử Git không cho biết các ví dụ được lấy từ bản thiết kế nào. Với `forbidNonWhitelisted`, gửi field minh họa như `assignedDriverId` hoặc `resolution` tới đúng API có thể bị 400. Dùng sai method/path có thể bị 404. [Guide](../FE_INTEGRATION_GUIDE.md), [API bootstrap](../../api/src/main.ts#L14).
- Cùng commit đó thêm helper frozen dùng cả trạng thái, mốc giờ và điểm danh. Guide chỉ liệt kê mốc giờ nên có thể khiến FE bật nút đổi phân công trên chuyến `SCHEDULED` đã điểm danh. API đổi phân công trả 409 cho trường hợp đó, còn trạng thái `IN_PROGRESS/COMPLETED` bị chặn bởi điều kiện `SCHEDULED` trước và trả 400. [Frozen policy](../../api/src/overview/operations-policy.ts#L64), [Trip assignment](../../api/src/trips/trips.service.ts#L851).
- Ở hủy phương án, `41cf3b0` đổi điều kiện đếm `scheduledTripsCount` sang chưa frozen nhưng giữ DTO, vốn đã có `expectedFingerprint` và không có hai bộ đếm bổ sung. Cập nhật tài liệu giải quyết việc FE đọc nhầm field. Rủi ro hủy nhầm chuyến F04 phát sinh vì truy vấn chọn theo frozen và cập nhật theo ID là hai bước, trong khi fingerprint kiểm trước transaction. [Cancellation DTO](../../api/src/routes/dto/route-plan-cancellation-impact.dto.ts), [Cancellation service](../../api/src/routes/routes.service.ts#L1778).
- Thêm ba loại sự cố mở rộng tạo báo cáo, trong khi resolve vẫn giới hạn ở thiếu nhân sự. Dời bãi giữ tọa độ hiện hành và ghi `scheduledChange`, thao tác apply là bước riêng khi đến hạn. Đặt lịch đã tác động đến chuyến/phương án, còn hủy lịch chỉ xóa `scheduledChange`. Đó là giới hạn hành vi hiện tại của API và cần phân biệt với lỗi ví dụ trong Guide. [Incident creation](../../api/src/incidents/incidents.service.ts#L273), [Incident resolution](../../api/src/incidents/incidents.service.ts#L849), [Parking scheduling and apply](../../api/src/system-settings/system-settings.service.ts#L226).

Kiểm chứng bổ sung bằng `git log`, so diff commit `41cf3b0` với commit cha và đọc source. Không có thay đổi application code trong lần phân tích nguyên nhân, không chạy test scripts hoặc gọi API.

### Kiểm chứng hoàn thành và sẵn sàng tích hợp — 06/11/2026

**Phạm vi.** Theo yêu cầu PO, kiểm lại 3.1–3.18 theo quyết định đã chốt trong Tracker/Master Plan và tách hai tiêu chí: nghiệp vụ đủ hành vi đã duyệt, FE có contract và môi trường để tích hợp. Chỉ đọc source/Git, kiểm tra kiểu và thử tải Swagger bằng GET. Phát hiện dưới đây chưa được sửa. Không thay đổi API, Web, Mobile hoặc DB.

**Mốc chính xác để tích hợp.** `git ls-remote` xác nhận remote `main` ở `6710691`, có `41cf3b0` trong lịch sử. Đọc commit remote qua SHA và `git diff --exit-code HEAD 6710691 -- api web mobile docs/FE_INTEGRATION_GUIDE.md` trả 0. Cả mã nguồn API, migration trong `api`, Web/Mobile trên main và FE Guide giống bản đã audit. Remote-tracking ref `origin/main` lưu trên máy còn ở `568e577`; local `main` ở `c14e059`. Kết luận về remote main dùng SHA đọc từ remote trực tiếp.

| Phạm vi | Đã xác nhận ở source | Điều kiện để đánh dấu hoàn thành hoặc mở tích hợp |
|---|---|---|
| **3.1–3.2** Tài khoản, trường, lịch | Có email nhân sự, lịch trường/lịch dịch vụ và API chốt chuyến. Web System Admin `0c9f4f0` đã gọi lịch dịch vụ, lịch thay đổi và chốt chuyến; các path/method đối chiếu với controller trên `6710691` khớp. | Có thể nối UI theo contract cho các luồng này. Trước nghiệm thu, kiểm OTP sai đủ số lần bị chặn, ngày hiệu lực đúng và cron đồng thời với thao tác chuyến không khóa chéo. Email bắt buộc, trạng thái giao email và hành vi logout khi inactive cần được kiểm xuyên Web/Mobile. F03/F09. |
| **3.3, 3.5–3.8, 3.15–3.16** Bãi, tối ưu, phân công, sinh và hủy chuyến | Có API chính, Web dùng đúng field phân công và đường hủy phương án. | Chưa chốt tích hợp hoàn chỉnh các thao tác ghi. Cần chứng minh bãi được áp đúng ngày, phương án cần tối ưu lại không sinh chuyến sai, đồng bộ giữ phân công riêng, hủy không chạm chuyến vừa Start, và xung đột nguồn lực bị chặn. Reopen và `firstServiceDate` chưa thấy triển khai. F02/F04/F05/F06/F07/F12. |
| **3.4, 3.14** Học sinh, Parent link, cập nhật địa chỉ | Giữ liên kết khi đổi số giám hộ. Web đã gửi `previewToken`/`expectedFingerprint`. | Chưa có thao tác thu hồi liên kết sai theo D34-01. Chặn nghiệm thu duyệt địa chỉ `REOPTIMIZED` cho tới khi token của yêu cầu khác, token quá hạn và preview cũ đều bị từ chối. F01/F12. |
| **3.9–3.13** Vận hành, theo dõi, báo nghỉ | Mobile trên main đã có đúng field `absenceReason` và API xuống xe. Home giữ chuyến `IN_PROGRESS` sau giờ dự kiến. | Có thể nối các màn hiện hữu theo DTO thực tế. Chưa nghiệm thu ca chiều về toàn vắng, sửa điểm danh sau khi đến trường, rút nghỉ khi điểm danh thay đổi, thay người bận và response bản đồ Parent còn tọa độ điểm đón khác. F04/F05/F08/F11. |
| **3.17–3.18** Sự cố, Tổng quan | Có thêm loại sự cố để ghi nhận. Đọc thông báo độc lập với số nhiệm vụ. | Tích hợp đọc theo dữ liệu được phép. Chưa nối thao tác xử lý ba loại sự cố mới như một luồng khép kín, hoặc hiển thị bộ đếm chốt hành chính/tối ưu lại như dữ liệu BE đã có. F10/F12. |

**Nhánh FE.** Remote Web System Admin `0c9f4f0` và Web School Admin `83b4c6d` chưa chứa `41cf3b0`, cây `api` kèm các nhánh này khác remote main. Remote Mobile `f075db4` và `9d4f52e` có `41cf3b0`, cây `api` trùng `6710691`. Chỉ đối chiếu commit và một số caller/contract tiêu biểu. Chưa chạy Web/Mobile của các nhánh này. Khi Web chạy API từ cùng checkout, phải kiểm đúng SHA backend trước khi quy lỗi 404/field thiếu cho FE. Với API local từ main, đường dẫn đầy đủ bắt đầu bằng `http://localhost:3000/api/v1`. FE Guide còn các sai lệch ở mục 7.

**Kết quả kiểm chứng.** `npx --no-install tsc --noEmit` tại `api` **PASS** ngày 06/11. 193/193 unit tests là bằng chứng ngày 05/11 trên cùng cây API; đợt này không chạy lại test scripts. GET `/api/docs` và `/api/docs-json` trên local port 3000 hết thời gian chờ, nên Swagger live và phiên bản API đang chạy **NOT_VERIFIED**. Migration hiện có trong Git, trạng thái áp dụng trên DB local/FE **NOT_VERIFIED**. Các tình huống cần ghi dữ liệu, gọi mutation hoặc xác minh cạnh tranh DB vẫn **BLOCKED_BY_TEST_DATA_POLICY** khi chưa có bộ dữ liệu và phạm vi được PO cấp.

**Kết luận.** Source đã merge nhưng chưa đủ tiêu chí nghiệm thu toàn bộ. FE có thể tích hợp từng contract đã xác nhận. Bước tiếp theo là chốt một đợt xử lý các điều kiện chặn bàn giao trong bảng, với tiêu chí nghiệm thu trên cùng mốc API dành cho Web/Mobile. Báo cáo đang chờ PO xem xét.

### Danh mục đối chiếu quyết định, API và tài liệu — 06/11/2026

PO yêu cầu liệt kê toàn bộ sai lệch tìm thấy để bám các quyết định cải thiện, thống nhất tài liệu và API. Phạm vi 3.1–3.18, source `41cf3b0` (cùng cây API với remote main `6710691` đã xác minh ở trên). Lấy quyết định PO mới nhất và cột **CHỐT** làm yêu cầu. Các phương án chưa chọn, mô tả baseline và chữ IMPLEMENTED không thay thế yêu cầu. FE Guide mô tả contract dùng được ở mốc hiện hành. Khi contract hiện hành thiếu yêu cầu đã duyệt, giữ việc sửa API trong danh mục và ghi rõ giới hạn hiện hành cho FE.

#### A. API lệch quyết định hoặc thiếu phần thực thi

| Mục và quyết định | API hiện tại và phần còn thiếu | Điều kiện nghiệm thu |
|---|---|---|
| **3.1 AUTH-01/02 và các luồng OTP** | Có eSMS mẫu thử/console, email bàn giao, resend giữ phiên. OTP liên kết, yêu cầu sửa học sinh và báo nghỉ có đường ghi tăng số lần sai rồi throw trong transaction nên rollback; kiểm consumed và cập nhật chưa nguyên tử. Một số luồng tiêu thụ mã trước khi hoàn tất mutation. Đây là lỗi toàn vẹn ở luồng OTP hiện có, không phải thay đổi yêu cầu format eSMS. F09. | Số lần sai được lưu, mã không dùng hai lần, kết quả consume/retry rõ khi nghiệp vụ thất bại. Gửi nhận eSMS/SMTP thật là kiểm chứng riêng. |
| **3.2 P1–P6 / D8** | Có effective state, đối soát, lịch và chốt hành chính. Thao tác Trip khóa Trip rồi School; reconcile/chốt khóa School trước Trip. Cạnh tranh có thể làm một transaction bị hủy. F03. | Đổi lịch/ngừng trường/hết hạn và thao tác Ready/Start đồng thời có thứ tự khóa nhất quán. Giữ phân loại ngoại lệ và lịch sử theo ma trận 3.2. |
| **3.3 WF-03 / G-02 / G-04** | Inactive xe/nhân sự có bàn giao và lọc IN_PROGRESS, nhưng các Trip SCHEDULED mục tiêu có thể đã Ready/điểm danh. Kiểm trước giao dịch không bảo đảm trạng thái lúc ghi. Đặt lịch dời bãi đã hủy Trip tương lai và đánh dấu plan; hủy hẹn chỉ xóa lịch; apply tới hạn chỉ thấy controller gọi; generator/readiness chưa chặn nhất quán theo needsReoptimization. F05/F06. | Bàn giao tôn trọng frozen/luồng ngoại lệ đã duyệt và atomic. Bãi, tuyến, lịch và cờ tối ưu thống nhất tại mốc hiệu lực, bao gồm hủy hẹn và Trip đã CANCELLED. Scheduler ngoài repo chưa xác minh. |
| **3.4 D34-01** | Đổi số giám hộ giữ link và có Parent tự unlink. Thiếu thao tác SCHOOL_ADMIN thu hồi liên kết sai sau xác minh, có lý do/audit. F12. | Thu hồi đúng link trong trường của admin, lưu người/lý do, không thu hồi hàng loạt khi đổi số. |
| **3.5 WF-05 / Tracker Gói 4** | D35-01/02 có tối ưu một phần và danh sách chưa xếp; khảo sát thực địa ngoài app. Tracker ghi lọc bán kính 50 km và tỉnh thành đã triển khai: filter hiện ở preparation; optimize/confirm chưa áp cùng policy, province nullable chưa nối luồng ghi đã rà. F07. | Nếu 50 km/tỉnh là ràng buộc bắt buộc, gọi trực tiếp optimize/confirm vẫn không vượt được. Chốt cách đo và quy tắc thiếu province trước khi bổ sung validation. |
| **3.6 D36-02 / G-01/02/04** | Đã đồng bộ ngay khi đổi mặc định. Helper chọn SCHEDULED chưa frozen nhưng thiếu mốc ngày, ghi sau khi chọn, sao chép cả xe/tài xế/phụ xe và không recheck khả dụng từng Trip. Có thể ghi đè phân công đã điều phối riêng. F02/F05. | Đổi đúng nguồn lực và đúng phạm vi từ hôm nay, cập nhật khi commit, không ghi vào Trip vừa frozen. Chốt ưu tiên override riêng nếu contract còn thiếu. |
| **3.7 D37-01/02** | Thiếu reopen CANCELLED → SCHEDULED và `firstServiceDate`. Route–ngày unique nên generate lại không thay thế được Trip đã hủy. F12. | SYSTEM_ADMIN mở lại trước giờ chạy, kiểm nguồn lực/plan/hợp đồng, reset roster theo quyết định, bảo lưu nghỉ đã duyệt, lý do/audit và thông báo. Trả ngày đầu thực sự đủ lịch phục vụ sau activation. |
| **3.8 D38-01/02** | Đổi phân công thường đã chặn frozen; Start có check tài xế/xe đang IN_PROGRESS. Check trên Trip riêng còn khoảng trống khi Start đồng thời ở hai trường. Gán xe Trip thiếu kiểm active và dựa vào RouteStop thay vì roster thật. Thiếu cảnh báo `LATE_RUNNING_TRIP_RISK`; điều phối sự cố hiện chưa có nhánh thay xe khẩn cấp. F05/F10. | Không hai Start cùng nguồn lực; gán theo roster và nguồn lực hợp lệ. Có cảnh báo nguy cơ trễ và có contract điều phối khẩn cấp đúng quyền. Buffer cụ thể cần chốt. |
| **3.9 D39-02** | ABSENT có lý do, chiều đi có thể hoàn tác trước arrival. Chuyển ABSENT → PRESENT dùng chung nhánh BOARDING, kể cả sau arrival; chưa có correction riêng với lý do/audit và thông báo đính chính phù hợp. F08. | Trước arrival chỉnh sửa phát đính chính đúng ý nghĩa; sau arrival khóa UNMARKED, sửa sai có lý do/audit và không tạo sự kiện đón mới. |
| **3.10 D310-01/02** | Start chiều về chặn 0 PRESENT nhưng operational state vẫn có thể bật Start. Thiếu thao tác phụ xe hủy toàn vắng. NO_GUARDIAN_AT_STOP chưa ràng buộc chặt học sinh thuộc roster, chiều về và chưa xuống; chưa có đường xử lý khép kín. F08/F10. | API và cờ thao tác nhất quán. Phụ xe hủy được đúng ca toàn vắng, admin có đường dự phòng theo quyết định. Báo không người đón gắn đúng trẻ và giữ thông tin trẻ còn trên xe cho điều phối. |
| **3.11 D311-02** | D311-01/B-01 đạt trên source. Parent map ẩn tên/địa chỉ nhưng vẫn nhận tọa độ điểm đón trẻ khác và điểm bãi. F11. | Response Parent chỉ có vị trí xe, điểm của con và trường theo quyết định, vẫn theo dõi suốt IN_PROGRESS. |
| **3.12 D312-02 / G-02** | D312-01 chỉ người tạo được rút đã có. Options/xin OTP/xác nhận còn cho Parent báo nghỉ ở một số chuyến chiều đi đã Ready. Rút đơn có thể phục hồi snapshot cũ đè lên điểm danh mới. F04. | Cùng cutoff ở cả ba bước, không báo muộn sau Ready/Start. Khi rút không xóa kết quả điểm danh thực tế đã thay đổi. |
| **3.13 D313-02 / G-03** | REPLACED không tự rút được và nghỉ dài ngày đi qua đổi mặc định đúng hướng. Luồng đổi mặc định kế thừa lỗi sync 3.6; helper thay người có thể bỏ sót LeaveNotice/sự cố giao nhau vì chỉ kiểm bản ghi đầu. F02/F05. | Bàn giao chỉ trong phạm vi hợp lệ, không gán người đã bận/nghỉ và vẫn giữ rule thông báo không cần nhận việc. |
| **3.14 D314-01/02 / G-01/02/04** | Token bắt buộc ở REOPTIMIZED nhưng fingerprint tùy chọn, không kiểm tuổi 10 phút hoặc bind đúng request/phiên bản. Token A có thể áp geometry khi duyệt B. Hai quyết định đồng thời chưa được ràng buộc theo trạng thái PENDING tại điểm ghi. Sync thiếu giờ tuyệt đối và recheck frozen. REMOVED_FROM_ROUTES cũng có khoảng trống frozen. F01/F02/F04. | Preview đúng request, khả thi, trong TTL, fingerprint bắt buộc và hiện hành khi ghi. Không có thay đổi nửa chừng. Đồng bộ snapshot, roster và giờ từng ngày cho chuyến đủ điều kiện. |
| **3.15 D315-01/02 / G-01/02** | Chèn trẻ gọi sync hai chiều nhưng có thể đổi cả phân công, thiếu mốc ngày, giờ tuyệt đối và điều kiện frozen khi ghi. Disable có excludedAt/exclusionReason, nhưng lọc Ready/Start mà chưa lọc đầy đủ điểm danh. F02/F04. | Hai chiều đúng roster/giờ, giữ phân công riêng và Trip frozen. Disable chỉ loại trên Trip đủ điều kiện; bật lại không tự đưa vào tuyến cũ. |
| **3.16 D316-01/02 / G-02/04** | Fingerprint hủy plan vẫn tùy chọn, kiểm ngoài transaction và dựa trên tổng số; chọn unfrozen rồi update theo ID. Có thể hủy chuyến vừa Start. Chưa chứng minh giữ tài nguyên đến khi Trip frozen cuối kết thúc. Có thể có các plan khác nhóm, thiếu workflow thay plan cùng nhóm và chuyển lịch từ ngày mai. F04/F12. | Thay đổi tác động sau preview trả 409, Trip frozen và hold tài nguyên được giữ. Plan cùng nhóm thay thế đúng mốc, plan nhóm độc lập không bị ảnh hưởng. |
| **3.17 D317-01/02** | REPLACED gọi helper nhưng kiểm khả dụng chưa bao quát. Có ba loại mới; tọa độ optional, có thể null. Loại mới vào WAITING_ASSIGNMENT nhưng thiếu thao tác xử lý tương ứng và notification còn dùng logic thiếu nhân sự. OFF_ROUTE dùng >=50m so với >50m; detector còn yêu cầu đủ mẫu. Chưa thấy cơ chế tự phát hiện GPS im lặng quá ba phút. F05/F10. | Recheck đủ nguồn lực, ghi tọa độ thực tế, loại/scope thông báo đúng. Đối chiếu ngưỡng đã duyệt và chốt riêng cách phát hiện mất tín hiệu, trạng thái kết thúc của từng loại và trường hợp không thể lấy tọa độ. |
| **3.18 D318-01** | D318-02/G-03 đã tách readAt khỏi nhiệm vụ. Thiếu `ADMIN_FINALIZATION` và `REOPTIMIZATION` trong tasks. F12. | Trả count/link đúng phạm vi từ trạng thái nghiệp vụ, giữ task keys hiện hữu. |

Đối chiếu quyết định tại [Tracker](../BUSINESS_IMPROVEMENT_TRACKER.md), [Master Plan](business-improvement-master-plan-3.4-3.18.md), [Auth plan](auth-api-improvement-plan.md) và [School plan](school-api-improvement-plan.md). Bằng chứng source theo F01–F12 ở mục 5. G-01/G-02/G-04 là các điều kiện xuyên luồng, không cộng như lỗi độc lập với các dòng đã dẫn.

#### B. FE Guide và tài liệu trạng thái cần đồng bộ

| Tài liệu đang lệch | Cần ghi đúng theo contract hiện hành |
|---|---|
| Base URL và đường dẫn | API business dùng `/api/v1`; Swagger UI riêng `/api/docs`. Ghi rõ đường dẫn tương đối khi ví dụ đã có base URL. |
| GET chi tiết chuyến | Dùng `actualEndTime`, `stops` và field xe/nhân sự tách riêng. Không lấy `completedAt`, `routeSnapshot` hay đối tượng driver/vehicle lồng làm contract của GET này. |
| Đổi phân công, Frozen và mã lỗi | `PATCH /trips/:id/assignments` (có alias); body `vehicleId/driverId/busAttendantId`, `expected*Id` là giá trị cũ. Frozen còn xét điểm danh và status. SCHEDULED frozen trả 409, status khác SCHEDULED bị chặn trước và trả 400. Đừng hứa kiểm đơn trường/khả dụng đồng nhất mọi entry point khi API còn phần A. |
| Điểm danh, xuống xe, nút Start | `GET /trips/:id/attendance` để đọc; `PUT /trips/:id/attendance/:studentId` dùng `UNMARKED/PRESENT/ABSENT` và `absenceReason`. `PUT .../alighting` dùng `isAlighted`. Tách cutoff chiều đi trước arrival và chiều về sau Start. Ghi rõ phụ xe chưa có endpoint hủy toàn vắng. |
| Rút báo nghỉ | `POST /leave-notices/:id/cancel`, chỉ người tạo và trong điều kiện được rút. |
| Báo sự cố | `POST /trips/:id/incidents`, body `type`, quyền DRIVER/BUS_ATTENDANT theo service. Bỏ ví dụ enum chưa có như BREAKDOWN/ACCIDENT/MEDICAL_EMERGENCY/STUDENT_MISSING/OTHER. |
| Xử lý sự cố | `POST /incidents/:id/resolve` dùng `action` ARRIVED/REPLACED, `replacementUserId`, `reason`, `expectedStatus`; giới hạn loại sự cố và role. Hủy qua route riêng `/incidents/:id/cancel-trip`. Không mô tả endpoint resolve hiện tại có đổi xe hoặc xử lý ba loại mới. |
| Yêu cầu đổi địa chỉ | Parent `POST /parents/students/:id/update-requests/otp` và `/verify`; nhà xe `POST /system-admin/update-requests/:requestId/routing-preview` và `/approve`. Guide ghi fingerprint bắt buộc, API đang optional. Ghi hai trạng thái riêng: yêu cầu đã duyệt và hành vi hiện tại. |
| Hủy phương án | `GET /routes/route-plans/:id/cancellation-impact` và `POST /routes/route-plans/:id/cancel`. Response `expectedFingerprint`, không có `frozenTripsCount/activeLeaveNoticesCount`; `scheduledTripsCount` là nhóm SCHEDULED chưa frozen tại thời điểm xem. Ghi rõ khoảng trống bắt buộc fingerprint và đồng thời ở phần A. |
| Handoff, Tracker và Master Plan | Các đoạn “triển khai hoàn tất”/IMPLEMENTED cần ghi rõ đã có code nhưng còn hạng mục thiếu và chưa nghiệm thu. Giữ baseline/lịch sử có nhãn. Tracker B-05 là lịch trường, checklist audit cũ dùng B-05 cho điểm danh. Khi tracking dùng ID quyết định và tên luồng để tránh đóng nhầm việc. |

#### C. Điểm cần PO làm rõ trước khi thay đổi contract

- Tách thời điểm ghi với ngày dịch vụ. G-01 nêu đồng bộ Trip ngày mai ngay khi duyệt; D36-02 nói từ hôm nay; D314-02/D315-01 nói đồng bộ ngay toàn bộ SCHEDULED chưa frozen. Cần chốt có chạm Trip hôm nay của đổi địa chỉ/chèn trẻ hay chỉ từ ngày mai, trong mọi trường hợp không lấy Trip quá khứ.
- Với các quyết định đã chốt như fingerprint bắt buộc, reopen và firstServiceDate, cần chốt chi tiết hợp đồng còn thiếu trước khi triển khai: lỗi khi thiếu field, cách chuyển tiếp client cũ, field/audit được phép lưu và vị trí/nullable của metadata. Đổi từ optional sang bắt buộc có tác động lên client cũ.
- Giữ ngoài phạm vi phần đã loại: chuyển trường, quy trình duyệt thực địa hoặc thời lượng riêng từng trẻ, OTP/QR nhận trẻ, báo nghỉ hàng loạt, module nghỉ dài ngày riêng và claim/SLA thông báo. Không đếm các mục đó là thiếu code.

**Kiểm chứng của lần này.** Chỉ đối chiếu source và docs, kiểm `git diff --check`. Không có thay đổi application code hay DB, không chạy test script hoặc gọi mutation. Các tình huống cạnh tranh là đường dẫn suy ra từ source. Kết quả typecheck và 193 unit tests ở các đợt trước được giữ làm bằng chứng lịch sử, chưa chứng minh runtime của từng tiêu chí. **Bước tiếp theo duy nhất:** chốt danh mục này làm checklist sửa API và cập nhật Guide cùng lần với từng thay đổi đã nghiệm thu. Trạng thái chờ PO xem xét.

### Kế hoạch khớp quyết định nghiệp vụ, API và tài liệu — 06/11/2026

Trạng thái **WAITING_APPROVAL**. PO yêu cầu lên plan chi tiết trong chat từ danh mục 3.1–3.18. Phạm vi dự kiến API và tài liệu. Mốc đối chiếu 41cf3b0, remote main 6710691 đã đối chiếu ở trên. Chưa triển khai API, Swagger, DB, UI hoặc thay đổi cấu hình. Giữ tên, kiểu và ý nghĩa field hiện hữu khi có thể. Nghiệp vụ mới ưu tiên endpoint riêng. Các mục tên field, enum, audit hoặc lỗi chưa rõ cần PO chốt trước khi code.

| Gói và phụ thuộc | Công việc và file dự kiến | Điều kiện nghiệm thu |
|---|---|---|
| **P0 · Contract hiện hành, độc lập** | Sửa `docs/FE_INTEGRATION_GUIDE.md` theo phần B, ghi rõ giới hạn backend. Duy trì từng dòng truy vết quyết định → endpoint → tiêu chí trong Tracker/Master Plan. Mỗi gói sau đồng bộ controller, DTO, Swagger và ví dụ FE trong cùng thay đổi. | Guide chỉ ra base URL và mốc API, method, role, field, mã lỗi và luồng chưa sẵn sàng. Không thay nghĩa quyết định trong Master Plan để khớp API thiếu. |
| **P1 · Nền vận hành, 3.2/3.3/3.6/3.8/3.12–3.17** | Chuẩn hóa thứ tự School/Trip giữa `trips.service.ts`, `contract-lifecycle.service.ts`, `trip-finalization.service.ts` và các writer cùng dữ liệu. Khóa nguồn lực dùng chung khi Start/điều phối có thể tranh chấp giữa trường, có thứ tự cố định và đọc lại sau khóa. Tái dùng `operations-policy.ts`, `staff-availability.helper.ts`, `resource-availability.service.ts`. Kiểm đủ đơn nghỉ/sự cố, trạng thái xe/người, đơn trường, roster thực và hold. Sửa `trip-sync.helper.ts` theo loại mutation, ngày dịch vụ, giờ tuyệt đối và snapshot. Giữ ma trận lifecycle 3.2 và ngoại lệ điều phối được duyệt. | Start song song chỉ một chuyến lấy được nguồn lực. Ready/điểm danh thắng thì mutation thường lệ không ghi vào Trip. Lịch học bù và giờ vận hành khớp snapshot, phân công riêng không bị đổi ngoài phạm vi. Có case đối soát/chốt đồng thời. |
| **P2 · OTP và tracking Parent, độc lập P1** | `otp.service.ts`, caller Parent/student request/leave: lưu lần sai qua transaction trước khi trả lỗi, consume có điều kiện, gắn kết quả với mutation và retry. Giữ eSMS/email/session contract 3.1. `trips.service.ts`: lọc dữ liệu Parent ở payload bản đồ liên quan, kiểm cả stops và dữ liệu tuyến có thể làm lộ điểm khác. | Lần sai cuối làm mã không dùng được, hai confirm chỉ một thành công, retry sau lỗi theo quy tắc đã chốt. Parent chỉ thấy xe, điểm con và trường trong cả IN_PROGRESS. |
| **P3 · Duyệt địa chỉ, chèn/ngừng trẻ, hủy phương án, sau P1** | `student-requests.service.ts`, `students.service.ts`, `routes.service.ts`, DTO liên quan. Preview REOPTIMIZED phải đúng request/trẻ/tọa độ/phiên bản tuyến, khả thi và còn TTL 10 phút. So fingerprint nguồn ngay trong transaction và chốt request một lần. Cancellation lấy fingerprint từ impact, kiểm tập Trip/trạng thái liên quan rồi cập nhật dưới khóa. Giữ hold tới khi Trip cuối kết thúc. Apply shared sync vào chèn và disable, giữ lịch sử. | Token A dùng cho B, stale/expired, đổi danh sách Trip mà giữ số lượng, cancel chạy song song Start đều được xử lý đúng. Không commit nửa chừng. Ranh giới hôm nay/ngày mai và rollout fingerprint cần PO chốt. |
| **P4 · Bãi, sinh chuyến, phương án mới, sau P1/P3** | `system-settings.service.ts`, `routes.service.ts`, `resource-availability.service.ts`, generator và lịch trường. Đánh giá bãi theo ngày phục vụ, apply idempotent và đối soát bù, gate generate/readiness theo hiệu lực. Đồng nhất filter 50 km/tỉnh khi đã chốt quy tắc. Bổ sung reopen qua endpoint riêng, `firstServiceDate` theo calendar, thay plan cùng nhóm từ ngày mai với thao tác riêng nếu cần. | Bãi cũ đúng trước mốc, bãi mới đúng từ mốc, hủy hẹn theo chính sách đã duyệt. Reopen đúng quyền, cutoff, roster/leave/audit, một Route–ngày một Trip. Plan cùng nhóm được thay đúng ngày; plan nhóm độc lập giữ nguyên. |
| **P5 · Vận hành và sự cố, sau P1** | `trips.service.ts`, attendance DTO/controller, `leave-notices.service.ts`, `incidents.service.ts`, detector và notification. Tách correction khỏi Boarding; endpoint riêng cho phụ xe hủy toàn vắng. Đồng nhất options/OTP/confirm và rút nghỉ. Ba loại sự cố mới có actor, trường, tọa độ, liên kết học sinh khi cần, chuyển trạng thái, thông báo đúng. Áp ngưỡng đã chốt và bổ sung luồng nguy cơ trễ/mất GPS theo cơ chế được duyệt. | Không phát Boarding khi đính chính, Start toàn vắng bị khóa ở cờ lẫn API, rút nghỉ không mất điểm danh thực, không người đón gắn đúng trẻ còn trên xe. Sự cố đi được tới trạng thái cuối theo đúng scope. |
| **P6 · Link Parent và Dashboard, song song hoặc sau nền tương ứng** | Thao tác riêng cho SCHOOL_ADMIN thu hồi link sai đã xác minh, có lý do/audit. `overview.service.ts` và DTO thêm hai kind đã duyệt, dùng điều kiện nghiệp vụ từ chốt hành chính và tối ưu lại, giữ task keys cũ. | Link khác và lịch sử được giữ. Count/link cùng scope với list, read-all không giảm tasks, client cũ được kiểm với kind mới. |

**Các quyết định cần chốt trước phần phụ thuộc.** (1) Đổi địa chỉ/chèn trẻ đồng bộ hôm nay hay từ ngày mai, ưu tiên phân công riêng khi đổi default. (2) Cách chuyển tiếp cho client thiếu fingerprint khi hủy plan hoặc duyệt REOPTIMIZED, bao gồm lỗi khi thiếu và phiên bản áp dụng. (3) Tác động dời bãi tại mốc hiệu lực, xử lý lịch hẹn bị hủy và Trip đã CANCELLED. (4) Route, shape, quyền, field/audit và enum còn thiếu cho reopen, correction, thu hồi link, hủy toàn vắng, điều phối/đóng sự cố và thay plan. (5) Quy tắc bán kính/tỉnh khi thiếu dữ liệu, buffer nguy cơ trễ, nơi lấy tọa độ khi mất GPS và fallback. Các quyết định nghiệp vụ đã chốt được giữ nguyên, phần này chỉ chốt chi tiết còn bỏ ngỏ.

**Cổng bàn giao từng gói.** Truy vết ID → source → Swagger → ví dụ FE → bằng chứng. TSC và kiểm diff; sau khi được cấp phạm vi, kiểm Swagger live và case nghiệp vụ bằng dữ liệu PO cấp, gồm request FE cũ, role sai, stale/retry và đồng thời. Với API có migration, chỉ tạo/apply sau phê duyệt tương ứng và xác nhận cùng mốc triển khai. Không chạy test script trong đợt lập plan. Giữ NOT_VERIFIED/BLOCKED_BY_TEST_DATA_POLICY cho case chưa đủ bằng chứng. Files đã sửa lần này chỉ có LATEST.md. Bước tiếp theo duy nhất là PO duyệt thứ tự và các điểm chặn contract của đợt đầu.

**Kiểm tra lúc lập plan:** `git diff --check` và `npx --no-install tsc --noEmit` tại API đều trả exit 0. Các tiêu chí trong bảng là việc cần nghiệm thu khi triển khai.

### Bộ nghiệp vụ đích đầy đủ trước triển khai — 06/11/2026

PO yêu cầu bộ nghiệp vụ đầy đủ trong chat trước triển khai plan. Đã tổng hợp vào mục Y của [Master Plan](business-improvement-master-plan-3.4-3.18.md), gồm mô hình/vai trò/quan hệ, quy tắc chung, 18 nhóm cải thiện, lịch nghỉ/học bù, lifecycle ngoại lệ, thông báo và điều kiện bàn giao. Bao gồm cả nghiệp vụ nền phải giữ và phần sửa để đạt quyết định. Đây là đặc tả mục tiêu, chưa phải xác nhận code đã đạt hoặc phê duyệt các field/contract/schema chưa chốt.

Đọc lại các đoạn chi tiết 04/11 cho thấy kế hoạch trước còn thiếu: cấu hình `maxOperatingRadiusKm` và Haversine, reverse geocoding lấy province, cấm trùng nhân sự giữa nhóm tuyến, hủy notice/request đang chờ khi disable, thông báo trễ tới Parent các điểm kế tiếp và `addressText` trong context sự cố. Bản Y đưa các yêu cầu này vào phạm vi. Chỉnh rõ trước arrival ABSENT → PRESENT có thể là Boarding thật, sau arrival mới bắt buộc correction không phát Boarding mới. Không khẳng định workflow chuyển trẻ/đổi xe giữa đường đã có quyết định chi tiết.

Các điểm Q01–Q14 được ghi thành vấn đề cần PO chốt với tác động: ranh giới ngày đồng bộ, ưu tiên Trip override, inactive khi frozen, dời bãi/hủy hẹn, default/ngoại lệ bán kính/province, reopen dấu vận hành, correction, toàn vắng/không người nhận, lifecycle sự cố/GPS/buffer trễ, thay plan, pending notice khi disable, chuyển tiếp contract, firstServiceDate, sức chứa. Giữ các quyết định đã chốt, không tự lựa chọn phần bỏ ngỏ.

Files thay đổi trong lần này: Master Plan mục Y và LATEST.md. Không có application code changes, API/Swagger/DB/UI changes. Verification chỉ đọc tài liệu/source và `git diff --check`; không test script hoặc kiểm chứng runtime. Bộ nghiệp vụ đích chờ PO review, các tiêu chí vận hành vẫn NOT_VERIFIED. Bước tiếp theo duy nhất là PO chốt Q01–Q14 trong cùng bản nghiệp vụ trước khi triển khai phần phụ thuộc.

### Bổ sung 3.1 — Nhân sự bắt buộc có số điện thoại — 06/11/2026

PO yêu cầu nhân sự bắt buộc có thêm số điện thoại. Đã ghi BUSINESS_APPROVED cho tạo DRIVER/SCHOOL_ADMIN/BUS_ATTENDANT cần cả email và phone. Cập nhật Master Plan Y3, Auth API plan mục yêu cầu/input/luồng tạo và Tracker WF-01. Bàn giao mật khẩu vẫn chỉ qua email theo quyết định trước.

Đối chiếu DTO tạo tài xế và CreateSchoolAdminDto dùng cho nhân sự trường hiện vẫn phone optional. Khi triển khai cần validate phone required trước ghi, cập nhật Swagger và FE form gửi cả hai field, giữ quy tắc trùng định danh hiện hành. Phần xử lý tài khoản cũ thiếu phone chưa có quyết định bổ sung, cần chốt trước khi giới hạn đăng nhập/cấp lại hoặc yêu cầu bổ sung.

Task chỉ cập nhật yêu cầu và tài liệu. No application code changes. API/Swagger/DB/UI chưa thay đổi. Chỉ kiểm source/docs và git diff --check, không chạy test scripts. Bước tiếp theo duy nhất là tiếp tục chốt bộ nghiệp vụ đích trước implementation.

## 8. UI/UX và tình huống biên

- **Quá mốc giờ và qua ngày.** Home giữ IN_PROGRESS là đúng. Dashboard/operational state cần phân biệt đang chạy, chờ chốt hành chính và COMPLETED hành chính, nhất là khi học sinh chưa xuống hoặc GPS cũ.
- **Nhiều thay đổi cùng lúc.** Kiểm Ready/Start chạy song song với sync roster, hủy phương án và vô hiệu hóa xe/nhân sự. Kiểm hai admin approve cùng request hoặc dùng preview đã đổi tuyến. Mock unit tests không mô phỏng các khóa PostgreSQL này.
- **Ngày bãi đổi có lịch đã sinh và lịch chưa sinh.** Cần giữ đúng bãi cũ tới mốc, áp đúng bãi mới, kiểm cờ plan, kiểm hủy lịch hẹn và Trip unique đã CANCELLED. Chiều về đã điểm danh dù SCHEDULED phải được bảo toàn theo policy phù hợp.
- **Leave và điểm danh.** Một notice có thể tạo ABSENT trước khi Ready. Cần xác định rõ phần roster frozen và snapshot có thể phục hồi khi Parent rút, nhất là khi giáo viên vừa điểm danh hoặc hai người cùng thao tác.
- **Sự cố không có người đón.** FE cần biết đối tượng roster, trạng thái đang giám sát và đường chuyển tiếp. Ghi GPS last-known khi mất tín hiệu cần phân biệt với tọa độ đo tại sự kiện. Không lấy GPS/Complete làm chứng minh bàn giao.
- **Trường hợp thiếu dữ liệu province và GPS.** Null là dữ liệu hợp lệ của hồ sơ cũ. Màn hình cần thông báo đúng ý nghĩa của lọc thiếu dữ liệu hoặc cảnh báo chưa có bằng chứng vị trí.
- **Phạm vi quyền và tác vụ.** Phụ huynh nhiều con, người được thay, trường inactive, notification link hết khả dụng và read-all phải được đối chiếu riêng. Hạn chế việc “thông báo đã đọc” khiến người dùng tưởng đã resolve.

UI/UX chỉ đối chiếu code và contract. Runtime Web/Mobile **NOT_VERIFIED**. Đợt này không sửa UI.

## 9. Kiểm chứng kỹ thuật đã chạy

| Lệnh tại api | Kết quả |
|---|---|
| `npx --no-install tsc --noEmit` | **PASS**, exit 0, không lỗi TypeScript. |
| `npx --no-install vitest run src/routes/ src/trips/ src/incidents/ src/leave-notices/ src/student-requests/ src/overview/` | **PASS**, exit 0, **11 files, 193/193 tests**. Vite báo plugin tsconfig paths đã có hỗ trợ tương đương, không chặn chạy. |

Đã kiểm phạm vi config Vitest và các suites được chọn chạy với doubles/mocks trong bộ nhớ. Không chạy seed, integration/e2e, DB/API mutation hay provider thật. Typecheck và unit suite xác nhận compile và case đã có. Ví dụ test B-02 xác nhận thiếu token trả 409, chưa chứng minh token thuộc request khác, TTL hoặc dữ liệu tuyến stale bị chặn. Test khóa một Trip không chứng minh thứ tự School/Trip an toàn. Đọc SQL/schema và đối chiếu route/DTO là kiểm tra tĩnh.

**NOT_VERIFIED** cho migration apply, Swagger live, nhà cung cấp OTP/push, UI thực, và cạnh tranh PostgreSQL. Ca cần dữ liệu/ghi nghiệp vụ thực được đánh dấu **BLOCKED_BY_TEST_DATA_POLICY** đến khi PO cấp điều kiện riêng.

## 10. Tác động khi bàn giao

Ba nhóm cần ưu tiên là duyệt preview sai phạm vi, các race trên chuyến frozen/nguồn lực, và nhánh lifecycle bãi hoặc toàn vắng thiếu bước hoàn tất. Có thể chia luồng tích hợp theo contract ổn định, nhưng cả bộ 3.1–3.18 chưa đạt điều kiện bàn giao như một đợt hoàn tất. FE Guide hiện không đủ chính xác để dùng làm đặc tả. Tổng số unit tests đạt không phủ các tình huống P1 nêu trên.

## 11. Trọng tâm reviewer

Đọc F01, F02, F03 và F04 theo các đường ghi cạnh tranh. Xác minh rule G-02 ở từng entry point, kiểm scope/TTL/phiên bản preview và danh tính resource trước commit. Đối chiếu DTO với ví dụ FE, phân biệt các quyết định Master Plan đã chốt và các chức năng mới chỉ được báo cáo là đã làm. Lưu ý các mục P1 là phát hiện tĩnh có đường dẫn cụ thể, chưa tái hiện trên DB.

## 12. Kết luận và bước tiếp theo

**Chưa sẵn sàng bàn giao toàn bộ cho FE.** Bước tiếp theo là mở một đợt sửa các mục P1 và cập nhật contract/Swagger/FE Guide theo controller thực, rồi review lại cùng phạm vi trước khi tích hợp.

## 13. Trạng thái và bàn giao báo cáo

WAITING FOR USER REVIEW / APPROVAL đối với đợt sửa. No application code changes. Báo cáo trước đã lưu trong history. LATEST.diff chỉ ghi phạm vi review tài liệu.
