# Trang chủ phụ huynh — chuyển phong cách V1 sang V2

28/10/2026. Đã implement local; chưa commit/push. Chỉ trình bày PARENT, không đổi API/nghiệp vụ hoặc Trang chủ nhân sự. [Header/tab Phase 2](mobile-navigation-phase2.md) được giữ.

## Hiện hành30/10/2026 — rail theo mốc và tag con

Từ card → Theo dõi lộ trình, điểm đón/trả riêng của mỗi con trên `/trip/[id]` dùng ghim giọt nước24×30 có avatar18px theo ảnh PO cung cấp, thay marker ngôi sao. Ảnh ghép theo studentId từ cùng hồ sơ học sinh như Theo dõi/chi tiết/Home, đọc lại20s lúc active và khi focus, thử lại ảnh lỗi cùng URL. Fallback chữ đầu tên giống các view khác; không đổi dữ liệu chuyến và không reload bản đồ khi ảnh cập nhật. [Nguồn ảnh, privacy, component/lifecycle và kiểm chứng](mobile-parent-map-markers.md).

Màu viền card và nền header đồng bộ theo tag trạng thái của con qua journeyTones: Chưa điểm danh vàng, Đã điểm danh xanh dương, Chưa xuống xe tím, Đã xuống xe xanh lá, Đã báo nghỉ/Vắng mặt đỏ. Giữ màu khi mở/đóng, không bị viền vàng mặc định khi mở ghi đè. Phần chi tiết vẫn nền trắng; tag chuyến và sự cố giữ màu riêng. Không đổi dữ liệu, vị trí bus hoặc nghiệp vụ.

