# RoadToSchool — API integration, cập nhật 07/11/2026

Tài liệu mô tả API hiện hành của đợt đồng bộ 3.1–3.18. Các bug API đang hoãn xử lý được ghi ở mục 13, kèm ảnh hưởng tới FE. Workflow thay phương án cùng nhóm học sinh chờ chốt riêng. Nghiệm thu runtime/provider/FE còn mở.

PO chốt ngày 07/11/2026 cập nhật tài liệu theo source hiện tại và triển khai các bug còn lại sau. Hướng dẫn này là đầu mối tích hợp FE, phần kế hoạch và nhật ký lịch sử lưu nghiệp vụ đích cùng tiến độ.

## 1. Chạy local

**Migration bộ lọc địa giới 20261106010000_school_student_geography đã apply trên DB local roadtoschool/public localhost:5432 ngày 06/11/2026.** Prisma đã xác nhận 19 migrations đồng bộ ở lượt rà soát 07/11/2026. Môi trường khác cần apply riêng trước khi dùng source mới.

- Làm việc trong thư mục api, dùng npm và env hiện có. Đợt này không sửa env hoặc bật eSMS/email thật.
- Migration 20261106000000_operation_and_parent_link_audit **đã apply vào DB local roadtoschool/public tại localhost:5432 ngày06/11/2026**, thêm trips.operation_audit và students.parent_link_audit JSONB nullable. Môi trường khác cần apply cùng migration trước khi chạy source mới; thiếu cột có thể làm cả GET lỗi.
- Sau khi được phép cập nhật DB: chạy npx prisma migrate deploy, rồi npx prisma generate. Không reset/seed.
- Cần Node/npm, PostgreSQL và file .env được cấp cho thư mục api. Cài dependency theo lockfile bằng `npm ci` nếu máy chưa có, rồi khởi động `npm run dev`. Dùng tài khoản và dữ liệu được cấp.
- Port mặc định 3000, có thể đổi qua PORT trong env hiện có. Với port mặc định, base là **http://localhost:3000/api/v1**, Swagger tại **http://localhost:3000/api/docs**, OpenAPI tại **http://localhost:3000/api/docs-json**. Gửi header `Authorization: Bearer <accessToken>`. Nếu đổi PORT, thay port tương ứng trong cả ba URL.
- Endpoint dưới đây tương đối với /api/v1. Dùng tài khoản/dữ liệu được cấp; không tự tạo dữ liệu giả.
- SYSTEM_ADMIN phải lưu bãi qua PUT /system-settings/parking-lot trước khi lập lịch. Chưa cấu hình trả **409**, không tự dùng tọa độ mặc định. Lần cấu hình đầu áp dụng ngay; lần đổi tọa độ sau dùng lịch hẹn.

## 2. FE phải cập nhật những gì

| Luồng | Thay đổi |
|---|---|
| Tạo nhân sự | email và phone đều bắt buộc ngay trên API cũ; thiếu 400. |
| Hủy phương án | Phải GET cancellation-impact rồi gửi expectedFingerprint; thiếu 400, cũ/sai 409. |
| Duyệt địa chỉ REOPTIMIZED | Routing-preview trước, gửi previewToken + expectedFingerprint; thiếu fingerprint 400, hết hạn/nguồn đổi 409. |
| Điểm danh sau arrival chiều đi | Dùng POST correction mới; PUT cũ bị chặn giai đoạn này. |
| Dashboard | tasks.kind thêm ADMIN_FINALIZATION, REOPTIMIZATION; cần fallback giá trị mới. href là URL Web, không phải API. |
| Map Parent | Chỉ vẽ điểm con và trường. polylineGeometry có thể rỗng; không nhận tọa độ điểm trẻ khác/bãi. |
| Home Mobile | Nhân sự gọi GET /trips/mobile/home-trip. Parent gọi GET /trips/mobile/parent/home-cards. |
| Lỗi OTP | Hiển thị message trả về. Số lượt còn lại của OTP nghiệp vụ hiện nằm trong message. |
| Cờ thao tác và roster | Đọc các giới hạn R01/R02/R07/R08/R09 ở mục 13 khi tích hợp báo nghỉ, vận hành và lịch phụ xe. |

