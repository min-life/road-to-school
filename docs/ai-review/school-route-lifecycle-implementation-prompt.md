# ROADTOSCHOOL V2.0 — IMPLEMENT VÒNG ĐỜI PHƯƠNG ÁN, HỢP ĐỒNG VÀ THAY ĐỔI PHÂN TUYẾN

Bạn là Antigravity. Product Owner giao triển khai Backend/Database/Web/Mobile/Documentation theo thiết kế đã trao đổi tại `docs/ai-review/school-route-lifecycle-student-change-design.md` và các quyết định cuối trong prompt này.

## 1. Phê duyệt và cách thực hiện

PO đã yêu cầu: **“tạo prompt để antigravity thực thi với các phương án đã chốt, nhưng vấn đề tôi không đề cập tới là chốt theo đề xuất.”** Vì vậy các phương án DB/API/wireframe và tình huống biên đã đề xuất trong bản thiết kế được chấp thuận trong scope này. Không xin duyệt lại từng phase hoặc dừng ở planning. Phê duyệt này thay giới hạn planning-only của nhiệm vụ thiết kế trước.

Đọc AGENTS.md, sau đó WORKING_RULES → BUSINESS_CONTEXT → CODEX_HANDOFF → CURRENT_STATE → LATEST → bản thiết kế và toàn bộ prompt. Ưu tiên quyết định PO trong prompt này nếu tài liệu lịch sử mâu thuẫn. Đối chiếu source/schema hiện tại, không mặc định báo cáo cũ phản ánh implementation đúng.

Kiểm tra git status; lưu baseline nội dung của task, bảo vệ mọi staged/modified/untracked work trước đó. Không commit/push/rebase/reset/discard/clean. Chỉ sửa các phần liên quan trực tiếp; không tiện thể sửa các findings Báo nghỉ hoặc module khác ngoài tác động tích hợp của scope này.

## 2. Phân biệt phạm vi cập nhật — bắt buộc

| Tác vụ | RoutePlan/Route | Trip SCHEDULED | Trip IN_PROGRESS và lịch sử |
|---|---|---|---|
| Hủy plan | Giữ dữ liệu, chuyển CANCELLED | Hủy tất cả Trip liên quan còn SCHEDULED | Giữ nguyên dữ liệu và tiếp tục vận hành hợp lệ |
| Hết hợp đồng | Chỉ DRAFT/ACTIVE → EXPIRED; CANCELLED giữ nguyên | Hủy các Trip SCHEDULED liên quan | Giữ nguyên |
| Đổi vị trí trường | Hủy mọi DRAFT/ACTIVE của trường | Hủy theo cascade plan | Giữ snapshot cũ |
| Đổi vị trí bãi | **Hủy mọi DRAFT/ACTIVE toàn hệ thống** | **Hủy mọi Trip SCHEDULED liên quan** | Giữ snapshot cũ |
| Đổi địa điểm học sinh/tối ưu lại | Cập nhật mọi tuyến còn hiệu lực liên quan khi hợp lệ | Chỉ cập nhật Trip chưa Ready và chưa có điểm danh | Giữ snapshot/roster/điểm đón cũ |
| Loại hoặc disable học sinh | Bỏ membership trên DRAFT/ACTIVE phù hợp | Chỉ loại khỏi Trip chưa Ready/chưa điểm danh | Giữ nguyên |
| Thêm học sinh vào cặp tuyến | Chỉ cập nhật hai Route sau khi cả hai khả thi | **Không sửa bất kỳ Trip đã sinh nào, kể cả SCHEDULED** | Giữ nguyên |

Guard giữ Trip đã Ready/điểm danh thuộc **luồng thay đổi học sinh**; không lấy guard này để bỏ cascade hủy SCHEDULED đã được PO yêu cầu khi hủy plan/expiry/đổi vị trí trường-bãi. Không tự ghi alighted/Complete/Attendance hoặc xóa điểm danh vì Trip bị hủy.

**PO đã nhấn mạnh riêng: đổi vị trí bãi vẫn phải hủy phương án hàng loạt. Snapshot bảo vệ Trip cũ, không thay thế hoặc thu hẹp thao tác hủy này.** Chỉ System Admin được đổi bãi.

## 3. Làm nền tảng snapshot trước khi sửa Route

