# AI Review — Đối chiếu API, docs và plan 3.1–3.18 lần cuối, 06/11/2026

## 1. Kết luận hiện trạng

**NEEDS_FIX — chưa khớp đầy đủ, chưa đủ cơ sở nghiệm thu FE.** Trong phạm vi rà soát này ghi nhận10điểm:6P1 và4P2 (8điểm logic,1thiếu Swagger response schema,1nhóm tài liệu mâu thuẫn). Đây là suy luận có đường dẫn source cụ thể, chưa tái hiện bằng mutation/DB test. Bộ lọc địa giới mới khớp contract ở mức source/OpenAPI; migration19đồng bộ không chứng minh các luồng liên quan đã đúng runtime.

## 2. Yêu cầu và chế độ

PO yêu cầu rà lại API có khớp docs/plan chưa. DISCUSSION / READ_ONLY_REVIEW: không tự sửa application code/nghiệp vụ/field/schema hoặc áp migration. Không script test, seed, backfill, provider hoặc API mutation. Chỉ đọc source, metadata migrations và HTTP docs, build/typecheck/validate.

## 3. Nguồn đối chiếu

Theo thứ tự AGENTS: WORKING_RULES, BUSINESS_CONTEXT, CODEX_HANDOFF, CURRENT_STATE, LATEST, master plan Y/Z và FE_INTEGRATION_GUIDE. Quyết định mới nhất của PO và các mụcZ được ưu tiên đề xuất cũ tạiY22. Đã kiểm git status, giữ toàn bộ uncommitted work. Không xem workflow thay plan cùng nhóm là lỗi triển khai thiếu vì PO đã chủ động deferred.

## 4. Ma trận khớp theo nghiệp vụ

| Phạm vi | Kết quả source review |
|---|---|
| 3.1 tài khoản | Có bắt buộc email/phone, giữ email/console và chính sách resend; chưa chạy các luồng auth runtime. |
| 3.2 trường/lịch | Có hiệu lực theo ngày/đối soát và ngoại lệ, nhưng F05/F08 làm sai học bù/frozen khi đổi lịch. |
| 3.3 nguồn lực/bãi | Có lịch dời bãi và gate, nhưng F04/F06/F07 còn lệch reopen/handover/lịch Parent. |
| 3.4 Parent link | Có revoke scoped/reason/audit, guardianPhone không tự unlink; chưa UAT. |
| 3.5 tạo phương án | F01/F02: đường gọi trực tiếp và confirm chưa bảo đảm eligibility/phiên bản dữ liệu như plan. |
| 3.6 default/duyệt | Có field-specific sync, giữ override và duyệt trường; F03/F06 còn đường tạo/bàn giao dùng nguồn lực không phù hợp. |
| 3.7 sinh chuyến/reopen | F03/F04: khóa chưa đủ bảo vệ dữ liệu đọc trước khóa, reopen giữ snapshot cũ/bỏ ngày activation. |
| 3.8 điều phối | Có helper khả dụng/khóa, chưa đủ bao phủ đường bàn giao Route chưa có Trip (F06). |
| 3.9/3.10 điểm danh | Có correction/all-absent và điều kiện đã chốt; F09 thiếu response schema để FE lấy contract máy đọc. |
| 3.11 lịch/theo dõi | Có Parent masking, nhưng lịch dự kiến Parent thiếu gate lịch dời bãi (F07). |
| 3.12/3.13 báo nghỉ | Có chặn Parent sau Ready, mark provenance khi rút, REPLACED không rút; chưa chạy regression. |
| 3.14/3.15 địa chỉ/chèn | Có token/fingerprint, ngày mai và roster-only sync; generation đọc snapshot cũ có thể làm mất tính nhất quán (F03). |
| 3.16 hủy/thay | Có fingerprint cancel/giữ frozen; workflow replace cùng nhóm được PO deferred riêng, không đánh dấu bug. |
| 3.17 sự cố | Có close/GPS silence/late-risk/fallback, nhưng response schema close thiếu (F09), chưa telemetry/provider runtime. |
| 3.18 dashboard | Có6nhóm theo quyền và query tương ứng, chưa UAT count/action trên dữ liệu được cấp. |
| Bộ lọc địa giới | Source/OpenAPI phù hợp query optional/AND/scope/dropdown/eligibility riêng; chưa chứng minh dữ liệu thực/coverage/count bằng UAT. |

## 5. Các sai lệch logic cần xử lý

### F01 · P1 · Gọi API trực tiếp vẫn tạo phương án mới cho học sinh thuộc plan ACTIVE

