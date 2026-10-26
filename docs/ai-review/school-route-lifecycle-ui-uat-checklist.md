# Checklist UI — Vòng đời phương án, hợp đồng, vị trí và thay đổi học sinh

Ngày: 26/10/2026 (Asia/Saigon). Đối chiếu LATEST của Antigravity và source hiện tại. **Chưa có ca UI nào được Codex thực thi hoặc đánh PASS.** Checklist dành cho Product Owner kiểm thử thủ công; không phải yêu cầu agent tạo dữ liệu/gọi mutation.

## 1. Antigravity báo đã làm gì

- Thêm EXPIRED/CANCELLED, snapshot tuyến trên Trip, kết quả duyệt địa điểm, exclusion roster và constraints tuyến.
- Hủy ACTIVE/cascade SCHEDULED, giải phóng nguồn lực; hàm reconcile hết hợp đồng.
- Sửa trường/hợp đồng và đổi bãi có impact/cascade.
- Parent hủy yêu cầu; admin kiểm tra địa điểm, duyệt trực tiếp/tối ưu/loại khỏi tuyến.
- Disable học sinh, xử lý tuyến/chuyến rỗng; thêm học sinh vào cặp tuyến có sẵn.
- Web modals/actions/filters và Mobile Parent cancellation/outcomes.

Đây là nội dung báo cáo, không phải xác nhận runtime. Báo cáo ghi api/web/mobile typecheck và 354 API/77 Web tests PASS; Codex chưa chạy lại trong task checklist này. Bản báo cáo gốc được archive trước khi thay LATEST.

## 2. Những chỗ cần kiểm tra sớm theo source

| Ưu tiên | Dấu hiệu đã thấy | Ca UI liên quan |
|---|---|---|
| S1 | Web EditSchool gọi PUT /schools/:id, controller hiện có PATCH :id/location và :id/contract, không thấy PUT :id. Có thể lưu trường/hợp đồng lỗi 404. | A03, C01–C04, H01 |
| S2 | Insertion UI đọc candidatePairs/isFeasible/returnRoute và gửi expected versions, nhưng Backend trả pairs/feasible/return và confirm đòi previewToken. Client chưa có mapping. | A04, E01–E09 |
| S3 | Address preview UI đọc overallFeasibility/affectedScheduledTripsCount, Backend trả allFeasible/scheduledTripsToRefreshCount; cần kiểm trạng thái/nút/count có hiển thị đúng không. | A05, D05–D11 |
| S4 | previewAddressRouting hiện chỉ kiểm ghế/tọa độ, ước lượng theo chênh tọa độ, trả lại polyline cũ; REOPTIMIZED branch mới sửa RouteStop, chưa thấy commit geometry/Trip snapshot mới. Insertion cũng dùng khoảng cách hình học và tốc độ cố định. Chưa phải tối ưu VietMap theo yêu cầu. | D06–D10, E03–E08 |
| S5 | Có reconcileExpiredContracts nhưng search source hiện chỉ thấy khai báo, chưa thấy job/caller kích hoạt tự động. UI báo có EXPIRED không chứng minh tự expiry. | J01–J03 |
| S6 | Settings chưa thấy tab Trường học cho School Admin; nav Trường học chỉ System Admin. Cần kiểm có lối vào sửa vị trí trường mình thật sự không. | A01–A02 |

Không cần chạy sâu ca phụ thuộc khi bước nền tảng đã lỗi; ghi FAIL/BLOCKED và ID lỗi gốc. Không chọn “Đã kiểm chứng đầy đủ” chỉ vì nút bấm/label xuất hiện.

## 3. Chuẩn bị và cách ghi nhận

### Dữ liệu/tài khoản do PO chọn

