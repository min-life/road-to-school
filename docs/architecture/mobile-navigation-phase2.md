# Mobile UI — Phase 2: Header và tab điều hướng

Cập nhật 28/10/2026. **Implementation local hoàn thành, nghiệm thu thiết bị/luồng có xác thực còn NOT_VERIFIED.** Phase 2 trong tài liệu này là đợt UI PO giao trong session, không phải Phase 2 backend/weekly schedule ở các kế hoạch cũ. Chưa commit/push.

Cập nhật sau Phase2: Home PARENT dùng [header thu gọn theo scroll](mobile-parent-home-ui.md); header navigator index/PARENT được ẩn để tránh lặp. Header/tab các màn và role khác giữ nguyên.

## 1. Nguồn và phạm vi

V2 triển khai tại `C:\dongnnp\study-work\code\road-to-school\road-to-school`. V1 chỉ đọc tại `C:\dongnnp\study-work\code\he-thong-giam-sat-xe-dua-don-hoc-sinh`.

Đã đọc AGENTS, WORKING_RULES, BUSINESS_CONTEXT, CODEX_HANDOFF, CURRENT_STATE, LATEST, [kế hoạch chuyển UI](../ai-review/v1-ui-transfer-plan.md), [kết quả Phase 1](mobile-ui-implementation-status.md) và [quy tắc bàn phím](mobile-keyboard-behavior.md). Source và yêu cầu mới nhất của PO quyết định phạm vi.

Đối chiếu trực tiếp source V1 trong `mobile/src/`:

| Nguồn V1 | Kế thừa / điều chỉnh V2 |
| --- | --- |
| `components/navigation/{BottomNavigation,TabBarButton,navigation.styles}.tsx/ts` và `const/navigation-tabs.ts` | Tab bar trắng, đường viền mảnh, bóng phía trên, nhãn nhỏ, icon nét/đặc, màu nhấn vàng và phản hồi nhấn bằng opacity |
| `app/(parent-tabs)/_layout.tsx` | Tái dùng navigator; chiều cao nội dung 66 cộng inset đáy tối thiểu 8. V2 bổ sung tăng vùng nhãn theo fontScale và ẩn tab khi bàn phím cần không gian |
| `components/parent/home/ParentHomeHeader.tsx`, `const/parent-home-layout.ts` | Header kem, nhịp 16/12, tiêu đề 19/25 đậm, phụ đề 12/18, nút tròn; dùng header tĩnh trong flow thay cho lớp mở rộng/thu gọn phủ nội dung |
| `components/driver/home/{DriverCompactHeader,DriverExpandedHeader}.tsx` | Cùng ngôn ngữ màu/chữ/nút cho Driver và Bus Attendant; không mang driver mock, greeting hoặc quick action V1 vào V2 |

Đây là đối chiếu source/style, chưa chạy V1 để đối chiếu pixel. Không sao chép SVG, font, provider hay dependency. Dùng Ionicons và font hệ thống đang có của V2. Màu brand nền tảng giữ nguyên; `navigationActive` dùng vàng nâu `#996300` để nhãn nhỏ dễ đọc trên nền trắng, thay vì vàng sáng `#F5A800` của V1. Logo ở Trang chủ là ký hiệu bus Ionicons bên cạnh tên RoadToSchool, không thêm asset nhận diện giả.

## 2. Cấu trúc và lựa chọn UI

Wireframe đã trình bày trong commentary trước khi sửa, trong phạm vi PO yêu cầu triển khai trọn vẹn:

```text
Safe area
[Bus hoặc Quay lại] [Tiêu đề, phụ đề nếu đã có] [Thao tác V2]
Nội dung / vùng cuộn hiện có
[Trang chủ]         [Theo dõi hoặc Lịch]         [Cá nhân]
Safe area đáy
```

Không có bước phê duyệt wireframe riêng trong lượt này: chỉ thị thực thi đầy đủ của PO được dùng làm căn cứ triển khai. Giữ mọi context/handler V2, không bổ sung menu giả. Không có nút mở menu trước đó nên không thêm nút hamburger.