Preparation loại học sinh đã phân tuyến, nhưng optimizePreview chỉ query AVAILABLE/có tọa độ, assertServiceArea chỉ kiểm trường/trạng thái/tỉnh/bán kính. confirm chỉ chặn có DRAFT, không chặn membership ACTIVE của học sinh. Với trường đang có plan ACTIVE và chưa có DRAFT, chọn chính nhóm học sinh đó cùng xe khác còn rảnh qua API có thể tạo DRAFT mới; readiness cũng không kiểm membership giữa hai plan. Trái Y7/Y8 và Z6 “eligibility vẫn kiểm ở optimize/confirm”; workflow replacement cùng nhóm lại chưa duyệt.

Bằng chứng: [RoutesService:431](../../api/src/routes/routes.service.ts#L431), [assertServiceArea:135](../../api/src/routes/routes.service.ts#L135), [confirm:1193](../../api/src/routes/routes.service.ts#L1193). Cần dùng chung kiểm membership hiệu lực tại preview và confirm dưới khóa, không dựa vào việc FE chỉ chọn từ preparation.

### F02 · P1 · Confirm không bắt đủ dữ liệu preview đã cũ

Session lưu schoolVersion/parkingVersion, không có phiên bản Student/Vehicle. Confirm đọc học sinh mới để kiểm AVAILABLE/phạm vi nhưng không so tọa độ/địa chỉ với các stop đã preview; vẫn tạo RouteStop bằng stop cache. Ví dụ preview trẻ ởA, trường sửa địa chỉ trực tiếp sangB (vẫn trong bán kính), confirm vẫn lưu tuyến theoA. Xe bị inactive/giảm chỗ sau preview cũng không được đọc lại active/capacity tại confirm; findConflictingVehicles chỉ kiểm reservation. Trái Y8.5 và nguyên tắc source đổi phải preview lại.

Bằng chứng: [session:961](../../api/src/routes/routes.service.ts#L961), [confirm:1184](../../api/src/routes/routes.service.ts#L1184), [stop cache:1293](../../api/src/routes/routes.service.ts#L1293), [reservation helper:81](../../api/src/routes/resource-availability.service.ts#L81). Cần ràng buộc phiên bản các nguồn preview và kiểm active/sức chứa thực lúc confirm; không thêm yêu cầu payload FE nếu cache phía BE đủ xử lý.

### F03 · P1 · Generator vẫn ghi dữ liệu đọc trước khi lấy khóa

Generator tải plan/routes/defaults/stops, tính roster/snapshot/timing trước transaction. Sau lockOperations chỉ tải lại School/Plan và kiểm hiệu lực/holds; tạo Trip vẫn dùng biến route/routeSnapshot/studentIds cũ. Nếu default đổi hoặc chèn/gỡ trẻ trong lúc generator chưa lấy khóa, mutation hoàn tất trước rồi generator vẫn ghi phân công/roster cũ; Trip vừa sinh không có mặt trong lần sync đã kết thúc. Có thể gán lại nhân sự đã bàn giao/inactive. Advisory lock không tự làm mới dữ liệu đã đọc trước khóa.

Bằng chứng: [đọc routes:485](../../api/src/trips/trips.service.ts#L485), [transaction:642](../../api/src/trips/trips.service.ts#L642), [create dùng cache:665](../../api/src/trips/trips.service.ts#L665). Trái Y2/Y6/Y9/Z2 kiểm trạng thái thực khi xác nhận. Cần tải/tính lại Route/defaults/roster/calendar và kiểm resource trong transaction hoặc so phiên bản rồi từ chối/retry có kiểm soát.

### F04 · P1 · Reopen có thể dùng bãi/tuyến cũ và bỏ ràng buộc ngày sau activation

Sau dời bãi, Trip chưa frozen đã CANCELLED, Route được re-optimize và plan duyệt lại. Reopen chỉ kiểm ACTIVE/needsReoptimization/serviceDay, không kiểm snapshot Trip khớp Route hiện hành; UPDATE chỉ đổi status/nguồn lực/Ready/audit, không rebuild hoặc từ chối snapshot cũ. Vì reader ưu tiên snapshot, chuyến mở lại vẫn có thể dẫn theo bãi/geometry cũ. Reopen cũng không yêu cầu serviceDate > ngày activatedAt, nên có thể mở chuyến hôm nay sau khi plan vừa duyệt lại hôm nay trong khi generator chỉ cho từ ngày mai.

Bằng chứng: [reopen:284](../../api/src/trips/trips.service.ts#L284), [UPDATE:361](../../api/src/trips/trips.service.ts#L361), [reopt giữ snapshot cũ:3698](../../api/src/routes/routes.service.ts#L3698), [duyệt đặt activation:2953](../../api/src/routes/routes.service.ts#L2953). Trái Y6/Y10 và FE guide mục7. Cần kiểm snapshot/roster/giờ/calendar/activation hiện hành trước mở; chọn rebuild hay từ chối khi khác cần giữ bằng chứng và chốt hành vi rõ.

### F05 · P1 · Áp lịch tuần có thể hủy nhầm chuyến học bù đã duyệt

reconcileSchool xử lý Trip thuộc SCHEDULE change bằng school.weeklySchedule[weekday]; nếu không có ngày đó thì hủy trước khi gọi effectiveTripTiming/serviceDay. Ví dụ có MAKEUP Chủ nhật được duyệt, đã sinh Trip; áp lịch tuần mới từ thứHai, tuần mới vẫn không có Chủ nhật. Trip học bù tương lai sẽ bị hủy dù serviceDay vẫn cho phục vụ theo MAKEUP. Trái Y5 ưu tiên học bù hơn lịch tuần và guide mục4.

Bằng chứng: [contract-lifecycle:211](../../api/src/schools/contract-lifecycle.service.ts#L211), [hủy theo weeklySchedule:217](../../api/src/schools/contract-lifecycle.service.ts#L217), [serviceDay](../../api/src/schools/school-policy.ts#L88). Cần dùng calendar/serviceDay thống nhất để quyết định ngày và timing, không chỉ nhìn lịch tuần.

### F06 · P1 · Bàn giao inactive chưa kiểm khả dụng đầy đủ khi Route chưa có Trip

assertInactiveHandover kiểm sâu chỉ trong for(trips). Nếu có default Route ACTIVE nhưng chưa sinh Trip, helper chỉ kiểm replacement.isActive; không kiểm reservation đơn trường/xung đột nhóm/hợp đồng của các Route sẽ bàn giao. Driver service sau đó updateMany defaults. Ví dụ tài xếB đang giữ cho trường khác vẫn có thể được bàn giao Route trườngA khi chưa có Trip. Xe/phụ xe có khoảng trống tương tự ở cấp Route; kiểm preflight active/role không thay cho kiểm nguồn lực từng nhóm.

Bằng chứng: [helper:273](../../api/src/trips/utils/staff-availability.helper.ts#L273), [chỉ loop Trips:284](../../api/src/trips/utils/staff-availability.helper.ts#L284), [driver handover:417](../../api/src/drivers/drivers.service.ts#L417). Trái Y6/Z1 và FE guide mục5. Cần kiểm cả nhóm Route chịu tác động dưới khóa, kể cả không có Trip.

### F07 · P2 · Lịch dự kiến Parent thiếu gate lịch dời bãi

Nhánh virtual của listTrips có pendingParkingChange(date), nhánh lịch tuần Parent không có, chỉ needsReoptimization=false và serviceDay. Khi đặt lịch dời bãi tương lai nhưng chưa đến ngày, plan chưa gắn cờ (đúng), Parent vẫn thấy virtual sau mốc dùng tuyến cũ trong khi generation/readiness chặn. Trái checklistZ2/FE guide phần bãi và lịch nhất quán.

Bằng chứng: [gate listTrips:855](../../api/src/trips/trips.service.ts#L855), [Parent thiếu gate:1608](../../api/src/trips/trips.service.ts#L1608). Cần dùng cùng gate cho mọi nhánh lịch dự kiến; không đổi danh sách lịch sử.

### F08 · P2 · Đổi giờ còn có thể tác động Trip chỉ Ready đã frozen

G-02 coi attendantReadyAt là frozen. effectiveTripTiming dùng requiresAdminFinalization làm guard, nhưng helper này không xét Ready nếu toàn UNMARKED. reconcileSchool nhánh SCHEDULE dùng cùng guard rồi ghi timing/snapshot, nên đường source cho phép đổi giờ Trip đã Ready. Ngoại lệ lifecycle cho phép hủy Ready-only khi mất dịch vụ tạiY21 không đồng nghĩa được sửa timing như Trip chưa frozen.

Bằng chứng: [guard:23](../../api/src/schools/trip-schedule-view.ts#L23), [requiresAdminFinalization:51](../../api/src/schools/school-effective-state.ts#L51), [ghi timing:233](../../api/src/schools/contract-lifecycle.service.ts#L233). Trái Y2/G-02, cần phân biệt policy frozen cho sửa dữ liệu với policy cần admin chốt khi lifecycle. Chưa tái hiện runtime; đặc biệt cần case Ready trước mốc đổi lịch.

## 6. Database

prisma migrate status xác nhận **19migrations up to date** ở roadtoschool/public localhost:5432. Prisma validate đạt. Audit JSON và địa giới nullable đã được áp ở các task trước, lượt review không migrate/seed/backfill hoặc truy vấn dữ liệu cá nhân. Không cần schema mới để kết luận các lỗi trên; cách sửa chưa tự quyết field mới.

## 7. F09 · P2 · Swagger chưa đủ schema response cho5API mới

Kiểm trực tiếp OpenAPI sinh từ source: response thành công của correction/cancel-all-absent/reopen/revoke Parent link/close incident đều không có content.application/json.schema, chỉ description. Body DTO/quyền/đường dẫn hiện có không thay thế schema response. FE guide nói rõ message/attendance/tripId/incident nhưng client generator không lấy được kiểu tương ứng; chưa thể ghi Swagger đồng bộ100%.

Bằng chứng: [TripsController:76](../../api/src/trips/trips.controller.ts#L76), [StudentsController](../../api/src/students/students.controller.ts), [IncidentsController](../../api/src/incidents/incidents.controller.ts). Đã xác nhận bằng metadata OpenAPI thực, không chỉ đọc decorator. Cần DTO/schema phản hồi đúng runtime, không thay payload đang trả.

## 8. F10 · P2 · Tài liệu còn mâu thuẫn và checklist đóng sớm

FE guide đầu mục local ghi19migrations, bullet audit lại ghi18 “up to date” ở hiện tại ([dòng10](../FE_INTEGRATION_GUIDE.md#L10)). Master plan Y3 vẫn có câu cần cập nhật Swagger phone required/source optional của thời điểm trước triển khai; Y6/Y8 còn dẫn quy tắc đã chốt sang Y22 trong khi Z1 đã duyệt. Nhiều checkboxZ2 ghi đã bao phủ generation/virtual/reopen/handover dù các đường F03/F04/F06/F07 còn thiếu. Đây là sai lệch trạng thái tài liệu, không phải lý do đổi quyết định PO cho khớp code sai.

Cần giữ nhật ký lịch sử nhưng ghi rõ bản hiện hành và reopening các hạng mục cần sửa. Báo cáo này/mụcZ9 đánh dấu NEEDS_FIX; chưa tự chỉnh guide hoặc source để che mất phát hiện.

## 9. Kiểm chứng đã chạy và giới hạn

| Kiểm tra | Kết quả |
|---|---|
| API npx --no-install tsc --noEmit | PASS,0 lỗi |
| npm run build | PASS |
| prisma validate | PASS |
| prisma migrate status | PASS,19migrations up to date |
| HTTP localhost:3000/api/docs và /api/docs-json | 200/200 |
| OpenAPI optional provinceId/wardId trên3GET | Có, required=false |
|2dropdown endpoints và metadata response địa giới | Có, schema/dropdown source đúng scope |
|5response schema API actions mới | FAIL nhưF09 |
| git diff --check | PASS trước ghi báo cáo, kiểm lại sau ghi |
| Test scripts/unit/e2e/provider/mutation nghiệp vụ | KHÔNG CHẠY |
| Runtime business/race/cron/FE UAT | NOT_VERIFIED / BLOCKED_BY_TEST_DATA_POLICY |

Swagger được phục vụ qua Nest metadata + Express adapter, không app.init/listen, không Prisma lifecycle/scheduler; không chạy đối soát để thử. Không đồng nhất HTTP200 docs với endpoint nghiệp vụ hoạt động đúng. Các counterexampleF01–F08 suy ra từ source, cần nghiệm thu sau bản sửa bằng dữ liệu được cấp.

## 10. Tác động đối với FE

Bộ lọc địa giới có thể tích hợp theo contract, nhưng không tuyên bố toàn bộ hệ thống sẵn sàng nghiệm thu. FE có thể gặp tuyến/điểm đón cũ sau confirm/reopen, lịch Parent không trùng điều kiện sinh Trip, hủy nhầm học bù hoặc nguồn lực bàn giao sai phạm vi. Không đẩy trách nhiệm bù eligibility sang filter FE; API phải thực thi quy tắc cho request trực tiếp. Dữ liệu cũ thiếu ID/dropdown rỗng là giới hạn PO đã duyệt, không phải bug mới.

## 11. Files thay đổi trong lượt review

Chỉ docs/ai-review/LATEST.md, archive history/2026-11-06-geography-migration-before-reaudit.md và mụcZ9 master plan. Không sửa API/DB/env/UI, không commit/push. LATEST.diff giữ patch code tích lũy từ các task trước, lượt này không có code change mới.

## 12. Đề xuất một bước tiếp theo

Lập và duyệt bản vá tập trung F01–F06 trước, kèm F07–F10 để đồng bộ toàn bộ contract/plan. Giữ field/request cũ; nếu cách xử lý reopen hoặc lỗi mới cần quyết định nghiệp vụ thì trình PO rõ trước sửa. Không tự đổi docs để hợp thức hóa hành vi lệch yêu cầu.

## 13. Trạng thái bàn giao

REVIEW_COMPLETE / NEEDS_FIX / FE_NOT_FULLY_VERIFIED. Đây là10điểm xác định trong phạm vi đọc source lần này, không khẳng định exhaustive mọi lỗi hệ thống. Thay plan cùng nhóm vẫn DEFERRED_BY_PO. Dừng review và chờ PO quyết định sửa; không tự triển khai bản vá trong lượt này.