Các field cũ được giữ; điều kiện nghiệp vụ đã duyệt có thể từ chối request trước đây thành công. Không coi giữ payload là đủ bảo đảm client không cần sửa.

## 3. Nhân sự / xác thực — 3.1

- POST /drivers và POST /schools/:id/employees giữ body hiện có, bắt buộc **email + phone** khi tạo DRIVER/SCHOOL_ADMIN/BUS_ATTENDANT. Mỗi tài khoản một role. Tài khoản cũ thiếu SĐT không bị backfill/khóa tự động.
- Mật khẩu chỉ bàn giao qua email. credentialDeliveryStatus: SENT / FAILED / CONSOLE; SENT nghĩa máy chủ email đã chấp nhận gửi.
- Gửi lại mật khẩu: POST /drivers/:id/credentials/resend hoặc POST /schools/:id/employees/:employeeId/credentials/resend. Trả message + credentialDeliveryStatus. Lưu mật khẩu mới trước khi gửi, lỗi email cho gửi lại; giữ phiên đăng nhập và không chặn vì IN_PROGRESS.
- OTP giữ payload và mode SMS cũ. Link Parent, yêu cầu cập nhật và báo nghỉ chỉ tiêu thụ OTP cùng transaction khi nghiệp vụ thành công; lỗi nghiệp vụ không làm mất mã còn hạn.
- Auth OTP dùng cho đăng ký/đặt lại mật khẩu, kiểm mã tồn tại, chưa dùng và còn hạn. Hiện source cho nhập sai lại tới khi mã hết hạn, không tăng bộ đếm sai trong verifyOtp.
- OTP nghiệp vụ dùng purpose `LEAVE_NOTICE`, `STUDENT_UPDATE_REQUEST`, `PARENT_STUDENT_LINKING`. Endpoint tự xác định purpose, FE gửi body của từng endpoint. Giới hạn 5 lần nhập sai cho cùng challenge. Mã sai trả HTTP 400, `message` có dạng `Mã OTP không chính xác. Còn <n> lần thử.` Sau lần sai thứ 5, số lượt còn lại là 0 và challenge bị chặn ở lần xác thực tiếp theo. Mã đã dùng/hết hạn/hết lượt trả HTTP 400 với message tương ứng.
- `attemptsRemaining` chưa có trong response JSON hiện hành. FE hiển thị `message` của API, giữ thông báo dự phòng khi lỗi chỉ có status hoặc lỗi mạng. Lỗi validation có thể trả `message` dạng mảng, cần xử lý cả chuỗi và mảng.
- TTL cấu hình bằng AUTH_OTP_TTL_SECONDS, mặc định 300 giây. Các endpoint cấp mã nghiệp vụ trả expiresInSeconds để FE dùng cho bộ đếm. Auth request OTP đăng ký/quên mật khẩu hiện trả {message}. Gửi lại mã có giới hạn riêng theo endpoint.

## 4. Trường / lịch — 3.2

- PATCH /schools/:id/status với isActive=false, PATCH /schools/:id/schedule và PATCH /schools/:id/location nhận effectiveDate tùy chọn YYYY-MM-DD, mặc định ngày mai. Response trả thông tin trường đang hiệu lực, kèm scheduledChangeId/effectiveDate/changeStatus khi đặt lịch. Các API này dành cho SYSTEM_ADMIN.
- PATCH /schools/:id/status với isActive=true kích hoạt lại ngay khi đủ điều kiện, không sử dụng effectiveDate để hẹn active. Lịch inactive tương lai vẫn cần hủy riêng qua API hủy lịch.
- Inactive sớm nhất ngày mai, muộn nhất ngày cuối hợp đồng. SYSTEM_ADMIN hủy lịch trước ngày hiệu lực qua POST /schools/:schoolId/scheduled-changes/:id/cancel, không body.
- Đến mốc inactive/đổi địa điểm/hết hợp đồng: phương án cũ hết hiệu lực, chuyến chưa vận hành hủy theo policy; chuyến có dấu vận hành chưa hoàn tất giữ bằng chứng, admin chốt. Lịch sử hoàn thành giữ nguyên.
- Inactive khóa nhân sự trường, active lại cần đăng nhập lại. Hết hợp đồng không khóa account; Parent không unlink, được xem lịch sử, không phát sinh nghiệp vụ dịch vụ đã hết hiệu lực.
- Đối với phương án, FE hiển thị effectiveStatus/effectiveStatusReason cùng status đã lưu. Reason có CONTRACT_EXPIRED / SCHOOL_INACTIVE / LOCATION_CHANGED / null.
- /service-calendar quản lý nghỉ/học bù theo Swagger. Học bù không vượt bất kỳ ngày nghỉ nhà xe; có thể thay nghỉ trường khi được duyệt. Ngày âm/dương không tồn tại bỏ lần đó, tháng nhuận chọn riêng.
- Đối soát bù + kiểm hiệu lực khi đọc/thao tác không phụ thuộc tick nửa đêm. Khi toàn bộ server tắt, không có tiến trình ghi DB.