- Hai trường A/B để kiểm phạm vi; System Admin, School Admin của A, Parent liên kết học sinh, Driver và Bus Attendant được phân công. Có thêm Parent/School Admin khác nếu test quyền xem chéo.
- Các phương án DRAFT/ACTIVE/CANCELLED; EXPIRED nếu có. Chọn học sinh: chưa tuyến; đang có hai chiều; đủ điều kiện thay địa điểm; học sinh cuối tuyến; DISABLED. Các ca làm đổi dữ liệu dùng hồ sơ độc lập để không phá tiền đề ca khác.
- Chuẩn bị/nhận diện Trip cùng nhóm Route: **T0** SCHEDULED chưa Ready, toàn UNMARKED; **T1** SCHEDULED đã Ready; **T2** SCHEDULED đã có điểm danh (kể cả ABSENT hợp lệ); **T3** IN_PROGRESS; **T4** COMPLETED; **T5** CANCELLED. Đây là nhãn cho dữ liệu thật PO chọn, không phải script/fixture agent tự tạo.
- Một yêu cầu địa điểm PENDING cho học sinh chưa tuyến và một cho học sinh đã có tuyến; ca approved/rejected/cancelled để kiểm nút hủy.
- Ghi trước tên/ID thật, ngày/chiều, điểm đón, hình tuyến, roster, thứ tự, xe/người, trạng thái và ảnh UI của các Trip sẽ so sánh.
- Chỉ dùng môi trường/dữ liệu PO đồng ý thay đổi. Kiểm tra tuyến có thể tiêu quota provider khi implementation được sửa; PO tự xác nhận key/quota phù hợp trước ca đó. Checklist không cấp quyền agent tự gọi.

### Cách ghi kết quả

Mỗi ô chỉ tick sau khi đã chạy và kết quả đúng. Ghi PASS / FAIL / NOT_VERIFIED / BLOCKED (kèm nguyên nhân hoặc ca tiền đề). Mẫu lỗi ở cuối. Chạy theo thứ tự A → B → D/E/F → G → H/I → J; **đổi tọa độ bãi ở nhóm I làm cuối**, vì hủy hàng loạt và đổi lại tọa độ cũ không khôi phục plan/Trip.

## A. Kiểm tra đường vào và nối UI/API trước

- [ ] **A01 — System Admin:** vào Cài đặt, Trường học/chi tiết trường, Phương án, Yêu cầu và danh sách học sinh của trường. Mỗi nơi có action đúng scope; không trang trắng hoặc báo thiếu dữ liệu không rõ lý do.
- [ ] **A02 — School Admin:** tìm sửa vị trí trường mình ngay trong Cài đặt theo thiết kế. Không được sửa bãi/hợp đồng/trường khác. Nếu không có lối vào thì ghi FAIL, không coi có API là đã xong UI.
- [ ] **A03 — Lưu trường cơ bản:** với dữ liệu PO cho phép, đổi nhãn địa chỉ nhưng giữ nguyên tọa độ → lưu thành công, không 404/405, mở lại vẫn giữ nhãn mới, không hủy plan/Trip.
- [ ] **A04 — Mở Thêm vào tuyến:** chọn học sinh đủ điều kiện → modal tải được tên em và các cặp tuyến, không lỗi đọc candidatePairs/undefined, không loading vô hạn.
- [ ] **A05 — Mở Kiểm tra tuyến:** System Admin mở request có tuyến, bấm Kiểm tra → hiển thị được kết quả từng tuyến, trạng thái và số chuyến tác động; không undefined/NaN hoặc thiếu nút do sai mapping.

## B. Parent hủy yêu cầu và duyệt trực tiếp

- [ ] **B01 — Hủy PENDING:** Parent vào Chi tiết học sinh → yêu cầu đổi địa điểm → chi tiết → Hủy → Đóng. Request vẫn PENDING, địa điểm/tuyến/chuyến không đổi.
- [ ] **B02 — Xác nhận hủy:** cùng ca trên chọn xác nhận → không OTP, request Đã hủy trong list/detail; admin mở lại không còn duyệt được; địa điểm/tuyến/chuyến không đổi.
- [ ] **B03 — Nút hủy đúng quyền/trạng thái:** APPROVED/REJECTED/CANCELLED không có action hủy hợp lệ. Parent khác không được hủy thay creator, không lộ dữ liệu con không liên kết.
- [ ] **B04 — Chưa phân tuyến, School Admin duyệt:** dùng request riêng thuộc trường mình → cập nhật trực tiếp, Parent thấy Đã cập nhật địa điểm; không tự xuất hiện tuyến hoặc Trip.
- [ ] **B05 — Chưa phân tuyến, System Admin duyệt:** ca độc lập → kết quả như B04; không mở quyền xử lý yêu cầu đổi tên/SĐT giám hộ.
- [ ] **B06 — Có tuyến, School Admin:** không được duyệt hoặc sửa trực tiếp địa điểm để vượt quy trình; thông báo chuyển System Admin rõ, Student/Route/Trip không đổi.
- [ ] **B07 — Hai phiên cùng quyết định:** admin đang xem request, Parent hủy trên Mobile; admin xác nhận bằng dữ liệu cũ → bị báo đã đổi trạng thái, không ghi địa điểm/tuyến. Thử chiều ngược lại trên request riêng: đã duyệt thì Parent không hủy được.

