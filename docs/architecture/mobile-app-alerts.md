# Mobile — popup thông báo/xác nhận của RoadToSchool

01/11/2026. Thay toàn bộ **78 Alert.alert tại23files** bằng popup theo theme app; **10 modal tại5files** có host dùng chung để thông báo trong form/QR/picker không bị nằm sau native modal. PO đã yêu cầu commit và push nhánh dongnnp/mobile/refactor-ui sau verification. Không backend/DB/dependencies changes.

## Thiết kế

```text
[Nền navy mờ toàn vùng hiển thị]
┌──────────── card trắng, bo24 ─────────────┐
│          [Icon trạng thái]              │
│               Tiêu đề                   │
│         Nội dung đầy đủ, wrap           │
│ [Hủy / viền]  [Xác nhận / vàng hoặc đỏ] │
└─────────────────────────────────────────┘
```

Card max420, padding24; nền surface trắng, chữ foreground navy, message mutedText, icon trong ô60/bo20. Info/warning nền vàng nhạt, success xanh lá, lỗi đỏ nhạt; dùng colors và journeyTones hiện có. Nút mặc định vàng, cancel viền, destructive đỏ đậm/chữ trắng. Chỉ popup không truyền nút mới dùng mặc định **Đã hiểu**; các nhãn/nội dung/nút của78call sites giữ nguyên.

Chiều rộng dưới360, fontScale>=1.4 hoặc hơn2nút xếp dọc; trường hợp khác xếp ngang. Nút tối thiểu48, chữ wrap, không ellipsis. Card giới hạn theo viewport trừ safe-area top/bottom và32; toàn bộ nội dung có ScrollView, kể cả actions khi màn hình thấp. Không animation popup nên reduced motion không bị thêm chuyển động. Không thay animationType của form/modal hiện có.

## Phạm vi chuyển đổi

| Nhóm | File liên quan |
| --- | --- |
| Gọi tài xế/phụ xe | [trip-contact-call-button](../../mobile/components/trip-contact-call-button.tsx): thiếu số, số không hợp lệ, lỗi mở dialer |
| Phiên đăng nhập/notification | [_layout](../../mobile/app/_layout.tsx), [notifications-context](../../mobile/context/notifications-context.tsx), [notifications](../../mobile/app/notifications.tsx) |
| Cá nhân | [settings](<../../mobile/app/(tabs)/settings.tsx>): ảnh/tên/mật khẩu, thông báo thiết bị, đăng xuất |
| Học sinh/liên kết | [StudentCard](../../mobile/components/StudentCard.tsx), [tracking](<../../mobile/app/(tabs)/tracking.tsx>), [link-student](../../mobile/app/parent/link-student.tsx), [verify-otp](../../mobile/app/parent/verify-otp.tsx), [student-detail](../../mobile/app/parent/student-detail/[id].tsx) |
| Báo nghỉ | [quick-leave hook](../../mobile/hooks/use-quick-leave-notice.ts), [create](../../mobile/app/leave-notices/create.tsx), [otp](../../mobile/app/leave-notices/otp.tsx), [index](../../mobile/app/leave-notices/index.tsx), [detail](../../mobile/app/leave-notices/[id].tsx) |
| Đổi điểm/cập nhật học sinh | [CreateAddressRequestView](../../mobile/components/parent/create-address-request-view.tsx), [RequestListView](../../mobile/components/parent/RequestListView.tsx), [information](../../mobile/app/parent/create-request/information/[studentId].tsx), [OTP](../../mobile/app/parent/create-request/verify-otp.tsx), [detail](../../mobile/app/parent/update-requests/detail/[requestId].tsx) |
| Vận hành chuyến/sự cố | [trip](../../mobile/app/trip/[id].tsx), [incident](../../mobile/app/incidents/[id].tsx) |
| Hosts cho modal hiện có | Trip5, Settings2, Incident1, Leave create calendar1, [StudentPickerDialog](../../mobile/components/parent/student-picker-dialog.tsx)1 |

Không đổi nội dung/style các form, calendar, QR hoặc picker đã custom; AppModal chỉ bổ sung host lớp popup. Không thay OS permission prompts, photo library/camera picker, bàn phím hay xác nhận mở cuộc gọi do iOS/Android quản lý. App kiểm soát các thông báo trước/sau những thao tác đó, không theme được giao diện hệ điều hành.

## API component và cách sử dụng

- [app-alert-store.ts](../../mobile/utils/app-alert-store.ts): createAppAlertStore, AppAlertRequest, appAlertTone. Pure presentation state; không API/router/auth.
- [app-alert.ts service](../../mobile/services/app-alert.ts): singleton appAlertStore và AppAlert.alert có cùng signature title/message/buttons/options đang dùng của React Native Alert.
- [app-alert.tsx component](../../mobile/components/app-alert.tsx): AppAlertRoot và AppModal, dùng native RN Modal nội bộ chỉ cho form/modal container hiện có. Root popup là JS overlay, không present thêm native modal.

```tsx
import { AppAlert } from '@/services/app-alert';

AppAlert.alert('Không có số điện thoại', 'Chưa có số điện thoại của tài xế.');
AppAlert.alert('Xác nhận', 'Nội dung hiện có', [
  { text: 'Hủy', style: 'cancel' },
  { text: 'Xác nhận', style: 'destructive', onPress: existingHandler },
]);
```

