# Thông báo và Tổng quan Admin — thiết kế kết hợp

Ngày27/10/2026, Asia/Saigon. Chế độ DISCUSSION / DESIGN. PO muốn làm kèm trang Tổng quan cho System Admin và School Admin với hạng mục notification. Chưa có yêu cầu thực thi hoặc prompt trong lượt này.

## 1. Mục tiêu và hiện trạng

Thông báo trả lời “việc gì vừa xảy ra, bấm vào xử lý ở đâu”; Tổng quan trả lời “hiện có bao nhiêu việc cần làm và tình hình vận hành ra sao”. Hai phần dùng chung định nghĩa sự cố/actionability/permission và navigation targets, không dùng cùng một số đếm cho mọi mục đích.

Source tại thời điểm đọc:
- `/admin` đã có menu Tổng quan cho cả hai admin, component `web/src/app/admin/page.tsx` chỉ có tiêu đề và khung trống theo quyết định wireframe cũ.
- Header Web dùng chung, phù hợp thêm chuông notification ở scope đã đề xuất.
- Đã có trips/routes/leave/student requests và source module/model TripIncident. LATEST mới là báo cáo Antigravity triển khai sự cố, chưa được Codex nghiệm thu runtime ở task này.
- Chưa tìm thấy module dashboard/overview thống kê trong API qua rà source. Không suy ra các API list đủ dùng cho aggregate; không tải mọi trang list về frontend để đếm.

Đề xuất Tổng quan là landing page `/admin` hiện có, không tạo menu thứ hai hoặc biến thành báo cáo phân tích đầy đủ. Không thay cấu trúc3projects.

## 2. Bố cục version đầu

1. Header tên trang + bộ chọn ngày; System Admin thêm dropdown trường, School Admin cố định trường từ tài khoản.
2. Khối Cần xử lý, ưu tiên sự cố thiếu nhân sự, rồi báo nghỉ và các hồ sơ/phương án chờ người có quyền xử lý.
3. Bốn thẻ thống kê Trip theo ngày: Chờ khởi hành / Đang chạy / Hoàn thành / Đã hủy. Có tổng Trip trong tiêu đề.
4. Bảng Chuyến cần chú ý: tối đa5–10dòng trong ngày đã chọn, ưu tiên chờ phân công và đang chạy; link Xem tất cả. Trên ngày hiện tại, có vùng riêng nhắc Trip IN_PROGRESS từ ngày trước nếu còn tồn tại, không âm thầm bỏ vì serviceDate hoặc scheduledEndAt đã qua.
5. Các số liệu quản lý cơ bản phù hợp role. Có thể bổ sung biểu đồ7ngày nhỏ sau khi PO chọn, không bắt buộc thư viện chart.

Không cần fleet map, dashboard widget tùy biến, xuất Excel/PDF hoặc bộ lọc nhiều tầng trong version đầu. Đây là scope định hướng để tránh biến Tổng quan thành module báo cáo lớn.

## 3. Nội dung theo vai trò

### System Admin

Phạm vi mặc định toàn hệ thống, chọn một trường để thu hẹp vận hành/hồ sơ liên quan trường đó.

**Cần xử lý:**
- Sự cố DRIVER_MISSING đang chờ xử lý, Trip còn trạng thái cho admin xử lý hoặc hủy.
- Báo nghỉ Driver chờ phân công.
- Yêu cầu cập nhật học sinh thuộc quyền System Admin, đặc biệt ADDRESS_UPDATE khi có tuyến hiệu lực. Không đưa các hồ sơ role này không được phép xử lý vào số “cần xử lý”.
- Phương án DRAFT do System Admin tạo chỉ là “Chờ trường duyệt”, không nút Duyệt và không đếm như tác vụ admin này được duyệt.

**Số liệu quản lý:**
- Trường đang hoạt động; phương án ACTIVE và DRAFT chờ trường duyệt theo scope.
- Tổng xe và tài xế đang active theo model thực tế, ghi label đúng. Vehicle hiện không có status active thì chỉ ghi “Phương tiện”, không giả field trạng thái.
- Không gọi “xe rảnh/tài xế rảnh” chỉ vì không có Trip hôm nay; availability phụ thuộc khoảng giờ/reservation/Trip đang chạy. Nếu PO muốn phần này, dùng validator hiện có cho khoảng cụ thể và thiết kế riêng.
- Khi lọc trường, xe/tài xế là tài nguyên nhà xe chung: giữ số toàn hệ thống ở khối ghi rõ “Nguồn lực nhà xe”, không ngụ ý thuộc riêng trường đó.

