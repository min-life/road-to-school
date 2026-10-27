# ROADTOSCHOOL V2.0 — IMPLEMENT SỰ CỐ VẬN HÀNH

## 1. Chỉ thị và nguồn phê duyệt

Antigravity: **IMPLEMENTATION**, không chỉ audit/planning. Product Owner đã trao đổi thiết kế, trả lời các lựa chọn và yêu cầu “tạo prompt để antigravity triển khai”. Triển khai trọn phạm vi DB/API/Web/Mobile theo tài liệu này và `docs/ai-review/operational-incidents-business-architecture-plan.md`, bao gồm các cập nhật lịch sử cá nhân và duy nhất điểm mở báo thủ công tại Trip Detail. Không xin duyệt lại cùng wireframe, bảng/fields hoặc logic đã mô tả; không dừng sau từng phase để xin lại quyền code.

Được triển khai đúng một bảng TripIncident, enum/index/relations tối thiểu đã thiết kế, migration additive DDL, Prisma generation, API contracts và UI wireframes trong scope. Chỉ apply migration vào môi trường local development đã xác minh đúng mục tiêu, sau kiểm tra drift và SQL; nếu không xác minh được môi trường hoặc cần data migration thì dừng riêng bước apply, tiếp tục các việc an toàn và báo giới hạn. Không reset DB, migrate dev reset, backfill hay tự chuyển dữ liệu nghiệp vụ.

Chỉ thị này không cấp quyền tạo dữ liệu UAT, mutation thử nghiệm, gửi email/SMS/OTP hoặc gọi VietMap tính phí để test. Không thêm dependency/SDK, Redis, queue, WebSocket hay background tracking. Không commit/push/reset/discard. Codex chỉ bàn giao prompt, Antigravity thực hiện implementation.

## 2. Chuẩn bị và kiểm soát phạm vi

Đọc AGENTS.md và tài liệu mandatory theo thứ tự. Đọc bản plan incident và phần báo nghỉ/navigation/Trip snapshot liên quan. Tài liệu cũ ghi DISCUSSION/chưa triển khai là trạng thái ở mốc viết plan; yêu cầu thực thi mới nhất này thay giới hạn đó trong đúng scope, không phải quyền viết test data.

Kiểm tra git status, lưu baseline riêng theo task (kể cả untracked). Không lấy HEAD làm toàn bộ baseline nếu còn công việc cũ. Rà source hiện tại thay vì mặc định các nhận định cũ còn đúng. Không đọc/ghi secrets vào báo cáo/diff. Không khởi động dev server trùng port.

## 3. Nghiệp vụ đã chốt

Chỉ4loại version đầu:

| Type | Nguồn | Người xử lý | Kết quả |
|---|---|---|---|
| ATTENDANT_MISSING | Driver assigned báo Giáo viên chưa đến | School Admin đúng trường | Người cũ đã đến / thay Giáo viên / hủy Trip |
| DRIVER_MISSING | Giáo viên assigned báo Driver chưa đến | System Admin | Người cũ đã đến / thay Driver / hủy Trip |
| OFF_ROUTE | Server từ vị trí xe | Giáo viên assigned xác nhận | Lý do bắt buộc |
| LATE_STOP | Server từ ETA đón/trả | Giáo viên assigned xác nhận | Lý do bắt buộc |

Không thêm loại generic, SOS, ảnh/video, OTP, thông báo qua stop hoặc workflow admin duyệt lý do.

### Báo thiếu nhân sự

