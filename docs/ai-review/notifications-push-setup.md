# Thông báo — cấu hình push sau bàn giao

Ngày 27/10/2026. Theo quyết định PO: **push tắt mặc định**. Inbox Web/Mobile và Tổng quan không cần cấu hình push để hoạt động.

## Cập nhật mới — Switch trong nhóm tài khoản

Theo yêu cầu PO, Profile không còn thẻ push riêng. Thứ tự nhóm: Đổi ảnh đại diện → Đổi tên (PARENT) → Đổi mật khẩu → Thông báo thiết bị [Switch] → Đăng xuất. Label/status ở cột trái, native Switch bên phải cùng hàng. Các mô tả hai nút/thẻ riêng ở mục lịch sử dưới được thay bằng mục này.

Settings dùng pushEnabled từ NotificationsProvider, không so sánh chuỗi pushStatus và không tự lưu preference mới. Provider giữ enabledIdentity theo user/role hiện tại: chỉ đặt true sau đăng ký token API thành công; false sau unregister thành công hoặc permission bị từ chối. Reset state/status khi đổi identity, Web/Expo Go luôn false. Giá trị ban đầu false tới khi xác nhận đăng ký; đây là trạng thái đăng ký trong provider hiện tại, không suy đoán quyền OS từ text.

Switch gọi enablePush/disablePush hiện có, khóa bằng state/ref khi pending và khi logout; không bật lạc quan, thất bại giữ giá trị đã xác nhận/hiện feedback cũ hoặc Alert. Không đổi API, permission prompts, SecureStore key hay call register/unregister. Busy guard tại Profile; cơ chế registration promise trong provider giữ nguyên.

Kiểm tra: tsc và Expo export all PASS. AST xác nhận API/Storage/permission call expressions giữ nguyên. IAB Chromium320px isolated actual row/handler với callback local: label/Switch nằm cùng hàng phía trên logout, off→on→off đúng; không gọi API hoặc cấp/hủy quyền/token thật. NOT_VERIFIED iPhone/Android/native permissions, trạng thái restore/failure/concurrency và auth runtime. Profile có minHeight56, cột chữ wrap/minWidth0, status live region khi có, Switch accessibilityLabel/busy/disabled. Preview entry/tab/server đã dọn. Local chưa commit/push.

## Cập nhật 28/10/2026 — vị trí cài đặt thiết bị

Phần bật/tắt đã chuyển từ [Thông báo](../../mobile/app/notifications.tsx) sang [Cá nhân](<../../mobile/app/(tabs)/settings.tsx>), trong thẻ Thông báo thiết bị trước Thông tin ứng dụng. Giữ nguyên enablePush/disablePush/pushStatus từ NotificationsProvider và thông báo lỗi khi tắt thất bại; không tạo state bật/tắt riêng hoặc xin quyền khi vào trang. Profile chung áp dụng mọi role Mobile hiện có. Trạng thái live cập nhật qua provider; Web/Expo Go/native guard và việc lưu preference/token không đổi.

Hai nút có label accessibility, minHeight48, flexWrap cho màn hẹp; thẻ nằm trong ScrollView Profile hiện có. Inbox vẫn giữ bộ lọc, danh sách/phân trang, đánh dấu đã đọc và điều hướng đích; không còn cài đặt thiết bị ở đó. Không thay API/schema/dependencies hoặc cấu hình hệ thống.

Verification: tsc/export all iOS/Android/Web/server và so sánh onPress trước/sau PASS. Chưa bật/tắt permission/token thật để test, chưa nghiệm thu iPhone/native/layout runtime; NOT_VERIFIED. Không gửi push, sửa preferences hoặc unregister session trong kiểm thử. Local chưa commit/push.

## Trạng thái đã triển khai

- API chỉ chạy worker gửi khi `PUSH_NOTIFICATIONS_ENABLED=true`; không đặt biến này hoặc đặt `false` đều không gửi. `.env.example` đã bổ sung mặc định false; không sửa `.env` đang dùng.
- Mobile có plugin `expo-notifications`, đăng ký Expo token theo Session hiện tại và nút bật/tắt tại Cá nhân → Thôngs báo thiết bị. Chỉ xin quyền khi người dùng chọn bật. Phiên đã được cấp quyền có thể đăng ký lại khi mở app; lựa chọn tắt được lưu theo tài khoản trên thiết bị.
- `expo-constants` đã có sẵn. Không thêm Expo server SDK, Redis hoặc WebSocket.
- Không cấu hình tài khoản EAS/FCM/APNs, không tạo native build, không gửi push thử trong nhiệm vụ này.

