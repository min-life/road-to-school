# IoT RFID Lean POC — Backend

Source riêng tại `api/src/iot/`, MongoDB riêng `road_to_school_iot`, named connection
`iot`. Giai đoạn2 ghi mapping/lịch sử xe vào PostgreSQL qua `vehicle_iot_assignments`.
Không sửa records Student, Trip hoặc TripAttendance; dùng lại AuthGuard/RolesGuard hiện có.

## Trạng thái

- Bước 1: MongoDB Compose, ba schemas, cấu hình bật/tắt.
- Bước 2: bảy REST operations, Socket.IO, khóa thiết bị, mã hóa Wi-Fi và dedup scan.
- Có Web Serial flasher, giao diện Wi-Fi tự dò và firmware1.2.0-poc/manifest. Nghiệm thu
  Wi-Fi/backend scan/realtime thực tế còn chờ; không coi build là nghiệm thu thiết bị.
- Chưa nghiệm thu ghi dữ liệu MongoDB, contention/idempotency thực tế hoặc live
  streaming tới tài khoản thật. Không dùng kết quả static/unit thay thế UAT.

## Cấu hình local

IoT mặc định tắt: khi thiếu `IOT_ENABLED` hoặc khác `true`, không mở MongoDB và không
đăng ký routes/gateway IoT. Backend hiện có không cần MongoDB trong chế độ này.

Các lệnh hạ tầng dưới đây dành cho người vận hành; agent không tự tạo test data:

1. Tại root: `docker compose -f docker-compose.iot.yml config --quiet`.
2. Khởi động khi cần: `docker compose -f docker-compose.iot.yml up -d`.
3. Cấu hình `api/.env` thủ công, không đưa khóa thật vào Git:

```dotenv
IOT_ENABLED=true
MONGODB_IOT_URI=mongodb://127.0.0.1:27017/road_to_school_iot
IOT_DEVICE_AUTH_KEY=
IOT_WIFI_ENCRYPTION_KEY=
IOT_FIRMWARE_PATH=
IOT_ADVERTISED_API_URL=
```

Hai khóa phải được tạo độc lập bằng CSPRNG, mỗi khóa 32 byte/64 ký tự hex, không dùng
JWT secrets. Endpoint cần khóa mà chưa cấu hình sẽ trả 503, không dùng khóa mặc định.
`IOT_FIRMWARE_PATH` là đường dẫn `.bin` thực, tuyệt đối hoặc tương đối với working
directory API. Chỉ cấu hình sau khi đã build firmware thật.
`IOT_ADVERTISED_API_URL` do người vận hành đặt một lần: địa chỉ ESP32 truy cập được,
ví dụ IP LAN của máy API + port + `/api/v1`, hoặc tên miền cố định. Không dùng
localhost/loopback, credentials, query/hash; chấp nhận HTTP LAN POC hoặc HTTPS có
CA tương ứng trong firmware. Khi IP DHCP đổi, cập nhật env/restart API và cấp lại
cấu hình qua USB. Không tự chọn NIC, tin Host/Forwarded hoặc bỏ kiểm chứng TLS.

4. Khởi động API bằng script hiện có. Khi bật IoT, Mongoose khởi tạo collections và
   indexes; startup chờ indexes thành công trước khi nhận requests. Không seed,
   backfill, `syncIndexes`, drop indexes hoặc RAM fallback. MongoDB unavailable làm
   startup thất bại sau timeout hữu hạn.

Tắt bằng `IOT_ENABLED=false` rồi restart API. Không dùng `docker compose down -v`
vì sẽ xóa volume. Compose không auth, chỉ bind `127.0.0.1:27017`, dành cho local;
không dùng để public database. Volume do Docker quản lý, không đổi nơi lưu Docker.

## REST contract

### Chạy local riêng để nghiệm thu IoT

```powershell
npm run build
npm run start:iot
```