- Chỉ Trip thật SCHEDULED chưa actualStartTime, đúng người được phân công. Driver chỉ ATTENDANT_MISSING; Giáo viên chỉ DRIVER_MISSING. Parent/Admin không báo thay.
- LIVE: chuyến chưa hết giờ gần nhất của người báo theo scheduledStartAt; `startAt - 15 phút <= serverNow <= endAt`. Không lấy Trip gần nhất theo khoảng cách GPS hoặc cho báo Trip xa hơn vì đã mở màn hình của Trip đó.
- TEST: bỏ rào thời gian, có thể báo từ Trip Detail của Trip thật được assigned phù hợp trạng thái; không miễn role/status/quyền, không sinh VIRTUAL Trip.
- Driver không báo Giáo viên chưa đến nếu đã Ready. Case người Ready rồi rời xe ngoài scope.
- Cùng Trip/type/nhân sự bị báo đang có hồ sơ mở thì trả hồ sơ hiện tại/idempotent hoặc409, không tạo trùng. expectedAssigneeId bảo vệ khi admin vừa đổi người.
- Giữ Trip.status SCHEDULED, computed assignmentStatus=WAITING_ASSIGNMENT nếu còn LeaveNotice hoặc incident thiếu nhân sự mở. Start bị chặn ở backend và UI. Không tạo TripStatus mới.
- Admin có thể ARRIVED để xác nhận người cũ đã đến, không bắt buộc thay. Không tự Ready/Start sau ARRIVED.
- REPLACED chỉ đổi người của Trip, không sửa default assignment của Route/Plan. Đổi Giáo viên reset Ready; đổi Driver giữ Ready. Không reset/giả điểm danh; giữ người đã thao tác trong lịch sử attendance.
- Candidates tuân đúng role, account active, Giáo viên cùng trường, tiêu chí phân công và trùng lịch hiện có, cùng blocker liên quan. School Admin không đổi Driver; System Admin không dùng luồng incident để đổi Giáo viên.
- Không bố trí được, đúng admin của sự cố được hủy Trip SCHEDULED kèm lý do; hủy không khôi phục. Không auto cancel vì hết giờ.

### Guard Start và cửa sổ hoạt động

- LIVE: `serverNow > scheduledEndAt` thì từ chối Start dưới lock ngay trước mutation, dù UI/API cũ vẫn gửi được. TEST bỏ guard đồng hồ này, giữ điều kiện Start hiện có khác.
- Đồng bộ capabilities/canStart/disabledReason ở API operation và mọi UI dùng nó; không chỉ disable nút.
- Thiếu lịch datetime ở LIVE thì không đoán/so HH:mm; trả thiếu dữ liệu và báo legacy cần xử lý, không tự backfill.
- Không tạo sự cố xuất phát trễ. Trip IN_PROGRESS vẫn được theo dõi sau giờ kết thúc dự kiến. Không sao chép filter getNextTrip cũ làm mất Trip đang chạy quá giờ.

## 4. Sự cố tự động — tạo ở server, không phụ thuộc người xem

### OFF_ROUTE

- Baseline là planned polyline trong **routeSnapshot của Trip**. Không lấy Route đang đổi, không thay bằng geometry VietMap reroute.
- Distance từ điểm GPS tới đoạn polyline, không nearest vertex. Lệch **trên100m liên tục30giây** bằng chuỗi mẫu hợp lệ, không phải một điểm nhảy.
- Navigation reroute vẫn dùng ngưỡng riêng hiện có (source từng là40m/3s), không thay hoặc vô hiệu reroute vì có incident. Reroute hợp lệ có thể xa planned line: incident chỉ ghi cần giải thích, không kết luận Driver sai phạm.

### LATE_STOP

- Theo dõi **điểm PICKUP/DROPOFF tiếp theo còn cần phục vụ**, không tất cả tương lai cùng lúc. Kết hợp navigation target/progress với attendance/alighting; không tự đánh dấu phục vụ hoặc suy từ ADVANCE rằng đã điểm danh.
- Baseline scheduledStopArrivalAt lấy từ snapshot+serviceDate/múi giờ VN, không sửa baseline theo ETA mới.
- `estimatedArrivalAt - scheduledStopArrivalAt > 5 phút` liên tục30giây. Cùng target và dữ liệu liên tục; target/timing reference đổi không dùng streak cũ sai ngữ cảnh.
- ETA cần thời gian còn lại hợp lệ theo geometry/progress/chặng và service/waiting còn phải qua; không chia đều tổng duration theo số stops hoặc dùng vận tốc giả. Xe đứng vẫn có thể trễ. Không cộng service của chính target trước arrival.
- Source hiện có thể chỉ có current segment tổng duration và client guidance; **phải bổ sung phần server ETA còn thiếu**, không coi engine đã có đầy đủ. Reuse timing provider/solver đã triển khai, có validation. Nếu thiếu dữ liệu để ước tính đáng tin cậy thì ngừng đánh giá, trả trạng thái không đủ dữ liệu, không tạo LATE_STOP giả hoặc báo DONE cho detector stub.