## 5. Bãi / nguồn lực / phương án — 3.3, 3.5, 3.6, 3.8

- PUT /system-settings/parking-lot nhận addressText, latitude, longitude, maxOperatingRadiusKm tùy chọn (>0 tới 500, lần đầu mặc định 50, bỏ qua khi cập nhật thì giữ giá trị hiện hành), effectiveDate tùy chọn và reason tùy chọn. SYSTEM_ADMIN quản lý. expectedFingerprint tùy chọn lấy từ GET /system-settings/parking-lot/impact, nếu gửi mà đã cũ thì trả 409.
- Bãi đã cấu hình đổi tọa độ từ ngày mai. Đặt lịch **chưa hủy chuyến/chưa gắn cờ plan**; cancelledPlansCount/cancelledTripsCount trả 0 lúc đặt. scheduledChange chứa lịch hẹn.
- GET /system-settings/parking-lot trả tọa độ đang hiệu lực theo ngày. Chưa cấu hình trả 409. GET /system-settings/parking-lot/impact là dự báo, cancelledPlansCount trong impact là alias cũ cho số plan cần tối ưu lại, không có nghĩa hủy plan.
- POST /system-settings/parking-lot/cancel-scheduled-change chỉ trước ngày, giữ chuyến gốc. Đến ngày cron mỗi phút/đối soát hủy **SCHEDULED chưa frozen** từ mốc, đánh dấu needsReoptimization; không hủy plan.
- POST /routes/route-plans/:id/re-optimize dành cho SYSTEM_ADMIN, dùng bãi hiện hành, toàn bộ hoặc từ chối toàn bộ, trả DRAFT chờ SCHOOL_ADMIN duyệt. Trước ngày dời không dùng bãi tương lai. Plan cần tối ưu lại hoặc ngày sau lịch dời bãi chưa áp dụng bị chặn readiness/generation.
- Inactive xe/nhân sự bị từ chối nếu còn Ready/đã điểm danh/đang chạy. Chuyến còn lại phải bàn giao nguồn lực đúng role/trường, hoạt động, đủ chỗ, không trùng lịch/nghỉ/sự cố. Xe/tài xế giữ đơn trường theo hợp đồng và tiếp tục bị giữ nếu chuyến ngoại lệ chưa kết thúc.
- Đổi default đồng bộ từ **hôm nay** trên Trip chưa frozen, chỉ field đang đổi và đang kế thừa; **giữ override từng Trip**. Chèn trẻ/đổi địa chỉ không chép lại assignments.
- PATCH /trips/:id/assignments nhận **vehicleId, driverId, busAttendantId**, không phải assignedVehicleId/assignedDriverId/assignedBusAttendantId. Field expectedVehicleId/expectedDriverId/expectedBusAttendantId tùy chọn kiểm dữ liệu form cũ; giữ alias URL cũ.
- Candidate phụ xe thêm query vehicleId tùy chọn để nhận biết nhóm hiện tại. Danh sách candidate không giữ chỗ; khi lưu BE kiểm lại.
- Bán kính Haversine kiểm tại preparation/preview/confirm/chèn/duyệt địa chỉ, không force override. Tỉnh chỉ so khi hai bên có dữ liệu; reverse-geocode lỗi vẫn cập nhật tọa độ, province null.
- Chỉ SCHOOL_ADMIN duyệt DRAFT → ACTIVE. Plan detail/approve/readiness có firstServiceDate: YYYY-MM-DD hoặc null; là ngày đủ điều kiện đầu tiên sau ngày duyệt, **không xác nhận đã sinh Trip**. DRAFT/chưa có ngày hợp lệ có thể null.
- GET /routes/route-plans?needsReoptimization=true: lọc DRAFT/ACTIVE khi không gửi status.

