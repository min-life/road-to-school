# Bàn giao Mobile — tích hợp điểm danh RFID L-A

Ngày 06/11/2026. Tài liệu ban đầu dùng bàn giao Backend/firmware theo lean POC mục L. PO sau đó
yêu cầu **gắn Mobile tạm trên local để test, không đưa thay đổi Mobile vào commit/push**.
Các điểm gắn thực tế và trạng thái local ở mục 11 cuối tài liệu. Chưa có nghiệm thu end-to-end với
thẻ/Trip thật. L-A cần phụ xe xác nhận; không triển khai chế độ tự điểm danh L-B.

## 1. Luồng cần tích hợp

ESP32 gắn xe -> Backend cấp context chuyến/giai đoạn -> quẹt thẻ -> candidate chờ trên Backend ->
Mobile phụ xe hiển thị -> phụ xe xác nhận -> Backend ghi TripAttendance PG -> Mobile refresh roster.

Điện thoại không đọc NFC/RFID, không dùng USB/Bluetooth với ESP và không gửi device-key/contextToken.
Đăng ký/đổi/hủy liên kết thẻ vẫn ở Web SYSTEM_ADMIN. Mobile dùng JWT BUS_ATTENDANT như hiện tại.
Tài xế, School Admin, System Admin và Parent không được gọi ba API quản lý candidate bên dưới.
Backend kiểm tra đúng assignedBusAttendantId; ẩn nút không thay được kiểm tra quyền ở server.

## 2. Điểm gắn trong source hiện tại

| File/điểm gắn | Công việc |
| --- | --- |
| mobile/services/api-client.ts | Thêm types và ba methods list/confirm/dismiss; dùng request() hiện có, giữ xử lý JWT/refresh/errors |
| mobile/app/trip/[id].tsx | Vùng điểm danh BUS_ATTENDANT, cạnh Boarding/Alighting và QR; nối RFID panel với identity/accessAllowed/foreground |
| Hook riêng, ví dụ mobile/hooks/use-rfid-attendance.ts | Poll queue, phân trang, chống response cũ, action lock, error/pending; không nhồi thêm logic lớn vào trip page |
| Component riêng theo conventions Mobile | RFID reader status và candidate cards; dùng styles/components sẵn có, không tự thêm thư viện |
| mutate/refresh và operational state hiện có | Sau confirm thành công refresh getTripAttendance/getOperationalState/detail theo cơ chế hiện tại |

Source để đối chiếu: api/src/iot/attendance/{attendance.controller.ts,attendance.dto.ts,attendance.service.ts}.
Swagger sau chạy API: http://localhost:3000/api/docs, tag **IoT Trip Attendance**.
Không sửa các endpoint manual updateAttendance/updateAlighting/verifyQrAttendance để giả làm confirm RFID.
Confirm RFID phải đi endpoint riêng để ghi PG receipt/idempotency và audit cùng transaction.

## 3. API base và authentication

Các path bên dưới tính từ base URL `/api/v1`, không hardcode localhost trong Mobile.
Dùng Bearer JWT của phụ xe. Điện thoại thật phải trỏ backend LAN/domain truy cập được; localhost của
điện thoại không phải máy chạy API. Không đưa token, UID hoặc payload học sinh vào debug logs.

### GET /trips/:tripId/rfid-scans

Query:
- `view=queue` (default) hoặc `history`.
- `page=1`, `limit=20` mặc định; limit tối đa100, phân trang bình thường.

Response type:

```ts
type RfidPhase = 'BOARDING' | 'ALIGHTING';
type RfidState = 'WAITING_CONFIRMATION' | 'COMMITTING' | 'RECONCILING'
  | 'APPLIED' | 'ALREADY_RECORDED' | 'REJECTED' | 'DISMISSED' | 'EXPIRED';

interface RfidAttendanceEvent {
  scanId: string;
  deviceId: string;
  tripId: string;
  studentId: string | null;
  studentName: string | null;
  studentCode: string | null;
  cardUid: string;
  phase: RfidPhase;
  state: RfidState;
  resultCode: string | null;
  scannedAt: string;
  expiresAt: string;
  serverTime: string;
  confirmedById: string | null;
  confirmedAt: string | null;
  current: boolean;
  historical: boolean;
}

interface RfidAttendanceList {
  data: RfidAttendanceEvent[];
  total: number;
  page: number;
  limit: number;
  phase: RfidPhase | null;
  reader: {
    deviceId: string | null;
    status: 'NO_DEVICE' | 'PENDING' | 'READY';
    lastAckAt: string | null;
  };
  serverTime: string;
}
```

Queue gồm WAITING_CONFIRMATION/REJECTED/ALREADY_RECORDED còn expiresAt và tất cả COMMITTING/
RECONCILING kể cả quá hạn. History gồm mọi trạng thái, mới nhất trước. Event waiting quá hạn ở
history được trả EXPIRED mà GET không ghi DB. Không coi APPLIED biến mất khỏi queue là thất bại.

`reader.READY` cần heartbeat nhận đúng assignment/Trip/phase/version còn mới <60giây và Trip hợp lệ.
PENDING không đồng nghĩa chắc chắn thiết bị hỏng: có thể firmware cũ, chưa refresh hoặc chuyến chưa
cho quẹt. NO_DEVICE là xe chưa gắn thiết bị. Không tự suy READY chỉ từ việc có candidate cũ.
Danh tính Student trên REJECTED có thể null; không crash/đoán tên khi thiếu. Backend không trả danh
học sinh ngoài roster để giải thích thẻ sai. cardUid không dùng làm React key; dùng scanId.

### POST /trips/:tripId/rfid-scans/:scanId/confirm

Gửi body `{}` (hoặc không body), không gửi Student/UID/phase/action/status. Các trường tự khai bị từ chối.
Response JSON là RfidAttendanceEvent trực tiếp, không bọc `event`/`data`/`pending`.

- HTTP200 APPLIED: PG đã ghi trạng thái và receipt. Refresh roster/operational state.
- HTTP200 ALREADY_RECORDED: trạng thái đã có, không ghi điểm danh/thông báo lặp; không tuyên bố
  lượt RFID này là nguồn nếu đã được manual ghi trước đó.
- HTTP200 APPLIED + historical=true/current=false: receipt lịch sử còn, nhưng trạng thái hiện tại đã
  sửa hoặc học sinh bị loại. Không hiện “học sinh đang trên xe”; refresh dữ liệu hiện tại.
- HTTP200 REJECTED + RECEIPT_NOT_CONFIRMED: đối soát không thấy PG receipt; không áp dụng lại scan cũ.
  Hướng dẫn quẹt lượt mới hoặc xử lý thủ công sau kiểm tra, không toast thành công.
- HTTP202 state RECONCILING: chưa chốt được kết quả. Hiện Đang đối soát; giữ scanId, khóa xác nhận mới.
  Nút Kiểm tra kết quả gọi lại **cùng POST confirm với cùng tripId/scanId**. Nhánh pending chỉ đọc PG
  receipt và finalize Mongo, không ghi lại attendance. Không đổi scanId để thử vượt pending.

request() hiện tại có thể chỉ trả JSON và không expose HTTP status. Vẫn phải đọc `state/resultCode/
current/historical`, không coi mọi Promise resolve hoặc response.ok là điểm danh thành công.
Không tự tạo endpoint reconcile hoặc gọi manual writer để “bù” khi confirm timeout.

### POST /trips/:tripId/rfid-scans/:scanId/dismiss

Body `{}` hoặc không body. Response là RfidAttendanceEvent, state DISMISSED; retry dismiss idempotent.
Dùng cho candidate waiting/rejection cần bỏ qua. Không ghi ABSENT, không undo PG, không xóa lịch sử.
COMMITTING/RECONCILING/APPLIED/ALREADY_RECORDED không dismiss được (409). Có thể ẩn card đã xử lý
ở UI cục bộ; không gọi dismiss vô hạn trên các trạng thái này.

