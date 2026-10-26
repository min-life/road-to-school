# AI Review — Đánh giá nghiệp vụ lifecycle sau implementation Antigravity

## 1. Task Information
Date: 26/10/2026 (Asia/Saigon). Scope: Independent review API/DB/Web/Mobile integration; Documentation. Type: Business Implementation Review. Status: COMPLETED review / PARTIAL implementation / CHANGES_REQUESTED. Không sửa application code.

## 2. Original Request
PO không có nhu cầu tự test mọi tình huống; yêu cầu dựa vào báo cáo MD trong history để đánh giá phần nghiệp vụ gần nhất: vòng đời phương án/hợp đồng/vị trí, thay đổi địa điểm, disable và thêm học sinh. Không tạo thêm checklist hoặc yêu cầu PO chạy 67 ca.

## 3. Approved Scope
Đọc báo cáo gốc và đối chiếu source với các quyết định đã chốt, chạy typecheck an toàn và hai probe phương thức production bằng in-memory adapters. Chỉ ghi báo cáo. Không implementation/prompt fix, migration, dependencies, records test thật, DB/API mutation hoặc provider/OTP/network call.

Nguồn báo cáo gốc: history/2026-10-26-152206-before-lifecycle-ui-uat-checklist.md. Nguồn yêu cầu: school-route-lifecycle-student-change-design.md và school-route-lifecycle-implementation-prompt.md. Báo cáo checklist trước đã archive tại history/2026-10-26-165146-before-lifecycle-business-review.md/.diff.

## 4. Analysis & Decisions

### 4.1 Kết luận theo nghiệp vụ

| Nghiệp vụ | Đánh giá source | Phần có / phần thiếu |
|---|---|---|
| Schema và snapshot Trip | Một phần | Có enums/fields/helper, generation ghi snapshot, một số reader/navigation dùng snapshot. Không có capture legacy trước thay đổi, đồng bộ snapshot SCHEDULED khi reopt hoặc sử dụng guard vận hành đầy đủ. |
| Hủy ACTIVE bởi hai admin | Có luồng cơ bản, chưa an toàn đồng thời | Đúng role/scope, giữ dữ liệu, transaction hủy SCHEDULED và đóng pending staff leave. Chưa bảo vệ race Start/cancel và fingerprint không được dùng. |
| Đổi vị trí bãi | Có cascade Backend toàn hệ thống | Update setting + hủy mọi DRAFT/ACTIVE/SCHEDULED liên quan trong transaction; đổi nhãn không cascade. Còn race/legacy snapshots/impact revalidation. |
| Đổi vị trí trường | Có Backend, UI chưa nối đúng | Cascade đúng schoolId, kiểm scope School Admin. EditSchool UI gửi PUT không có handler tương ứng; School Admin chưa có lối Settings Trường theo thiết kế. |
| Sửa/gia hạn hợp đồng | Có Backend guards, chưa trọn UI | Kiểm System Admin, không DRAFT/ACTIVE, ngày mới hợp lệ. UI EditSchool vẫn gọi PUT /schools/:id thay PATCH contract; chưa có contract context snapshot plan cũ trong mutation. |
| Tự động hết hạn | Chưa hoàn thành | Có hàm reconcile và EXPIRED/cascade nhưng không thấy cron/startup/caller của hàm trong api/src; không thể gọi là tự động hoạt động. |
| Parent hủy / quyền duyệt / outcome | Có luồng bình thường, thiếu bảo vệ đồng thời | Có owner/PENDING checks, cancellation/outcome UI và guard SA khi đã có tuyến; direct address cũng chặn khi có membership. Cancel read-then-update không CAS, có thể ghi đè APPROVED. |
| Đổi địa điểm và tối ưu lại | Chưa đạt nghiệp vụ cốt lõi | Preview chưa dùng VietMap, FEASIBLE chỉ ghế/tọa độ; approve REOPTIMIZED chỉ đổi tọa độ RouteStop, không line/order/Trip snapshot mới. Frontend response contract không khớp. |
| Disable / loại / tuyến rỗng | Một phần | Có scoped remove/exclusion/cancel Trip rỗng. Chỉ check Ready, chưa check attendance; legacy không freeze; navigation stops chưa loại excluded và counters/holds Route rỗng chưa đồng bộ đầy đủ. |
| Thêm học sinh vào hai tuyến | Một phần, chưa dùng được trọn từ UI | Có same-plan/two-direction/capacity checks, insert hai Route trong transaction, không ghi Trips cũ. Không solver thật/time validation/geometry mới; UI/API sai contracts, không capture legacy, thiếu revalidation token/source khi confirm. |