Source hiện có TripAttendance riêng nhưng nhiều API Trip Detail/map/navigation/fingerprint vẫn đọc RouteStop/polyline từ Route live. Phải sửa nền tảng này trước, để một thay đổi Route không viết lại lịch sử hay kéo học sinh mới vào Trip cũ.

- Thêm nullable `Trip.routeSnapshot` JSON với shape/version được kiểm tra: thông tin tuyến, geometry, stops có ID ổn định/order/coords/địa chỉ, anchors trường-bãi và dữ liệu giờ/constraints cần thiết. Chỉ giữ dữ liệu thực sự cần, không duplicate GPS history hoặc secrets.
- Trip sinh mới ghi snapshot từ Route và roster tại thời điểm sinh.
- Trip cũ snapshot null: trước khi một transaction nghiệp vụ được người dùng xác nhận làm thay đổi nguồn, capture dữ liệu hiện có của những Trip cần bảo toàn rồi mới cập nhật nguồn. Không khẳng định khôi phục được lịch sử đã mất trước đây; không tự chạy script backfill hàng loạt/migration DML.
- Dùng resolver chung cho Detail, schedule counts/metadata, roster/stops, map/history planned fallback, navigation targets/fingerprint và parent masking. Không chỉ sửa một màn hình hoặc để navigation còn dùng live Route.
- navigationState là trạng thái runtime/routing cache, không dùng làm chỗ lưu snapshot nghiệp vụ. Trip giữ nguyên phải giữ target/fingerprint/session hợp lệ khi Route gốc đổi hoặc plan terminal; không tự reroute chuyến đang chạy theo vị trí nguồn mới.
- Với thay đổi học sinh, SCHEDULED chỉ được refresh khi chưa Ready và chưa có điểm danh. Kiểm tra cả statuses khác UNMARKED, markedAt/alightedAt, không chỉ Trip.status. Trip được giữ nguyên vẫn vận hành theo roster/điểm đón cũ dù Student hiện đã đổi địa chỉ hoặc DISABLED; không dùng trạng thái hồ sơ hiện tại để vô tình loại em khỏi chuyến đã chốt.
- Giữ staff assignment thay thế thực tế của từng Trip, không reset về defaults của Route. Roster của Trip là nguồn riêng; không tạo lại toàn bộ bằng RouteStops mới.
- Với Trip được phép refresh do đổi địa điểm, cập nhật snapshot/giờ/metrics phù hợp và invalidate routing cache đúng version. Không tự reset milestone hoặc nghiệp vụ khác.

## 4. Hủy phương án, hợp đồng và tài nguyên

**Hủy ACTIVE:** SYSTEM_ADMIN toàn hệ thống; SCHOOL_ADMIN chỉ phương án trường mình. Manual cancel DRAFT giữ quyền System Admin như source hiện tại. Cascade do đổi vị trí trường được phép hủy cả DRAFT/ACTIVE trong trường theo yêu cầu mới. DRAFT → ACTIVE vẫn chỉ School Admin, không mở quyền phê duyệt cho System Admin.

Modal impact + reason bắt buộc + xác nhận. Transaction chuyển plan CANCELLED, hủy các Trip còn SCHEDULED, đóng pending staff leave notices liên quan vì Trip bị hủy, giữ toàn bộ lịch sử. Idempotent, không auto phục hồi và không cho generation/preview cũ tái tạo. Trip IN_PROGRESS tiếp tục tracking/attendance/Complete theo snapshot cũ dù plan đã terminal.

**Giải phóng tài nguyên:** bỏ reservation tương lai của plan/Trip terminal, không xóa/null assigned IDs lịch sử hoặc vô hiệu hóa User/Vehicle. Availability phải kết hợp holds của plan còn hiệu lực với actual Trips SCHEDULED/IN_PROGRESS còn chiếm lịch. Không giải phóng xe/người đang phục vụ Trip IN_PROGRESS, hoặc đang được plan khác hợp lệ sử dụng.

