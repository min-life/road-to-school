# RoadToSchool — Vòng đời hợp đồng, vị trí và thay đổi phân tuyến học sinh

Ngày: 26/10/2026. DISCUSSION / DESIGN ONLY. PO yêu cầu đánh giá DB/API/UI, **chưa tạo prompt hoặc implement**. Đây là thiết kế để thảo luận, không phải schema/API/wireframe đã được phê duyệt cuối cùng.

**Bốn quyết định PO đã trả lời trong phiên:** (1) cho phép thay đổi nguồn nhưng IN_PROGRESS và lịch sử dùng dữ liệu cũ; (2) chưa có tuyến thì cả hai admin duyệt địa điểm, có tuyến chỉ System Admin; (3) expiry giữ CANCELLED, chỉ DRAFT/ACTIVE → EXPIRED và hủy Trip SCHEDULED; (4) khi thay đổi học sinh, Trip SCHEDULED đã Ready hoặc có điểm danh không được sửa dữ liệu vận hành. Không hỏi lại bốn nội dung này.

## 1. Phạm vi và kết luận

Yêu cầu liên quan ba cụm: (1) hợp đồng/vị trí trường-bãi và vòng đời RoutePlan; (2) yêu cầu đổi địa điểm/disable học sinh; (3) thêm học sinh vào hai tuyến đã có. Khả thi, nhưng phải phân biệt Route mẫu với dữ liệu vận hành của Trip. Không thể chỉ sửa Student hoặc polyline Route rồi coi toàn bộ Trip đã đồng bộ an toàn.

Phạm vi mới cho hai admin sửa trực tiếp vị trí trường, System Admin sửa hợp đồng/bãi; không cần tạo thêm bảng yêu cầu sửa cấu hình trường chỉ vì inventory trước có đề xuất đó. School Admin không được sửa trường khác hoặc bãi xe. Quyền duyệt DRAFT → ACTIVE vẫn riêng School Admin; quyền hủy ACTIVE là nghiệp vụ mới PO đang đề xuất cho cả hai admin.

## 2. Hiện trạng đã đọc từ source

- RoutePlanStatus hiện DRAFT/ACTIVE/CANCELLED, chưa có EXPIRED; RequestStatus chỉ PENDING/APPROVED/REJECTED.
- `RoutesService.cancelRoutePlan`: chỉ SYSTEM_ADMIN, từ chối ACTIVE; hiện chỉ đổi trạng thái plan, chưa hủy Trip liên quan.
- `School` có tọa độ và contractStartDate/contractEndDate; controller hiện chưa có API chỉnh vị trí/hợp đồng tương ứng. Settings Web hiện có Account và Parking Lot; Parking service upsert tọa độ đơn thuần, chưa cascade hủy plan.
- Reservations xe tính từ routes thuộc DRAFT/ACTIVE và ngày hợp đồng School hiện tại. Driver assignment có quy tắc một trường trong khoảng hợp đồng chồng lấn; không được chỉ sửa query xe khi thêm EXPIRED.
- `StudentRequestsService.approveRequest`: School Admin duyệt INFORMATION_UPDATE và ADDRESS_UPDATE trong trường; System Admin chỉ ADDRESS_UPDATE. ADDRESS_UPDATE hiện chỉ sửa Student, chưa tối ưu Route/Trip. Parent controller chưa có cancel request. School Admin còn endpoint sửa trực tiếp địa chỉ, cần chặn bypass workflow mới khi đã phân tuyến.
- `StudentsService.updateStatus`: School Admin đổi AVAILABLE/DISABLED cho học sinh trường mình; chưa loại khỏi Route/Trip.
- RouteStop lưu tọa độ/order/studentId; Trip có roster TripAttendance riêng nhưng vẫn đọc stops/polyline từ Route hiện tại. Navigation cũng fingerprint và đọc trực tiếp RouteStop. Sửa Route tại chỗ có thể đổi lịch sử và invalid checkpoint chuyến đang chạy.
- Generation tạo Trip/roster theo Route tại thời điểm sinh, unique(routeId,serviceDate), có lookahead; không sinh tuyến rỗng. Parent schedule đã dùng roster TripAttendance. Một số query student routing chỉ nhìn DRAFT, phải bổ sung ACTIVE và loại terminal nếu triển khai scope này.
- Adapter VietMap VRP/TSP hiện có fallback nội bộ/geometry đường thẳng khi thiếu key hoặc routing fail. Không dùng fallback đó làm bằng chứng phương án mới khả thi.