Chiều về: PRESENT chưa xác nhận xuống dùng tag Chưa xuống xe màu tím; đã xác nhận xuống dùng Đã xuống xe màu xanh lá, cùng chữ/icon/tone như chiều đi. Chưa điểm danh/ABSENT giữ nhãn riêng. Tag không xác nhận xe đã đến điểm trả; vị trí bus không đổi, xem [bảng đầy đủ chiều về](mobile-parent-student-journey.md#vị-trí-minh-họa-và-icon-trên-rail).

Tag điểm danh chỉ giữ ở header card. Đã bỏ tag trạng thái lặp dưới rail/dòng kết thúc tuyến theo lịch; phần mở rộng vẫn giữ giờ điểm danh, giờ xuống xe và lý do vắng khi có. Không hiển thị hộp chi tiết rỗng. Quy tắc này thay thế mô tả hiển thị tag chi tiết trong các mục lịch sử bên dưới.

[Spec mới nhất, API audit, component contracts và limits](mobile-parent-student-journey.md): rail minh họa theo start/attendance/school arrival/alighting được PO duyệt, không GPS-only; bus nằm trên rail/thay icon mốc. Collapsed có tag điểm danh màu/icon và cảnh báo sự cố cấp chuyến; ngày cùng heading. RouteName chuyển đầu panel, actual/planned time gắn mốc; khối route/time/date cũ đã bỏ. Callback/permissions/nhánh staff và thông tin V2 giữ nguyên, kết thúc tuyến về bãi vẫn có dòng riêng. ETA động/event rời pickup thiếu trong API, không tự tạo. Các phần29/10 và mô tả GPS/pin ở các lần trước là lịch sử, ưu tiên spec mới nhất.

## Thẻ chuyến xe thu gọn/mở rộng — 29/10/2026

**Cập nhật30/10/2026:** [Card học sinh và Animated Bus Journey](mobile-parent-student-journey.md) bổ sung chuyển động mở/đóng, GPS readonly dùng chung, trạng thái riêng từng con và nhóm xe/tài xế. Contract mới có journey render prop; body giữ mount và display:none sau đóng thay vì unmount như mô tả29/10 bên dưới. Tài liệu mới là mô tả hiện hành cho phần này; toàn bộ action V2 vẫn giữ.

Theo bố cục PO yêu cầu, phần tóm tắt của mỗi thẻ gồm avatar học sinh, tên và trạng thái chuyến trên cùng một hàng, trường học bên dưới. Mặc định thu gọn; nhấn toàn bộ phần tóm tắt để mở/đóng. Chevron thể hiện trạng thái, không có nút/thao tác giả. Phần chi tiết giữ đầy đủ UI/nghiệp vụ V2 trước task.

```text
[Avatar]  Tên học sinh             [Trạng thái chuyến]
          Trường học                              ˅
────────────── chỉ hiện khi mở rộng ───────────────
Chiều / tuyến
Giờ • ngày
Điểm danh • giờ đánh dấu
Lý do vắng (đúng điều kiện hiện có)
Biển số • tài xế
[Theo dõi lộ trình]
[Báo nghỉ chuyến này — đúng điều kiện/busy hiện có]
```

### Component và dữ liệu

[ParentTripCard](../../mobile/components/parent/trip-card.tsx) nhận `studentName: string`, `avatarUrl?: string | null`, `schoolName: string`, `status: { label: string; bg: string; text: string }`, `children: ReactNode`. Component chỉ giữ state trình bày `expanded`, không gọi API, router, auth hoặc phân quyền. [HomeScreen](../../mobile/app/(tabs)/index.tsx) truyền dữ liệu và toàn bộ chi tiết/action hiện có qua children.

```tsx
<ParentTripCard
  key={`${card.studentId}:${card.tripId}`}
  studentName={card.studentName}
  avatarUrl={card.studentAvatar}
  schoolName={card.schoolName}
  status={getStatusBadge(card.tripStatus)}
>
  {/* Toàn bộ chi tiết và nút V2 hiện có */}
</ParentTripCard>
```

Ảnh lấy từ `studentAvatar` sẵn có của API home-cards, dùng UserAvatar48 với fallback chữ đầu nếu thiếu/lỗi ảnh. Không cần endpoint/field mới. Mapping trạng thái vẫn qua getStatusBadge cũ; không đổi nhãn hoặc trạng thái chuyến.

| Nội dung trước task | Vị trí sau task / điều kiện giữ nguyên |
| --- | --- |
| Tên học sinh, trường | Tóm tắt, không giới hạn số dòng |
| Trạng thái chuyến | Cùng hàng với tên, màu/nhãn từ mapping V2 |
| Chiều và tên tuyến | Chi tiết; giữ icon theo direction và routeName |
| Giờ chạy, ngày phục vụ | Chi tiết; scheduledTime/serviceDate giữ cách hiển thị cũ |
| Điểm danh, đã xuống xe an toàn | Chi tiết; giữ getAttendanceBadge(attendanceStatus, childIsAlighted) |
| Giờ đánh dấu | Chi tiết; chỉ hiện khi markedAt có giá trị, format giờ/phút cũ |
| Lý do vắng | Chi tiết; giữ điều kiện ABSENT và absenceReason |
| Biển số, tài xế | Chi tiết; vehiclePlate/driverName đầy đủ |
| Theo dõi lộ trình | Chi tiết; giữ `/trip/${card.tripId}` và callback |
| Báo nghỉ chuyến này | Chi tiết; giữ canReportLeave, isRequesting, spinner/disabled, payload và onSuccess refresh |

Các thẻ mở độc lập. Key studentId:tripId giữ state khi polling8s/rerender thay object của cùng thẻ; chuyến mới có key mới nên bắt đầu thu gọn. Không đặt hook trong map hoặc lưu state mở rộng vào dữ liệu nghiệp vụ. RefreshControl, fetch/stale guards, avatar/header tiện ích hai nút, nhánh nhân sự giữ nguyên.

### Bố cục, thao tác và accessibility

Tái sử dụng parentHomeStyles: nền/card/bo góc/shadow/font và CTA giữ phong cách V1 đã áp dụng. Header padding16, avatar48; identity flex/minWidth0, tên và status chung một row gap8, status giới hạn48% vùng identity. Tên/trường/status wrap theo nội dung, không ellipsis hoặc fixed height; form vẫn ở cột tối đa560px của Parent Home.

Chỉ header là Pressable mở/đóng; panel và các nút nghiệp vụ là phần tử cùng cấp, nên bấm CTA không làm thẻ thu gọn. Panel chỉ mount khi mở, không để nút bị ẩn vẫn nhận focus. Header có role button, label gồm tên/trường/trạng thái, hint mở/đóng và accessibilityState.expanded; thêm aria-expanded để React Native Web công bố đúng trạng thái. Không thêm nội dung hướng dẫn dài lên UI.

Không thêm overlay, keyboard offset, thư viện hoặc animation mới. Chiều cao panel tự nhiên, giữ cuộn/padding an toàn của ParentHomeScrollView và tab shell.

### Kiểm chứng lượt này

- PASS Mobile TypeScript và Expo export iOS/Android/Web/server; output ngoài repository.
- PASS đối chiếu snapshot: toàn bộ subtree chi tiết giữ nguyên; state/effects/fetch/polling/helpers của HomeScreen và nhánh nhân sự không đổi. API client, parentHomeStyles, UserAvatar và HomeScrollView byte-identical.
- PASS Chromium IAB component preview với nhãn UI tĩnh, không DTO/business record/API/auth: ban đầu panel không mount; click mở/đóng; hai thẻ độc lập; action trong panel và parent rerender giữ trạng thái; Enter/Space hoạt động; aria-expanded false/true đúng.
- PASS kiểm tra nhãn tên/trường dài tại320×568,390×844,1440×900: không tràn ngang, tên/status có cùng y132 trong preview và cách nhau8px; trường nằm bên dưới, đầy đủ nội dung. Đây là nhãn placeholder để kiểm tra hình học, không phải dữ liệu học sinh/chuyến giả hoặc kết quả API giả.
- NOT_VERIFIED runtime có phiên PARENT/dữ liệu thật, refresh8s thực tế, điều hướng/báo nghỉ/OTP, ảnh học sinh thực và các nhánh điểm danh qua backend. Không tạo records hoặc gọi mutation để kiểm tra.
- NOT_VERIFIED Expo Go iPhone/Android, Safari iOS/Chrome Android, VoiceOver/Dynamic Type thực; không có thiết bị tương ứng kết nối. Preview không thay native UAT. Script/server/tab tạm đã dọn.

Các báo cáo ngày28/10 phía dưới là mốc trước bố cục disclosure này; bảng field/contract ở mục hiện tại là tham chiếu mới nhất. Chưa commit/push.


## Bỏ nút Làm mới — 29/10/2026

Theo yêu cầu PO, Trang chủ PARENT chỉ còn **Báo nghỉ** và **Đổi điểm** trong thẻ tiện ích, áp dụng cả expanded và compact vì cùng dùng một danh sách actions. Hai actionSlot tiếp tục chia đều không gian bằng flex; không đổi safe area, avatar/chuông hoặc animation. Đã bỏ prop onRefreshAction khỏi ParentHomeScrollView và nơi gọi trong HomeScreen.

Giữ nguyên RefreshControl kéo xuống làm mới, handler onRefresh, polling8000ms và các thao tác cập nhật sau nghiệp vụ; nút refresh Trang chủ nhân sự không thay đổi. Typecheck Mobile PASS; đối chiếu snapshot xác nhận chỉ bỏ entry/prop/call prop, phần còn lại giữ nguyên. Chưa kiểm chứng trên Expo Go iPhone/Android trong task này; không gọi API hoặc tạo dữ liệu để test, không thêm dependency hoặc commit/push. Các mô tả/kiểm chứng nút Làm mới phía dưới là lịch sử trước thay đổi này.

## Avatar đồng bộ với Cá nhân — 28/10/2026

[UserAvatar](../../mobile/components/user-avatar.tsx) dùng chung tại ParentHomeScrollView và Settings. Trước task, cả hai đã lấy `user.avatarUrl` từ AuthContext, nhưng fallback Home là icon person nền xanh còn Cá nhân là chữ cái đầu nền vàng. Nay cùng ảnh thật, crop cover và chữ cái đầu nền `colors.primary`, text foreground/weight800 khi thiếu/lỗi ảnh. Giữ công thức chữ đầu cũ của Cá nhân: `(fullName || 'U').charAt(0).toUpperCase()`; không tạo ảnh/tên mẫu.

Props: `avatarUrl?: string | null`, `fullName?: string | null`, `size?: number` (mặc định72), `onLoad?: () => void`. Component không gọi API/context/storage. AvatarContent được key theo URL: thay URL remount nội dung, bỏ trạng thái lỗi ảnh cũ; onError dùng fallback. Tên đổi mà URL không đổi vẫn cập nhật chữ đầu qua props. Không thêm retry/request hoặc cache-busting theo thời gian.

Home truyền URL/tên từ user qua props như trước, dùng size48 trong Animated.View cũ (compact scale0.8 →38.4). Profile dùng size72, camera badge/nhấn chọn ảnh/disabled khi upload và callback onLoad diagnostics giữ nguyên; nút avatar thêm label **Đổi ảnh đại diện**. Size chữ theo tỷ lệ28/72. Avatar các role khác tại Cá nhân dùng cùng component với diện mạo72px như trước, có thêm fallback khi lỗi tải ảnh; phân quyền/handler không đổi.

Luồng dữ liệu giữ nguyên: Settings upload hiện có → setUser với URL trả về → refreshUser → AuthContext cập nhật cả hai màn. Không sửa HomeScreen/AuthProvider/API client hoặc upload handler, không lưu thêm state tài khoản riêng. Safe area/scroll/header/tab/push/logout không đổi.

PASS TypeScript, Expo export iOS/Android/Web/server, HomeScreen/AuthContext byte-identical, handler upload và API/context/push/logout call parity, khai báo collapse/actions giữ nguyên. Chromium IAB isolated preview320/390 dùng ParentHomeScrollView và UserAvatar thật: fallback hai vị trí cùng màu/font, size48/72; URL ảnh A cùng tải natural528px, URL lỗi404 về fallback cả hai, đổi sang ảnh B natural1320px phục hồi cả hai, bỏ URL về fallback. Dùng PNG logo local sẵn có để kiểm tra tải/crop, không giả lập API hoặc tài khoản/ảnh hồ sơ thật. Compact đo38.4px và không tràn ngang ở320. Preview không chứng nhận upload/auth runtime. NOT_VERIFIED Expo Go iPhone/Android, Safari iOS/Chrome Android, VoiceOver và đổi ảnh thật trên tài khoản; không gọi mutation để test. Entry/server/tab tạm đã dọn; không thêm package/asset, chưa commit/push.

## Cập nhật mới: tiện ích Đổi điểm

PO yêu cầu bổ sung nút Đổi điểm: header nay có Báo nghỉ / Đổi điểm / Làm mới, cả expanded và compact, icon location-outline. Prop onChangeStop nối từ Home tới [parent/change-stop.tsx](../../mobile/app/parent/change-stop.tsx). Các mô tả hai nút/không có Đổi điểm bên dưới là mốc trước yêu cầu này.

Luồng: chọn học sinh liên kết (GET getLinkedStudents hiện có) → /parent/update-requests/address/[studentId] (danh sách yêu cầu cũ) → tạo yêu cầu/OTP theo luồng V2 hiện có. Không đổi trực tiếp tọa độ, không thêm endpoint hoặc schema. Bộ chọn có loading/error/retry/empty + Liên kết học sinh, refresh khi focus và bỏ qua response sau blur/unmount. Học sinh không AVAILABLE bị disabled, giữ quy tắc từ Student Detail. Safe area header và bottom inset list được xử lý. Các màn request/address/OTP không sửa.

Kiểm chứng: tsc và Expo export all PASS. Browser isolated header320px: expanded đủ3 nhãn; compact Báo nghỉ/Đổi điểm/Làm mới ở x80/136/192, rộng48 và cùng y44 với chuông, không đè nhau; click Đổi điểm tăng local callback counter1. Không có API/business data trong preview. Chọn học sinh có dữ liệu thật, disabled runtime và iPhone còn NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY khi chưa có dữ liệu hợp lệ; không tạo records để test. Preview entry/tab/server tạm đã dọn. Chưa commit/push.

## Cập nhật: header mở rộng/thu gọn theo ảnh PO và V1

Yêu cầu mới nhất thay header tĩnh riêng ở Home PARENT. Hai ảnh đính kèm giống nhau; trạng thái compact căn cứ mô tả của PO và source V1 ParentHomeScreen/ParentHomeCompactHeader. Không thêm Đổi điểm/Báo cáo từ ảnh vì không có các thao tác đó ở Home V2.

- Source: [ParentHomeScrollView](../../mobile/components/parent/home-scroll-view.tsx), [HomeScreen](<../../mobile/app/(tabs)/index.tsx>), [Tabs layout](<../../mobile/app/(tabs)/_layout.tsx>).
- Mở rộng: avatar từ user.avatarUrl qua UserAvatar dùng chung với Cá nhân (lỗi/thiếu ảnh dùng chữ cái đầu nền vàng theo cập nhật Avatar phía trên), Xin chào + user.fullName, phụ đề theo ảnh, chuông hiện có; thẻ trắng bên dưới có Báo nghỉ và Làm mới. Không dùng tên/ảnh phụ huynh mẫu V1.
- Cuộn: avatar thu nhỏ; lời chào/nhãn fade; thẻ tiện ích chuyển thành hai nút tròn cùng hàng avatar/chuông. Cuộn về đầu mở rộng lại. Single instance mỗi control, không tạo hai lớp buttons ẩn chồng nhau.
- Layout Tabs chỉ ẩn header navigator cho index/PARENT; Home staff và header màn khác giữ Phase2. Utility cũ chỉ render cho staff; Parent chuyển hai callback hiện có vào header. Body cards/loading/error/empty và callbacks API/polling/quick leave giữ nguyên.
- Component nhận ScrollViewProps cùng fullName?, avatarUrl?, onOpenLeave?, onChangeStop?, notification? (slot presentation, mặc định NotificationBell thật). Không có API/data/auth logic trong component.
- Animated.ScrollView + Animated.Value theo offset, clamp mở rộng/thu gọn; JS driver theo cách V1. Top inset lấy safe-area context của shell (đã điều chỉnh khi NetworkBanner hiện). Row và label đo onLayout để chiều cao theo font; avatar/action48, compact avatar scale0.8. Frame max560, safe left/right. Content paddingTop bằng chiều cao expanded+8, header absolute phía trên; không bù top inset lần hai.
- Trang ngắn có minHeight viewport+collapse distance để luôn cuộn thu gọn được. Padding top không thay theo offset nên không remount hoặc nhảy nội dung khi đổi trạng thái. RefreshControl giữ props/handler, chỉ thêm progressViewOffset bằng expandedHeight để spinner không nằm dưới header.
- Greeting ẩn khỏi accessibility khi compact; nhãn action không đọc lặp với accessibilityLabel. Avatar không thêm hành động mới. Không thay API chuông hoặc unread dot.

Kiểm chứng lượt này: tsc và Expo export all iOS/Android/Web/server PASS. Chromium IAB isolated component (callbacks bộ đếm cục bộ, không API/User/Student/Trip records): 375px mở rộng nút tiện ích top120 và chuông top44; sau scroll cả ba top44, cao48, bấm Báo nghỉ/Làm mới tăng bộ đếm đúng2. Trang ngắn vẫn collapse; cuộn về đầu khôi phục greeting/card. 320px không tràn ngang, compact controls tách nhau và mở rộng lại được. Safe inset30 trong harness chỉ là geometry; không phải notch native UAT. Entry preview đã xóa khỏi repo, tab/server tạm đã dừng.

NOT_VERIFIED: iPhone/Android Expo, Safari iOS/Chrome Android, ảnh avatar thật/lỗi mạng trên thiết bị, Dynamic Type/reduced motion và native pull-to-refresh, tích hợp có phiên đăng nhập/Trip. Không fake dữ liệu hay gọi mutation để test. Bố cục/kiểm chứng header tĩnh và utility cũ ở các phần dưới là lịch sử trước yêu cầu mới này, được cập nhật bởi mục hiện tại. Các nội dung nghiệp vụ còn lại bên dưới tiếp tục áp dụng.

## Nguồn đối chiếu và bố cục

V1 chỉ đọc: `C:\dongnnp\study-work\code\he-thong-giam-sat-xe-dua-don-hoc-sinh`, dưới `mobile/src/components/parent/home/` gồm ParentHomeQuickActions, ParentHomeChildCard, ParentHomeTripRow, ParentHomeChildrenSection, ParentHomeHeader; style tại `const/parent-home-layout.ts`, `parent-home-styles.ts`.

Kế thừa nền kem, card trắng bo16/20, border ấm, shadow nhẹ, icon tròn48, title19/26, tên16/23, metadata12/18, khối tuyến14px và nội dung tối đa560px. Dùng font hệ thống/Ionicons/token V2; không sao chép asset, provider, auth/data hook hoặc mock V1.

Wireframe trình bày trong commentary trước code, triển khai theo yêu cầu tiếp tục implement của PO:

```text
Header/tab Phase 2 giữ nguyên
Tiện ích                                [Làm mới]
                       [Báo nghỉ]
Chuyến xe của con (khi có cards)
  [Avatar trung tính] [Tên học sinh / Trường]
  [Trạng thái chuyến]
  [Chiều / Tên tuyến]
  [Giờ • Ngày]
  [Điểm danh • Giờ đánh dấu / Lý do vắng nếu có]
  [Biển số • Tài xế]
  [Theo dõi lộ trình]
  [Báo nghỉ chuyến này — theo canReportLeave / isRequesting]
Trạng thái tải / lỗi + thử lại / rỗng + CTA theo V2
```

Không yêu cầu giống từng pixel. Không có lượt duyệt wireframe riêng; căn cứ triển khai là chỉ thị implement của PO, chưa phải PO nghiệm thu giao diện.

## Source và cách dùng

- [HomeScreen](<../../mobile/app/(tabs)/index.tsx>): giữ controller, request, useActiveRefresh, identity/stale-response guards và callbacks; chọn style theo `isParent`. Không tạo state/data provider mới.
- [parentHomeStyles](../../mobile/components/parent/home-styles.ts): stylesheet presentation riêng, import từ `@/components/parent/home-styles`. Không có props/API hoặc side effects. Chỉ dùng cho giao diện PARENT.

Vùng dùng chung: `[styles.original, isParent && parentHomeStyles.override]`. Nhánh JSX phụ huynh dùng trực tiếp parentHomeStyles. Nhánh nhân sự và giá trị style đang dùng của nhân sự giữ nguyên. Chỉ bỏ 18 định nghĩa style cũ đã được chuyển khỏi nhánh phụ huynh và không còn dùng; giữ các style cũ khác.

Khi mở rộng: dùng colors cho brand/foreground, tones cục bộ cho card border/route/avatar; cho Text flex/minWidth0 và chiều cao theo nội dung. Không sửa generic styles nếu chỉ restyle Parent. Giữ handler/điều kiện dữ liệu ở HomeScreen; stylesheet không suy ra trạng thái nghiệp vụ.

## Thành phần được giữ / điều chỉnh

| V2 hiện có | Thực hiện |
| --- | --- |
| Tiện ích, Báo nghỉ và nút refresh | Giữ handler và nhãn; card trắng, icon nền vàng nhạt, refresh tròn48 có accessibility label |
| Dữ liệu card | Giữ tên học sinh/trường, trạng thái chuyến, chiều/tuyến, giờ/ngày, điểm danh, markedAt, lý do vắng, biển số và tài xế |
| Tên/trường/trạng thái | Cho tên/trường đủ chỗ; trạng thái chuyển xuống dòng riêng để tránh ép tên trên điện thoại nhỏ |
| Tên tuyến | Bỏ giới hạn một dòng, cho wrap để không mất thông tin tuyến |
| Điểm danh | Giữ getAttendanceBadge và cách hiển thị đã xuống xe an toàn; giờ đánh dấu, absenceReason và điều kiện ABSENT không đổi |
| Theo dõi lộ trình | Giữ `/trip/${card.tripId}`; CTA vàng dạng pill, chữ/icon foreground, target tối thiểu48 |
| Báo nghỉ chuyến này | Giữ canReportLeave, isRequesting, spinner, disabled, toàn bộ trip/student/subject/route/date/direction payload và onSuccess refresh; thêm opacity khi disabled và label theo tên con |
| Tải/lỗi/rỗng | Giữ toàn bộ chữ và CTA, restyle cùng hệ card/nút; pull-to-refresh và polling8000ms giữ nguyên |
| Heading Chuyến xe của con | Bổ sung phân cấp nội dung khi có cards; không đếm số con hoặc tạo KPI mới từ dữ liệu chuyến |
| Avatar | Giữ placeholder person V2; không tự bổ sung ảnh giả hoặc sử dụng ảnh mẫu của V1 |
| Quick actions V1 | Không đưa thêm Đổi điểm/Yêu cầu/date picker/pagination V1 vào Home vì V2 hiện điều phối các chức năng đó qua màn hiện có; không xóa khả năng truy cập của V2 |
| Nhân sự | Source JSX nhánh Driver/Bus Attendant không đổi; conditional override là false với các role này |

Không đổi `getStatusBadge`, `getAttendanceBadge`, status labels, format giờ/ngày hoặc khóa card. Không thêm Student/Trip fields hoặc API. Không xóa nội dung v2 để khớp V1.

## Responsive, safe area, cuộn và bàn phím

Nền kem toàn vùng; content width100%, max560, canh giữa, padding16/bottom24, gap20. Card không có chiều cao cố định. Tên/trường/tuyến/driver và nội dung lý do vắng được wrap; badge có maxWidth100%; hàng attendance có flexWrap. Nút CTA minHeight48, chữ được co/wrap; nhấn không dịch bố cục.

ScrollView/pull-to-refresh hiện có được giữ; không thêm header/tab phủ nội dung. Safe area/top/bottom do shell Phase 2 sở hữu, không cộng thêm inset ở Home. Screen không có input nên không thêm keyboard offset hoặc wrapper tránh bàn phím. Các form/báo nghỉ được điều hướng vẫn dùng keyboard handling hiện có.

## Kiểm chứng thực tế

Môi trường Windows/Node v24, Expo/TypeScript sẵn có; Chromium IAB desktop. V1 chỉ đối chiếu source, không chạy V1.

| Kiểm tra | Kết quả |
| --- | --- |
| `cd mobile; npx --no-install tsc --noEmit` | PASS |
| Expo export `--platform all --output-dir <temp>` | PASS iOS/Android/Web/server; build artifacts ngoài repo |
| AST source check trước/sau | PASS API/router/useEffect/useCallback/useActiveRefresh/quick-leave call bodies không đổi; toàn bộ JSX text cũ còn; staff JSX bằng nhau sau chuẩn hóa CRLF/LF |
| Browser isolated preview từ JSX return hiện tại, stylesheet thật, không auth/controller/API | PASS empty/error320×568, loading375×812, empty1440×900; không tràn ngang320/1440; nội dung canh giữa desktop; nút refresh/empty CTA cao48; CTA cuối sau cuộn/focus nằm trong viewport (top397/bottom445 ở320px) |
| Accessibility label nút rỗng cuối | PASS browser nhận đúng button Xem lịch tuần của con, không ghép tên glyph vào label |
| Tình trạng dữ liệu hợp lệ | PASS truy vấn Prisma read-only: tài khoản PARENT PO tạo trong session tồn tại, có0 học sinh liên kết; không lưu PII/id/credentials vào docs |
| Thẻ có chuyến và mọi trạng thái điểm danh trên app thật | NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY: cần tài khoản có học sinh liên kết và Trip/attendance hợp lệ; không tự thêm records hoặc dữ liệu mẫu vào preview |
| Polling, mutation báo nghỉ, route action runtime | NOT_VERIFIED; không login/POST/OTP hoặc mutation chỉ để test style. Source parity không thay cho E2E |
| Expo iPhone/Android, Safari iOS/Chrome Android, Dynamic Type/VoiceOver thật | NOT_VERIFIED: chưa có thiết bị/surface tương ứng kết nối |
| Lint | NOT_VERIFIED: Mobile không có lint script/config riêng; không thêm dependency |

Preview có `parentCards=[]`, các trạng thái presentation loading/error và callbacks inert; không giả tạo User/Student/Trip, không bypass auth của app. Header/footer chỉ bao vùng để kiểm tra content, không dùng preview chứng nhận router/tab behavior. Entry tạm đã xóa khỏi source; server/tab kiểm thử đã dừng/đóng.

## Giới hạn / vấn đề hiện có

- CTA trạng thái rỗng **Xem lịch tuần của con** tiếp tục trỏ `/(tabs)/schedule` như source trước task, trong khi tab schedule dành cho nhân sự. Đây là bất nhất route có sẵn, ghi nhận để xử lý riêng; không đổi route/context nghiệp vụ trong task chỉ style.
- Chưa có kiểm chứng render card với tên/tuyến/lý do dài hoặc trạng thái disabled bằng dữ liệu hợp lệ; chỉ triển khai wrap/minHeight trong source, không báo PASS runtime cho phần này.
- Bản đồ, màn Theo dõi/Cá nhân và nội dung Trang chủ nhân sự không restyle ở task này. Giữ mọi thay đổi local từ Phase1/Phase2/NetworkBanner.

Bước tiếp theo duy nhất: nghiệm thu Trang chủ phụ huynh trên iPhone Expo bằng dữ liệu học sinh/chuyến hợp lệ do PO cung cấp.
