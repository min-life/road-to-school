# Mobile — màn hình đã triển khai và bản đồ sửa luồng nghiệp vụ

Cập nhật ngày 05/11/2026, source mobile tại HEAD f075db4, backend đã merge tại 41cf3b0. Tài liệu này bổ sung góc nhìn từng màn hình cho bản đối chiếu backend. [Contract, gap M-01–M-10 và phụ thuộc BE-01–BE-06](mobile-backend-sync-2026-11-05.md)

## Cách đọc và mức xác minh

Đã kiểm kê 40 file entry TypeScript/TSX trong mobile/app, gồm 33 entry nghiệp vụ và 7 entry hạ tầng, fallback hoặc mẫu. Một entry có thể bọc component dùng chung, một màn có thể phục vụ nhiều role, và một route tương thích có thể chuyển hướng sang màn khác. Các bảng ghi rõ các trường hợp này.

“Đã có” trong tài liệu có nghĩa là source có UI/handler/data flow tương ứng. Nghiệm thu API có xác thực, thiết bị iPhone/Android, OTP, GPS và thao tác nhiều vai trò còn cần thực hiện với môi trường và dữ liệu được PO cấp. Các cột “cần sửa” và các đợt triển khai ở cuối là backlog.

Các đường dẫn /(auth) và /(tabs) là route nội bộ Expo Router đang dùng trong code. Backend kiểm tra role/quyền đối tượng, giao diện tab và đường vào mobile bổ sung giới hạn hiển thị.

## Điểm vào theo vai trò

| Vai trò | Tab hiện tại | Luồng chính đã có |
| --- | --- | --- |
| PARENT | Trang chủ, Theo dõi, Cá nhân | Theo dõi con/chuyến, liên kết học sinh, lịch con, báo nghỉ, đổi thông tin/điểm, yêu cầu chờ duyệt |
| DRIVER | Trang chủ, Lịch, Cá nhân | Xem chuyến được phân công, start/arrive-school/complete theo capability, phát vị trí/navigation, báo nghỉ và báo/xem sự cố |
| BUS_ATTENDANT | Trang chủ, Lịch, Cá nhân | Ready, boarding/absence/undo/QR, alighting từng con, báo nghỉ, báo và xác nhận sự cố được phép |

RootNavigation phục hồi phiên/onboarding và điều hướng sau auth. SYSTEM_ADMIN/SCHOOL_ADMIN được chặn ở luồng mobile login/root theo source. Trong Trip, BUS_ATTENDANT mở tab ATTENDANCE mặc định, DRIVER/PARENT mở INFO. [Root layout](../../mobile/app/_layout.tsx), [Tab layout](<../../mobile/app/(tabs)/_layout.tsx>), [Trip screen](../../mobile/app/trip/[id].tsx)

## Danh mục 33 entry nghiệp vụ

### Xác thực và onboarding

| ID | Màn hình và source | UI/luồng đã có | Hành vi liên quan khi sửa |
| --- | --- | --- | --- |
| A-01 | [Onboarding](<../../mobile/app/(auth)/onboarding.tsx>) | Carousel 4 trang, điều hướng bước, bắt đầu, lưu completed, tiếp tục khi lỗi lưu | Luồng session/onboarding quyết định màn mở đầu, giữ quyết định hoàn tất qua restart |
| A-02 | [Login](<../../mobile/app/(auth)/login.tsx>) | Email hoặc SĐT, mật khẩu/ẩn hiện, đăng nhập, quên mật khẩu, đăng ký, busy/error | AuthContext gọi mobileLogin, RoleSplash rồi root vào tabs, kiểm thử 401 do lifecycle |
| A-03 | [Đăng ký phụ huynh](<../../mobile/app/(auth)/register.tsx>) | Họ tên, identifier, password/confirm, validate và yêu cầu OTP | Thành công sang A-04,503 giữ form và thông báo kết quả gửi |
| A-04 | [OTP đăng ký](<../../mobile/app/(auth)/verify-otp.tsx>) | OTP 6 ô, countdown 300s, resend, verify/error, tự đăng nhập khi verify thành công | Dùng registerVerify/registerRequestOtp, kiểm tra TTL/resend theo contract |
| A-05 | [Quên mật khẩu](<../../mobile/app/(auth)/forgot-password.tsx>) | Identifier, gửi OTP, lỗi và thông báo trung tính từ server | Sang A-06 với identifier/initialMessage sau gửi thành công |
| A-06 | [Đặt lại mật khẩu](<../../mobile/app/(auth)/reset-password.tsx>) | OTP 6, mật khẩu mới/confirm/ẩn hiện, resend/countdown 300s, success/error | Sau thành công về A-02, giữ draft và xử lý 503 khi resend |

### Home và màn hình chung

| ID | Màn hình và source | UI/luồng đã có | Hành vi liên quan khi sửa |
| --- | --- | --- | --- |
| H-01 | [Trang chủ](<../../mobile/app/(tabs)/index.tsx>) | Nhánh Parent có avatar/header tiện ích, Chuyến xe của con mở rộng, tags/rail/giờ/xe/tài xế, Theo dõi lộ trình và Báo nghỉ. Nhánh staff có home-trip, chi tiết chuyến, lịch/báo nghỉ/sự cố | Home API theo role, telemetry theo trip/con, giữ IN_PROGRESS qua giờ dự kiến, thêm labels sự cố mới/audit cần thiết |
| S-01 | [Lịch nhân sự](<../../mobile/app/(tabs)/schedule.tsx>) | Tuần/ngày, Hôm nay, lịch driver/attendant, card thật/virtual, Báo nghỉ khi canReportLeave | Chỉ card thật mở T-01, cần kiểm tra lịch đổi ngày hiệu lực và holiday/makeup |
| C-01 | [Cá nhân](<../../mobile/app/(tabs)/settings.tsx>) | Hồ sơ/role, đổi avatar, đổi tên cho Parent, đổi mật khẩu, toggle Thông báo thiết bị, đăng xuất | Giữ session cleanup, trạng thái native push/Expo Go và popup/form trong profile |
| C-02 | [Thông báo](../../mobile/app/notifications.tsx) | Tất cả/chưa đọc, read-all, cursor pagination, retry/empty, mở target thông báo | Lấy mobilePath được server cấp, xử lý target hết quyền hoặc mất khả dụng |