## 3. Bất biến và ranh giới cập nhật

| Hành động | Route mẫu | Trip SCHEDULED | IN_PROGRESS / COMPLETED / CANCELLED |
|---|---|---|---|
| Hủy plan | Giữ dữ liệu, plan CANCELLED | Hủy, giữ dữ liệu | Không tự hủy/sửa dữ liệu vận hành đã chạy; giữ snapshot cũ |
| Hết hợp đồng | DRAFT/ACTIVE → EXPIRED, giữ CANCELLED lịch sử | Hủy toàn bộ liên quan còn SCHEDULED theo PO | Không hồi sinh hoặc viết lại hành trình; IN_PROGRESS còn chiếm nguồn lực thực tới khi kết thúc |
| Đổi vị trí trường/bãi | Hủy các plan DRAFT/ACTIVE trong scope; không sửa geometry plan cũ | Hủy theo cascade của plan | Cho phép đổi nguồn, Trip đang chạy/lịch sử giữ dữ liệu cũ |
| Đổi địa điểm, tối ưu thành công | Cập nhật tất cả Route còn hiệu lực chứa học sinh | Chỉ cập nhật Trip chưa Ready/chưa có điểm danh; không tự thêm thành viên khác | Giữ snapshot cũ |
| Đổi địa điểm không khả thi, duyệt loại khỏi tuyến | Cập nhật Student, bỏ membership trên mọi Route còn hiệu lực của em; giữ geometry/order của người còn lại | Chỉ loại em khỏi Trip chưa Ready/chưa có điểm danh | Không sửa lịch sử/chuyến đang chạy |
| Disable học sinh | DISABLED + bỏ membership thuộc plan DRAFT/ACTIVE | Chỉ loại khỏi Trip chưa Ready/chưa có điểm danh | Không sửa các plan terminal/lịch sử/chuyến đang chạy |
| Thêm vào cặp tuyến có sẵn | Tối ưu/cập nhật đúng hai Route sau khi cả hai thành công | **Giữ nguyên tất cả Trip đã sinh, kể cả SCHEDULED** | Giữ nguyên |

Số lượng, giờ/ETA dự kiến, resource conflicts, membership, parent privacy, navigation cache/checkpoint phải đồng nhất theo cùng nguồn dữ liệu. Không dùng Student.status để suy ra đã phân tuyến; membership tính từ Route còn hiệu lực. Re-enable học sinh không tự gắn lại tuyến cũ.

Với các thay đổi học sinh, “chưa có điểm danh” đề xuất kiểm không có status khác UNMARKED, markedAt hoặc alightedAt; không chỉ nhìn status Trip. Trip bị giữ nguyên vẫn dùng địa điểm/roster cũ dù Student/Route hiện tại đã đổi hoặc DISABLED; các API vận hành không được lọc em khỏi snapshot này bằng Student.status hiện tại. UI preview/outcome phải nêu Trip nào cập nhật, Trip nào giữ dữ liệu cũ. Guard này được PO trả lời cho luồng đổi địa điểm/loại/disable học sinh; không tự thay quyết định hủy SCHEDULED khi hết hợp đồng/hủy plan.

## 4. Hủy plan, hết hợp đồng và giải phóng tài nguyên

**Hủy ACTIVE:** System Admin toàn hệ thống; School Admin chỉ trường mình. Quyền hủy DRAFT thủ công giữ System Admin như source hiện có nếu PO chưa yêu cầu đổi; cascade do School Admin đổi vị trí trường được phép tác động cả DRAFT/ACTIVE của trường theo yêu cầu mới. Modal tác động → xác nhận có lý do → transaction đổi plan CANCELLED, hủy các Trip còn SCHEDULED/actualStartTime null, đóng pending staff leave notices do Trip bị hủy, ngăn generation/preview cũ phát sinh lại. Không xóa plan, routes, assigned IDs, roster hoặc GPS history. Không coi hủy plan là quyền hủy Trip đang chạy. Trip giữ dữ liệu cũ phải tiếp tục được tracking/attendance/Complete hợp lệ dù plan đã terminal.