| Thành phần | Quyết định |
| --- | --- |
| Trang chủ `index`, Cá nhân `settings` | Giữ cho mọi role Mobile hiện có; giữ tiêu đề RoadToSchool/Hồ sơ cá nhân và chuông |
| Theo dõi `tracking` | Giữ label/route/icon bus V2; chỉ hiện tab cho PARENT, không đổi thành icon người theo V1 |
| Lịch `schedule` | Giữ cho DRIVER/BUS_ATTENDANT, giữ nút Hôm nay và chuông; V1 Parent không có tab này vẫn thiết kế đồng bộ |
| `explore` | Tiếp tục `href: null`; không khôi phục tab mẫu cũ |
| Quay lại | Giữ callback `router.back()` và từng điều kiện disabled: đang liên kết/xác minh/gỡ liên kết. Không tự đổi lịch sử hoặc fallback |
| Thêm báo nghỉ | Giữ handler, route và selectedStudentId; dùng HeaderAction tròn, label Tạo báo nghỉ |
| Đánh dấu tất cả thông báo đã đọc | Giữ readAll/busy, chỉ đổi cách trình bày nút; không gọi để kiểm thử |
| Tiện ích và nghiệp vụ trang chủ | Giữ ở nội dung trang; không đưa toàn bộ quick actions V1 vào header |
| Auth, OTP đăng ký, Reset password, modal/drawer, bộ chọn tuần/ngày/filter | Không restyle nội dung trong phase này; giữ kết quả Phase 1 và behavior keyboard hiện có |
| Bản đồ chi tiết chuyến | Giữ header nổi và mọi điều kiện/nút báo sự cố; chỉ thay nút back bằng HeaderAction. Error header dùng AppHeader |

## 3. Components và cách mở rộng

- [AppHeader / HeaderAction / headerActionStyles](../../mobile/components/navigation/app-header.tsx): dùng cho header điều hướng, không dùng thay header card nghiệp vụ.
- [TabButton](../../mobile/components/navigation/tab-button.tsx): nhận đúng props từ `Tabs.screenOptions.tabBarButton`; giữ ref, onPress/onLongPress, role, selected/disabled và Web href qua Expo Link. Chỉ thay phản hồi nhấn/size; không có state lựa chọn riêng.
- [Navigation tokens](../../mobile/constants/navigation.ts), [geometry](../../mobile/utils/navigation-layout.ts), [colors](../../mobile/constants/theme.ts): kích thước header/nút/tab, shadow, inset và màu semantic.
- [NotificationBell](../../mobile/components/notification-bell.tsx): nút tròn 48px, giữ badge chưa đọc và route `/notifications`.
- [Keyboard native](../../mobile/hooks/use-navigation-keyboard.ts) / [Web](../../mobile/hooks/use-navigation-keyboard.web.ts): mô tả ở mục 5.

| AppHeader prop | Công dụng |
| --- | --- |
| `title: string` | Bắt buộc; tối đa hai dòng, ellipsis, toàn văn vẫn là nội dung accessibility |
| `subtitle?: string` | Nội dung phụ hiện có; hai dòng, không thêm lời chào/hướng dẫn dài |
| `onBack?: () => void`, `backDisabled?: boolean` | Callback và trạng thái V2; cung cấp onBack thì ưu tiên nút back thay leading |
| `leading?: ReactNode` | Logo/ký hiệu/avatar hoặc nút chức năng thực sự có trong V2 |
| `actions?: ReactNode` | Nút thật hoặc fragment các nút; không dùng chuỗi nút quá dài trên màn hẹp |
| `topInset?: number` | Mặc định lấy safe area. Chỉ đặt 0 nếu cha đã sở hữu khoảng an toàn phía trên |

`HeaderAction` nhận `icon` (tên Ionicons), `label`, `onPress`, `disabled?`; target 48×48, nút disabled không thực thi. Với nút chữ, tái sử dụng `headerActionStyles.textButton/text` như Hôm nay.

```tsx
<AppHeader title="Chi tiết yêu cầu" onBack={() => router.back()} />
// Trong layout Tabs, giữ navigator sở hữu route và focused state:
tabBarButton: props => <TabButton {...props} />
```

