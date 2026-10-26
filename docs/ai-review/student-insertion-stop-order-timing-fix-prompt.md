# ROADTOSCHOOL — FIX THỨ TỰ ĐIỂM DỪNG VÀ ETA SAU KHI THÊM HỌC SINH

## 1. Chỉ thị thực thi

Antigravity: IMPLEMENTATION. PO yêu cầu khắc phục lỗi sau khi thêm học sinh vào tuyến hiện có. Đọc, xác minh source hiện tại và sửa hoàn chỉnh trong phạm vi này; không chỉ lập plan, không xin lại các quyết định đã được duyệt.

Đọc AGENTS.md và tài liệu bắt buộc theo đúng thứ tự. Đọc thêm:
- `docs/ai-review/student-insertion-routing-fix-prompt.md`.
- Báo cáo phân tích trong history có hậu tố `before-insertion-stop-order-fix-prompt.md` (bản LATEST được archive trước prompt này).
- Thiết kế lifecycle/student-change đã được duyệt, để giữ Route-only và bảo toàn Trip.

Kiểm tra git status, bảo vệ tất cả staged/modified/untracked work. Không commit/push/reset/discard.

## 2. Triệu chứng do PO quan sát

- Chiều đi: học sinh mới “Trần Thị B” hiển thị trước bãi xe trung tâm, mặc dù giờ là 06:13 và bãi là 06:12.
- Chiều về: học sinh mới ở 17:46 nằm trước học sinh khác ở 17:43.
- Tổng thời lượng có vẻ đáp ứng nhưng danh sách lộ trình sai.

Đây không chỉ là vấn đề sắp xếp giao diện. Không mặc định ETA hiện tại chính xác.

## 3. Bằng chứng và nguyên nhân cần xác minh

Source ở thời điểm phân tích:
- `api/src/routes/routes.service.ts`: lúc tạo tuyến, `stopOrder` bắt đầu 1 (`let order = 1`).
- `previewStudentInsertion` chọn `obBestIndex`/`retBestIndex` theo chỉ số mảng bắt đầu 0, chèn tọa độ vào mảng để gọi routing.
- `confirmStudentInsertion` ghi thẳng index đó thành `stopOrder`, rồi tăng order các stop cũ có order >= index.
- Ví dụ index1 có nghĩa sau điểm đầu, nhưng ghi order1 rồi dịch điểm đầu thành2 khiến học sinh đứng trước bãi. Geometry và dữ liệu thứ tự đã dùng hai hệ quy chiếu khác nhau.
- ETA học sinh mới dùng `totalDrivingDuration * index/(points.length-1)` cộng thời gian dừng theo index. Không phải thời gian tích lũy chặng thực tế.
- Confirm chỉ ghi ETA học sinh mới, giữ ETA stops cũ và departureTime/arrivalTime mặc dù geometry/tổng duration đã đổi.
- Web route-detail duyệt trực tiếp `route.stops`; Backend đọc orderBy stopOrder. Chỉ sort UI không sửa dữ liệu đã lưu.

Kiểm tra line numbers hiện tại và ghi bằng chứng cuối task. Không sửa bằng một phép `index + 1` rồi bỏ qua ETA và consistency toàn tuyến.

## 4. Kết quả bắt buộc

### A. Một nguồn dữ liệu kết quả cho toàn tuyến

Mỗi chiều có một mảng điểm dừng kết quả duy nhất, gồm định danh stop/học sinh, loại điểm, tọa độ, thứ tự, thời gian phục vụ và arrival. Preview geometry, metrics, UI và commit đều dùng đúng mảng này.

- TO_SCHOOL: PARKING_START đầu tiên, SCHOOL_ARRIVAL cuối cùng, PICKUP ở giữa.
- TO_PARKING: SCHOOL_DEPARTURE đầu tiên, PARKING_END cuối cùng, DROPOFF ở giữa.
- Đánh lại stopOrder liên tục từ1 tớiN dựa trên mảng kết quả, không suy ra từ order cũ hoặc ETA.
- Không mất/trùng học sinh; giữ tất cả thành viên hiện tại, thêm đúng một học sinh được chọn. Không đưa học sinh ra ngoài endpoints.
- Geometry đi qua stops theo đúng thứ tự được lưu và preview. Không dùng một thứ tự gọi routing rồi thứ tự khác lưu DB.
- Ưu tiên giữ ID các RouteStop hiện hữu nếu có thể để hạn chế phá tham chiếu; không delete/recreate toàn bộ chỉ để renumber.