**Hết hợp đồng:** thêm RoutePlanStatus.EXPIRED. contractEndDate bao gồm ngày cuối; hết hạn từ 00:00 ngày kế tiếp theo Asia/Ho_Chi_Minh. Chỉ DRAFT/ACTIVE → EXPIRED; CANCELLED giữ nguyên. Hủy Trip SCHEDULED tương ứng, giữ chuyến đang chạy/lịch sử. Có cron idempotent/startup reconciliation phù hợp; generate/approve/start/assign/resource checks phải tự kiểm hợp đồng để cron trễ không cho hành động sai. GET thuần đọc, không ghi expiry ngầm. Kiểm soát kích hoạt job khi verification để không vô tình mutate business data chỉ nhằm test; báo rõ trạng thái kích hoạt thực tế.

**Sửa/gia hạn hợp đồng:** chỉ System Admin, trường không có plan DRAFT/ACTIVE. startDate mới >= ngày Việt Nam lúc sửa; endDate >= startDate. Gia hạn cùng rule: start cũ quá khứ thì phải chọn kỳ mới, không lách bằng chỉ update end. Giữ bối cảnh hợp đồng trong plan/Trip lịch sử, không revive plan terminal. Trip còn chạy giữ occupancy thực và hợp đồng cũ.

## 5. Vị trí trường và bãi — cập nhật có cascade nguyên tử

- SCHOOL_ADMIN sửa vị trí trường mình; SYSTEM_ADMIN chọn/sửa trường. Đổi vị trí thực hủy toàn bộ DRAFT/ACTIVE của trường và Trip SCHEDULED liên quan.
- SYSTEM_ADMIN đổi vị trí bãi: hủy **toàn bộ** DRAFT/ACTIVE của **mọi trường**, cùng Trip SCHEDULED liên quan. Không chuyển thành chỉ đổi tọa độ hoặc chỉ hủy một trường.
- Modal trước confirm hiển thị số plan/Trip/resources, số chuyến đang chạy giữ dữ liệu cũ; reason/confirm ngắn rõ. Không cần bảng yêu cầu sửa cấu hình trường mới.
- Dùng impact fingerprint/expected state; vị trí + cascade + metadata phải thống nhất, không trả thành công khi chỉ cập nhật một phần. Không giữ DB lock trong network map search/provider.
- Lưu lại cùng tọa độ không phải thay đổi vị trí; sửa nhãn địa chỉ mà tọa độ không đổi theo đề xuất không hủy tuyến. Không dùng no-op này để bỏ qua hủy hàng loạt khi tọa độ bãi thực sự đổi.
- Chặn bypass qua parking upsert, API sửa trường cũ hoặc preview/approve/generate đang race. Snapshot legacy cần giữ phải được capture trước khi nguồn bị đổi.

## 6. Yêu cầu đổi địa điểm và quyền duyệt

- Chưa phân tuyến: cả hai admin được duyệt trong scope, cập nhật trực tiếp hồ sơ, không tự tạo tuyến/chuyến.
- Đã có tuyến DRAFT/ACTIVE còn hiệu lực: chỉ System Admin được duyệt qua luồng kiểm tra. Định nghĩa membership phải kiểm cả DRAFT lẫn ACTIVE, loại CANCELLED/EXPIRED; không thêm StudentStatus.ASSIGNED để duplicate membership.
- School Admin direct-update address endpoint hiện có phải áp cùng guard, không bypass khi đã phân tuyến. INFORMATION_UPDATE giữ policy cũ; System Admin không được sửa tên/SĐT giám hộ qua mở rộng này.
- Parent creator còn quyền được hủy ADDRESS_UPDATE PENDING, **không OTP**. Thêm RequestStatus.CANCELLED, giữ bản ghi/audit; CAS với approve/reject. Parent hủy trong lúc admin đang preview phải làm confirm token cũ thất bại.
- Duyệt cập nhật và request status/outcome atomic. Dùng nullable resolution JSON để lưu DIRECT_UPDATE / REOPTIMIZED / REMOVED_FROM_ROUTES cùng impact tối thiểu; không suy outcome từ membership hiện tại.

**Luồng có tuyến:** modal request hiển thị [Kiểm tra], mở giao diện gần preview. Admin chỉnh constraints, chủ động chạy kiểm tra. Từng Route chứa A được giải độc lập bằng vị trí mới của A + vị trí RouteStop hiện tại của B/C/D, giữ membership những em khác, anchors, xe và ràng buộc hợp lệ. Không redistribute học sinh sang Route khác để đạt thành công.