Không đánh tỷ lệ phần trăm vì một phần nền tảng làm xong không bù được thiếu sót ở các luồng quyết định chính. Readiness khuyến nghị: NOT_READY_FOR_ACCEPTANCE toàn scope; không đồng nghĩa mọi code đều không dùng được.

### F1 — P1: Hai luồng tối ưu chưa thực hiện VietMap như yêu cầu

Source: api/src/student-requests/student-requests.service.ts:1107–1245; api/src/routes/routes.service.ts:2003–2109,2193–2233.

previewAddressRouting chỉ kiểm capacity và bounds tọa độ, ước lượng distance delta bằng chênh lat/lng, time bằng tốc độ 8.33m/s; newPolylineGeometry giữ nguyên polyline cũ và hasUnavailable luôn false. Không có provider call. Với tọa độ hợp lệ và còn ghế, em ở quá xa vẫn có thể được FEASIBLE vì không validate các time windows/max duration bằng solver.

REOPTIMIZED branch ở dòng 988 chỉ update RouteStop tọa độ A; không tối ưu order/line/metrics và không cập nhật snapshot/giờ của các Trip SCHEDULED được phép. Request vẫn có thể ghi outcome REOPTIMIZED. Đây là mismatch nghiệp vụ trực tiếp, không cần PO chạy đủ checklist để kết luận.

Insertion dùng metresBetween để chọn điểm chèn + tốc độ cố định + service 60s, kết luận chủ yếu theo ghế; commit chỉ thay stops/ước lượng distance-duration, không cập nhật polyline road mới. Không đáp ứng yêu cầu hai chiều được tối ưu với constraints thật. Report nói VietMap Matrix nhưng source phương thức này không gọi dịch vụ.

### F2 — P1: Các flow UI/API không khớp, chặn sử dụng bình thường

- web/src/lib/api-client.ts:332–336 gửi PUT /schools/:id bằng FormData; api/src/schools/schools.controller.ts có PATCH :id/location và PATCH :id/contract, không handler PUT :id. EditSchoolModal dùng đúng method PUT client này. Lưu trường/hợp đồng chưa được nối end-to-end.
- web/src/components/admin/students/insert-student-modal.tsx:61 đọc candidatePairs; Backend getInsertionOptions trả studentId/studentName/pairs, không nested student/hasActiveMembership/candidatePairs như Web types. API client trả thẳng, không mapper.
- Web insertion preview đọc isFeasible/returnRoute/version; Backend trả feasible/return/expectedFingerprint. Web confirm gửi studentId/routeIds/expected versions, DTO Backend đòi previewToken. Dù bypass lỗi mở modal, confirm vẫn sai contract.
- Web request modal đọc overallFeasibility và count khác Backend allFeasible/scheduledTripsToRefreshCount/frozenTripsCount; status/buttons có thể không đúng.
- Settings chưa có School tab, nav Schools chỉ System Admin; School Admin thiếu đường thao tác vị trí trường mình đã duyệt.

Đây là lỗi source contracts được xác nhận; review chưa gọi UI/API thật nên không báo đã quan sát màn 404 hoặc crash runtime.

### F3 — P1: Snapshot chỉ bảo vệ Trip mới, chưa bảo vệ đầy đủ Trip cũ

Source: api/src/trips/trips.service.ts:325–363; utils/trip-snapshot-resolver.ts:167 trở đi; mutation services Route/Student/School/Parking.

Có ghi snapshot tại generation mới và resolver ưu tiên snapshot. Nhưng search api/src chỉ thấy build/write snapshot ở generation; PRE_UPDATE_CAPTURE chỉ là string type, chưa có nhánh capture trước mutate. Trip legacy null snapshot vẫn fallback live Route/School. Disable/delete RouteStop, đổi địa điểm/update coords hoặc insertion sửa Route có thể đổi map/stops/fingerprint của IN_PROGRESS/COMPLETED cũ. Đổi vị trí trường có thể đổi fallback schoolCoords. Điều này trái quyết định bảo toàn dữ liệu cũ.

Ngoài ra chưa có update snapshot cho T0 khi reopt như scope; vì vậy Trip có snapshot mới thì vẫn giữ điểm đón cũ dù được phép cập nhật. Cần resolver/capture/refresh theo đúng matrix, không chỉ thêm JSON field.

### F4 — P1: Giữ Trip đã điểm danh và loại khỏi navigation chưa đầy đủ

