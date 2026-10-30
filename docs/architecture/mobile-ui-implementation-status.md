# Hiện trạng giao diện Mobile — Onboarding, xác thực và điều hướng

Ngày cập nhật: **29/10/2026 (Asia/Saigon)**. Commit `db02de6` là mốc Phase1 trên nhánh `dongnnp/mobile/refactor-ui`; các cập nhật local được ghi riêng bên dưới. Tài liệu này ghi nhận phần đã triển khai trong đợt chuyển phong cách V1 sang V2; không phải phê duyệt toàn bộ kế hoạch chuyển giao diện hoặc chứng nhận nghiệm thu thiết bị.

## Rail theo trạng thái nghiệp vụ — 30/10/2026, mới nhất

Bus trên rail và nhảy theo mốc PO chỉ định, không cần GPS. Dùng operational-state/incident API có sẵn cho actual departure, school arrival và trạng thái từng child;3 icon ở node,4 giữa chặng. Thêm tag điểm danh/sự cố khi card đóng, ngày ngang heading, route/giờ chuyển sang vị trí mới, bỏ khối lịch cũ. Bubble số phút theo lịch, sớm/trễ từ timestamp thực; không tạo ETA hoặc event rời pickup. [Spec và API thiếu/đủ](mobile-parent-student-journey.md). Typecheck/export all,24 pure tests và presenter responsive PASS; native/API runtime NOT_VERIFIED. Chưa commit/push. Mô tả GPS-only/pin ở các phần trước đã được thay thế bởi mục này.

## Mốc điểm đón và giờ hành trình — 30/10/2026, local

Điểm đón của con nay nằm trực tiếp trên rail, time badge nổi phía trên và nối đúng mốc xuất phát/đích đến; không còn dòng text trạng thái lặp trong diagram. Giữ tag chuyến/điểm danh và đầy đủ thông tin/action V2. Lấy giờ dự kiến từ schedule/stop, mốc xuống xe thực tế của con khi có; không nhầm giờ về bãi với giờ trả con. Sơ đồ chia chặng để nhãn luôn rõ; GPS thật quyết định vị trí trong chặng, thiếu dữ liệu không tạo tiến độ. [Component/nguồn giờ/kiểm chứng/giới hạn](mobile-parent-student-journey.md). Tsc/export all,14 pure tests và diagram preview320/390/844/1440 PASS; native/authenticated GPS NOT_VERIFIED. Chưa commit/push.

## Card học sinh Parent Home và hành trình — 30/10/2026, local

Đã cải thiện disclosure đo nội dung, responsive/tag dài, xe/tài xế tách hàng; thêm thanh bus theo điểm danh từng studentId và fix GPS hợp lệ từ API GET hiện có, shared poll5s theo tripId. Không ETA, tiến độ trung gian giả hoặc backend change. Mất dữ liệu giữ fix gần nhất/trung tính; giảm chuyển động theo AccessibilityInfo, dừng khi đóng/blur/background. Giữ Home polling8s, route và Báo nghỉ. [Mapping tất cả trạng thái thực, component API, wireframe, GPS limits và kết quả kiểm chứng](mobile-parent-student-journey.md). Typecheck/export all,8 pure tests và presentation preview PASS; native/authenticated GPS NOT_VERIFIED. Chưa commit/push.

## Lịch học & Xe đưa đón — chống tràn card (29/10/2026, local)

Đã sửa [parent/schedule.tsx](../../mobile/app/parent/schedule.tsx) để biển số/hãng xe dài không đẩy Báo nghỉ hoặc Xem lộ trình ra khỏi card. Đây là điều chỉnh layout của lịch học sinh PARENT, không thay lịch nhân sự hoặc Web Admin.

```text
[Giờ bắt đầu – kết thúc] [Chiều] [Trạng thái]
Tên tuyến
Tên trường
─────────────────────────────────────────
[Biển số / Hãng xe — đầy đủ, tự xuống dòng]
[Báo nghỉ]                    [Xem lộ trình]
```

Giờ và nhóm badge tự chuyển hàng khi thiếu chỗ; từng badge giới hạn theo vùng card. Footer tách hai hàng: vehicleInfo/vehicleText chiếm bề ngang có thể co với flex1/minWidth0; footerActions là hàng độc lập có flexWrap. ActionLink/virtualNotice canh phải, thao tác tự sang hàng khi vùng hiển thị quá hẹp. Báo nghỉ/Xem lộ trình có minHeight48. Nội dung không dùng numberOfLines, ellipsis, cắt chuỗi hoặc overflow hidden để giấu lỗi bố cục; chiều cao card tăng theo nội dung.