## C. Hợp đồng

- [ ] **C01 — Còn DRAFT:** System Admin thử sửa kỳ hợp đồng của trường có DRAFT → bị chặn, ngày cũ giữ nguyên sau tải lại.
- [ ] **C02 — Còn ACTIVE:** tương tự với ACTIVE → bị chặn; không chặn nhầm việc sửa nhãn địa chỉ không liên quan hợp đồng.
- [ ] **C03 — Chỉ còn CANCELLED/EXPIRED:** System Admin sửa kỳ mới hợp lệ → lưu được, mở lại đúng ngày; School Admin không được sửa.
- [ ] **C04 — Ngày không hợp lệ:** start trước hôm nay VN hoặc end trước start → lỗi rõ, không lưu một phần. start hôm nay và end hợp lệ phải được chấp nhận khi đủ điều kiện khác.
- [ ] **C05 — Gia hạn:** ca C03 gia hạn theo kỳ mới → plan/Trip CANCELLED hoặc EXPIRED cũ không tự ACTIVE/SCHEDULED; lịch sử giữ ngữ cảnh cũ. Không mặc định chỉ kéo end trong khi start cũ đã quá khứ.

## D. Địa điểm có tuyến — kiểm tra, duyệt và dữ liệu Trip

- [ ] **D01 — Bước đầu:** request có tuyến chỉ cho System Admin kiểm tra; modal không bỏ qua Kiểm tra để duyệt trực tiếp.
- [ ] **D02 — Cấu hình và bản đồ:** màn kiểm tra có constraints phù hợp, xem được tuyến cũ/mới, địa điểm mới A và kết quả mọi tuyến đang chứa A; không chỉ bảng ước lượng không có tuyến mới.
- [ ] **D03 — Giữ các em khác:** B/C/D vẫn đủ và giữ tọa độ cũ; số học sinh không giảm để làm preview thành công; số ghế/thời gian/giờ trường được kiểm đúng.
- [ ] **D04 — Chưa xác nhận:** chạy preview rồi đóng → hồ sơ, Route, Trip chưa thay đổi; không tự gửi thêm request hoặc commit.
- [ ] **D05 — Tất cả khả thi:** UI hiển thị rõ hai chiều/tất cả tuyến đạt và có Xác nhận tuyến mới. Một tuyến chưa đạt thì không có xác nhận cập nhật một phần.
- [ ] **D06 — Duyệt tối ưu:** confirm ca khả thi → địa điểm, polyline/order/metrics Route thực sự cập nhật phù hợp tuyến đường mới; tải lại vẫn đúng. Không PASS nếu chỉ tọa độ A đổi nhưng line cũ còn nguyên dù tuyến cần thay đổi.
- [ ] **D07 — Trip được cập nhật:** T0 thuộc roster A nhận tuyến/điểm đón mới; các học sinh khác và xe/người thực tế của Trip giữ đúng, không bị reset assignment/điểm danh/notice.
- [ ] **D08 — Trip được bảo vệ:** T1/T2/T3/T4/T5 giữ điểm đón, tuyến và roster cũ. T3 vẫn tracking/điểm danh/hoàn thành theo nghiệp vụ bình thường; Parent vẫn theo dõi được.
- [ ] **D09 — Bất khả thi:** chọn dữ liệu/ràng buộc đã được PO chuẩn bị có ít nhất một tuyến bất khả thi → không cho Xác nhận tuyến mới; có Từ chối / Duyệt và loại khỏi tuyến. Từ chối giữ toàn bộ nguồn cũ, lưu trạng thái/lý do.
- [ ] **D10 — Duyệt loại khỏi tuyến:** trên ca độc lập chọn loại → địa điểm mới được lưu, A rời mọi Route DRAFT/ACTIVE liên quan và T0; polyline/thứ tự của B/C/D không bị tối ưu lại; T1–T5 giữ cũ.
- [ ] **D11 — Lỗi provider:** gặp lỗi mạng/quota/timeout được phép tái hiện → UI báo dịch vụ chưa khả dụng, không hiển thị “không khả thi” hoặc cho loại A chỉ vì lỗi dịch vụ. Có thử lại có kiểm soát, không request loop vô hạn.
- [ ] **D12 — Parent nhận đúng kết quả:** DIRECT_UPDATE, REOPTIMIZED, REMOVED_FROM_ROUTES có nhãn đúng; trường hợp loại hiển thị Cần phân tuyến lại, trường hợp giữ Trip đã chốt nêu rõ vẫn dùng điểm đón cũ. Không lộ tên/địa chỉ các em khác.
- [ ] **D13 — Preview cũ:** hai phiên admin; sau preview, nguồn bị thay đổi bằng thao tác hợp lệ ở phiên khác → confirm cũ báo cần kiểm tra lại, không ghi một phần hoặc tự ghi geometry mới lên source khác.

