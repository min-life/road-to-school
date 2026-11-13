# Web Admin IoT — Lean POC

Route `/admin/iot`, menu **Thiết bị IoT**, chỉ `SYSTEM_ADMIN`. Page kiểm tra role trước
khi mount dashboard, backend tiếp tục kiểm tra session/role. Không thay Mobile hoặc
PostgreSQL. Wireframe ba khối theo `docs/architecture/iot-rfid-lean-poc-plan.md`.

## Source

- Entry: `src/app/admin/iot/page.tsx`.
- Panels, hooks, Serial/protocol, CSS: `src/app/admin/iot/_components/`.
- REST types/client: `src/lib/iot-api.ts`, tái sử dụng `apiClient` và refresh flow.
- Binary qua `apiClient.requestBinary`; JSON callers giữ hành vi mặc định.
- Chỉ tải `esptool-js` và MD5 khi thao tác USB; Socket.IO client lấy JWT từ authStorage,
  không đặt token trong URL hoặc sao chép vào store mới.

## Thao tác

1. **Kết nối thiết bị** trong Chrome/Edge, secure context. Chọn cổng CP2102; Web
   nhận chip, chạy firmware, đọc INFO, tự cấp cấu hình rồi quét Wi-Fi nếu firmware hỗ trợ.
   Không tự truy cập USB khi chỉ mở trang. Tên thiết bị mới mặc định là deviceId.
2. Thiết bị cũ được cấp lại cùng khóa bằng POST `/iot/devices/provision`; không sửa
   bản đăng ký, không cần nhập khóa sau reload. Backend cấp URL từ
   `IOT_ADVERTISED_API_URL`, không suy ra từ Host/Forwarded hoặc localhost trình duyệt.
   Chỉ báo thiết lập xong sau ACK đúng deviceId từ CONFIG_DEVICE. Lỗi có nút Thiết lập lại.
3. Chọn mạng quét được, nhập mật khẩu, bấm **Kết nối Wi-Fi**. Quét lại chạy trên ESP32,
   không phải máy tính. Có nhập SSID thủ công cho mạng ẩn/không xuất hiện trong danh sách.
   Firmware cũ không có INFO.wifiScan vẫn nhập tên được và có nhắc cập nhật firmware.
   Danh sách tối đa20SSID, mạnh trước; mạng mở/bảo mật chưa hỗ trợ không cho chọn.
4. **Cài đặt nâng cao** có URL API để ghi đè rõ ràng và lưu Wi-Fi mã hóa trên máy chủ
   (mặc định tắt). Người dùng bình thường không cần nhập URL. Thay địa chỉ máy chủ
   trong env cần restart API rồi thiết lập lại thiết bị. HTTPS cần CA tin cậy trong firmware.
5. UI chỉ báo kết nối Wi-Fi sau ACK cùng SSID, connected và IPv4 hợp lệ; mật khẩu
   xóa sau thành công và khi đổi mạng. Không ghi key/password/raw UART vào nhật ký.
   **Cập nhật firmware** trong khối USB: ngắt USB trên Web → Kết nối để nạp → Nạp
   firmware → Chạy thiết bị. Binary có xác thực, kiểm tra merged/MD5, không eraseAll;
   yêu cầu xác nhận trước khi ghi. Merged image vẫn có thể thay cấu hình/NVS.
6. Bảng hiển thị lịch sử thật từ API, phân trang 20, lọc deviceId. Event realtime làm
   tải lại lịch sử server thay vì tin trực tiếp payload. Reconnect tải lại để bù
   lượt đã lỡ; polling 15 giây khi tab visible và tự cập nhật bật. Có tạm dừng/làm mới.
   Danh sách thiết bị bổ trợ chỉ lấy 100 thiết bị đầu. Không có API xóa lịch sử.

## Contract Serial v1 cho bước firmware tiếp theo

JSON UTF-8 một dòng, kết thúc LF, tối đa 8192 ký tự phản hồi. Không dùng lệnh tách bằng
dấu phẩy vì SSID/password có thể chứa ký tự đó. Request:

```text
{command, requestId, ...payload}
```

`requestId` là UUID do Web sinh. Reply phải giữ đúng ID:

```text
{requestId, ok, data?}
```

| Command | Payload | data khi ok=true |
| --- | --- | --- |
| INFO | không có | protocolVersion: 1, firmwareVersion thật, deviceId khớp chip, configured boolean, wifiScan boolean (1.1.0+), wifiConnected/hasSavedWifi boolean (1.1.1+, không chứa credentials) |
| CONFIG_DEVICE | deviceId, backendUrl, deviceKey | deviceId khớp request, chỉ ACK sau khi lưu cấu hình |
| SCAN_WIFI | không có | networks: tối đa20 phần tử {ssid, rssi, secure, supported}, không trùng SSID, mạnh trước |
| SET_WIFI | ssid, password | connected: true, ssid khớp request, ip: IPv4; chỉ ACK sau kết nối thành công |

`ok=false` khi thất bại; Web chỉ ánh xạ các mã lỗi trong allowlist thành hướng dẫn và mã
lỗi an toàn. Không hiển thị raw error/log hoặc chuỗi code lạ từ firmware.
Timeout hiện tại 20 giây. Firmware không được echo password/deviceKey. ACK đến sau
timeout không đổi trạng thái giao diện. Không xem ghi Serial xong là kết nối thành công.
Firmware tại `firmware/esp32-rfid-node` triển khai protocol này. Quét bất đồng bộ,
không cần cấu hình thiết bị hoặc Wi-Fi trước; chặn khi đang kết nối mạng/gửi scan RFID.
Có trạng thái đang quét/rỗng/thất bại; không dùng danh sách giả khi firmware không hỗ trợ.
Firmware1.1.1 tạm dừng auto-reconnect/khởi động lại station nếu chưa kết nối trước
khi quét, giữ NVS và nối lại sau quét. Mạng cũ không còn không bắt buộc nạp firmware
lại mỗi lần đổi mạng. URL API vẫn do vận hành đặt ổn định; đổi IP của backend cần
cập nhật env/restart API rồi cấp lại cấu hình qua USB, không cần flash ESP32.

## Firmware binary contract

POC ESP32 DevKit V1, tối đa 4 MiB, merged image base `0x0`, bootloader `0x1000`,
partition table `0x8000`, application `0x10000`, chip ID ESP32 (0). UI từ chối app-only
`.bin` để tránh nạp sai offset. Backend `IOT_FIRMWARE_PATH` cần trỏ tới merged binary
được build trong bước firmware. Kiểm tra header là kiểm tra định dạng, không thay
kiểm chữ ký hoặc nghiệm thu board. MD5 kiểm chứng dữ liệu được ghi, không xác thực
nguồn firmware. Flash có thể thay thế cấu hình/NVS trong vùng image đã ghi.

## Giới hạn kiểm chứng

Không tự tạo device/scan hoặc gọi POST để test. Typecheck/build, lint phần mới và các
pure protocol tests không cần DB/USB. Nạp firmware, thiết bị thật, Wi-Fi, Socket.IO
với tài khoản thật và giao diện ở các viewport cần nghiệm thu riêng khi có môi trường.
Không lưu secrets trong URL, localStorage, báo cáo hoặc raw serial log. Không thay
auth architecture hiện có. Key chỉ giữ trong biến của thao tác cấp cấu hình, không lưu trình duyệt.
Backend có cấp lại cùng key cho SYSTEM_ADMIN qua endpoint provisioning, không rotate key.

