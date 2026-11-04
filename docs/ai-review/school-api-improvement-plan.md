# Kế hoạch chỉnh sửa API mục 3.2 — Trường và cấu hình dịch vụ

> Thảo luận 03/11/2026: đề xuất coi ngày hiệu lực và lịch thay đổi là nguồn xác định trạng thái nghiệp vụ, tính khi đọc/ghi (effective state), cron chỉ ghi nhận trạng thái/audit/notification sau. Đề xuất này chưa được PO chốt và cần contract field rõ, không tự thay meaning status cũ. Không thể ghi DB/phát thông báo khi mọi tiến trình đều tắt; nếu cần cập nhật vật lý đúng giờ phải có scheduler/worker độc lập vẫn chạy. Xem mục 16.

> Chốt tiếp D3/D7/D8 ngày 03/11/2026: xem mục 15. Những lựa chọn chờ tương ứng ở mục trước đã được thay thế. Chưa triển khai code/schema/migration.

> Cập nhật phản hồi PO 02/11/2026: xem mục 14. Phần lựa chọn cũ ở D1–D8 là lịch sử đề xuất, không thay thế quyết định mới. Chưa triển khai code.

Ngày: 02/11/2026, Asia/Saigon. Mode PLANNING. **WAITING_APPROVAL**.
Đây là bản kế hoạch để PO review; không triển khai, migrate, sửa .env hoặc chạy script test. Tên API/model/field mới dưới đây là đề xuất cần duyệt, không phải quyết định thay PO.

## 1. Quyết định hiệu lực và phạm vi

Nguồn quyết định: school-business-flow-detail.md mục 13, 15, 16, 17; quyết định mới nhất ưu tiên.

| Hạng mục | Đã chốt |
|---|---|
| Inactive | Chọn ngày từ mai tới ngày cuối hợp đồng; không tác động hôm nay; đến ngày hủy phương án/chuyến chưa vận hành theo phạm vi được chốt |
| Tài khoản | Account trường không login khi inactive, me phải làm FE logout; Parent xem dữ liệu cũ theo từng con/trường, không tạo nghiệp vụ mới cho trường inactive |
| Gia hạn | Không có DRAFT/ACTIVE thì cho phép; có thì kiểm tra nguồn lực trong thời gian tăng thêm |
| Ngày nghỉ | Hệ thống/trường, cố định hằng năm hoặc chỉ định năm, âm/dương; báo trước với ngày không cố định, hủy trước ngày; không sinh hoặc hủy chuyến đúng phạm vi |
| Học bù | Trường báo trước, SYSTEM_ADMIN duyệt; cấm ngày nghỉ hệ thống cố định; cho vượt ngày nghỉ trường |
| Lịch tuần | Chỉ áp dụng sau hôm nay tới hết hợp đồng; giữ giờ vận hành hiện tại, không thêm buffer |
| Địa chỉ | Giữ text gắn tọa độ, đổi địa chỉ hủy phương án; điều kiện DRAFT/ACTIVE và thời điểm đổi còn cần làm rõ |
| Nguồn lực | Xe/tài xế riêng một trường trong giai đoạn hợp đồng; gia hạn phải bảo toàn invariant |
| Hết hạn | Hủy phương án cũ, giải phóng nguồn lực; giữ tuyến và lịch sử, không trở về DRAFT |
| Chuyến ngoại lệ | Giữ trạng thái chuyến chưa hoàn thành, admin chốt cuối; không tự hoàn thành/hủy vì qua ngày |
| Lưu/cấu hình | Lưu riêng từng nhóm; trường liên hệ trực tiếp nhà xe; không thêm request tổng quát, trừ học bù có luồng duyệt |

Chỉ API/tài liệu, DB tối thiểu sau khi PO duyệt. Không Web/Mobile, package, đa nhà xe/bãi, buffer, đổi vai trò, billing hoặc điều phối cứu hộ. Quyền admin/final status/freeze còn là đề xuất chưa được duyệt. Không tự coi yêu cầu lên plan là đồng ý các đề xuất đó.

## 2. Chia triển khai thành sáu phần có thứ tự

| Phần | Kết quả | Phụ thuộc |
|---|---|---|
| P1 | Dữ liệu ngày hiệu lực, lịch nghỉ/học bù và quy tắc xử lý chung | Duyệt schema/contract, lịch âm và precedence |
| P2 | Inactive/reactivate và quyền tác nghiệp theo trường | P1; quyết định active lại/Session |
| P3 | Gia hạn và tự kết thúc hợp đồng | P1; nguồn lực và ngoại lệ Trip |
| P4 | Lịch tuần có ngày hiệu lực; holiday/makeup vào mọi luồng sinh/lịch | P1; lịch nghỉ/học bù |
| P5 | Đổi địa điểm có lịch áp dụng, hủy plan đúng phạm vi | P1; chốt điều kiện đổi |
| P6 | API admin chốt Trip ngoại lệ, thông báo và tài liệu FE | Chốt quyền/kết quả/điểm danh; phụ thuộc lifecycle P2/P3/P5 |

Không phát hành nửa luồng làm inactive trước khi có cách xử lý Trip ngoại lệ hoặc đọc lịch lệch với generator. Mỗi phần có thể code sau duyệt riêng, nhưng acceptance end-to-end phải kiểm tra các phần liên quan đã nối đúng.

## 3. Dữ liệu lưu — cần PO duyệt trước schema

Các yêu cầu hẹn ngày/ngoại lệ phải được lưu bền vững, không dùng timer/bộ nhớ hoặc sửa School ngay rồi chờ tới ngày.

**Đề xuất hai model nghiệp vụ tối thiểu:**

| Model dự kiến | Mục đích/quan hệ | Nhóm dữ liệu cần chốt |
|---|---|---|
| SchoolScheduledChange | Hẹn inactive/location/weekly schedule; N:1 School, User tạo/xử lý | Loại thay đổi, ngày hiệu lực, nội dung đề xuất, trạng thái chờ/áp dụng/hủy/lỗi, người/thời điểm/lý do, dấu dữ liệu để kiểm tra thay đổi |
| ServiceCalendarEntry | Ngày nghỉ hệ thống hoặc trường và đề nghị học bù; school nullable (null là hệ thống), User tạo/duyệt | Loại nghỉ/học bù, âm/dương, định kỳ/năm cụ thể, ngày/tháng/năm và tháng nhuận khi cần, giờ vận hành học bù, trạng thái duyệt/hủy, lý do/người duyệt |