## 4. Wireframe và nút theo trạng thái

```text
Điểm danh                       [Quét QR]
[Lên xe] [Xuống xe]
RFID · Xe ... · Lên xe/Xuống xe
Đã nhận đúng chuyến / Chưa sẵn sàng / Chưa gắn thiết bị

Tên học sinh · Mã học sinh
Chờ xác nhận lên xe/xuống xe
[Bỏ qua]                  [Xác nhận lên xe/xuống xe]

Đang đối soát              [Kiểm tra kết quả]
```

| State | Hiển thị và thao tác |
| --- | --- |
| WAITING_CONFIRMATION | Student và phase, countdown theo serverTime/expiresAt; xác nhận/bỏ qua khi còn hạn, đúng phase, không busy |
| COMMITTING/RECONCILING | Đang đối soát, chỉ kiểm tra kết quả; không dismiss/xác nhận bằng action khác |
| ALREADY_RECORDED | Đã ghi nhận, không xác nhận lần nữa; không đổi phase chỉ vì lại quẹt cùng thẻ |
| REJECTED | Lỗi ngắn từ resultCode, bỏ qua; không hiển thị tên giả khi Student null |
| APPLIED | Đã ghi nhận nếu current; historical/current=false phải đọc roster hiện tại |
| DISMISSED/EXPIRED | Đã bỏ qua/hết hạn, không confirm; có thể quẹt lượt mới hoặc manual |

Không tự pop modal liên tiếp và thay học sinh đang xác nhận khi lượt khác đến. Dùng hàng chờ cuộn/
phân trang, có thể gộp hiển thị cùng studentId+phase nhưng giữ scanId cụ thể được chọn; Backend vẫn
lưu từng lượt. Bấm nhanh khóa per-action, chỉ refresh/toast sau response phù hợp; toast dedup theo
scanId/state. GIữ manual/QR/vắng và lý do như hiện tại, không override ABSENT từ UI RFID.

## 5. Giai đoạn do Backend quyết định

| Trip | RFID |
| --- | --- |
| TO_SCHOOL IN_PROGRESS, chưa đến trường | BOARDING |
| TO_SCHOOL IN_PROGRESS, đã xác nhận đến trường | ALIGHTING |
| TO_PARKING SCHEDULED + phụ xe Ready | BOARDING |
| TO_PARKING IN_PROGRESS | ALIGHTING |
| Chưa Ready, TO_SCHOOL chưa Start, completed/cancelled hoặc context mơ hồ | Không nhận điểm danh mới |

Không scan1=lên/scan2=xuống, không gửi phase tự tính để sửa Backend. Manual chiều về vẫn có behavior
cũ khi IN_PROGRESS; thay đổi stricter ở bảng này chỉ áp dụng RFID. Quẹt không tự ghi vắng.

## 6. Polling, lifecycle và race UI

1. Chỉ start polling khi user BUS_ATTENDANT, quyền vào chuyến hợp lệ, đúng Trip, screen focused và
   AppState active. Default 2giây, không chồng request; khi có lỗi backoff và hiện lỗi ngắn.
2. Dùng identity gồm userId/tripId/access generation. Khi logout/đổi account/Trip/blur, tăng generation,
   hủy timer/request nếu hỗ trợ và bỏ response cũ trước setState hoặc toast.
3. Tái dùng identityRef/accessAllowed/qrGeneration pattern ở trip page để tránh thao tác nhầm chuyến.
   Không copy dữ liệu Parent/Driver sang store chung cho RFID hoặc giữ JWT trong store mới.
4. Sau Ready/Start/Arrive, phase/reader có thể cần ESP refresh (~30giây). Quét bằng lease cũ có thể
   bị STALE_CONTEXT; đợi nhận đúng phase rồi quẹt lại, không reinterpret scan cũ.