## 6. Học sinh / Parent / địa chỉ — 3.4, 3.14, 3.15

- Đổi guardianPhone không tự unlink. SCHOOL_ADMIN đúng trường thu hồi link sai: POST /schools/:schoolId/students/:studentId/parent-links/:parentId/revoke, body {reason}. Lưu parentLinkAudit, trả HTTP201/message, không xóa lịch sử chuyến.
- Đổi địa chỉ/chèn trẻ ghi ngay nguồn dữ liệu nhưng chỉ sync Trip **từ ngày mai**, SCHEDULED chưa frozen. Hôm nay/lịch sử giữ snapshot cũ. FE phân biệt địa chỉ hồ sơ với điểm đón trong Trip.
- SYSTEM_ADMIN: POST /system-admin/update-requests/:requestId/routing-preview rồi POST /system-admin/update-requests/:requestId/approve với body cũ + decision: REOPTIMIZED, previewToken, expectedFingerprint. Token hết hạn sau 10 phút/nguồn đổi trả 409; phải preview lại. Routing constraints đã preview được lưu cùng tuyến.
- REMOVED_FROM_ROUTES loại trẻ khỏi roster tương lai, sync snapshot chuyến còn trẻ từ ngày mai; chuyến rỗng bị hủy. Disable giữ bằng chứng/lịch sử frozen, đóng việc chờ thuộc phạm vi policy.

## 7. Vận hành / correction / reopen — 3.7, 3.9, 3.10

- GET /trips/:id/operational-state trả cờ thao tác theo role và reason. canDriverStart/canDriverComplete/canArriveAtSchool chỉ bật cho DRIVER, canAttendantReady chỉ bật cho BUS_ATTENDANT. Parent nhận children của mình cùng trạng thái chuyến và phân công, không nhận global counts/action flags. Các giới hạn hiện tại của flags/counters nằm ở mục 13.
- Với TO_PARKING SCHEDULED, nhánh kiểm Start lần lượt xét chờ phân công, Ready, roster rỗng, còn UNMARKED, ABSENT trong roster hoạt động thiếu lý do, không có PRESENT và giờ chạy. Nhánh đầu tiên không đạt quyết định startDisabledReason. `ABSENT_REASON_REQUIRED` xuất hiện khi đã qua các nhánh đứng trước, còn lifecycle block có thể thay reason sau đó. POST Start kiểm lại active roster và điều kiện nguồn lực lúc thao tác.
- POST /trips/:id/start chặn tài xế xuất phát với HTTP 409 Conflict nếu giáo viên phụ xe được phân công đang thực hiện một chuyến xe khác chưa kết thúc (`IN_PROGRESS`) (R02).
- POST /trips/:id/attendant-ready chặn phụ xe xác nhận sẵn sàng với HTTP 400 Bad Request nếu chuyến xe đang có sự cố thiếu giáo viên (`ATTENDANT_MISSING`) ở trạng thái chờ phân công (`WAITING_ASSIGNMENT`) (R03).
- Home nhân sự dùng GET /trips/mobile/home-trip, Home Parent dùng GET /trips/mobile/parent/home-cards. Hai API ưu tiên IN_PROGRESS. Với SCHEDULED chưa frozen và đủ điều kiện tính lại giờ, API áp dụng effectiveTripTiming trước khi lọc giờ kết thúc và sắp xếp ứng viên.
- PUT /trips/:id/attendance/:studentId dùng UNMARKED / PRESENT / ABSENT; ABSENT cần absenceReason theo DTO. Không đổi enum sang BOARDED/ALIGHTED. Hoàn tác chiều đi trước arrival, chiều về trước Start.
- POST /trips/:id/attendance/:studentId/correction dành cho phụ xe đang được gán, body {status: PRESENT hoặc ABSENT, expectedStatus: trạng thái khi mở form, reason}. Chỉ TO_SCHOOL sau arrival trước Complete, không sửa trẻ đã alighted. Sai trạng thái/giai đoạn 409, học sinh đã excluded trả 404. Thành công HTTP 200, trả message + attendance. Có audit/thông báo đính chính, không phát Boarding mới.
- POST /trips/:id/cancel-all-absent nhận {reason}, dành cho phụ xe đang được gán hoặc scoped admin, chỉ TO_PARKING SCHEDULED đã Ready, roster không rỗng/toàn ABSENT có lý do. Thành công HTTP 200, trả message.
- POST /trips/:id/reopen dành cho SYSTEM_ADMIN, body {reason, vehicleId?, driverId?, busAttendantId?}. Bỏ field nguồn lực nếu giữ phân công cũ. Chỉ CANCELLED trước scheduledStartAt, chưa xuất phát/nhận trẻ, plan ACTIVE không cần reopt, ngày phục vụ sau ngày duyệt gần nhất và nguồn lực hợp lệ. Reset Ready và chuẩn bị điểm danh, giữ ABSENT của đơn học sinh còn hiệu lực, audit giữ lịch sử hủy/mở. Response message + tripId. Chi tiết snapshot và thời gian thực tế ở mục 12, F04-A và F08-A.
- Hủy plan: GET /routes/route-plans/:id/cancellation-impact, rồi POST /routes/route-plans/:id/cancel với {reason, expectedFingerprint}. Chỉ hủy unfrozen; frozen tiếp tục xử lý và giữ nguồn lực. Thiếu fingerprint 400; sai/cũ 409, tải lại impact.

