# ESP32 + RC522 — RoadToSchool Lean POC

Firmware `1.4.0-poc`, Serial protocol v1, ESP32 DevKit V1 / CP2102, flash4MiB.
Không có Wi-Fi, device key, UID, student hoặc trip mẫu được hardcode trong binary.
Không dùng MQTT, OTA, offline queue hoặc PostgreSQL. Backend nhận raw UID qua HTTP.

## Đấu nối (tắt nguồn trước khi đấu dây)

| RC522 | ESP32 |
| --- | --- |
| SDA / SS | GPIO5 |
| SCK | GPIO18 |
| MOSI | GPIO23 |
| MISO | GPIO19 |
| RST | GPIO22 |
| GND | GND |
| 3.3V | 3V3 — không cấp5V |
| Buzzer chủ động (+) | GPIO4, GND chung, dùng driver phù hợp dòng của buzzer |

Bíp60ms xác nhận đọc thẻ, **không** xác nhận MongoDB đã lưu. Firmware phát
`RFID_READ` với UID thật qua Serial; chỉ phát `SCAN_SAVED` sau ACK server khớp scan.
Không raw echo request, password, key, URL hoặc response HTTP. RC522 đọc UID4/7byte,
cooldown cùng UID2giây. Thẻ phải rời vùng đọc rồi chạm lại; UID10byte bị từ chối.
Nếu RC522 không phản hồi khi boot, phát READER_NOT_FOUND; sửa đấu nối rồi reset.

## Build và binary cho Web

Từ root repository trên Windows:

```powershell
python -B firmware/esp32-rfid-node/scripts/build_firmware.py --bootstrap
```

`--bootstrap` cài PlatformIO6.1.19 vào venv riêng dưới E:\ChatGPT, không cài vào Python
hệ thống. Lần sau bỏ flag này. `--work-dir` hoặc RTS_IOT_WORK_DIR thay đổi nơi lưu
toolchain/build/libdeps/artifacts. Scripts chỉ build/merge, không có upload target,
không mở cổng COM, không cấu hình thiết bị và không gọi API nghiệp vụ.

Platform espressif32@6.13.0, MFRC522@1.4.12, ArduinoJson@6.21.5. Core Arduino2.0.17
theo platform; các packages resolve thực tế hiển thị trong build output.

Output mặc định:

```text
E:\ChatGPT\road-to-school-iot\artifacts\firmware.bin
E:\ChatGPT\road-to-school-iot\artifacts\firmware-manifest.json
```

`firmware.bin` này là **merged image** base0x0, khác app-only binary ở build directory:
bootloader0x1000, partitions0x8000, boot_app0 0xE000, app0x10000. Build script dùng
esptool merge_bin chính thức, kiểm tra chip ID/layout/partition bounds rồi mới thay
artifact cuối. Manifest ghi version/protocol, kích thước, SHA-256 và source hashes.
Không dùng artifact cũ nếu build mới thất bại. Không commit toolchain/binaries.

Để Backend phục vụ file qua API có xác thực, người vận hành cấu hình api/.env:

```dotenv
IOT_FIRMWARE_PATH=E:/ChatGPT/road-to-school-iot/artifacts/firmware.bin
```

Đây là hướng dẫn, script không sửa .env. Backend cần IOT_ENABLED=true, MongoDB riêng,
hai khóa IoT riêng theo README api/src/iot. Không chép binary vào public URL không
xác thực. Upload qua Web chỉ sau user bấm Nạp firmware; không chạy pio upload để test.
Merged flash có thể thay thế cấu hình/NVS trong vùng ghi; không có OTA rollback.

## Serial v1 và provisioning

Giao thức khớp [Web contract](../../web/docs/iot-device-console.md): JSON UTF-8 một
dòng + LF, requestId UUIDv4, baud115200. Input tối đa2048byte, không echo raw input;
Web đang cho phép tối đa8192ký tự response, các reply firmware nhỏ hơn giới hạn đó.
INFO vẫn dùng được khi chưa có mạng/RC522, CONFIG_DEVICE ACK sau NVS write/readback,
SET_WIFI ACK sau kết nối và lưu NVS thành công. SCAN_WIFI quét bất đồng bộ trên
ESP32 trước cả provisioning; không ghi NVS/DB. Giải phóng scan results sau reply,
chặn khi đang cấu hình Wi-Fi hoặc chờ ACK RFID. Danh sách loại SSID rỗng và ưu tiên
20SSID mạnh nhất; chỉ WPA/WPA2 Personal được chọn, mạng mở/enterprise/WPA3-only
hiện chưa hỗ trợ trong luồng cấu hình. Web có nhập tên mạng thủ công cho SSID ẩn.