5. Dừng action pending UI khi rời màn không đồng nghĩa cancel intent server; khi quay lại GET queue
   phục hồi COMMITTING/RECONCILING. Không tự dismiss mọi candidate khi unmount.
6. Sau APPLIED/ALREADY_RECORDED hoặc lỗi chưa rõ kết quả, refresh GET /trips/:id/attendance và
   GET /trips/:id/operational-state. Endpoint roster/current state là nguồn hiển thị lên/xuống hiện tại.

## 7. Lỗi và nghiệp vụ cần giữ

| Code / status | Xử lý Mobile |
| --- | --- |
| 401 | Xử lý JWT theo api-client hiện có, dừng polling nếu logout |
| 403 | Sai vai trò/phân công; dừng actions, refresh quyền, không tiếp tục poll bằng account cũ |
| 404 | Trip/scan không thuộc route; reload, không tìm scan ở Trip khác |
| CANDIDATE_EXPIRED /410 | Quẹt lại hoặc manual |
| STALE_CONTEXT / STALE_STUDENT | Chuyến/phase/assignment hoặc thẻ/hồ sơ đã đổi, reload rồi quẹt lại |
| UNKNOWN_CARD | Thẻ chưa có liên kết hiện tại; không nhập UID/Student tay để bỏ qua |
| OUTSIDE_ROSTER / STUDENT_INACTIVE | Không được xác nhận; không thêm Student vào roster từ Mobile |
| ABSENCE_REQUIRES_REVIEW | Đã ghi vắng, phụ xe xử lý bằng luồng cũ; không tự chuyển PRESENT |
| NOT_BOARDED | Không xác nhận xuống khi chưa PRESENT |
| MANUAL_OVERRIDE | Đã có RFID receipt rồi được sửa thủ công; tiếp tục xử lý manual, không reset receipt |
| CONFIRMATION_PENDING /202 | Giữ scanId, kiểm tra cùng confirm; không bù manual tự động |
| 503/500/network timeout | Kết quả có thể chưa rõ; refresh queue/roster và giữ pending nếu có, không báo thất bại chắc chắn |

Một số lỗi context/auth xảy ra trước khi có candidate nên không xuất hiện trong queue; không hứa
Mobile hiển thị được mọi lỗi Serial của ESP. Capture hợp lệ nhưng thẻ/roster sai được lưu REJECTED
không kèm Student ngoài quyền. UI chỉ ánh xạ dữ liệu API, không suy kết quả từ tiếng beep/Serial.

## 8. Dữ liệu và audit cần biết

PG TripAttendance có rfidBoardingScanId/rfidAlightingScanId nullable unique UUID. RFID confirm ghi
trạng thái/time + receipt cùng transaction, dùng chung boarding/alighting business helper với manual.
Receipt không xóa/ghi đè khi manual undo, vì vậy retry lịch sử không khôi phục trạng thái bị sửa.
Mỗi phase chỉ một lần apply RFID trên roster entry; sau manual override dùng manual tiếp.
Mongo giữ candidate/history, confirmedById là phụ xe thật đã confirm; không giả device thành User.
Không expose receipts/internal token trong Parent payload hoặc tự đổi loại scan RAW/ENROLLMENT.

## 9. Chuẩn bị runtime và bàn giao

- Backend cần IOT_ENABLED=true, PostgreSQL/Mongo IoT và các khóa IoT đã cấu hình ở api/.env.
  Không sao chép khóa device/root vào Mobile. Local đã apply migration20261106020000_rfid_attendance_receipts;
  môi trường khác cần owner Backend deploy migration này trước tích hợp, không dùng seed thay migration.
- Firmware source/bundle1.4.0-poc đã được PO duyệt nạp cho ESP32_C82E188BAB44 trong lượt test local
  ở mục11. Thiết bị khác vẫn cần được cấp scope/nạp riêng; firmware1.3 cũ chỉ hỗ trợ enrollment/raw.