Nguồn: [esptool-js](https://espressif.github.io/esptool-js/docs/),
[Flash options](https://espressif.github.io/esptool-js/docs/interfaces/FlashOptions.html),
[Socket.IO client](https://socket.io/docs/v4/client-options/).

## Gán ESP32 cho xe — giai đoạn2

SYSTEM_ADMIN thao tác gán tại **Phương tiện → bấm biển số xe/cột IoT → chọn ESP32**.
Hộp thoại hiển thị biển số cố định, thiết bị hiện tại, ACK badge, reason optional và gán/tháo.
Trang IoT chỉ giữ USB/nạp firmware/Wi-Fi/lịch sử quẹt, không còn card gán device-first.

Modal đọc mới GET vehicles/:id và registry đã phân trang, kiểm tra nhất quán mapping;
poll10s để cập nhật ACK. Xe đã có thiết bị phải tháo rõ ràng trước khi gán thiết bị khác,
không tự gửi hai mutations rồi coi là thay thế nguyên tử. ESP32 ở xe khác có thể chọn để
chuyển về xe đang mở; confirmation ghi rõ xe nguồn/đích. PUT/DELETE giữ CAS và frozen guard
backend hiện có. Xe inactive không gán mới. Lỗi mutation giữ tại modal, refresh dữ liệu trước thử lại.
Lịch sử thiết bị hiện tại/đang chọn được mở theo yêu cầu và phân trang, giữ cả lần quay lại cùng xe.

Dùng native dialog modal/focus/Escape; không đóng khi đang gửi. Form/desktop hẹp có vùng cuộn,
tokens/component sẵn có. Không lộ key/password, không cần kết nối USB để gán thiết bị đã đăng ký.
Nếu thiết bị offline, vẫn có thể gán nhưng chờ ACK; không coi commit PG là ESP32 đã nhận cấu hình.
Bảng scans ở IoT vẫn có snapshot biển số và filter xe, không suy diễn từ mapping hiện tại cho scan cũ.
Không đổi PostgreSQL/MongoDB/schema/firmware cho việc chuyển hướng thao tác. User tự nghiệm thu
vehicle-first flow; static tests/build không thay kiểm tra browser hoặc thẻ thật.

## Student RFID — giai đoạn3

Đăng ký ở hồ sơ học sinh SYSADMIN: Trường học→Học sinh→Thẻ RFID→Đăng ký thẻ.
Chọn device unbound/không enrollmentBusy; mở phiên5phút, quẹt thật, xem UID rồi Xác nhận đăng ký.
Modal poll session2s, không lấy latest UID từ rfid_scans hoặc đọc UID từ localStorage. Có thông báo
thẻ đã đăng ký/thẻ đã đọc, giữ candidate đầu; retry poll không lặp thông báo. Pending202 có nút
Kiểm tra kết quả (đối soát PG read-only), không cho hủy hoặc mở phiên thay thế. Đóng modal pending
chỉ đóng giao diện, không tự xóa giữ chỗ; mở lại hồ sơ lấy đúng active session để tiếp tục.
School Admin đọc card/status, không mở enrollment; disable giải phóng UID và UI clear ngay, bật lại
không khôi phục. Chỉ System Admin được gán RFID qua API riêng, không cấp quyền sửa hồ sơ khác.
Vehicles selector disabled device đang enroll; admin có nút đối soát pending từ metadata để giải phóng
slot khi creator không thao tác được, không viết UID mới. Native modal/busy/Escape/viewport-scroll dùng
cùng design hiện có; các viewport/browser và các Student mutations thật vẫn cần UAT riêng.
Firmware1.3 mới hỗ trợ phiên; Wi-Fi/USB/nạp vẫn ở IoT. Không coi raw scan là điểm danh.

### Đổi thẻ / Hủy liên kết

Trong hồ sơ học sinh, SYSTEM_ADMIN thấy Đổi thẻ và Hủy liên kết khi đã có UID.
Đổi thẻ: ESP chưa gắn xe -> mở phiên -> quẹt thẻ mới -> Xác nhận đổi thẻ. Hủy phiên/hết hạn giữ thẻ cũ.
Hủy liên kết: hộp xác nhận -> gỡ UID, không xóa học sinh hoặc disable. Không cần ESP cho thao tác hủy.
Chặn hủy khi có phiên active/pending; phiên khác người mở cần người đó xử lý, pending cần đối soát.
Trang cũ có UID/version khác bị từ chối; đóng rồi tải lại hồ sơ trước khi thử tiếp.
SCHOOL_ADMIN chỉ đọc UID. Không cần flash lại ESP32 đang dùng firmware1.3.