Entry `src/iot/iot-main.ts` nạp IoT, Vehicles, Health và xác thực thật; không import AppModule, ScheduleModule, TripsModule hoặc các cron
nghiệp vụ. Cần `IOT_ENABLED=true`. Đây là runtime local nghiệm thu, không thay lệnh
chạy hệ thống đầy đủ; các màn hình nghiệp vụ khác trên Web không dùng runtime này.

Phiên chuẩn bị local ngày04/11/2026 dùng MongoDB7.0.45 portable đã kiểm SHA256,
bind127.0.0.1:27018, data/logs tại E:\ChatGPT\road-to-school-iot\local-runtime.
MongoDB8.3 cài sẵn không khởi chạy được nên không sửa bản cài hệ thống; không cài Docker.
Đã cấu hình các biến IoT trong api/.env (ignored), keys ngẫu nhiên riêng và firmware
path thật. Không đưa keys vào docs/diff. Cấu hình Mongo native này độc lập với Compose
7.0 mặc định; khi dùng Docker, đổi URI về port được publish tương ứng.

Mở Web tại `http://localhost:5173/admin/iot`, đăng nhập SYSTEM_ADMIN đã có. Swagger
`http://localhost:3000/api/docs`. Khởi động lại Web bằng script dev hiện có nếu cần.
Logs/PIDs lịch sử của runtime do agent tạo nằm trong local-runtime/processes.json;
Web/API ngầm đã dừng, hiện PO chạy bằng terminal riêng để tránh trùng cổng;
không dừng các service PostgreSQL/MongoDB hệ thống hoặc tiến trình khác.

Readiness: health/DB200, Swagger200, Web route200, protected GET401 khi thiếu auth;
3collections có indexes. Snapshot đọc hiện có1thiết bị thật,21scan và0Wi-Fi configs;
agent không tạo các scan trong phiên sửa lỗi quét mạng.
không ghi PostgreSQL hoặc sinh dữ liệu giả. PO đã cho phép1thiết bị thật/max5lượt quẹt.
Driver signed Silicon Labs11.5.0.417 AMD64 đã cài theo phê duyệt UAC, COM6 hoạt động.
ESP32-D0WD-V3 revision3.1/4MiB đã nạp app firmware1.1.1 tại0x10000, hash verified,
giữ NVS. INFO/CONFIG_DEVICE thật xác nhận configuredtrue; sau khi tái hiện
WIFI_SCAN_FAILED trên1.1.0, firmware1.1.1 quét lặp và kiểm tra đồng thời thành công
trong trạng thái có Wi-Fi đã lưu nhưng chưa kết nối. Kết quả qua parser Web. RC522 trước đó đã đọc UID thật E026885F/MIFARE1KB. Cổng USB đóng
sau kiểm tra. Chưa nghiệm thu lại authenticated browser/Web Serial, SET_WIFI của bản sửa mới
và toàn luồng scan/realtime; số records hiện có không thay thế bằng chứng UAT. Không coi kiểm chứng service/Serial CLI là nghiệm thu toàn luồng Web.

### Contract endpoints

Prefix `/api/v1`. Các API quản trị chỉ `SYSTEM_ADMIN`, JWT qua Bearer header.
Requests/response DTOs, validation, headers và mã lỗi được mô tả trong Swagger.
POST không được tự gọi để test nếu chưa có PO cấp môi trường và quyền ghi cụ thể.

| Method/path | Actor | Hành vi |
| --- | --- | --- |
| POST `/iot/devices/provision` | SYSTEM_ADMIN | DTO như register; deviceId phải ESP32_ + MAC chuẩn hóa; 200 trả device/deviceKey/backendUrl. Tạo nếu chưa có; thiết bị cũ chỉ đọc, cùng key. URL/khóa chưa sẵn sàng 503 trước mọi ghi; MAC xung đột409; no-store |
| POST `/iot/devices/register` | SYSTEM_ADMIN | Đăng ký deviceId/MAC/chip/version/name; 201 trả device và deviceKey; trùng deviceId 409 |
| GET `/iot/devices` | SYSTEM_ADMIN | Phân trang, filter deviceId; mới đăng ký trước |
| POST `/iot/scans` | ESP32 | Header X-IoT-Device-Key; body scanId/deviceId/cardUid/scannedAt/cardType?; 200 trả scan và duplicate |
| GET `/iot/scans` | SYSTEM_ADMIN | Phân trang, filter deviceId/cardUid; mới ghi nhận trước |
| POST `/iot/wifi/save` | SYSTEM_ADMIN | Lưu SSID và mật khẩu mã hóa; 200 trả mask, isConfigured=false; chưa gửi cấu hình xuống ESP32 |
| GET `/iot/firmware/latest.bin` | SYSTEM_ADMIN | Binary thực từ path server cấu hình; chưa có/file sai/rỗng/quá 16 MiB trả 503 |