- Sau flash, handshake đầu có thể báo version mới rồi lần refresh kế tiếp mới cấp ATTENDANCE.
- Cần xe/ESP gắn hợp lệ, Trip ngày hiện tại, roster/Student có UID, phụ xe đúng phân công, điều kiện
  hợp đồng/ngày chạy hợp lệ và Ready/Start theo phase. Không seed fake data để vượt các điều kiện.
- API acceptance entrypoint chỉ IoT/Students/Vehicles và các RFID endpoints, không toàn bộ trips routes;
  tích hợp Mobile đầy đủ phải chạy Backend AppModule theo workflow dự án, kiểm soát cron/data policy.
- Không tự sửa mobile dependencies/package manager hoặc cài thư viện mới. Đọc AGENTS và conventions
  Mobile trước code; wireframe/contract ở lean plan L và tài liệu này, điều chỉnh UI lớn phải duyệt lại.

## 10. Checklist cho developer Mobile

- [ ] Đúng JWT phụ xe/phân công; account/Trip/foreground isolation và stale callbacks.
- [ ] reader status, queue/history/pagination, Student nullable, phase đúng hai chiều.
- [ ] Confirm/dismiss đúng scanId, empty body; 202 không success toast; pending phục hồi khi quay lại.
- [ ] Duplicate tap/current=false/historical/manual override không ghi lại hoặc báo sai trạng thái.
- [ ] ABSENT/khác roster/thẻ hủy/đổi/Student disabled/mất Wi-Fi/context cũ hiển thị đúng.
- [ ] Refresh roster/operational state sau mutation, manual/QR/Parent/Driver không hồi quy.
- [ ] Test trên màn hình nhỏ và máy thật, không auto pop modal gián đoạn phụ xe.
- [ ] Chỉ UAT real Trip/Student/card sau PO cấp số lượt scan/confirm và transitions/restore được phép;
      chưa có data scope ghi NOT_VERIFIED/BLOCKED_BY_TEST_DATA_POLICY, không seed/rollback ngầm.

## 11. Bản tích hợp Mobile local để PO test — 06/11/2026

PO đã đổi phạm vi, cho phép sửa Mobile tạm và npm ci theo lockfile. Các file local:

- services/rfid-attendance.ts: types và list/confirm/dismiss, tái sử dụng mobileApiClient.request/JWT.
- utils/rfid-attendance.ts: phase/expiry/response/unknown-result rules cho UI.
- hooks/use-rfid-attendance.ts: foreground polling, scope/callback isolation, pagination, pending/timeout.
- components/rfid-attendance-panel.tsx: reader status, candidate cố định, xác nhận/bỏ qua, lịch sử/đối soát.
- app/trip/[id].tsx: chỉ import và gắn panel ở hai tab điểm danh, BUS_ATTENDANT khi mở bottom sheet.
- scripts/rfid-attendance.test.ts: kiểm tra protocol UI thuần, không DB/HTTP/dữ liệu Student giả.

Không sửa api-client chung, manual/QR, Parent/Driver, package.json/lockfile hay quy tắc Backend.
Panel dùng phase server; tab đang xem chỉ lọc hiển thị, không gửi phase tùy ý lên API. Reader PENDING
không có nghĩa lỗi Mobile; cần ESP đã nhận context đúng chuyến và giai đoạn như phần runtime trên.

Expo Go LAN: exp://192.168.2.8:8081, điện thoại cùng Wi-Fi. Backend đầy đủ vẫn ở3000, Web5173.
Mở chuyến bằng BUS_ATTENDANT đúng phân công -> mở rộng bảng dưới -> tab Điểm danh/Lên xe hoặc
Xuống xe -> vùng Thẻ RFID. User tự thực hiện thao tác nghiệm thu thật; agent không seed/confirm hộ.