Các endpoint đọc trên Mobile và response chính như sau. Danh sách lịch nhân sự chỉ trả các Trip thực được phân công.

| Method/path | Quyền | Response chính |
|---|---|---|
| GET /trips/mobile/home-trip | DRIVER / BUS_ATTENDANT | {hasTrip, trip}, khi rỗng hasTrip=false và trip=null |
| GET /trips/mobile/parent/home-cards | PARENT | {items}, mỗi thẻ có studentId/tripId/tripStatus |
| GET /trips/mobile/driver-schedule | DRIVER | {items}, query date hoặc fromDate/toDate |
| GET /trips/mobile/bus-attendant-schedule | BUS_ATTENDANT | {items}, query date hoặc fromDate/toDate |
| GET /trips/mobile/parent/student/:studentId/schedule | PARENT có liên kết | {studentId, studentName, selectedDate, trips, items}, trips/items cùng danh sách, query date hoặc fromDate/toDate |
| GET /trips/mobile/:id | Nhân sự được phân công, admin đúng phạm vi hoặc Parent có con trong chuyến | Trip detail, Parent nhận dữ liệu đã masking |
| GET /trips/:id/operational-state | Cùng phạm vi truy cập Trip | Trạng thái theo role, có giới hạn ở mục 13 |
| GET /trips/:id/attendance | Nhân sự được phân công hoặc admin đúng phạm vi | {tripId, students, totalStudents, ...counters}, students là roster đã lọc excluded |

GET /trips/mobile/:id/detail là alias của chi tiết Mobile. POST /trips/:id/reopen thành công HTTP 200, trả {message, tripId}. Các body correction/cancel-all-absent/reopen cần reason có nội dung, tối đa 500 ký tự.

## 8. Báo nghỉ — 3.12, 3.13

- API báo nghỉ chặn Parent và BUS_ATTENDANT sau Ready ở cả TO_SCHOOL/TO_PARKING. DRIVER chiều TO_SCHOOL còn được báo nghỉ sau Ready khi chuyến vẫn SCHEDULED và các điều kiện khác đạt. DRIVER chiều TO_PARKING cũng bị chặn sau Ready. Flags canReportLeave trên các API đọc còn lệch theo endpoint, xem R01 tại mục 13.
- Màn báo nghỉ gọi GET /leave-notices/options với studentId bắt buộc cho Parent, tùy chọn serviceDate/direction. Response {trips, maskedChannels, subjectName, kind}, từng phần tử trips có tripId/canReport/disabledReason. Dùng canReport và disabledReason của options cho danh sách chọn báo nghỉ.
- POST /leave-notices/otp nhận {tripId, studentId?}, trả HTTP 200 với {challengeId, maskedChannels, expiresInSeconds}. POST /leave-notices/confirm nhận {challengeId, otp, tripId, studentId?, reason?}, trả HTTP 200 với chi tiết đơn. Parent phải gửi studentId ở cả hai bước. API kiểm lại điều kiện khi gửi/xác thực, có thể từ chối dù options trước đó cho phép. Lỗi OTP hiện hành mô tả ở mục 3.
- Rút đơn học sinh chỉ khôi phục dấu ABSENT còn thuộc notice đó, không ghi đè điểm danh mới của phụ xe.
- Nhân sự REPLACED không rút được. Không thay bằng chính người vắng; nếu người đã tới dùng ARRIVED. Kiểm lại khả dụng khi lưu.
- Trip hủy đóng PENDING_REPLACEMENT/sự cố chờ. Notice học sinh RECORDED giữ cho reopen hợp lệ; không hiểu tất cả notice đã xóa.