Giữ đầy đủ giờ bắt đầu/kết thúc, chiều, trạng thái, tuyến, trường, biển số, hãng xe và fallback Chưa gán xe. Giữ getScheduleStatusLabel, isVirtual/isClickable, canReportLeave, disabled/spinner, stopPropagation, payload Báo nghỉ, onSuccess refresh, route chi tiết hoặc nhãn Chưa tạo chuyến. Bộ chọn tuần/ngày, Hôm nay, ngày Việt Nam, polling12000ms, pull-to-refresh, loading/error/empty và padding safe area giữ nguyên.

PASS TypeScript, Expo export iOS/Android/Web/server và đối chiếu toàn bộ phần render/controller trước StyleSheet: giống snapshot sau khi thay ngược đúng hai tham chiếu style của wrapper. API client, status helper và lịch nhân sự byte-identical. PASS Chromium IAB preview16 bố cục (4 kiểu trình bày ×240/320/390/1440px): chuỗi có khoảng trắng/liền mạch, hai thao tác, một thao tác, nhãn Chưa tạo chuyến. Tất cả text/thao tác nằm trong card, không tràn ngang; 240px xác nhận hai thao tác tự chuyển hàng. Preview chỉ dùng nhãn UI và stylesheet thật, không DTO/record/API hoặc dữ liệu nghiệp vụ giả; script/server/tab tạm đã dọn.

NOT_VERIFIED: Expo Go iPhone/Android, Safari iOS/Chrome Android, Dynamic Type và luồng thật có phiên PARENT/OTP/báo nghỉ. Không tạo dữ liệu hoặc gọi mutation để kiểm tra. Chưa commit/push. [Báo cáo task](../ai-review/LATEST.md).


## Chuyến xe của con — thẻ mở rộng (29/10/2026, local)

Tóm tắt gồm ảnh học sinh, tên/trạng thái cùng hàng và trường học; nhấn header để mở/đóng chi tiết. Giữ đủ field/action V2, source controller, pull-to-refresh/polling và tiện ích chỉ Báo nghỉ/Đổi điểm. [ParentTripCard/source map/kiểm chứng](mobile-parent-home-ui.md). Tsc/export all và component preview320/390/1440 PASS; dữ liệu thực/Expo iPhone còn NOT_VERIFIED. Không commit/push.

## Toàn bộ màn OTP — 29/10/2026 (local)

Đã restyle đủ 5 màn OTP và nhập ảnh verify-phone V1 nguyên bản: đăng ký, đặt lại mật khẩu, liên kết học sinh, xác nhận cập nhật học sinh và báo nghỉ. Giữ tất cả nội dung/nút/validation/resend/autoFocus V2, gồm cả hai ô mật khẩu reset và nhãn kênh nhận mã. Dùng OtpHero/otpStyles, form430px, safe area và KeyboardScrollView. [Tài liệu chi tiết/source map/kiểm chứng](mobile-otp-ui.md). Typecheck/export iOS/Android/Web/server PASS; preview5 màn ×320/390/1440 PASS, không thay kiểm chứng OTP thật hoặc bàn phím/thiết bị native. Chưa commit/push.

## Login — ổn định chữ sau đăng xuất (28/10/2026)

