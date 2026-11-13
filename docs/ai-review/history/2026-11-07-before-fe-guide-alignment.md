# AI Review — Rà soát lại API, plan 3.1–3.18 và hướng dẫn FE, 07/11/2026

## 1. Task Information

- Task Name — Rà soát lại sau đợt sửa R01–R06.
- Date — 07/11/2026, Asia/Ho_Chi_Minh.
- Project Scope — API và Documentation, đọc Web/Mobile để đối chiếu điểm tích hợp.
- Task Type — Review.
- Status — COMPLETED đối với lượt rà soát. Còn 7 nhóm sai lệch được xác định bằng source. Nghiệm thu runtime là NOT_VERIFIED.

## 2. Original Request

PO yêu cầu kiểm tra lại API với plan 3.1–3.18 và tài liệu hướng dẫn FE sau khi các phần chưa khớp đã được sửa.

## 3. Approved Scope

Đối chiếu quyết định PO trong hội thoại, master plan phần Y/Z/AA, hướng dẫn FE, DTO/controller/service và schema thực tế. Kiểm tra an toàn bằng typecheck, migration status và GET OpenAPI. Chỉ ghi báo cáo và nhật ký kết quả rà soát.

User vẫn cấm chạy script test. Mutation/UAT cần dữ liệu và quyền thực hiện phù hợp. Workflow thay phương án cùng nhóm được PO tách để chốt riêng.

## 4. Analysis & Decisions

API và tài liệu FE chưa khớp hoàn toàn. R03 và logic bổ sung R06 đã hiện diện. Start đã kiểm phụ xe đang IN_PROGRESS. Home đã dùng effectiveTripTiming. Tuy nhiên R01 còn thiếu ở chi tiết/lịch và áp sai phạm vi role ở Staff Home, operational-state chưa phản ánh nguồn lực bận, FE guide còn sai URL và response OTP. Rà soát tiếp phát hiện R07–R09 về roster đã loại và giờ lịch phụ xe.

Các kết luận dưới đây dựa trên đọc source. Chưa tái hiện nghiệp vụ bằng mutation nên không gắn PASS cho luồng nghiệp vụ.

### Ma trận đối chiếu 3.1–3.18

| Mục | Đối chiếu source với nghiệp vụ được duyệt | Điểm còn mở |
|---|---|---|
| 3.1 | DTO/service tạo nhân sự yêu cầu email và phone. Luồng bàn giao có SENT/FAILED/CONSOLE, cấp lại mật khẩu giữ phiên. OTP nghiệp vụ tiêu thụ cùng transaction. | R05 về contract tài liệu OTP. |
| 3.2 | Có scheduled changes, hiệu lực theo ngày, lifecycle, lịch nghỉ/học bù và chốt hành chính. Home có tính giờ hiệu lực. | R09 về lịch phụ xe. UAT mốc ngày/cron còn mở. |
| 3.3 | Bãi bắt buộc cấu hình, lịch dời bãi, bán kính và kiểm giữ nguồn lực có logic tương ứng. | UAT dời bãi/bàn giao còn mở. |
| 3.4 | Thu hồi liên kết Parent có kiểm phạm vi trường, reason và parentLinkAudit. | UAT quyền và lịch sử còn mở. |
| 3.5 | Có membership hiệu lực, preview/confirm kiểm dữ liệu nguồn và lọc địa giới tùy chọn, độc lập eligibility. | UAT nguồn đổi/địa giới còn mở. |
| 3.6 | SCHOOL_ADMIN duyệt, firstServiceDate, kiểm khả dụng, đổi default giữ override có logic tương ứng. | UAT đồng thời và phân công legacy còn mở. |
| 3.7 | Generator/reopen dùng prepareTrip, audit, roster và timing theo F04-A. | R07/R08 liên quan roster giữ lịch sử sau loại trẻ. |
| 3.8 | Start đã kiểm tài xế/xe/phụ xe đang chạy chuyến khác. | R02 về flag đọc trạng thái. |
| 3.9 | Ready đã chặn ATTENDANT_MISSING chờ phân công. Có correction sau arrival, frozen timing theo F08-A. | R07/R08 về roster vận hành. |
| 3.10 | Start chiều về kiểm active roster, lý do ABSENT và ít nhất một PRESENT. Có cancel-all-absent. | R07 về flag Start/Complete và R08 về điểm danh bản ghi đã loại. |
| 3.11 | Chi tiết Parent có masking, bỏ điểm trẻ khác/bãi/polyline/audit. Home có tính giờ hiệu lực. | R04 sai URL Home trong hướng dẫn, R07 ở trạng thái roster. |
| 3.12 | Options/request OTP/confirm chặn Parent sau Ready cả hai chiều. Schedule và Parent Home đã sửa. | R01 còn sai canReportLeave ở chi tiết chuyến. |
| 3.13 | REPLACED không rút, thay thế/ARRIVED và khôi phục notice có logic tương ứng. | R01 còn lệch flag theo role giữa Staff Home và schedule. |
| 3.14 | Routing-preview, previewToken/fingerprint, snapshot và đồng bộ từ ngày mai có logic tương ứng. | R07/R08 với trẻ bị loại khỏi roster tương lai. |
| 3.15 | Chèn/disable đồng bộ roster, đánh excludedAt và giữ lịch sử. | R07/R08 vì các API đọc/ghi vận hành còn xử lý bản ghi đã loại. |
| 3.16 | Hủy có impact/fingerprint bắt buộc, giữ frozen/nguồn lực, đóng việc chờ. | Workflow thay plan cùng nhóm chưa triển khai theo quyết định tách phạm vi của PO. |
| 3.17 | Có vị trí fallback, GPS silence, late-running risk, close ba loại sự cố và scope thông báo. | UAT GPS/provider/cảnh báo còn mở. |
| 3.18 | Có ADMIN_FINALIZATION và REOPTIMIZATION, danh sách đích và audit chốt hành chính. | UAT count/notification/admin-finalization còn mở. |