**Giải phóng** là bỏ reservation tương lai của plan/Trip đã hủy, không xóa tài khoản, xe hoặc null assigned IDs lịch sử. Mọi kiểm tra xe/Driver/Attendant phải kết hợp (a) reservation plan còn hiệu lực và (b) actual Trip SCHEDULED/IN_PROGRESS đang chiếm lịch. Plan terminal không có nghĩa xe trên một Trip IN_PROGRESS đã rảnh. Không giải phóng tài nguyên của plan khác còn hợp lệ cùng dùng người đó.

**Hết hạn:** đề xuất contractEndDate bao gồm cả ngày cuối; hết hạn từ 00:00 ngày kế tiếp, Asia/Ho_Chi_Minh. Cron idempotent cập nhật status EXPIRED/cascade theo từng trường; kiểm tra ngày hợp đồng ở generate/start/approve/assign/resource selection để cron trễ không mở lỗ hổng. GET chỉ tính effectiveStatus/flags, không ghi trạng thái ngầm. Cần startup reconciliation sau downtime. Không lấy trường isActive làm trạng thái hợp đồng.

**Hợp đồng mới/gia hạn:** chỉ System Admin; không còn plan DRAFT/ACTIVE. startDate >= ngày Việt Nam hiện tại; endDate >= startDate. Theo yêu cầu PO, gia hạn dùng cùng rule: nếu start cũ đã quá khứ thì chọn thời gian mới, không chỉ kéo end giữ start quá khứ. Plan CANCELLED/EXPIRED không tự trở lại ACTIVE. Snapshot ngày hợp đồng trên plan cũ trước khi sửa School để giữ bối cảnh lịch sử. Trip đang chạy dùng bối cảnh cũ và vẫn giữ occupancy thực; chỉnh School không ghi lại hợp đồng/anchors của Trip đó.

**Đổi vị trí:** trường: hai admin đúng scope, hủy DRAFT/ACTIVE của trường; bãi: chỉ System Admin, hủy DRAFT/ACTIVE toàn hệ thống. Chỉ thay đổi tọa độ thực mới trigger invalidation; lưu cùng tọa độ không hủy hàng loạt. Sửa nhãn địa chỉ nhưng giữ tọa độ đề xuất không đổi geometry/plan, cần thể hiện rõ. Update vị trí + cascade là một thao tác có impact fingerprint/CAS; revalidate ngay trước commit, không tin số đếm từ modal. Chặn preview/approve/generate đang race bằng lock/order chung, không chỉ khóa lúc đọc.

## 5. Đổi địa điểm học sinh

### 5.1. Quyền và hủy yêu cầu

Source hiện hai admin đều duyệt ADDRESS_UPDATE. PO đã chốt: chưa phân tuyến cả hai duyệt (School Admin chỉ trường mình); đã có tuyến chỉ System Admin. INFORMATION_UPDATE giữ policy cũ, không mở quyền System Admin sửa thông tin học sinh. School Admin sửa địa chỉ trực tiếp cũng phải tuân theo cùng guard, không bypass bằng endpoint cũ.

Parent hủy yêu cầu ADDRESS_UPDATE của mình khi còn PENDING; CAS với admin approve/reject. Đề xuất không OTP khi hủy; status CANCELLED, giữ trước/sau và lịch sử. Không xóa request. Parent khác không tự hủy thay; quyền tạo/xem giữ policy hiện tại trừ PO đổi. Pending preview không khóa request vĩnh viễn: Parent vẫn hủy, confirm preview cũ phải fail.

### 5.2. Chưa có tuyến

“Chưa phân tuyến” phải không có membership trong mọi plan DRAFT/ACTIVE còn hiệu lực, không chỉ DRAFT. Nếu còn Trip hiện tại của plan đã terminal thì vẫn phải chụp/giữ dữ liệu vận hành cũ, không sửa Trip đó theo hồ sơ mới; việc này không tự mở lại plan hoặc đổi quyền duyệt chưa phân tuyến đã chốt. Duyệt hợp lệ cập nhật Student + APPROVED + outcome DIRECT_UPDATE trong cùng transaction, không tự tạo Route/Trip.