### Chất lượng dữ liệu, TEST và continuity

- Vị trí từ Driver/Session/run hợp lệ đã được backend chấp nhận. TEST dùng vị trí marker do Auto/Joystick publish; không cần GPS thiết bị Giáo viên. Không biến planned line thành GPS thật.
- Tôn trọng freshness/accuracy/sequence cadence5s hiện có. Chuỗi30s thông thường cần ít nhất7mẫu cách5s; dùng timestamps và khoảng phủ thực, không chỉ đếm7samples hoặc mỗi lần poll cùng1point.
- Gap, sequence discontinuity, run change hoặc sample không hợp lệ reset streak; không catch-up cảnh báo cho thời gian app không thu GPS. Thiếu snapshot/polyline/timing hợp lệ không fallback âm thầm để coi detector hoạt động.
- **Mỗi Trip tối đa1 OFF_ROUTE và1 LATE_STOP**, không1lần mỗi stop. Dedupe bền vững DB qua concurrent requests, retry, process restart, TEST, reroute, resume và reopen. Đã CONFIRMED hoặc CLOSED vẫn không tạo mới cùng type.
- Hai auto types độc lập: vẫn có thể tồn tại cả hai. Unique key không làm incident đã closed biến mất hoặc bị ghi đè để tái tạo.

### Tích hợp nhẹ

- Đánh giá sau persist location thành công, **ngoài transaction telemetry và TripOperation**. Lỗi detector không rollback GPS hoặc chặn tác vụ vận hành. Tái kiểm Trip còn IN_PROGRESS dưới lock trước insert.
- Không dựa vào GET/poll/Teacher app để tạo sự cố. GET không ghi dữ liệu hoặc đánh đã xem. Khi Driver foreground vẫn publish nhưng Teacher đóng màn hình, server vẫn ghi sự cố; app Teacher mở lại nhận pending.
- Đọc cửa sổ location nhỏ có giới hạn; cadence5–10s phù hợp, không query full history/decode full route mỗi viewer mỗi tick. Cache derived data bounded nếu cần, DB vẫn authoritative cho incident/dedupe.
- Không gọi provider mỗi GPS tick/observer refresh. Reuse route result; chỉ bổ sung request phục vụ ETA khi cần với cooldown, timeout, budget, invalidation rõ. Network ở ngoài transaction. Không mặc định có quyền agent test API trả phí.
- Có thể mở rộng nhánh server-owned trong **Trip.navigationState JSON hiện có** để lưu current-leg geometry/timing/target/version cần cho ETA, chỉ khi route thay; parser/version/resume phải tương thích. Không duplicate raw lat/lng/history/counter hoặc lưu provider response khổng lồ. Không thêm cột/bảng cache timer.

## 5. Database được triển khai trong phạm vi

Đúng một model `TripIncident` map `trip_incidents`, tận dụng bảng hiện có:

`id`, `tripId`, `type`, `status`, `reportedById?`, `description?`, `context? Json`, `dedupeKey`, `processedById?`, `processedAt?`, `resolution? Json`, `createdAt`, `updatedAt`.