## 9. Theo dõi / sự cố / dashboard — 3.11, 3.17, 3.18

- Giữ báo sự cố cũ, latitude/longitude tùy chọn để client cũ dùng được; gửi phải đủ cặp, hợp lệ. Thiếu dùng điểm cuối hoặc UNKNOWN, context.locationSource và capturedAt cho biết vị trí cũ/mới; addressText có thể null.
- NO_GUARDIAN_AT_STOP cần studentId thuộc roster chiều về đang chạy, PRESENT, chưa xuống. Không có workflow chuyển xe/cứu hộ/y tế mới.
- POST /incidents/:id/close dành cho SYSTEM_ADMIN hoặc SCHOOL_ADMIN cùng trường, body {reason, expectedStatus}. Chỉ NO_GUARDIAN_AT_STOP / TRAFFIC_DELAY / GPS_SIGNAL_LOST, thành công HTTP 200 trả trực tiếp đối tượng sự cố với status=CLOSED. reason có nội dung, tối đa 500 ký tự. Status cũ hoặc đã kết thúc trả 409. Loại khác dùng workflow xử lý tương ứng.
- GPS im >3 phút cảnh báo tự động: LAST_KNOWN + capturedAt hoặc UNKNOWN khi chưa có điểm, không giả tọa độ. Lệch >50m ít nhất15s; trễ điểm >3 phút ít nhất15s.
- LATE_RUNNING_TRIP_RISK dùng buffer15 phút, gửi từng Trip sau bị ảnh hưởng; không tự đổi phân công. NO_GUARDIAN chỉ Parent liên quan; TRAFFIC gửi nhóm phụ huynh chờ theo điểm/chuyến.
- Parent chi tiết không nhận điểm trẻ khác/bãi/toàn polyline hoặc operationAudit.
- GET /admin/overview thêm ADMIN_FINALIZATION, REOPTIMIZATION cho SYSTEM_ADMIN. Dữ liệu: GET /trips/admin-finalizations?schoolId=...; GET /routes/route-plans?needsReoptimization=true&schoolId=.... Chốt hành chính giữ POST /trips/:id/admin-finalization, không giả dấu xuống xe.

## 10. Giới hạn kiểm chứng

Cập nhật06/11: đã sửa cách SQL advisory lock trả kiểu void gây cron đối soát lỗi sau migrate. Không cần đổi payload/migrate thêm; nạp lại API với source/build mới. Chưa xác nhận chu kỳ cron runtime sau sửa.

Typecheck và trạng thái 19 migrations đạt ở lượt review 07/11/2026. Kết quả build/schema validation/kiểm HTTP Swagger ở các mốc triển khai trước là lịch sử. Lần GET OpenAPI trong lượt review 07/11/2026 timeout sau 4 giây, nên Swagger runtime hiện còn NOT_VERIFIED. Nghiệm thu quyền, mốc ngày, race, cron, retry, provider và FE cần dữ liệu/quyền được PO cấp. Script test tiếp tục theo chỉ thị PO chưa chạy.

Override legacy khác default hoặc có dấu điều phối được giữ. Gán riêng bằng đúng ID default nhưng không lưu audit trước đây không thể suy ra lại ý định. Snapshot legacy chỉ bảo toàn view hiện tại trước lần sửa, không khôi phục tuyến lịch sử từng bị ghi đè.