### Phụ huynh và học sinh

| ID | Màn hình và source | UI/luồng đã có | Hành vi liên quan khi sửa |
| --- | --- | --- | --- |
| P-01 | [Theo dõi học sinh](<../../mobile/app/(tabs)/tracking.tsx>) | Danh sách con/empty/error/retry, card mở hồ sơ, swipe/hủy liên kết, nút + liên kết | Cập nhật danh sách sau link/unlink và khi trở lại từ flow khác |
| P-02 | [Liên kết học sinh](../../mobile/app/parent/link-student.tsx) | Nhập mã STU hoặc quét QR, camera permission, validate và yêu cầu OTP | Gửi studentCode, trường/hồ sơ không writable cần hiển thị lỗi và giữ input |
| P-03 | [OTP liên kết](../../mobile/app/parent/verify-otp.tsx) | Masked guardian phone, OTP 4–8 ký tự số theo DTO, TTL từ params, resend, success popup về P-01 | Giữ challengeId mới khi resend, refresh linked list sau thành công |
| P-04 | [Hồ sơ học sinh](../../mobile/app/parent/student-detail/[id].tsx) | Avatar/tên/mã/trường/địa chỉ/trạng thái và 6 thao tác dẫn tới các flow bên dưới | Học sinh DISABLED khóa tạo cập nhật, lịch sử/route/lịch theo điều kiện hiện có |
| P-05 | [Tuyến đường đưa đón](../../mobile/app/parent/route-detail.tsx) | RoutingStatus, chiều đi/về, bản đồ tuyến kế hoạch, điểm của con/trường/bãi và giờ dự kiến | Tải lại routing sau duyệt đổi điểm/chèn/ngừng phục vụ, phân biệt route kế hoạch với Trip đang chạy |
| P-06 | [Lịch học & Xe đưa đón](../../mobile/app/parent/schedule.tsx) | Tuần/ngày/Hôm nay cho studentId, giờ khởi hành/đến dự kiến, real/virtual, Báo nghỉ/Xem lộ trình | Giờ trả con lấy DROPOFF riêng, lịch ngày hiệu lực và quyền theo roster cần refresh |
| P-07 | [Đổi điểm đón/trả](../../mobile/app/parent/change-stop.tsx) | Bọc RequestListView để xem lịch sử ADDRESS_UPDATE của các con, filters/phân trang/detail và nút + | Nút + mở P-08, request APPROVED mới tác động dữ liệu theo quyết định admin |
| P-08 | [Tạo yêu cầu đổi điểm](../../mobile/app/parent/change-stop/create.tsx) | Bọc CreateAddressRequestView, chọn con ngay trên form, địa chỉ hiện tại/tìm kiếm/bản đồ/đề xuất/OTP | Chọn AVAILABLE, giữ proposedData gắn đúng studentId khi chuyển OTP |
| P-09 | [Đổi địa chỉ cho con cố định](../../mobile/app/parent/create-request/address/[studentId].tsx) | Cùng CreateAddressRequestView với fixedStudentId và keyed component | Đường từ lịch sử riêng con, kiểm tra lỗi quyền/disabled và reset draft khi đổi con |
| P-10 | [Tạo cập nhật thông tin](../../mobile/app/parent/create-request/information/[studentId].tsx) | Họ tên/SĐT giám hộ đề xuất, chỉ gửi trường thay đổi, validate/no-change và yêu cầu OTP | Dữ liệu trước/sau, điều kiện trường writable và duplicate request cần thể hiện rõ |
| P-11 | [OTP cập nhật thông tin/địa chỉ](../../mobile/app/parent/create-request/verify-otp.tsx) | Dùng chung hai RequestType, OTP 6, thẻ tóm tắt địa chỉ khi ADDRESS_UPDATE, verify → PENDING → lịch sử đúng type | Parse proposedDataJson, giữ payload snapshot qua verify, luồng hiện tại về lịch sử riêng con |
| P-12 | [Lịch sử cập nhật thông tin](../../mobile/app/parent/update-requests/information/[studentId].tsx) | Bọc RequestListView INFORMATION_UPDATE theo con, filters/phân trang/tạo mới/detail | Mở P-10 hoặc P-15, đọc kết quả sau duyệt |
| P-13 | [Lịch sử cập nhật địa chỉ](../../mobile/app/parent/update-requests/address/[studentId].tsx) | Bọc RequestListView ADDRESS_UPDATE theo con, filters/phân trang/tạo mới/detail | Mở P-09 hoặc P-15, theo dõi outcome và dữ liệu tuyến sau duyệt |
| P-14 | [Lịch sử tương thích cũ](../../mobile/app/parent/update-requests/[studentId].tsx) | Bọc cùng RequestListView, params type chọn thông tin hoặc địa chỉ | Là entry đang render thật, cần giữ mapping khi sửa component chung |
| P-15 | [Chi tiết yêu cầu](../../mobile/app/parent/update-requests/detail/[requestId].tsx) | Đọc request/detail, dữ liệu đề xuất/kết quả/lý do theo response, hủy PENDING qua popup | Race khi request đã được duyệt/hủy hoặc mất liên kết cần reload trạng thái |
| P-16 | [Entry chọn con cũ](../../mobile/app/parent/change-stop/select-student.tsx) | Redirect sang /parent/change-stop/create | Compatibility route, việc chọn con hiện nằm trong form P-08 |

