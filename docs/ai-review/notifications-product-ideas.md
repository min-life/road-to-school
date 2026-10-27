# Thông báo — ý tưởng kênh, sự kiện, nội dung và điều hướng

Ngày27/10/2026, Asia/Saigon. DISCUSSION / PRODUCT DESIGN, không prompt thực thi, không sửa ứng dụng/DB hoặc gửi push. Ma trận dưới đây là đề xuất để PO chọn, không tự phê duyệt mọi sự kiện.

> Bổ sung theo PO: notification sẽ được thiết kế cùng trang Tổng quan cho System Admin và School Admin để xem nhanh thống kê. Xem `notifications-admin-overview-design.md` cho bố cục, số liệu, quyền, click targets và phần dùng chung với chuông. Đây vẫn là giai đoạn thiết kế, chưa chỉ thị code.

## 1. Ba bề mặt dùng chung một nguồn thông báo

- Web: chuông trên header, bấm mở popover giống cách YouTube trình bày danh sách. Có tab Tất cả / Cần xử lý và nút đánh dấu đã đọc. Có thể có Xem tất cả mở trang riêng khi danh sách dài.
- Mobile: icon chuông nhỏ ở góc phải header các màn bottom tab; bấm mở trang con Thông báo. Không tạo bottom tab Thông báo riêng, không nhét vào tiện ích. Các tab tracking/schedule hiện custom header/headerShown:false phải đặt chuông ở header của chúng, không bật thêm native header gây trùng.
- Push ngoài app: đề xuất dùng cho3roles mobile Driver/BusAttendant/Parent. Admin vẫn dùng Web; browser Web Push là scope riêng nếu PO muốn, không giả định họ có Mobile Admin.
- Một sự kiện có thể tạo thông báo trong app và push cho cùng người. Push tap mở đúng nội dung của notification đó, không tạo bản ghi thông báo thứ hai.
- Thông báo chỉ giúp biết và đi tới thao tác; không click để tự duyệt/thay người/hủy/xác nhận sự cố. Các mutation vẫn ở UI nghiệp vụ đã có.

## 2. Chuông đỏ và chưa đọc là hai khái niệm

- Web đỏ khi **có sự cố còn chờ chính role đó xử lý**, scope trường/role đúng. Đếm incident nghiệp vụ duy nhất, không đếm Notification rows hoặc số admin nhận cùng thông báo.
- School Admin: ATTENDANT_MISSING đang mở thuộc trường. System Admin: DRIVER_MISSING đang mở. Auto incidents đang chờ Giáo viên xác nhận không làm đỏ chuông admin vì admin không có quyền xác nhận thay.
- Đã bấm xem/Đánh dấu tất cả đã đọc không làm hết đỏ. Chỉ hết đỏ khi sự cố được xử lý/đóng/hủy Trip theo nghiệp vụ.
- Chưa đọc hiển thị chấm hoặc số riêng (ví dụ99+), không coi đã đọc là đã xử lý. API summary trả unreadCount và actionableIncidentCount riêng. Bell có thể icon đỏ + unread badge trung tính, với label/trợ năng giải thích rõ.
- Mobile đề xuất chấm nhỏ cho chưa đọc; nếu Giáo viên còn auto incident cần xác nhận, có thể dùng đỏ cho pending action riêng, không biến Driver/Parent thành người xử lý.
- Báo nghỉ chờ phân công và yêu cầu hồ sơ chờ duyệt có thể ở tab Cần xử lý, nhưng **không làm đỏ vì sự cố** nếu PO chưa mở rộng định nghĩa.

## 3. Ma trận sự kiện đề xuất

Quy ước: “inbox” là thông báo Web/Mobile theo role. Push ở đây chỉ Mobile. Mỗi thông báo tạo sau business transaction thành công; bỏ qua/no-op retry không tạo sự kiện mới.