Workflow thay plan cùng nhóm học sinh/giữ chỗ nguồn lực/chuyển roster **chưa triển khai**, chờ chốt riêng; không có endpoint replace/replacement-preview mới.


## 11. Bộ lọc tỉnh và phường/xã — 06/11/2026

Query optional: provinceId, wardId (String ID VietMap, không phải mã hành chính chính thức). Có cả hai kết hợp AND. Không gửi thì không lọc địa giới, giữ phạm vi/quyền và payload cũ. Query rỗng hoặc không phải chuỗi trả400; ID không khớp trả danh sách rỗng, không tự chuyển theo tên/tỉnh trường.

- GET /schools?provinceId=12&wardId=18700: SYSTEM_ADMIN. Filter trước phân trang/count, theo địa chỉ trường đang hiệu lực kể cả lịch đến ngày chưa đối soát. Tọa độ/địa giới lịch tương lai chưa dùng.
- GET /schools/:schoolId/students?provinceId=12&wardId=18700: SYSTEM_ADMIN hoặc SCHOOL_ADMIN đúng trường; kết hợp với search/status/hasAddress/routingStatus cũ.
- GET /routes/preparation/:schoolId?provinceId=12&wardId=18700: SYSTEM_ADMIN. BE phân loại eligibility trước, rồi chỉ thu hẹp view eligibleStudents/ineligibleStudents theo lựa chọn tường minh. Không có query thì không thêm lọc địa giới. Không tự sửa studentIds đã chọn hoặc tiêu chí đủ điều kiện; optimize/confirm vẫn kiểm toàn bộ studentIds nhận được như trước. Đổi filter không đồng nghĩa học sinh đã chọn bị loại.
- GET /schools/location-options dành cho SYSTEM_ADMIN. GET /schools/:schoolId/students/location-options dành cho SYSTEM_ADMIN hoặc SCHOOL_ADMIN đúng trường. Hai API trả {provinces:[{id,name}],wards:[{id,name,provinceId}]}. provinceId optional chỉ thu hẹp wards, provinces vẫn toàn bộ địa giới có trong dữ liệu đúng scope. ID truyền query là giá trị từ dropdown, các ID ví dụ trên chỉ minh họa.
- Hai dropdown đọc DB, không gọi VietMap lúc GET, không phân trang theo trang danh sách đang mở, không phải danh mục toàn quốc. Khi đổi tỉnh FE bỏ wardId đã chọn nếu không thuộc tỉnh mới; không tự chọn sẵn theo trường/bãi.
- Response trường/học sinh và hai nhóm học sinh preparation thêm provinceId/wardId/ward nullable, giữ province (tên tỉnh), addressText và field cũ. Lấy địa giới từ Reverse v4 display_type=5 khi tạo/đổi tọa độ; geocode lỗi không chặn thao tác và trả/lưu null, không giữ ID cũ cho tọa độ mới.
- Không backfill dữ liệu cũ. Bản ghi chưa có ID vẫn hiện khi bỏ filter, không match filter ID cụ thể; dropdown có thể rỗng sau migration dù có addressText/province tên cũ. Không suy ra ID từ chuỗi tên, không sửa lịch sử snapshot.
- Migration mới thêm province_id, ward_id, ward nullable cho schools/students, không có bảng mới. Đã apply local và xác minh6cột bằng metadata; chưa gọi provider/DB nghiệp vụ/test scripts để xác minh. Typecheck/build/validate và HTTPSwagger metadata đã đạt; UAT/phân trang/địa giới thực cần dữ liệu được cấp.


## 12. Cập nhật bản vá F01–F10 ngày 07/11/2026