Pagination: page mặc định 1 (tối đa 100000), limit mặc định 20 (tối đa 100), trả
`{data,total,page,limit}`. Sort `{createdAt:-1,_id:-1}`. Validation 400, auth 401,
quyền admin 403, device chưa đăng ký 404, conflict 409, storage/config unavailable
503. Lỗi driver được làm sạch, không trả URI/credentials/query cho client.

### Thiết bị và scan

- deviceId là định danh bất biến, unique. Device key là HMAC-SHA256 từ master key
  riêng và deviceId có domain/version prefix. Không lưu khóa rõ trong MongoDB.
  Admin nhận deviceKey khi đăng ký để cấp qua USB ở bước Web/firmware.
- Endpoint provisioning cấp lại cùng deviceKey cho SYSTEM_ADMIN; thiết bị cũ không
  bị cập nhật metadata hoặc tạo thêm bản ghi. Không có rotate riêng từng thiết bị;
  register cũ vẫn trả409 khi trùng. Đổi master key vô hiệu toàn bộ key cũ, cần cấp
  lại qua USB. ESP32 không giữ JWT quản trị. Không log response chứa key.
- UID API nhận hex có/không dấu hai chấm, lưu uppercase không dấu phân cách. POC chỉ
  hỗ trợ UID 4 hoặc 7 byte. scanId UUIDv4 được lowercase, thiết bị sinh một lần rồi
  giữ nguyên khi retry; không được tạo ID mới mỗi lần gửi lại.
- Backend unique scanId chống ghi đúp. Duplicate-key được đọc lại và so sánh
  deviceId, UID, timestamp và cardType: cùng payload trả duplicate=true, khác trả
  409. Cùng UID với scanId mới là lượt quẹt mới, không tự lọc cooldown ở server.
- scannedAt cần ISO8601 có timezone, tối đa 5 phút trong tương lai; createdAt là giờ
  server ghi nhận. Không giả thời gian thiết bị bằng giờ server. Firmware phải đồng
  bộ đồng hồ ở bước sau.
- Trước khi lưu scan, server kiểm tra thiết bị đã đăng ký và cập nhật lastSeenAt
  bằng `$max` theo giờ server. Đây là hai thao tác MongoDB riêng; lastSeenAt có thể
  cập nhật dù bước insert scan thất bại, không phải xác nhận scan đã lưu.
- Device ONLINE trên response nghĩa là có lưu lượng scan đã xác thực trong 60 giây
  gần nhất; quá hạn trả OFFLINE. Heartbeat xác nhận cấu hình được cập nhật cùng lastSeenAt; không chứng minh
  thiết bị đang được lắp vật lý trên xe. Không ghi status dựa vào timer.
- ACK HTTP thành công chỉ sau khi insert hoàn tất, hoặc tìm lại đúng scan đã lưu.
  Không trả thành công giả khi MongoDB lỗi. Chưa có offline queue phía firmware.

### Wi-Fi và firmware

- Wi-Fi password được mã hóa AES-256-GCM, IV ngẫu nhiên 12 byte, auth tag 16 byte.
  Envelope `v1.iv.tag.ciphertext` dùng base64; AAD ràng buộc deviceId và SSID.
  Response chọn rõ các trường an toàn, không trả ciphertext hay mật khẩu rõ.