## E. Thêm học sinh vào cặp tuyến

- [ ] **E01 — Eligibility:** System Admin chọn học sinh AVAILABLE/chưa tuyến/có tọa độ → có action Thêm vào tuyến; học sinh đã thuộc DRAFT/ACTIVE, DISABLED hoặc thiếu tọa độ không được thêm. School Admin không có quyền thao tác này.
- [ ] **E02 — Chọn đúng cặp:** danh sách gồm một chiều đi và một chiều về cùng RoutePlan/cùng trường; DRAFT và ACTIVE hợp lệ đều được hỗ trợ, không plan CANCELLED/EXPIRED hoặc hai plan khác nhau.
- [ ] **E03 — Preview thật:** có kiểm tra hai chiều, đủ học sinh cũ + em mới, constraints và bản đồ/geometry mới hợp lệ. Không PASS chỉ dựa vào còn ghế hoặc khoảng cách đường chim bay.
- [ ] **E04 — Một chiều không đạt:** không enable confirm; cả hai Route/Trip vẫn cũ. Thiếu provider/mạng phải báo unavailable, không tự success bằng fallback.
- [ ] **E05 — Đổi cặp sau preview:** đổi lựa chọn → preview cũ bị bỏ, phải kiểm tra lại; response cặp cũ về muộn không làm bật confirm cho cặp mới.
- [ ] **E06 — Xác nhận:** hai chiều đạt → confirm thành công không lỗi thiếu previewToken/version; học sinh xuất hiện đúng một lần ở cả hai Route, order/geometry/metrics/counters đúng, không chỉ chèn marker vào line cũ.
- [ ] **E07 — Trip đã sinh giữ nguyên:** so sánh T0/T1/T2/T3/T4/T5 trước-sau → không thêm em mới, không đổi snapshot/giờ/roster/line của những Trip này; các role thấy nhất quán sau mở lại.
- [ ] **E08 — Trip sinh sau:** khi PO dùng quy trình sinh chuyến hợp lệ hoặc đợt sinh bình thường tiếp theo → Trip mới từ Route mới có em, giữ đúng hai chiều. Không coi ngày mai chắc chắn là Trip mới vì có lookahead; không tái tạo Trip đã CANCELLED.
- [ ] **E09 — Chống ghi lặp/stale:** double click hoặc xác nhận lại từ phiên cũ không thêm hai lần/một chiều; lỗi rõ và nguồn nhất quán.
- [ ] **E10 — Không thêm ngược về Trip cũ:** sau E06, dùng request đổi địa điểm của một em khác trên cùng Route → em vừa insert vẫn không xuất hiện trong Trips cũ mà em chưa từng thuộc roster.

## F. Disable và tuyến rỗng

