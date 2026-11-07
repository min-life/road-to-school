# AI Review — Script đổi khung giờ chuyến local

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Documentation / local SQL draft. Type: Analysis / Script preparation. Status: COMPLETED for guidance and draft, NOT_EXECUTED for database update.

## 2. Original Request
Hỏi cách điều chỉnh khung giờ chuyến local để kiểm tra UI chiều đi.

## 3. Approved Scope
Soạn hướng dẫn/script cho PO tự chạy pgAdmin; không tự thực thi thay đổi DB từ câu hỏi cách làm. Chỉ đọc DB, không thêm records/test data; không sửa backend/mobile/config hoặc commit/push.

## 4. Analysis & Decisions
Cần đồng bộ trips.scheduled_start_at/end_at (timestamp UTC), scheduled_start_time/end_time (giờ VN) và snapshot.departureTime/arrivalTime/stops plannedArrivalTime/plannedArrivalSeconds. Mobile chi tiết ưu tiên snapshot; sửa4 cột mà bỏ snapshot làm giờ điểm đón lệch. Không thay routes/route_stops dùng chung vì ảnh hưởng nhiều chuyến. Script khóa đúng trip UI-TEST TO_SCHOOL a3e8934d-aceb-40b8-b968-f25d02334491, chỉ SCHEDULED chưa có actual/event điểm danh/xuống xe. Bắt đầu mặc định5 phút sau thời điểm thực thi, giữ duration cũ45 phút và dịch các giờ stop cùng offset. Không đổi service_date/status/attendance hoặc tạo actual event; chặn qua ngày, snapshot sai hoặc thiếu khoảng giờ.
Cần phân biệt reschedule và Home priority: chuyến chiều về IN_PROGRESS đang ưu tiên, nên đổi giờ chiều đi vẫn không tự thay thế thẻ chiều về. Không tự thay trạng thái chiều về hoặc nhãn điểm danh. Các giờ mới chỉ là lịch local do PO lựa chọn, không phải dữ liệu vận hành thực.

## 5. Implementation Details
Tạo docs/implementation/sql/reschedule-local-outbound-trip.sql: DO atomic cập nhật1 chuyến, các guard, đồng bộ snapshot và SELECT kết quả theo giờ VN. Không thêm bảng/record, không đổi routes/roster.
Cập nhật LATEST.md và LATEST.diff chỉ file SQL mới; lưu báo cáo trước tại history/2026-10-30-before-local-trip-reschedule-script.md và .diff. No application code changes.

## 6. Database Changes
None executed. Script có UPDATE cho PO tự chạy nhưng agent không chạy bản ghi DB. Trước kiểm tra: chuyến30/10 SCHEDULED, scheduled_start_at2026-10-29 23:45 UTC/end2026-10-30 00:30 UTC, giờVN06:45/07:30, actual_start_timeNULL, snapshotversion1 TO_SCHOOL, 4 stops06:45/07:00/07:15/07:30, attendance events0/incidents0. Tất cả dữ liệu này đã có trước task.

## 7. API & Swagger Changes
None. Đọc trip-time.util.ts, trip-snapshot-resolver.ts, detail resolver và source plannedArrivalSeconds theo giây từ đầu ngày. Swagger N/A.

## 8. UI/UX Changes
None. Chỉ chuẩn bị dữ liệu lịch hợp lệ cho UI hiện có; không đổi nguyên tắc chọn card hoặc layout.

## 9. Verification & Testing
PASS: readonly psql theo cấu hình api/.env host loopback, PGOPTIONS default_transaction_read_only=on, không lộ credential. Preflight thực tế xác nhận nguồn lịch/snapshot và absence actual events.
PASS: chạy bản tính toán chỉ đọc trích từ file: bỏ SELECT FOR UPDATE và cắt toàn bộ UPDATE, chỉ giữ guard/loop tính trên record thật, RAISE NOTICE kết quả. Không INSERT/UPDATE/DELETE, không business fixture/API giả hoặc dữ liệu tạm rollback. Preview13:39-14:24 ngày30/10, stops13:39/13:54/14:09/14:24, giữ45 phút và offset15 phút.
PASS: SELECT hậu kiểm vẫn SCHEDULED/06:45/07:30/actual_start_timeNULL; agent chưa áp dụng lịch mới.
PASS: static assert chỉ1 UPDATE public.trips, không INSERT/DELETE/UPDATE routes/trip_attendances; whitespace/git diff --check.
NOT_VERIFIED: nhánh UPDATE thực thi/pgAdmin/Expo runtime vì không tự ghi DB. Không chạy build/typecheck/lint do không đổi application code.

## 10. Issues & Risks
Script là thao tác có ghi khi PO tự F5, dành riêng database local roadtoschool và chuyến UI-TEST nêu trên. Khung mới phụ thuộc giờ chạy; qua ngày hoặc chuyến đã chạy/điểm danh sẽ bị chặn. Chạy lại khi còn SCHEDULED sẽ dịch lịch lại theo thời điểm chạy. Không tự giải quyết ưu tiên chuyến về IN_PROGRESS, không gửi thông báo thay lịch hoặc chạy kiểm tra xung đột lịch như luồng API. Phần UPDATE chưa kiểm chứng bằng ghi DB; không báo applied/PASS mutation.

## 11. Reviewer Focus
VN UTC+7 chuyển sang UTC timestamp đúng; duration/stop offsets giữ nguyên, stops order và trường khác snapshot không bị mất. Guard id/database/direction/status/actual events/date; không đổi routes chung/status/attendance. Phân biệt bản preview readonly đã chạy và file UPDATE chưa chạy.

## 12. Suggested Next Step
PO mở file SQL trong pgAdmin của database local, đọc phạm vi và tự chạy toàn bộ file nếu muốn áp dụng khung giờ mới.

## 13. Approval Status
Soạn theo yêu cầu hướng dẫn của PO. WAITING FOR USER REVIEW / APPROVAL; agent chưa áp dụng cập nhật DB, chưa commit/push.
