# Thông báo — cấu hình push sau bàn giao

Ngày 27/10/2026. Theo quyết định PO: **push tắt mặc định**. Inbox Web/Mobile và Tổng quan không cần cấu hình push để hoạt động.

## Trạng thái đã triển khai

- API chỉ chạy worker gửi khi `PUSH_NOTIFICATIONS_ENABLED=true`; không đặt biến này hoặc đặt `false` đều không gửi. `.env.example` đã bổ sung mặc định false; không sửa `.env` đang dùng.
- Mobile có plugin `expo-notifications`, đăng ký Expo token theo Session hiện tại và nút bật/tắt trong trang Thông báo. Chỉ xin quyền khi người dùng chọn bật. Phiên đã được cấp quyền có thể đăng ký lại khi mở app; lựa chọn tắt được lưu theo tài khoản trên thiết bị.
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