Call sites cũ alias AppAlert as Alert để giữ toàn bộ arguments/callbacks. Không monkey-patch React Native Alert hoặc window.alert. Screens mới phải import AppAlert; không import Alert từ react-native. Form/modal mới dùng `AppModal as Modal` từ components/app-alert, giữ props và children. RootLayout chỉ bọc providers hiện có bằng AppAlertRoot, không sửa auth/navigation effects.

## Thứ tự, xác nhận và lifecycle

Store dùng useSyncExternalStore, snapshot ổn định, FIFO để các thông báo liên tiếp không ghi đè nhau. Thông báo cùng title/message/buttons/options và callback identity được gộp khi còn pending (hữu ích cho scan QR lặp); khác callbacks vẫn giữ riêng. Sao chép buttons/options tránh caller mutate presentation sau khi mở.

Nhấn nút lấy đúng requestId hiện tại, bỏ khỏi queue **trước** khi gọi onPress; double/stale press không chạy callback hoặc thao tác request kế tiếp. Callback có thể mở popup mới mà không mất thông báo. Các promise/API/busy guards ở caller giữ nguyên, store không gọi API hay xác nhận tự động.

Backdrop, Android Back và Escape chỉ dismiss khi options.cancelable===true, gọi onDismiss; không gọi callback xác nhận hoặc callback nút Hủy. Mặc định không dismiss ngoài nút (tương ứng hành vi Android Alert trước đây). Nút Hủy chạy chính onPress của nó nếu có. Phiên hết hạn cancelable:false buộc nhấn Đồng ý như trước.

AppModal đăng ký host trong lúc visible; modal cuối cùng đang mở nhận popup, không tạo native modal thứ hai. Khi form đóng/unmount, request còn pending chuyển sang host còn lại/root; không bị xóa. Root popup là overlay trong cây JS nên không phải chờ native presentation/dismissal để present controller mới. Host là trạng thái hiển thị, không quyền truy cập hoặc nguồn dữ liệu nghiệp vụ.

## Accessibility và bàn phím

Popup có role alertdialog/aria-modal, accessibilityViewIsModal, heading và labels thật. Khi queue có popup, root và nội dung modal phía dưới ẩn khỏi accessibility; chỉ host trên cùng render popup. Android Back được chặn trong thời gian mở; AppModal onRequestClose ưu tiên popup trước khi gọi handler đóng form.

Web giữ Tab/Shift+Tab trong card, Escape tôn trọng cancelable; focus mặc định vào Hủy với destructive hoặc nút chính với popup thường. Message dài khiến nút ngoài viewport thì focus card để mở từ tiêu đề, không auto-scroll xuống cuối. Đóng popup trả focus về phần tử trước đó nếu còn trong document. Native đưa accessibility focus tới heading. Focus ring nâu vàng rõ, buttons48. Keyboard.dismiss khi mở popup nhưng không reset TextInput/value/form; sau đóng vẫn giữ nội dung. Native VoiceOver/TalkBack và bàn phím thực cần UAT.

## Kiểm chứng

- PASS: Mobile npx --no-install tsc --noEmit; Expo export --platform all (web/iOS/Android bundles, không native runtime).
- PASS13tests store: FIFO, default/explicit buttons, nested popup, destructive/cancel callback riêng, duplicate press, cancelable/onDismiss, duplicate info, callback identity, host handoff, subscribe và decorative tones. Không requests/records nghiệp vụ.
- PASS73pure tests tổng hợp trước delivery gồm13popup +31journey +9search +5OTP summary +7phone URL +8keyboard geometry; không DB/OTP/mutations.
- PASS AST parity:23files migrated giữ toàn bộ non-import code sau bỏ đúng RootLayout wrapper;78Alert args/callbacks và10Modal JSX giữ nguyên. Source/backend/dependency/env và Home snap/rail được bảo vệ bằng hashes.
- PASS Chromium IAB interactive preview component thực + icon font adapter/presentation counters: popup thiếu số từ TripContactCallButton thật; Hủy/Xác nhận mỗi callback1lần, forced Escape không đóng, hai thông báo FIFO; error trong AppModal không lộ nền qua AX, input giữ value, đóng form rồi success chuyển root đúng.
- PASS320×568 message dài ban đầu scroll0/focus card, cuộn tới Đã hiểu48px, Escape đóng popup cancelable;390×844 và844×390 không tràn ngang;1440×900 card420. Screenshot TEMP/rts-app-alert-phone-preview.png là preview390×600, không ảnh iPhone thật.
- Preview không mount auth/API hooks, không mở dialer/thực hiện cuộc gọi/đăng xuất/đổi mật khẩu/OTP hoặc tạo data. Temporary .expo entry/components đã xóa; server/tab riêng đã dừng, viewport reset. Metro của PO giữ nguyên.
- NOT_VERIFIED: native Expo iPhone/Android, VoiceOver/TalkBack/font scale lớn, keyboard/Back/presentation lúc form đang đóng, route/API end-to-end. Các thao tác cần mutation/dữ liệu mới chưa thử theo TEST DATA POLICY. OS permission/dialer/picker dialogs giữ thiết kế hệ điều hành.

[Review và diff riêng task](../ai-review/LATEST.md). Không mô tả native UAT là đã hoàn thành từ preview web/static build.