### Báo nghỉ dùng cho ba vai trò mobile

| ID | Màn hình và source | UI/luồng đã có | Hành vi liên quan khi sửa |
| --- | --- | --- | --- |
| L-01 | [Danh sách Báo nghỉ](../../mobile/app/leave-notices/index.tsx) | List/filter ngày-trạng thái-con theo role, phân trang/detail/hủy, nút + nổi tạo mới | Giữ selectedStudentId từ hồ sơ, cập nhật canCancelLeave khi ready/lifecycle đổi |
| L-02 | [Tạo báo nghỉ](../../mobile/app/leave-notices/create.tsx) | Parent chọn con hoặc cố định, ngày/calendar, chiều, option chuyến + disabledReason, lý do, gửi OTP/countdown trên nút | Staff báo nghỉ cho mình. Revalidate lựa chọn theo options và giữ reason khi lỗi |
| L-03 | [OTP báo nghỉ](../../mobile/app/leave-notices/otp.tsx) | Tóm tắt đã nhập, maskedChannels, OTP 6, resend/wait, confirm/error/success → L-01 | Challenge mới thay challenge cũ, confirmation vẫn cần trạng thái chuyến hợp lệ |
| L-04 | [Chi tiết báo nghỉ](../../mobile/app/leave-notices/[id].tsx) | Thông tin notice/trip/đối tượng/kết quả theo response, nút hủy theo canCancelLeave | Phân biệt RECORDED/PENDING_REPLACEMENT/REPLACED/WITHDRAWN/TRIP_CANCELLED |

### Trip và sự cố

| ID | Màn hình và source | UI/luồng đã có | Hành vi liên quan khi sửa |
| --- | --- | --- | --- |
| T-01 | [Chi tiết/Theo dõi lộ trình](../../mobile/app/trip/[id].tsx) | Map toàn màn, bottom sheet, INFO/STOPS/ATTENDANCE/INCIDENTS theo role, điều khiển vận hành, QR/absence/report/confirm modals | Đây là màn dùng chung ba role, sửa capability/incident/snapshot cần kiểm tra cả ba |
| I-01 | [Sự cố cá nhân](../../mobile/app/incidents/index.tsx) | getMyIncidents, filter type/status, list/phân trang/refresh/detail | Hiện source có 4 type cũ, thêm 3 type mới và fallback theo M-01 |
| I-02 | [Chi tiết sự cố](../../mobile/app/incidents/[id].tsx) | Detail/context/trip theo quyền, modal giải trình tự động cho phụ xe khi đủ điều kiện | Hiện confirm chỉ OFF_ROUTE/LATE_STOP, phần ghi loại mới phụ thuộc BE |

## Bảy entry hạ tầng, fallback và mẫu

| ID | Source | Vai trò hiện tại |
| --- | --- | --- |
| G-01 | [Root layout](../../mobile/app/_layout.tsx) | Auth/onboarding/notifications providers, startup/role splash, NetworkBanner, session-expiry popup, navigation restore |
| G-02 | [Auth layout](<../../mobile/app/(auth)/_layout.tsx>) | Stack và presentation của A-01–A-06 |
| G-03 | [Tab layout](<../../mobile/app/(tabs)/_layout.tsx>) | Role-based tabs/header, safe area/keyboard, explore ẩn qua href:null |
| G-04 | [HTML shell](../../mobile/app/+html.tsx) | Tài liệu web shell của Expo |
| G-05 | [Not found](../../mobile/app/+not-found.tsx) | Fallback route và đường quay về |
| G-06 | [Explore](<../../mobile/app/(tabs)/explore.tsx>) | Nội dung placeholder, tab đang ẩn |
| G-07 | [Modal route](../../mobile/app/modal.tsx) | Màn giới thiệu Phase 0 dạng modal trong root stack |

G-06/G-07 nằm trong source và được ghi nhận ở nhóm mẫu. Các form/modal nghiệp vụ thực nằm trong T-01, C-01, L-02, I-02 và StudentPickerDialog.

## Hành trình auth và phục hồi phiên

```text
G-01 startup → đọc token + onboarding → A-01 hoặc A-02 hoặc tabs
A-01 hoàn tất/tiếp tục khi lỗi lưu → root quyết định A-02
A-02 login → AuthContext/token pair → RoleSplash → H-01
A-03 request OTP → A-04 verify → lưu phiên → tabs
A-05 request OTP → A-06 reset → success → A-02
401 → single-flight refresh → retry request hoặc session-expiry popup → A-02
DRIVER có navigation đang hợp lệ khi foreground → mở lại T-01
```

| Màn/nhóm | Dữ liệu/params đang dùng | Điểm sửa và tiêu chí hoàn thành |
| --- | --- | --- |
| A-02 | identifier/password gọi POST /auth/mobile/login | BUS_ATTENDANT trường inactive/phiên cũ phải về đúng trạng thái đăng nhập, mọi cache theo identity được reset |
| A-03 → A-04 | identifier/fullName/password/confirmPassword qua route params, OTP gửi ở A-04 |503 giữ form/draft, kết quả gửi chưa rõ phải có hướng dẫn phù hợp trước khi cho yêu cầu tiếp |
| A-05 → A-06 | identifier/initialMessage, OTP/newPassword/confirmPassword gửi reset | Giữ thông báo trung tính, validate và hiển thị lỗi API. Reset thành công trở lại login |
| A-04/A-06 | Countdown hiện cố định 300s, resend bị khóa theo counter | Cần tách TTL/chờ resend khi contract BE cung cấp. Đây là hành vi đang có, M-09 sẽ rà lại |
| G-01 | GET /auth/me, POST /auth/refresh, token storage và unauthorized listener qua AuthContext | Kiểm thử trường inactive/reactivated, thu hồi tài khoản/phiên và resume navigation đúng user |