Thêm màn mới: đặt AppHeader trước scroll owner trong container flex; tránh cộng `insets.top` ở cả cha và header. Truyền callback theo nghiệp vụ sẵn có. Thêm tab: khai báo Tabs.Screen, route/role/href/icon thực tế trong layout, không tạo state tab thủ công hoặc suy quyền từ nhãn/icon.

## 4. Files / routes tích hợp

| Nhóm | Files dưới `mobile/app/` |
| --- | --- |
| Shell | `_layout.tsx`, `(tabs)/_layout.tsx` |
| Header tab tự render | `(tabs)/tracking.tsx`, `(tabs)/schedule.tsx`; Trang chủ/Cá nhân dùng custom header ở layout |
| Phụ huynh | `parent/link-student.tsx`, `parent/verify-otp.tsx`, `parent/student-detail/[id].tsx`, `parent/route-detail.tsx`, `parent/schedule.tsx` |
| Yêu cầu phụ huynh | `parent/create-request/address/[studentId].tsx`, `information/[studentId].tsx`, `verify-otp.tsx`, `parent/update-requests/detail/[requestId].tsx` |
| Báo nghỉ | `leave-notices/index.tsx`, `create.tsx`, `otp.tsx`, `[id].tsx` |
| Sự cố / thông báo / chuyến | `incidents/index.tsx`, `[id].tsx`, `notifications.tsx`, `trip/[id].tsx` |

Thay cả header nhánh lỗi để không đổi hình thức khi tải lỗi. Bỏ style header cũ không còn dùng. Không đổi API client, AuthProvider, guards, notification context, polling, map controller hay dữ liệu. Có [test geometry](../../mobile/scripts/navigation-layout.test.ts) chạy độc lập API/DB.

## 5. Responsive, safe area và bàn phím

- Header nằm trong flow, cao tối thiểu 72 cộng top inset, tăng chiều cao khi chữ xuống dòng. Cột chữ `flex: 1/minWidth: 0`; nút không co; padding 16 và gap 12. Safe left/right theo thiết bị; chữ dài ellipsis sau hai dòng, không đè nút.
- Tab bar nằm trong layout navigator, không absolute phủ nội dung. Chiều cao `66 + max(bottomInset, 8)`, thêm phần tăng theo fontScale. Bottom inset do tab bar sở hữu; tracking bỏ cộng lặp inset cho FAB/list, vẫn giữ 90px chỗ tránh FAB.
- Khi NetworkBanner xuất hiện, banner giữ top inset; provider bên trong root truyền top=0 cho Stack bên dưới, giữ left/right/bottom. Header và nội dung không cộng notch lần hai. Thay đổi SafeAreaView của NetworkBanner đã có trước phase này được bảo toàn.
- Native: navigator `tabBarHideOnKeyboard: true` dùng sự kiện bàn phím hiện có. Không tự tính chiều cao bàn phím native và không thêm KeyboardAvoidingView.
- Web: hook riêng chỉ ẩn tab khi thiết bị pointer coarse, có field đang nhập và viewport thực sự bị thu nhỏ. Dùng VisualViewport bottom (offsetTop+height) và kích thước layout đã quan sát trước nhập, hỗ trợ trường hợp resize layout viewport; không dùng chiều cao bàn phím cố định. Focus được bắt ở capture, kể cả KeyboardScrollView chặn bubbling. Bỏ ẩn khi hết nhập hoặc viewport phục hồi; cleanup listeners/rAF. Desktop pointer fine giữ tab.
- Các form/modal/drawer tiếp tục dùng KeyboardScrollView của Phase 1. Thanh tab không có trong routes ngoài `(tabs)`; không áp dụng bù tab giả cho modal hoặc màn chi tiết. Không đổi hoặc remount form để đổi trạng thái tab.

## 6. Điều hướng và quyền