### B. Tính lại ETA và giờ tuyến đầy đủ

- Dùng thời gian chạy từng chặng từ kết quả routing hợp lệ tương ứng với geometry/thứ tự này; cộng thời gian phục vụ theo từng stop và overrides đã lưu.
- Không chia đều tổng thời gian theo số điểm, không suy từ khoảng cách thẳng hoặc vận tốc giả định.
- Phân biệt arrival và departure: service ở stop hiện tại cộng sau arrival để tính chặng tiếp theo. Giữ chính xác quy tắc service/waiting/endpoints của luồng lập phương án; tránh cộng đôi hoặc cộng service cho bãi/trường không có quy tắc đó.
- TO_SCHOOL: neo giờ đến trường theo schedule đã chọn như lập phương án, tính ngược giờ xuất phát rồi tính các mốc trên tuyến.
- TO_PARKING: neo giờ rời trường, tính xuôi giờ từng điểm và giờ về bãi.
- Tính lại toàn bộ plannedArrivalSeconds/plannedArrivalTime, departureTime, arrivalTime, estimatedDurationSeconds và distance/geometry. ETA không giảm theo stopOrder (các điểm đồng vị trí có thể cùng giờ theo quy tắc service).
- Tổng thời gian phải gồm driving + service + waiting và thống nhất với mốc đầu/cuối ở độ chính xác giây, trước khi format/round UI.
- Giữ hai tiêu chí đã duyệt: maxRouteDurationMinutes (phút), defaultStopServiceSeconds (giây), cùng stopServiceOverrides và các ràng buộc sức chứa/giờ học hợp lệ. Không ghi đè làm mất overrides của học sinh khác.

Nếu adapter hiện chỉ có tổng duration, bổ sung khả năng lấy timing từng chặng hợp lệ từ provider/solver hiện có. Không bịa dữ liệu thiếu. Nếu cần gọi từng chặng: giới hạn số call/timeout, reuse kết quả cùng preview, không gọi khi render, không retry vô hạn, không thực hiện provider calls trong transaction. Không thêm dịch vụ/SDK/dependency mới. Không tuyên bố tối ưu toàn cục nếu chỉ tìm vị trí chèn rồi route theo thứ tự cố định.

### C. Preview → confirm nhất quán, nguyên tử

- Session preview lưu toàn bộ stops/geometry/timing/constraints của cả hai chiều; confirm lưu đúng kết quả đó, không dựng lại bằng index và ETA cũ.
- Chỉ confirm khi cả hai chiều hợp lệ/FEASIBLE và còn đáp ứng thời lượng/sức chứa. Lỗi provider là UNAVAILABLE; thiếu API key không được fallback đường thẳng rồi trả FEASIBLE trong luồng này. Không thay đổi fallback của module không liên quan nếu chưa cần.
- Xác minh actor, TTL, purpose, Student/Route/Plan hiện tại và fingerprint phía server trong transaction; không chỉ so fingerprint client với bản cache cũ. Thay stops/coords/constraints/status sau preview phải bị phát hiện.
- Ghi cả hai tuyến trong một transaction; lỗi giữa chừng không lưu một nửa. Không cho xác nhận trùng chèn lặp. Token chỉ consume khi commit thành công, hoặc idempotency tường minh.
- Reuse cơ chế khóa/revalidation hiện có phù hợp, network ở ngoài transaction; không tạo kiến trúc queue/cache mới.

### D. Giữ nguyên nghiệp vụ đã duyệt

- Insertion do SYSTEM_ADMIN, học sinh AVAILABLE/chưa thuộc phương án hiệu lực, hai tuyến cùng trường/cùng RoutePlan DRAFT hoặc ACTIVE và đúng hai chiều.
- Route-only: không thêm học sinh hoặc thay đổi hành trình/roster/giờ nghiệp vụ của bất kỳ Trip đã sinh nào, kể cả SCHEDULED. Chuyến sinh sau mới dùng Route mới.
- Giữ PRE_UPDATE_CAPTURE cho Trip legacy routeSnapshot null trước mutation Route trong giao dịch nghiệp vụ hợp lệ, không backfill hàng loạt; giữ snapshot đã có và dữ liệu vận hành/lịch sử.
- Không sửa navigation/attendance/leave/disable/cancel hoặc logic sinh chuyến ngoài phần trực tiếp cần để bảo toàn quyết định này.