Khi quét, firmware tắt auto-reconnect; nếu station chưa kết nối, dừng/bật lại STA
mà không erase AP/NVS rồi chờ200ms trước khi bắt đầu scan. Disconnect đơn thuần
chưa đủ trên board đã lưu mạng cũ. Scan-start retry tối đa3lần, scan-running có hạn
9giây; sau reply giải phóng kết quả và lên lịch nối lại mạng đã lưu. Nếu đang nối
ổn định, scan không chủ động ngắt mạng đó. SET_WIFI cũng dừng auto-reconnect cũ và
chờ radio ổn định trước khi thử mạng mới; chỉ lưu credentials mới sau thành công.
INFO chỉ thêm hai boolean wifiConnected/hasSavedWifi, không trả SSID/password/key.
Các event WIFI_SCAN chỉ có stage START_FAILED/RESULT_FAILED/SCAN_TIMEOUT để chẩn
đoán; không echo dữ liệu mạng. Đổi Wi-Fi qua USB không đòi hỏi build/nạp lại code.

| Command | Input thêm | data khi thành công |
| --- | --- | --- |
| INFO | không | protocolVersion:1, firmwareVersion, deviceId từ MAC, configured, wifiScan:true, wifiConnected, hasSavedWifi |
| CONFIG_DEVICE | deviceId, backendUrl, deviceKey | deviceId khớp hardware |
| SCAN_WIFI | không | networks: tối đa20 {ssid,rssi,secure,supported}, mạnh trước, SSID duy nhất |
| SET_WIFI | ssid, password | connected:true, ssid khớp request, ip IPv4 |

Các lỗi trả ok=false và code ngắn; không chứa secret. Lệnh/config fields lạ bị từ
chối. Device ID là ESP32_ + MAC STA viết hoa không dấu hai chấm, khớp Web/esptool.
Key64hex lowercase, URL tối đa512ký tự kết thúc /api/v1, không localhost/loopback,
userinfo/query/hash. Không lưu credentials lên thiết bị khi CONFIG_DEVICE không hợp lệ.

NVS dùng namespace rts-iot, mỗi nhóm device/Wi-Fi lưu một JSON blob rồi đọc lại để
xác nhận. Không erase NVS khi boot, không seed defaults. Wi-Fi mới được thử tối đa
12giây; lỗi phân biệt không tìm thấy mạng, kết nối bị từ chối, hết thời gian và không lưu
được NVS. Không khẳng định mật khẩu sai chỉ từ timeout. Chỉ lưu khi connected đúngSSID/cóIP; thất bại phục hồi mạng cũ đã lưu.
Không chờ vòng lặp blocking12giây: vẫn xử lý Serial/RFID trong lúc chờ. Reboot tự
nạp cấu hình cũ, tự nối lại Wi-Fi. Web mới tự lấy URL/key từ máy chủ khi kết nối USB,
provisioning thiết bị cũ không tạo thêm bản đăng ký và không yêu cầu người dùng nhập key.

## Gửi UID và ACK

- Sau khi có cấu hình, Wi-Fi và đồng hồ SNTP UTC thật mới tạo scanId UUIDv4 bằng
  RNG ESP32; giữ body/timestamp/ID bất biến khi retry. ISO8601 millisecond Z khớp API.
- SNTP dùng time.cloudflare.com/pool.ntp.org; nếu đồng hồ chưa sẵn sàng phát
  CLOCK_NOT_READY, không tạo giờ quẹt giả hoặc dùng giờ lưu server thay thế.
- POST /iot/scans, X-IoT-Device-Key, JSON scanId/deviceId/cardUid/cardType/scannedAt.
  Header key riêng thiết bị; không đưa JWT admin vào firmware. Không follow redirects.
- Chỉ ACK HTTP200 + JSON scanId/deviceId/UID/cardType/time khớp + duplicate boolean
  mới phát SCAN_SAVED. Success body bị giới hạn4096byte, yêu cầu Content-Length
  (Express hiện có); không coi mọi HTTP200 là lưu thành công.
- Retry network/408/429/5xx tối đa4lần, backoff+jitter, deadline30giây. Không tạo
  scanId mới khi retry; backend unique index xử lý trường hợp ACK bị mất.
- Một scan chờ ACK trong RAM. Thẻ tiếp theo trong lúc bận bị báo SKIPPED; không có
  queue offline hoặc ghi scan vào flash. Quét khi offline/chưa config/chưa có giờ
  bị bỏ qua có event, người vận hành cần quẹt lại. Reset làm mất pending scan.
- CONFIG_DEVICE bị chặn khi đang có pending scan/Wi-Fi config để tránh gửi UID cũ
  sang một cấu hình backend mới. HTTP synchronous có timeouts; có thể làm chậm
  đọc thẻ/Serial trong request. Buzzer có timer độc lập để không bị kéo dài theo HTTP.

## HTTP local và HTTPS

HTTP phục vụ POC trong LAN tin cậy, truyền device key không mã hóa trên mạng.
Muốn HTTPS: copy include/trusted-ca.example.h thành include/trusted-ca.h, cấu hình
public rootCA của endpoint rồi build lại. HTTPS cấu hình thiếuCA bị từ chối;
không setInsecure hoặc tự fallbackHTTP. Không bỏ qua xác minh certificate.
NVS mặc định chưa flash-encrypted/secure-boot; không coi POC là chống trích xuất key
vật lý hoặc chống sao chép UID. MongoDB Wi-Fi encryption độc lập với NVS của ESP32.

