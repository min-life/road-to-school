# ROADTOSCHOOL V2.0 — CURRENT IMPLEMENTATION STATE
# SNAPSHOT AT CODEX HANDOFF · IMPLEMENTATION INVENTORY · ACTIVE WORK · NEXT STEPS

> **Thời điểm snapshot**: 25/10/2026 14:50 (GMT+7)  
> **Current Git Branch**: `main`  
> **Mục tiêu**: Báo cáo chi tiết hiện trạng mã nguồn thực tế tại thời điểm bàn giao, phân định rõ ràng giữa những gì ĐÃ LÀM XONG, ĐANG LÀM DỞ, CHƯA LÀM và KHUYẾN NGHỊ TIẾP THEO.

Bộ tài liệu hệ thống theo source (28/10/2026): [implementation/README.md](../implementation/README.md), gồm local runbook, feature map, backend route catalog, schema và environment references. Chưa commit/push phần docs mới.

## Cập nhật 30/10/2026 — Tiến trình theo mốc nghiệp vụ (mới nhất)

PO đổi rail sang minh họa nhảy2/3 từng chặng theo start/attendance/school arrival/alighting, không phụ thuộc GPS. Bus nằm trên rail, thay node khi ở mốc; collapsed có tag điểm danh nổi bật và sự cố cấp chuyến, ngày ngang heading, tên tuyến/giờ chuyển khỏi khối cũ. Đọc GET operational-state/incidents5s + detail20s/focus, không sửa backend/contract. ActualStartTime/arrivedAtSchoolAt/children hỗ trợ giờ thực và sớm/trễ; ETA động và event đến/rời pickup vẫn thiếu, bubble chỉ “theo lịch”; nhịp pickup1600ms là hiệu ứng sau điểm danh, không event rời điểm mới. [Spec/API audit/source map/verification](../architecture/mobile-parent-student-journey.md). Tsc/export all,24 pure tests và presenter checks PASS; native/auth end-to-end NOT_VERIFIED. Không DB/dependency/commit/push. Các mục GPS/pin ở dưới là lịch sử đã thay thế.

## Cập nhật 30/10/2026 — Mốc điểm đón và giờ trên rail

Điểm đón nằm trên rail schematic, giờ dự kiến/thực tế gắn bằng time badge + stem với mốc đầu/cuối; bỏ dòng trạng thái lặp, giữ tags V2. Metadata detail đọc cả card chờ để lấy điểm/giờ, không gọi GPS publisher. Chiều về dùng giờ DROPOFF riêng của con, không giờ về bãi; thiếu giờ để trống có nhãn. Hình học GPS, điểm danh, controller/actions Home giữ nguyên. [Spec và verification](../architecture/mobile-parent-student-journey.md). Typecheck/export all,14 pure tests và layout preview PASS; native/auth runtime NOT_VERIFIED. Chưa commit/push.

## Cập nhật 30/10/2026 — Card học sinh / hành trình Parent

Frontend đã thêm disclosure đo chiều cao, trạng thái riêng theo attendance/alighting từng con, GPS readonly dedup tripId qua navigation5s + detail khi routeVersion đổi. Không tạo enum/ETA/tiến độ giả; thiếu dữ liệu giữ fix gần nhất hoặc trung tính. Giữ Home8s, API/actions/nhánh staff. Reduced motion, focus/background và thông tin xe/tài xế/giờ xuống xe đã xử lý. [Mapping, source, component contract, kiểm chứng và giới hạn](../architecture/mobile-parent-student-journey.md). Tsc/export all,8 pure tests và layout browser PASS; native/authenticated GPS chưa nghiệm thu. Không backend/DB/package/commit/push.

## Cập nhật 29/10/2026 — Thẻ Chuyến xe của con mở rộng

Trang chủ PARENT dùng ParentTripCard: avatar studentAvatar, tên và trạng thái cùng hàng, trường bên dưới; nhấn header mở/đóng toàn bộ chi tiết/action V2. Mỗi studentId:tripId có state UI độc lập, giữ qua rerender/polling cùng thẻ. Giữ nguyên subtree tuyến/giờ/ngày/điểm danh/lý do vắng/xe/tài xế/Theo dõi/Báo nghỉ, controller và API. [Component contract, mapping field, kiểm chứng và giới hạn](../architecture/mobile-parent-home-ui.md). Typecheck/export all và browser preview320/390/1440 PASS; native và runtime có xác thực chưa nghiệm thu. Không backend/DB/dependency hoặc commit/push.

## Cập nhật 29/10/2026 — Toàn bộ màn OTP (local)

Đã thêm ảnh verify-phone nguyên bản V1 và restyle cả 5 màn: đăng ký, đặt lại mật khẩu, liên kết học sinh, xác nhận cập nhật thông tin/địa chỉ, xác nhận báo nghỉ. Dùng OtpHero/otpStyles, nền kem, input trắng bo góc, CTA vàng, form tối đa430px và safe area/cuộn hiện có. Giữ text, API/router, validation, countdown/resend, loading/error/success, hai trường password và autoFocus V2; link vẫn nhập4–8/max8, các màn khác6. Không backend/DB/dependency/env/Git writes. Typecheck/export all và preview15 lượt320/390/1440 PASS; native iPhone/Android, bàn phím thật và OTP qua backend NOT_VERIFIED. [Source map, component API và giới hạn](../architecture/mobile-otp-ui.md).

## Cập nhật — Bootstrap SQL khi thiếu tài nguyên/ID