Tên field, kiểu, enum, nullable/default, unique/index/FK chưa tự chốt. SystemSetting vẫn dùng bãi xe/cấu hình chung; không nhét toàn bộ lịch/request vào một JSON chỉ để tránh bảng, vì cần duyệt từng entry và cập nhật đồng thời/lịch sử. Đây là lựa chọn thiết kế đề xuất, PO có thể chọn khác.

Tái sử dụng School/RoutePlan/Trip/TripAttendance/LeaveNotice/TripIncident/Notification. Không xóa lịch sử assignment/route/attendance. Audit admin chốt Trip: ưu tiên thêm một field nullable JSON trên Trip (tên/shape cần PO duyệt) để lưu người/lý do/thời điểm/trạng thái trước–sau, thay vì bảng audit mới. Không dùng navigationState hoặc attendance giả để chứa quyết định admin.

Migration chỉ DDL sau duyệt; không DML/backfill/seeds, không populate ngày nghỉ mặc định tự ý. Trường chưa có entry mới giữ baseline cho tới khi PO tạo cấu hình. Lịch âm cần chốt thuật toán/library và quyền cài package nếu cần; không tự chọn library hay lấy lịch Trung Quốc thay lịch Việt Nam.

## 4. Một bộ quy tắc dùng chung

Tạo service lifecycle/calendar nhỏ theo NestJS, Prisma trực tiếp; không CQRS, queue, Redis hoặc generic repository.

- Ngày dịch vụ theo Asia/Ho_Chi_Minh, hiệu lực từ đầu ngày được chọn; hợp đồng có hiệu lực bao gồm ngày cuối, hết hạn từ ngày kế tiếp. Đây là đề xuất chốt múi giờ/rìa ngày trước contract.
- Kiểm tra school effective state từ dữ liệu và ngày hiện tại khi xử lý request, không chỉ dựa cron đã đổi flag; restart/missed tick không được cho phép nghiệp vụ sai trong khoảng trống.
- Cron rà các thay đổi đến hạn **chưa áp dụng** (<= hôm nay), xử lý idempotent, không chỉ đúng ngày/giờ tick. Đối soát lifecycle trước cron sinh chuyến 02:00; đồng thời generator tự kiểm tra eligibility.
- Date eligibility duy nhất dùng cho generation thủ công/cron, lịch projected Mobile/Web, home cards và approval liên quan. Có lịch nghỉ thì không chỉ lọc UI nhưng DB vẫn sinh Trip.
- Tách plan reservation theo hợp đồng khỏi actual busy của Trip chưa chốt; đề xuất không gán nguồn lực có Trip thật chưa xử lý sang chuyến khác cho tới admin xác minh. PO cần quyết định tránh tài nguyên bị giữ vô thời hạn do trạng thái stale.
- Thao tác Start/Ready/attendance và lifecycle phải thống nhất thứ tự khóa/điều kiện khi ghi; không đọc SCHEDULED rồi update ID mà bỏ qua trạng thái mới. Preview tác động phải được revalidate khi confirm và khi tới ngày áp dụng.
- Notifications theo kết quả commit, không lặp khi cron retry. Đọc thông báo không được coi hoàn tất tác vụ admin.

## 5. P2 — Inactive theo lịch và quyền dữ liệu

### API mới dự kiến (prefix /api/v1)

| Method/path | Actor | Request/response dự kiến |
|---|---|---|
| POST /schools/:id/scheduled-changes/preview | SYSTEM_ADMIN | Loại/ngày/nội dung thay đổi; trả nhóm tác động, thời điểm và fingerprint |
| POST /schools/:id/scheduled-changes | SYSTEM_ADMIN | Xác nhận preview và dữ liệu; trả change ID/trạng thái/ngày/tác động |
| GET /schools/:id/scheduled-changes | SYSTEM_ADMIN, SCHOOL_ADMIN trường mình | Danh sách thay đổi theo scope, phân trang |
| POST /schools/:id/scheduled-changes/:changeId/cancel | SYSTEM_ADMIN | Chỉ trước hiệu lực; quyền hủy/đổi lịch cần PO duyệt |

Inactive: ngay lúc tạo kiểm tra ngày từ mai tới contract end, trường còn phù hợp; chưa đổi isActive. Đến ngày: hủy DRAFT/ACTIVE theo nghiệp vụ, hủy Trip chưa vận hành thuộc phạm vi; giữ COMPLETED và ngoại lệ đang xử lý. Giữ dữ liệu User/Student/link.

Auth: chặn login/refresh/me và API tác nghiệp của SCHOOL_ADMIN/BUS_ATTENDANT theo inactive; đề xuất me 401 giữ error shape hiện tại để client logout theo flow sẵn có. Không giả định me luôn được gọi hoặc 403 tự làm mọi FE logout. Không tắt User.isActive vĩnh viễn chỉ vì School inactive, tránh mất trạng thái khóa cá nhân.

Parent: giữ login; quyền xem lịch sử con còn nguyên; chặn link mới, unlink/update/báo nghỉ và các mutation liên quan school inactive theo danh sách được PO duyệt. Parent có con trường khác vẫn dùng bình thường. Không sửa lịch sử để ẩn dữ liệu. Cần chốt unlink có bị chặn hay là quản lý tài khoản ngoại lệ.

Reactivate: endpoint status hiện tại giữ response; kiểm tra contract, không hồi sinh plan/Trip CANCELLED. Các chính sách Session cũ được dùng lại hay buộc login mới phải PO chốt; không tự revoke Sessions ảnh hưởng quyết định phần 3.1.

**API cũ PATCH /schools/:id/status:** payload chỉ isActive không biểu đạt ngày. Đề xuất giữ field, từ chối inactive tức thì bằng error chuẩn và hướng tới API mới. Không tự mặc định ngày mai, không trả isActive=false khi mới hẹn. Đây là breaking behavior cần PO duyệt riêng; active=true vẫn giữ response. Nếu PO chọn thêm optional ngày vào API cũ thì phải chốt field và semantics trước.

## 6. P3 — Gia hạn và hết hợp đồng

Giữ PATCH /schools/:id/contract request/response cũ. Với gia hạn thuần, giữ contractStartDate hiện tại kể cả quá khứ, chỉ mở rộng end; DTO dùng kiểm tra ngày thực giống tạo trường. Thay start/rút ngắn/end bằng cũ là các trường hợp chưa được PO duyệt, không tự áp dụng quy tắc gia hạn cho mọi sửa hợp đồng.