Auth Request/Verify dùng AuthContext, API client và token storage. Các key nhạy cảm ở bảng là tên params source, tài liệu chỉ ghi cấu trúc. [AuthContext](../../mobile/context/auth-context.tsx), [API client](../../mobile/services/api-client.ts), [Navigation restore](../../mobile/hooks/use-navigation-reopen.ts), [Auth DTO](../../api/src/auth/dto/auth.dto.ts)

## Hành trình phụ huynh từ liên kết tới theo dõi

```text
P-01 Theo dõi → [+] P-02 nhập mã/quét QR → P-03 OTP → P-01
P-01 card con → P-04 hồ sơ
P-04 → P-12 thông tin / P-13 địa chỉ / P-05 tuyến / P-06 lịch / L-01 báo nghỉ
H-01 card chuyến mở rộng → Theo dõi lộ trình → T-01 đúng tripId
P-06 card trip thật → T-01, virtual hiển thị trong lịch
```

P-02 dùng POST /parents/link-requests với studentCode, P-03 dùng POST /parents/verify-link với challengeId/otp. Resend ở P-03 gọi lại bằng studentCode và thay challengeId/maskedPhone/TTL. P-01/P-04 hủy liên kết dùng DELETE /parents/students/:id sau xác nhận.

P-04 có sáu thao tác đang hoạt động gồm cập nhật thông tin, cập nhật địa chỉ, tuyến đường, lịch học, báo nghỉ và hủy liên kết. Hai nút tạo cập nhật khóa với học sinh DISABLED. Sau link/unlink cần đồng bộ linked list, Home, picker, lịch và quyền mở detail cũ.

P-05 đọc GET /routes/students/:studentId/routing cho phương án tuyến và hai chiều. T-01 đọc Trip snapshot đang vận hành. Khi đổi địa chỉ được duyệt, hai màn có thể phản ánh hai mốc dữ liệu khác nhau do frozen policy, cần giải thích bằng dữ liệu/label phù hợp khi triển khai.

H-01 vẫn dùng màu/tags của từng con, viền nhấn trên card, rail theo nghiệp vụ, ngày trên heading, route/giờ trong panel. Parent xem được con mình qua detail/children/isMyChild. Phụ huynh nhận thông tin thiếu số/không mở được dialer bằng AppAlert từ icon gọi điện. [Parent Home](mobile-parent-home-ui.md), [Journey spec](mobile-parent-student-journey.md), [Map markers](mobile-parent-map-markers.md), [Contact button](../../mobile/components/trip-contact-call-button.tsx)

## Hành trình báo nghỉ đầy đủ và lối nhanh

```text
H-01 tiện ích Báo nghỉ hoặc P-04 Báo nghỉ → L-01 lịch sử
L-01 [+] → L-02 chọn đối tượng/ngày/chiều/chuyến/lý do → gửi OTP → L-03
L-03 xác nhận → notice được ghi nhận → L-01 → L-04

H-01 card / S-01 / P-06 [Báo nghỉ chuyến này]
  → useQuickLeaveNotice popup xác nhận → request OTP → L-03
```

| Màn | Phần đã có | Đổi luồng cần xử lý |
| --- | --- | --- |
| L-01 | Giữ studentId/studentName từ hồ sơ, lọc/phân trang và nút + | Refresh khi trở lại sau tạo/hủy/ready, dùng canCancelLeave/reason nhất quán với BE-02 |
| L-02 Parent | Chọn con trong popup hoặc con cố định, ngày mặc định hôm nay, chiều mặc định TO_SCHOOL, options từ API | Đổi con/ngày/chiều reset trip selection, chuyến được chọn phải còn canReport khi gửi |
| L-02 Staff | Đối tượng là tài khoản hiện tại, danh sách chuyến theo role | Trạng thái nghỉ/thay thế/ready hoặc trường inactive cần hiện lý do server |
| L-02 chọn trip | Prefill tripId nếu trong options còn canReport, tự chọn nếu đúng một option được phép | Kiểm thử race options cũ trong lúc người khác ready/đổi phân công |
| L-03 | Params challengeId/tripId/studentId?/reason?/maskedChannels/subjectName/routeName/serviceDate/direction/giờ, thẻ summary | Các tham số tóm tắt phục vụ hiển thị, confirm dùng challenge/OTP/trip/con/reason và server kiểm tra |
| L-04 | canCancelLeave và notice status, popup hủy, trạng thái kết quả |400/409 do ready phải refresh detail/list và giải thích đúng nguyên nhân |
| Lối nhanh | Request OTP sau popup và đi trực tiếp L-03 | Giữ đủ trip/con/context, tránh tự chuyển sang form hoặc đổi đối tượng của thao tác |

Các API gồm GET /leave-notices/options, POST /leave-notices/otp, POST /leave-notices/confirm, GET list/detail và POST cancel. Khi tạo form, cooldown trên nút lấy số giây từ lỗi thông qua useLeaveOtpCooldown. Ở L-03, counter resend hiện khởi tạo min(expiresInSeconds,60) và sau resend đặt 60s. Hai cơ chế cần được đối chiếu với TTL/cooldown BE trong M-09.

Picker Báo nghỉ hiện truyền canSelectStudent={()=>true} để quyền chọn phụ thuộc options chuyến. Picker Đổi điểm mặc định chỉ chọn AVAILABLE. Khi tái sử dụng UI chung cần giữ rõ hai policy cho tới khi PO chốt thay đổi nghiệp vụ. [Create leave](../../mobile/app/leave-notices/create.tsx), [Leave OTP](../../mobile/app/leave-notices/otp.tsx), [Quick leave](../../mobile/hooks/use-quick-leave-notice.ts), [Cooldown](mobile-leave-otp-cooldown.md)

## Hành trình đổi thông tin và đổi điểm