### 5.3. Có tuyến — Kiểm tra

Modal ban đầu hiển thị [Kiểm tra] thay cặp approve/reject như PO nêu. Trang kiểm tra reuse bố cục preview; không tự chạy provider khi mở modal hoặc GET. System Admin bấm kiểm tra với constraints đã chọn.

- Enumerate toàn bộ Route DRAFT/ACTIVE còn hiệu lực có A. Mỗi Route giải độc lập, giữ tập B/C/D và tọa độ RouteStop hiện tại của họ; dùng tọa độ mới cho A. Không lấy thay đổi hồ sơ khác hoặc reassign học sinh sang Route khác để làm kết quả trông khả thi.
- Giữ vehicle/group assignment và các anchors bãi/trường của phiên hợp lệ. Constraints có capacity, travel + service + waiting, windows trường/giờ, các giới hạn đã duyệt. Không cho nới số ghế vượt xe hoặc phá scope trường. Nhiều lịch ngày khác nhau phải kiểm các cửa sổ áp dụng.
- Với mỗi Route, mọi học sinh đang cần phục vụ phải được giải; không sử dụng partial-success policy của tạo plan mới để âm thầm bỏ học sinh B/C/D. Route v4 có polyline không đủ chứng minh khả thi capacity/time windows; dùng solver VRP và validate kết quả. Cần real road geometry, không fallback đường thẳng/nội bộ để enable confirm.
- Kết quả ba loại: FEASIBLE / INFEASIBLE / UNAVAILABLE. Timeout, 429, key/network, malformed response không phải INFEASIBLE. Không enable “Duyệt và loại khỏi tuyến” chỉ vì provider lỗi.
- Chỉ khi **tất cả** Route bắt buộc FEASIBLE thì enable Xác nhận tuyến mới. Một Route bất khả thi đã đủ chặn cập nhật một phần. Từ chối hoặc duyệt cập nhật địa điểm nhưng loại em khỏi **mọi** Route còn hiệu lực; đề xuất không giữ em ở tuyến thành công một chiều.
- Nút xác nhận commit Student + request outcome + Route/stops/constraints/metrics + các Trip SCHEDULED được phép cập nhật trong một transaction. Network ngoài lock; không rerun provider lúc commit. Revalidate nguồn preview trước ghi, 409 nếu stale.

**Không ghi đè roster theo Route:** nếu B vừa được thêm route-only trước đó, B chưa thuộc Trip SCHEDULED cũ. Duyệt đổi A không được vô tình đưa B vào Trip cũ. Trip update dùng chính roster còn hiệu lực của từng Trip; snapshot stops phải khớp roster đó. Nếu tập học sinh giữa Route và Trip khác nhau, preview phải nhóm/đánh giá theo các tập Trip cần cập nhật và báo số lượng kết quả; không áp một kết quả Route chứa extra students một cách mù quáng. Trip đã Ready/điểm danh/IN_PROGRESS được freeze và không đưa vào tập cập nhật.

### 5.4. Không khả thi và lựa chọn loại khỏi tuyến

Duyệt địa điểm mới và lưu outcome REMOVED_FROM_ROUTES, loại A khỏi mọi Route DRAFT/ACTIVE và roster Trip SCHEDULED được phép. Không sửa polyline/thứ tự các stops còn lại và không âm thầm tối ưu lại. Order có khoảng trống vẫn hợp lệ nếu consumers không giả định liên tiếp. Đi qua vị trí cũ trong geometry không có nghĩa còn phục vụ A; navigation targets/roster phải bỏ A.

Không đụng Route terminal/historical snapshots. Không xóa dữ liệu attendance/leave đã ghi; xem phương án exclusion tại mục 8. Nếu xóa A làm tuyến không còn học sinh: đề xuất giữ Route để lịch sử, không sinh chuyến rỗng, hủy SCHEDULED rỗng và bỏ holds của Route rỗng khi không còn Route/Trip khác sử dụng. Đây là edge policy cần PO duyệt, không tự hủy cả plan có các Route khác.