Phải dùng solver/validation thỏa capacity, time windows, thời gian driving + service + waiting và ràng buộc áp dụng. Route v4 vẽ được line không đủ chứng minh mọi ràng buộc đã đạt. Không dùng fallback đường thẳng/nội bộ của adapter hiện có để đánh FEASIBLE cho luồng mới.

- **Tất cả Route bắt buộc FEASIBLE:** [Từ chối] / [Xác nhận tuyến mới]. Commit địa điểm, Route/stops/constraints/metrics và các Trip SCHEDULED đủ guard trong cùng transaction.
- **Có ít nhất một Route INFEASIBLE thực sự:** [Từ chối] / [Duyệt và loại khỏi tuyến]. Khi chọn loại: cập nhật địa điểm, bỏ A khỏi mọi Route còn hiệu lực và Trip được phép; **không đổi polyline hoặc thứ tự đón/trả của các em còn lại**.
- **UNAVAILABLE** do timeout/429/quota/key/network/malformed response: báo lỗi và retry có kiểm soát; không xem đó là bất khả thi và không enable duyệt loại chỉ vì lỗi dịch vụ.

Không dùng partial optimization để âm thầm bỏ B/C/D. Nếu một tuyến không đạt, không commit tuyến thành công trước. Nếu Trip có roster khác Route do insertion route-only trước đó, kiểm tra/cập nhật theo tập thành viên thực tế của từng Trip; không retro-add học sinh mới vào Trip cũ hoặc áp geometry/stops không khớp. Preview phải chỉ rõ Trip cập nhật và Trip giữ dữ liệu cũ.

Parent thấy status và outcome riêng: Đã cập nhật địa điểm / Đã cập nhật tuyến / Cần phân tuyến lại, kèm các chuyến đã chốt vẫn dùng dữ liệu cũ khi có. Không chỉ hiện Đã duyệt cho mọi tác động. Không leak danh sách/địa chỉ học sinh khác trong kết quả Parent.

## 7. Disable, loại khỏi roster và tuyến rỗng

School Admin đúng trường: impact → confirm → atomic Student.DISABLED + loại membership ở DRAFT/ACTIVE + exclusion trên Trip đủ guard. Giữ Trip đang chạy, đã Ready/điểm danh và lịch sử. Không sửa plan CANCELLED/EXPIRED, không xóa hồ sơ/Parent links hoặc attendance đã ghi, không biểu diễn bị loại bằng ABSENT giả hay Parent tự hủy notice.

Thêm nullable TripAttendance.excludedAt/exclusionReason theo thiết kế để giữ audit. Cập nhật mọi reader/permission/QR/Start/Complete/counters/schedule dùng active roster đúng ngữ cảnh, đồng thời giữ quyền xem lịch sử request/leave độc lập theo policy. Notice/điểm danh của học sinh còn trên chuyến không bị reset; yêu cầu PENDING của học sinh DISABLED không được duyệt qua API cũ.

**Tuyến hết học sinh:** giữ Route/geometry lịch sử; không sinh chuyến rỗng. Hủy các Trip SCHEDULED thực sự trở thành rỗng do loại roster và chưa chốt vận hành; release future holds của Route rỗng khi không còn Route/Trip khác chiếm tài nguyên. Trip frozen giữ roster cũ nên không được coi là rỗng chỉ vì Route hiện tại rỗng. Không auto hủy cả RoutePlan còn dữ liệu hoặc phục hồi tuyến khi học sinh AVAILABLE lại; vẫn có thể cancel plan bằng thao tác đã duyệt. Active/draft grouping/approval/generation/counters phải xử lý Route rỗng nhất quán, không cần thêm RouteStatus chỉ để che lỗi.

## 8. Thêm học sinh vào hai tuyến đã có

Giữ cách tạo RoutePlan mới từ tập học sinh chưa có tuyến. Thêm luồng chỉ System Admin: học sinh AVAILABLE/có tọa độ/chưa có membership còn hiệu lực, chọn một TO_SCHOOL và một TO_PARKING **cùng RoutePlan**, cùng trường học sinh, plan DRAFT hoặc ACTIVE hợp lệ.

Kiểm tra độc lập hai Route bằng tập học sinh cũ + em mới, giữ tất cả em cũ và đúng ràng buộc từng xe. Không bắt buộc cùng xe nếu business grouping hiện tại cho phép hai xe khác nhau; capacity/assignment/conflicts phải đúng xe thực tế. Cả hai chiều FEASIBLE mới enable confirm. Không ghi một phần, không cho fallback/mất mạng thành thành công.