```text
H-01 Đổi điểm → P-07 lịch sử tổng các con → [+] P-08 chọn con trong form
P-04 cập nhật địa chỉ → P-13 lịch sử con → P-09 form con cố định
P-08/P-09 địa chỉ + tọa độ đề xuất → gửi OTP → P-11 ADDRESS_UPDATE → P-13

P-04 cập nhật thông tin → P-12 lịch sử con → P-10 họ tên/SĐT đề xuất
P-10 gửi OTP → P-11 INFORMATION_UPDATE → P-12

P-07/P-12/P-13/P-14 card yêu cầu → P-15 detail/hủy khi được phép
P-16 entry cũ → redirect P-08
```

P-07 gom các GET lịch sử từng con qua listLinkedStudentRequests, giới hạn fan-out theo nhóm 3, sắp createdAt/id và phân trang hợp nhất. P-12/P-13/P-14 dùng cùng RequestListView với studentId cố định. Query gồm type/status/page/limit, filters hiển thị ALL/PENDING/APPROVED/REJECTED/CANCELLED.

CreateAddressRequestView quản lý địa chỉ hiện tại, VietMap search/gợi ý/WebView map, tọa độ/địa chỉ đề xuất và gửi OTP. useAddressRequestStudent xử lý linked list/detail, fixedStudentId và request stale. Khi đổi con, draft và các response địa chỉ chậm cần gắn đúng generation. P-10 chỉ gửi các trường có thay đổi và validate SĐT giám hộ.

Request OTP dùng POST /parents/students/:studentId/update-requests/otp với type/proposedData. P-11 nhận studentId/type/challengeId/maskedPhone/proposedDataJson và studentName? rồi POST /verify với cùng proposedData. ADDRESS_UPDATE có thẻ tóm tắt địa chỉ/tọa độ, INFORMATION_UPDATE dùng form/OTP riêng theo source. P-11 hiện có nút verify, luồng yêu cầu mã mới đi qua form.

Verify thành công tạo yêu cầu PENDING. Kết quả duyệt và routing outcome được đọc qua lịch sử/detail trước khi refresh tuyến/lịch. Luồng Parent kết thúc ở lịch sử theo con/type, còn previewToken/expectedFingerprint thuộc bước duyệt Web. Nếu muốn success từ P-08 quay lịch sử tổng P-07, cần chốt đường quay về khi giao task flow.

P-15 gọi GET /parents/update-requests/:requestId và POST /cancel. Khi request vừa được duyệt hoặc liên kết vừa bị gỡ, cần reload trạng thái/quyền và giữ phản hồi server. [Request history](../../mobile/components/parent/RequestListView.tsx), [History aggregation](../../mobile/services/parent-request-history.ts), [Address form](../../mobile/components/parent/create-address-request-view.tsx), [Student source](../../mobile/hooks/use-address-request-student.ts), [Stop request spec](mobile-parent-stop-requests.md)

## T-01 theo từng vai trò và từng tab

| Vai trò/tab | Nội dung và thao tác đã có | Thay đổi cần chuẩn bị |
| --- | --- | --- |
| Chung INFO | Tên tuyến/chiều/ngày/giờ, trường, xe, tài xế/phụ xe, icon gọi điện, thông tin theo role | Phân công/điện thoại/giờ phải refresh sau thay thế hoặc đổi lịch, hiện lý do khóa nghiệp vụ cụ thể |
| Chung STOPS | Timeline dọc có thứ tự, địa chỉ/giờ và trạng thái được phép thấy | Snapshot mới thay cả danh sách/địa chỉ/giờ, giữ masking con khác |
| PARENT | INFO mặc định, xem map/stop/incident được mask và trạng thái children riêng | Admin finalization cần audit riêng, giữ tag boarding/down của đúng con và dữ liệu API khả dụng |
| DRIVER | INFO mặc định, Start/Arrive school/Complete, điều khiển navigation theo canPublish/checkpoint | Start409 do all-absent/tài nguyên trùng, lifecycle reason, đổi owner/run/routeVersion và foreground |
| BUS_ATTENDANT ATTENDANCE | Mặc định boarding, chuyển alighting, search roster, có mặt/vắng/đổi/undo, QR | CanBoard/CanReset theo chiều, flags/counter active roster, không dùng state UI cũ sau polling/mutation |
| Staff INCIDENTS | List/status/report, popup giải trình tự động khi đủ điều kiện | Bổ sung labels ba type mới, selector/payload mới chờ BE-01/BE-04 |

Các mutation dùng can*/disabledReasons và mutate/refresh loop. Màn có logic đóng/clear modal khi status/capability đổi, đánh dấu generation cho QR. Refresh bình thường phải cập nhật data và giữ trạng thái hiển thị cần thiết của map/bottom sheet. [Trip source](../../mobile/app/trip/[id].tsx), [Navigation hook](../../mobile/hooks/use-trip-navigation.ts), [Map data](../../mobile/utils/trip-map-data.ts)

### Chiều đi đang được triển khai

```text
SCHEDULED → BUS_ATTENDANT Ready
  → DRIVER Start khi canStartTrip
  → BUS_ATTENDANT PRESENT/ABSENT theo từng học sinh
  → DRIVER Arrive at school khi đủ điều kiện
  → BUS_ATTENDANT alighting từng PRESENT
  → DRIVER Complete khi đủ điều kiện
```

Trước school-arrival, chiều đi đang IN_PROGRESS vẫn có thể undo về UNMARKED theo service. Sau school-arrival bị chặn undo, con đã xuống bị chặn đổi ABSENT. Parent rail theo workflow và child facts, school-arrival và alighting vẫn là hai mốc nghiệp vụ riêng.

### Chiều về đang được triển khai

```text
SCHEDULED → BUS_ATTENDANT Ready → boarding/ABSENT tại trường
  → DRIVER Start khi đủ marked và có PRESENT
  → BUS_ATTENDANT alighting từng con tại điểm trả
  → DRIVER Complete khi đủ điều kiện
```