## Các bước người vận hành thực hiện khi sẵn sàng

1. Liên kết mobile với EAS project của đơn vị, kiểm tra Android package/iOS bundle identifier. Cấp project ID qua `expo.extra.eas.projectId`, EAS runtime config hoặc biến build `EXPO_PUBLIC_EAS_PROJECT_ID`. Project ID là định danh công khai, không phải khóa bí mật. Không điền giá trị giả.
2. Cấu hình FCM v1 cho Android và APNs cho iOS theo tài khoản của đơn vị; quản lý credential bằng EAS/secret store. Không commit service-account key, APNs private key hoặc access token. Nếu dùng `google-services.json`, kiểm tra chính sách repo và đường dẫn cấu hình trước khi đưa vào quy trình build.
3. Tạo bản native development/production có plugin notifications và credential đúng môi trường; cài trên thiết bị tương thích. Expo Go/Web bị bỏ qua đăng ký remote push trong implementation này; Android export chỉ xác nhận bundle, không xác nhận credential hoặc OS delivery.
4. Trên API của môi trường được chọn, giữ `PUSH_NOTIFICATIONS_ENABLED=false` cho tới khi đã sẵn sàng nghiệm thu. Khi bật enhanced security của Expo Push Service, đặt `EXPO_PUSH_ACCESS_TOKEN` trong secret store API. Không gửi khóa qua chat hoặc đưa vào diff.
5. Sau khi PO cấp phạm vi UAT (tài khoản/thiết bị/sự kiện và quyền ghi), bật worker có chủ đích, người dùng bật nhận thông báo trên thiết bị. Việc bật worker có thể xử lý các sự kiện còn hiệu lực đã xếp hàng trong inbox; kiểm tra phạm vi dữ liệu trước khi bật. Không tự backfill sự kiện cũ hoặc tạo dữ liệu thử.

Hướng dẫn chính thức: [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [gửi và kiểm tra receipt](https://docs.expo.dev/push-notifications/sending-notifications/). Cấu hình native phải theo Expo SDK và nền tảng thực tế tại thời điểm triển khai.

## Vận hành và giới hạn

Notification là inbox đồng thời lưu ý định gửi, unique theo người nhận + eventKey. Business transaction ghi inbox cùng thay đổi nghiệp vụ; worker gọi provider ngoài transaction. Gửi tối đa 20 notification mỗi tick 15 giây, tối đa 30 phiên gần nhất/người nhận, có lease/CAS, timeout và retry giới hạn. Receipt được lưu theo phiên/fingerprint token; ticket đã nhận không được gửi lại trong lần retry thông thường. Token không hợp lệ được gỡ nếu vẫn khớp phiên hiện tại.

TTL: Ready/Start 15 phút, sự cố 1 giờ, các sự kiện khác 24 giờ. Đã đọc, hết quyền hoặc sự cố đã xử lý được loại khỏi lượt gửi mới. Logout/thu hồi Session xóa token. Payload chỉ chứa notificationId và câu thông báo chung; mở app kiểm quyền lại ở server. Push không chứa tọa độ hoặc lý do nội bộ.

Receipt `ok` chỉ là provider nhận chuyển tiếp, không chứng minh người dùng đã xem. Vẫn có cửa sổ trùng khi provider nhận request nhưng API chết trước khi lưu ticket; không cam kết exactly-once, không dùng push thay cho inbox hoặc cảnh báo trong app. Thay đổi quyền có thể xảy ra sau thời điểm kiểm tra ngay trước khi gửi; vì vậy nội dung ngoài app phải luôn ngắn và không chứa thông tin học sinh nhạy cảm.

Chưa có chính sách tự xóa Notification cũ. Chưa đo tải thực tế hoặc xác minh nhiều API instances/thiết bị. Không tự bật push hoặc gửi thử sau báo cáo bàn giao.