Thay đổi Mobile giữ **unstaged/local-only**. Không thêm mobile/ vào gitignore hoặc assume-unchanged,
không xóa code local để loại khỏi push. Khi PO yêu cầu commit/push sau này, stage rõ paths ngoài
mobile/ và kiểm tra git diff --cached --name-only trước commit. Hiện chưa commit/push bất kỳ phần nào.
Bản patch Mobile để giữ lại nằm trong E:/ChatGPT/road-to-school-mobile-rfid-local-2026-11-06/.

Firmware local đã nạp1.4 app-only trên COM6, hash verified, giữ NVS; INFO xác nhận Wi-Fi connected,
attendance=true và runtimeConfigReady=true. Đã đóng USB sau kiểm tra; không tự quẹt/confirm Student thật.
## 12. Nút RFID theo giao diện Mobile hiện tại — 09/11/2026

PO duyệt giữ phân quyền: BUS_ATTENDANT xác nhận, DRIVER chỉ xem tiến độ qua roster hiện có.
Không thay BE/DB hoặc cấp Driver quyền gọi API RFID. Phần gắn cũ bị thay khi nhận Mobile từ main,
nay khôi phục bằng components/rfid-attendance-entry.tsx trong hai danh sách Lên xe/Xuống xe.

- Giữ tab, thanh tiến độ, QR, tìm kiếm, roster và bottom sheet hiện tại.
- Nút Điểm danh RFID dùng theme hiện có, minHeight48, bấm mới mở panel và bắt đầu foreground polling.
- Panel vẫn dùng queue/history, chọn thẻ cụ thể, confirm/dismiss và xử lý pending/unknown đã có.
- Không cho đóng panel khi đang submit/pending/unknown; chỉ kiểm tra lại cùng scanId, không báo thành công từ202.
- Identity key theo user/role/Trip/phase, chỉ mount cho phụ xe trong tab mở, Trip chưa kết thúc và không lỗi quyền.
- Cùng coordinator mutate của manual/QR, refresh roster sau xử lý; Driver đọc kết quả từ refresh chuyến hiện có.
- Không cài dependency mới; Mobile tiếp tục local/unstaged, không tự commit/push.

Kiểm chứng: Mobile tsc đạt,3 pure RFID state tests đạt; Android Metro bundle200 có nút RFID và endpoint.
Chưa nghiệm thu thao tác trên điện thoại/RC522/thẻ thật. ESP đang OFFLINE theo truy vấn đọc ngày09/11.
Có sẵn chuyến demo hôm nay TD01-IOT61106 và TV01-IOT61106, mỗi chuyến một học sinh, đúng phụ xe demo;
không tự tạo thêm fixture. Để thử nhanh chiều về: phụ xe Ready → mở Điểm danh/Lên xe → Điểm danh RFID →
ESP online/reader READY → quẹt và xác nhận → Driver Start → phụ xe Xuống xe, quẹt và xác nhận.
Địa chỉ Expo tại lần chạy này exp://192.168.101.5:8081, cần cùng mạng; IP có thể đổi khi đổi Wi-Fi.
## 13. Phát hành phần tích hợp Mobile RFID

PO đã cho phép đưa Mobile RFID lên cùng nhánh `phuctd/web/schooladminUI`; chỉ dẫn local-only trong các mốc
trước là lịch sử và không còn giới hạn đợt phát hành này. Giữ nguyên quyền: phụ xe xác nhận, tài xế xem tiến độ.

Entry thu gọn dùng theme hiện có; panel nằm trong vùng cuộn của Lên xe/Xuống xe, không đổi bản đồ,
header, QR hay bottom sheet. Các hàng nút được wrap; nút giới hạn chiều ngang100%, nhãn co/xuống dòng
cho màn hình hẹp hoặc cỡ chữ lớn; trạng thái chọn dùng cùng navigationHighlight của theme.
Không thêm dependency hoặc framework kiểm thử vào app. Env và output export không đưa lên Git.

Typecheck,3 kiểm tra trạng thái RFID và export Android đã đạt. Đây là kiểm tra source/bundle;
chưa thay thế nghiệm thu lượt quẹt thật hoặc kiểm tra hiển thị trên mọi thiết bị.