CanDriverStart hiện có độ lệch với guard thực thi all-absent/tài nguyên ở BE-03. Mobile cần giữ thông báo 409 và refresh, rollout disable/reason bổ sung theo capability được BE chốt. Undo UNMARKED bị chặn sau start chiều về. Parent rail phân biệt con xuống ở điểm trả và kết thúc tuyến ở bãi.

## Sự cố từ Trang chủ, Trip và lịch sử cá nhân

```text
H-01 staff tiện ích Sự cố → I-01 list/filter → I-02 detail
T-01 nút báo sự cố → options → modal ghi chú → POST incident → refresh
BUS_ATTENDANT gặp OFF_ROUTE/LATE_STOP WAITING_CONFIRMATION
  → modal tự nhắc trong T-01 hoặc I-02 → nhập reason → POST confirm
Thông báo incident → target server → T-01?incidentId=... hoặc I-02
```

I-01 hiện có filters cho bốn type cũ và status. I-02/T-01 kiểm tra role, type và WAITING_CONFIRMATION trước khi cho giải trình. Ba type mới đã có ở backend nhưng mobile còn thiếu union/labels/filter/report selection. M-01 là phần hiển thị có thể làm trước, M-03 phần ghi phụ thuộc BE options và vòng đời xử lý.

Các dữ liệu sẽ thêm vào report gồm latitude/longitude thực khi khả dụng, studentId chọn từ roster cho tình huống liên quan, idempotencyKey của thao tác và expectedAssigneeId khi thiếu nhân sự. Cần giao ước BE về capability/type/state trước khi đổi selector. Danh sách xác nhận tự động tiếp tục theo các type BE thực cho phép. [Incident source](../../mobile/app/incidents/[id].tsx), [Incident API client](../../mobile/services/api-client.ts), [Incident service](../../api/src/incidents/incidents.service.ts)

## Các form và popup đã nằm trong màn hình

| ID | Nơi sử dụng | Nội dung/handler hiện có | Cần kiểm tra khi sửa flow |
| --- | --- | --- | --- |
| U-01 | C-01 đổi avatar | Chọn ảnh, kiểm tra file/dung lượng, multipart upload, cập nhật user/refreshUser | Avatar Home/Profile đồng bộ, upload error/session revoked, giữ trạng thái busy |
| U-02 | C-01 đổi tên | Parent nhập tên, validate, PATCH /auth/me/name | Role Parent và response user, popup lỗi trong AppModal |
| U-03 | C-01 đổi mật khẩu | Current/new/confirm, validate, POST change-password | UI hiện yêu cầu 8 ký tự ở flow này, DTO BE tối thiểu 6. Cần PO chốt khi chuẩn hóa validation các flow |
| U-04 | C-01 logout | Popup Hủy/Đăng xuất, busy, AuthContext/token cleanup | Cancel giữ phiên, confirm chạy đúng một lần, scope dữ liệu cũ được đóng |
| U-05 | C-01 push switch | enable/disable qua NotificationsProvider và device API, status/busy | Expo Go thông báo yêu cầu build hỗ trợ native push, quyền hệ điều hành và expectedUserId |
| U-06 | P-08/P-09/L-02 chọn con | LinkedStudentPicker → StudentPickerDialog, avatar/mã/trường, search accent/case-insensitive substring | Search giữ selection, policy AVAILABLE khác canSelectStudent của Báo nghỉ, loading/error/empty/fixed |
| U-07 | L-02 chọn ngày | Calendar prev/next/tháng, hôm nay/ngày mai, đóng popup | Đổi ngày reset lựa chọn trip theo options, ngày hiệu lực/holiday/makeup |
| U-08 | T-01 xác nhận vận hành | confirmModal giữ handler Start/Arrive/Complete và điều kiện | Polling làm đổi status/flags trong khi popup mở phải invalidate confirmation phù hợp |
| U-09 | T-01 vắng mặt | Reason cho học sinh, nhập/lưu, updateAttendance ABSENT | Reason bắt buộc, con đúng roster, con đã alighted không chuyển ABSENT |
| U-10 | T-01 QR | Camera permission, scan/manual code, verify QR, xác nhận điểm danh | Double scan/in-flight/generation, ready/status/roster đổi, lookup lỗi |
| U-11 | T-01 báo sự cố | Loại báo lấy availableTypes[0], ghi chú, busy và POST | Selector/GPS/studentId mới phải theo BE-01/BE-04 |
| U-12 | T-01/I-02 giải trình | Reason tối thiểu 3 ký tự ở UI, confirmAutoIncident | Chỉ type/status/role được phép, incident đã đóng hoặc đổi người phải refresh |
| U-13 | Toàn app AppAlert | Error/success/confirmation, FIFO, destructive/cancel, root và host trong modal | Callback đúng một lần, overlay đúng lớp, noncancelable/session expiry và focus/back |

Modal/form dùng AppModal/KeyboardScrollView hiện có, style RoadToSchool và safe area theo component. AppAlert có cơ chế host trong modal. OS camera/photo-picker/permission/dialer prompts thuộc các API thiết bị mà màn đang gọi. [Alert spec](mobile-app-alerts.md), [Keyboard spec](mobile-keyboard-behavior.md), [Student picker spec](mobile-leave-student-card.md), [Settings](<../../mobile/app/(tabs)/settings.tsx>)

## Dữ liệu, API và refresh theo màn

Mọi endpoint sau được nối với base URL `/api/v1`. Bảng sử dụng các client method thực, gồm những API được gọi gián tiếp qua context/component/hook.