- Types4loại trên. Statuses WAITING_ASSIGNMENT / WAITING_CONFIRMATION / RESOLVED / CONFIRMED / CLOSED; validate transition theo type.
- reportedById null khi server tạo. processedById là admin xử lý hoặc Giáo viên xác nhận, không tự lấy người assigned để giả đã xử lý.
- context giữ bằng chứng gọn: nhân sự bị báo, sample sequence/time/reference; hoặc target/plannedETA/estimatedETA/delay. Không copy roster/history. Không cần schoolId lặp vì join Trip được.
- resolution action ARRIVED/REPLACED/TRIP_CANCELLED/ACKNOWLEDGED/CLOSED_WITHOUT_CONFIRMATION, lý do, old/new assignee nếu liên quan. Validate JSON shape/version, giới hạn nội dung.
- Unique dedupeKey: auto server namespace TripId+type; manual request idempotency có namespace Trip/actor/type. Under-lock query chặn nhiều key tạo cùng báo thiếu người mở.
- FK Trip onDelete Restrict. Nullable User relations giữ audit phù hợp convention, không cascade xóa incident do xóa tài khoản. Inverse relations không tạo bảng mới.
- Indexes tối thiểu: unique(dedupeKey), (tripId,createdAt), (status,createdAt); PK id mặc định. Không thêm hàng loạt index dự phòng; rà nhu cầu thật nếu khác.
- Không bảng category/evidence/history/queue mới, không nhét Incident vào LeaveNotice hoặc OTP.

Migration additive DDL only, Prisma validate/generate; trước apply xác minh đúng localdev/drift/SQL không phá dữ liệu. Không data backfill/seed hoặc tự tạo incident UAT trong DB. Sau apply kiểm migration status/schema drift và query read-only phù hợp; nếu chưa apply, báo đúng trạng thái, không giả đã có bảng trên DB.

## 6. API contracts và quyền

Prefix `/api/v1`, giữ envelope/JWT/Session hiện có; DTO nested validation đầy đủ, không `any` để lách whitelist. Có thể điều chỉnh cách chia file nhưng không bỏ chức năng:

| Method/path | Nội dung |
|---|---|
| GET /trips/:id/incident-options | Loại được báo, canReport/disabledReason, serverNow/reportAvailableAt; Trip đang xem |
| GET /incidents/mine | Lịch sử cá nhân staff, pagination/type/status/date |
| GET /incidents | Admin list có school/type/status/date/pagination theo scope |
| GET /trips/:id/incidents | Tab chỉ xem theo Trip, gồm pending và counts |
| GET /incidents/:id | Chi tiết scoped/role projection, không leak bằng ID |
| POST /trips/:id/incidents | Chỉ2loại thiếu người: type, description?, idempotencyKey, expectedAssigneeId |
| GET /incidents/:id/replacement-candidates | Đúng admin, danh sách đủ tiêu chí |
| POST /incidents/:id/resolve | ARRIVED/REPLACED, replacementUserId khi cần, expectedStatus/expectedAssigneeId |
| POST /incidents/:id/cancel-trip | reason bắt buộc, CAS status/assignment |
| POST /incidents/:id/confirm | Chỉ assigned Giáo viên, reason bắt buộc trim/bounded, expectedStatus |