Thêm GET /schools/:id/contract-extension-impact dự kiến nhận ngày kết thúc đề xuất, trả nguồn lực/xung đột/phương án liên quan. Nếu cần POST preview do input nhiều, duyệt contract trước. Xem đủ xe, tài xế và giáo viên cho khoảng tăng thêm; không tạo giả xung đột trong thời gian hợp đồng cũ cùng trường. Commit kiểm tra lại nguồn lực, tính active/role/school/capacity phù hợp, school version và lịch inactive/location chờ; lỗi 409 nếu thay đổi/xung đột, không sửa dở dang hợp đồng.

Đến hết hạn: RoutePlan DRAFT/ACTIVE chuyển CANCELLED theo yêu cầu mới nhất, có lý do/ngày/người tự động theo dữ liệu audit hiện có; không về DRAFT, không tự hồi sinh sau ký tiếp. Giữ Route/stops/default references làm lịch sử, các query giữ chỗ chỉ xét plan còn phục vụ. Trip COMPLETED giữ nguyên; SCHEDULED chưa vận hành ngoài phạm vi hợp đồng hủy; ngoại lệ giữ nguyên và chuyển hàng đợi admin xét (chưa chọn field).

Không mặc nhiên inactive School hoặc khóa tài khoản chỉ vì hết hợp đồng: PO đã chốt khóa theo inactive, chưa chốt hết hợp đồng có đồng nghĩa inactive không. Cần làm rõ trước wiring auth. Release nguồn lực hiệu lực theo ngày kể cả cron trễ; Trip chưa được admin chốt cần quy tắc busy riêng.

## 7. P4 — Lịch tuần, ngày nghỉ và học bù

### Lịch tuần

POST scheduled-change với ngày hiệu lực sau hôm nay, trong hợp đồng, payload weeklySchedule giữ shape cũ. Trước áp dụng không ghi đè weeklySchedule hiện tại làm generator dùng giờ mới cho ngày cũ; generator theo serviceDate phải chọn đúng phiên bản đã đặt lịch cho tương lai. Khi sửa/hủy pending change, tính lại eligible Trip tương lai theo quy tắc, không can thiệp hôm nay/lịch sử.

PATCH /schools/:id/schedule hiện không có ngày: đề xuất thêm field tùy chọn ngày hiệu lực và khi thiếu áp dụng từ mai; chỉ làm sau PO duyệt tên/default/response semantics. Hoặc chỉ API scheduled mới, API cũ từ chối sửa ngay có hướng dẫn. Hai phương án đang chờ, không tự chọn.

Đồng bộ scheduledStart/EndAt, Time, snapshot departure/arrival, giờ mọi stop dựa snapshot đúng phiên bản/thời lượng, giữ geometry nếu không đổi điểm. Response giữ success/message/school/counters, nhưng counters hẹn lịch khác counters đã thực hiện: không gán số dự kiến vào field có nghĩa đã hủy/đổi; thêm field pending/tác động chỉ khi được duyệt. Thông báo đổi giờ cần PO xác nhận scope người nhận.

### API lịch nghỉ/học bù dự kiến

| Method/path | Actor | Mục tiêu |
|---|---|---|
| GET/POST /system-settings/holidays | SYSTEM_ADMIN | Xem/tạo nghỉ hệ thống |
| POST /system-settings/holidays/:id/cancel | SYSTEM_ADMIN | Hủy trước ngày nếu đủ điều kiện |
| GET/POST /schools/:id/holidays | Actor tạo trường chưa chốt; scope trường bắt buộc | Ngày nghỉ riêng |
| POST /schools/:id/holidays/:holidayId/cancel | Theo quyền PO chốt | Hủy trước ngày |
| GET/POST /schools/:id/makeup-days | SCHOOL_ADMIN tạo, SYSTEM_ADMIN xem/duyệt; xem theo scope | Gửi đề nghị học bù và theo dõi |
| POST /schools/:id/makeup-days/:entryId/approve hoặc /reject | SYSTEM_ADMIN | Kiểm tra service date/holiday/resources trước quyết định |
| GET /schools/:id/service-calendar | Admin theo scope; client khác qua lịch con/Trip hiện có | Lịch hiệu lực hợp nhất, nguồn/lý do/ngày chuyển đổi |

Mỗi API mới: DTO/param/query/body/response/schema, 400 invalid date/lead time/calendar, 401/403 scope, 404 entry, 409 trạng thái/xung đột, lỗi provider không liên quan. Cancellation là thay trạng thái entry để giữ lịch sử, không delete hàng loạt không dấu vết. Tên field/type/required sẽ lập bảng chốt riêng trước code.

Quy tắc đã chốt: nghỉ fixed hệ thống luôn chặn học bù; trường nghỉ có thể học bù sau duyệt; nghỉ nonfixed báo trước và hủy trước ngày; chỉ nhận học bù trước ngày và trong contract/active service. Ngoại lệ inactive/hết hợp đồng không được học bù tự vượt qua.

Đề xuất ngăn tạo Trip từ lúc có ngày nghỉ đã có hiệu lực quyết định cho serviceDate tương lai; đến ngày hủy các Trip đã tồn tại thuộc phạm vi. Phải PO chốt hủy ngay khi thông báo hay tới ngày, đặc biệt fixed vừa tạo và hủy thông báo trước ngày. Không giả định generator sinh lại CANCELLED được vì unique Route/date hiện có.

Âm lịch cần xác định lịch Việt Nam, năm tháng/ngày nhuận và quy tắc ngày 30 không có/tháng nhuận/29-02 dương lịch; đề xuất ngày không tồn tại thì bỏ năm đó, tháng nhuận chỉ áp dụng khi entry chọn rõ, nhưng chưa tự chọn. Không dùng chuỗi ngày âm với Date JavaScript như ngày dương. Cần duyệt dependency nếu triển khai phải dùng thư viện.

## 8. P5 — Đổi địa điểm

Giữ quy tắc text/tọa độ cùng thay đổi, không tự miễn cascade cho sửa text. Dùng scheduled-change mới có địa chỉ/tọa độ và ngày áp dụng; preview đầy đủ plan/trip/ngoại lệ; tới ngày revalidate rồi cập nhật School, hủy phương án cũ/chuyến chưa vận hành, giữ snapshot Trip đã thực hiện hoặc đang chờ admin.

**Chưa thể chốt contract vì hai quy tắc PO còn cần phân định:** trước đây chỉ đổi khi không có DRAFT/ACTIVE, sau đó giữ yêu cầu đổi địa chỉ hủy mọi phương án. Hai phương án để PO chọn:

- L1: chỉ hẹn/áp dụng nếu không DRAFT/ACTIVE; không cho plan mới vượt mốc đổi trước khi tính với địa chỉ mới. Nếu có plan mới tại apply thì thay đổi bị chặn, không âm thầm hủy; cần thông báo xử lý.
- L2 (đề xuất để tối ưu): cho hẹn khi còn plan; ngày hiệu lực sau hôm nay, preview/xác nhận cascade; đến ngày hủy plan cũ theo chính sách đã chốt. Không tạo plan/lịch vượt mốc trên tọa độ cũ mà không xử lý phiên bản.

PO chưa chọn L1/L2. Chưa chốt ngày đổi tối đa ngoài contract, hủy/đổi ngày chờ, tên/required fields. PATCH /schools/:id/location cũ giữ payload/response nhưng thời điểm thực thi mới có thể là breaking; cần PO chọn hành vi cũ thay vì tự chuyển thành hẹn mà trả như đã đổi.

## 9. P6 — Admin chốt chuyến ngoại lệ

API dự kiến GET /trips/pending-admin-finalization và POST /trips/:id/admin-finalization; không sửa API driver /complete. SYSTEM_ADMIN là đề xuất do account trường inactive không thể dùng, chưa được PO xác nhận.

Nhóm cần xét: IN_PROGRESS tồn từ trước ngày hiệu lực và chiều về SCHEDULED đã có attendance/Ready theo ranh giới PO chốt. Không tự giữ mọi SCHEDULED tương lai. Đề xuất giữ trạng thái Trip + lưu marker lý do chờ admin bằng nullable field mới; không dùng IN_PROGRESS tự động suy ra quá hạn cần khóa khi chỉ đang chạy trễ bình thường.

Trước code cần duyệt:
- Ai chốt, quyền theo trường; final states COMPLETED/CANCELLED hay trạng thái khác?
- Cho phép complete khi PRESENT chưa alightedAt không? Không được tạo attendance/giờ xuống giả; nếu cho exception phải thể hiện admin override tách khỏi xác nhận bàn giao thực tế.
- Đề xuất khóa mutation vận hành, giữ read; PO mới nói admin chốt, chưa đồng ý khóa toàn bộ. Chốt riêng stop GPS/history/navigation và notification thay vì tự dừng theo status cũ.
- Có tiếp tục giữ nguồn lực là busy tới khi admin chốt không? Nếu chỉ quên thao tác thì cần admin giải phóng có kiểm soát, không khóa vô hạn.
- Lý do/audit bắt buộc, expected state/version và idempotency; hai admin không ghi hai kết quả; đóng leave/incidents theo kết quả có kiểm chứng, không xóa lịch sử.

Response đề xuất Trip detail giữ field cũ + thông tin admin finalization nullable (tên chưa chốt); 409 khi trạng thái không còn đủ điều kiện, 400 input/quy tắc, 401/403 quyền, 404 Trip. Không tự sửa actualEndTime thành giờ hiện tại nếu admin xác nhận chuyến đã xong từ hôm qua; PO chọn cách ghi thời điểm thực tế và thời điểm xử lý riêng.

## 10. Tương thích FE/API cũ

| API/nhóm | Giữ | Thay đổi cần duyệt/ghi release note |
|---|---|---|
| GET School/list/settings | Field, kiểu, nullable hiện có | Thêm pending change/effective service metadata nếu duyệt |
| PATCH status/location/schedule | Không bỏ field cũ | Chặn tức thì hoặc dùng effective date; không tự mặc định chưa được duyệt; lỗi cũ/new path phải rõ |
| PATCH contract | Shape response/request cũ | Nới gia hạn thuần có kiểm tra resources; không tự hỗ trợ rút ngắn/đổi kỳ |
| Login/refresh/me | Success payload hiện có | Inactive bị từ chối đúng lifecycle; status cần FE hiện tại xử lý được |
| Parent read | Dữ liệu con/lịch sử, masking cũ | Read-only theo từng con/trường inactive, field mới nếu duyệt |
| Generation/projected schedule | Counters/shape cũ | Eligibility holiday/makeup/inactive và version ngày thống nhất |
| Driver complete/attendance | Contract cũ | Ngoại lệ chờ admin có thể bị chặn; rule cần duyệt, không tự phá luồng bình thường |

Không thể cam kết zero-break vì nghiệp vụ mới chặn thao tác cũ; chưa có PO chấp thuận cụ thể breaking status/location/schedule ở mục 3.2. UI không tự có màn hẹn ngày/ngày nghỉ/admin finalize khi chỉ thêm API; bàn giao contract/PR description để FE tích hợp ở task sau.

## 11. Files dự kiến

- api/prisma/schema.prisma + migration DDL: chỉ sau phê duyệt model/field/index/FK; không migrate hoặc backfill tự ý.
- api/src/schools: controller/service/module, dto status/contract/schedule/location/response; mới scheduled-change controller/service/DTO và lifecycle service.
- api/src/system-settings: controller/service/module; mới calendar controller/service/DTO hoặc module nhỏ riêng nếu được duyệt; không nhồi toàn bộ vào parking service.
- api/src/trips: generation, projected schedule, start/ready/complete/operational-state, snapshot/time utils, controller/DTO cho admin finalize; navigation gate khi policy yêu cầu.
- api/src/routes: cancel/approve/confirm preview và resource-availability.service.ts để giữ tài nguyên/expiry/relocation đúng ngày; không đổi thuật toán tối ưu ngoài phụ thuộc bắt buộc.
- api/src/auth/auth.service.ts và auth.guard.ts: inactive school check cho account trường, me/refresh; không đổi nghiệp vụ cấp lại mật khẩu 3.1.
- api/src/parents, student-requests, leave-notices, students, incidents: school effective-state guard chỉ trên luồng bị ảnh hưởng, không refactor ngoài scope.
- api/src/notifications và overview policy: thông báo đúng người, pending admin backlog, không double notify khi retry.
- docs/architecture/school-management-design.md, tracker, school analysis và LATEST report/diff; ghi contract/FE transition rõ.

Không sửa Web/Mobile/test scripts/.env/package theo plan cơ sở. Không chạy test kể cả pure/unit. Nếu muốn đổi env hoặc package phải hỏi PO trước.

## 12. Trình tự xử lý và nghiệm thu không chạy test scripts