### School Admin

Chỉ trường mình, không dropdown chọn trường khác. Backend không tin schoolId do client gửi.

**Cần xử lý:**
- Sự cố ATTENDANT_MISSING của trường đang chờ xử lý.
- Báo nghỉ Bus Attendant chờ phân công.
- Yêu cầu cập nhật thuộc quyền School Admin: thông tin hoặc địa chỉ khi chưa có tuyến hiệu lực, theo quy tắc đã chốt. Địa chỉ đã có tuyến hiệu lực không thành việc School Admin được duyệt.
- RoutePlan DRAFT cần School Admin duyệt, kể cả có blockers readiness; bấm mở chi tiết readiness, không tự coi DRAFT là sẵn sàng duyệt. Chỉ School Admin có quyền activate.

**Số liệu quản lý:**
- Học sinh AVAILABLE, học sinh chưa có tuyến hiệu lực, Giáo viên active, phương án ACTIVE/DRAFT.
- “Chưa có tuyến” là học sinh AVAILABLE không có membership RouteStop trong DRAFT/ACTIVE hiệu lực theo quy tắc phân tuyến; không suy từ StudentStatus hoặc không có Trip hôm nay. Đếm distinct student, không cộng chiều đi+về thành2học sinh.
- Phương án CANCELLED/EXPIRED không tính là học sinh đã được bố trí tuyến đang hiệu lực.

## 4. Định nghĩa số liệu, không đếm lẫn nhau

| Số liệu | Định nghĩa / phạm vi |
|---|---|
| Tổng Trip theo ngày | Trip thật có serviceDate=ngày chọn và school scope; không bao gồm lịch Dự kiến chưa sinh Trip |
| Chờ khởi hành | Trip SCHEDULED, gồm cả chờ phân công và quá giờ chưa chạy; không gọi tất cả là sẵn sàng Start |
| Đang chạy / Hoàn thành / Đã hủy | Status IN_PROGRESS / COMPLETED / CANCELLED cùng ngày/scope |
| Chuyến chờ bố trí | Distinct Trip SCHEDULED có ít nhất một staff leave/incident blocker; là tập con Chờ khởi hành, không cộng như trạng thái thứ5 |
| Sự cố cần admin xử lý | Manual missing incident mở, đúng role/school, còn hành động hợp lệ; không gồm auto pending do Giáo viên phải xác nhận |
| Sự cố chờ Giáo viên xác nhận | Chỉ số theo dõi riêng nếu hiển thị; không biến thành nút admin xác nhận thay hoặc làm đỏ chuông admin cần xử lý |
| Báo nghỉ chờ bố trí | Staff LeaveNotice pending đúng nhóm role; Student RECORDED không phải hồ sơ cần duyệt |
| Yêu cầu chờ xử lý | StudentUpdateRequest PENDING với quyền xử lý thực tế, không raw count mọi PENDING |
| Phương án chờ duyệt | DRAFT trong scope; School Admin là tác vụ, System Admin là trạng thái chờ trường |

Nếu mọi Trip có4status chuẩn, tổng4cards bằng totalTrip. Counts hồ sơ và counts Trip khác đơn vị: một Trip có cả báo nghỉ và incident có thể2hồ sơ nhưng chỉ1chuyến chờ bố trí. Label phải rõ.

**Tách phạm vi thời gian:**
- Thống kê Trip/bảng theo ngày chọn, mặc định hôm nay Asia/Ho_Chi_Minh.
- Cần xử lý lấy mọi hồ sơ đang chờ, kể cả hồ sơ từ hôm trước hoặc chuyến sắp tới; có nhãn “Đang chờ · Tất cả ngày”. School filter vẫn áp dụng.
- Nguồn lực và học sinh/phương án là hiện trạng, không đổi theo bộ chọn ngày vận hành; đặt khối “Hiện trạng” để không ngụ ý truy vấn as-of date trong quá khứ.
- Một xu hướng7ngày nếu bổ sung là7serviceDates kết thúc tại ngày chọn, ghi rõ phạm vi; không trộn ngày tạo incident với serviceDate của Trip. Metric late/on-time chưa đủ bằng chứng không trình bày thành KPI chính xác.

## 5. Click vào thẻ/việc sẽ đi đâu