| Khi nào | Người nhận | Nội dung mẫu trong app | Push đề xuất | Khi bấm |
|---|---|---|---|---|
| Driver báo Giáo viên chưa đến | School Admin đúng trường | “Giáo viên chưa đến · Tuyến Đi 01” | Không, admin Web | Web Sự cố, chọn đúng hồ sơ, mở modal xử lý nếu còn pending |
| Giáo viên báo Driver chưa đến | System Admin | “Tài xế chưa đến · Tuyến Về 01” | Không, admin Web | Web Sự cố, modal xử lý hồ sơ tương ứng |
| Server tạo OFF_ROUTE hoặc LATE_STOP | Giáo viên hiện assigned | “Chuyến có sự cố cần xác nhận” kèm loại trong inbox | Có, một lần mỗi incident | Trip Detail, mở popup đúng incident nếu vẫn pending và có quyền; đã xử lý thì mở tab Sự cố readonly |
| Admin ARRIVED hoặc REPLACED giải quyết báo thiếu người | Người báo và staff còn liên quan | “Sự cố nhân sự đã được xử lý · Tuyến Đi 01” | Có cho người bị ảnh hưởng còn cần biết | Người báo xem chi tiết lịch sử cá nhân; staff hiện assigned mở Trip Detail |
| Được phân công thay Driver/Giáo viên | Người mới được phân công | “Bạn được phân công chuyến Tuyến Đi 01 · 06:30” | Có | Trip Detail của chuyến mới |
| Bị thay khỏi chuyến | Nhân sự cũ | “Phân công chuyến Tuyến Đi 01 đã thay đổi” | Có | Chi tiết thông báo tối giản hoặc lịch cá nhân; không mở lại Trip nếu đã mất quyền |
| Giáo viên xác nhận sự cố tự động | Staff đang tham gia Trip | Cập nhật cùng hồ sơ sang “Đã xác nhận”; không cần gửi thông báo mới cho chính người xác nhận | Không | Tab Sự cố; admin chỉ xem nếu cần qua nghiệp vụ, không broadcast toàn hệ thống |
| Driver/Giáo viên xác thực báo nghỉ thành công | Admin phụ trách đúng nhóm | “Có báo nghỉ tài xế/giáo viên cần bố trí” | Không, admin Web | Tab Báo nghỉ, đúng hồ sơ và modal thay người |
| Học sinh có báo nghỉ đã ghi nhận hoặc hủy | Các Parent liên kết khác còn quyền; staff assigned nếu cần | “Báo nghỉ của con đã được ghi nhận/hủy” | Mặc định không | Chi tiết báo nghỉ; Parent scope đúng học sinh |
| Staff báo nghỉ được bố trí thay/hủy hợp lệ | Người báo | “Báo nghỉ đã được bố trí thay thế” / “Báo nghỉ đã hủy” | Bố trí thay: có; tự hủy của chính mình: không | Chi tiết báo nghỉ/history, không yêu cầu còn quyền Trip để xem hồ sơ của mình |
| Trip được hủy bởi incident/leave/plan/location/expiry | Driver/Giáo viên assigned và Parent có con trong Trip, admin liên quan khác người thao tác | “Chuyến Tuyến Đi 01 ngày27/10 đã hủy” | Có cho staff/Parent | Trip Detail trạng thái CANCELLED theo quyền; group nhiều Trip thì lịch theo ngày hoặc thông báo tổng hợp với danh sách scoped |
| Giáo viên Ready | Driver assigned | “Giáo viên đã sẵn sàng · Tuyến Đi 01” | Có khi ứng dụng không đang ở Trip đó, không nhắc lặp | Trip Detail; không tự Start |
| Driver Start thành công | Parent có con tham gia và Giáo viên assigned | “Chuyến xe đã bắt đầu” | Parent: có; Giáo viên đang trên màn hình: không cần banner push lặp | Trip Detail theo dõi xe; Parent vẫn masking |
| Xác nhận học sinh lên xe | Parent liên kết đúng học sinh | “Con đã lên xe” | Đề xuất inbox trước, tùy chọn push nếu PO muốn | Trip Detail, tập trung trạng thái con; không lộ học sinh khác |
| Xác nhận học sinh xuống xe | Parent liên kết đúng học sinh | “Con đã xuống xe” | Có | Trip Detail, tập trung trạng thái con |
| Driver xác nhận đến trường / Complete | Parent/staff còn liên quan | “Xe đã đến trường” / “Chuyến xe đã hoàn thành” | Mặc định inbox; tránh push nếu vừa nhận Con đã xuống xe | Trip Detail hoặc lịch sử chuyến, không tiếp tục camera live giả |
| Parent gửi yêu cầu cập nhật | Admin có quyền xử lý hiện tại | “Có yêu cầu cập nhật học sinh cần xử lý” | Không, admin Web | Trang Yêu cầu, mở đúng modal; có tuyến hiệu lực chỉ System Admin xử lý địa điểm |
| Yêu cầu cập nhật có kết quả | Parent đã gửi và các Parent liên kết khác nếu còn quyền | “Địa chỉ đã cập nhật” / “Đã cập nhật tuyến” / “Cần phân tuyến lại” / “Yêu cầu bị từ chối” | Có cho kết quả ảnh hưởng đưa đón, không dùng nhãn APPROVED chung che outcome | Chi tiết yêu cầu ở Mobile; resolution được hiển thị đúng, không expose rejection/internal text trên lock screen |
| Phương án DRAFT được gửi duyệt | School Admin trường | “Phương án tuyến mới cần duyệt” | Không | Chi tiết RoutePlan, phần readiness/duyệt |
| School Admin kích hoạt hoặc admin hủy phương án | Admin phía còn lại có liên quan | “Phương án đã được duyệt/hủy” | Không | RoutePlan Detail; không mở modal thao tác đã hết hiệu lực |