1. Chốt business matrix còn mở ở mục 13, ghi rõ APPROVED/WAITING từng quyết định.
2. Trình contract chi tiết từng endpoint và schema migration tối thiểu; PO duyệt trước edit.
3. Cài logic dữ liệu/chung và từng phần P1–P6 có dependencies; bảo toàn uncommitted work; không commit/push tự ý.
4. Kiểm tra source/diff, npx --no-install tsc --noEmit --incremental false và compile/lint phù hợp (không phải test script). Nếu PO muốn cấm thêm các lệnh này phải tuân theo.
5. Swagger đồng bộ method/path/body/response/errors/roles; kiểm tra GET UI/JSON, không gọi mutations để chứng minh. Server chỉ docs nếu app startup có cron/write side effects, ghi rõ giới hạn thay vì coi runtime đầy đủ.
6. Báo cáo thực tế: static/source checks không chứng nhận calendar conversion, cron, migrations hoặc real races. Runtime/DB/provider mutations NOT_VERIFIED; write-based UAT BLOCKED_BY_TEST_DATA_POLICY đến khi PO cấp quyền/môi trường/dữ liệu và phạm vi rõ. Không script test dưới bất kỳ tên gọi nào.

Tiêu chí nghiệp vụ cần nghiệm thu sau khi được cấp phép: hôm nay không bị sửa; hẹn tới ngày đúng; retry/restart không duplicate/hủy nhầm; calendar âm/dương và precedence đúng; không sinh trên holiday/inactive/ngoài contract; makeup duyệt mới có chuyến; history COMPLETED giữ nguyên; unfinished giữ trạng thái và admin quyết định; account trường bị chặn, Parent đọc con trường inactive nhưng vẫn thao tác cho con trường active; resource extension không chiếm chỗ sai; release không gán xe đang chở trẻ sang chuyến khác; FE fields cũ giữ nguyên.

## 13. Quyết định cần PO duyệt tiếp — trình rõ vấn đề

### D1. Admin xử lý Trip chưa hoàn thành
Hiện PO chỉ chốt giữ trạng thái/admin chốt. Ví dụ Trip còn PRESENT nhưng School inactive chặn giáo viên. Đề xuất SYSTEM_ADMIN được chọn COMPLETED/CANCELLED, bắt buộc lý do/audit, không tự bịa alighting; khóa mutation thường trong lúc chờ. **Cần PO duyệt quyền, kết quả, điều kiện complete và giới hạn khóa**, không tự coi plan request là đồng ý.

### D2. Ngày nghỉ âm/dương và quyền trường
Phải lưu đủ để phân biệt năm/tháng nhuận/ngày không tồn tại. Đề xuất SCHOOL_ADMIN quản lý ngày nghỉ trường, SYSTEM_ADMIN quản lý hệ thống và duyệt học bù; ngày không tồn tại bỏ năm đó. Học bù trùng nonfixed system holiday chưa rõ. **Cần PO chọn actor/precedence/leap rules**, không tự đặt ngày chuyển tiếp hoặc thư viện.

### D3. Đổi địa chỉ
Điều kiện không DRAFT/ACTIVE và cascade hủy plan đang cùng tồn tại trong yêu cầu. Ví dụ trường đang có plan nhưng muốn chuyển từ đầu tháng sau. **Chọn L1/L2 ở mục 8 và ngày hiệu lực/hành vi API cũ**; đề xuất L2 nếu mục tiêu là lên lịch chuyển tiếp.

### D4. API cũ chưa có ngày hiệu lực
Status chỉ isActive, schedule chỉ weeklySchedule, location chỉ địa chỉ/tọa độ. FE cũ không gửi ngày. **PO chọn thêm optional date với default rõ hoặc từ chối hành vi tức thì và hướng API mới**; không thể vừa giữ thực thi tức thì vừa bảo đảm không ảnh hưởng hôm nay.

### D5. Inactive/active lại và hiệu lực tác nghiệp
Đề xuất chặn SCHOOL_ADMIN/BUS_ATTENDANT từ ngày inactive ở guard/me/login/refresh, không đổi isActive User. **Chốt response me khiến FE logout; Session cũ có được dùng khi active lại; hủy lịch inactive trước ngày; Parent unlink và read-only scope; hết contract có khóa account như inactive không**.

### D6. Lưu dữ liệu và scope phụ
**Duyệt hai model mới và audit nullable Trip ở mức thiết kế trước**, rồi mới chốt bảng field cụ thể; chưa phải phê duyệt migration. Chốt có sửa name/image không, có notify đổi giờ không. Nếu chưa duyệt, các phần phụ này không được tự thêm.

### D7. Lịch nghỉ đã có Trip, hủy nghỉ/học bù
PO yêu cầu nonfixed đến ngày mới hủy Trip. Nếu hủy notice trước ngày thì Trip cũ vẫn tồn tại; nếu đã bị hủy không thể tự sinh lại do unique Route/date. **Chốt fixed thêm mới tác động Trip đã sinh khi nào; hủy holiday/makeup trước ngày có phục hồi/cancel Trip nào; từ chối hay quy trình khôi phục riêng**.

### D8. Phạm vi giữ chuyến và nguồn lực
**Chốt SCHEDULED chỉ Ready/toàn ABSENT/có PRESENT thuộc hàng đợi admin nào; xe/người của Trip chưa chốt có được phân công mới không**. Không chọn chính sách chỉ theo status khi dữ liệu điểm danh cho thấy học sinh đã lên xe.

Tất cả D1–D8 là các lựa chọn cần PO quyết định, chưa có field/default/enum hoặc exception mới được tự phê duyệt. Sau khi chốt, cập nhật plan thành contract/schema reviewable trước khi implementation.

## 14. Phản hồi PO và phần giải thích tiếp — 02/11/2026

### 14.1. Quyết định đã nhận