- SSID giữ khoảng trắng, kiểm tra 1–32 byte UTF-8 và không chứa NUL. Password hỗ trợ
  WPA/WPA2 8–63 ASCII in được hoặc 64 hex; chưa hỗ trợ open/enterprise networks.
- Lưu Wi-Fi trên server chưa đồng nghĩa đã gửi USB hoặc thiết bị kết nối thành công;
  isConfigured luôn false khi save, chờ protocol ACK ở bước firmware.
- Endpoint firmware chỉ đọc path tin cậy cấu hình server, không nhận path/upload từ
  client, trả no-store. Không tạo placeholder `.bin`. Endpoint không khẳng định
  file tương thích board hay flash offset; build/manifest/checksum cần bước firmware.
- Triển khai ngoài local cần HTTPS/WSS để bảo vệ JWT, device key và Wi-Fi password.

## Socket.IO realtime

- Namespace `/iot`, Engine.IO path `/socket.io`, transport `websocket`.
- Client dùng Socket.IO client tương thích, `auth: {token: accessToken}`; không truyền
  JWT qua URL. CORS local giống Web hiện có. Web chưa cài client trong bước này.
- Connection middleware dùng AuthGuard thật và yêu cầu SYSTEM_ADMIN trước khi cho
  vào namespace. Mỗi lần chuẩn bị phát sự kiện đều kiểm tra lại session/token/role;
  không hợp lệ thì disconnect và không nhận UID.
- Event `new_rfid_scan` có payload IotScanResponseDto, chỉ phát sau insert mới thành
  công. Retry cùng scan không phát lại. Không đưa secrets vào sự kiện.
- Delivery best effort, không chặn HTTP ACK. Client reconnect phải gọi GET lịch sử
  để bù sự kiện đã lỡ và dedup theo scanId. Chưa có queue/broker/distributed adapter.

## Kiểm chứng không ghi dữ liệu

Chạy từ `api/`:

```powershell
npx.cmd --no-install tsc --noEmit --incremental false --pretty false
npx.cmd --no-install vitest run src/iot/
npx.cmd --no-install oxlint src/iot/ src/app.module.ts
npm.cmd run build
node src/iot/verification/verify-readonly.mjs
```

Script cuối dựng server cô lập dùng controllers/gateway đã biên dịch, không import
AppModule/AuthModule/MongooseModule, không cron hoặc database connection. Dependencies
DB cố ý throw nếu bị truy cập. Chỉ GET Swagger/GET thiếu auth và bắt tay Socket.IO
thiếu token. Không có POST/PUT/PATCH/DELETE, business fixtures hoặc fake success data.
Server tạm nghe `127.0.0.1:3000` rồi đóng; nếu port bận, không dừng process khác,
có thể chọn `IOT_VERIFY_PORT` khác. Kết quả không thay nghiệm thu app đầy đủ/MongoDB.