## Kiểm chứng

```powershell
python -B firmware/esp32-rfid-node/scripts/test_bundle.py
python -B firmware/esp32-rfid-node/scripts/build_firmware.py
node --experimental-strip-types firmware/esp32-rfid-node/scripts/verify_bundle.mjs
```

Tests chỉ kiểm tra negative binary-layout cases; build là compile thật cho chip,
không thay test phần cứng. Agent không tự mở COM/nạp/quẹt thẻ hoặc tạo scan test.
Script Node cuối đọc artifact thật, đối chiếu Web validator, source hashes và method
phục vụ binary của Backend (cần api đã build); không khởi động server hoặc đọc DB.
UAT cần ESP32/RC522/thẻ/mạng thật và phạm vi ghi MongoDB do PO cấp; các bước có ghi
không được tự chạy theo chính sách dữ liệu của repository.

Nguồn: [PlatformIO Espressif32](https://docs.platformio.org/en/latest/platforms/espressif32.html),
[Preferences](https://docs.espressif.com/projects/arduino-esp32/en/latest/tutorials/preferences.html),
[MFRC522](https://github.com/miguelbalboa/rfid),
[esptool merge](https://docs.espressif.com/projects/esptool/en/latest/esp32/esptool/basic-commands.html).

## Gán xe runtime — 1.2.0

Nạp bản1.2 một lần rồi gán/chuyển/tháo trên Web; không cần flash mỗi lần đổi xe.
Worker riêng lấy runtime-config mỗi30s và gửi heartbeat ACK cùng firmwareVersion bằng
X-IoT-Device-Key, không JWT. Cache RAM có lease60s kiểm theo UTC/expiresAtEpoch;
khởi động lại, đổi cấu hình hoặc mất mạng phải lấy config mới. Hết lease thì dừng nhận
scan mới, không tự đoán xe. INFO bổ sung vehicleAssignment:true và runtimeConfigReady.

Pending scan đóng băng assignmentId/vehicleId từ lúc quẹt; retries giữ nguyên payload,
ACK phải khớp cả hai IDs.409/401 invalidates config; lượt quẹt đã gửi không chuyển sang
xe mới. Config unbound có hai IDs null, giữ raw UID POC. Đồng hồ chưa đồng bộ/lease chưa
sẵn sàng phát SCAN_SKIPPED/RUNTIME_CONFIG_NOT_READY. Worker không chặn vòng Serial/RFID;
không bắt đầu poll khi đang có pending scan. TLS kiểm CA như sender hiện hữu.

Đã build binary/manifest và kiểm tra source hashes. Ngày05/11/2026 đã nạp application-only
1.2.0-poc vào ESP32_C82E188BAB44, giữ NVS; INFO sau reset xác nhận Wi-Fi tự reconnect và
runtimeConfigReady=true, Mongo nhận heartbeat thật. Chưa nghiệm thu gán/chuyển xe và thẻ thật;
không dùng kết quả này thay nghiệm thu mạng/nguồn điện khi lắp trên xe.

## Phiên đăng ký thẻ học sinh — 1.3.0

INFO thêm enrollment:true. Runtime nhận mode/sessionId qua backend, không lưu Student PII xuống NVS.
ENROLLMENT gửi /iot/devices/:deviceId/enrollment-scans, giữ sessionId/mode/endpoint bất biến trong
pending event; normal mode vẫn /iot/scans. ACK cần khớp sessionId/scanId/UID/time, mới phát
ENROLLMENT_CAPTURED, không gọi là Student đã đăng ký trước khi admin confirm PG.
Typed409 đăng ký được phát ENROLLMENT_REJECTED, backend ghi feedback để Web poll không cần Serial.
401/409/410 invalidate runtime; không đổi mục đích scan cũ sang POC hoặc xe. No offline enrollment queue.
Mode/heartbeat/lease phải khớp mới cho capture; chưa có config hoặc hết hạn thì skip có mã an toàn.
Nạp1.3 một lần; các phiên sau mở/hủy/xác nhận trên Web, không phải flash lại mỗi lượt.

## Attendance L-A — firmware1.4

Runtime hỗ trợ ATTENDANCE, tripId/phase và signed contextToken có hạn; không Student PII trong NVS.
Pending scan đóng băng token/Trip/phase, gửi endpoint attendance-scans riêng; ACK kiểm scan/UID/time/
Trip/phase. ATTENDANCE_CAPTURED chỉ là candidate, không có SCAN_SAVED hay claim học sinh đã lên xe.
HTTP200 REJECTED phát ATTENDANCE_REJECTED và không retry thành boarding; context cũ401/409/410
refresh rồi yêu cầu quẹt lượt mới, không reinterpret payload. Không có offline queue bền vững.
Cần phụ xe xác nhận API, hướng dẫn Mobile ở docs/architecture/iot-rfid-mobile-integration-guide.md.
Build không đồng nghĩa flash; nạp/UAT chỉ sau scope PO. Firmware1.3 vẫn dùng enrollment/raw.