Parent thấy hai trục độc lập: status APPROVED và kết quả xử lý. Nhãn ngắn: “Đã cập nhật địa điểm”, “Đã cập nhật tuyến”, “Cần phân tuyến lại”; không để mọi trường hợp chỉ hiện “Đã duyệt” khiến hiểu vẫn được đưa đón. Kết quả lưu tại thời điểm quyết định, không suy ngược từ membership hiện tại.

## 6. Disable học sinh

School Admin đúng trường: impact preview hiển thị Route/Trip bị ảnh hưởng và lý do chặn → confirm. Atomic Student DISABLED + bỏ membership live/draft + exclusion trên các Trip được phép. Giữ plan CANCELLED/EXPIRED, Trip historical, request/leave history. Không xóa học sinh hoặc Parent links.

Không thể chỉ lọc Student.DISABLED khi sinh Trip vì RouteStops cũ vẫn giữ hold/membership và điều hướng. Không ghi ABSENT giả để biểu diễn bị loại khỏi chuyến; exclusion khác nghỉ học. Request địa chỉ còn PENDING khi disable không được duyệt qua API cũ; giữ lịch sử và trả disabledReason, chưa tự chuyển thành REJECTED của admin.

Nếu bật AVAILABLE lại: hồ sơ được sử dụng, không tự khôi phục những tuyến/trip đã loại. Membership/query/UI scope phải đồng bộ.

## 7. Thêm học sinh vào cặp tuyến đã có

Giữ cách tạo plan mới bằng tập học sinh chưa có tuyến như hiện tại. Thêm cách hai chỉ System Admin tối ưu: chọn học sinh AVAILABLE, có tọa độ, cùng trường; chọn một TO_SCHOOL và một TO_PARKING thuộc plan còn hiệu lực. Đề xuất bản đầu chọn cùng RoutePlan để không tạo một chiều đã ACTIVE và một chiều còn DRAFT; cần PO duyệt giới hạn này. Không bắt hai Route dùng cùng xe nếu business grouping hiện tại cho phép cặp khác xe, nhưng phải kiểm capacity/availability cho từng xe thực tế.

Preview giải độc lập từng Route bằng tập thành viên cũ + học sinh mới, giữ tất cả thành viên cũ và toàn bộ constraints hợp lệ. Hai chiều đều khả thi mới có nút xác nhận; lỗi/partial/unassigned không ghi gì. Revalidate học sinh chưa có membership mới từ thao tác khác, route status/vehicle/constraints/contract/school/bãi/assignment và source fingerprint.

Confirm chỉ cập nhật hai Route, stops, metrics, constraints và counters plan. **Không thêm TripAttendance hoặc sửa snapshot/giờ của bất kỳ Trip đã sinh.** Generation tiếp theo tạo roster/snapshot từ Route mới; không regenerate Trip cũ, không hồi sinh CANCELLED. Vì lookahead đã tạo nhiều ngày, “áp dụng chuyến mới” không đảm bảo ngày mai; UI nêu “Áp dụng cho chuyến được tạo sau”. Parent có thể đã có tuyến nhưng chưa có Trip phù hợp; thể hiện đúng trạng thái đó.

## 8. Định hướng DB tối thiểu — chưa được implement

Không đề xuất bảng nghiệp vụ mới ở bản đầu. Thay đổi cần PO duyệt:

| Vị trí | Đề xuất | Mục đích |
|---|---|---|
| RoutePlanStatus | Thêm EXPIRED | Vòng đời hết hợp đồng, tách CANCELLED |
| RequestStatus | Thêm CANCELLED | Parent rút yêu cầu địa điểm trước duyệt; audit mọi consumer dùng enum |
| Trip.routeSnapshot Json? | Snapshot versioned shape: route metadata/geometry/stops/order/coords/anchors/time/constraints cần thiết | Một nguồn tuyến riêng từng Trip để giữ lịch sử và route-only insertion; không nhét vào navigationState |
| StudentUpdateRequest.resolution Json? | outcome DIRECT_UPDATE / REOPTIMIZED / REMOVED_FROM_ROUTES; affected route/trip IDs/counts và dữ liệu audit tối thiểu | Phân biệt tác động dù cùng APPROVED; có thể lưu cancellation metadata gọn tại đây |
| Route.routingConstraints Json? | Override áp dụng cho Route; fallback plan.routingConstraints | Lưu constraints mới chỉ những tuyến được tối ưu, không sửa ràng buộc các tuyến khác trong plan |
| TripAttendance.excludedAt DateTime? + exclusionReason String? | Đánh dấu loại khỏi roster vận hành thay delete/mạo danh ABSENT | Giữ điểm danh/leave/audit lịch sử; reader/Start/Complete/QR/Parent auth phải dùng active roster |
| RoutePlan.scheduleScope JSON hiện có | Ghi contract period snapshot và bối cảnh vị trí cần thiết, không cần bảng Contract mới | School contract/location mới không đổi ngữ cảnh plan lịch sử |