- [ ] **F01 — Modal impact:** School Admin chọn Disable đúng học sinh trường mình → thấy số Route/Trip sẽ đổi và Trip được bảo vệ. Đóng modal không thay trạng thái/membership.
- [ ] **F02 — Xác nhận disable:** Student DISABLED, rời Route DRAFT/ACTIVE và T0; plan CANCELLED/EXPIRED/lịch sử giữ nguyên. Không ghi ABSENT thay cho bị loại.
- [ ] **F03 — Frozen trips:** T1/T2/T3 vẫn có học sinh/điểm đón cũ để vận hành; T4/T5 xem lại như trước. QR/điểm danh/Complete không bị hỏng vì Student hiện DISABLED.
- [ ] **F04 — Em còn lại:** B/C/D giữ order, geometry và trạng thái điểm danh/báo nghỉ trước đó; count Start/Complete chỉ xét roster vận hành đúng Trip, không count nhầm người bị loại.
- [ ] **F05 — Tuyến chỉ có một học sinh:** disable/loại em cuối → Route lịch sử vẫn xem được, T0 thật sự rỗng bị CANCELLED, không sinh chuyến rỗng; T1/T2/T3 có roster cũ không bị coi rỗng theo Route hiện tại.
- [ ] **F06 — Bật lại:** AVAILABLE trở lại không tự gắn Route/Trip cũ; em đủ điều kiện được phân tuyến lại theo flow đã duyệt. Request đang PENDING không tự bị duyệt lúc disable/enable.

## G. Hủy phương án

- [ ] **G01 — Quyền:** System Admin hủy DRAFT/ACTIVE; School Admin hủy ACTIVE của trường mình, không trường khác; không cấp quyền System Admin phê duyệt DRAFT → ACTIVE.
- [ ] **G02 — Impact và đóng:** modal đúng số SCHEDULED bị hủy, IN_PROGRESS được giữ và tài nguyên; Đóng không đổi dữ liệu, thiếu reason không xác nhận được.
- [ ] **G03 — Xác nhận:** plan CANCELLED, mọi SCHEDULED liên quan CANCELLED, không mất lịch sử. IN_PROGRESS/COMPLETED giữ dữ liệu; không tự xác nhận xuống xe/Complete.
- [ ] **G04 — Liên thông:** pending staff báo nghỉ của Trip bị hủy đóng đúng, không còn action phân công vào chuyến đã hủy; Parent/Driver/Attendant thấy status mới, không Start/Ready lại được SCHEDULED đã hủy.
- [ ] **G05 — Tài nguyên và lịch:** nguồn lực tương lai không bị plan đã hủy giữ; tài nguyên vẫn đang chạy không bị hiển thị rảnh sai. Không sinh lại Trip của plan CANCELLED hoặc khôi phục bằng reload.
- [ ] **G06 — Lịch sử/điều hướng:** mở lại Trip cũ bằng các role được phép → map/stops/roster/recorded history không đổi; Trip đang chạy vẫn tiếp tục xử lý nghiệp vụ tới hoàn thành dù plan terminal.

## H. Đổi vị trí trường

- [ ] **H01 — Đúng scope:** System Admin và School Admin đổi được vị trí trường A theo lối vào đã duyệt; School Admin không sửa B/hợp đồng/bãi.
- [ ] **H02 — Impact:** chọn tọa độ mới → modal liệt kê plan/Trip bị hủy trong A, không tính B; Đóng không thay đổi gì. Lưu chỉ nhãn địa chỉ như A03 không cascade.
- [ ] **H03 — Xác nhận:** vị trí A lưu mới, mọi DRAFT/ACTIVE của A CANCELLED và SCHEDULED liên quan CANCELLED; plan/Trip B không đổi. CANCELLED/EXPIRED trước đó giữ nguyên status.
- [ ] **H04 — Snapshot:** Trip IN_PROGRESS/COMPLETED của A vẫn dùng vị trí trường cũ; Parent và nhân sự xem cùng dữ liệu, Trip đang chạy không mất điều hướng/quyền vận hành do School live đổi.
- [ ] **H05 — Lỗi/stale:** sau impact, có thay đổi hợp lệ ở phiên khác → confirm được revalidate hoặc yêu cầu xem lại; không vị trí mới nhưng plan cũ còn ACTIVE do ghi một phần. Ghi lại nếu modal báo thành công nhưng mở lại source không khớp.

## I. Đổi vị trí bãi — chạy cuối vì hủy toàn hệ thống

