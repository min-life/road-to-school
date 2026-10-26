# AI Review — Phân tích sai thứ tự điểm dừng sau khi thêm học sinh

## 1. Task Information
Ngày 26/10/2026, Asia/Saigon. Scope Documentation / source review API+Web. Type Analysis. Status COMPLETED đối với phân tích, lỗi chưa sửa.

## 2. Original Request
PO phản ánh thêm học sinh vào tuyến hiện có thì giờ có vẻ đúng nhưng vị trí học sinh sai. Ảnh chiều đi học sinh trước bãi; chiều về 17:46 đứng trước 17:43.

## 3. Approved Scope
Phân tích hiện tượng và source. Không có chỉ thị sửa mã nguồn mới trong lượt này. Không thực hiện implementation/DB mutation/provider call.

## 4. Analysis & Decisions
### Nguyên nhân chính xác nhận từ source
Trong api/src/routes/routes.service.ts, tạo tuyến đặt let order = 1 (622,744), nhưng preview insertion dùng obBestIndex/retBestIndex là chỉ số mảng bắt đầu 0 (vòng lặp chọn vị trí từ index 1, chèn vào obNewPoints/retNewPoints). Confirm lưu trực tiếp các index này thành stopOrder (2530,2570), đồng thời tăng các stop cũ có stopOrder >= index (2543,2582). Hai hệ quy chiếu khác nhau.
Ví dụ minh họa thuật toán, không phải dữ liệu DB: bãi order1 và A order2; chèn B vào array index1 nghĩa là sau bãi, nhưng mã lưu B order1 rồi dịch bãi thành2, A thành3. Danh sách API orderBy stopOrder sẽ đặt B trước bãi, trong khi geometry được gọi theo mảng bãi→B→A. Đây là lỗi ghi thứ tự Backend, không chỉ thứ tự JSX. Web route-detail map trực tiếp route.stops và badge stopOrder.

### Giờ dự kiến chưa thể kết luận đúng
Preview lines2263–2270 nội suy thời gian chạy bằng index/(points.length-1), cộng index*defaultStopServiceSeconds. Đây không phải thời gian tích lũy theo từng chặng thực tế; số điểm không tỷ lệ với quãng đường/thời gian. Confirm chỉ ghi ETA của học sinh mới, giữ ETA các stop cũ và departureTime/arrivalTime dù tổng duration/geometry đã đổi. Có thể sinh giờ không đơn điệu như ảnh chiều về. Tổng thời gian đáp ứng giới hạn không đảm bảo ETA từng điểm đúng.

### Hướng sửa
- Dùng một mảng stops canonical cho mỗi chiều, gồm endpoints cố định và metadata học sinh; chèn/tối ưu trên mảng đó, sau đó đánh lại stopOrder liên tục 1..N cho toàn mảng khi lưu. Không vá sort theo ETA hoặc ưu tiên bãi ở UI.
- Geometry, thứ tự, ETA, total duration và departure/arrival phải cùng một kết quả preview. Tính ETA toàn tuyến bằng duration từng leg hợp lệ và service theo stop/override, đúng định nghĩa arrival (không cộng service của chính stop trước arrival). TO_SCHOOL neo giờ tới trường, tính ngược giờ xuất phát; TO_PARKING neo giờ rời trường, tính xuôi. Bảo đảm thời gian không giảm theo stopOrder.
- Không giả giờ bằng chia đều tổng thời gian theo số điểm. Nếu provider không cung cấp leg timing cần adapter phù hợp/budget rõ ràng, không âm thầm tăng hàng loạt calls.
- Preview session phải giữ cả mảng kết quả; confirm atomically lưu đúng thứ tự/geometry/timing của cả hai tuyến, revalidate dữ liệu stale. Bảo vệ Trip cũ theo quyết định Route-only/snapshot.
- Chặn kết quả endpoints sai, order trùng/hổng, mất/trùng học sinh, ETA giảm, hoặc geometry/stop sequence không đồng nhất.
- Các Routes đã bị lưu sai cần kiểm tra read-only riêng, không tự chạy script sửa/renumber dữ liệu. Sửa code chỉ ngăn lần sau, không tự khôi phục dữ liệu hỏng cũ.

### Vấn đề liên quan ngoài nguyên nhân trực tiếp
calculateRoute trong vietmap-vrp.service.ts vẫn trả FEASIBLE với fallbackInternalTSP khi thiếu key; fallback là nối điểm bằng đường thẳng và tốc độ 30km/h (không phải TSP tối ưu). Preview insertion vẫn chọn vị trí theo detour khoảng cách thẳng rồi gọi Route v4 theo thứ tự đã chọn; không có tìm thứ tự tối ưu toàn bộ học sinh. Ghi nhận để tránh diễn giải tổng thời gian/đường mới là bằng chứng tối ưu chuẩn; không gọi provider để xác minh.

## 5. Implementation Details
No application code changes. Chỉ archive báo cáo Antigravity trước đó và cập nhật LATEST.md/LATEST.diff.

## 6. Database Changes
None. Không đọc dữ liệu DB thực tế, không sửa thứ tự/ETA hiện có, không migration.

## 7. API & Swagger Changes
None. Chỉ đọc service/adapter; không gọi API runtime.

## 8. UI/UX Changes
None. Quan sát ảnh PO và đối chiếu route-detail JSX. Không dùng UI sort theo giờ để che lỗi lưu stopOrder.

## 9. Verification & Testing
Đã đọc LATEST Antigravity mới và kiểm tra working tree (276 entries); đối chiếu source generation/preview/confirm/Route v4 adapter/Web render bằng đọc file và rg. Phát hiện theo code review, không gắn PASS runtime. Không chạy typecheck/tests/build vì không sửa application code. Không kết nối DB, không mutation API, không gọi VietMap. Việc dữ liệu hiện hữu cụ thể khớp source đã nêu: NOT_VERIFIED (không query DB). Kiểm thử ghi nghiệp vụ chưa có phạm vi: BLOCKED_BY_TEST_DATA_POLICY.

## 10. Issues & Risks
Sai thứ tự đã lưu có thể ảnh hưởng map/sinh chuyến sau; cần tách sửa code khỏi xử lý dữ liệu hiện hữu. Các Trip đã có snapshot không được tự đổi. Giờ trong ảnh không đủ bằng chứng ETA chính xác. Báo cáo trước ghi COMPLETED không thay thế việc kiểm chứng tính nhất quán geometry/order/timing.

## 11. Reviewer Focus
0-based index vs 1-based stopOrder; endpoints theo chiều; canonical stop list; elapsed leg time/service/override; old ETA/route schedule không được giữ lỗi thời; stale preview và atomic cả hai chiều; bảo toàn existing Trip; không giả provider success khi thiếu key.

## 12. Suggested Next Step
Giao Antigravity sửa đồng bộ thứ tự/geometry/ETA toàn tuyến theo cùng kết quả preview, không chỉ sửa sort giao diện; tách dữ liệu cũ để PO quyết định xử lý.

## 13. Approval Status
WAITING FOR USER REVIEW / APPROVAL. Analysis only; không tự sửa application code/DB hoặc mở task tiếp theo. STOP AFTER TASK.