Confirm chỉ cập nhật hai Route/stops/metrics/constraints và counters plan. **Không đổi roster, snapshot, giờ hoặc dữ liệu của bất cứ Trip đã sinh nào.** Capture snapshot cũ trước khi đổi nguồn nếu cần giữ legacy Trips; capture là bảo toàn, không chuyển Trips cũ sang tuyến mới. Generation sau đó tạo Trip/roster/snapshot theo Route mới, không regenerate/mở lại Trip cũ/CANCELLED.

UI ghi “Áp dụng cho chuyến được tạo sau”. Vì có lookahead, không hứa ngày mai. Parent có thể đã có tuyến nhưng chưa có Trip phù hợp; hiển thị đúng, không tạo Trip để làm demo.

## 9. DB và migration được duyệt trong scope

Không thêm bảng nghiệp vụ mới. Thực hiện tối thiểu:

- RoutePlanStatus thêm EXPIRED; RequestStatus thêm CANCELLED.
- Nullable Trip.routeSnapshot, StudentUpdateRequest.resolution, Route.routingConstraints override.
- Nullable TripAttendance.excludedAt/exclusionReason.
- Tái sử dụng cancellation audit hiện có; contract snapshot dùng scheduleScope JSON của plan, không dựng bảng Contract hoặc event log mới.
- Dùng full fingerprint + updatedAt/CAS khi phù hợp; thêm index/constraint chỉ theo query/invariant thực tế. Không duplicate trạng thái phân tuyến trong Student.

Được tạo/apply additive DDL migration và Prisma generation cần thiết vào development đang cấu hình sau xác minh target/status/drift/SQL. Không reset DB, đổi connection sang môi trường khác, migration DML, seed hoặc chạy script populate legacy snapshots hàng loạt. Snapshot capture legacy thuộc code transaction nghiệp vụ khi người dùng thực hiện thao tác được duyệt; không được agent gọi mutation đó để test khi chưa có scope UAT.

Nếu drift/data conversion ngoài scope ngăn migration an toàn, báo cụ thể, không ép reset hoặc giả báo apply thành công; tiếp tục phần code/kiểm chứng an toàn có thể thực hiện. Migration/schema/generation status phải báo đúng thực tế.

## 10. API, UI và concurrency

Implement các nhóm contract ở mục 9 và wireframe mục 10 bản thiết kế, gồm cancel/impact plan, school location/settings/contract, parking impact/cascade, parent cancel, request routing preview/approve outcome, disable impact, insertion options/preview/confirm. Tái sử dụng endpoint/service hiện có và bổ sung DTO/validation/error cases khi cần; không tạo đường cũ bypass guard mới. Đường dẫn phải khớp prefix/controller thật `/api/v1`.

Swagger đồng bộ cả hành vi mới của endpoints cũ và endpoints mới; kiểm tra `/api/docs` và `/api/docs-json`. Có action flags/blockedReason theo actor/scope, EXPIRED/CANCELLED mới ở list/detail/filters/labels, loading/empty/error và stale-state xử lý đúng. Không expose preview payload thô/contacts/secrets cho Parent.

UI theo cấu trúc đã chốt: Settings có School selector đúng quyền, bản đồ vị trí, contract datepickers, modal impact; Request có Kiểm tra/preview trước-sau/kết quả từng tuyến và nút theo trạng thái; Mobile Parent có Hủy và resolution rõ; học sinh chưa phân tuyến có Tạo phương án mới/Thêm vào tuyến và preview hai chiều. Reuse maps/dropdowns/calendar/table, Minimal UI Copy, brand tokens. Không cài dependency mới hoặc xin duyệt lại wireframe đã được chốt theo đề xuất.

Preview token phải opaque, khó đoán, TTL, bind actor/purpose/request/student/source routes/rosters/coords/assignments/constraints/school/bãi/contract/Trip states. Reuse transient preview hiện có nếu phù hợp, không thêm Redis/preview table; mất token sau restart/multi-instance phải kiểm tra lại, không nhận geometry client làm sự thật. Token/commit idempotency không được cho phép ghi hai lần hoặc hồi sinh request đã cancel.