- POST create không nhận auto types, authority từ client hoặc Trip/status tùy ý. Server kiểm mọi điều kiện lại dưới lock dù form đã mở/deep link/request trực tiếp. Không dùng referrer hoặc thêm navigation token để chứng minh đã vào màn hình.
- `mine` lọc server theo **reportedById=currentUser OR (auto type AND CONFIRMED AND processedById=currentUser)**. Không lọc theo Trip currently assigned. Không nhận actor tùy ý từ query, không duplicate OR.
- Auto incident đang chờ xác nhận **chưa xuất hiện trong mine**, nhưng vẫn có popup/banner/tab Trip. Chỉ đưa vào mine sau confirm commit thành công.
- Người bị thay vẫn có lịch sử cá nhân tối giản của báo/xác nhận của mình; quyền xem Trip toàn bộ và mutation không được phục hồi bởi lịch sử. Detail API phân biệt self-history projection với full Trip access.
- Parent chỉ thấy **loại, thời điểm, trạng thái**, không description/reason/context/resolution/internal identities/raw GPS hoặc thông tin học sinh khác. Phải lọc ở backend, không chỉ giấu JSX. Parent có quyền Trip qua linked child/roster phù hợp; không có mine/create/confirm.
- Hai admin xem theo phạm vi hiện có; School Admin chỉ trường mình. Giáo viên không xác nhận thay sự cố của Trip khác hoặc sau khi mất assignment. Admin không xác nhận auto thay Giáo viên trong version đầu.
- Swagger đầy đủ paths/query/request/response/nullable/errors400/401/403/404/409/429/500 phù hợp; kiểm `/api/docs` và `/api/docs-json` trên server hiện có. 409 gồm stale/window/terminal/duplicate theo convention, capabilities dùng cùng checker như command.

## 7. Đồng bộ báo nghỉ, assignment và transaction

Reuse validators/candidate rules, không gọi HTTP nội bộ hoặc tạo LeaveNotice giả. Không refactor cả hệ thống. Tổ chức module/helper tránh vòng phụ thuộc Trips↔Incidents↔Leave; public permissions/extracted helpers chỉ tối thiểu cần thiết.

- Mọi đường Start/operational state/schedule/detail dùng đúng leave+incident blockers, không UI nói ASSIGNED trong khi Start bị block hoặc ngược lại.
- Endpoint assignment cũ không được bypass sự cố đang mở. Hoặc chặn chuyển sang xử lý incident, hoặc đóng blocker đúng actor/action atomically; không silent resolve.
- ARRIVED không xóa/bypass báo nghỉ hợp lệ của cùng người. Xử lý tại đúng workflow; nếu thay người từ incident và có staff LeaveNotice cùng mục tiêu cần đồng bộ terminal state trong cùng transaction, không xóa báo nghỉ hoặc giả creator đã hủy.
- Lock order nhất quán **Trip → Incident/Leave → assignment updates**, kiểm trạng thái/assignee sau lock. Race report/Start chỉ một kết quả hợp lệ: report trước chặn Start, Start trước từ chối prestart report.
- Assign/resolve/cancel/confirm có CAS và idempotency đúng payload, không ghi đè kết quả xử lý khác. Candidate query không thay revalidation lúc commit.
- Hủy Trip từ incident đóng các incident và staff leave liên quan phù hợp, giữ dữ liệu/attendance/snapshot/history. Complete/cancel paths hiện có cũng phải ngừng detection/đóng pending phù hợp, không sửa status IN_PROGRESS vì đọc stale SCHEDULED.
- Pending auto không chặn Complete/Cancel. Khi terminal, pending auto CLOSED với resolution CLOSED_WITHOUT_CONFIRMATION, không tự CONFIRMED hoặc bịa lý do/người xác nhận. Auto đã CONFIRMED giữ kết quả/audit để mine không biến mất.
- Không auto Attendance/Alighting/Arrival/Start/Complete, không sửa RoutePlan/roster/stop order để xử lý incident.

## 8. UI được triển khai theo wireframes đã bàn

Minimal UI Copy, brand tokens hiện có, reuse components/dropdown/modal/BottomSheet. Không thêm thư viện.

### Mobile Driver/Giáo viên

Trang chủ thêm icon **Sự cố** vào section Tiện ích, icon trên tên dưới, căn giữa như Báo nghỉ. Parent không có tiện ích này.

```text
← Sự cố
[Trạng thái ▾] [Loại ▾]
Giáo viên chưa đến                  Chờ xử lý
Tuyến Đi 01 · Ngày · Thời điểm
Lệch tuyến                         Đã xác nhận
Tuyến Đi 01 · Ngày · Thời điểm
```