- [ ] **I01 — Quyền/no-op:** chỉ System Admin có bãi. Sửa nhãn địa chỉ giữ tọa độ → lưu được, không hủy plan/Trip.
- [ ] **I02 — Impact toàn hệ thống:** thay tọa độ thật → modal đếm DRAFT/ACTIVE và SCHEDULED của cả A/B, không chỉ trường vừa mở; Đóng không đổi bãi hoặc dữ liệu.
- [ ] **I03 — Xác nhận hàng loạt:** bãi lưu mới, tất cả DRAFT/ACTIVE của mọi trường CANCELLED và SCHEDULED liên quan CANCELLED; không bỏ sót trường. Dữ liệu cũ không bị xóa, CANCELLED/EXPIRED cũ không đổi.
- [ ] **I04 — Giữ chuyến đang chạy:** T3 tiếp tục theo vị trí bãi/tuyến cũ, marker/history/roster không reset; T4 xem lại cũ; xe/người đang chạy không được gán trùng do release hold sai.
- [ ] **I05 — Bền vững:** reload/đăng nhập lại thấy cùng kết quả; generation không hồi sinh plan/Trip cũ. Đổi bãi về tọa độ ban đầu vẫn không tự khôi phục phương án đã hủy.

## J. Hết hạn tự động và hồi quy giao diện

- [ ] **J01 — Mốc hết hạn:** với trường test có kỳ hợp đồng đủ điều kiện do PO chuẩn bị, quan sát hết ngày cuối theo VN → DRAFT/ACTIVE tự EXPIRED, không cần mở modal xác nhận. Không thể chứng minh bằng đổi giờ điện thoại hoặc chỉ thấy badge EXPIRED do query.
- [ ] **J02 — Cascade và lịch sử:** SCHEDULED liên quan bị hủy, CANCELLED cũ giữ CANCELLED, T3/T4 giữ nguồn cũ; không sinh chuyến mới ngoài hợp đồng, không giữ resource tương lai sai.
- [ ] **J03 — Gia hạn sau expiry:** đủ điều kiện sửa kỳ mới → plan EXPIRED cũ không tự ACTIVE; cần tạo/duyệt plan hợp lệ mới. Nếu không có dữ liệu/mốc thời gian để quan sát tự động thì ghi NOT_VERIFIED, không PASS.
- [ ] **J04 — Nhất quán UI:** filters/badges EXPIRED, Request CANCELLED và outcomes đúng trên Web/Mobile; không hiển thị raw enum/undefined/NaN, không báo thành công khi API lỗi; đổi tab/role không giữ data của trường/con khác.
- [ ] **J05 — Tải lại và nhiều phiên:** sau mỗi mutation, list/detail/map/counts ở role liên quan cập nhật khi focus/poll theo thiết kế, giữ ngày/filter; không cần thoát app để thấy dữ liệu và không reload map liên tục.

## 4. Những điều UI không chứng minh được đầy đủ

- Chỉ nhìn FEASIBLE, line hoặc thời gian không chứng minh Backend đã dùng VietMap/đúng constraints; source hiện có vấn đề S4 cần sửa và kiểm chứng kỹ thuật riêng.
- Row locks, rollback nguyên tử, TTL/ownership token, DB drift/migration và contention cần kiểm chứng kỹ thuật với scope được cấp; UI multi-session chỉ bắt được một số biểu hiện.
- Báo cáo Antigravity có snapshot JSON minh họa khác shape resolver source; không dùng mẫu JSON trong báo cáo để kết luận snapshot đã dùng đúng ở mọi consumer.
- Checklist này không audit toàn bộ module. Nếu một ca thiếu tiền đề hoặc gặp lỗi API/UI từ S1–S6, ghi BLOCKED/FAIL phù hợp và không bịa PASS cho các ca sau.

## 5. Mẫu ghi lỗi

```text
Mã ca: D06
Kết quả: PASS / FAIL / NOT_VERIFIED / BLOCKED
Vai trò / tài khoản:
Trường / học sinh / phương án / tuyến / Trip ID thực tế:
Trạng thái ban đầu (Ready/attendance/Trip):
Thao tác đã làm:
Kết quả mong đợi:
Kết quả thực tế và thông báo lỗi:
Ảnh/video trước-sau, giờ VN:
Ca khác bị ảnh hưởng / ca gốc gây BLOCKED:
```

Không đưa mật khẩu, OTP, token hoặc key vào ảnh/báo cáo chia sẻ. Sau test hủy/đổi vị trí, không kỳ vọng hoàn tác bằng sửa trực tiếp DB; dùng quy trình nghiệp vụ được duyệt để tạo/duyệt dữ liệu vận hành mới khi PO quyết định.