- Preparation, optimize-preview, confirm-plan và readiness kiểm học sinh thuộc phương án khác còn hiệu lực. Khi confirm trả 409 do dữ liệu nguồn hoặc phân công đổi, tạo preview mới. Token hết hạn trả 404. Body confirm vẫn dùng previewToken và planName tùy chọn.
- Generator đọc Route, phân công, roster và lịch sau khi lấy khóa. Lịch dự kiến admin và Parent cùng dùng điều kiện lịch bãi, activation và ngày phục vụ. Chuyến học bù hợp lệ được xét khi áp lịch tuần.
- Bàn giao nguồn lực kiểm cả Route chưa có Trip. Khi gặp xung đột nguồn lực, tải lại dữ liệu phân công trước khi thử lại.
- Swagger có schema phản hồi cho correction, cancel-all-absent, reopen, revoke liên kết Parent và close incident.
- F04-A. POST reopen giữ tripId và dựng lại snapshot, giờ và roster theo Route/lịch hiện hành. Báo nghỉ còn hiệu lực của trẻ vẫn thuộc roster được giữ. API trả 409 nếu đã đến giờ xuất phát cũ hoặc mới, ngày phục vụ trước hoặc bằng ngày duyệt, hoặc điều kiện nguồn lực không đạt. Audit lưu dữ liệu trước–sau.
- F08-A. Trip đã Ready giữ giờ và snapshot đã xác nhận khi lịch mới chỉ đổi giờ. Trip chưa frozen dùng giờ mới. Khi ngày mất dịch vụ, Ready-only có thể hủy theo lifecycle, còn Trip đã điểm danh hoặc đang chạy chờ admin chốt.
- Kết quả kiểm chứng theo mốc được ghi ở mục 10. Nghiệm thu nghiệp vụ trên dữ liệu được cấp vẫn đang chờ.

## 13. Bug API đang hoãn xử lý và ảnh hưởng tới FE — 07/11/2026

Các hành vi dưới đây còn trong source hiện tại. PO yêu cầu triển khai bản sửa ở đợt sau. Các bảng này bổ sung giới hạn cho contract ở những mục phía trên.

| Mã | Hành vi hiện tại | FE cần biết khi tích hợp |
|---|---|---|
| R01 | Parent Home và Parent schedule chặn canReportLeave sau Ready cả hai chiều. Mobile detail vẫn có thể trả true cho TO_SCHOOL sau Ready. Lịch phụ xe cũng có thể trả true trong tình huống này. Staff Home trả false sau Ready cho cả DRIVER, dù Driver chiều đi còn được API báo nghỉ cho phép. | Màn báo nghỉ đọc GET /leave-notices/options và trips[].canReport/disabledReason. Flag ở Home/detail/schedule có thể khác options. API otp/confirm quyết định kết quả khi gửi. |
| R02 | operational-state chưa kiểm tài xế/xe/phụ xe đang IN_PROGRESS ở chuyến khác. POST Start đã kiểm và trả 409 khi bận. | canDriverStart=true vẫn có thể nhận 409. Hiển thị message, tải lại trạng thái chuyến sau lỗi. Giữ trạng thái trước thao tác tới khi API xác nhận thành công. |
| R07 | operational-state dùng cả attendance đã excluded để tính counters/flags. Start/Arrive/Complete kiểm active roster. Parent children ở operational-state cũng chưa lọc excluded. | Counters/flags có thể khác roster. Nhân sự/admin lấy danh sách đang phục vụ từ GET /trips/:id/attendance. Parent dùng schedule/detail đã masking, không có quyền gọi toàn bộ attendance. Lỗi tắt nhầm thao tác do counters vẫn cần BE sửa. |
| R08 | PUT điểm danh và PUT alighting cũ chỉ kiểm bản ghi attendance tồn tại, chưa từ chối excludedAt. Correction mới đã từ chối. | Form điểm danh lấy studentId từ roster mới tải của GET /trips/:id/attendance, bỏ lựa chọn cũ khi tải lại danh sách. BE còn thiếu guard với request giữ studentId cũ, nên luồng này còn chờ sửa và nghiệm thu. |
| R09 | GET /trips/mobile/bus-attendant-schedule còn trả giờ đã lưu. Home/chi tiết đã tính giờ hiệu lực cho Trip đủ điều kiện. | Sau khi lịch trường đổi hiệu lực và cron chưa cập nhật, giờ trên lịch phụ xe có thể khác Home/detail. Khi mở chi tiết chuyến dùng giờ response detail để hiển thị tại màn chi tiết. |

Các lỗi tích hợp tài liệu R04/R05 đã được sửa trong bản hướng dẫn này. URL Home dùng đúng controller. Lỗi OTP mô tả số lượt còn lại trong message, purpose đúng enum và TTL mặc định có cấu hình. Trạng thái bug R01/R02/R07/R08/R09 vẫn là chờ triển khai.