**Tiện ích chỉ lịch sử cá nhân do mình báo/đã xác nhận. KHÔNG nút+, KHÔNG tạo mới trong history/detail/empty/error state.** Empty: “Chưa có sự cố”. Có loading/error/retry đọc dữ liệu, không swallow error thành empty.

### Trip Detail — duy nhất điểm báo thủ công

```text
[←]                             [Báo sự cố ⚠]
                  BẢN ĐỒ
Thông tin | Điểm dừng | Điểm danh | Sự cố (2)
```

- Nút top-right chỉ staff assigned đủ điều kiện báo; không đè navigation controls/map actions hoặc nút vận hành. Parent không thấy nút, không thêm nút trên Trip card.
- Mở form/modal Trip gắn cố định, type theo role, ghi chú tùy chọn, nút Gửi; không chọn Trip khác. UI chỉ có entry tại Trip Detail đủ điều kiện; route form nếu có direct link vẫn fetch/check lại.
- Tab Sự cố **chỉ xem** cho Driver/Giáo viên/Parent theo quyền, bao gồm pending. Không confirm/reassign/create trong tab. Parent projection như API, không giấu lý do phía client là đủ.
- Gộp poll với Trip refresh hiện có, không thêm nhiều loop/provider. Stop khi background/unfocus; retry có giới hạn/backoff, quyền bị thu hồi thì clear dữ liệu.

### Popup Giáo viên

```text
Lệch tuyến / Đón trả chậm
Tên chuyến · Thời điểm
Lý do * [                                 ]
[Để sau]                        [Xác nhận]
```

Auto incident mới mở popup trong Trip Detail Giáo viên; nếu2loại cùng lúc thì queue, không chồng modal. Driver/Parent không popup. Reason bắt buộc, không tự chọn lý do.

Đã chốt **được để sau**, giữ same incident pending và banner “Có sự cố cần xác nhận” **ngoài tab view** để mở lại popup, không khóa điểm danh. Không tự mở lại cùng popup mỗi5s poll sau khi để sau; giữ dismissed/seen UI state theo incident và screen lifecycle, server pending vẫn authoritative. Reopen có thể banner cùng hồ sơ, không tạo incident mới. Failure/timeout confirm không tự đánh confirmed; retry cùng command phải an toàn. Sau confirm cập nhật tab/mine/counters không cần refresh tay.

### Web Admin

Thêm menu **Sự cố** cho cả hai admin. Table/filter dạng dropdown đồng bộ các tab hiện có, pagination/loading/empty/error đúng chuẩn. System filter trường nếu cần; School scope server cố định.

```text
Sự cố
[Trường ▾] [Loại ▾] [Trạng thái ▾] [Ngày]
Chuyến | Loại | Thời điểm | Người báo | Trạng thái | [Xử lý]
```

Modal xử lý đúng role:

```text
Xử lý nhân sự chưa đến
Chuyến · Ngày · Nhân sự hiện tại
(•) Người cũ đã đến
( ) Phân công thay thế [Người phù hợp ▾]
[Hủy chuyến]                     [Xác nhận xử lý]
```

Hủy có bước xác nhận/lý do riêng, không default destructive. Không xử lý bắt buộc ở Trip Detail. Nếu có view incident trong Web Trip Detail thì chỉ bổ sung tối thiểu cần thiết, không redesign dashboard.

## 9. File/module scope dự kiến

- Prisma schema + một migration incident, generation chỉ outputs chuẩn không nhét generated artifacts vào diff.
- Backend module incidents: controllers/service/DTOs/pure detector/ETA helpers và tests liên quan; đăng ký module. Trips operation/assignment/navigation publish/route context; leave checker/cancel integration tối thiểu; không sửa thuật toán tối ưu tuyến insertion vừa fix.
- Mobile incidents history/detail/report và popup/banner components, typed API client, Home utility, Trip Detail/refresh integration. Không route tạo mới từ tiện ích.
- Web admin incidents page/table/resolve modal, nav config/types/API client.
- Plan/current state addendum/review/diff cần thiết. Mỗi file sửa phải có lý do scope; không clean/refactor phần khác.