Nguồn tham chiếu: [NestJS MongoDB](https://docs.nestjs.com/data/mongodb),
[Conditional modules](https://docs.nestjs.com/techniques/configuration#conditional-module-configuration),
[NestJS gateways](https://docs.nestjs.com/websockets/gateways),
[Socket.IO middleware](https://socket.io/docs/v4/middlewares).

## Gán xe — giai đoạn2

PG là nguồn mapping duy nhất; migrate trước khi bật bản app mới. Chạy `npx prisma migrate deploy`
bằng toolchain đã cài; không dùng db push/seed. Mongo registry giữ deviceId cố định, key/Wi-Fi
không đổi khi chuyển xe. Chỉ SYSTEM_ADMIN gọi các routes dưới `/api/v1/iot/devices/:deviceId`:

| Method | Suffix | Contract |
| --- | --- | --- |
| GET | vehicle-assignment | Mapping hiện tại, trạng thái ACK |
| PUT | vehicle-assignment | vehicleId, expectedAssignmentId UUID hoặc explicit null, reason optional |
| DELETE | vehicle-assignment | expectedAssignmentId UUID, reason optional; đóng lịch sử |
| GET | vehicle-assignments | Lịch sử page/limit |
| GET | runtime-config | Device key header, không JWT; lease60s |
| POST | heartbeat | Device key header; assignmentId UUID hoặc explicit null, firmwareVersion optional |

Mỗi xe/device tối đa một assignment chưa đóng. CAS cũ, xe inactive/đã chiếm, frozen trip
SCHEDULED/IN_PROGRESS hoặc token lỗi trả409. Advisory lock device + vehicle row locks và
short table locks trips/trip_attendances ngăn race với writers hiện hữu; lock3s/transaction10s,
DB unavailable/lock timeout trả503. Không giữ table locks khi gọi Mongo.

Heartbeat ACK chỉ là telemetry Mongo, không tự tạo mapping. GET vehicles list/detail enrich
nullable iotDevice bằng batch PG, không đọc Mongo. Khi IOT_ENABLED=false enrichment null.
Runtime local riêng đã nạp VehiclesModule để console chọn xe; không khởi chạy cron nghiệp vụ.

Firmware poll30s, lease60s; config/heartbeat không khớp thì chưa xác nhận. Scan mới có token
được kiểm tra device, khoảng assignedAt <= scannedAt < releasedAt, gửi chậm tối đa120s và
clock skew5s. ACK duplicate được tìm trước current-mapping check, giữ nguyên snapshot lịch sử;
không suy diễn xe hiện tại cho scan cũ. Scan unbound/legacy nullable, đã gán nhưng thiếu token409.
Scan response/realtime thêm assignmentId/vehicleId/vehicleLicensePlateSnapshot; GET scans lọc
vehicleId/assignmentId. Giới hạn: không transaction phân tán PG/Mongo; insert Mongo đã tồn tại
vẫn có thể được ACK đúng khi retry. Không tự backfill hoặc xóa dữ liệu cũ.

Bằng chứng build/unit/Swagger đã có; chưa tạo assignment thật hoặc kiểm thử chuyển xe thật.
Xem mụcJ trong [plan](../../../docs/architecture/iot-rfid-lean-poc-plan.md).

## Đăng ký RFID học sinh — giai đoạn3

PG chỉ thêm Student.rfidCardUid nullable/unique/CHECK (migration20261106010000_student_rfid_uid).
Mongo thêm rfid_enrollment_sessions, tổng4collections, không TTL delete. Student UID mapping chỉ ở PG;
Mongo giữ phiên/candidate/feedback và ý định xác nhận. Không thêm bảng session/receipt ở PG.

SYSTEM_ADMIN: POST/GET /iot/enrollment-sessions, GET/DELETE /:sessionId,
POST /:sessionId/confirm, POST /:sessionId/reconcile. Confirm body chỉ capturedScanId;
UID chỉ nhận từ device-key POST /iot/devices/:deviceId/enrollment-scans. Role creator bắt buộc,
reconcile dành admin hợp lệ và chỉ đọc PG/finalize Mongo. Không ghi UID bằng Student CRUD.
Student detail chỉ các admin có quyền đọc mới có RFID; Parent DTO/QR không đổi.

Runtime mode ENROLLMENT/VEHICLE_SCAN/POC và enrollmentSessionId; firmware1.3 trở lên.
Enrollment TTL5phút, lease=min(60s,TTL), session poll2s, heartbeat đúng mode mới nhận thẻ.
Start/capture/confirm kiểm device unbound; assignment cũng check session trong cùng PG advisory lock.
Mongo guard chạy trước Trip table locks; source khởi động chờ unique indexes của cả4collections.

Capture không ghi Student/rfid_scans/TripAttendance. UID đã dùng409CARD_ALREADY_ASSIGNED;
quẹt lại trước confirm409CARD_ALREADY_CAPTURED; cùng scanId/payload200duplicate, không đổi candidate.
lastScanFeedback bounded phục vụ Web không cần mở USB; không dùng raw scan events làm đăng ký.
Confirm giữ Student row, durable Mongo COMMITTING rồi PG UID update và finalize COMPLETED;
202 khi kết quả chưa rõ. Retry/đối soát chỉ đọc hậu điều kiện PG, không phát lại UID write nếu null.
COMMITTING/RECONCILING giữ slot dù hết TTL, không hủy/expire mù hoặc mở phiên khác.

SCHOOL_ADMIN disable đúng trường clear UID cùng transaction status hiện có. Re-enable không restore,
invalidate phiên cũ/fail closed khi Mongo không sẵn sàng; lifecycle version giữ intent cũ không gán lại.
Rollback status PG không tự rollback Mongo invalidation: phiên có thể cần mở lại, không mất/khôi phục UID
âm thầm. Không xóa history hoặc gán lại lịch sử theo chủ UID mới.

Local acceptance npm run start:iot nạp thêm Students/Schools/Vehicles/Auth, không ScheduleModule/Trips
cron; đủ Student enrollment, không phải runtime đầy đủ cho các trang điều phối ngoài phạm vi này.
Build/static/schema checks đã chạy; chưa cấp UID/session thật để UAT, không coi các check đó là chứng nhận
concurrency hoặc lỗi hai DB. Xem planK và LATEST để biết trạng thái nghiệm thu.

## Đổi thẻ và hủy liên kết

SYSTEM_ADMIN thao tác ở card Thẻ RFID trong hồ sơ học sinh. Đã có thẻ: Đổi thẻ/Hủy liên kết;
chưa có: Đăng ký thẻ. SCHOOL_ADMIN vẫn chỉ đọc UID.
Đổi thẻ dùng session operation=REPLACE với expectedPreviousCardUid/expectedStudentVersion từ hồ sơ.
Thẻ cũ giữ nguyên tới confirm PG thành công; hủy phiên/hết hạn không tháo thẻ cũ. Quẹt thẻ cũ báo
SAME_CARD, thẻ thuộc học sinh khác báo CARD_ALREADY_ASSIGNED. Phiên cũ thiếu operation là REGISTER.
DELETE /iot/students/:studentId/rfid-card nhận expectedCardUid/expectedStudentVersion, gỡ UID về null
trong PG row-locked transaction; không đổi status, không xóa lịch sử. Active/pending session chặn hủy;
Mongo lỗi fail closed. Retry khi null không ghi lại; UID/version khác trả409. Không thêm PG migration,
collection/index hay audit hủy riêng. Firmware1.3 hiện tại dùng được, không cần nạp lại; thông báo
SAME_CARD hiển thị trên Web qua session feedback (firmware cũ vẫn xử lý HTTP409 là rejected).

## Điểm danh RFID theo chuyến — L-A

Backend api/src/iot/attendance/ nhận candidate từ firmware1.4 và cho BUS_ATTENDANT đúng phân công
xác nhận. Không auto apply, không thay Mobile ở task này. Handoff chi tiết:
docs/architecture/iot-rfid-mobile-integration-guide.md (từ repo root).

Runtime có ATTENDANCE + signed context60s khi đúng một Trip hợp lệ ngày VN. Firmware cũ nhận
raw/enrollment và reason upgrade, không bị cấp context không hiểu. Candidate120s, revalidate UID/
active roster/assignment/phase/Student version khi confirm. Attendance capture không ghi PG hoặc phát
boarding notification. Capture hợp lệ có thể trả200 REJECTED/ALREADY_RECORDED; đọc state/resultCode.

POST /iot/devices/:deviceId/attendance-scans (device-key); GET /trips/:tripId/rfid-scans và POST
/:scanId/confirm|dismiss (BUS_ATTENDANT). Confirm200/202; pending retry đọc receipt, không phát lại PG
write từ history. Hai nullable UUID receipt fields cùng PG transaction với boarding/alighting/time/
notifications; manual undo giữ receipt. Không auto override ABSENT hoặc MANUAL_OVERRIDE.

Raw/enrollment/attendance có scanId lock và purpose checks, không chuyển lượt cũ sang Trip mới.
PG/Mongo không atomic, client timeout không hủy late Mongo write; kiểm tra pending và receipt khi
kết quả chưa rõ. Không seed/test mutation khi chưa có scope. Chưa flash1.4/UAT thẻ thật.