| Màn/nhóm | Nguồn dữ liệu/mutation | Refresh hiện tại |
| --- | --- | --- |
| A-02–A-06/G-01 | AuthContext → login/register/forgot/reset/me/refresh/logout | Theo hành động và khôi phục/thu hồi phiên |
| H-01 | getHomeTrip hoặc getParentHomeCards | useActiveRefresh 8s theo identity/focus/foreground |
| Parent rail H-01 | getOperationalState/getTripIncidents/getMobileTripDetail qua telemetry | Operation/incidents 5s, detail 5s khi SCHEDULED hoặc 20s khi chạy, dedup tripId |
| S-01 | getDriverSchedule/getBusAttendantSchedule với fromDate/toDate | Active refresh 12s theo user/role/tuần, params serviceDate? |
| P-06 | getParentStudentSchedule(studentId, range) | Active refresh 12s theo user/con/tuần |
| Giờ đến P-06 | ScheduleArrivalTime, detail của return thật trong ngày chọn | Active refresh 12s cho dropoff riêng con, virtual/missing có trạng thái riêng |
| P-01/P-04 | getLinkedStudents/getLinkedStudentDetail, unlinkStudent | Mount/effect, pull/retry ở list và update local khi unlink |
| P-02/P-03 | requestLinkOtp/verifyLinkOtp | Theo submit/resend |
| P-05 | getStudentRoutingDetail | Effect theo studentId và retry |
| P-07/P-12/P-13/P-14 | RequestListView và listLinkedStudentRequests hoặc listParentStudentRequests | useFocusEffect, filter/page/pull, generation chống response cũ |
| P-08/P-09 | useAddressRequestStudent/getLinkedStudents/getLinkedStudentDetail, địa chỉ qua map provider, requestStudentUpdateOtp | List/detail theo focus, draft/search generation theo con |
| P-10/P-11 | getLinkedStudentDetail, requestStudentUpdateOtp/verifyStudentUpdateOtp | Effect tải đầu vào và submit |
| P-15 | getParentRequestDetail/cancelParentRequest | Effect theo requestId, cập nhật detail khi hủy thành công |
| L-01/L-04 | listLeaveNotices/getLeaveNoticeDetail/cancelLeaveNotice | Effect/filter/page/pull hoặc retry, reload sau hủy thành công |
| L-02/L-03 | getLinkedStudents/getLeaveNoticeOptions, requestLeaveNoticeOtp/confirmLeaveNotice | Theo lựa chọn và submit/resend, in-flight/stale guards |
| T-01 | Detail/operational/roster/incidents/options, operation mutations và QR | useActiveRefresh(fetchTrip,5000), mutate/refresh sau thao tác |
| Navigation T-01/G-01 | navigationApi.state/session/segment/publish/location history, resume storage | Hook quản lý focus/foreground/run/sequence/routeVersion/canPublish |
| I-01/I-02 | getMyIncidents/getIncidentDetail/confirmAutoIncident | Effect/filter/page, pull/retry và fetch sau confirm |
| C-01 | updateAvatar/updateName/changePassword, AuthContext/logout, notifications enable/disable | Theo thao tác, user/notification provider cập nhật trạng thái |
| C-02 | notificationApi.list/summary/target/read/read-all/device qua provider | List active 20s, đổi filter/cursor, mutate/read và refreshSummary |

Một số màn vẫn dùng mount/effect thay cho useActiveRefresh/useFocusEffect. Khi quay về một instance được giữ trong stack, cần UAT stale data trước khi chọn cách đồng bộ chung. [Refresh hook](../../mobile/hooks/use-active-refresh.ts), [API client](../../mobile/services/api-client.ts), [Notifications](../../mobile/context/notifications-context.tsx), [Navigation service](../../mobile/services/trip-navigation.ts)

## Các điểm cần chốt thêm từ kiểm kê màn hình

| ID | Hành vi source hiện tại | Việc cần xác nhận khi giao task sửa |
| --- | --- | --- |
| SF-01 params/validation | Các detail/form dùng id/studentId/requestId/challengeId từ route, một số fetch return sớm khi thiếu id. Password rules và OTP timer khác theo flow | Trường hợp thiếu/hỏng params cần trạng thái quay lại/thử lại rõ. Chuẩn hóa validation phải đối chiếu DTO và quyết định PO |
| SF-02 refresh khi quay lại | P-01/P-04/P-05/P-15/L-01/L-04/I-01/I-02 chủ yếu effect/mount, RequestListView đã focus-aware | Link/duyệt/hủy/phân công cập nhật phải xuất hiện khi trở lại. Tái sử dụng refresh hook theo scope thay vì thêm nhiều timer |
| SF-03 chính sách chọn con | Đổi điểm chọn AVAILABLE, Báo nghỉ truyền canSelectStudent luôn true và dựa options | Giữ riêng eligibility theo nghiệp vụ, UI picker chung phải nhận policy của caller |
| SF-04 success destination | OTP tạo cập nhật P-11 về lịch sử đúng type của một con, kể cả bắt đầu từ lịch sử tổng | Chốt nếu cần giữ context đường vào để quay về tổng hoặc theo con khi chuẩn hóa flow |
| SF-05 TTL/resend | Auth 300s, link dùng expiresInSeconds, leave OTP cap 60s, create leave parse wait từ lỗi, update OTP trở lại form để yêu cầu mới | Phân biệt thời hạn OTP và thời gian được resend, cần metadata BE cho 503 chưa rõ kết quả |
| SF-06 route/trip và chốt hành chính | P-05 là route kế hoạch, T-01 là snapshot trip, adminFinalization có thể khác sự kiện vận hành thực | UI giải thích đúng nguồn, tag con và actual timestamps dựa xác nhận riêng |
| SF-07 role và legacy entries | Tabs khác theo role, P-14 render history, P-16 redirect, các modal dùng chung logic | Mọi lối vào/deep link phải đi tới role/data được phép, giữ route compatibility khi sửa shared components |

Các SF là đầu việc xác nhận/kiểm thử phát hiện từ source, cùng sáu BE dependencies trong audit backend. Chúng chưa được triển khai thành thay đổi mobile trong lượt docs này.