## 10. Verification tập trung — agent tự làm phần an toàn

Trước test, đọc suite/setup/scripts bảo đảm không DB/network/OTP/provider side effects. Không seed/insert records, không fixtures giả để báo feature hoạt động thật, không temp records+rollback. Pure/in-memory tests dùng logic production và assert tác động/điều kiện có ý nghĩa; không test chỉ tìm string hoặc sao lại thuật toán.

Các nhóm bắt buộc:
1. Manual role/type/school/assignee/nearest15m/LIVE-TEST/terminal; Ready guard; idempotency và window revalidate sau mở form.
2. Shared leave+incident blockers; ARRIVED/REPLACED/resetReady; candidate conflict; report-vs-Start, resolve-vs-cancel, duplicate confirm theo in-memory interleaving an toàn. Không gọi đó là race test PostgreSQL thật.
3. Start deadline LIVE chặn/TEST không chặn và capabilities đồng bộ, giữ IN_PROGRESS quá giờ.
4. Dedupe1auto type/Trip qua restart/retry/reroute;100m30s,5m30s, gaps/run/stale/target changes reset; không dùng old sample nhiều lần; absence of Teacher UI không tắt server detector.
5. ETA theo timing/progress/service đúng target/snapshot; thiếu provider/timing thì không tạo false event; Parent không leak internal reason/context ở list/detail/error.
6. Mine đúng actor OR, không đồng nghiệp/pending auto, giữ self-history sau reassignment không cấp Trip access; không create buttons/deeplink bypass; popup defer không spam/reconfirm.
7. Typecheck API/Web/Mobile với `npx --no-install tsc --noEmit --incremental false`, lint files liên quan, build phù hợp và tests an toàn. Không install tool mới bằng npx nếu thiếu.
8. Prisma validate/generate; nếu local migration đã apply thì verify status/drift/read-only shape. SwaggerUI/JSON kiểm đầy đủ paths/security/response errors, unauthenticated safe GET nếu phù hợp. Không POST/PATCH/DELETE dữ liệu hiện có để test.

Không coi unit/tsc PASS là sensor/GPS/ETA provider/device acceptance. Runtime có ghi Incident/assignment/cancel/confirm hoặc dùng paid routing chưa được cấp phải NOT_VERIFIED/BLOCKED_BY_TEST_DATA_POLICY đúng nguyên nhân, nêu dữ liệu/quyền/quota tối thiểu cần nếu thật sự chặn. Hoàn tất phần triển khai/kiểm chứng an toàn trước báo cáo; không dừng cả task vì chưa được test UAT.

Không giao PO checklist hàng chục tình huống. Gợi ý UAT gọn theo3luồng sau khi có scope: thiếu nhân sự→admin xử lý; auto alert→Giáo viên để sau/xác nhận; history staff/tab Parent đúng dữ liệu/quyền.

## 11. Điều kiện bàn giao và STOP

Không còn stub/TODO coi như detector/ETA đã xong; không chỉ thêm UI trong khi Backend không enforce. Hoàn thành đúngscope, nếu kỹ thuật chưa kiểm chứng thì nêu chính xác giới hạn, không tuyên bố production-ready bằng typecheck.

Archive LATEST.md/.diff trước ghi đè, cập nhật plan trạng thái thực tế và CURRENT_STATE addendum nếu thay đổi kiến trúc. LATEST đủ13mục: các quyết định, files/schema/migration, endpoints/Swagger, wireframe, evidence đã chạy, runtime chưa được chạy, concurrency/performance limits. LATEST.diff task-only so baseline, không secrets/generated/old work. Báo rõ số calls/cadence detector/ETA và persistence có gì.

Final tiếng Việt ngắn: kết quả, phạm vi đã sửa, verification thật, hạn chế và đúng1bước tiếp theo. **STOP AFTER TASK**, không tự mở phase/test ghi dữ liệu mới, không commit/push.