Có thể bỏ exclusion fields nếu PO chấp nhận chỉ xóa attendance chưa từng có tác động và có audit đủ, nhưng không đề xuất dùng delete hàng loạt mù khi đã có leave/điểm danh. Dữ liệu vị trí cũ đã nằm trong RouteStop thì không duplicate tọa độ toàn bộ vào nhiều bảng không cần thiết.

**Snapshot lifecycle:** generation mới ghi snapshot. Với Trip cũ snapshot null, trước lần đầu sửa Route/School/bãi, chụp source hiện có cho các Trip sẽ phải giữ nguyên rồi mới đổi nguồn; cùng transaction/CAS. Đây là chuyển đổi dữ liệu nghiệp vụ cần phê duyệt phạm vi khi implementation, không chạy backfill trong phiên này. Không giả định khôi phục được lịch sử đã mất do thay đổi trước đây.

Một resolver chung cho Trip Detail/roster/map/navigation/fingerprint/history-fallback/parent masking đọc snapshot khi có; không chỉ sửa màn hiển thị. Stable stop IDs trong snapshot bảo vệ checkpoint. navigationState là runtime routing/cursor, không thay snapshot chuẩn. Existing GPS history không sửa, không tạo GPS từ polyline. Với SCHEDULED được refresh snapshot do đổi địa điểm, invalidate routing cache/checkpoint đúng version mà không tự Start/Ready/Attendance.

Student AVAILABLE/DISABLED vẫn như hiện có; không thêm ASSIGNED để duplicate membership. Reuse updatedAt + full input fingerprints/CAS trước khi thêm version columns; update timestamps khi thay stops. Index chỉ theo query cần thiết, không tự thêm hàng loạt.

## 9. API dự kiến — chưa contract approval

Prefix `/api/v1`. Tên cuối cùng cần khớp conventions/source; bảng là đề xuất, không phải endpoint đã tồn tại.

| Endpoint | Actor / input / tác động |
|---|---|
| GET /routes/route-plans/:id/cancellation-impact | Hai admin đúng scope; counts SCHEDULED/IN_PROGRESS/resources và fingerprint |
| POST /routes/route-plans/:id/cancel (mở rộng existing) | reason + expectedFingerprint, hai admin đúng scope; atomic cascade |
| GET /schools/:id/settings và GET /schools/:id/location-impact | Hai admin đúng scope; settings/impact thuần đọc |
| PATCH /schools/:id/location | address/coords + expectedFingerprint + confirm; update/cancel theo scope |
| GET /system-settings/parking-lot/impact; update parking endpoint hiện có | System Admin; global impact, update + cascade, không còn upsert bypass |
| PATCH /schools/:id/contract | System Admin; newStart/newEnd/expectedUpdatedAt; guard không plan DRAFT/ACTIVE, giữ bối cảnh và occupancy thực của Trip đang chạy |
| POST /parents/update-requests/:id/cancel | Parent creator còn quyền, ADDRESS_UPDATE PENDING; CAS cancel, đề xuất không OTP |
| POST /system-admin/update-requests/:id/routing-preview | constraints; trả opaque previewToken, FEASIBLE/INFEASIBLE/UNAVAILABLE, từng Route/Trip, impact/fingerprint; chỉ explicit POST gọi provider |
| POST approve request hiện có (mở rộng) | decision DIRECT_UPDATE/REOPTIMIZED/REMOVED_FROM_ROUTES + previewToken khi cần; không nhận geometry client làm sự thật; chưa tuyến: cả hai admin đúng scope, có tuyến: chỉ System Admin |
| POST reject request hiện có | Giữ reject có reason theo policy, CAS PENDING; không dùng rejection để diễn đạt Parent cancel |
| GET /schools/:schoolId/students/:id/disable-impact; PATCH status existing | School Admin; thêm impact confirmation/fingerprint, reuse transaction chung |
| GET /routes/students/:id/insertion-options | System Admin; eligible pairs + lý do, không chạy VietMap |
| POST /routes/student-insertions/preview | studentId, outboundRouteId, returnRouteId, constraints; explicit provider preview |
| POST /routes/student-insertions/confirm | previewToken/expected fingerprint; route-only transaction, không đổi Trips cũ |