## Ma trận sửa theo màn và thứ tự giao việc

| Đợt | Màn chịu ảnh hưởng | Công việc cụ thể | Tiêu chí bàn giao |
| --- | --- | --- | --- |
| 1, M-01 | H-01/T-01/I-01/I-02 | Enum bảy type, labels/icons/filters, nullable/context mask, fallback unknown | Đọc cả bảy type có nhãn, parent chỉ thấy nội dung được cấp quyền, actions confirm theo type thực |
| 2, M-02/M-04 | T-01/H-01/S-01/P-06 | Copy disabledReasons lifecycle, audit adminFinalization, start409/complete/arrive và refresh | Mỗi lý do bị khóa có hướng dẫn phù hợp, admin chốt và con xuống thể hiện riêng |
| 3, M-05/M-06/M-07 | L-01–L-04/P-01/P-04–P-15/S-01/H-01/T-01 | canCancelLeave/role eligibility, snapshot/roster/phone/calendar refresh và cache cleanup | Flow create/approve/cancel/unlink/focus nhất quán, dữ liệu chuyển con/chuyến không bị lẫn |
| 4, M-03 | T-01/I-01/I-02 | Selector báo sự cố, optional GPS/studentId/CAS/idempotency | BE-01/BE-04 đã chốt, role/state/type/payload/closure được kiểm tra đầu-cuối |
| 5, M-08/M-09 | A-02–A-06/P-02/P-03/P-10/P-11/L-02/L-03/C-01/G-01 | Session lifecycle, OTP503/draft/deadline/resend và thông báo | Luồng auth/OTP giữ dữ liệu đúng, error recovery và quay về màn phù hợp |
| 6, M-10/SF | Toàn bộ 33 entry theo role,7 entry hỗ trợ và U-01–U-13 | UAT entrypoints/deep links/keyboard/safe-area/popup/races | Acceptance theo các bảng dưới, báo môi trường và phần chưa xác minh |

Đây là thứ tự đề xuất để giao task. Đợt 1 dùng read contract hiện có, phần báo sự cố mới có phụ thuộc BE được ghi riêng. Các hành vi style đã có được dùng làm nền khi sửa logic màn.

## Tiêu chí nghiệm thu theo hành trình

| Nhóm | Kịch bản kiểm tra tối thiểu |
| --- | --- |
| A/G | First launch/onboarding completed, login ba role, trường inactive/reactivate, expired/revoked session, logout, reset/register OTP503/sai/hết hạn/resend và restart |
| H/P | Parent nhiều con cùng/khác trip, chưa có con/trip, chuyến đang chạy quá giờ, mất liên kết/403/404, đổi assignment/phone/avatar, header tiện ích và mở/đóng card |
| Link | Mã hợp lệ/sai/QR lặp, camera denied, guardian OTP 4–8 theo contract, challenge đổi khi resend, linked list cập nhật sau thành công |
| Leave | Lịch sử→form→OTP→detail, lối nhanh từ ba nơi, đối tượng cố định/tự chọn, hết options/disabled reason, ready trong lúc submit/hủy, staff pending replacement |
| Update | Lịch sử tổng và theo con, fixed/selected con, address search stale khi đổi con, no-change/duplicate request, OTP payload binding, PENDING→APPROVED/REJECTED/CANCELLED và routing outcome |
| S/P-06 | Tuần mới/serviceDate/selected day, holiday/makeup/ngày hiệu lực, real/virtual, giờ đón/trả của con khác giờ về bãi, report leave permission |
| T DRIVER | Start đúng/sớm/blocked/all-absent/overlap, arrive-school/complete, canPublish bị thu hồi, background/resume/routeVersion/owner đổi |
| T ATTENDANT | Ready, boarding/absence reason/undo đúng hai chiều, QR/in-flight, con đã xuống, roster sync và incident confirmation race |
| T PARENT | Chỉ children của mình, mask con khác trên map/stops/incidents, boarding/down riêng, admin finalization, gọi điện missing/invalid/dialer error |
| I | Bảy type/five status, list/filter/detail, reason confirm, unknown fallback, BE chưa cho type/action mới, GPS thiếu/stale và quyền theo trip |
| C | Update tên/avatar/password lỗi và thành công, session đổi, cancel logout, push switch/busy/permission/Expo Go, notifications read-all/target unavailable/pagination/deep link |
| UI chung | Input cuối form/modal, focus/keyboard khôi phục, safe area iPhone, font lớn/320px/landscape, popup noncancelable/destructive/queue và nội dung đầy đủ |

Đối với các ca cần mutate/OTP/DB mới, PO cấp dữ liệu và quyền theo WORKING_RULES trước khi chạy. Verification của tài liệu này gồm kiểm kê source/route/API, link và typecheck baseline. Các bảng acceptance là công việc UAT sau sửa.

## Tài liệu và source dùng chung

- Bản đồ backend, contract và BE dependencies ở audit ngày 05/11. [Backend sync](mobile-backend-sync-2026-11-05.md)
- Thiết kế onboarding/auth/OTP, header/tab và trạng thái implementation. [UI status](mobile-ui-implementation-status.md), [OTP](mobile-otp-ui.md), [Navigation](mobile-navigation-phase2.md)
- Parent Home/rail/map/contact và lịch. [Home](mobile-parent-home-ui.md), [Journey](mobile-parent-student-journey.md), [Markers](mobile-parent-map-markers.md), [Contacts](mobile-trip-contacts.md), [Arrival time](mobile-parent-schedule-arrival.md)
- Picker/Báo nghỉ/Đổi điểm và OTP summary. [Student card/picker](mobile-leave-student-card.md), [Stop requests](mobile-parent-stop-requests.md), [Cooldown](mobile-leave-otp-cooldown.md)
- Popup và vùng nhập liệu. [App alerts](mobile-app-alerts.md), [Keyboard](mobile-keyboard-behavior.md)