### R01 — Flag báo nghỉ chưa thống nhất theo role và endpoint

**Mức độ P2.** `getTripDetail` tại `api/src/trips/trips.service.ts:1056` chỉ chặn sau Ready cho TO_PARKING. `getMobileTripDetail` tại dòng 1628 dùng lại kết quả này và không tính lại flag cho Parent. Vì vậy chiều TO_SCHOOL đã Ready nhưng còn SCHEDULED vẫn có thể trả canReportLeave=true, trong khi API báo nghỉ từ chối. Hướng dẫn FE mục 8 khẳng định false cả hai chiều.

Ở `getHomeTrip:1799`, điều kiện mới khóa báo nghỉ sau Ready cho mọi nhân sự. Driver chiều TO_SCHOOL vẫn được phép báo nghỉ theo `leave-notices.service.ts:326–333` và driver schedule tại `trips.service.ts:1285`. Mobile đang dùng flag Home để hiển thị thao tác tại `mobile/app/(tabs)/index.tsx:332`, nên Driver có thể mất thao tác hợp lệ ở Home.

Ngược lại, bus attendant schedule tại `trips.service.ts:1376` vẫn cho TO_SCHOOL sau Ready, còn API báo nghỉ chặn. Cần thống nhất policy theo role ở detail, Home, schedule và các cửa vào báo nghỉ, giữ phân biệt Driver với Parent/phụ xe theo quyết định đã chốt.

### R02 — Start đã chặn phụ xe bận nhưng operational-state chưa phản ánh

**Mức độ P2.** Mutation `startTrip` tại `trips.service.ts:2111–2137` đã tìm chuyến IN_PROGRESS khác theo cả tài xế, xe và phụ xe, trả 409 khi bận.

`getOperationalState` tại dòng 2881–2913 chỉ kiểm ready, roster, notice/incident của chính chuyến và giờ chạy. Không kiểm nguồn lực đang chạy chuyến khác. Khi các điều kiện tại chỗ đều đạt, canDriverStart có thể true trong trạng thái mà Start chắc chắn trả 409 dù dữ liệu không đổi giữa hai request.

FE đã được hướng dẫn dùng action flags. Cần đồng bộ điều kiện đọc với Start. Tên reason mới, nếu cần bổ sung contract, vẫn phải theo quy tắc PO duyệt field/giá trị phân vân. FE cũng cần xử lý 409 tại thời điểm bấm vì trạng thái có thể thay đổi sau khi đọc.

### R04 — Hướng dẫn FE ghi sai URL Home

**Mức độ P2.** `docs/FE_INTEGRATION_GUIDE.md:76` đang ghi GET /trips/driver/home, /trips/bus-attendant/home và /trips/parent/home-cards.

Controller thực tế tại `api/src/trips/trips.controller.ts:225` và `:243` đăng ký GET /trips/mobile/home-trip cho DRIVER/BUS_ATTENDANT và GET /trips/mobile/parent/home-cards cho PARENT. Các path tương đối với base /api/v1. Không tìm thấy alias cho ba URL trong hướng dẫn. Mobile client hiện cũng gọi đúng hai URL có mobile tại `mobile/services/api-client.ts:652` và `:658`.