| Nội dung | Quyết định PO / giới hạn |
|---|---|
| Mục 3 persistence | Đồng ý thêm hai model nghiệp vụ đề xuất SchoolScheduledChange và ServiceCalendarEntry. Chưa phê duyệt field/enum/index/FK hoặc chạy migration; cần trình schema cụ thể. |
| D1 | Đồng ý đề xuất: SYSTEM_ADMIN chốt COMPLETED/CANCELLED, có lý do/audit, không tự tạo điểm danh/xuống xe giả; khóa mutation vận hành khi chờ admin theo đề xuất trong plan. Điều kiện hoàn thành khi còn PRESENT chưa alighted và phạm vi GPS vẫn cần contract rõ, không suy diễn an toàn. |
| D2 | Học bù trùng **bất kỳ** ngày nghỉ nào của nhà xe/hệ thống đều không được phép, bao gồm fixed và nonfixed, âm/dương. Được vượt ngày nghỉ trường sau trường đề nghị và SYSTEM_ADMIN duyệt. Các quy tắc tháng nhuận/ngày không tồn tại/quyền tạo nghỉ trường chưa được chốt chỉ bằng phản hồi precedence này. |
| D3/mục 8 | PO yêu cầu giải thích thêm luồng đổi địa điểm; chưa chọn L1/L2. “8” được hiểu theo ngữ cảnh là mục 8 kế hoạch, cần sửa nếu PO chỉ mục khác. |
| D4 | Đồng ý bổ sung ngày vào API cũ. Chưa chọn tên field, required/optional/default hoặc response hẹn so với đã áp dụng. Không tự mặc định ngày mai hoặc tự reject payload cũ. |
| D5 | Parent không cần unlink; không thêm API/flow unlink trong scope. Hết hợp đồng không khóa account. Inactive vẫn theo quyết định khóa account trường trước đó. Không tự xóa endpoint unlink đang tồn tại hoặc suy diễn phải cấm nó mà chưa hỏi. Điều kiện active lại và Session cũ còn cần chốt. |
| D6 | PO đồng ý hướng D6. Ghi nhận đồng ý hướng persistence/phạm vi đã đề xuất; chưa lấy một câu trả lời để tự xác định field/audit shape hoặc gộp quyền triển khai name/image/notification mơ hồ. Khi trình contract sẽ liệt kê cụ thể phần phụ để xác nhận. |
| D7/D8 | Giải thích thêm, chưa chọn cơ chế Trip holiday recovery/giữ nguồn lực. |

Không tự mở rộng thành implementation authorization. Không sửa schema/DB/API/env hoặc chạy script test trong task này.

### 14.2. Mục 8 / D3 — Hẹn đổi địa điểm và phương án đang có

- **Hiện trạng:** có yêu cầu trước chỉ đổi khi không DRAFT/ACTIVE, đồng thời đổi địa điểm hủy các phương án. Chưa xác định có cho phương án hiện tại tiếp tục phục vụ tới ngày chuyển hay không.
- **Tình huống:** ngày 02/11 trường còn plan ACTIVE cho cơ sở A; muốn từ 10/11 dùng cơ sở B. Nếu bắt buộc không có plan ngay 02/11, phải hủy trước, tạo khoảng trống dịch vụ 03–09/11. Nếu chờ 10/11 mới hủy/tính tuyến thì có thể chưa kịp phục vụ.
- **Lựa chọn L1:** chỉ đặt lịch khi đã không còn DRAFT/ACTIVE; đơn giản, nhưng trường đang phục vụ phải hủy trước hoặc đợi hết kỳ. Đến ngày áp dụng vẫn revalidate, không tự coi đã đặt lịch là có thể bỏ qua plan mới.
- **Lựa chọn L2:** cho hẹn khi có plan hiện tại; plan cũ phục vụ tới trước ngày chuyển, không sinh/vận hành chuyến cũ từ ngày chuyển; ngày chuyển hủy plan cũ và đổi School location. Cần chuẩn bị kế hoạch phục vụ địa điểm mới riêng; không cam kết hệ thống đã hỗ trợ preview/approve một plan tương lai với địa điểm chưa có hiệu lực.
- **Đề xuất:** L2. Để đơn giản scope, chỉ cho tạo plan chính thức theo địa điểm mới sau thời điểm đổi; phải công bố có thể gián đoạn. Nếu PO muốn liên tục, cần duyệt thêm preview/approve plan tương lai theo địa điểm/ngày hiệu lực và điều chỉnh quy tắc Trip ngày sau activation; không tự thêm tính năng này vào L2.
- **Cần PO chọn:** L1 hay L2? Nếu L2, có yêu cầu tạo/duyệt phương án mới trước ngày đổi để không gián đoạn không? Việc hủy phương án và chuẩn bị tuyến mới không được giả định tự động tối ưu.

### 14.3. D7 — Ngày nghỉ và Trip đã sinh

- **Hiện trạng:** có thể sinh trước 7 ngày; unique Route/serviceDate giữ cả Trip CANCELLED, generator không tự tạo lại Trip hủy.
- **Tình huống 1:** đã sinh Trip 10/11; ngày 02/11 trường báo nghỉ 10/11. PO yêu cầu tới ngày mới hủy. Có thể giữ Trip SCHEDULED và hiển thị thông tin ngày nghỉ đã báo, không tạo thêm; hủy ở 10/11 nếu entry vẫn hiệu lực. Ngày 08/11 rút thông báo thì Trip gốc chưa bị hủy, tiếp tục bình thường.
- **Tình huống 2:** ngày nghỉ cố định vừa được thêm nhưng Trip tương ứng đã sinh; PO mới chốt không tạo trên ngày đó, chưa chốt hủy Trip có sẵn ngay hay đến ngày. Đề xuất cùng cơ chế đến ngày để không cần phục hồi khi rút trước ngày; chặn Start/Ready theo calendar ngay tại serviceDate để cron chậm không làm chuyến chạy sai.
- **Tình huống 3:** học bù đã duyệt và có Trip nhưng sau đó nhà xe thêm ngày nghỉ. Quy tắc mới buộc không chạy, cần xử lý entry học bù/trip liên quan và thông báo; không âm thầm giữ approval như vẫn phục vụ được. Đề xuất đánh dấu học bù không còn đủ điều kiện (status/field cần duyệt), đến ngày xử lý Trip như ngày nghỉ.
- **Lựa chọn:** H1 tới ngày mới hủy như PO đã nêu, rút trước ngày giữ nguyên Trip hiện có; H2 hủy ngay lúc ghi nhận ngày nghỉ và cần workflow khôi phục nếu rút. H2 thay đổi yêu cầu trước, chỉ làm nếu PO chọn lại.
- **Đề xuất:** H1 cho cả fixed/nonfixed. Nếu Trip đã CANCELLED vì nguyên nhân khác, không tự hồi sinh; admin xử lý riêng. Không tự cho xóa/đổi holiday có hiệu lực hôm nay hoặc quá khứ. Chưa tự cho hủy học bù (khác rút holiday) nếu PO chưa chốt.
- **Cần PO chọn:** H1 có áp dụng cho ngày nghỉ fixed mới thêm không? Khi nhà xe thêm nghỉ trùng học bù đã duyệt, đồng ý giữ hard block và thông báo cho trường để xử lý không?

### 14.4. D8 — Phân loại chuyến chưa hoàn thành và nguồn lực