Source: api/src/students/students.service.ts:634–668; student-requests.service.ts:946–982; trip-navigation.service.ts:113,177; trip-snapshot-resolver.ts:250.

Disable và remove branch chọn SCHEDULED/actualStart null/attendantReadyAt null, không kiểm status/markedAt/alightedAt của attendance. Có helper isTripOperatedOrReady đúng ý tưởng nhưng chỉ thấy declaration, không consumer. Trip còn SCHEDULED, Ready null nhưng đã có ABSENT/điểm danh hợp lệ vẫn bị sửa/exclude/hủy, trái rule PO giữ Trip đã có điểm danh.

Trip Detail có filter excludedStudentIds, nhưng navigation dùng resolveTripRoute(trip).stops trực tiếp, không cùng filter active roster. Khi snapshot vẫn có A nhưng A bị excluded, Detail có thể bỏ A còn navigation vẫn chọn điểm A. Cần dùng cùng resolver/active-stop selection thay vì chỉ lọc một API.

### F5 — P1: Race hủy có thể ghi đè trạng thái đã bắt đầu/đã duyệt

Source: routes.service.ts:1650–1717 và student-requests.service.ts:435–478.

Cancel plan đọc danh sách SCHEDULED rồi updateMany chỉ theo IDs, không status predicate/CAS hoặc Trip row locks. Nếu Start commit giữa hai bước, cancel có thể ghi IN_PROGRESS thành CANCELLED. expectedFingerprint được nhận nhưng không so sánh.

Parent cancel đọc PENDING rồi update theo id, không CAS. Nếu admin vừa APPROVED giữa read và write, Parent có thể ghi request thành CANCELLED sau khi địa điểm/tuyến đã đổi.

Đã tái hiện hai interleavings bằng chính method bodies đọc qua TypeScript AST, transpile và in-memory Prisma adapters: (a) mocked concurrent Start chuyển trạng thái sang IN_PROGRESS trước final write, actual cancel method ghi thành CANCELLED; (b) mocked approval chuyển APPROVED trước cancel write, actual method ghi thành CANCELLED. Cả hai final writes không có status predicate. Đây là demonstration code-path, không phải PostgreSQL concurrency benchmark; 0 real DB/network calls.

Các cascade relocation/expiry có read IDs rồi write IDs tương tự, cần rà soát chung với generation/Start/Ready, không chỉ sửa một endpoint.

### F6 — P1: Expiry chưa được nối thành tác vụ tự động

Source: api/src/routes/routes.service.ts:1733; search toàn api/src chỉ thấy declaration reconcileExpiredContracts. Cron duy nhất liên quan trong TripsService hiện là generation 02:00, không thấy gọi expiry/startup reconciliation. Có implementation cập nhật EXPIRED/cancel SCHEDULED khi được gọi, nhưng chưa đáp ứng tự hết hạn như report khẳng định.

### F7 — P2: Source revalidation/nhất quán sau thay đổi còn thiếu

Insertion session có userId/expectedFingerprint nhưng confirm chưa recheck ownership/source fingerprint/route status/coords mới và constraints sau preview; chủ yếu chỉ check Student AVAILABLE/chưa có RouteStop. Có thể commit vào source đã đổi/plan đã terminal bằng token cũ. Token bị delete bên trong callback transaction trước kết quả commit cuối, cần xử lý retry/atomicity rõ.

Disable/remove chưa cập nhật lại counters RoutePlan tương ứng; resource-availability còn dựa reservations từ Route/plan, chưa thấy tích hợp actual Trip occupancy hoặc loại holds của Route rỗng nhất quán. Không đủ cơ sở khẳng định đã release resources an toàn toàn scope.

Disable còn tự chuyển mọi StudentUpdateRequest PENDING thành CANCELLED_DUE_TO_DISABLED, gồm cả loại thông tin. Đây là tác động bổ sung cần đối chiếu thiết kế giữ request history/disabledReason và thể hiện đúng nguồn cancellation, không mô tả thành Parent đã tự hủy. Không xếp finding này ngang thiếu solver, nhưng phải ghi trung thực.

### Những phần làm đúng đáng ghi nhận