Logic chọn Home đã áp dụng effectiveTripTiming và ưu tiên IN_PROGRESS. Phần còn lệch ở đây là contract URL trong tài liệu. FE viết tích hợp mới theo hướng dẫn hiện tại sẽ gọi endpoint không tồn tại.

### R05 — Hướng dẫn OTP mô tả field chưa tồn tại

**Mức độ P2.** `docs/FE_INTEGRATION_GUIDE.md:35–37` và master plan AA17 mô tả lỗi OTP nghiệp vụ có field attemptsRemaining. `api/src/auth/otp.service.ts:86–90` thực tế ném BadRequestException với chuỗi message có số lượt còn lại. Không có field attemptsRemaining trong response do service này tạo và không tìm thấy exception filter bổ sung field.

FE đọc error.attemptsRemaining theo tài liệu sẽ nhận undefined. Phương án ít tác động nhất là sửa tài liệu về response hiện hành. Nếu muốn thêm field JSON cần xác nhận contract trước khi triển khai.

TTL lấy từ AUTH_OTP_TTL_SECONDS, mặc định 300 giây tại `otp.service.ts:106–111`, nên mô tả 5 phút phải ghi là mặc định. Guide đang dùng tên purpose STUDENT_UPDATE và PARENT_STUDENT_LINK, còn enum schema là STUDENT_UPDATE_REQUEST và PARENT_STUDENT_LINKING. Auth verifyOtp hiện không có bộ đếm sai, còn withVerifiedChallenge giới hạn 5 lần. Việc đọc source xác nhận hai cơ chế này, không tự suy ra một quyết định PO mới từ phần mô tả tài liệu.

### R07 — operational-state đếm cả học sinh đã bị loại khỏi roster

**Mức độ P1.** `getOperationalState` include attendances:true tại `trips.service.ts:2791–2795`, sau đó dùng toàn bộ mảng để tính totalStudents, unmarkedCount, presentCount, pendingAlightCount và các flag tại dòng 2816–2828. Không lọc excludedAt. Trong khi đó Start, Arrive và Complete dùng filterActiveAttendances, còn đồng bộ roster cố ý giữ bản ghi cũ với excludedAt tại `utils/trip-sync.helper.ts:189–194`.

Ví dụ một trẻ đã bị loại còn UNMARKED, trẻ thực sự trong chuyến đã được điểm danh đủ. operational-state vẫn trả PENDING_BOARDING/PENDING_ATTENDANCE và có thể tắt Start/Arrive/Complete, dù API thực thi chỉ kiểm roster còn hiệu lực. Trẻ đã loại từng PRESENT cũng có thể làm sai số trẻ chờ xuống xe.

Điểm này ảnh hưởng 3.7, 3.9–3.11 và 3.14–3.15. Cần dùng cùng active roster khi tính counters, flags và dữ liệu con của Parent. Có sẵn helper filterActiveAttendances tại `utils/trip-snapshot-resolver.ts:320` để tái sử dụng. Tình huống trên là suy luận có điều kiện từ source, chưa gọi mutation để tái hiện.

### R08 — API điểm danh cũ vẫn cho sửa bản ghi học sinh đã loại

**Mức độ P1.** `updateAttendance` tại `trips.service.ts:2457–2467` tìm attendance theo tripId/studentId và chỉ kiểm tồn tại. `updateAlighting` tại dòng 2643–2658 cũng không kiểm excludedAt. Khi chuyến còn học sinh khác và đi đến giai đoạn cho phép, client giữ studentId cũ có thể ghi PRESENT/ABSENT hoặc ghi xuống xe trên bản ghi đã loại, làm sai bằng chứng và phát thông báo vận hành cho trẻ đã rời roster.

Correction mới đã chặn trường hợp này tại `trips.service.ts:143`. Cần áp cùng ràng buộc roster hoạt động cho các cửa ghi cũ có liên quan, giữ bản ghi excluded phục vụ lịch sử. Không cần thêm bảng/field để giải quyết lỗi này. Chưa gọi API ghi để tái hiện.

### R09 — Lịch phụ xe chưa dùng giờ đang hiệu lực

**Mức độ P2.** `getBusAttendantSchedule` tại `trips.service.ts:1344–1404` lấy persisted Trip rồi trả scheduledStartTime/scheduledEndTime đã lưu, không gọi effectiveTripTiming. Driver schedule tại dòng 1280, Parent schedule tại 1486, Home tại 1759/1904 và operational-state tại 2804 đã dùng helper này.