29/10/2026: thêm bootstrap-parent-ui.sql hoàn chỉnh để PO tự chạy pgAdmin roadtoschool, không cần ID. Tạo school/vehicle/2 students/4 staff test và DRAFT hai chiều/links, tự gán driver/attendant; reuse PARENT duy nhất và giữ mật khẩu cũ, không có parent thì cần phone để tạo test parent. Chọn mật khẩu test mới, pgcrypto hash bcrypt; không hardcode password thật. Không agent DB execution, không fake approval/Trip/GPS. [Hướng dẫn và file](../implementation/pgadmin-parent-ui-data.md). Prisma static/tsc PASS; SQL runtime/UI NOT_VERIFIED, chưa commit/push.

## Cập nhật — SQL local để PO tự chuẩn bị dữ liệu UI

28/10/2026: đã soạn preflight/create/verify SQL cho pgAdmin, tạo DRAFT hai chiều và links trên các học sinh có sẵn do PO chọn; không chạy database. Không tự ACTIVE hoặc tạo Trip/GPS; duyệt/phân công/sinh chuyến theo Web v2 để Home có roster/chuyến hợp lệ. [Hướng dẫn/file](../implementation/pgadmin-parent-ui-data.md). Static Prisma columns/required fields và delimiter checks PASS; PostgreSQL execution/UI NOT_VERIFIED. Chỉ SQL/docs, application code/schema không đổi; chưa commit/push.

## Cập nhật — Login đổi phông sau logout: mitigation