Expo Router Tabs vẫn quyết định `focused` theo navigation state; icon nét/đặc và tint lấy focused. Không dùng biến local để đánh dấu tab. Giữ route names, href role và route explore bị ẩn. Back behavior mặc định của V2 được giữ, không nhập `backBehavior="history"` của V1. Web có Link để giữ href/mở liên kết theo hành vi router.

`href: null` chỉ là ẩn tab, không phải authorization. Root AuthProvider/route guard và backend tiếp tục quyết định quyền; không thay hoặc mở rộng bảo mật trong đợt style. Deep link, reload, notification target và query serviceDate vẫn do router/handlers hiện có xử lý; runtime có xác thực chưa được nghiệm thu ở lượt này.

## 7. Kiểm chứng thực tế và giới hạn

Môi trường: Windows, Node v24, TypeScript và Expo CLI sẵn có; IAB Chromium desktop. Không cài/nâng package. Không POST login/OTP/mark-read/push, không seed hoặc tạo record để test.

| Kiểm tra | Kết quả |
| --- | --- |
| `cd mobile; npx --no-install tsc --noEmit` | PASS |
| `node --test scripts/navigation-layout.test.ts scripts/onboarding-route.test.ts scripts/keyboard-visibility.test.ts` | PASS 22/22; chỉ geometry/entry routing thuần, không phải UAT navigator |
| `npx --no-install expo export --platform all --output-dir <temp>` | PASS iOS, Android, Web và server bundle; output ngoài repo |
| Lint | NOT_VERIFIED: manifest Mobile không có lint script/config riêng; không tự cài ESLint |
| So sánh AST các call API/router/useEffect/useActiveRefresh trước/sau | PASS: nguyên nội dung các call ở 21 app files được sửa; không chứng minh thay cho runtime |
| Render AppHeader/HeaderAction/TabButton thật trong harness tạm, không API/provider nghiệp vụ | PASS: 320×568, 375×812, 390×844, 1440×900; quan sát wrap/ellipsis, nút disabled, tab được chọn/aria-selected, không tràn ngang ở 320/390 |
| Safe area trong harness | PASS cho giá trị geometry top59/bottom34 truyền vào context; không phải notch native đã nghiệm thu |
| Vùng cuộn cuối trang harness | PASS: sau focus, input bottom661 < tab top712 ở 375px; chưa bật bàn phím hệ điều hành |
| Tải `/schedule` trên Expo Web local riêng | NOT_VERIFIED: dev SSR dừng ở splash, không thấy lỗi console và chưa tới màn có xác thực. Không sửa cấu hình/logic ngoài phạm vi để vượt qua |
| Chuyển tab/Back/deep link/reload có xác thực trên app thật | NOT_VERIFIED; chưa dùng phiên/tài khoản thực tế để chạy UAT. Harness chuyển selected chỉ là kiểm tra component |
| iPhone Expo, Android native, Safari iOS, Chrome Android, VoiceOver/Dynamic Type thật, keyboard/modal thật | NOT_VERIFIED: chưa có thiết bị/surface tương ứng kết nối |
| Web Admin desktop | Source không đổi; desktop kiểm tra render component Mobile Web, không chứng nhận Web Admin regression runtime |

Harness nằm ngoài route app, đã xóa entry tạm khỏi source sau kiểm tra; không ship menu preview hoặc dữ liệu giả. Nếu cần chuyến/học sinh để nghiệm thu, dùng dữ liệu hợp lệ PO cấp; không tự tạo. Các scenario nghiệp vụ thiếu dữ liệu tiếp tục `NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY`.

## 8. Trạng thái / phần còn lại

Phase 2 header/navigation đã triển khai local trong phạm vi trên. Còn nghiệm thu thiết bị và luồng điều hướng có xác thực, đặc biệt keyboard mở/đóng, quay lại từ direct route và tab bị ẩn theo role. Không mô tả các kiểm tra này là PASS.

Phase 1 được giữ. Nội dung trang nghiệp vụ, modal/drawer, OTP/Reset restyle, map/sheet body và Web UI còn ngoài đợt này. Bước tiếp theo duy nhất: nghiệm thu Phase 2 trên iPhone Expo bằng phiên/tài khoản và dữ liệu hợp lệ của PO.