Không tự gửi notification cho người vừa thao tác thành công chỉ để lặp toast. Mọi recipients được xác định theo role/school/assignment/link tại event và quyền hiện tại lúc đọc/click; không phát cho tất cả users cùng role trong toàn hệ thống.

Các mốc boarding/alighting là xác nhận nghiệp vụ của staff, khác xe chạy ngang stop. **Không có thông báo khi đi qua điểm dừng**, GPS mỗi tick, reroute mỗi lần, Auto/Joystick di chuyển, mỗi lần poll, hoặc nhắc Ready/Start mỗi phút. Nhắc hợp đồng sắp hết/chuyến sắp chạy và email/SMS ngoài OTP để phase sau nếu PO muốn.

## 4. Quy tắc push tránh gây phiền

- Push nhóm cần hành động/thay đổi chuyến: sự cố chờ Giáo viên, phân công thay thế, hủy Trip, Ready cho Driver trước Start, chuyến Start/child alight cho Parent, kết quả yêu cầu quan trọng.
- Không push popup hành động cho Driver khi đang lái; sự cố auto thuộc Giáo viên. Thông tin Driver trong hành trình ưu tiên inbox, trừ thay đổi vận hành phù hợp (không tạo quy trình SOS mới).
- Một event/recipient tạo một inbox notification, unique dedupe. Retries kỹ thuật không tạo inbox mới. Push delivery không bảo đảm exactly-once, cần dedupe/collapse phù hợp và không bịa cam kết chắc chắn.
- App đang foreground đúng Trip/modal liên quan: cập nhật inbox/badge và UI, không hiện thêm OS banner trùng popup nếu client/platform handler kiểm soát được. App khác màn hình có thể banner nhẹ; mở lại app reconcile từ server.
- Push TTL/expiry theo hành động: Ready/confirm không có giá trị tương tự mãi. Incident/Trip đã đóng thì tap vào lịch sử thay vì mở action cũ. Khi worker sắp gửi phải revalidate nội dung/quyền/actionability, không gửi reminder stale sau xử lý.
- Lock screen dùng nội dung ngắn, hạn chế tên trẻ/địa chỉ/lý do nội bộ. Payload chỉ notificationId và target type/id không nhạy cảm, không token truy cập. Lý do sự cố không gửi Parent ở bất cứ kênh nào.
- Người dùng từ chối push vẫn có inbox/badge. Không hỏi quyền OS mỗi lần vào app; xin trong ngữ cảnh phù hợp, có mục bật/tắt trong Cá nhân.

## 5. Điều hướng an toàn

Một notification có target kind + id/server-resolved action, không lưu arbitrary external URL để router mở trực tiếp. Ví dụ TRIP / INCIDENT / LEAVE_NOTICE / STUDENT_REQUEST / ROUTE_PLAN / PERSONAL_SCHEDULE.

Luồng tap: xác nhận session → nếu cần login thì giữ notificationId → fetch notification/target mới nhất → kiểm quyền hiện tại → mở đúng màn và focus hồ sơ. Không auto-submit confirm/approve/delete.

- Incident cần admin: Web incidents list + selectedIncidentId, mở modal xử lý còn hợp lệ; đã resolved thì modal/detail readonly.
- Incident cần Giáo viên: Trip Detail + incidentId, popup chỉ khi còn pending và current assigned Giáo viên; nếu họ đã để sau thì tap explicit là mở lại cùng hồ sơ.
- Incident chưa confirm không phải mục lịch sử mine, nhưng notification vẫn được dẫn vào Trip Detail vì hai tập dữ liệu khác mục đích.
- Staff mất assignment: thông báo thay phân công dẫn lịch cá nhân/thông báo tối giản, không cố dùng history incident làm quyền đọc Trip.
- Parent mất link/học sinh bị loại khỏi Trip/phạm vi không còn hợp lệ: không expose payload cũ; hiển thị “Nội dung không còn khả dụng” và trở lại Thông báo/Lịch hợp lệ.
- Nhóm nhiều Trip bị hủy bởi một thao tác: thông báo tổng hợp theo người/ngày, mở lịch/filter hoặc trang chi tiết thông báo tổng hợp; không spam một loạt push khi cancel Plan. Record nhóm phải có danh sách IDs scoped hoặc target lịch, không deep link một Trip ngẫu nhiên.
- Chỉ mark read khi người dùng chủ động bấm/đánh dấu; mở chuông không tự mark tất cả. Mark read không xử lý incident. Server delivery/receipt thành công cũng không có nghĩa user đã đọc.

