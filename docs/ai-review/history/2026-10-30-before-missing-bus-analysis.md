# AI Review — Hướng dẫn đổi trạng thái chuyến trong pgAdmin

## 1. Task Information
30/10/2026, Asia/Saigon. Scope: Documentation / Database guidance. Type: Analysis. Status: COMPLETED. DISCUSSION MODE.

## 2. Original Request
Hỏi sửa ở đâu trong pgAdmin để đổi chuyến từ Chờ khởi hành sang Đã khởi hành.

## 3. Approved Scope
Chỉ hướng dẫn và soạn SQL cho PO tự chạy trên local. Không tự thực thi mutation hoặc thay đổi dữ liệu. Không sửa code/config hoặc commit/push.

## 4. Analysis & Decisions
Prisma Trip @@map(trips), status enum SCHEDULED -> IN_PROGRESS, actualStartTime map actual_start_time, updatedAt map updated_at. startTrip thực tế cập nhật status/actualStartTime trong transaction, tự cập nhật updatedAt qua Prisma và gọi notifyTrip STARTED. Nhãn Parent Home IN_PROGRESS là Đang di chuyển.
SQL hướng dẫn chỉ đổi một chuyến bằng id và trạng thái cũ SCHEDULED, yêu cầu actual_start_time IS NULL, không thay điểm danh/ready hoặc backfill. Timestamp Prisma mặc định không timezone lưu UTC: CURRENT_TIMESTAMP AT TIME ZONE UTC. Không chạy SQL trên DB.
Đổi SQL trực tiếp chỉ phù hợp kiểm tra giao diện local, không thay thế nghiệp vụ Bắt đầu chuyến: bỏ kiểm tra DRIVER/assignment/ready/roster/leave/incident/time window và không tạo thông báo STARTED. Chiều về backend thực tế không cho còn UNMARKED và kiểm lý do ABSENT; không diễn giải tất cả học sinh bắt buộc PRESENT.

## 5. Implementation Details
No application code changes. Chỉ LATEST.md và LATEST.diff; lưu review trước tại history/2026-10-30-before-pgadmin-start-trip-guidance.md và .diff. Câu trả lời có SELECT tìm đúng id theo tên tuyến/ngày/chiều và UPDATE có guard cho PO tự chạy.

## 6. Database Changes
None executed. Không kết nối DB, không seed hoặc thêm records. UPDATE trong câu trả lời là hướng dẫn chưa được chạy; không coi là chuyến đã bắt đầu.

## 7. API & Swagger Changes
None. Đọc POST /trips/:id/start và startTrip; không gọi API. Swagger N/A.

## 8. UI/UX Changes
None. Giải thích nhãn IN_PROGRESS hiện tại là Đang di chuyển, không tạo enum Đã khởi hành mới.

## 9. Verification & Testing
PASS: đối chiếu api/prisma/schema.prisma (Trip, TripStatus, Route), trips.service.ts startTrip và trips.controller.ts start, mobile Home getStatusBadge.
PASS: git diff --check báo cáo.
NOT_VERIFIED: SQL thực thi và runtime sau cập nhật vì không truy cập hoặc mutate DB. Không chạy typecheck/build do không đổi application code.

## 10. Issues & Risks
UPDATE không đi qua kiểm tra nghiệp vụ hoặc gửi thông báo, không xác nhận staff ready/attendance hợp lệ. PO phải chọn đúng local DB/trip id; guard tránh ghi đè chuyến đã bắt đầu/hoàn thành/hủy. Không sửa trực tiếp dữ liệu vận hành thật để kiểm tra UI.

## 11. Reviewer Focus
Đúng tên bảng/cột/enums, timestamp UTC, điều kiện id + SCHEDULED + actual_start_time IS NULL; không UPDATE toàn bảng; không tuyên bố SQL tương đương API start.

## 12. Suggested Next Step
PO chọn đúng chuyến local bằng SELECT trước khi tự chạy UPDATE cho chuyến đó.

## 13. Approval Status
Hướng dẫn theo yêu cầu PO. WAITING FOR USER REVIEW / APPROVAL; không thực thi thay đổi DB.