| Mục trên Tổng quan | Đích |
|---|---|
| Card Chờ khởi hành | Trang Chuyến xe, lọc SCHEDULED/ngày/trường |
| Card Đang chạy | Chuyến xe, lọc IN_PROGRESS/ngày/trường |
| Card Hoàn thành/Đã hủy | Chuyến xe, status tương ứng/ngày/trường |
| Sự cố cần xử lý | Sự cố, lọc đúng missing type/pending/school; chọn một dòng thì modal xử lý |
| Báo nghỉ cần bố trí | Báo nghỉ, đúng tab Driver/BusAttendant và pending/school |
| Yêu cầu cập nhật | Yêu cầu, PENDING với server action scope đúng role; chọn hồ sơ mở modal |
| Phương án chờ duyệt | Phương án DRAFT; từ dòng cụ thể mở chi tiết/readiness |
| Học sinh chưa có tuyến | Học sinh của trường, filter chưa có tuyến hiệu lực |
| Dòng Trip | Chi tiết đúng Trip theo quyền |

Một phần trang list hiện chưa đọc URL query để khởi tạo bộ lọc/modal; phải hỗ trợ deep link thực sự khi triển khai, không chỉ gắn query rồi trang vẫn hiển thị tất cả. Giữ context ngày/trường khi quay lại.

Không mutation trên card hoặc notification click. Chọn modal phải fetch/revalidate quyền/status mới nhất, hồ sơ đã xử lý mở readonly hoặc cập nhật lại list.

## 6. Đồng bộ với notification

- Chuông là global theo toàn phạm vi tài khoản; System Admin đang lọc Tổng quan một trường không làm chuông quên sự cố ở trường khác.
- Cùng scope và cùng thời điểm, count sự cố ở chuông/Tổng quan/list dùng cùng predicate nghiệp vụ. Khác scope có thể khác số và phải ghi nhãn, không ép mọi số bằng nhau.
- unreadCount là số inbox chưa đọc per-recipient; actionableIncidentCount là số hồ sơ cần xử lý, không đếm notification fan-out. Mark all read không xóa task trên Tổng quan hoặc gỡ chuông đỏ.
- Notification sự cố→modal tương ứng; Tổng quan sự cố→cùng danh sách/modal. Dùng chung typed target resolver/helpers, không tự thêm URL arbitrary.
- Sau xử lý ở bất cứ nơi nào, Summary/card/bell cập nhật qua invalidation hoặc lần poll kế tiếp; không bắt refresh tay. Phản hồi command làm invalidate cùng scope, không optimistic tự giảm sai khi server từ chối.
- Row task có thể pending lâu dù notification đã đọc. Auto incident đã xác nhận không phát thêm sự kiện mỗi lần Dashboard GET.

## 7. Wireframe

Số bên dưới là ký hiệu minh họa, không dữ liệu DB hoặc kết quả kiểm thử.

```text
TỔNG QUAN                  [Trường ▾ — System] [Ngày 📅]

CẦN XỬ LÝ · TẤT CẢ NGÀY
[⚠ Sự cố: n] [Báo nghỉ: n] [Yêu cầu: n] [Phương án: n*]

CHUYẾN TRONG NGÀY                              Tổng: n
[Chờ khởi hành n] [Đang chạy n] [Hoàn thành n] [Đã hủy n]
  Trong đó n chuyến chờ bố trí

CHUYẾN CẦN CHÚ Ý                          [Xem tất cả]
Giờ | Chuyến | Trường* | Nhân sự | Trạng thái | [Xem]
... tối đa5–10dòng ...

HIỆN TRẠNG
System: Trường hoạt động | Phương án ACTIVE/DRAFT
        Nguồn lực nhà xe: Phương tiện | Tài xế active
School: Học sinh AVAILABLE | Chưa có tuyến | Giáo viên active
        Phương án ACTIVE/DRAFT

* Phương án là Chờ trường duyệt cho System, Cần duyệt cho School.
* School Admin không có dropdown/cột trường nếu dư thừa.
```

Chuông vẫn trên shared header, không đặt lại chuông trong Dashboard body. Cards responsive4→2→1columns; cùng brand tokens, dropdown/date picker hiện có, minimal copy. Empty/loading/error khác nhau; API lỗi không hiển thị số0 giả. Số0 hợp lệ vẫn giữ card, task panel có thể ghi “Không có việc chờ xử lý”.

Biểu đồ7ngày là tùy chọn dưới cùng sau khi PO chốt, dùng cột stacked status với label/count; không mặc định chart chiếm phần trên hoặc thêm dependency.

## 8. Database và API định hướng