## 6. Wireframe

### Web

```text
RoadToSchool                          [Chuông đỏ · số chưa đọc] [Tài khoản]
                                      ┌────────────────────────────────┐
                                      │ Thông báo           [Đã đọc tất cả]│
                                      │ [Tất cả] [Cần xử lý]             │
                                      │ ⚠ Tài xế chưa đến                │
                                      │   Tuyến Về 01 · 2 phút trước     │
                                      │ ✓ Phương án đã được duyệt        │
                                      │   Trường … · 20 phút trước       │
                                      │             [Xem tất cả]        │
                                      └────────────────────────────────┘
```

Nếu actionableIncidentCount>0, có hàng ghim “Có N sự cố chưa xử lý” dẫn list incidents theo scope. Hàng này là summary nghiệp vụ, không một notification giả cần mark read.

### Mobile

```text
Trang chủ / Lịch / Theo dõi / Cá nhân          [Chuông •]
```

```text
← Thông báo                              [Đã đọc tất cả]
[Tất cả] [Chưa đọc]
Hôm nay
⚠ Chuyến có sự cố cần xác nhận
  Tuyến Đi 01 · 2 phút trước
🚌 Chuyến xe đã bắt đầu
  Tuyến Đi 01 · 10 phút trước
```

Không thêm nút tạo thông báo, không có form báo sự cố từ trang này. Tap incident mở Trip Detail/popup theo quyền, không bypass điểm báo thủ công duy nhất. Empty/loading/error states tách biệt. Không đưa nội dung kỹ thuật provider/delivery vào UI end user.

## 7. Định hướng kỹ thuật sơ bộ, chưa duyệt schema

- Có một nguồn Notification riêng theo recipient để lưu lịch sử/đã đọc và target. Không dùng Incident.status làm read state, không lấy push log làm inbox.
- Ghi thông báo/durable delivery intent cùng transaction hoặc qua cơ chế reliable sau commit; network push luôn ngoài business transaction. Không best-effort `.then(send)` khiến crash mất thông báo mà báo đã hoàn tất.
- Thiết kế nhỏ có thể dùng Notification row kèm push pending/retry/lease để worker định kỳ xử lý, không bắt buộc Redis/outbox table riêng. Nhiều recipients/devices đòi cách retry/receipt đúng; chưa chốt chi tiết field/index/bảng trong ý tưởng này.
- Device push registration gắn user/session/device và logout/revoke; không gửi dữ liệu tài khoản cũ khi cùng máy đổi user. Có thể đánh giá nullable Session token thay bảng Device mới nếu đáp ứng lifecycle, không nhét tùy tiện vào deviceInfo string.
- Web/Mobile in-app polling gộp dùng chung summary/inbox store, pause background/tab hidden; không mở mỗi header/tab một loop. Push chỉ giúp đánh thức/hiển thị, server inbox vẫn source of truth.
- API sơ bộ: list notifications cursor, summary(unread/actionable incidents), owner-only mark-read/mark-all, resolve target với quyền mới nhất, register/unregister device push. GET không ghi/mark-read.

## 8. Khả năng push hiện tại và nguồn chính thức

Source local: chưa có notification inbox module/model; Mobile package.json chưa có expo-notifications; Web header chưa có bell; Tabs có native và custom header. Kiểm tra này không chứng minh implementation incident vừa được agent khác cập nhật đã hoàn tất, chỉ nguồn đọc tại thời điểm task.

Đề xuất đánh giá expo-notifications với Expo Push Service để phù hợp stack hiện tại; cài package/native config là bước cần PO duyệt riêng trước implementation. Expo xác nhận cần thư viện/credentials và development build phù hợp, không lấy Expo Go làm tiêu chí nghiệm thu remote push:
- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://docs.expo.dev/push-notifications/what-you-need-to-know/

Push receipt thành công chỉ chứng minh handoff tới FCM/APNs, không chứng minh user/device đã nhận/đã đọc. DeviceNotRegistered cần ngừng gửi token đó:
- https://docs.expo.dev/push-notifications/sending-notifications/

Không cài package/build credentials/gửi push hoặc đăng ký token trong task ý tưởng. Chưa chốt ngân sách/môi trường/cấu hình production/provider credentials. Không cam kết realtime tuyệt đối.

## 9. Bước tiếp theo để chốt

PO chọn ma trận notification version đầu, nhất là push Parent cho lên xe/xuống xe/Start, cách tổng hợp hủy nhiều Trip và có cần browser Web Push cho admin hay chỉ bell. Sau đó mới thiết kế DB/API/dependency approval chi tiết và prompt triển khai. Không tự triển khai từ tài liệu ý tưởng này.