Request/detail/list DTO thêm status, resolutionOutcome, affected counts, canCancel/canCheck/canApprove/canReject, blockedReason; trường hợp System Admin chỉ duyệt địa điểm không mở quyền loại INFORMATION_UPDATE. Không leak danh sách học sinh khác khi Parent xem outcome.

Error contract: 400 input/invalid candidate/decision;401 auth;403 role/scope;404;409 stale preview/đã duyệt-hủy/plan status/race vận hành;429 provider/preview limits;502 malformed provider;503 unavailable. Bất khả thi là kết quả preview có reason, không đánh đồng với lỗi hạ tầng. Swagger phải đồng bộ nếu sau này implement.

## 10. Wireframes draft

**Cài đặt:**

```text
Cài đặt
[Tài khoản] [Trường học] [Bãi xe — chỉ System Admin]
Trường [Cố định trường mình / dropdown cho System Admin]
Vị trí [Địa chỉ tìm kiếm] [Bản đồ chọn điểm]
                                           [Lưu thay đổi]

Xác nhận đổi vị trí
Phương án bị hủy: 3       Chuyến lập lịch bị hủy: 18
Chuyến đang chạy: 1       [Lý do chặn/theo policy PO]
                                [Đóng] [Xác nhận thay đổi]

Hợp đồng — System Admin
Từ ngày [datepicker]   Đến ngày [datepicker]
[Lý do chưa cho sửa / Lưu hợp đồng]
```

Hủy plan có modal impact tương tự. Plan list thêm badge Hết hạn và filters; không nút Khôi phục. Tài nguyên giữ thông tin tên/xe cũ trong chi tiết lịch sử nhưng không được xem là reservation hiện tại.

**Yêu cầu địa điểm có tuyến:**

```text
Chi tiết yêu cầu
Học sinh A · Trường …
Địa điểm cũ | Địa điểm đề xuất
                                   [Đóng] [Kiểm tra]

Kiểm tra thay đổi tuyến
[Ràng buộc] [Chạy kiểm tra]
[Chiều đi] [Chiều về]            [Bản đồ trước / sau]
Tuyến đi 1    Khả thi      4/4 học sinh     42 → 46 phút
Tuyến về 2    Không khả thi   [Lý do thực từ kiểm tra]
Trip lập lịch dự kiến cập nhật: … / Bị chặn: …

Tất cả khả thi:       [Từ chối] [Xác nhận tuyến mới]
Có tuyến bất khả thi: [Từ chối] [Duyệt và loại khỏi tuyến]
Lỗi dịch vụ:          [Thử lại] (không enable quyết định dựa trên infeasible)
```

**Parent:**

```text
Yêu cầu đổi địa điểm        [Chờ duyệt] [Hủy yêu cầu]
Sau duyệt:                 [Đã duyệt]
Kết quả: Đã cập nhật tuyến / Cần phân tuyến lại / Đã cập nhật địa điểm
```

**Thêm vào tuyến:**

```text
Học sinh chưa phân tuyến
[Tạo phương án mới] [Thêm vào tuyến có sẵn]
Học sinh [A]  Chiều đi [Tuyến 1 v]  Chiều về [Tuyến 2 v]
[Ràng buộc]                                   [Kiểm tra]
[Bản đồ + kết quả hai tuyến]
Áp dụng cho chuyến được tạo sau
                             [Đóng] [Xác nhận] (chỉ khi cả hai khả thi)
```

Reuse preview map, dropdown, datepicker, table/modal hiện có. Short copy, brand tokens, action flags authoritative. Không thêm screen tuyến mới cho từng lỗi; không tự cài dependency.