Tổng quan **không cần thêm bảng thống kê** trong version đầu. Aggregate read-only từ Trip/TripIncident/LeaveNotice/StudentUpdateRequest/RoutePlan/Student/User/Vehicle/School đã có. Notification inbox/token persistence vẫn là hạng mục DB riêng cần thiết kế/phê duyệt, không coi trang Tổng quan là lý do tự tạo thêm bảng.

API đề xuất `GET /api/v1/admin/overview?serviceDate=YYYY-MM-DD&schoolId=...` cho2admin:
- role/scope/serverNow/generatedAt và date VN chuẩn.
- tripCounts4status,total,waitingAssignmentSubset.
- tasks counts theo action role, từng khối kèm scope thời gian và target có thể điều hướng.
- attentionTrips bounded và stale-running indicator cho ngày hiện tại.
- inventory hiện trạng theo role, tùy chọn status distribution/trend nếu được duyệt.

`GET /notifications/summary` vẫn trả unread và global actionable count độc lập school filter Dashboard. Cả hai dùng common permission/actionability predicates; không đặt unread state vào bảng business.

School Admin lấy schoolId từ authenticated user, từ chối query trường khác; không trả số liệu/tổng/nhãn trường ngoài scope. System school filter phải validate. Date validation/lower-upper query bounds/pagination server-side. Không filter phân quyền bằng frontend.

Tính counts bằng DB count/groupBy/distinct phù hợp và query bounded, không N+1, không load mọi records rồi `.filter` để thống kê. Reuse chỉ mục hiện có, đánh giá kế hoạch truy vấn trước thêm index. Có generatedAt để biết độ mới, tránh hứa snapshot tuyệt đối khi nhiều aggregate requests chạy thời điểm khác.

Poll đề xuất15–30giây khi visible/foreground, refresh khi focus hoặc command hoàn tất; Header và Dashboard dùng shared summary fetcher/store để tránh duplicate loops. Không cần Redis/WebSocket/new chart package. Poll chỉ GET an toàn, không sinh Trip hay incident, không tự expire plan để tính counts.

## 9. Phạm vi và bước review tiếp

Version đầu đề xuất:4trip cards + Cần xử lý + bounded attention table + inventory role-specific, cùng notification bell/inbox/push đã chọn. Biểu đồ7ngày/báo cáo chuyên sâu và browser Web Push cho admin chờ PO chọn riêng.

Chưa code/mock UI runtime/migrate/cài dependency/gửi push hoặc test business mutations. Việc Antigravity báo sự cố IMPLEMENTED không đồng nghĩa Codex đã nghiệm thu detector/provider. Dashboard chỉ dùng status/data thật và thể hiện rõ metric, không nâng claim tính chính xác ETA.

Bước tiếp: PO review bố cục và số liệu version đầu cùng ma trận notification, rồi mới chốt DB/API chi tiết và prompt triển khai chung. Không tự tạo prompt implementation ở lượt ý tưởng này.

## Implementation addendum — 27/10/2026

PO đã yêu cầu Codex trực tiếp thực thi thiết kế này và duyệt riêng một bảng Notification, token nullable theo Session, migration additive, dependency Expo push cần thiết. Quyết định cuối: push tắt mặc định và bàn giao hướng dẫn cấu hình EAS/FCM/APNs, không gửi push thử. Các mô tả “chưa code/chưa duyệt” phía trên ghi lại thời điểm thiết kế, không mô tả trạng thái hiện tại.

Đã triển khai Tổng quan /admin, GET overview aggregate, inbox Web/Mobile, chuông unresolved độc lập unread, typed target kiểm quyền lại, event hooks trong transaction nghiệp vụ và outbox worker có receipt/retry. Chỉ một bảng Notification mới; không có bảng metrics/device/outbox riêng. Role-specific backlog toàn thời gian, số Trip theo ngày phục vụ, inventory hiện tại; bốn trạng thái là partition của actual Trip, waitingAssignment là subset của SCHEDULED. Gắn bộ lọc thật vào deep link các trang liên quan. Không thêm biểu đồ hoặc thư viện UI.

Notification mới chỉ được ghi từ sự kiện nghiệp vụ sau triển khai, không backfill. Mobile foreground chỉ cập nhật inbox, không thêm popup thay thế cơ chế sự cố hiện có. Parent không nhận lý do nội bộ; hồ sơ cập nhật chỉ gửi kết quả cho người tạo do quyền detail hiện tại. Push chưa cấu hình native và chưa nghiệm thu thiết bị. Xem LATEST.md và notifications-push-setup.md để biết evidence và giới hạn, không coi bundle/unit tests là bằng chứng OS delivery.