Khi lịch giờ của trường đã đến hiệu lực nhưng đối soát chưa ghi lại Trip SCHEDULED chưa frozen, lịch phụ xe có thể hiện giờ cũ trong khi Home/chi tiết/Ready dùng giờ mới. Điều này lệch mục tiêu hiệu lực theo ngày không phụ thuộc cron. Cần dùng cùng phép tính giờ có frozen guard trước khi trả lịch phụ xe.

### Tracking hiện đang kết luận vượt quá bằng chứng

Báo cáo trước, CURRENT_STATE đầu file và master plan AA17 ghi hoàn tất 100%/đồng bộ tuyệt đối. Source hiện còn các sai lệch trên. Báo cáo trước đã được lưu nguyên bản vào history/2026-11-07-r01-r06-before-follow-up-audit.md. Kết luận lượt review này cập nhật tại AA18 và CURRENT_STATE để người tiếp quản biết mốc mới nhất. Các số unit test trong báo cáo cũ là tuyên bố lịch sử, chưa được chạy/xác nhận lại trong lượt review này.

## 5. Implementation Details

No application code changes.

- Tạo `docs/ai-review/history/2026-11-07-r01-r06-before-follow-up-audit.md` để lưu báo cáo trước.
- Cập nhật `docs/ai-review/LATEST.md` bằng báo cáo này.
- Bổ sung master plan AA18 và ghi chú CURRENT_STATE về kết luận mới nhất.
- `LATEST.diff` hiện có thuộc đợt implementation trước, không dùng nó làm bằng chứng cho lượt review chỉ cập nhật tài liệu này.

## 6. Database Changes

None. `npx --no-install prisma migrate status` đã chạy read-only tại api, xác nhận 19 migrations và Database schema is up to date trên DB local roadtoschool/public localhost:5432.

## 7. API & Swagger Changes

None. Đã đọc controllers/DTO/Swagger decorators để đối chiếu contract. GET http://localhost:3000/api/docs-json timeout sau 4 giây trong lần kiểm tra này. OpenAPI/Swagger runtime là NOT_VERIFIED, chưa suy ra nguyên nhân timeout.

## 8. UI/UX Changes

None. Đã đọc Mobile client và vị trí dùng canReportLeave để xác định tác động tích hợp.

## 9. Verification & Testing

| Kiểm chứng | Kết quả thực tế |
|---|---|
| `npx --no-install tsc --noEmit` tại api | PASS, exit 0. |
| `npx --no-install prisma migrate status` tại api | PASS, 19 migrations đồng bộ. |
| Đối chiếu source/plan/FE guide | Xác định 7 nhóm sai lệch ở mục 4. Đây là kết quả static review. |
| GET OpenAPI local | NOT_VERIFIED, timeout sau 4 giây. |
| Script test | NOT_VERIFIED, theo chỉ thị user không chạy. |
| UAT mutation, race, retry, mốc ngày, cron, provider và FE end-to-end | NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY đối với ca cần dữ liệu hoặc mutation chưa được phép. |

Không tái sử dụng các số test PASS của báo cáo trước làm kết quả kiểm chứng lần này.

## 10. Issues & Risks

Còn R01, phần đồng bộ flag của R02, contract tài liệu R04/R05 và các phát hiện R07/R08/R09. R03 và phần logic mục tiêu của R06 đã có trong source, chưa được nghiệm thu runtime. Workflow thay plan cùng nhóm giữ nguyên trạng thái chờ chốt riêng theo PO.

Với các điểm hiện tại, FE có thể gọi sai URL, đọc field không tồn tại hoặc hiển thị thao tác khác với điều kiện API ghi. Các ca roster đã loại cần được xử lý trước khi coi các luồng đồng bộ học sinh và vận hành hoàn chỉnh.

## 11. Reviewer Focus

Đối chiếu cùng role, chiều chuyến và giai đoạn Ready trên mọi response canReportLeave. Kiểm active roster xuyên sync, read, Start/Arrive/Complete và các API điểm danh. Kiểm lịch phụ xe trước khi cron đối soát chạy. Đối chiếu lỗi OTP và URL Home trực tiếp với controller/service. Tách kết quả compile/migration khỏi nghiệm thu nghiệp vụ.

## 12. Suggested Next Step

Sửa đồng bộ 7 nhóm sai lệch R01/R02/R04/R05/R07/R08/R09 cùng contract FE và tracking, theo phạm vi field đã được PO duyệt.

## 13. Approval Status

WAITING FOR USER REVIEW / APPROVAL.