28/10/2026: khoanh vùng khả năng iOS Fabric recycle TextInput giữ thuộc tính chữ; chưa tái hiện trên iPhone. Login thêm inputTypography chung (native system font, weight400/normal/letterSpacing0), giữ font15/JSX/handlers/autofocus false. AuthContext/Settings/Root byte-identical; không remount hoặc reset credential. Tsc/export all PASS, native symptom/fix NOT_VERIFIED. [Chi tiết/bằng chứng/UAT](../architecture/mobile-ui-implementation-status.md#login--ổn-định-chữ-sau-đăng-xuất-28102026). Không backend/DB/dependency/Git writes.

## Cập nhật — Đồng bộ avatar Trang chủ phụ huynh/Cá nhân

28/10/2026: dùng UserAvatar chung, cùng user.avatarUrl và fallback chữ đầu nền vàng; giữ Home48/compact38.4, Profile72/camera badge. URL đổi reset lỗi tải qua keyed content; upload handler, HomeScreen và AuthProvider giữ nguyên. [Chi tiết](../architecture/mobile-parent-home-ui.md#avatar-đồng-bộ-với-cá-nhân--28102026). Tsc/export all/parity và browser320/390 PASS (ảnh local/missing/recovery); chưa upload hoặc nghiệm thu iPhone thật. Không thêm API/DB/package/asset, chưa commit/push.

## Cập nhật — Loading tối giản bằng logo PO cung cấp

28/10/2026: mẫu3 xe buýt + mẫu1 wordmark thay ảnh/card PARENT, dùng chung AppLoadingSplash cho startup RootNavigation. SVG gốc và PNG local trong assets/images/brand, không thêm thư viện/font. ParentLoginSplash vẫn truyền progressWidth, RoleSplash byte-identical (1200ms/onFinish/roles khác); auth/navigation root giữ nguyên. [Chi tiết](../architecture/mobile-ui-implementation-status.md#loading-đơn-giản-với-logo-app-28102026). Tsc/export all/parity và isolated browser320/390/landscape/desktop PASS; native/auth UAT chưa xác minh. Giao diện ảnh/card loading ở addendum cũ là lịch sử đã thay thế. Không DB/API/Git writes.

## Cập nhật — Đổi điểm: chưa có học sinh liên kết

28/10/2026: ListEmptyComponent của /parent/change-stop dùng TrackingEmptyState theo cùng mẫu V1 ở Theo dõi; giữ title/link/back/retry, GET, guard AVAILABLE, route address-request và safe-area padding. Shared component thêm title/description tùy chọn; mặc định Theo dõi giữ nguyên. [Chi tiết/checks](../architecture/mobile-ui-implementation-status.md). Tsc/export all, source parity và isolated browser320/390/1440 PASS; native/auth runtime chưa xác minh. Không thêm asset/package, không backend/DB, chưa commit/push.

## Cập nhật — Trạng thái chưa có học sinh ở Theo dõi

28/10/2026: card/ảnh/CTA theo phong cách V1; giữ Liên kết học sinh, FAB +, refresh và route V2. Component TrackingEmptyState thuần hiển thị; ScrollView dành vùng riêng cho FAB. [Chi tiết và kiểm chứng](../architecture/mobile-ui-implementation-status.md#theo-dõi--chưa-liên-kết-học-sinh-28102026). Tsc/export all và isolated browser320/390/1440 PASS; native/auth UAT chưa xác minh. Không sửa backend/dữ liệu/dependencies; chưa commit/push.

## Cập nhật — Switch thông báo trong nhóm tài khoản

Profile: Thông báo thiết bị + Switch cùng hàng ngay trên Đăng xuất, không còn thẻ/two buttons riêng. Provider bổ sung pushEnabled theo đăng ký token đã xác nhận và identity; permission/storage/API calls giữ nguyên, không suy từ status text. Busy/failed handling ở Profile. [Chi tiết](../ai-review/notifications-push-setup.md). Tsc/export all và isolated Switch320px PASS; native permissions/runtime chưa nghiệm thu. Không commit/push.

## Cập nhật — Cài đặt thông báo thiết bị ở Profile

Đã chuyển enablePush/disablePush/pushStatus từ Inbox Mobile sang Cá nhân → Thông báo thiết bị; provider/permission/token logic giữ nguyên. Inbox chỉ giữ phần inbox/filter/read actions. [Tài liệu push](../ai-review/notifications-push-setup.md). Tsc/export all và handler parity PASS; chưa thao tác push thật/iPhone UAT. Chưa commit/push.

## Cập nhật — Restyle loading sau đăng nhập PARENT

RoleSplash nhánh PARENT dùng ParentLoginSplash với ảnh mẹ/con/xe buýt slide2 V1 đã có trong V2, nền kem/card trắng/bar vàng. Giữ timer1200ms, onFinish và auth/navigation; role khác không đổi. [Chi tiết/checks](../architecture/mobile-ui-implementation-status.md). Tsc/export all và browser320/390 PASS; iPhone/login UAT chưa xác minh. Local chưa commit/push.

## Cập nhật — Tiện ích Đổi điểm

Đã thêm Đổi điểm giữa Báo nghỉ/Làm mới, cả expanded/compact. Home mở /parent/change-stop, chọn con liên kết AVAILABLE rồi vào address-request list hiện có; không đổi backend/DB/OTP. [Chi tiết](../architecture/mobile-parent-home-ui.md). Tsc/export all và isolated320px control test PASS; dữ liệu thật/iPhone chưa nghiệm thu. Local chưa commit/push.

## Cập nhật — Header phụ huynh thu gọn theo scroll

Home PARENT có avatar/tên/chuông và tiện ích Báo nghỉ/Làm mới như phong cách V1; cuộn đưa tiện ích ngang avatar. ParentHomeScrollView sở hữu safe area/scroll/header; Tabs ẩn header riêng index/PARENT, body/logic giữ nguyên. Xem [Parent Home UI](../architecture/mobile-parent-home-ui.md). Tsc/export all PASS, preview Chromium375/320 có scroll/click/restore PASS; native/iPhone UAT còn NOT_VERIFIED. Local, không commit/push.

## Cập nhật 28/10/2026 — Trang chủ phụ huynh theo V1 (local)

Restyle riêng PARENT tại mobile/app/(tabs)/index.tsx bằng mobile/components/parent/home-styles.ts; giữ đủ nội dung/handler/polling và nhánh nhân sự. Nền kem, card20, icon/nút tròn, status xuống dòng, wrap thông tin, CTA vàng, maxWidth560. Header/tab Phase2 không đổi. [Tài liệu Parent Home](../architecture/mobile-parent-home-ui.md) ghi kiểm chứng tsc/export, preview empty/error/loading và giới hạn thẻ có dữ liệu/iPhone. Read-only xác nhận tài khoản PO chưa liên kết học sinh; không tạo test data, không thay backend/DB/dependency hoặc commit/push. Có route rỗng Xem lịch tuần của con trỏ schedule nhân sự từ source cũ, chưa đổi trong task style. Các thay đổi Phase2/NetworkBanner cũ được giữ.

## Cập nhật 28/10/2026 — Phase 2 header/tab Mobile (local)

Đã restyle header điều hướng và tab bar theo V1 bằng AppHeader/HeaderAction/TabButton; giữ callback API/router, tab theo role, phase 1 và thay đổi NetworkBanner chưa commit. Có safe area, header trong flow, tab cao theo inset/fontScale, native hide-on-keyboard và Web VisualViewport. [Tài liệu Phase 2](../architecture/mobile-navigation-phase2.md) ghi đủ source map, cách dùng component và phạm vi. Tsc, 22 pure tests, iOS/Android/Web export PASS; browser component preview kiểm tra 320/375/390/1440px. Runtime có xác thực, keyboard native/Safari/Chrome điện thoại còn NOT_VERIFIED; Expo Web local thử direct schedule vẫn ở SSR splash. Không thay backend/DB/dependencies, không tạo test data, không commit/push. Các snapshot Phase 1 bên dưới giữ giá trị lịch sử.

## Cập nhật mới nhất — 28/10/2026: Onboarding, Mobile auth UI và bàn phím

- Mốc source đối chiếu: `db02de6`, nhánh `dongnnp/mobile/refactor-ui`. Các phần mô tả `main`/uncommitted work ở snapshot cũ bên dưới là lịch sử, không phải Git status hiện tại. Task bổ sung docs tạo thay đổi tài liệu local, chưa commit/push.
- Đã thêm bốn trang onboarding với ảnh V1, vuốt/chấm trang, Tiếp theo/Bỏ qua/Bắt đầu và marker hoàn thành theo thiết bị; đã bỏ số đếm 1/4. Có fallback khi không lưu được preference; chưa có nút xem lại onboarding.
- Đã restyle Login, Quên mật khẩu và Đăng ký phụ huynh bằng ảnh/phong cách V1. Giữ context/API/validation/OTP V2, SMS/Email selector và password visibility. Login/Quên mật khẩu không tự focus. Nội dung nhãn/placeholder cuối cùng xem tài liệu hiện trạng, không dùng báo cáo trước tinh chỉnh làm ảnh chụp hiện tại.
- Đã tích hợp `KeyboardScrollView` native/Web cho 29 TextInput trên 15 file màn hình, gồm form/modal/drawer; không thêm package hoặc thay native config. Chi tiết: [mobile-keyboard-behavior.md](../architecture/mobile-keyboard-behavior.md).
- Kiểm chứng lịch sử: tsc Mobile, 7 tests onboarding + 8 tests geometry PASS; bundle iOS từng đợt và Android/Web tại đợt keyboard PASS. Không coi các kết quả này là nghiệm thu bàn phím/ảnh render; Expo thiết bị, Safari iOS, Chrome Android và auth runtime trong đợt UI vẫn NOT_VERIFIED.
- Tại mốc Phase1 chưa restyle OTP/Đặt lại mật khẩu hoặc các tab/nghiệp vụ Mobile/Web; các cập nhật local sau mốc này được ghi ở đầu tài liệu, gồm OTP ngày29/10. Không tự mở rộng phần tiếp theo. Backend, schema/migrations và nghiệp vụ không đổi trong đợt UI.
- Tài liệu tổng hợp: [mobile-ui-implementation-status.md](../architecture/mobile-ui-implementation-status.md); kế hoạch gốc có bảng cập nhật tiến độ: [v1-ui-transfer-plan.md](../ai-review/v1-ui-transfer-plan.md).

## Cập nhật trước — 26/10/2026: Triển khai Module Báo nghỉ (Leave Notice Module)

- **Phê duyệt & Triển khai**: Thực hiện toàn diện phân hệ Báo nghỉ theo chỉ thị PO tại `docs/ai-review/leave-notice-implementation-prompt.md` và kế hoạch kiến trúc `docs/ai-review/leave-notice-business-architecture-plan.md`:
  - **Database & Prisma**: Thêm model `LeaveNotice`, enums `LeaveNoticeKind`, `LeaveNoticeStatus`, `OtpPurpose.LEAVE_NOTICE`, trường audit `cancelledAt`, `cancelledById` trên `Trip`. Đã áp dụng additive migration `20261025212318_add_leave_notices` vào PostgreSQL development.
  - **Backend API**: Triển khai đầy đủ 9 endpoints `/api/v1/leave-notices/*` kèm Swagger decorators và RBAC:
    - `GET /leave-notices/options`: Lọc theo học sinh, ngày, chiều; chỉ trả Trip thật `SCHEDULED`, kiểm tra guard Ready chiều về và điểm danh.
    - `POST /leave-notices/otp`: Tự động fan-out OTP tới contact account (Email qua SMTP, Phone qua SMS console, cả hai nếu có cả hai); học sinh gửi tới `guardianPhone`.
    - `POST /leave-notices/confirm`: Xác thực OTP nguyên tử, tạo `LeaveNotice`, tự động cập nhật điểm danh `ABSENT` (kèm snapshot restore) hoặc tính `assignmentStatus = WAITING_ASSIGNMENT`.
    - `GET /leave-notices` & `GET /leave-notices/:id`: Truy vấn lịch sử theo role scope, bảo toàn quyền xem cho người đã bị thay thế.
    - `POST /leave-notices/:id/cancel`: Hủy báo nghỉ (chỉ người tạo được hủy, không cần OTP; khôi phục điểm danh từ snapshot).
    - `GET /leave-notices/:id/replacement-candidates`: Tìm ứng viên khả dụng, kiểm tra xung đột lịch và báo nghỉ.
    - `POST /leave-notices/:id/assign-replacement`: Bố trí nhân sự thay thế nguyên tử (CAS), cập nhật Trip assignment và reset ca Ready nếu là giáo viên.
    - `POST /leave-notices/:id/cancel-trip`: Hủy chuyến xe có báo nghỉ nhân sự không bố trí được, bắt buộc lý do, bất khả nghịch.
  - **Web Admin**:
    - Menu "Báo nghỉ" cho `SYSTEM_ADMIN` và `SCHOOL_ADMIN`.
    - Trang danh sách Báo nghỉ `/admin/leave-notices` chia tab theo quyền: Tài xế (System Admin), Giáo viên (School Admin), Học sinh.
    - Bộ lọc trạng thái, ngày, chiều.
    - Modal bố trí người thay thế (`ReplacementModal`) và Modal hủy chuyến xe (`CancelTripModal`).
  - **Mobile App**:
    - Thay thế banner lời chào Trang chủ bằng thẻ "Tiện ích" với nút bấm "Báo nghỉ" căn giữa (icon trên, chữ dưới).
    - Thêm nút "Báo nghỉ" trên card chuyến xe (Trang chủ & Lịch trình) và trong mục Thao tác tại Chi tiết học sinh.
    - Triển khai 4 màn hình: Lịch sử (`/leave-notices`), Tạo mới (`/leave-notices/create`), Xác thực OTP (`/leave-notices/otp`), Chi tiết (`/leave-notices/[id]`).
- **Kiểm chứng an toàn**:
  - `npx tsc --noEmit` đạt 0 lỗi trên cả 3 project (`api`, `web`, `mobile`).
  - Unit tests: 353/353 tests PASS trong `api`, 73/73 tests PASS trong `web`.
  - Swagger: 9 endpoints `/api/v1/leave-notices/*` đồng bộ và kiểm chứng thành công tại `http://localhost:3000/api/docs-json`.
- **Trạng thái**: READY_WITH_LIMITATIONS (Toàn bộ mã nguồn và static verification hoàn tất; SMS console/SMTP thực tế và UAT mutation runtime đánh dấu `NOT_VERIFIED` do tuân thủ nghiêm ngặt Test Data Policy).

## Cập nhật trước — 26/10/2026: Mobile Navigation & Routing Remediation

- **Phê duyệt & Triển khai**: Thực hiện đầy đủ kế hoạch khắc phục Navigation & Routing theo chỉ thị PO:
  - Khắc phục race condition `prepare()`: nạp `navigationApi.state()` ngay sau Start Trip thành công, đảm bảo nạp route VietMap làm tuyến điều hướng thay vì silent exit.
  - Ẩn planned polyline mặc định cho Driver khi chuyến `IN_PROGRESS` (`!terminal && operationalState?.status === 'IN_PROGRESS' && !showPlanned`); giữ nguyên hiển thị cho Observer và nút "Tham chiếu".
  - Phân tách hai màu tuyến đường: Đoạn đã đi xám (`#94A3B8`), đoạn còn lại xanh dương (`#2563EB`) qua `splitSegment()`, nối liền mạch tại projected progress.
  - Sửa Auto: Chạy mượt mà dọc theo geometry VietMap thật, cập nhật marker và chỉ dẫn, không chạy đường thẳng fallback.
  - Bảo vệ Manual: Giữ nguyên 100% thuật toán Joystick (impulse tap $\ge 0.8\text{m}$, bearing, delta-time); kích hoạt reroute khi lệch tuyến $> 40\text{m}$ duy trì $\ge 3\text{s}$.
  - Điều phối request: Áp dụng cơ chế request ID ownership cho `route()`, `publish()` và `action()`, chấm dứt rò rỉ cờ `routeBusy` kẹt `true` vĩnh viễn khi đổi mode hoặc hủy request cũ.
  - Giữ target & CAS: Backend `TripNavigationService.session()` bảo toàn `targetStopId` hợp lệ qua `SWITCH`, `RESUME`, `STOP`, và checkpoint `START`.
  - Phân loại lỗi routing: Phân biệt rõ ràng lỗi 429 (kèm countdown retry theo server `retryAfterMs`), 409 session conflict, 502/503 upstream, timeout và lỗi mạng.
  - TEST mode: Sử dụng duy nhất tọa độ xe mô phỏng cho marker, guidance, progress, reroute và publish; không gọi GPS watcher/permission vật lý.
- **Kiểm chứng an toàn**:
  - `npx tsc --noEmit` đạt 0 lỗi trên cả 3 project (`api`, `web`, `mobile`).
  - Unit tests: 91/91 API trips tests PASS, 34/34 Mobile unit tests PASS (thêm 4 tests mới cho request ownership, mode transition progress sync, off-route invalidation, planned visibility), 73/73 Web tests PASS.
  - Swagger đồng bộ và nguyên vẹn.
- **Trạng thái**: READY_WITH_LIMITATIONS (Mã nguồn đã hoàn tất và kiểm chứng logic; kiểm thử UAT trên thiết bị vật lý với GPS thực tế/VietMap API key được đánh dấu `NOT_VERIFIED` do tuân thủ Test Data Policy).

## Cập nhật trước — 25/10/2026: Vehicle Navigation & Simulation

Mục này thay trạng thái navigation/schema/migration/tests ở snapshot cũ bên dưới; các phần lịch sử được giữ nguyên để đối chiếu.

- PO đã duyệt implementation, wireframes, additive migration và expo-location. Đã triển khai current-leg VietMap Route v4 TBT/reroute P→B, foreground GPS/automatic resume, hai nút TEST Auto/Joystick độc lập và exclusive, viewer năm role qua REST polling. Không đổi stop order/roster/assignment hoặc tự Attendance/Arrival/Complete.
- Database hiện có **16 models,10 migrations**: thêm `20261025130000_add_trip_navigation_history`, đã apply, không drift. Một bảng TripLocationPoint 6 cột/PK(tripId,sequence)/FKRestrict và nullable Trip.navigationState JSON. Không thêm index phụ, RAM store hoặc source history. Read-only check cuối:0 points/0 non-null checkpoints; không seed/backfill hoặc business-data test writes.
- Backend:5 API navigation/session/position/segment/location-history trong TripsModule; dùng assertTripAccess, Session/run/CAS/source gate; append≤1point/5s với idempotency, FOR SHARE transaction ngắn, provider call ngoài lock. Latest từ DB, history cursor pagination. Swagger live UI/JSON200 và GET thiếu auth401.
- Mobile giữ Leaflet/WebView, thêm duy nhất expo-location~58.0.19. Một foreground controller/publisher, cleanup background, resume đúng checkpoint/run mới; SecureStore chỉ Trip ID gợi ý mở lại. Guidance theo geometry+instructions cùng response, không planned-line fallback giả. Auto/Joystick algorithms đã code; runtime chưa nghiệm thu.
- Mobile location gộp vào poll5s cũ, Web location5s/metadata15s; map instance không remount mỗi điểm. COMPLETED dùng recorded parts chia run/gap>15s/missing sequence; singlepoint marker, zero history planned fallback; recorded/planned toggle và Theo xe. Không tự điền gaps.
- Safe verification: tsc cả3PASS;331/331Backend (28 files),23/23Mobile,9/9Web pure/in-memory tests PASS; API/Webbuild PASS, Android Expo export PASS. Strict lint Web map còn11 any errors+1 effect warning đã có trước, không phát sinh mới. Export không thay native/device test.
- **READY_WITH_LIMITATIONS / acceptance PARTIAL**: TBT/GPS foreground/reopen, ít nhất một simulation mode trên app+observer, authorized writes/history và real PostgreSQL contention vẫn NOT_VERIFIED. UAT ghi dữ liệu bị BLOCKED_BY_TEST_DATA_POLICY; Route API thực tế chưa gọi khi chưa có quyền/quota/giới hạn chi phí.
- Repo vẫn có uncommitted work cũ và task này; không commit/push/reset/discard. LATEST.diff chỉ chứa28 files source/test/schema/package khác baseline đầu task, không gộp thay đổi trước đó. Báo cáo trước implementation đã archive.
- **Một bước tiếp theo:** PO cấp môi trường/Trip/tài khoản/thiết bị, quyền ghi UAT và giới hạn VietMap để nghiệm thu app+observer; không hỏi lại phê duyệt implementation.
- Tài liệu: [LATEST.md](../ai-review/LATEST.md), [LATEST.diff](../ai-review/LATEST.diff), [architecture plan](../ai-review/vehicle-navigation-simulation-architecture-plan.md). Các tuyên bố “không có blocker” và số migration/tests cũ bên dưới chỉ phản ánh snapshot trước.

## Cập nhật sau bàn giao — 25/10/2026: Trip State Synchronization

- Đã triển khai theo PO: object-level Trip authorization, Parent roster membership và children keyed studentId; transaction ReadCommitted khóa hàng Trip cho assignment/ready/start/arrival/boarding/alighting/complete.
- Auto refresh Mobile Home 8s, schedule 12s; detail operational state/roster 5s, metadata 20s/focus/mutation. Web list/detail 15s visible/focus/online; giữ filter/page/form draft. Silent refresh, terminal controls, denied-data cleanup và stale-response guards.
- Không thay schema/migrations/dependencies. Không mutate/seed business DB, không commit/push. Các thay đổi vẫn chưa commit như working tree bàn giao.
- Kiểm chứng task này: tsc cả 3 PASS; 57 API tests + 7 Mobile pure tests + 6 Web pure tests PASS; Swagger live schemas/endpoints đã đối chiếu. Không dùng tổng tests lịch sử bên dưới thay cho kết quả task này.
- Trạng thái **READY_WITH_LIMITATIONS**: runtime nhiều roles/thiết bị, native map reload và PostgreSQL concurrency chưa xác minh; UAT cần dữ liệu/phạm vi mutation PO cấp. Báo cáo mới: [LATEST.md](../ai-review/LATEST.md), [audit-plan](../ai-review/trip-state-synchronization-audit-plan.md).
- Các mục snapshot A–J bên dưới mô tả mốc bàn giao trước task này; phần cập nhật này ưu tiên khi có khác biệt.

---

## A. CURRENT REPOSITORY & GIT STATE

- **Branch hiện tại**: `main` (đồng bộ với `origin/main`).
- **Tổng quan Working Tree**:
  - Toàn bộ các thay đổi tính năng từ phân hệ Tuyến đường, Chuyến xe và Vận hành V2 hiện đang nằm ở trạng thái **chưa commit (Uncommitted Changes)** trong working tree.
  - **TUYỆT ĐỐI KHÔNG**: Chạy `git clean`, `git reset`, `git checkout .`, `git restore .` hoặc tự ý commit/push. Tất cả các files này thuộc phạm vi bàn giao đang hoàn thiện.
- **Tóm tắt các tệp thay đổi chính**:
  - `api/prisma/schema.prisma` & migrations: Đã cập nhật 15 models, 9 migrations.
  - `api/src/trips/`: Module Vận hành chuyến xe, DTOs, Service, Controller, Tests.
  - `api/src/routes/`: Module Quản lý phương án tuyến, VRP, Phê duyệt, Giữ xe.
  - `web/src/app/admin/routes/` & `web/src/app/admin/trips/`: Giao diện quản lý phương án tuyến và chuyến xe trên Web Admin.
  - `mobile/app/trip/[id].tsx` & `mobile/app/(tabs)/index.tsx`: Màn hình chi tiết chuyến xe di động (Flow V2) và trang chủ Phụ huynh.
  - `docs/ai-review/LATEST.md` & `docs/ai-review/LATEST.diff`: Báo cáo review kỹ thuật phiên gần nhất.

---

## B. IMPLEMENTED FEATURES (BẢNG THEO DÕI TÍNH NĂNG ĐÃ TRIỂN KHAI)

| Tính năng nghiệp vụ | Backend API | Database | Web Admin | Mobile App | Trạng thái Kiểm thử | Tài liệu tham chiếu |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **1. Authentication & Sessions** | `AuthModule` | `users`, `sessions`, `otp_challenges` | Đầy đủ Login/Auth | Đầy đủ Login/Auth | `PASS` (Vitest + tsc) | [docs/architecture/auth-technical-design.md](../architecture/auth-technical-design.md) |
| **2. Quản lý Trường học** | `SchoolsModule` | `schools` | CRUD Trường, Hợp đồng, Lịch học | Xem thông tin | `PASS` (48 unit tests) | [docs/architecture/school-management-design.md](../architecture/school-management-design.md) |
| **3. Học sinh & Phụ huynh** | `StudentsModule`, `ParentsModule` | `students`, `parent_student_links` | Danh sách học sinh, gán xe | Trang chủ, Lịch con | `PASS` (Vitest + tsc) | [docs/architecture/student-parent-management-plan.md](../architecture/student-parent-management-plan.md) |
| **4. Xe & Bãi đỗ xe** | `VehiclesModule`, `SystemSettingsModule` | `vehicles`, `system_settings` | CRUD Xe, Cài đặt bãi xe | Xem thông tin xe | `PASS` (Vitest + tsc) | [docs/architecture/account-vehicle-student-requests-plan.md](../architecture/account-vehicle-student-requests-plan.md) |
| **5. Đơn đề nghị cập nhật** | `StudentRequestsModule` | `student_update_requests` | Duyệt / Từ chối đơn | Phụ huynh gửi đơn | `PASS` (15 unit tests) | [docs/architecture/account-vehicle-student-requests-plan.md](../architecture/account-vehicle-student-requests-plan.md) |
| **6. RoutePlan-First VRP** | `RoutesModule` | `route_plans`, `routes`, `route_stops` | Wizard tạo tuyến, Preview, Distinct count | Xem lộ trình con | `PASS` (22 unit tests) | [docs/ai-review/routeplan-first-management-plan.md](../ai-review/routeplan-first-management-plan.md) |
| **7. Phê duyệt & Giữ chỗ Xe** | `RoutesModule` (Readiness, Reservation) | `RoutePlanStatus.ACTIVE`, Audit fields | Card readiness, Modal duyệt của School Admin | N/A (Admin only) | `PASS` (20 unit tests) | [docs/ai-review/trip-management-architecture-plan.md](../ai-review/trip-management-architecture-plan.md) |
| **8. Sinh chuyến xe tự động** | `TripsModule` (Lazy generation, Cron) | `trips`, `trip_attendances` | Danh sách chuyến, Lọc, Gán xe/người | N/A | `PASS` (17 unit tests) | [docs/ai-review/trip-management-architecture-plan.md](../ai-review/trip-management-architecture-plan.md) |
| **9. Lịch trình di động 7 ngày**| `TripsController` (`/mobile/schedule`) | Dữ liệu `trips` theo tuần | N/A | Lịch tuần Tài xế, Giáo viên, Phụ huynh | `PASS` (tsc + schema) | [docs/ai-review/trip-management-architecture-plan.md](../ai-review/trip-management-architecture-plan.md) |
| **10. Trip Operation V2** | `TripsModule` (`arrive-at-school`, `alighting`) | `arrived_at_school_at`, `alighted_at` | Giám sát trạng thái chuyến | Chi tiết chuyến, Sheet 2 trạng thái, Sub-tabs | `PASS` (270/270 unit tests) | [docs/ai-review/trip-operation-business-architecture-plan.md](../ai-review/trip-operation-business-architecture-plan.md) |

---

## C. PARTIALLY IMPLEMENTED FEATURES (TÍNH NĂNG TRIỂN KHAI MỘT PHẦN)

1. **Quét mã QR Điểm danh trên Mobile**:
   - **Đã làm**: UI nút Quét QR góc trên bên phải màn hình điểm danh, cấp quyền Camera Expo, API xác thực mã QR (`POST /api/v1/trips/:id/attendance/verify-qr`), Modal xác nhận học sinh.
   - **Còn thiếu**: Kiểm thử thực tế trên thiết bị vật lý có camera quét mã QR in trên thẻ học sinh.
   - **Files**: `mobile/app/trip/[id].tsx`, `api/src/trips/trips.service.ts`.
2. **Quy trình Hủy RoutePlan (RoutePlan Cancellation)**:
   - **Đã làm**: Schema có các trường `cancelledAt`, `cancelledById`, `cancellationReason`. Service có phương thức hủy logic.
   - **Còn thiếu**: Nút bấm Hủy và Modal xác nhận trên Web Admin đang tạm ẩn theo quyết định PO; quy trình giải phóng holds phương tiện đang được xem xét mở rộng.
   - **Files**: `web/src/app/admin/routes/plans/[id]/page.tsx`, `api/src/routes/routes.service.ts`.

---

## D. APPROVED BUT NOT IMPLEMENTED (ĐÃ PHÊ DUYỆT NHƯNG CHƯA TRIỂN KHAI)

1. **Báo cáo sự cố trên đường (Incident Management)**:
   - Tài xế hoặc Giáo viên phụ xe gửi báo cáo sự cố (hỏng xe, tắc đường, tai nạn) lên hệ thống.
   - Trạng thái: Nằm trong định hướng kiến trúc Phase 2, chưa có API và UI.
2. **Quy trình thay thế nhân sự/xe khẩn cấp khi đang vận hành**:
   - Khi chuyến xe đang `IN_PROGRESS`, nếu xe hỏng thì đổi sang xe khác.
   - Trạng thái: Tạm khóa ở `IN_PROGRESS` để đảm bảo toàn vẹn dữ liệu; quy trình cứu hộ sẽ thiết kế riêng.
3. **Thống kê chuyên cần & Báo cáo quản trị (Reporting & Analytics)**:
   - Dashboard thống kê tỷ lệ đúng giờ, tỷ lệ học sinh vắng, biểu đồ vận hành theo tháng.
   - Trạng thái: Chưa triển khai.

---

## E. CURRENT ACTIVE WORK: TRIP OPERATION FLOW V2

Chi tiết kiểm định trạng thái của phân hệ vừa hoàn thành gần nhất:

| Hạng mục kiểm tra | Trạng thái thực tế | Bằng chứng mã nguồn / Kiểm thử |
|---|:---:|---|
| Cập nhật Kế hoạch Kiến trúc | **ĐÃ HOÀN THÀNH** | [docs/ai-review/trip-operation-business-architecture-plan.md](../ai-review/trip-operation-business-architecture-plan.md) |
| Cập nhật Prisma Schema | **ĐÃ HOÀN THÀNH** | Thêm `Trip.arrivedAtSchoolAt` và `TripAttendance.alightedAt` |
| Prisma Migration | **ĐÃ HOÀN THÀNH** | `20261025071759_add_trip_school_arrival_and_alighting` |
| API Xác nhận đến trường | **ĐÃ HOÀN THÀNH** | `POST /api/v1/trips/:id/arrive-at-school` (Phân quyền: `DRIVER`) |
| API Xác nhận xuống xe | **ĐÃ HOÀN THÀNH** | `PUT /api/v1/trips/:id/attendance/:studentId/alighting` (Phân quyền: `BUS_ATTENDANT`) |
| Driver TO_SCHOOL: Nút Đến trường | **ĐÃ HOÀN THÀNH** | Nút `[ Xác nhận đến trường ]` (màu Sky Blue), chỉ sáng khi 100% học sinh đã được điểm danh |
| Driver TO_PARKING: Bắt buộc điểm danh | **ĐÃ HOÀN THÀNH** | Khóa `startTrip` nếu còn học sinh `UNMARKED` tại trường |
| Attendant: UI Xuống xe | **ĐÃ HOÀN THÀNH** | Sub-tab `Xuống xe` trong Bottom Sheet, chỉ hiển thị học sinh `PRESENT`, có nút Hoàn tác |
| Parent: Trạng thái xuống xe | **ĐÃ HOÀN THÀNH** | Badge `Đã xuống xe an toàn` trên cả Trang chủ và Chi tiết chuyến |
| Unit Tests Backend | **ĐÃ HOÀN THÀNH** | **270/270 tests passed** (17/17 tests trong `trips.service.spec.ts`) |
| Typecheck Toàn bộ Dự án | **ĐÃ HOÀN THÀNH** | `npx tsc --noEmit` đạt 0 lỗi trên `api`, `web` và `mobile` |
| Đồng bộ Swagger | **ĐÃ HOÀN THÀNH** | Đã kiểm chứng tại `http://localhost:3000/api/docs-json` |

---

## F. DATABASE CURRENT STATE & MIGRATIONS

- **Mô hình**: 15 Models, 9 Migrations.
- **9 Migrations chính thức đã áp dụng**:
  1. `20261022044934_init`
  2. `20261022091920_init_auth_tables`
  3. `20261022143540_add_schools_table`
  4. `20261023053710_add_students_and_parent_links`
  5. `20261023105820_add_vehicles_settings_and_update_requests`
  6. `20261023203124_add_routes_and_route_plans`
  7. `20261024113252_add_trips_and_approval`
  8. `20261025052642_add_trip_attendance_roster`
  9. `20261025071759_add_trip_school_arrival_and_alighting`
- **One-off Script**:
  - `api/scripts/one-off/backfill-legacy-trip-roster.ts`: Đã tạo trong quá khứ để đồng bộ chuyến cũ. **TUYỆT ĐỐI KHÔNG TỰ Ý CHẠY LẠI**.
- **Tính toàn vẹn**: Không có bản ghi giả, không có dữ liệu mock tự sinh trong CSDL.

---

## G. KNOWN BUGS & EDGE CASES

1. **Khởi động Dev Server song song**:
   - Hiện tại: User đang chạy `npm run dev` cho `api` (port 3000), `web` (port 5173/3001) và `npx expo start` cho `mobile` trong terminal riêng.
   - Lưu ý: Không khởi động tiến trình daemon nền trùng port để tránh lỗi `EADDRINUSE`.
2. **Khung giờ chuyến vượt nửa đêm**:
   - Hệ thống hiện tại phục vụ đưa đón trường học ban ngày (06:00 – 18:00), chưa hỗ trợ chuyến xe chạy xuyên qua mốc 00:00.

---

## H. BLOCKERS
- **Hiện không có bất kỳ blocker kỹ thuật nào.** Toàn bộ hệ thống Backend, Web và Mobile đang biên dịch sạch sẽ, test suites vượt qua 100%.

---

## I. NEXT RECOMMENDED TASKS

Thứ tự ưu tiên được đề xuất cho các phiên làm việc tiếp theo:
1. **Kiểm thử nghiệm thu thực tế trên Mobile (User Acceptance Testing)**:
   - Đăng nhập tài khoản Tài xế, Giáo viên phụ xe và Phụ huynh trên máy ảo/thiết bị thật để thao tác trọn vẹn luồng V2 ở chế độ `TRIP_OPERATION_MODE=TEST`.
2. **Hoàn thiện Workflow Hủy RoutePlan (nếu PO yêu cầu)**:
   - Xây dựng quy trình hủy RoutePlan `ACTIVE`/`DRAFT` và giải phóng phương tiện bị giữ chỗ.
3. **Xây dựng Phân hệ Báo cáo Sự cố (Incident Management)**:
   - Cho phép gửi và giải quyết sự cố phát sinh trên đường.

---

## J. RESUME INSTRUCTIONS FOR CODEX (HƯỚNG DẪN TIẾP QUẢN CHO CODEX)

Khi bắt đầu phiên làm việc trong Codex:
1. **Không phân tích lại toàn bộ dự án từ đầu**: Đọc `AGENTS.md` và 2 file handoff này (`docs/ai-handoff/CODEX_HANDOFF.md` và `docs/ai-handoff/CURRENT_STATE.md`) để nắm context ngay lập tức.
2. **Chạy kiểm tra trạng thái tĩnh**:
   - `git status` (xác nhận branch `main` và uncommitted changes).
   - `cd api && npx tsc --noEmit`
   - `cd web && npx tsc --noEmit`
   - `cd mobile && npx tsc --noEmit`
3. **Tuyệt đối tuân thủ Test Data Policy**: Không chèn dữ liệu test vào PostgreSQL.
4. **Chờ yêu cầu cụ thể từ Product Owner**: Không tự ý sửa code hay refactor khi PO chưa giao task mới.

## Addendum 27/10/2026 — Notifications & Admin Overview (Codex)

- /admin có Tổng quan cho SYSTEM_ADMIN/SCHOOL_ADMIN: backlog theo quyền mọi ngày, actual Trip partition theo serviceDate, attention bounded và inventory hiện trạng. School scope được kiểm phía API; dashboard filter không thu hẹp chuông toàn tài khoản.
- API thêm OverviewModule, NotificationsModule và typed target resolver. Inbox Notification lưu cùng business transaction; key unique theo recipient/event; bulk cancellation gộp theo người/ngày. Unread riêng với unresolved incident count. Không backfill sự kiện cũ.
- Prisma thêm bảng notifications + sessions.push_token nullable unique. Migration 20261027000000_add_notifications đã deploy local, tổng14 migrations current; schema validate/generate và drift check qua. Không tạo business test records.
- Web có chuông/popover + /admin/notifications; Mobile có chuông ở header các tab + /notifications, mở đích kiểm quyền. Cài expo-notifications cùng4transitive packages, không đổi version package hiện có.
- Push OFF nếu không đặt PUSH_NOTIFICATIONS_ENABLED=true. PO chọn bàn giao cấu hình EAS/FCM/APNs; chưa project ID/credentials/native build/device UAT, chưa gửi push. Xem docs/ai-review/notifications-push-setup.md.
- Verification và rủi ro đầy đủ ở docs/ai-review/LATEST.md. Không coi static/mocked/bundle checks là chứng nhận production hoặc kiểm chứng mọi nghiệp vụ incident trước đó.