PO báo placeholder Email hoặc số điện thoại đổi phông sau logout, reload thì hết. Điều tra không thấy logout/auth sửa font toàn cục; SpaceMono chỉ được nạp, Login không dùng StyledText. Login trước chỉ đặt fontSize15/color, bỏ mặc định family/weight/style/letterSpacing. RN iOS Fabric có recycle pool; source cài tại node_modules cho thấy prepareForRecycle không reset defaultTextAttributes và RCTAttributedTextUtils chỉ thêm NSKern khi có letterSpacing. [Issue RN42589](https://github.com/react/react-native/issues/42589) có ghi nhận thuộc tính khoảng cách chữ lan sang input khác; issue mang nhãn Cannot Reproduce, các workaround là báo cáo cộng đồng. **Đây là nguyên nhân khả dĩ theo source và triệu chứng, chưa tái hiện/xác nhận trên iPhone của PO.**

[login.tsx](../../mobile/app/(auth)/login.tsx) thêm inputTypography dùng chung cho identifier/password: iOS system-ui (được RN0.88 hỗ trợ), Android sans-serif, Web giữ default font stack; fontWeight400, fontStyle normal, letterSpacing0. Giữ fontSize15, layout/color và toàn bộ JSX/state/handlers. Explicit0 gửi NSKern0, thay vì bỏ thuộc tính khoảng cách chữ. Không đổi font file/global defaults, không vá node_modules, không remount input theo focus/toggle/key, không thêm delay/autofocus/keyboard offset hoặc thay autofill/security props. API/logout/navigation giữ nguyên. [RN TextStyle props](https://reactnative.dev/docs/text-style-props).

PASS TypeScript/Expo export iOS/Android/Web/server và source parity LoginScreen JSX/state/handlers, AuthContext/Settings/Root byte-identical. NOT_VERIFIED lỗi gốc và hiệu quả khắc phục trên Expo Go iPhone, Android và trình duyệt mobile; không dùng browser preview để khẳng định lỗi Fabric đã hết, không thực hiện login/logout mutation để test. Bước nghiệm thu: mở app, ghi nhận chữ ở Login → PO đăng nhập/đăng xuất → so sánh placeholder và chữ nhập với lần đầu, thử hiện/ẩn mật khẩu và lặp lại không reload. Chưa commit/push.

## Avatar Trang chủ phụ huynh/Cá nhân (28/10/2026)

Hai màn dùng chung UserAvatar cho URL ảnh, fallback chữ đầu nền vàng và xử lý lỗi ảnh; giữ Home48px/compact38.4px, Profile72px/camera badge. Nguồn vẫn là AuthContext.user, upload/setUser/refreshUser không đổi. [Contract, data flow và kiểm chứng](mobile-parent-home-ui.md#avatar-đồng-bộ-với-cá-nhân--28102026). Tsc/export all và isolated preview320/390 PASS; đổi ảnh thật/Expo iPhone chưa nghiệm thu. Không thêm package/asset hoặc commit/push.

## Loading đơn giản với logo app (28/10/2026)

Thay bố cục minh họa sau đăng nhập PARENT bằng logo trên nền kem, không card/đổ bóng/role title. Dùng cùng bố cục cho nhánh tải ban đầu của [RootNavigation](../../mobile/app/_layout.tsx). Mẫu3 (xe buýt navy/đường vàng) kết hợp mẫu1 (wordmark, To giảm opacity) do PO cung cấp; mẫu2 thiếu SVG nên không sử dụng hoặc tự hoàn thiện. Không sửa app icon/native Expo splash, loading trong các màn nghiệp vụ hoặc splash các role khác.

[BrandLogo](../../mobile/components/brand-logo.tsx) không có props, đóng gói symbol128×79.27 và wordmark tối đa260×54.36, đúng tỷ lệ SVG, accessibility label Road To School. SVG gốc tại `mobile/assets/images/brand/road-to-school-symbol.svg` và `road-to-school-wordmark.svg`; PNG đi kèm lần lượt528×327 (10,404 bytes),1320×276 (23,965 bytes), nền trong suốt, render từ chính SVG bằng sharp đã có trong web/node_modules, không cài package hoặc thêm runtime SVG dependency. Wordmark giữ font-family Manrope/Arial/sans-serif theo mẫu; không thêm font Manrope vào app, rasterizer dùng fallback sẵn có khi thiếu font. App không cần tải font hoặc logo qua mạng. Giữ SVG để xuất lại PNG khi cần đổi logo/font.

[AppLoadingSplash](../../mobile/components/app-loading-splash.tsx) thuần trình bày: `message?: string` mặc định Đang tải...; `progressWidth?: Animated.AnimatedInterpolation<string>`. Không truyền progressWidth thì spinner; truyền interpolation thì thanh vàng180×4. Chỉ một chỉ báo mỗi trạng thái, accessibility progressbar/busy và label là message. SafeAreaView + ScrollView padding24, frame max320 căn giữa; màn thấp cuộn theo nội dung, wordmark nằm trong frame aspect ratio để tránh chiều cao ảnh intrinsic trên Web. Không input/keyboard/nút mới.

[ParentLoginSplash](../../mobile/components/parent/login-splash.tsx) vẫn nhận progressWidth từ RoleSplash và chuyển cho AppLoadingSplash với Đang mở trang chủ...; RoleSplash không đổi byte nào: default1200ms, Animated.timing/onFinish, nhánh role khác giữ nguyên. Root chỉ thay JSX loading và bỏ import/styles cũ không còn dùng; readiness/auth/navigation hooks/providers không đổi. Thanh này biểu diễn thời gian chuyển màn có sẵn, không phải phần trăm tải API.

PASS TypeScript, Expo export iOS/Android/Web/server, so sánh RoleSplash byte-identical và AST hooks root. Chromium IAB isolated component preview320×568,390×844,568×320,1440×900: hai PNG tải đúng kích thước, không tràn ngang, logo width260, startup spinner và parent bar hiện đúng. Màn ngang viewport nội dung242px cuộn được28px; safe-area giả lập44/34 để kiểm tra bố cục, không phải phép đo iPhone thật. Preview progress cố định45%, không chạy login/API/auth mutation. NOT_VERIFIED Expo Go iPhone/Android, Safari iOS/Chrome Android, VoiceOver/Dynamic Type, khởi động/đăng nhập thật. Entry/server/tab/viewport override tạm đã dọn. Chưa commit/push.

## Đổi điểm đón/trả — Chưa liên kết học sinh (28/10/2026)

[change-stop.tsx](../../mobile/app/parent/change-stop.tsx) dùng lại [TrackingEmptyState](../../mobile/components/parent/tracking-empty-state.tsx) tại `FlatList.ListEmptyComponent`, sau nhánh loading/error. Giữ title **Chưa có học sinh liên kết**, CTA **Liên kết học sinh** tới `/parent/link-student`, header/back, Thử lại, GET linked students, guard AVAILABLE và route address-request khi có học sinh. Không thêm FAB/refresh hoặc thao tác của màn Theo dõi vào màn này.

Component hiện dùng chung cho hai màn: `onLink: () => void` bắt buộc; `title?: string` mặc định **Chưa có học sinh nào**; `description?: string | null` mặc định nội dung liên kết mã định danh/QR của Theo dõi. Truyền `description={null}` để giữ màn Đổi điểm không có mô tả như trước; khi thiếu mô tả, CTA cách title20px. Cách dùng: `<TrackingEmptyState title="Chưa có học sinh liên kết" description={null} onLink={() => router.push('/parent/link-student')} />`. Không có effect/data/router bên trong component; đổi copy qua props, giữ nghiệp vụ tại màn hình.

Card/ảnh/viền/bo góc/CTA theo cùng mẫu V1 đã dùng ở Theo dõi, tái sử dụng ảnh hiện có, không thêm asset/dependency. Giữ FlatList cuộn tự nhiên, maxWidth560/padding16 và paddingBottom24 + safe-area bottom cũ; không thêm khoảng dành FAB vì màn này không có FAB. Header nằm trong flow, safe area do AppHeader xử lý; không có input/keyboard mới.

PASS TypeScript noEmit và Expo export all iOS/Android/Web/server; AST/source parity xác nhận chỉ import và ListEmptyComponent của change-stop thay đổi, toàn bộ phần còn lại giữ nguyên. Chromium IAB isolated preview với AppHeader/component thật và khung FlatList không gọi API: 320×568, 390×844, 1440×900 không tràn ngang; title đầy đủ, CTA cao48px, ảnh tải560×560; callback link/back đếm cục bộ2. Kiểm tra component mặc định của Theo dõi ở320px giữ title/mô tả/CTA. Preview không xác nhận navigation/auth runtime; NOT_VERIFIED Expo Go iPhone/Android, Safari iOS/Chrome Android, chữ lớn/VoiceOver và luồng liên kết thật. Không seed/data mutation, chưa commit/push.

## Theo dõi — Chưa liên kết học sinh (28/10/2026)

Route [tracking.tsx](../../mobile/app/(tabs)/tracking.tsx) chỉ thay phần hiển thị khi tải thành công và danh sách rỗng. [TrackingEmptyState](../../mobile/components/parent/tracking-empty-state.tsx) nhận `onLink: () => void`, cùng props copy tùy chọn được mô tả ở mục Đổi điểm phía trên; không sở hữu data, effect, auth hoặc router. Tích hợp bằng `<TrackingEmptyState onLink={handleAddPress} />`; dùng copy mặc định và màn hình vẫn quyết định trạng thái/điều hướng. Mở rộng trình bày tại component; giữ các xử lý nghiệp vụ ở màn hình/provider hiện có.

Tham chiếu V1: `mobile/src/components/parent/students/ParentChildrenEmptyState.tsx` và `ParentAddStudentIllustration.tsx`. Kế thừa card trắng viền #EAE7DE, bo20, padding16, max560, ảnh học sinh/xe buýt/trường, title20/27, mô tả12/18 và CTA vàng dạng viên thuốc. Dùng tokens V2 cho màu thương hiệu, Ionicons và font hệ thống có sẵn. Ảnh [parent-add-student.png](../../mobile/assets/images/parent/parent-add-student.png) sao chép nguyên file từ V1/mobile/assets/parent-home: 30,777 bytes, SHA256 hai bản trùng `e853b3503d64502336cce9c97b40ba19249636fb5b48678ff5b1d9eb215be01e`. Không sửa V1 hoặc ảnh gốc.

Giữ nguyên nội dung V2, CTA **Liên kết học sinh** và FAB **+**, cùng gọi handler cũ tới `/parent/link-student`; giữ header/chuông, kéo làm mới, loading/error/retry, thẻ học sinh và hủy liên kết. Không mang hai luồng/nút Thêm trẻ/Nhập mã liên kết, QuickGuide hoặc provider của V1 sang; V2 dùng một luồng liên kết chung đã có. Không thêm thao tác giả/API/data.

Ảnh tối đa240px, thu nhỏ theo chiều rộng viewport, crop khoảng trắng trong View như V1; card căn trên và giữa khi màn rộng. CTA tối thiểu48px, text wrap; ScrollView flex có vùng cuộn hữu hạn và dành90px phía dưới ngoài viewport cuộn (FAB58 + khoảng16 mỗi phía), tránh FAB che card/CTA khi màn thấp. Giữ FAB ở vị trí cũ. Safe area/header/tab tiếp tục do navigation shell Phase2 sở hữu; không thêm offset bàn phím vì phần này không có input.

PASS: TypeScript; Expo export iOS/Android/Web/server; đối chiếu logic màn hình và các API/router call trước/sau; checksum ảnh. Chromium IAB isolated preview dùng component thật + AppHeader, footer mô phỏng: 320×568, 390×844, 1440×900 không tràn ngang, ảnh tải560×560, card desktop giới hạn560. Màn320 cuộn được48px; CTA và FAB không giao nhau. Hai control trong preview gọi callback đếm cục bộ; không gọi API/liên kết thật. Entry/server/tab tạm đã dọn. NOT_VERIFIED: Expo Go iPhone/Android, Safari iOS, font lớn/VoiceOver, refresh native và luồng liên kết/QR có xác thực; không tạo dữ liệu để nghiệm thu. Web Admin không đổi. Chưa commit/push.

## Loading phụ huynh sau đăng nhập — mốc trước (28/10/2026)

**Lịch sử:** bố cục ảnh/card dưới đây đã được thay bằng logo app ở mục Loading đơn giản phía trên. Kết quả kiểm chứng trong mục này chỉ áp dụng cho giao diện ảnh/card tại mốc trước.

Source: [RoleSplash](../../mobile/components/RoleSplash.tsx), [ParentLoginSplash](../../mobile/components/parent/login-splash.tsx). Chỉ PARENT dùng giao diện mới: nền kem, brand RoadToSchool, card trắng bo28/bóng nhẹ, minh họa mẹ/con/xe buýt, title Phụ huynh học sinh, spinner + Đang mở trang chủ và bar vàng. SafeAreaView/ScrollView hỗ trợ màn thấp/chữ lớn, content max420, ảnh contain theo chiều cao viewport, không có nút mới.

Tái sử dụng mobile/assets/images/onboarding/slide2.jpg đã sao chép từ V1/mobile/assets/onboarding/slide2.jpg. Hai SHA256 trùng3233DD32992FC1AA01EE063ABC891BA2D84173BE2ED61CADB6895391B10578B7. Không thêm/sửa ảnh, không dùng ảnh tài xế cho phụ huynh. V1 chỉ đọc. ParentLoginSplash nhận progressWidth AnimatedInterpolation<string>, không có effect/timer/request. RoleSplash vẫn sở hữu useEffect/Animated.timing, durationMs mặc định1200 và onFinish; Root/Auth không đổi. Bar biểu diễn chuyển màn theo thời gian, không phải phần trăm tải API. Role khác giữ JSX/style cũ.

PASS tsc, Expo export all iOS/Android/Web/server, checksum và source parity timer/non-parent JSX (chuẩn hóa EOL). Chromium IAB isolated view320x568 và390x844: ảnh tải natural768x580, không tràn ngang, title/loading trong card. Preview giữ progress45% để quan sát, không chạy auth hoặc tạo User/Session/Trip. Entry/server/tab tạm đã dọn. NOT_VERIFIED iPhone/Android/Safari iOS/Chrome Android, VoiceOver/Dynamic Type và đăng nhập thực tế; chưa dùng auth mutation để test. Không cài dependency/commit/push.

## Header phụ huynh theo scroll — cập nhật mới

Avatar/tên/chuông + tiện ích mở rộng; cuộn thu gọn Báo nghỉ/Làm mới ngang avatar theo V1. [Chi tiết](mobile-parent-home-ui.md); body và nghiệp vụ không đổi, chưa commit/push.

## Trang chủ phụ huynh — 28/10/2026

Đã restyle riêng PARENT bằng style V1: tiện ích, thẻ chuyến, nút, loading/error/empty; giữ mọi dữ liệu/callback V2 và giao diện nhân sự. Xem [mobile-parent-home-ui.md](mobile-parent-home-ui.md) cho ánh xạ nội dung, source, responsive, kiểm chứng và route rỗng có sẵn cần lưu ý. Chưa nghiệm thu thẻ có chuyến/iPhone; tài khoản PO có0 học sinh liên kết, không tạo test data. Local chưa commit/push.

## Cập nhật Phase 2 — 28/10/2026

Header và tab điều hướng đã được đồng bộ local theo V1; tái dùng AppHeader/HeaderAction/TabButton, giữ routes và quyền V2. Phạm vi file, tham số, safe area/keyboard, các nút giữ/bỏ và kết quả kiểm chứng: [mobile-navigation-phase2.md](mobile-navigation-phase2.md). Phase 1 bên dưới giữ mốc kiểm chứng lịch sử; Phase 2 chưa commit/push và còn nghiệm thu thiết bị/luồng có xác thực.

## 1. Phạm vi đã triển khai

| Hạng mục | Source V2 | Trạng thái |
| --- | --- | --- |
| Bốn trang onboarding | `mobile/app/(auth)/onboarding.tsx`, `mobile/components/onboarding/OnboardingCarousel.tsx` | Đã thêm; vuốt, chọn chấm trang, Tiếp theo, Bỏ qua, Bắt đầu; đã bỏ bộ đếm 1/4 |
| Login | `mobile/app/(auth)/login.tsx` | Đã restyle bằng ảnh/phong cách V1, giữ đăng nhập V2, hiện/ẩn mật khẩu, khôi phục mật khẩu và liên kết Đăng ký |
| Quên mật khẩu | `mobile/app/(auth)/forgot-password.tsx` | Đã restyle; giữ hướng dẫn, yêu cầu OTP, lỗi/đang gửi, nút quay lại và liên kết đăng nhập |
| Đăng ký phụ huynh | `mobile/app/(auth)/register.tsx` | Đã restyle; giữ họ tên, chọn SĐT/Email, identifier, mật khẩu/xác nhận, hai nút hiện/ẩn, validation và chuyển xác thực OTP |
| Tránh bàn phím che ô nhập | `mobile/components/keyboard-scroll-view.tsx` và `.web.tsx` | Đã tích hợp cho 29 TextInput trên 15 file màn hình, gồm form, modal và drawer hiện có |

Các màn OTP đăng ký và Đặt lại mật khẩu đã có nghiệp vụ V2 và đã được tích hợp xử lý bàn phím; **chưa chuyển phong cách V1 cho các màn đó** trong đợt này. Web Admin, các màn nghiệp vụ còn lại và bản đồ chưa được restyle theo V1; Trang chủ phụ huynh đã được triển khai riêng theo cập nhật phía trên; header và ba tab chính đã có cập nhật Phase 2 theo tài liệu liên kết phía trên. Chỉ những vùng nhập liên quan mới được điều chỉnh xử lý bàn phím.

## 2. Nguyên tắc trình bày và phần bảo toàn

- V1 cung cấp ảnh và phong cách: nền sáng, bố cục mở, phân cấp chữ, input trắng bo góc có icon, CTA vàng dạng viên thuốc. Tỷ lệ ảnh/khoảng cách được điều chỉnh theo biểu mẫu V2.
- Dùng `colors` trong `mobile/constants/theme.ts`, StyleSheet, Ionicons và font hệ thống hiện có. Có SafeAreaView, vùng nội dung tối đa 430px trên ba form đã restyle, ảnh `contain` và vùng cuộn cho form dài.
- Không nhập provider, formatter, API client, quy tắc mật khẩu hoặc OTP flow của V1. Không thêm Google login/remember-me để giữ bố cục V1.
- Auth context, JWT/session, role guard, splash sau đăng nhập, điều hướng và payload V2 được giữ. Không thay backend, Prisma/migration, package/lockfile hoặc dữ liệu nghiệp vụ trong đợt UI này.
- Loading/disabled/error của V2 vẫn có. Không gộp hoặc xóa trường nghiệp vụ chỉ vì V1 có ít trường hơn.

### Nội dung đang hiển thị sau tinh chỉnh

Login và Quên mật khẩu đặt `autoFocus={false}`; mở trang không yêu cầu focus. Đăng ký không thêm autofocus hay lời gọi focus. Người dùng chạm vào trường thì cơ chế bàn phím dùng chung mới xử lý vùng nhìn thấy.

Nhãn liên kết đăng ký trên Login hiện là **Đăng ký**. Trên Đăng ký, các nhãn họ tên/identifier/mật khẩu/xác nhận riêng phía trên ô đang được comment trong source; nội dung nhận biết nằm ở placeholder và accessibilityLabel. Bộ chọn hình thức nhận mã vẫn có nhãn **Hình thức nhận mã xác thực**. Quên mật khẩu cũng dùng placeholder nhận biết trường. Đây là hiện trạng sau các tinh chỉnh đã được đưa lên GitHub, không phải trạng thái ở mọi báo cáo lịch sử trước đó.

## 3. Onboarding: trạng thái và điều hướng

- Bốn trang có nội dung: RoadToSchool; An tâm mỗi hành trình; Cùng chăm sóc học sinh; Luôn kết nối. Dữ liệu ảnh/copy ở `mobile/constants/onboarding.ts`.
- `mobile/context/onboarding-context.tsx` quản lý nạp, đã hoàn thành, đang lưu và lỗi lưu. Chặn ghi lặp trong lúc đang lưu. Có Thử lại hoặc Tiếp tục không lưu nếu lưu thất bại; lựa chọn không lưu chỉ có hiệu lực trong phiên hiện tại.
- `mobile/services/onboarding-storage.ts` lưu khóa `r2s_onboarding_v1_completed`: SecureStore trên native, localStorage trên Web. Khóa riêng với token, áp dụng theo thiết bị/trình duyệt và được giữ khi logout.
- `mobile/utils/onboarding-route.ts` quyết định điểm vào: chờ nạp preference; phiên đã xác thực bỏ qua onboarding; lần đầu chưa đăng nhập đi qua onboarding từ điểm vào/Login; hoàn thành hoặc bỏ qua chuyển về Login.
- Các liên kết trực tiếp tới Đăng ký, OTP, Quên/Đặt lại mật khẩu không bị onboarding chặn. Guard đăng nhập/phân quyền gốc vẫn xử lý các trường hợp còn lại trong `mobile/app/_layout.tsx`.
- Sau khi đã hoàn thành, Reload không tự xóa preference. **Chưa có nút Xem lại giới thiệu**; đề xuất đó mới được thảo luận, chưa triển khai. Không mô tả route onboarding như một cách xem lại khi marker đã hoàn thành.
- Có chỉ báo chấm trang, vùng chạm lớn, hỗ trợ reduced motion; không có số đếm 1/4 hoặc tự chạy slide.

## 4. Các luồng xác thực V2 được giữ

| Màn hình | Hành vi giữ trong source |
| --- | --- |
| Login | Trim identifier; kiểm tra dữ liệu trống; gọi `useAuth().login`; hiển thị lỗi API/fallback; giữ trạng thái đang gửi, role splash và điều hướng của AuthProvider |
| Quên mật khẩu | Gọi `forgotPasswordRequestOtp` với identifier đã trim; chuyển `/(auth)/reset-password` cùng `identifier` và `initialMessage` từ phản hồi trung tính; không thêm cách xác minh khác |
| Đăng ký phụ huynh | Tên tối thiểu 2 ký tự, identifier bắt buộc, mật khẩu tối thiểu 6 ký tự, xác nhận trùng; gọi `registerRequestOtp`; chuyển `/(auth)/verify-otp` cùng dữ liệu đăng ký hiện có. Không tạo User ngay trong màn này |
| Bộ chọn SMS/Email | Đổi nhãn/placeholder và kiểu bàn phím identifier; giữ hành vi xóa identifier khi chuyển kênh |

Đây là mô tả implementation hiện tại, không bổ sung contract hoặc chứng nhận gửi OTP/email/SMS thực tế. Không ghi credentials, token hay dữ liệu nhập của người dùng vào tài liệu.

## 5. Xử lý bàn phím dùng chung

Chi tiết implementation, phạm vi form/modal/drawer và checklist: [mobile-keyboard-behavior.md](mobile-keyboard-behavior.md). Quy tắc bắt buộc tại [WORKING_RULES.md mục 3.5](../WORKING_RULES.md#35-mobile-keyboard--focus-visibility).

Native dùng keyboard frame và bounds đo thực tế; iOS có automatic keyboard insets, Android dùng resize hiện có. Web dùng giao điểm scroll region với VisualViewport. Chỉ cuộn phần vượt vùng nhìn thấy, có khoảng đọc nhỏ; bỏ phần bù khi đóng bàn phím/focus rời vùng tương ứng. Không thêm KeyboardAvoidingView bù trùng, chiều cao bàn phím giả định hoặc key làm remount form. Input/textarea trong modal và drawer có vùng cuộn riêng.

## 6. Ảnh đã sao chép từ V1

Đường dẫn nguồn dưới `V1/mobile/assets/`; đích dưới `V2/mobile/assets/images/`. V1 chỉ đọc. Không sao chép toàn bộ asset hoặc thêm SVG/font dependency.

| Nguồn | Đích | Bytes |
| --- | --- | ---: |
| `onboarding/slide1.jpg` | `onboarding/slide1.jpg` | 64.029 |
| `onboarding/slide2.jpg` | `onboarding/slide2.jpg` | 61.531 |
| `onboarding/slide3.jpg` | `onboarding/slide3.jpg` | 53.939 |
| `onboarding/slide4.jpg` | `onboarding/slide4.jpg` | 44.737 |
| `auth/login.jpg` | `auth/login.jpg` | 72.114 |
| `auth/forget-password.jpg` | `auth/forget-password.jpg` | 33.267 |
| `auth/register.jpg` | `auth/register.jpg` | 67.982 |
| `auth/verify-phone.jpg` | `auth/verify-phone.jpg` | 38.503 |

Ảnh giữ nguyên nội dung/định dạng, tham chiếu bằng require tĩnh. Checksum được kiểm tra khi sao chép; báo cáo từng màn nằm trong history. Ngày29/10 đã chuyển verify-phone dùng chung 5 màn OTP. Chưa chuyển reset-password/reset-success riêng của V1 vì task giữ nhánh thành công và biểu mẫu V2.

## 7. Kiểm chứng và giới hạn

| Kiểm chứng đã ghi nhận trong đợt triển khai | Kết quả và phạm vi |
| --- | --- |
| Mobile TypeScript | PASS tại các bước triển khai/publish; lần gần nhất trước commit `db02de6` bao gồm tinh chỉnh nhãn |
| Kiểm thử thuần điều hướng onboarding | 7/7 PASS; không DB/API |
| Kiểm thử thuần hình học tránh bàn phím | 8/8 PASS; không thay cho bàn phím thật |
| Export iOS | PASS cho từng đợt restyle; export Đăng ký có ảnh mới, trước tinh chỉnh nhãn cuối |
| Export Android/Web/server | PASS tại đợt keyboard; chưa chạy lại cho toàn bộ các tinh chỉnh giao diện sau đó |
| So sánh source | Các báo cáo từng đợt ghi kết quả giữ handler/input/actions; kiểm kê text trước các tinh chỉnh nhãn chỉ áp dụng tại mốc đó |
| Expo iPhone/Android, Safari iOS, Chrome Android, VoiceOver, ảnh render và bàn phím thật | NOT_VERIFIED; session triển khai không có thiết bị/browser surface kết nối |
| Đăng nhập, gửi/nhập OTP và tạo tài khoản thực tế | NOT_VERIFIED trong đợt restyle; không tự tạo record hay gửi API có side effects để test |

Nguồn kiểm chứng lịch sử: `docs/ai-review/history/2026-10-28-before-publish-login-keyboard.md`, `2026-10-28-before-forgot-manual-focus.md`, `2026-10-28-before-publish-register.md` và `2026-10-28-before-register-ui.md`. Các kết quả trên là đã ghi nhận trước task tài liệu này; không phải mọi kiểm tra đều vừa được chạy lại.

## 8. Mốc Git và phần còn lại

| Commit | Nội dung |
| --- | --- |
| `113c249` | Bốn trang onboarding và bỏ bộ đếm trang |
| `579ccaf` | Restyle Login, shared keyboard handling, Login manual focus |
| `d228c1d` | Restyle Quên mật khẩu, manual focus |
| `db02de6` | Restyle Đăng ký phụ huynh và tinh chỉnh nhãn Login/Đăng ký |

Các commit đã push lên nhánh `dongnnp/mobile/refactor-ui` theo yêu cầu riêng của PO; chưa có bằng chứng merge vào main hoặc nghiệm thu cuối. Task tài liệu không tự commit/push.

Phần OTP/Đặt lại mật khẩu đã triển khai local ngày29/10, ghi ở mục đầu. Phần chuyển phong cách V1 còn lại: các màn thành công độc lập nếu được giao, Web và các màn nghiệp vụ Mobile chưa được ghi hoàn thành trong các cập nhật ở trên. Tính năng V2 hiện có vẫn sử dụng được; chưa restyle không đồng nghĩa chưa có nghiệp vụ. Không tự làm tiếp hoặc thêm API để khớp V1.