Provider call ngoài DB transaction. Confirm lock/reload, revalidate toàn bộ source fingerprint và tất cả kết quả trước atomic write; stale trả 409 và kiểm tra lại, không ghi một phần. Phối hợp lock ordering với TripOperation/generation/expiry/assignment có sẵn để tránh deadlock; resource/student races phải được bảo vệ ở đúng nguồn lực, không chỉ kiểm một form.

## 11. Verification và giới hạn Test Data Policy

Triển khai toàn scope rồi chạy tsc api/web/mobile, Prisma validate/generate/migration status, lint/build phù hợp; chỉ dùng dependencies local, không tự npx install package. Unit tests phải import production helpers/services hoặc dùng in-memory adapters cho code thật, không chép lại logic vào test rồi kết luận PASS.

Các acceptance bắt buộc kiểm tra an toàn:

1. Sửa nguồn không đổi snapshot/targets/roster/history của Trip frozen/IN_PROGRESS/terminal; navigation tiếp tục đúng dù plan terminal.
2. Đổi vị trí bãi luôn cascade mọi DRAFT/ACTIVE toàn hệ thống và Trip SCHEDULED; trường chỉ ảnh hưởng trường mình; không partial commit/race với generation/start/approve.
3. Expiry theo ngày VN, cron trễ/downtime vẫn có guard; giữ CANCELLED, không revive khi renew; actual occupancy không giải phóng sớm.
4. Đúng quyền School/System/Parent; direct address cũ không bypass; Parent cancel race approve/reject/preview và creator-only.
5. Routing strict mọi thành viên/mọi tuyến; unavailable không thành infeasible; không fallback giả, stale preview/one-time commit/idempotency đúng.
6. Remove/disable giữ lịch sử, geometry/order và pending leave hợp lệ; empty-route policy đúng, không ABSENT giả.
7. Insertion hai chiều cùng plan atomic, mọi Trip cũ giữ nguyên nghiệp vụ; generation mới có em mới, các lần cập nhật sau không retro-add em vào Trip cũ.
8. DTO/Swagger/UI filters/labels/outcomes/masking/refresh đồng nhất; không mất scope trường hoặc hiển thị học sinh khác cho Parent.

Không tự tạo User/Student/RoutePlan/Trip/request/leave/GPS records để test, không seed/backfill, sửa records thật, rollback fixtures, click form hoặc gọi POST/PUT/PATCH/DELETE có side effects để nghiệm thu. Không tự gọi VietMap trả phí/SMTP/OTP hoặc chạy expiry job thủ công để kiểm chứng. Không tự sửa env/secrets hoặc bật jobs có side effects chỉ nhằm test.

Thiếu scope/runtime dữ liệu thì ghi NOT_VERIFIED và BLOCKED_BY_TEST_DATA_POLICY, nêu đúng môi trường/dữ liệu/quyền/quota cần. Không chờ dữ liệu để bỏ dở phần code đã duyệt; không coi mock/tsc/Swagger đọc được là runtime acceptance. PO phê duyệt triển khai không tự cấp quyền ghi UAT hoặc paid-provider test.

## 12. Bàn giao và dừng

Archive báo cáo/diff/plan trước khi thay. Cập nhật thiết kế theo implementation thật, CURRENT_STATE và LATEST đầy đủ 13 mục. Xuất LATEST.diff là **diff thật đầy đủ so baseline task**, gồm cả files mới và tests; không dùng dấu .../pseudo-diff hoặc gộp HEAD diff của toàn bộ work cũ. Không đưa secrets/generated outputs.

Báo rõ files/DB migration/Swagger/UI/commands/results, tiêu chí nào PASS/FAIL/NOT_VERIFIED, job nào đã kích hoạt, những hạn chế multi-instance/legacy/runtime thật. Không đưa TODO/stub rồi tuyên bố hoàn tất hoặc READY_FOR_PRODUCTION. Chỉ hỏi PO khi xuất hiện quyết định mới thực sự ngoài thiết kế đã duyệt, không hỏi lại các phương án đã chốt theo đề xuất.

Sau bàn giao chỉ đề xuất một bước tiếp theo phù hợp. **STOP AFTER TASK. Không commit/push, tự chạy UAT ghi dữ liệu, gọi provider trả phí hoặc mở module khác.**