- **Hiện trạng:** SCHEDULED chiều về có thể đã có học sinh PRESENT, khác SCHEDULED thuần. PO muốn giữ chuyến ngoại lệ/admin chốt, nhưng chưa xác định ngưỡng giữ.
- **Tình huống:** ở đầu ngày inactive vẫn có Trip chiều về hôm trước: chỉ Ready; đã ghi toàn ABSENT; có PRESENT chưa xuống; hoặc đã IN_PROGRESS. Tự coi mọi SCHEDULED là chưa vận hành có thể hủy chuyến đã nhận học sinh.
- **Đề xuất nhóm giữ để admin chốt:** mọi IN_PROGRESS và SCHEDULED có bất kỳ điểm danh thực hiện nào (status khác UNMARKED hoặc markedAt/alightedAt có giá trị). Chỉ Ready nhưng toàn UNMARKED đề xuất hủy theo lifecycle, giữ dấu Ready. Các Trip future chưa có hoạt động hủy theo lịch nghỉ/inactive/expiry, không giữ hàng loạt.
- **Lựa chọn khác:** giữ cả Ready dù chưa điểm danh, admin chốt thêm; thận trọng hơn nhưng nhiều chuyến phải xử lý thủ công. Không tự chốt một trong hai.
- **Nguồn lực:** plan hết hạn hủy nên hết giữ chỗ theo hợp đồng. Tuy nhiên Trip giữ IN_PROGRESS/đã nhận học sinh chưa giải quyết có thể còn đang dùng xe/người thực tế. Hai lựa chọn: R1 tạm không cho phân công mới các tài nguyên Trip chờ chốt cho tới admin xác nhận; R2 giải phóng ngay theo hợp đồng, admin điều phối ngoài hệ thống. R1 giảm nguy cơ gán xe còn chở trẻ nhưng có thể giữ nguồn lực do quên thao tác; R2 dễ trùng thực tế dù plan đã hủy.
- **Đề xuất:** R1; admin chốt kịp thời sẽ giải phóng thực thi, không làm sống lại plan. Không tự chặn cả trường hay mọi nguồn lực không liên quan.
- **Cần PO quyết định:** chỉ Ready có giữ admin chốt không? Có điểm danh thì giữ chờ chốt như trên không? Chọn R1 hay R2 cho tài nguyên của Trip ngoại lệ?

## 15. Chốt D3/D7/D8 — 03/11/2026

### D3 — Phương án cũ chạy tới ngày đổi, rồi hủy để tạo mới

- PO cho phép lên lịch đổi địa điểm khi vẫn có phương án cũ. Trước ngày hiệu lực, phương án cũ tiếp tục phục vụ theo địa điểm cũ; không hủy ngay khi đặt lịch.
- Đến ngày hiệu lực: hủy toàn bộ phương án cũ, áp dụng địa điểm mới rồi tiến hành tạo phương án mới. Không mặc định tự tối ưu/sao chép/kích hoạt phương án mới hoặc cho phương án cũ tiếp tục từ ngày chuyển.
- Quyết định này thay thế điều kiện trước đây phải không có DRAFT/ACTIVE khi lên lịch. Không triển khai nhánh chuẩn bị/duyệt phương án địa điểm tương lai trước ngày đổi từ đề xuất trước; tạo mới sau chuyển là hướng PO chọn.
- Generation và projected schedules phải biết mốc đổi để không hứa dịch vụ cơ sở cũ từ ngày đổi; các Trip đã sinh từ mốc đó xử lý theo hủy chưa vận hành/ngoại lệ đã chốt, không chạm lịch sử COMPLETED.
- **Giới hạn cần nêu rõ trong contract/release note:** hiện generation chỉ sinh ngày sau activation; nếu ngày đổi mới tạo/duyệt plan, chưa có chuyến ngay ngày đổi theo quy tắc cũ. Không tự bỏ next-day rule hoặc thêm dịch vụ cùng ngày; không cam kết liên tục phục vụ khi chưa duyệt thay đổi đó.

### D7 — Đến ngày nghỉ mới hủy Trip đã sinh

- PO đồng ý đề xuất H1 cho fixed và nonfixed: báo trước thì ngừng sinh chuyến cho serviceDate nghỉ; Trip đã tồn tại giữ tới ngày, cần hiển thị lịch nghỉ đã lên kế hoạch.
- Rút/hủy thông báo nghỉ hợp lệ trước ngày: Trip gốc chưa bị hủy tiếp tục bình thường; không tự phục hồi Trip CANCELLED vì nguyên nhân khác.
- Tới ngày nghỉ còn hiệu lực: hủy chuyến chưa vận hành; các chuyến ngoại lệ đã điểm danh/đang chạy giữ cho admin chốt theo D8. Chặn Ready/Start theo calendar ngay cả khi cron đối soát trễ.
- PO đồng ý học bù đã duyệt vẫn bị chặn nếu sau đó nhà xe thêm ngày nghỉ trùng, đồng thời thông báo trường xử lý. Không cho ưu tiên học bù vượt bất cứ ngày nghỉ nhà xe nào. Tên trạng thái/field biểu diễn approval mất khả dụng chưa được tự chốt.

### D8 — Chuyến ngoại lệ và nguồn lực

PO đồng ý bảng phân loại đề xuất và R1:

| Tình trạng tại thời điểm hiệu lực | Hành vi |
|---|---|
| Chưa Ready/chưa điểm danh | Hủy theo lifecycle có liên quan |
| Chỉ Ready, toàn UNMARKED/chưa có điểm danh thực hiện | Cho hủy, giữ dấu Ready và lịch sử |
| Đã có điểm danh, kể cả toàn ABSENT | Giữ nguyên trạng thái để SYSTEM_ADMIN chốt |
| Có PRESENT hoặc IN_PROGRESS | Giữ nguyên trạng thái để SYSTEM_ADMIN chốt |
| COMPLETED/CANCELLED lịch sử | Giữ nguyên |

- Chỉ giữ nhóm Trip thuộc phạm vi sự kiện cần đối soát, không gom mọi Trip bình thường thành pending. Khi viết contract phải định nghĩa rõ dấu điểm danh và serviceDate áp dụng; không dùng dữ liệu giả.
- Phương án hết hạn/hủy hết giữ chỗ theo hợp đồng; nhưng xe/tài xế/giáo viên của Trip ngoại lệ chưa chốt vẫn tạm bị coi là bận, không được phân công mới cho tới admin chốt. Không tự giải phóng chỉ vì plan nguồn CANCELLED.
- D1 vẫn áp dụng: admin audit/lý do và khóa mutation vận hành khi chờ; không tự tạo alightedAt hay ghi đè lịch sử điểm danh để cho qua Complete.