## 11. Atomicity, preview và phạm vi chuyển đổi

Mọi preview phải bind actor/purpose/request/student/Route IDs, current membership/coords/assignments/constraints, School/parking/contract revisions, Trip state và input fingerprint. Opaque token có TTL, owner và one-time commit; reuse cơ chế transient preview hiện có nếu phù hợp, không tạo bảng preview/Redis. Map RAM preview chỉ tạm, không authoritative; restart/multi-instance mất token phải yêu cầu kiểm tra lại, không tin payload client để bypass. Cần randomness/ownership tốt hơn token Math.random cũ nếu reuse.

Network ngoài transaction. Khi confirm: lock/reload nguồn, kiểm lại quyền và toàn bộ fingerprint, xác nhận tất cả kết quả bắt buộc cùng input, ghi atomic hoặc không ghi. Bảo vệ races hủy/expiry/location/contract, approve/cancel request, disable/insert cùng học sinh, start/ready/attendance/generation và resource assignment. Các flow phải có cùng lock ordering, audit cả TripOperation đang lock Trip trước để tránh deadlock; không chỉ thêm lock ở endpoint mới.

Giữ staff replacement trên Trip riêng không reset về defaults khi reopt Route. Giữ notice học sinh đang hiệu lực/ABSENT lý do cũ cho các em còn roster; em bị loại phải tách exclusion khỏi withdrawal. Attendance/QR/canStart/Complete và Parent membership dùng active roster; lịch sử notice vẫn truy cập theo quyền riêng.

Không tự reroute LIVE Trip do sửa plan; không tự Attendance/Ready/Start/Complete, background GPS hoặc paid-provider test. Schema/DDL/legacy snapshot population phải được trình bày và duyệt trước implementation. Không thêm generic framework/event log/Contract table khi chưa có nhu cầu đã duyệt.

## 12. Quyết định PO đã chốt và edge policy còn đề xuất

1. Cho phép đổi nguồn khi có IN_PROGRESS nhưng giữ dữ liệu Trip đang chạy và lịch sử.
2. Chưa phân tuyến: cả hai admin duyệt địa điểm theo scope; có tuyến: chỉ System Admin.
3. Expiry: giữ CANCELLED, chỉ DRAFT/ACTIVE → EXPIRED, hủy Trip SCHEDULED liên quan.
4. Đổi địa điểm/loại/disable học sinh: Trip đã Ready hoặc có điểm danh giữ nguyên vận hành; chỉ cập nhật Trip còn chưa thao tác.

Đề xuất edge policy để PO xem: cả hai Route cho insertion cùng RoutePlan; nếu loại học sinh cuối thì giữ Route lịch sử, ngưng sinh/hủy Trip rỗng và giải phóng hold tương ứng; không auto restore khi gia hạn hoặc enable học sinh. Parent cancel đề xuất không OTP. Các lựa chọn này chưa được coi là quyết định PO đã duyệt.

## 13. Hướng triển khai/kiểm chứng sau khi được duyệt

Thứ tự phụ thuộc: snapshot/active-roster và resolver chung → lifecycle/expiry/resources/location/contract → request cancel/outcomes/disable → preview/commit đổi địa điểm → insertion route-only → UI/UAT. Đây là thứ tự kỹ thuật trong plan, chưa mở phase implementation.

Pure/mocks cần kiểm tra source resolver, snapshots null/legacy, contracts dates VN, effective expiry khi cron trễ, giữ CANCELLED/actual occupancy, tất cả routes phải feasible, unavailable không thành infeasible, CAS/one-time token, trường/parent scope, giữ roster khác nhau giữa Trip và Route, insertion không đổi bất cứ Trip cũ, pending leave/attendance exclusion và privacy. Test phải dùng code thật, không mirror logic.

DB/UAT có side effects, provider routing thực/quota và dữ liệu thử đều chưa được cấp trong task này. Chỉ read-only source checks; không seed, API mutation, migrate, cài dependency hoặc gọi VietMap để test. Kết quả runtime NOT_VERIFIED; trường hợp thiếu scope ghi dữ liệu gắn BLOCKED_BY_TEST_DATA_POLICY. Cần wireframe/schema/API approval cuối trước prompt triển khai.