Có additive schema/migration file theo hướng tối thiểu, enum và fields đúng nhóm; code snapshot/helper/generation là nền tảng hợp lý. Role/school guards hủy ACTIVE và cascade phạm vi bãi toàn hệ thống/trường riêng có implementation thực, không chỉ UI. Transaction nhóm các thao tác liên quan, giữ plan/routes/attendance thay delete lịch sử; đóng staff leave pending khi Trip cancelled. Contract date guards cơ bản đúng. School Admin direct address cũ đã chặn khi học sinh có DRAFT/ACTIVE. Parent cancel có owner/PENDING checks, Mobile hiển thị cancel/outcome. Insertion có same-plan/direction/capacity checks và không trực tiếp ghi Trips cũ.

Những điểm đúng này là kết luận source review ở luồng không cạnh tranh, không phải tuyên bố runtime PASS.

## 5. Implementation Details
No application code changes. Tạo school-route-lifecycle-business-review.md và cập nhật LATEST.md/LATEST.diff với cùng đánh giá. Archive report checklist trước tại history/2026-10-26-165146-before-lifecycle-business-review.md/.diff. Không sửa findings hoặc tạo prompt remediation trong task này.

## 6. Database Changes
None. Đọc schema/migration inventory, không kết nối hoặc ghi DB. File migration/snapshot generation có source; chưa xác minh migrate status/drift trực tiếp trong review. In-memory adapters không tạo records thật hoặc temporary rollback data.

## 7. API & Swagger Changes
None implemented. Đã đối chiếu controller/DTO/client thực và xác nhận mismatches ở F2. Không gọi mutation hoặc Swagger live trong task này. Report Antigravity ghi API preview GET khác source POST, sample snapshot shape và tên counters cũng không khớp hoàn toàn; dùng source làm bằng chứng implementation.

## 8. UI/UX Changes
None implemented. Đánh giá source các entry points/modal/contracts, chưa chạy browser/device. Có các controls mới nhưng chưa đủ UI/API wiring/road preview theo thiết kế. Không yêu cầu PO tự chạy toàn bộ checklist để xác nhận các thiếu sót source đã rõ.

## 9. Verification & Testing
| Check Codex chạy thực tế | Kết quả |
|---|---|
| api: npx --no-install tsc --noEmit --incremental false | PASS, exit 0 |
| web: npx --no-install tsc --noEmit --incremental false | PASS, exit 0 |
| mobile: npx --no-install tsc --noEmit --incremental false | PASS, exit 0 |
| Actual cancelRoutePlan body + in-memory concurrent Start interleaving | FAIL bảo vệ trạng thái: IN_PROGRESS → CANCELLED, final write không status predicate |
| Actual cancelParentRequest body + in-memory concurrent approval interleaving | FAIL single-decision: APPROVED → CANCELLED, final write không status predicate |
| rg/source/controller/client/consumer/cron checks | CONFIRMED_BY_SOURCE các findings; không thay runtime evidence |
| UI/device/real VietMap/PostgreSQL races/migration drift | NOT_VERIFIED; không thực thi side effects |

Không chạy full 354 API/77 Web suites; đó là con số trong báo cáo gốc. Không provider/OTP/network requests, 0 real DB writes. Git status đầu review: 260 entries; bảo vệ toàn bộ uncommitted work. Hai probe không ghi file test hoặc fixtures vào repo.

## 10. Issues & Risks
Kết luận “hoàn thành triển khai và kiểm chứng đầy đủ” trong history vượt source/evidence. Thiếu sót nằm ở nghiệp vụ chính, không chỉ polish UI hoặc thiếu PO test. Chưa nên nghiệm thu toàn scope. Mocks/TypeScript không xác thực API contracts runtime, VietMap feasibility, legacy snapshots hoặc concurrency thật. Không suy đoán tác giả cố ý báo sai; yêu cầu sửa code và báo cáo cho khớp.

## 11. Reviewer Focus
Ưu tiên F1 solver/commit đúng, F2 UI/API contracts, F3/F4 frozen/legacy/active navigation, F5 concurrency và F6 expiry activation. Sau đó F7 counters/holds/source token/extra cancellation. Cần tests import implementation và kiểm chứng contract/service đúng, không mirror logic; task diff thực theo baseline, giữ history và policy dữ liệu.

## 12. Suggested Next Step
Yêu cầu Antigravity khắc phục các thiếu sót nghiệp vụ đã xác nhận trong review này và cung cấp bằng chứng source/verification tương ứng trước khi PO chỉ cần nghiệm thu một số luồng chính.

## 13. Approval Status
Independent review hoàn tất. Khuyến nghị CHANGES_REQUESTED cho implementation, không tự cấp approval hoặc bắt đầu sửa. Không giao lại 67 ca cho PO như điều kiện để reviewer kết luận. STOP-AFTER-TASK.