### Các bước còn lại trước implementation

- Hai model đã được PO đồng ý về nhu cầu; trình field/type/enum/constraint/FK/index cụ thể và audit Trip trước schema/DDL.
- Field ngày cho API cũ đã đồng ý bổ sung nhưng chưa chốt tên, required/optional/default hoặc response khi chỉ hẹn; phải hỏi PO.
- Lịch âm: quyền quản lý ngày nghỉ trường/tháng nhuận/ngày không tồn tại và lựa chọn chuyển đổi vẫn cần chốt; không tự cài package.
- Active lại/Session cũ, hủy/đổi lịch hẹn, nội dung/đối tượng thông báo và admin complete khi còn học sinh chưa alighted cần contract rõ. Các phần được duyệt không đồng nghĩa tự chọn field còn phân vân.
- Chưa có yêu cầu triển khai code ở lượt này. Không test script, application/DB/env/package changes.

## 16. Giảm phụ thuộc cron/server chạy đúng giờ — đề xuất thảo luận

- Phân biệt trạng thái hiệu lực với giá trị status đã ghi: một plan có thể còn ACTIVE trong bản ghi nhưng không còn được phục vụ vì hết contract hoặc có lịch inactive/relocation đã đến hạn.
- Tất cả API đọc/phân công/sinh/Start dùng cùng resolver ngày hiệu lực: ngay request đầu tiên sau restart cũng không cho nghiệp vụ cũ tiếp tục, không đợi cron cập nhật CANCELLED. Availability cũng phải bỏ hold của plan hết hiệu lực nhưng giữ busy của Trip ngoại lệ đã chốt D8.
- Không thực hiện hủy Trip/notification/đổi School trên GET. GET tính view hiệu lực thuần; mutation kiểm tra cùng resolver và transactional state, tác vụ đối soát ghi idempotent/catch-up phần persistence/audit/notification.
- Lịch projected tương lai dùng effective date của serviceDate. Vị trí mới tới ngày nhưng School chưa materialize phải được resolver trả đúng cho preview/generation; không được chỉ tính plan status mà dùng địa chỉ cũ. Snapshot Trip lịch sử giữ nguyên.
- Có thể duy trì response status theo nghiệp vụ hiệu lực hoặc thêm effective status/meta, nhưng mỗi cách tác động FE khác; phải trình PO tên/kiểu/ngữ nghĩa trước code. Không tự thêm field hoặc âm thầm thay status cũ.
- Lợi ích: không phụ thuộc tick chính xác ở 00:00, restart không mở lại dịch vụ sai và GET không mutate. Giới hạn: direct SQL thấy status persisted có thể chưa đối soát; thông báo/DB audit thực thi chỉ có khi có tiến trình chạy.
- Nếu yêu cầu database phải đổi CANCELLED đúng thời điểm dù API tắt, cần một worker/scheduler độc lập (ngoài API hoặc trong DB). Vẫn có tiến trình hạ tầng phải chạy; không phải giải pháp không cần server nào. Không cài công cụ/cron bên ngoài trong task này.
- Đề xuất cho scope dự án: effective-state resolver dùng chung + cron đối soát/catch-up hiện có; không thêm worker độc lập trừ khi có yêu cầu vật lý đúng giờ. Chưa được PO duyệt, chưa triển khai.

## 17. Triển khai sau phê duyệt — 03/11/2026

PO duyệt toàn bộ nghiệp vụ 3.2, schema/field hai model và Trip.adminFinalization; chỉ tạo DDL, chưa apply DB. Duyệt effectiveDate optional mặc định ngày mai; scheduledChangeId/effectiveDate/changeStatus; RoutePlan effectiveStatus/effectiveStatusReason (CONTRACT_EXPIRED/SCHOOL_INACTIVE/LOCATION_CHANGED/null); calendar effectiveStatus/effectiveStatusReason (OPERATOR_HOLIDAY/null); amlich.js cho API. Không sửa tên/ảnh; có thông báo đổi lịch; không test scripts.

Checkbox dưới đánh dấu **đã viết source**, không phải VERIFIED/deployed:

- [x] P1: SchoolScheduledChange, ServiceCalendarEntry, Trip.adminFinalization; migration DDL; resolver hiệu lực và chuyển đổi âm/dương UTC+7.
- [x] P2: inactive theo ngày, reactivate, chặn tài khoản trường theo hiệu lực, buộc login mới, giữ Parent đọc lịch sử và chặn mutation theo con/trường.
- [x] P3: gia hạn có kiểm tra phân công/giữ chỗ; hết hạn hủy phương án, giữ route/history, không hồi sinh khi gia hạn; nguồn lực ngoại lệ giữ tới admin chốt.
- [x] P4: lịch tuần từ ngày mai, đọc/sinh theo ngày phục vụ; holiday hệ thống/trường, annual/once âm/dương; trường đề nghị học bù, nhà xe duyệt, hard block theo nghỉ nhà xe; lịch đã sinh giữ tới ngày nghỉ.
- [x] P5: lịch đổi địa điểm, trước ngày dùng cũ, đến ngày hủy plan cũ rồi tạo mới; chặn preview cũ khi thông tin trường thay đổi.
- [x] P6: danh sách/admin chốt Trip ngoại lệ; audit độc lập điểm danh; guard vận hành/GPS, notifications, Swagger và note FE.
- [x] Apply migration DB: PO đã cho phép và đã apply vào local roadtoschool/public (localhost:5432), 03/11/2026; migrate status up to date.
- [ ] Nghiệm thu runtime/FE, lịch âm, cron catch-up, concurrent writes: NOT_VERIFIED; không chạy script test hay gọi API ghi dữ liệu.

Contract thực tế/API và giới hạn: [school-3.2-fe-pr-notes.md](school-3.2-fe-pr-notes.md). Các API preview tổng quát/preview gia hạn trong phần dự kiến chưa có contract field được chốt; không bổ sung vào release này. Không có workflow hủy học bù hoặc name/image ngoài phạm vi đã duyệt.

Giới hạn vận hành: logic hiệu lực không chờ cron; persistence/notifications cần tiến trình chạy. Endpoint GET không gọi đối soát. Swagger UI/JSON kiểm tra bằng server chỉ phục vụ tài liệu, không khởi động DB hooks/cron. Lịch sử plan/Trip đã hủy không tự khôi phục. Quy tắc ngày sau activation được giữ, có thể gián đoạn dịch vụ ngày chuyển địa điểm.