## 5. UI và API

Giữ layout hiện có, không cần màn hình mới. Danh sách, số thứ tự, bản đồ và ETA phải khớp kết quả server; không sort theo giờ, không ép bãi/trường lên đầu/cuối chỉ ở frontend để che order DB sai.

Nếu thêm kết quả timing/stops vào preview DTO, đồng bộ Backend/Web types/API client/Swagger và validation. Đổi cặp tuyến/học sinh/tiêu chí phải bỏ preview/token cũ. Không cần sửa Mobile nếu API contract dùng chung vẫn tương thích; ghi nhận ảnh hưởng thay vì refactor ngoài scope.

## 6. Dữ liệu đã lưu sai

Sửa code không tự sửa được các Routes đã bị ghi lỗi. Chỉ đọc dữ liệu sẵn có để nhận diện endpoints sai, order trùng/hổng, ETA giảm và báo các Route IDs liên quan nếu có quyền đọc.

Không tự renumber, sửa ETA, chạy script repair/backfill, gọi confirm lại, tạo lại phương án hoặc thay đổi Trip cũ để kiểm thử. Không đoán thứ tự đúng của tuyến đã hỏng bằng sort theo giờ. Nếu đầu vào hiện hữu không hợp lệ, trả lỗi rõ và chặn mutation thay vì tiếp tục chèn sai. Đề xuất xử lý dữ liệu cụ thể trong báo cáo để PO duyệt riêng.

## 7. Kiểm chứng tập trung

Chạy typecheck API/Web với compiler đã cài; lint đúng files sửa. Viết/chạy kiểm chứng pure/in-memory dùng logic production, đã kiểm tra không DB/network side effects:

- Chèn sau điểm đầu không làm học sinh đứng trước bãi/trường; chèn trước điểm cuối không vượt endpoints; order sau lưu đúng1..N ở cả hai chiều, gồm chèn thêm lần tiếp theo.
- Các chặng dài ngắn khác nhau và stop override khác nhau: tính ETA theo chặng/service, không chia đều; giờ không giảm, giờ đầu/cuối/tổng duration nhất quán.
- Preview và dữ liệu commit khớp stops/geometry/timing; cả hai tuyến cùng thành công hoặc cùng rollback; stale/expired/duplicate preview bị xử lý đúng.
- Không làm đổi dữ liệu nghiệp vụ Trip cũ; giữ snapshot protection.
- Provider unavailable/missing key hoặc một chiều vượt giới hạn không được confirm.

Không giả provider response để tuyên bố đã nghiệm thu VietMap thật. Không seed/tạo fixture nghiệp vụ DB, không test API/UI mutation, không gọi Route API tính phí nếu chưa cấp phạm vi/quota. Ghi NOT_VERIFIED/BLOCKED_BY_TEST_DATA_POLICY tương ứng cho runtime chưa được chạy. Kiểm chứng Swagger tại server hiện có nếu API đổi, không mở server trùng port.

Không yêu cầu PO test hàng chục tình huống. Sau sửa chỉ đề nghị PO nghiệm thu luồng thêm học sinh ở hai chiều, quan sát thứ tự+map+giờ; agent phải tự xử lý các sai lệch code có thể chứng minh tĩnh/pure tests.

## 8. Bàn giao và dừng

Archive LATEST.md/.diff trước ghi đè, báo cáo đủ13mục và diff task-only. Nêu nguyên nhân, files sửa, cơ chế tạo order/timing, phương án provider leg timing và số call, kết quả tests thực chạy, những gì chưa xác minh, cùng danh sách dữ liệu cũ cần PO quyết định. Không đánh COMPLETED chỉ vì typecheck PASS.

Không schema/migration/package mới trong scope. Không commit/push. Hoàn tất phần triển khai an toàn, báo cáo giới hạn trung thực. STOP AFTER TASK.
